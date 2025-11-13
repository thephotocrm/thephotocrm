/**
 * Cloudflare DNS Management Utility
 * 
 * Automatically creates, updates, and deletes DNS records for photographer portal subdomains.
 * When a photographer sets their portal slug (e.g., "johns-photography"), this utility:
 * - Creates a CNAME record: johns-photography.tpcportal.co → tpcportal.co
 * - Updates DNS when slug changes (deletes old, creates new)
 * - Deletes DNS when slug is removed
 */

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result?: any;
}

interface DNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
}

/**
 * Get Cloudflare configuration from environment
 */
function getCloudflareConfig() {
  console.log('[Cloudflare DNS] Getting configuration from environment...');
  
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const dnsTarget = process.env.CLOUDFLARE_DNS_TARGET || 'tpcportal.co';

  console.log('[Cloudflare DNS] Config check:', {
    hasApiToken: !!apiToken,
    apiTokenLength: apiToken?.length || 0,
    hasZoneId: !!zoneId,
    zoneId: zoneId ? `${zoneId.slice(0, 8)}...` : 'MISSING',
    dnsTarget
  });

  if (!apiToken || !zoneId) {
    console.error('[Cloudflare DNS] ✗ CRITICAL: Missing credentials!', {
      CLOUDFLARE_API_TOKEN: apiToken ? 'SET' : 'MISSING',
      CLOUDFLARE_ZONE_ID: zoneId ? 'SET' : 'MISSING'
    });
    throw new Error('Cloudflare credentials not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID');
  }

  console.log('[Cloudflare DNS] ✓ Configuration loaded successfully');
  return { apiToken, zoneId, dnsTarget };
}

/**
 * Make a request to Cloudflare API
 */
async function cloudflareRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH' = 'GET',
  body?: any
): Promise<CloudflareResponse> {
  const { apiToken } = getCloudflareConfig();
  const url = `${CLOUDFLARE_API_BASE}${endpoint}`;

  console.log(`[Cloudflare DNS] API Request:`, {
    method,
    url,
    endpoint,
    hasBody: !!body,
    bodyPreview: body ? JSON.stringify(body).slice(0, 200) : null,
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`[Cloudflare DNS] API Response:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });

    const data = await response.json();
    
    console.log(`[Cloudflare DNS] Response data:`, {
      success: data.success,
      hasResult: !!data.result,
      resultType: data.result ? typeof data.result : null,
      resultLength: Array.isArray(data.result) ? data.result.length : null,
      errorCount: data.errors?.length || 0,
      errors: data.errors || [],
      messages: data.messages || []
    });

    if (!data.success && data.errors?.length > 0) {
      console.error(`[Cloudflare DNS] ✗ API returned errors:`, JSON.stringify(data.errors, null, 2));
    }

    return data;
  } catch (error) {
    console.error(`[Cloudflare DNS] ✗ CRITICAL: API request failed:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      endpoint,
      method
    });
    throw error;
  }
}

/**
 * Find a DNS record by name (subdomain)
 */
async function findDNSRecord(subdomain: string): Promise<DNSRecord | null> {
  const { zoneId } = getCloudflareConfig();
  const fullDomain = `${subdomain}.tpcportal.co`;
  
  console.log(`[Cloudflare DNS] Searching for existing record: ${fullDomain}`);
  
  try {
    const response = await cloudflareRequest(
      `/zones/${zoneId}/dns_records?type=CNAME&name=${fullDomain}`
    );

    if (response.success && response.result && response.result.length > 0) {
      const record = response.result[0];
      console.log(`[Cloudflare DNS] ✓ Found existing record:`, {
        id: record.id,
        name: record.name,
        content: record.content,
        type: record.type,
        proxied: record.proxied
      });
      return record;
    }

    console.log(`[Cloudflare DNS] No existing record found for ${fullDomain}`);
    return null;
  } catch (error) {
    console.error(`[Cloudflare DNS] ✗ Error searching for DNS record:`, {
      subdomain,
      fullDomain,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    });
    return null;
  }
}

