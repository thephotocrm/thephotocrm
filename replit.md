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

### Payment Processing
Integration with Stripe for secure payment handling, supporting configurable deposit collection, full payment processing with webhook validation, and e-signature support for estimate approval. Real-time payment status tracking is included.

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