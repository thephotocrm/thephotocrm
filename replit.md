# Lazy Photog - Wedding Photographer CRM

### Overview
Lazy Photog is a comprehensive multi-tenant CRM system for wedding photographers, designed to streamline workflows from client inquiry to project completion. It offers client pipeline management, automated communication, estimate creation, payment processing, and scheduling. The project aims to deliver a production-ready MVP that enhances efficiency for photographers.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

**Multi-Tenant Architecture:** Employs a multi-tenant architecture with strict data isolation per photographer, using a hierarchical data model.

**Static Email Marketing Platform:** A professional-grade drip campaign system with 24 pre-written wedding email templates, featuring research-backed 3-phase timing, Day-0 scheduling, and support for Wedding, Portrait, and Commercial project types. It includes 5 distinct visual themes, attention-grabbing subject lines, and semantic keyword detection for visual modules. Integrates with the NURTURE automation system.

**Comprehensive Automations UI:** Features a professional, modern design with enhanced visual hierarchy, including bold titles, semantic color-coded badges, and a timeline-style display for steps. Cards are collapsible, with smooth interactions. Includes a Wedding Date Conditional Logic System for date-based automation filtering.

**Automation System:** An event-driven automation engine using `node-cron` for scheduled tasks. Supports stage-based triggers, configurable time delays, dynamic content rendering with variable substitution, and multi-channel delivery (email and SMS). It allows for communication-only, pipeline-only, or combined automations, including questionnaire assignments. Integrates with NURTURE and features an internal URL shortening system with click tracking.

**Two-Way SMS Communication System:** A comprehensive SMS platform using the SimpleTexting API for sending and receiving messages. Features a two-way relay system forwarding inbound client SMS to photographers with full context. All SMS messages are logged, and a phone number-based client lookup ensures accurate routing. Webhooks handle incoming messages.

**Payment Processing & Stripe Connect:** Requires Stripe Connect Express accounts for all photographers to accept payments. Implements a platform fee model (5% configurable), direct deposits to photographers, and supports standard or instant payouts. Stripe-hosted onboarding handles compliance, and the system validates Stripe Connect status before allowing proposal sends. Includes an earnings dashboard and webhook integration for payment events.

**Smart Files System:** A comprehensive drag-and-drop invoice/proposal builder allowing photographers to create reusable, customizable client proposals.
*   **Core Features:** Template system, drag-and-drop builder, 5 page types (Text, Package Selection, Add-ons, Contract, Payment), project integration, public responsive client view, status tracking (DRAFT → SENT → VIEWED → ACCEPTED → PAID), integrated Stripe Connect checkout with platform fee, flexible payment options (online/offline, zero deposit), selection persistence, and multiple package selection support.
*   **Multiple Package Selection:** Clients can select packages from multiple package pages (e.g., photo package AND video package). Uses Map<string, SelectedPackage> keyed by pageId to track selections. Order summary displays all selected packages, and contract variables show all packages as comma-separated list.
*   **Selection Locking:** After client accepts the proposal (which saves selections to database), all package and add-on selections are permanently locked to preserve contract integrity. This allows the workflow: select packages → sign contract → accept (saves selections) → selections locked → pay. UI shows disabled state with warning message, and backend validates to prevent tampering (returns 400 error if selections change after acceptance).
*   **Technical Implementation:** Multi-tenant isolation, token-based public access, page snapshots, global packages and add-ons management with data merging for public views, defensive null handling, duplicate submission prevention, cache invalidation, and Map-based selection state management.

