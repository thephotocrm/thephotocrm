# Lazy Photog - Wedding Photographer CRM

### Overview
Lazy Photog is a comprehensive multi-tenant CRM system designed for wedding photographers. It streamlines workflows from contact inquiry to project completion by offering contact pipeline management, automated communication, a Smart Files proposal/invoice builder, payment processing, and scheduling. The project aims to deliver a production-ready MVP that significantly enhances efficiency for photographers.

### Recent Changes (October 10, 2025)
**SMS Inbox Feature (October 10, 2025)**
- Added comprehensive inbox page at /inbox for SMS-focused photographer-contact communication
- Implemented conversationReads table for tracking unread message state per contact
- Created 5 backend API endpoints: conversations list, message thread, send SMS, mark-as-read, unread count
- Built two-column responsive layout with contact list and message thread views
- SMS messages display full content, email/CRM activities shown as notification lines only
- Real-time unread badge on sidebar navigation updates immediately using refetchQueries
- Character counter and send functionality integrated into SMS composer
- Mobile-optimized with stacked layout and back button navigation
- "New Message" button allows starting conversations from inbox - filters to only show contacts with phone numbers

**Terminology Refactor: "Clients" → "Contacts"**
- The system now uses "Contacts" terminology throughout the application to be more inclusive of participants, leads, and non-paying parties.
- All frontend routes updated: /clients → /contacts, /clients/:id → /contacts/:id
- All backend API routes updated: /api/clients → /api/contacts
- All UI text and labels now use "Contact" terminology
- Database table renamed from `clients` to `contacts`
- Navigation, components, and user-facing text fully updated
- Backend storage methods maintained internal "client" naming for compatibility

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

**Multi-Tenant Architecture:** The system employs a multi-tenant architecture ensuring strict data isolation for each photographer through a hierarchical data model.

**UI/UX Decisions:**
*   **HoneyBook-Style Dashboard:** Widget-based layout optimized for photographer workflows. Features stat cards (Active Projects, New Leads, Total Revenue, Unread Messages), Quick Actions panel for common tasks, Recent Projects widget with direct navigation, Upcoming Appointments display, and Payments Overview. The previous Kanban pipeline board was removed from the dashboard to improve scalability with 10+ stages.
*   **Projects Page with Horizontal Stage Pipeline:** Scalable design featuring a horizontal scrollable stage slider with real-time project counts, table view (PROJECT NAME, CONTACT, TYPE, DATE, STAGE columns), project type filtering, search functionality, and "Customize Pipeline" management. This design accommodates 10+ pipeline stages effectively unlike the previous Kanban board.
*   **Comprehensive Automations UI:** Features a professional, modern design with enhanced visual hierarchy, bold titles, semantic color-coded badges, and a timeline-style display for steps. Cards are collapsible with smooth interactions.
*   **Navigation System:** Refactored collapsible sidebar navigation to reduce clutter, featuring grouped collapsible sections for photographers (Sales & Proposals, Marketing & Automation, Business Tools) with core items always visible (Dashboard → Projects → Contacts). Admin navigation is flat. Mobile sidebar is 85vw wide with large white close button (48px x 48px with 32px icon), enlarged text (text-base) and buttons (h-12) for better touch targets. Mobile header and sidebar share unified blue-purple-pink gradient for visual consistency.
*   **Frontend:** Built with React and Vite, using Wouter for routing, Shadcn/ui (Radix UI-based) for components, and Tailwind CSS for styling.

**Technical Implementations:**
*   **Static Email Marketing Platform:** A professional drip campaign system with 24 pre-written wedding email templates, 3-phase timing, Day-0 scheduling, and support for Wedding, Portrait, and Commercial project types. Includes 5 visual themes, attention-grabbing subject lines, and semantic keyword detection.
*   **Automation System:** An event-driven engine using `node-cron` for scheduled tasks. Supports stage-based triggers, configurable time delays, dynamic content rendering with variable substitution, and multi-channel delivery (email, SMS, and Smart Files). Includes questionnaire assignments, integrates with NURTURE, and features an internal URL shortening system with click tracking.
    *   **Smart File Automation:** Photographers can automatically send proposals/invoices through automations. When triggered, the system creates a project-specific Smart File from a template, generates a unique access token, and sends an email notification to the client with a link to view/sign the Smart File. Uses actionType field on automation steps to determine behavior (EMAIL, SMS, or SMART_FILE).
