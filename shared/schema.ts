import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, json, uuid } from "drizzle-orm/pg-core";
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
  SMS: "SMS"
} as const;

// Tables
export const photographers = pgTable("photographers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  logoUrl: text("logo_url"),
  brandPrimary: text("brand_primary"),
  brandSecondary: text("brand_secondary"),
  emailFromName: text("email_from_name"),
  emailFromAddr: text("email_from_addr"),
  timezone: text("timezone").notNull().default("America/New_York"),
  createdAt: timestamp("created_at").defaultNow()
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  photographerId: varchar("photographer_id").references(() => photographers.id),
  clientId: varchar("client_id"),
  createdAt: timestamp("created_at").defaultNow()
});

export const stages = pgTable("stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull(),
  isDefault: boolean("is_default").default(false),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  weddingDate: timestamp("wedding_date"),
  notes: text("notes"),
  stageId: varchar("stage_id").references(() => stages.id),
  stageEnteredAt: timestamp("stage_entered_at"),
  smsOptIn: boolean("sms_opt_in").default(false),
  emailOptIn: boolean("email_opt_in").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  name: text("name").notNull(),
  channel: text("channel").notNull(),
  subject: text("subject"),
  htmlBody: text("html_body"),
  textBody: text("text_body"),
  createdAt: timestamp("created_at").defaultNow()
});

export const automations = pgTable("automations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  name: text("name").notNull(),
  stageId: varchar("stage_id").references(() => stages.id),
  channel: text("channel").notNull(),
  enabled: boolean("enabled").default(true)
});

export const automationSteps = pgTable("automation_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  automationId: varchar("automation_id").notNull().references(() => automations.id),
  stepIndex: integer("step_index").notNull(),
  delayMinutes: integer("delay_minutes").notNull(),
  templateId: varchar("template_id").references(() => templates.id),
  enabled: boolean("enabled").default(true),
  quietHoursStart: integer("quiet_hours_start"),
  quietHoursEnd: integer("quiet_hours_end")
});

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
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
  clientId: varchar("client_id").notNull().references(() => clients.id),
  automationStepId: varchar("automation_step_id").references(() => automationSteps.id),
  status: text("status").notNull(),
  providerId: text("provider_id"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at")
});

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

export const clientChecklistItems = pgTable("client_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
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

export const clientQuestionnaires = pgTable("client_questionnaires", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  templateId: varchar("template_id").notNull().references(() => questionnaireTemplates.id),
  status: text("status").default("PENDING"),
  answers: json("answers"),
  completedAt: timestamp("completed_at")
});

export const availabilitySlots = pgTable("availability_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  isBooked: boolean("is_booked").default(false)
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  clientId: varchar("client_id").references(() => clients.id),
  title: text("title").notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: text("status").default("PENDING"),
  createdAt: timestamp("created_at").defaultNow()
});

export const estimates = pgTable("estimates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  title: text("title").notNull(),
  notes: text("notes"),
  currency: text("currency").default("USD"),
  subtotalCents: integer("subtotal_cents").default(0),
  discountCents: integer("discount_cents").default(0),
  taxCents: integer("tax_cents").default(0),
  totalCents: integer("total_cents").default(0),
  depositPercent: integer("deposit_percent"),
  depositCents: integer("deposit_cents"),
  status: text("status").default("DRAFT"),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  signedAt: timestamp("signed_at"),
  signedByName: text("signed_by_name"),
  signedByEmail: text("signed_by_email"),
  signedIp: text("signed_ip"),
  signedUserAgent: text("signed_user_agent"),
  signatureImageUrl: text("signature_image_url"),
  token: varchar("token").default(sql`gen_random_uuid()`)
});

export const estimateItems = pgTable("estimate_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estimateId: varchar("estimate_id").notNull().references(() => estimates.id),
  name: text("name").notNull(),
  description: text("description"),
  qty: integer("qty").default(1),
  unitCents: integer("unit_cents").default(0),
  lineTotalCents: integer("line_total_cents").default(0),
  orderIndex: integer("order_index").default(0)
});

export const estimatePayments = pgTable("estimate_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estimateId: varchar("estimate_id").notNull().references(() => estimates.id),
  amountCents: integer("amount_cents").notNull(),
  method: text("method").notNull(),
  status: text("status").notNull(),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  photographerId: varchar("photographer_id").notNull().references(() => photographers.id),
  content: text("content").notNull(),
  sentByPhotographer: boolean("sent_by_photographer").notNull(),
  channel: text("channel").notNull(), // EMAIL, SMS, INTERNAL
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const clientActivityLog = pgTable("client_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
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
  clientId: varchar("client_id").notNull().references(() => clients.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow()
});

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
  clients: many(clients),
  estimates: many(estimates),
  bookings: many(bookings),
  messages: many(messages)
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
  clients: many(clients),
  automations: many(automations)
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  photographer: one(photographers, {
    fields: [clients.photographerId],
    references: [photographers.id]
  }),
  stage: one(stages, {
    fields: [clients.stageId],
    references: [stages.id]
  }),
  emailLogs: many(emailLogs),
  smsLogs: many(smsLogs),
  checklistItems: many(clientChecklistItems),
  questionnaires: many(clientQuestionnaires),
  estimates: many(estimates),
  bookings: many(bookings),
  messages: many(messages),
  activityLog: many(clientActivityLog)
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
  steps: many(automationSteps)
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
  client: one(clients, {
    fields: [emailLogs.clientId],
    references: [clients.id]
  }),
  automationStep: one(automationSteps, {
    fields: [emailLogs.automationStepId],
    references: [automationSteps.id]
  })
}));

