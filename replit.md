### Overview
Lazy Photog is a comprehensive multi-tenant CRM system for wedding photographers. It streamlines workflows from inquiry to project completion by offering contact pipeline management, automated communication, a Smart Files proposal/invoice builder, payment processing, and scheduling. The project aims to provide a production-ready MVP that significantly enhances efficiency for photographers, with ambitions for substantial growth in the photography industry.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

**UI/UX Decisions:**
*   **Dashboard:** HoneyBook-style widget-based layout with stat cards, quick actions, recent projects, upcoming appointments, and payments overview.
*   **Projects Page:** Horizontal stage pipeline with table view, filtering, search, and customization.
*   **Automations UI:** Professional, modern design with enhanced visual hierarchy, color-coded badges, and a timeline-style display.
*   **Navigation:** Phase-based collapsible sidebar navigation optimized for photographer workflow with five main sections:
    - **Work** (daily operations): Dashboard, Projects, Contacts, Inbox, Scheduling
    - **Client Delivery** (fulfillment phase): Galleries, Smart Files, Packages, Add-ons  
    - **Marketing** (engagement): Automations, Drip Campaigns, Templates, Email Branding, Lead Forms
    - **Get Leads** (advertising platform with gold theme): Lead Hub, Budget Estimator, How It Works, Ad Platforms - styled with black backgrounds, gold borders, gold icons, and white text
    - **Business Tools** (admin): Reports, Earnings, Tutorials, Settings
*   **Project Detail Page:** HoneyBook-style design with a hero section, participant bar, action buttons, tabbed content area (Activity, Files, Tasks, Financials, Notes, Details), and a right sidebar ("About Project"). Includes a timeline/activity feed.
*   **Frontend Technologies:** React with Vite, Wouter for routing, Shadcn/ui (Radix UI-based) for components, and Tailwind CSS for styling.

**Technical Implementations:**
*   **Multi-Tenant Architecture:** Ensures strict data isolation for each photographer.
*   **Static Email Marketing Platform:** Drip campaign system with pre-written templates, 3-phase timing, and support for various project types and visual themes.
*   **Automation System:** Event-driven engine using `node-cron` for scheduled tasks, supporting stage-based triggers, dynamic content, and multi-channel delivery (email, SMS, Smart Files). Includes internal URL shortening with click tracking.
*   **Two-Way SMS Communication:** Integrates Twilio for sending and receiving SMS/MMS, including a two-way relay and message logging.
*   **SMS Inbox Page:** Centralized messaging interface with conversation tracking and real-time unread count badges.
*   **Payment Processing & Stripe Connect:** Requires Stripe Connect Express accounts, supporting configurable platform fees and webhook integration.
*   **Smart Files System:** Drag-and-drop invoice/proposal builder with a template system and 7 page types (Text, Package Selection, Add-ons, Contract, Payment, Form, Scheduling). Features include project integration, public client view, status tracking, and integrated Stripe Connect checkout.
*   **Contract & E-Signature System:** Honeybook-style contract generation with dual signature capture, dynamic templates, and HTML5 canvas-based signature.
*   **Global Packages & Add-ons System:** Centralized management with photographer ownership for global updates.
*   **Google Integration:** Comprehensive Google Workspace integration via single OAuth for Calendar, Meet, and Gmail API for email sending and reply capture.
*   **Marketing Landing Page & Subscription System:** Conversion-optimized landing page with founder pricing, free trial, demo booking, and subscription enforcement.
*   **Multi-Form Lead Capture System:** Flexible lead generation with customizable forms, embed codes, custom fields, and client deduplication.
*   **Authentication & Authorization:** Three-tier role system (PHOTOGRAPHER, CLIENT, ADMIN) with stateless JWT authentication and role-based middleware.
*   **Super Admin Dashboard:** Manages photographers, subscriptions, account impersonation, and activity logging.
*   **Premium Features System:** Implements `hasPremiumAccess` for subscription management. Note: "Get Leads" section is NOT behind a paywall - all photographers have access to advertising features.
*   **Managed Advertising Platform:** White-label advertising service for Google Ads and Facebook campaigns, with tiered pricing (25% platform fee under $2k/month, 20% for $2k-$5k, 15% over $5k), budget slider, lead estimates, and campaign status tracking. **Revenue Model:** Platform charges a percentage of total ad spend rather than feature paywalls.
*   **Lead Management System:** Three-part system including a Budget Estimator (with estimated revenue calculator showing potential earnings at $1000/lead with 25% close rate, marked as extremely conservative), Lead Hub dashboard, and an educational "How It Works" page.
*   **Tutorials System:** Comprehensive video tutorial library with setup guides, feature deep-dives, and complete workflow explanations.
*   **AI Chatbot for Client Support:** Intelligent chatbot assistant powered by OpenAI GPT-5 for client support, appearing as a responsive floating widget on authenticated and public pages. Provides accurate navigation guidance, context-aware responses, and conversation history.
*   **AI Automation Builder:** Conversational chat interface using OpenAI GPT-4o-mini for natural language automation creation. Supports sequential building of multiple automations, time-based scheduling, and generates friendly names and descriptions. Integrates personalized placeholders and Smart File support.
*   **Photographer Settings with Personalization:** Allows configuration of photographer and business names for personalizing automated messages.
*   **Manual Smart File Sending:** Enables instant sending of Smart Files from the project detail page via email or SMS with template selection.
*   **Email Branding System:** Professional email headers and signatures with 4 header styles (minimal, professional, bold, classic) and 4 signature styles (simple, professional, detailed, branded). Photographers can customize contact information, business address, website, and social media links. **File Upload Support:** Logo and headshot images can be uploaded directly (stored in `attached_assets/logos` and `attached_assets/headshots`), with automatic conversion to absolute URLs using REPLIT_DEV_DOMAIN for email compatibility. **Social Media Icons:** Uses Clearbit Logo API for PNG brand logos (Facebook, Instagram, X/Twitter, LinkedIn) that render correctly in all major email clients including Gmail and Outlook. Branding is automatically applied to all outgoing emails via both Gmail and SendGrid, with branded versions stored in email history for accurate audit trails.
*   **Gallery Integration & Auto-Creation System:** Comprehensive gallery automation with OAuth integration for Google Drive and ShootProof. Features automatic gallery creation when clients pay deposits, with secure read-only permissions (Google Drive) and public URL verification (ShootProof). Photographers can manually create galleries, add custom gallery links, mark galleries ready, and trigger GALLERY_SHARED automations for client notifications. Includes Gallery tab on project detail page, dedicated Galleries management page listing all active and ready-for-gallery projects, and Gallery Integration section in settings for platform connection management.
*   **Onboarding System:** Multi-step wizard guiding new photographers through essential setup (Profile → Branding → Google → Stripe → First Project). Features persistent banner showing progress, auto-detection of completed steps, celebration screen with confetti, and two-way sync with Settings page. Modal appears on first login, banner persists until completion or dismissal. Database tracks onboarding version, completion timestamp, and dismissal state.
*   **Terminology Refactor:** System-wide change from "Clients" to "Contacts."

**System Design Choices:**
*   **Backend:** Node.js with Express.js. Drizzle ORM for PostgreSQL. JWT tokens in httpOnly cookies, bcrypt for password hashing. RESTful API with role-based access control.
*   **Database Design:** Centered around a photographer-tenant model, with key entities like Photographers, Users, Contacts, Stages, Templates, Automations, Smart Files, Packages, and Add-ons.

### External Dependencies

**Communication Services:**
*   **Gmail API:** For direct email sending and conversation tracking.
*   **Twilio:** For SMS/MMS messaging and two-way client communication.

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