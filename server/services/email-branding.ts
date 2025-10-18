/**
 * Email Branding Templates
 * Provides header and signature templates for professional email branding
 */

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
 * Convert relative paths to absolute URLs for use in emails
 * Email clients require absolute URLs for images
 */
function toAbsoluteUrl(urlOrPath: string | undefined): string | undefined {
  if (!urlOrPath) return undefined;
  
  // If it's already an absolute URL, return as is
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  
  // Convert relative path to absolute URL using the app domain
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : `http://localhost:${process.env.PORT || 5000}`;
  
  // Remove leading slash if present to avoid double slashes
  const path = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  
  return `${baseUrl}${path}`;
}

/**
 * Header Templates
 */

export function generateHeader(style: string | null, data: BrandingData): string {
  if (!style) return '';

  const primaryColor = data.brandPrimary || '#000000';
  const secondaryColor = data.brandSecondary || '#666666';
  
  // Convert logo URL to absolute URL for emails
  const absoluteLogoUrl = toAbsoluteUrl(data.logoUrl);
  const absoluteHeadshotUrl = toAbsoluteUrl(data.headshotUrl);

  switch (style) {
    case 'minimal':
      // If logo exists, show only logo. If no logo, show business name
      return `
        <div style="text-align: center; padding: 20px 0; margin-bottom: 30px;">
          ${absoluteLogoUrl 
            ? `<img src="${absoluteLogoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 150px; height: auto;" />` 
            : data.businessName 
              ? `<h2 style="margin: 0; color: ${primaryColor}; font-size: 24px; font-weight: 600;">${data.businessName}</h2>` 
              : ''
          }
        </div>
      `;

    case 'professional':
      // If logo exists, show only logo. If no logo, show business name
      return `
        <div style="text-align: center; padding: 20px 0; margin-bottom: 30px; border-bottom: 2px solid ${primaryColor};">
          ${absoluteLogoUrl 
            ? `<img src="${absoluteLogoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 150px; height: auto;" />` 
            : data.businessName 
              ? `<h2 style="margin: 0; color: ${primaryColor}; font-size: 24px; font-weight: 600;">${data.businessName}</h2>` 
              : ''
          }
        </div>
      `;

    case 'bold':
      // If logo exists, show only logo. If no logo, show business name as text header
      return `
        <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px 20px; text-align: center; margin-bottom: 30px;">
          ${absoluteLogoUrl 
            ? `<img src="${absoluteLogoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 150px; height: auto; filter: brightness(0) invert(1);" />` 
            : data.businessName 
              ? `<h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${data.businessName}</h1>` 
              : ''
          }
        </div>
      `;

    case 'classic':
      // Classic style: logo on left, business name on right
      // If no logo, center the business name instead of showing broken image
      return `
        <div style="padding: 20px 0; margin-bottom: 30px; border-bottom: 1px solid #e0e0e0;">
          ${absoluteLogoUrl 
            ? `
              <div style="display: table; width: 100%;">
                <div style="display: table-cell; vertical-align: middle; text-align: left;">
                  <img src="${absoluteLogoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 120px; height: auto;" />
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
 * Social Media Icon SVGs (Base64 encoded for email compatibility)
 */
const SOCIAL_ICONS = {
  facebook: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMzE3N0ZGIj48cGF0aCBkPSJNMjQgMTJjMC02LjYyNy01LjM3My0xMi0xMi0xMlMwIDUuMzczIDAgMTJjMCA1Ljk5IDQuMzg4IDEwLjk1NCAxMC4xMjUgMTEuODU0di04LjM4NUg3LjA3OHYtMy40N2gzLjA0N1Y5LjM1NmMwLTMuMDA3IDEuNzkyLTQuNjY5IDQuNTMzLTQuNjY5IDEuMzEyIDAgMi42ODYuMjM1IDIuNjg2LjIzNXYyLjk1M0gxNS44M2MtMS40OTEgMC0xLjk1Ni45MjUtMS45NTYgMS44NzRWMTJoMy4zMjhsLS41MzIgMy40N2gtMi43OTZ2OC4zODVDMTkuNjEyIDIyLjk1NCAyNCAxNy45OSAyNCAxMnoiLz48L3N2Zz4=',
  instagram: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ1cmwoI2luc3RhZ3JhZGllbnQpIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9Imluc3RhZ3JhZGllbnQiIHgxPSIwJSIgeTE9IjEwMCUiIHgyPSIxMDAlIiB5Mj0iMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNGNTgzMjk7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSI1MCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNERDJBN0I7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNTE1QkQ0O3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGQ9Ik0xMiAyLjE2M2MzLjIwNCAwIDMuNTg0LjAxMiA0Ljg1LjA3IDMuMjUyLjE0OCA0Ljc3MSAxLjY5MSA0LjkxOSA0LjkxOS4wNTggMS4yNjUuMDY5IDEuNjQ1LjA2OSA0Ljg0OXMtLjAxMiAzLjU4NC0uMDY5IDQuODQ5Yy0uMTQ5IDMuMjI1LTEuNjY0IDQuNzcxLTQuOTE5IDQuOTE5LTEuMjY2LjA1OC0xLjY0NC4wNy00Ljg1LjA3cy0zLjU4NC0uMDEyLTQuODQ5LS4wN2MtMy4yNi0uMTQ5LTQuNzcxLTEuNjk5LTQuOTE5LTQuOTJDMi4xNzUgMTUuNzQ3IDIuMTYzIDE1LjM2NyAyLjE2MyAxMnMuMDEyLTMuNTg0LjA3LTQuODQ5QzIuMzgxIDMuOTI0IDMuODk2IDIuMzggNy4xNTEgMi4yMzNjMS4yNjUtLjA1NyAxLjY0NS0uMDcgNC44NDktLjA3TTEyIDBDOC43NDEgMCA4LjMzMy4wMTQgNy4wNTMuMDcyIDIuNjk1LjI3Mi4yNzMgMi42OS4wNzMgNy4wNTIuMDE0IDguMzMzIDAgOC43NDEgMCAxMnMuMDE0IDMuNjY4LjA3MiA0Ljk0OGMuMiA0LjM1OCAyLjYxOCA2Ljc4IDYuOTggNi45OEMxMS42NjcgMjMuOTg2IDEyLjA3NSAyNCAxMiAyNHMzLjMzMy0uMDE0IDQuOTQ4LS4wNzJjNC4zNTQtLjIgNi43ODItMi42MTggNi45NzktNi45OC4wNTktMS4yOC4wNzMtMS42ODkuMDczLTQuOTQ4cy0uMDE0LTMuNjY4LS4wNzItNC45NDhjLS4xOTYtNC4zNTQtMi42MTctNi43OC02Ljk3OS02Ljk4QzE1LjY2OC4wMTQgMTUuMjU5IDAgMTIgMHptMCA1LjgzOGE2LjE2MiA2LjE2MiAwIDEgMCAwIDEyLjMyNCA2LjE2MiA2LjE2MiAwIDAgMCAwLTEyLjMyNHpNMTIgMTZhNCA0IDAgMSAxIDAtOCA0IDQgMCAwIDEgMCA4em02LjQwNi0xMS44NDVhMS40NCAxLjQ0IDAgMSAwIDAgMi44ODkgMS40NCAxLjQ0IDAgMCAwIDAtMi44ODl6Ii8+PC9zdmc+',
  twitter: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMUQ5QkYwIj48cGF0aCBkPSJNMjMuOTUzIDQuNTdhMTAgMTAgMCAwIDEtMi44MjUuNzc1IDQuOTU4IDQuOTU4IDAgMCAwIDIuMTYzLTIuNzIzYy0uOTUxLjU1NS0yLjAwNS45NTktMy4xMjcgMS4xODRhNC45MiA0LjkyIDAgMCAwLTguMzg0IDQuNDgyQzcuNjkgOC4wOTUgNC4wNjcgNi4xMyAxLjY0IDMuMTYyYTQuODIyIDQuODIyIDAgMCAwLS42NjYgMi40NzVjMCAxLjcxLjg3IDMuMjEzIDIuMTg4IDQuMDk2YTQuOTA0IDQuOTA0IDAgMCAxLTIuMjI4LS42MTZ2LjA2YTQuOTIzIDQuOTIzIDAgMCAwIDMuOTQ2IDQuODI3IDQuOTk2IDQuOTk2IDAgMCAxLTIuMjEyLjA4NSA0LjkzNiA0LjkzNiAwIDAgMCA0LjYwNCAzLjQxNyA5Ljg2NyA5Ljg2NyAwIDAgMS02LjEwMiAyLjEwNWMtLjM5IDAtLjc3OS0uMDIzLTEuMTctLjA2N2ExMy45OTUgMTMuOTk1IDAgMCAwIDcuNTU3IDIuMjA5YzkuMDUzIDAgMTMuOTk4LTcuNDk2IDEzLjk5OC0xMy45ODUgMC0uMjEgMC0uNDItLjAxNS0uNjNBOS45MzUgOS45MzUgMCAwIDAgMjQgNC41OXoiLz48L3N2Zz4=',
  linkedin: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMDA3N0I1Ij48cGF0aCBkPSJNMjAuNDQ3IDIwLjQ1MmgtMy41NTR2LTUuNTY5YzAtMS4zMjgtLjAyNy0zLjAzNy0xLjg1Mi0zLjAzNy0xLjg1MyAwLTIuMTM2IDEuNDQ1LTIuMTM2IDIuOTM5djUuNjY3SDkuMzUxVjloMy40MTR2MS41NjFoLjA0NmMuNDc3LS45IDEuNjM3LTEuODUgMy4zNy0xLjg1IDMuNjAxIDAgNC4yNjcgMi4zNyA0LjI2NyA1LjQ1NXY2LjI4NnpNNS4zMzcgNy40MzNjLTEuMTQ0IDAtMi4wNjMtLjkyNi0yLjA2My0yLjA2NSAwLTEuMTM4LjkyLTIuMDYzIDIuMDYzLTIuMDYzIDEuMTQgMCAyLjA2NC45MjUgMi4wNjQgMi4wNjMgMCAxLjEzOS0uOTI1IDIuMDY1LTIuMDY0IDIuMDY1em0xLjc4MiAxMy4wMTlIMy41NTVWOWgzLjU2NHYxMS40NTJ6TTIyLjIyNSAwSC4xNzFDLjA3NyAwIDAgLjA3NyAwIC4xNzJ2MjMuNjU2YzAgLjA5NS4wNzcuMTcyLjE3MS4xNzJoMjIuMDU0Yy4wOTUgMCAuMTc2LS4wNzcuMTc2LS4xNzJWLjE3MkMyMi40MDEuMDc3IDIyLjMxOSAwIDIyLjIyNSAweiIvPjwvc3ZnPg=='
};

/**
 * Signature Templates
 */

export function generateSignature(style: string | null, data: BrandingData): string {
  if (!style) return '';

  const primaryColor = data.brandPrimary || '#000000';
  const secondaryColor = data.brandSecondary || '#666666';
  const socialLinks = data.socialLinks || {};
  
  // Convert URLs to absolute for emails
  const absoluteLogoUrl = toAbsoluteUrl(data.logoUrl);
  const absoluteHeadshotUrl = toAbsoluteUrl(data.headshotUrl);

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
      // Default placeholder headshot if none provided
      const defaultHeadshot = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=faces';
      const headshotUrl = absoluteHeadshotUrl || defaultHeadshot;
      
      return `
        <div style="margin-top: 30px; padding: 20px; border-top: 2px solid ${primaryColor}; color: ${secondaryColor}; font-size: 14px;">
          <table style="width: 100%; max-width: 500px;">
            <tr>
              <td style="width: 80px; vertical-align: top; padding-right: 15px;">
                <img src="${headshotUrl}" alt="${data.photographerName || 'Photographer'}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid ${primaryColor};" />
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
                ${absoluteLogoUrl ? `<img src="${absoluteLogoUrl}" alt="Logo" style="max-width: 100px; height: auto; margin-bottom: 10px;" />` : ''}
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
            ${absoluteLogoUrl ? `<img src="${absoluteLogoUrl}" alt="Logo" style="max-width: 80px; height: auto; filter: brightness(0) invert(1);" />` : ''}
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
 * Wrap email content with header and signature
 */
export function wrapEmailContent(
  content: string,
  headerStyle: string | null,
  signatureStyle: string | null,
  data: BrandingData
): string {
  const header = generateHeader(headerStyle, data);
  const signature = generateSignature(signatureStyle, data);

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${header}
      <div style="color: #333333; font-size: 15px; line-height: 1.6;">
        ${content}
      </div>
      ${signature}
    </div>
  `;
}
