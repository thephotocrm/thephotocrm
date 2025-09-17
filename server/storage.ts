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
  type Estimate, type InsertEstimate, type QuestionnaireTemplate, type InsertQuestionnaireTemplate,
  type Message, type InsertMessage, type ClientActivityLog, type TimelineEvent, type ClientPortalToken, type InsertClientPortalToken
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
  createPhotographer(photographer: InsertPhotographer): Promise<Photographer>;
  updatePhotographer(id: string, photographer: Partial<Photographer>): Promise<Photographer>;
  
  // Clients
  getClientsByPhotographer(photographerId: string): Promise<ClientWithStage[]>;
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
  getStagesByPhotographer(photographerId: string): Promise<Stage[]>;
  createStage(stage: InsertStage): Promise<Stage>;
  updateStage(id: string, stage: Partial<Stage>): Promise<Stage>;
  deleteStage(id: string): Promise<void>;
  
  // Templates
  getTemplatesByPhotographer(photographerId: string): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<Template>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  
  // Automations
  getAutomationsByPhotographer(photographerId: string): Promise<Automation[]>;
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
  getEstimatesByPhotographer(photographerId: string): Promise<Estimate[]>;
  getEstimateByToken(token: string): Promise<Estimate | undefined>;
  createEstimate(estimate: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: string, estimate: Partial<Estimate>): Promise<Estimate>;
  
  // Questionnaire Templates
  getQuestionnaireTemplatesByPhotographer(photographerId: string): Promise<QuestionnaireTemplate[]>;
  createQuestionnaireTemplate(template: InsertQuestionnaireTemplate): Promise<QuestionnaireTemplate>;
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

  async getClientsByPhotographer(photographerId: string): Promise<ClientWithStage[]> {
    const rows = await db.select({
      id: clients.id,
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone,
      weddingDate: clients.weddingDate,
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
      .where(eq(clients.photographerId, photographerId))
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
      weddingDate: clients.weddingDate,
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
      // Find default stage (Inquiry) for this photographer
      const [defaultStage] = await db.select()
        .from(stages)
        .where(and(
          eq(stages.photographerId, insertClient.photographerId),
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

  async getStagesByPhotographer(photographerId: string): Promise<Stage[]> {
    return await db.select().from(stages)
      .where(eq(stages.photographerId, photographerId))
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

  async getAutomationsByPhotographer(photographerId: string): Promise<Automation[]> {
    return await db.select().from(automations)
      .where(eq(automations.photographerId, photographerId));
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

  async getEstimatesByPhotographer(photographerId: string): Promise<any[]> {
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
        email: clients.email
      }
    })
    .from(estimates)
    .innerJoin(clients, eq(estimates.clientId, clients.id))
    .where(eq(estimates.photographerId, photographerId))
    .orderBy(desc(estimates.createdAt));
  }

  async getEstimateByToken(token: string): Promise<Estimate | undefined> {
    const [estimate] = await db.select().from(estimates).where(eq(estimates.token, token));
    return estimate || undefined;
  }

  async createEstimate(insertEstimate: InsertEstimate): Promise<Estimate> {
    const [estimate] = await db.insert(estimates).values(insertEstimate).returning();
    
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

  async getQuestionnaireTemplatesByPhotographer(photographerId: string): Promise<QuestionnaireTemplate[]> {
    return await db.select().from(questionnaireTemplates)
      .where(eq(questionnaireTemplates.photographerId, photographerId))
      .orderBy(desc(questionnaireTemplates.createdAt));
  }

  async createQuestionnaireTemplate(insertTemplate: InsertQuestionnaireTemplate): Promise<QuestionnaireTemplate> {
    const [template] = await db.insert(questionnaireTemplates).values(insertTemplate).returning();
    return template;
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
}

export const storage = new DatabaseStorage();
