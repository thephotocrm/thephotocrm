import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { sendSms } from "./services/sms";

const app = express();

// CRITICAL: Register webhooks FIRST, before ANY other middleware or routes
// This ensures external webhook requests bypass Vite and reach Express handlers
console.log('🚀 Mounting webhook routes BEFORE all middleware');

app.get("/webhooks/test", async (req, res) => {
  console.log('✅ TEST WEBHOOK HIT at', new Date().toISOString());
  return res.json({ success: true, message: "Test route works!", timestamp: new Date().toISOString() });
});

app.get("/webhooks/simpletexting/inbound", async (req, res) => {
  console.log('✅ SIMPLETEXTING SMS WEBHOOK (GET) - Received at', new Date().toISOString());
  console.log('Query params:', req.query);
  
  try {
    const { from, to, text, subject } = req.query;
    
    if (!from || !text) {
      console.error('Invalid SimpleTexting SMS webhook payload:', req.query);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const contact = await storage.getContactByPhone(from as string);
    
    if (!contact) {
      console.log(`No contact found for phone number: ${from}`);
      return res.status(200).json({ message: 'Contact not found' });
    }

    const photographer = await storage.getPhotographer(contact.photographerId);
    
    if (!photographer) {
      console.error(`No photographer found for contact: ${contact.id}`);
      return res.status(200).json({ message: 'Photographer not found' });
    }

    const contactWithProjects = await storage.getContact(contact.id);
    const latestProject = contactWithProjects?.projects?.[0];

    await storage.createSmsLog({
      clientId: contact.id,
      projectId: latestProject?.id || null,
      status: 'received',
      direction: 'INBOUND',
      fromPhone: from as string,
      toPhone: to as string || process.env.SIMPLETEXTING_PHONE_NUMBER || '',
      messageBody: text as string,
      isForwarded: false,
      sentAt: new Date()
    });

    if (photographer.phone) {
      const projectContext = latestProject ? `${latestProject.projectType} Project` : 'Contact';
      const contextMessage = `${contact.firstName} ${contact.lastName} (${projectContext}): ${text}`;
      
      const forwardResult = await sendSms({
        to: photographer.phone,
        body: contextMessage
      });

      if (forwardResult.success) {
        await storage.createSmsLog({
          clientId: contact.id,
          projectId: latestProject?.id || null,
          status: 'sent',
          direction: 'OUTBOUND',
          fromPhone: process.env.SIMPLETEXTING_PHONE_NUMBER || '',
          toPhone: photographer.phone,
          messageBody: contextMessage,
          isForwarded: true,
          providerId: forwardResult.sid,
          sentAt: new Date()
        });

        console.log(`Forwarded SMS to photographer: ${photographer.phone}`);
      } else {
        console.error('Failed to forward SMS to photographer:', forwardResult.error);
      }
    }

    return res.status(200).json({ message: 'SMS processed successfully' });
  } catch (error: any) {
    console.error('SimpleTexting SMS webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post("/webhooks/simpletexting/inbound", async (req, res) => {
  console.log('✅ SIMPLETEXTING MMS WEBHOOK (POST) - Received at', new Date().toISOString());
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { from, to, text, subject, attachments } = req.body;
    
    if (!from || !text) {
      console.error('Invalid SimpleTexting MMS webhook payload:', req.body);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const contact = await storage.getContactByPhone(from);
    
    if (!contact) {
      console.log(`No contact found for phone number: ${from}`);
      return res.status(200).json({ message: 'Contact not found' });
    }

    const photographer = await storage.getPhotographer(contact.photographerId);
    
    if (!photographer) {
      console.error(`No photographer found for contact: ${contact.id}`);
      return res.status(200).json({ message: 'Photographer not found' });
    }

    const contactWithProjects = await storage.getContact(contact.id);
    const latestProject = contactWithProjects?.projects?.[0];

    const messageBody = attachments && attachments.length > 0 
      ? `${text} [${attachments.length} attachment(s): ${attachments.join(', ')}]`
      : text;

    await storage.createSmsLog({
      clientId: contact.id,
      projectId: latestProject?.id || null,
      status: 'received',
      direction: 'INBOUND',
      fromPhone: from,
      toPhone: to || process.env.SIMPLETEXTING_PHONE_NUMBER || '',
      messageBody: messageBody,
      isForwarded: false,
      sentAt: new Date()
    });

    if (photographer.phone) {
      const projectContext = latestProject ? `${latestProject.projectType} Project` : 'Contact';
      const contextMessage = `${contact.firstName} ${contact.lastName} (${projectContext}): ${messageBody}`;
      
      const forwardResult = await sendSms({
        to: photographer.phone,
        body: contextMessage
      });

      if (forwardResult.success) {
        await storage.createSmsLog({
          clientId: contact.id,
          projectId: latestProject?.id || null,
          status: 'sent',
          direction: 'OUTBOUND',
          fromPhone: process.env.SIMPLETEXTING_PHONE_NUMBER || '',
          toPhone: photographer.phone,
          messageBody: contextMessage,
          isForwarded: true,
          providerId: forwardResult.sid,
          sentAt: new Date()
        });

        console.log(`Forwarded MMS to photographer: ${photographer.phone}`);
      } else {
        console.error('Failed to forward MMS to photographer:', forwardResult.error);
      }
    }

    return res.status(200).json({ message: 'MMS processed successfully' });
  } catch (error: any) {
    console.error('SimpleTexting MMS webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Global error handler caught error:', err);
    console.error('Error details:', { 
      name: err?.name, 
      message: err?.message, 
      stack: err?.stack 
    });
    
    res.status(status).json({ message });
    // REMOVED: throw err; - this was crashing the server!
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
