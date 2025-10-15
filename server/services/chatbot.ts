import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

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
      const firstStage = stages.find(s => s.orderIndex === 1) || stages[0];

      if (!firstStage) {
        return "❌ You need to set up your pipeline stages first before I can add contacts.";
      }

      const contact = await storage.createContact({
        photographerId,
        firstName,
        lastName: lastName || "",
        email,
        phone: phone || null,
        stageId: firstStage.id,
        projectType: projectType as any,
        leadSource: "AI_ASSISTANT"
      });

      return `✅ Added ${firstName} ${lastName || ''} to your ${firstStage.name} stage! View in Contacts page.`;
    }

    default:
      return "❌ Unknown action type.";
  }
}

// Zod schema for automation extraction
const AutomationStep = z.object({
  type: z.enum(["EMAIL", "SMS", "SMART_FILE"]),
  delayDays: z.number().min(0).max(365),
  delayHours: z.number().min(0).max(23).default(0),
  subject: z.string().nullish(),
  content: z.string(),
  recipientType: z.enum(["CONTACT", "PHOTOGRAPHER"]),
  smartFileTemplateName: z.string().nullish().describe("Name of the smart file template to send (for SMART_FILE type)")
});

const AutomationExtraction = z.object({
  name: z.string().describe("A short descriptive name for this automation"),
  description: z.string().describe("A brief description of what this automation does"),
  triggerType: z.enum(["STAGE_CHANGE", "SPECIFIC_STAGE"]).describe("What triggers this automation"),
  triggerStageId: z.string().nullish().describe("The stage ID if trigger is SPECIFIC_STAGE"),
  projectType: z.enum(["WEDDING", "PORTRAIT", "COMMERCIAL"]).default("WEDDING"),
  steps: z.array(AutomationStep).min(1).max(10).describe("The sequence of actions to take")
});

export async function extractAutomationFromDescription(
  description: string,
  photographerId: string
): Promise<z.infer<typeof AutomationExtraction>> {
  const { storage } = await import("../storage");
  
  // Get photographer's stages for context
  const stages = await storage.getStagesByPhotographer(photographerId);
  const stagesList = stages.map(s => `${s.name} (ID: ${s.id})`).join(", ");

  const systemPrompt = `You are an expert at understanding photographer workflow automation requests.

The photographer has these pipeline stages: ${stagesList}

Extract automation parameters from the user's description. Be smart about:
1. Trigger: If they mention "when someone books" or "after booking" → SPECIFIC_STAGE with booking stage
2. Delays: Convert "1 day later" → delayDays: 1, "3 hours" → delayHours: 3, "immediately" → delayDays: 0
3. Action Types:
   - EMAIL: For email messages
   - SMS: For text messages
   - SMART_FILE: When photographer mentions sending "proposal", "invoice", "contract", or "smart file"
     For SMART_FILE type, leave smartFileTemplateName as null - the user will select their template in the UI
4. Content: Write professional, friendly email/SMS content that matches their request
   
   ALLOWED PLACEHOLDERS - These will be replaced with actual values:
   - {{PHOTOGRAPHER_NAME}} - The photographer's name
   - {{BUSINESS_NAME}} - The business/studio name
   - {{SCHEDULING_LINK}} - Booking calendar link (only when photographer specifically requests it)
   
   Use these placeholders naturally in messages. For example:
   - "Thanks for reaching out! - {{PHOTOGRAPHER_NAME}}"
   - "We're excited to work with you! - {{BUSINESS_NAME}}"
   - "Book a time that works for you: {{SCHEDULING_LINK}}"
   
   NEVER use non-functional placeholders like [Your Name], {yourname}, [Business Name], etc.
   Only use the exact placeholders listed above.
   
5. Recipient: Usually CONTACT, but could be PHOTOGRAPHER for internal reminders
6. Subject: Email needs subject, SMS doesn't

Examples:
- "Send thank you email next day after booking" → EMAIL step, delayDays: 1, to CONTACT
- "Text them welcome message right away when they enter inquiry stage" → SMS step, delayDays: 0, SPECIFIC_STAGE trigger
- "Remind me to follow up 3 days after proposal sent" → EMAIL/SMS to PHOTOGRAPHER, delayDays: 3
- "Send SMS with booking link when they enter consultation stage" → SMS with "{{SCHEDULING_LINK}}" in content

BAD message (non-functional placeholder): "Thanks for reaching out! I'll be in touch soon. - [Your Name]"
GOOD message (with proper placeholder): "Thanks for reaching out! I'll be in touch soon. - {{PHOTOGRAPHER_NAME}}"
GOOD message (with scheduling link): "Ready to book your session? Schedule here: {{SCHEDULING_LINK}}"
GOOD message (with business name): "Looking forward to capturing your special day! - {{BUSINESS_NAME}}"`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: description }
    ],
    response_format: zodResponseFormat(AutomationExtraction, "automation"),
    max_completion_tokens: 2000
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }
  
  const extracted = JSON.parse(content) as z.infer<typeof AutomationExtraction>;
  
  if (!extracted) {
    throw new Error("Failed to extract automation parameters");
  }

  return extracted;
}

