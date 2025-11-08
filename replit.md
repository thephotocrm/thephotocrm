### Overview
thePhotoCrm is a comprehensive multi-tenant CRM system designed for wedding photographers. It aims to streamline workflows from initial inquiry to project completion by offering contact pipeline management, automated communication, a Smart Files proposal/invoice builder, payment processing, and scheduling. The project's goal is to deliver a production-ready MVP that significantly enhances efficiency for photographers, with strong potential for growth within the photography industry.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

**UI/UX Decisions:**
*   **Dashboard:** Widget-based layout with stat cards, quick actions, and overviews of recent projects, appointments, and payments.
*   **Projects Page:** Horizontal stage pipeline with table view, filtering, search, and customization.
*   **Automations UI:** Professional and modern design featuring enhanced visual hierarchy, color-coded badges, and a timeline display.
*   **Navigation:** Phase-based collapsible sidebar navigation structured into five main sections: Work, Client Delivery, Marketing, Get Leads (gold theme), and Business Tools.
*   **Project Detail Page:** Hero section, participant bar, action buttons, tabbed content (Activity, Files, Tasks, Financials, Notes, Details), and a right sidebar ("About Project") including a timeline/activity feed.
*   **Frontend Technologies:** React with Vite, Wouter for routing, Shadcn/ui (Radix UI-based) for components, and Tailwind CSS for styling.

**Technical Implementations:**
*   **Multi-Tenant Architecture:** Ensures strict data isolation per photographer.
*   **Static Email Marketing Platform:** Drip campaign system with pre-written templates, 3-phase timing, and a block-based visual email builder supporting drag-to-reorder blocks, real-time preview, time-of-day scheduling, and safe draft creation.
*   **Automation System:** Event-driven engine using `node-cron` for scheduled tasks, supporting stage-based triggers, dynamic content, multi-channel delivery (email, SMS, Smart Files), and internal URL shortening with click tracking. Email content is stored directly within automations using the email builder (email_blocks JSONB field with block types: HEADING, TEXT, BUTTON, IMAGE, SPACER). The UI prioritizes email builder content (useEmailBuilder flag) when rendering automation details, displaying email_blocks from the automation record and custom_sms_content from automation_steps.
*   **Two-Way SMS Communication:** Integrates Twilio for SMS/MMS, including a two-way relay, message logging, and MMS image support with client-side compression and Cloudinary hosting.
*   **Payment Processing & Stripe Connect:** Supports configurable platform fees and webhook integration via Stripe Connect Express accounts.
*   **Smart Files System:** Drag-and-drop invoice/proposal builder with templates and 7 page types. Features include project integration, public client view, status tracking, integrated Stripe checkout, single-booking scheduling confirmation, and editable selections with required re-signing. Supports contract-only Smart Files.
*   **Contract & E-Signature System:** Honeybook-style contract generation with dual signature capture and dynamic templates.
*   **Global Packages & Add-ons System:** Centralized management of offerings.
*   **Google Integration:** Comprehensive OAuth integration for Calendar, Meet, and Gmail API for email sending and reply capture.
*   **Marketing Landing Page & Subscription System:** Conversion-optimized landing page with subscription enforcement, free trial, and demo booking.
*   **Multi-Form Lead Capture System:** Flexible lead generation with customizable forms, embed codes, custom fields, and client deduplication.
*   **Authentication & Authorization:** Three-tier role system (PHOTOGRAPHER, CLIENT, ADMIN) with stateless JWT authentication, role-based middleware, and Google OAuth integration with hybrid authentication.
*   **Super Admin Dashboard:** Manages photographers, subscriptions, account impersonation, and activity logging.
*   **Premium Features System:** Implements `hasPremiumAccess` for subscription management, with advertising features universally accessible.
*   **Managed Advertising Platform:** White-label service for Google Ads and Facebook campaigns with tiered pricing based on photographer budget, including budget sliders and lead estimates.
*   **Lead Management System:** Includes a Revenue Estimator, Lead Hub dashboard, and an educational "How It Works" page.
*   **Tutorials System:** Video tutorial library covering setup, features, and workflows.
*   **AI Chatbot for Client Support:** OpenAI GPT-5 powered chatbot for navigation and context-aware support.
*   **AI Automation Builder:** Conversational chat interface using OpenAI GPT-4o-mini for natural language automation creation.
*   **Photographer Settings with Personalization:** Allows configuration of photographer and business names for automated message personalization.
*   **Manual Smart File Sending:** Enables instant Smart File delivery via email or SMS from project details.
*   **Email Branding System:** Professional email headers and signatures with customizable styles, contact info, and support for logo/headshot uploads and social media icons (via Clearbit Logo API).
*   **Native Gallery System:** Integrated photo gallery platform using Cloudinary for CDN, featuring chunked/resumable uploads (Uppy + TUS protocol with 10MB chunks, 3 parallel uploads, pause/resume), drag-and-drop interface with enhanced visual feedback (dashed borders, hover effects, clear messaging for up to 10,000 photos per batch), reordering, captions, watermarks, privacy settings, client favorites, view tracking, and a REST API. Supports public and private galleries and integrates with project workflows. Upload UI features professional capacity matching industry standards (Pictime 70k, ShootProof/Pixieset unlimited). Client gallery view uses react-masonry-css for Pinterest-style layout with responsive breakpoints (4 columns large desktop, 3 columns desktop/tablet, 2 columns mobile) eliminating white space gaps while maintaining natural aspect ratios.
*   **Onboarding System:** Multi-step wizard for new photographers (Profile, Branding, Google, Stripe, First Project) with persistent progress tracking and celebratory completion.
*   **Magic Link Portal System:** Passwordless client authentication for one-click project access via secure, time-limited email links.
*   **Terminology Refactor:** System-wide change from "Clients" to "Contacts."

**System Design Choices:**
*   **Backend:** Node.js with Express.js, Drizzle ORM for PostgreSQL, JWT tokens in httpOnly cookies, bcrypt for password hashing, and RESTful API with role-based access control.
*   **Database Design:** Photographer-tenant model with key entities including Photographers, Users, Contacts, Stages, Templates, Automations, Smart Files, Packages, and Add-ons.

### External Dependencies

**Communication Services:**
*   **Gmail API:** For direct email sending and conversation tracking.
*   **Twilio:** For SMS/MMS messaging and two-way client communication.
*   **Cloudinary:** CDN hosting for MMS image uploads and native gallery images.

**Payment Processing:**
*   **Stripe:** For payment infrastructure and Stripe Connect.

**Database Infrastructure:**
*   **Neon Database:** PostgreSQL hosting.
*   **Drizzle Kit:** Database migration and schema management.

**Development & Deployment:**
*   **Replit:** Development environment and deployment.
*   **Vite:** Frontend build tool.

**UI & Design System:**
*   **Radix UI:** Unstyled, accessible component primitives.
*   **Tailwind CSS:** Utility-first CSS framework.
*   **Lucide React:** Icon library.