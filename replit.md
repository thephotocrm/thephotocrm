# Lazy Photog - Wedding Photographer CRM

## Overview

Lazy Photog is a comprehensive multi-tenant CRM system designed specifically for wedding photographers. The application provides a complete business management solution with client pipeline management, automated communication workflows, estimate creation, payment processing, and scheduling capabilities. Built as a production-ready MVP, it focuses on streamlining photographer workflows from initial client inquiry through project completion.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-Tenant Architecture
The system implements tenant isolation at the photographer level, where each photographer has completely segregated data access. This is achieved through a hierarchical data model where photographers serve as the primary tenant boundary, with all related data (clients, stages, templates, etc.) linked through photographer IDs.

### Static Email Marketing Platform
Professional-grade drip campaign system featuring research-backed timing and pre-written content:
- **Static Templates**: 24 professionally crafted wedding email templates with strategic content progression covering the entire client journey
- **Research-Backed Timing**: 3-phase delivery schedule optimized for engagement:
  - Phase 1 (High-interest): Days 0, 3, 7, 14, 21 for immediate engagement
  - Phase 2 (Relationship building): Weekly delivery (days 28-91) for consistent touchpoints  
  - Phase 3 (Long-term nurturing): Bi-weekly delivery (days 105-217) for extended engagement
- **Day-0 Scheduling**: Immediate welcome email delivery upon campaign activation
- **Project Type Support**: Dedicated campaign templates for Wedding, Portrait, and Commercial photography
- **5 Visual Template Variations**: Each email automatically uses one of 5 distinct layouts to prevent visual fatigue:
  - **Centered**: Traditional layout with rounded CTAs and centered alignment
  - **Left-Aligned**: Modern left-aligned header with square CTAs and professional spacing
  - **Accent Line**: Centered header with colored accent lines and outlined CTAs
  - **Compact**: Minimal header design with pill-shaped CTAs and tighter spacing
  - **Tagline**: Header with business tagline and ghost-style transparent CTAs
- **Client-Focused Visual Containers**: Smart content enhancement with wedding planning elements:
  - **Wedding Planning Tips**: Highlighted advice boxes with colored borders and icons
  - **Important Reminders**: Callout containers for crucial planning milestones
  - **Budget Highlights**: Special containers for financial planning advice
  - **Timeline Items**: Visual progression indicators for planning phases
  - **Vendor Selection Guides**: Styled containers for choosing wedding vendors
  - **Inspiration Boxes**: Decorative containers for wedding vision and style guidance
- **NURTURE Integration**: Seamless automation system integration for sequential email delivery to inquiry-stage clients
- **Campaign Management**: Full activation, preview, and status tracking capabilities with backend persistence

### Frontend Architecture
- **Framework**: React with Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query for server state management and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: JWT tokens stored in httpOnly cookies with bcrypt for password hashing
- **API Design**: RESTful endpoints with role-based access control middleware

### Database Design
The schema centers around a photographer-tenant model with the following key entities:
- **Photographers**: Primary tenant boundary with business settings
- **Users**: Authentication with role-based access (PHOTOGRAPHER, CLIENT, ADMIN)
- **Clients**: Customer management with stage-based pipeline tracking
- **Stages**: Customizable pipeline stages with drag-and-drop kanban interface
- **Templates**: Email and SMS templates for automated communications
- **Automations**: Time-based workflow triggers for stage transitions
- **Estimates**: Proposal generation with line items and payment integration
- **Packages**: Reusable pricing templates for estimates

### Authentication & Authorization
Three-tier role system:
- **PHOTOGRAPHER**: Full access to their tenant data
- **CLIENT**: Limited access to their own portal and assigned content
- **ADMIN**: System-wide administrative access

JWT tokens provide stateless authentication with role-based middleware enforcing access controls at the route level.

### Automation System
Event-driven automation engine using node-cron for scheduled tasks:
- **Stage-based Triggers**: Automated emails/SMS when clients enter specific stages
- **Time Delays**: Configurable delays (minutes/hours/days) before automation execution
- **Template Integration**: Dynamic content rendering with variable substitution
- **Multi-channel Support**: Both email and SMS delivery channels
- **Unified Creation Interface**: Single modal allowing users to create communication-only, pipeline-only, or combined automations with optional section toggles
- **Questionnaire Support**: Automated questionnaire assignments with proper step creation for both template-based and questionnaire-only communications
- **NURTURE Automation**: AI-powered drip campaigns with sequential email delivery for approved campaigns, automatic client subscription for inquiry-stage projects, and campaign completion tracking

### Payment Processing
Stripe integration for secure payment handling:
- **Deposit Collection**: Configurable deposit percentages on estimates
- **Full Payment Processing**: Complete payment flows with webhook validation
- **E-signature Support**: Digital signature capture for estimate approval
- **Payment Status Tracking**: Real-time payment status updates via webhooks

### Google Calendar Integration
Dedicated business calendar system with automatic event creation:
- **Dedicated Calendars**: Each photographer gets a separate "📸 [Business Name] - Client Bookings" calendar
- **Business/Personal Separation**: Booking events don't clutter the photographer's primary calendar
- **Automatic Calendar Creation**: Dedicated calendars created during OAuth connection or first booking
- **Timezone Awareness**: Uses photographer's timezone settings for calendar creation and events
- **Google Meet Integration**: Automatic Google Meet link generation for virtual appointments
- **Idempotent Operations**: Prevents duplicate calendar creation on reconnection
- **Lazy Migration**: Existing users automatically get dedicated calendars on first booking
- **Graceful Fallback**: Falls back to primary calendar if dedicated creation fails

## External Dependencies

### Communication Services
- **SendGrid**: Email delivery service for transactional emails and marketing communications
- **Twilio**: SMS messaging service for automated text notifications and reminders

### Payment Processing
- **Stripe**: Complete payment infrastructure including payment intents, checkout sessions, and webhook processing for deposit and full payment collection

### Database Infrastructure
- **Neon Database**: PostgreSQL hosting with serverless scaling and connection pooling
- **Drizzle Kit**: Database migration and schema management tooling

### Development & Deployment
- **Replit**: Development environment with integrated deployment capabilities
- **Vite**: Frontend build tool with hot module replacement and optimized production builds
- **TypeScript**: Type safety across the entire application stack

### UI & Design System
- **Radix UI**: Unstyled, accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variant management

### Monitoring & Development Tools
- **React Query Devtools**: Client-side state inspection and debugging
- **ESBuild**: Fast JavaScript bundling for production builds
- **PostCSS**: CSS processing pipeline with Tailwind integration