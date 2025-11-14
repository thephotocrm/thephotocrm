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
*   **Multi-Tenant Architecture:** Ensures strict data isolation per photographer.
*   **Static Email Marketing Platform:** Drip campaign system with pre-written templates, 3-phase timing, and a block-based visual email builder supporting real-time preview and scheduling.
*   **Automation System:** Event-driven engine using `node-cron` for scheduled tasks, supporting stage-based triggers, dynamic content, multi-channel delivery (email, SMS, Smart Files), and internal URL shortening with click tracking.
*   **Two-Way SMS Communication:** Integrates Twilio for SMS/MMS, including message logging and MMS image support with Cloudinary hosting.
*   **Payment Processing & Stripe Connect:** Supports configurable platform fees and webhook integration.
*   **Smart Files System:** Drag-and-drop invoice/proposal builder with templates, 7 page types, project integration, public client view, status tracking, integrated Stripe checkout, and e-signing. Supports contract-only Smart Files.
*   **Contract & E-Signature System:** Honeybook-style contract generation with dual signature capture and dynamic templates.
*   **Google Integration:** Comprehensive OAuth for Calendar, Meet, and Gmail API for email sending and reply capture.
*   **Marketing Landing Page & Subscription System:** Conversion-optimized landing page with subscription enforcement, free trial, and demo booking.
*   **Multi-Form Lead Capture System:** Flexible lead generation with customizable forms and client deduplication.
*   **Authentication & Authorization:** Three-tier role system (PHOTOGRAPHER, CLIENT, ADMIN) with stateless JWT authentication, role-based middleware, and Google OAuth.
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
*   **Domain-Aware Routing System:** Production-grade dual-domain routing infrastructure supporting split deployment (Replit for CRM, Railway for client portals). Features server-side domain detection, domain-specific routing security, and a frontend DomainProvider hook.

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