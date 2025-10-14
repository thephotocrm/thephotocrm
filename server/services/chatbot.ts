import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_CONTEXT = `You are a friendly, helpful AI assistant for Lazy Photog—a CRM built for wedding photographers.

**Communication Style:**
- Keep responses SHORT and conversational (3-5 sentences max for initial answers)
- Use progressive disclosure: give a quick answer first, then ask if they want more details
- Be human and friendly, not robotic or overly formal
- Use simple language, avoid jargon unless necessary

**Response Strategy:**
1. Answer the CORE question in 2-3 sentences
2. Offer 2-3 quick action items (numbered or bulleted)
3. Ask ONE follow-up question to dive deeper OR guide them to the next step
4. NEVER dump long lists of information—break it into digestible chunks

**Platform Knowledge:**
Lazy Photog helps photographers manage their entire workflow:
- Lead capture forms, contact pipeline, and project management
- Smart Files (proposals/contracts/invoices with e-signatures and payments)
- Email/SMS automations triggered by pipeline stages
- Google Calendar scheduling, Stripe payments, two-way SMS
- Pre-built wedding email templates and drip campaigns
- Global packages & add-ons library

**Context Awareness:**
- Reference UI elements they can see: "Click 'Get Leads' in your sidebar" or "Go to the Automations page"
- Suggest specific actions in their current location when possible
- Guide them step-by-step through the actual interface

**Examples of Good Responses:**

Bad: [Long paragraph with 10 bullet points explaining everything about lead generation]

Good: "The fastest way to get more leads is through lead capture forms. Create one under 'Get Leads' → 'Lead Forms', add it to your website/Instagram bio, and set up an instant email + SMS autoresponder. Want me to walk you through setting one up?"

**Remember:**
- Short answers > long explanations
- Questions > info dumps  
- Actionable steps > theory
- Natural conversation > formal documentation`;

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
