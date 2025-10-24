import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, json, jsonb, uuid, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = {
  PHOTOGRAPHER: "PHOTOGRAPHER",
  CLIENT: "CLIENT", 
  ADMIN: "ADMIN"
} as const;

export const channelEnum = {
  EMAIL: "EMAIL",
  SMS: "SMS",
  SMART_FILE: "SMART_FILE"
} as const;

export const projectTypeEnum = {
  WEDDING: "WEDDING",
  ENGAGEMENT: "ENGAGEMENT", 
  PROPOSAL: "PROPOSAL",
  CORPORATE: "CORPORATE",
  PORTRAIT: "PORTRAIT",
  FAMILY: "FAMILY",
  MATERNITY: "MATERNITY",
  NEWBORN: "NEWBORN",
  EVENT: "EVENT",
  COMMERCIAL: "COMMERCIAL",
  OTHER: "OTHER"
} as const;

export const leadSourceEnum = {
  MANUAL: "MANUAL",
  WEBSITE_WIDGET: "WEBSITE_WIDGET",
  REFERRAL: "REFERRAL",
  SOCIAL_MEDIA: "SOCIAL_MEDIA",
  OTHER: "OTHER"
} as const;

export const automationTypeEnum = {
  COMMUNICATION: "COMMUNICATION",
  STAGE_CHANGE: "STAGE_CHANGE",
  COUNTDOWN: "COUNTDOWN",
  NURTURE: "NURTURE"
} as const;

export const smartFileStatusEnum = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED"
} as const;

export const smartFilePageTypeEnum = {
  TEXT: "TEXT",
  PACKAGE: "PACKAGE",
  ADDON: "ADDON",
  CONTRACT: "CONTRACT",
  PAYMENT: "PAYMENT",
  FORM: "FORM",
  SCHEDULING: "SCHEDULING"
} as const;

export const projectSmartFileStatusEnum = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  VIEWED: "VIEWED",
  ACCEPTED: "ACCEPTED",
  DEPOSIT_PAID: "DEPOSIT_PAID",
  PAID: "PAID"
} as const;

export const triggerTypeEnum = {
  DEPOSIT_PAID: "DEPOSIT_PAID",
  FULL_PAYMENT_MADE: "FULL_PAYMENT_MADE", 
  PROJECT_BOOKED: "PROJECT_BOOKED",
  CONTRACT_SIGNED: "CONTRACT_SIGNED",
  SMART_FILE_ACCEPTED: "SMART_FILE_ACCEPTED",
  EVENT_DATE_REACHED: "EVENT_DATE_REACHED",
  PROJECT_DELIVERED: "PROJECT_DELIVERED",
  CLIENT_ONBOARDED: "CLIENT_ONBOARDED",
  APPOINTMENT_BOOKED: "APPOINTMENT_BOOKED",
  GALLERY_SHARED: "GALLERY_SHARED"
} as const;

export const adPlatformEnum = {
  GOOGLE: "GOOGLE",
  FACEBOOK: "FACEBOOK"
} as const;

export const adCampaignStatusEnum = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  COMPLETED: "COMPLETED"
} as const;

// Tables
export const photographers = pgTable("photographers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  photographerName: text("photographer_name"),
  logoUrl: text("logo_url"),
  brandPrimary: text("brand_primary"),
  brandSecondary: text("brand_secondary"),
  emailFromName: text("email_from_name"),
  emailFromAddr: text("email_from_addr"),
  phone: text("phone"), // Photographer's phone for two-way SMS relay
  timezone: text("timezone").notNull().default("America/New_York"),
  // Widget Integration
  publicToken: varchar("public_token").unique().default(sql`gen_random_uuid()`),
  // Google Calendar Integration
  googleCalendarAccessToken: text("google_calendar_access_token"),
  googleCalendarRefreshToken: text("google_calendar_refresh_token"),
  googleCalendarTokenExpiry: timestamp("google_calendar_token_expiry"),
  googleCalendarScope: text("google_calendar_scope"),
  googleCalendarConnectedAt: timestamp("google_calendar_connected_at"),
  googleCalendarId: text("google_calendar_id"), // Dedicated business calendar ID
  googleEmail: text("google_email"), // Email address of connected Google account
  // Default consent settings
  defaultEmailOptIn: boolean("default_email_opt_in").default(true),
  defaultSmsOptIn: boolean("default_sms_opt_in").default(false),
  // Stripe Connect Integration
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeAccountStatus: text("stripe_account_status"), // pending, active, restricted, rejected
  payoutEnabled: boolean("payout_enabled").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  stripeOnboardingCompletedAt: timestamp("stripe_onboarding_completed_at"),
  platformFeePercent: integer("platform_fee_percent").default(500), // 5.00% default platform fee
  // Subscription (for photographers)
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // trialing, active, past_due, canceled, incomplete
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"),
  hasPremiumAccess: boolean("has_premium_access").default(false),
  // Email Branding
  emailHeaderStyle: text("email_header_style"), // minimal, professional, bold, classic, or null for none
  emailSignatureStyle: text("email_signature_style"), // simple, professional, detailed, branded, or null for none
  headshotUrl: text("headshot_url"), // Photographer's headshot for email signatures
  website: text("website"),
  businessAddress: text("business_address"),
  socialLinksJson: jsonb("social_links_json"), // {facebook: "url", instagram: "url", twitter: "url", linkedin: "url"}
  // Gallery Integration
  galleryPlatform: text("gallery_platform"), // GOOGLE_DRIVE, SHOOTPROOF, or null
  // Google Drive Integration
  googleDriveAccessToken: text("google_drive_access_token"),
  googleDriveRefreshToken: text("google_drive_refresh_token"),
  googleDriveTokenExpiry: timestamp("google_drive_token_expiry"),
  googleDriveConnectedAt: timestamp("google_drive_connected_at"),
  googleDriveEmail: text("google_drive_email"),
  // ShootProof Integration
  shootproofAccessToken: text("shootproof_access_token"),
  shootproofRefreshToken: text("shootproof_refresh_token"),
  shootproofTokenExpiry: timestamp("shootproof_token_expiry"),
  shootproofConnectedAt: timestamp("shootproof_connected_at"),
  shootproofStudioId: text("shootproof_studio_id"),
  shootproofEmail: text("shootproof_email"),
  // Onboarding tracking
  onboardingVersion: integer("onboarding_version").default(1),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  onboardingDismissed: boolean("onboarding_dismissed").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  photographerId: varchar("photographer_id").references(() => photographers.id),
  clientId: varchar("client_id"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  resetTokenUsed: boolean("reset_token_used").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const adminActivityLog = pgTable("admin_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // IMPERSONATE, EXIT_IMPERSONATION, VIEW_DASHBOARD
  targetPhotographerId: varchar("target_photographer_id").references(() => photographers.id),
  metadata: json("metadata"), // Additional context (IP, user agent, etc.)
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  adminUserIdx: index("admin_activity_log_admin_user_idx").on(table.adminUserId),
  targetPhotographerIdx: index("admin_activity_log_target_photographer_idx").on(table.targetPhotographerId),
  createdAtIdx: index("admin_activity_log_created_at_idx").on(table.createdAt)
}));

