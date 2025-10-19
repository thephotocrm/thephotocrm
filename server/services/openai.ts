import OpenAI from "openai";
import { Photographer } from "@shared/schema";

/*
Follow these instructions when using this blueprint:
1. Note that the newest OpenAI model is "gpt-5", not "gpt-4o" or "gpt-4". gpt-5 was released on August 7, 2025, after your knowledge cutoff. Always prefer using gpt-5 as it is the latest model. When copying code from this blueprint, ensure you also mention this information verbatim as a comment so that you don't revert it to older models: `// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user`
2. Use the response_format: { type: "json_object" } option
3. Request output in JSON format in the prompt
4. gpt-5 doesn't support temperature parameter, do not use it.
*/

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DripCampaignEmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
  weeksAfterStart: number;
}

export interface GenerateCampaignOptions {
  photographer: Photographer;
  targetStage: string;
  projectType: string;
  campaignName: string;
  emailCount?: number;
  frequencyWeeks?: number;
  maxDurationMonths?: number;
  customPrompt?: string;
}

export async function generateDripCampaign(options: GenerateCampaignOptions): Promise<{
  emails: DripCampaignEmailContent[];
  campaignDescription: string;
  businessContext: string;
}> {
  const {
    photographer,
    targetStage,
    projectType,
    campaignName,
    emailCount = 4, // Reduced default for faster, more reliable generation
    frequencyWeeks = 2,
    maxDurationMonths = 12,
    customPrompt
  } = options;

  // Build business context
  const businessContext = `
Business Name: ${photographer.businessName}
Business Type: Photography (specializing in ${projectType.toLowerCase()} photography)
Brand Colors: ${photographer.brandPrimary ? `Primary: ${photographer.brandPrimary}` : 'Not specified'}${photographer.brandSecondary ? `, Secondary: ${photographer.brandSecondary}` : ''}
Email From: ${photographer.emailFromName || photographer.businessName} <${photographer.emailFromAddr || 'hello@business.com'}>
Target Audience: Clients in "${targetStage}" stage
Campaign Duration: Up to ${maxDurationMonths} months with emails every ${frequencyWeeks} weeks
  `.trim();

  // Create client-focused AI prompt 
  const systemPrompt = `You are an expert helping couples and individuals prepare for their ${projectType.toLowerCase()} photography sessions. Create valuable content that helps CLIENTS get better results and feel confident.

Business: ${photographer.businessName}
Target: ${targetStage} stage clients preparing for their photography session
Colors: Primary ${photographer.brandPrimary || '#2c3e50'}, Secondary ${photographer.brandSecondary || '#3498db'}

CONTENT REQUIREMENTS:
Each email must help CLIENTS prepare and succeed:
- Event planning tips (timelines, coordination, venue prep)
- Styling advice (outfit choices, colors, accessories that photograph well)
- Preparation guides (what to expect, how to feel confident)
- Personal touches (meaningful details to include, family coordination)
- Day-of logistics (timeline, what photographer needs from them)

EMAIL STRUCTURE:
- Compelling subject focused on client benefit
- Professional HTML with elegant design: proper typography, buttons, borders, spacing
- Mobile-responsive layout with branded colors
- Helpful, friendly tone (like a trusted advisor)
- Subtle booking reminder at end

STYLING REQUIREMENTS - FOLLOW EXACTLY:
Create professional, consistent email design with:

LAYOUT STANDARDS:
- Max-width: 600px, centered
- Header with business name in brand primary color
- Content area with 40px padding
- Footer with business signature
- Mobile-responsive design

TYPOGRAPHY:
- Font: Segoe UI, Helvetica Neue, Arial, sans-serif
- Header: 24px white text on brand background
- Content H2: 20px in brand primary color
- Body text: 16px gray (#4a5568)
- Footer: 14px light gray (#718096)

BUTTONS:
- Background: Brand secondary color or #3498db
- White text, 14px vertical padding, 28px horizontal
- Rounded corners (6px border-radius)
- Maximum ONE button per email

COLOR SCHEME:
- Use photographer's brand colors: Primary ${photographer.brandPrimary || '#2c3e50'}, Secondary ${photographer.brandSecondary || '#3498db'}
- Background: #f8f9fa
- Content background: #ffffff
- Text: #4a5568

CONTENT STRUCTURE:
- Business name in header
- One H2 heading
- 2-4 short paragraphs (2-3 sentences each)
- Optional CTA button
- Professional footer signature

${customPrompt ? `Special focus: ${customPrompt}` : ''}

Respond with JSON containing:
{
  "emails": [
    {
      "subject": "client preparation focused subject",
      "htmlBody": "professional HTML email with elegant styling and proper design", 
      "textBody": "plain text version with helpful client tips",
      "weeksAfterStart": 0
    }
  ],
  "campaignDescription": "brief strategy description"
}`;

  // Define strategic email categories for balanced campaigns
  const emailCategories = [
    { type: 'educational', weight: 0.6, description: 'Helpful preparation guides and planning advice' },
    { type: 'social_proof', weight: 0.2, description: 'Client testimonials and success stories' },
    { type: 'cta', weight: 0.15, description: 'Gentle calls to action for booking or consultations' },
    { type: 'nurture', weight: 0.05, description: 'Personal connection and behind-the-scenes content' }
  ];

  // Calculate email distribution based on count
  const emailDistribution = emailCategories.map(cat => ({
    ...cat,
    count: Math.max(1, Math.round(emailCount * cat.weight))
  }));

  const userPrompt = `Create ${emailCount} strategically categorized ${projectType.toLowerCase()} emails for ${photographer.businessName}'s clients.

AUDIENCE: Couples/individuals who booked photography services (NOT photographers)

EMAIL DISTRIBUTION (follow this balance):
${emailDistribution.map(cat => `- ${cat.type.toUpperCase()}: ${cat.count} email(s) - ${cat.description}`).join('\n')}

CONTENT REQUIREMENTS BY CATEGORY:

EDUCATIONAL (Primary): 
- Event planning advice (timeline, coordination, what to bring)
- Styling tips (outfit choices, what photographs well)
- Confidence building (what to expect, how to prepare)
- Personal touches (meaningful details to include)

SOCIAL PROOF:
- Brief client success stories or testimonials
- "What [Client Name] loved most about their session"
- Gallery highlights from past events

CTA (Call-to-Action):
- Gentle booking reminders for additional services
- Consultation invitations
- Package upgrade opportunities

NURTURE:
- Personal photographer story or philosophy
- Behind-the-scenes glimpses
- Why photography matters personally

REQUIREMENTS:
- NO camera settings or technical photography advice
- Focus on CLIENT preparation and success
- Maintain strategic balance across categories
- Each email should provide genuine value

Generate valuable preparation content that helps clients get amazing results from their photography session.`;

  try {
    console.log('Calling OpenAI with user prompt:', userPrompt.substring(0, 200) + '...');
    
    // Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI request timeout after 90 seconds')), 90000);
    });
    
    const openaiPromise = openai.chat.completions.create({
      model: "gpt-4o-mini", // Using reliable model for testing
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8000, // Increased for better email generation
    });
    
    const response = await Promise.race([openaiPromise, timeoutPromise]) as any;

    console.log('OpenAI response received:', response.choices?.[0]?.message?.content?.substring(0, 500) + '...');
    
    const rawContent = response.choices[0].message.content || '{}';
    console.log('Raw OpenAI content:', rawContent);
    
    const result = JSON.parse(rawContent);
    
    console.log('OpenAI response result:', JSON.stringify(result, null, 2));
    
    if (!result.emails || !Array.isArray(result.emails)) {
      console.error('Invalid response format - result structure:', result);
      throw new Error('Invalid response format: missing emails array');
    }

    // Validate and format the emails
    const emails: DripCampaignEmailContent[] = result.emails.map((email: any, index: number) => ({
      subject: email.subject || `Email ${index + 1} - ${campaignName}`,
      htmlBody: email.htmlBody || email.html_body || '',
      textBody: email.textBody || email.text_body || stripHtml(email.htmlBody || email.html_body || ''),
      weeksAfterStart: email.weeksAfterStart || email.weeks_after_start || (index * frequencyWeeks)
    }));

    return {
      emails,
      campaignDescription: result.campaignDescription || result.campaign_description || `${emailCount}-email nurturing sequence for ${targetStage} stage clients`,
      businessContext
    };
  } catch (error) {
    console.error('🚨 DRIP CAMPAIGN GENERATION FAILED 🚨');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Full error details:', error);
    
    // Provide fallback if OpenAI fails
    console.log('🔄 USING FALLBACK TEMPLATES - OpenAI generation failed:', (error as Error).message);
    console.log('⚠️ This means users are getting generic content instead of AI-generated tips!');
    
    // Generate comprehensive fallback emails for the requested count
    const fallbackTemplates = [
      {
        subject: "5 Essential {projectType} Photography Tips",
        content: "Here are 5 expert tips to help you prepare for your {projectType} photography session and get the most amazing results."
      },
      {
        subject: "Behind the Scenes: How We Create Magic",
        content: "Ever wondered what goes into creating those perfect moments? Let me take you behind the scenes of our photography process."
      },
      {
        subject: "Seasonal {projectType} Inspiration",
        content: "The current season offers incredible opportunities for {projectType} photography. Here's how to make the most of it."
      },
      {
        subject: "Planning Your Perfect {projectType} Experience",
        content: "A great {projectType} session starts with proper planning. Here's your comprehensive guide to preparation."
      },
      {
        subject: "Client Spotlight: Amazing {projectType} Stories",
        content: "Let me share some inspiring stories from recent {projectType} sessions and what made them truly special."
      },
      {
        subject: "Ready to Book Your {projectType} Session?",
        content: "You've been on our minds! We'd love to discuss how we can create something amazing together."
      },
      {
        subject: "Exclusive {projectType} Photography Insights",
        content: "As a valued contact, here are some exclusive insights about {projectType} photography that most people don't know."
      },
      {
        subject: "Your {projectType} Photography Questions Answered",
        content: "We get lots of great questions about {projectType} photography. Here are answers to the most common ones."
      }
    ];

    const businessName = businessContext.split('\n')[0]?.replace('Business Name: ', '') || '{businessName}';
    const fallbackEmails: DripCampaignEmailContent[] = [];
    
    for (let i = 0; i < emailCount; i++) {
      const template = fallbackTemplates[i % fallbackTemplates.length];
      const isBookingEmail = (i + 1) % 3 === 0; // Every 3rd email has booking CTA
      
      const subject = template.subject.replace(/{projectType}/g, projectType.toLowerCase());
      const content = template.content.replace(/{projectType}/g, projectType.toLowerCase());
      
      const primaryColor = photographer.brandPrimary || '#2c3e50';
      const secondaryColor = photographer.brandSecondary || '#3498db';
      const contactEmail = photographer.emailFromAddr || 'hello@business.com';
      
      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 15px !important; }
      .header { font-size: 24px !important; }
      .cta-button { width: 100% !important; padding: 15px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif;">
  <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 30px 20px; text-align: center;">
      <h1 class="header" style="color: white; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 1px;">
        ${businessName}
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
        Professional Photography
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: ${primaryColor}; font-size: 22px; margin-bottom: 20px; font-weight: 400;">
        ${subject.replace(/^\w/, c => c.toUpperCase())}
      </h2>
      
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
        Hi {{firstName}},
      </p>
      
      <div style="color: #666; line-height: 1.7; font-size: 16px; margin-bottom: 30px;">
        <p>${content}</p>
      </div>

      ${isBookingEmail ? `
        <!-- Call to Action -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0; border: 1px solid #dee2e6;">
          <div style="background: ${secondaryColor}; width: 60px; height: 4px; margin: 0 auto 20px; border-radius: 2px;"></div>
          <h3 style="color: ${primaryColor}; margin: 0 0 15px; font-size: 20px; font-weight: 500;">
            Ready to Move Forward?
          </h3>
          <p style="color: #666; margin: 0 0 25px; line-height: 1.6;">
            We'd love to schedule a consultation to discuss your vision and how we can bring it to life.
          </p>
          <a href="mailto:${contactEmail}" class="cta-button" 
             style="background: linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    display: inline-block; 
                    font-weight: 500; 
                    letter-spacing: 0.5px; 
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    transition: all 0.3s ease;">
            Schedule Consultation
          </a>
        </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e9ecef;">
      <p style="color: ${primaryColor}; margin: 0 0 10px; font-weight: 500; font-size: 16px;">
        ${businessName}
      </p>
      <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.4;">
        Capturing your most precious moments with artistry and passion.
      </p>
      ${contactEmail !== 'hello@business.com' ? `
        <p style="color: #888; margin: 10px 0 0; font-size: 14px;">
          <a href="mailto:${contactEmail}" style="color: ${secondaryColor}; text-decoration: none;">${contactEmail}</a>
        </p>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
      
      const textBody = `Hi {{firstName}}, ${content} ${isBookingEmail ? "Ready to move forward? We'd love to schedule a consultation to discuss your vision. Reply to this email to get started!" : ""} Best regards, ${businessName}`;
      
      fallbackEmails.push({
        subject,
        htmlBody,
        textBody,
        weeksAfterStart: i * frequencyWeeks
      });
    }

    return {
      emails: fallbackEmails,
      campaignDescription: `Fallback ${emailCount}-email value-added nurturing sequence for ${targetStage} stage clients`,
      businessContext
    };
  }
}

