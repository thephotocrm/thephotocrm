import { 
  photographers, users, clients, stages, templates, automations, automationSteps,
  emailLogs, smsLogs, photographerLinks, checklistTemplateItems, clientChecklistItems,
  packages, packageItems, questionnaireTemplates, questionnaireQuestions, clientQuestionnaires,
  availabilitySlots, bookings, estimates, estimateItems, estimatePayments,
  messages, clientActivityLog, clientPortalTokens,
  type User, type InsertUser, type Photographer, type InsertPhotographer,
  type Client, type InsertClient, type ClientWithStage, type Stage, type InsertStage,
  type Template, type InsertTemplate, type Automation, type InsertAutomation,
  type AutomationStep, type InsertAutomationStep, type Package, type InsertPackage,
  type Estimate, type InsertEstimate, type EstimateItem, type EstimateWithClient, type EstimateWithRelations,
  type QuestionnaireTemplate, type InsertQuestionnaireTemplate,
  type QuestionnaireQuestion, type InsertQuestionnaireQuestion,
  type Message, type InsertMessage, type ClientActivityLog, type TimelineEvent, type ClientPortalToken, type InsertClientPortalToken,
  type Proposal, type InsertProposal, type ProposalItem, type ProposalPayment, type ProposalWithClient, type ProposalWithRelations,
  type AvailabilitySlot, type InsertAvailabilitySlot,
  type Booking, type InsertBooking
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, inArray, gte, lte } from "drizzle-orm";

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
  getClientsByPhotographer(photographerId: string, projectType?: string): Promise<ClientWithStage[]>;
  getClient(id: string): Promise<ClientWithStage | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<Client>): Promise<Client>;
  getClientHistory(clientId: string): Promise<TimelineEvent[]>;
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
  
  // Bookings
  getBookingsByPhotographer(photographerId: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingByToken(token: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, booking: Partial<Booking>): Promise<Booking>;
  deleteBooking(id: string): Promise<void>;

  // Availability Slots
  getAvailabilitySlotsByPhotographer(photographerId: string): Promise<AvailabilitySlot[]>;
  getAvailabilitySlot(id: string): Promise<AvailabilitySlot | undefined>;
  createAvailabilitySlot(slot: InsertAvailabilitySlot): Promise<AvailabilitySlot>;
  updateAvailabilitySlot(id: string, slot: Partial<AvailabilitySlot>): Promise<AvailabilitySlot>;
  deleteAvailabilitySlot(id: string): Promise<void>;

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

  async getClientsByPhotographer(photographerId: string, projectType?: string): Promise<ClientWithStage[]> {
    const rows = await db.select({
      id: clients.id,
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone,
      eventDate: clients.eventDate,
      projectType: clients.projectType,
      leadSource: clients.leadSource,
      createdAt: clients.createdAt,
      stageId: clients.stageId,
      stageData: {
        id: stages.id,
        name: stages.name,
        isDefault: stages.isDefault
      }
    })
      .from(clients)
      .leftJoin(stages, eq(clients.stageId, stages.id))
      .where(projectType ? 
        and(eq(clients.photographerId, photographerId), eq(clients.projectType, projectType)) :
        eq(clients.photographerId, photographerId)
      )
      .orderBy(desc(clients.createdAt));
      
    return rows.map(row => ({
      ...row,
      stage: row.stageData?.id ? {
        id: row.stageData.id,
        name: row.stageData.name,
        color: "#3b82f6", // Default blue color since color field doesn't exist in DB
        isDefault: row.stageData.isDefault
      } : null
    }));
  }

  async getClient(id: string): Promise<ClientWithStage | undefined> {
    const [row] = await db.select({
      id: clients.id,
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone,
      eventDate: clients.eventDate,
      projectType: clients.projectType,
      leadSource: clients.leadSource,
      notes: clients.notes,
      smsOptIn: clients.smsOptIn,
      emailOptIn: clients.emailOptIn,
      createdAt: clients.createdAt,
      stageId: clients.stageId,
      stageEnteredAt: clients.stageEnteredAt,
      photographerId: clients.photographerId,
      stageData: {
        id: stages.id,
        name: stages.name,
        isDefault: stages.isDefault
      }
    })
      .from(clients)
      .leftJoin(stages, eq(clients.stageId, stages.id))
      .where(eq(clients.id, id));
      
    if (!row) return undefined;
    
    return {
      ...row,
      stage: row.stageData?.id ? {
        id: row.stageData.id,
        name: row.stageData.name,
        color: "#3b82f6", // Default blue color since stages table doesn't have color
        isDefault: row.stageData.isDefault
      } : null
    };
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    // If no stage provided, assign default stage automatically
    let finalStageId = insertClient.stageId;
    
    if (!finalStageId) {
      // Find default stage for this photographer and project type
      const [defaultStage] = await db.select()
        .from(stages)
        .where(and(
          eq(stages.photographerId, insertClient.photographerId),
          eq(stages.projectType, insertClient.projectType || 'WEDDING'),
          eq(stages.isDefault, true)
        ))
        .limit(1);
      
      finalStageId = defaultStage?.id || null;
    }
    
    // Set stageEnteredAt timestamp when assigning to any stage
    const clientData = {
      ...insertClient,
      stageId: finalStageId,
      stageEnteredAt: finalStageId ? new Date() : null
    };
    
    const [client] = await db.insert(clients).values(clientData).returning();
    return client;
  }

  async updateClient(id: string, clientUpdate: Partial<Client>): Promise<Client> {
    // If stageId is being updated, set stageEnteredAt timestamp
    const updateData = {
      ...clientUpdate,
      ...(clientUpdate.stageId !== undefined && {
        stageEnteredAt: clientUpdate.stageId ? new Date() : null
      })
    };
    
    const [updated] = await db.update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();
    return updated;
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

  async getClientHistory(clientId: string): Promise<TimelineEvent[]> {
    // Parallelize all queries for better performance
    const [activityLogs, emailLogEntries, smsLogEntries, clientEstimates, paymentHistory, messageHistory] = await Promise.all([
      // Get activity log entries
      db.select().from(clientActivityLog)
        .where(eq(clientActivityLog.clientId, clientId)),
      
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
      
      // Get estimates for this client
      db.select().from(estimates)
        .where(eq(estimates.clientId, clientId)),
      
      // Get estimate payments
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
        .where(eq(estimates.clientId, clientId)),
      
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
    return await db.select().from(messages)
      .where(eq(messages.clientId, clientId))
      .orderBy(desc(messages.createdAt));
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

  async createAvailabilitySlot(slot: InsertAvailabilitySlot): Promise<AvailabilitySlot> {
    const [newSlot] = await db.insert(availabilitySlots).values(slot).returning();
    return newSlot;
  }

  async updateAvailabilitySlot(id: string, slot: Partial<AvailabilitySlot>): Promise<AvailabilitySlot> {
    const [updatedSlot] = await db.update(availabilitySlots)
      .set(slot)
      .where(eq(availabilitySlots.id, id))
      .returning();
    return updatedSlot;
  }

  async deleteAvailabilitySlot(id: string): Promise<void> {
    await db.delete(availabilitySlots).where(eq(availabilitySlots.id, id));
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
}

export const storage = new DatabaseStorage();
