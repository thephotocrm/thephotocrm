import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { sendSms } from "./services/sms";

const app = express();

// CRITICAL: Add body parsers FIRST so webhook routes can access req.body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Twilio Webhook Handler for incoming SMS/MMS
console.log('🚀 Registering Twilio webhook handler');

app.post("/webhooks/twilio/inbound", async (req, res) => {
  console.log('✅ TWILIO WEBHOOK (POST) - Received at', new Date().toISOString());
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Twilio sends data as application/x-www-form-urlencoded
    const { From: from, To: to, Body: text, NumMedia: numMedia, MessageSid: messageSid } = req.body;
    
    if (!from || !text) {
      console.error('Invalid Twilio webhook payload:', req.body);
      return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    const contact = await storage.getContactByPhone(from);
    
    if (!contact) {
      console.log(`No contact found for phone number: ${from}`);
      // Return TwiML response to acknowledge receipt
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    const photographer = await storage.getPhotographer(contact.photographerId);
    
    if (!photographer) {
      console.error(`No photographer found for contact: ${contact.id}`);
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    const contactWithProjects = await storage.getContact(contact.id);
    const latestProject = contactWithProjects?.projects?.[0];

    // Handle media attachments (MMS)
    const mediaCount = parseInt(numMedia || '0', 10);
    const messageBody = mediaCount > 0 
      ? `${text} [${mediaCount} attachment(s)]`
      : text;

    await storage.createSmsLog({
      clientId: contact.id,
      projectId: latestProject?.id || null,
      status: 'received',
      direction: 'INBOUND',
      fromPhone: from,
      toPhone: to,
      messageBody: messageBody,
      isForwarded: false,
      providerId: messageSid,
      sentAt: new Date()
    });

    // Forward message to photographer
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
          fromPhone: to,
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

    // Return TwiML response to acknowledge receipt
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error: any) {
    console.error('Twilio webhook error:', error);
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

// Logging middleware for API requests
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
  // Register other API routes
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
