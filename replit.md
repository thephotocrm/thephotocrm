# Lazy Photog - Wedding Photographer CRM

### Overview
Lazy Photog is a comprehensive multi-tenant CRM system for wedding photographers, designed to streamline workflows from inquiry to project completion. It offers contact pipeline management, automated communication, a Smart Files proposal/invoice builder, payment processing, and scheduling. The project aims to provide a production-ready MVP that significantly enhances efficiency for photographers, focusing on business vision, market potential, and ambitious growth in the photography industry.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

**Multi-Tenant Architecture:** The system employs a multi-tenant architecture ensuring strict data isolation for each photographer through a hierarchical data model.

**UI/UX Decisions:**
*   **HoneyBook-Style Dashboard:** Widget-based layout with stat cards, Quick Actions, Recent Projects, Upcoming Appointments, and Payments Overview.
*   **Projects Page with Horizontal Stage Pipeline:** Scalable design featuring a horizontal scrollable stage slider with project counts, table view, filtering, search, and pipeline customization.
*   **Comprehensive Automations UI:** Professional, modern design with enhanced visual hierarchy, color-coded badges, and a timeline-style display for steps with collapsible cards.
*   **Navigation System:** Refactored collapsible sidebar navigation with grouped sections (Sales & Proposals, Marketing & Automation, Business Tools) and core items always visible. Mobile sidebar is 85vw wide with enlarged touch targets and a unified gradient for consistency.
*   **Frontend:** Built with React and Vite, using Wouter for routing, Shadcn/ui (Radix UI-based) for components, and Tailwind CSS for styling.
*   **HoneyBook-Style Project Detail Page:** Redesigned project detail page with a hero section, participant bar, action buttons (Schedule, Attach, AI Actions, Create File), tabbed content area (Activity, Files, Tasks, Financials, Notes, Details), and a right sidebar ("About Project" with Stage, Lead Source, Tags). Includes a timeline/activity feed displaying SMS, emails, and project activities.

