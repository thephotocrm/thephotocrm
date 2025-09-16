import { 
  photographers, users, clients, stages, templates, automations, automationSteps,
  emailLogs, smsLogs, photographerLinks, checklistTemplateItems, clientChecklistItems,
  packages, packageItems, questionnaireTemplates, questionnaireQuestions, clientQuestionnaires,
  availabilitySlots, bookings, estimates, estimateItems, estimatePayments,
  type User, type InsertUser, type Photographer, type InsertPhotographer,
  type Client, type InsertClient, type ClientWithStage, type Stage, type InsertStage,
  type Template, type InsertTemplate, type Automation, type InsertAutomation,
  type AutomationStep, type InsertAutomationStep, type Package, type InsertPackage,
  type Estimate, type InsertEstimate, type QuestionnaireTemplate, type InsertQuestionnaireTemplate
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, inArray, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Photographers
  getPhotographer(id: string): Promise<Photographer | undefined>;
  createPhotographer(photographer: InsertPhotographer): Promise<Photographer>;
  updatePhotographer(id: string, photographer: Partial<Photographer>): Promise<Photographer>;
  
  // Clients
  getClientsByPhotographer(photographerId: string): Promise<ClientWithStage[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<Client>): Promise<Client>;
  
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

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    const [updated] = await db.update(clients)
      .set(client)
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

  async getEstimatesByPhotographer(photographerId: string): Promise<Estimate[]> {
    return await db.select().from(estimates)
      .where(eq(estimates.photographerId, photographerId))
      .orderBy(desc(estimates.createdAt));
  }

  async getEstimateByToken(token: string): Promise<Estimate | undefined> {
    const [estimate] = await db.select().from(estimates).where(eq(estimates.token, token));
    return estimate || undefined;
  }

  async createEstimate(insertEstimate: InsertEstimate): Promise<Estimate> {
    const [estimate] = await db.insert(estimates).values(insertEstimate).returning();
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
}

export const storage = new DatabaseStorage();
