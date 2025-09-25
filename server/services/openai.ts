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
    emailCount = 6,
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

  // Create AI prompt
  const systemPrompt = `You are an expert email marketing strategist specializing in wedding and photography business nurturing campaigns. Create personalized, engaging email sequences that build trust, showcase expertise, and gently guide potential clients toward booking.

Your goal is to create a ${emailCount}-email drip campaign for ${projectType.toLowerCase()} photography clients who are in the "${targetStage}" stage. These emails should be sent every ${frequencyWeeks} weeks over up to ${maxDurationMonths} months.

Business Context:
${businessContext}

Guidelines:
1. Each email should provide genuine value (tips, behind-the-scenes insights, client stories, etc.)
2. Maintain a warm, personal tone that reflects the photographer's brand
3. Include subtle calls-to-action without being pushy
4. Use personalization variables like {{firstName}}, {{lastName}}, {{eventDate}}, {{projectType}}
5. Create compelling subject lines that encourage opens
6. Keep emails scannable with clear structure
7. Include social proof and photography expertise
8. Address common concerns and questions at this stage
9. Build anticipation and excitement about the photography experience

Email Topics to Consider:
- Welcome and introduction
- Behind-the-scenes stories and processes  
- Client success stories and testimonials
- Photography tips and advice
- Seasonal inspirations and trends
- Planning guides and checklists
- Personal stories from the photographer
- Portfolio highlights and recent work

${customPrompt ? `Additional Instructions: ${customPrompt}` : ''}

Respond with a JSON object containing an array of "emails" where each email has:
- subject: Compelling subject line
- htmlBody: Full HTML email content with proper structure and styling
- textBody: Plain text version of the email
- weeksAfterStart: When to send this email (0, 2, 4, 6, etc.)

Also include:
- campaignDescription: Brief description of the overall campaign strategy
`;

  const userPrompt = `Generate a ${emailCount}-email nurturing campaign for ${photographer.businessName}'s ${projectType.toLowerCase()} photography business, targeting clients in the "${targetStage}" stage. Make it personal, valuable, and conversion-focused while maintaining a warm, authentic tone.

Please respond with valid JSON only.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.emails || !Array.isArray(result.emails)) {
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
    console.error('Error generating drip campaign:', error);
    throw new Error(`Failed to generate drip campaign: ${error.message}`);
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
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
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
    throw new Error(`Failed to regenerate email: ${error.message}`);
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