// Schema for detecting multiple automations in one request
const MultiAutomationDetection = z.object({
  isMultiAutomation: z.boolean().describe("True if the request contains multiple separate automation requests"),
  automationCount: z.number().describe("Number of separate automations detected"),
  automations: z.array(z.object({
    summary: z.string().describe("Brief summary of this automation (e.g., 'SMS 5 min after inquiry')"),
    triggerStage: z.string().nullable().describe("Stage name that triggers this"),
    actionType: z.enum(["EMAIL", "SMS", "SMART_FILE"]).describe("Type of action"),
    timing: z.string().describe("When it should trigger (e.g., '5 minutes', '1 day at 6pm')"),
    purpose: z.string().describe("What this automation does")
  })).describe("List of detected automations")
});

/**
 * Detect if a message contains multiple automation requests
 */
export async function detectMultipleAutomations(
  message: string,
  photographerId: string
): Promise<z.infer<typeof MultiAutomationDetection>> {
  const { storage } = await import("../storage");
  const stages = await storage.getStagesByPhotographer(photographerId);
  const stagesList = stages.map(s => s.name).join(", ");

  const systemPrompt = `You are analyzing a photographer's automation request to detect if they want to create multiple automations in one message.

Available stages: ${stagesList}

Look for patterns like:
- "send X, then send Y" = 2 automations
- "send X at the same time send Y, and then send Z" = 3 automations  
- "when someone does X, send them Y via email and also send Z via text" = 2 automations
- Sequential actions: "first do X, then do Y, then do Z" = multiple automations

Each separate ACTION (email, SMS, Smart File) = 1 automation, even if they happen at the same time.

Examples:
✅ "send SMS after 5 min and email at same time" → 2 automations (SMS + Email)
✅ "when inquiry comes in, text them and send proposal" → 2 automations (SMS + Smart File)
✅ "send email, then follow up with text next day" → 2 automations
❌ "send them a welcome email" → 1 automation (single action)

Analyze the request and identify each separate automation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
    response_format: zodResponseFormat(MultiAutomationDetection, "detection"),
    max_completion_tokens: 1000
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in detection response");
  }

  return JSON.parse(content) as z.infer<typeof MultiAutomationDetection>;
}

// Conversation state schema for building automations
const AutomationInfo = z.object({
  triggerType: z.enum(["SPECIFIC_STAGE", "GLOBAL"]).nullable(),
  stageId: z.string().nullable(),
  stageName: z.string().nullable(),
  actionType: z.enum(["EMAIL", "SMS", "SMART_FILE"]).nullable(),
  delayDays: z.number().nullable(),
  delayHours: z.number().nullable(),
  delayMinutes: z.number().nullable(), // 0-59 for minute-level delays
  scheduledHour: z.number().nullable(), // 0-23 for time of day
  scheduledMinute: z.number().nullable(), // 0-59
  subject: z.string().nullable(),
  content: z.string().nullable(),
  smartFileTemplateId: z.string().nullable(),
  smartFileTemplateName: z.string().nullable(),
});

const ConversationState = z.object({
  status: z.enum(["collecting", "confirming", "complete"]),
  collectedInfo: AutomationInfo,
  nextQuestion: z.string(),
  needsTemplateSelection: z.boolean().nullable(),
  needsStageSelection: z.boolean().nullable(),
  options: z.array(z.object({
    label: z.string(),
    value: z.string()
  })).nullable(),
  // Multi-automation support
  automationQueue: z.array(AutomationInfo).nullable(), // Queue of automations to create
  currentAutomationIndex: z.number().nullable(), // Which automation we're working on (0-based)
  totalAutomations: z.number().nullable(), // Total count for progress display
});

export type ConversationStateType = z.infer<typeof ConversationState>;

/**
 * Conversational AI automation builder
 * Asks questions progressively to build an automation
 */
export async function conversationalAutomationBuilder(
  userMessage: string,
  conversationHistory: ChatMessage[],
  photographerId: string,
  currentState?: ConversationStateType
): Promise<ConversationStateType> {
  const { storage } = await import("../storage");
  
  // Get photographer context
  const stages = await storage.getStagesByPhotographer(photographerId);
  const stagesList = stages.map(s => `${s.name} (ID: ${s.id})`).join(", ");
  
  const smartFiles = await storage.getSmartFilesByPhotographer(photographerId);
  const smartFilesList = smartFiles.map(sf => `${sf.name} (ID: ${sf.id})`).join(", ");

  // MULTI-AUTOMATION DETECTION: Check if this is the FIRST USER MESSAGE (not first message overall)
  // Count only user messages in history to determine if this is the first user input
  const userMessagesInHistory = conversationHistory.filter(m => m.role === 'user').length;
  console.log(`🔍 Multi-automation check: currentState=${!!currentState}, historyLength=${conversationHistory.length}, userMessages=${userMessagesInHistory}`);
  
  // Run detection if: no current state AND this is the first USER message (count=1 because current msg is already in history)
  if (!currentState && userMessagesInHistory === 1) {
    console.log('🔎 Running multi-automation detection (first user message)...');
    const detection = await detectMultipleAutomations(userMessage, photographerId);
    
    if (detection.isMultiAutomation && detection.automationCount > 1) {
      // Multi-automation detected! Set up the queue
      const queue: z.infer<typeof AutomationInfo>[] = detection.automations.map(() => ({
        triggerType: null,
        stageId: null,
        stageName: null,
        actionType: null,
        delayDays: null,
        delayHours: null,
        delayMinutes: null,
        scheduledHour: null,
        scheduledMinute: null,
        subject: null,
        content: null,
        smartFileTemplateId: null,
        smartFileTemplateName: null,
      }));

      // Create initial state with queue info
      return {
        status: "collecting",
        collectedInfo: queue[0], // Start with first automation
        nextQuestion: `I can see you want to create ${detection.automationCount} automations here! Let me help you set them up one at a time.\n\n**Automation 1 of ${detection.automationCount}:** ${detection.automations[0].summary}\n\nWhich stage should trigger this first automation?`,
        needsTemplateSelection: null,
        needsStageSelection: true,
        options: stages.map(s => ({ label: s.name, value: s.id })),
        automationQueue: queue,
        currentAutomationIndex: 0,
        totalAutomations: detection.automationCount,
      };
    }
  }

  // Check if we're in multi-automation mode
  const isMultiMode = currentState?.automationQueue && currentState.automationQueue.length > 1;
  const currentIndex = currentState?.currentAutomationIndex ?? 0;
  const totalAutomations = currentState?.totalAutomations ?? 1;
  const progressText = isMultiMode ? `\n\n**PROGRESS: Automation ${currentIndex + 1} of ${totalAutomations}**` : "";

  const systemPrompt = `You are helping a photographer create an automation through conversation.

**Available Pipeline Stages:** ${stagesList}
**Available Smart File Templates:** ${smartFilesList}
${isMultiMode ? `\n**MULTI-AUTOMATION MODE:** You are working on automation ${currentIndex + 1} of ${totalAutomations}. After this one is confirmed, move to the next.` : ""}

**Your Job:** Ask ONE question at a time to collect the following info:
1. **Trigger Stage**: What stage should trigger this automation? (REQUIRED unless explicitly global)
   - This is MANDATORY - you MUST collect a stage unless they explicitly say "all stages" or "global"
   - If they mention a stage name (e.g., "inquiry", "consultation", "booked"), match it to the available stages list above and extract the stage ID
   - Set stageId to the matching stage ID from the list
   - Set stageName to the matching stage name
   - If no match or unclear, ask them to clarify which stage
   - NEVER skip asking about the stage - it's critical for automation functionality
   
2. **Timing**: When should it send?
   - Extract delay in days/hours/minutes (e.g., "2 days later" → delayDays: 2, "15 minutes" → delayMinutes: 15, "immediately" → delayDays: 0, delayMinutes: 0)
   - If they mention specific time like "6pm" or "2:30pm", extract scheduledHour and scheduledMinute
   - Examples: 
     - "2 days from now at 6pm" → delayDays: 2, scheduledHour: 18, scheduledMinute: 0
     - "15 minutes after" → delayMinutes: 15
     - "1 hour later" → delayHours: 1
   
3. **Action Type**: What to send?
   - EMAIL, SMS, or SMART_FILE (proposal/invoice/contract)
   
4. **Content**: What message or template?
   - For EMAIL/SMS: Generate content or ask what they want to say
   - For SMART_FILE: Set needsTemplateSelection: true so UI shows dropdown
   
5. **Subject** (for email only)

**IMPORTANT STAGE MATCHING:**
- User says "inquiry" → Match to "Inquiry" stage ID from the list
- User says "consultation" or "consult" → Match to "Consultation" stage ID
- User says "booked" or "booking" → Match to "Booked" stage ID
- Always extract the exact stage ID from the Available Pipeline Stages list above

**Conversation Style:**
- Be friendly and conversational
- Ask ONE clear question at a time
- Confirm details before marking complete
- Use natural language, not technical jargon

**Response Format:**
- status: "collecting" (still gathering info), "confirming" (have everything, asking to confirm), or "complete" (user confirmed)
- collectedInfo: Object with the info gathered so far
- nextQuestion: The next question to ask the user (or confirmation message)
- needsTemplateSelection: true if user needs to pick a Smart File template from dropdown
- needsStageSelection: true if user needs to pick a stage from dropdown
- options: Array of {label, value} options if providing choices

**CRITICAL - Multi-Automation Queue Preservation:**
${isMultiMode ? `⚠️ IMPORTANT: You are in MULTI-AUTOMATION MODE. You MUST preserve these fields in EVERY response:
- automationQueue: ${JSON.stringify(currentState?.automationQueue)} (copy this EXACTLY)
- currentAutomationIndex: ${currentState?.currentAutomationIndex}
- totalAutomations: ${currentState?.totalAutomations}
These fields track the queue of automations being created. DO NOT set them to null or omit them!` : ""}

**CONFIRMATION MESSAGE (when status = "confirming"):**
When you have ALL required info (stage, timing, action type, content), set status to "confirming" and write a friendly summary in nextQuestion like:

"Okay, I think I've got it! Here's what we'll create${progressText}:

📍 **Trigger:** When a client enters the [Stage Name] stage
⏰ **Timing:** [Wait X days/hours] [at specific time if applicable]
📧/📱/📄 **Action:** Send [email/SMS/Smart File]
✉️ **Message:** [Brief preview of content or "You'll select a template"]

Does this look good? Reply 'yes' to create it, or let me know what to change!"

Make it conversational, clear, and easy to understand. Use emojis to make it friendly.${isMultiMode ? "\n\n**IMPORTANT:** After user confirms, you'll move to the next automation in the queue automatically." : ""}

**Examples:**

User: "Send a thank you email 1 day after booking"
Response: {
  status: "collecting",
  collectedInfo: { actionType: "EMAIL", delayDays: 1 },
  nextQuestion: "Got it! I'll send a thank you email 1 day after someone enters a stage. Which stage should trigger this automation?",
  needsStageSelection: true
}

User: "When they enter inquiry"
Response: {
  status: "collecting", 
  collectedInfo: { stageId: "[inquiry-stage-id-from-list]", stageName: "Inquiry", actionType: "EMAIL", delayDays: 1 },
  nextQuestion: "Perfect! What should the email say?",
  needsStageSelection: false
}

User: "Thanks for reaching out! We'll get back to you soon."
Response: {
  status: "confirming",
  collectedInfo: { stageId: "[id]", stageName: "Inquiry", actionType: "EMAIL", delayDays: 1, content: "Thanks for reaching out! We'll get back to you soon." },
  nextQuestion: "Okay, I think I've got it! Here's what we'll create:\n\n📍 **Trigger:** When a client enters the Inquiry stage\n⏰ **Timing:** Wait 1 day\n📧 **Action:** Send email\n✉️ **Message:** \"Thanks for reaching out! We'll get back to you soon.\"\n\nDoes this look good? Reply 'yes' to create it, or let me know what to change!",
  needsTemplateSelection: false
}

User: "yes" (or "looks good" or "create it")
Response: {
  status: "complete",
  collectedInfo: { [same as above] },
  nextQuestion: "Perfect! Creating your automation now...",
  needsTemplateSelection: false
}

Current State: ${JSON.stringify(currentState || {})}
Conversation History: ${JSON.stringify(conversationHistory.slice(-4))} (showing last 4 messages)`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];

  console.log('🤖 Calling OpenAI for conversational automation...');
  
  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        response_format: zodResponseFormat(ConversationState, "conversation"),
        max_completion_tokens: 1500
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout after 30 seconds')), 30000)
      )
    ]);

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }
    
    let state = JSON.parse(content) as ConversationStateType;
    console.log('✅ OpenAI response received, status:', state.status);
    
    // MULTI-AUTOMATION QUEUE HANDLING
    // If user confirmed and we're in multi-automation mode, advance to next automation
    if (state.status === "complete" && isMultiMode && state.automationQueue) {
      const nextIndex = currentIndex + 1;
      
      if (nextIndex < totalAutomations) {
        // More automations in queue! Move to next one
        console.log(`📋 Moving to automation ${nextIndex + 1} of ${totalAutomations}`);
        
        // Save completed automation in queue
        state.automationQueue[currentIndex] = state.collectedInfo;
        
        // Reset to start collecting next automation
        state = {
          status: "collecting",
          collectedInfo: state.automationQueue[nextIndex], // Next automation
          nextQuestion: `Great! Automation ${currentIndex + 1} is ready to create.\n\n**Now let's set up Automation ${nextIndex + 1} of ${totalAutomations}**\n\nWhat stage should trigger this automation?`,
          needsTemplateSelection: null,
          needsStageSelection: true,
          options: stages.map(s => ({ label: s.name, value: s.id })),
          automationQueue: state.automationQueue,
          currentAutomationIndex: nextIndex,
          totalAutomations: totalAutomations,
        };
      } else {
        // Last automation confirmed - mark as truly complete
        console.log(`✅ All ${totalAutomations} automations confirmed!`);
        state.automationQueue[currentIndex] = state.collectedInfo;
      }
    }
    
    return state;
  } catch (error: any) {
    console.error('❌ OpenAI API error:', error.message);
    throw error;
  }
}
