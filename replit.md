# Lazy Photog - Wedding Photographer CRM

### Overview
Lazy Photog is a comprehensive multi-tenant CRM system designed for wedding photographers. It streamlines workflows from client inquiry to project completion by offering client pipeline management, automated communication, a Smart Files proposal/invoice builder, payment processing, and scheduling. The project aims to deliver a production-ready MVP that significantly enhances efficiency for photographers.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

**Multi-Tenant Architecture:** The system employs a multi-tenant architecture ensuring strict data isolation for each photographer through a hierarchical data model.

**UI/UX Decisions:**
*   **Comprehensive Automations UI:** Features a professional, modern design with enhanced visual hierarchy, bold titles, semantic color-coded badges, and a timeline-style display for steps. Cards are collapsible with smooth interactions.
*   **Navigation System:** Refactored collapsible sidebar navigation to reduce clutter, featuring grouped collapsible sections for photographers (Sales & Proposals, Marketing & Automation, Business Tools) with core items always visible. Admin navigation is flat.
*   **Frontend:** Built with React and Vite, using Wouter for routing, Shadcn/ui (Radix UI-based) for components, and Tailwind CSS for styling.

**Technical Implementations:**
*   **Static Email Marketing Platform:** A professional drip campaign system with 24 pre-written wedding email templates, 3-phase timing, Day-0 scheduling, and support for Wedding, Portrait, and Commercial project types. Includes 5 visual themes, attention-grabbing subject lines, and semantic keyword detection.
*   **Automation System:** An event-driven engine using `node-cron` for scheduled tasks. Supports stage-based triggers, configurable time delays, dynamic content rendering with variable substitution, and multi-channel delivery (email and SMS). Includes questionnaire assignments, integrates with NURTURE, and features an internal URL shortening system with click tracking.
*   **Two-Way SMS Communication System:** Utilizes the SimpleTexting API for sending and receiving messages, with a two-way relay system forwarding inbound client SMS to photographers. All messages are logged, and a phone number-based client lookup ensures accurate routing, handled by webhooks.
*   **Payment Processing & Stripe Connect:** Requires Stripe Connect Express accounts for photographers, implementing a configurable platform fee (5%). Supports direct deposits, standard/instant payouts, Stripe-hosted onboarding, and validates Stripe Connect status before proposal sends. Includes an earnings dashboard and webhook integration.
*   **Smart Files System:** A comprehensive drag-and-drop invoice/proposal builder with a template system and 6 page types (Text, Package Selection, Add-ons, Contract, Payment, Form). Features include project integration, public responsive client view, status tracking, integrated Stripe Connect checkout, flexible payment options, selection persistence, and multiple package selection.
    *   **Form Page Type:** Custom form builder with section/block architecture supporting 7 field types (TEXT_INPUT, TEXTAREA, MULTIPLE_CHOICE, CHECKBOX, NUMBER, DATE, EMAIL).
    *   **Selection Locking:** Package and add-on selections are locked after client acceptance to maintain contract integrity.
*   **Contract & E-Signature System:** Honeybook-style contract generation with dual signature capture, integrated into Smart Files. Supports dynamic templates with variable insertion, live preview, HTML5 canvas-based signature capture, and legal protection through contract snapshot storage, PDF generation, automated email receipts, and activity logging.
*   **Global Packages & Add-ons System:** Centralized management of packages and add-ons, stored in separate tables with photographer ownership. Smart Files reference these IDs, allowing global updates.
*   **Google Integration:** Comprehensive Google Workspace integration via single OAuth. Includes Google Calendar for business calendars and Google Meet links, and Gmail API for direct email sending, conversation history, and inbound client reply capture via webhooks.
*   **Marketing Landing Page & Subscription System:** Conversion-optimized landing page with founder pricing, 14-day free trial via Stripe, demo booking, and subscription enforcement middleware.
*   **Multi-Form Lead Capture System:** Flexible lead generation system allowing photographers to create unlimited customizable forms with unique embed codes. Features include custom field management (7 field types including Event Date), 1-column and 2-column layout system with always-visible width tabs (Half/Full) on each field, color theming, post-submission redirect URLs, and client deduplication. Half-width fields always occupy 50% width even when alone. Interactive preview with working dropdowns and checkboxes.
*   **Authentication & Authorization:** A three-tier role system (PHOTOGRAPHER, CLIENT, ADMIN) with stateless JWT authentication and role-based middleware.
*   **Super Admin Dashboard:** Manages photographers, subscriptions (including "unlimited" status), account impersonation, activity logging, and provides role-based route protection.

**System Design Choices:**
*   **Backend:** Node.js with Express.js. Drizzle ORM for PostgreSQL. JWT tokens in httpOnly cookies for authentication, bcrypt for password hashing. RESTful API with role-based access control.
*   **Database Design:** Centered around a photographer-tenant model, with key entities like Photographers, Users, Clients, Stages, Templates, Automations, Smart Files, Packages, and Add-ons.

### External Dependencies

**Communication Services:**
*   **Gmail API:** For direct email sending and conversation tracking.
*   **SimpleTexting:** For SMS messaging and two-way client communication.

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