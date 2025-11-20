### Overview
thePhotoCrm is a comprehensive multi-tenant CRM system tailored for wedding photographers. It operates with a triple-domain architecture: `app.thephotocrm.com` for photographers, `{photographer-slug}.tpcportal.co` for client portals, and `thephotocrm.com` for the marketing site. The platform aims to streamline photographer workflows from inquiry to project completion by offering contact management, automated communication, a Smart Files proposal/invoice builder, payment processing, and scheduling, all secured with magic link authentication for client portal access.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

**UI/UX Decisions:**
*   **Design System:** React with Vite, Wouter for routing, Shadcn/ui (Radix UI-based) components, and Tailwind CSS for styling.
*   **Dashboard:** Widget-based layout with stat cards and quick actions.
*   **Projects Page:** Horizontal pipeline view with table, filtering, and search.
*   **Automations UI:** Professional design with visual hierarchy, color-coded badges, and a timeline display.
*   **Navigation:** Phase-based collapsible sidebar (Work, Client Delivery, Marketing, Get Leads, Business Tools).
*   **Project Detail Page:** Hero section, participant bar, action buttons, tabbed content, and activity feed sidebar.
*   **Client Portal UI:** HoneyBook-style design with conditional sidebar styling, light gray sidebar, dusty rose active navigation, and professional cover photo hero sections.

**Technical Implementations:**
*   **Multi-Tenant Architecture:** Strict data isolation per photographer, using photographer-scoped CLIENT accounts.
*   **Authentication & Authorization:** Three-tier role system (PHOTOGRAPHER, CLIENT, ADMIN) with stateless JWT authentication, role-based middleware, and domain-aware login. Google OAuth is available for photographers.
*   **Subdomain Architecture:** `app.thephotocrm.com` for CRM, wildcard DNS for `*.tpcportal.co` for client portals. Cross-subdomain authentication uses domain-scoped cookies.
*   **Magic Link Portal System:** Passwordless client authentication for one-click portal access via secure, time-limited email/SMS links with smart routing.
*   **Smart Files System:** Drag-and-drop invoice/proposal builder with templates, various page types, integrated Stripe checkout, and e-signing.
*   **Automation System:** Event-driven engine for scheduled tasks, supporting stage-based triggers, dynamic content, and multi-channel delivery.
*   **Email Marketing Platform:** Drip campaign system with templates, 3-phase timing, and a block-based visual email builder.
*   **Two-Way SMS Communication:** Twilio integration for SMS/MMS, including message logging and Cloudinary for MMS image hosting.
*   **Client Portal Messaging:** HoneyBook-style inline email composer at the top of the Activity tab with professional email cards in the activity feed. The Overview page includes a "Send Message" CTA that navigates to Activity and auto-focuses the composer. After sending, messages are delivered via email to photographers (using photographer.emailFromAddr with fallback to user.email), the form clears, and the feed auto-scrolls to show the newest message. Email activity cards display From/To headers, subject, body, and timestamp. SMS messages remain photographer-only and are not visible to clients.
*   **Gmail Email Threading:** HoneyBook-style email reply capture where clients can reply to portal messages via their email app, with replies automatically threaded back into the project activity feed. Uses Gmail API push notifications with HMAC signature verification for security, custom tracking headers (X-TPC-Project, X-TPC-Contact, X-TPC-Signature), and automatic Gmail watch renewal via daily cron job. Email threads are displayed chronologically with both outbound and inbound messages.
*   **Payment Processing:** Stripe Connect integration with configurable platform fees.
*   **Contract & E-Signature System:** Honeybook-style contract generation with dual signature capture and dynamic templates.
*   **Google Integration:** OAuth for Calendar, Meet, and Gmail API for email sending and reply capture.
*   **Native Gallery System:** Integrated photo gallery platform using Cloudinary for CDN, featuring chunked/resumable uploads, watermarks, privacy settings, and client favorites.
*   **AI Integrations:** OpenAI GPT-5 powered chatbot for client support and GPT-4o-mini for conversational AI automation building.
*   **Domain-Aware Routing System:** Production-grade dual-domain routing supporting split deployment (Replit for CRM, Railway for client portals) with server-side domain detection and security.
*   **Client Portal Meta Tag Injection:** Server-side Open Graph meta tag injection for client portal subdomains to enable branded social media previews.
*   **Onboarding System:** Multi-step wizard for new photographers with persistent progress tracking.
*   **Lead Management System:** Includes a Revenue Estimator, Lead Hub dashboard, and multi-form lead capture.

**System Design Choices:**
*   **Backend:** Node.js with Express.js, Drizzle ORM for PostgreSQL.
*   **Database Design:** Photographer-tenant model with key entities like Photographers, Users, Contacts, Stages, Smart Files, and Automations.

### External Dependencies

**Communication Services:**
*   **Gmail API:** Email sending and conversation tracking.
*   **Twilio:** SMS/MMS messaging.
*   **Cloudinary:** CDN for image hosting (MMS, galleries, logos).

**Payment Processing:**
*   **Stripe:** Payment infrastructure and Stripe Connect.

**Database Infrastructure:**
*   **Neon Database:** PostgreSQL hosting.
*   **Drizzle Kit:** Database migration and schema management.

**Development & Deployment:**
*   **Replit:** Development environment.
*   **Railway:** Production deployment with wildcard SSL.
*   **Vite:** Frontend build tool.

**UI & Design System:**
*   **Radix UI:** Unstyled, accessible component primitives.
*   **Tailwind CSS:** Utility-first CSS framework.
*   **Lucide React:** Icon library.