**Technical Implementations:**
*   **Static Email Marketing Platform:** Drip campaign system with 24 pre-written wedding email templates, 3-phase timing, and support for Wedding, Portrait, and Commercial project types, including 5 visual themes and semantic keyword detection.
*   **Automation System:** Event-driven engine using `node-cron` for scheduled tasks, supporting stage-based triggers, configurable delays, dynamic content rendering, and multi-channel delivery (email, SMS, Smart Files). Integrates with questionnaires and features internal URL shortening with click tracking. Includes Smart File automation to send proposals/invoices from templates.
*   **Two-Way SMS Communication System:** Uses Twilio API via Replit's native connector for sending and receiving SMS/MMS, including a two-way relay system and message logging.
*   **SMS Inbox Page:** Centralized messaging interface at /inbox with a two-column responsive layout, conversationReads tracking for unread status, real-time unread count badges, and an SMS composer.
*   **Payment Processing & Stripe Connect:** Requires Stripe Connect Express accounts for photographers, implementing a configurable platform fee (5%), supporting direct deposits, and webhook integration.
*   **Smart Files System:** Drag-and-drop invoice/proposal builder with a template system and 7 page types (Text, Package Selection, Add-ons, Contract, Payment, Form, Scheduling). Features include project integration, public responsive client view, status tracking, integrated Stripe Connect checkout, flexible payment options, and selection persistence. Includes a custom form builder and an interactive scheduling page type.
*   **Contract & E-Signature System:** Honeybook-style contract generation with dual signature capture, dynamic templates, live preview, HTML5 canvas-based signature, and legal protection.
*   **Global Packages & Add-ons System:** Centralized management of packages and add-ons with photographer ownership, allowing global updates via Smart File references.
*   **Google Integration:** Comprehensive Google Workspace integration via single OAuth for Google Calendar and Google Meet links, and Gmail API for direct email sending and inbound client reply capture.
*   **Marketing Landing Page & Subscription System:** Conversion-optimized landing page with founder pricing, 14-day free trial, demo booking, and subscription enforcement middleware.
*   **Multi-Form Lead Capture System:** Flexible lead generation system for photographers to create customizable forms with embed codes, custom fields, layout options, color theming, and client deduplication. Includes an interactive preview and a comprehensive privacy policy for SMS opt-in.
*   **Authentication & Authorization:** Three-tier role system (PHOTOGRAPHER, CLIENT, ADMIN) with stateless JWT authentication and role-based middleware.
*   **Super Admin Dashboard:** Manages photographers, subscriptions, account impersonation, activity logging, and provides role-based route protection.
*   **Premium Features System:** Implemented `hasPremiumAccess` for subscription management, a "Get Leads" premium section in the sidebar, and lock/unlock functionality for advertising platforms (Facebook, Google, Instagram, Pinterest, TikTok Ads) with a comprehensive Upgrade Modal and placeholder feature showcase pages.
*   **Managed Advertising Platform:** White-label advertising service where the platform runs Google Ads and Facebook campaigns through master MCC/Business Manager accounts. Features include tiered pricing (25% markup under $2k/month, 20% for $2k-$5k, 15% over $5k), budget slider, lead estimates, campaign status tracking, and payment method management. Database tables: ad_campaigns, ad_payment_methods, ad_performance, ad_billing_transactions.
*   **Lead Management System:** Three-part system within "Get Leads" section: (1) **Budget Estimator** - Interactive budget planning tool with slider ($500-$10k), tiered pricing breakdown, and lead volume estimates based on industry averages; (2) **Lead Hub** - Visual dashboard displaying contacts captured through lead forms, with stats (total leads, monthly trends, source breakdown), search/filter capabilities, and quick actions for converting leads to projects; (3) **How It Works** - Educational page explaining the managed advertising service workflow. Lead source tracking implemented with `LEAD_FORM:formId` format for proper attribution.
*   **Tutorials System:** Comprehensive video tutorial library at /tutorials with three organized sections: (1) **Setup Tutorials** (5 videos) - Initial account configuration, integrations, and pipeline setup; (2) **Feature Deep-Dives** (10 videos) - Per-page tutorials for Dashboard, Contacts, Projects, Smart Files, Automations, Lead Forms, SMS Inbox, Packages, Templates, and Lead Hub; (3) **Complete Workflows** (3 videos) - End-to-end best practices including "Inquiry to Booking", "Automated Wedding Workflow", and "Lead Generation System". Features progress tracking with completion checkmarks, modern card-based UI, and Help/Support CTA.
*   **AI Chatbot for Client Support:** Intelligent chatbot assistant powered by OpenAI GPT-5 to help clients with questions. Appears as a responsive floating widget (full screen on mobile, 600x700px on desktop) on both authenticated photographer pages and public client-facing pages (Smart Files, booking calendars). Features include accurate navigation guidance (Marketing → Lead Forms, Sales & Proposals → Smart Files), context-aware responses, conversation history, personalized greetings, and concise 3-5 sentence responses with progressive disclosure. Configured with 8000 max_completion_tokens to handle GPT-5's reasoning tokens. **Future: AI Creation** - Backend infrastructure ready for AI to create lead forms and contacts via OpenAI function calling, but GPT-5 behavior needs prompt tuning for reliable tool usage. Currently guidance-only mode.
*   **AI Automation Builder:** Natural language automation creation with conversational chat interface using OpenAI GPT-4o-mini. **Conversational Chat Mode:** Progressive question-asking flow where AI asks ONE question at a time to collect automation details (trigger, stage, timing, content). Users have natural back-and-forth conversations to build automations step-by-step. Accessible via "Chat with AI" button (purple gradient) at Marketing → Automations. **Multi-Automation Sequential Builder:** AI intelligently detects when a user describes multiple automations in one message (e.g., "send SMS after 5 min, then email same time, then text next day at 6pm") and guides them through creating each one sequentially with progress tracking ("Automation 1 of 3", "Automation 2 of 3"). Uses queue system with `automationQueue`, `currentAutomationIndex`, and `totalAutomations` fields. After each confirmation, automatically advances to next automation in queue until all are created. **Friendly Confirmation Summary:** When all details are collected, AI shows a clear, friendly confirmation message with emojis (📍, ⏰, 📧/📱/📄, ✉️) summarizing the trigger, timing, action, and message before asking for final confirmation. **Time-Based Scheduling:** Full support for time-specific scheduling (e.g., "2 days from now at 6pm") and minute-level delays (e.g., "15 minutes after"). Database fields `scheduledHour` (0-23), `scheduledMinute` (0-59), and `delayMinutes` on automation_steps table. Scheduling logic: For multi-day delays, sends at target day + scheduled time; for same-day delays (0 days), bumps to next day if scheduled time has passed. Delay calculation includes days, hours, AND minutes. Examples: "2 days at 6pm" = sends Wed 6pm if entered Mon, "15 minutes after" = 15 minute delay, "same day at 3pm" entered at 9pm = sends next day 3pm. **Two Creation Modes:** (1) Chat mode via `/api/automations/chat` endpoint with conversational state tracking (collecting → confirming → complete), (2) Quick Create via `/api/automations/extract-with-ai` with two-step confirmation dialog. **Personalized Placeholders:** Supports `{{PHOTOGRAPHER_NAME}}`, `{{BUSINESS_NAME}}`, and `{{SCHEDULING_LINK}}` placeholders auto-replaced with photographer settings. **Smart File Support:** AI recognizes requests to send proposals/invoices/contracts and creates SMART_FILE automations. Template selection via dropdown in confirmation dialog for ALL Smart File steps with per-step validation. **Message Generation:** AI generates ready-to-use messages without non-functional placeholders, intelligently including `{{SCHEDULING_LINK}}` when photographer requests booking links. Uses GPT-4o-mini with Zod structured outputs (`.nullable()` for OpenAI compatibility). **Default Stages:** New photographers automatically receive 5 default WEDDING stages: Inquiry (default), Consultation, Payment Made, Booked, Finished.
*   **Photographer Settings with Personalization:** Settings page (at /settings) includes Profile tab for configuring photographer name and business name, which are used to personalize automated messages throughout the system. These values populate the `{{PHOTOGRAPHER_NAME}}` and `{{BUSINESS_NAME}}` placeholders in emails, SMS, and Smart File notifications.
*   **Manual Smart File Sending:** Project detail page includes a "SEND FILE" button that allows photographers to instantly send Smart Files to contacts via email or SMS. Opens a dialog with template selection dropdown and delivery method chooser. Creates a project smart file from the selected template, sends it via the chosen method, and logs the activity on the project timeline. Endpoint: POST /api/projects/:projectId/send-smart-file.
*   **Terminology Refactor:** System-wide change from "Clients" to "Contacts" across frontend, backend, UI, and database.

