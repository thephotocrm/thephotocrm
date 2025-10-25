import { nanoid } from 'nanoid';

export interface EmailBlock {
  id: string;
  type: 'HEADING' | 'TEXT' | 'BUTTON' | 'IMAGE' | 'SPACER';
  content: any;
}

/**
 * Converts static HTML email templates into visual builder blocks
 * Intelligently parses HTML structure and creates appropriate blocks
 */
export function convertHtmlToBlocks(htmlBody: string): EmailBlock[] {
  const blocks: EmailBlock[] = [];
  
  if (!htmlBody) return blocks;

  // Extract the main content section from the email template
  const contentMatch = htmlBody.match(/<div class="content-section"[^>]*>(.*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/s);
  if (!contentMatch) return blocks;
  
  let content = contentMatch[1];
  
  // Remove the "Dear {{firstName}}," greeting - that's added automatically
  content = content.replace(/<p[^>]*>Dear {{firstName}},<\/p>/g, '');
  
  // Remove the email wrapper div
  content = content.replace(/<div[^>]*>(.*?)<\/div>\s*$/s, '$1').trim();
  
  // Parse the content into blocks
  parseContentToBlocks(content, blocks);
  
  return blocks;
}

function parseContentToBlocks(html: string, blocks: EmailBlock[]): void {
  // Clean up the HTML
  let cleanHtml = html.trim();
  
  // Split by major sections (divs, paragraphs, lists, etc.)
  const elementRegex = /<(h[1-6]|p|ul|ol|div|a)[^>]*>(.*?)<\/\1>|<br\s*\/?>/gs;
  
  let lastIndex = 0;
  let match;
  
  while ((match = elementRegex.exec(cleanHtml)) !== null) {
    const tag = match[1];
    const innerContent = match[2] || '';
    const matchStart = match.index;
    
    // Handle text before this match
    if (matchStart > lastIndex) {
      const textBefore = cleanHtml.substring(lastIndex, matchStart).trim();
      if (textBefore) {
        addTextBlock(blocks, textBefore);
      }
    }
    
    // Process based on tag type
    if (tag && tag.match(/^h[1-6]$/)) {
      // Heading
      addHeadingBlock(blocks, stripHtml(innerContent));
    } else if (tag === 'p') {
      const cleanedContent = stripHtml(innerContent).trim();
      if (cleanedContent) {
        // Check if it's a tip or important callout
        if (innerContent.includes('💡') || innerContent.includes('⚠️') || innerContent.includes('<strong>')) {
          // Extract the tip content
          const tipMatch = innerContent.match(/💡\s*<\/div>\s*<div[^>]*>(.*?)<\/div>/s) || 
                          innerContent.match(/⚠️\s*Important<\/div>\s*<div[^>]*>(.*?)<\/div>/s);
          if (tipMatch) {
            addTextBlock(blocks, `💡 ${stripHtml(tipMatch[1])}`);
          } else {
            addTextBlock(blocks, cleanedContent);
          }
        } else {
          addTextBlock(blocks, cleanedContent);
        }
      }
    } else if (tag === 'ul' || tag === 'ol') {
      // List
      const listItems = innerContent.match(/<li[^>]*>(.*?)<\/li>/gs);
      if (listItems) {
        const listText = listItems
          .map(item => {
            const cleaned = stripHtml(item.replace(/<\/?li[^>]*>/g, ''));
            return `• ${cleaned}`;
          })
          .join('\n');
        addTextBlock(blocks, listText);
      }
    } else if (tag === 'div') {
      // Check if it's a styled div (tip, callout, CTA)
      if (innerContent.includes('cta-button') || innerContent.includes('Start Conversation')) {
        // It's a CTA button
        const buttonMatch = innerContent.match(/href="([^"]+)"/);
        const buttonTextMatch = innerContent.match(/>([^<]+)<\/a>/);
        if (buttonMatch && buttonTextMatch) {
          addButtonBlock(blocks, stripHtml(buttonTextMatch[1]), buttonMatch[1]);
        }
      } else if (innerContent.includes('💡') || innerContent.includes('⚠️')) {
        // It's a tip/callout - extract the content
        const tipContent = stripHtml(innerContent);
        if (tipContent) {
          addTextBlock(blocks, tipContent);
        }
      } else {
        // Regular div - parse its contents recursively
        parseContentToBlocks(innerContent, blocks);
      }
    } else if (tag === 'a') {
      // Standalone link button
      const href = match[0].match(/href="([^"]+)"/)?.[1];
      const buttonText = stripHtml(innerContent);
      if (href && buttonText) {
        addButtonBlock(blocks, buttonText, href);
      }
    } else if (tag === 'br') {
      // Line break - add small spacer
      blocks.push({
        id: nanoid(),
        type: 'SPACER',
        content: { height: 20 }
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Handle any remaining text
  if (lastIndex < cleanHtml.length) {
    const remainingText = cleanHtml.substring(lastIndex).trim();
    if (remainingText) {
      addTextBlock(blocks, stripHtml(remainingText));
    }
  }
}

function addHeadingBlock(blocks: EmailBlock[], text: string): void {
  if (!text.trim()) return;
  blocks.push({
    id: nanoid(),
    type: 'HEADING',
    content: { text: text.trim(), level: 2 }
  });
}

function addTextBlock(blocks: EmailBlock[], text: string): void {
  if (!text.trim()) return;
  blocks.push({
    id: nanoid(),
    type: 'TEXT',
    content: { text: text.trim() }
  });
}

function addButtonBlock(blocks: EmailBlock[], text: string, url: string): void {
  if (!text.trim()) return;
  
  // Determine button type
  let buttonType: 'CUSTOM' | 'SMART_FILE' | 'GALLERY' | 'CALENDAR' = 'CUSTOM';
  let linkValue = url;
  
  if (url.includes('mailto:')) {
    buttonType = 'CUSTOM';
    linkValue = url;
  } else if (url.includes('/smart-files/') || url.includes('{{smartFileUrl}}')) {
    buttonType = 'SMART_FILE';
    linkValue = '';
  } else if (url.includes('/galleries/') || url.includes('{{galleryUrl}}')) {
    buttonType = 'GALLERY';
    linkValue = '';
  } else if (url.includes('/booking/') || url.includes('{{calendarUrl}}')) {
    buttonType = 'CALENDAR';
    linkValue = '';
  }
  
  blocks.push({
    id: nanoid(),
    type: 'BUTTON',
    content: {
      text: text.trim(),
      linkType: buttonType,
      link: linkValue
    }
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace nbsp
    .replace(/&amp;/g, '&') // Replace amp
    .replace(/&lt;/g, '<') // Replace lt
    .replace(/&gt;/g, '>') // Replace gt
    .replace(/&quot;/g, '"') // Replace quot
    .replace(/&#39;/g, "'") // Replace apos
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