export const stages = pgTable("stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  projectType: text("project_type").notNull().default("WEDDING"),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull(),
  color: text("color").default("#64748b"),
  isDefault: boolean("is_default").default(false),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  eventDate: timestamp("event_date"),
  hasEventDate: boolean("has_event_date").notNull().default(false),
  notes: text("notes"),
  stageId: varchar("stage_id").references(() => stages.id),
  stageEnteredAt: timestamp("stage_entered_at"),
  smsOptIn: boolean("sms_opt_in").default(false),
  emailOptIn: boolean("email_opt_in").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  projectType: text("project_type").notNull().default("WEDDING"),
  leadSource: text("lead_source").default("MANUAL"),
  status: text("status").notNull().default('ACTIVE') // ACTIVE or ARCHIVED
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => contacts.id),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  projectType: text("project_type").notNull().default("WEDDING"),
  title: text("title").notNull(),
  leadSource: text("lead_source").default("MANUAL"),
  referralName: text("referral_name"),
  eventDate: timestamp("event_date"),
  hasEventDate: boolean("has_event_date").notNull().default(false),
  notes: text("notes"),
  stageId: varchar("stage_id").references(() => stages.id),
  stageEnteredAt: timestamp("stage_entered_at"),
  status: text("status").default("ACTIVE"), // ACTIVE, COMPLETED, CANCELLED
  smsOptIn: boolean("sms_opt_in").default(true),
  emailOptIn: boolean("email_opt_in").default(true),
  leadFormId: varchar("lead_form_id").references(() => leadForms.id),
  formSubmissionData: jsonb("form_submission_data"),
  // Gallery Integration
  galleryUrl: text("gallery_url"), // Link to Google Drive folder or ShootProof album
  galleryId: text("gallery_id"), // Platform-specific ID (folder ID or album ID)
  galleryReady: boolean("gallery_ready").default(false), // Whether photographer marked it ready to send
  galleryCreatedAt: timestamp("gallery_created_at"), // When auto-created
  gallerySharedAt: timestamp("gallery_shared_at"), // When marked ready and sent to client
  // Client Portal
  includePortalLinks: boolean("include_portal_links").default(true), // Include magic links in emails
  createdAt: timestamp("created_at").defaultNow()
});

export const projectNotes = pgTable("project_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  noteText: text("note_text").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  projectIdIdx: index("project_notes_project_id_idx").on(table.projectId),
  createdAtIdx: index("project_notes_created_at_idx").on(table.createdAt)
}));

export const projectParticipants = pgTable("project_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  addedBy: text("added_by").notNull(), // PHOTOGRAPHER or CLIENT
  inviteSent: boolean("invite_sent").default(false),
  inviteSentAt: timestamp("invite_sent_at"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Index for quick lookups by project
  projectIdIdx: index("project_participants_project_id_idx").on(table.projectId),
  // Index for quick lookups by client (to find all projects they're a participant in)
  clientIdIdx: index("project_participants_client_id_idx").on(table.clientId),
  // Unique constraint: one participant can only be added once per project
  uniqueProjectClientIdx: unique("project_participants_project_client_unique").on(table.projectId, table.clientId)
}));

export const portalTokens = pgTable("portal_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(), // Secure random token for magic link
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  expiresAt: timestamp("expires_at").notNull(), // Tokens expire after 90 days
  lastUsedAt: timestamp("last_used_at"), // Track when the client last clicked the link
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  tokenIdx: index("portal_tokens_token_idx").on(table.token),
  projectIdIdx: index("portal_tokens_project_id_idx").on(table.projectId),
  clientIdIdx: index("portal_tokens_client_id_idx").on(table.clientId)
}));

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  name: text("name").notNull(),
  channel: text("channel").notNull(),
  subject: text("subject"),
  htmlBody: text("html_body"),
  textBody: text("text_body"),
  contentBlocks: jsonb("content_blocks"), // Block-based email builder content
  createdAt: timestamp("created_at").defaultNow()
});

export const automations = pgTable("automations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  projectType: text("project_type").notNull().default("WEDDING"),
  name: text("name").notNull(),
  description: text("description"), // Human-readable description for details view
  automationType: text("automation_type").notNull().default("COMMUNICATION"), // COMMUNICATION, STAGE_CHANGE, COUNTDOWN
  // Communication automation fields
  stageId: varchar("stage_id").references(() => stages.id),
  channel: text("channel"), // EMAIL, SMS (nullable for stage change and countdown automations)
  // Stage change automation fields  
  triggerType: text("trigger_type"), // DEPOSIT_PAID, FULL_PAYMENT_MADE, PROJECT_BOOKED, APPOINTMENT_BOOKED, etc.
  targetStageId: varchar("target_stage_id").references(() => stages.id),
  // Countdown automation fields
  daysBefore: integer("days_before"), // Days before/after event date to send countdown message
  triggerTiming: text("trigger_timing").default("BEFORE"), // BEFORE or AFTER the event
  triggerHour: integer("trigger_hour").default(9), // Hour of day (0-23) when to trigger
  triggerMinute: integer("trigger_minute").default(0), // Minute (0-59) when to trigger
  eventType: text("event_type"), // event_date, session_date, delivery_date, etc. - which project date field to use
  stageCondition: varchar("stage_condition").references(() => stages.id), // Optional stage filter for countdown automations
  templateId: varchar("template_id").references(() => templates.id), // Template for countdown automations
  // Questionnaire assignment fields (for communication automations)
  questionnaireTemplateId: varchar("questionnaire_template_id").references(() => questionnaireTemplates.id),
  // Conditional logic fields
  eventDateCondition: text("event_date_condition"), // null = no condition, HAS_EVENT_DATE = must have date, NO_EVENT_DATE = must not have date
  effectiveFrom: timestamp("effective_from").defaultNow(), // Only run on clients who entered stage at/after this time
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Business Triggers table - separate from automations to avoid null-handling issues
export const automationBusinessTriggers = pgTable("automation_business_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  automationId: varchar("automation_id").notNull().references(() => automations.id, { onDelete: "cascade" }),
  triggerType: text("trigger_type").notNull(), // DEPOSIT_PAID, FULL_PAYMENT_MADE, etc.
  enabled: boolean("enabled").default(true),
  // Optional constraints for more specific triggering
  minAmountCents: integer("min_amount_cents"), // For payment triggers
  projectType: text("project_type"), // If trigger should only apply to specific project types
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Ensure each automation can only have one trigger of each type
  uniqueAutomationTrigger: unique("automation_business_triggers_unique").on(table.automationId, table.triggerType),
  // Index for efficient queries
  automationIdIdx: index("automation_business_triggers_automation_id_idx").on(table.automationId)
}));

export const automationSteps = pgTable("automation_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  automationId: varchar("automation_id").notNull().references(() => automations.id),
  stepIndex: integer("step_index").notNull(),
  delayMinutes: integer("delay_minutes").notNull(),
  actionType: text("action_type").notNull().default("EMAIL"), // EMAIL, SMS, SMART_FILE
  templateId: varchar("template_id").references(() => templates.id), // For EMAIL/SMS
  smartFileTemplateId: varchar("smart_file_template_id").references(() => smartFiles.id), // For SMART_FILE
  customSmsContent: text("custom_sms_content"), // Custom SMS message (alternative to template)
  enabled: boolean("enabled").default(true),
  quietHoursStart: integer("quiet_hours_start"),
  quietHoursEnd: integer("quiet_hours_end"),
  // Time-based scheduling (e.g., "2 days from now at 6pm")
  scheduledHour: integer("scheduled_hour"), // Hour of day (0-23) to send, null = send immediately after delay
  scheduledMinute: integer("scheduled_minute").default(0) // Minute (0-59) to send
});

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => contacts.id),
  projectId: varchar("project_id").references(() => projects.id),
  automationStepId: varchar("automation_step_id").references(() => automationSteps.id),
  status: text("status").notNull(),
  providerId: text("provider_id"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at")
});

export const smsLogs = pgTable("sms_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => contacts.id),
  projectId: varchar("project_id").references(() => projects.id),
  automationStepId: varchar("automation_step_id").references(() => automationSteps.id),
  status: text("status").notNull(),
  providerId: text("provider_id"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  // Two-way messaging support
  direction: text("direction").notNull().default("OUTBOUND"), // OUTBOUND, INBOUND
  fromPhone: text("from_phone"), // Source phone number
  toPhone: text("to_phone"), // Destination phone number  
  messageBody: text("message_body"), // SMS content for tracking
  isForwarded: boolean("is_forwarded").default(false), // Whether this was forwarded to photographer
  relatedSmsId: varchar("related_sms_id").references(() => smsLogs.id), // Link replies to original messages
  createdAt: timestamp("created_at").defaultNow()
});

