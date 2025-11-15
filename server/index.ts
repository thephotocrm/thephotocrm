import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startCronJobs } from "./jobs/cron";

const app = express();

// Enable trust proxy to correctly detect hostname from X-Forwarded-Host header
// This is essential for client portal cookie domain detection on Railway/Replit
app.set('trust proxy', true);

// DEBUG: Log ALL incoming requests BEFORE any middleware
app.use((req, res, next) => {
  console.log(`📥 INCOMING REQUEST: ${req.method} ${req.path}`);
  console.log('   Headers:', JSON.stringify(req.headers['content-type']));
  next();
});

// CRITICAL: Add body parsers FIRST so webhook routes can access req.body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

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
    if (path.startsWith("/api") || path.startsWith("/webhooks/")) {
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
  // Start cron jobs for automations
  startCronJobs();
  
  // Register other API routes
  const server = await registerRoutes(app);
  

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Global error handler caught error:', err);
    console.error('Error details:', { 
      name: err?.name, 
      message: err?.message, 
      stack: err?.stack,
      url: req.url,
      method: req.method
    });
    
    // For Twilio webhooks, return TwiML instead of JSON
    if (req.path.includes('/webhooks/twilio/')) {
      console.error('❌ Webhook error caught by global handler:', err);
      return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
    
    res.status(status).json({ message });
    // REMOVED: throw err; - this was crashing the server!
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // CRITICAL: Prevent Railway Metal Edge from caching JavaScript bundles
    // This middleware MUST run before serveStatic to ensure headers are set
    app.use((req, res, next) => {
      if (req.path.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Surrogate-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });
    
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
