### Overview
thePhotoCrm is a comprehensive multi-tenant CRM system designed for wedding photographers. It features a dual-domain architecture where photographers use thephotocrm.com and clients access custom-branded portals at {photographer-slug}.tpcportal.co. The system aims to streamline workflows from inquiry to project completion by offering contact pipeline management, automated communication, a Smart Files proposal/invoice builder, payment processing, and scheduling, all secured with magic link authentication for one-click client portal access.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

**UI/UX Decisions:**
*   **Dashboard:** Widget-based layout with stat cards, quick actions, and overviews.
*   **Projects Page:** Horizontal stage pipeline with table view, filtering, and search.
*   **Automations UI:** Professional design with enhanced visual hierarchy, color-coded badges, and a timeline display.
*   **Navigation:** Phase-based collapsible sidebar navigation across Work, Client Delivery, Marketing, Get Leads, and Business Tools.
*   **Project Detail Page:** Hero section, participant bar, action buttons, tabbed content, and a right sidebar with an activity feed.
*   **Frontend Technologies:** React with Vite, Wouter for routing, Shadcn/ui (Radix UI-based) for components, and Tailwind CSS for styling.

**Technical Implementations:**
*   **Multi-Tenant Architecture:** Ensures strict data isolation per photographer with photographer-scoped CLIENT accounts (composite unique constraint on email + role + photographerId).
*   **Static Email Marketing Platform:** Drip campaign system with pre-written templates, 3-phase timing, and a block-based visual email builder supporting real-time preview and scheduling.
*   **Automation System:** Event-driven engine using `node-cron` for scheduled tasks, supporting stage-based triggers, dynamic content, multi-channel delivery (email, SMS, Smart Files), and internal URL shortening with click tracking.
*   **Two-Way SMS Communication:** Integrates Twilio for SMS/MMS, including message logging and MMS image support with Cloudinary hosting.
*   **Payment Processing & Stripe Connect:** Supports configurable platform fees and webhook integration.
*   **Smart Files System:** Drag-and-drop invoice/proposal builder with templates, 7 page types, project integration, public client view, status tracking, integrated Stripe checkout, and e-signing. Supports contract-only Smart Files.
*   **Contract & E-Signature System:** Honeybook-style contract generation with dual signature capture and dynamic templates.
*   **Google Integration:** Comprehensive OAuth for Calendar, Meet, and Gmail API for email sending and reply capture.
*   **Marketing Landing Page & Subscription System:** Conversion-optimized landing page with subscription enforcement, free trial, and demo booking.
*   **Multi-Form Lead Capture System:** Flexible lead generation with customizable forms and client deduplication.
*   **Authentication & Authorization:** Three-tier role system (PHOTOGRAPHER, CLIENT, ADMIN) with photographer-scoped CLIENT authentication. Features stateless JWT authentication, role-based middleware, domain-aware login (CLIENT on portals, PHOTOGRAPHER/ADMIN on CRM), and Google OAuth for photographers only.
*   **Branded Client Portal Login:** HoneyBook-style login page with photographer logo/business name, passwordless magic link option, and password login. Domain-aware branding via `/api/domain` endpoint with graceful error handling.
*   **Super Admin Dashboard:** Manages photographers, subscriptions, and activity logging.
*   **Managed Advertising Platform:** White-label service for Google Ads and Facebook campaigns with tiered pricing.
*   **Lead Management System:** Includes a Revenue Estimator, Lead Hub dashboard, and educational resources.
*   **Tutorials System:** Video tutorial library for setup and features.
*   **AI Chatbot for Client Support:** OpenAI GPT-5 powered chatbot for navigation and context-aware support.
*   **AI Automation Builder:** Conversational chat interface using OpenAI GPT-4o-mini for natural language automation creation.
*   **Photographer Settings:** Allows configuration of photographer and business names for automated message personalization.
*   **Email Branding System:** Professional email headers and signatures with customizable styles, contact info, and logo/social media support.
*   **Native Gallery System:** Integrated photo gallery platform using Cloudinary for CDN, featuring chunked/resumable uploads, drag-and-drop interface, reordering, captions, watermarks, privacy settings, client favorites, and view tracking.
*   **Onboarding System:** Multi-step wizard for new photographers with persistent progress tracking.
*   **Magic Link Portal System:** Passwordless client authentication for one-click portal access via secure, time-limited email/SMS links with Honeybook-style smart routing. Features secure validation, account creation, domain-aware cookie handling, and project-specific access controls.
*   **Wildcard DNS Routing:** Client portal subdomains (*.tpcportal.co) are handled by a wildcard DNS record in Railway for simplified infrastructure.
*   **Terminology Refactor:** System-wide change from "Clients" to "Contacts."
*   **Gallery Delivery System:** Automated touchpoint system triggered when galleries are marked ready, including expiration settings and automated communications (email, SMS reminders, upsell).
*   **Domain-Aware Routing System:** Production-grade dual-domain routing infrastructure supporting split deployment (Replit for CRM, Railway for client portals). Features server-side domain detection, domain-specific routing security, and a frontend DomainProvider hook with error handling.
*   **Client Portal Meta Tag Injection:** Server-side Open Graph meta tag injection for client portal subdomains enabling branded social media previews (iMessage, Facebook, Twitter). Catch-all middleware injects photographer's logo, business name, and description before React loads. Includes invalid subdomain detection with 404 error pages. CRITICAL: Must skip asset requests (.js, .css, .png, etc.) and Vite paths (/src/, /@fs/, /node_modules/) to prevent breaking module loading.
*   **Google OAuth Persistence Fix:** Critical fix for Google Workspace (Calendar, Gmail, Drive) showing as "not connected" after deployments. Frontend queries override global `staleTime: Infinity` with `staleTime: 0` and `refetchOnMount: true` to force fresh status checks. Backend includes debug logging and `/api/google/debug` health check endpoint for diagnosing env var and database token issues.
*   **React Error #185 Fix:** Comprehensive fix for render-phase navigation conflicts across entire application. Both `ClientPortalGuard` (client-portal-router.tsx) and `ProtectedRoutes` (App.tsx) now use useEffect-based redirects with ref guards instead of wouter's `<Redirect>` component. Zero `<Redirect>` components remain in codebase. DomainRouter simplified to handle only root path routing while guards manage authentication redirects. Ensures unauthenticated visits to both client portals and photographer app never trigger render-phase navigation errors.
*   **Client Portal UI Design System:** HoneyBook-inspired design with conditional sidebar styling via `portal` prop. Client portal features light gray sidebar (#F7F7F7), dusty rose active navigation (#8B4565 on #C9909B/15 background providing 5.3:1 WCAG contrast), and professional cover photo hero sections with gradient overlays. Photographer CRM preserves original gradient sidebar via `portal="photographer"` default. All styling isolated to prevent cross-contamination between portal and CRM interfaces. Border colors use gray-200 for client portal, maintaining visual separation while ensuring WCAG AA compliance (8.6:1 contrast for inactive nav items).
*   **Client Portal Projects API Fix (Nov 2024):** Critical fix for production issue where photographer branding (logo, businessName) wasn't displaying in client portal sidebars. Fixed by: (1) Adding missing `photographerId` field to `getProjectsByClient()` database query in server/storage.ts, (2) Normalizing participant vs. own projects structure in `/api/client-portal/projects` endpoint, (3) Fetching photographer branding data once per request (efficient), (4) Returning complete payload with `photographer: { businessName, logoUrl }` for sidebar branding and `primaryClient: { firstName, lastName, email }` for select-project page display. Preserves all project fields including `client` when normalizing participant projects via spread operator.
*   **Client Portal Files & Galleries Separation (Nov 2024):** Split client portal navigation into distinct Files and Galleries tabs for cleaner UX. Files tab displays only Smart Files (proposals, contracts, invoices) with status badges, dates, and prices. Galleries tab shows photo galleries with counts and privacy badges. Features: (1) Disabled tab styling - Galleries tab appears greyed out (text-gray-400, opacity-50, non-clickable) when no galleries exist for project, (2) Smart Files backend fix - Changed from `smartFiles` table (templates) to `projectSmartFiles` table (sent files) with status filtering (SENT/VIEWED/ACCEPTED/PAID only, hides DRAFT), (3) Proper date handling using COALESCE(sentAt, createdAt) to prevent "Invalid Date" display, (4) Extended ClientProject TypeScript interface with optional galleries array for proper type safety. Navigation uses disabled prop on tab items, rendering as div instead of Link when disabled. Maintains HoneyBook-style design with WCAG AA contrast compliance.

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
*   **Railway:** Production deployment platform with automatic wildcard SSL support.
*   **Vite:** Frontend build tool.

**UI & Design System:**
*   **Radix UI:** Unstyled, accessible component primitives.
*   **Tailwind CSS:** Utility-first CSS framework.
*   **Lucide React:** Icon library.