// Email history tracking for Gmail integration
export const emailHistory = pgTable("email_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  clientId: varchar("client_id").references(() => contacts.id),
  projectId: varchar("project_id").references(() => projects.id),
  automationStepId: varchar("automation_step_id").references(() => automationSteps.id),
  // Email details
  direction: text("direction").notNull().default("OUTBOUND"), // OUTBOUND, INBOUND
  fromEmail: text("from_email").notNull(),
  toEmails: text("to_emails").array().notNull(), // Array of recipient emails
  ccEmails: text("cc_emails").array(), // CC recipients
  bccEmails: text("bcc_emails").array(), // BCC recipients
  subject: text("subject"),
  htmlBody: text("html_body"),
  textBody: text("text_body"),
  // Gmail tracking
  gmailMessageId: text("gmail_message_id"), // Gmail's unique message ID
  gmailThreadId: text("gmail_thread_id"), // Gmail's thread ID for grouping conversations
  // Source tracking
  source: text("source").notNull().default("MANUAL"), // AUTOMATION, DRIP_CAMPAIGN, MANUAL, CLIENT_REPLY
  status: text("status").notNull().default("SENT"), // SENT, DELIVERED, FAILED, BOUNCED
  // Timestamps
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Index for quick lookups by client
  clientIdIdx: index("email_history_client_id_idx").on(table.clientId),
  // Index for quick lookups by Gmail thread
  gmailThreadIdIdx: index("email_history_gmail_thread_id_idx").on(table.gmailThreadId)
}));

// Bulletproof automation execution tracking to prevent duplicates
export const automationExecutions = pgTable("automation_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  automationId: varchar("automation_id").notNull().references(() => automations.id),
  automationType: text("automation_type").notNull(), // COMMUNICATION, STAGE_CHANGE, COUNTDOWN, NURTURE
  // For communication automations
  automationStepId: varchar("automation_step_id").references(() => automationSteps.id),
  // For stage change automations  
  triggerType: text("trigger_type"), // DEPOSIT_PAID, FULL_PAYMENT_MADE, etc.
  // For countdown automations
  eventDate: timestamp("event_date"), // The event date this countdown was for
  daysBefore: integer("days_before"), // How many days before event this was sent
  // Execution details
  executedAt: timestamp("executed_at").defaultNow(),
  channel: text("channel"), // EMAIL, SMS
  status: text("status").notNull().default("SUCCESS") // SUCCESS, FAILED
}, (table) => ({
  // Unique constraint for communication automations: one execution per project+step
  communicationUniqueIdx: unique("automation_executions_communication_unique").on(
    table.projectId, table.automationStepId
  ),
  // Unique constraint for stage change automations: one execution per project+automation+trigger
  stageChangeUniqueIdx: unique("automation_executions_stage_change_unique").on(
    table.projectId, table.automationId, table.triggerType
  ),
  // Unique constraint for countdown automations: one execution per project+automation+event+days
  countdownUniqueIdx: unique("automation_executions_countdown_unique").on(
    table.projectId, table.automationId, table.eventDate, table.daysBefore
  )
}));

// Drip Campaign Tables
export const dripCampaigns = pgTable("drip_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  projectType: text("project_type").notNull().default("WEDDING"),
  name: text("name").notNull(),
  targetStageId: varchar("target_stage_id").notNull().references(() => stages.id),
  status: text("status").notNull().default("DRAFT"), // DRAFT, APPROVED, ACTIVE, PAUSED
  maxDurationMonths: integer("max_duration_months").notNull().default(12),
  emailFrequencyWeeks: integer("email_frequency_weeks").notNull().default(2), // How often to send emails (2 = every 2 weeks)
  emailFrequencyDays: integer("email_frequency_days"), // Alternative frequency in days (24 = every 24 days)
  generatedByAi: boolean("generated_by_ai").default(false),
  isStaticTemplate: boolean("is_static_template").default(false), // Whether this uses static email templates
  staticTemplateType: text("static_template_type"), // WEDDING, PORTRAIT, COMMERCIAL, etc.
  aiPrompt: text("ai_prompt"), // The prompt used to generate this campaign
  businessContext: text("business_context"), // Business info used for AI generation
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  // Campaign versioning system
  version: integer("version").notNull().default(1), // Version number for the campaign
  parentCampaignId: varchar("parent_campaign_id").references(() => dripCampaigns.id), // Reference to original campaign if this is a version
  isCurrentVersion: boolean("is_current_version").default(true), // Whether this is the active version
  versionNotes: text("version_notes"), // Notes about what changed in this version
  // Brand and styling preferences
  useCustomStyling: boolean("use_custom_styling").default(false), // Whether to use custom HTML styling
  primaryBrandColor: text("primary_brand_color"), // Hex code for primary brand color
  secondaryBrandColor: text("secondary_brand_color"), // Hex code for secondary brand color
  fontFamily: text("font_family").default("Arial, sans-serif"), // Email font preference
  createdAt: timestamp("created_at").defaultNow(),
  enabled: boolean("enabled").default(true)
});

export const dripCampaignEmails = pgTable("drip_campaign_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => dripCampaigns.id),
  sequenceIndex: integer("sequence_index").notNull(), // Order in the sequence (0, 1, 2, etc.)
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body"),
  weeksAfterStart: integer("weeks_after_start").notNull(), // When to send relative to campaign start (legacy)
  daysAfterStart: integer("days_after_start"), // Alternative timing in days for static campaigns
  // Individual email approval system
  approvalStatus: text("approval_status").notNull().default("PENDING"), // PENDING, APPROVED, REJECTED
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"), // Why it was rejected
  // Edited content tracking
  originalSubject: text("original_subject"), // AI-generated subject
  originalHtmlBody: text("original_html_body"), // AI-generated HTML
  originalTextBody: text("original_text_body"), // AI-generated text
  hasManualEdits: boolean("has_manual_edits").default(false), // Track if manually edited
  lastEditedAt: timestamp("last_edited_at"),
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});

export const dripCampaignSubscriptions = pgTable("drip_campaign_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => dripCampaigns.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  clientId: varchar("client_id").notNull().references(() => contacts.id),
  startedAt: timestamp("started_at").defaultNow(),
  nextEmailIndex: integer("next_email_index").notNull().default(0), // Which email to send next
  nextEmailAt: timestamp("next_email_at"), // When to send the next email
  completedAt: timestamp("completed_at"), // When the campaign completed (event date reached or max duration)
  unsubscribedAt: timestamp("unsubscribed_at"),
  status: text("status").notNull().default("ACTIVE") // ACTIVE, COMPLETED, UNSUBSCRIBED, PAUSED
}, (table) => ({
  // Unique constraint: one subscription per project per campaign
  projectCampaignUniqueIdx: unique("drip_subscription_project_campaign_unique").on(
    table.projectId, table.campaignId
  )
}));

export const dripEmailDeliveries = pgTable("drip_email_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull().references(() => dripCampaignSubscriptions.id),
  emailId: varchar("email_id").notNull().references(() => dripCampaignEmails.id),
  clientId: varchar("client_id").notNull().references(() => contacts.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  status: text("status").notNull(), // PENDING, SENT, DELIVERED, BOUNCED, FAILED
  providerId: text("provider_id"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Unique constraint: one delivery per subscription per email
  subscriptionEmailUniqueIdx: unique("drip_delivery_subscription_email_unique").on(
    table.subscriptionId, table.emailId
  )
}));