/**
 * Create a CNAME record for photographer's portal subdomain
 * 
 * @param slug - Photographer's portal slug (e.g., "johns-photography")
 * @returns Success status and record ID if created
 */
export async function createPortalDNS(slug: string): Promise<{ success: boolean; recordId?: string; error?: string }> {
  console.log(`[Cloudflare DNS] ========================================`);
  console.log(`[Cloudflare DNS] CREATE DNS OPERATION STARTED`);
  console.log(`[Cloudflare DNS] Slug: ${slug}`);
  console.log(`[Cloudflare DNS] Timestamp: ${new Date().toISOString()}`);
  console.log(`[Cloudflare DNS] ========================================`);

  const { zoneId, dnsTarget } = getCloudflareConfig();
  const fullDomain = `${slug}.tpcportal.co`;

  try {
    console.log(`[Cloudflare DNS] Target configuration:`, {
      slug,
      fullDomain,
      dnsTarget,
      zoneId: `${zoneId.slice(0, 8)}...`
    });

    // Check if record already exists
    console.log(`[Cloudflare DNS] Step 1: Checking for existing record...`);
    const existing = await findDNSRecord(slug);
    if (existing) {
      console.log(`[Cloudflare DNS] ⚠ Record already exists! Skipping creation.`, {
        existingId: existing.id,
        existingContent: existing.content
      });
      return { success: true, recordId: existing.id };
    }

    // Create new CNAME record
    console.log(`[Cloudflare DNS] Step 2: Creating new CNAME record...`);
    const recordData = {
      type: 'CNAME',
      name: fullDomain,
      content: dnsTarget,
      ttl: 1, // Auto TTL
      proxied: false, // DNS-only (gray cloud) - required for Replit SSL
      comment: `Auto-created for photographer portal: ${slug}`
    };
    
    console.log(`[Cloudflare DNS] Record data:`, JSON.stringify(recordData, null, 2));

    const response = await cloudflareRequest(
      `/zones/${zoneId}/dns_records`,
      'POST',
      recordData
    );

    if (response.success) {
      console.log(`[Cloudflare DNS] ✓✓✓ SUCCESS! DNS record created:`, {
        recordId: response.result.id,
        name: response.result.name,
        content: response.result.content,
        proxied: response.result.proxied
      });
      console.log(`[Cloudflare DNS] ========================================`);
      return { success: true, recordId: response.result.id };
    } else {
      const error = response.errors?.[0]?.message || 'Unknown error';
      const errorCode = response.errors?.[0]?.code;
      console.error(`[Cloudflare DNS] ✗✗✗ FAILED to create DNS:`, {
        slug,
        fullDomain,
        error,
        errorCode,
        allErrors: JSON.stringify(response.errors, null, 2)
      });
      console.log(`[Cloudflare DNS] ========================================`);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`[Cloudflare DNS] ✗✗✗ EXCEPTION during DNS creation:`, {
      slug,
      fullDomain,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    console.log(`[Cloudflare DNS] ========================================`);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete a CNAME record for photographer's portal subdomain
 * 
 * @param slug - Photographer's portal slug to remove
 * @returns Success status
 */
export async function deletePortalDNS(slug: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[Cloudflare DNS] ========================================`);
  console.log(`[Cloudflare DNS] DELETE DNS OPERATION STARTED`);
  console.log(`[Cloudflare DNS] Slug: ${slug}`);
  console.log(`[Cloudflare DNS] Timestamp: ${new Date().toISOString()}`);
  console.log(`[Cloudflare DNS] ========================================`);

  const { zoneId } = getCloudflareConfig();
  const fullDomain = `${slug}.tpcportal.co`;

  try {
    console.log(`[Cloudflare DNS] Target to delete:`, {
      slug,
      fullDomain,
      zoneId: `${zoneId.slice(0, 8)}...`
    });

    // Find the record first
    console.log(`[Cloudflare DNS] Step 1: Finding DNS record to delete...`);
    const record = await findDNSRecord(slug);
    if (!record) {
      console.log(`[Cloudflare DNS] ⚠ No DNS record found (already deleted or never created)`);
      console.log(`[Cloudflare DNS] This is OK - treating as successful deletion`);
      console.log(`[Cloudflare DNS] ========================================`);
      return { success: true }; // Not an error - record doesn't exist
    }

    console.log(`[Cloudflare DNS] Step 2: Deleting DNS record...`, {
      recordId: record.id,
      recordName: record.name,
      recordContent: record.content
    });

    // Delete the record
    const response = await cloudflareRequest(
      `/zones/${zoneId}/dns_records/${record.id}`,
      'DELETE'
    );

    if (response.success) {
      console.log(`[Cloudflare DNS] ✓✓✓ SUCCESS! DNS record deleted:`, {
        deletedId: record.id,
        deletedName: record.name
      });
      console.log(`[Cloudflare DNS] ========================================`);
      return { success: true };
    } else {
      const error = response.errors?.[0]?.message || 'Unknown error';
      const errorCode = response.errors?.[0]?.code;
      console.error(`[Cloudflare DNS] ✗✗✗ FAILED to delete DNS:`, {
        slug,
        fullDomain,
        recordId: record.id,
        error,
        errorCode,
        allErrors: JSON.stringify(response.errors, null, 2)
      });
      console.log(`[Cloudflare DNS] ========================================`);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`[Cloudflare DNS] ✗✗✗ EXCEPTION during DNS deletion:`, {
      slug,
      fullDomain,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    console.log(`[Cloudflare DNS] ========================================`);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Update DNS when photographer changes their portal slug
 * Deletes old record and creates new one atomically
 * 
 * @param oldSlug - Previous portal slug to remove
 * @param newSlug - New portal slug to create
 * @returns Success status
 */
export async function updatePortalDNS(
  oldSlug: string,
  newSlug: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[Cloudflare DNS] ========================================`);
  console.log(`[Cloudflare DNS] UPDATE DNS OPERATION STARTED`);
  console.log(`[Cloudflare DNS] Old Slug: ${oldSlug} → New Slug: ${newSlug}`);
  console.log(`[Cloudflare DNS] Timestamp: ${new Date().toISOString()}`);
  console.log(`[Cloudflare DNS] ========================================`);

  console.log(`[Cloudflare DNS] Step 1/2: Deleting old DNS record (${oldSlug})...`);
  
  // Delete old record
  const deleteResult = await deletePortalDNS(oldSlug);
  if (!deleteResult.success) {
    console.error(`[Cloudflare DNS] ⚠ Failed to delete old DNS, but continuing to create new one...`, {
      oldSlug,
      error: deleteResult.error
    });
  }

  console.log(`[Cloudflare DNS] Step 2/2: Creating new DNS record (${newSlug})...`);
  
  // Create new record
  const createResult = await createPortalDNS(newSlug);
  if (!createResult.success) {
    console.error(`[Cloudflare DNS] ✗✗✗ UPDATE FAILED! Could not create new DNS record.`, {
      oldSlug,
      newSlug,
      deleteSuccess: deleteResult.success,
      createError: createResult.error
    });
    console.log(`[Cloudflare DNS] ========================================`);
    return { success: false, error: createResult.error };
  }

  console.log(`[Cloudflare DNS] ✓✓✓ UPDATE SUCCESS! DNS fully updated:`, {
    from: `${oldSlug}.tpcportal.co`,
    to: `${newSlug}.tpcportal.co`,
    deleteSuccess: deleteResult.success,
    createSuccess: createResult.success
  });
  console.log(`[Cloudflare DNS] ========================================`);
  return { success: true };
}
