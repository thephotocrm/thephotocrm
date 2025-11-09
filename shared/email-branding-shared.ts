/**
 * Shared Email Branding Templates
 * These functions work on both client and server
 */

/**
 * Convert relative paths to absolute URLs for use in emails
 * Works on both client and server
 */
function toAbsoluteUrl(urlOrPath: string | undefined): string | undefined {
  if (!urlOrPath) return undefined;
  
  // If it's already an absolute URL, return as is
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  
  // Convert relative path to absolute URL
  let baseUrl: string;
  
  // Server-side: use REPLIT_DEV_DOMAIN or fallback to localhost
  if (typeof window === 'undefined') {
    baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : `http://localhost:${process.env.PORT || 5000}`;
  } else {
    // Client-side: use window.location.origin
    baseUrl = window.location.origin;
  }
  
  // Remove leading slash if present to avoid double slashes
  const path = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  
  return `${baseUrl}${path}`;
}

export interface BrandingData {
  businessName?: string;
  photographerName?: string;
  logoUrl?: string;
  headshotUrl?: string;
  brandPrimary?: string;
  brandSecondary?: string;
  phone?: string;
  email?: string;
  website?: string;
  businessAddress?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

/**
 * Social Media Icon URLs (PNG format for universal email client compatibility)
 */
const SOCIAL_ICONS = {
  facebook: 'https://logo.clearbit.com/facebook.com',
  instagram: 'https://logo.clearbit.com/instagram.com',
  twitter: 'https://logo.clearbit.com/x.com',
  linkedin: 'https://logo.clearbit.com/linkedin.com'
};

/**
 * Generate email header HTML
 */
export function generateEmailHeader(style: string | null | undefined, data: BrandingData): string {
  if (!style) return '';

  const primaryColor = data.brandPrimary || '#000000';
  const secondaryColor = data.brandSecondary || '#666666';
  
  // Convert logo URL to absolute URL for emails
  const logoUrl = toAbsoluteUrl(data.logoUrl);
  const headshotUrl = toAbsoluteUrl(data.headshotUrl);

  switch (style) {
    case 'minimal':
      return `
        <div style="text-align: center; padding: 20px 0; margin-bottom: 30px;">
          ${logoUrl 
            ? `<img src="${logoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 150px; height: auto;" />` 
            : data.businessName 
              ? `<h2 style="margin: 0; color: ${primaryColor}; font-size: 24px; font-weight: 600;">${data.businessName}</h2>` 
              : ''
          }
        </div>
      `;

    case 'professional':
      return `
        <div style="text-align: center; padding: 20px 0; margin-bottom: 30px; border-bottom: 2px solid ${primaryColor};">
          ${logoUrl 
            ? `<img src="${logoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 150px; height: auto;" />` 
            : data.businessName 
              ? `<h2 style="margin: 0; color: ${primaryColor}; font-size: 24px; font-weight: 600;">${data.businessName}</h2>` 
              : ''
          }
        </div>
      `;

    case 'bold':
      return `
        <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px 20px; text-align: center; margin-bottom: 30px;">
          ${logoUrl 
            ? `<img src="${logoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 150px; height: auto; filter: brightness(0) invert(1);" />` 
            : data.businessName 
              ? `<h1 style="margin: 0; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${data.businessName}</h1>` 
              : ''
          }
        </div>
      `;

    case 'classic':
      return `
        <div style="padding: 20px 0; margin-bottom: 30px; border-bottom: 1px solid #e0e0e0;">
          ${logoUrl 
            ? `
              <div style="display: table; width: 100%;">
                <div style="display: table-cell; vertical-align: middle; text-align: left;">
                  <img src="${logoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 120px; height: auto;" />
                </div>
                <div style="display: table-cell; vertical-align: middle; text-align: right;">
                  ${data.businessName ? `<h2 style="margin: 0; color: ${primaryColor}; font-size: 22px; font-weight: 600;">${data.businessName}</h2>` : ''}
                  ${data.photographerName ? `<p style="margin: 5px 0 0 0; color: ${secondaryColor}; font-size: 14px;">${data.photographerName}</p>` : ''}
                </div>
              </div>
            ` 
            : `
              <div style="text-align: center;">
                ${data.businessName ? `<h2 style="margin: 0; color: ${primaryColor}; font-size: 22px; font-weight: 600;">${data.businessName}</h2>` : ''}
                ${data.photographerName ? `<p style="margin: 5px 0 0 0; color: ${secondaryColor}; font-size: 14px;">${data.photographerName}</p>` : ''}
              </div>
            `
          }
        </div>
      `;

    default:
      return '';
  }
}

/**
 * Generate email signature HTML
 */
export function generateEmailSignature(style: string | null | undefined, data: BrandingData): string {
  if (!style) return '';

  const primaryColor = data.brandPrimary || '#000000';
  const secondaryColor = data.brandSecondary || '#666666';
  const socialLinks = data.socialLinks || {};
  
  // Convert URLs to absolute for emails
  const logoUrl = toAbsoluteUrl(data.logoUrl);
  const headshotUrl = toAbsoluteUrl(data.headshotUrl);

  switch (style) {
    case 'simple':
      return `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: ${secondaryColor}; font-size: 14px; line-height: 1.6;">
          <p style="margin: 5px 0;"><strong style="color: ${primaryColor};">${data.photographerName || data.businessName || ''}</strong></p>
          ${data.phone ? `<p style="margin: 5px 0;">📞 ${data.phone}</p>` : ''}
          ${data.email ? `<p style="margin: 5px 0;">✉️ ${data.email}</p>` : ''}
          ${data.website ? `<p style="margin: 5px 0;">🌐 <a href="${data.website}" style="color: ${primaryColor}; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></p>` : ''}
        </div>
      `;

    case 'professional':
      const defaultHeadshot = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=faces';
      const displayHeadshotUrl = headshotUrl || defaultHeadshot;
      
      return `
        <div style="margin-top: 30px; padding: 20px; border-top: 2px solid ${primaryColor}; color: ${secondaryColor}; font-size: 14px;">
          <table style="width: 100%; max-width: 500px;">
            <tr>
              <td style="width: 80px; vertical-align: top; padding-right: 15px;">
                <img src="${displayHeadshotUrl}" alt="${data.photographerName || 'Photographer'}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid ${primaryColor};" />
              </td>
              <td style="vertical-align: top;">
                <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${primaryColor};">${data.photographerName || data.businessName || ''}</p>
                ${data.businessName && data.photographerName ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: ${secondaryColor};">${data.businessName}</p>` : ''}
                ${data.phone ? `<p style="margin: 3px 0;">📞 ${data.phone}</p>` : ''}
                ${data.email ? `<p style="margin: 3px 0;">✉️ <a href="mailto:${data.email}" style="color: ${primaryColor}; text-decoration: none;">${data.email}</a></p>` : ''}
                ${data.website ? `<p style="margin: 3px 0;">🌐 <a href="${data.website}" style="color: ${primaryColor}; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></p>` : ''}
                ${Object.keys(socialLinks).length > 0 ? `
                  <p style="margin: 10px 0 0 0;">
                    ${socialLinks.facebook ? `<a href="${socialLinks.facebook}" style="margin-right: 10px; text-decoration: none;"><img src="${SOCIAL_ICONS.facebook}" alt="Facebook" width="20" height="20" style="vertical-align: middle;" /></a>` : ''}
                    ${socialLinks.instagram ? `<a href="${socialLinks.instagram}" style="margin-right: 10px; text-decoration: none;"><img src="${SOCIAL_ICONS.instagram}" alt="Instagram" width="20" height="20" style="vertical-align: middle;" /></a>` : ''}
                    ${socialLinks.twitter ? `<a href="${socialLinks.twitter}" style="margin-right: 10px; text-decoration: none;"><img src="${SOCIAL_ICONS.twitter}" alt="Twitter" width="20" height="20" style="vertical-align: middle;" /></a>` : ''}
                    ${socialLinks.linkedin ? `<a href="${socialLinks.linkedin}" style="margin-right: 10px; text-decoration: none;"><img src="${SOCIAL_ICONS.linkedin}" alt="LinkedIn" width="20" height="20" style="vertical-align: middle;" /></a>` : ''}
                  </p>
                ` : ''}
              </td>
            </tr>
          </table>
        </div>
      `;

    case 'detailed':
      return `
        <div style="margin-top: 30px; padding: 25px; background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%); border: 1px solid #e0e0e0; border-radius: 8px; color: ${secondaryColor}; font-size: 14px;">
          <table style="width: 100%;">
            <tr>
              <td style="text-align: center; padding-bottom: 15px;">
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 100px; height: auto; margin-bottom: 10px;" />` : ''}
                <h3 style="margin: 0; color: ${primaryColor}; font-size: 18px; font-weight: 600;">${data.businessName || ''}</h3>
                ${data.photographerName ? `<p style="margin: 5px 0 0 0; color: ${secondaryColor}; font-size: 14px;">${data.photographerName}</p>` : ''}
              </td>
            </tr>
            <tr>
              <td style="border-top: 2px solid ${primaryColor}; padding-top: 15px;">
                ${data.phone ? `<p style="margin: 5px 0;">📞 <strong>Phone:</strong> ${data.phone}</p>` : ''}
                ${data.email ? `<p style="margin: 5px 0;">✉️ <strong>Email:</strong> <a href="mailto:${data.email}" style="color: ${primaryColor}; text-decoration: none;">${data.email}</a></p>` : ''}
                ${data.website ? `<p style="margin: 5px 0;">🌐 <strong>Web:</strong> <a href="${data.website}" style="color: ${primaryColor}; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></p>` : ''}
                ${data.businessAddress ? `<p style="margin: 5px 0;">📍 <strong>Address:</strong> ${data.businessAddress}</p>` : ''}
                ${Object.keys(socialLinks).length > 0 ? `
                  <p style="margin: 10px 0 0 0;">
                    <strong>Connect:</strong> 
                    ${socialLinks.facebook ? `<a href="${socialLinks.facebook}" style="margin-left: 8px; text-decoration: none;"><img src="${SOCIAL_ICONS.facebook}" alt="Facebook" width="20" height="20" style="vertical-align: middle;" /></a>` : ''}
                    ${socialLinks.instagram ? `<a href="${socialLinks.instagram}" style="margin-left: 8px; text-decoration: none;"><img src="${SOCIAL_ICONS.instagram}" alt="Instagram" width="20" height="20" style="vertical-align: middle;" /></a>` : ''}
                    ${socialLinks.twitter ? `<a href="${socialLinks.twitter}" style="margin-left: 8px; text-decoration: none;"><img src="${SOCIAL_ICONS.twitter}" alt="Twitter" width="20" height="20" style="vertical-align: middle;" /></a>` : ''}
                    ${socialLinks.linkedin ? `<a href="${socialLinks.linkedin}" style="margin-left: 8px; text-decoration: none;"><img src="${SOCIAL_ICONS.linkedin}" alt="LinkedIn" width="20" height="20" style="vertical-align: middle;" /></a>` : ''}
                  </p>
                ` : ''}
              </td>
            </tr>
          </table>
        </div>
      `;

    case 'branded':
      return `
        <div style="margin-top: 30px; padding: 0;">
          <div style="background: ${primaryColor}; padding: 20px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-width: 80px; height: auto; filter: brightness(0) invert(1);" />` : ''}
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid ${primaryColor};">
            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: ${primaryColor};">${data.photographerName || data.businessName || ''}</p>
            ${data.businessName && data.photographerName ? `<p style="margin: 0 0 10px 0; font-size: 13px; color: ${secondaryColor};">${data.businessName}</p>` : ''}
            <table style="width: 100%; font-size: 13px; color: ${secondaryColor};">
              ${data.phone ? `<tr><td style="padding: 3px 0; width: 30px;">📞</td><td style="padding: 3px 0;">${data.phone}</td></tr>` : ''}
              ${data.email ? `<tr><td style="padding: 3px 0;">✉️</td><td style="padding: 3px 0;"><a href="mailto:${data.email}" style="color: ${primaryColor}; text-decoration: none;">${data.email}</a></td></tr>` : ''}
              ${data.website ? `<tr><td style="padding: 3px 0;">🌐</td><td style="padding: 3px 0;"><a href="${data.website}" style="color: ${primaryColor}; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></td></tr>` : ''}
            </table>
            ${Object.keys(socialLinks).length > 0 ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                ${socialLinks.facebook ? `<a href="${socialLinks.facebook}" style="display: inline-block; margin-right: 12px; text-decoration: none;"><img src="${SOCIAL_ICONS.facebook}" alt="Facebook" width="24" height="24" style="vertical-align: middle;" /></a>` : ''}
                ${socialLinks.instagram ? `<a href="${socialLinks.instagram}" style="display: inline-block; margin-right: 12px; text-decoration: none;"><img src="${SOCIAL_ICONS.instagram}" alt="Instagram" width="24" height="24" style="vertical-align: middle;" /></a>` : ''}
                ${socialLinks.twitter ? `<a href="${socialLinks.twitter}" style="display: inline-block; margin-right: 12px; text-decoration: none;"><img src="${SOCIAL_ICONS.twitter}" alt="Twitter" width="24" height="24" style="vertical-align: middle;" /></a>` : ''}
                ${socialLinks.linkedin ? `<a href="${socialLinks.linkedin}" style="display: inline-block; margin-right: 12px; text-decoration: none;"><img src="${SOCIAL_ICONS.linkedin}" alt="LinkedIn" width="24" height="24" style="vertical-align: middle;" /></a>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `;

    default:
      return '';
  }
}

/**
 * Simple template variable replacement
 * Matches {{variable}}, {{ variable }}, {{first_name}}, etc.
 */
function renderTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return variables[trimmedKey] !== undefined ? String(variables[trimmedKey]) : match;
  });
}

