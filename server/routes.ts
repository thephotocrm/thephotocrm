import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from 'cookie-parser';
import Stripe from "stripe";
import { storage } from "./storage";
import { db } from "./db";
import { authenticateToken, requirePhotographer, requireRole } from "./middleware/auth";
import { hashPassword, authenticateUser, generateToken } from "./services/auth";
import { sendEmail } from "./services/email";
import { sendSms } from "./services/sms";
import { createPaymentIntent, createCheckoutSession, createConnectCheckoutSession, calculatePlatformFee, handleWebhook, stripe } from "./services/stripe";
import { googleCalendarService } from "./services/calendar";
import { insertUserSchema, insertPhotographerSchema, insertClientSchema, insertStageSchema, 
         insertTemplateSchema, insertAutomationSchema, validateAutomationSchema, insertAutomationStepSchema, insertPackageSchema, 
         insertEstimateSchema, insertMessageSchema, insertBookingSchema, updateBookingSchema, 
         bookingConfirmationSchema, sanitizedBookingSchema, insertQuestionnaireTemplateSchema, insertQuestionnaireQuestionSchema, 
         insertAvailabilitySlotSchema, updateAvailabilitySlotSchema, emailLogs, smsLogs, projectActivityLog,
         projectTypeEnum, createOnboardingLinkSchema, createPayoutSchema } from "@shared/schema";
import { z } from "zod";
import { startCronJobs } from "./jobs/cron";
import path from "path";


