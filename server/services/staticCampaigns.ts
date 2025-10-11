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
  // Rich content for wedding emails with proper formatting
  const emailContents = [
    {
      content: `<p>Congratulations on your engagement! This is such an exciting time, and we're absolutely thrilled to be part of your wedding planning journey.</p>
      
      <p>We'll be sending you carefully curated tips, inspiration, and guidance to help you plan the wedding of your dreams. From setting your vision to walking down the aisle, we've got you covered every step of the way.</p>
      
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
  const emailContents = [
    {
      content: `<p>Thank you for considering us for your portrait session! We're excited about the opportunity to capture your unique personality and style through beautiful, timeless photography.</p>
      
      <p>We'll be sharing valuable tips and insights to help you prepare for an amazing portrait experience. From outfit selection to posing guidance, we want to ensure you feel confident and look your absolute best.</p>
      
      <p>As professional portrait photographers, we understand that every person has their own unique beauty and story to tell. Our goal is to capture the real you in a way that feels authentic and stunning.</p>
      
      <p>Looking forward to creating something beautiful together! 📸</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Getting ready for your portrait session is exciting! Let's make sure you're fully prepared to create stunning images that you'll treasure forever.</p>
      
      <p><strong>Portrait Preparation Essentials:</strong></p>
      <ul>
        <li>Choose outfits that reflect your personal style</li>
        <li>Consider bringing multiple outfit options</li>
        <li>Think about meaningful props or accessories</li>
        <li>Plan your hair and makeup for a polished look</li>
      </ul>
      
      <p>⚠️ <strong>Pro Tip:</strong> Solid colors and classic styles photograph beautifully and won't date your images!</p>
      
      <p>Remember, the best portraits happen when you feel comfortable and confident in your own skin.</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Your outfit choices can make or break your portrait session. Let's ensure you select looks that photograph beautifully and reflect your personal style.</p>
      
      <p><strong>Portrait Outfit Guidelines:</strong></p>
      <ul>
        <li>Solid colors work better than busy patterns</li>
        <li>Avoid logos or text on clothing</li>
        <li>Choose flattering necklines and fits</li>
        <li>Consider the session location and weather</li>
      </ul>
      
      <p><strong>Pro Tip:</strong> Bring layers and accessories to create variety in your portraits!</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Looking natural and confident in photos is easier than you think! Here are our top posing tips to help you shine during your portrait session.</p>
      
      <p><strong>Natural Posing Secrets:</strong></p>
      <ul>
        <li>Relax your shoulders and breathe deeply</li>
        <li>Think of something that makes you smile genuinely</li>
        <li>Shift your weight to your back foot</li>
        <li>Keep your chin slightly forward and down</li>
      </ul>
      
      <p><strong>Remember:</strong> The best portraits capture authentic emotions and genuine expressions!</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>The right location can elevate your portraits from good to extraordinary. Let's explore some ideas that will complement your style and personality.</p>
      
      <p><strong>Location Considerations:</strong></p>
      <ul>
        <li>Indoor studios for controlled lighting</li>
        <li>Natural outdoor settings for organic beauty</li>
        <li>Urban environments for modern, edgy feels</li>
        <li>Meaningful places that tell your story</li>
      </ul>
      
      <p><strong>Pro Tip:</strong> The best location is one where you feel comfortable and confident!</p>`,
      includeBookingCTA: false
    }
  ];

  return {
    projectType: 'PORTRAIT' as const,
    emails: PORTRAIT_EMAIL_TEMPLATES.emails.map((email, index) => ({
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
  const emailContents = [
    {
      content: `<p>Thank you for reaching out about your commercial photography needs! We're thrilled about the opportunity to help elevate your brand through powerful, professional imagery.</p>
      
      <p>We'll be sharing insights and tips to help you maximize the impact of your commercial photography investment. From planning your shoot to getting the most out of your images, we've got you covered.</p>
      
      <p>As commercial photographers, we understand that your images need to work hard for your business. Whether it's marketing materials, website content, or advertising campaigns, great photography drives results.</p>
      
      <p>Let's create something that makes your brand stand out! 🚀</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Planning a successful commercial shoot requires strategic thinking and attention to detail. Let's ensure your photography investment delivers maximum value for your business.</p>
      
      <p><strong>Commercial Photography Planning:</strong></p>
      <ul>
        <li>Define your brand's visual identity and message</li>
        <li>Consider how images will be used across platforms</li>
        <li>Plan for various formats and orientations</li>
        <li>Think about your target audience and brand values</li>
      </ul>
      
      <p>⚠️ <strong>Pro Tip:</strong> Invest in versatile images that can work across multiple marketing channels!</p>
      
      <p>Great commercial photography is an investment that pays dividends in brand recognition and customer engagement.</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Your brand's visual identity is more than just pretty pictures - it's a strategic business tool that communicates your values and builds customer trust.</p>
      
      <p><strong>Visual Identity Elements:</strong></p>
      <ul>
        <li>Consistent color palettes and styling</li>
        <li>Brand personality reflected in imagery</li>
        <li>Professional quality that builds credibility</li>
        <li>Authentic representation of your business values</li>
      </ul>
      
      <p><strong>Business Tip:</strong> Your visual identity should be instantly recognizable across all touchpoints!</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Smart businesses know that commercial photography is an investment, not an expense. Here's how to maximize your return and get the most value from every image.</p>
      
      <p><strong>ROI Maximization Strategies:</strong></p>
      <ul>
        <li>Plan shoots to create multiple asset types</li>
        <li>Think long-term and seasonal usage</li>
        <li>Create lifestyle and product variations</li>
        <li>Plan for different marketing campaigns</li>
      </ul>
      
      <p><strong>Pro Tip:</strong> One well-planned shoot can provide content for months of marketing!</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>In today's multi-platform world, your commercial photography needs to work seamlessly across websites, social media, print materials, and advertising campaigns.</p>
      
      <p><strong>Platform Considerations:</strong></p>
      <ul>
        <li>Square crops for Instagram and Facebook</li>
        <li>Horizontal formats for website headers</li>
        <li>Vertical orientations for Pinterest and Stories</li>
        <li>High-resolution files for print materials</li>
      </ul>
      
      <p><strong>Success Strategy:</strong> Plan your shoot with every platform in mind for maximum versatility!</p>`,
      includeBookingCTA: false
    }
  ];

  return {
    projectType: 'COMMERCIAL' as const,
    emails: COMMERCIAL_EMAIL_TEMPLATES.emails.map((email, index) => ({
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
  const emailContents = [
    {
      content: `<p>Congratulations on your engagement! This is such a special time in your relationship, and we're honored that you're considering us to capture this exciting chapter of your love story.</p>
      
      <p>We'll be sharing tips and inspiration to help you prepare for an amazing engagement session that truly reflects your unique relationship. From location ideas to outfit coordination, we want to ensure your photos are everything you've dreamed of.</p>
      
      <p>As engagement photographers, we love capturing the joy, excitement, and genuine connection between couples. These photos will become treasured memories of this beautiful time in your lives.</p>
      
      <p>Here's to celebrating your love and the journey ahead! 💕</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Your engagement session is a wonderful opportunity to celebrate your relationship and create beautiful images that reflect who you are as a couple.</p>
      
      <p><strong>Engagement Session Planning:</strong></p>
      <ul>
        <li>Choose locations that are meaningful to your relationship</li>
        <li>Coordinate outfits that complement each other</li>
        <li>Plan for your most flattering times of day</li>
        <li>Think about props that tell your story</li>
      </ul>
      
      <p>⚠️ <strong>Pro Tip:</strong> The best engagement photos happen when you're relaxed and just enjoying each other's company!</p>
      
      <p>Remember, this session is all about celebrating your love and having fun together.</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>The location of your engagement session can add incredible depth and meaning to your photos. Let's explore ideas that will make your images truly special.</p>
      
      <p><strong>Meaningful Location Ideas:</strong></p>
      <ul>
        <li>Where you first met or had your first date</li>
        <li>The spot where you got engaged</li>
        <li>Your favorite place to spend time together</li>
        <li>Locations that reflect your shared interests</li>
      </ul>
      
      <p><strong>Love Tip:</strong> Choose places that hold special memories - your emotions will shine through naturally!</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Looking great together in photos starts with thoughtful outfit coordination. Here's how to achieve that perfect harmonious look without being too matchy-matchy.</p>
      
      <p><strong>Couple Styling Guidelines:</strong></p>
      <ul>
        <li>Choose a color palette that complements both of you</li>
        <li>Vary textures and patterns for visual interest</li>
        <li>Consider the location and season in your choices</li>
        <li>Avoid logos, busy patterns, or neon colors</li>
      </ul>
      
      <p><strong>Pro Tip:</strong> Coordinate, don't match - think complementary rather than identical!</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>The secret to beautiful engagement photos isn't perfect poses - it's genuine connection and relaxed interaction between you and your partner.</p>
      
      <p><strong>Creating Natural Moments:</strong></p>
      <ul>
        <li>Plan activities you both enjoy during the session</li>
        <li>Bring music that makes you both happy</li>
        <li>Focus on each other, not the camera</li>
        <li>Don't be afraid to laugh and be yourselves</li>
      </ul>
      
      <p><strong>Remember:</strong> Authentic emotions create the most beautiful and timeless images!</p>`,
      includeBookingCTA: false
    }
  ];

  return {
    projectType: 'ENGAGEMENT' as const,
    emails: ENGAGEMENT_EMAIL_TEMPLATES.emails.map((email, index) => ({
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
  const emailContents = [
    {
      content: `<p>Congratulations on your pregnancy! This is such an incredible and transformative time in your life, and we're thrilled to help you document this beautiful journey.</p>
      
      <p>We'll be sharing guidance and tips to help you prepare for a maternity session that celebrates this amazing chapter. From timing your session to choosing the perfect outfits, we want to ensure your photos capture the magic of this moment.</p>
      
      <p>As maternity photographers, we understand the profound beauty of pregnancy and the importance of preserving these precious memories. Your growing family deserves to be celebrated!</p>
      
      <p>Here's to capturing the incredible journey of bringing new life into the world! 🤱</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Your maternity session is a celebration of the miracle happening within you and the anticipation of meeting your little one.</p>
      
      <p><strong>Maternity Session Planning:</strong></p>
      <ul>
        <li>Schedule between 28-36 weeks for the best belly shape</li>
        <li>Choose flowing, fitted dresses that show your beautiful bump</li>
        <li>Consider including your partner and other children</li>
        <li>Think about meaningful props like ultrasound photos or baby shoes</li>
      </ul>
      
      <p>⚠️ <strong>Pro Tip:</strong> Comfort is key - wear shoes you can easily walk in and bring layers for temperature changes!</p>
      
      <p>This is a time to embrace and celebrate the incredible changes your body is experiencing.</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Timing is crucial for stunning maternity photos. Here's everything you need to know about scheduling your session for the most beautiful results.</p>
      
      <p><strong>Optimal Timing Guidelines:</strong></p>
      <ul>
        <li>28-32 weeks: Perfect bump size, still comfortable to move</li>
        <li>33-36 weeks: Maximum bump, may require more frequent breaks</li>
        <li>Multiple sessions: Early pregnancy and full term comparison</li>
        <li>Consider your energy levels and mobility</li>
      </ul>
      
      <p><strong>Pro Tip:</strong> Book your session early, but schedule it for your optimal window!</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>What you wear for your maternity session can make all the difference in how radiant and beautiful you feel in your photos.</p>
      
      <p><strong>Maternity Fashion Tips:</strong></p>
      <ul>
        <li>Fitted dresses that show your beautiful bump</li>
        <li>Flowing fabrics like chiffon or jersey</li>
        <li>Solid colors or simple patterns</li>
        <li>Consider bringing multiple outfit options</li>
      </ul>
      
      <p><strong>Comfort Reminder:</strong> Choose pieces that make you feel confident and beautiful - this will show in every photo!</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Including your partner and children in your maternity photos creates beautiful family memories and shows the love surrounding your growing baby.</p>
      
      <p><strong>Family Involvement Ideas:</strong></p>
      <ul>
        <li>Partner touching or kissing your bump</li>
        <li>Siblings giving baby sibling kisses</li>
        <li>Family hands forming heart around bump</li>
        <li>Everyone holding ultrasound photos together</li>
      </ul>
      
      <p><strong>Family Tip:</strong> These moments capture the love and anticipation your whole family feels for your new arrival!</p>`,
      includeBookingCTA: false
    }
  ];

  return {
    projectType: 'MATERNITY' as const,
    emails: MATERNITY_EMAIL_TEMPLATES.emails.map((email, index) => ({
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
  const emailContents = [
    {
      content: `<p>Thank you for choosing us to capture your family's precious moments! We're excited about the opportunity to create beautiful memories that you'll treasure for generations to come.</p>
      
      <p>We'll be sharing helpful tips and ideas to ensure your family session is fun, relaxed, and results in photos that truly reflect your family's personality and love for each other.</p>
      
      <p>As family photographers, we know that the best family photos happen when everyone is comfortable and having fun. We specialize in capturing those genuine smiles, spontaneous laughs, and loving connections that make your family unique.</p>
      
      <p>Looking forward to spending time with your beautiful family! 👨‍👩‍👧‍👦</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Family photos are an investment in preserving the relationships and memories that matter most. Let's make sure your session captures the authentic love and joy your family shares.</p>
      
      <p><strong>Family Session Planning:</strong></p>
      <ul>
        <li>Choose outfits that coordinate but don't match exactly</li>
        <li>Plan the session around your children's best times of day</li>
        <li>Bring snacks and small rewards for little ones</li>
        <li>Think about locations that are meaningful to your family</li>
      </ul>
      
      <p>⚠️ <strong>Pro Tip:</strong> Let your children be themselves - some of the best family photos capture kids being kids!</p>
      
      <p>Remember, the goal is to have fun together and let your family's personality shine through.</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Coordinating family outfits doesn't have to be stressful! Here's how to achieve a cohesive look that lets everyone's personality shine through.</p>
      
      <p><strong>Family Coordination Tips:</strong></p>
      <ul>
        <li>Choose a color palette with 2-3 main colors</li>
        <li>Mix textures and patterns for visual interest</li>
        <li>Avoid everyone wearing the exact same thing</li>
        <li>Consider the location and season in your choices</li>
      </ul>
      
      <p><strong>Style Tip:</strong> Think coordination, not matching - you want to look like a family, not a uniform!</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Photographing children can be magical when you know the right approaches. Here are our tried-and-true methods for capturing natural, joyful expressions.</p>
      
      <p><strong>Child Photography Secrets:</strong></p>
      <ul>
        <li>Schedule during their best time of day (not nap time!)</li>
        <li>Bring favorite snacks and small toys</li>
        <li>Let them run and play naturally</li>
        <li>Use games and prompts to get genuine smiles</li>
      </ul>
      
      <p><strong>Parent Tip:</strong> The more relaxed and fun you are, the more your children will enjoy the experience too!</p>`,
      includeBookingCTA: false
    },
    {
      content: `<p>Your family photography session should be more than just taking pictures - it should be a celebration of your family's love and connection.</p>
      
      <p><strong>Creating Lasting Memories:</strong></p>
      <ul>
        <li>Focus on connection and interaction between family members</li>
        <li>Embrace candid moments and genuine emotions</li>
        <li>Include activities that represent your family's interests</li>
        <li>Remember that imperfection can be beautifully authentic</li>
      </ul>
      
      <p><strong>Family Philosophy:</strong> The best family photos tell the story of who you are together!</p>`,
      includeBookingCTA: false
    }
  ];

  return {
    projectType: 'FAMILY' as const,
    emails: FAMILY_EMAIL_TEMPLATES.emails.map((email, index) => ({
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