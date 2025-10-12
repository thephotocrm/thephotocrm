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
*   **HoneyBook-Style Project Detail Page:** Redesigned project detail page with a hero section, participant bar, action buttons (Schedule, Attach, AI Actions, Create File), tabbed content area (Activity, Files, Tasks, Financials, Notes, Details), and a right sidebar ("About Project" with Stage, Lead Source, Tags). Includes a timeline/activity feed displaying SMS, emails, and CRM activities.

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
*   **Terminology Refactor:** System-wide change from "Clients" to "Contacts" across frontend, backend, UI, and database.

**System Design Choices:**
*   **Backend:** Node.js with Express.js. Drizzle ORM for PostgreSQL. JWT tokens in httpOnly cookies, bcrypt for password hashing. RESTful API with role-based access control.
*   **Database Design:** Centered around a photographer-tenant model, with key entities like Photographers, Users, Contacts, Stages, Templates, Automations, Smart Files, Packages, and Add-ons.

### External Dependencies

**Communication Services:**
*   **Gmail API:** For direct email sending and conversation tracking.
*   **Twilio:** For SMS/MMS messaging and two-way client communication via Replit's native connector.

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