**System Design Choices:**
*   **Backend:** Node.js with Express.js. Drizzle ORM for PostgreSQL. JWT tokens in httpOnly cookies, bcrypt for password hashing. RESTful API with role-based access control.
*   **Database Design:** Centered around a photographer-tenant model, with key entities like Photographers, Users, Contacts, Stages, Templates, Automations, Smart Files, Packages, and Add-ons.

### External Dependencies

**Communication Services:**
*   **Gmail API:** For direct email sending and conversation tracking. Photographers communicate with clients via email through their connected Gmail account.
*   **Twilio:** For SMS/MMS messaging and two-way client communication via Replit's native connector. The SMS inbox provides a centralized interface for all text message conversations with clients.

**Payment Processing:**
*   **Stripe:** For payment infrastructure and Stripe Connect.

**Database Infrastructure:**
*   **Neon Database:** PostgreSQL hosting.
*   **Drizzle Kit:** Database migration and schema management.

**Development & Deployment:**
*   **Replit:** Development environment and deployment.
*   **Vite:** Frontend build tool.
*   **TypeScript:** For type safety.

**UI & Design System:**
*   **Radix UI:** Unstyled, accessible component primitives.
*   **Tailwind CSS:** Utility-first CSS framework.
*   **Lucide React:** Icon library.
*   **Class Variance Authority:** Type-safe component variant management.