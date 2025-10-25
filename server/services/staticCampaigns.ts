// Static Email Campaign System with Consistent Layouts
import type { Photographer } from '@shared/schema';
import { convertHtmlToBlocks } from '../utils/htmlToBlocks';

// Helper function to create simple, clean email blocks
function createSimpleEmailBlocks(title: string, content: string, tips?: string[], ctaText?: string, ctaUrl?: string) {
  const blocks: any[] = [
    { type: 'HEADING', content: { text: title, level: 'h2' } },
    { type: 'SPACER', content: { height: 20 } },
    { type: 'TEXT', content: { text: content } }
  ];
  
  if (tips && tips.length > 0) {
    blocks.push({ type: 'SPACER', content: { height: 15 } });
    blocks.push({ type: 'TEXT', content: { text: tips.join('\n') } });
  }
  
  if (ctaText && ctaUrl) {
    blocks.push({ type: 'SPACER', content: { height: 20 } });
    blocks.push({ type: 'BUTTON', content: { text: ctaText, url: ctaUrl } });
  }
  
  return blocks;
}

// Type definitions for static email campaigns
export interface StaticEmailTemplate {
  sequenceIndex: number;
  subject: string;
  weeksAfterStart: number; // Legacy compatibility
  daysAfterStart: number; // Research-optimized timing in days
  htmlBody: string;
  textBody: string;
  emailBlocks?: string; // JSON string of visual builder blocks
  useEmailBuilder?: boolean;
  sendAtHour?: number | null;
}

export interface StaticCampaignTemplate {
  projectType: string;
  emails: StaticEmailTemplate[];
}

// EMAIL_LAYOUTS: Subtle layout variations for consistent styling
const EMAIL_LAYOUTS = {
  minimal: {
    hasColoredHeader: false,
    headerAlignment: 'left',
    tipPlacement: 'top'
  },
  accent: {
    hasColoredHeader: true,
    headerAlignment: 'center', 
    tipPlacement: 'middle'
  },
  professional: {
    hasColoredHeader: false,
    headerAlignment: 'center',
    tipPlacement: 'bottom'
  },
  branded: {
    hasColoredHeader: true,
    headerAlignment: 'left',
    tipPlacement: 'middle'
  },
  elegant: {
    hasColoredHeader: false,
    headerAlignment: 'center',
    tipPlacement: 'top'
  }
};

// Enhanced content with subtle layout-based modules
function enhanceContentWithLayoutModules(
  content: string, 
  layout: any, 
  primaryColor: string, 
  secondaryColor: string,
  sequenceIndex: number
): string {
  if (!content) return content;
  
  let enhancedContent = content;
  
  // Add tip containers at different placements
  const tipPattern = /<p><strong>([^:]+):<\/strong>([^<]+)<\/p>/g;
  let match;
  
  while ((match = tipPattern.exec(content)) !== null) {
    const tipStyle = layout.tipPlacement === 'top' 
      ? `background: #f8f9fa; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 20px 0; border-radius: 4px;`
      : layout.tipPlacement === 'middle'
      ? `background: linear-gradient(90deg, ${primaryColor}10 0%, transparent 100%); border: 1px solid ${primaryColor}30; padding: 15px; margin: 20px 0; border-radius: 8px;`
      : `background: ${primaryColor}05; border-top: 2px solid ${secondaryColor}; padding: 15px; margin: 20px 0; border-radius: 0 0 6px 6px;`;
    
    enhancedContent = enhancedContent.replace(
      match[0],
      `<div style="${tipStyle}">
        <div style="font-weight: 600; margin-bottom: 6px;">💡 ${match[1]}</div>
        <div style="line-height: 1.5; opacity: 0.95;">${match[2].trim()}</div>
      </div>`
    );
  }

  // Add important callouts
  const importantPattern = /⚠️([^⚠️]+)/g;
  while ((match = importantPattern.exec(content)) !== null) {
    enhancedContent = enhancedContent.replace(
      match[0],
      `<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #fdcb6e;">
        <div style="font-weight: 600; margin-bottom: 6px;">⚠️ Important</div>
        <div style="line-height: 1.5; opacity: 0.95;">${match[0].replace(/<\/?[^>]+(>|$)/g, "")}</div>
      </div>`
    );
  }

  return enhancedContent;
}

// Main function to generate emails with subtle layout variations
function generateEmailHTML(
  photographer: Photographer,
  subject: string,
  content: string,
  includeBookingCTA: boolean = false,
  sequenceIndex: number = 0
): string {
  const businessName = photographer.businessName;
  const emailFromName = photographer.emailFromName || businessName;
  const emailFromAddr = photographer.emailFromAddr || 'hello@business.com';
  const logoUrl = photographer.logoUrl || '';

  // Get layout based on sequence index (cycles through 5 layouts)
  const layoutKeys = Object.keys(EMAIL_LAYOUTS) as Array<keyof typeof EMAIL_LAYOUTS>;
  const layoutKey = layoutKeys[sequenceIndex % layoutKeys.length];
  const layout = EMAIL_LAYOUTS[layoutKey];
  
  // Use photographer's brand colors or defaults
  const primaryColor = photographer.brandPrimary || '#2c3e50';
  const secondaryColor = photographer.brandSecondary || '#3498db';
  
  // Enhance content with layout-based modules
  const enhancedContent = enhanceContentWithLayoutModules(content, layout, primaryColor, secondaryColor, sequenceIndex);

  // Generate email with consistent styling but layout variations
  return generateConsistentTemplate(
    subject, 
    enhancedContent, 
    includeBookingCTA, 
    layout, 
    primaryColor, 
    secondaryColor,
    businessName, 
    emailFromName, 
    emailFromAddr,
    logoUrl
  );
}

