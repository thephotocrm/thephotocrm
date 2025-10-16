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
 * Header Templates
 */

export function generateHeader(style: string | null, data: BrandingData): string {
  if (!style) return '';

  const primaryColor = data.brandPrimary || '#000000';
  const secondaryColor = data.brandSecondary || '#666666';

  switch (style) {
    case 'minimal':
      return `
        <div style="text-align: center; padding: 20px 0; margin-bottom: 30px;">
          ${data.logoUrl ? `<img src="${data.logoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 150px; height: auto;" />` : ''}
        </div>
      `;

    case 'professional':
      return `
        <div style="text-align: center; padding: 20px 0; margin-bottom: 30px; border-bottom: 2px solid ${primaryColor};">
          ${data.logoUrl ? `<img src="${data.logoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />` : ''}
          ${data.businessName ? `<h2 style="margin: 10px 0 0 0; color: ${primaryColor}; font-size: 24px; font-weight: 600;">${data.businessName}</h2>` : ''}
        </div>
      `;

    case 'bold':
      return `
        <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px 20px; text-align: center; margin-bottom: 30px;">
          ${data.logoUrl ? `<img src="${data.logoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 150px; height: auto; margin-bottom: 10px; filter: brightness(0) invert(1);" />` : ''}
          ${data.businessName ? `<h1 style="margin: 10px 0 0 0; color: white; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${data.businessName}</h1>` : ''}
        </div>
      `;

    case 'classic':
      return `
        <div style="display: table; width: 100%; padding: 20px 0; margin-bottom: 30px; border-bottom: 1px solid #e0e0e0;">
          <div style="display: table-cell; vertical-align: middle; text-align: left;">
            ${data.logoUrl ? `<img src="${data.logoUrl}" alt="${data.businessName || 'Logo'}" style="max-width: 120px; height: auto;" />` : ''}
          </div>
          <div style="display: table-cell; vertical-align: middle; text-align: right;">
            ${data.businessName ? `<h2 style="margin: 0; color: ${primaryColor}; font-size: 22px; font-weight: 600;">${data.businessName}</h2>` : ''}
            ${data.photographerName ? `<p style="margin: 5px 0 0 0; color: ${secondaryColor}; font-size: 14px;">${data.photographerName}</p>` : ''}
          </div>
        </div>
      `;

    default:
      return '';
  }
}

/**
 * Signature Templates
 */

export function generateSignature(style: string | null, data: BrandingData): string {
  if (!style) return '';

  const primaryColor = data.brandPrimary || '#000000';
  const secondaryColor = data.brandSecondary || '#666666';
  const socialLinks = data.socialLinks || {};

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
      const headshotUrl = data.headshotUrl || defaultHeadshot;
      
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
                    ${socialLinks.facebook ? `<a href="${socialLinks.facebook}" style="margin-right: 10px; text-decoration: none; font-size: 18px;">📘</a>` : ''}
                    ${socialLinks.instagram ? `<a href="${socialLinks.instagram}" style="margin-right: 10px; text-decoration: none; font-size: 18px;">📷</a>` : ''}
                    ${socialLinks.twitter ? `<a href="${socialLinks.twitter}" style="margin-right: 10px; text-decoration: none; font-size: 18px;">🐦</a>` : ''}
                    ${socialLinks.linkedin ? `<a href="${socialLinks.linkedin}" style="margin-right: 10px; text-decoration: none; font-size: 18px;">💼</a>` : ''}
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
                ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo" style="max-width: 100px; height: auto; margin-bottom: 10px;" />` : ''}
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
                    ${socialLinks.facebook ? `<a href="${socialLinks.facebook}" style="margin-left: 8px; text-decoration: none; font-size: 18px;">📘</a>` : ''}
                    ${socialLinks.instagram ? `<a href="${socialLinks.instagram}" style="margin-left: 8px; text-decoration: none; font-size: 18px;">📷</a>` : ''}
                    ${socialLinks.twitter ? `<a href="${socialLinks.twitter}" style="margin-left: 8px; text-decoration: none; font-size: 18px;">🐦</a>` : ''}
                    ${socialLinks.linkedin ? `<a href="${socialLinks.linkedin}" style="margin-left: 8px; text-decoration: none; font-size: 18px;">💼</a>` : ''}
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
            ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo" style="max-width: 80px; height: auto; filter: brightness(0) invert(1);" />` : ''}
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
                ${socialLinks.facebook ? `<a href="${socialLinks.facebook}" style="display: inline-block; margin-right: 12px; text-decoration: none; font-size: 20px;">📘</a>` : ''}
                ${socialLinks.instagram ? `<a href="${socialLinks.instagram}" style="display: inline-block; margin-right: 12px; text-decoration: none; font-size: 20px;">📷</a>` : ''}
                ${socialLinks.twitter ? `<a href="${socialLinks.twitter}" style="display: inline-block; margin-right: 12px; text-decoration: none; font-size: 20px;">🐦</a>` : ''}
                ${socialLinks.linkedin ? `<a href="${socialLinks.linkedin}" style="display: inline-block; margin-right: 12px; text-decoration: none; font-size: 20px;">💼</a>` : ''}
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