export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());

  // CORS configuration for authenticated API routes
  app.use((req, res, next) => {
    // Allow credentials and set proper origin
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });

  // Start cron jobs
  startCronJobs();

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, businessName, role = "PHOTOGRAPHER" } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      let photographerId: string | undefined;
      
      if (role === "PHOTOGRAPHER") {
        // Create photographer profile
        const photographer = await storage.createPhotographer({
          businessName,
          timezone: "America/New_York"
        });
        photographerId = photographer.id;

        // Create default stages
        const defaultStages = [
          { name: "Inquiry", orderIndex: 0, isDefault: true },
          { name: "Consultation", orderIndex: 1, isDefault: false },
          { name: "Proposal Sent", orderIndex: 2, isDefault: false },
          { name: "Booked", orderIndex: 3, isDefault: false }
        ];

        for (const stage of defaultStages) {
          await storage.createStage({
            ...stage,
            photographerId: photographer.id,
            projectType: "WEDDING" // Default project type for new photographers
          });
        }
      }

      // Create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash,
        role,
        photographerId
      });

      res.status(201).json({ message: "User created successfully", userId: user.id });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const result = await authenticateUser(email, password);
      if (!result) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set HTTP-only cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({ 
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          photographerId: result.user.photographerId
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie('token');
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        photographerId: user.photographerId
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Photographer settings
  app.get("/api/photographer", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }
      res.json(photographer);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/photographer", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const updated = await storage.updatePhotographer(req.user!.photographerId!, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stages
  app.get("/api/stages", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectType } = req.query;
      console.log(`[STAGES API] Getting stages for photographer: ${req.user!.photographerId}, projectType: ${projectType}`);
      const stages = await storage.getStagesByPhotographer(
        req.user!.photographerId!, 
        projectType as string | undefined
      );
      console.log(`[STAGES API] Retrieved ${stages.length} stages`);
      res.json(stages);
    } catch (error) {
      console.error("[STAGES API] Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/stages", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const stageData = insertStageSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      const stage = await storage.createStage(stageData);
      res.status(201).json(stage);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Clients
  app.get("/api/clients", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectType } = req.query;
      console.log('[CLIENTS API] Getting clients for photographer:', req.user!.photographerId!, 'projectType:', projectType);
      const clients = await storage.getClientsByPhotographer(
        req.user!.photographerId!, 
        projectType as string | undefined
      );
      console.log('[CLIENTS API] Retrieved', clients.length, 'clients');
      res.json(clients);
    } catch (error) {
      console.error('[CLIENTS API] Error getting clients:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/clients", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      console.log('[CLIENT CREATION] Request body:', req.body);
      
      // Separate client and project data
      const { projectType, eventDate, leadSource, ...clientFields } = req.body;
      
      // Parse client data
      const clientData = insertClientSchema.parse({
        ...clientFields,
        photographerId: req.user!.photographerId!
      });
      
      console.log('[CLIENT CREATION] Parsed client data:', clientData);

      // Create the client first
      const client = await storage.createClient(clientData);
      console.log('[CLIENT CREATION] Created client:', client.id);

      // If project data is provided, create a project for this client
      if (projectType) {
        // Get default stage for this project type
        const stages = await storage.getStagesByPhotographer(
          req.user!.photographerId!,
          projectType
        );
        const defaultStage = stages.find(s => s.isDefault);
        console.log('[CLIENT CREATION] Default stage:', defaultStage?.name);

        // Create project data
        const projectData = {
          clientId: client.id,
          photographerId: req.user!.photographerId!,
          projectType: projectType,
          title: `${projectType} - ${client.firstName} ${client.lastName}`,
          leadSource: leadSource || 'MANUAL',
          eventDate: eventDate ? new Date(eventDate) : null,
          stageId: defaultStage?.id,
          stageEnteredAt: defaultStage ? new Date() : null
        };
        
        console.log('[CLIENT CREATION] Creating project:', projectData);
        const project = await storage.createProject(projectData);
        console.log('[CLIENT CREATION] Created project:', project.id);
      }

      // TODO: Create checklist items for client
      // TODO: Trigger automation events

      res.status(201).json(client);
    } catch (error) {
      console.error("[CLIENT CREATION] Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/clients/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Verify client belongs to this photographer
      const existingClient = await storage.getClient(req.params.id);
      if (!existingClient || existingClient.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Whitelist allowed fields - explicitly reject dangerous fields
      if (req.body.stageId !== undefined) {
        return res.status(400).json({ message: "Use /api/clients/:id/stage to change client stage" });
      }
      if (req.body.photographerId !== undefined) {
        return res.status(400).json({ message: "Cannot change photographer assignment" });
      }
      if (req.body.projectType !== undefined) {
        return res.status(400).json({ message: "Project type changes not currently supported - contact support" });
      }
      
      // Create safe update schema - only allow safe fields
      const safeUpdateSchema = insertClientSchema.pick({
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        eventDate: true,
        leadSource: true,
        notes: true,
        smsOptIn: true,
        emailOptIn: true
      }).partial();
      
      const safeUpdateData = safeUpdateSchema.parse(req.body);
      const client = await storage.updateClient(req.params.id, safeUpdateData);
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/clients/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Verify client belongs to this photographer
      const existingClient = await storage.getClient(req.params.id);
      if (!existingClient || existingClient.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Delete the client and all related data (cascading delete)
      await storage.deleteClient(req.params.id);
      
      res.json({ 
        message: "Client and all related data deleted successfully",
        deletedClientId: req.params.id
      });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/clients/:id/stage", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { stageId } = req.body;
      
      // Verify client belongs to this photographer
      const existingClient = await storage.getClient(req.params.id);
      if (!existingClient || existingClient.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Verify stage belongs to same photographer and matches client's project type
      const stages = await storage.getStagesByPhotographer(
        req.user!.photographerId!, 
        existingClient.projectType
      );
      const targetStage = stages.find(s => s.id === stageId);
      if (!targetStage) {
        return res.status(400).json({ message: "Invalid stage for this client's project type" });
      }
      
      const client = await storage.updateClient(req.params.id, {
        stageId,
        stageEnteredAt: new Date()
      });
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/clients/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client || client.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/clients/:id/history", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client || client.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const history = await storage.getClientHistory(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/clients/:id/messages", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client || client.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const messages = await storage.getClientMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/messages", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Add photographerId before validation since it's required by the schema
      const messageData = insertMessageSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      
      // Verify client belongs to photographer
      const client = await storage.getClient(messageData.clientId);
      if (!client || client.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/clients/:id/send-login-link", authenticateToken, requirePhotographer, async (req, res) => {
    console.log('=== SEND LOGIN LINK REQUEST RECEIVED ===');
    console.log('Client ID:', req.params.id);
    console.log('User:', req.user);
    try {
      const client = await storage.getClient(req.params.id);
      if (!client || client.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      if (!client.email) {
        return res.status(400).json({ message: "Client has no email address" });
      }

      // Rate limiting check - max 100 tokens per hour per client (increased for testing)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentTokens = await storage.getClientPortalTokensByClient(client.id, oneHourAgo);
      
      if (recentTokens.length >= 100) {
        return res.status(429).json({ message: "Too many login link requests. Please wait before requesting another." });
      }

      // Generate secure token (valid for 7 days)
      const token = generateToken({ 
        userId: client.id, 
        role: 'CLIENT', 
        photographerId: client.photographerId 
      } as any);
      
      // Store token in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await storage.createClientPortalToken({
        clientId: client.id,
        token,
        expiresAt
      });

      // Send email and SMS with login link
      const photographer = await storage.getPhotographer(client.photographerId);
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/client-portal?token=${token}`;
      
      console.log('=== ATTEMPTING TO SEND EMAIL & SMS ===');
      console.log('Login URL generated:', loginUrl);
      console.log('Client email:', client.email);
      console.log('Client phone:', client.phone);
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
      console.log('TWILIO credentials exist:', !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN);
      
      const emailText = `Hi ${client.firstName},

You can now access your client portal to view your project details, proposals, and communicate with us.

Access your portal: ${loginUrl}

This link is valid for 7 days.

Best regards,
${photographer?.businessName || 'Your Photography Team'}`;

      const smsText = `Hi ${client.firstName}! Access your client portal: ${loginUrl} (Valid for 7 days) - ${photographer?.businessName || 'Your Photographer'}`;
      
      let emailSent = false;
      let smsSent = false;
      let emailError = '';
      let smsError = '';
      
      // Try to send both email and SMS
      const results = await Promise.allSettled([
        // Send email
        client.email ? sendEmail({
          to: client.email,
          from: photographer?.emailFromAddr || 'noreply@lazyphotog.com',
          subject: `Access Your Client Portal - ${photographer?.businessName || 'Your Photographer'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Welcome to Your Client Portal</h2>
              <p>Hi ${client.firstName},</p>
              <p>You can now access your client portal to view your project details, proposals, and communicate with us.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Access Client Portal
                </a>
              </div>
              
              <p><strong>This link is valid for 7 days.</strong></p>
              
              <p>If you have any questions, please don't hesitate to reach out.</p>
              <p>Best regards,<br>${photographer?.businessName || 'Your Photography Team'}</p>
              
              <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #666;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                ${loginUrl}
              </p>
            </div>
          `,
          text: emailText
        }) : Promise.resolve(false),
        
        // Send SMS
        client.phone ? sendSms({
          to: client.phone,
          body: smsText
        }) : Promise.resolve({ success: false, error: 'No phone number' })
      ]);
      
      // Process email result
      if (results[0].status === 'fulfilled') {
        emailSent = results[0].value as boolean;
        if (!emailSent && client.email) {
          emailError = 'Email service unavailable';
        }
      } else {
        emailError = results[0].reason?.message || 'Email failed';
        console.error('Email promise rejected:', results[0].reason);
      }
      
      // Process SMS result  
      if (results[1].status === 'fulfilled') {
        const smsResult = results[1].value as { success: boolean; error?: string };
        smsSent = smsResult.success;
        if (!smsSent && client.phone) {
          smsError = smsResult.error || 'SMS service unavailable';
        }
      } else {
        smsError = results[1].reason?.message || 'SMS failed';
        console.error('SMS promise rejected:', results[1].reason);
      }
      
      console.log('=== NOTIFICATION RESULTS ===');
      console.log('Email sent:', emailSent, emailError ? `(Error: ${emailError})` : '');
      console.log('SMS sent:', smsSent, smsError ? `(Error: ${smsError})` : '');
      
      // Determine response message
      let message = '';
      let sentMethods: string[] = [];
      let failedMethods: string[] = [];
      
      if (emailSent) sentMethods.push('email');
      if (smsSent) sentMethods.push('SMS');
      
      if (!emailSent && client.email) failedMethods.push(`email (${emailError})`);
      if (!smsSent && client.phone) failedMethods.push(`SMS (${smsError})`);
      
      if (sentMethods.length > 0) {
        message = `Login link sent successfully via ${sentMethods.join(' and ')}`;
        if (failedMethods.length > 0) {
          message += `. Note: ${failedMethods.join(' and ')} failed`;
        }
      } else {
        message = `Failed to send login link`;
        if (failedMethods.length > 0) {
          message += `: ${failedMethods.join(' and ')} failed`;
        }
      }
      
      // In development or if no methods worked, provide the login URL directly
      const response: any = { message };
      
      if (process.env.NODE_ENV === 'development' || (!emailSent && !smsSent)) {
        response.loginUrl = loginUrl;
        response.debugInfo = {
          clientEmail: client.email || 'not provided',
          clientPhone: client.phone || 'not provided',
          emailSent,
          smsSent,
          emailError: emailError || 'none',
          smsError: smsError || 'none',
          tokenGenerated: true,
          validFor: '7 days'
        };
      }
      
      res.json(response);
    } catch (error: any) {
      console.error('Send login link error:', error);
      console.error('Error details:', { 
        name: error?.name, 
        message: error?.message, 
        stack: error?.stack 
      });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Projects - NEW CLIENT/PROJECT SEPARATION API
  app.get("/api/projects", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectType } = req.query;
      const projects = await storage.getProjectsByPhotographer(
        req.user!.photographerId!, 
        projectType as string | undefined
      );
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Import InsertProject schema
      const insertProjectSchema = z.object({
        photographerId: z.string(),
        clientId: z.string(),
        title: z.string().min(1),
        projectType: z.enum(['WEDDING', 'ENGAGEMENT', 'PROPOSAL', 'CORPORATE', 'PORTRAIT', 'FAMILY', 'MATERNITY', 'NEWBORN', 'EVENT', 'COMMERCIAL', 'OTHER']),
        eventDate: z.date().optional(),
        leadSource: z.enum(['WEBSITE_WIDGET', 'REFERRAL', 'SOCIAL_MEDIA', 'ADVERTISING', 'REPEAT_CLIENT', 'OTHER']).optional(),
        smsOptIn: z.boolean().default(false),
        emailOptIn: z.boolean().default(true),
        notes: z.string().optional()
      });

      const projectData = insertProjectSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });

      // Verify client belongs to photographer
      const client = await storage.getClient(projectData.clientId);
      if (!client || client.photographerId !== req.user!.photographerId!) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid project data", 
          errors: error.errors 
        });
      }
      console.error("Create project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/projects/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Verify project belongs to photographer
      const existingProject = await storage.getProject(req.params.id);
      if (!existingProject || existingProject.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Whitelist allowed fields - explicitly reject dangerous fields
      if (req.body.stageId !== undefined) {
        return res.status(400).json({ message: "Use /api/projects/:id/stage to change project stage" });
      }

      const allowedFields = ['title', 'eventDate', 'leadSource', 'smsOptIn', 'emailOptIn', 'notes', 'status'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const project = await storage.updateProject(req.params.id, updateData);
      res.json(project);
    } catch (error) {
      console.error("Update project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/projects/:id/stage", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { stageId } = req.body;
      
      // Verify project belongs to photographer
      const existingProject = await storage.getProject(req.params.id);
      if (!existingProject || existingProject.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify stage belongs to same photographer and matches project type
      if (stageId) {
        const stage = await storage.getStage(stageId);
        if (!stage || stage.photographerId !== req.user!.photographerId!) {
          return res.status(400).json({ message: "Invalid stage ID" });
        }
        
        if (stage.projectType !== existingProject.projectType) {
          return res.status(400).json({ message: "Stage project type doesn't match project" });
        }
      }
      
      const project = await storage.updateProject(req.params.id, { stageId });
      res.json(project);
    } catch (error) {
      console.error("Update project stage error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/:id/history", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const history = await storage.getProjectHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Get project history error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Templates
  app.get("/api/templates", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const templates = await storage.getTemplatesByPhotographer(req.user!.photographerId!);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/templates", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const templateData = insertTemplateSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      const template = await storage.createTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Packages
  app.get("/api/packages", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const packages = await storage.getPackagesByPhotographer(req.user!.photographerId!);
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/packages", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const packageData = insertPackageSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      const pkg = await storage.createPackage(packageData);
      res.status(201).json(pkg);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Estimates
  app.get("/api/estimates", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const estimates = await storage.getEstimatesByPhotographer(req.user!.photographerId!);
      res.json(estimates);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get estimates by project ID
  app.get("/api/estimates/project/:projectId", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectId } = req.params;
      
      // First verify the project belongs to this photographer
      const project = await storage.getProject(projectId);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }

      const estimates = await storage.getEstimatesByProject(projectId);
      res.json(estimates);
    } catch (error) {
      console.error("Get project estimates error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/estimates", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const estimateData = insertEstimateSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      const estimate = await storage.createEstimate(estimateData);
      
      // Send proposal notifications to client if estimate has sentAt date
      if (estimate.sentAt && estimate.clientId) {
        try {
          // Get client info for notifications
          const client = await storage.getClient(estimate.clientId);
          const photographer = await storage.getPhotographer(req.user!.photographerId!);
          
          if (client && photographer) {
            const proposalUrl = `${process.env.VITE_APP_URL || 'https://thephotocrm.com'}/public/estimates/${estimate.token}`;
            
            // Email notification
            if (client.email && client.emailOptIn) {
              const emailSuccess = await sendEmail({
                to: client.email,
                from: `${photographer.businessName} <${process.env.SENDGRID_FROM_EMAIL}>`,
                replyTo: photographer.emailFromAddr || process.env.SENDGRID_FROM_EMAIL,
                subject: `New Proposal: ${estimate.title}`,
                html: `
                  <h2>You have received a new proposal!</h2>
                  <p>Hi ${client.firstName},</p>
                  <p>${photographer.businessName} has sent you a new proposal titled "${estimate.title}".</p>
                  <p><strong>Total Amount:</strong> $${((estimate.totalCents || 0) / 100).toFixed(2)}</p>
                  <p><a href="${proposalUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View & Sign Proposal</a></p>
                  <p>You can view and electronically sign your proposal by clicking the link above.</p>
                  <p>Best regards,<br>${photographer.businessName}</p>
                `,
                text: `You have received a new proposal from ${photographer.businessName}!\n\nProposal: ${estimate.title}\nTotal: $${((estimate.totalCents || 0) / 100).toFixed(2)}\n\nView and sign at: ${proposalUrl}`
              });
              
              if (emailSuccess) {
                await db.insert(emailLogs).values({
                  clientId: client.id,
                  status: 'sent',
                  sentAt: new Date()
                });
              }
            }
            
            // SMS notification
            if (client.phone && client.smsOptIn) {
              const smsResult = await sendSms({
                to: client.phone,
                body: `New proposal from ${photographer.businessName}: "${estimate.title}" ($${((estimate.totalCents || 0) / 100).toFixed(2)}). View & sign: ${proposalUrl}`
              });
              
              if (smsResult.success) {
                await db.insert(smsLogs).values({
                  clientId: client.id,
                  status: 'sent',
                  providerId: smsResult.sid,
                  sentAt: new Date()
                });
              }
            }
          }
        } catch (notificationError) {
          console.error('Error sending proposal notifications:', notificationError);
          // Don't fail the main request if notifications fail
        }
      }
      
      res.status(201).json(estimate);
    } catch (error) {
      console.error("Create estimate error:", error);
      console.error("Request body:", req.body);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public estimate view
  app.get("/public/estimates/:token", async (req, res) => {
    try {
      const estimate = await storage.getEstimateByToken(req.params.token);
      if (!estimate) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      res.json(estimate);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/public/estimates/:token/sign", async (req, res) => {
    try {
      const { signedByName, signedByEmail, signatureImageUrl } = req.body;
      const estimate = await storage.getEstimateByToken(req.params.token);
      
      if (!estimate) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const updated = await storage.updateEstimate(estimate.id, {
        status: "SIGNED",
        signedAt: new Date(),
        signedByName,
        signedByEmail,
        signatureImageUrl,
        signedIp: req.ip,
        signedUserAgent: req.get('User-Agent')
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;
      const clientSecret = await createPaymentIntent({
        amountCents: Math.round(amount * 100)
      });
      res.json({ clientSecret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post("/public/estimates/:token/pay", async (req, res) => {
    try {
      const { mode } = req.body; // "DEPOSIT" or "FULL"
      const estimate = await storage.getEstimateByToken(req.params.token);
      
      if (!estimate) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const amount = mode === "DEPOSIT" ? (estimate.depositCents || 0) : (estimate.totalCents || 0);
      
      const successUrl = `${process.env.APP_BASE_URL}/payment-success?proposal=${req.params.token}`;
      const cancelUrl = `${process.env.APP_BASE_URL}/public/proposals/${req.params.token}`;

      // Get photographer to check for Stripe Connect account
      const photographer = await storage.getPhotographer(estimate.photographerId);
      
      let checkoutUrl: string;
      
      if (photographer?.stripeConnectAccountId && photographer.payoutEnabled) {
        // Use Stripe Connect for connected photographers
        const platformFeeCents = calculatePlatformFee(amount);
        
        checkoutUrl = await createConnectCheckoutSession({
          amountCents: amount,
          connectedAccountId: photographer.stripeConnectAccountId,
          platformFeeCents,
          successUrl,
          cancelUrl,
          productName: estimate.title,
          metadata: {
            estimateId: estimate.id,
            paymentType: mode,
            photographerId: estimate.photographerId,
            platformFeeCents: platformFeeCents.toString()
          }
        });
      } else {
        // Fallback to standard checkout for non-connected accounts
        checkoutUrl = await createCheckoutSession({
          amountCents: amount,
          successUrl,
          cancelUrl,
          metadata: {
            estimateId: estimate.id,
            paymentType: mode,
            photographerId: estimate.photographerId
          }
        });
      }

      res.json({ url: checkoutUrl });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Send proposal endpoint
  app.post("/api/estimates/:id/send", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const estimateId = req.params.id;
      
      // Get the estimate first to ensure it belongs to the photographer
      const estimate = await storage.getEstimate(estimateId);
      if (!estimate || estimate.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Update estimate with sent timestamp
      const updatedEstimate = await storage.updateEstimate(estimateId, {
        sentAt: new Date()
      });

      // Send notifications to client
      if (estimate.clientId) {
        try {
          // Get client info for notifications
          const client = await storage.getClient(estimate.clientId);
          const photographer = await storage.getPhotographer(req.user!.photographerId!);
          
          if (client && photographer) {
            const proposalUrl = `${process.env.VITE_APP_URL || 'https://thephotocrm.com'}/public/estimates/${estimate.token}`;
            
            // Email notification
            if (client.email && client.emailOptIn) {
              const emailSuccess = await sendEmail({
                to: client.email,
                from: `${photographer.businessName} <${process.env.SENDGRID_FROM_EMAIL}>`,
                replyTo: photographer.emailFromAddr || process.env.SENDGRID_FROM_EMAIL,
                subject: `New Proposal: ${estimate.title}`,
                html: `
                  <h2>You have received a new proposal!</h2>
                  <p>Hi ${client.firstName},</p>
                  <p>${photographer.businessName} has sent you a new proposal titled "${estimate.title}".</p>
                  <p><strong>Total Amount:</strong> $${((estimate.totalCents || 0) / 100).toFixed(2)}</p>
                  <p><a href="${proposalUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View & Sign Proposal</a></p>
                  <p>You can view and electronically sign your proposal by clicking the link above.</p>
                  <p>Best regards,<br>${photographer.businessName}</p>
                `,
                text: `You have received a new proposal from ${photographer.businessName}!\n\nProposal: ${estimate.title}\nTotal: $${((estimate.totalCents || 0) / 100).toFixed(2)}\n\nView and sign at: ${proposalUrl}`
              });
              
              if (emailSuccess) {
                await db.insert(emailLogs).values({
                  clientId: client.id,
                  status: 'sent',
                  sentAt: new Date()
                });
              }
            }
            
            // SMS notification
            if (client.phone && client.smsOptIn) {
              const smsResult = await sendSms({
                to: client.phone,
                body: `Hi ${client.firstName}, ${photographer.businessName} has sent you a new proposal "${estimate.title}" ($${((estimate.totalCents || 0) / 100).toFixed(2)}). View and sign at: ${proposalUrl}`
              });
              
              if (smsResult.success) {
                await db.insert(smsLogs).values({
                  clientId: client.id,
                  status: 'sent',
                  sentAt: new Date()
                });
              }
            }

            // Log the proposal activity
            await db.insert(clientActivityLog).values({
              clientId: client.id,
              type: 'proposal_sent',
              title: `Proposal Sent: ${estimate.title}`,
              description: `Proposal "${estimate.title}" was sent to the client ($${((estimate.totalCents || 0) / 100).toFixed(2)}).`,
              createdAt: new Date()
            });
          }
        } catch (notificationError) {
          console.error('Error sending proposal notifications:', notificationError);
          // Don't fail the main request if notifications fail
        }
      }
      
      res.json(updatedEstimate);
    } catch (error) {
      console.error('Send proposal error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Proposals (route aliases for Estimates to enable terminology migration)
  app.get("/api/proposals", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const proposals = await storage.getProposalsByPhotographer(req.user!.photographerId!);
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/proposals/client/:clientId", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // First verify the client belongs to this photographer (tenant security)
      const client = await storage.getClient(clientId);
      if (!client || client.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      const proposals = await storage.getProposalsByClient(clientId);
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/proposals", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Preserve items before validation strips them out
      const items = req.body.items;
      
      const proposalData = insertEstimateSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      
      // Pass items separately to storage
      const proposal = await storage.createProposal({
        ...proposalData,
        items
      });
      
      // Send proposal notifications to client if proposal has sentAt date
      if (proposal.sentAt && proposal.clientId) {
        try {
          // Get client info for notifications
          const client = await storage.getClient(proposal.clientId);
          const photographer = await storage.getPhotographer(req.user!.photographerId!);
          
          if (client && photographer) {
            const proposalUrl = `${process.env.VITE_APP_URL || 'https://thephotocrm.com'}/public/proposals/${proposal.token}`;
            
            // Email notification
            if (client.email && client.emailOptIn) {
              const emailSuccess = await sendEmail({
                to: client.email,
                from: `${photographer.businessName} <${process.env.SENDGRID_FROM_EMAIL}>`,
                replyTo: photographer.emailFromAddr || process.env.SENDGRID_FROM_EMAIL,
                subject: `New Proposal: ${proposal.title}`,
                html: `
                  <h2>You have received a new proposal!</h2>
                  <p>Hi ${client.firstName},</p>
                  <p>${photographer.businessName} has sent you a new proposal titled "${proposal.title}".</p>
                  <p><strong>Total Amount:</strong> $${((proposal.totalCents || 0) / 100).toFixed(2)}</p>
                  <p><a href="${proposalUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View & Sign Proposal</a></p>
                  <p>You can view and electronically sign your proposal by clicking the link above.</p>
                  <p>Best regards,<br>${photographer.businessName}</p>
                `,
                text: `You have received a new proposal from ${photographer.businessName}!\n\nProposal: ${proposal.title}\nTotal: $${((proposal.totalCents || 0) / 100).toFixed(2)}\n\nView and sign at: ${proposalUrl}`
              });
              
              if (emailSuccess) {
                await db.insert(emailLogs).values({
                  clientId: client.id,
                  status: 'sent',
                  sentAt: new Date()
                });
              }
            }
            
            // SMS notification
            if (client.phone && client.smsOptIn) {
              const smsResult = await sendSms({
                to: client.phone,
                body: `New proposal from ${photographer.businessName}: "${proposal.title}" ($${((proposal.totalCents || 0) / 100).toFixed(2)}). View & sign: ${proposalUrl}`
              });
              
              if (smsResult.success) {
                await db.insert(smsLogs).values({
                  clientId: client.id,
                  status: 'sent',
                  providerId: smsResult.sid,
                  sentAt: new Date()
                });
              }
            }
          }
        } catch (notificationError) {
          console.error('Error sending proposal notifications:', notificationError);
          // Don't fail the main request if notifications fail
        }
      }
      
      res.status(201).json(proposal);
    } catch (error) {
      console.error("Create proposal error:", error);
      console.error("Request body:", req.body);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send proposal endpoint
  app.post("/api/proposals/:id/send", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const proposalId = req.params.id;
      
      // Get the proposal first to ensure it belongs to the photographer
      const proposal = await storage.getProposal(proposalId);
      if (!proposal || proposal.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Update proposal with sent timestamp
      const updatedProposal = await storage.updateProposal(proposalId, {
        sentAt: new Date()
      });

      // Send notifications to client
      if (proposal.clientId) {
        try {
          // Get client info for notifications
          const client = await storage.getClient(proposal.clientId);
          const photographer = await storage.getPhotographer(req.user!.photographerId!);
          
          if (client && photographer) {
            const proposalUrl = `${process.env.VITE_APP_URL || 'https://thephotocrm.com'}/public/proposals/${proposal.token}`;
            
            // Email notification
            if (client.email && client.emailOptIn) {
              const emailSuccess = await sendEmail({
                to: client.email,
                from: `${photographer.businessName} <${process.env.SENDGRID_FROM_EMAIL}>`,
                replyTo: photographer.emailFromAddr || process.env.SENDGRID_FROM_EMAIL,
                subject: `New Proposal: ${proposal.title}`,
                html: `
                  <h2>You have received a new proposal!</h2>
                  <p>Hi ${client.firstName},</p>
                  <p>${photographer.businessName} has sent you a new proposal titled "${proposal.title}".</p>
                  <p><strong>Total Amount:</strong> $${((proposal.totalCents || 0) / 100).toFixed(2)}</p>
                  <p><a href="${proposalUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View & Sign Proposal</a></p>
                  <p>You can view and electronically sign your proposal by clicking the link above.</p>
                  <p>Best regards,<br>${photographer.businessName}</p>
                `,
                text: `You have received a new proposal from ${photographer.businessName}!\n\nProposal: ${proposal.title}\nTotal: $${((proposal.totalCents || 0) / 100).toFixed(2)}\n\nView and sign at: ${proposalUrl}`
              });
              
              if (emailSuccess) {
                await db.insert(emailLogs).values({
                  clientId: client.id,
                  status: 'sent',
                  sentAt: new Date()
                });
              }
            }
            
            // SMS notification
            if (client.phone && client.smsOptIn) {
              const smsResult = await sendSms({
                to: client.phone,
                body: `Hi ${client.firstName}, ${photographer.businessName} has sent you a new proposal "${proposal.title}" ($${((proposal.totalCents || 0) / 100).toFixed(2)}). View and sign at: ${proposalUrl}`
              });
              
              if (smsResult.success) {
                await db.insert(smsLogs).values({
                  clientId: client.id,
                  status: 'sent',
                  sentAt: new Date()
                });
              }
            }

            // Log the proposal activity
            await db.insert(clientActivityLog).values({
              clientId: client.id,
              activityType: 'PROPOSAL_SENT',
              title: `Proposal Sent: ${proposal.title}`,
              description: `Proposal "${proposal.title}" was sent to the client ($${((proposal.totalCents || 0) / 100).toFixed(2)}).`,
              metadata: {
                proposalId: proposal.id,
                totalCents: proposal.totalCents,
                status: 'SENT'
              },
              relatedId: proposal.id,
              relatedType: 'ESTIMATE'
            });
          }
        } catch (notificationError) {
          console.error('Error sending proposal notifications:', notificationError);
          // Don't fail the main request if notifications fail
        }
      }
      
      res.json(updatedProposal);
    } catch (error) {
      console.error('Send proposal error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete proposal endpoint
  app.delete("/api/proposals/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const proposalId = req.params.id;
      
      // Get the proposal first to ensure it belongs to the photographer
      const proposal = await storage.getProposal(proposalId);
      if (!proposal || proposal.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Delete the proposal
      await storage.deleteProposal(proposalId);
      
      res.json({ message: "Proposal deleted successfully" });
    } catch (error) {
      console.error('Delete proposal error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public proposal view
  app.get("/api/public/proposals/:token", async (req, res) => {
    try {
      const proposal = await storage.getProposalByToken(req.params.token);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      res.json(proposal);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/public/proposals/:token/sign", async (req, res) => {
    try {
      const { signedByName, signedByEmail, signatureImageUrl } = req.body;
      const proposal = await storage.getProposalByToken(req.params.token);
      
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const updated = await storage.updateProposal(proposal.id, {
        status: "SIGNED",
        signedAt: new Date(),
        signedByName,
        signedByEmail,
        signatureImageUrl,
        signedIp: req.ip,
        signedUserAgent: req.get('User-Agent')
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/public/proposals/:token/pay", async (req, res) => {
    try {
      const { mode } = req.body; // "DEPOSIT" or "FULL"
      const proposal = await storage.getProposalByToken(req.params.token);
      
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const amount = mode === "DEPOSIT" ? (proposal.depositCents || 0) : (proposal.totalCents || 0);
      
      const successUrl = `${process.env.APP_BASE_URL || 'https://thephotocrm.com'}/payment-success?proposal=${req.params.token}`;
      const cancelUrl = `${process.env.APP_BASE_URL || 'https://thephotocrm.com'}/public/proposals/${req.params.token}`;

      const checkoutUrl = await createCheckoutSession({
        amountCents: amount,
        successUrl,
        cancelUrl,
        metadata: {
          estimateId: proposal.id,
          paymentType: mode
        }
      });

      res.json({ url: checkoutUrl });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Automations
  app.get("/api/automations", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectType } = req.query;
      const automations = await storage.getAutomationsByPhotographer(
        req.user!.photographerId!, 
        projectType as string | undefined
      );
      res.json(automations);
    } catch (error) {
      console.error('Get automations error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/automations", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const automationData = validateAutomationSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      
      const automation = await storage.createAutomation(automationData);
      res.status(201).json(automation);
    } catch (error: any) {
      console.error('Create automation error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/automations/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // First verify the automation belongs to this photographer
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === req.params.id);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }

      // Create a safe update schema that only allows specific fields
      const updateSchema = validateAutomationSchema.partial().omit({
        photographerId: true,
        id: true
      });
      
      const updateData = updateSchema.parse(req.body);
      const updated = await storage.updateAutomation(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error('Update automation error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/automations/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // First verify the automation belongs to this photographer
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === req.params.id);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }

      // Create a safe update schema that only allows specific fields
      const updateSchema = validateAutomationSchema.partial().omit({
        photographerId: true,
        id: true
      });
      
      const updateData = updateSchema.parse(req.body);
      const updated = await storage.updateAutomation(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error('Update automation error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/automations/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // First verify the automation belongs to this photographer
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === req.params.id);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }

      // For now, just disable the automation since we don't have deleteAutomation in storage yet
      const updated = await storage.updateAutomation(req.params.id, { enabled: false });
      res.json({ message: "Automation disabled successfully", automation: updated });
    } catch (error) {
      console.error('Delete automation error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Automation Steps
  app.get("/api/automations/:id/steps", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // First verify the automation belongs to this photographer
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === req.params.id);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }

      const steps = await storage.getAutomationSteps(req.params.id);
      res.json(steps);
    } catch (error) {
      console.error('Get automation steps error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/automations/:id/steps", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // First verify the automation belongs to this photographer
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === req.params.id);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }

      const stepData = insertAutomationStepSchema.parse({
        ...req.body,
        automationId: req.params.id
      });
      
      const step = await storage.createAutomationStep(stepData);
      res.status(201).json(step);
    } catch (error: any) {
      console.error('Create automation step error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/automation-steps/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Get the step and verify ownership through automation
      const step = await storage.getAutomationStepById(req.params.id);
      if (!step) {
        return res.status(404).json({ message: "Automation step not found" });
      }

      // Get the automation to verify ownership
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === step.automationId);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation step not found" });
      }

      const updateSchema = insertAutomationStepSchema.partial().omit({
        automationId: true,
        id: true
      });
      
      const updateData = updateSchema.parse(req.body);
      const updated = await storage.updateAutomationStep(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error('Update automation step error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/automation-steps/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Get the step and verify ownership through automation
      const step = await storage.getAutomationStepById(req.params.id);
      if (!step) {
        return res.status(404).json({ message: "Automation step not found" });
      }

      // Get the automation to verify ownership
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === step.automationId);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation step not found" });
      }

      await storage.deleteAutomationStep(req.params.id);
      res.json({ message: "Automation step deleted successfully" });
    } catch (error) {
      console.error('Delete automation step error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stripe webhook
  app.post("/webhooks/stripe", async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    
    try {
      const event = await handleWebhook(req.body, signature);
      if (!event) {
        return res.status(400).send('Invalid signature');
      }

      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const metadata = session.metadata;
          
          if (metadata?.estimateId && metadata?.photographerId) {
            const status = metadata.paymentType === "FULL" ? "PAID_FULL" : "PAID_PARTIAL";
            await storage.updateEstimate(metadata.estimateId, { status });

            const totalAmountCents = session.amount_total || 0;
            const paymentIntentId = session.payment_intent as string;

            // Create estimate payment record (idempotent by payment intent ID)
            try {
              const estimatePayment = await storage.createEstimatePayment({
                estimateId: metadata.estimateId,
                amountCents: totalAmountCents,
                method: 'stripe',
                status: 'completed',
                stripeSessionId: session.id,
                stripePaymentIntentId: paymentIntentId,
                completedAt: new Date()
              });

              // Get authoritative values from PaymentIntent with proper expansions
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['latest_charge', 'charges.data.balance_transaction']
              });
              
              const actualAmountCents = paymentIntent.amount_received || paymentIntent.amount;
              
              let platformFeeCents = 0;
              let photographerEarningsCents = actualAmountCents;
              let earningStatus = 'available';

              // For Connect payments, get actual platform fee from Stripe
              if (paymentIntent.application_fee_amount) {
                platformFeeCents = paymentIntent.application_fee_amount;
                photographerEarningsCents = actualAmountCents - platformFeeCents;
                earningStatus = 'available'; // Connect accounts can receive payouts
              } else {
                // For standard (non-Connect) payments, calculate our platform fee
                platformFeeCents = calculatePlatformFee(actualAmountCents);
                photographerEarningsCents = actualAmountCents - platformFeeCents;
                earningStatus = 'unconnected_pending'; // Cannot payout until Connect account setup
              }

              // Create earnings record for all payments
              const estimate = await storage.getEstimate(metadata.estimateId);
              await storage.createEarnings({
                photographerId: metadata.photographerId,
                projectId: estimate?.projectId || '',
                estimatePaymentId: estimatePayment.id,
                paymentIntentId,
                totalAmountCents: actualAmountCents,
                platformFeeCents,
                photographerEarningsCents,
                currency: 'USD',
                status: earningStatus
              });

            } catch (error: any) {
              // If payment already exists (duplicate webhook), skip creation
              if (!error.message?.includes('unique constraint')) {
                throw error;
              }
            }
          }
          break;

        case 'account.updated':
          const account = event.data.object as Stripe.Account;
          const photographerId = account.metadata?.photographer_id;
          
          if (photographerId) {
            const payoutEnabled = account.payouts_enabled;
            const onboardingCompleted = account.details_submitted && 
                                         account.charges_enabled && 
                                         account.payouts_enabled;

            await storage.updatePhotographer(photographerId, {
              payoutEnabled,
              onboardingCompleted,
              stripeAccountStatus: onboardingCompleted ? 'active' : 'pending',
              stripeOnboardingCompletedAt: onboardingCompleted ? new Date() : null
            });
          }
          break;

        case 'payout.created':
        case 'payout.paid':
        case 'payout.failed':
        case 'payout.canceled':
          const payout = event.data.object as Stripe.Payout;
          const existingPayout = await storage.getPayoutByStripePayoutId(payout.id);
          
          if (existingPayout) {
            let status = 'pending';
            if (event.type === 'payout.paid') status = 'paid';
            else if (event.type === 'payout.failed') status = 'failed';
            else if (event.type === 'payout.canceled') status = 'cancelled';

            await storage.updatePayout(existingPayout.id, {
              status,
              arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000) : null
            });
          }
          break;
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  // Reports
  app.get("/api/reports/summary", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      
      // For now, return basic stats to avoid the database query error
      // TODO: Implement proper database queries when the storage layer is stable
      res.json({
        totalProjects: 0,
        bookedThisMonth: 0,
        revenueYTD: 0,
        outstandingBalance: 0
      });
    } catch (error) {
      console.error("Reports summary error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Booking routes
  app.get("/api/bookings", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const bookings = await storage.getBookingsByPhotographer(req.user!.photographerId!);
      res.json(bookings);
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/bookings", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        photographerId
      });

      // Critical security check: If clientId is provided, validate tenant ownership
      if (bookingData.clientId) {
        const client = await storage.getClient(bookingData.clientId);
        if (!client || client.photographerId !== photographerId) {
          return res.status(403).json({ message: "Client not found or access denied" });
        }
        
        // Populate client details for consistency (optional but recommended)
        bookingData.clientName = client.name;
        bookingData.clientEmail = client.email;
        bookingData.clientPhone = client.phone;
      } else {
        // Server-side validation: Require manual client fields when no clientId
        if (!bookingData.clientName || (!bookingData.clientEmail && !bookingData.clientPhone)) {
          return res.status(400).json({ 
            message: "Either clientId or manual client information (name + email or phone) is required" 
          });
        }
      }

      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error('Create booking error:', error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/bookings/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Verify ownership
      if (booking.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(booking);
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/bookings/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Verify ownership
      if (booking.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Validate update data
      const updateData = updateBookingSchema.parse(req.body);
      const updatedBooking = await storage.updateBooking(req.params.id, updateData);
      res.json(updatedBooking);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error('Update booking error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/bookings/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Verify ownership
      if (booking.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteBooking(req.params.id);
      res.json({ message: "Booking deleted successfully" });
    } catch (error) {
      console.error('Delete booking error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public booking routes (no authentication required)
  app.get("/api/public/booking/:token", async (req, res) => {
    try {
      const booking = await storage.getBookingByToken(req.params.token);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Return sanitized booking data (exclude sensitive photographer/internal info)
      const sanitizedBooking = {
        id: booking.id,
        title: booking.title,
        description: booking.description,
        startAt: booking.startAt,
        endAt: booking.endAt,
        status: booking.status,
        bookingType: booking.bookingType,
        isFirstBooking: booking.isFirstBooking,
        googleMeetLink: booking.googleMeetLink,
        clientEmail: booking.clientEmail,
        clientPhone: booking.clientPhone,
        clientName: booking.clientName,
        createdAt: booking.createdAt
      };
      
      res.json(sanitizedBooking);
    } catch (error) {
      console.error('Get public booking error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/public/booking/:token/confirm", async (req, res) => {
    try {
      const booking = await storage.getBookingByToken(req.params.token);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Prevent duplicate confirmations
      if (booking.status === "CONFIRMED") {
        return res.json({
          ...booking,
          // Return sanitized booking data
          id: booking.id,
          title: booking.title,
          description: booking.description,
          startAt: booking.startAt,
          endAt: booking.endAt,
          status: booking.status,
          bookingType: booking.bookingType,
          isFirstBooking: booking.isFirstBooking,
          googleMeetLink: booking.googleMeetLink,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          clientName: booking.clientName,
          createdAt: booking.createdAt
        });
      }
      
      // Validate client information
      const validatedData = bookingConfirmationSchema.parse(req.body);
      
      // Update booking with confirmed status and client details
      const updatedBooking = await storage.updateBooking(booking.id, {
        status: "CONFIRMED",
        clientName: validatedData.clientName,
        clientEmail: validatedData.clientEmail,
        clientPhone: validatedData.clientPhone
      });
      
      // Create Google Calendar event with Meet link using per-photographer credentials
      try {
        const calendarResult = await googleCalendarService.createEvent(booking.photographerId, {
          summary: booking.title,
          description: booking.description || `Appointment with ${validatedData.clientName}`,
          startTime: booking.startAt,
          endTime: booking.endAt,
          attendeeEmails: validatedData.clientEmail ? [validatedData.clientEmail] : [],
          timeZone: 'America/New_York', // TODO: Use photographer's timezone from database
          location: 'Google Meet'
        });

        if (calendarResult.success && calendarResult.googleMeetLink) {
          // Update booking with Google Calendar event details
          await storage.updateBooking(booking.id, {
            googleCalendarEventId: calendarResult.eventId,
            googleMeetLink: calendarResult.googleMeetLink
          });
          console.log(`✅ Calendar event created for booking ${booking.id} with Meet link: ${calendarResult.googleMeetLink}`);
        } else if (calendarResult.error) {
          console.warn(`⚠️ Calendar event creation failed for booking ${booking.id}: ${calendarResult.error}`);
        }
      } catch (calendarError) {
        console.error('Calendar integration error:', calendarError);
        // Don't fail the booking confirmation if calendar creation fails
      }
      
      // Handle automatic stage progression for first bookings
      if (booking.isFirstBooking && booking.clientId) {
        try {
          const stages = await storage.getStagesByPhotographer(booking.photographerId);
          const consultationStage = stages.find(s => s.name.toLowerCase().includes("consultation"));
          
          if (consultationStage) {
            await storage.updateClient(booking.clientId, {
              stageId: consultationStage.id,
              stageEnteredAt: new Date()
            });
            console.log(`✅ Client ${booking.clientId} moved to Consultation stage for first booking`);
          } else {
            console.warn(`⚠️ No Consultation stage found for photographer ${booking.photographerId}`);
          }
        } catch (stageError) {
          console.error('Error updating client stage:', stageError);
          // Don't fail the entire request if stage update fails
        }
      }
      
      // Return sanitized booking data
      const sanitizedResult = {
        id: updatedBooking.id,
        title: updatedBooking.title,
        description: updatedBooking.description,
        startAt: updatedBooking.startAt,
        endAt: updatedBooking.endAt,
        status: updatedBooking.status,
        bookingType: updatedBooking.bookingType,
        isFirstBooking: updatedBooking.isFirstBooking,
        googleMeetLink: updatedBooking.googleMeetLink,
        clientEmail: updatedBooking.clientEmail,
        clientPhone: updatedBooking.clientPhone,
        clientName: updatedBooking.clientName,
        createdAt: updatedBooking.createdAt
      };
      
      res.json(sanitizedResult);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid client information", errors: error.errors });
      }
      console.error('Confirm booking error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Availability slots API routes for photographers
  app.get("/api/availability", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const slots = await storage.getAvailabilitySlotsByPhotographer(req.user!.photographerId!);
      res.json(slots);
    } catch (error) {
      console.error('Get availability slots error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/availability", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Validate and transform the request body
      const slotData = insertAvailabilitySlotSchema.parse(req.body);
      
      // Add photographer ID
      const slot = await storage.createAvailabilitySlot({
        ...slotData,
        photographerId: req.user!.photographerId!
      });
      
      res.status(201).json(slot);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid availability data", errors: error.errors });
      }
      console.error('Create availability slot error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/availability/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const slot = await storage.getAvailabilitySlot(req.params.id);
      if (!slot) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      
      // Verify ownership
      if (slot.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Validate update data
      const updateData = updateAvailabilitySlotSchema.parse(req.body);
      const updatedSlot = await storage.updateAvailabilitySlot(req.params.id, updateData);
      res.json(updatedSlot);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid availability data", errors: error.errors });
      }
      console.error('Update availability slot error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/availability/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const slot = await storage.getAvailabilitySlot(req.params.id);
      if (!slot) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      
      // Verify ownership
      if (slot.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteAvailabilitySlot(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete availability slot error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Google Calendar OAuth routes for photographers
  app.get("/api/auth/google-calendar", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const authResult = await googleCalendarService.getAuthUrl(photographerId);
      
      if (!authResult) {
        return res.status(503).json({ 
          message: "Google Calendar integration not configured. Please contact support." 
        });
      }
      
      res.json({ authUrl: authResult.url });
    } catch (error) {
      console.error('Google Calendar auth URL error:', error);
      res.status(500).json({ message: "Failed to generate authorization URL" });
    }
  });

  app.get("/api/auth/google-calendar/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: red;">❌ Invalid Authorization Request</h2>
              <p>Missing required authorization parameters. Please try connecting your calendar again.</p>
            </body>
          </html>
        `);
      }

      // Validate state parameter for CSRF protection
      const stateValidation = googleCalendarService.validateState(state as string);
      if (!stateValidation.valid || !stateValidation.photographerId) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: red;">❌ Security Error</h2>
              <p>Invalid or expired authorization request. Please try connecting your calendar again.</p>
            </body>
          </html>
        `);
      }

      const photographerId = stateValidation.photographerId;
      const result = await googleCalendarService.exchangeCodeForTokens(code as string, photographerId);
      
      if (result.success) {
        res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: green;">✅ Google Calendar Connected Successfully!</h2>
              <p>Your calendar integration is now active. You can close this window.</p>
              <script>
                setTimeout(() => {
                  window.close();
                }, 3000);
              </script>
            </body>
          </html>
        `);
      } else {
        res.status(500).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: red;">❌ Calendar Connection Failed</h2>
              <p>Error: ${result.error}</p>
              <p>Please try again or contact support.</p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Google Calendar callback error:', error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: red;">❌ Authorization Failed</h2>
            <p>An unexpected error occurred. Please try again or contact support.</p>
          </body>
        </html>
      `);
    }
  });

  app.get("/api/calendar/status", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const isConfigured = googleCalendarService.isConfigured();
      const isAuthenticated = await googleCalendarService.isAuthenticated(photographerId);
      
      res.json({
        configured: isConfigured,
        authenticated: isAuthenticated,
        message: !isConfigured 
          ? "Google Calendar integration not configured" 
          : !isAuthenticated 
            ? "Calendar authorization required" 
            : "Calendar integration active"
      });
    } catch (error) {
      console.error('Calendar status error:', error);
      res.status(500).json({ message: "Failed to check calendar status" });
    }
  });

  // Disconnect Google Calendar
  app.delete("/api/calendar/disconnect", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      await googleCalendarService.disconnect(photographerId);
      
      res.json({ message: "Google Calendar disconnected successfully" });
    } catch (error) {
      console.error('Calendar disconnect error:', error);
      res.status(500).json({ message: "Failed to disconnect calendar" });
    }
  });

  // === QUESTIONNAIRE TEMPLATE ROUTES ===

  // Get questionnaire templates for photographer
  app.get("/api/questionnaire-templates", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const templates = await storage.getQuestionnaireTemplatesByPhotographer(req.user!.photographerId!);
      res.json(templates);
    } catch (error) {
      console.error('Failed to fetch questionnaire templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Get single questionnaire template
  app.get("/api/questionnaire-templates/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const template = await storage.getQuestionnaireTemplate(req.params.id);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Verify template belongs to photographer
      if (template.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Failed to fetch questionnaire template:', error);
      res.status(500).json({ error: 'Failed to fetch template' });
    }
  });

  // Create questionnaire template
  app.post("/api/questionnaire-templates", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const validatedData = insertQuestionnaireTemplateSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId
      });

      const template = await storage.createQuestionnaireTemplate(validatedData);
      res.status(201).json(template);
    } catch (error: any) {
      console.error('Failed to create questionnaire template:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid template data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  // Update questionnaire template
  app.put("/api/questionnaire-templates/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // First verify template exists and belongs to photographer
      const existingTemplate = await storage.getQuestionnaireTemplate(req.params.id);
      
      if (!existingTemplate) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      if (existingTemplate.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate the update data (don't allow changing photographerId)
      const updateData = { ...req.body };
      delete updateData.photographerId;
      delete updateData.id;
      delete updateData.createdAt;

      const template = await storage.updateQuestionnaireTemplate(req.params.id, updateData);
      res.json(template);
    } catch (error: any) {
      console.error('Failed to update questionnaire template:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid template data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update template' });
    }
  });

  // Delete questionnaire template
  app.delete("/api/questionnaire-templates/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // First verify template exists and belongs to photographer
      const existingTemplate = await storage.getQuestionnaireTemplate(req.params.id);
      
      if (!existingTemplate) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      if (existingTemplate.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await storage.deleteQuestionnaireTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete questionnaire template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  // Questionnaire Questions Routes
  
  // Get questions for a template
  app.get("/api/questionnaire-templates/:templateId/questions", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // First verify template exists and belongs to photographer
      const template = await storage.getQuestionnaireTemplate(req.params.templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      if (template.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const questions = await storage.getQuestionnaireQuestionsByTemplate(req.params.templateId);
      res.json(questions);
    } catch (error) {
      console.error('Failed to fetch questionnaire questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });

  // Create a new question for a template
  app.post("/api/questionnaire-templates/:templateId/questions", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // First verify template exists and belongs to photographer
      const template = await storage.getQuestionnaireTemplate(req.params.templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      if (template.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const validatedData = insertQuestionnaireQuestionSchema.parse({
        ...req.body,
        templateId: req.params.templateId
      });

      const question = await storage.createQuestionnaireQuestion(validatedData);
      res.status(201).json(question);
    } catch (error: any) {
      console.error('Failed to create questionnaire question:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid question data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create question' });
    }
  });

  // Update a question
  app.put("/api/questionnaire-questions/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Get the question to verify template ownership using storage method
      const question = await storage.getQuestionnaireQuestionById(req.params.id);
      
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }
      
      // Verify template belongs to photographer
      const template = await storage.getQuestionnaireTemplate(question.templateId);
      if (!template || template.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate the update data using partial schema
      const validatedData = insertQuestionnaireQuestionSchema.partial().parse(req.body);
      
      const updatedQuestion = await storage.updateQuestionnaireQuestion(req.params.id, validatedData);
      res.json(updatedQuestion);
    } catch (error: any) {
      console.error('Failed to update questionnaire question:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid question data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update question' });
    }
  });

  // Delete a question
  app.delete("/api/questionnaire-questions/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Get the question to verify template ownership using storage method
      const question = await storage.getQuestionnaireQuestionById(req.params.id);
      
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }
      
      // Verify template belongs to photographer
      const template = await storage.getQuestionnaireTemplate(question.templateId);
      if (!template || template.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await storage.deleteQuestionnaireQuestion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete questionnaire question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  });

  // Public widget API CORS preflight handler
  app.options("/api/public/lead/:photographerToken", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).end();
  });

  // Public widget API endpoint (no authentication required)
  app.post("/api/public/lead/:photographerToken", async (req, res) => {
    // Add CORS headers for widget embedding
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    try {
      const { photographerToken } = req.params;
      
      // Find photographer by public token
      const photographer = await storage.getPhotographerByPublicToken(photographerToken);
      if (!photographer) {
        return res.status(404).json({ 
          success: false,
          message: "Invalid photographer token" 
        });
      }
      
      // Validate lead data with schema
      const publicLeadSchema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"), 
        email: z.string().email("Valid email is required"),
        phone: z.string().optional(),
        message: z.string().optional(),
        projectType: z.enum(['WEDDING', 'ENGAGEMENT', 'PROPOSAL', 'CORPORATE', 'PORTRAIT', 'FAMILY', 'MATERNITY', 'NEWBORN', 'EVENT', 'COMMERCIAL', 'OTHER']),
        eventDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), "Invalid date format"),
        emailOptIn: z.boolean().default(true),
        smsOptIn: z.boolean().default(true),
        redirectUrl: z.union([
          z.string().regex(/^https?:\/\//, "Must be http or https URL"), // Only http/https URLs
          z.string().regex(/^\/[^\/].*/, "Must be absolute path starting with /"), // Relative paths only
          z.literal('')
        ]).optional().transform(val => val === '' ? undefined : val)
      });
      
      const leadData = publicLeadSchema.parse(req.body);
      
      // NEW: Create separate client and project records
      
      // 1. Create client with pure contact information
      const client = await storage.createClient({
        photographerId: photographer.id,
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.email,
        phone: leadData.phone
      });
      
      // 2. Create project linked to the client
      const project = await storage.createProject({
        photographerId: photographer.id,
        clientId: client.id,
        title: `${leadData.projectType.toLowerCase().replace(/_/g, ' ')} for ${leadData.firstName} ${leadData.lastName}`,
        projectType: leadData.projectType,
        eventDate: leadData.eventDate && !isNaN(Date.parse(leadData.eventDate)) ? new Date(leadData.eventDate) : undefined,
        leadSource: "WEBSITE_WIDGET",
        notes: leadData.message,
        emailOptIn: leadData.emailOptIn,
        smsOptIn: leadData.smsOptIn
        // stageId will be assigned automatically by createProject method
      });
      
      res.status(201).json({ 
        success: true, 
        message: "Lead submitted successfully",
        clientId: client.id,
        projectId: project.id,
        redirectUrl: leadData.redirectUrl || null
      });
      
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false,
          message: "Invalid lead data", 
          errors: error.errors 
        });
      }
      console.error('Public lead submission error:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to submit lead" 
      });
    }
  });

  // Public widget configuration API endpoint (no authentication required)
  app.get("/api/public/widget/:photographerToken", async (req, res) => {
    // Add CORS headers for widget embedding
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    try {
      const { photographerToken } = req.params;
      
      // Find photographer by public token
      const photographer = await storage.getPhotographerByPublicToken(photographerToken);
      if (!photographer) {
        return res.status(404).json({ 
          success: false,
          message: "Invalid photographer token" 
        });
      }

      // Return photographer's widget configuration
      res.json({
        success: true,
        config: {
          businessName: photographer.businessName,
          primaryColor: photographer.brandPrimary || "#3b82f6",
          backgroundColor: "#ffffff",
          // Default widget configuration - in the future this could be stored per photographer
          title: "Get In Touch",
          description: "Let's discuss your photography needs",
          projectTypes: ["WEDDING", "ENGAGEMENT", "PORTRAIT", "FAMILY", "MATERNITY", "NEWBORN", "EVENT", "COMMERCIAL"],
          showPhone: true,
          showMessage: true,
          showEventDate: true,
          buttonText: "Send Inquiry",
          successMessage: "Thank you! We'll be in touch soon."
        },
        apiEndpoint: `/api/public/lead/${photographerToken}`
      });
    } catch (error) {
      console.error("Error fetching widget config:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch widget configuration" 
      });
    }
  });

  // Add explicit route handler for public booking pages to serve the React app
  app.get("/public/booking/:token", async (req, res, next) => {
    if (app.get("env") === "development") {
      next();
    } else {
      const distPath = path.resolve(import.meta.dirname, "public");
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });

  // Add explicit route handler for public proposal pages to serve the React app
  // This prevents Express from treating /public/proposals/:token as static file lookup
  app.get("/public/proposals/:token", async (req, res, next) => {
    // In development, let Vite handle serving the React app
    // In production, serve the static index.html
    if (app.get("env") === "development") {
      // Let the request fall through to Vite middleware
      next();
    } else {
      // In production, serve the index.html file
      const distPath = path.resolve(import.meta.dirname, "public");
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });

  // Stripe Connect API endpoints
  app.post("/api/stripe-connect/create-account", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Check if account already exists
      if (photographer.stripeConnectAccountId) {
        return res.status(400).json({ 
          message: "Stripe Connect account already exists",
          accountId: photographer.stripeConnectAccountId 
        });
      }

      // Create Stripe Connect Express account (allows programmatic payouts)
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        business_type: 'individual',
        metadata: {
          photographer_id: photographer.id
        }
      });

      // Update photographer with account ID
      await storage.updatePhotographer(photographer.id, {
        stripeConnectAccountId: account.id,
        stripeAccountStatus: 'pending'
      });

      res.json({
        accountId: account.id,
        status: 'pending',
        message: "Stripe Connect account created successfully"
      });

    } catch (error: any) {
      console.error('Stripe Connect account creation error:', error);
      res.status(500).json({ 
        message: "Failed to create Stripe Connect account",
        error: error.message 
      });
    }
  });

  app.post("/api/stripe-connect/create-onboarding-link", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Validate request body
      const validatedData = createOnboardingLinkSchema.parse(req.body);
      
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      if (!photographer.stripeConnectAccountId) {
        return res.status(400).json({ 
          message: "No Stripe Connect account found. Create an account first." 
        });
      }

      const { returnUrl, refreshUrl } = validatedData;

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: photographer.stripeConnectAccountId,
        refresh_url: refreshUrl || `${req.protocol}://${req.get('host')}/earnings`,
        return_url: returnUrl || `${req.protocol}://${req.get('host')}/earnings?onboarding=success`,
        type: 'account_onboarding',
      });

      res.json({
        url: accountLink.url,
        expiresAt: accountLink.expires_at
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      console.error('Stripe Connect onboarding link error:', error);
      res.status(500).json({ 
        message: "Failed to create onboarding link",
        error: error.message 
      });
    }
  });

  app.get("/api/stripe-connect/account-status", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      if (!photographer.stripeConnectAccountId) {
        return res.json({
          hasAccount: false,
          status: null,
          payoutEnabled: false,
          onboardingCompleted: false
        });
      }

      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(photographer.stripeConnectAccountId);
      
      const payoutEnabled = account.payouts_enabled;
      const onboardingCompleted = account.details_submitted && 
                                   account.charges_enabled && 
                                   account.payouts_enabled;

      // Update local status if changed
      if (photographer.payoutEnabled !== payoutEnabled || 
          photographer.onboardingCompleted !== onboardingCompleted) {
        await storage.updatePhotographer(photographer.id, {
          payoutEnabled,
          onboardingCompleted,
          stripeAccountStatus: onboardingCompleted ? 'active' : 'pending',
          stripeOnboardingCompletedAt: onboardingCompleted && !photographer.stripeOnboardingCompletedAt ? 
                                      new Date() : photographer.stripeOnboardingCompletedAt
        });
      }

      res.json({
        hasAccount: true,
        accountId: photographer.stripeConnectAccountId,
        status: onboardingCompleted ? 'active' : 'pending',
        payoutEnabled,
        onboardingCompleted,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements
      });

    } catch (error: any) {
      console.error('Stripe Connect account status error:', error);
      res.status(500).json({ 
        message: "Failed to get account status",
        error: error.message 
      });
    }
  });

  app.get("/api/stripe-connect/balance", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      const currency = req.query.currency as string || 'USD';
      const balance = await storage.getPhotographerBalance(photographer.id, currency);

      res.json({
        availableCents: balance.availableCents,
        pendingCents: balance.pendingCents,
        currency
      });

    } catch (error: any) {
      console.error('Balance retrieval error:', error);
      res.status(500).json({ 
        message: "Failed to get balance",
        error: error.message 
      });
    }
  });

  app.post("/api/stripe-connect/create-payout", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Validate request body
      const validatedData = createPayoutSchema.parse(req.body);
      
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      if (!photographer.stripeConnectAccountId || !photographer.payoutEnabled) {
        return res.status(400).json({ 
          message: "Stripe Connect account not ready for payouts" 
        });
      }

      const { amountCents, currency, method } = validatedData;

      // Check available balance
      const balance = await storage.getPhotographerBalance(photographer.id, currency);
      if (amountCents > balance.availableCents) {
        return res.status(400).json({ 
          message: "Insufficient balance for payout",
          availableCents: balance.availableCents,
          requestedCents: amountCents
        });
      }

      // Calculate fees for instant payouts
      const isInstant = method === 'instant';
      const feeCents = isInstant ? Math.round(amountCents * 0.01) : 0; // 1% fee for instant payouts

      // Generate idempotency key to prevent duplicate payouts
      const idempotencyKey = `payout-${photographer.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create payout in Stripe
      const payout = await stripe.payouts.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        method: isInstant ? 'instant' : 'standard',
        metadata: {
          photographer_id: photographer.id
        }
      }, {
        stripeAccount: photographer.stripeConnectAccountId,
        idempotencyKey
      });

      // Store payout record
      const payoutRecord = await storage.createPayout({
        photographerId: photographer.id,
        stripePayoutId: payout.id,
        amountCents,
        currency,
        status: 'pending',
        isInstant,
        feeCents,
        method,
        stripeCreatedAt: new Date(payout.created * 1000),
        arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000) : null
      });

      res.json({
        payoutId: payoutRecord.id,
        stripePayoutId: payout.id,
        amountCents,
        currency,
        status: 'pending',
        isInstant,
        feeCents,
        arrivalDate: payoutRecord.arrivalDate,
        message: isInstant ? 
          "Instant payout initiated - funds typically arrive within minutes" :
          "Standard payout initiated - funds typically arrive within 2 business days"
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      console.error('Payout creation error:', error);
      res.status(500).json({ 
        message: "Failed to create payout",
        error: error.message 
      });
    }
  });

  app.get("/api/stripe-connect/earnings", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      const earnings = await storage.getEarningsByPhotographer(photographer.id);
      res.json(earnings);

    } catch (error: any) {
      console.error('Earnings retrieval error:', error);
      res.status(500).json({ 
        message: "Failed to get earnings",
        error: error.message 
      });
    }
  });

  app.get("/api/stripe-connect/payouts", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      const payouts = await storage.getPayoutsByPhotographer(photographer.id);
      res.json(payouts);

    } catch (error: any) {
      console.error('Payouts retrieval error:', error);
      res.status(500).json({ 
        message: "Failed to get payouts",
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
