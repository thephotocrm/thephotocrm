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

**Navigation Structure (BE ACCURATE!):**
SIDEBAR MENU:
- Core Items: Dashboard (/), Projects, Contacts, Inbox
- Sales & Proposals (collapsible): Smart Files, Packages, Add-ons
- Marketing (collapsible): Templates, Automations, Drip Campaigns, Lead Forms
- Business Tools (collapsible): Scheduling, Reports, Earnings
- Premium: Lead Hub (locked without premium)
- Bottom: Settings, Tutorials

**Correct Directions:**
✅ "Go to Marketing → Lead Forms" (NOT "Get Leads → Lead Forms")
✅ "Open Marketing → Automations" (NOT "Click Automations in sidebar")
✅ "Navigate to Sales & Proposals → Smart Files"
❌ NEVER say "Get Leads" as a menu item - it doesn't exist

**Context Awareness:**
- Reference actual UI paths accurately
- Guide step-by-step through real navigation
- When in doubt about a path, just say "Go to [page name]" without假 navigation

**Examples of Good Responses:**

Bad: [Long paragraph with 10 bullet points explaining everything about lead generation]

Good: "The fastest way to get more leads is through lead capture forms. Go to Marketing → Lead Forms and click 'Create Form' to set one up with name, email, phone, and date fields."

**Remember:**
- Short answers > long explanations
- Questions > info dumps  
- Actionable steps > theory
- Natural conversation > formal documentation
- Give clear, accurate navigation directions`;

// Define tools for OpenAI function calling
const CHATBOT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_lead_form",
      description: "Creates a new lead capture form for the photographer. Use this when the user confirms they want a form created.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the lead form (e.g., 'Wedding Inquiry Form')"
          },
          description: {
            type: "string",
            description: "Brief description of the form's purpose"
          },
          projectType: {
            type: "string",
            enum: ["WEDDING", "PORTRAIT", "COMMERCIAL"],
            description: "Type of photography project this form is for"
          }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "create_contact",
      description: "Adds a new contact to the photographer's CRM. Use this when the user confirms they want to add a contact.",
      parameters: {
        type: "object",
        properties: {
          firstName: {
            type: "string",
            description: "Contact's first name"
          },
          lastName: {
            type: "string",
            description: "Contact's last name"
          },
          email: {
            type: "string",
            description: "Contact's email address"
          },
          phone: {
            type: "string",
            description: "Contact's phone number (with country code, e.g., +15551234567)"
          },
          projectType: {
            type: "string",
            enum: ["WEDDING", "PORTRAIT", "COMMERCIAL"],
            description: "Type of photography project"
          }
        },
        required: ["firstName", "email"]
      }
    }
  }
];

export async function getChatbotResponse(
  message: string,
  context: string = "general",
  photographerName?: string,
  history: ChatMessage[] = [],
  photographerId?: string
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
      max_completion_tokens: 8000
      // Note: AI creation tools disabled - needs GPT-5 behavior tuning. See replit.md for details.
    });
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      console.error("Invalid OpenAI response structure:", response);
      return "I'm sorry, I couldn't generate a response. Please try again.";
    }

    const aiResponse = response.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try again.";
    return aiResponse;
  } catch (error: any) {
    console.error("Chatbot error details:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    throw new Error("Failed to get chatbot response");
  }
}

async function executeAction(action: any, photographerId: string): Promise<string> {
  const { storage } = await import("../storage");
  
  switch (action.type) {
    case "CREATE_LEAD_FORM": {
      const { name, description, projectType = "WEDDING", fields = [] } = action.params;
      
      const defaultConfig = {
        title: name || "Wedding Inquiry Form",
        description: description || "Let's discuss your wedding photography needs",
        primaryColor: "#3b82f6",
        backgroundColor: "#ffffff",
        buttonText: "Send Inquiry",
        successMessage: "Thank you! We'll be in touch soon.",
        showPhone: true,
        showMessage: true,
        showEventDate: true,
        redirectUrl: "",
        customFields: fields.length > 0 ? fields : [
          { id: "firstName", type: "text", label: "First Name", placeholder: "Jane", required: true, isSystem: true, width: "half" },
          { id: "lastName", type: "text", label: "Last Name", placeholder: "Smith", required: true, isSystem: true, width: "half" },
          { id: "email", type: "email", label: "Email", placeholder: "jane@example.com", required: true, isSystem: true, width: "full" },
          { id: "phone", type: "phone", label: "Phone", placeholder: "(555) 123-4567", required: true, isSystem: false, width: "full" },
          { id: "eventDate", type: "date", label: "Wedding Date", required: false, isSystem: false, width: "half" },
          { id: "venue", type: "text", label: "Venue Name", placeholder: "e.g. The Grand Hotel", required: false, isSystem: false, width: "half" },
          { id: "message", type: "textarea", label: "Tell us about your wedding", placeholder: "Share any details...", required: false, isSystem: false, width: "full" },
          { id: "optInSms", type: "checkbox", label: "I agree to receive SMS updates", required: false, options: ["Yes, text me updates"], isSystem: false, width: "full" }
        ]
      };

      const leadForm = await storage.createLeadForm({
        photographerId,
        name: name || "Wedding Inquiry Form",
        description: description || "AI-generated wedding inquiry form",
        projectType: projectType as any,
        config: defaultConfig,
        status: "ACTIVE"
      });

      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || '';
      return `✅ Done! I created "${leadForm.name}" for you. View it in Marketing → Lead Forms, or share this link: ${domain}/f/${leadForm.publicToken}`;
    }

    case "CREATE_CONTACT": {
      const { firstName, lastName, email, phone, projectType = "WEDDING" } = action.params;
      
      if (!firstName || !email) {
        return "❌ I need at least a first name and email to create a contact.";
      }

      const stages = await storage.getStagesByPhotographer(photographerId);
      const firstStage = stages.find(s => s.order === 1) || stages[0];

      if (!firstStage) {
        return "❌ You need to set up your pipeline stages first before I can add contacts.";
      }

      const contact = await storage.createContact({
        photographerId,
        firstName,
        lastName: lastName || "",
        email,
        phone: phone || null,
        currentStageId: firstStage.id,
        projectType: projectType as any,
        leadSource: "AI_ASSISTANT"
      });

      return `✅ Added ${firstName} ${lastName || ''} to your ${firstStage.name} stage! View in Contacts page.`;
    }

    default:
      return "❌ Unknown action type.";
  }
}