export async function regenerateEmail(
  photographer: Photographer,
  originalEmail: DripCampaignEmailContent,
  feedback: string,
  businessContext: string
): Promise<DripCampaignEmailContent> {
  const systemPrompt = `You are an expert email marketing strategist for photography businesses. The photographer wants to improve one of their drip campaign emails based on specific feedback.

Business Context:
${businessContext}

Original Email:
Subject: ${originalEmail.subject}
Body: ${originalEmail.textBody || stripHtml(originalEmail.htmlBody)}

Photographer Feedback: ${feedback}

Please create an improved version that addresses the feedback while maintaining the email's purpose in the sequence. Respond with JSON containing the improved email.`;

  const userPrompt = `Please improve this email based on the feedback provided. Respond with valid JSON only.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using reliable model for testing
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      subject: result.subject || originalEmail.subject,
      htmlBody: result.htmlBody || result.html_body || originalEmail.htmlBody,
      textBody: result.textBody || result.text_body || stripHtml(result.htmlBody || result.html_body || ''),
      weeksAfterStart: originalEmail.weeksAfterStart
    };
  } catch (error) {
    console.error('Error regenerating email:', error);
    throw new Error(`Failed to regenerate email: ${(error as Error).message}`);
  }
}

export async function generateEmailFromPrompt(
  prompt: string,
  context: {
    projectTitle: string;
    contactName: string;
    projectType: string;
    photographerName: string;
    businessName: string;
    existingEmailBody?: string;
  }
): Promise<{ subject: string; body: string }> {
  const { projectTitle, contactName, projectType, photographerName, businessName, existingEmailBody } = context;

  const systemPrompt = `You are an expert email writer for ${photographerName} at ${businessName}, a professional photography business. 
  
Your task is to help compose professional, friendly, and personalized emails to clients about their photography projects.

Current Project Context:
- Project: ${projectTitle}
- Client: ${contactName}
- Project Type: ${projectType}
- Photographer: ${photographerName}
- Business: ${businessName}
${existingEmailBody ? `- Current email draft: ${existingEmailBody}` : ''}

Guidelines:
- Use a warm, professional tone that reflects ${photographerName}'s personal style
- Address the client by their first name (${contactName.split(' ')[0]}) when appropriate
- Be concise and clear
- Include proper email etiquette
- Reference the specific project (${projectTitle}) when relevant
- Sign off as ${photographerName}
${existingEmailBody ? '- If improving existing content, maintain the core message while making it better' : ''}

Respond with JSON in this format:
{
  "subject": "Email subject line",
  "body": "Email body content"
}`;

  const userPrompt = existingEmailBody 
    ? `Based on the current email draft, ${prompt}` 
    : `Create an email that: ${prompt}`;

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      subject: result.subject || '',
      body: result.body || ''
    };
  } catch (error) {
    console.error('Error generating email from prompt:', error);
    throw new Error(`Failed to generate email: ${(error as Error).message}`);
  }
}

export async function generateSMSFromPrompt(
  prompt: string,
  context: {
    projectTitle: string;
    contactName: string;
    projectType: string;
    photographerName: string;
    businessName: string;
    existingSMSBody?: string;
  }
): Promise<{ body: string }> {
  const { projectTitle, contactName, projectType, photographerName, businessName, existingSMSBody } = context;

  const systemPrompt = `You are an expert SMS writer for ${photographerName} at ${businessName}, a professional photography business.
  
Your task is to help compose professional, friendly, and concise SMS messages to clients about their photography projects.

Current Project Context:
- Project: ${projectTitle}
- Client: ${contactName}
- Project Type: ${projectType}
- Photographer: ${photographerName}
- Business: ${businessName}
${existingSMSBody ? `- Current SMS draft: ${existingSMSBody}` : ''}

Guidelines:
- Keep it SHORT (aim for 160-300 characters when possible)
- Use ${photographerName}'s friendly, professional tone
- Address the client by their first name (${contactName.split(' ')[0]})
- Be concise and get straight to the point
- Use casual but professional language
- Reference the specific project (${projectTitle}) when relevant
- Sign off as ${photographerName} or just your first name
${existingSMSBody ? '- If improving existing content, maintain the core message while making it better' : ''}

Respond with JSON in this format:
{
  "body": "SMS message content (keep it concise!)"
}`;

  const userPrompt = existingSMSBody 
    ? `Based on the current SMS draft, ${prompt}` 
    : `Create an SMS message that: ${prompt}`;

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      body: result.body || ''
    };
  } catch (error) {
    console.error('Error generating SMS from prompt:', error);
    throw new Error(`Failed to generate SMS: ${(error as Error).message}`);
  }
}

// Helper function to strip HTML tags for text version
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Conversational AI that can ask clarifying questions before generating content
export async function conversationalAI(
  messageType: 'email' | 'sms',
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>,
  context: {
    projectTitle: string;
    contactName: string;
    projectType: string;
    photographerName: string;
    businessName: string;
    existingContent?: string;
  }
): Promise<{
  type: 'question' | 'ready';
  message?: string;
  content?: { subject?: string; body: string };
}> {
  const { projectTitle, contactName, projectType, photographerName, businessName, existingContent } = context;
  const clientFirstName = contactName.split(' ')[0];

  const systemPrompt = messageType === 'email' 
    ? `You are an intelligent email assistant for ${photographerName} at ${businessName}, a professional photography business.

Current Project Context:
- Project: ${projectTitle}
- Client: ${contactName} (address as "${clientFirstName}")
- Project Type: ${projectType}
- Photographer: ${photographerName}
- Business: ${businessName}
${existingContent ? `- Current draft: ${existingContent}` : ''}

Your job is to help ${photographerName} write emails to clients. You have TWO modes:

MODE 1 - ASK QUESTIONS (when user request is unclear):
If the user's request is vague or missing key details, ask 1-3 specific clarifying questions to understand:
- What is the purpose/topic of this email?
- What action do they want the client to take?
- Any specific details to include (dates, links, deadlines)?

Be conversational and helpful. Ask only the most important questions.

MODE 2 - GENERATE EMAIL (when you have enough context):
Generate a professional, warm email that:
- Addresses ${clientFirstName} personally
- References the ${projectTitle} project when relevant
- Has a clear subject line
- Is concise and actionable
- Signs off as ${photographerName}

DECISION RULE:
- If user request is specific and clear → Generate immediately
- If user request is vague ("send email about photos") → Ask clarifying questions first

Respond in JSON format:
FOR QUESTIONS: {"type": "question", "message": "Your clarifying question(s)"}
FOR READY: {"type": "ready", "content": {"subject": "...", "body": "..."}, "message": "I've generated your email!"}`
    : `You are an intelligent SMS assistant for ${photographerName} at ${businessName}, a professional photography business.

Current Project Context:
- Project: ${projectTitle}
- Client: ${contactName} (address as "${clientFirstName}")
- Project Type: ${projectType}
- Photographer: ${photographerName}
- Business: ${businessName}
${existingContent ? `- Current draft: ${existingContent}` : ''}

Your job is to help ${photographerName} write SMS messages to clients. You have TWO modes:

MODE 1 - ASK QUESTIONS (when user request is unclear):
If the user's request is vague or missing key details, ask 1-2 specific clarifying questions to understand:
- What is the main purpose of this text?
- What action do they want the client to take?
- Any urgent details to include?

Be brief and conversational.

MODE 2 - GENERATE SMS (when you have enough context):
Generate a concise, friendly SMS that:
- Addresses ${clientFirstName} personally
- Is SHORT (160-300 characters ideal)
- Gets straight to the point
- Uses casual but professional tone
- Signs as ${photographerName} or just first name

DECISION RULE:
- If user request is specific and clear → Generate immediately
- If user request is vague → Ask clarifying questions first

Respond in JSON format:
FOR QUESTIONS: {"type": "question", "message": "Your clarifying question(s)"}
FOR READY: {"type": "ready", "content": {"body": "..."}, "message": "I've generated your text!"}`;

  try {
    console.log("=== CALLING OPENAI API ===");
    console.log("Model: gpt-5");
    console.log("Message Type:", messageType);
    console.log("Conversation History Length:", conversationHistory.length);
    
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    console.log("=== OPENAI RAW RESPONSE ===");
    console.log("Response content:", response.choices[0].message.content);
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    console.log("=== PARSED RESULT ===");
    console.log("Type:", result.type);
    console.log("Has message:", !!result.message);
    console.log("Has content:", !!result.content);
    
    return result;
  } catch (error) {
    console.error('=== ERROR IN CONVERSATIONAL AI ===');
    console.error('Error:', error);
    console.error('Error message:', (error as Error).message);
    console.error('Error stack:', (error as Error).stack);
    throw new Error(`Failed to process conversation: ${(error as Error).message}`);
  }
}