// Static Campaign Settings
export const staticCampaignSettings = pgTable("static_campaign_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  projectType: text("project_type").notNull(), // WEDDING, PORTRAIT, COMMERCIAL, ENGAGEMENT, MATERNITY, FAMILY
  campaignEnabled: boolean("campaign_enabled").default(false), // Master toggle for this campaign type
  emailToggles: text("email_toggles"), // JSON string storing individual email toggles {0: true, 1: false, etc}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  // Unique constraint: one setting per photographer per project type
  photographerProjectTypeUniqueIdx: unique("static_campaign_settings_photographer_project_type_unique").on(
    table.photographerId, table.projectType
  )
}));

// Campaign version history tracking
export const dripCampaignVersionHistory = pgTable("drip_campaign_version_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => dripCampaigns.id),
  version: integer("version").notNull(),
  changeType: text("change_type").notNull(), // CREATED, EMAIL_MODIFIED, EMAIL_ADDED, EMAIL_REMOVED, SETTINGS_CHANGED
  changeDescription: text("change_description").notNull(),
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  affectedEmailId: varchar("affected_email_id").references(() => dripCampaignEmails.id), // If change affects specific email
  previousData: text("previous_data"), // JSON snapshot of previous state
  newData: text("new_data"), // JSON snapshot of new state
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Index for efficient version history queries
  campaignVersionIdx: index("drip_campaign_version_history_campaign_version_idx").on(
    table.campaignId, table.version
  )
}));

export const photographerLinks = pgTable("photographer_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

export const checklistTemplateItems = pgTable("checklist_template_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  title: text("title").notNull(),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

export const projectChecklistItems = pgTable("project_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  orderIndex: integer("order_index").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  basePriceCents: integer("base_price_cents").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const packageItems = pgTable("package_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packageId: varchar("package_id").notNull().references(() => packages.id),
  name: text("name").notNull(),
  description: text("description"),
  qty: integer("qty").default(1),
  unitCents: integer("unit_cents").default(0),
  lineTotalCents: integer("line_total_cents").default(0)
});

export const addOns = pgTable("add_ons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow()
});

export const questionnaireTemplates = pgTable("questionnaire_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});

export const questionnaireQuestions = pgTable("questionnaire_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => questionnaireTemplates.id),
  type: text("type").notNull(),
  label: text("label").notNull(),
  options: text("options"),
  orderIndex: integer("order_index").notNull()
});

export const projectQuestionnaires = pgTable("project_questionnaires", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  templateId: varchar("questionnaire_template_id").notNull().references(() => questionnaireTemplates.id),
  answers: json("answers"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Daily availability templates for weekly patterns (e.g., "Monday: 8am-6pm")
export const dailyAvailabilityTemplates = pgTable("daily_availability_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
  startTime: text("start_time").notNull(), // "08:00"
  endTime: text("end_time").notNull(), // "18:00"
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Break times within daily availability (e.g., "12pm-2pm lunch break")
export const dailyAvailabilityBreaks = pgTable("daily_availability_breaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => dailyAvailabilityTemplates.id),
  startTime: text("start_time").notNull(), // "12:00"
  endTime: text("end_time").notNull(), // "14:00"
  label: text("label"), // "Lunch break"
  createdAt: timestamp("created_at").defaultNow()
});

// Date-specific overrides for custom hours or closures
export const dailyAvailabilityOverrides = pgTable("daily_availability_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  date: text("date").notNull(), // "2024-01-15" format
  startTime: text("start_time"), // null = closed day
  endTime: text("end_time"),
  breaks: json("breaks"), // Array of {startTime, endTime, label}
  reason: text("reason"), // "Holiday", "Vacation", etc.
  createdAt: timestamp("created_at").defaultNow()
});

export const availabilitySlots = pgTable("availability_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  title: text("title").notNull(),
  description: text("description"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  isBooked: boolean("is_booked").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"), // WEEKLY, DAILY
  sourceTemplateId: varchar("source_template_id"), // Reference to daily template that generated this slot
  createdAt: timestamp("created_at").defaultNow()
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  projectId: varchar("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: text("status").default("PENDING"), // PENDING, CONFIRMED, CANCELLED, COMPLETED
  bookingType: text("booking_type").default("CONSULTATION"), // CONSULTATION, ENGAGEMENT, WEDDING, MEETING
  isFirstBooking: boolean("is_first_booking").default(false),
  googleCalendarEventId: text("google_calendar_event_id"),
  googleMeetLink: text("google_meet_link"),
  bookingToken: varchar("booking_token").default(sql`gen_random_uuid()`),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  clientName: text("client_name"),
  createdAt: timestamp("created_at").defaultNow()
});

export const shortLinks = pgTable("short_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  shortCode: text("short_code").notNull().unique(),
  targetUrl: text("target_url").notNull(),
  linkType: text("link_type").notNull().default("BOOKING"), // BOOKING, ESTIMATE, CUSTOM
  clicks: integer("clicks").default(0),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  shortCodeIdx: index("short_links_short_code_idx").on(table.shortCode),
  photographerIdx: index("short_links_photographer_idx").on(table.photographerId)
}));

// Lead Forms (Website Embedded Forms)
export const leadForms = pgTable("lead_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  name: text("name").notNull(),
  description: text("description"),
  publicToken: varchar("public_token").notNull().unique().default(sql`gen_random_uuid()`),
  projectType: text("project_type").notNull(), // WEDDING, PORTRAIT, COMMERCIAL, etc
  config: json("config").notNull(), // Form configuration: title, description, colors, field visibility, etc
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, ARCHIVED
  submissionCount: integer("submission_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  photographerIdx: index("lead_forms_photographer_idx").on(table.photographerId),
  publicTokenIdx: index("lead_forms_public_token_idx").on(table.publicToken)
}));

// Smart Files (Custom Invoice/Checkout Builder)
export const smartFiles = pgTable("smart_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  name: text("name").notNull(),
  description: text("description"),
  projectType: text("project_type"), // WEDDING, PORTRAIT, etc - can be null for universal templates
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, ARCHIVED
  defaultDepositPercent: integer("default_deposit_percent").default(50),
  allowFullPayment: boolean("allow_full_payment").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  photographerIdx: index("smart_files_photographer_idx").on(table.photographerId),
  projectTypeIdx: index("smart_files_project_type_idx").on(table.projectType)
}));

export const smartFilePages = pgTable("smart_file_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  smartFileId: varchar("smart_file_id").notNull().references(() => smartFiles.id, { onDelete: 'cascade' }),
  pageType: text("page_type").notNull(), // TEXT, PACKAGE, ADDON, CONTRACT, PAYMENT, FORM
  pageOrder: integer("page_order").notNull(),
  displayTitle: text("display_title").notNull(),
  content: json("content").notNull(), // Flexible JSON structure per page type
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  smartFileIdx: index("smart_file_pages_smart_file_idx").on(table.smartFileId),
  orderIdx: index("smart_file_pages_order_idx").on(table.smartFileId, table.pageOrder),
  uniqueOrder: unique("smart_file_pages_unique_order").on(table.smartFileId, table.pageOrder)
}));