*   **Two-Way SMS Communication System:** Utilizes the SimpleTexting API for sending and receiving messages, with a two-way relay system forwarding inbound client SMS to photographers. All messages are logged, and a phone number-based client lookup ensures accurate routing. 
    *   **Webhook Configuration:** POST webhook at `/webhooks/simpletexting/inbound` handles MMS messages (JSON body). GET webhooks return HTML due to Replit infrastructure routing - SimpleTexting SMS webhooks (GET requests) cannot work on this platform. MMS webhooks (POST requests) work correctly.
*   **SMS Inbox Page:** Centralized messaging interface at /inbox for photographer-contact SMS communication. Features two-column responsive layout (contact list + message thread), conversationReads tracking for unread state, real-time unread count badges with 30-second polling, SMS composer with 160-character counter, and mobile-optimized stacked view. SMS messages show full content while email/CRM activities display as notification lines. Uses refetchQueries for immediate UI updates after sending or marking conversations as read.
*   **Payment Processing & Stripe Connect:** Requires Stripe Connect Express accounts for photographers, implementing a configurable platform fee (5%). Supports direct deposits, standard/instant payouts, Stripe-hosted onboarding, and validates Stripe Connect status before proposal sends. Includes an earnings dashboard and webhook integration.
*   **Smart Files System:** A comprehensive drag-and-drop invoice/proposal builder with a template system and 7 page types (Text, Package Selection, Add-ons, Contract, Payment, Form, Scheduling). Features include project integration, public responsive client view, status tracking, integrated Stripe Connect checkout, flexible payment options, selection persistence, and multiple package selection.
    *   **Form Page Type:** Custom form builder with section/block architecture supporting 7 field types (TEXT_INPUT, TEXTAREA, MULTIPLE_CHOICE, CHECKBOX, NUMBER, DATE, EMAIL).
    *   **Scheduling Page Type:** Interactive calendar booking interface using react-day-picker with month view, date selection (including same-day bookings), time slot grid (9 AM - 5 PM in 30-min intervals), appointment confirmation, configurable session duration, and preview/public view modes. Displays photographer's heading, description, and booking settings.
    *   **Selection Locking:** Package and add-on selections are locked after client acceptance to maintain contract integrity.
*   **Contract & E-Signature System:** Honeybook-style contract generation with dual signature capture, integrated into Smart Files. Supports dynamic templates with variable insertion, live preview, HTML5 canvas-based signature capture, and legal protection through contract snapshot storage, PDF generation, automated email receipts, and activity logging.
*   **Global Packages & Add-ons System:** Centralized management of packages and add-ons, stored in separate tables with photographer ownership. Smart Files reference these IDs, allowing global updates.
*   **Google Integration:** Comprehensive Google Workspace integration via single OAuth. Includes Google Calendar for business calendars and Google Meet links, and Gmail API for direct email sending, conversation history, and inbound client reply capture via webhooks.
*   **Marketing Landing Page & Subscription System:** Conversion-optimized landing page with founder pricing, 14-day free trial via Stripe, demo booking, and subscription enforcement middleware.
*   **Multi-Form Lead Capture System:** Flexible lead generation system allowing photographers to create unlimited customizable forms with unique embed codes. Features include custom field management (7 field types including Event Date), 1-column and 2-column layout system with always-visible width tabs (Half/Full) on each field, color theming, post-submission redirect URLs, and client deduplication. Half-width fields always occupy 50% width even when alone. Interactive preview with working dropdowns and checkboxes. SMS opt-in checkbox includes full legal disclosure language: "By submitting this form, you agree to receive SMS messages from [Your Company Name] at the phone number provided. Message & data rates may apply. Message frequency varies. Reply STOP to opt out or HELP for help. View our Privacy Policy and Terms"
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