import { 
  photographers, users, contacts, projects, projectParticipants, stages, templates, automations, automationSteps, automationBusinessTriggers,
  emailLogs, emailHistory, smsLogs, automationExecutions, photographerLinks, checklistTemplateItems, projectChecklistItems,
  packages, packageItems, addOns, questionnaireTemplates, questionnaireQuestions, projectQuestionnaires,
  availabilitySlots, bookings,
  photographerEarnings, photographerPayouts,
  projectActivityLog, clientPortalTokens, conversationReads,
  dailyAvailabilityTemplates, dailyAvailabilityBreaks, dailyAvailabilityOverrides,
  dripCampaigns, dripCampaignEmails, dripCampaignSubscriptions, dripEmailDeliveries, staticCampaignSettings,
  shortLinks, adminActivityLog,
  leadForms,
  smartFiles, smartFilePages, projectSmartFiles,
  type User, type InsertUser, type Photographer, type InsertPhotographer,
  type AdminActivityLog, type InsertAdminActivityLog,
  type Contact, type InsertContact, type Project, type InsertProject, type ProjectParticipant, type InsertProjectParticipant, type ProjectWithClientAndStage, type ContactWithProjects, type Stage, type InsertStage,
  type Template, type InsertTemplate, type Automation, type InsertAutomation,
  type AutomationStep, type InsertAutomationStep, type AutomationBusinessTrigger, type InsertAutomationBusinessTrigger, type Package, type InsertPackage, type AddOn, type InsertAddOn,
  type PhotographerEarnings, type InsertPhotographerEarnings,
  type PhotographerPayouts, type InsertPhotographerPayouts,
  type QuestionnaireTemplate, type InsertQuestionnaireTemplate,
  type QuestionnaireQuestion, type InsertQuestionnaireQuestion,
  type ProjectQuestionnaire,
  type SmsLog, type InsertSmsLog, type EmailHistory, type InsertEmailHistory, type ProjectActivityLog, type TimelineEvent, type ClientPortalToken, type InsertClientPortalToken,
  type ConversationRead, type InsertConversationRead,
  type DailyAvailabilityTemplate, type InsertDailyAvailabilityTemplate,
  type DailyAvailabilityBreak, type InsertDailyAvailabilityBreak,
  type DailyAvailabilityOverride, type InsertDailyAvailabilityOverride,
  type AvailabilitySlot, type InsertAvailabilitySlot,
  type Booking, type InsertBooking,
  type DripCampaign, type InsertDripCampaign, type DripCampaignWithEmails,
  type DripCampaignEmail, type InsertDripCampaignEmail,
  type DripCampaignSubscription, type InsertDripCampaignSubscription, type DripCampaignSubscriptionWithDetails,
  type DripEmailDelivery, type InsertDripEmailDelivery,
  type StaticCampaignSettings, type InsertStaticCampaignSettings,
  type ShortLink, type InsertShortLink,
  type LeadForm, type InsertLeadForm,
  type SmartFile, type InsertSmartFile,
  type SmartFilePage, type InsertSmartFilePage,
  type ProjectSmartFile, type InsertProjectSmartFile,
  type SmartFileWithPages
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, inArray, gte, lte, gt, sql, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  
  // Photographers
  getAllPhotographers(): Promise<Photographer[]>;
  getPhotographer(id: string): Promise<Photographer | undefined>;
  getPhotographerByPublicToken(publicToken: string): Promise<Photographer | undefined>;
  getPhotographerCount(): Promise<number>;
  createPhotographer(photographer: InsertPhotographer): Promise<Photographer>;
  updatePhotographer(id: string, photographer: Partial<Photographer>): Promise<Photographer>;
  
  // Contacts
  getContactsByPhotographer(photographerId: string, projectType?: string): Promise<ContactWithProjects[]>;
  getContact(id: string): Promise<ContactWithProjects | undefined>;
  getContactByPhone(phone: string): Promise<Contact | undefined>;
  getContactByEmail(email: string, photographerId?: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<Contact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  
  // Projects
  getProjectsByPhotographer(photographerId: string, projectType?: string): Promise<ProjectWithClientAndStage[]>;
  getProject(id: string): Promise<ProjectWithClientAndStage | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<Project>;
  getProjectHistory(projectId: string): Promise<TimelineEvent[]>;
  
  // Project Participants
  getProjectParticipants(projectId: string): Promise<(ProjectParticipant & { client: Contact })[]>;
  getParticipantProjects(clientId: string): Promise<(ProjectParticipant & { project: ProjectWithClientAndStage })[]>;
  addProjectParticipant(participant: InsertProjectParticipant): Promise<ProjectParticipant>;
  removeProjectParticipant(projectId: string, clientId: string): Promise<void>;
  
  // Client Portal Tokens
  getClientPortalTokensByClient(clientId: string, after?: Date): Promise<ClientPortalToken[]>;
  createClientPortalToken(token: InsertClientPortalToken): Promise<ClientPortalToken>;
  validateClientPortalToken(token: string): Promise<ClientPortalToken | undefined>;
  
  // Stages
  getStagesByPhotographer(photographerId: string, projectType?: string): Promise<Stage[]>;
  createStage(stage: InsertStage): Promise<Stage>;
  updateStage(id: string, stage: Partial<Stage>): Promise<Stage>;
  deleteStage(id: string): Promise<void>;
  
  // Templates
  getTemplatesByPhotographer(photographerId: string): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<Template>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  
  // Automations
  getAutomationsByPhotographer(photographerId: string, projectType?: string): Promise<Automation[]>;
  createAutomation(automation: InsertAutomation): Promise<Automation>;
  updateAutomation(id: string, automation: Partial<Automation>): Promise<Automation>;
  deleteAutomation(id: string): Promise<void>;
  
  // Automation Steps
  getAutomationSteps(automationId: string): Promise<AutomationStep[]>;
  getAutomationStepById(id: string): Promise<AutomationStep | undefined>;
  createAutomationStep(step: InsertAutomationStep): Promise<AutomationStep>;
  updateAutomationStep(id: string, step: Partial<AutomationStep>): Promise<AutomationStep>;
  deleteAutomationStep(id: string): Promise<void>;
  
  // Business Triggers
  getBusinessTriggersByAutomation(automationId: string): Promise<AutomationBusinessTrigger[]>;
  getBusinessTriggersByPhotographer(photographerId: string): Promise<AutomationBusinessTrigger[]>;
  createBusinessTrigger(trigger: InsertAutomationBusinessTrigger): Promise<AutomationBusinessTrigger>;
  updateBusinessTrigger(id: string, trigger: Partial<AutomationBusinessTrigger>): Promise<AutomationBusinessTrigger>;
  deleteBusinessTrigger(id: string): Promise<void>;
  deleteBusinessTriggersByAutomation(automationId: string): Promise<void>;
  
  // Packages
  getPackagesByPhotographer(photographerId: string): Promise<Package[]>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, pkg: Partial<Package>): Promise<Package>;
  
  // Add-ons
  getAddOnsByPhotographer(photographerId: string): Promise<AddOn[]>;
  createAddOn(addOn: InsertAddOn): Promise<AddOn>;
  updateAddOn(id: string, addOn: Partial<AddOn>): Promise<AddOn>;
  deleteAddOn(id: string): Promise<void>;
  
  // Lead Forms
  getLeadFormsByPhotographer(photographerId: string): Promise<LeadForm[]>;
  getLeadFormById(id: string): Promise<LeadForm | undefined>;
  getLeadFormByToken(token: string): Promise<LeadForm | undefined>;
  createLeadForm(form: InsertLeadForm): Promise<LeadForm>;
  updateLeadForm(id: string, form: Partial<LeadForm>): Promise<LeadForm>;
  deleteLeadForm(id: string): Promise<void>;
  
  // Questionnaire Templates
  getQuestionnaireTemplatesByPhotographer(photographerId: string): Promise<QuestionnaireTemplate[]>;
  getQuestionnaireTemplate(id: string): Promise<QuestionnaireTemplate | undefined>;
  createQuestionnaireTemplate(template: InsertQuestionnaireTemplate): Promise<QuestionnaireTemplate>;
  updateQuestionnaireTemplate(id: string, template: Partial<QuestionnaireTemplate>): Promise<QuestionnaireTemplate>;
  deleteQuestionnaireTemplate(id: string): Promise<void>;
  
  // Questionnaire Questions
  getQuestionnaireQuestionsByTemplate(templateId: string): Promise<QuestionnaireQuestion[]>;
  getQuestionnaireQuestionById(id: string): Promise<QuestionnaireQuestion | undefined>;
  createQuestionnaireQuestion(question: InsertQuestionnaireQuestion): Promise<QuestionnaireQuestion>;
  updateQuestionnaireQuestion(id: string, question: Partial<QuestionnaireQuestion>): Promise<QuestionnaireQuestion>;
  deleteQuestionnaireQuestion(id: string): Promise<void>;
  
  // Project Questionnaires (Assignments)
  getProjectQuestionnairesByProject(projectId: string): Promise<ProjectQuestionnaire[]>;
  getProjectQuestionnairesByPhotographer(photographerId: string): Promise<ProjectQuestionnaire[]>;
  getProjectQuestionnaire(id: string): Promise<ProjectQuestionnaire | undefined>;
  assignQuestionnaireToProject(projectId: string, templateId: string): Promise<ProjectQuestionnaire>;
  updateProjectQuestionnaire(id: string, data: Partial<ProjectQuestionnaire>): Promise<ProjectQuestionnaire>;
  deleteProjectQuestionnaire(id: string): Promise<void>;
  
  // Bookings
  getBookingsByPhotographer(photographerId: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingByToken(token: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, booking: Partial<Booking>): Promise<Booking>;
  deleteBooking(id: string): Promise<void>;
  
  // Short Links
  getShortLink(shortCode: string): Promise<ShortLink | undefined>;
  getShortLinksByPhotographer(photographerId: string): Promise<ShortLink[]>;
  createShortLink(shortLink: InsertShortLink): Promise<ShortLink>;
  incrementShortLinkClicks(shortCode: string): Promise<void>;

  // Daily Availability Templates
  getDailyAvailabilityTemplatesByPhotographer(photographerId: string): Promise<DailyAvailabilityTemplate[]>;
  getDailyAvailabilityTemplate(id: string): Promise<DailyAvailabilityTemplate | undefined>;
  createDailyAvailabilityTemplate(template: InsertDailyAvailabilityTemplate): Promise<DailyAvailabilityTemplate>;
  updateDailyAvailabilityTemplate(id: string, template: Partial<DailyAvailabilityTemplate>): Promise<DailyAvailabilityTemplate>;
  deleteDailyAvailabilityTemplate(id: string): Promise<void>;
  
  // Daily Availability Breaks
  getDailyAvailabilityBreaksByTemplate(templateId: string): Promise<DailyAvailabilityBreak[]>;
  getDailyAvailabilityBreak(id: string): Promise<DailyAvailabilityBreak | undefined>;
  createDailyAvailabilityBreak(breakTime: InsertDailyAvailabilityBreak): Promise<DailyAvailabilityBreak>;
  updateDailyAvailabilityBreak(id: string, breakTime: Partial<DailyAvailabilityBreak>): Promise<DailyAvailabilityBreak>;
  deleteDailyAvailabilityBreak(id: string): Promise<void>;
  
  // Daily Availability Overrides
  getDailyAvailabilityOverridesByPhotographer(photographerId: string, startDate?: string, endDate?: string): Promise<DailyAvailabilityOverride[]>;
  getDailyAvailabilityOverrideByDate(photographerId: string, date: string): Promise<DailyAvailabilityOverride | undefined>;
  getDailyAvailabilityOverride(id: string): Promise<DailyAvailabilityOverride | undefined>;
  createDailyAvailabilityOverride(override: InsertDailyAvailabilityOverride): Promise<DailyAvailabilityOverride>;
  updateDailyAvailabilityOverride(id: string, override: Partial<DailyAvailabilityOverride>): Promise<DailyAvailabilityOverride>;
  deleteDailyAvailabilityOverride(id: string): Promise<void>;

  // Availability Slots (read-only - legacy data access)
  getAvailabilitySlotsByPhotographer(photographerId: string): Promise<AvailabilitySlot[]>;
  getAvailabilitySlot(id: string): Promise<AvailabilitySlot | undefined>;
  createAvailabilitySlotsBatch(slots: InsertAvailabilitySlot[]): Promise<AvailabilitySlot[]>;
  // Old CRUD methods removed - use template-based system instead

  // Google Calendar Integration
  storeGoogleCalendarCredentials(photographerId: string, credentials: {
    accessToken: string;
    refreshToken?: string;
    expiryDate?: Date;
    scope?: string;
    calendarId?: string;
    email?: string;
  }): Promise<void>;
  getGoogleCalendarCredentials(photographerId: string): Promise<{
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: Date;
    scope?: string;
    connectedAt?: Date;
    calendarId?: string;
    email?: string;
  } | null>;
  clearGoogleCalendarCredentials(photographerId: string): Promise<void>;
  hasValidGoogleCalendarCredentials(photographerId: string): Promise<boolean>;
  storeGoogleCalendarId(photographerId: string, calendarId: string): Promise<void>;

  // Stripe Connect Integration
  updatePhotographerStripeAccount(photographerId: string, stripeData: {
    stripeConnectAccountId?: string;
    stripeAccountStatus?: string;
    payoutEnabled?: boolean;
    onboardingCompleted?: boolean;
    stripeOnboardingCompletedAt?: Date;
    platformFeePercent?: number;
  }): Promise<void>;
  
  // Photographer Earnings
  getEarningsByPhotographer(photographerId: string): Promise<PhotographerEarnings[]>;
  getEarningsByProject(projectId: string): Promise<PhotographerEarnings[]>;
  getEarningsByPaymentIntentId(paymentIntentId: string): Promise<PhotographerEarnings | undefined>;
  getEarningsByTransferId(transferId: string): Promise<PhotographerEarnings | undefined>;
  createEarnings(earnings: InsertPhotographerEarnings): Promise<PhotographerEarnings>;
  updateEarnings(id: string, earnings: Partial<PhotographerEarnings>): Promise<PhotographerEarnings>;
  
  // Photographer Payouts
  getPayoutsByPhotographer(photographerId: string): Promise<PhotographerPayouts[]>;
  
  // Drip Campaigns
  getDripCampaignsByPhotographer(photographerId: string, projectType?: string): Promise<DripCampaignWithEmails[]>;
  getDripCampaign(id: string): Promise<DripCampaignWithEmails | undefined>;
  createDripCampaign(campaign: InsertDripCampaign): Promise<DripCampaign>;
  updateDripCampaign(id: string, campaign: Partial<DripCampaign>): Promise<DripCampaign>;
  deleteDripCampaign(id: string): Promise<void>;
  
  // Drip Campaign Emails
  getDripCampaignEmails(campaignId: string): Promise<DripCampaignEmail[]>;
  createDripCampaignEmail(email: InsertDripCampaignEmail): Promise<DripCampaignEmail>;
  updateDripCampaignEmail(id: string, email: Partial<DripCampaignEmail>): Promise<DripCampaignEmail>;
  deleteDripCampaignEmail(id: string): Promise<void>;
  
  // Individual Email Approval Methods
  approveEmail(emailId: string, approvedBy: string): Promise<DripCampaignEmail>;
  rejectEmail(emailId: string, rejectedBy: string, reason: string): Promise<DripCampaignEmail>;
  updateEmailContent(emailId: string, content: { subject?: string; htmlBody?: string; textBody?: string }, editedBy: string): Promise<DripCampaignEmail>;
  bulkUpdateEmailSequence(emailUpdates: Array<{ id: string; sequenceIndex: number; weeksAfterStart: number }>): Promise<void>;

  // Campaign Versioning Methods
  createCampaignVersion(campaignId: string, versionData: Partial<DripCampaign>, changedBy: string, changeDescription: string): Promise<DripCampaign>;
  getCampaignVersionHistory(campaignId: string): Promise<any[]>;
  logCampaignChange(campaignId: string, changeType: string, changeDescription: string, changedBy: string, affectedEmailId?: string, previousData?: any, newData?: any): Promise<void>;
  getDripCampaignWithEmailStats(campaignId: string): Promise<any>;
  
  // Static Campaign Settings  
  getStaticCampaignSettings(photographerId: string, projectType: string): Promise<StaticCampaignSettings | undefined>;
  saveStaticCampaignSettings(settings: InsertStaticCampaignSettings): Promise<StaticCampaignSettings>;
  
  // Drip Campaign Subscriptions
  getDripCampaignSubscriptionsByPhotographer(photographerId: string): Promise<DripCampaignSubscriptionWithDetails[]>;
  getDripCampaignSubscriptionsByCampaign(campaignId: string): Promise<DripCampaignSubscriptionWithDetails[]>;
  getDripCampaignSubscription(id: string): Promise<DripCampaignSubscriptionWithDetails | undefined>;
  createDripCampaignSubscription(subscription: InsertDripCampaignSubscription): Promise<DripCampaignSubscription>;
  updateDripCampaignSubscription(id: string, subscription: Partial<DripCampaignSubscription>): Promise<DripCampaignSubscription>;
  
  // Drip Email Deliveries
  getDripEmailDeliveriesBySubscription(subscriptionId: string): Promise<DripEmailDelivery[]>;
  createDripEmailDelivery(delivery: InsertDripEmailDelivery): Promise<DripEmailDelivery>;
  updateDripEmailDelivery(id: string, delivery: Partial<DripEmailDelivery>): Promise<DripEmailDelivery>;
  getPayoutByStripePayoutId(stripePayoutId: string): Promise<PhotographerPayouts | undefined>;
  createPayout(payout: InsertPhotographerPayouts): Promise<PhotographerPayouts>;
  updatePayout(id: string, payout: Partial<PhotographerPayouts>): Promise<PhotographerPayouts>;
  getPhotographerBalance(photographerId: string, currency?: string): Promise<{ availableCents: number; pendingCents: number }>;
  
  // SMS Logging
  createSmsLog(smsLog: InsertSmsLog): Promise<SmsLog>;
  
  // Email History
  createEmailHistory(emailHistory: InsertEmailHistory): Promise<EmailHistory>;
  getEmailHistoryByPhotographer(photographerId: string, filters?: {
    direction?: 'INBOUND' | 'OUTBOUND';
    source?: 'AUTOMATION' | 'DRIP_CAMPAIGN' | 'MANUAL' | 'CLIENT_REPLY';
    clientId?: string;
    projectId?: string;
    limit?: number;
  }): Promise<EmailHistory[]>;
  getEmailHistoryByClient(clientId: string): Promise<EmailHistory[]>;
  getEmailHistoryByProject(projectId: string): Promise<EmailHistory[]>;
  getEmailHistoryByThread(gmailThreadId: string, photographerId?: string): Promise<EmailHistory[]>;
  
  // Smart Files
  getSmartFilesByPhotographer(photographerId: string): Promise<SmartFile[]>;
  getSmartFile(id: string): Promise<SmartFileWithPages | undefined>;
  createSmartFile(smartFile: InsertSmartFile): Promise<SmartFile>;
  updateSmartFile(id: string, smartFile: Partial<SmartFile>): Promise<SmartFile>;
  deleteSmartFile(id: string): Promise<void>;
  
  // Project Smart Files
  createProjectSmartFile(projectSmartFile: InsertProjectSmartFile): Promise<ProjectSmartFile>;
  
  // Smart File Pages
  createSmartFilePage(page: InsertSmartFilePage): Promise<SmartFilePage>;
  updateSmartFilePage(id: string, page: Partial<SmartFilePage>): Promise<SmartFilePage>;
  deleteSmartFilePage(id: string): Promise<void>;
  reorderSmartFilePages(smartFileId: string, pageOrders: { id: string, pageOrder: number }[]): Promise<void>;
  
  // Project Smart Files
  getProjectSmartFilesByProject(projectId: string): Promise<ProjectSmartFile[]>;
  attachSmartFileToProject(projectSmartFile: InsertProjectSmartFile): Promise<ProjectSmartFile>;
  updateProjectSmartFile(id: string, update: Partial<ProjectSmartFile>): Promise<ProjectSmartFile>;
  deleteProjectSmartFile(id: string): Promise<void>;
  getProjectSmartFileByToken(token: string): Promise<ProjectSmartFile | undefined>;
  
  // Inbox / Conversation Reads
  getInboxConversations(photographerId: string): Promise<any[]>;
  getInboxThread(contactId: string, photographerId: string): Promise<any[]>;
  markConversationAsRead(photographerId: string, contactId: string): Promise<void>;
  getUnreadCount(photographerId: string): Promise<number>;
  upsertConversationRead(data: InsertConversationRead): Promise<ConversationRead>;
  getConversationRead(photographerId: string, contactId: string): Promise<ConversationRead | undefined>;
  
  // Admin Methods
  getAllPhotographersWithStats(): Promise<Array<Photographer & { clientCount: number }>>;
  updatePhotographerSubscription(photographerId: string, subscriptionStatus: string): Promise<Photographer>;
  logAdminActivity(activity: InsertAdminActivityLog): Promise<AdminActivityLog>;
  getAdminActivityLog(adminUserId?: string, limit?: number): Promise<AdminActivityLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllPhotographers(): Promise<Photographer[]> {
    return await db.select().from(photographers);
  }

  async getPhotographer(id: string): Promise<Photographer | undefined> {
    const [photographer] = await db.select().from(photographers).where(eq(photographers.id, id));
    return photographer || undefined;
  }

  async getPhotographerByPublicToken(publicToken: string): Promise<Photographer | undefined> {
    const [photographer] = await db.select().from(photographers).where(eq(photographers.publicToken, publicToken));
    return photographer || undefined;
  }

  async getPhotographerCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(photographers);
    return result[0]?.count || 0;
  }

  async createPhotographer(insertPhotographer: InsertPhotographer): Promise<Photographer> {
    const [photographer] = await db.insert(photographers).values(insertPhotographer).returning();
    return photographer;
  }

  async updatePhotographer(id: string, photographer: Partial<Photographer>): Promise<Photographer> {
    const [updated] = await db.update(photographers)
      .set(photographer)
      .where(eq(photographers.id, id))
      .returning();
    return updated;
  }

  async getContactsByPhotographer(photographerId: string, projectType?: string): Promise<ContactWithProjects[]> {
    // First get all contacts for this photographer
    const contactRows = await db.select()
      .from(contacts)
      .where(eq(contacts.photographerId, photographerId))
      .orderBy(desc(contacts.createdAt));

    // Then get all projects with stages for these contacts
    const contactIds = contactRows.map(c => c.id);
    
    if (contactIds.length === 0) {
      return [];
    }

    const projectRows = await db.select({
      id: projects.id,
      clientId: projects.clientId,
      title: projects.title,
      projectType: projects.projectType,
      leadSource: projects.leadSource,
      eventDate: projects.eventDate,
      status: projects.status,
      createdAt: projects.createdAt,
      stageId: projects.stageId,
      stageEnteredAt: projects.stageEnteredAt,
      stageData: {
        id: stages.id,
        name: stages.name,
        color: stages.color,
        isDefault: stages.isDefault
      }
    })
      .from(projects)
      .leftJoin(stages, eq(projects.stageId, stages.id))
      .where(projectType ? 
        and(inArray(projects.clientId, contactIds), eq(projects.projectType, projectType)) :
        inArray(projects.clientId, contactIds)
      )
      .orderBy(desc(projects.createdAt));

    // Group projects by contact and create final result
    const projectsByContact = projectRows.reduce((acc, project) => {
      if (!acc[project.clientId]) {
        acc[project.clientId] = [];
      }
      
      acc[project.clientId].push({
        id: project.id,
        clientId: project.clientId,
        title: project.title,
        projectType: project.projectType,
        leadSource: project.leadSource,
        eventDate: project.eventDate,
        status: project.status,
        createdAt: project.createdAt,
        stageId: project.stageId,
        stageEnteredAt: project.stageEnteredAt,
        photographerId: photographerId, // We know this from the query
        smsOptIn: false, // Default values - these are on projects now
        emailOptIn: true,
        notes: null
      });
      
      return acc;
    }, {} as Record<string, any[]>);

    // Sort each contact's projects by creation date (newest first) to guarantee latest project is first
    Object.keys(projectsByContact).forEach(contactId => {
      projectsByContact[contactId].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return contactRows.map(contact => ({
      ...contact,
      projects: projectsByContact[contact.id] || []
    }));
  }

  async getContact(id: string): Promise<ContactWithProjects | undefined> {
    // First get the contact
    const [contact] = await db.select()
      .from(contacts)
      .where(eq(contacts.id, id));
      
    if (!contact) return undefined;

    // Then get all projects for this contact
    const projectRows = await db.select({
      id: projects.id,
      title: projects.title,
      projectType: projects.projectType,
      leadSource: projects.leadSource,
      eventDate: projects.eventDate,
      status: projects.status,
      createdAt: projects.createdAt,
      stageId: projects.stageId,
      stageEnteredAt: projects.stageEnteredAt,
      photographerId: projects.photographerId,
      smsOptIn: projects.smsOptIn,
      emailOptIn: projects.emailOptIn,
      notes: projects.notes
    })
      .from(projects)
      .where(eq(projects.clientId, id))
      .orderBy(desc(projects.createdAt));
    
    return {
      ...contact,
      projects: projectRows
    };
  }

  async getContactByPhone(phone: string): Promise<Contact | undefined> {
    const [contact] = await db.select()
      .from(contacts)
      .where(eq(contacts.phone, phone));
    return contact || undefined;
  }

  async getContactByEmail(email: string, photographerId?: string): Promise<Contact | undefined> {
    const conditions = photographerId 
      ? and(eq(contacts.email, email), eq(contacts.photographerId, photographerId))
      : eq(contacts.email, email);
    
    const [contact] = await db.select()
      .from(contacts)
      .where(conditions);
    return contact || undefined;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    // Simply create the contact with basic info - project data is handled separately
    // Automatically set hasEventDate based on whether eventDate is provided
    const contactData = {
      ...insertContact,
      hasEventDate: !!insertContact.eventDate
    };
    const [contact] = await db.insert(contacts).values(contactData).returning();
    return contact;
  }

  async updateContact(id: string, contactUpdate: Partial<Contact>): Promise<Contact> {
    // Update basic contact info only - project data is handled separately
    // If eventDate is being updated, set hasEventDate based on whether date exists
    const updateData = {
      ...contactUpdate,
      ...(contactUpdate.eventDate !== undefined && {
        hasEventDate: !!contactUpdate.eventDate
      })
    };
    const [updated] = await db.update(contacts)
      .set(updateData)
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }

  async deleteContact(id: string): Promise<void> {
    // Atomic cascading delete - remove all related data in a transaction
    await db.transaction(async (tx) => {
      // First verify the contact exists in this transaction
      const [existingContact] = await tx.select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.id, id));
      
      if (!existingContact) {
        // Contact doesn't exist - this is fine, just return without error
        console.log(`[DELETE CONTACT] Contact ${id} not found, skipping delete`);
        return;
      }
      
      console.log(`[DELETE CONTACT] Starting cascading delete for contact ${id}`);
      
      // Get all projects for this contact
      const contactProjects = await tx.select({ id: projects.id })
        .from(projects)
        .where(eq(projects.clientId, id));
      
      const projectIds = contactProjects.map(p => p.id);
      
      if (projectIds.length > 0) {
        // Delete bookings related to these projects (batched)
        await tx.delete(bookings)
          .where(inArray(bookings.projectId, projectIds));
        
        // Delete project-related data (batched)
        await tx.delete(projectChecklistItems)
          .where(inArray(projectChecklistItems.projectId, projectIds));
        
        await tx.delete(projectQuestionnaires)
          .where(inArray(projectQuestionnaires.projectId, projectIds));
        
        await tx.delete(emailLogs)
          .where(inArray(emailLogs.projectId, projectIds));
        
        await tx.delete(smsLogs)
          .where(inArray(smsLogs.projectId, projectIds));
        
        // Delete project activity logs
        await tx.delete(projectActivityLog)
          .where(inArray(projectActivityLog.projectId, projectIds));
        
        // Delete automation executions for these projects
        await tx.delete(automationExecutions)
          .where(inArray(automationExecutions.projectId, projectIds));
        
        // Delete photographer earnings related to these projects
        await tx.delete(photographerEarnings)
          .where(inArray(photographerEarnings.projectId, projectIds));
        
        // Delete drip campaign deliveries and subscriptions related to these projects
        await tx.delete(dripEmailDeliveries)
          .where(inArray(dripEmailDeliveries.projectId, projectIds));
          
        await tx.delete(dripCampaignSubscriptions)
          .where(inArray(dripCampaignSubscriptions.projectId, projectIds));
        
        // Delete projects (batched)
        await tx.delete(projects)
          .where(inArray(projects.id, projectIds));
      }
      
      
      // Delete SMS logs directly related to contact (not just by project)
      await tx.delete(smsLogs)
        .where(eq(smsLogs.clientId, id));
      
      // Delete client portal tokens
      await tx.delete(clientPortalTokens)
        .where(eq(clientPortalTokens.clientId, id));
      
      // Finally delete the contact
      const deleteResult = await tx.delete(contacts)
        .where(eq(contacts.id, id));
      
      console.log(`[DELETE CONTACT] Successfully deleted contact ${id} and all related data`);
    });
  }

  async getStagesByPhotographer(photographerId: string, projectType?: string): Promise<Stage[]> {
    return await db.select().from(stages)
      .where(projectType ? 
        and(eq(stages.photographerId, photographerId), eq(stages.projectType, projectType)) :
        eq(stages.photographerId, photographerId)
      )
      .orderBy(asc(stages.orderIndex));
  }

  async createStage(insertStage: InsertStage): Promise<Stage> {
    const [stage] = await db.insert(stages).values(insertStage).returning();
    return stage;
  }

  async updateStage(id: string, stage: Partial<Stage>): Promise<Stage> {
    const [updated] = await db.update(stages)
      .set(stage)
      .where(eq(stages.id, id))
      .returning();
    return updated;
  }

  async deleteStage(id: string): Promise<void> {
    await db.delete(stages).where(eq(stages.id, id));
  }

  async getTemplatesByPhotographer(photographerId: string): Promise<Template[]> {
    return await db.select().from(templates)
      .where(eq(templates.photographerId, photographerId))
      .orderBy(desc(templates.createdAt));
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(insertTemplate).returning();
    return template;
  }

  async updateTemplate(id: string, template: Partial<Template>): Promise<Template> {
    const [updated] = await db.update(templates)
      .set(template)
      .where(eq(templates.id, id))
      .returning();
    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  async getAutomationsByPhotographer(photographerId: string, projectType?: string): Promise<Automation[]> {
    const result = await db.query.automations.findMany({
      where: projectType ? 
        and(eq(automations.photographerId, photographerId), eq(automations.projectType, projectType)) :
        eq(automations.photographerId, photographerId),
      with: {
        steps: {
          orderBy: (steps, { asc }) => [asc(steps.stepIndex)]
        },
        stage: true,
        targetStage: true,
        conditionStage: true,
        businessTriggers: true
      }
    });
    return result as any;
  }

  async createAutomation(insertAutomation: InsertAutomation): Promise<Automation> {
    const [automation] = await db.insert(automations).values(insertAutomation).returning();
    return automation;
  }

  async updateAutomation(id: string, automation: Partial<Automation>): Promise<Automation> {
    const [updated] = await db.update(automations)
      .set(automation)
      .where(eq(automations.id, id))
      .returning();
    return updated;
  }

  async deleteAutomation(id: string): Promise<void> {
    // Use a transaction to ensure atomicity and prevent race conditions with cron job
    await db.transaction(async (tx) => {
      // CRITICAL: Disable the automation FIRST within the transaction
      await tx.update(automations)
        .set({ enabled: false })
        .where(eq(automations.id, id));
      
      // Get all automation steps for this automation
      const steps = await tx.select().from(automationSteps)
        .where(eq(automationSteps.automationId, id));
      const stepIds = steps.map(s => s.id);
      
      // Delete all child records in proper order
      for (const stepId of stepIds) {
        await tx.execute(sql`DELETE FROM email_logs WHERE automation_step_id = ${stepId}`);
        await tx.execute(sql`DELETE FROM sms_logs WHERE automation_step_id = ${stepId}`);
      }
      
      // Delete execution records
      await tx.execute(sql`DELETE FROM automation_executions WHERE automation_id = ${id}`);
      
      // Delete steps
      await tx.execute(sql`DELETE FROM automation_steps WHERE automation_id = ${id}`);
      
      // Delete business triggers
      await tx.execute(sql`DELETE FROM automation_business_triggers WHERE automation_id = ${id}`);
      
      // Finally, delete the automation itself
      await tx.execute(sql`DELETE FROM automations WHERE id = ${id}`);
    });
  }

  async getAutomationSteps(automationId: string): Promise<AutomationStep[]> {
    return await db.select().from(automationSteps)
      .where(eq(automationSteps.automationId, automationId))
      .orderBy(automationSteps.stepIndex);
  }

  async getAutomationStepById(id: string): Promise<AutomationStep | undefined> {
    const [step] = await db.select().from(automationSteps).where(eq(automationSteps.id, id));
    return step || undefined;
  }

  async createAutomationStep(insertStep: InsertAutomationStep): Promise<AutomationStep> {
    const [step] = await db.insert(automationSteps).values(insertStep).returning();
    return step;
  }

  async updateAutomationStep(id: string, step: Partial<AutomationStep>): Promise<AutomationStep> {
    const [updated] = await db.update(automationSteps)
      .set(step)
      .where(eq(automationSteps.id, id))
      .returning();
    return updated;
  }

  async deleteAutomationStep(id: string): Promise<void> {
    await db.delete(automationSteps).where(eq(automationSteps.id, id));
  }

  // Business Trigger implementations
  async getBusinessTriggersByAutomation(automationId: string): Promise<AutomationBusinessTrigger[]> {
    return await db.select().from(automationBusinessTriggers)
      .where(eq(automationBusinessTriggers.automationId, automationId))
      .orderBy(automationBusinessTriggers.createdAt);
  }

  async getBusinessTriggersByPhotographer(photographerId: string): Promise<AutomationBusinessTrigger[]> {
    return await db.select({
      id: automationBusinessTriggers.id,
      automationId: automationBusinessTriggers.automationId,
      triggerType: automationBusinessTriggers.triggerType,
      enabled: automationBusinessTriggers.enabled,
      minAmountCents: automationBusinessTriggers.minAmountCents,
      projectType: automationBusinessTriggers.projectType,
      createdAt: automationBusinessTriggers.createdAt
    })
    .from(automationBusinessTriggers)
    .innerJoin(automations, eq(automations.id, automationBusinessTriggers.automationId))
    .where(eq(automations.photographerId, photographerId))
    .orderBy(automationBusinessTriggers.createdAt);
  }

  async createBusinessTrigger(trigger: InsertAutomationBusinessTrigger): Promise<AutomationBusinessTrigger> {
    const [created] = await db.insert(automationBusinessTriggers).values(trigger).returning();
    return created;
  }

  async updateBusinessTrigger(id: string, trigger: Partial<AutomationBusinessTrigger>): Promise<AutomationBusinessTrigger> {
    const [updated] = await db.update(automationBusinessTriggers)
      .set(trigger)
      .where(eq(automationBusinessTriggers.id, id))
      .returning();
    return updated;
  }

  async deleteBusinessTrigger(id: string): Promise<void> {
    await db.delete(automationBusinessTriggers).where(eq(automationBusinessTriggers.id, id));
  }

  async deleteBusinessTriggersByAutomation(automationId: string): Promise<void> {
    await db.delete(automationBusinessTriggers).where(eq(automationBusinessTriggers.automationId, automationId));
  }

  async getPackagesByPhotographer(photographerId: string): Promise<Package[]> {
    return await db.select().from(packages)
      .where(eq(packages.photographerId, photographerId))
      .orderBy(desc(packages.createdAt));
  }

  async createPackage(insertPackage: InsertPackage): Promise<Package> {
    const [pkg] = await db.insert(packages).values(insertPackage).returning();
    return pkg;
  }

  async updatePackage(id: string, pkg: Partial<Package>): Promise<Package> {
    const [updated] = await db.update(packages)
      .set(pkg)
      .where(eq(packages.id, id))
      .returning();
    return updated;
  }

  async getAddOnsByPhotographer(photographerId: string): Promise<AddOn[]> {
    return await db.select().from(addOns)
      .where(eq(addOns.photographerId, photographerId))
      .orderBy(desc(addOns.createdAt));
  }

  async createAddOn(insertAddOn: InsertAddOn): Promise<AddOn> {
    const [addOn] = await db.insert(addOns).values(insertAddOn).returning();
    return addOn;
  }

  async updateAddOn(id: string, addOn: Partial<AddOn>): Promise<AddOn> {
    const [updated] = await db.update(addOns)
      .set(addOn)
      .where(eq(addOns.id, id))
      .returning();
    return updated;
  }

  async deleteAddOn(id: string): Promise<void> {
    await db.delete(addOns).where(eq(addOns.id, id));
  }

  async getLeadFormsByPhotographer(photographerId: string): Promise<LeadForm[]> {
    return await db.select().from(leadForms)
      .where(eq(leadForms.photographerId, photographerId))
      .orderBy(desc(leadForms.createdAt));
  }

  async getLeadFormById(id: string): Promise<LeadForm | undefined> {
    const [form] = await db.select().from(leadForms).where(eq(leadForms.id, id));
    return form || undefined;
  }

  async getLeadFormByToken(token: string): Promise<LeadForm | undefined> {
    const [form] = await db.select().from(leadForms).where(eq(leadForms.publicToken, token));
    return form || undefined;
  }

  async createLeadForm(insertForm: InsertLeadForm): Promise<LeadForm> {
    const [form] = await db.insert(leadForms).values(insertForm).returning();
    return form;
  }

  async updateLeadForm(id: string, form: Partial<LeadForm>): Promise<LeadForm> {
    const [updated] = await db.update(leadForms)
      .set({ ...form, updatedAt: new Date() })
      .where(eq(leadForms.id, id))
      .returning();
    return updated;
  }

  async deleteLeadForm(id: string): Promise<void> {
    await db.delete(leadForms).where(eq(leadForms.id, id));
  }

  async getQuestionnaireTemplatesByPhotographer(photographerId: string): Promise<QuestionnaireTemplate[]> {
    return await db.select().from(questionnaireTemplates)
      .where(eq(questionnaireTemplates.photographerId, photographerId))
      .orderBy(desc(questionnaireTemplates.createdAt));
  }

  async createQuestionnaireTemplate(insertTemplate: InsertQuestionnaireTemplate): Promise<QuestionnaireTemplate> {
    const [template] = await db.insert(questionnaireTemplates).values(insertTemplate).returning();
    return template;
  }

  async getQuestionnaireTemplate(id: string): Promise<QuestionnaireTemplate | undefined> {
    const [template] = await db.select().from(questionnaireTemplates).where(eq(questionnaireTemplates.id, id));
    return template || undefined;
  }

  async updateQuestionnaireTemplate(id: string, template: Partial<QuestionnaireTemplate>): Promise<QuestionnaireTemplate> {
    const [updated] = await db.update(questionnaireTemplates)
      .set(template)
      .where(eq(questionnaireTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteQuestionnaireTemplate(id: string): Promise<void> {
    // Delete questions first (foreign key constraint)
    await db.delete(questionnaireQuestions).where(eq(questionnaireQuestions.templateId, id));
    
    // Delete client questionnaires
    await db.delete(clientQuestionnaires).where(eq(clientQuestionnaires.templateId, id));
    
    // Delete the template itself
    await db.delete(questionnaireTemplates).where(eq(questionnaireTemplates.id, id));
  }

  async getQuestionnaireQuestionsByTemplate(templateId: string): Promise<QuestionnaireQuestion[]> {
    return await db.select().from(questionnaireQuestions)
      .where(eq(questionnaireQuestions.templateId, templateId))
      .orderBy(asc(questionnaireQuestions.orderIndex));
  }

  async getQuestionnaireQuestionById(id: string): Promise<QuestionnaireQuestion | undefined> {
    const [question] = await db.select().from(questionnaireQuestions)
      .where(eq(questionnaireQuestions.id, id));
    return question || undefined;
  }

  async createQuestionnaireQuestion(insertQuestion: InsertQuestionnaireQuestion): Promise<QuestionnaireQuestion> {
    const [question] = await db.insert(questionnaireQuestions).values(insertQuestion).returning();
    return question;
  }

  async updateQuestionnaireQuestion(id: string, question: Partial<QuestionnaireQuestion>): Promise<QuestionnaireQuestion> {
    const [updated] = await db.update(questionnaireQuestions)
      .set(question)
      .where(eq(questionnaireQuestions.id, id))
      .returning();
    return updated;
  }

  async deleteQuestionnaireQuestion(id: string): Promise<void> {
    await db.delete(questionnaireQuestions).where(eq(questionnaireQuestions.id, id));
  }

  // Project Questionnaires (Assignments)
  async getProjectQuestionnairesByProject(projectId: string): Promise<ProjectQuestionnaire[]> {
    return await db.select().from(projectQuestionnaires)
      .where(eq(projectQuestionnaires.projectId, projectId));
  }

  async getProjectQuestionnairesWithTemplates(projectId: string): Promise<any[]> {
    return await db.select({
      id: projectQuestionnaires.id,
      templateId: projectQuestionnaires.templateId,
      answers: projectQuestionnaires.answers,
      submittedAt: projectQuestionnaires.submittedAt,
      createdAt: projectQuestionnaires.createdAt,
      templateTitle: questionnaireTemplates.title
    })
    .from(projectQuestionnaires)
    .innerJoin(questionnaireTemplates, eq(projectQuestionnaires.templateId, questionnaireTemplates.id))
    .where(eq(projectQuestionnaires.projectId, projectId));
  }

  async getProjectQuestionnairesByPhotographer(photographerId: string): Promise<ProjectQuestionnaire[]> {
    return await db.select({
      id: projectQuestionnaires.id,
      projectId: projectQuestionnaires.projectId,
      templateId: projectQuestionnaires.templateId,
      answers: projectQuestionnaires.answers,
      submittedAt: projectQuestionnaires.submittedAt,
      createdAt: projectQuestionnaires.createdAt,
      clientName: sql<string>`${contacts.firstName} || ' ' || ${contacts.lastName}`,
      templateTitle: questionnaireTemplates.title,
      projectType: projects.projectType
    })
    .from(projectQuestionnaires)
    .innerJoin(projects, eq(projectQuestionnaires.projectId, projects.id))
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .innerJoin(questionnaireTemplates, eq(projectQuestionnaires.templateId, questionnaireTemplates.id))
    .where(eq(projects.photographerId, photographerId));
  }

  async getProjectQuestionnaire(id: string): Promise<ProjectQuestionnaire | undefined> {
    const [questionnaire] = await db.select().from(projectQuestionnaires)
      .where(eq(projectQuestionnaires.id, id));
    return questionnaire || undefined;
  }

  async assignQuestionnaireToProject(projectId: string, templateId: string): Promise<ProjectQuestionnaire> {
    const [assigned] = await db.insert(projectQuestionnaires).values({
      projectId,
      templateId
    }).returning();
    return assigned;
  }

  async updateProjectQuestionnaire(id: string, data: Partial<ProjectQuestionnaire>): Promise<ProjectQuestionnaire> {
    const [updated] = await db.update(projectQuestionnaires)
      .set(data)
      .where(eq(projectQuestionnaires.id, id))
      .returning();
    return updated;
  }

  async deleteProjectQuestionnaire(id: string): Promise<void> {
    await db.delete(projectQuestionnaires).where(eq(projectQuestionnaires.id, id));
  }

  // Project Activity Log
  async addProjectActivityLog(logEntry: {
    projectId: string;
    action: string;
    activityType: string;
    title: string;
    description?: string;
    metadata?: any;
    relatedId?: string;
    relatedType?: string;
  }): Promise<void> {
    await db.insert(projectActivityLog).values(logEntry);
  }

  // Client-specific questionnaire queries
  async getQuestionnairesByClient(clientId: string): Promise<any[]> {
    return await db.select({
      id: projectQuestionnaires.id,
      templateId: projectQuestionnaires.templateId,
      answers: projectQuestionnaires.answers,
      submittedAt: projectQuestionnaires.submittedAt,
      createdAt: projectQuestionnaires.createdAt,
      templateTitle: questionnaireTemplates.title,
      templateDescription: questionnaireTemplates.description
    })
    .from(projectQuestionnaires)
    .innerJoin(projects, eq(projectQuestionnaires.projectId, projects.id))
    .innerJoin(questionnaireTemplates, eq(projectQuestionnaires.templateId, questionnaireTemplates.id))
    .where(eq(projects.clientId, clientId));
  }

  async getProjectsByClient(clientId: string): Promise<any[]> {
    return await db.select({
      id: projects.id,
      title: projects.title,
      projectType: projects.projectType,
      eventDate: projects.eventDate,
      notes: projects.notes,
      status: projects.status,
      createdAt: projects.createdAt,
      client: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone
      },
      stage: {
        id: stages.id,
        name: stages.name
      }
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .leftJoin(stages, eq(projects.stageId, stages.id))
    .where(eq(projects.clientId, clientId));
  }

  async getClientHistory(clientId: string): Promise<TimelineEvent[]> {
    // Parallelize all queries for better performance
    const [activityLogs, emailLogEntries, smsLogEntries, messageHistory] = await Promise.all([
      // Get activity log entries for all projects belonging to this client
      db.select({
        id: projectActivityLog.id,
        activityType: projectActivityLog.activityType,
        title: projectActivityLog.title,
        description: projectActivityLog.description,
        metadata: projectActivityLog.metadata,
        relatedId: projectActivityLog.relatedId,
        relatedType: projectActivityLog.relatedType,
        createdAt: projectActivityLog.createdAt,
        projectId: projectActivityLog.projectId
      }).from(projectActivityLog)
        .innerJoin(projects, eq(projectActivityLog.projectId, projects.id))
        .where(eq(projects.clientId, clientId)),
      
      // Get email logs with template information
      db.select({
        id: emailLogs.id,
        clientId: emailLogs.clientId,
        automationStepId: emailLogs.automationStepId,
        status: emailLogs.status,
        providerId: emailLogs.providerId,
        sentAt: emailLogs.sentAt,
        openedAt: emailLogs.openedAt,
        clickedAt: emailLogs.clickedAt,
        bouncedAt: emailLogs.bouncedAt,
        templateName: templates.name,
        templateSubject: templates.subject,
        templateHtmlBody: templates.htmlBody,
        templateTextBody: templates.textBody,
        automationName: automations.name
      })
        .from(emailLogs)
        .leftJoin(automationSteps, eq(emailLogs.automationStepId, automationSteps.id))
        .leftJoin(templates, eq(automationSteps.templateId, templates.id))
        .leftJoin(automations, eq(automationSteps.automationId, automations.id))
        .where(eq(emailLogs.clientId, clientId)),
      
      // Get SMS logs with template information
      db.select({
        id: smsLogs.id,
        clientId: smsLogs.clientId,
        automationStepId: smsLogs.automationStepId,
        status: smsLogs.status,
        providerId: smsLogs.providerId,
        sentAt: smsLogs.sentAt,
        deliveredAt: smsLogs.deliveredAt,
        templateName: templates.name,
        templateTextBody: templates.textBody,
        automationName: automations.name
      })
        .from(smsLogs)
        .leftJoin(automationSteps, eq(smsLogs.automationStepId, automationSteps.id))
        .leftJoin(templates, eq(automationSteps.templateId, templates.id))
        .leftJoin(automations, eq(automationSteps.automationId, automations.id))
        .where(eq(smsLogs.clientId, clientId)),
      
      // Get messages for this client
      db.select().from(messages)
        .where(eq(messages.clientId, clientId))
    ]);

    // Combine all history into unified timeline with proper typing
    const history: TimelineEvent[] = [
      ...activityLogs.map(log => ({
        type: 'activity' as const,
        id: log.id,
        title: log.title,
        description: log.description || undefined,
        activityType: log.activityType,
        metadata: log.metadata,
        createdAt: log.createdAt || new Date()
      })),
      ...emailLogEntries.map(email => {
        // Use proper timestamp precedence: first non-null of clickedAt, openedAt, sentAt, bouncedAt
        const timestamp = email.clickedAt || email.openedAt || email.sentAt || email.bouncedAt;
        
        // Create a preview from template content (first 100 characters)
        const templatePreview = email.templateTextBody 
          ? email.templateTextBody.substring(0, 100) + (email.templateTextBody.length > 100 ? '...' : '')
          : undefined;
        
        const title = email.automationName 
          ? `${email.automationName} - Email sent` 
          : 'Automated email sent';
        
        const description = email.templateSubject 
          ? `Subject: ${email.templateSubject}` 
          : `Status: ${email.status}`;
        
        return {
          type: 'email' as const,
          id: email.id,
          title,
          description,
          status: email.status,
          sentAt: email.sentAt || undefined,
          openedAt: email.openedAt || undefined,
          clickedAt: email.clickedAt || undefined,
          bouncedAt: email.bouncedAt || undefined,
          createdAt: timestamp || email.sentAt || new Date(),
          // Enhanced fields
          templateName: email.templateName || undefined,
          templateSubject: email.templateSubject || undefined,
          templatePreview,
          automationName: email.automationName || undefined
        };
      }),
      ...smsLogEntries.map(sms => {
        // Create a preview from template content (first 100 characters)
        const templatePreview = sms.templateTextBody 
          ? sms.templateTextBody.substring(0, 100) + (sms.templateTextBody.length > 100 ? '...' : '')
          : undefined;
        
        const title = sms.automationName 
          ? `${sms.automationName} - SMS sent` 
          : 'Automated SMS sent';
        
        const description = templatePreview || `Status: ${sms.status}`;
        
        return {
          type: 'sms' as const,
          id: sms.id,
          title,
          description,
          status: sms.status,
          sentAt: sms.sentAt || undefined,
          deliveredAt: sms.deliveredAt || undefined,
          createdAt: sms.sentAt || new Date(),
          // Enhanced fields
          templateName: sms.templateName || undefined,
          templatePreview,
          automationName: sms.automationName || undefined
        };
      }),
      ...messageHistory.map(message => ({
        type: 'message' as const,
        id: message.id,
        title: message.sentByPhotographer ? 'Message sent to client' : 'Message received from client',
        description: message.content,
        channel: message.channel,
        sentByPhotographer: message.sentByPhotographer,
        createdAt: message.createdAt || new Date()
      }))
    ];

    // Global sort by createdAt descending (most recent first)
    return history.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }


  async getClientPortalTokensByClient(clientId: string, after?: Date): Promise<ClientPortalToken[]> {
    const conditions = [eq(clientPortalTokens.clientId, clientId)];
    if (after) {
      conditions.push(gte(clientPortalTokens.createdAt, after));
    }
    
    return await db.select().from(clientPortalTokens)
      .where(and(...conditions))
      .orderBy(desc(clientPortalTokens.createdAt));
  }

  async createClientPortalToken(tokenData: InsertClientPortalToken): Promise<ClientPortalToken> {
    const [token] = await db.insert(clientPortalTokens).values(tokenData).returning();
    return token;
  }

  async validateClientPortalToken(token: string): Promise<ClientPortalToken | undefined> {
    const [portalToken] = await db.select().from(clientPortalTokens)
      .where(and(
        eq(clientPortalTokens.token, token),
        gte(clientPortalTokens.expiresAt, new Date())
      ))
      .limit(1);
    return portalToken;
  }

  // Booking methods
  async getBookingsByPhotographer(photographerId: string): Promise<Booking[]> {
    return await db.select().from(bookings)
      .where(eq(bookings.photographerId, photographerId))
      .orderBy(desc(bookings.startAt));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingByToken(token: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.bookingToken, token));
    return booking || undefined;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async updateBooking(id: string, booking: Partial<Booking>): Promise<Booking> {
    const [updatedBooking] = await db.update(bookings)
      .set(booking)
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  }

  async deleteBooking(id: string): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  // Short Link methods
  async getShortLink(shortCode: string): Promise<ShortLink | undefined> {
    const [link] = await db.select().from(shortLinks).where(eq(shortLinks.shortCode, shortCode));
    return link || undefined;
  }

  async getShortLinksByPhotographer(photographerId: string): Promise<ShortLink[]> {
    return await db.select().from(shortLinks)
      .where(eq(shortLinks.photographerId, photographerId))
      .orderBy(desc(shortLinks.createdAt));
  }

  async createShortLink(shortLink: InsertShortLink): Promise<ShortLink> {
    const [newLink] = await db.insert(shortLinks).values(shortLink).returning();
    return newLink;
  }

  async incrementShortLinkClicks(shortCode: string): Promise<void> {
    await db.update(shortLinks)
      .set({ clicks: sql`${shortLinks.clicks} + 1` })
      .where(eq(shortLinks.shortCode, shortCode));
  }

  // Availability Slot methods
  async getAvailabilitySlotsByPhotographer(photographerId: string): Promise<AvailabilitySlot[]> {
    return await db.select().from(availabilitySlots)
      .where(eq(availabilitySlots.photographerId, photographerId))
      .orderBy(asc(availabilitySlots.startAt));
  }

  async getAvailabilitySlot(id: string): Promise<AvailabilitySlot | undefined> {
    const [slot] = await db.select().from(availabilitySlots).where(eq(availabilitySlots.id, id));
    return slot || undefined;
  }

  // Old createAvailabilitySlot method removed - use template-based system instead

  async createAvailabilitySlotsBatch(slots: InsertAvailabilitySlot[]): Promise<AvailabilitySlot[]> {
    if (slots.length === 0) {
      return [];
    }
    
    // Bulk insert all slots in a single database operation
    return await db.insert(availabilitySlots).values(slots).returning();
  }

  // Old updateAvailabilitySlot method removed - use template-based system instead

  // Old deleteAvailabilitySlot method removed - use template-based system instead

  async getAvailableSlots(photographerId: string, afterDate: Date): Promise<AvailabilitySlot[]> {
    return await db.select().from(availabilitySlots)
      .where(and(
        eq(availabilitySlots.photographerId, photographerId),
        eq(availabilitySlots.isBooked, false),
        gt(availabilitySlots.startAt, afterDate)
      ))
      .orderBy(asc(availabilitySlots.startAt));
  }

  // Daily Availability Template methods
  async getDailyAvailabilityTemplatesByPhotographer(photographerId: string): Promise<DailyAvailabilityTemplate[]> {
    return await db.select().from(dailyAvailabilityTemplates)
      .where(eq(dailyAvailabilityTemplates.photographerId, photographerId))
      .orderBy(asc(dailyAvailabilityTemplates.dayOfWeek));
  }

  async getDailyAvailabilityTemplate(id: string): Promise<DailyAvailabilityTemplate | undefined> {
    const [template] = await db.select().from(dailyAvailabilityTemplates).where(eq(dailyAvailabilityTemplates.id, id));
    return template || undefined;
  }

  async createDailyAvailabilityTemplate(template: InsertDailyAvailabilityTemplate): Promise<DailyAvailabilityTemplate> {
    const [newTemplate] = await db.insert(dailyAvailabilityTemplates).values(template).returning();
    return newTemplate;
  }

  async updateDailyAvailabilityTemplate(id: string, template: Partial<DailyAvailabilityTemplate>): Promise<DailyAvailabilityTemplate> {
    const [updatedTemplate] = await db.update(dailyAvailabilityTemplates)
      .set(template)
      .where(eq(dailyAvailabilityTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteDailyAvailabilityTemplate(id: string): Promise<void> {
    // Use transaction to safely delete template and all related data
    await db.transaction(async (trx) => {
      // First delete all breaks related to this template
      await trx.delete(dailyAvailabilityBreaks)
        .where(eq(dailyAvailabilityBreaks.templateId, id));
      
      // Delete any availability slots that were generated from this template
      await trx.delete(availabilitySlots)
        .where(eq(availabilitySlots.sourceTemplateId, id));
      
      // Finally delete the template itself
      await trx.delete(dailyAvailabilityTemplates)
        .where(eq(dailyAvailabilityTemplates.id, id));
    });
  }

  // Daily Availability Break methods
  async getDailyAvailabilityBreaksByTemplate(templateId: string): Promise<DailyAvailabilityBreak[]> {
    return await db.select().from(dailyAvailabilityBreaks)
      .where(eq(dailyAvailabilityBreaks.templateId, templateId))
      .orderBy(asc(dailyAvailabilityBreaks.startTime));
  }

  async getDailyAvailabilityBreak(id: string): Promise<DailyAvailabilityBreak | undefined> {
    const [breakTime] = await db.select().from(dailyAvailabilityBreaks).where(eq(dailyAvailabilityBreaks.id, id));
    return breakTime || undefined;
  }

  async createDailyAvailabilityBreak(breakTime: InsertDailyAvailabilityBreak): Promise<DailyAvailabilityBreak> {
    const [newBreak] = await db.insert(dailyAvailabilityBreaks).values(breakTime).returning();
    return newBreak;
  }

  async updateDailyAvailabilityBreak(id: string, breakTime: Partial<DailyAvailabilityBreak>): Promise<DailyAvailabilityBreak> {
    const [updatedBreak] = await db.update(dailyAvailabilityBreaks)
      .set(breakTime)
      .where(eq(dailyAvailabilityBreaks.id, id))
      .returning();
    return updatedBreak;
  }

  async deleteDailyAvailabilityBreak(id: string): Promise<void> {
    await db.delete(dailyAvailabilityBreaks).where(eq(dailyAvailabilityBreaks.id, id));
  }

  // Daily Availability Override methods
  async getDailyAvailabilityOverridesByPhotographer(photographerId: string, startDate?: string, endDate?: string): Promise<DailyAvailabilityOverride[]> {
    let query = db.select().from(dailyAvailabilityOverrides)
      .where(eq(dailyAvailabilityOverrides.photographerId, photographerId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(dailyAvailabilityOverrides.photographerId, photographerId),
        gte(dailyAvailabilityOverrides.date, startDate),
        lte(dailyAvailabilityOverrides.date, endDate)
      ));
    }
    
    return await query.orderBy(asc(dailyAvailabilityOverrides.date));
  }

  async getDailyAvailabilityOverrideByDate(photographerId: string, date: string): Promise<DailyAvailabilityOverride | undefined> {
    const [override] = await db.select().from(dailyAvailabilityOverrides)
      .where(and(
        eq(dailyAvailabilityOverrides.photographerId, photographerId),
        eq(dailyAvailabilityOverrides.date, date)
      ));
    return override || undefined;
  }

  async getDailyAvailabilityOverride(id: string): Promise<DailyAvailabilityOverride | undefined> {
    const [override] = await db.select().from(dailyAvailabilityOverrides).where(eq(dailyAvailabilityOverrides.id, id));
    return override || undefined;
  }

  async createDailyAvailabilityOverride(override: InsertDailyAvailabilityOverride): Promise<DailyAvailabilityOverride> {
    const [newOverride] = await db.insert(dailyAvailabilityOverrides).values(override).returning();
    return newOverride;
  }

  async updateDailyAvailabilityOverride(id: string, override: Partial<DailyAvailabilityOverride>): Promise<DailyAvailabilityOverride> {
    const [updatedOverride] = await db.update(dailyAvailabilityOverrides)
      .set(override)
      .where(eq(dailyAvailabilityOverrides.id, id))
      .returning();
    return updatedOverride;
  }

  async deleteDailyAvailabilityOverride(id: string): Promise<void> {
    // Use transaction to safely delete override and clean up related slots
    await db.transaction(async (trx) => {
      // First get the override to know which date needs cleanup
      const [override] = await trx.select().from(dailyAvailabilityOverrides)
        .where(eq(dailyAvailabilityOverrides.id, id));
      
      if (override) {
        // Delete any availability slots generated for this date and photographer
        // This handles both template-generated slots and override-specific slots
        const targetDate = new Date(override.date);
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
        
        await trx.delete(availabilitySlots)
          .where(and(
            eq(availabilitySlots.photographerId, override.photographerId),
            gte(availabilitySlots.startAt, startOfDay),
            lte(availabilitySlots.startAt, endOfDay)
          ));
      }
      
      // Finally delete the override itself
      await trx.delete(dailyAvailabilityOverrides)
        .where(eq(dailyAvailabilityOverrides.id, id));
    });
  }

  // Google Calendar Integration methods
  async storeGoogleCalendarCredentials(photographerId: string, credentials: {
    accessToken: string;
    refreshToken?: string;
    expiryDate?: Date;
    scope?: string;
    calendarId?: string;
    email?: string;
  }): Promise<void> {
    await db.update(photographers)
      .set({
        googleCalendarAccessToken: credentials.accessToken,
        googleCalendarRefreshToken: credentials.refreshToken || null,
        googleCalendarTokenExpiry: credentials.expiryDate || null,
        googleCalendarScope: credentials.scope || null,
        googleCalendarId: credentials.calendarId || null,
        googleEmail: credentials.email || null,
        googleCalendarConnectedAt: new Date()
      })
      .where(eq(photographers.id, photographerId));
  }

  async getGoogleCalendarCredentials(photographerId: string): Promise<{
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: Date;
    scope?: string;
    connectedAt?: Date;
    calendarId?: string;
    email?: string;
  } | null> {
    const [photographer] = await db.select({
      accessToken: photographers.googleCalendarAccessToken,
      refreshToken: photographers.googleCalendarRefreshToken,
      expiryDate: photographers.googleCalendarTokenExpiry,
      scope: photographers.googleCalendarScope,
      connectedAt: photographers.googleCalendarConnectedAt,
      calendarId: photographers.googleCalendarId,
      email: photographers.googleEmail
    })
      .from(photographers)
      .where(eq(photographers.id, photographerId));

    if (!photographer || !photographer.accessToken) {
      return null;
    }

    return {
      accessToken: photographer.accessToken,
      refreshToken: photographer.refreshToken || undefined,
      expiryDate: photographer.expiryDate || undefined,
      scope: photographer.scope || undefined,
      connectedAt: photographer.connectedAt || undefined,
      calendarId: photographer.calendarId || undefined,
      email: photographer.email || undefined
    };
  }

  async clearGoogleCalendarCredentials(photographerId: string): Promise<void> {
    await db.update(photographers)
      .set({
        googleCalendarAccessToken: null,
        googleCalendarRefreshToken: null,
        googleCalendarTokenExpiry: null,
        googleCalendarScope: null,
        googleCalendarConnectedAt: null,
        googleCalendarId: null
      })
      .where(eq(photographers.id, photographerId));
  }

  async hasValidGoogleCalendarCredentials(photographerId: string): Promise<boolean> {
    const credentials = await this.getGoogleCalendarCredentials(photographerId);
    
    if (!credentials || !credentials.accessToken) {
      return false;
    }

    // Check if token is expired (with 5 minute buffer)
    if (credentials.expiryDate) {
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      const now = new Date();
      const expiryWithBuffer = new Date(credentials.expiryDate.getTime() - bufferTime);
      
      if (now >= expiryWithBuffer) {
        return false; // Token is expired or expires soon
      }
    }

    return true;
  }

  async storeGoogleCalendarId(photographerId: string, calendarId: string): Promise<void> {
    await db.update(photographers)
      .set({
        googleCalendarId: calendarId
      })
      .where(eq(photographers.id, photographerId));
  }

  // Projects - NEW IMPLEMENTATIONS
  async getProjectsByPhotographer(photographerId: string, projectType?: string): Promise<ProjectWithClientAndStage[]> {
    const rows = await db.select({
      // Project fields
      id: projects.id,
      photographerId: projects.photographerId,
      clientId: projects.clientId,
      title: projects.title,
      projectType: projects.projectType,
      eventDate: projects.eventDate,
      hasEventDate: projects.hasEventDate,
      stageId: projects.stageId,
      stageEnteredAt: projects.stageEnteredAt,
      leadSource: projects.leadSource,
      status: projects.status,
      smsOptIn: projects.smsOptIn,
      emailOptIn: projects.emailOptIn,
      notes: projects.notes,
      createdAt: projects.createdAt,
      // Client fields
      clientData: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone
      },
      // Stage fields
      stageData: {
        id: stages.id,
        name: stages.name,
        isDefault: stages.isDefault,
        orderIndex: stages.orderIndex
      }
    })
      .from(projects)
      .leftJoin(contacts, eq(projects.clientId, contacts.id))
      .leftJoin(stages, eq(projects.stageId, stages.id))
      .where(projectType ? 
        and(eq(projects.photographerId, photographerId), eq(projects.projectType, projectType)) :
        eq(projects.photographerId, photographerId)
      )
      .orderBy(desc(projects.createdAt));
      
    return rows.map(row => ({
      ...row,
      client: row.clientData ? {
        id: row.clientData.id,
        firstName: row.clientData.firstName,
        lastName: row.clientData.lastName,
        email: row.clientData.email,
        phone: row.clientData.phone
      } : null,
      stage: row.stageData?.id ? {
        id: row.stageData.id,
        name: row.stageData.name,
        isDefault: row.stageData.isDefault,
        orderIndex: row.stageData.orderIndex
      } : null
    }));
  }

  async getProject(id: string): Promise<ProjectWithClientAndStage | undefined> {
    const [row] = await db.select({
      // Project fields
      id: projects.id,
      photographerId: projects.photographerId,
      clientId: projects.clientId,
      title: projects.title,
      projectType: projects.projectType,
      eventDate: projects.eventDate,
      hasEventDate: projects.hasEventDate,
      stageId: projects.stageId,
      stageEnteredAt: projects.stageEnteredAt,
      leadSource: projects.leadSource,
      status: projects.status,
      smsOptIn: projects.smsOptIn,
      emailOptIn: projects.emailOptIn,
      notes: projects.notes,
      createdAt: projects.createdAt,
      // Client fields
      clientData: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone
      },
      // Stage fields
      stageData: {
        id: stages.id,
        name: stages.name,
        isDefault: stages.isDefault,
        orderIndex: stages.orderIndex
      }
    })
      .from(projects)
      .leftJoin(contacts, eq(projects.clientId, contacts.id))
      .leftJoin(stages, eq(projects.stageId, stages.id))
      .where(eq(projects.id, id));
      
    if (!row) return undefined;
    
    return {
      ...row,
      client: row.clientData ? {
        id: row.clientData.id,
        firstName: row.clientData.firstName,
        lastName: row.clientData.lastName,
        email: row.clientData.email,
        phone: row.clientData.phone
      } : null,
      stage: row.stageData?.id ? {
        id: row.stageData.id,
        name: row.stageData.name,
        isDefault: row.stageData.isDefault,
        orderIndex: row.stageData.orderIndex
      } : null
    };
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    // If no stage provided, assign default stage automatically
    let finalStageId = insertProject.stageId;
    
    if (!finalStageId) {
      // Find default stage for this photographer and project type
      const [defaultStage] = await db.select()
        .from(stages)
        .where(and(
          eq(stages.photographerId, insertProject.photographerId),
          eq(stages.projectType, insertProject.projectType || 'WEDDING'),
          eq(stages.isDefault, true)
        ))
        .limit(1);
      
      finalStageId = defaultStage?.id || null;
    }
    
    // Set stageEnteredAt timestamp when assigning to any stage
    const projectData = {
      ...insertProject,
      stageId: finalStageId,
      stageEnteredAt: finalStageId ? new Date() : null,
      hasEventDate: !!insertProject.eventDate
    };
    
    const [project] = await db.insert(projects).values(projectData).returning();
    
    // Log project creation to client history
    await db.insert(projectActivityLog).values({
      projectId: project.id,
      activityType: 'PROJECT_CREATED',
      action: 'CREATED',
      title: 'Project Created',
      description: `${project.projectType} project "${project.title}" was created`,
      metadata: JSON.stringify({
        projectType: project.projectType,
        projectTitle: project.title,
        leadSource: project.leadSource
      }),
      relatedId: project.id,
      relatedType: 'PROJECT'
    });
    
    // Auto-subscribe to wedding campaigns when creating in inquiry stage
    if (project.stageId) {
      await this.checkAndSubscribeToWeddingCampaign(project);
    }
    
    return project;
  }

  async updateProject(id: string, projectUpdate: Partial<Project>): Promise<Project> {
    // If stageId is being updated, set stageEnteredAt timestamp
    // If eventDate is being updated, set hasEventDate based on whether date exists
    const updateData = {
      ...projectUpdate,
      ...(projectUpdate.stageId !== undefined && {
        stageEnteredAt: projectUpdate.stageId ? new Date() : null
      }),
      ...(projectUpdate.eventDate !== undefined && {
        hasEventDate: !!projectUpdate.eventDate
      })
    };
    
    const [updated] = await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    // Auto-subscribe to wedding campaigns when entering inquiry stage
    if (projectUpdate.stageId) {
      await this.checkAndSubscribeToWeddingCampaign(updated);
    }
    
    return updated;
  }

  async getProjectParticipants(projectId: string): Promise<(ProjectParticipant & { client: Contact })[]> {
    const rows = await db.select({
      id: projectParticipants.id,
      projectId: projectParticipants.projectId,
      clientId: projectParticipants.clientId,
      addedBy: projectParticipants.addedBy,
      inviteSent: projectParticipants.inviteSent,
      inviteSentAt: projectParticipants.inviteSentAt,
      createdAt: projectParticipants.createdAt,
      client: contacts
    })
      .from(projectParticipants)
      .innerJoin(contacts, eq(projectParticipants.clientId, contacts.id))
      .where(eq(projectParticipants.projectId, projectId))
      .orderBy(desc(projectParticipants.createdAt));
      
    return rows.map(row => ({
      id: row.id,
      projectId: row.projectId,
      clientId: row.clientId,
      addedBy: row.addedBy,
      inviteSent: row.inviteSent,
      inviteSentAt: row.inviteSentAt,
      createdAt: row.createdAt,
      client: row.client
    }));
  }

  async getParticipantProjects(clientId: string): Promise<(ProjectParticipant & { project: ProjectWithClientAndStage })[]> {
    const rows = await db.select({
      participantId: projectParticipants.id,
      participantProjectId: projectParticipants.projectId,
      participantClientId: projectParticipants.clientId,
      participantAddedBy: projectParticipants.addedBy,
      participantInviteSent: projectParticipants.inviteSent,
      participantInviteSentAt: projectParticipants.inviteSentAt,
      participantCreatedAt: projectParticipants.createdAt,
      // Project fields
      id: projects.id,
      photographerId: projects.photographerId,
      clientId: projects.clientId,
      title: projects.title,
      projectType: projects.projectType,
      eventDate: projects.eventDate,
      hasEventDate: projects.hasEventDate,
      stageId: projects.stageId,
      stageEnteredAt: projects.stageEnteredAt,
      leadSource: projects.leadSource,
      status: projects.status,
      smsOptIn: projects.smsOptIn,
      emailOptIn: projects.emailOptIn,
      notes: projects.notes,
      createdAt: projects.createdAt,
      // Client fields
      clientData: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone
      },
      // Stage fields
      stageData: {
        id: stages.id,
        name: stages.name,
        isDefault: stages.isDefault,
        orderIndex: stages.orderIndex
      }
    })
      .from(projectParticipants)
      .innerJoin(projects, eq(projectParticipants.projectId, projects.id))
      .leftJoin(contacts, eq(projects.clientId, contacts.id))
      .leftJoin(stages, eq(projects.stageId, stages.id))
      .where(eq(projectParticipants.clientId, clientId))
      .orderBy(desc(projectParticipants.createdAt));
      
    return rows.map(row => ({
      id: row.participantId,
      projectId: row.participantProjectId,
      clientId: row.participantClientId,
      addedBy: row.participantAddedBy,
      inviteSent: row.participantInviteSent,
      inviteSentAt: row.participantInviteSentAt,
      createdAt: row.participantCreatedAt,
      project: {
        id: row.id,
        photographerId: row.photographerId,
        clientId: row.clientId,
        title: row.title,
        projectType: row.projectType,
        eventDate: row.eventDate,
        hasEventDate: row.hasEventDate,
        stageId: row.stageId,
        stageEnteredAt: row.stageEnteredAt,
        leadSource: row.leadSource,
        status: row.status,
        smsOptIn: row.smsOptIn,
        emailOptIn: row.emailOptIn,
        notes: row.notes,
        createdAt: row.createdAt,
        client: row.clientData ? {
          id: row.clientData.id,
          firstName: row.clientData.firstName,
          lastName: row.clientData.lastName,
          email: row.clientData.email,
          phone: row.clientData.phone
        } : null,
        stage: row.stageData?.id ? {
          id: row.stageData.id,
          name: row.stageData.name,
          isDefault: row.stageData.isDefault,
          orderIndex: row.stageData.orderIndex
        } : null
      }
    }));
  }

  async addProjectParticipant(participant: InsertProjectParticipant): Promise<ProjectParticipant> {
    const [created] = await db.insert(projectParticipants).values(participant).returning();
    return created;
  }

  async removeProjectParticipant(projectId: string, clientId: string): Promise<void> {
    await db.delete(projectParticipants)
      .where(and(
        eq(projectParticipants.projectId, projectId),
        eq(projectParticipants.clientId, clientId)
      ));
  }

  private async checkAndSubscribeToWeddingCampaign(project: Project): Promise<void> {
    try {
      console.log(`🔍 AUTO-SUBSCRIPTION CHECK: Project ${project.id}, Type: ${project.projectType}, Stage: ${project.stageId}`);
      
      // Only process wedding projects
      if (project.projectType !== 'WEDDING') {
        console.log(`❌ Skipping auto-subscription: Not a wedding project (${project.projectType})`);
        return;
      }

      // Get the stage to check if it's inquiry stage
      const stage = await db.select()
        .from(stages)
        .where(eq(stages.id, project.stageId!))
        .limit(1);

      console.log(`🔍 Stage check: Found ${stage.length} stages, Stage name: ${stage[0]?.name}`);
      if (!stage.length || stage[0].name !== 'Inquiry') {
        console.log(`❌ Skipping auto-subscription: Not in Inquiry stage (current: ${stage[0]?.name || 'unknown'})`);
        return;
      }

      // Check if wedding campaign is enabled for this photographer
      const campaignSettings = await db.select()
        .from(staticCampaignSettings)
        .where(and(
          eq(staticCampaignSettings.photographerId, project.photographerId),
          eq(staticCampaignSettings.projectType, 'WEDDING')
        ))
        .limit(1);

      console.log(`🔍 Campaign settings: Found ${campaignSettings.length} settings, Enabled: ${campaignSettings[0]?.campaignEnabled}`);
      if (!campaignSettings.length || !campaignSettings[0].campaignEnabled) {
        console.log(`❌ Skipping auto-subscription: Wedding campaign not enabled`);
        return;
      }

      // Get the contact to check email opt-in
      const contact = await db.select()
        .from(contacts)
        .where(eq(contacts.id, project.clientId))
        .limit(1);

      console.log(`🔍 Contact check: Found ${contact.length} contacts, Email opt-in: ${contact[0]?.emailOptIn}, Has email: ${!!contact[0]?.email}`);
      if (!contact.length || !contact[0].emailOptIn || !contact[0].email) {
        console.log(`❌ Skipping auto-subscription: Contact has no email opt-in or email address`);
        return;
      }

      // Find the active wedding campaign for this photographer
      const weddingCampaign = await db.select()
        .from(dripCampaigns)
        .where(and(
          eq(dripCampaigns.photographerId, project.photographerId),
          eq(dripCampaigns.projectType, 'WEDDING'),
          eq(dripCampaigns.status, 'APPROVED'),
          eq(dripCampaigns.enabled, true)
        ))
        .limit(1);

      console.log(`🔍 Wedding campaign: Found ${weddingCampaign.length} campaigns`);
      if (!weddingCampaign.length) {
        console.log(`❌ Skipping auto-subscription: No active wedding campaign found`);
        return;
      }

      // Check if already subscribed
      const existingSubscription = await db.select()
        .from(dripCampaignSubscriptions)
        .where(and(
          eq(dripCampaignSubscriptions.projectId, project.id),
          eq(dripCampaignSubscriptions.campaignId, weddingCampaign[0].id)
        ))
        .limit(1);

      console.log(`🔍 Existing subscription: Found ${existingSubscription.length} subscriptions`);
      if (existingSubscription.length) {
        console.log(`❌ Skipping auto-subscription: Already subscribed`);
        return;
      }

      // Subscribe to the campaign
      const now = new Date();
      await db.insert(dripCampaignSubscriptions).values({
        campaignId: weddingCampaign[0].id,
        projectId: project.id,
        clientId: project.clientId,
        startedAt: now,
        nextEmailIndex: 0,
        nextEmailAt: now, // Send first email immediately
        status: 'ACTIVE'
      });

      console.log(`✅ AUTO-SUBSCRIBED: Project ${project.id} (${contact[0].firstName} ${contact[0].lastName}) to wedding campaign ${weddingCampaign[0].name}`);
    } catch (error) {
      console.error('❌ ERROR in auto-subscribing to wedding campaign:', error);
    }
  }

  async getProjectHistory(projectId: string): Promise<TimelineEvent[]> {
    // Fetch all project-specific events in parallel
    const [activityLogs, emailLogEntries, smsLogEntries, emailHistoryEntries] = await Promise.all([
      // Activity log entries (stage changes, proposals, etc.)
      db.select({
        id: projectActivityLog.id,
        activityType: projectActivityLog.activityType,
        title: projectActivityLog.title,
        description: projectActivityLog.description,
        metadata: projectActivityLog.metadata,
        relatedId: projectActivityLog.relatedId,
        relatedType: projectActivityLog.relatedType,
        createdAt: projectActivityLog.createdAt
      }).from(projectActivityLog)
        .where(eq(projectActivityLog.projectId, projectId))
        .orderBy(desc(projectActivityLog.createdAt)),
      
      // Automated email logs (from automations)
      db.select({
        id: emailLogs.id,
        automationStepId: emailLogs.automationStepId,
        status: emailLogs.status,
        providerId: emailLogs.providerId,
        sentAt: emailLogs.sentAt,
        openedAt: emailLogs.openedAt,
        clickedAt: emailLogs.clickedAt,
        bouncedAt: emailLogs.bouncedAt,
        templateName: sql<string | null>`${templates.name}`,
        templateSubject: sql<string | null>`${templates.subject}`,
        automationName: sql<string | null>`${automations.name}`
      })
        .from(emailLogs)
        .leftJoin(automationSteps, eq(emailLogs.automationStepId, automationSteps.id))
        .leftJoin(templates, and(isNotNull(automationSteps.templateId), eq(automationSteps.templateId, templates.id)))
        .leftJoin(automations, and(isNotNull(automationSteps.automationId), eq(automationSteps.automationId, automations.id)))
        .where(eq(emailLogs.projectId, projectId))
        .orderBy(desc(emailLogs.sentAt)),
      
      // SMS logs
      db.select({
        id: smsLogs.id,
        automationStepId: smsLogs.automationStepId,
        status: smsLogs.status,
        sentAt: smsLogs.sentAt,
        deliveredAt: smsLogs.deliveredAt,
        direction: smsLogs.direction,
        messageBody: smsLogs.messageBody,
        fromPhone: smsLogs.fromPhone,
        toPhone: smsLogs.toPhone,
        createdAt: smsLogs.createdAt,
        templateName: sql<string | null>`${templates.name}`,
        automationName: sql<string | null>`${automations.name}`
      })
        .from(smsLogs)
        .leftJoin(automationSteps, eq(smsLogs.automationStepId, automationSteps.id))
        .leftJoin(templates, and(isNotNull(automationSteps.templateId), eq(automationSteps.templateId, templates.id)))
        .leftJoin(automations, and(isNotNull(automationSteps.automationId), eq(automationSteps.automationId, automations.id)))
        .where(eq(smsLogs.projectId, projectId))
        .orderBy(desc(smsLogs.createdAt)),
      
      // Email history (manual emails via Gmail/SendGrid)
      db.select({
        id: emailHistory.id,
        direction: emailHistory.direction,
        subject: emailHistory.subject,
        fromEmail: emailHistory.fromEmail,
        toEmails: emailHistory.toEmails,
        ccEmails: emailHistory.ccEmails,
        bccEmails: emailHistory.bccEmails,
        bodyPreview: emailHistory.bodyPreview,
        source: emailHistory.source,
        sentAt: emailHistory.sentAt,
        createdAt: emailHistory.createdAt
      })
        .from(emailHistory)
        .where(eq(emailHistory.projectId, projectId))
        .orderBy(desc(emailHistory.createdAt))
    ]);

    // Transform to TimelineEvent format
    const timeline: TimelineEvent[] = [];

    // Add activity log events
    for (const log of activityLogs) {
      timeline.push({
        type: 'activity',
        id: log.id,
        title: log.title,
        description: log.description || undefined,
        activityType: log.activityType,
        metadata: log.metadata,
        createdAt: log.createdAt!
      });
    }

    // Add automated email events
    for (const email of emailLogEntries) {
      const subject = email.templateSubject || 'Email';
      const preview = email.templateName || email.automationName || 'Automated email';
      
      timeline.push({
        type: 'email',
        id: email.id,
        title: subject,
        description: preview,
        status: email.status,
        sentAt: email.sentAt || undefined,
        openedAt: email.openedAt || undefined,
        clickedAt: email.clickedAt || undefined,
        bouncedAt: email.bouncedAt || undefined,
        createdAt: email.sentAt || new Date(),
        templateName: email.templateName || undefined,
        templateSubject: email.templateSubject || undefined,
        automationName: email.automationName || undefined
      });
    }

    // Add manual email events (from emailHistory)
    for (const email of emailHistoryEntries) {
      const recipients = email.toEmails?.join(', ') || 'Unknown';
      const source = email.source === 'GMAIL' ? '📧 Gmail' : email.source === 'SENDGRID' ? '📧 SendGrid' : '📧 Email';
      
      timeline.push({
        type: 'email',
        id: email.id,
        title: email.subject || 'Email',
        description: `${source} to ${recipients}${email.bodyPreview ? ': ' + email.bodyPreview.substring(0, 100) : ''}`,
        status: 'sent',
        sentAt: email.sentAt || email.createdAt || undefined,
        createdAt: email.createdAt || new Date(),
        templateName: undefined,
        templateSubject: email.subject || undefined
      });
    }

    // Add SMS events
    for (const sms of smsLogEntries) {
      const isInbound = sms.direction === 'INBOUND';
      const title = isInbound ? `📱 SMS from ${sms.fromPhone || 'client'}` : `📱 SMS to ${sms.toPhone || 'client'}`;
      const preview = sms.messageBody ? sms.messageBody.substring(0, 100) : (sms.templateName || sms.automationName || 'SMS message');
      
      timeline.push({
        type: 'sms',
        id: sms.id,
        title,
        description: preview,
        status: sms.status,
        sentAt: sms.sentAt || undefined,
        deliveredAt: sms.deliveredAt || undefined,
        createdAt: sms.createdAt || new Date(),
        direction: sms.direction,
        messageBody: sms.messageBody || undefined,
        templateName: sms.templateName || undefined,
        automationName: sms.automationName || undefined
      });
    }

    // Sort all events by date (most recent first)
    timeline.sort((a, b) => {
      const dateA = a.createdAt.getTime();
      const dateB = b.createdAt.getTime();
      return dateB - dateA;
    });

    return timeline;
  }

  // Stripe Connect Integration methods
  async updatePhotographerStripeAccount(photographerId: string, stripeData: {
    stripeConnectAccountId?: string;
    stripeAccountStatus?: string;
    payoutEnabled?: boolean;
    onboardingCompleted?: boolean;
    stripeOnboardingCompletedAt?: Date;
    platformFeePercent?: number;
  }): Promise<void> {
    await db.update(photographers)
      .set(stripeData)
      .where(eq(photographers.id, photographerId));
  }

  // Photographer Earnings methods
  async getEarningsByPhotographer(photographerId: string): Promise<PhotographerEarnings[]> {
    return await db.select()
      .from(photographerEarnings)
      .where(eq(photographerEarnings.photographerId, photographerId))
      .orderBy(desc(photographerEarnings.createdAt));
  }

  async getEarningsByProject(projectId: string): Promise<PhotographerEarnings[]> {
    return await db.select()
      .from(photographerEarnings)
      .where(eq(photographerEarnings.projectId, projectId))
      .orderBy(desc(photographerEarnings.createdAt));
  }

  async getEarningsByPaymentIntentId(paymentIntentId: string): Promise<PhotographerEarnings | undefined> {
    const [earnings] = await db.select()
      .from(photographerEarnings)
      .where(eq(photographerEarnings.paymentIntentId, paymentIntentId))
      .limit(1);
    return earnings || undefined;
  }

  async getEarningsByTransferId(transferId: string): Promise<PhotographerEarnings | undefined> {
    const [earnings] = await db.select()
      .from(photographerEarnings)
      .where(eq(photographerEarnings.transferId, transferId))
      .limit(1);
    return earnings || undefined;
  }

  async createEarnings(earnings: InsertPhotographerEarnings): Promise<PhotographerEarnings> {
    const [created] = await db.insert(photographerEarnings).values(earnings).returning();
    return created;
  }

  async updateEarnings(id: string, earnings: Partial<PhotographerEarnings>): Promise<PhotographerEarnings> {
    const [updated] = await db.update(photographerEarnings)
      .set(earnings)
      .where(eq(photographerEarnings.id, id))
      .returning();
    return updated;
  }

  // Photographer Payouts methods
  async getPayoutsByPhotographer(photographerId: string): Promise<PhotographerPayouts[]> {
    return await db.select()
      .from(photographerPayouts)
      .where(eq(photographerPayouts.photographerId, photographerId))
      .orderBy(desc(photographerPayouts.createdAt));
  }

  async getPayoutByStripePayoutId(stripePayoutId: string): Promise<PhotographerPayouts | undefined> {
    const [payout] = await db.select()
      .from(photographerPayouts)
      .where(eq(photographerPayouts.stripePayoutId, stripePayoutId))
      .limit(1);
    return payout || undefined;
  }

  async createPayout(payout: InsertPhotographerPayouts): Promise<PhotographerPayouts> {
    const [created] = await db.insert(photographerPayouts).values(payout).returning();
    return created;
  }

  async updatePayout(id: string, payout: Partial<PhotographerPayouts>): Promise<PhotographerPayouts> {
    const [updated] = await db.update(photographerPayouts)
      .set(payout)
      .where(eq(photographerPayouts.id, id))
      .returning();
    return updated;
  }

  async getPhotographerBalance(photographerId: string, currency: string = 'USD'): Promise<{ availableCents: number; pendingCents: number }> {
    // Get all earnings for this photographer in the specified currency
    const earnings = await db.select()
      .from(photographerEarnings)
      .where(and(
        eq(photographerEarnings.photographerId, photographerId),
        eq(photographerEarnings.currency, currency)
      ));

    // Calculate pending earnings (not yet transferred to Stripe Connect account)
    const pendingCents = earnings
      .filter(earning => earning.status === 'pending')
      .reduce((sum, earning) => sum + earning.photographerEarningsCents, 0);

    // Calculate total transferred earnings (available for payout)
    const transferredEarnings = earnings
      .filter(earning => earning.status === 'transferred')
      .reduce((sum, earning) => sum + earning.photographerEarningsCents, 0);

    // Get all payouts for this photographer in the specified currency
    const payouts = await db.select()
      .from(photographerPayouts)
      .where(and(
        eq(photographerPayouts.photographerId, photographerId),
        eq(photographerPayouts.currency, currency)
      ));

    // Calculate total amount already paid out or pending payout
    // We subtract both 'paid' and 'pending' payouts to get true available balance
    // Exclude 'failed' and 'cancelled' payouts as they don't affect available balance
    const allocatedCents = payouts
      .filter(payout => payout.status === 'paid' || payout.status === 'pending')
      .reduce((sum, payout) => sum + payout.amountCents, 0);

    // Available balance = transferred earnings minus already allocated payouts
    // This represents what the photographer can actually request for payout
    const availableCents = Math.max(0, transferredEarnings - allocatedCents);

    return {
      availableCents,
      pendingCents
    };
  }

  // Drip Campaigns methods
  async getDripCampaignsByPhotographer(photographerId: string, projectType?: string): Promise<DripCampaignWithEmails[]> {
    const query = db.select()
      .from(dripCampaigns)
      .where(eq(dripCampaigns.photographerId, photographerId))
      .orderBy(desc(dripCampaigns.createdAt));
    
    if (projectType) {
      query.where(and(
        eq(dripCampaigns.photographerId, photographerId),
        eq(dripCampaigns.projectType, projectType)
      ));
    }
    
    const campaigns = await query;
    
    // Get emails for each campaign
    const campaignsWithEmails: DripCampaignWithEmails[] = [];
    for (const campaign of campaigns) {
      const emails = await this.getDripCampaignEmails(campaign.id);
      campaignsWithEmails.push({
        ...campaign,
        emails
      });
    }
    
    return campaignsWithEmails;
  }

  async getDripCampaign(id: string): Promise<DripCampaignWithEmails | undefined> {
    const [campaign] = await db.select()
      .from(dripCampaigns)
      .where(eq(dripCampaigns.id, id))
      .limit(1);
    
    if (!campaign) return undefined;
    
    const emails = await this.getDripCampaignEmails(campaign.id);
    
    return {
      ...campaign,
      emails
    };
  }

  async createDripCampaign(campaign: InsertDripCampaign): Promise<DripCampaign> {
    const [created] = await db.insert(dripCampaigns).values(campaign).returning();
    return created;
  }

  async updateDripCampaign(id: string, campaign: Partial<DripCampaign>): Promise<DripCampaign> {
    const [updated] = await db.update(dripCampaigns)
      .set(campaign)
      .where(eq(dripCampaigns.id, id))
      .returning();
    return updated;
  }

  async deleteDripCampaign(id: string): Promise<void> {
    // Delete related data first (cascading delete)
    await db.delete(dripEmailDeliveries)
      .where(eq(dripEmailDeliveries.emailId, id)); // Need to join through subscriptions
    await db.delete(dripCampaignSubscriptions)
      .where(eq(dripCampaignSubscriptions.campaignId, id));
    await db.delete(dripCampaignEmails)
      .where(eq(dripCampaignEmails.campaignId, id));
    await db.delete(dripCampaigns)
      .where(eq(dripCampaigns.id, id));
  }

  // Drip Campaign Emails methods
  async getDripCampaignEmails(campaignId: string): Promise<DripCampaignEmail[]> {
    return await db.select()
      .from(dripCampaignEmails)
      .where(eq(dripCampaignEmails.campaignId, campaignId))
      .orderBy(asc(dripCampaignEmails.sequenceIndex));
  }

  async createDripCampaignEmail(email: InsertDripCampaignEmail): Promise<DripCampaignEmail> {
    const [created] = await db.insert(dripCampaignEmails).values(email).returning();
    return created;
  }

  async updateDripCampaignEmail(id: string, email: Partial<DripCampaignEmail>): Promise<DripCampaignEmail> {
    const [updated] = await db.update(dripCampaignEmails)
      .set(email)
      .where(eq(dripCampaignEmails.id, id))
      .returning();
    return updated;
  }

  async deleteDripCampaignEmail(id: string): Promise<void> {
    // Delete related deliveries first
    await db.delete(dripEmailDeliveries)
      .where(eq(dripEmailDeliveries.emailId, id));
    await db.delete(dripCampaignEmails)
      .where(eq(dripCampaignEmails.id, id));
  }

  // Individual Email Approval Methods
  async approveEmail(emailId: string, approvedBy: string): Promise<DripCampaignEmail> {
    const [updated] = await db.update(dripCampaignEmails)
      .set({
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy,
        rejectionReason: null
      })
      .where(eq(dripCampaignEmails.id, emailId))
      .returning();
    return updated;
  }

  async rejectEmail(emailId: string, rejectedBy: string, reason: string): Promise<DripCampaignEmail> {
    const [updated] = await db.update(dripCampaignEmails)
      .set({
        approvalStatus: 'REJECTED',
        approvedAt: null,
        approvedBy: null,
        rejectionReason: reason,
        lastEditedAt: new Date(),
        lastEditedBy: rejectedBy
      })
      .where(eq(dripCampaignEmails.id, emailId))
      .returning();
    return updated;
  }

  async updateEmailContent(emailId: string, content: { subject?: string; htmlBody?: string; textBody?: string }, editedBy: string): Promise<DripCampaignEmail> {
    // First get the current content to save as original if not already saved
    const [currentEmail] = await db.select()
      .from(dripCampaignEmails)
      .where(eq(dripCampaignEmails.id, emailId))
      .limit(1);
    
    if (!currentEmail) {
      throw new Error('Email not found');
    }

    // If this is the first edit, save original content
    const updateData: any = { ...content };
    if (!currentEmail.hasManualEdits) {
      updateData.originalSubject = currentEmail.subject;
      updateData.originalHtmlBody = currentEmail.htmlBody;
      updateData.originalTextBody = currentEmail.textBody;
      updateData.hasManualEdits = true;
    }
    
    updateData.lastEditedAt = new Date();
    updateData.lastEditedBy = editedBy;
    updateData.approvalStatus = 'PENDING'; // Reset approval status on edit
    updateData.approvedAt = null;
    updateData.approvedBy = null;

    const [updated] = await db.update(dripCampaignEmails)
      .set(updateData)
      .where(eq(dripCampaignEmails.id, emailId))
      .returning();
    return updated;
  }

  async bulkUpdateEmailSequence(emailUpdates: Array<{ id: string; sequenceIndex: number; weeksAfterStart: number }>): Promise<void> {
    await db.transaction(async (tx) => {
      for (const update of emailUpdates) {
        await tx.update(dripCampaignEmails)
          .set({ 
            sequenceIndex: update.sequenceIndex, 
            weeksAfterStart: update.weeksAfterStart 
          })
          .where(eq(dripCampaignEmails.id, update.id));
      }
    });
  }

  // Campaign Versioning Methods
  async createCampaignVersion(campaignId: string, versionData: Partial<DripCampaign>, changedBy: string, changeDescription: string): Promise<DripCampaign> {
    return await db.transaction(async (tx) => {
      // Get current campaign
      const [currentCampaign] = await tx.select()
        .from(dripCampaigns)
        .where(eq(dripCampaigns.id, campaignId))
        .limit(1);
      
      if (!currentCampaign) {
        throw new Error('Campaign not found');
      }

      // Mark current version as not current
      await tx.update(dripCampaigns)
        .set({ isCurrentVersion: false })
        .where(eq(dripCampaigns.id, campaignId));

      // Create new version
      const [newVersion] = await tx.insert(dripCampaigns)
        .values({
          ...currentCampaign,
          ...versionData,
          id: undefined, // Let database generate new ID
          version: currentCampaign.version + 1,
          parentCampaignId: currentCampaign.parentCampaignId || campaignId,
          isCurrentVersion: true,
          versionNotes: changeDescription,
          createdAt: new Date()
        })
        .returning();

      // Log version change
      await tx.insert(dripCampaignVersionHistory).values({
        campaignId: newVersion.id,
        version: newVersion.version,
        changeType: 'CREATED',
        changeDescription,
        changedBy,
        previousData: JSON.stringify(currentCampaign),
        newData: JSON.stringify(newVersion)
      });

      return newVersion;
    });
  }

  async getCampaignVersionHistory(campaignId: string): Promise<any[]> {
    return await db.select()
      .from(dripCampaignVersionHistory)
      .where(eq(dripCampaignVersionHistory.campaignId, campaignId))
      .orderBy(desc(dripCampaignVersionHistory.createdAt));
  }

  async logCampaignChange(campaignId: string, changeType: string, changeDescription: string, changedBy: string, affectedEmailId?: string, previousData?: any, newData?: any): Promise<void> {
    // Get current campaign version
    const [campaign] = await db.select()
      .from(dripCampaigns)
      .where(eq(dripCampaigns.id, campaignId))
      .limit(1);
    
    if (!campaign) return;

    await db.insert(dripCampaignVersionHistory).values({
      campaignId,
      version: campaign.version,
      changeType,
      changeDescription,
      changedBy,
      affectedEmailId,
      previousData: previousData ? JSON.stringify(previousData) : null,
      newData: newData ? JSON.stringify(newData) : null
    });
  }

  // Enhanced Campaign Queries with New Fields
  async getDripCampaignWithEmailStats(campaignId: string): Promise<any> {
    const campaign = await this.getDripCampaign(campaignId);
    if (!campaign) return undefined;

    const emails = await this.getDripCampaignEmails(campaignId);
    
    const stats = {
      totalEmails: emails.length,
      approvedEmails: emails.filter(e => e.approvalStatus === 'APPROVED').length,
      pendingEmails: emails.filter(e => e.approvalStatus === 'PENDING').length,
      rejectedEmails: emails.filter(e => e.approvalStatus === 'REJECTED').length,
      editedEmails: emails.filter(e => e.hasManualEdits).length
    };

    return {
      ...campaign,
      emails,
      stats
    };
  }

  // Static Campaign Settings methods
  async getStaticCampaignSettings(photographerId: string, projectType: string): Promise<StaticCampaignSettings | undefined> {
    const [settings] = await db.select()
      .from(staticCampaignSettings)
      .where(and(
        eq(staticCampaignSettings.photographerId, photographerId),
        eq(staticCampaignSettings.projectType, projectType)
      ));
    return settings;
  }

  async saveStaticCampaignSettings(settings: InsertStaticCampaignSettings): Promise<StaticCampaignSettings> {
    // Try to find existing settings first
    const existing = await this.getStaticCampaignSettings(settings.photographerId, settings.projectType);
    
    if (existing) {
      // Update existing settings
      const [updated] = await db.update(staticCampaignSettings)
        .set({
          campaignEnabled: settings.campaignEnabled,
          emailToggles: settings.emailToggles,
          updatedAt: new Date()
        })
        .where(and(
          eq(staticCampaignSettings.photographerId, settings.photographerId),
          eq(staticCampaignSettings.projectType, settings.projectType)
        ))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db.insert(staticCampaignSettings).values(settings).returning();
      return created;
    }
  }

  // Drip Campaign Subscriptions methods
  async getDripCampaignSubscriptionsByPhotographer(photographerId: string): Promise<DripCampaignSubscriptionWithDetails[]> {
    return await db.select({
      id: dripCampaignSubscriptions.id,
      campaignId: dripCampaignSubscriptions.campaignId,
      projectId: dripCampaignSubscriptions.projectId,
      clientId: dripCampaignSubscriptions.clientId,
      startedAt: dripCampaignSubscriptions.startedAt,
      nextEmailIndex: dripCampaignSubscriptions.nextEmailIndex,
      nextEmailAt: dripCampaignSubscriptions.nextEmailAt,
      completedAt: dripCampaignSubscriptions.completedAt,
      unsubscribedAt: dripCampaignSubscriptions.unsubscribedAt,
      status: dripCampaignSubscriptions.status,
      campaign: {
        id: dripCampaigns.id,
        photographerId: dripCampaigns.photographerId,
        projectType: dripCampaigns.projectType,
        name: dripCampaigns.name,
        targetStageId: dripCampaigns.targetStageId,
        status: dripCampaigns.status,
        maxDurationMonths: dripCampaigns.maxDurationMonths,
        emailFrequencyWeeks: dripCampaigns.emailFrequencyWeeks,
        generatedByAi: dripCampaigns.generatedByAi,
        aiPrompt: dripCampaigns.aiPrompt,
        businessContext: dripCampaigns.businessContext,
        approvedAt: dripCampaigns.approvedAt,
        approvedBy: dripCampaigns.approvedBy,
        createdAt: dripCampaigns.createdAt,
        enabled: dripCampaigns.enabled
      },
      project: {
        title: projects.title,
        eventDate: projects.eventDate
      },
      client: {
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email
      }
    })
      .from(dripCampaignSubscriptions)
      .innerJoin(dripCampaigns, eq(dripCampaignSubscriptions.campaignId, dripCampaigns.id))
      .innerJoin(projects, eq(dripCampaignSubscriptions.projectId, projects.id))
      .innerJoin(contacts, eq(dripCampaignSubscriptions.clientId, contacts.id))
      .where(eq(dripCampaigns.photographerId, photographerId))
      .orderBy(desc(dripCampaignSubscriptions.startedAt));
  }

  async getDripCampaignSubscriptionsByCampaign(campaignId: string): Promise<DripCampaignSubscriptionWithDetails[]> {
    return await db.select({
      id: dripCampaignSubscriptions.id,
      campaignId: dripCampaignSubscriptions.campaignId,
      projectId: dripCampaignSubscriptions.projectId,
      clientId: dripCampaignSubscriptions.clientId,
      startedAt: dripCampaignSubscriptions.startedAt,
      nextEmailIndex: dripCampaignSubscriptions.nextEmailIndex,
      nextEmailAt: dripCampaignSubscriptions.nextEmailAt,
      completedAt: dripCampaignSubscriptions.completedAt,
      unsubscribedAt: dripCampaignSubscriptions.unsubscribedAt,
      status: dripCampaignSubscriptions.status,
      campaign: {
        id: dripCampaigns.id,
        photographerId: dripCampaigns.photographerId,
        projectType: dripCampaigns.projectType,
        name: dripCampaigns.name,
        targetStageId: dripCampaigns.targetStageId,
        status: dripCampaigns.status,
        maxDurationMonths: dripCampaigns.maxDurationMonths,
        emailFrequencyWeeks: dripCampaigns.emailFrequencyWeeks,
        generatedByAi: dripCampaigns.generatedByAi,
        aiPrompt: dripCampaigns.aiPrompt,
        businessContext: dripCampaigns.businessContext,
        approvedAt: dripCampaigns.approvedAt,
        approvedBy: dripCampaigns.approvedBy,
        createdAt: dripCampaigns.createdAt,
        enabled: dripCampaigns.enabled
      },
      project: {
        title: projects.title,
        eventDate: projects.eventDate
      },
      client: {
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email
      }
    })
      .from(dripCampaignSubscriptions)
      .innerJoin(dripCampaigns, eq(dripCampaignSubscriptions.campaignId, dripCampaigns.id))
      .innerJoin(projects, eq(dripCampaignSubscriptions.projectId, projects.id))
      .innerJoin(contacts, eq(dripCampaignSubscriptions.clientId, contacts.id))
      .where(eq(dripCampaignSubscriptions.campaignId, campaignId))
      .orderBy(desc(dripCampaignSubscriptions.startedAt));
  }

  async getDripCampaignSubscription(id: string): Promise<DripCampaignSubscriptionWithDetails | undefined> {
    const [subscription] = await db.select({
      id: dripCampaignSubscriptions.id,
      campaignId: dripCampaignSubscriptions.campaignId,
      projectId: dripCampaignSubscriptions.projectId,
      clientId: dripCampaignSubscriptions.clientId,
      startedAt: dripCampaignSubscriptions.startedAt,
      nextEmailIndex: dripCampaignSubscriptions.nextEmailIndex,
      nextEmailAt: dripCampaignSubscriptions.nextEmailAt,
      completedAt: dripCampaignSubscriptions.completedAt,
      unsubscribedAt: dripCampaignSubscriptions.unsubscribedAt,
      status: dripCampaignSubscriptions.status,
      campaign: {
        id: dripCampaigns.id,
        photographerId: dripCampaigns.photographerId,
        projectType: dripCampaigns.projectType,
        name: dripCampaigns.name,
        targetStageId: dripCampaigns.targetStageId,
        status: dripCampaigns.status,
        maxDurationMonths: dripCampaigns.maxDurationMonths,
        emailFrequencyWeeks: dripCampaigns.emailFrequencyWeeks,
        generatedByAi: dripCampaigns.generatedByAi,
        aiPrompt: dripCampaigns.aiPrompt,
        businessContext: dripCampaigns.businessContext,
        approvedAt: dripCampaigns.approvedAt,
        approvedBy: dripCampaigns.approvedBy,
        createdAt: dripCampaigns.createdAt,
        enabled: dripCampaigns.enabled
      },
      project: {
        title: projects.title,
        eventDate: projects.eventDate
      },
      client: {
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email
      }
    })
      .from(dripCampaignSubscriptions)
      .innerJoin(dripCampaigns, eq(dripCampaignSubscriptions.campaignId, dripCampaigns.id))
      .innerJoin(projects, eq(dripCampaignSubscriptions.projectId, projects.id))
      .innerJoin(contacts, eq(dripCampaignSubscriptions.clientId, contacts.id))
      .where(eq(dripCampaignSubscriptions.id, id))
      .limit(1);
    
    return subscription || undefined;
  }

  async createDripCampaignSubscription(subscription: InsertDripCampaignSubscription): Promise<DripCampaignSubscription> {
    const [created] = await db.insert(dripCampaignSubscriptions).values(subscription).returning();
    return created;
  }

  async updateDripCampaignSubscription(id: string, subscription: Partial<DripCampaignSubscription>): Promise<DripCampaignSubscription> {
    const [updated] = await db.update(dripCampaignSubscriptions)
      .set(subscription)
      .where(eq(dripCampaignSubscriptions.id, id))
      .returning();
    return updated;
  }

  // Drip Email Deliveries methods
  async getDripEmailDeliveriesBySubscription(subscriptionId: string): Promise<DripEmailDelivery[]> {
    return await db.select()
      .from(dripEmailDeliveries)
      .where(eq(dripEmailDeliveries.subscriptionId, subscriptionId))
      .orderBy(desc(dripEmailDeliveries.createdAt));
  }

  async createDripEmailDelivery(delivery: InsertDripEmailDelivery): Promise<DripEmailDelivery> {
    const [created] = await db.insert(dripEmailDeliveries).values(delivery).returning();
    return created;
  }

  async updateDripEmailDelivery(id: string, delivery: Partial<DripEmailDelivery>): Promise<DripEmailDelivery> {
    const [updated] = await db.update(dripEmailDeliveries)
      .set(delivery)
      .where(eq(dripEmailDeliveries.id, id))
      .returning();
    return updated;
  }

  // SMS Logging
  async createSmsLog(smsLog: InsertSmsLog): Promise<SmsLog> {
    const [created] = await db.insert(smsLogs).values(smsLog).returning();
    return created;
  }

  // Email History
  async createEmailHistory(emailHistoryData: InsertEmailHistory): Promise<EmailHistory> {
    const [created] = await db.insert(emailHistory).values(emailHistoryData).returning();
    return created;
  }

  async getEmailHistoryByPhotographer(photographerId: string, filters: {
    direction?: 'INBOUND' | 'OUTBOUND';
    source?: 'AUTOMATION' | 'DRIP_CAMPAIGN' | 'MANUAL' | 'CLIENT_REPLY';
    clientId?: string;
    projectId?: string;
    limit?: number;
  } = {}): Promise<EmailHistory[]> {
    const conditions = [eq(emailHistory.photographerId, photographerId)];
    
    if (filters.direction) {
      conditions.push(eq(emailHistory.direction, filters.direction));
    }
    if (filters.source) {
      conditions.push(eq(emailHistory.source, filters.source));
    }
    if (filters.clientId) {
      conditions.push(eq(emailHistory.clientId, filters.clientId));
    }
    if (filters.projectId) {
      conditions.push(eq(emailHistory.projectId, filters.projectId));
    }

    let query = db.select()
      .from(emailHistory)
      .where(and(...conditions))
      .orderBy(desc(emailHistory.sentAt));

    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  async getEmailHistoryByClient(clientId: string): Promise<EmailHistory[]> {
    return await db.select()
      .from(emailHistory)
      .where(eq(emailHistory.clientId, clientId))
      .orderBy(desc(emailHistory.sentAt));
  }

  async getEmailHistoryByProject(projectId: string): Promise<EmailHistory[]> {
    return await db.select()
      .from(emailHistory)
      .where(eq(emailHistory.projectId, projectId))
      .orderBy(desc(emailHistory.sentAt));
  }

  async getEmailHistoryByThread(gmailThreadId: string, photographerId?: string): Promise<EmailHistory[]> {
    const conditions = [eq(emailHistory.gmailThreadId, gmailThreadId)];
    
    // Filter by photographer for security if provided
    if (photographerId) {
      conditions.push(eq(emailHistory.photographerId, photographerId));
    }
    
    return await db.select()
      .from(emailHistory)
      .where(and(...conditions))
      .orderBy(asc(emailHistory.sentAt)); // Order chronologically for thread view
  }
  
  // Smart Files
  async getSmartFilesByPhotographer(photographerId: string): Promise<SmartFile[]> {
    return await db.select()
      .from(smartFiles)
      .where(eq(smartFiles.photographerId, photographerId))
      .orderBy(desc(smartFiles.createdAt));
  }

  async getSmartFile(id: string): Promise<SmartFileWithPages | undefined> {
    const [smartFile] = await db.select()
      .from(smartFiles)
      .where(eq(smartFiles.id, id));
    
    if (!smartFile) return undefined;

    const pages = await db.select()
      .from(smartFilePages)
      .where(eq(smartFilePages.smartFileId, id))
      .orderBy(asc(smartFilePages.pageOrder));

    return {
      ...smartFile,
      pages
    };
  }

  async createSmartFile(smartFile: InsertSmartFile): Promise<SmartFile> {
    const [created] = await db.insert(smartFiles)
      .values(smartFile)
      .returning();
    return created;
  }

  async updateSmartFile(id: string, smartFile: Partial<SmartFile>): Promise<SmartFile> {
    const [updated] = await db.update(smartFiles)
      .set({ ...smartFile, updatedAt: new Date() })
      .where(eq(smartFiles.id, id))
      .returning();
    return updated;
  }

  async deleteSmartFile(id: string): Promise<void> {
    await db.delete(smartFiles)
      .where(eq(smartFiles.id, id));
  }

  // Smart File Pages
  async createSmartFilePage(page: InsertSmartFilePage): Promise<SmartFilePage> {
    const [created] = await db.insert(smartFilePages)
      .values(page)
      .returning();
    return created;
  }

  async updateSmartFilePage(id: string, page: Partial<SmartFilePage>): Promise<SmartFilePage> {
    const [updated] = await db.update(smartFilePages)
      .set(page)
      .where(eq(smartFilePages.id, id))
      .returning();
    return updated;
  }

  async deleteSmartFilePage(id: string): Promise<void> {
    await db.delete(smartFilePages)
      .where(eq(smartFilePages.id, id));
  }

  async reorderSmartFilePages(smartFileId: string, pageOrders: { id: string, pageOrder: number }[]): Promise<void> {
    await db.transaction(async (tx) => {
      // First, set all pages to negative temporary values to avoid unique constraint violations
      for (let i = 0; i < pageOrders.length; i++) {
        const { id } = pageOrders[i];
        await tx.update(smartFilePages)
          .set({ pageOrder: -(i + 1) })
          .where(and(
            eq(smartFilePages.id, id),
            eq(smartFilePages.smartFileId, smartFileId)
          ));
      }
      
      // Then update to final positions
      for (const { id, pageOrder } of pageOrders) {
        await tx.update(smartFilePages)
          .set({ pageOrder })
          .where(and(
            eq(smartFilePages.id, id),
            eq(smartFilePages.smartFileId, smartFileId)
          ));
      }
    });
  }

  // Project Smart Files
  async getProjectSmartFilesByProject(projectId: string): Promise<ProjectSmartFile[]> {
    return await db.select()
      .from(projectSmartFiles)
      .where(eq(projectSmartFiles.projectId, projectId))
      .orderBy(desc(projectSmartFiles.createdAt));
  }

  async attachSmartFileToProject(projectSmartFile: InsertProjectSmartFile): Promise<ProjectSmartFile> {
    const [created] = await db.insert(projectSmartFiles)
      .values(projectSmartFile)
      .returning();
    return created;
  }

  async createProjectSmartFile(projectSmartFile: InsertProjectSmartFile): Promise<ProjectSmartFile> {
    const [created] = await db.insert(projectSmartFiles)
      .values(projectSmartFile)
      .returning();
    return created;
  }

  async updateProjectSmartFile(id: string, update: Partial<ProjectSmartFile>): Promise<ProjectSmartFile> {
    const [updated] = await db.update(projectSmartFiles)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(projectSmartFiles.id, id))
      .returning();
    return updated;
  }

  async deleteProjectSmartFile(id: string): Promise<void> {
    await db.delete(projectSmartFiles)
      .where(eq(projectSmartFiles.id, id));
  }

  async getProjectSmartFileByToken(token: string): Promise<ProjectSmartFile | undefined> {
    const [projectSmartFile] = await db.select()
      .from(projectSmartFiles)
      .where(eq(projectSmartFiles.token, token));
    return projectSmartFile || undefined;
  }

  // Inbox / Conversation Reads Methods
  async getInboxConversations(photographerId: string): Promise<any[]> {
    // Get all contacts that have SMS activity with this photographer
    const smsContacts = await db
      .selectDistinct({
        contactId: smsLogs.clientId,
        lastMessageAt: sql<Date>`MAX(${smsLogs.createdAt})`.as('last_message_at')
      })
      .from(smsLogs)
      .innerJoin(contacts, eq(smsLogs.clientId, contacts.id))
      .where(eq(contacts.photographerId, photographerId))
      .groupBy(smsLogs.clientId)
      .orderBy(desc(sql`MAX(${smsLogs.createdAt})`));

    // Get contact details, last SMS preview, and unread status for each
    const conversations = await Promise.all(
      smsContacts.map(async ({ contactId, lastMessageAt }) => {
        const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId));
        
        // Get last SMS message
        const [lastSms] = await db
          .select()
          .from(smsLogs)
          .where(eq(smsLogs.clientId, contactId))
          .orderBy(desc(smsLogs.createdAt))
          .limit(1);

        // Get conversation read status
        const [conversationRead] = await db
          .select()
          .from(conversationReads)
          .where(
            and(
              eq(conversationReads.photographerId, photographerId),
              eq(conversationReads.contactId, contactId)
            )
          );

        // Count unread SMS messages (messages after last read timestamp)
        const unreadCount = conversationRead
          ? await db
              .select({ count: sql<number>`count(*)` })
              .from(smsLogs)
              .where(
                and(
                  eq(smsLogs.clientId, contactId),
                  gt(smsLogs.createdAt, conversationRead.lastReadAt)
                )
              )
              .then(result => result[0]?.count || 0)
          : await db
              .select({ count: sql<number>`count(*)` })
              .from(smsLogs)
              .where(eq(smsLogs.clientId, contactId))
              .then(result => result[0]?.count || 0);

        return {
          contact,
          lastMessage: lastSms?.messageBody || '',
          lastMessageAt: lastMessageAt,
          unreadCount: Number(unreadCount) || 0,
          lastReadAt: conversationRead?.lastReadAt
        };
      })
    );

    return conversations;
  }

  async getInboxThread(contactId: string, photographerId: string): Promise<any[]> {
    // Get all SMS messages for this contact
    const smsMessages = await db
      .select()
      .from(smsLogs)
      .where(eq(smsLogs.clientId, contactId))
      .orderBy(asc(smsLogs.createdAt));

    // Get all email history for this contact
    const emailEvents = await db
      .select()
      .from(emailHistory)
      .where(
        and(
          eq(emailHistory.clientId, contactId),
          eq(emailHistory.photographerId, photographerId)
        )
      )
      .orderBy(asc(emailHistory.createdAt));

    // Get all CRM messages for this contact
    const crmMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.clientId, contactId),
          eq(messages.photographerId, photographerId)
        )
      )
      .orderBy(asc(messages.createdAt));

    // Combine and format all messages
    const thread = [
      ...smsMessages.map(sms => ({
        type: 'SMS',
        id: sms.id,
        content: sms.messageBody,
        direction: sms.direction,
        timestamp: sms.createdAt,
        isInbound: sms.direction === 'INBOUND'
      })),
      ...emailEvents.map(email => ({
        type: 'EMAIL',
        id: email.id,
        content: null, // No content shown, just notification
        direction: email.direction,
        timestamp: email.createdAt || email.sentAt,
        isInbound: email.direction === 'INBOUND',
        subject: email.subject
      })),
      ...crmMessages.map(msg => ({
        type: 'CRM',
        id: msg.id,
        content: null, // No content shown, just notification
        direction: msg.sentByPhotographer ? 'OUTBOUND' : 'INBOUND',
        timestamp: msg.createdAt,
        isInbound: !msg.sentByPhotographer
      }))
    ];

    // Sort by timestamp
    thread.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });

    return thread;
  }

  async markConversationAsRead(photographerId: string, contactId: string): Promise<void> {
    await this.upsertConversationRead({
      photographerId,
      contactId,
      lastReadAt: new Date()
    });
  }

  async getUnreadCount(photographerId: string): Promise<number> {
    // Get all conversation reads for this photographer
    const reads = await db
      .select()
      .from(conversationReads)
      .where(eq(conversationReads.photographerId, photographerId));

    // Get all contacts with SMS activity
    const smsContacts = await db
      .selectDistinct({
        contactId: smsLogs.clientId
      })
      .from(smsLogs)
      .innerJoin(contacts, eq(smsLogs.clientId, contacts.id))
      .where(eq(contacts.photographerId, photographerId));

    let totalUnread = 0;

    for (const { contactId } of smsContacts) {
      const conversationRead = reads.find(r => r.contactId === contactId);

      const unreadCount = conversationRead
        ? await db
            .select({ count: sql<number>`count(*)` })
            .from(smsLogs)
            .where(
              and(
                eq(smsLogs.clientId, contactId),
                gt(smsLogs.createdAt, conversationRead.lastReadAt)
              )
            )
            .then(result => result[0]?.count || 0)
        : await db
            .select({ count: sql<number>`count(*)` })
            .from(smsLogs)
            .where(eq(smsLogs.clientId, contactId))
            .then(result => result[0]?.count || 0);

      totalUnread += Number(unreadCount) || 0;
    }

    return totalUnread;
  }

  async upsertConversationRead(data: InsertConversationRead): Promise<ConversationRead> {
    // Check if record exists
    const [existing] = await db
      .select()
      .from(conversationReads)
      .where(
        and(
          eq(conversationReads.photographerId, data.photographerId),
          eq(conversationReads.contactId, data.contactId)
        )
      );

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(conversationReads)
        .set({
          lastReadAt: data.lastReadAt,
          updatedAt: new Date()
        })
        .where(eq(conversationReads.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new
      const [created] = await db
        .insert(conversationReads)
        .values(data)
        .returning();
      return created;
    }
  }

  async getConversationRead(photographerId: string, contactId: string): Promise<ConversationRead | undefined> {
    const [conversationRead] = await db
      .select()
      .from(conversationReads)
      .where(
        and(
          eq(conversationReads.photographerId, photographerId),
          eq(conversationReads.contactId, contactId)
        )
      );
    return conversationRead || undefined;
  }
  
  // Admin Methods
  async getAllPhotographersWithStats(): Promise<Array<Photographer & { clientCount: number }>> {
    const photographersList = await db.select().from(photographers);
    
    // Get contact counts for each photographer
    const photographersWithStats = await Promise.all(
      photographersList.map(async (photographer) => {
        const contactCount = await db.select({ count: sql<number>`count(*)` })
          .from(contacts)
          .where(eq(contacts.photographerId, photographer.id));
        
        return {
          ...photographer,
          clientCount: Number(contactCount[0]?.count || 0)
        };
      })
    );
    
    return photographersWithStats;
  }
  
  async logAdminActivity(activity: InsertAdminActivityLog): Promise<AdminActivityLog> {
    const [log] = await db.insert(adminActivityLog).values(activity).returning();
    return log;
  }
  
  async getAdminActivityLog(adminUserId?: string, limit: number = 100): Promise<AdminActivityLog[]> {
    let query = db.select().from(adminActivityLog).orderBy(desc(adminActivityLog.createdAt));
    
    if (adminUserId) {
      query = query.where(eq(adminActivityLog.adminUserId, adminUserId)) as any;
    }
    
    query = query.limit(limit) as any;
    
    return await query;
  }

  async updatePhotographerSubscription(photographerId: string, subscriptionStatus: string): Promise<Photographer> {
    const [updated] = await db.update(photographers)
      .set({ subscriptionStatus })
      .where(eq(photographers.id, photographerId))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