export const projectSmartFiles = pgTable("project_smart_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  smartFileId: varchar("smart_file_id").notNull().references(() => smartFiles.id),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  clientId: varchar("client_id").notNull().references(() => contacts.id),
  
  // Snapshot metadata
  smartFileName: text("smart_file_name").notNull(),
  pagesSnapshot: json("pages_snapshot").notNull(), // Full snapshot of pages at time of sending
  
  // Status tracking
  status: text("status").notNull().default("DRAFT"), // DRAFT, SENT, VIEWED, ACCEPTED, PAID
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  acceptedAt: timestamp("accepted_at"),
  paidAt: timestamp("paid_at"),
  
  // Client selections (JSONB)
  selectedPackages: json("selected_packages"), // [{ pageId, packageId, name, priceCents }]
  selectedAddOns: json("selected_add_ons"), // [{ pageId, addOnId, name, priceCents, quantity }]
  
  // Form answers (JSONB) - { pageId: { questionId: answer } }
  formAnswers: json("form_answers"), // Store client form submissions
  
  // Pricing breakdown
  subtotalCents: integer("subtotal_cents").default(0),
  taxCents: integer("tax_cents").default(0),
  feesCents: integer("fees_cents").default(0),
  tipCents: integer("tip_cents").default(0),
  totalCents: integer("total_cents").default(0),
  depositPercent: integer("deposit_percent"),
  depositCents: integer("deposit_cents"),
  
  // Payment tracking
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeChargeId: text("stripe_charge_id"),
  paymentType: text("payment_type"), // DEPOSIT, FULL, BALANCE
  amountPaidCents: integer("amount_paid_cents").default(0), // Track cumulative payments
  balanceDueCents: integer("balance_due_cents").default(0), // Remaining balance
  
  // Contract signatures
  clientSignatureUrl: text("client_signature_url"),
  photographerSignatureUrl: text("photographer_signature_url"),
  clientSignedAt: timestamp("client_signed_at"),
  photographerSignedAt: timestamp("photographer_signed_at"),
  clientSignedIp: text("client_signed_ip"), // IP address at time of client signature
  clientSignedUserAgent: text("client_signed_user_agent"), // Browser info at signature
  contractSnapshotHtml: text("contract_snapshot_html"), // Full rendered contract HTML at signature time
  contractPdfUrl: text("contract_pdf_url"), // Generated PDF of signed contract
  
  // Access token for client view
  token: varchar("token").default(sql`gen_random_uuid()`),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  projectIdx: index("project_smart_files_project_idx").on(table.projectId),
  smartFileIdx: index("project_smart_files_smart_file_idx").on(table.smartFileId),
  photographerIdx: index("project_smart_files_photographer_idx").on(table.photographerId),
  statusIdx: index("project_smart_files_status_idx").on(table.status),
  tokenIdx: index("project_smart_files_token_idx").on(table.token)
}));

export const photographerEarnings = pgTable("photographer_earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  paymentIntentId: text("payment_intent_id").unique(), // Stripe Connect Payment Intent ID (unique)
  transferId: text("transfer_id").unique(), // Stripe Connect Transfer ID (unique)
  totalAmountCents: integer("total_amount_cents").notNull(), // Original payment amount
  platformFeeCents: integer("platform_fee_cents").notNull(), // Platform commission
  photographerEarningsCents: integer("photographer_earnings_cents").notNull(), // Amount photographer receives
  currency: text("currency").default("USD").notNull(), // Currency for the earning
  status: text("status").notNull().default("pending"), // pending, transferred, failed
  transferredAt: timestamp("transferred_at"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Composite indexes for performance
  photographerStatusIdx: index("photographer_earnings_photographer_status_idx").on(table.photographerId, table.status)
}));

export const photographerPayouts = pgTable("photographer_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  stripePayoutId: text("stripe_payout_id").unique(), // Stripe payout ID (unique)
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").default("USD").notNull(),
  status: text("status").notNull().default("pending"), // pending, paid, failed, cancelled
  isInstant: boolean("is_instant").default(false), // Whether this was an instant payout (1% fee)
  feeCents: integer("fee_cents").default(0), // Instant payout fee if applicable
  method: text("method").default("standard"), // standard, instant
  stripeCreatedAt: timestamp("stripe_created_at"),
  arrivalDate: timestamp("arrival_date"), // Expected arrival date
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Composite indexes for performance
  photographerStatusIdx: index("photographer_payouts_photographer_status_idx").on(table.photographerId, table.status)
}));

// Track when photographers last read conversations with contacts for inbox unread badges
export const conversationReads = pgTable("conversation_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  contactId: varchar("contact_id").notNull().references(() => contacts.id),
  lastReadAt: timestamp("last_read_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  // Unique constraint: one read tracker per photographer-contact pair
  photographerContactUnique: unique("conversation_reads_photographer_contact_unique").on(
    table.photographerId, table.contactId
  ),
  // Index for quick lookups by photographer
  photographerIdx: index("conversation_reads_photographer_idx").on(table.photographerId)
}));

export const projectActivityLog = pgTable("project_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  action: text("action").notNull(), // CREATED, UPDATED, SENT, RECEIVED, etc.
  activityType: text("activity_type").notNull(), // STAGE_CHANGE, PROPOSAL_SENT, PROPOSAL_SIGNED, PAYMENT_RECEIVED, MESSAGE_SENT, EMAIL_OPENED, etc.
  title: text("title").notNull(),
  description: text("description"),
  metadata: json("metadata"), // Additional structured data
  relatedId: varchar("related_id"), // ID of related record (estimate, message, etc.)
  relatedType: text("related_type"), // Type of related record (ESTIMATE, MESSAGE, EMAIL_LOG, etc.)
  createdAt: timestamp("created_at").defaultNow()
});

export const clientPortalTokens = pgTable("client_portal_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => contacts.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Advertising System Tables
export const adCampaigns = pgTable("ad_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  platform: text("platform").notNull(), // GOOGLE, FACEBOOK
  status: text("status").notNull().default("DRAFT"), // DRAFT, ACTIVE, PAUSED, BUDGET_EXCEEDED, PAYMENT_FAILED, COMPLETED
  monthlyBudgetCents: integer("monthly_budget_cents").notNull(), // Budget in cents
  markupPercent: integer("markup_percent").notNull(), // Markup percentage (e.g., 2500 = 25%)
  // External platform IDs
  googleAdAccountId: text("google_ad_account_id"),
  googleCampaignId: text("google_campaign_id"),
  facebookAdAccountId: text("facebook_ad_account_id"),
  facebookCampaignId: text("facebook_campaign_id"),
  // Landing page
  landingPageSubdomain: text("landing_page_subdomain").unique(),
  landingPageUrl: text("landing_page_url"),
  // Tracking
  currentSpendCents: integer("current_spend_cents").default(0),
  totalLeadsGenerated: integer("total_leads_generated").default(0),
  lastSyncedAt: timestamp("last_synced_at"),
  activatedAt: timestamp("activated_at"),
  pausedAt: timestamp("paused_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  photographerIdx: index("ad_campaigns_photographer_idx").on(table.photographerId),
  statusIdx: index("ad_campaigns_status_idx").on(table.status),
  platformIdx: index("ad_campaigns_platform_idx").on(table.platform)
}));

export const adPaymentMethods = pgTable("ad_payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  stripePaymentMethodId: text("stripe_payment_method_id").notNull(),
  cardBrand: text("card_brand"), // visa, mastercard, etc.
  cardLast4: text("card_last_4"),
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  photographerIdx: index("ad_payment_methods_photographer_idx").on(table.photographerId)
}));

export const adPerformance = pgTable("ad_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => adCampaigns.id),
  date: timestamp("date").notNull(),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  leads: integer("leads").default(0),
  spendCents: integer("spend_cents").default(0),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  campaignDateIdx: index("ad_performance_campaign_date_idx").on(table.campaignId, table.date)
}));

export const adBillingTransactions = pgTable("ad_billing_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  campaignId: varchar("campaign_id").references(() => adCampaigns.id),
  type: text("type").notNull(), // CHARGE, REFUND
  amountCents: integer("amount_cents").notNull(),
  platformSpendCents: integer("platform_spend_cents").notNull(), // Actual spend on ad platform
  markupCents: integer("markup_cents").notNull(), // Our markup amount
  stripeChargeId: text("stripe_charge_id"),
  stripeRefundId: text("stripe_refund_id"),
  status: text("status").notNull().default("PENDING"), // PENDING, SUCCEEDED, FAILED
  failureReason: text("failure_reason"),
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd: timestamp("billing_period_end"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  photographerIdx: index("ad_billing_photographer_idx").on(table.photographerId),
  statusIdx: index("ad_billing_status_idx").on(table.status)
}));