/**
 * Generate email HTML and text from email blocks
 */
export function generateEmailFromBlocks(
  blocks: any[],
  variables: Record<string, any>,
  photographer: any
): { htmlBody: string; textBody: string } {
  const brandingData: BrandingData = {
    businessName: photographer?.businessName || undefined,
    photographerName: photographer?.photographerName || undefined,
    logoUrl: photographer?.logoUrl || undefined,
    headshotUrl: photographer?.headshotUrl || undefined,
    brandPrimary: photographer?.brandPrimary || undefined,
    brandSecondary: photographer?.brandSecondary || undefined,
    phone: photographer?.phone || undefined,
    email: photographer?.emailFromAddr || photographer?.googleEmail || undefined,
    website: photographer?.website || undefined,
    businessAddress: photographer?.businessAddress || undefined,
    socialLinks: photographer?.socialLinksJson || undefined
  };

  let htmlParts: string[] = [];
  let textParts: string[] = [];

  for (const block of blocks) {
    const blockType = block.type;

    switch (blockType) {
      case 'HEADER':
        const headerStyle = block.style || block.content?.style || 'professional';
        htmlParts.push(generateEmailHeader(headerStyle, brandingData));
        break;

      case 'HEADING':
        const headingText = renderTemplate(block.content?.text || '', variables);
        htmlParts.push(`<h2 style="font-size: 24px; font-weight: 600; margin: 20px 0 10px 0; color: #000000;">${headingText}</h2>`);
        textParts.push(`\n${headingText}\n${'='.repeat(headingText.length)}\n`);
        break;

      case 'TEXT':
        const textContent = renderTemplate(block.content?.text || '', variables);
        htmlParts.push(`<p style="font-size: 16px; line-height: 1.6; margin: 10px 0; color: #333333;">${textContent.replace(/\n/g, '<br>')}</p>`);
        textParts.push(textContent + '\n');
        break;

      case 'BUTTON':
        const buttonText = renderTemplate(block.content?.text || 'Click Here', variables);
        const buttonUrl = renderTemplate(block.content?.url || '#', variables);
        const buttonColor = block.content?.color || brandingData.brandPrimary || '#007bff';
        htmlParts.push(`
          <div style="margin: 20px 0; text-align: center;">
            <a href="${buttonUrl}" style="display: inline-block; padding: 12px 30px; background-color: ${buttonColor}; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">${buttonText}</a>
          </div>
        `);
        textParts.push(`\n${buttonText}: ${buttonUrl}\n`);
        break;

      case 'IMAGE':
        const imageUrl = toAbsoluteUrl(block.content?.url);
        if (imageUrl) {
          const imageAlt = block.content?.alt || 'Image';
          htmlParts.push(`
            <div style="margin: 20px 0; text-align: center;">
              <img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto; border-radius: 8px;" />
            </div>
          `);
          textParts.push(`[Image: ${imageAlt}]\n`);
        }
        break;

      case 'SPACER':
        const height = block.content?.height || 20;
        htmlParts.push(`<div style="height: ${height}px;"></div>`);
        textParts.push('\n');
        break;

      case 'SIGNATURE':
        const signatureStyle = block.style || block.content?.style || 'professional';
        htmlParts.push(generateEmailSignature(signatureStyle, brandingData));
        textParts.push(`\n---\n${brandingData.photographerName || brandingData.businessName || ''}\n`);
        if (brandingData.phone) textParts.push(`Phone: ${brandingData.phone}\n`);
        if (brandingData.email) textParts.push(`Email: ${brandingData.email}\n`);
        if (brandingData.website) textParts.push(`Web: ${brandingData.website}\n`);
        break;

      default:
        break;
    }
  }

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        ${htmlParts.join('\n')}
      </div>
    </body>
    </html>
  `;

  const textBody = textParts.join('\n').trim();

  return { htmlBody, textBody };
}
