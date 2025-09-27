// Static Email Campaign System with Consistent Layouts
import type { Photographer } from '@shared/schema';

// Type definitions for static email campaigns
export interface StaticEmailTemplate {
  sequenceIndex: number;
  subject: string;
  weeksAfterStart: number; // Legacy compatibility
  daysAfterStart: number; // Research-optimized timing in days
  htmlBody: string;
  textBody: string;
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
  const layoutKeys = Object.keys(EMAIL_LAYOUTS);
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
const WEDDING_EMAIL_TEMPLATES = {
  projectType: 'WEDDING' as const,
  emails: [
    {
      sequenceIndex: 0,
      subject: "Welcome to Your Wedding Journey!",
      weeksAfterStart: 0,
      daysAfterStart: 0,
      htmlBody: "",
      textBody: "Your wedding planning adventure begins now with expert guidance every step of the way."
    },
    {
      sequenceIndex: 1,
      subject: "Setting Your Wedding Vision",
      weeksAfterStart: 0,
      daysAfterStart: 3,
      htmlBody: "",
      textBody: "Define your unique style and create a cohesive vision for your perfect day."
    },
    {
      sequenceIndex: 2,
      subject: "Your Wedding Budget: Planning Made Simple",
      weeksAfterStart: 1,
      daysAfterStart: 7,
      htmlBody: "",
      textBody: "Learn practical strategies for creating and managing your wedding budget effectively."
    },
    {
      sequenceIndex: 3,
      subject: "Choosing Your Perfect Wedding Venue",
      weeksAfterStart: 2,
      daysAfterStart: 14,
      htmlBody: "",
      textBody: "Essential tips for finding and booking the ideal venue for your celebration."
    },
    {
      sequenceIndex: 4,
      subject: "Building Your Dream Wedding Team",
      weeksAfterStart: 3,
      daysAfterStart: 21,
      htmlBody: "",
      textBody: "How to research, interview, and select the perfect vendors for your wedding day."
    },
    {
      sequenceIndex: 5,
      subject: "Wedding Photography Styles Explained",
      weeksAfterStart: 4,
      daysAfterStart: 28,
      htmlBody: "",
      textBody: "Understanding different photography styles to choose what's perfect for you."
    },
    {
      sequenceIndex: 6,
      subject: "Planning Your Engagement Session",
      weeksAfterStart: 5,
      daysAfterStart: 35,
      htmlBody: "",
      textBody: "Make the most of your engagement session with these expert preparation tips."
    },
    {
      sequenceIndex: 7,
      subject: "Wedding Dress Shopping Success",
      weeksAfterStart: 6,
      daysAfterStart: 42,
      htmlBody: "",
      textBody: "Navigate dress shopping like a pro with our insider guide to finding 'the one'."
    },
    {
      sequenceIndex: 8,
      subject: "Groom's Guide to Wedding Attire",
      weeksAfterStart: 7,
      daysAfterStart: 49,
      htmlBody: "",
      textBody: "Everything the groom needs to know about looking sharp on the wedding day."
    },
    {
      sequenceIndex: 9,
      subject: "Wedding Menu & Catering Insights",
      weeksAfterStart: 8,
      daysAfterStart: 56,
      htmlBody: "",
      textBody: "Create a memorable dining experience that your guests will rave about."
    },
    {
      sequenceIndex: 10,
      subject: "Music & Entertainment Planning",
      weeksAfterStart: 9,
      daysAfterStart: 63,
      htmlBody: "",
      textBody: "Set the perfect mood with music and entertainment that reflects your style."
    },
    {
      sequenceIndex: 11,
      subject: "Wedding Flowers & Decor Ideas",
      weeksAfterStart: 10,
      daysAfterStart: 70,
      htmlBody: "",
      textBody: "Transform your venue with beautiful florals and decor that tell your story."
    },
    {
      sequenceIndex: 12,
      subject: "Guest List Management Made Easy",
      weeksAfterStart: 11,
      daysAfterStart: 77,
      htmlBody: "",
      textBody: "Navigate the guest list challenge with tact and practical organization tips."
    },
    {
      sequenceIndex: 13,
      subject: "Wedding Invitations & Stationery",
      weeksAfterStart: 12,
      daysAfterStart: 84,
      htmlBody: "",
      textBody: "Create beautiful invitations that set the tone for your celebration."
    },
    {
      sequenceIndex: 14,
      subject: "Wedding Registry Essentials",
      weeksAfterStart: 13,
      daysAfterStart: 91,
      htmlBody: "",
      textBody: "Build a thoughtful registry that helps you start your married life together."
    },
    {
      sequenceIndex: 15,
      subject: "Honeymoon Planning Perfection",
      weeksAfterStart: 15,
      daysAfterStart: 105,
      htmlBody: "",
      textBody: "Plan the romantic getaway that marks the perfect start to married life."
    },
    {
      sequenceIndex: 16,
      subject: "Wedding Day Timeline Success",
      weeksAfterStart: 17,
      daysAfterStart: 119,
      htmlBody: "",
      textBody: "Create a realistic timeline that ensures your day flows smoothly and stress-free."
    },
    {
      sequenceIndex: 17,
      subject: "Handling Wedding Day Stress",
      weeksAfterStart: 19,
      daysAfterStart: 133,
      htmlBody: "",
      textBody: "Stay calm and centered on your wedding day with these proven stress-busting strategies."
    },
    {
      sequenceIndex: 18,
      subject: "Final Wedding Week Checklist",
      weeksAfterStart: 21,
      daysAfterStart: 147,
      htmlBody: "",
      textBody: "Everything you need to do in the final week to ensure a flawless celebration."
    },
    {
      sequenceIndex: 19,
      subject: "Wedding Vendor Communication Tips",
      weeksAfterStart: 23,
      daysAfterStart: 161,
      htmlBody: "",
      textBody: "Build strong relationships with your vendors for the best possible wedding day experience."
    },
    {
      sequenceIndex: 20,
      subject: "Rehearsal Dinner Planning",
      weeksAfterStart: 25,
      daysAfterStart: 175,
      htmlBody: "",
      textBody: "Plan the perfect rehearsal dinner to kick off your wedding celebration."
    },
    {
      sequenceIndex: 21,
      subject: "Wedding Morning Preparation",
      weeksAfterStart: 27,
      daysAfterStart: 189,
      htmlBody: "",
      textBody: "Start your wedding day perfectly with our morning preparation guide."
    },
    {
      sequenceIndex: 22,
      subject: "Making the Most of Your Wedding Day",
      weeksAfterStart: 29,
      daysAfterStart: 203,
      htmlBody: "",
      textBody: "Savor every moment of your wedding day with these mindfulness tips."
    },
    {
      sequenceIndex: 23,
      subject: "After the Wedding: Next Steps",
      weeksAfterStart: 31,
      daysAfterStart: 217,
      htmlBody: "",
      textBody: "Navigate post-wedding tasks and begin your happily ever after journey."
    }
  ]
};

// Function to generate complete email content for wedding campaign
export function generateWeddingEmailContent(photographer: Photographer): StaticCampaignTemplate {
  // Rich content for wedding emails with proper formatting
  const emailContents = [
    {
      content: `<p>Congratulations on your engagement! This is such an exciting time, and we're absolutely thrilled to be part of your wedding planning journey.</p>
      
      <p>Over the next two years, we'll be sending you carefully curated tips, inspiration, and guidance to help you plan the wedding of your dreams. From setting your vision to walking down the aisle, we've got you covered every step of the way.</p>
      
      <p>As professional wedding photographers, we've had the privilege of capturing hundreds of love stories, and we've learned what makes weddings truly magical. We're excited to share that wisdom with you!</p>
      
      <p>Here's to the beginning of your beautiful journey toward "I do!" 🥂</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Now that you're engaged, it's time to start dreaming about your perfect wedding day! But before diving into the details, let's establish a strong foundation for your planning process.</p>
      
      <p><strong>Setting Your Wedding Vision:</strong></p>
      <ul>
        <li>Browse magazines and Pinterest for inspiration</li>
        <li>Discuss your must-haves vs. nice-to-haves with your partner</li>
        <li>Consider your guest count and budget early on</li>
        <li>Think about the overall feeling you want to create</li>
      </ul>
      
      <p>⚠️ <strong>Pro Tip:</strong> Create a shared Pinterest board with your partner to collect ideas and ensure you're both aligned on the vision!</p>
      
      <p>Remember, this is YOUR day - let your personalities shine through every decision you make.</p>`,
      includeBookingCTA: false
    }
  ];
  
  // Generate additional emails using textBody content
  for (let i = 2; i < WEDDING_EMAIL_TEMPLATES.emails.length; i++) {
    const email = WEDDING_EMAIL_TEMPLATES.emails[i];
    emailContents.push({
      content: `<p>${email.textBody}</p>
      
      <p>As you continue planning your special day, remember that every detail should reflect your unique love story. We're here to help capture those precious moments that make your wedding uniquely yours.</p>
      
      <p><strong>Planning Tip:</strong> Take time to enjoy this process - these planning moments are part of your love story too!</p>`,
      includeBookingCTA: false
    });
  }

  return {
    projectType: 'WEDDING' as const,
    emails: WEDDING_EMAIL_TEMPLATES.emails.map((email, index) => ({
      ...email,
      htmlBody: generateEmailHTML(
        photographer,
        email.subject,
        emailContents[index]?.content || '',
        emailContents[index]?.includeBookingCTA || false,
        index
      )
    }))
  };
}

// Other project types return adapted wedding content with correct project type
export function generatePortraitEmailContent(photographer: Photographer): StaticCampaignTemplate {
  const weddingContent = generateWeddingEmailContent(photographer);
  return {
    ...weddingContent,
    projectType: 'PORTRAIT' as const
  };
}

export function generateCommercialEmailContent(photographer: Photographer): StaticCampaignTemplate {
  const weddingContent = generateWeddingEmailContent(photographer);
  return {
    ...weddingContent,
    projectType: 'COMMERCIAL' as const
  };
}

export function generateEngagementEmailContent(photographer: Photographer): StaticCampaignTemplate {
  const weddingContent = generateWeddingEmailContent(photographer);
  return {
    ...weddingContent,
    projectType: 'ENGAGEMENT' as const
  };
}

export function generateMaternityEmailContent(photographer: Photographer): StaticCampaignTemplate {
  const weddingContent = generateWeddingEmailContent(photographer);
  return {
    ...weddingContent,
    projectType: 'MATERNITY' as const
  };
}

export function generateFamilyEmailContent(photographer: Photographer): StaticCampaignTemplate {
  const weddingContent = generateWeddingEmailContent(photographer);
  return {
    ...weddingContent,
    projectType: 'FAMILY' as const
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