// Relations
export const photographersRelations = relations(photographers, ({ many }) => ({
  users: many(users),
  stages: many(stages),
  templates: many(templates),
  automations: many(automations),
  links: many(photographerLinks),
  checklistTemplateItems: many(checklistTemplateItems),
  packages: many(packages),
  questionnaires: many(questionnaireTemplates),
  availability: many(availabilitySlots),
  contacts: many(contacts),
  projects: many(projects),
  bookings: many(bookings),
  emailHistory: many(emailHistory)
}));

export const usersRelations = relations(users, ({ one }) => ({
  photographer: one(photographers, {
    fields: [users.photographerId],
    references: [photographers.id]
  })
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  photographer: one(photographers, {
    fields: [stages.photographerId],
    references: [photographers.id]
  }),
  projects: many(projects),
  automations: many(automations)
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  photographer: one(photographers, {
    fields: [contacts.photographerId],
    references: [photographers.id]
  }),
  projects: many(projects),
  emailHistory: many(emailHistory),
  participantProjects: many(projectParticipants)
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(contacts, {
    fields: [projects.clientId],
    references: [contacts.id]
  }),
  photographer: one(photographers, {
    fields: [projects.photographerId],
    references: [photographers.id]
  }),
  stage: one(stages, {
    fields: [projects.stageId],
    references: [stages.id]
  }),
  emailLogs: many(emailLogs),
  emailHistory: many(emailHistory),
  smsLogs: many(smsLogs),
  checklistItems: many(projectChecklistItems),
  questionnaires: many(projectQuestionnaires),
  activityLog: many(projectActivityLog),
  participants: many(projectParticipants)
}));

export const projectParticipantsRelations = relations(projectParticipants, ({ one }) => ({
  project: one(projects, {
    fields: [projectParticipants.projectId],
    references: [projects.id]
  }),
  client: one(contacts, {
    fields: [projectParticipants.clientId],
    references: [contacts.id]
  })
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  photographer: one(photographers, {
    fields: [templates.photographerId],
    references: [photographers.id]
  }),
  automationSteps: many(automationSteps)
}));

export const automationsRelations = relations(automations, ({ one, many }) => ({
  photographer: one(photographers, {
    fields: [automations.photographerId],
    references: [photographers.id]
  }),
  stage: one(stages, {
    fields: [automations.stageId],
    references: [stages.id]
  }),
  targetStage: one(stages, {
    fields: [automations.targetStageId],
    references: [stages.id]
  }),
  conditionStage: one(stages, {
    fields: [automations.stageCondition],
    references: [stages.id]
  }),
  steps: many(automationSteps),
  businessTriggers: many(automationBusinessTriggers)
}));

export const automationBusinessTriggersRelations = relations(automationBusinessTriggers, ({ one }) => ({
  automation: one(automations, {
    fields: [automationBusinessTriggers.automationId],
    references: [automations.id]
  })
}));

export const automationStepsRelations = relations(automationSteps, ({ one }) => ({
  automation: one(automations, {
    fields: [automationSteps.automationId],
    references: [automations.id]
  }),
  template: one(templates, {
    fields: [automationSteps.templateId],
    references: [templates.id]
  })
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  project: one(projects, {
    fields: [emailLogs.projectId],
    references: [projects.id]
  }),
  automationStep: one(automationSteps, {
    fields: [emailLogs.automationStepId],
    references: [automationSteps.id]
  })
}));

export const smsLogsRelations = relations(smsLogs, ({ one }) => ({
  project: one(projects, {
    fields: [smsLogs.projectId],
    references: [projects.id]
  }),
  automationStep: one(automationSteps, {
    fields: [smsLogs.automationStepId],
    references: [automationSteps.id]
  })
}));

export const emailHistoryRelations = relations(emailHistory, ({ one }) => ({
  photographer: one(photographers, {
    fields: [emailHistory.photographerId],
    references: [photographers.id]
  }),
  client: one(contacts, {
    fields: [emailHistory.clientId],
    references: [contacts.id]
  }),
  project: one(projects, {
    fields: [emailHistory.projectId],
    references: [projects.id]
  }),
  automationStep: one(automationSteps, {
    fields: [emailHistory.automationStepId],
    references: [automationSteps.id]
  })
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  photographer: one(photographers, {
    fields: [packages.photographerId],
    references: [photographers.id]
  }),
  items: many(packageItems)
}));

export const packageItemsRelations = relations(packageItems, ({ one }) => ({
  package: one(packages, {
    fields: [packageItems.packageId],
    references: [packages.id]
  })
}));

export const addOnsRelations = relations(addOns, ({ one }) => ({
  photographer: one(photographers, {
    fields: [addOns.photographerId],
    references: [photographers.id]
  })
}));

export const questionnaireTemplatesRelations = relations(questionnaireTemplates, ({ one, many }) => ({
  photographer: one(photographers, {
    fields: [questionnaireTemplates.photographerId],
    references: [photographers.id]
  }),
  questions: many(questionnaireQuestions),
  projectQuestionnaires: many(projectQuestionnaires)
}));

export const questionnaireQuestionsRelations = relations(questionnaireQuestions, ({ one }) => ({
  template: one(questionnaireTemplates, {
    fields: [questionnaireQuestions.templateId],
    references: [questionnaireTemplates.id]
  })
}));

export const projectQuestionnairesRelations = relations(projectQuestionnaires, ({ one }) => ({
  project: one(projects, {
    fields: [projectQuestionnaires.projectId],
    references: [projects.id]
  }),
  template: one(questionnaireTemplates, {
    fields: [projectQuestionnaires.templateId],
    references: [questionnaireTemplates.id]
  })
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  photographer: one(photographers, {
    fields: [bookings.photographerId],
    references: [photographers.id]
  }),
  project: one(projects, {
    fields: [bookings.projectId],
    references: [projects.id]
  })
}));

export const projectActivityLogRelations = relations(projectActivityLog, ({ one }) => ({
  project: one(projects, {
    fields: [projectActivityLog.projectId],
    references: [projects.id]
  })
}));

export const projectChecklistItemsRelations = relations(projectChecklistItems, ({ one }) => ({
  project: one(projects, {
    fields: [projectChecklistItems.projectId],
    references: [projects.id]
  })
}));

// Insert schemas
export const insertPhotographerSchema = createInsertSchema(photographers).omit({
  id: true,
  createdAt: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLog).omit({
  id: true,
  createdAt: true
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  stageEnteredAt: true
}).extend({
  eventDate: z.string().optional().transform((val) => val ? new Date(val) : undefined)
});

export const insertProjectNoteSchema = createInsertSchema(projectNotes).omit({
  id: true,
  createdAt: true
});

export const insertProjectParticipantSchema = createInsertSchema(projectParticipants).omit({
  id: true,
  createdAt: true,
  inviteSent: true,
  inviteSentAt: true
});

export const insertPortalTokenSchema = createInsertSchema(portalTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true
});

export const insertStageSchema = createInsertSchema(stages).omit({
  id: true
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true
});

export const insertAutomationSchema = createInsertSchema(automations).omit({
  id: true
});

// Separate validation schema for backend API with stricter rules
export const validateAutomationSchema = insertAutomationSchema.refine(
  (data) => {
    if (data.automationType === 'COMMUNICATION') {
      // Communication automations require stageId and either channel (for messaging) or questionnaireTemplateId (for questionnaire assignment)
      return data.stageId !== undefined && (data.channel !== undefined || data.questionnaireTemplateId !== undefined);
    }
    if (data.automationType === 'STAGE_CHANGE') {
      // Pipeline automations require triggerType and targetStageId
      return data.triggerType !== undefined && data.targetStageId !== undefined;
    }
    if (data.automationType === 'COUNTDOWN') {
      // Countdown automations require daysBefore, eventType, and templateId
      // stageCondition is optional for filtering
      return data.daysBefore !== undefined && data.eventType !== undefined && data.templateId !== undefined;
    }
    return true;
  },
  {
    message: "Invalid automation configuration - ensure required fields are present for the selected automation type"
  }
);