// Consistent Email Template with Subtle Layout Variations
function generateConsistentTemplate(
  subject: string,
  content: string,
  includeBookingCTA: boolean,
  layout: any,
  primaryColor: string,
  secondaryColor: string,
  businessName: string,
  emailFromName: string,
  emailFromAddr: string,
  logoUrl: string = ''
): string {
  // Determine header style based on layout
  const headerStyle = layout.hasColoredHeader 
    ? `background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: white;`
    : `background: white; color: ${primaryColor}; border-bottom: 1px solid #e0e0e0;`;
  
  const headerTextColor = layout.hasColoredHeader ? 'white' : primaryColor;
  const headerSubColor = layout.hasColoredHeader ? 'rgba(255,255,255,0.9)' : secondaryColor;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <link href="https://fonts.googleapis.com/css2?family=Georgia:wght@400;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 15px !important; }
      .header-title { font-size: 24px !important; }
      .content-section { padding: 25px 20px !important; }
      .cta-button { width: 100% !important; padding: 15px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Lato', 'Helvetica Neue', Arial, sans-serif; line-height: 1.7;">
  <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 15px rgba(0,0,0,0.1);">
    
    <!-- Header with Conditional Styling -->
    <div style="${headerStyle} padding: 40px 40px 30px; text-align: ${layout.headerAlignment};">
      <h1 class="header-title" style="color: ${headerTextColor}; margin: 0 0 15px; font-size: 28px; font-weight: 400; font-family: 'Georgia', serif; line-height: 1.2;">
        ${subject}
      </h1>
      <div style="width: 60px; height: 2px; background: ${layout.hasColoredHeader ? 'rgba(255,255,255,0.7)' : primaryColor}; margin: ${layout.headerAlignment === 'center' ? '0 auto 15px' : '0 0 15px'};"></div>
      <p style="color: ${headerSubColor}; margin: 0; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 300; letter-spacing: 0.5px;">
        ${businessName}
      </p>
    </div>

    <!-- Content -->
    <div class="content-section" style="padding: 40px;">
      <p style="color: #4a5568; line-height: 1.8; margin-bottom: 25px; font-size: 16px; font-family: 'Lato', sans-serif;">
        Dear {{firstName}},
      </p>
      
      <div style="color: #4a5568; line-height: 1.8; font-size: 16px; margin-bottom: 35px; font-family: 'Lato', sans-serif;">
        ${content}
      </div>

      ${includeBookingCTA ? `
        <!-- Consistent CTA -->
        <div style="border-top: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; padding: 35px 0; text-align: center; margin: 40px 0;">
          <h3 style="color: ${primaryColor}; margin: 0 0 20px; font-size: 20px; font-weight: 400; font-family: 'Georgia', serif;">
            Let's Create Something Beautiful Together
          </h3>
          <p style="color: #4a5568; margin: 0 0 25px; line-height: 1.6; font-size: 16px; font-family: 'Lato', sans-serif;">
            I'd love to discuss your vision and how we can bring it to life.
          </p>
          <a href="mailto:${emailFromAddr}" class="cta-button" 
             style="background: ${primaryColor}; 
                    color: white; 
                    padding: 16px 35px; 
                    text-decoration: none; 
                    border-radius: 6px;
                    display: inline-block; 
                    font-weight: 400; 
                    font-size: 16px;
                    font-family: 'Lato', sans-serif;
                    letter-spacing: 0.5px; 
                    text-transform: uppercase;">
            Start Conversation
          </a>
        </div>
      ` : ''}
    </div>

    <!-- Footer with Optional Logo -->
    <div style="background: #f8f9fa; padding: 35px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
      ${logoUrl ? `
        <div style="margin-bottom: 20px;">
          <img src="${logoUrl}" alt="${businessName} Logo" style="max-height: 60px; max-width: 200px;">
        </div>
      ` : ''}
      <p style="color: #4a5568; margin: 0 0 8px; font-size: 18px; font-family: 'Georgia', serif; font-style: italic;">
        ${emailFromName}
      </p>
      <p style="color: #718096; margin: 0 0 15px; font-size: 14px; font-family: 'Lato', sans-serif;">
        ${businessName} • Professional Photography
      </p>
      ${emailFromAddr !== 'hello@business.com' ? `
        <p style="margin: 0;">
          <a href="mailto:${emailFromAddr}" style="color: ${secondaryColor}; text-decoration: none; font-weight: 400; font-size: 14px; font-family: 'Lato', sans-serif;">${emailFromAddr}</a>
        </p>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

// Static Email Templates with Research-Backed Timing
// ⚠️ TESTING MODE: 5-minute intervals (normally days/weeks apart)
const WEDDING_EMAIL_TEMPLATES = {
  projectType: 'WEDDING' as const,
  emails: [
    {
      sequenceIndex: 0,
      subject: "Welcome to Your Wedding Journey!",
      weeksAfterStart: 0,
      daysAfterStart: 0, // 0 minutes
      htmlBody: "",
      textBody: "Your wedding planning adventure begins now with expert guidance every step of the way."
    },
    {
      sequenceIndex: 1,
      subject: "Setting Your Wedding Vision",
      weeksAfterStart: 0,
      daysAfterStart: 0.003472, // 5 minutes
      htmlBody: "",
      textBody: "Define your unique style and create a cohesive vision for your perfect day."
    },
    {
      sequenceIndex: 2,
      subject: "Your Wedding Budget: Planning Made Simple",
      weeksAfterStart: 1,
      daysAfterStart: 0.006944, // 10 minutes
      htmlBody: "",
      textBody: "Learn practical strategies for creating and managing your wedding budget effectively."
    },
    {
      sequenceIndex: 3,
      subject: "Choosing Your Perfect Wedding Venue",
      weeksAfterStart: 2,
      daysAfterStart: 0.010417, // 15 minutes
      htmlBody: "",
      textBody: "Essential tips for finding and booking the ideal venue for your celebration."
    },
    {
      sequenceIndex: 4,
      subject: "Building Your Dream Wedding Team",
      weeksAfterStart: 3,
      daysAfterStart: 0.013889, // 20 minutes
      htmlBody: "",
      textBody: "How to research, interview, and select the perfect vendors for your wedding day."
    },
    {
      sequenceIndex: 5,
      subject: "Wedding Photography Styles Explained",
      weeksAfterStart: 4,
      daysAfterStart: 0.017361, // 25 minutes
      htmlBody: "",
      textBody: "Understanding different photography styles to choose what's perfect for you."
    },
    {
      sequenceIndex: 6,
      subject: "Planning Your Engagement Session",
      weeksAfterStart: 5,
      daysAfterStart: 0.020833, // 30 minutes
      htmlBody: "",
      textBody: "Make the most of your engagement session with these expert preparation tips."
    },
    {
      sequenceIndex: 7,
      subject: "Wedding Dress Shopping Success",
      weeksAfterStart: 6,
      daysAfterStart: 0.024306, // 35 minutes
      htmlBody: "",
      textBody: "Navigate dress shopping like a pro with our insider guide to finding 'the one'."
    },
    {
      sequenceIndex: 8,
      subject: "Groom's Guide to Wedding Attire",
      weeksAfterStart: 7,
      daysAfterStart: 0.027778, // 40 minutes
      htmlBody: "",
      textBody: "Everything the groom needs to know about looking sharp on the wedding day."
    },
    {
      sequenceIndex: 9,
      subject: "Wedding Menu & Catering Insights",
      weeksAfterStart: 8,
      daysAfterStart: 0.031250, // 45 minutes
      htmlBody: "",
      textBody: "Create a memorable dining experience that your guests will rave about."
    },
    {
      sequenceIndex: 10,
      subject: "Music & Entertainment Planning",
      weeksAfterStart: 9,
      daysAfterStart: 0.034722, // 50 minutes
      htmlBody: "",
      textBody: "Set the perfect mood with music and entertainment that reflects your style."
    },
    {
      sequenceIndex: 11,
      subject: "Wedding Flowers & Decor Ideas",
      weeksAfterStart: 10,
      daysAfterStart: 0.038194, // 55 minutes
      htmlBody: "",
      textBody: "Transform your venue with beautiful florals and decor that tell your story."
    },
    {
      sequenceIndex: 12,
      subject: "Guest List Management Made Easy",
      weeksAfterStart: 11,
      daysAfterStart: 0.041667, // 60 minutes (1 hour)
      htmlBody: "",
      textBody: "Navigate the guest list challenge with tact and practical organization tips."
    },
    {
      sequenceIndex: 13,
      subject: "Wedding Invitations & Stationery",
      weeksAfterStart: 12,
      daysAfterStart: 0.045139, // 65 minutes
      htmlBody: "",
      textBody: "Create beautiful invitations that set the tone for your celebration."
    },
    {
      sequenceIndex: 14,
      subject: "Wedding Registry Essentials",
      weeksAfterStart: 13,
      daysAfterStart: 0.048611, // 70 minutes
      htmlBody: "",
      textBody: "Build a thoughtful registry that helps you start your married life together."
    },
    {
      sequenceIndex: 15,
      subject: "Honeymoon Planning Perfection",
      weeksAfterStart: 15,
      daysAfterStart: 0.052083, // 75 minutes
      htmlBody: "",
      textBody: "Plan the romantic getaway that marks the perfect start to married life."
    },
    {
      sequenceIndex: 16,
      subject: "Wedding Day Timeline Success",
      weeksAfterStart: 17,
      daysAfterStart: 0.055556, // 80 minutes
      htmlBody: "",
      textBody: "Create a realistic timeline that ensures your day flows smoothly and stress-free."
    },
    {
      sequenceIndex: 17,
      subject: "Handling Wedding Day Stress",
      weeksAfterStart: 19,
      daysAfterStart: 0.059028, // 85 minutes
      htmlBody: "",
      textBody: "Stay calm and centered on your wedding day with these proven stress-busting strategies."
    },
    {
      sequenceIndex: 18,
      subject: "Final Wedding Week Checklist",
      weeksAfterStart: 21,
      daysAfterStart: 0.062500, // 90 minutes
      htmlBody: "",
      textBody: "Everything you need to do in the final week to ensure a flawless celebration."
    },
    {
      sequenceIndex: 19,
      subject: "Wedding Vendor Communication Tips",
      weeksAfterStart: 23,
      daysAfterStart: 0.065972, // 95 minutes
      htmlBody: "",
      textBody: "Build strong relationships with your vendors for the best possible wedding day experience."
    },
    {
      sequenceIndex: 20,
      subject: "Rehearsal Dinner Planning",
      weeksAfterStart: 25,
      daysAfterStart: 0.069444, // 100 minutes
      htmlBody: "",
      textBody: "Plan the perfect rehearsal dinner to kick off your wedding celebration."
    },
    {
      sequenceIndex: 21,
      subject: "Wedding Morning Preparation",
      weeksAfterStart: 27,
      daysAfterStart: 0.072917, // 105 minutes
      htmlBody: "",
      textBody: "Start your wedding day perfectly with our morning preparation guide."
    },
    {
      sequenceIndex: 22,
      subject: "Making the Most of Your Wedding Day",
      weeksAfterStart: 29,
      daysAfterStart: 0.076389, // 110 minutes
      htmlBody: "",
      textBody: "Savor every moment of your wedding day with these mindfulness tips."
    },
    {
      sequenceIndex: 23,
      subject: "After the Wedding: Next Steps",
      weeksAfterStart: 31,
      daysAfterStart: 0.079861, // 115 minutes
      htmlBody: "",
      textBody: "Navigate post-wedding tasks and begin your happily ever after journey."
    }
  ]
};

// Function to generate complete email content for wedding campaign
export function generateWeddingEmailContent(photographer: Photographer): StaticCampaignTemplate {
  // Create clean, beautiful email blocks for each wedding email
  const emailBlocksArray = [
    // Email 0: Welcome
    [
      { type: 'HEADING', content: { text: 'Congratulations on Your Engagement! 💍', level: 'h2' } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'TEXT', content: { text: "This is such an exciting time, and we're absolutely thrilled to be part of your wedding planning journey." } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: "We'll be sending you carefully curated tips, inspiration, and guidance to help you plan the wedding of your dreams. From setting your vision to walking down the aisle, we've got you covered every step of the way." } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: "As professional wedding photographers, we've had the privilege of capturing hundreds of love stories, and we've learned what makes weddings truly magical. We're excited to share that wisdom with you!" } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'BUTTON', content: { text: 'Start a Conversation', url: `mailto:${photographer.emailFromAddr || 'hello@business.com'}` } }
    ],
    // Email 1: Setting Vision
    [
      { type: 'HEADING', content: { text: 'Setting Your Wedding Vision', level: 'h2' } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'TEXT', content: { text: "Now that you're engaged, it's time to start dreaming about your perfect wedding day! Let's establish a strong foundation for your planning process." } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'HEADING', content: { text: 'Key Steps:', level: 'h3' } },
      { type: 'TEXT', content: { text: '• Browse magazines and Pinterest for inspiration\n• Discuss your must-haves vs. nice-to-haves with your partner\n• Consider your guest count and budget early on\n• Think about the overall feeling you want to create' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: "💡 Pro Tip: Create a shared Pinterest board with your partner to collect ideas and ensure you're both aligned on the vision!" } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: "Remember, this is YOUR day - let your personalities shine through every decision you make." } }
    ],
    // Email 2: Budget Planning
    [
      { type: 'HEADING', content: { text: 'Wedding Budget Planning Made Simple', level: 'h2' } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'TEXT', content: { text: 'Creating a realistic budget is one of the most important steps in wedding planning. Here are practical strategies to help you manage your wedding finances effectively.' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: '• Prioritize your must-haves (venue, photographer, catering)\n• Allocate 10-15% of your budget for photography\n• Build in a 10% buffer for unexpected costs\n• Track all expenses in a spreadsheet or app' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: 'Remember: Every detail should reflect your unique love story. Take time to enjoy this planning process!' } }
    ]
  ];

  // Generate additional simple email blocks
  const additionalEmailTopics = [
    { title: 'Choosing Your Perfect Venue', tip: 'Visit venues at the same time of day as your wedding to see lighting' },
    { title: 'Building Your Dream Team', tip: 'Interview at least 3 vendors in each category before deciding' },
    { title: 'Photography Styles Explained', tip: 'Look at full wedding galleries, not just highlight reels' },
    { title: 'Planning Your Engagement Session', tip: 'Choose a location that\'s meaningful to your relationship' },
    { title: 'Wedding Dress Shopping', tip: 'Bring only 2-3 trusted opinions to avoid overwhelm' },
    { title: "Groom's Attire Guide", tip: 'Order suits 3-4 months before the wedding for alterations' },
    { title: 'Menu & Catering Insights', tip: 'Schedule your tasting when you\'re hungry for honest feedback' },
    { title: 'Music & Entertainment', tip: 'Create a "do not play" list along with your requests' },
    { title: 'Flowers & Decor Ideas', tip: 'Choose seasonal flowers to save money and ensure freshness' },
    { title: 'Guest List Management', tip: 'Be consistent with your invitation criteria to avoid hurt feelings' },
    { title: 'Invitations & Stationery', tip: 'Order 10-15 extra invitations for keepsakes' },
    { title: 'Wedding Registry Essentials', tip: 'Include items at various price points for all budgets' }
  ];

  for (const topic of additionalEmailTopics) {
    emailBlocksArray.push([
      { type: 'HEADING', content: { text: topic.title, level: 'h2' } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'TEXT', content: { text: 'As you continue planning your special day, remember that every detail should reflect your unique love story.' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: `💡 Planning Tip: ${topic.tip}` } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'BUTTON', content: { text: 'Get in Touch', url: `mailto:${photographer.emailFromAddr || 'hello@business.com'}` } }
    ]);
  }

  // Fill remaining emails with generic helpful content
  while (emailBlocksArray.length < WEDDING_EMAIL_TEMPLATES.emails.length) {
    const emailIndex = emailBlocksArray.length;
    const email = WEDDING_EMAIL_TEMPLATES.emails[emailIndex];
    emailBlocksArray.push([
      { type: 'HEADING', content: { text: email.subject.replace(/^(Your |Wedding |Planning )/g, ''), level: 'h2' } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'TEXT', content: { text: email.textBody } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: "We're here to help capture those precious moments that make your wedding uniquely yours." } }
    ]);
  }

  return {
    projectType: 'WEDDING' as const,
    emails: WEDDING_EMAIL_TEMPLATES.emails.map((email, index) => {
      // Still generate HTML for backward compatibility
      const htmlBody = generateEmailHTML(
        photographer,
        email.subject,
        '<p>Beautiful email content</p>',
        false,
        index
      );
      
      return {
        ...email,
        htmlBody,
        emailBlocks: JSON.stringify(emailBlocksArray[index] || []),
        useEmailBuilder: true,
        sendAtHour: 10
      };
    })
  };
}

// Portrait email templates with project-specific subjects and content
const PORTRAIT_EMAIL_TEMPLATES = {
  emails: [
    {
      sequenceIndex: 0,
      subject: "Welcome to Your Portrait Journey!",
      weeksAfterStart: 0,
      daysAfterStart: 0,
      htmlBody: "",
      textBody: "Thank you for considering us for your portrait session! We're excited to help capture your unique personality."
    },
    {
      sequenceIndex: 1,
      subject: "Preparing for Your Portrait Session",
      weeksAfterStart: 0,
      daysAfterStart: 3,
      htmlBody: "",
      textBody: "Let's ensure you're fully prepared for a stunning portrait session with our expert preparation tips."
    },
    {
      sequenceIndex: 2,
      subject: "Choosing the Perfect Outfits",
      weeksAfterStart: 1,
      daysAfterStart: 7,
      htmlBody: "",
      textBody: "Your outfit choices can make or break your portraits. Here's how to select the perfect looks."
    },
    {
      sequenceIndex: 3,
      subject: "Posing Tips for Natural-Looking Portraits",
      weeksAfterStart: 2,
      daysAfterStart: 14,
      htmlBody: "",
      textBody: "Learn the secrets to looking relaxed and confident in front of the camera."
    },
    {
      sequenceIndex: 4,
      subject: "Location Ideas for Your Session",
      weeksAfterStart: 3,
      daysAfterStart: 21,
      htmlBody: "",
      textBody: "Discover the perfect locations that will complement your portrait style and personality."
    }
  ]
};

// Portrait campaign content
export function generatePortraitEmailContent(photographer: Photographer): StaticCampaignTemplate {
  const emailBlocksArray = [
    // Email 0: Welcome
    [
      { type: 'HEADING', content: { text: 'Welcome to Your Portrait Journey! 📸', level: 'h2' } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'TEXT', content: { text: "Thank you for considering us for your portrait session! We're excited about the opportunity to capture your unique personality and style through beautiful, timeless photography." } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: "We'll be sharing valuable tips and insights to help you prepare for an amazing portrait experience. From outfit selection to posing guidance, we want to ensure you feel confident and look your absolute best." } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'BUTTON', content: { text: 'Book Your Session', url: `mailto:${photographer.emailFromAddr || 'hello@business.com'}` } }
    ],
    // Email 1: Preparation
    [
      { type: 'HEADING', content: { text: 'Preparing for Your Portrait Session', level: 'h2' } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'TEXT', content: { text: "Let's make sure you're fully prepared to create stunning images that you'll treasure forever!" } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'HEADING', content: { text: 'Preparation Essentials:', level: 'h3' } },
      { type: 'TEXT', content: { text: '• Choose outfits that reflect your personal style\n• Consider bringing multiple outfit options\n• Think about meaningful props or accessories\n• Plan your hair and makeup for a polished look' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: '💡 Pro Tip: Solid colors and classic styles photograph beautifully and won\'t date your images!' } }
    ],
    // Email 2: Outfit Selection
    [
      { type: 'HEADING', content: { text: 'Choosing the Perfect Outfits', level: 'h2' } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'TEXT', content: { text: 'Your outfit choices can make or break your portrait session. Here\'s how to select looks that photograph beautifully:' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: '• Solid colors work better than busy patterns\n• Avoid logos or text on clothing\n• Choose flattering necklines and fits\n• Consider the session location and weather' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: '💡 Bring layers and accessories to create variety in your portraits!' } }
    ],
    // Email 3: Posing Tips
    [
      { type: 'HEADING', content: { text: 'Natural Posing Tips', level: 'h2' } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'TEXT', content: { text: 'Looking natural and confident in photos is easier than you think! Here are our top posing tips:' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: '• Relax your shoulders and breathe deeply\n• Think of something that makes you smile genuinely\n• Shift your weight to your back foot\n• Keep your chin slightly forward and down' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: 'Remember: The best portraits capture authentic emotions and genuine expressions!' } }
    ],
    // Email 4: Location Ideas
    [
      { type: 'HEADING', content: { text: 'Perfect Location Ideas', level: 'h2' } },
      { type: 'SPACER', content: { height: 20 } },
      { type: 'TEXT', content: { text: 'The right location can elevate your portraits from good to extraordinary:' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: '• Indoor studios for controlled lighting\n• Natural outdoor settings for organic beauty\n• Urban environments for modern, edgy feels\n• Meaningful places that tell your story' } },
      { type: 'SPACER', content: { height: 15 } },
      { type: 'TEXT', content: { text: '💡 The best location is one where you feel comfortable and confident!' } }
    ]
  ];

  return {
    projectType: 'PORTRAIT' as const,
    emails: PORTRAIT_EMAIL_TEMPLATES.emails.map((email, index) => {
      const htmlBody = generateEmailHTML(
        photographer,
        email.subject,
        '<p>Beautiful portrait content</p>',
        false,
        index
      );
      
      return {
        ...email,
        htmlBody,
        emailBlocks: JSON.stringify(emailBlocksArray[index] || []),
        useEmailBuilder: true,
        sendAtHour: 10
      };
    })
  };
}

// Commercial email templates with business-focused subjects and content
const COMMERCIAL_EMAIL_TEMPLATES = {
  emails: [
    {
      sequenceIndex: 0,
      subject: "Welcome to Professional Brand Photography!",
      weeksAfterStart: 0,
      daysAfterStart: 0,
      htmlBody: "",
      textBody: "Thank you for reaching out about your commercial photography needs! We're excited to help elevate your brand."
    },
    {
      sequenceIndex: 1,
      subject: "Planning Your Commercial Photography Strategy",
      weeksAfterStart: 0,
      daysAfterStart: 3,
      htmlBody: "",
      textBody: "Strategic planning is key to successful commercial photography that delivers real business results."
    },
    {
      sequenceIndex: 2,
      subject: "Building Your Brand's Visual Identity",
      weeksAfterStart: 1,
      daysAfterStart: 7,
      htmlBody: "",
      textBody: "Your visual identity should be consistent, memorable, and perfectly aligned with your brand values."
    },
    {
      sequenceIndex: 3,
      subject: "Maximizing ROI from Your Photography Investment",
      weeksAfterStart: 2,
      daysAfterStart: 14,
      htmlBody: "",
      textBody: "Learn how to get the most value from your commercial photography across all marketing channels."
    },
    {
      sequenceIndex: 4,
      subject: "Creating Versatile Content for Multiple Platforms",
      weeksAfterStart: 3,
      daysAfterStart: 21,
      htmlBody: "",
      textBody: "Smart commercial photography planning ensures your images work across websites, social media, and print."
    }
  ]
};

// Commercial campaign content
export function generateCommercialEmailContent(photographer: Photographer): StaticCampaignTemplate {
  const emailBlocksArray = [
    createSimpleEmailBlocks('Welcome to Professional Brand Photography! 🚀', 
      "Thank you for reaching out about your commercial photography needs! We're thrilled to help elevate your brand through powerful, professional imagery that drives results.", 
      undefined, 'Discuss Your Project', `mailto:${photographer.emailFromAddr || 'hello@business.com'}`),
    createSimpleEmailBlocks('Planning Your Commercial Photography Strategy', 
      'Strategic planning ensures your photography investment delivers maximum value for your business.', 
      ['• Define your brand\'s visual identity and message', '• Plan for various formats and orientations', '• Think about your target audience', '💡 Invest in versatile images that work across channels']),
    createSimpleEmailBlocks('Building Your Brand\'s Visual Identity', 
      'Your visual identity is a strategic business tool that communicates your values and builds customer trust.', 
      ['• Consistent color palettes and styling', '• Professional quality builds credibility', '• Authentic representation of your values']),
    createSimpleEmailBlocks('Maximizing ROI from Your Photography', 
      'Smart businesses know commercial photography is an investment. Here\'s how to maximize your return:', 
      ['• Plan shoots for multiple asset types', '• Think long-term and seasonal usage', '💡 One well-planned shoot can provide months of content']),
    createSimpleEmailBlocks('Creating Versatile Content for Multiple Platforms', 
      'Your photography needs to work seamlessly across all platforms:', 
      ['• Square crops for Instagram and Facebook', '• Horizontal formats for website headers', '• Vertical orientations for Stories', '• High-resolution files for print'])
  ];

  return {
    projectType: 'COMMERCIAL' as const,
    emails: COMMERCIAL_EMAIL_TEMPLATES.emails.map((email, index) => ({
      ...email,
      htmlBody: generateEmailHTML(photographer, email.subject, '<p>Beautiful commercial content</p>', false, index),
      emailBlocks: JSON.stringify(emailBlocksArray[index] || []),
      useEmailBuilder: true,
      sendAtHour: 10
    }))
  };
}

// Engagement email templates with couple-focused subjects and content
const ENGAGEMENT_EMAIL_TEMPLATES = {
  emails: [
    {
      sequenceIndex: 0,
      subject: "Congratulations on Your Engagement!",
      weeksAfterStart: 0,
      daysAfterStart: 0,
      htmlBody: "",
      textBody: "Congratulations on your engagement! We're honored to capture this exciting chapter of your love story."
    },
    {
      sequenceIndex: 1,
      subject: "Planning Your Perfect Engagement Session",
      weeksAfterStart: 0,
      daysAfterStart: 3,
      htmlBody: "",
      textBody: "Let's plan an engagement session that perfectly reflects your unique relationship and love story."
    },
    {
      sequenceIndex: 2,
      subject: "Choosing Meaningful Locations for Your Photos",
      weeksAfterStart: 1,
      daysAfterStart: 7,
      htmlBody: "",
      textBody: "The right location adds depth and meaning to your engagement photos. Here's how to choose perfectly."
    },
    {
      sequenceIndex: 3,
      subject: "Outfit Coordination Tips for Couples",
      weeksAfterStart: 2,
      daysAfterStart: 14,
      htmlBody: "",
      textBody: "Learn how to coordinate your outfits for engagement photos that look harmonious and stylish."
    },
    {
      sequenceIndex: 4,
      subject: "Making Your Engagement Session Fun and Relaxed",
      weeksAfterStart: 3,
      daysAfterStart: 21,
      htmlBody: "",
      textBody: "The best engagement photos happen when you're relaxed and enjoying each other's company."
    }
  ]
};

// Engagement campaign content
export function generateEngagementEmailContent(photographer: Photographer): StaticCampaignTemplate {
  const emailBlocksArray = [
    createSimpleEmailBlocks('Congratulations on Your Engagement! 💕', 
      "This is such a special time! We're honored to capture this exciting chapter of your love story.", 
      undefined, 'Book Session', `mailto:${photographer.emailFromAddr || 'hello@business.com'}`),
    createSimpleEmailBlocks('Planning Your Perfect Session', 
      'Create beautiful images that reflect who you are as a couple:', 
      ['• Choose meaningful locations', '• Coordinate complementary outfits', '• Plan for golden hour lighting', '💡 Relax and enjoy each other!']),
    createSimpleEmailBlocks('Choosing Meaningful Locations', 
      'The right location adds depth and meaning to your photos:', 
      ['• Where you first met', '• The spot where you got engaged', '• Your favorite place together', '💕 Choose places with special memories']),
    createSimpleEmailBlocks('Outfit Coordination Tips', 
      'Achieve a harmonious look:', 
      ['• Choose complementary colors', '• Vary textures and patterns', '• Consider location and season', '💡 Coordinate, don\'t match!']),
    createSimpleEmailBlocks('Making Your Session Fun', 
      'The best photos come from genuine connection:', 
      ['• Plan activities you enjoy', '• Focus on each other', '• Be yourselves and have fun', '💕 Authentic emotions create timeless images'])
  ];

  return {
    projectType: 'ENGAGEMENT' as const,
    emails: ENGAGEMENT_EMAIL_TEMPLATES.emails.map((email, index) => ({
      ...email,
      htmlBody: generateEmailHTML(photographer, email.subject, '<p>Beautiful engagement content</p>', false, index),
      emailBlocks: JSON.stringify(emailBlocksArray[index] || []),
      useEmailBuilder: true,
      sendAtHour: 10
    }))
  };
}

// Maternity email templates with pregnancy-focused subjects and content
const MATERNITY_EMAIL_TEMPLATES = {
  emails: [
    {
      sequenceIndex: 0,
      subject: "Congratulations on Your Pregnancy!",
      weeksAfterStart: 0,
      daysAfterStart: 0,
      htmlBody: "",
      textBody: "Congratulations on your pregnancy! We're thrilled to help document this beautiful journey."
    },
    {
      sequenceIndex: 1,
      subject: "Planning Your Maternity Photography Session",
      weeksAfterStart: 0,
      daysAfterStart: 3,
      htmlBody: "",
      textBody: "Let's plan a maternity session that celebrates this amazing chapter and the miracle of new life."
    },
    {
      sequenceIndex: 2,
      subject: "Perfect Timing for Your Maternity Photos",
      weeksAfterStart: 1,
      daysAfterStart: 7,
      htmlBody: "",
      textBody: "Timing is everything for maternity photos. Here's when to schedule for the most beautiful results."
    },
    {
      sequenceIndex: 3,
      subject: "Maternity Fashion: What to Wear for Your Session",
      weeksAfterStart: 2,
      daysAfterStart: 14,
      htmlBody: "",
      textBody: "Choose outfits that celebrate your beautiful bump and make you feel confident and radiant."
    },
    {
      sequenceIndex: 4,
      subject: "Involving Family in Your Maternity Photos",
      weeksAfterStart: 3,
      daysAfterStart: 21,
      htmlBody: "",
      textBody: "Including your partner and children creates beautiful family memories during this special time."
    }
  ]
};

// Maternity campaign content
export function generateMaternityEmailContent(photographer: Photographer): StaticCampaignTemplate {
  const emailBlocksArray = [
    createSimpleEmailBlocks('Congratulations on Your Pregnancy! 🤱', 
      "This is an incredible time! We're thrilled to help you document this beautiful journey.", 
      undefined, 'Book Session', `mailto:${photographer.emailFromAddr || 'hello@business.com'}`),
    createSimpleEmailBlocks('Planning Your Maternity Session', 
      'Celebrate the miracle happening within you:', 
      ['• Schedule between 28-36 weeks', '• Choose flowing, fitted dresses', '• Include partner and children', '💡 Comfort is key - bring layers!']),
    createSimpleEmailBlocks('Perfect Timing for Your Photos', 
      'When to schedule for the most beautiful results:', 
      ['• 28-32 weeks: Perfect bump size', '• 33-36 weeks: Maximum bump', '• Consider your energy levels', '💡 Book early, schedule for optimal window']),
    createSimpleEmailBlocks('Maternity Fashion Tips', 
      'What you wear makes all the difference:', 
      ['• Fitted dresses that show your bump', '• Flowing fabrics like chiffon', '• Solid colors or simple patterns', '💡 Choose pieces that make you feel confident']),
    createSimpleEmailBlocks('Including Your Family', 
      'Create beautiful family memories:', 
      ['• Partner touching or kissing your bump', '• Siblings giving kisses', '• Family hands forming heart', '💕 These moments capture the love surrounding your baby'])
  ];

  return {
    projectType: 'MATERNITY' as const,
    emails: MATERNITY_EMAIL_TEMPLATES.emails.map((email, index) => ({
      ...email,
      htmlBody: generateEmailHTML(photographer, email.subject, '<p>Beautiful maternity content</p>', false, index),
      emailBlocks: JSON.stringify(emailBlocksArray[index] || []),
      useEmailBuilder: true,
      sendAtHour: 10
    }))
  };
}

// Family email templates with family-focused subjects and content
const FAMILY_EMAIL_TEMPLATES = {
  emails: [
    {
      sequenceIndex: 0,
      subject: "Welcome to Your Family Photography Experience!",
      weeksAfterStart: 0,
      daysAfterStart: 0,
      htmlBody: "",
      textBody: "Thank you for choosing us to capture your family's precious moments! We're excited to create beautiful memories."
    },
    {
      sequenceIndex: 1,
      subject: "Planning a Fun and Relaxed Family Session",
      weeksAfterStart: 0,
      daysAfterStart: 3,
      htmlBody: "",
      textBody: "Let's ensure your family session is enjoyable for everyone and results in authentic, beautiful photos."
    },
    {
      sequenceIndex: 2,
      subject: "Family Outfit Coordination Made Easy",
      weeksAfterStart: 1,
      daysAfterStart: 7,
      htmlBody: "",
      textBody: "Coordinate your family's outfits for photos that look harmonious without being too matchy-matchy."
    },
    {
      sequenceIndex: 3,
      subject: "Tips for Great Photos with Children",
      weeksAfterStart: 2,
      daysAfterStart: 14,
      htmlBody: "",
      textBody: "Discover the secrets to capturing natural, joyful expressions from children during family sessions."
    },
    {
      sequenceIndex: 4,
      subject: "Making Family Photos a Treasured Experience",
      weeksAfterStart: 3,
      daysAfterStart: 21,
      htmlBody: "",
      textBody: "Transform your family photo session into a fun experience that creates lasting memories."
    }
  ]
};

// Family campaign content
export function generateFamilyEmailContent(photographer: Photographer): StaticCampaignTemplate {
  const emailBlocksArray = [
    createSimpleEmailBlocks('Welcome to Your Family Photography Experience! 👨‍👩‍👧‍👦', 
      "We're excited to capture your family's precious moments and create memories you'll treasure for generations!", 
      undefined, 'Book Session', `mailto:${photographer.emailFromAddr || 'hello@business.com'}`),
    createSimpleEmailBlocks('Planning a Fun Family Session', 
      'Make your session fun and relaxed for everyone:', 
      ['• Coordinate outfits (don\'t match exactly)', '• Plan around children\'s best times', '• Bring snacks and small rewards', '💡 Let kids be kids!']),
    createSimpleEmailBlocks('Family Outfit Coordination', 
      'Achieve a cohesive look that lets personalities shine:', 
      ['• Choose 2-3 main colors', '• Mix textures and patterns', '• Avoid matching outfits', '💡 Think coordination, not uniformity']),
    createSimpleEmailBlocks('Tips for Great Photos with Children', 
      'Capture natural, joyful expressions:', 
      ['• Schedule during their best time', '• Bring favorite snacks and toys', '• Let them run and play naturally', '💡 Use games for genuine smiles']),
    createSimpleEmailBlocks('Creating Lasting Memories', 
      'Your session should celebrate your family\'s love:', 
      ['• Focus on connection and interaction', '• Embrace candid moments', '• Include family activities', '💕 The best photos tell your story together'])
  ];

  return {
    projectType: 'FAMILY' as const,
    emails: FAMILY_EMAIL_TEMPLATES.emails.map((email, index) => ({
      ...email,
      htmlBody: generateEmailHTML(photographer, email.subject, '<p>Beautiful family content</p>', false, index),
      emailBlocks: JSON.stringify(emailBlocksArray[index] || []),
      useEmailBuilder: true,
      sendAtHour: 10
    }))
  };
}

// API functions expected by routes.ts
export function getStaticCampaigns(photographer: Photographer): StaticCampaignTemplate[] {
  return [
    generateWeddingEmailContent(photographer),
    generatePortraitEmailContent(photographer), 
    generateCommercialEmailContent(photographer),
    generateEngagementEmailContent(photographer),
    generateMaternityEmailContent(photographer),
    generateFamilyEmailContent(photographer)
  ];
}

export function getStaticCampaignByType(photographer: Photographer, projectType: string): StaticCampaignTemplate | null {
  const campaigns = getStaticCampaigns(photographer);
  return campaigns.find(campaign => campaign.projectType === projectType) || null;
}

// Default export for dynamic imports
export default {
  getStaticCampaigns,
  getStaticCampaignByType,
  generateWeddingEmailContent,
  generatePortraitEmailContent,
  generateCommercialEmailContent,
  generateEngagementEmailContent,
  generateMaternityEmailContent,
  generateFamilyEmailContent
};