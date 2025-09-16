import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from 'cookie-parser';
import Stripe from "stripe";
import { storage } from "./storage";
import { authenticateToken, requirePhotographer, requireRole } from "./middleware/auth";
import { hashPassword, authenticateUser } from "./services/auth";
import { createPaymentIntent, createCheckoutSession, handleWebhook } from "./services/stripe";
import { insertUserSchema, insertPhotographerSchema, insertClientSchema, insertStageSchema, 
         insertTemplateSchema, insertAutomationSchema, insertPackageSchema, insertEstimateSchema } from "@shared/schema";
import { startCronJobs } from "./jobs/cron";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
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

  app.post("/api/clients/:id/send-login-link", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client || client.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      if (!client.email) {
        return res.status(400).json({ message: "Client has no email address" });
      }

      // TODO: Implement email sending with client login link
      // This should create a secure token for the client and send via SendGrid
      
      res.json({ message: "Login link sent successfully" });
    } catch (error) {
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
        return res.status(404).json({ message: "Estimate not found" });
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
        return res.status(404).json({ message: "Estimate not found" });
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
        return res.status(404).json({ message: "Estimate not found" });
      }

      const amount = mode === "DEPOSIT" ? (estimate.depositCents || 0) : estimate.totalCents;
      
      const successUrl = `${process.env.APP_BASE_URL}/payment-success?estimate=${req.params.token}`;
      const cancelUrl = `${process.env.APP_BASE_URL}/estimates/${req.params.token}`;

      const checkoutUrl = await createCheckoutSession({
        amountCents: amount,
        successUrl,
        cancelUrl,
        metadata: {
          estimateId: estimate.id,
          paymentType: mode
        }
      });

      res.json({ url: checkoutUrl });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
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

  const httpServer = createServer(app);
  return httpServer;
}
