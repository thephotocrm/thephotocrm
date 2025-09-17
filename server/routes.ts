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
import { createPaymentIntent, createCheckoutSession, handleWebhook } from "./services/stripe";
import { googleCalendarService } from "./services/calendar";
import { insertUserSchema, insertPhotographerSchema, insertClientSchema, insertStageSchema, 
         insertTemplateSchema, insertAutomationSchema, insertAutomationStepSchema, insertPackageSchema, 
         insertEstimateSchema, insertMessageSchema, insertBookingSchema, updateBookingSchema, 
         bookingConfirmationSchema, sanitizedBookingSchema, emailLogs, smsLogs, clientActivityLog } from "@shared/schema";
import { startCronJobs } from "./jobs/cron";
import path from "path";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());

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
            photographerId: photographer.id
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
      const stages = await storage.getStagesByPhotographer(req.user!.photographerId!);
      res.json(stages);
    } catch (error) {
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
      const clients = await storage.getClientsByPhotographer(req.user!.photographerId!);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/clients", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      // Get default stage
      const stages = await storage.getStagesByPhotographer(req.user!.photographerId!);
      const defaultStage = stages.find(s => s.isDefault);

      const clientData = insertClientSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!,
        stageId: defaultStage?.id,
        stageEnteredAt: new Date()
      });

      const client = await storage.createClient(clientData);

      // TODO: Create checklist items for client
      // TODO: Trigger automation events

      res.status(201).json(client);
    } catch (error) {
      console.error("Create client error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/clients/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/clients/:id/stage", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { stageId } = req.body;
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
            const proposalUrl = `${process.env.VITE_APP_URL || 'https://lens-leads-crm-austinpacholek2.replit.app'}/public/estimates/${estimate.token}`;
            
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

      const checkoutUrl = await createCheckoutSession({
        amountCents: amount,
        successUrl,
        cancelUrl,
        metadata: {
          proposalId: estimate.id,
          paymentType: mode
        }
      });

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
            const proposalUrl = `${process.env.VITE_APP_URL || 'https://your-domain.replit.app'}/public/estimates/${estimate.token}`;
            
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
            const proposalUrl = `${process.env.VITE_APP_URL || 'https://your-domain.replit.app'}/public/proposals/${proposal.token}`;
            
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
            const proposalUrl = `${process.env.VITE_APP_URL || 'https://lens-leads-crm-austinpacholek2.replit.app'}/public/proposals/${proposal.token}`;
            
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
      
      const successUrl = `${process.env.APP_BASE_URL || 'https://lens-leads-crm-austinpacholek2.replit.app'}/payment-success?proposal=${req.params.token}`;
      const cancelUrl = `${process.env.APP_BASE_URL || 'https://lens-leads-crm-austinpacholek2.replit.app'}/public/proposals/${req.params.token}`;

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
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      res.json(automations);
    } catch (error) {
      console.error('Get automations error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/automations", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const automationData = insertAutomationSchema.parse({
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
      const updateSchema = insertAutomationSchema.partial().omit({
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
      const updateSchema = insertAutomationSchema.partial().omit({
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
          
          if (metadata?.estimateId) {
            const status = metadata.paymentType === "FULL" ? "PAID_FULL" : "PAID_PARTIAL";
            await storage.updateEstimate(metadata.estimateId, { status });
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
      // This would need to be implemented with proper queries
      // For now, return placeholder data
      res.json({
        totalClients: 47,
        bookedThisMonth: 8,
        revenueYTD: 127500,
        outstandingBalance: 23400,
        conversionRate: 25
      });
    } catch (error) {
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
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error('Create booking error:', error);
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

  const httpServer = createServer(app);
  return httpServer;
}
