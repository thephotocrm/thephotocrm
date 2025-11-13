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
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const dnsTarget = process.env.CLOUDFLARE_DNS_TARGET || 'tpcportal.co';

  if (!apiToken || !zoneId) {
    throw new Error('Cloudflare credentials not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID');
  }

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

  const response = await fetch(`${CLOUDFLARE_API_BASE}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.json();
}

/**
 * Find a DNS record by name (subdomain)
 */
async function findDNSRecord(subdomain: string): Promise<DNSRecord | null> {
  const { zoneId } = getCloudflareConfig();
  
  try {
    const response = await cloudflareRequest(
      `/zones/${zoneId}/dns_records?type=CNAME&name=${subdomain}.tpcportal.co`
    );

    if (response.success && response.result && response.result.length > 0) {
      return response.result[0];
    }

    return null;
  } catch (error) {
    console.error(`Error finding DNS record for ${subdomain}:`, error);
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
  const { zoneId, dnsTarget } = getCloudflareConfig();

  try {
    console.log(`[Cloudflare DNS] Creating CNAME record: ${slug}.tpcportal.co → ${dnsTarget}`);

    // Check if record already exists
    const existing = await findDNSRecord(slug);
    if (existing) {
      console.log(`[Cloudflare DNS] Record already exists for ${slug}`);
      return { success: true, recordId: existing.id };
    }

    // Create new CNAME record
    const response = await cloudflareRequest(
      `/zones/${zoneId}/dns_records`,
      'POST',
      {
        type: 'CNAME',
        name: `${slug}.tpcportal.co`,
        content: dnsTarget,
        ttl: 1, // Auto TTL
        proxied: false, // DNS-only (gray cloud) - required for Replit SSL
        comment: `Auto-created for photographer portal: ${slug}`
      }
    );

    if (response.success) {
      console.log(`[Cloudflare DNS] ✓ Created DNS record for ${slug}`);
      return { success: true, recordId: response.result.id };
    } else {
      const error = response.errors?.[0]?.message || 'Unknown error';
      console.error(`[Cloudflare DNS] ✗ Failed to create DNS for ${slug}:`, error);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`[Cloudflare DNS] Exception creating DNS for ${slug}:`, error);
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
  const { zoneId } = getCloudflareConfig();

  try {
    console.log(`[Cloudflare DNS] Deleting CNAME record: ${slug}.tpcportal.co`);

    // Find the record first
    const record = await findDNSRecord(slug);
    if (!record) {
      console.log(`[Cloudflare DNS] No DNS record found for ${slug} (already deleted or never created)`);
      return { success: true }; // Not an error - record doesn't exist
    }

    // Delete the record
    const response = await cloudflareRequest(
      `/zones/${zoneId}/dns_records/${record.id}`,
      'DELETE'
    );

    if (response.success) {
      console.log(`[Cloudflare DNS] ✓ Deleted DNS record for ${slug}`);
      return { success: true };
    } else {
      const error = response.errors?.[0]?.message || 'Unknown error';
      console.error(`[Cloudflare DNS] ✗ Failed to delete DNS for ${slug}:`, error);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`[Cloudflare DNS] Exception deleting DNS for ${slug}:`, error);
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
  console.log(`[Cloudflare DNS] Updating DNS: ${oldSlug} → ${newSlug}`);

  // Delete old record
  const deleteResult = await deletePortalDNS(oldSlug);
  if (!deleteResult.success) {
    console.error(`[Cloudflare DNS] Failed to delete old DNS for ${oldSlug}, continuing anyway...`);
  }

  // Create new record
  const createResult = await createPortalDNS(newSlug);
  if (!createResult.success) {
    return { success: false, error: createResult.error };
  }

  console.log(`[Cloudflare DNS] ✓ Successfully updated DNS from ${oldSlug} to ${newSlug}`);
  return { success: true };
}