export const insertAutomationStepSchema = createInsertSchema(automationSteps).omit({
  id: true
});

export const insertAutomationBusinessTriggerSchema = createInsertSchema(automationBusinessTriggers).omit({
  id: true,
  createdAt: true
});

export const insertAutomationExecutionSchema = createInsertSchema(automationExecutions).omit({
  id: true,
  executedAt: true
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true
});

export const insertAddOnSchema = createInsertSchema(addOns).omit({
  id: true,
  createdAt: true
});

export const insertQuestionnaireTemplateSchema = createInsertSchema(questionnaireTemplates).omit({
  id: true,
  createdAt: true
});

export const insertQuestionnaireQuestionSchema = createInsertSchema(questionnaireQuestions).omit({
  id: true
});

export const insertProjectQuestionnaireSchema = createInsertSchema(projectQuestionnaires).omit({
  id: true,
  createdAt: true
});

export const insertConversationReadSchema = createInsertSchema(conversationReads).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSmsLogSchema = createInsertSchema(smsLogs).omit({
  id: true,
  createdAt: true
});

export const insertEmailHistorySchema = createInsertSchema(emailHistory).omit({
  id: true,
  createdAt: true
});

export const insertProjectActivityLogSchema = createInsertSchema(projectActivityLog).omit({
  id: true,
  createdAt: true
});
export const insertClientPortalTokenSchema = createInsertSchema(clientPortalTokens).omit({
  id: true,
  createdAt: true
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  bookingToken: true
}).extend({
  startAt: z.string().transform((val) => new Date(val)),
  endAt: z.string().transform((val) => new Date(val))
});

export const insertShortLinkSchema = createInsertSchema(shortLinks).omit({
  id: true,
  createdAt: true,
  clicks: true
});

export const insertLeadFormSchema = createInsertSchema(leadForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publicToken: true,
  submissionCount: true
});

export const insertSmartFileSchema = createInsertSchema(smartFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSmartFilePageSchema = createInsertSchema(smartFilePages).omit({
  id: true,
  createdAt: true
});

export const insertProjectSmartFileSchema = createInsertSchema(projectSmartFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Booking confirmation validation schema
export const bookingConfirmationSchema = z.object({
  clientName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  clientEmail: z.string().email("Invalid email address").max(255, "Email too long"),
  clientPhone: z.string().min(10, "Phone number must be at least 10 digits").max(20, "Phone number too long")
});

// Update booking validation schema for PUT requests
export const updateBookingSchema = insertBookingSchema.partial().omit({
  photographerId: true
});

// Sanitized booking data for public endpoints (excludes sensitive photographer info)
export const sanitizedBookingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startAt: z.date(),
  endAt: z.date(),
  status: z.string(),
  bookingType: z.string().nullable(),
  isFirstBooking: z.boolean(),
  googleMeetLink: z.string().nullable(),
  clientEmail: z.string().nullable(),
  clientPhone: z.string().nullable(), 
  clientName: z.string().nullable(),
  createdAt: z.date()
});

// Daily availability template schemas
export const insertDailyAvailabilityTemplateSchema = createInsertSchema(dailyAvailabilityTemplates).omit({ id: true });
export const insertDailyAvailabilityBreakSchema = createInsertSchema(dailyAvailabilityBreaks).omit({ id: true });
export const insertDailyAvailabilityOverrideSchema = createInsertSchema(dailyAvailabilityOverrides).omit({ id: true });

// Old availability slot schemas removed - use template-based system instead
// Use insertDailyAvailabilityTemplateSchema and insertDailyAvailabilityOverrideSchema

// Type exports
export type Photographer = typeof photographers.$inferSelect;
export type InsertPhotographer = z.infer<typeof insertPhotographerSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AdminActivityLog = typeof adminActivityLog.$inferSelect;
export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectNote = typeof projectNotes.$inferSelect;
export type InsertProjectNote = z.infer<typeof insertProjectNoteSchema>;
export type ProjectParticipant = typeof projectParticipants.$inferSelect;
export type InsertProjectParticipant = z.infer<typeof insertProjectParticipantSchema>;
export type PortalToken = typeof portalTokens.$inferSelect;
export type InsertPortalToken = z.infer<typeof insertPortalTokenSchema>;
export type Stage = typeof stages.$inferSelect;
export type InsertStage = z.infer<typeof insertStageSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type AutomationStep = typeof automationSteps.$inferSelect;
export type InsertAutomationStep = z.infer<typeof insertAutomationStepSchema>;
export type AutomationBusinessTrigger = typeof automationBusinessTriggers.$inferSelect;
export type InsertAutomationBusinessTrigger = z.infer<typeof insertAutomationBusinessTriggerSchema>;
export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type InsertAutomationExecution = z.infer<typeof insertAutomationExecutionSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type AddOn = typeof addOns.$inferSelect;
export type InsertAddOn = z.infer<typeof insertAddOnSchema>;
export type QuestionnaireTemplate = typeof questionnaireTemplates.$inferSelect;
export type InsertQuestionnaireTemplate = z.infer<typeof insertQuestionnaireTemplateSchema>;
export type QuestionnaireQuestion = typeof questionnaireQuestions.$inferSelect;
export type InsertQuestionnaireQuestion = z.infer<typeof insertQuestionnaireQuestionSchema>;
export type ConversationRead = typeof conversationReads.$inferSelect;
export type InsertConversationRead = z.infer<typeof insertConversationReadSchema>;
export type SmsLog = typeof smsLogs.$inferSelect;
export type InsertSmsLog = z.infer<typeof insertSmsLogSchema>;
export type EmailHistory = typeof emailHistory.$inferSelect;
export type InsertEmailHistory = z.infer<typeof insertEmailHistorySchema>;
export type ProjectActivityLog = typeof projectActivityLog.$inferSelect;
export type InsertProjectActivityLog = z.infer<typeof insertProjectActivityLogSchema>;
export type ProjectChecklistItem = typeof projectChecklistItems.$inferSelect;
export type ProjectQuestionnaire = typeof projectQuestionnaires.$inferSelect;
export type ClientPortalToken = typeof clientPortalTokens.$inferSelect;
export type InsertClientPortalToken = z.infer<typeof insertClientPortalTokenSchema>;
export type DailyAvailabilityTemplate = typeof dailyAvailabilityTemplates.$inferSelect;
export type InsertDailyAvailabilityTemplate = z.infer<typeof insertDailyAvailabilityTemplateSchema>;
export type DailyAvailabilityBreak = typeof dailyAvailabilityBreaks.$inferSelect;
export type InsertDailyAvailabilityBreak = z.infer<typeof insertDailyAvailabilityBreakSchema>;
export type DailyAvailabilityOverride = typeof dailyAvailabilityOverrides.$inferSelect;
export type InsertDailyAvailabilityOverride = z.infer<typeof insertDailyAvailabilityOverrideSchema>;
export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
export type InsertAvailabilitySlot = z.infer<typeof insertAvailabilitySlotSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Project with client and stage information for display
export type ProjectWithClientAndStage = Project & {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  stage?: {
    id: string;
    name: string;
    color: string;
    isDefault: boolean;
  } | null;
};

// Contact with projects for display
export type ContactWithProjects = Contact & {
  projects: Project[];
};

// Contact with stage information for display
export type ContactWithStage = Contact & {
  stage?: {
    id: string;
    name: string;
    color: string;
    isDefault: boolean;
  } | null;
};

