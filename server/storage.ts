import { 
  photographers, users, clients, projects, stages, templates, automations, automationSteps,
  emailLogs, smsLogs, automationExecutions, photographerLinks, checklistTemplateItems, projectChecklistItems,
  packages, packageItems, questionnaireTemplates, questionnaireQuestions, projectQuestionnaires,
  availabilitySlots, bookings, estimates, estimateItems, estimatePayments,
  photographerEarnings, photographerPayouts,
  messages, projectActivityLog, clientPortalTokens,
  dailyAvailabilityTemplates, dailyAvailabilityBreaks, dailyAvailabilityOverrides,
  dripCampaigns, dripCampaignEmails, dripCampaignSubscriptions, dripEmailDeliveries, staticCampaignSettings,
  type User, type InsertUser, type Photographer, type InsertPhotographer,
  type Client, type InsertClient, type Project, type InsertProject, type ProjectWithClientAndStage, type ClientWithProjects, type Stage, type InsertStage,
  type Template, type InsertTemplate, type Automation, type InsertAutomation,
  type AutomationStep, type InsertAutomationStep, type Package, type InsertPackage,
  type Estimate, type InsertEstimate, type EstimateItem, type EstimateWithProject, type EstimateWithRelations,
  type PhotographerEarnings, type InsertPhotographerEarnings,
  type PhotographerPayouts, type InsertPhotographerPayouts,
  type QuestionnaireTemplate, type InsertQuestionnaireTemplate,
  type QuestionnaireQuestion, type InsertQuestionnaireQuestion,
  type ProjectQuestionnaire, type InsertProjectQuestionnaire,
  type Message, type InsertMessage, type ProjectActivityLog, type TimelineEvent, type ClientPortalToken, type InsertClientPortalToken,
  type SmsLog, type InsertSmsLog,
  type Proposal, type InsertProposal, type ProposalItem, type ProposalPayment, type ProposalWithProject, type ProposalWithRelations,
  type DailyAvailabilityTemplate, type InsertDailyAvailabilityTemplate,
  type DailyAvailabilityBreak, type InsertDailyAvailabilityBreak,
  type DailyAvailabilityOverride, type InsertDailyAvailabilityOverride,
  type AvailabilitySlot, type InsertAvailabilitySlot,
  type Booking, type InsertBooking,
  type DripCampaign, type InsertDripCampaign, type DripCampaignWithEmails,
  type DripCampaignEmail, type InsertDripCampaignEmail,
  type DripCampaignSubscription, type InsertDripCampaignSubscription, type DripCampaignSubscriptionWithDetails,
  type DripEmailDelivery, type InsertDripEmailDelivery,
  type StaticCampaignSettings, type InsertStaticCampaignSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, inArray, gte, lte, gt, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Photographers
  getAllPhotographers(): Promise<Photographer[]>;
  getPhotographer(id: string): Promise<Photographer | undefined>;
  getPhotographerByPublicToken(publicToken: string): Promise<Photographer | undefined>;
  createPhotographer(photographer: InsertPhotographer): Promise<Photographer>;
  updatePhotographer(id: string, photographer: Partial<Photographer>): Promise<Photographer>;
  
  // Clients
  getClientsByPhotographer(photographerId: string, projectType?: string): Promise<ClientWithProjects[]>;
  getClient(id: string): Promise<ClientWithProjects | undefined>;
  getClientByPhone(phone: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<Client>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  
  // Projects
  getProjectsByPhotographer(photographerId: string, projectType?: string): Promise<ProjectWithClientAndStage[]>;
  getProject(id: string): Promise<ProjectWithClientAndStage | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<Project>;
  getProjectHistory(projectId: string): Promise<TimelineEvent[]>;
  getClientMessages(clientId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
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
  
  // Automation Steps
  getAutomationSteps(automationId: string): Promise<AutomationStep[]>;
  getAutomationStepById(id: string): Promise<AutomationStep | undefined>;
  createAutomationStep(step: InsertAutomationStep): Promise<AutomationStep>;
  updateAutomationStep(id: string, step: Partial<AutomationStep>): Promise<AutomationStep>;
  deleteAutomationStep(id: string): Promise<void>;
  
  // Packages
  getPackagesByPhotographer(photographerId: string): Promise<Package[]>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, pkg: Partial<Package>): Promise<Package>;
  
  // Estimates
  getEstimatesByPhotographer(photographerId: string): Promise<EstimateWithClient[]>;
  getEstimatesByProject(projectId: string): Promise<EstimateWithClient[]>;
  getEstimate(id: string): Promise<EstimateWithRelations | undefined>;
  getEstimateByToken(token: string): Promise<EstimateWithRelations | undefined>;
  createEstimate(estimate: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: string, estimate: Partial<Estimate>): Promise<Estimate>;
  deleteEstimate(id: string): Promise<void>;
  
  // Proposals (aliases for Estimates to enable terminology migration)
  getProposalsByPhotographer(photographerId: string): Promise<ProposalWithClient[]>;
  getProposalsByClient(clientId: string): Promise<ProposalWithClient[]>;
  getProposal(id: string): Promise<ProposalWithRelations | undefined>;
  getProposalByToken(token: string): Promise<ProposalWithRelations | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: string, proposal: Partial<Proposal>): Promise<Proposal>;
  deleteProposal(id: string): Promise<void>;
  
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
  }): Promise<void>;
  getGoogleCalendarCredentials(photographerId: string): Promise<{
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: Date;
    scope?: string;
    connectedAt?: Date;
    calendarId?: string;
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

  async getClientsByPhotographer(photographerId: string, projectType?: string): Promise<ClientWithProjects[]> {
    // First get all clients for this photographer
    const clientRows = await db.select()
      .from(clients)
      .where(eq(clients.photographerId, photographerId))
      .orderBy(desc(clients.createdAt));

    // Then get all projects with stages for these clients
    const clientIds = clientRows.map(c => c.id);
    
    if (clientIds.length === 0) {
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
        and(inArray(projects.clientId, clientIds), eq(projects.projectType, projectType)) :
        inArray(projects.clientId, clientIds)
      )
      .orderBy(desc(projects.createdAt));

    // Group projects by client and create final result
    const projectsByClient = projectRows.reduce((acc, project) => {
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

    // Sort each client's projects by creation date (newest first) to guarantee latest project is first
    Object.keys(projectsByClient).forEach(clientId => {
      projectsByClient[clientId].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return clientRows.map(client => ({
      ...client,
      projects: projectsByClient[client.id] || []
    }));
  }

  async getClient(id: string): Promise<ClientWithProjects | undefined> {
    // First get the client
    const [client] = await db.select()
      .from(clients)
      .where(eq(clients.id, id));
      
    if (!client) return undefined;

    // Then get all projects for this client
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
      ...client,
      projects: projectRows
    };
  }

  async getClientByPhone(phone: string): Promise<Client | undefined> {
    const [client] = await db.select()
      .from(clients)
      .where(eq(clients.phone, phone));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    // Simply create the client with basic info - project data is handled separately
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, clientUpdate: Partial<Client>): Promise<Client> {
    // Update basic client info only - project data is handled separately
    const [updated] = await db.update(clients)
      .set(clientUpdate)
      .where(eq(clients.id, id))
      .returning();
    return updated;
  }

  async deleteClient(id: string): Promise<void> {
    // Atomic cascading delete - remove all related data in a transaction
    await db.transaction(async (tx) => {
      // First verify the client exists in this transaction
      const [existingClient] = await tx.select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, id));
      
      if (!existingClient) {
        // Client doesn't exist - this is fine, just return without error
        console.log(`[DELETE CLIENT] Client ${id} not found, skipping delete`);
        return;
      }
      
      console.log(`[DELETE CLIENT] Starting cascading delete for client ${id}`);
      
      // Get all projects for this client
      const clientProjects = await tx.select({ id: projects.id })
        .from(projects)
        .where(eq(projects.clientId, id));
      
      const projectIds = clientProjects.map(p => p.id);
      
      if (projectIds.length > 0) {
        // Get all estimates for these projects
        const projectEstimates = await tx.select({ id: estimates.id })
          .from(estimates)
          .where(inArray(estimates.projectId, projectIds));
        
        const estimateIds = projectEstimates.map(e => e.id);
        
        if (estimateIds.length > 0) {
          // Delete estimate items and payments (batched)
          await tx.delete(estimateItems)
            .where(inArray(estimateItems.estimateId, estimateIds));
          
          await tx.delete(estimatePayments)
            .where(inArray(estimatePayments.estimateId, estimateIds));
        }
        
        // Delete estimates (batched)
        await tx.delete(estimates)
          .where(inArray(estimates.projectId, projectIds));
        
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
      
      // Delete messages directly related to client
      await tx.delete(messages)
        .where(eq(messages.clientId, id));
      
      // Delete SMS logs directly related to client (not just by project)
      await tx.delete(smsLogs)
        .where(eq(smsLogs.clientId, id));
      
      // Delete client portal tokens
      await tx.delete(clientPortalTokens)
        .where(eq(clientPortalTokens.clientId, id));
      
      // Finally delete the client
      const deleteResult = await tx.delete(clients)
        .where(eq(clients.id, id));
      
      console.log(`[DELETE CLIENT] Successfully deleted client ${id} and all related data`);
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
    return await db.select().from(automations)
      .where(projectType ? 
        and(eq(automations.photographerId, photographerId), eq(automations.projectType, projectType)) :
        eq(automations.photographerId, photographerId)
      );
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

  async getEstimatesByPhotographer(photographerId: string): Promise<EstimateWithClient[]> {
    return await db.select({
      id: estimates.id,
      photographerId: estimates.photographerId,
      clientId: estimates.clientId,
      title: estimates.title,
      notes: estimates.notes,
      currency: estimates.currency,
      subtotalCents: estimates.subtotalCents,
      discountCents: estimates.discountCents,
      taxCents: estimates.taxCents,
      totalCents: estimates.totalCents,
      depositPercent: estimates.depositPercent,
      depositCents: estimates.depositCents,
      status: estimates.status,
      validUntil: estimates.validUntil,
      createdAt: estimates.createdAt,
      sentAt: estimates.sentAt,
      signedAt: estimates.signedAt,
      signedByName: estimates.signedByName,
      signedByEmail: estimates.signedByEmail,
      signedIp: estimates.signedIp,
      signedUserAgent: estimates.signedUserAgent,
      signatureImageUrl: estimates.signatureImageUrl,
      token: estimates.token,
      client: {
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        eventDate: clients.eventDate,
        projectType: clients.projectType,
        leadSource: clients.leadSource
      }
    })
    .from(estimates)
    .innerJoin(clients, eq(estimates.clientId, clients.id))
    .where(eq(estimates.photographerId, photographerId))
    .orderBy(desc(estimates.createdAt));
  }

  async getEstimatesByProject(projectId: string): Promise<EstimateWithClient[]> {
    return await db.select({
      id: estimates.id,
      photographerId: estimates.photographerId,
      clientId: estimates.clientId,
      title: estimates.title,
      notes: estimates.notes,
      currency: estimates.currency,
      subtotalCents: estimates.subtotalCents,
      discountCents: estimates.discountCents,
      taxCents: estimates.taxCents,
      totalCents: estimates.totalCents,
      depositPercent: estimates.depositPercent,
      depositCents: estimates.depositCents,
      status: estimates.status,
      validUntil: estimates.validUntil,
      createdAt: estimates.createdAt,
      sentAt: estimates.sentAt,
      signedAt: estimates.signedAt,
      signedByName: estimates.signedByName,
      signedByEmail: estimates.signedByEmail,
      signedIp: estimates.signedIp,
      signedUserAgent: estimates.signedUserAgent,
      signatureImageUrl: estimates.signatureImageUrl,
      token: estimates.token,
      client: {
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        eventDate: clients.eventDate,
        projectType: clients.projectType,
        leadSource: clients.leadSource
      }
    })
    .from(estimates)
    .innerJoin(clients, eq(estimates.clientId, clients.id))
    .where(eq(estimates.projectId, projectId))
    .orderBy(desc(estimates.createdAt));
  }

  async getEstimate(id: string): Promise<EstimateWithRelations | undefined> {
    // Fetch estimate with all relations (photographer, client, items)
    const [estimate] = await db.select({
      id: estimates.id,
      photographerId: estimates.photographerId,
      clientId: estimates.clientId,
      title: estimates.title,
      notes: estimates.notes,
      currency: estimates.currency,
      subtotalCents: estimates.subtotalCents,
      discountCents: estimates.discountCents,
      taxCents: estimates.taxCents,
      totalCents: estimates.totalCents,
      depositPercent: estimates.depositPercent,
      depositCents: estimates.depositCents,
      status: estimates.status,
      validUntil: estimates.validUntil,
      createdAt: estimates.createdAt,
      sentAt: estimates.sentAt,
      signedAt: estimates.signedAt,
      signedByName: estimates.signedByName,
      signedByEmail: estimates.signedByEmail,
      signedIp: estimates.signedIp,
      signedUserAgent: estimates.signedUserAgent,
      signatureImageUrl: estimates.signatureImageUrl,
      token: estimates.token,
      photographer: {
        id: photographers.id,
        businessName: photographers.businessName,
        logoUrl: photographers.logoUrl,
        brandPrimary: photographers.brandPrimary,
        brandSecondary: photographers.brandSecondary,
        emailFromName: photographers.emailFromName,
        emailFromAddr: photographers.emailFromAddr,
        timezone: photographers.timezone,
        createdAt: photographers.createdAt
      },
      client: {
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        eventDate: clients.eventDate,
        projectType: clients.projectType,
        leadSource: clients.leadSource,
        notes: clients.notes,
        stageId: clients.stageId,
        stageEnteredAt: clients.stageEnteredAt,
        smsOptIn: clients.smsOptIn,
        emailOptIn: clients.emailOptIn,
        createdAt: clients.createdAt,
        photographerId: clients.photographerId
      }
    })
      .from(estimates)
      .innerJoin(photographers, eq(estimates.photographerId, photographers.id))
      .innerJoin(clients, eq(estimates.clientId, clients.id))
      .where(eq(estimates.id, id));

    if (!estimate) return undefined;

    // Fetch estimate items separately
    const items = await db.select().from(estimateItems)
      .where(eq(estimateItems.estimateId, id))
      .orderBy(asc(estimateItems.orderIndex));

    return {
      ...estimate,
      items
    };
  }

  async getEstimateByToken(token: string): Promise<EstimateWithRelations | undefined> {
    // Fetch estimate with all relations (photographer, client, items)
    const [estimate] = await db.select({
      id: estimates.id,
      photographerId: estimates.photographerId,
      clientId: estimates.clientId,
      title: estimates.title,
      notes: estimates.notes,
      currency: estimates.currency,
      subtotalCents: estimates.subtotalCents,
      discountCents: estimates.discountCents,
      taxCents: estimates.taxCents,
      totalCents: estimates.totalCents,
      depositPercent: estimates.depositPercent,
      depositCents: estimates.depositCents,
      status: estimates.status,
      validUntil: estimates.validUntil,
      createdAt: estimates.createdAt,
      sentAt: estimates.sentAt,
      signedAt: estimates.signedAt,
      signedByName: estimates.signedByName,
      signedByEmail: estimates.signedByEmail,
      signedIp: estimates.signedIp,
      signedUserAgent: estimates.signedUserAgent,
      signatureImageUrl: estimates.signatureImageUrl,
      token: estimates.token,
      photographer: {
        id: photographers.id,
        businessName: photographers.businessName,
        logoUrl: photographers.logoUrl,
        brandPrimary: photographers.brandPrimary,
        brandSecondary: photographers.brandSecondary,
        emailFromName: photographers.emailFromName,
        emailFromAddr: photographers.emailFromAddr,
        timezone: photographers.timezone,
        createdAt: photographers.createdAt
      },
      client: {
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        eventDate: clients.eventDate,
        projectType: clients.projectType,
        leadSource: clients.leadSource,
        notes: clients.notes,
        stageId: clients.stageId,
        stageEnteredAt: clients.stageEnteredAt,
        smsOptIn: clients.smsOptIn,
        emailOptIn: clients.emailOptIn,
        createdAt: clients.createdAt,
        photographerId: clients.photographerId
      }
    })
      .from(estimates)
      .innerJoin(photographers, eq(estimates.photographerId, photographers.id))
      .innerJoin(clients, eq(estimates.clientId, clients.id))
      .where(eq(estimates.token, token));

    if (!estimate) return undefined;

    // Fetch estimate items separately
    const items = await db.select().from(estimateItems)
      .where(eq(estimateItems.estimateId, estimate.id))
      .orderBy(asc(estimateItems.orderIndex));

    return {
      ...estimate,
      items
    };
  }

  async createEstimate(insertEstimate: InsertEstimate & { items?: Array<any> }): Promise<Estimate> {
    const { items, ...estimateData } = insertEstimate;
    
    // Create the main estimate record
    const [estimate] = await db.insert(estimates).values(estimateData).returning();
    
    // If items were provided, save them to estimateItems table
    if (items && items.length > 0) {
      const estimateItemsData = items.map((item, index) => ({
        estimateId: estimate.id,
        name: item.name || '',
        description: item.description || '',
        qty: item.qty || 1,
        unitCents: item.unitCents || 0,
        lineTotalCents: item.lineTotalCents || 0,
        orderIndex: index
      }));
      
      await db.insert(estimateItems).values(estimateItemsData);
    }
    
    // Log proposal creation to client activity history
    await db.insert(clientActivityLog).values({
      clientId: estimate.clientId,
      activityType: 'PROPOSAL_CREATED',
      title: `Proposal created: ${estimate.title}`,
      description: `New proposal "${estimate.title}" created with total of $${((estimate.totalCents || 0) / 100).toFixed(2)}`,
      metadata: {
        estimateId: estimate.id,
        totalCents: estimate.totalCents,
        status: estimate.status
      },
      relatedId: estimate.id,
      relatedType: 'ESTIMATE'
    });
    
    return estimate;
  }

  async updateEstimate(id: string, estimate: Partial<Estimate>): Promise<Estimate> {
    const [updated] = await db.update(estimates)
      .set(estimate)
      .where(eq(estimates.id, id))
      .returning();
    return updated;
  }

  async deleteEstimate(id: string): Promise<void> {
    // Delete estimate items first (foreign key constraint)
    await db.delete(estimateItems).where(eq(estimateItems.estimateId, id));
    
    // Delete the estimate itself
    await db.delete(estimates).where(eq(estimates.id, id));
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
      clientName: sql<string>`${clients.firstName} || ' ' || ${clients.lastName}`,
      templateTitle: questionnaireTemplates.title,
      projectType: projects.projectType
    })
    .from(projectQuestionnaires)
    .innerJoin(projects, eq(projectQuestionnaires.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
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
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone
      },
      stage: {
        id: stages.id,
        name: stages.name
      }
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .leftJoin(stages, eq(projects.stageId, stages.id))
    .where(eq(projects.clientId, clientId));
  }

  async getClientHistory(clientId: string): Promise<TimelineEvent[]> {
    // Parallelize all queries for better performance
    const [activityLogs, emailLogEntries, smsLogEntries, clientEstimates, paymentHistory, messageHistory] = await Promise.all([
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
      
      // Get estimates for this client (through projects)
      db.select({
        id: estimates.id,
        photographerId: estimates.photographerId,
        projectId: estimates.projectId,
        title: estimates.title,
        notes: estimates.notes,
        currency: estimates.currency,
        subtotalCents: estimates.subtotalCents,
        discountCents: estimates.discountCents,
        taxCents: estimates.taxCents,
        totalCents: estimates.totalCents,
        depositPercent: estimates.depositPercent,
        depositCents: estimates.depositCents,
        status: estimates.status,
        validUntil: estimates.validUntil,
        createdAt: estimates.createdAt,
        sentAt: estimates.sentAt,
        signedAt: estimates.signedAt,
        signedByName: estimates.signedByName,
        signedByEmail: estimates.signedByEmail,
        token: estimates.token
      }).from(estimates)
        .innerJoin(projects, eq(estimates.projectId, projects.id))
        .where(eq(projects.clientId, clientId)),
      
      // Get estimate payments (through projects)
      db.select({
        id: estimatePayments.id,
        amountCents: estimatePayments.amountCents,
        method: estimatePayments.method,
        status: estimatePayments.status,
        createdAt: estimatePayments.createdAt,
        completedAt: estimatePayments.completedAt,
        estimateTitle: estimates.title
      })
        .from(estimatePayments)
        .innerJoin(estimates, eq(estimatePayments.estimateId, estimates.id))
        .innerJoin(projects, eq(estimates.projectId, projects.id))
        .where(eq(projects.clientId, clientId)),
      
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
      ...clientEstimates.map(estimate => ({
        type: 'proposal' as const,
        id: estimate.id,
        title: `Proposal: ${estimate.title}`,
        description: `Status: ${estimate.status}, Total: $${((estimate.totalCents || 0) / 100).toFixed(2)}`,
        status: estimate.status,
        totalCents: estimate.totalCents || 0,
        sentAt: estimate.sentAt,
        signedAt: estimate.signedAt,
        createdAt: estimate.createdAt
      })),
      ...paymentHistory.map(payment => ({
        type: 'payment' as const,
        id: payment.id,
        title: `Payment received: ${payment.estimateTitle}`,
        description: `${payment.method} - $${(payment.amountCents / 100).toFixed(2)}`,
        status: payment.status,
        amountCents: payment.amountCents,
        method: payment.method,
        completedAt: payment.completedAt,
        createdAt: payment.createdAt
      })),
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

  async getClientMessages(clientId: string): Promise<Message[]> {
    // Get regular messages
    const regularMessages = await db.select({
      id: messages.id,
      clientId: messages.clientId,
      photographerId: messages.photographerId,
      content: messages.content,
      sentByPhotographer: messages.sentByPhotographer,
      channel: messages.channel,
      readAt: messages.readAt,
      createdAt: messages.createdAt
    }).from(messages)
      .where(eq(messages.clientId, clientId));

    // Get SMS messages and convert them to Message format
    const smsMessages = await db.select({
      id: smsLogs.id,
      clientId: smsLogs.clientId,
      content: smsLogs.messageBody,
      direction: smsLogs.direction,
      sentAt: smsLogs.sentAt,
      createdAt: smsLogs.createdAt,
      photographerId: clients.photographerId
    }).from(smsLogs)
      .innerJoin(clients, eq(smsLogs.clientId, clients.id))
      .where(eq(smsLogs.clientId, clientId));

    // Convert SMS messages to Message format
    const convertedSmsMessages = smsMessages.map(sms => ({
      id: sms.id,
      clientId: sms.clientId,
      photographerId: sms.photographerId,
      content: sms.content || '',
      sentByPhotographer: sms.direction === 'OUTBOUND',
      channel: 'SMS' as const,
      readAt: null,
      createdAt: sms.createdAt || sms.sentAt
    }));

    // Combine and sort all messages by creation time
    const allMessages = [...regularMessages, ...convertedSmsMessages];
    return allMessages.sort((a, b) => {
      const aTime = a.createdAt?.getTime() || 0;
      const bTime = b.createdAt?.getTime() || 0;
      return bTime - aTime; // Most recent first
    });
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
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

  // Proposal wrapper methods (aliases for Estimate methods to enable terminology migration)
  async getProposalsByPhotographer(photographerId: string): Promise<ProposalWithClient[]> {
    return this.getEstimatesByPhotographer(photographerId);
  }

  async getProposalsByClient(clientId: string): Promise<ProposalWithClient[]> {
    return await db.select({
      id: estimates.id,
      photographerId: estimates.photographerId,
      clientId: estimates.clientId,
      title: estimates.title,
      notes: estimates.notes,
      currency: estimates.currency,
      subtotalCents: estimates.subtotalCents,
      discountCents: estimates.discountCents,
      taxCents: estimates.taxCents,
      totalCents: estimates.totalCents,
      depositPercent: estimates.depositPercent,
      depositCents: estimates.depositCents,
      status: estimates.status,
      validUntil: estimates.validUntil,
      createdAt: estimates.createdAt,
      sentAt: estimates.sentAt,
      signedAt: estimates.signedAt,
      signedByName: estimates.signedByName,
      signedByEmail: estimates.signedByEmail,
      signedIp: estimates.signedIp,
      signedUserAgent: estimates.signedUserAgent,
      signatureImageUrl: estimates.signatureImageUrl,
      token: estimates.token,
      client: {
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        eventDate: clients.eventDate,
        projectType: clients.projectType,
        leadSource: clients.leadSource
      }
    })
    .from(estimates)
    .innerJoin(clients, eq(estimates.clientId, clients.id))
    .where(eq(estimates.clientId, clientId))
    .orderBy(desc(estimates.createdAt));
  }

  async getProposal(id: string): Promise<ProposalWithRelations | undefined> {
    return this.getEstimate(id);
  }

  async getProposalByToken(token: string): Promise<ProposalWithRelations | undefined> {
    return this.getEstimateByToken(token);
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    return this.createEstimate(proposal);
  }

  async updateProposal(id: string, proposal: Partial<Proposal>): Promise<Proposal> {
    return this.updateEstimate(id, proposal);
  }

  async deleteProposal(id: string): Promise<void> {
    return this.deleteEstimate(id);
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
  }): Promise<void> {
    await db.update(photographers)
      .set({
        googleCalendarAccessToken: credentials.accessToken,
        googleCalendarRefreshToken: credentials.refreshToken || null,
        googleCalendarTokenExpiry: credentials.expiryDate || null,
        googleCalendarScope: credentials.scope || null,
        googleCalendarId: credentials.calendarId || null,
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
  } | null> {
    const [photographer] = await db.select({
      accessToken: photographers.googleCalendarAccessToken,
      refreshToken: photographers.googleCalendarRefreshToken,
      expiryDate: photographers.googleCalendarTokenExpiry,
      scope: photographers.googleCalendarScope,
      connectedAt: photographers.googleCalendarConnectedAt,
      calendarId: photographers.googleCalendarId
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
      calendarId: photographer.calendarId || undefined
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
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone
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
      .leftJoin(clients, eq(projects.clientId, clients.id))
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
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone
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
      .leftJoin(clients, eq(projects.clientId, clients.id))
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
      stageEnteredAt: finalStageId ? new Date() : null
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
    const updateData = {
      ...projectUpdate,
      ...(projectUpdate.stageId !== undefined && {
        stageEnteredAt: projectUpdate.stageId ? new Date() : null
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

      // Get the client to check email opt-in
      const client = await db.select()
        .from(clients)
        .where(eq(clients.id, project.clientId))
        .limit(1);

      console.log(`🔍 Client check: Found ${client.length} clients, Email opt-in: ${client[0]?.emailOptIn}, Has email: ${!!client[0]?.email}`);
      if (!client.length || !client[0].emailOptIn || !client[0].email) {
        console.log(`❌ Skipping auto-subscription: Client has no email opt-in or email address`);
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

      console.log(`✅ AUTO-SUBSCRIBED: Project ${project.id} (${client[0].firstName} ${client[0].lastName}) to wedding campaign ${weddingCampaign[0].name}`);
    } catch (error) {
      console.error('❌ ERROR in auto-subscribing to wedding campaign:', error);
    }
  }

  async getProjectHistory(projectId: string): Promise<TimelineEvent[]> {
    // Get the project to find the client ID
    const project = await this.getProject(projectId);
    if (!project || !project.clientId) return [];
    
    // Use the existing client history method but filter for this project
    const clientHistory = await this.getClientHistory(project.clientId);
    
    // TODO: In the future, we could filter timeline events specifically related to this project
    // For now, return all client history as it's project-scoped in the new architecture
    return clientHistory;
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
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email
      }
    })
      .from(dripCampaignSubscriptions)
      .innerJoin(dripCampaigns, eq(dripCampaignSubscriptions.campaignId, dripCampaigns.id))
      .innerJoin(projects, eq(dripCampaignSubscriptions.projectId, projects.id))
      .innerJoin(clients, eq(dripCampaignSubscriptions.clientId, clients.id))
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
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email
      }
    })
      .from(dripCampaignSubscriptions)
      .innerJoin(dripCampaigns, eq(dripCampaignSubscriptions.campaignId, dripCampaigns.id))
      .innerJoin(projects, eq(dripCampaignSubscriptions.projectId, projects.id))
      .innerJoin(clients, eq(dripCampaignSubscriptions.clientId, clients.id))
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
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email
      }
    })
      .from(dripCampaignSubscriptions)
      .innerJoin(dripCampaigns, eq(dripCampaignSubscriptions.campaignId, dripCampaigns.id))
      .innerJoin(projects, eq(dripCampaignSubscriptions.projectId, projects.id))
      .innerJoin(clients, eq(dripCampaignSubscriptions.clientId, clients.id))
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
}

export const storage = new DatabaseStorage();