**Contract & E-Signature System:** Honeybook-style contract generation with dual signature capture integrated into Smart Files workflow.
*   **Core Features:** Dynamic contract templates with variable insertion ({{client_name}}, {{client_email}}, {{client_phone}}, {{client_address}}, {{photographer_name}}, {{photographer_email}}, {{photographer_phone}}, {{photographer_address}}, {{project_date}}, {{project_type}}, {{selected_packages}}, {{selected_addons}}, {{total_amount}}, {{deposit_amount}}, {{deposit_percent}}), live preview in builder, HTML5 canvas-based signature capture for both photographer and client, photographer signature requirement enforcement before sending, client signature requirement before payment access, snake_case variable parsing with event date formatting.
*   **Workflow:** Photographers create contract templates in Smart File builder → Sign contract before sending (if required) → Client views parsed contract with actual project data → Client signs contract (if required) → Payment unlocks only after client signature → Both signatures stored with timestamps.
*   **Legal Protection System:** Comprehensive evidence capture at signature time for legal defensibility: (1) Contract Snapshot Storage - captures exact rendered HTML at signature time, client IP address, and browser user agent for audit trail; (2) PDF Generation - automatically generates PDF from contract HTML using html-pdf-node (Puppeteer-based) and stores as base64 data URL with graceful error handling; (3) Automated Email Receipts - sends professional email confirmations to clients for both contract signatures (with signature confirmation) and payments (with transaction details, amounts, and receipt information); (4) Activity Logging - all signature and payment events logged to project history with metadata.
*   **Technical Implementation:** Contract variable parser with snake_case placeholders, SignaturePad component using canvas, photographer signature dialog with auto-retry on send, client signature capture on public page with HTML snapshot via React ref (contractRendererRef), payment blocking logic via canAccessPayment flag, backend API endpoints for dual signatures (PATCH /api/public/smart-files/:token/sign and POST /api/projects/:projectId/smart-files/:projectSmartFileId/photographer-sign), event date formatting with toLocaleDateString() and "TBD" fallback, signature URLs and legal metadata stored in projectSmartFiles table (clientSignedIp, clientSignedUserAgent, contractSnapshotHtml, contractPdfUrl), email service integration with Gmail/SendGrid for receipts, non-blocking error handling for PDF generation and email delivery.

**Global Packages & Add-ons System:** Centralized management of packages and add-ons from dedicated pages. Stored in separate tables with photographer ownership. Smart Files integrate by referencing IDs, allowing global updates. Public views fetch fresh global data merged with page snapshots. Provides full CRUD API endpoints.

**Google Integration:** Provides comprehensive Google Workspace integration via a single OAuth flow. Includes Google Calendar for dedicated business calendars with automatic creation and Google Meet links. Gmail API is used for direct email sending, conversation history tracking, and logging of all automated and manual communications. Inbound client replies are captured via webhooks and associated with clients. OAuth credentials persist and refresh automatically.

**Frontend Architecture:** Built with React and Vite, using Wouter for routing, Shadcn/ui (Radix UI-based) for components, and Tailwind CSS for styling. TanStack Query manages server state, and React Hook Form with Zod validation handles forms.

**Backend Architecture:** Node.js with Express.js. Drizzle ORM for PostgreSQL. JWT tokens in httpOnly cookies for authentication, with bcrypt for password hashing. RESTful API with role-based access control.

**Database Design:** Centered around a photographer-tenant model, with key entities: Photographers, Users (PHOTOGRAPHER, CLIENT, ADMIN roles), Clients (with stage-based pipeline), Stages, Templates, Automations, Estimates, and Packages.

**Authentication & Authorization:** A three-tier role system (PHOTOGRAPHER, CLIENT, ADMIN) with stateless JWT authentication and role-based middleware for access control.

**Super Admin Dashboard System:** Comprehensive interface for platform management.
*   **Features:** Photographer management (view, search), subscription management with unlimited access grants, account impersonation with short-lived tokens and impersonation banner, activity logging (`adminActivityLog`), JWT enhancement for admin/photographer identities, route protection via `requireAdmin` middleware, and dynamic sidebar menu based on user role and route.
*   **Subscription Management:** Admins can update photographer subscription status via dropdown in the dashboard. Supports statuses: trialing, active, past_due, canceled, and unlimited. The "unlimited" status bypasses all subscription checks, providing unrestricted platform access. All subscription changes are logged to admin activity log.

**Marketing Landing Page & Subscription System:** Conversion-optimized landing page with founder pricing campaign and subscription management.
*   **Features:** Routing for authenticated/unauthenticated users, founder pricing ($4.95/month, limited to 100 spots) with "spots remaining" counter, scarcity messaging, regular pricing ($9.95/month), 14-day free trial via Stripe, demo booking system with SendGrid notifications, and structured page content.
*   **Technical Aspects:** Subscription enforcement middleware, error-safe registration (Stripe first), accessible billing/subscription management endpoints, and custom domain deployment.

### External Dependencies

**Communication Services:**
*   **Gmail API:** Direct email sending and conversation tracking.
*   **SimpleTexting:** SMS messaging and two-way client communication.

**Payment Processing:**
*   **Stripe:** Payment infrastructure for deposits and full payments.

**Database Infrastructure:**
*   **Neon Database:** PostgreSQL hosting.
*   **Drizzle Kit:** Database migration and schema management.

**Development & Deployment:**
*   **Replit:** Development environment and deployment.
*   **Vite:** Frontend build tool.
*   **TypeScript:** Type safety.

**UI & Design System:**
*   **Radix UI:** Unstyled, accessible component primitives.
*   **Tailwind CSS:** Utility-first CSS framework.
*   **Lucide React:** Icon library.
*   **Class Variance Authority:** Type-safe component variant management.