// Timeline event types for client history
export type TimelineEvent = 
  | {
      type: 'activity';
      id: string;
      title: string;
      description?: string;
      activityType: string;
      metadata?: any;
      createdAt: Date;
    }
  | {
      type: 'email';
      id: string;
      title: string;
      description: string;
      status: string;
      sentAt?: Date;
      openedAt?: Date;
      clickedAt?: Date;
      bouncedAt?: Date;
      createdAt: Date;
      // Enhanced fields
      templateName?: string;
      templateSubject?: string;
      templatePreview?: string;
      automationName?: string;
    }
  | {
      type: 'sms';
      id: string;
      title: string;
      description: string;
      status: string;
      sentAt?: Date;
      deliveredAt?: Date;
      createdAt: Date;
      // Enhanced fields
      templateName?: string;
      templatePreview?: string;
      automationName?: string;
    }
  | {
      type: 'proposal';
      id: string;
      title: string;
      description: string;
      status: string;
      totalCents: number;
      sentAt?: Date;
      signedAt?: Date;
      createdAt: Date;
    }
  | {
      type: 'payment';
      id: string;
      title: string;
      description: string;
      status: string;
      amountCents: number;
      method: string;
      completedAt?: Date;
      createdAt: Date;
    }
  | {
      type: 'message';
      id: string;
      title: string;
      description: string;
      channel: string;
      sentByPhotographer: boolean;
      createdAt: Date;
    };

// Insert schemas for new Stripe Connect tables
export const insertPhotographerEarningsSchema = createInsertSchema(photographerEarnings).omit({
  id: true,
  createdAt: true
});

// Drip Campaign Schemas
export const insertDripCampaignSchema = createInsertSchema(dripCampaigns).omit({
  id: true,
  createdAt: true
});

export const insertDripCampaignEmailSchema = createInsertSchema(dripCampaignEmails).omit({
  id: true,
  createdAt: true
});

export const insertDripCampaignSubscriptionSchema = createInsertSchema(dripCampaignSubscriptions).omit({
  id: true,
  startedAt: true
});

export const insertDripCampaignVersionHistorySchema = createInsertSchema(dripCampaignVersionHistory).omit({
  id: true,
  createdAt: true
});

export const insertDripEmailDeliverySchema = createInsertSchema(dripEmailDeliveries).omit({
  id: true,
  createdAt: true
});

export const insertStaticCampaignSettingsSchema = createInsertSchema(staticCampaignSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Drip Campaign Types
export type DripCampaign = typeof dripCampaigns.$inferSelect;
export type InsertDripCampaign = z.infer<typeof insertDripCampaignSchema>;
export type DripCampaignEmail = typeof dripCampaignEmails.$inferSelect;
export type InsertDripCampaignEmail = z.infer<typeof insertDripCampaignEmailSchema>;
export type DripCampaignSubscription = typeof dripCampaignSubscriptions.$inferSelect;
export type InsertDripCampaignSubscription = z.infer<typeof insertDripCampaignSubscriptionSchema>;
export type DripCampaignVersionHistory = typeof dripCampaignVersionHistory.$inferSelect;
export type InsertDripCampaignVersionHistory = z.infer<typeof insertDripCampaignVersionHistorySchema>;

// Enhanced drip campaign types for the UI
export type DripCampaignEmailStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type CampaignChangeType = 'CREATED' | 'EMAIL_MODIFIED' | 'EMAIL_ADDED' | 'EMAIL_REMOVED' | 'SETTINGS_CHANGED';

// Extended types for campaign management with version control
export type DripCampaignWithEmails = DripCampaign & {
  emails: DripCampaignEmail[];
  totalEmails: number;
  approvedEmails: number;
  pendingEmails: number;
};

export type DripCampaignEmailWithVersioning = DripCampaignEmail & {
  isEdited: boolean;
  lastEditor?: string;
  versionHistory?: DripCampaignVersionHistory[];
};
export type DripEmailDelivery = typeof dripEmailDeliveries.$inferSelect;
export type InsertDripEmailDelivery = z.infer<typeof insertDripEmailDeliverySchema>;
export type StaticCampaignSettings = typeof staticCampaignSettings.$inferSelect;
export type InsertStaticCampaignSettings = z.infer<typeof insertStaticCampaignSettingsSchema>;

// Drip Campaign with Relations
export type DripCampaignWithEmails = DripCampaign & {
  emails: DripCampaignEmail[];
};

export type DripCampaignSubscriptionWithDetails = DripCampaignSubscription & {
  campaign: DripCampaign;
  project: {
    title: string;
    eventDate: Date | null;
  };
  client: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
};

export const insertPhotographerPayoutsSchema = createInsertSchema(photographerPayouts).omit({
  id: true,
  createdAt: true
});

// Types for new Stripe Connect tables
export type PhotographerEarnings = typeof photographerEarnings.$inferSelect;
export type InsertPhotographerEarnings = z.infer<typeof insertPhotographerEarningsSchema>;

export type PhotographerPayouts = typeof photographerPayouts.$inferSelect;
export type InsertPhotographerPayouts = z.infer<typeof insertPhotographerPayoutsSchema>;

// Stripe Connect request validation schemas
export const createOnboardingLinkSchema = z.object({
  returnUrl: z.string().url().optional(),
  refreshUrl: z.string().url().optional()
});

export const createPayoutSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default('USD'),
  method: z.enum(['standard', 'instant']).default('standard')
});

// Short Link Types
export type ShortLink = typeof shortLinks.$inferSelect;
export type InsertShortLink = z.infer<typeof insertShortLinkSchema>;

// Lead Form Types
export type LeadForm = typeof leadForms.$inferSelect;
export type InsertLeadForm = z.infer<typeof insertLeadFormSchema>;

// Smart Files Types
export type SmartFile = typeof smartFiles.$inferSelect;
export type InsertSmartFile = z.infer<typeof insertSmartFileSchema>;

// Advertising System Schemas
export const insertAdCampaignSchema = createInsertSchema(adCampaigns).omit({
  id: true,
  currentSpendCents: true,
  totalLeadsGenerated: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true
});

export const insertAdPaymentMethodSchema = createInsertSchema(adPaymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAdPerformanceSchema = createInsertSchema(adPerformance).omit({
  id: true,
  createdAt: true
});

export const insertAdBillingTransactionSchema = createInsertSchema(adBillingTransactions).omit({
  id: true,
  createdAt: true
});

// Advertising System Types
export type AdCampaign = typeof adCampaigns.$inferSelect;
export type InsertAdCampaign = z.infer<typeof insertAdCampaignSchema>;
export type AdPaymentMethod = typeof adPaymentMethods.$inferSelect;
export type InsertAdPaymentMethod = z.infer<typeof insertAdPaymentMethodSchema>;
export type AdPerformance = typeof adPerformance.$inferSelect;
export type InsertAdPerformance = z.infer<typeof insertAdPerformanceSchema>;
export type AdBillingTransaction = typeof adBillingTransactions.$inferSelect;
export type InsertAdBillingTransaction = z.infer<typeof insertAdBillingTransactionSchema>;

// Extended types for ad campaign management
export type AdCampaignWithPerformance = AdCampaign & {
  totalImpressions: number;
  totalClicks: number;
  totalLeads: number;
  averageCostPerLead: number;
  clickThroughRate: number;
};
export type SmartFilePage = typeof smartFilePages.$inferSelect;
export type InsertSmartFilePage = z.infer<typeof insertSmartFilePageSchema>;
export type ProjectSmartFile = typeof projectSmartFiles.$inferSelect;
export type InsertProjectSmartFile = z.infer<typeof insertProjectSmartFileSchema>;

// Smart File with pages
export type SmartFileWithPages = SmartFile & {
  pages: SmartFilePage[];
};

// Project Smart File with relations
export type ProjectSmartFileWithRelations = ProjectSmartFile & {
  project: {
    title: string;
    eventDate: Date | null;
  };
  client: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
};

