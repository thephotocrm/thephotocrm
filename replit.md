# Lazy Photog - Wedding Photographer CRM

## Overview
Lazy Photog is a comprehensive multi-tenant CRM system designed for wedding photographers. It provides a complete business management solution, streamlining workflows from client inquiry to project completion. Key capabilities include client pipeline management, automated communication, estimate creation, payment processing, and scheduling. The project aims to deliver a production-ready MVP that empowers photographers with efficient tools.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-Tenant Architecture
The system employs a multi-tenant architecture with strict data isolation per photographer, achieved through a hierarchical data model where photographer IDs link all associated data (clients, stages, templates, etc.).

### Static Email Marketing Platform
A professional-grade drip campaign system with 24 pre-written wedding email templates. It features research-backed 3-phase timing (Day 0, High-interest, Relationship building, Long-term nurturing), Day-0 scheduling, and support for Wedding, Portrait, and Commercial project types. Emails utilize 5 distinct visual themes (Editorial Minimalist, Bold Color Block, Scrapbook Textured, Luxury Magazine, Modern Dark Tech) to prevent visual fatigue. Subject lines are attention-grabbing with photographer business names as subheadlines. Semantic keyword detection triggers theme-specific visual modules for enhanced content. It integrates with the NURTURE automation system for sequential email delivery and offers full campaign management.

### Comprehensive Automations UI
The Automations UI features a professional, modern design with enhanced visual hierarchy, including bold titles and a semantic, color-coded badge system for stages, channels (Email, SMS), and types. It uses a timeline-style display for steps with numbered dots and connecting lines, showing delay, channel, action, and preview. Cards are collapsible by default, expanding to reveal full details, with smooth interactions and consistent styling for a polished look. It also includes a Wedding Date Conditional Logic System for date-based automation filtering, enhancing UI and database schema for event date tracking and conditional execution.

### Automation System
An event-driven automation engine using `node-cron` for scheduled tasks. It supports stage-based triggers, configurable time delays, dynamic content rendering with variable substitution (e.g., `{scheduling_link}`), and multi-channel delivery (email and SMS). A unified interface allows creation of communication-only, pipeline-only, or combined automations, including questionnaire assignments. It integrates with NURTURE for AI-powered drip campaigns and features an internal URL shortening system for booking calendar links, optimized for SMS and with click tracking.

### Two-Way SMS Communication System
A comprehensive SMS platform leveraging the SimpleTexting API for sending and receiving messages. It includes a two-way relay system that forwards inbound client SMS messages to photographers with full context (client name, project type). All SMS messages are logged with status, timestamps, and metadata. A phone number-based client lookup system ensures accurate message routing. Webhooks handle incoming SMS messages, and it requires `SIMPLETEXTING_API_TOKEN` and `SIMPLETEXTING_PHONE_NUMBER` environment variables.

### Payment Processing & Stripe Connect
**Stripe Connect is required** for all photographers to accept client payments. The system uses Stripe Connect Express accounts with:
- **Mandatory Setup**: Photographers cannot send proposals until Stripe Connect is configured
- **Platform Fee Model**: Automatic 5% platform fee on all transactions (configurable via `platformFeePercent`)
- **Direct Deposits**: 95% of payments go directly to photographer's Stripe account
- **Payment Flow**: Client payments trigger automatic platform fee deduction and earnings tracking
- **Payout Options**: Standard (2-day, free) or Instant (1% fee, arrives in minutes)
- **Onboarding**: Stripe-hosted onboarding handles compliance, identity verification, and bank account setup
- **Validation**: Backend validates Stripe Connect status before allowing proposal sends
- **Earnings Dashboard**: Real-time balance tracking, payout requests, and transaction history
- **Webhook Integration**: Automatic sync of account status, payouts, and payment events

### Google Integration
Provides comprehensive Google Workspace integration through a single OAuth flow:
- **Calendar**: Dedicated business calendar ("📸 [Business Name] - Client Bookings") with automatic creation, timezone support, and Google Meet links for virtual appointments.
- **Gmail**: Direct email sending from photographer's personal email address with full conversation history tracking. All automated emails, drip campaigns, and manual communications are sent via Gmail API and logged to client history. Inbound client replies are captured via webhooks and automatically associated with the correct client.
OAuth credentials (access token, refresh token) persist indefinitely and refresh automatically when expired.

### Frontend Architecture
Built with React and Vite for development and optimized builds. It uses Wouter for routing, Shadcn/ui (based on Radix UI) for components, and Tailwind CSS for styling with custom design tokens. TanStack Query manages server state and caching, while React Hook Form with Zod validation handles type-safe forms.

