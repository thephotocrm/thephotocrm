import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_CONTEXT = `You are a helpful AI assistant for Lazy Photog, a comprehensive CRM system for wedding photographers.

**About Lazy Photog:**
Lazy Photog is a multi-tenant CRM designed to streamline workflows from inquiry to project completion. Key features include:

- **Contact & Project Management**: Track contacts through customizable pipeline stages
- **Smart Files**: Create professional proposals, contracts, and invoices with e-signature capabilities
- **Automated Communication**: Set up email and SMS automations triggered by stage changes
- **Payment Processing**: Accept payments through integrated Stripe Connect
- **Scheduling**: Google Calendar integration for client appointments with Meet links
- **Lead Generation**: Create custom lead capture forms and manage advertising campaigns
- **Email Marketing**: Pre-written wedding email templates and drip campaigns
- **Two-Way SMS**: Communicate with clients via text message
- **Global Packages & Add-ons**: Create reusable service packages and add-ons

**Your Role:**
- Answer questions about Lazy Photog features and capabilities
- Guide users on how to use the platform
- Help troubleshoot common issues
- Provide best practices for photographers
- Be friendly, professional, and concise

**Guidelines:**
- Keep responses clear and actionable
- Use photography industry terminology when appropriate
- If you don't know something specific, acknowledge it honestly
- Direct complex technical issues to support when needed
- Always maintain a helpful and encouraging tone`;

export async function getChatbotResponse(
  message: string,
  context: string = "general",
  photographerName?: string,
  history: ChatMessage[] = []
): Promise<string> {
  try {
    // Build context-aware system message
    let systemMessage = SYSTEM_CONTEXT;
    
    if (photographerName) {
      systemMessage += `\n\nThe user is viewing a page for ${photographerName}.`;
    }
    
    if (context !== "general") {
      systemMessage += `\n\nThe user is currently on the ${context} page.`;
    }

    // Prepare messages for OpenAI
    const messages: ChatMessage[] = [
      { role: "system", content: systemMessage },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: messages as any,
      max_completion_tokens: 8000 // High limit for GPT-5's unpredictable reasoning token usage
    });

    console.log("OpenAI Response:", JSON.stringify(response, null, 2));
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      console.error("Invalid OpenAI response structure:", response);
      return "I'm sorry, I couldn't generate a response. Please try again.";
    }

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error: any) {
    console.error("Chatbot error details:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    throw new Error("Failed to get chatbot response");
  }
}