export const smsLogsRelations = relations(smsLogs, ({ one }) => ({
  client: one(clients, {
    fields: [smsLogs.clientId],
    references: [clients.id]
  }),
  automationStep: one(automationSteps, {
    fields: [smsLogs.automationStepId],
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

export const questionnaireTemplatesRelations = relations(questionnaireTemplates, ({ one, many }) => ({
  photographer: one(photographers, {
    fields: [questionnaireTemplates.photographerId],
    references: [photographers.id]
  }),
  questions: many(questionnaireQuestions),
  clientQuestionnaires: many(clientQuestionnaires)
}));

export const questionnaireQuestionsRelations = relations(questionnaireQuestions, ({ one }) => ({
  template: one(questionnaireTemplates, {
    fields: [questionnaireQuestions.templateId],
    references: [questionnaireTemplates.id]
  })
}));

export const clientQuestionnairesRelations = relations(clientQuestionnaires, ({ one }) => ({
  client: one(clients, {
    fields: [clientQuestionnaires.clientId],
    references: [clients.id]
  }),
  template: one(questionnaireTemplates, {
    fields: [clientQuestionnaires.templateId],
    references: [questionnaireTemplates.id]
  })
}));

export const estimatesRelations = relations(estimates, ({ one, many }) => ({
  photographer: one(photographers, {
    fields: [estimates.photographerId],
    references: [photographers.id]
  }),
  client: one(clients, {
    fields: [estimates.clientId],
    references: [clients.id]
  }),
  items: many(estimateItems),
  payments: many(estimatePayments)
}));

export const estimateItemsRelations = relations(estimateItems, ({ one }) => ({
  estimate: one(estimates, {
    fields: [estimateItems.estimateId],
    references: [estimates.id]
  })
}));

export const estimatePaymentsRelations = relations(estimatePayments, ({ one }) => ({
  estimate: one(estimates, {
    fields: [estimatePayments.estimateId],
    references: [estimates.id]
  })
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  photographer: one(photographers, {
    fields: [bookings.photographerId],
    references: [photographers.id]
  }),
  client: one(clients, {
    fields: [bookings.clientId],
    references: [clients.id]
  })
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  client: one(clients, {
    fields: [messages.clientId],
    references: [clients.id]
  }),
  photographer: one(photographers, {
    fields: [messages.photographerId],
    references: [photographers.id]
  })
}));

export const clientActivityLogRelations = relations(clientActivityLog, ({ one }) => ({
  client: one(clients, {
    fields: [clientActivityLog.clientId],
    references: [clients.id]
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

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  stageEnteredAt: true
}).extend({
  weddingDate: z.string().optional().transform((val) => val ? new Date(val) : undefined)
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

export const insertAutomationStepSchema = createInsertSchema(automationSteps).omit({
  id: true
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true
});

export const insertEstimateSchema = createInsertSchema(estimates).omit({
  id: true,
  createdAt: true,
  token: true
}).extend({
  validUntil: z.string().optional().transform((val) => val && val.trim() !== '' ? new Date(val) : undefined)
});

export const insertQuestionnaireTemplateSchema = createInsertSchema(questionnaireTemplates).omit({
  id: true,
  createdAt: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
});

export const insertClientActivityLogSchema = createInsertSchema(clientActivityLog).omit({
  id: true,
  createdAt: true
});
export const insertClientPortalTokenSchema = createInsertSchema(clientPortalTokens).omit({
  id: true,
  createdAt: true
});

// Type exports
export type Photographer = typeof photographers.$inferSelect;
export type InsertPhotographer = z.infer<typeof insertPhotographerSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Stage = typeof stages.$inferSelect;
export type InsertStage = z.infer<typeof insertStageSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type AutomationStep = typeof automationSteps.$inferSelect;
export type InsertAutomationStep = z.infer<typeof insertAutomationStepSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type QuestionnaireTemplate = typeof questionnaireTemplates.$inferSelect;
export type InsertQuestionnaireTemplate = z.infer<typeof insertQuestionnaireTemplateSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ClientActivityLog = typeof clientActivityLog.$inferSelect;
export type InsertClientActivityLog = z.infer<typeof insertClientActivityLogSchema>;
export type ClientPortalToken = typeof clientPortalTokens.$inferSelect;
export type InsertClientPortalToken = z.infer<typeof insertClientPortalTokenSchema>;

// Client with stage information for display
export type ClientWithStage = Client & {
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