### Backend Architecture
Utilizes Node.js with Express.js. Drizzle ORM manages PostgreSQL database operations. Authentication is handled via JWT tokens stored in httpOnly cookies, with bcrypt for password hashing. The API is RESTful with role-based access control middleware.

### Database Design
The schema is centered around a photographer-tenant model, featuring key entities such as Photographers, Users (with PHOTOGRAPHER, CLIENT, ADMIN roles), Clients (with stage-based pipeline), customizable Stages, Templates (email/SMS), Automations, Estimates, and Packages.

### Authentication & Authorization
A three-tier role system (PHOTOGRAPHER, CLIENT, ADMIN) is implemented. JWT tokens provide stateless authentication, and role-based middleware enforces access controls at the route level.

### Super Admin Dashboard System
A comprehensive administrative interface for platform management and customer support:
- **Photographer Management**: View all registered photographers with client counts, creation dates, and account details through a searchable table interface
- **Account Impersonation**: Admins can securely impersonate any photographer account to provide support or troubleshoot issues. Impersonation sessions use short-lived tokens (2 hours vs 7 days for regular sessions). Double-impersonation is prevented via guard (returns 409 Conflict)
- **Impersonation Banner**: A prominent amber banner displays when admin is viewing as a photographer, with one-click exit functionality
- **Activity Logging**: All admin actions (impersonation start/stop, dashboard views) are logged to `adminActivityLog` table for compliance and audit trail
- **JWT Enhancement**: Impersonation tokens include both admin and photographer identities via `originalRole` field, preserving admin context for seamless exit from impersonation
- **Route Protection**: Admin-only endpoints protected via `requireAdmin` middleware that checks both `role` and `originalRole` to ensure proper access control during impersonation
- **Role-Based Navigation**: Dynamic sidebar menu system that switches based on user role and route:
  - Admin menu (shown on /admin/* routes for ADMIN role when not impersonating): Overview, Photographers, Platform Analytics, Billing & Payouts, Activity Log, Support Cases
  - Photographer menu (shown for all other cases): Dashboard, Clients, Projects, Proposals, Packages, Widget Generator, Questionnaires, Scheduling, Templates, Automations, Drip Campaigns, Reports, Earnings
  - Menu automatically switches when entering/exiting impersonation with proper state synchronization

### Marketing Landing Page & Subscription System
A conversion-optimized landing page with founder pricing campaign and subscription management:
- **Landing Page Routing**: Non-authenticated users see the marketing landing page at "/", while logged-in users are automatically redirected to their dashboard
- **Founder Pricing Campaign**: Limited-time founder pricing ($4.95/month) for the first 100 photographers, with real-time "spots remaining" counter powered by `/api/stats/photographer-count` endpoint
- **Scarcity Messaging**: Prominent founder pricing banner, countdown of available spots, and multiple strategic CTAs throughout the page
- **Pricing Tiers**: Founder's Price ($4.95/month, limited to 100 spots) and Regular Price ($9.95/month, locked after founder spots are claimed)
- **Free Trial**: 14-day free trial period included with all subscriptions via Stripe
- **Demo Booking System**: Interactive dialog form for demo requests with fields for first name, email, preferred date, and time. Submissions trigger email notifications via SendGrid to austinpacholek2014@gmail.com. Mobile sticky CTA includes "Book Demo" button that opens the dialog.
- **Page Structure**: Hero section with founder banner, problem/pain points (3 cards), features showcase (6 features), benefits list (6 checkmarks), pricing comparison, final CTA section, and footer
- **Subscription Enforcement**: Middleware enforces active subscription on all photographer routes except billing/subscription management endpoints
- **Error-Safe Registration**: Stripe subscription created first, database records only created if Stripe succeeds (prevents orphaned accounts)
- **Billing Access**: Subscription and billing portal endpoints remain accessible even when subscription is inactive, allowing users to reactivate or manage billing
- **Domain**: Deployed at thephotocrm.com with custom domain configuration

## External Dependencies

### Communication Services
- **Gmail API**: Email delivery directly from photographer's personal email address for maximum personalization. All automated emails, drip campaigns, and manual communications use Gmail integration with complete conversation tracking.
- **SimpleTexting**: SMS messaging for automated texts and two-way client communication.

### Payment Processing
- **Stripe**: Complete payment infrastructure for deposits and full payments.

### Database Infrastructure
- **Neon Database**: PostgreSQL hosting with serverless scaling.
- **Drizzle Kit**: Database migration and schema management.

### Development & Deployment
- **Replit**: Development environment and deployment.
- **Vite**: Frontend build tool.
- **TypeScript**: Type safety across the stack.

### UI & Design System
- **Radix UI**: Unstyled, accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Class Variance Authority**: Type-safe component variant management.