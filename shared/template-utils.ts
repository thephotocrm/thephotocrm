/**
 * Shared template rendering utility that supports both {variable} and {{variable}} formats
 * Fixes the critical bug where single-brace tokens were replaced before double-brace tokens
 */

/**
 * Escapes special regex characters in a string
 */
function escapeRegexKey(key: string): string {
  return key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Renders template variables in both {variable} and {{variable}} formats
 * Double-brace format takes precedence to avoid corruption during replacement
 * 
 * @param template - Template string containing variables
 * @param variables - Object mapping variable names to values
 * @returns Rendered template with variables replaced
 * 
 * @example
 * renderTemplate("Hello {{firstName}} {lastName}!", { firstName: "John", lastName: "Doe" })
 * // Returns: "Hello John Doe!"
 */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const escapedKey = escapeRegexKey(key);
    
    // Single regex pattern that handles both formats with optional whitespace
    // Double braces pattern comes first to take precedence
    const pattern = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}|\\{\\s*${escapedKey}\\s*\\}`, 'g');
    
    rendered = rendered.replace(pattern, value);
  }
  
  return rendered;
}

/**
 * Content block type for email template builder
 */
export type ContentBlock = {
  id: string;
  type: 'HEADING' | 'TEXT' | 'BUTTON' | 'IMAGE' | 'SPACER';
  content: any;
};

/**
 * Converts content blocks to HTML for email sending
 */
export function contentBlocksToHtml(blocks: ContentBlock[], context?: {
  smartFileToken?: string;
  galleryUrl?: string;
  photographerToken?: string;
  baseUrl?: string;
  includeWrapper?: boolean; // If false, returns just the raw block markup without grey container
}): string {
  if (!blocks || blocks.length === 0) {
    return '';
  }

  const baseUrl = context?.baseUrl || (typeof process !== 'undefined' && process.env?.REPLIT_DEV_DOMAIN) || 'https://yourdomain.com';

  const htmlBlocks = blocks.map(block => {
    switch (block.type) {
      case 'HEADING':
        return `<h2 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0 0 16px 0;">${escapeHtml(block.content?.text || 'Heading')}</h2>`;
      
      case 'TEXT':
        const textLines = (block.content?.text || 'Text content').split('\n');
        return `<p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 16px 0; white-space: pre-wrap;">${textLines.map(escapeHtml).join('<br>')}</p>`;
      
      case 'BUTTON':
        const variant = block.content?.variant || 'default';
        let buttonStyles = '';
        
        if (variant === 'default') {
          buttonStyles = 'background-color: #2563eb; color: #ffffff;';
        } else if (variant === 'secondary') {
          buttonStyles = 'background-color: #6b7280; color: #ffffff;';
        } else if (variant === 'outline') {
          buttonStyles = 'background-color: transparent; color: #2563eb; border: 2px solid #2563eb;';
        }
        
        let href = '#';
        const linkType = block.content?.linkType;
        const linkValue = block.content?.linkValue;
        
        if (linkType === 'CUSTOM') {
          href = linkValue || '#';
        } else if (linkType === 'SMART_FILE') {
          href = context?.smartFileToken ? `${baseUrl}/smart-file/${context.smartFileToken}` : '{{smart_file_link}}';
        } else if (linkType === 'GALLERY') {
          href = context?.galleryUrl || '{{gallery_url}}';
        } else if (linkType === 'CALENDAR') {
          // Use same placeholder as text version for consistency
          href = context?.photographerToken ? `${baseUrl}/booking/${context.photographerToken}` : '{{calendar_link}}';
        }
        
        return `<div style="margin: 0 0 16px 0;">
          <a href="${href}" style="display: inline-block; padding: 12px 24px; ${buttonStyles} border-radius: 6px; font-weight: 600; text-decoration: none; text-align: center;">
            ${escapeHtml(block.content?.text || 'Button Text')}
          </a>
        </div>`;
      
      case 'IMAGE':
        if (!block.content?.url) {
          return `<div style="margin: 0 0 16px 0; padding: 32px; background-color: #f3f4f6; border-radius: 8px; text-align: center; color: #9ca3af;">No image URL provided</div>`;
        }
        return `<div style="margin: 0 0 16px 0;">
          <img src="${escapeHtml(block.content.url)}" alt="Email content" style="max-width: 100%; height: auto; border-radius: 8px; display: block;">
        </div>`;
      
      case 'SPACER':
        const height = block.content?.height || 20;
        return `<div style="height: ${height}px; margin: 0 0 16px 0;"></div>`;
      
      default:
        return '';
    }
  }).join('\n');

  // If includeWrapper is false, return just the raw block markup
  if (context?.includeWrapper === false) {
    return htmlBlocks;
  }

  // Wrap in email container with proper styling
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${htmlBlocks}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Converts content blocks to plain text for email sending
 */
export function contentBlocksToText(blocks: ContentBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return '';
  }

  return blocks.map(block => {
    switch (block.type) {
      case 'HEADING':
        return `\n${block.content?.text || 'Heading'}\n${'='.repeat((block.content?.text || 'Heading').length)}\n`;
      
      case 'TEXT':
        return `${block.content?.text || 'Text content'}\n`;
      
      case 'BUTTON':
        let href = '#';
        const linkType = block.content?.linkType;
        const linkValue = block.content?.linkValue;
        
        if (linkType === 'CUSTOM') {
          href = linkValue || '#';
        } else if (linkType === 'SMART_FILE') {
          href = '{{smart_file_link}}';
        } else if (linkType === 'GALLERY') {
          href = '{{gallery_url}}';
        } else if (linkType === 'CALENDAR') {
          href = '{{calendar_link}}';
        }
        
        return `\n[${block.content?.text || 'Button'}] ${href}\n`;
      
      case 'IMAGE':
        return block.content?.url ? `\n[Image: ${block.content.url}]\n` : '\n[No image]\n';
      
      case 'SPACER':
        return '\n';
      
      default:
        return '';
    }
  }).join('\n');
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}