import type { Express } from "express";
import { createServer, type Server } from "http";
import { log } from "./vite";
import cookieParser from 'cookie-parser';
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { authenticateToken, requirePhotographer, requireRole, requireAdmin, requireActiveSubscription } from "./middleware/auth";
import { hashPassword, authenticateUser, generateToken } from "./services/auth";
import { sendEmail, fetchIncomingGmailMessage } from "./services/email";
import { sendSms } from "./services/sms";
import { generateDripCampaign, regenerateEmail } from "./services/openai";
import { createPaymentIntent, createCheckoutSession, createConnectCheckoutSession, createConnectPaymentIntent, calculatePlatformFee, handleWebhook, stripe } from "./services/stripe";
import { googleCalendarService, createBookingCalendarEvent } from "./services/calendar";
import { slotGenerationService } from "./services/slotGeneration";
import { insertUserSchema, insertPhotographerSchema, insertContactSchema, insertStageSchema, 
         insertTemplateSchema, insertAutomationSchema, validateAutomationSchema, insertAutomationStepSchema, insertAutomationBusinessTriggerSchema, insertPackageSchema, insertAddOnSchema, insertLeadFormSchema,
         insertBookingSchema, updateBookingSchema, 
         bookingConfirmationSchema, sanitizedBookingSchema, insertQuestionnaireTemplateSchema, insertQuestionnaireQuestionSchema, 
         emailLogs, smsLogs, projectActivityLog, projectSmartFiles, photographerEarnings, projects, automationBusinessTriggers,
         projectTypeEnum, createOnboardingLinkSchema, createPayoutSchema, insertDailyAvailabilityTemplateSchema,
         insertDailyAvailabilityBreakSchema, insertDailyAvailabilityOverrideSchema,
         insertDripCampaignSchema, insertDripCampaignEmailSchema, insertDripCampaignSubscriptionSchema, insertProjectParticipantSchema,
         insertSmartFileSchema, insertSmartFilePageSchema, users } from "@shared/schema";
import { z } from "zod";
import { startCronJobs } from "./jobs/cron";
import { processAutomations } from "./services/automation";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import crypto from "crypto";
import multer from "multer";
import fs from "fs";


/**
 * Process Gmail push notification asynchronously
 */
async function processGmailNotification(photographerId: string, emailAddress: string, historyId: string) {
  try {
    // Get the photographer's OAuth credentials
    const { google } = await import('googleapis');
    const { OAuth2Client } = await import('google-auth-library');
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Google OAuth not configured');
      return;
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    const credentials = await storage.getGoogleCalendarCredentials(photographerId);
    
    if (!credentials || !credentials.accessToken) {
      console.error(`No Google credentials found for photographer ${photographerId}`);
      return;
    }

    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiryDate?.getTime()
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Use Gmail history API to get messages since the last historyId
    // Note: In production, you should store the last historyId per photographer
    // For now, we'll use the provided historyId from the notification
    let historyResponse;
    try {
      historyResponse = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: historyId,
        historyTypes: ['messageAdded'],
        labelId: 'INBOX'
      });
    } catch (error: any) {
      // If historyId is too old or invalid, fall back to listing recent messages
      console.warn('History API error, falling back to recent messages:', error.message);
      const messagesResponse = await gmail.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX'],
        maxResults: 5
      });
      const messages = messagesResponse.data.messages || [];
      
      for (const message of messages) {
        if (message.id) {
          await fetchIncomingGmailMessage(photographerId, message.id);
        }
      }
      return;
    }

    const history = historyResponse.data.history || [];
    
    if (history.length === 0) {
      console.log('No new messages in history');
      return;
    }

    // Extract all new message IDs from history
    const newMessageIds = new Set<string>();
    for (const historyItem of history) {
      const messagesAdded = historyItem.messagesAdded || [];
      for (const addedMessage of messagesAdded) {
        if (addedMessage.message?.id) {
          newMessageIds.add(addedMessage.message.id);
        }
      }
    }

    console.log(`Processing ${newMessageIds.size} new messages from Gmail history`);

    // Fetch and process each new message
    for (const messageId of newMessageIds) {
      await fetchIncomingGmailMessage(photographerId, messageId);
    }

  } catch (error: any) {
    console.error('Error processing Gmail notification:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // NOTE: SimpleTexting webhook routes are registered in server/index.ts BEFORE this function
  // to ensure proper body parsing middleware is available
  
  // Gmail push notification webhook (uses processGmailNotification function above)
  app.post("/webhooks/gmail/push", async (req, res) => {
    console.log('✅ GMAIL PUSH NOTIFICATION RECEIVED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      // Acknowledge receipt immediately (within 10 seconds to avoid retries)
      res.status(200).send('OK');
      
      // Parse the Gmail push notification
      const message = req.body.message;
      if (!message || !message.data) {
        console.error('Invalid Gmail push notification format');
        return;
      }
      
      // Decode the base64 message data
      const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
      const notificationData = JSON.parse(decodedData);
      
      console.log('Decoded notification data:', notificationData);
      
      const { emailAddress, historyId } = notificationData;
      
      if (!emailAddress || !historyId) {
        console.error('Missing emailAddress or historyId in notification');
        return;
      }
      
      // Find photographer by email
      const photographer = await storage.getPhotographerByEmail(emailAddress);
      
      if (!photographer) {
        console.error(`No photographer found for email: ${emailAddress}`);
        return;
      }
      
      // Process the notification asynchronously
      console.log(`Processing Gmail notification for photographer ${photographer.id}, historyId: ${historyId}`);
      await processGmailNotification(photographer.id, emailAddress, historyId);
      
    } catch (error: any) {
      console.error('Gmail push notification error:', error);
    }
  });

  // Twilio Webhook Handler for incoming SMS/MMS
  app.post("/webhooks/twilio/inbound", async (req, res) => {
    log('🎯 TWILIO WEBHOOK - Received at ' + new Date().toISOString());
    log('Request body: ' + JSON.stringify(req.body, null, 2));
    
    try {
      // Twilio sends data as application/x-www-form-urlencoded
      const { From: from, To: to, Body: text, NumMedia: numMedia, MessageSid: messageSid } = req.body;
      
      if (!from || !text) {
        log('Invalid Twilio webhook payload: ' + JSON.stringify(req.body));
        return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      // Normalize phone number by removing +1 prefix and any non-digit characters
      const normalizedPhone = from.replace(/^\+1/, '').replace(/\D/g, '');
      log(`Normalized phone from ${from} to ${normalizedPhone}`);

      // Get ALL contacts with this phone number (multi-tenant support)
      const contacts = await storage.getAllContactsByPhone(normalizedPhone);
      
      if (contacts.length === 0) {
        log(`No contacts found for phone number: ${from}`);
        // Return TwiML response to acknowledge receipt
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      log(`Found ${contacts.length} contact(s) with phone ${normalizedPhone}`);

      // Handle media attachments (MMS)
      const mediaCount = parseInt(numMedia || '0', 10);
      const messageBody = mediaCount > 0 
        ? `${text} [${mediaCount} attachment(s)]`
        : text;

      // Process each contact (multi-tenant: same phone number can belong to multiple photographers)
      for (const contact of contacts) {
        log(`Processing contact ${contact.firstName} ${contact.lastName} for photographer ${contact.photographerId}`);
        
        const photographer = await storage.getPhotographer(contact.photographerId);
        
        if (!photographer) {
          log(`No photographer found for contact: ${contact.id}`);
          continue;
        }

        const contactWithProjects = await storage.getContact(contact.id);
        const latestProject = contactWithProjects?.projects?.[0];

        // Create SMS log for this contact
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

        log(`Created SMS log for contact ${contact.id}`);

        // Log SMS to project activity if contact has a project
        if (latestProject) {
          const messagePreview = messageBody.length > 100 ? messageBody.substring(0, 100) + '...' : messageBody;
          await storage.addProjectActivityLog({
            projectId: latestProject.id,
            activityType: 'SMS_RECEIVED',
            action: 'RECEIVED',
            title: `SMS received from ${contact.firstName} ${contact.lastName}`,
            description: messagePreview,
            relatedId: messageSid,
            relatedType: 'SMS_LOG'
          });
        }

        // Forward message to photographer
        if (photographer.phone) {
          const projectContext = latestProject ? `${latestProject.projectType} Project` : 'Contact';
          const contextMessage = `${contact.firstName} ${contact.lastName} (${projectContext}): ${messageBody}`;
          
          const { sendSms } = await import('./services/sms');
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

            log(`Forwarded SMS to photographer: ${photographer.phone}`);
          } else {
            log('Failed to forward SMS to photographer: ' + forwardResult.error);
          }
        }
      }

      // Return TwiML response to acknowledge receipt
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error: any) {
      console.error('❌ TWILIO WEBHOOK ERROR:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });

  // Twilio Status Callback Handler for SMS delivery updates
  app.post("/webhooks/twilio/status", async (req, res) => {
    log('✅ TWILIO STATUS WEBHOOK - Received at ' + new Date().toISOString());
    log('Status callback body: ' + JSON.stringify(req.body, null, 2));
    
    try {
      const { MessageSid: messageSid, MessageStatus: messageStatus } = req.body;
      
      if (!messageSid || !messageStatus) {
        log('Invalid Twilio status callback payload: ' + JSON.stringify(req.body));
        return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      // Map Twilio status to our status: sent, delivered, failed
      let status = messageStatus;
      if (messageStatus === 'undelivered' || messageStatus === 'failed') {
        status = 'failed';
      } else if (messageStatus === 'delivered') {
        status = 'delivered';
      } else if (messageStatus === 'sent' || messageStatus === 'queued' || messageStatus === 'sending') {
        status = 'sent';
      }

      // Update the SMS log status
      await storage.updateSmsLogStatus(messageSid, status);
      
      log(`Updated SMS ${messageSid} status to: ${status} (original: ${messageStatus})`);

      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error: any) {
      log('Twilio status webhook error: ' + error);
      return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });

  app.use(cookieParser());

  // Serve attached_assets directory for uploaded files (logos, etc.)
  const attachedAssetsPath = path.join(process.cwd(), 'attached_assets');
  if (!fs.existsSync(attachedAssetsPath)) {
    fs.mkdirSync(attachedAssetsPath, { recursive: true });
  }
  app.use('/attached_assets', (await import('express')).static(attachedAssetsPath));

  // Log ALL incoming requests
  app.use((req, res, next) => {
    if (req.path.includes('webhook')) {
      console.log('🔥 WEBHOOK REQUEST:', req.method, req.path, JSON.stringify(req.body));
    }
    next();
  });

  // CORS configuration for authenticated API routes  
  app.use((req, res, next) => {
    // Only allow credentials for same-origin requests to prevent CSRF
    const origin = req.headers.origin;
    const isPublicRoute = req.path.startsWith('/api/public/') || req.path.startsWith('/webhooks/');
    
    if (isPublicRoute) {
      // Public routes and webhooks handled by specific middleware, skip global CORS
      return next();
    }
    
    // For authenticated routes, only allow credentials from same origin
    const host = req.get('host');
    const isSameOrigin = !origin || origin === `${req.protocol}://${host}`;
    
    if (isSameOrigin) {
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Origin", origin || `${req.protocol}://${host}`);
    } else {
      // Cross-origin requests to authenticated routes - no credentials
      res.header("Access-Control-Allow-Credentials", "false");  
      res.header("Access-Control-Allow-Origin", "*");
    }
    
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

  // Short link redirect route
  app.get("/s/:shortCode", async (req, res) => {
    try {
      const { shortCode } = req.params;
      
      // Look up the short link
      const shortLink = await storage.getShortLink(shortCode);
      
      if (!shortLink) {
        return res.status(404).send("Link not found");
      }
      
      // Track the click
      await storage.incrementShortLinkClicks(shortLink.id);
      
      // Redirect to the target URL
      return res.redirect(302, shortLink.targetUrl);
    } catch (error) {
      console.error("Error processing short link:", error);
      return res.status(500).send("Error processing link");
    }
  });

  // Public booking calendar route with server-side meta tag injection
  // Note: Uses /booking/* path instead of /public/* to avoid Vite static file handler conflict
  app.get("/booking/calendar/:publicToken", async (req, res, next) => {
    console.log("🔍 BOOKING CALENDAR ROUTE HIT:", req.params.publicToken);
    try {
      const { publicToken } = req.params;
      
      // Fetch photographer data
      const photographer = await storage.getPhotographerByPublicToken(publicToken);
      console.log("📸 Photographer found:", photographer?.businessName);
      
      if (!photographer) {
        // If photographer not found, let it fall through to the SPA
        return next();
      }

      // Helper function to escape HTML attribute values to prevent injection attacks
      const escapeAttr = (text: string) => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      // Build the meta tags with proper escaping
      const businessName = escapeAttr(photographer.businessName);
      const title = `${businessName} - Schedule Your Photography Session`;
      const description = `Book your consultation with ${businessName}. Choose a time that works for you.`;
      const currentUrl = escapeAttr(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
      
      // Build image URL - must be absolute for Open Graph and properly validated
      let imageUrl = '';
      if (photographer.logoUrl) {
        // Validate that logoUrl is a proper HTTP(S) URL
        let logoUrl = photographer.logoUrl.trim();
        
        // If logoUrl is already absolute, validate and use it
        if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
          // Basic URL validation
          try {
            new URL(logoUrl);
            imageUrl = escapeAttr(logoUrl);
          } catch {
            // Invalid URL, skip image
            imageUrl = '';
          }
        } else {
          // Make it absolute
          imageUrl = escapeAttr(`${req.protocol}://${req.get('host')}${logoUrl}`);
        }
      }

      // Create meta tags HTML with enhanced metadata
      const metaTags = `
    <!-- Dynamic Open Graph Meta Tags -->
    <meta property="og:site_name" content="Lazy Photog" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${currentUrl}" />
    ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : ''}
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : ''}
    
    <title>${title}</title>
    <meta name="description" content="${description}" />
  `;

      // Read the index.html template
      const fs = await import('fs/promises');
      let htmlPath: string;
      let html: string;
      
      if (app.get("env") === "development") {
        // In development, read from client folder
        htmlPath = path.resolve(import.meta.dirname, "../client/index.html");
      } else {
        // In production, read from build folder
        htmlPath = path.resolve(import.meta.dirname, "public/index.html");
      }
      
      html = await fs.readFile(htmlPath, 'utf-8');
      
      // Remove existing title and meta description tags to avoid duplicates
      html = html.replace(/<title>.*?<\/title>/s, '');
      html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi, '');
      
      // Inject meta tags before closing </head> tag for more robust insertion
      html = html.replace(
        /<\/head>/,
        `${metaTags}\n  </head>`
      );
      
      return res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      console.error("Error generating meta tags:", error);
      // If anything fails, fall through to regular SPA handling
      next();
    }
  });

  // Public API for landing page
  app.get("/api/photographer-count", async (req, res) => {
    try {
      const count = await storage.getPhotographerCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching photographer count:", error);
      res.json({ count: 0 });
    }
  });

  // Auth routes
  app.post("/api/auth/admin-setup", async (req, res) => {
    try {
      const { setupToken, email, password } = req.body;

      // Check if setup token is configured
      const expectedToken = process.env.ADMIN_SETUP_TOKEN;
      if (!expectedToken) {
        return res.status(403).json({ message: "Admin setup is disabled" });
      }

      // Validate token
      if (setupToken !== expectedToken) {
        return res.status(401).json({ message: "Invalid setup token" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if any admin user already exists
      const allUsers = await db.select().from(users).where(eq(users.role, 'ADMIN'));
      if (allUsers.length > 0) {
        return res.status(400).json({ message: "Admin user already exists" });
      }

      // Check if this specific email exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create admin user (no photographer association)
      const adminUser = await storage.createUser({
        email: normalizedEmail,
        passwordHash: hashedPassword,
        role: 'ADMIN',
        photographerId: null
      });

      // Generate token
      const token = generateToken({
        userId: adminUser.id,
        role: adminUser.role,
        photographerId: null
      });

      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        message: "Admin user created successfully",
        user: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role
        }
      });
    } catch (error) {
      console.error("Error creating admin user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, businessName, role = "PHOTOGRAPHER" } = req.body;
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      let photographerId: string | undefined;
      let stripeData: { customerId: string; subscriptionId: string; status: string; trialEndsAt: Date; periodEnd: Date } | undefined;
      
      // For photographers, create Stripe subscription FIRST before any database records
      if (role === "PHOTOGRAPHER") {
        try {
          // Create Stripe customer
          const customer = await stripe.customers.create({
            email: normalizedEmail,
            name: businessName,
            metadata: {
              businessName: businessName
            }
          });

          // Create subscription with 14-day trial
          const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{
              price: process.env.STRIPE_PRICE_ID!,
            }],
            trial_period_days: 14,
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
          });

          // Calculate trial end date
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 14);

          // Store Stripe data for database creation
          stripeData = {
            customerId: customer.id,
            subscriptionId: subscription.id,
            status: 'trialing',
            trialEndsAt: trialEndsAt,
            periodEnd: new Date(subscription.current_period_end * 1000)
          };
        } catch (stripeError: any) {
          console.error("Stripe subscription creation failed:", stripeError);
          return res.status(400).json({ 
            message: "Failed to create subscription. Please try again or contact support.",
            error: stripeError.message 
          });
        }

        // Only create database records if Stripe succeeded
        const photographer = await storage.createPhotographer({
          businessName,
          timezone: "America/New_York",
          stripeCustomerId: stripeData.customerId,
          stripeSubscriptionId: stripeData.subscriptionId,
          subscriptionStatus: stripeData.status,
          trialEndsAt: stripeData.trialEndsAt,
          subscriptionCurrentPeriodEnd: stripeData.periodEnd
        });
        photographerId = photographer.id;

        // Create default stages
        const defaultStages = [
          { name: "New Inquiry", orderIndex: 0, isDefault: true },
          { name: "Discovery Call Scheduled", orderIndex: 1, isDefault: false },
          { name: "Proposal Sent", orderIndex: 2, isDefault: false },
          { name: "Booked / Retainer Paid", orderIndex: 3, isDefault: false },
          { name: "Pre-Event Planning", orderIndex: 4, isDefault: false },
          { name: "Event Completed / Editing", orderIndex: 5, isDefault: false },
          { name: "Gallery Delivered", orderIndex: 6, isDefault: false },
          { name: "Album / Print Ordered", orderIndex: 7, isDefault: false },
          { name: "Completed Client / Review Requested", orderIndex: 8, isDefault: false }
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
        email: normalizedEmail,
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
      
      const result = await authenticateUser(email.toLowerCase().trim(), password);
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

  // Portal Token Routes (Magic Links for Client Auto-Login)
  app.post("/api/portal-tokens", authenticateToken, async (req, res) => {
    try {
      const { projectId, clientId } = req.body;
      const photographerId = req.user!.photographerId;

      if (!projectId || !clientId) {
        return res.status(400).json({ message: "Project ID and Client ID are required" });
      }

      // Verify project belongs to photographer
      const project = await storage.getProject(projectId);
      if (!project || project.photographerId !== photographerId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Generate secure random token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Token expires in 90 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      const portalToken = await storage.createPortalToken({
        token,
        projectId,
        clientId,
        photographerId,
        expiresAt
      });

      res.json({ 
        token: portalToken.token,
        expiresAt: portalToken.expiresAt
      });
    } catch (error) {
      console.error("Portal token generation error:", error);
      res.status(500).json({ message: "Failed to generate portal token" });
    }
  });

  // Public endpoint to validate portal token and auto-login client
  app.get("/api/portal/:token", async (req, res) => {
    try {
      const { token } = req.params;
      console.log("🔑 Portal token validation request for token:", token.substring(0, 10) + "...");

      const portalToken = await storage.validatePortalToken(token);
      if (!portalToken) {
        console.log("❌ Portal token validation failed: Invalid or expired token");
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      console.log("✅ Portal token validated successfully for project:", portalToken.projectId);

      // Update last used timestamp
      await storage.updatePortalTokenLastUsed(portalToken.id);

      // Get the client/contact
      const contact = await storage.getContact(portalToken.clientId);
      if (!contact) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Check if user exists for this contact
      let user = await storage.getUserByEmail(contact.email);
      
      // If no user exists, create one with a random password (they can reset it later)
      if (!user) {
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        user = await storage.createUser({
          email: contact.email,
          passwordHash: hashedPassword,
          role: "CLIENT",
          photographerId: portalToken.photographerId
        });
      }

      // Generate JWT token for the client
      const jwtToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          photographerId: user.photographerId 
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      // Set HTTP-only cookie
      res.cookie('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      console.log("🍪 Auth cookie set for user:", user.email);

      // Return user info and redirect to project
      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          photographerId: user.photographerId
        },
        projectId: portalToken.projectId
      });
      
      console.log("✅ Portal validation complete, redirecting to project:", portalToken.projectId);
    } catch (error) {
      console.error("Portal token validation error:", error);
      res.status(500).json({ message: "Failed to validate portal token" });
    }
  });

  // Password Reset Flow
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);
      
      // Always return success even if user not found (security best practice)
      if (!user) {
        return res.json({ message: "If an account exists with this email, a password reset link will be sent." });
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to user
      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry,
        resetTokenUsed: false
      });

      // Create reset link
      const resetLink = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

      // Send email with reset link
      const emailResult = await sendEmail({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@example.com",
        subject: "Password Reset Request",
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your Lazy Photog account.</p>
          <p>Click the link below to reset your password (valid for 1 hour):</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
        text: `
          Password Reset Request
          
          You requested a password reset for your Lazy Photog account.
          
          Click the link below to reset your password (valid for 1 hour):
          ${resetLink}
          
          If you didn't request this, please ignore this email.
        `
      });

      if (!emailResult.success) {
        console.error("Failed to send reset email:", emailResult.error);
        return res.status(500).json({ message: "Failed to send reset email" });
      }

      res.json({ message: "If an account exists with this email, a password reset link will be sent." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/validate-reset-token", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }

      const user = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
      
      if (!user || user.length === 0) {
        return res.json({ valid: false, message: "Invalid reset token" });
      }

      const userData = user[0];

      // Check if token is expired
      if (!userData.resetTokenExpiry || new Date() > userData.resetTokenExpiry) {
        return res.json({ valid: false, message: "Reset token has expired" });
      }

      // Check if token has been used
      if (userData.resetTokenUsed) {
        return res.json({ valid: false, message: "Reset token has already been used" });
      }

      res.json({ valid: true, email: userData.email });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ valid: false, message: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      const user = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
      
      if (!user || user.length === 0) {
        return res.status(400).json({ message: "Invalid reset token" });
      }

      const userData = user[0];

      // Validate token
      if (!userData.resetTokenExpiry || new Date() > userData.resetTokenExpiry) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      if (userData.resetTokenUsed) {
        return res.status(400).json({ message: "Reset token has already been used" });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update user with new password and mark token as used
      await storage.updateUser(userData.id, {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiry: null,
        resetTokenUsed: true
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Demo Request Route (public)
  app.post("/api/demo-request", async (req, res) => {
    try {
      const demoRequestSchema = z.object({
        firstName: z.string().min(1),
        email: z.string().email(),
        date: z.string().min(1),
        time: z.string().min(1),
      });

      const data = demoRequestSchema.parse(req.body);

      // Send email notification to admin
      const emailResult = await sendEmail({
        to: "austinpacholek2014@gmail.com",
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@example.com",
        subject: `Demo Request from ${data.firstName}`,
        html: `
          <h2>New Demo Request</h2>
          <p><strong>Name:</strong> ${data.firstName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Preferred Date:</strong> ${data.date}</p>
          <p><strong>Preferred Time:</strong> ${data.time}</p>
        `,
        text: `
          New Demo Request
          
          Name: ${data.firstName}
          Email: ${data.email}
          Preferred Date: ${data.date}
          Preferred Time: ${data.time}
        `
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error || "Failed to send email");
      }

      res.json({ message: "Demo request sent successfully" });
    } catch (error: any) {
      console.error("Demo request error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid demo request data" });
      }
      res.status(500).json({ message: error.message || "Failed to send demo request" });
    }
  });

  // Admin Routes
  app.get("/api/admin/photographers", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const photographers = await storage.getAllPhotographersWithStats();
      res.json(photographers);
    } catch (error) {
      console.error("Error fetching photographers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/impersonate/:photographerId", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { photographerId } = req.params;

      // Prevent impersonation while already impersonating
      if (req.user!.isImpersonating) {
        return res.status(409).json({ message: "Cannot impersonate while already impersonating. Please exit impersonation first." });
      }

      const adminUserId = req.user!.userId;

      // Verify photographer exists
      const photographer = await storage.getPhotographer(photographerId);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Get the user associated with this photographer
      const photographerUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.photographerId, photographerId)
      });

      if (!photographerUser) {
        return res.status(404).json({ message: "Photographer user not found" });
      }

      // Generate impersonation token with both admin and photographer info
      const impersonationToken = generateToken({
        userId: photographerUser.id,
        role: photographerUser.role,
        photographerId: photographer.id,
        isImpersonating: true,
        adminUserId: adminUserId,
        originalRole: req.user!.role
      });

      // Log admin activity
      await storage.logAdminActivity({
        adminUserId,
        action: 'IMPERSONATE',
        targetPhotographerId: photographerId,
        metadata: { details: `Admin impersonated photographer: ${photographer.businessName}` }
      });

      // Set impersonation cookie
      res.cookie('token', impersonationToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 2 * 60 * 60 * 1000 // 2 hours for impersonation
      });

      res.json({
        message: "Impersonation started",
        photographer: {
          id: photographer.id,
          businessName: photographer.businessName,
          email: photographerUser.email
        }
      });
    } catch (error) {
      console.error("Error during impersonation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/exit-impersonation", authenticateToken, async (req, res) => {
    try {
      // Check if user is currently impersonating
      if (!req.user?.isImpersonating || !req.user?.adminUserId) {
        return res.status(400).json({ message: "Not currently impersonating" });
      }

      const adminUserId = req.user.adminUserId;

      // Get the admin user
      const adminUser = await storage.getUser(adminUserId);
      if (!adminUser) {
        return res.status(404).json({ message: "Admin user not found" });
      }

      // Generate regular admin token
      const adminToken = generateToken({
        userId: adminUser.id,
        role: adminUser.role,
        photographerId: null
      });

      // Log admin activity
      await storage.logAdminActivity({
        adminUserId,
        action: 'EXIT_IMPERSONATION',
        metadata: { details: 'Admin exited impersonation mode' }
      });

      // Set admin cookie
      res.cookie('token', adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({ message: "Exited impersonation mode" });
    } catch (error) {
      console.error("Error exiting impersonation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/photographers/:photographerId/subscription", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { photographerId } = req.params;
      const { subscriptionStatus } = req.body;

      const validStatuses = ['trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unlimited'];
      if (!validStatuses.includes(subscriptionStatus)) {
        return res.status(400).json({ message: "Invalid subscription status" });
      }

      const photographer = await storage.getPhotographer(photographerId);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      const updated = await storage.updatePhotographerSubscription(photographerId, subscriptionStatus);

      // Get admin user ID
      const adminUserId = req.user!.isImpersonating ? req.user!.adminUserId : req.user!.userId;

      // Log admin activity
      await storage.logAdminActivity({
        adminUserId,
        action: 'UPDATE_SUBSCRIPTION',
        targetPhotographerId: photographerId,
        metadata: { 
          details: `Updated subscription status to: ${subscriptionStatus}`,
          businessName: photographer.businessName,
          previousStatus: photographer.subscriptionStatus
        }
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Base user data
      const userData: any = {
        id: user.id,
        email: user.email,
        role: user.role,
        photographerId: user.photographerId,
        isImpersonating: req.user!.isImpersonating || false,
        adminUserId: req.user!.adminUserId
      };

      // If user is a photographer, include photographer metadata
      if (user.photographerId) {
        try {
          const photographer = await storage.getPhotographer(user.photographerId);
          if (photographer) {
            userData.publicToken = photographer.publicToken;
            userData.businessName = photographer.businessName;
            userData.timezone = photographer.timezone;
            userData.brandPrimary = photographer.brandPrimary;
          }
        } catch (photogError) {
          console.error("Error fetching photographer data:", photogError);
          // Continue without photographer data if fetch fails
        }
      }

      res.json(userData);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Subscription Management (NO subscription check - must be accessible to manage billing)
  app.get("/api/subscription", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Return subscription details
      res.json({
        subscriptionStatus: photographer.subscriptionStatus,
        trialEndsAt: photographer.trialEndsAt,
        currentPeriodEnd: photographer.subscriptionCurrentPeriodEnd,
        stripeCustomerId: photographer.stripeCustomerId,
        stripeSubscriptionId: photographer.stripeSubscriptionId
      });
    } catch (error) {
      console.error("Subscription fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/subscription/portal", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer || !photographer.stripeCustomerId) {
        return res.status(404).json({ message: "Stripe customer not found" });
      }

      // Create Stripe billing portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: photographer.stripeCustomerId,
        return_url: `${req.headers.origin}/settings`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Portal session error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Photographer settings (with subscription check)
  app.get("/api/photographer", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.put("/api/photographer", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const updated = await storage.updatePhotographer(req.user!.photographerId!, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Onboarding routes (alias for /api/photographer endpoints)
  app.get("/api/photographers/me", authenticateToken, requirePhotographer, async (req, res) => {
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

  // Configure multer for logo uploads
  const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(process.cwd(), 'attached_assets', 'logos');
      // Ensure directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with original extension
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `logo-${uniqueSuffix}${ext}`);
    }
  });

  const uploadLogo = multer({ 
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      // Accept images only
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  app.post("/api/upload/logo", authenticateToken, requirePhotographer, uploadLogo.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Return the file path relative to attached_assets
      const logoUrl = `/attached_assets/logos/${req.file.filename}`;
      res.json({ logoUrl });
    } catch (error) {
      console.error("Logo upload error:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Configure multer for headshot uploads
  const headshotStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(process.cwd(), 'attached_assets', 'headshots');
      // Ensure directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with original extension
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `headshot-${uniqueSuffix}${ext}`);
    }
  });

  const uploadHeadshot = multer({ 
    storage: headshotStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      // Accept images only
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  app.post("/api/upload/headshot", authenticateToken, requirePhotographer, uploadHeadshot.single('headshot'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Return the file path relative to attached_assets
      const headshotUrl = `/attached_assets/headshots/${req.file.filename}`;
      res.json({ headshotUrl });
    } catch (error) {
      console.error("Headshot upload error:", error);
      res.status(500).json({ message: "Failed to upload headshot" });
    }
  });

  app.patch("/api/photographers/me", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const updated = await storage.updatePhotographer(req.user!.photographerId!, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/photographers/me/complete-onboarding", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const updated = await storage.updatePhotographer(req.user!.photographerId!, {
        onboardingCompletedAt: new Date(),
        onboardingDismissed: false
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/photographers/me/dismiss-onboarding", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const updated = await storage.updatePhotographer(req.user!.photographerId!, {
        onboardingDismissed: true
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stages
  app.get("/api/stages", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.post("/api/stages", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  // Contacts
  app.get("/api/contacts", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { projectType } = req.query;
      console.log('[CONTACTS API] Getting contacts for photographer:', req.user!.photographerId!, 'projectType:', projectType);
      const contacts = await storage.getContactsByPhotographer(
        req.user!.photographerId!, 
        projectType as string | undefined
      );
      console.log('[CONTACTS API] Retrieved', contacts.length, 'contacts');
      res.json(contacts);
    } catch (error) {
      console.error('[CONTACTS API] Error getting contacts:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/contacts", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      console.log('[CONTACT CREATION] Request body:', req.body);
      
      // Separate contact and project data
      const { projectType, eventDate, leadSource, ...contactFields } = req.body;
      
      // Parse contact data
      const contactData = insertContactSchema.parse({
        ...contactFields,
        photographerId: req.user!.photographerId!
      });
      
      console.log('[CONTACT CREATION] Parsed contact data:', contactData);

      // Create the contact first
      const contact = await storage.createContact(contactData);
      console.log('[CONTACT CREATION] Created contact:', contact.id);

      // If project data is provided, create a project for this contact
      if (projectType) {
        // Get default stage for this project type
        const stages = await storage.getStagesByPhotographer(
          req.user!.photographerId!,
          projectType
        );
        const defaultStage = stages.find(s => s.isDefault);
        console.log('[CONTACT CREATION] Default stage:', defaultStage?.name);

        // Create project data
        const projectData = {
          contactId: contact.id,
          photographerId: req.user!.photographerId!,
          projectType: projectType,
          title: `${projectType} - ${contact.firstName} ${contact.lastName}`,
          leadSource: leadSource || 'MANUAL',
          eventDate: eventDate ? new Date(eventDate) : null,
          stageId: defaultStage?.id,
          stageEnteredAt: defaultStage ? new Date() : null
        };
        
        console.log('[CONTACT CREATION] Creating project:', projectData);
        const project = await storage.createProject(projectData);
        console.log('[CONTACT CREATION] Created project:', project.id);
      }

      // TODO: Create checklist items for contact
      // TODO: Trigger automation events

      res.status(201).json(contact);
    } catch (error) {
      console.error("[CONTACT CREATION] Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/contacts/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Verify contact belongs to this photographer
      const existingContact = await storage.getContact(req.params.id);
      if (!existingContact || existingContact.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Whitelist allowed fields - explicitly reject dangerous fields
      if (req.body.stageId !== undefined) {
        return res.status(400).json({ message: "Use /api/contacts/:id/stage to change contact stage" });
      }
      if (req.body.photographerId !== undefined) {
        return res.status(400).json({ message: "Cannot change photographer assignment" });
      }
      if (req.body.projectType !== undefined) {
        return res.status(400).json({ message: "Project type changes not currently supported - contact support" });
      }
      
      // Create safe update schema - only allow safe fields
      const safeUpdateSchema = insertContactSchema.pick({
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
      const contact = await storage.updateContact(req.params.id, safeUpdateData);
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/contacts/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Verify contact belongs to this photographer
      const existingContact = await storage.getContact(req.params.id);
      if (!existingContact || existingContact.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Check if contact has any Smart Files or payments (financial activity)
      const hasSmartFiles = await db.select({ count: sql<number>`count(*)::int` })
        .from(projectSmartFiles)
        .innerJoin(projects, eq(projectSmartFiles.projectId, projects.id))
        .where(eq(projects.contactId, req.params.id))
        .then(result => (result[0]?.count || 0) > 0);
      
      const hasPayments = await db.select({ count: sql<number>`count(*)::int` })
        .from(photographerEarnings)
        .innerJoin(projects, eq(photographerEarnings.projectId, projects.id))
        .where(eq(projects.contactId, req.params.id))
        .then(result => (result[0]?.count || 0) > 0);
      
      // Prevent deletion if there's financial activity
      if (hasSmartFiles || hasPayments) {
        return res.status(400).json({ 
          message: "Cannot delete contact with Smart Files or payment history. Please archive this contact instead to maintain financial records.",
          canArchive: true,
          hasSmartFiles,
          hasPayments
        });
      }
      
      // Safe to delete - no financial records
      await storage.deleteContact(req.params.id);
      
      res.json({ 
        message: "Contact and all related data deleted successfully",
        deletedContactId: req.params.id
      });
    } catch (error) {
      console.error('Delete contact error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/contacts/:id/stage", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { stageId } = req.body;
      
      // Verify contact belongs to this photographer
      const existingContact = await storage.getContact(req.params.id);
      if (!existingContact || existingContact.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Verify stage belongs to same photographer and matches contact's project type
      const stages = await storage.getStagesByPhotographer(
        req.user!.photographerId!, 
        existingContact.projectType
      );
      const targetStage = stages.find(s => s.id === stageId);
      if (!targetStage) {
        return res.status(400).json({ message: "Invalid stage for this contact's project type" });
      }
      
      const contact = await storage.updateContact(req.params.id, {
        stageId,
        stageEnteredAt: new Date()
      });
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/contacts/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact || contact.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/contacts/:id/history", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact || contact.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      console.log(`[CONTACT HISTORY] Getting history for contact: ${req.params.id}`);
      const history = await storage.getClientHistory(req.params.id);
      console.log(`[CONTACT HISTORY] Retrieved ${history.length} history items`);
      res.json(history);
    } catch (error) {
      console.error(`[CONTACT HISTORY ERROR] Failed to get contact history for ${req.params.id}:`, error);
      res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Email History Routes
  app.get("/api/email-history", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { direction, source, contactId, projectId, limit } = req.query;
      
      const filters: any = {};
      if (direction) filters.direction = direction as string;
      if (source) filters.source = source as string;
      if (contactId) filters.contactId = contactId as string;
      if (projectId) filters.projectId = projectId as string;
      if (limit) filters.limit = parseInt(limit as string);

      const emails = await storage.getEmailHistoryByPhotographer(req.user!.photographerId!, filters);
      res.json(emails);
    } catch (error) {
      console.error('Get email history error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/contacts/:id/email-history", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact || contact.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const emails = await storage.getEmailHistoryByClient(req.params.id);
      res.json(emails);
    } catch (error) {
      console.error('Get contact email history error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/:id/email-history", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }

      const emails = await storage.getEmailHistoryByProject(req.params.id);
      res.json(emails);
    } catch (error) {
      console.error('Get project email history error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/email-threads/:threadId", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Filter by photographer for security
      const emails = await storage.getEmailHistoryByThread(req.params.threadId, req.user!.photographerId!);
      
      if (emails.length === 0) {
        return res.status(404).json({ message: "Thread not found" });
      }

      res.json(emails);
    } catch (error) {
      console.error('Get email thread error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/contacts/:id/send-login-link", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    console.log('=== SEND LOGIN LINK REQUEST RECEIVED ===');
    console.log('Contact ID:', req.params.id);
    console.log('User:', req.user);
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact || contact.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      if (!contact.email) {
        return res.status(400).json({ message: "Contact has no email address" });
      }

      // Rate limiting check - max 100 tokens per hour per contact (increased for testing)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentTokens = await storage.getContactPortalTokensByContact(contact.id, oneHourAgo);
      
      if (recentTokens.length >= 100) {
        return res.status(429).json({ message: "Too many login link requests. Please wait before requesting another." });
      }

      // Generate secure token (valid for 7 days)
      const token = generateToken({ 
        userId: contact.id, 
        role: 'CLIENT', 
        photographerId: contact.photographerId 
      } as any);
      
      // Store token in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await storage.createContactPortalToken({
        contactId: contact.id,
        token,
        expiresAt
      });

      // Send email and SMS with login link
      const photographer = await storage.getPhotographer(contact.photographerId);
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/client-portal?token=${token}`;
      
      // Get contact's active projects for email tracking
      const contactProjects = await storage.getProjectsByContact(contact.id);
      const activeProject = contactProjects.find(p => p.status === 'ACTIVE') || contactProjects[0];
      
      console.log('=== ATTEMPTING TO SEND EMAIL & SMS ===');
      console.log('Login URL generated:', loginUrl);
      console.log('Contact email:', contact.email);
      console.log('Contact phone:', contact.phone);
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
      console.log('SimpleTexting credentials exist:', !!process.env.SIMPLETEXTING_API_TOKEN && !!process.env.SIMPLETEXTING_PHONE_NUMBER);
      
      const emailText = `Hi ${contact.firstName},

You can now access your client portal to view your project details, proposals, and communicate with us.

Access your portal: ${loginUrl}

This link is valid for 7 days.

Best regards,
${photographer?.businessName || 'Your Photography Team'}`;

      const smsText = `Hi ${contact.firstName}! Access your client portal: ${loginUrl} (Valid for 7 days) - ${photographer?.businessName || 'Your Photographer'}`;
      
      let emailSent = false;
      let smsSent = false;
      let emailError = '';
      let smsError = '';
      
      // Try to send both email and SMS
      const results = await Promise.allSettled([
        // Send email
        contact.email ? sendEmail({
          to: contact.email,
          from: photographer?.emailFromAddr || 'noreply@lazyphotog.com',
          subject: `Access Your Client Portal - ${photographer?.businessName || 'Your Photographer'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Welcome to Your Client Portal</h2>
              <p>Hi ${contact.firstName},</p>
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
          text: emailText,
          photographerId: photographer?.id,
          contactId: contact.id,
          projectId: activeProject?.id,
          source: 'MANUAL' as const
        }) : Promise.resolve(false),
        
        // Send SMS
        contact.phone ? sendSms({
          to: contact.phone,
          body: smsText
        }) : Promise.resolve({ success: false, error: 'No phone number' })
      ]);
      
      // Process email result
      if (results[0].status === 'fulfilled') {
        emailSent = results[0].value as boolean;
        if (!emailSent && contact.email) {
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
        if (!smsSent && contact.phone) {
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
      
      if (!emailSent && contact.email) failedMethods.push(`email (${emailError})`);
      if (!smsSent && contact.phone) failedMethods.push(`SMS (${smsError})`);
      
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
          clientEmail: contact.email || 'not provided',
          clientPhone: contact.phone || 'not provided',
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
  app.get("/api/projects", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.post("/api/projects", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Import InsertProject schema
      const insertProjectSchema = z.object({
        photographerId: z.string(),
        clientId: z.string(),
        title: z.string().min(1),
        projectType: z.enum(['WEDDING', 'ENGAGEMENT', 'PROPOSAL', 'CORPORATE', 'PORTRAIT', 'FAMILY', 'MATERNITY', 'NEWBORN', 'EVENT', 'COMMERCIAL', 'OTHER']),
        eventDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
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
      const contact = await storage.getContact(projectData.clientId);
      if (!contact || contact.photographerId !== req.user!.photographerId!) {
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

  app.get("/api/projects/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.put("/api/projects/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.put("/api/projects/:id/stage", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { stageId } = req.body;
      
      // Verify project belongs to photographer
      const existingProject = await storage.getProject(req.params.id);
      if (!existingProject || existingProject.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get old and new stage names for logging
      const oldStageName = existingProject.stage?.name || 'None';
      let newStageName = 'None';
      
      // Verify stage belongs to same photographer and matches project type
      if (stageId) {
        const stage = await storage.getStage(stageId);
        if (!stage || stage.photographerId !== req.user!.photographerId!) {
          return res.status(400).json({ message: "Invalid stage ID" });
        }
        
        if (stage.projectType !== existingProject.projectType) {
          return res.status(400).json({ message: "Stage project type doesn't match project" });
        }
        
        newStageName = stage.name;
      }
      
      const project = await storage.updateProject(req.params.id, { stageId });
      
      // Log the stage change to project activity log
      await storage.addProjectActivityLog({
        projectId: req.params.id,
        activityType: 'STAGE_CHANGE',
        action: 'UPDATED',
        title: `Stage changed from "${oldStageName}" to "${newStageName}"`,
        description: `Project stage updated by photographer`,
        metadata: JSON.stringify({
          oldStageId: existingProject.stageId,
          oldStageName,
          newStageId: stageId || null,
          newStageName
        }),
        relatedId: stageId || null,
        relatedType: 'STAGE'
      });
      
      res.json(project);
    } catch (error) {
      console.error("Update project stage error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/:id/history", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  // Send message to project (primary client + participants)
  app.post("/api/projects/:id/send-message", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { subject, body, sendToParticipants = true } = req.body;
      
      if (!subject || !body) {
        return res.status(400).json({ message: "Subject and body are required" });
      }
      
      // Verify project belongs to photographer
      const project = await storage.getProject(req.params.id);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get primary client email
      const primaryEmail = project.contact.email;
      if (!primaryEmail) {
        return res.status(400).json({ message: "Client has no email address" });
      }
      
      // Get participant emails if requested
      let bccEmails: string[] = [];
      if (sendToParticipants) {
        const participants = await storage.getProjectParticipants(req.params.id);
        bccEmails = participants
          .filter(p => p.contact.emailOptIn && p.contact.email)
          .map(p => p.contact.email);
      }
      
      // Send email via Gmail (fallback to SendGrid)
      const { sendEmail } = await import('./services/email');
      const result = await sendEmail({
        to: primaryEmail,
        subject,
        html: body.replace(/\n/g, '<br>'),
        text: body,
        bcc: bccEmails.length > 0 ? bccEmails : undefined,
        photographerId: req.user!.photographerId!,
        clientId: project.clientId,
        projectId: project.id,
        source: 'MANUAL'
      });
      
      if (!result.success) {
        return res.status(500).json({ message: "Failed to send email", error: result.error });
      }
      
      // Log to activity log with full email content
      await storage.addProjectActivityLog({
        projectId: req.params.id,
        activityType: 'EMAIL_SENT',
        action: 'SENT',
        title: `Manual email: ${subject}`,
        description: `Email sent to ${primaryEmail}${bccEmails.length > 0 ? ` + ${bccEmails.length} participants` : ''}`,
        metadata: JSON.stringify({
          subject,
          body: body,
          htmlBody: body.replace(/\n/g, '<br>'),
          recipients: [primaryEmail, ...bccEmails],
          participantCount: bccEmails.length,
          source: result.source || 'MANUAL'
        }),
        relatedId: result.messageId || null,
        relatedType: 'EMAIL'
      });
      
      res.json({ 
        success: true, 
        message: "Email sent successfully",
        recipients: {
          primary: primaryEmail,
          participants: bccEmails
        },
        source: result.source
      });
    } catch (error) {
      console.error("Send project message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate email content using AI
  app.post("/api/projects/:id/generate-email", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { prompt, existingEmailBody } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      // Verify project belongs to photographer
      const project = await storage.getProject(req.params.id);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get project contact info
      const contact = project.clientId ? await storage.getContact(project.clientId) : null;
      const contactName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'Client';
      
      // Get photographer info
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      const photographerName = photographer?.photographerName || photographer?.businessName || 'Photographer';
      const businessName = photographer?.businessName || 'Photography Studio';
      
      // Generate email using OpenAI
      const { generateEmailFromPrompt } = await import('./services/openai');
      const result = await generateEmailFromPrompt(prompt, {
        projectTitle: project.title,
        contactName,
        projectType: project.projectType,
        photographerName,
        businessName,
        existingEmailBody
      });
      
      res.json(result);
    } catch (error) {
      console.error("Generate email error:", error);
      res.status(500).json({ message: (error as Error).message || "Failed to generate email" });
    }
  });

  // Generate SMS content using AI
  app.post("/api/projects/:id/generate-sms", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { prompt, existingSMSBody } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      // Verify project belongs to photographer
      const project = await storage.getProject(req.params.id);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get project contact info
      const contact = project.clientId ? await storage.getContact(project.clientId) : null;
      const contactName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'Client';
      
      // Get photographer info
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      const photographerName = photographer?.photographerName || photographer?.businessName || 'Photographer';
      const businessName = photographer?.businessName || 'Photography Studio';
      
      // Generate SMS using OpenAI
      const { generateSMSFromPrompt } = await import('./services/openai');
      const result = await generateSMSFromPrompt(prompt, {
        projectTitle: project.title,
        contactName,
        projectType: project.projectType,
        photographerName,
        businessName,
        existingSMSBody
      });
      
      res.json(result);
    } catch (error) {
      console.error("Generate SMS error:", error);
      res.status(500).json({ message: (error as Error).message || "Failed to generate SMS" });
    }
  });

  // Conversational AI for email/SMS - can ask questions or generate content
  app.post("/api/projects/:id/conversational-ai", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { messageType, conversationHistory, existingContent } = req.body;
      
      console.log("=== CONVERSATIONAL AI REQUEST ===");
      console.log("Message Type:", messageType);
      console.log("Conversation History:", JSON.stringify(conversationHistory, null, 2));
      console.log("Existing Content:", existingContent);
      
      if (!messageType || !['email', 'sms'].includes(messageType)) {
        return res.status(400).json({ message: "Valid messageType (email or sms) is required" });
      }
      
      if (!conversationHistory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({ message: "Conversation history is required" });
      }
      
      // Verify project belongs to photographer
      const project = await storage.getProject(req.params.id);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get project contact info
      const contact = project.clientId ? await storage.getContact(project.clientId) : null;
      const contactName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'Client';
      
      // Get photographer info
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      const photographerName = photographer?.photographerName || photographer?.businessName || 'Photographer';
      const businessName = photographer?.businessName || 'Photography Studio';
      
      console.log("Context:", { projectTitle: project.title, contactName, projectType: project.projectType, photographerName, businessName });
      
      // Call conversational AI
      const { conversationalAI } = await import('./services/openai');
      const result = await conversationalAI(messageType, conversationHistory, {
        projectTitle: project.title,
        contactName,
        projectType: project.projectType,
        photographerName,
        businessName,
        existingContent
      });
      
      console.log("=== CONVERSATIONAL AI RESPONSE ===");
      console.log(JSON.stringify(result, null, 2));
      
      res.json(result);
    } catch (error) {
      console.error("=== CONVERSATIONAL AI ERROR ===");
      console.error("Error:", error);
      console.error("Error message:", (error as Error).message);
      console.error("Error stack:", (error as Error).stack);
      res.status(500).json({ message: (error as Error).message || "Failed to process conversation" });
    }
  });

  // Send SMS to project contact
  app.post("/api/projects/:id/send-sms", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { body, recipient } = req.body;
      
      if (!body) {
        return res.status(400).json({ message: "Message body is required" });
      }

      if (!recipient) {
        return res.status(400).json({ message: "Recipient phone number is required" });
      }
      
      // Verify project belongs to photographer
      const project = await storage.getProject(req.params.id);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get photographer info
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Send SMS via Twilio
      const { sendSms } = await import('./services/sms');
      const result = await sendSms({
        to: recipient,
        body,
        photographerId: req.user!.photographerId!,
        projectId: project.id
      });
      
      if (!result.success) {
        return res.status(500).json({ message: "Failed to send SMS", error: result.error });
      }
      
      // Log to activity log
      await storage.addProjectActivityLog({
        projectId: req.params.id,
        activityType: 'SMS_SENT',
        action: 'SENT',
        title: 'Manual SMS sent',
        description: `SMS sent to ${recipient}`,
        metadata: JSON.stringify({
          recipient,
          messageLength: body.length,
          source: 'MANUAL'
        }),
        relatedId: result.messageId || null,
        relatedType: 'SMS'
      });
      
      res.json({ 
        success: true, 
        message: "SMS sent successfully",
        recipient
      });
    } catch (error) {
      console.error("=== SEND SMS ERROR ===");
      console.error("Error details:", error);
      console.error("Error message:", (error as Error).message);
      res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  // Send email to selected recipients (HoneyBook-style with recipient selection)
  app.post("/api/projects/:id/send-email", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      console.log("=== SEND EMAIL ROUTE HIT ===");
      console.log("Project ID:", req.params.id);
      console.log("Request body:", req.body);
      console.log("User:", req.user);
      
      const { subject, body, recipients = [] } = req.body;
      
      if (!subject || !body) {
        return res.status(400).json({ message: "Subject and body are required" });
      }

      if (!recipients || recipients.length === 0) {
        return res.status(400).json({ message: "At least one recipient is required" });
      }
      
      // Verify project belongs to photographer
      const project = await storage.getProject(req.params.id);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Send to first recipient as primary, rest as BCC
      const primaryEmail = recipients[0];
      const bccEmails = recipients.slice(1);
      
      // Generate portal link if enabled and client exists
      let emailBodyWithPortalLink = body;
      let portalLink = '';
      
      if (project.includePortalLinks !== false && project.clientId) {
        try {
          // Generate secure token
          const token = crypto.randomBytes(32).toString('hex');
          
          // Token expires in 90 days
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 90);

          // Create portal token
          await storage.createPortalToken({
            token,
            projectId: project.id,
            clientId: project.clientId,
            photographerId: project.photographerId,
            expiresAt
          });

          // Get domain for link
          const domain = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
            : process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000';
          
          portalLink = `${domain}/portal/${token}`;
          
          // Append magic link footer to email
          emailBodyWithPortalLink = `${body}\n\n---\n\n🔗 Quick access to your project: ${portalLink}`;
        } catch (error) {
          console.error("Failed to generate portal link:", error);
          // Continue sending email without portal link if generation fails
        }
      }
      
      // Send email via Gmail (fallback to SendGrid)
      const { sendEmail } = await import('./services/email');
      const result = await sendEmail({
        to: primaryEmail,
        subject,
        html: emailBodyWithPortalLink.replace(/\n/g, '<br>'),
        text: emailBodyWithPortalLink,
        bcc: bccEmails.length > 0 ? bccEmails : undefined,
        photographerId: req.user!.photographerId!,
        clientId: project.clientId,
        projectId: project.id,
        source: 'MANUAL'
      });
      
      if (!result.success) {
        return res.status(500).json({ message: "Failed to send email", error: result.error });
      }
      
      // Log to activity log
      await storage.addProjectActivityLog({
        projectId: req.params.id,
        activityType: 'EMAIL_SENT',
        action: 'SENT',
        title: `Manual email: ${subject}`,
        description: `Email sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`,
        metadata: JSON.stringify({
          subject,
          recipients,
          recipientCount: recipients.length,
          source: result.source || 'MANUAL'
        }),
        relatedId: result.messageId || null,
        relatedType: 'EMAIL'
      });
      
      res.json({ 
        success: true, 
        message: "Email sent successfully",
        recipients,
        source: result.source
      });
    } catch (error) {
      console.error("=== SEND EMAIL ERROR ===");
      console.error("Error details:", error);
      console.error("Error message:", (error as Error).message);
      console.error("Error stack:", (error as Error).stack);
      res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  // Project Participants
  app.get("/api/projects/:id/participants", authenticateToken, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access: either photographer or primary client or participant
      const isPhotographer = req.user!.photographerId === project.photographerId;
      
      // For clients, verify they belong to the same photographer as the project
      let isPrimaryClient = false;
      let isParticipant = false;
      
      if (req.user!.clientId) {
        // Get client to verify photographer ownership
        const contact = await storage.getContact(req.user!.clientId);
        if (!contact || contact.photographerId !== project.photographerId) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        // Check if primary client
        isPrimaryClient = req.user!.clientId === project.clientId;
        
        // If not primary contact, check if participant
        if (!isPrimaryClient) {
          const participantProjects = await storage.getParticipantProjects(req.user!.clientId);
          isParticipant = participantProjects.some(p => p.projectId === req.params.id);
        }
      }
      
      if (!isPhotographer && !isPrimaryClient && !isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const participants = await storage.getProjectParticipants(req.params.id);
      res.json(participants);
    } catch (error) {
      console.error("Get project participants error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects/:id/participants", authenticateToken, async (req, res) => {
    try {
      const { email, firstName, lastName } = req.body;
      
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
      }
      
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access: either photographer or primary client
      const isPhotographer = req.user!.photographerId === project.photographerId;
      let isPrimaryClient = false;
      
      // For clients, verify they belong to the same photographer as the project
      if (req.user!.clientId) {
        const contact = await storage.getContact(req.user!.clientId);
        if (!contact || contact.photographerId !== project.photographerId) {
          return res.status(403).json({ message: "Access denied" });
        }
        isPrimaryClient = req.user!.clientId === project.clientId;
      }
      
      if (!isPhotographer && !isPrimaryClient) {
        return res.status(403).json({ message: "Access denied. Only photographers and primary clients can add participants." });
      }
      
      // Check if participant already exists for this project
      const existingParticipants = await storage.getProjectParticipants(req.params.id);
      const alreadyAdded = existingParticipants.some(p => p.contact.email === email.toLowerCase());
      
      if (alreadyAdded) {
        return res.status(400).json({ message: "This person is already a participant on this project" });
      }
      
      // Look up or create client
      let contact = await storage.getContactByEmail(email.toLowerCase(), project.photographerId);
      
      if (!contact) {
        // Create new client (they'll use portal tokens for authentication)
        const newClientData = insertClientSchema.parse({
          photographerId: project.photographerId,
          firstName,
          lastName,
          email: email.toLowerCase(),
          emailOptIn: true
        });
        
        contact = await storage.createContact(newClientData);
        
        // TODO: Send invite email with portal access link (task 9)
        console.log(`[PARTICIPANT] Created new client for participant: ${contact.id}, email: ${email}`);
      }
      
      // Add participant with validation
      const participantData = insertProjectParticipantSchema.parse({
        projectId: req.params.id,
        clientId: contact.id,
        addedBy: isPhotographer ? 'photographer' : 'client',
        inviteSent: false
      });
      
      const participant = await storage.addProjectParticipant(participantData);
      
      // Fetch full participant with client data
      const participants = await storage.getProjectParticipants(req.params.id);
      const fullParticipant = participants.find(p => p.id === participant.id);
      
      res.status(201).json(fullParticipant);
    } catch (error) {
      console.error("Add project participant error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/projects/:projectId/participants/:clientId", authenticateToken, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access: either photographer or primary client
      const isPhotographer = req.user!.photographerId === project.photographerId;
      let isPrimaryClient = false;
      
      // For clients, verify they belong to the same photographer as the project
      if (req.user!.clientId) {
        const contact = await storage.getContact(req.user!.clientId);
        if (!contact || contact.photographerId !== project.photographerId) {
          return res.status(403).json({ message: "Access denied" });
        }
        isPrimaryClient = req.user!.clientId === project.clientId;
      }
      
      if (!isPhotographer && !isPrimaryClient) {
        return res.status(403).json({ message: "Access denied. Only photographers and primary clients can remove participants." });
      }
      
      await storage.removeProjectParticipant(req.params.projectId, req.params.clientId);
      res.status(204).send();
    } catch (error) {
      console.error("Remove project participant error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Project Notes
  app.get("/api/projects/:id/notes", authenticateToken, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Only photographers can view notes (notes are private to photographer)
      if (req.user!.photographerId !== project.photographerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const notes = await storage.getProjectNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Get project notes error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects/:id/notes", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { noteText } = req.body;
      
      if (!noteText || noteText.trim().length === 0) {
        return res.status(400).json({ message: "Note text is required" });
      }
      
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify photographer ownership
      if (req.user!.photographerId !== project.photographerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const note = await storage.createProjectNote({
        projectId: req.params.id,
        photographerId: req.user!.photographerId!,
        noteText: noteText.trim()
      });
      
      res.status(201).json(note);
    } catch (error) {
      console.error("Create project note error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/projects/:id/notes/:noteId", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify photographer ownership
      if (req.user!.photographerId !== project.photographerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the note to verify it belongs to this project
      const notes = await storage.getProjectNotes(req.params.id);
      const note = notes.find(n => n.id === req.params.noteId);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found or does not belong to this project" });
      }
      
      await storage.deleteProjectNote(req.params.noteId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete project note error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Templates
  app.get("/api/templates", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const templates = await storage.getTemplatesByPhotographer(req.user!.photographerId!);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Helper function to convert text to simple HTML
  const textToHtml = (text: string): string => {
    if (!text) return '';
    // Split by double line breaks for paragraphs, single line breaks for <br>
    const paragraphs = text.split(/\n\n+/);
    return paragraphs
      .map(para => {
        const lines = para.split(/\n/).filter(line => line.trim());
        return `<p>${lines.join('<br>')}</p>`;
      })
      .join('\n');
  };

  app.post("/api/templates", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const templateData = insertTemplateSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      
      // Auto-generate HTML from text body for email templates
      if (templateData.channel === 'EMAIL' && templateData.textBody) {
        templateData.htmlBody = textToHtml(templateData.textBody);
      }
      
      const template = await storage.createTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/templates/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Verify template belongs to this photographer
      const templates = await storage.getTemplatesByPhotographer(req.user!.photographerId!);
      const existingTemplate = templates.find(t => t.id === req.params.id);
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      const updates = insertTemplateSchema.partial().parse(req.body);
      
      // Auto-generate HTML from text body for email templates
      if (updates.channel === 'EMAIL' && updates.textBody) {
        updates.htmlBody = textToHtml(updates.textBody);
      } else if (existingTemplate.channel === 'EMAIL' && updates.textBody) {
        updates.htmlBody = textToHtml(updates.textBody);
      }
      
      const updatedTemplate = await storage.updateTemplate(req.params.id, updates);
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/templates/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Verify template belongs to this photographer
      const templates = await storage.getTemplatesByPhotographer(req.user!.photographerId!);
      const existingTemplate = templates.find(t => t.id === req.params.id);
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      await storage.deleteTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Packages
  app.get("/api/packages", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const packages = await storage.getPackagesByPhotographer(req.user!.photographerId!);
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/packages", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.patch("/api/packages/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log("[PATCH /api/packages/:id] Received body:", JSON.stringify(req.body, null, 2));
      
      // Verify package belongs to this photographer by fetching all their packages
      const photographerPackages = await storage.getPackagesByPhotographer(req.user!.photographerId!);
      const existingPackage = photographerPackages.find(pkg => pkg.id === id);
      
      if (!existingPackage) {
        return res.status(404).json({ message: "Package not found" });
      }

      console.log("[PATCH /api/packages/:id] Existing package:", JSON.stringify(existingPackage, null, 2));

      const updates = insertPackageSchema.partial().parse(req.body);
      console.log("[PATCH /api/packages/:id] Parsed updates:", JSON.stringify(updates, null, 2));
      
      const updatedPackage = await storage.updatePackage(id, updates);
      console.log("[PATCH /api/packages/:id] Updated package:", JSON.stringify(updatedPackage, null, 2));
      
      res.json(updatedPackage);
    } catch (error) {
      console.error("Update package error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/packages/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify package belongs to this photographer by fetching all their packages
      const photographerPackages = await storage.getPackagesByPhotographer(req.user!.photographerId!);
      const existingPackage = photographerPackages.find(pkg => pkg.id === id);
      
      if (!existingPackage) {
        return res.status(404).json({ message: "Package not found" });
      }

      await storage.deletePackage(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete package error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add-ons
  app.get("/api/add-ons", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const addOns = await storage.getAddOnsByPhotographer(req.user!.photographerId!);
      res.json(addOns);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/add-ons", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const addOnData = insertAddOnSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      const addOn = await storage.createAddOn(addOnData);
      res.status(201).json(addOn);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/add-ons/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify add-on belongs to this photographer
      const photographerAddOns = await storage.getAddOnsByPhotographer(req.user!.photographerId!);
      const existingAddOn = photographerAddOns.find(addon => addon.id === id);
      
      if (!existingAddOn) {
        return res.status(404).json({ message: "Add-on not found" });
      }

      const updates = insertAddOnSchema.partial().parse(req.body);
      const updatedAddOn = await storage.updateAddOn(id, updates);
      
      res.json(updatedAddOn);
    } catch (error) {
      console.error("Update add-on error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/add-ons/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify add-on belongs to this photographer
      const photographerAddOns = await storage.getAddOnsByPhotographer(req.user!.photographerId!);
      const existingAddOn = photographerAddOns.find(addon => addon.id === id);
      
      if (!existingAddOn) {
        return res.status(404).json({ message: "Add-on not found" });
      }

      await storage.deleteAddOn(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete add-on error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Lead Forms Routes
  app.get("/api/lead-forms", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const forms = await storage.getLeadFormsByPhotographer(req.user!.photographerId!);
      res.json(forms);
    } catch (error) {
      console.error("Get lead forms error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/lead-forms/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { id } = req.params;
      const form = await storage.getLeadFormById(id);
      
      if (!form) {
        return res.status(404).json({ message: "Lead form not found" });
      }

      // Verify ownership
      if (form.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      res.json(form);
    } catch (error) {
      console.error("Get lead form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/lead-forms", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const formData = insertLeadFormSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      const form = await storage.createLeadForm(formData);
      res.status(201).json(form);
    } catch (error: any) {
      console.error("Create lead form error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/lead-forms/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { id } = req.params;
      const form = await storage.getLeadFormById(id);
      
      if (!form) {
        return res.status(404).json({ message: "Lead form not found" });
      }

      // Verify ownership
      if (form.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Parse updates and exclude immutable fields to prevent tenant hopping
      const { photographerId, publicToken, submissionCount, ...allowedUpdates } = req.body;
      const updates = insertLeadFormSchema.partial().parse(allowedUpdates);
      const updatedForm = await storage.updateLeadForm(id, updates);
      
      res.json(updatedForm);
    } catch (error: any) {
      console.error("Update lead form error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/lead-forms/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { id } = req.params;
      const form = await storage.getLeadFormById(id);
      
      if (!form) {
        return res.status(404).json({ message: "Lead form not found" });
      }

      // Verify ownership
      if (form.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteLeadForm(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete lead form error:", error);
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

  // Smart Files Routes
  // GET /api/smart-files - Get all Smart Files for photographer
  app.get("/api/smart-files", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const smartFiles = await storage.getSmartFilesByPhotographer(req.user!.photographerId!);
      res.json(smartFiles);
    } catch (error) {
      console.error("Get smart files error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/smart-files - Create new Smart File
  app.post("/api/smart-files", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const smartFileData = insertSmartFileSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });
      const smartFile = await storage.createSmartFile(smartFileData);
      res.status(201).json(smartFile);
    } catch (error: any) {
      console.error("Create smart file error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid smart file data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/smart-files/:id - Get Smart File with pages
  app.get("/api/smart-files/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const smartFile = await storage.getSmartFile(req.params.id);
      
      if (!smartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Verify ownership
      if (smartFile.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      res.json(smartFile);
    } catch (error) {
      console.error("Get smart file error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/smart-files/:id - Update Smart File
  app.patch("/api/smart-files/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const smartFile = await storage.getSmartFile(req.params.id);
      
      if (!smartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Verify ownership
      if (smartFile.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      const updatedSmartFile = await storage.updateSmartFile(req.params.id, req.body);
      res.json(updatedSmartFile);
    } catch (error) {
      console.error("Update smart file error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/smart-files/:id - Delete Smart File
  app.delete("/api/smart-files/:id", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const smartFile = await storage.getSmartFile(req.params.id);
      
      if (!smartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Verify ownership
      if (smartFile.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Check if any project instances have payments or signatures
      const instances = await db.select()
        .from(projectSmartFiles)
        .where(eq(projectSmartFiles.smartFileId, req.params.id));

      const hasPaymentsOrSignatures = instances.some(instance => 
        instance.status === 'DEPOSIT_PAID' || 
        instance.status === 'PAID' || 
        instance.clientSignatureUrl !== null ||
        instance.photographerSignatureUrl !== null
      );

      if (hasPaymentsOrSignatures) {
        return res.status(400).json({ 
          message: "Cannot delete Smart File with active payments or signed contracts. This Smart File has been sent to clients and contains legally binding information.",
          code: "HAS_ACTIVE_CONTRACTS"
        });
      }

      await storage.deleteSmartFile(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete smart file error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/smart-files/:id/pages - Create new page
  app.post("/api/smart-files/:id/pages", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const smartFile = await storage.getSmartFile(req.params.id);
      
      if (!smartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Verify ownership
      if (smartFile.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      const pageData = insertSmartFilePageSchema.parse({
        ...req.body,
        smartFileId: req.params.id
      });
      
      const page = await storage.createSmartFilePage(pageData);
      res.status(201).json(page);
    } catch (error: any) {
      console.error("Create smart file page error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid page data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/smart-files/:id/pages/:pageId - Update page
  app.patch("/api/smart-files/:id/pages/:pageId", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const smartFile = await storage.getSmartFile(req.params.id);
      
      if (!smartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Verify ownership
      if (smartFile.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      const updatedPage = await storage.updateSmartFilePage(req.params.pageId, req.body);
      res.json(updatedPage);
    } catch (error) {
      console.error("Update smart file page error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/smart-files/:id/pages/:pageId - Delete page
  app.delete("/api/smart-files/:id/pages/:pageId", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const smartFile = await storage.getSmartFile(req.params.id);
      
      if (!smartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Verify ownership
      if (smartFile.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      await storage.deleteSmartFilePage(req.params.pageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete smart file page error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/smart-files/:id/pages/reorder - Reorder pages
  app.post("/api/smart-files/:id/pages/reorder", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const smartFile = await storage.getSmartFile(req.params.id);
      
      if (!smartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Verify ownership
      if (smartFile.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      const { pageOrders } = req.body;
      
      if (!Array.isArray(pageOrders)) {
        return res.status(400).json({ message: "pageOrders must be an array" });
      }

      await storage.reorderSmartFilePages(req.params.id, pageOrders);
      res.json({ success: true });
    } catch (error) {
      console.error("Reorder smart file pages error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/projects/:id/smart-files - Get Smart Files attached to project
  app.get("/api/projects/:id/smart-files", authenticateToken, async (req, res) => {
    try {
      const { id: projectId } = req.params;
      
      // Get the project to verify access
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Verify access - photographer or client portal
      const isPhotographer = req.user?.photographerId === project.photographerId;
      const isClient = req.user?.clientId === project.clientId;
      
      if (!isPhotographer && !isClient) {
        return res.status(404).json({ message: "Project not found" });
      }

      const projectSmartFiles = await storage.getProjectSmartFilesByProject(projectId);
      res.json(projectSmartFiles);
    } catch (error) {
      console.error("Get project smart files error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/projects/:projectId/smart-files - Attach Smart File to project
  app.post("/api/projects/:projectId/smart-files", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectId } = req.params;
      
      // Validate request body
      const bodySchema = z.object({
        smartFileId: z.string()
      });
      const { smartFileId } = bodySchema.parse(req.body);

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Verify Smart File ownership
      const smartFile = await storage.getSmartFile(smartFileId);
      if (!smartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }
      if (smartFile.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Attach Smart File to project
      const projectSmartFile = await storage.attachSmartFileToProject({
        projectId,
        smartFileId,
        photographerId: project.photographerId,
        clientId: project.clientId,
        smartFileName: smartFile.name,
        pagesSnapshot: smartFile.pages,
        token: nanoid(32),
        status: 'DRAFT'
      });

      // Log Smart File attachment to project history
      await storage.addProjectActivityLog({
        projectId,
        activityType: 'SMART_FILE_ATTACHED',
        action: 'ATTACHED',
        title: `Smart File attached: ${smartFile.name}`,
        description: `Smart File "${smartFile.name}" was attached to this project`,
        relatedId: projectSmartFile.id,
        relatedType: 'PROJECT_SMART_FILE'
      });

      res.status(201).json(projectSmartFile);
    } catch (error: any) {
      console.error("Attach smart file to project error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/projects/:projectId/smart-files/:projectSmartFileId/send - Send Smart File to client
  app.post("/api/projects/:projectId/smart-files/:projectSmartFileId/send", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectId, projectSmartFileId } = req.params;

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get ProjectSmartFile and verify it belongs to this project
      const projectSmartFiles = await storage.getProjectSmartFilesByProject(projectId);
      const projectSmartFile = projectSmartFiles.find(psf => psf.id === projectSmartFileId);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found for this project" });
      }

      // Check if Smart File has CONTRACT page requiring photographer signature
      const pagesSnapshot = projectSmartFile.pagesSnapshot || [];
      const contractPage = pagesSnapshot.find((page: any) => page.pageType === 'CONTRACT');
      
      if (contractPage && contractPage.content?.requirePhotographerSignature !== false) {
        if (!projectSmartFile.photographerSignatureUrl) {
          return res.status(400).json({ 
            message: "Photographer signature required",
            code: "PHOTOGRAPHER_SIGNATURE_REQUIRED",
            contractPageId: contractPage.id
          });
        }
      }

      // Update status to SENT and set sentAt date
      const updatedProjectSmartFile = await storage.updateProjectSmartFile(projectSmartFileId, {
        status: 'SENT',
        sentAt: new Date()
      });

      // Log Smart File sent to project history
      await storage.addProjectActivityLog({
        projectId,
        activityType: 'SMART_FILE_SENT',
        action: 'SENT',
        title: `Smart File sent: ${projectSmartFile.smartFileName}`,
        description: `Smart File "${projectSmartFile.smartFileName}" was sent to client`,
        relatedId: projectSmartFileId,
        relatedType: 'PROJECT_SMART_FILE'
      });

      // Send email to client with link to view Smart File
      try {
        const [contact, photographer, smartFile] = await Promise.all([
          storage.getContact(project.clientId),
          storage.getPhotographer(project.photographerId),
          storage.getSmartFile(projectSmartFile.smartFileId)
        ]);

        if (contact && contact.email && contact.emailOptIn && photographer && smartFile) {
          const smartFileUrl = `${process.env.VITE_APP_URL || 'https://thephotocrm.com'}/smart-file/${updatedProjectSmartFile.token}`;
          
          await sendEmail({
            photographerId: photographer.id,
            clientId: contact.id,
            projectId: project.id,
            to: contact.email,
            subject: `${photographer.businessName} sent you a proposal`,
            html: `
              <h2>You have a new proposal!</h2>
              <p>Hi ${contact.firstName},</p>
              <p>${photographer.businessName} has sent you a proposal titled "${smartFile.name}".</p>
              <p>Review your proposal, select your package and add-ons, and proceed to payment:</p>
              <p><a href="${smartFileUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Proposal</a></p>
              <p>If you have any questions, reply to this email.</p>
              <p>Best regards,<br>${photographer.businessName}</p>
            `,
            text: `You have a new proposal from ${photographer.businessName}!\n\nProposal: ${smartFile.name}\n\nView and select your package at: ${smartFileUrl}\n\nIf you have any questions, reply to this email.\n\nBest regards,\n${photographer.businessName}`
          });
        }
      } catch (emailError) {
        console.error("Error sending Smart File email:", emailError);
        // Don't fail the request if email fails
      }

      res.json({ 
        success: true, 
        token: updatedProjectSmartFile.token 
      });
    } catch (error) {
      console.error("Send smart file error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/projects/:projectId/smart-files/:projectSmartFileId/photographer-sign - Photographer signs contract
  app.post("/api/projects/:projectId/smart-files/:projectSmartFileId/photographer-sign", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectId, projectSmartFileId } = req.params;
      const { photographerSignatureUrl } = req.body;

      if (!photographerSignatureUrl) {
        return res.status(400).json({ message: "Signature is required" });
      }

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get ProjectSmartFile and verify it belongs to this project
      const projectSmartFiles = await storage.getProjectSmartFilesByProject(projectId);
      const projectSmartFile = projectSmartFiles.find(psf => psf.id === projectSmartFileId);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found for this project" });
      }

      // Update with photographer signature
      const updated = await storage.updateProjectSmartFile(projectSmartFileId, {
        photographerSignatureUrl,
        photographerSignedAt: new Date()
      });

      res.json(updated);
    } catch (error) {
      console.error("Photographer sign contract error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/projects/:projectId/smart-files/:projectSmartFileId - Remove Smart File from project
  app.delete("/api/projects/:projectId/smart-files/:projectSmartFileId", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectId, projectSmartFileId } = req.params;

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get ProjectSmartFile and verify it belongs to this project
      const projectSmartFiles = await storage.getProjectSmartFilesByProject(projectId);
      const projectSmartFile = projectSmartFiles.find(psf => psf.id === projectSmartFileId);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found for this project" });
      }

      // Prevent deletion if payments have been made or contract has been signed
      if (projectSmartFile.status === 'DEPOSIT_PAID' || projectSmartFile.status === 'PAID') {
        return res.status(400).json({ 
          message: "Cannot delete Smart File with payment received. This is a legally binding contract.",
          code: "HAS_PAYMENT"
        });
      }

      if (projectSmartFile.clientSignatureUrl || projectSmartFile.photographerSignatureUrl) {
        return res.status(400).json({ 
          message: "Cannot delete signed contract. This is a legally binding document.",
          code: "HAS_SIGNATURE"
        });
      }

      // Delete the project smart file attachment
      await storage.deleteProjectSmartFile(projectSmartFileId);

      res.json({ success: true });
    } catch (error) {
      console.error("Remove smart file from project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/projects/:projectId/smart-files/:projectSmartFileId/send-sms - Send Smart File link via SMS
  app.post("/api/projects/:projectId/smart-files/:projectSmartFileId/send-sms", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectId, projectSmartFileId } = req.params;

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get ProjectSmartFile and verify it belongs to this project
      const projectSmartFiles = await storage.getProjectSmartFilesByProject(projectId);
      const projectSmartFile = projectSmartFiles.find(psf => psf.id === projectSmartFileId);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found for this project" });
      }

      // Get client and photographer info
      const [contact, photographer] = await Promise.all([
        storage.getContact(project.clientId),
        storage.getPhotographer(project.photographerId)
      ]);

      if (!client || !contact.phone) {
        return res.status(400).json({ message: "Client phone number not available" });
      }

      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Build Smart File URL
      const smartFileUrl = `${process.env.VITE_APP_URL || 'https://thephotocrm.com'}/smart-file/${projectSmartFile.token}`;
      
      // Send SMS
      const smsBody = `Hi ${contact.firstName}! ${photographer.businessName} sent you a proposal. View it here: ${smartFileUrl}`;
      
      const result = await sendSms({
        to: contact.phone,
        body: smsBody
      });

      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to send SMS" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Send smart file SMS error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/projects/:projectId/send-smart-file - Create and send a smart file from template
  app.post("/api/projects/:projectId/send-smart-file", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { templateId, method } = req.body;

      if (!templateId || !method) {
        return res.status(400).json({ message: "Template ID and delivery method are required" });
      }

      if (method !== 'email' && method !== 'sms') {
        return res.status(400).json({ message: "Invalid delivery method. Must be 'email' or 'sms'" });
      }

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get template and verify ownership
      const template = await storage.getSmartFile(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (template.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Get client and photographer info
      const [contact, photographer] = await Promise.all([
        storage.getContact(project.clientId),
        storage.getPhotographer(project.photographerId)
      ]);

      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Check delivery method requirements
      if (method === 'sms' && !contact.phone) {
        return res.status(400).json({ message: "Contact phone number required for SMS delivery" });
      }

      if (method === 'email' && !contact.email) {
        return res.status(400).json({ message: "Contact email required for email delivery" });
      }

      // Create project smart file from template
      const { nanoid } = await import("nanoid");
      const token = nanoid(32);

      const projectSmartFile = await storage.createProjectSmartFile({
        projectId,
        smartFileId: templateId,
        photographerId: photographer.id,
        clientId: contact.id,
        token,
        status: 'SENT',
        sentAt: new Date(),
        pagesSnapshot: template.pages || []
      });

      // Build Smart File URL
      const smartFileUrl = `${process.env.VITE_APP_URL || 'https://thephotocrm.com'}/smart-file/${token}`;
      
      // Send via selected method
      if (method === 'email') {
        const { sendGmailEmail } = await import("./services/gmail");
        const emailSubject = `${template.name} from ${photographer.businessName}`;
        const emailBody = `Hi ${contact.firstName},\n\n${photographer.photographerName || photographer.businessName} has sent you a ${template.name}.\n\nView it here: ${smartFileUrl}\n\nBest regards,\n${photographer.businessName}`;

        await sendGmailEmail({
          photographerId: photographer.id,
          to: contact.email,
          subject: emailSubject,
          textBody: emailBody
        });

        // Log activity
        await storage.createProjectActivity({
          projectId,
          photographerId: photographer.id,
          title: `${template.name} Sent via Email`,
          description: `Sent ${template.name} to ${contact.firstName} ${contact.lastName} at ${contact.email}`
        });
      } else {
        // Send SMS
        const { sendSms } = await import("./services/twilio");
        const smsBody = `Hi ${contact.firstName}! ${photographer.photographerName || photographer.businessName} sent you a ${template.name}. View it here: ${smartFileUrl}`;

        const result = await sendSms({
          to: contact.phone!,
          body: smsBody
        });

        if (!result.success) {
          return res.status(500).json({ message: result.error || "Failed to send SMS" });
        }

        // Log activity
        await storage.createProjectActivity({
          projectId,
          photographerId: photographer.id,
          title: `${template.name} Sent via SMS`,
          description: `Sent ${template.name} to ${contact.firstName} ${contact.lastName} at ${contact.phone}`
        });
      }

      res.json({ 
        success: true,
        projectSmartFile
      });
    } catch (error: any) {
      console.error("Send smart file error:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  // GET /api/public/smart-files/:token - Get Smart File by token for client viewing (PUBLIC ROUTE)
  app.get("/api/public/smart-files/:token", async (req, res) => {
    try {
      const { token } = req.params;

      // Find projectSmartFile by token
      const projectSmartFile = await storage.getProjectSmartFileByToken(token);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Update status to VIEWED and set viewedAt if this is the first view
      if (projectSmartFile.status === 'SENT' && !projectSmartFile.viewedAt) {
        await storage.updateProjectSmartFile(projectSmartFile.id, {
          status: 'VIEWED',
          viewedAt: new Date()
        });
        projectSmartFile.status = 'VIEWED';
        projectSmartFile.viewedAt = new Date();
      }

      // Fetch the Smart File with pages
      const smartFile = await storage.getSmartFile(projectSmartFile.smartFileId);
      
      if (!smartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Fetch related data
      const project = await storage.getProject(projectSmartFile.projectId);
      const contact = await storage.getContact(projectSmartFile.clientId);
      const photographer = await storage.getPhotographer(projectSmartFile.photographerId);

      if (!project || !contact || !photographer) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Return enriched response
      res.json({
        projectSmartFile,
        smartFile,
        project: {
          id: project.id,
          title: project.title,
          projectType: project.projectType,
          eventDate: project.eventDate
        },
        contact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          address: contact.address
        },
        photographer: {
          id: photographer.id,
          businessName: photographer.businessName,
          email: photographer.emailFromAddr,
          phone: photographer.phone
        }
      });
    } catch (error) {
      console.error("Get public smart file error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/public/smart-files/:token/packages - Get fresh package data for Smart File (PUBLIC ROUTE)
  app.get("/api/public/smart-files/:token/packages", async (req, res) => {
    try {
      const { token } = req.params;

      // Find projectSmartFile by token
      const projectSmartFile = await storage.getProjectSmartFileByToken(token);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Get all packages for this photographer
      const packages = await storage.getPackagesByPhotographer(projectSmartFile.photographerId);

      res.json(packages);
    } catch (error) {
      console.error("Get smart file packages error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/public/smart-files/:token/add-ons - Get fresh add-on data for Smart File (PUBLIC ROUTE)
  app.get("/api/public/smart-files/:token/add-ons", async (req, res) => {
    try {
      const { token } = req.params;

      // Find projectSmartFile by token
      const projectSmartFile = await storage.getProjectSmartFileByToken(token);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Get all add-ons for this photographer
      const addOns = await storage.getAddOnsByPhotographer(projectSmartFile.photographerId);

      res.json(addOns);
    } catch (error) {
      console.error("Get smart file add-ons error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/public/smart-files/:token/accept - Accept Smart File and store selections (PUBLIC ROUTE)
  app.patch("/api/public/smart-files/:token/accept", async (req, res) => {
    try {
      const { token } = req.params;
      const { selectedPackages, selectedAddOns, subtotalCents, totalCents, depositCents } = req.body;

      // Find projectSmartFile by token
      const projectSmartFile = await storage.getProjectSmartFileByToken(token);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Prevent selection changes after proposal is already accepted
      // Selections lock after accept (when saved to DB) to preserve contract integrity
      if (projectSmartFile.status === 'ACCEPTED') {
        return res.status(400).json({ 
          message: "Cannot change selections after accepting the proposal. Selections are locked to preserve contract integrity." 
        });
      }

      // Update status to ACCEPTED and store selections
      const updated = await storage.updateProjectSmartFile(projectSmartFile.id, {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        selectedPackages,
        selectedAddOns,
        subtotalCents,
        totalCents,
        depositCents
      });

      // Send notification to photographer
      try {
        const [project, contact, photographer, smartFile] = await Promise.all([
          storage.getProject(projectSmartFile.projectId),
          storage.getContact(projectSmartFile.clientId),
          storage.getPhotographer(projectSmartFile.photographerId),
          storage.getSmartFile(projectSmartFile.smartFileId)
        ]);

        if (photographer && client && project && smartFile) {
          // Get photographer's user email
          const [photographerUser] = await db.select()
            .from(users)
            .where(eq(users.photographerId, photographer.id))
            .limit(1);

          if (photographerUser && photographerUser.email) {
            const packageName = selectedPackages && selectedPackages.length > 0 
              ? (Array.isArray(selectedPackages) ? selectedPackages[0]?.name : JSON.parse(selectedPackages)?.[0]?.name)
              : 'Package';

            await sendEmail({
              photographerId: photographer.id,
              clientId: contact.id,
              projectId: project.id,
              to: photographerUser.email,
              subject: `${contact.firstName} ${contact.lastName} accepted your proposal!`,
              html: `
                <h2>Great news! Your proposal was accepted!</h2>
                <p>Hi ${photographer.businessName},</p>
                <p>${contact.firstName} ${contact.lastName} has accepted your proposal "${smartFile.name}".</p>
                <p><strong>Selected Package:</strong> ${packageName}</p>
                <p><strong>Total Amount:</strong> $${((totalCents || 0) / 100).toFixed(2)}</p>
                ${depositCents ? `<p><strong>Deposit Amount:</strong> $${(depositCents / 100).toFixed(2)}</p>` : ''}
                <p>Your client will proceed to payment shortly.</p>
                <p>View project details in your dashboard.</p>
                <p>Best regards,<br>Your CRM System</p>
              `,
              text: `Great news! Your proposal was accepted!\n\n${contact.firstName} ${contact.lastName} has accepted your proposal "${smartFile.name}".\n\nSelected Package: ${packageName}\nTotal: $${((totalCents || 0) / 100).toFixed(2)}${depositCents ? `\nDeposit: $${(depositCents / 100).toFixed(2)}` : ''}\n\nYour client will proceed to payment shortly.\n\nView project details in your dashboard.`
            });
          }
        }
      } catch (emailError) {
        console.error("Error sending acceptance notification:", emailError);
        // Don't fail the request if email fails
      }

      res.json(updated);
    } catch (error) {
      console.error("Accept smart file error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/public/smart-files/:token/sign - Save client signature (PUBLIC ROUTE)
  app.patch("/api/public/smart-files/:token/sign", async (req, res) => {
    try {
      const { token } = req.params;
      const { clientSignatureUrl, contractHtml } = req.body;

      if (!clientSignatureUrl) {
        return res.status(400).json({ message: "Signature is required" });
      }

      const projectSmartFile = await storage.getProjectSmartFileByToken(token);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Capture IP and user agent for legal audit trail
      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Generate PDF from contract HTML for legal record
      let contractPdfUrl: string | undefined;
      if (contractHtml) {
        try {
          const { generateContractPDF, bufferToDataURL } = await import('./utils/pdf-generator');
          const pdfBuffer = await generateContractPDF(contractHtml);
          contractPdfUrl = bufferToDataURL(pdfBuffer);
        } catch (error) {
          console.error('PDF generation failed:', error);
          // Continue without PDF - we still have the HTML snapshot
        }
      }

      // Update with client signature and legal metadata
      const updated = await storage.updateProjectSmartFile(projectSmartFile.id, {
        clientSignatureUrl,
        clientSignedAt: new Date(),
        clientSignedIp: clientIp,
        clientSignedUserAgent: userAgent,
        contractSnapshotHtml: contractHtml, // Store exact HTML at signature time
        contractPdfUrl // Store generated PDF for easy viewing/download
      });

      // Log contract signature to project history
      await storage.addProjectActivityLog({
        projectId: projectSmartFile.projectId,
        activityType: 'SMART_FILE_SIGNED',
        action: 'SIGNED',
        title: `Contract signed: ${projectSmartFile.smartFileName}`,
        description: `Client signed the contract for "${projectSmartFile.smartFileName}"`,
        relatedId: projectSmartFile.id,
        relatedType: 'PROJECT_SMART_FILE',
        metadata: JSON.stringify({
          clientIp,
          userAgent,
          signedAt: new Date().toISOString()
        })
      });

      // Send contract signature confirmation email to client
      try {
        const [project, client] = await Promise.all([
          storage.getProject(projectSmartFile.projectId),
          storage.getContact(projectSmartFile.clientId)
        ]);

        if (client?.email) {
          const { sendEmail } = await import('./services/email');
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Contract Signed Successfully</h2>
              <p>Hi ${contact.firstName},</p>
              <p>Thank you for signing the contract for <strong>${projectSmartFile.smartFileName}</strong>.</p>
              <p>Your signature has been recorded and both parties have a legally binding agreement.</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Contract:</strong> ${projectSmartFile.smartFileName}</p>
                <p style="margin: 5px 0;"><strong>Signed on:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                ${contractPdfUrl ? '<p style="margin: 5px 0;">A PDF copy of the signed contract has been generated for your records.</p>' : ''}
              </div>
              <p>If you have any questions, please don't hesitate to reach out.</p>
              <p>Best regards,<br>${project?.photographerName || 'Your photographer'}</p>
            </div>
          `;

          await sendEmail({
            to: contact.email,
            subject: `Contract Signed: ${projectSmartFile.smartFileName}`,
            html: emailHtml,
            photographerId: projectSmartFile.photographerId,
            clientId: contact.id,
            projectId: projectSmartFile.projectId,
            source: 'MANUAL'
          });
        }
      } catch (emailError) {
        console.error('Failed to send contract signature email:', emailError);
        // Don't fail the request if email fails
      }

      res.json(updated);
    } catch (error) {
      console.error("Save signature error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/public/smart-files/:token/form-answers - Save form answers (PUBLIC ROUTE)
  app.patch("/api/public/smart-files/:token/form-answers", async (req, res) => {
    try {
      const { token } = req.params;
      const { formAnswers } = req.body;

      if (!formAnswers || typeof formAnswers !== 'object') {
        return res.status(400).json({ message: "Form answers are required" });
      }

      const projectSmartFile = await storage.getProjectSmartFileByToken(token);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Update form answers
      const updated = await storage.updateProjectSmartFile(projectSmartFile.id, {
        formAnswers: formAnswers
      });

      // Log activity
      await storage.createProjectHistory({
        projectId: projectSmartFile.projectId,
        userId: null,
        action: 'FORM_SUBMITTED',
        metadata: {
          smartFileId: projectSmartFile.smartFileId,
          smartFileName: projectSmartFile.smartFileName,
          answersCount: Object.keys(formAnswers).length
        }
      });

      res.json(updated);
    } catch (error) {
      console.error("Save form answers error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/public/smart-files/:token/create-checkout - Create Stripe checkout session (PUBLIC ROUTE)
  app.post("/api/public/smart-files/:token/create-checkout", async (req, res) => {
    try {
      const { token } = req.params;
      const { paymentType = 'DEPOSIT' } = req.body; // DEPOSIT, FULL, BALANCE

      // Get Smart File data
      const projectSmartFile = await storage.getProjectSmartFileByToken(token);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Verify Smart File has been accepted
      if (projectSmartFile.status !== 'ACCEPTED' && projectSmartFile.status !== 'DEPOSIT_PAID') {
        return res.status(400).json({ message: "Smart File must be accepted before checkout" });
      }

      // Get related data
      const [smartFile, project] = await Promise.all([
        storage.getSmartFile(projectSmartFile.smartFileId),
        storage.getProject(projectSmartFile.projectId)
      ]);

      if (!smartFile || !project) {
        return res.status(404).json({ message: "Smart File or project not found" });
      }

      // Get photographer and verify Stripe Connect account
      const photographer = await storage.getPhotographer(project.photographerId);
      
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      if (!photographer.stripeConnectAccountId) {
        return res.status(400).json({ 
          message: "Photographer has not connected their Stripe account" 
        });
      }

      // Determine payment amount based on type
      let paymentAmountCents = 0;
      
      if (paymentType === 'FULL') {
        // Pay full amount
        paymentAmountCents = projectSmartFile.totalCents || 0;
      } else if (paymentType === 'BALANCE') {
        // Pay remaining balance
        paymentAmountCents = projectSmartFile.balanceDueCents || 0;
      } else {
        // Pay deposit (default)
        paymentAmountCents = projectSmartFile.depositCents || 0;
      }
      
      if (paymentAmountCents <= 0) {
        return res.status(400).json({ 
          message: "Invalid payment amount." 
        });
      }

      // Calculate platform fee (5% as per system design)
      const platformFeePercent = 5;
      const platformFeeCents = calculatePlatformFee(paymentAmountCents, platformFeePercent);

      // Build success and cancel URLs
      const baseUrl = process.env.VITE_APP_URL || `${req.protocol}://${req.get('host')}`;
      const successUrl = `${baseUrl}/smart-file/${token}/success`;
      const cancelUrl = `${baseUrl}/smart-file/${token}`;

      // Create Stripe checkout session
      const checkoutUrl = await createConnectCheckoutSession({
        amountCents: paymentAmountCents,
        connectedAccountId: photographer.stripeConnectAccountId,
        platformFeeCents,
        successUrl,
        cancelUrl,
        productName: `${project.projectType} - ${smartFile.name}${paymentType === 'BALANCE' ? ' (Balance)' : paymentType === 'DEPOSIT' ? ' (Deposit)' : ''}`,
        metadata: {
          projectSmartFileId: projectSmartFile.id,
          projectId: project.id,
          smartFileId: smartFile.id,
          photographerId: photographer.id,
          paymentType,
          token
        }
      });

      res.json({ checkoutUrl });
    } catch (error) {
      console.error("Create checkout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/public/smart-files/:token/create-payment-intent - Create Stripe PaymentIntent for embedded payments (PUBLIC ROUTE)
  app.post("/api/public/smart-files/:token/create-payment-intent", async (req, res) => {
    try {
      const { token } = req.params;
      const { paymentType = 'DEPOSIT', tipCents = 0 } = req.body; // DEPOSIT, FULL, BALANCE

      // Get Smart File data
      const projectSmartFile = await storage.getProjectSmartFileByToken(token);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Verify Smart File has been accepted
      if (projectSmartFile.status !== 'ACCEPTED' && projectSmartFile.status !== 'DEPOSIT_PAID') {
        return res.status(400).json({ message: "Smart File must be accepted before payment" });
      }

      // Get related data
      const [smartFile, project] = await Promise.all([
        storage.getSmartFile(projectSmartFile.smartFileId),
        storage.getProject(projectSmartFile.projectId)
      ]);

      if (!smartFile || !project) {
        return res.status(404).json({ message: "Smart File or project not found" });
      }

      // Get photographer and verify Stripe Connect account
      const photographer = await storage.getPhotographer(project.photographerId);
      
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      if (!photographer.stripeConnectAccountId) {
        return res.status(400).json({ 
          message: "Photographer has not connected their Stripe account" 
        });
      }

      // Determine payment amount based on type
      let paymentAmountCents = 0;
      
      if (paymentType === 'FULL') {
        // Pay full amount + tip
        paymentAmountCents = (projectSmartFile.totalCents || 0) + tipCents;
      } else if (paymentType === 'BALANCE') {
        // Pay remaining balance + tip
        paymentAmountCents = (projectSmartFile.balanceDueCents || 0) + tipCents;
      } else {
        // Pay deposit + tip (default)
        paymentAmountCents = (projectSmartFile.depositCents || 0) + tipCents;
      }
      
      if (paymentAmountCents <= 0) {
        return res.status(400).json({ 
          message: "Invalid payment amount." 
        });
      }

      // Calculate platform fee (5% as per system design)
      const platformFeePercent = photographer.platformFeePercent || 500; // stored as basis points (500 = 5%)
      const platformFeeCents = calculatePlatformFee(paymentAmountCents, platformFeePercent / 100);

      // Create Stripe PaymentIntent
      const clientSecret = await createConnectPaymentIntent({
        amountCents: paymentAmountCents,
        connectedAccountId: photographer.stripeConnectAccountId,
        platformFeeCents,
        metadata: {
          projectSmartFileId: projectSmartFile.id,
          projectId: project.id,
          smartFileId: smartFile.id,
          photographerId: photographer.id,
          paymentType,
          tipCents: tipCents.toString(),
          token
        }
      });

      res.json({ 
        clientSecret,
        amount: paymentAmountCents,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY 
      });
    } catch (error) {
      console.error("Create payment intent error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/public/smart-files/:token/confirm-payment - Confirm payment and update Smart File (PUBLIC ROUTE)
  app.post("/api/public/smart-files/:token/confirm-payment", async (req, res) => {
    try {
      const { token } = req.params;
      const { paymentIntentId, paymentType, tipCents = 0 } = req.body;

      // Get Smart File data
      const projectSmartFile = await storage.getProjectSmartFileByToken(token);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment has not succeeded" });
      }

      const amountPaidCents = paymentIntent.amount;
      const currentAmountPaid = projectSmartFile.amountPaidCents || 0;
      const newAmountPaid = currentAmountPaid + amountPaidCents;

      // Determine new status and balance
      let newStatus = projectSmartFile.status;
      let newBalanceDue = projectSmartFile.balanceDueCents || 0;

      if (paymentType === 'DEPOSIT') {
        newStatus = 'DEPOSIT_PAID';
        newBalanceDue = (projectSmartFile.totalCents || 0) - amountPaidCents;
      } else if (paymentType === 'FULL' || paymentType === 'BALANCE') {
        newStatus = 'PAID';
        newBalanceDue = 0;
      }

      // Update Smart File with payment info including tip
      const updated = await storage.updateProjectSmartFile(projectSmartFile.id, {
        status: newStatus,
        stripePaymentIntentId: paymentIntentId,
        paymentType,
        amountPaidCents: newAmountPaid,
        balanceDueCents: newBalanceDue,
        tipCents,
        paidAt: new Date()
      });

      // Log payment to project history
      const paymentAmount = amountPaidCents / 100;
      const activityTitle = paymentType === 'DEPOSIT' 
        ? `Deposit payment received: $${paymentAmount.toFixed(2)}`
        : paymentType === 'BALANCE'
        ? `Balance payment received: $${paymentAmount.toFixed(2)}`
        : `Full payment received: $${paymentAmount.toFixed(2)}`;

      await storage.addProjectActivityLog({
        projectId: projectSmartFile.projectId,
        activityType: 'PAYMENT_RECEIVED',
        action: 'RECEIVED',
        title: activityTitle,
        description: `Payment for "${projectSmartFile.smartFileName}" - ${paymentType.toLowerCase()} payment`,
        relatedId: projectSmartFile.id,
        relatedType: 'PROJECT_SMART_FILE',
        metadata: JSON.stringify({
          paymentType,
          amountCents: amountPaidCents,
          tipCents,
          totalAmountPaidCents: newAmountPaid,
          balanceDueCents: newBalanceDue,
          paymentIntentId
        })
      });

      // Auto-create gallery if deposit was paid and gallery platform is configured
      if (paymentType === 'DEPOSIT' && newStatus === 'DEPOSIT_PAID') {
        try {
          const photographer = await storage.getPhotographer(projectSmartFile.photographerId);
          
          if (photographer?.galleryPlatform && !projectSmartFile.galleryUrl) {
            console.log(`Auto-creating gallery for project ${projectSmartFile.projectId}`);
            const { galleryService } = await import('./services/gallery');
            await galleryService.createGallery(projectSmartFile.projectId, projectSmartFile.photographerId);
          }
        } catch (galleryError) {
          console.error('Failed to auto-create gallery:', galleryError);
          // Don't fail the payment if gallery creation fails
        }
      }

      // Send payment receipt email to client
      try {
        const [project, client] = await Promise.all([
          storage.getProject(projectSmartFile.projectId),
          storage.getContact(projectSmartFile.clientId)
        ]);

        if (client?.email) {
          const { sendEmail } = await import('./services/email');
          
          const tipAmount = tipCents ? tipCents / 100 : 0;
          const totalWithTip = paymentAmount + tipAmount;
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Payment Receipt</h2>
              <p>Hi ${contact.firstName},</p>
              <p>Thank you for your payment! We've received your ${paymentType.toLowerCase()} payment for <strong>${projectSmartFile.smartFileName}</strong>.</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Contract:</strong> ${projectSmartFile.smartFileName}</p>
                <p style="margin: 5px 0;"><strong>Payment Type:</strong> ${paymentType === 'DEPOSIT' ? 'Deposit' : paymentType === 'BALANCE' ? 'Balance' : 'Full Payment'}</p>
                <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $${paymentAmount.toFixed(2)}</p>
                ${tipCents > 0 ? `<p style="margin: 5px 0;"><strong>Tip:</strong> $${tipAmount.toFixed(2)}</p>` : ''}
                ${tipCents > 0 ? `<p style="margin: 5px 0;"><strong>Total Charged:</strong> $${totalWithTip.toFixed(2)}</p>` : ''}
                <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${paymentIntentId}</p>
                ${newBalanceDue > 0 ? `<p style="margin: 10px 0 5px 0; color: #dc2626;"><strong>Balance Remaining:</strong> $${(newBalanceDue / 100).toFixed(2)}</p>` : '<p style="margin: 10px 0 5px 0; color: #16a34a;"><strong>Status:</strong> Paid in Full</p>'}
              </div>
              <p>This email serves as your receipt. Please keep it for your records.</p>
              <p>Thank you for your business!</p>
              <p>Best regards,<br>${project?.photographerName || 'Your photographer'}</p>
            </div>
          `;

          await sendEmail({
            to: contact.email,
            subject: `Payment Receipt - ${projectSmartFile.smartFileName}`,
            html: emailHtml,
            photographerId: projectSmartFile.photographerId,
            clientId: contact.id,
            projectId: projectSmartFile.projectId,
            source: 'MANUAL'
          });
        }
      } catch (emailError) {
        console.error('Failed to send payment receipt email:', emailError);
        // Don't fail the request if email fails
      }

      res.json({ 
        success: true, 
        status: newStatus,
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue
      });
    } catch (error) {
      console.error("Confirm payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/public/smart-files/:token/booking - Create booking from Smart File (PUBLIC ROUTE)
  app.post("/api/public/smart-files/:token/booking", async (req, res) => {
    try {
      const { token } = req.params;
      const { date, time, durationMinutes } = req.body;

      if (!date || !time) {
        return res.status(400).json({ message: "Date and time are required" });
      }

      // Get Smart File data
      const projectSmartFile = await storage.getProjectSmartFileByToken(token);
      
      if (!projectSmartFile) {
        return res.status(404).json({ message: "Smart File not found" });
      }

      // Get project and client data
      const [project, client] = await Promise.all([
        storage.getProject(projectSmartFile.projectId),
        storage.getContact(projectSmartFile.clientId)
      ]);

      if (!project || !client) {
        return res.status(404).json({ message: "Project or client not found" });
      }

      // Parse date and time to create startAt timestamp
      const bookingDate = new Date(date);
      const [hours, minutes] = time.split(':').map(Number);
      bookingDate.setHours(hours, minutes, 0, 0);

      // Calculate endAt based on duration
      const duration = durationMinutes || 60; // Default to 60 minutes
      const endAt = new Date(bookingDate.getTime() + duration * 60000);

      // Create booking
      const booking = await storage.createBooking({
        photographerId: project.photographerId,
        projectId: project.id,
        title: `${projectSmartFile.smartFileName} - Appointment`,
        description: `Booking from Smart File: ${projectSmartFile.smartFileName}`,
        startAt: bookingDate,
        endAt,
        status: 'CONFIRMED',
        bookingType: project.projectType || 'CONSULTATION',
        clientEmail: contact.email || undefined,
        clientPhone: contact.phone || undefined,
        clientName: `${contact.firstName} ${contact.lastName}`
      });

      // Create Google Calendar event (if photographer has Google Calendar connected)
      try {
        const { createBookingCalendarEvent } = await import('./services/calendar');
        const calendarResult = await createBookingCalendarEvent(project.photographerId, {
          title: `${projectSmartFile.smartFileName} - ${contact.firstName} ${contact.lastName}`,
          description: `Client: ${contact.firstName} ${contact.lastName}\nProject: ${project.title}\nSmart File: ${projectSmartFile.smartFileName}`,
          startTime: bookingDate,
          endTime: endAt,
          clientEmail: contact.email,
          clientName: `${contact.firstName} ${contact.lastName}`
        });

        if (calendarResult.success && calendarResult.eventId && calendarResult.meetLink) {
          // Update booking with Google Calendar details
          await storage.updateBooking(booking.id, {
            googleCalendarEventId: calendarResult.eventId,
            googleMeetLink: calendarResult.meetLink
          });
        }
      } catch (calendarError) {
        console.error('Failed to create Google Calendar event:', calendarError);
        // Don't fail the booking if calendar creation fails
      }

      // Log booking to project history
      await storage.addProjectActivityLog({
        projectId: project.id,
        activityType: 'APPOINTMENT_BOOKED',
        action: 'BOOKED',
        title: 'Appointment booked',
        description: `Client booked appointment for ${bookingDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        })} at ${new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`,
        relatedId: booking.id,
        relatedType: 'BOOKING',
        metadata: JSON.stringify({
          bookingId: booking.id,
          startAt: bookingDate.toISOString(),
          endAt: endAt.toISOString(),
          durationMinutes: duration
        })
      });

      // Send confirmation email to client
      try {
        if (contact.email) {
          const { sendEmail } = await import('./services/email');
          const photographer = await storage.getPhotographer(project.photographerId);
          
          const formattedDate = bookingDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          });
          
          const formattedTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          // Get updated booking with Google Meet link if available
          const updatedBooking = await storage.getBooking(booking.id);
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Appointment Confirmed!</h2>
              <p>Hi ${contact.firstName},</p>
              <p>Your appointment has been successfully scheduled.</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Appointment Details</h3>
                <p style="margin: 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>Time:</strong> ${formattedTime}</p>
                <p style="margin: 8px 0;"><strong>Duration:</strong> ${duration} minutes</p>
                <p style="margin: 8px 0;"><strong>Project:</strong> ${project.title}</p>
                ${updatedBooking?.googleMeetLink ? `
                  <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;">
                    <p style="margin: 8px 0;"><strong>Google Meet Link:</strong></p>
                    <a href="${updatedBooking.googleMeetLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 8px;">
                      Join Video Call
                    </a>
                  </div>
                ` : ''}
              </div>
              <p>We look forward to meeting with you!</p>
              <p>Best regards,<br>${photographer?.businessName || 'Your photographer'}</p>
            </div>
          `;

          await sendEmail({
            to: contact.email,
            subject: `Appointment Confirmed - ${formattedDate}`,
            html: emailHtml,
            photographerId: project.photographerId,
            clientId: contact.id,
            projectId: project.id,
            source: 'MANUAL'
          });
        }
      } catch (emailError) {
        console.error('Failed to send booking confirmation email:', emailError);
        // Don't fail the booking if email fails
      }

      res.json({ 
        success: true,
        booking: {
          id: booking.id,
          startAt: booking.startAt,
          endAt: booking.endAt,
          status: booking.status
        }
      });
    } catch (error) {
      console.error("Create booking error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Automations
  app.get("/api/automations", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.post("/api/automations", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  // AI-powered automation extraction (preview only)
  app.post("/api/automations/extract-with-ai", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { description } = req.body;
      const photographerId = req.user!.photographerId!;

      if (!description || typeof description !== 'string') {
        return res.status(400).json({ message: "Description is required" });
      }

      // Extract automation parameters using AI
      const { extractAutomationFromDescription } = await import("./services/chatbot");
      const extracted = await extractAutomationFromDescription(description, photographerId);

      // Get stages for display
      const stages = await storage.getStagesByPhotographer(photographerId);
      
      // Return extracted data for user confirmation
      res.json({
        extracted,
        availableStages: stages
      });
    } catch (error: any) {
      console.error('Extract automation with AI error:', error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  // Conversational AI automation builder
  app.post("/api/automations/chat", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { message, conversationHistory, currentState } = req.body;
      const photographerId = req.user!.photographerId!;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      console.log(`📨 Chat message received: "${message.substring(0, 50)}..." (photographer: ${photographerId})`);

      const { conversationalAutomationBuilder } = await import("./services/chatbot");
      let newState = await conversationalAutomationBuilder(
        message,
        conversationHistory || [],
        photographerId,
        currentState
      );
      
      console.log(`✅ Chat response ready, status: ${newState.status}`);

      // 🔄 MULTI-AUTOMATION QUEUE ADVANCEMENT
      // If user confirmed an automation in multi-automation mode, advance to next
      if (newState.status === "confirming" && 
          newState.automationQueue && 
          newState.automationQueue.length > 1 &&
          newState.currentAutomationIndex !== null &&
          newState.totalAutomations) {
        
        const currentIndex = newState.currentAutomationIndex;
        
        // Save the current automation details to the queue
        if (newState.collectedInfo && currentIndex < newState.automationQueue.length) {
          newState.automationQueue[currentIndex] = newState.collectedInfo;
          console.log(`💾 Saved automation ${currentIndex + 1} to queue`);
        }
        
        // Check if user confirmed (looking for affirmative responses)
        const isConfirming = message.toLowerCase().match(/^(yes|yeah|yep|sure|ok|okay|looks good|perfect|correct|that's right|sounds good|create it|do it)/);
        
        if (isConfirming) {
          const nextIndex = currentIndex + 1;
          
          // Check if there are more automations to create
          if (nextIndex < newState.totalAutomations) {
            // Move to next automation
            newState.currentAutomationIndex = nextIndex;
            newState.collectedInfo = newState.automationQueue[nextIndex] || {
              triggerType: null,
              stageId: null,
              stageName: null,
              actionType: null,
              delayDays: null,
              delayHours: null,
              delayMinutes: null,
              scheduledHour: null,
              scheduledMinute: null,
              subject: null,
              content: null,
              smartFileTemplateId: null,
              smartFileTemplateName: null,
            };
            newState.status = "collecting";
            newState.nextQuestion = `Great! Automation ${currentIndex + 1} is ready. Now let's set up the next one.\n\n**Automation ${nextIndex + 1} of ${newState.totalAutomations}**\n\nWhich stage should trigger this automation?`;
            newState.needsStageSelection = true;
            newState.options = (await storage.getStagesByPhotographer(photographerId)).map(s => ({ label: s.name, value: s.id }));
            
            console.log(`➡️ Advanced to automation ${nextIndex + 1} of ${newState.totalAutomations}`);
            return res.json({ state: newState });
          } else {
            // All automations confirmed! Set to complete to create them all
            newState.status = "complete";
            console.log(`✅ All ${newState.totalAutomations} automations confirmed, ready to create`);
          }
        }
      }

      // 🔍 STAGE RECONCILIATION LAYER - Validate and match stage IDs
      if (newState.collectedInfo && (newState.status === "confirming" || newState.status === "complete")) {
        const stages = await storage.getStagesByPhotographer(photographerId);
        
        // ALWAYS validate stageId if provided (prevent bogus IDs from slipping through)
        if (newState.collectedInfo.stageId) {
          const validStage = stages.find(s => s.id === newState.collectedInfo.stageId);
          if (!validStage) {
            console.log(`⚠️ Stage reconciliation: Invalid stageId "${newState.collectedInfo.stageId}", attempting name match`);
            newState.collectedInfo.stageId = null; // Clear bogus ID
          } else {
            console.log(`✅ Stage reconciliation: Validated stageId "${newState.collectedInfo.stageId}" (${validStage.name})`);
            newState.collectedInfo.stageName = validStage.name; // Ensure name matches ID
          }
        }
        
        // Try to match by stageName if no valid stageId
        if (!newState.collectedInfo.stageId && newState.collectedInfo.stageName) {
          // Try to match stageName to actual stages (case-insensitive fuzzy matching)
          const matchedStage = stages.find(s => 
            s.name.toLowerCase() === newState.collectedInfo.stageName?.toLowerCase() ||
            s.name.toLowerCase().includes(newState.collectedInfo.stageName?.toLowerCase() || '') ||
            newState.collectedInfo.stageName?.toLowerCase().includes(s.name.toLowerCase())
          );
          
          if (matchedStage) {
            console.log(`🔗 Stage reconciliation: Matched "${newState.collectedInfo.stageName}" to stage "${matchedStage.name}" (${matchedStage.id})`);
            newState.collectedInfo.stageId = matchedStage.id;
            newState.collectedInfo.stageName = matchedStage.name;
          } else {
            console.log(`⚠️ Stage reconciliation: Could not match "${newState.collectedInfo.stageName}" to any stage`);
            // Force user to select stage from dropdown
            newState.status = "collecting";
            newState.needsStageSelection = true;
            newState.nextQuestion = `I couldn't find a stage called "${newState.collectedInfo.stageName}". Which stage should trigger this automation?`;
            newState.options = stages.map(s => ({ label: s.name, value: s.id }));
            return res.json({ state: newState });
          }
        }
        
        // If still no stageId and not explicitly "global", require stage selection
        if (!newState.collectedInfo.stageId && newState.collectedInfo.triggerType !== "GLOBAL") {
          console.log(`⚠️ No stage ID found, requiring stage selection`);
          newState.status = "collecting";
          newState.needsStageSelection = true;
          newState.nextQuestion = "Which stage should trigger this automation?";
          newState.options = stages.map(s => ({ label: s.name, value: s.id }));
          return res.json({ state: newState });
        }
      }

      // If status is "complete", create the automation(s)
      if (newState.status === "complete" && newState.collectedInfo) {
        const createdAutomations = [];
        
        // Check if multi-automation mode (queue exists)
        const automationsToCreate = newState.automationQueue && newState.automationQueue.length > 0
          ? newState.automationQueue
          : [newState.collectedInfo];
        
        console.log(`📝 Creating ${automationsToCreate.length} automation(s)...`);
        
        // Create all automations from queue
        for (let i = 0; i < automationsToCreate.length; i++) {
          const collectedInfo = automationsToCreate[i];
          const automationType = collectedInfo.automationType || 'COMMUNICATION';
          
          // STAGE_CHANGE automations - Move contacts based on business events
          if (automationType === 'STAGE_CHANGE') {
            if (!collectedInfo.businessTrigger || !collectedInfo.targetStageId) {
              console.log(`⏭️ Skipping incomplete STAGE_CHANGE automation ${i + 1} (missing businessTrigger or targetStageId)`);
              continue;
            }
            
            // Create friendly automation name and description
            const triggerName = collectedInfo.businessTrigger.replace(/_/g, ' ').toLowerCase();
            const automationName = `Move to ${collectedInfo.targetStageName} when ${triggerName}`;
            
            let description = `Automatically moves contacts to the ${collectedInfo.targetStageName} stage when ${triggerName}.`;
            if (collectedInfo.stageId && collectedInfo.stageName) {
              description += ` Only applies to contacts currently in the ${collectedInfo.stageName} stage.`;
            }
            
            const automationData = validateAutomationSchema.parse({
              photographerId,
              name: automationName,
              description,
              automationType: 'STAGE_CHANGE',
              triggerType: collectedInfo.businessTrigger,
              stageId: collectedInfo.stageId || null, // Source stage filter (optional)
              targetStageId: collectedInfo.targetStageId,
              projectType: 'WEDDING',
              enabled: true
            });
            
            const automation = await storage.createAutomation(automationData);
            
            // Create business trigger record
            await db.insert(automationBusinessTriggers).values({
              automationId: automation.id,
              triggerType: collectedInfo.businessTrigger,
              enabled: true
            });
            
            createdAutomations.push(automation);
            console.log(`✅ Created STAGE_CHANGE automation ${i + 1}/${automationsToCreate.length}: ${automation.name}`);
            continue;
          }
          
          // COUNTDOWN automations - Send messages before event dates
          if (automationType === 'COUNTDOWN') {
            if (!collectedInfo.eventType || collectedInfo.daysBefore === null || !collectedInfo.actionType) {
              console.log(`⏭️ Skipping incomplete COUNTDOWN automation ${i + 1} (missing eventType, daysBefore, or actionType)`);
              continue;
            }
            
            const channel = collectedInfo.actionType;
            
            // Create friendly countdown name and description
            const eventName = collectedInfo.eventType.replace(/_/g, ' ');
            const actionType = collectedInfo.actionType === 'SMS' ? 'text' : collectedInfo.actionType.toLowerCase();
            const automationName = `Send ${actionType} ${collectedInfo.daysBefore} days before ${eventName}`;
            
            const description = `Sends a ${actionType} message to contacts ${collectedInfo.daysBefore} ${collectedInfo.daysBefore === 1 ? 'day' : 'days'} before their ${eventName}.`;
            
            const automationData = validateAutomationSchema.parse({
              photographerId,
              name: automationName,
              description,
              automationType: 'COUNTDOWN',
              eventType: collectedInfo.eventType,
              daysBefore: collectedInfo.daysBefore,
              channel,
              projectType: 'WEDDING',
              enabled: true
            });
            
            const automation = await storage.createAutomation(automationData);
            
            // Create automation step for countdown
            const stepData = {
              automationId: automation.id,
              stepIndex: 0,
              delayMinutes: 0, // Countdown timing is handled by daysBefore
              actionType: collectedInfo.actionType,
              customSmsContent: collectedInfo.actionType === 'SMS' ? collectedInfo.content : null,
              enabled: true
            };
            
            // Add email template if it's email
            if (collectedInfo.actionType === 'EMAIL' && collectedInfo.content) {
              // Create email template for countdown
              const template = await storage.createTemplate({
                photographerId,
                name: `Countdown Email - ${collectedInfo.daysBefore} days before`,
                subject: collectedInfo.subject || `Reminder: ${collectedInfo.daysBefore} days until your event`,
                content: collectedInfo.content,
                projectType: 'WEDDING'
              });
              stepData.templateId = template.id;
            }
            
            await storage.createAutomationStep(stepData);
            createdAutomations.push(automation);
            console.log(`✅ Created COUNTDOWN automation ${i + 1}/${automationsToCreate.length}: ${automation.name}`);
            continue;
          }
          
          // COMMUNICATION automations - Send messages when entering stage
          if (!collectedInfo.actionType) {
            console.log(`⏭️ Skipping incomplete COMMUNICATION automation ${i + 1} (no action type)`);
            continue;
          }
          
          // If trigger type is SPECIFIC_STAGE, we MUST have a stageId
          if (collectedInfo.triggerType === "SPECIFIC_STAGE" && !collectedInfo.stageId) {
            console.log(`⏭️ Skipping incomplete automation ${i + 1} (SPECIFIC_STAGE requires stageId)`);
            continue;
          }
          
          // Determine channel based on action type
          const channel = collectedInfo.actionType || 'EMAIL';
          
          // Calculate delay in minutes (include days, hours, AND minutes)
          const delayMinutes = (collectedInfo.delayDays || 0) * 24 * 60 + (collectedInfo.delayHours || 0) * 60 + (collectedInfo.delayMinutes || 0);
          
          // Create friendly automation name and description
          const actionType = collectedInfo.actionType === 'SMS' ? 'text' : 
                           collectedInfo.actionType === 'EMAIL' ? 'email' :
                           collectedInfo.actionType === 'SMART_FILE' ? 'proposal' : 'message';
          
          let timingPart = '';
          let descTimingPart = '';
          if (delayMinutes > 0) {
            if (collectedInfo.delayDays > 0) {
              timingPart = ` ${collectedInfo.delayDays} ${collectedInfo.delayDays === 1 ? 'day' : 'days'} after`;
              descTimingPart = ` ${collectedInfo.delayDays} ${collectedInfo.delayDays === 1 ? 'day' : 'days'} after they enter`;
            } else if (collectedInfo.delayHours > 0) {
              timingPart = ` ${collectedInfo.delayHours} ${collectedInfo.delayHours === 1 ? 'hour' : 'hours'} after`;
              descTimingPart = ` ${collectedInfo.delayHours} ${collectedInfo.delayHours === 1 ? 'hour' : 'hours'} after they enter`;
            } else if (collectedInfo.delayMinutes > 0) {
              timingPart = ` ${collectedInfo.delayMinutes} ${collectedInfo.delayMinutes === 1 ? 'minute' : 'minutes'} after`;
              descTimingPart = ` ${collectedInfo.delayMinutes} ${collectedInfo.delayMinutes === 1 ? 'minute' : 'minutes'} after they enter`;
            }
          } else {
            descTimingPart = ' when they enter';
          }
          
          const automationName = collectedInfo.stageId 
            ? `Send ${actionType}${timingPart || ' when entering'} ${collectedInfo.stageName}`
            : `Send ${actionType}${timingPart || ' to all new contacts'}`;
          
          const description = collectedInfo.stageId
            ? `Sends a ${actionType}${descTimingPart} the ${collectedInfo.stageName} stage.`
            : `Sends a ${actionType} to all new contacts${descTimingPart === ' when they enter' ? ' when they\'re added' : descTimingPart}.`;
          
          // Create automation
          const automationData = validateAutomationSchema.parse({
            photographerId,
            name: automationName,
            description,
            automationType: 'COMMUNICATION',
            stageId: collectedInfo.stageId || null,
            channel,
            projectType: 'WEDDING',
            enabled: true
          });
          
          const automation = await storage.createAutomation(automationData);
          
          // Create automation step
          const stepData = {
            automationId: automation.id,
            stepIndex: 0,
            delayMinutes,
            actionType: collectedInfo.actionType || 'EMAIL',
            customSmsContent: collectedInfo.actionType === 'SMS' ? collectedInfo.content : null,
            smartFileTemplateId: collectedInfo.smartFileTemplateId || null,
            enabled: true,
            scheduledHour: collectedInfo.scheduledHour,
            scheduledMinute: collectedInfo.scheduledMinute
          };
          
          await storage.createAutomationStep(stepData);
          createdAutomations.push(automation);
          
          console.log(`✅ Created COMMUNICATION automation ${i + 1}/${automationsToCreate.length}: ${automation.name}`);
        }
        
        return res.json({
          state: newState,
          automations: createdAutomations,
          created: true,
          count: createdAutomations.length
        });
      }

      // Return current conversation state
      res.json({ state: newState });
    } catch (error: any) {
      console.error('Conversational automation builder error:', error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  // AI-powered automation creation (after user confirmation)
  app.post("/api/automations/create-with-ai", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { extractedData, selectedStageId } = req.body;
      const photographerId = req.user!.photographerId!;

      console.log('🔍 AI Automation Creation - Request body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 selectedStageId:', selectedStageId);
      console.log('🔍 extractedData:', extractedData);

      if (!extractedData) {
        return res.status(400).json({ message: "Extracted data is required" });
      }

      // Create the automation with user-confirmed stage
      // AI creates COMMUNICATION automations (SMS/Email/Smart File)
      // Determine channel based on first step type
      const firstStepType = extractedData.steps[0]?.type;
      const channel = firstStepType === 'SMS' ? 'SMS' : firstStepType === 'EMAIL' ? 'EMAIL' : firstStepType === 'SMART_FILE' ? 'SMART_FILE' : null;
      
      console.log('🔍 About to create automation with stageId:', selectedStageId || null);
      
      const automationData = validateAutomationSchema.parse({
        photographerId,
        name: extractedData.name,
        automationType: 'COMMUNICATION',
        stageId: selectedStageId || null, // User-selected stage from dropdown
        channel,
        projectType: extractedData.projectType,
        enabled: true
      });
      
      console.log('🔍 Parsed automation data:', automationData);

      const automation = await storage.createAutomation(automationData);

      // Create automation steps
      for (let i = 0; i < extractedData.steps.length; i++) {
        const step = extractedData.steps[i];
        
        // Convert delay to minutes, defaulting to 0 if undefined
        const delayDays = step.delayDays ?? 0;
        const delayHours = step.delayHours ?? 0;
        const delayMinutes = (delayDays * 24 * 60) + (delayHours * 60);
        
        // For SMART_FILE type, use the provided template ID or look up by name as fallback
        let smartFileTemplateId = null;
        if (step.type === 'SMART_FILE') {
          // Prefer the direct template ID if provided
          if (step.smartFileTemplateId) {
            smartFileTemplateId = step.smartFileTemplateId;
          }
          // Fallback to name lookup if template name is provided but no ID
          else if (step.smartFileTemplateName) {
            const smartFileTemplates = await storage.getSmartFilesByPhotographer(photographerId);
            const matchingTemplate = smartFileTemplates.find(t => 
              t.name.toLowerCase().includes(step.smartFileTemplateName.toLowerCase()) ||
              step.smartFileTemplateName.toLowerCase().includes(t.name.toLowerCase())
            );
            if (matchingTemplate) {
              smartFileTemplateId = matchingTemplate.id;
            }
          }
        }
        
        const stepData = insertAutomationStepSchema.parse({
          automationId: automation.id,
          stepIndex: i,
          delayMinutes,
          actionType: step.type,
          customSmsContent: step.type === 'SMS' ? step.content : null,
          templateId: null, // AI doesn't use templates
          smartFileTemplateId,
          enabled: true
        });
        await storage.createAutomationStep(stepData);
      }

      res.status(201).json(automation);
    } catch (error: any) {
      console.error('Create automation with AI error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.patch("/api/automations/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.put("/api/automations/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.delete("/api/automations/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // First verify the automation belongs to this photographer
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === req.params.id);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }

      // Actually delete the automation and all related data
      await storage.deleteAutomation(req.params.id);
      res.json({ message: "Automation deleted successfully" });
    } catch (error) {
      console.error('Delete automation error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Business Triggers
  app.get("/api/business-triggers", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const businessTriggers = await storage.getBusinessTriggersByPhotographer(req.user!.photographerId!);
      res.json(businessTriggers);
    } catch (error) {
      console.error('Get business triggers error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/automations/:automationId/business-triggers", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // First verify the automation belongs to this photographer
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === req.params.automationId);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }

      const businessTriggers = await storage.getBusinessTriggersByAutomation(req.params.automationId);
      res.json(businessTriggers);
    } catch (error) {
      console.error('Get automation business triggers error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/business-triggers", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Verify the automation belongs to this photographer
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === req.body.automationId);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }

      const triggerData = insertAutomationBusinessTriggerSchema.parse(req.body);
      const businessTrigger = await storage.createBusinessTrigger(triggerData);
      res.status(201).json(businessTrigger);
    } catch (error: any) {
      console.error('Create business trigger error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      if (error?.code === '23505') {
        return res.status(400).json({ message: "Business trigger already exists for this automation and trigger type" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/business-triggers/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Get the business trigger and verify ownership through automation
      const businessTriggers = await storage.getBusinessTriggersByPhotographer(req.user!.photographerId!);
      const businessTrigger = businessTriggers.find(t => t.id === req.params.id);
      
      if (!businessTrigger) {
        return res.status(404).json({ message: "Business trigger not found" });
      }

      // Create update schema that excludes id and automationId
      const updateSchema = insertAutomationBusinessTriggerSchema.partial().omit({
        automationId: true
      });
      
      const updateData = updateSchema.parse(req.body);
      const updated = await storage.updateBusinessTrigger(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error('Update business trigger error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/business-triggers/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Get the business trigger and verify ownership through automation
      const businessTriggers = await storage.getBusinessTriggersByPhotographer(req.user!.photographerId!);
      const businessTrigger = businessTriggers.find(t => t.id === req.params.id);
      
      if (!businessTrigger) {
        return res.status(404).json({ message: "Business trigger not found" });
      }

      await storage.deleteBusinessTrigger(req.params.id);
      res.json({ message: "Business trigger deleted successfully" });
    } catch (error) {
      console.error('Delete business trigger error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Automation Steps
  app.get("/api/automations/:id/steps", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // First verify the automation belongs to this photographer
      const automations = await storage.getAutomationsByPhotographer(req.user!.photographerId!);
      const automation = automations.find(a => a.id === req.params.id);
      
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }

      const steps = await storage.getAutomationSteps(req.params.id);
      
      // Debug logging for Smart File automations
      if (automation.channel === 'SMART_FILE' && steps.length > 0) {
        console.log('🔍 Smart File automation steps:', JSON.stringify(steps, null, 2));
      }
      
      res.json(steps);
    } catch (error) {
      console.error('Get automation steps error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/automations/:id/steps", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.patch("/api/automation-steps/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.delete("/api/automation-steps/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  // Setup default Wedding inquiry automations
  app.post("/api/automations/setup-wedding-inquiry-defaults", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      
      // Get photographer details for personalization
      const photographer = await storage.getPhotographer(photographerId);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Get the "New Inquiry" stage for Wedding projects
      const stages = await storage.getStagesByPhotographer(photographerId, "WEDDING");
      const inquiryStage = stages.find(s => s.name === "New Inquiry");
      
      if (!inquiryStage) {
        return res.status(404).json({ message: "New Inquiry stage not found for Wedding projects" });
      }

      // Check if this sequence already exists (idempotency check)
      const existingAutomations = await storage.getAutomationsByPhotographer(photographerId, "WEDDING");
      const hasInquirySequence = existingAutomations.some(a => 
        a.stageId === inquiryStage.id && 
        a.name.includes("immediately when contact enters New Inquiry")
      );

      if (hasInquirySequence) {
        return res.status(400).json({ 
          message: "Wedding inquiry automation sequence already exists. Please delete existing automations first if you want to recreate them." 
        });
      }

      // Get all existing templates to avoid duplicates
      const existingTemplates = await storage.getTemplatesByPhotographer(photographerId);
      
      // Helper function to get or create template
      const getOrCreateTemplate = async (templateData: any) => {
        const existing = existingTemplates.find(t => t.name === templateData.name);
        if (existing) {
          return existing;
        }
        const newTemplate = await storage.createTemplate(templateData);
        createdTemplates.push(newTemplate);
        return newTemplate;
      };

      const createdAutomations = [];
      const createdTemplates = [];
      const createdSteps = [];

      try {
        // PHASE 1: Instant Response (0 minutes)
        // 1.1 - Instant Email
        const instantEmailTemplate = await getOrCreateTemplate({
          photographerId,
          name: "Wedding Inquiry - Instant Email",
          channel: "EMAIL",
          subject: "Thanks for reaching out about your photos!",
          htmlBody: `<p>Hi {{first_name}},</p>
<p>Thank you for reaching out! I'd love to learn more about your day and style.</p>
<p>Here's my calendar to chat: {{scheduler_link}}</p>
<p>You'll get ideas, pricing, and sample galleries.</p>
<p>– {{photographer_name}}</p>`,
          textBody: `Hi {{first_name}},\n\nThank you for reaching out! I'd love to learn more about your day and style.\n\nHere's my calendar to chat: {{scheduler_link}}\n\nYou'll get ideas, pricing, and sample galleries.\n\n– {{photographer_name}}`
        });

        const instantEmailAutomation = await storage.createAutomation({
          photographerId,
          name: "Send email immediately when contact enters New Inquiry",
          description: "Instant email response to wedding inquiries - sent within 5 minutes of form submission",
          automationType: "COMMUNICATION",
          stageId: inquiryStage.id,
          channel: "EMAIL",
          projectType: "WEDDING",
          enabled: true
        });
        createdAutomations.push(instantEmailAutomation);

        const instantEmailStep = await storage.createAutomationStep({
          automationId: instantEmailAutomation.id,
          stepIndex: 0,
          delayMinutes: 0,
          actionType: "EMAIL",
          templateId: instantEmailTemplate.id,
          enabled: true
        });
        createdSteps.push(instantEmailStep);

      // 1.2 - Instant SMS
      const instantSmsAutomation = await storage.createAutomation({
        photographerId,
        name: "Send text immediately when contact enters New Inquiry",
        description: "Instant SMS response to wedding inquiries - conversational and friendly",
        automationType: "COMMUNICATION",
        stageId: inquiryStage.id,
        channel: "SMS",
        projectType: "WEDDING",
        enabled: true
      });

      await storage.createAutomationStep({
        automationId: instantSmsAutomation.id,
        stepIndex: 0,
        delayMinutes: 0,
        actionType: "SMS",
        customSmsContent: "Hey {{first_name}}! This is {{business_name}}—got your inquiry 🎉 When's a good time to chat about your session or wedding? You can also grab a time here: {{scheduler_link}}",
        enabled: true
      });
      createdAutomations.push(instantSmsAutomation);

      // PHASE 2: Short-Term Follow-Up (0–72 Hours)
      // 2.1 - T+24 Hours Email
      const t24EmailTemplate = await getOrCreateTemplate({
        photographerId,
        name: "Wedding Inquiry - 24h Follow-up",
        channel: "EMAIL",
        subject: "Still want to chat?",
        htmlBody: `<p>Hi {{first_name}},</p>
<p>Just wanted to follow up in case you missed my message. I'd love to help you plan an amazing photo experience.</p>
<p>You can grab a time here: {{scheduler_link}}</p>
<p>– {{photographer_name}}</p>`,
        textBody: `Hi {{first_name}},\n\nJust wanted to follow up in case you missed my message. I'd love to help you plan an amazing photo experience.\n\nYou can grab a time here: {{scheduler_link}}\n\n– {{photographer_name}}`
      });

      const t24EmailAutomation = await storage.createAutomation({
        photographerId,
        name: "Send email 24 hours after entering New Inquiry",
        description: "24-hour follow-up email to check if they want to chat",
        automationType: "COMMUNICATION",
        stageId: inquiryStage.id,
        channel: "EMAIL",
        projectType: "WEDDING",
        enabled: true
      });

      await storage.createAutomationStep({
        automationId: t24EmailAutomation.id,
        stepIndex: 0,
        delayMinutes: 1440, // 24 hours
        actionType: "EMAIL",
        templateId: t24EmailTemplate.id,
        enabled: true
      });
      createdAutomations.push(t24EmailAutomation);

      // 2.2 - T+24 Hours SMS (Optional)
      const t24SmsAutomation = await storage.createAutomation({
        photographerId,
        name: "Send text 24 hours after entering New Inquiry",
        description: "24-hour follow-up SMS - gentle check-in",
        automationType: "COMMUNICATION",
        stageId: inquiryStage.id,
        channel: "SMS",
        projectType: "WEDDING",
        enabled: true
      });

      await storage.createAutomationStep({
        automationId: t24SmsAutomation.id,
        stepIndex: 0,
        delayMinutes: 1440, // 24 hours
        actionType: "SMS",
        customSmsContent: "Hey {{first_name}}, just checking in 🙂—still looking for a photographer for {{event_date}}?",
        enabled: true
      });
      createdAutomations.push(t24SmsAutomation);

      // 2.3 - T+48 Hours Email
      const t48EmailTemplate = await getOrCreateTemplate({
        photographerId,
        name: "Wedding Inquiry - 48h Social Proof",
        channel: "EMAIL",
        subject: "Here's what our clients love most",
        htmlBody: `<p>Hi {{first_name}},</p>
<p>I wanted to share what our past clients love most about working with us!</p>
<p>✨ Include 3–5 sample images and a short testimonial here ✨</p>
<p><strong>Want me to hold your date for 48 hours while you decide?</strong> Just hit reply.</p>
<p>– {{photographer_name}}</p>`,
        textBody: `Hi {{first_name}},\n\nI wanted to share what our past clients love most about working with us!\n\n✨ Include 3–5 sample images and a short testimonial here ✨\n\nWant me to hold your date for 48 hours while you decide? Just hit reply.\n\n– {{photographer_name}}`
      });

      const t48EmailAutomation = await storage.createAutomation({
        photographerId,
        name: "Send email 48 hours after entering New Inquiry",
        description: "48-hour follow-up with social proof and date hold offer",
        automationType: "COMMUNICATION",
        stageId: inquiryStage.id,
        channel: "EMAIL",
        projectType: "WEDDING",
        enabled: true
      });

      await storage.createAutomationStep({
        automationId: t48EmailAutomation.id,
        stepIndex: 0,
        delayMinutes: 2880, // 48 hours
        actionType: "EMAIL",
        templateId: t48EmailTemplate.id,
        enabled: true
      });
      createdAutomations.push(t48EmailAutomation);

      // 2.4 - T+72 Hours Email (Final)
      const t72EmailTemplate = await getOrCreateTemplate({
        photographerId,
        name: "Wedding Inquiry - 72h Final Check",
        channel: "EMAIL",
        subject: "Quick question before I close your file",
        htmlBody: `<p>Hi {{first_name}},</p>
<p>I don't want to bug you, but I also don't want you to miss out if you're still deciding.</p>
<p>Should I keep your date open or release it? Either way, just reply with a quick yes or no.</p>
<p>– {{photographer_name}}</p>`,
        textBody: `Hi {{first_name}},\n\nI don't want to bug you, but I also don't want you to miss out if you're still deciding.\n\nShould I keep your date open or release it? Either way, just reply with a quick yes or no.\n\n– {{photographer_name}}`
      });

      const t72EmailAutomation = await storage.createAutomation({
        photographerId,
        name: "Send email 72 hours after entering New Inquiry",
        description: "72-hour final check before closing the file",
        automationType: "COMMUNICATION",
        stageId: inquiryStage.id,
        channel: "EMAIL",
        projectType: "WEDDING",
        enabled: true
      });

      await storage.createAutomationStep({
        automationId: t72EmailAutomation.id,
        stepIndex: 0,
        delayMinutes: 4320, // 72 hours
        actionType: "EMAIL",
        templateId: t72EmailTemplate.id,
        enabled: true
      });
      createdAutomations.push(t72EmailAutomation);

      // PHASE 3: Re-Engagement (1–3 Weeks Later)
      // 3.1 - T+7 Days
      const t7DaysTemplate = await getOrCreateTemplate({
        photographerId,
        name: "Wedding Inquiry - 7 Day Re-engagement",
        channel: "EMAIL",
        subject: "We just posted a new gallery you might love",
        htmlBody: `<p>Hi {{first_name}},</p>
<p>We just posted a new gallery that I thought you might love! Check it out here: [link to portfolio or blog post]</p>
<p>Let me know if you'd like to chat about your own special day!</p>
<p>– {{photographer_name}}</p>`,
        textBody: `Hi {{first_name}},\n\nWe just posted a new gallery that I thought you might love! Check it out here: [link to portfolio or blog post]\n\nLet me know if you'd like to chat about your own special day!\n\n– {{photographer_name}}`
      });

      const t7DaysAutomation = await storage.createAutomation({
        photographerId,
        name: "Send email 7 days after entering New Inquiry",
        description: "7-day re-engagement with new portfolio content",
        automationType: "COMMUNICATION",
        stageId: inquiryStage.id,
        channel: "EMAIL",
        projectType: "WEDDING",
        enabled: true
      });

      await storage.createAutomationStep({
        automationId: t7DaysAutomation.id,
        stepIndex: 0,
        delayMinutes: 10080, // 7 days
        actionType: "EMAIL",
        templateId: t7DaysTemplate.id,
        enabled: true
      });
      createdAutomations.push(t7DaysAutomation);

      // 3.2 - T+14 Days
      const t14DaysTemplate = await getOrCreateTemplate({
        photographerId,
        name: "Wedding Inquiry - 14 Day Limited Offer",
        channel: "EMAIL",
        subject: "New limited-time bonus for you",
        htmlBody: `<p>Hi {{first_name}},</p>
<p><strong>New limited-time bonus:</strong> free engagement session for weddings booked this month!</p>
<p>This is our way of saying thank you for considering us. Want to chat about it?</p>
<p>– {{photographer_name}}</p>`,
        textBody: `Hi {{first_name}},\n\nNew limited-time bonus: free engagement session for weddings booked this month!\n\nThis is our way of saying thank you for considering us. Want to chat about it?\n\n– {{photographer_name}}`
      });

      const t14DaysAutomation = await storage.createAutomation({
        photographerId,
        name: "Send email 14 days after entering New Inquiry",
        description: "14-day limited-time bonus offer to re-engage",
        automationType: "COMMUNICATION",
        stageId: inquiryStage.id,
        channel: "EMAIL",
        projectType: "WEDDING",
        enabled: true
      });

      await storage.createAutomationStep({
        automationId: t14DaysAutomation.id,
        stepIndex: 0,
        delayMinutes: 20160, // 14 days
        actionType: "EMAIL",
        templateId: t14DaysTemplate.id,
        enabled: true
      });
      createdAutomations.push(t14DaysAutomation);

      // 3.3 - T+21 Days (Final)
      const t21DaysTemplate = await getOrCreateTemplate({
        photographerId,
        name: "Wedding Inquiry - 21 Day Final Calendar Check",
        channel: "EMAIL",
        subject: "Finalizing our calendar",
        htmlBody: `<p>Hi {{first_name}},</p>
<p>We're finalizing our calendar — still want me to hold {{event_date}}?</p>
<p>Let me know either way so I can plan accordingly!</p>
<p>– {{photographer_name}}</p>`,
        textBody: `Hi {{first_name}},\n\nWe're finalizing our calendar — still want me to hold {{event_date}}?\n\nLet me know either way so I can plan accordingly!\n\n– {{photographer_name}}`
      });

      const t21DaysAutomation = await storage.createAutomation({
        photographerId,
        name: "Send email 21 days after entering New Inquiry",
        description: "21-day final calendar check before releasing date",
        automationType: "COMMUNICATION",
        stageId: inquiryStage.id,
        channel: "EMAIL",
        projectType: "WEDDING",
        enabled: true
      });

      await storage.createAutomationStep({
        automationId: t21DaysAutomation.id,
        stepIndex: 0,
        delayMinutes: 30240, // 21 days
        actionType: "EMAIL",
        templateId: t21DaysTemplate.id,
        enabled: true
      });
        createdAutomations.push(t21DaysAutomation);

        // Successfully created all automations
        res.status(201).json({
          message: "Wedding inquiry automation sequence created successfully",
          automations: createdAutomations,
          count: createdAutomations.length
        });
      } catch (creationError: any) {
        // Rollback - delete all created items on error
        console.error('Error during automation creation, rolling back...', creationError);
        
        try {
          // Delete all created automation steps
          for (const step of createdSteps) {
            await storage.deleteAutomationStep(step.id).catch(() => {});
          }
          
          // Delete all created automations
          for (const automation of createdAutomations) {
            await storage.deleteAutomation(automation.id).catch(() => {});
          }
          
          // Delete all created templates
          for (const template of createdTemplates) {
            await storage.deleteTemplate(template.id).catch(() => {});
          }
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
        
        throw new Error(`Failed to create automation sequence: ${creationError.message}. All changes have been rolled back.`);
      }
    } catch (error: any) {
      console.error('Setup wedding inquiry defaults error:', error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  // Drip Campaign routes
  app.get("/api/drip-campaigns", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { projectType } = req.query;
      const campaigns = await storage.getDripCampaignsByPhotographer(
        req.user!.photographerId!,
        projectType as string | undefined
      );
      res.json(campaigns);
    } catch (error) {
      console.error('Get drip campaigns error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get static campaign templates for display
  app.get("/api/drip-campaigns/static-templates", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { projectType } = req.query;
      
      // Get photographer details for branding
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      const staticCampaignService = await import('./services/staticCampaigns');
      
      if (projectType) {
        // Return specific campaign template
        const staticCampaign = staticCampaignService.getStaticCampaignByType(photographer, projectType as string);
        if (!staticCampaign) {
          return res.status(404).json({ message: `No static campaign template available for project type: ${projectType}` });
        }
        res.json(staticCampaign);
      } else {
        // Return all campaign templates
        const allCampaigns = staticCampaignService.getStaticCampaigns(photographer);
        res.json(allCampaigns);
      }
    } catch (error) {
      console.error('Get static campaign templates error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/drip-campaigns/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const campaign = await storage.getDripCampaign(req.params.id);
      if (!campaign || campaign.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Drip campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error('Get drip campaign error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/drip-campaigns/activate", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { targetStageId, projectType } = req.body;

      // Get photographer details
      const photographer = await storage.getPhotographer(req.user!.photographerId!);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Get stage details
      const stages = await storage.getStagesByPhotographer(req.user!.photographerId!, projectType);
      const stage = stages.find(s => s.id === targetStageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }

      // Get static campaign template for the project type
      const staticCampaignService = await import('./services/staticCampaigns');
      const staticCampaign = staticCampaignService.getStaticCampaignByType(photographer, projectType || "WEDDING");
      
      if (!staticCampaign) {
        return res.status(400).json({ message: `No static campaign template available for project type: ${projectType}` });
      }

      // Create campaign with static template data
      const result = {
        emails: staticCampaign.emails.map((email, index) => ({
          sequenceIndex: index,
          subject: email.subject,
          htmlBody: email.htmlBody,
          textBody: email.textBody,
          daysAfterStart: email.daysAfterStart, // Use research-backed timing from template
          weeksAfterStart: email.weeksAfterStart // Legacy compatibility from template
        })),
        campaign: {
          name: staticCampaign.name,
          projectType: projectType || "WEDDING",
          targetStageId,
          status: "DRAFT",
          maxDurationMonths: 8, // Research-backed: 217 days = ~7.2 months  
          emailFrequencyDays: 9, // Research-backed: Average frequency across phases
          emailFrequencyWeeks: 1, // Legacy compatibility ~1.3 weeks average
          isStaticTemplate: true,
          staticTemplateType: projectType || "WEDDING",
          generatedByAi: false
        }
      };

      res.json(result);
    } catch (error) {
      console.error('Activate static campaign error:', error);
      res.status(500).json({ message: "Failed to activate static campaign", error: error.message });
    }
  });

  app.post("/api/drip-campaigns", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const campaignData = insertDripCampaignSchema.parse({
        ...req.body,
        photographerId: req.user!.photographerId!
      });

      // Verify stage belongs to photographer
      const stages = await storage.getStagesByPhotographer(req.user!.photographerId!, campaignData.projectType);
      const stage = stages.find(s => s.id === campaignData.targetStageId);
      if (!stage) {
        return res.status(400).json({ message: "Invalid target stage" });
      }

      const campaign = await storage.createDripCampaign(campaignData);

      // If emails are provided, create them
      if (req.body.emails && Array.isArray(req.body.emails)) {
        for (let i = 0; i < req.body.emails.length; i++) {
          const emailData = insertDripCampaignEmailSchema.parse({
            ...req.body.emails[i],
            campaignId: campaign.id,
            sequenceIndex: i
          });
          await storage.createDripCampaignEmail(emailData);
        }
      }

      // Return the campaign with emails
      const campaignWithEmails = await storage.getDripCampaign(campaign.id);
      res.status(201).json(campaignWithEmails);
    } catch (error: any) {
      console.error('Create drip campaign error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/drip-campaigns/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const campaign = await storage.getDripCampaign(req.params.id);
      if (!campaign || campaign.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Drip campaign not found" });
      }

      const updateData = insertDripCampaignSchema.partial().omit({ photographerId: true, id: true }).parse(req.body);
      const updated = await storage.updateDripCampaign(req.params.id, updateData);

      // If emails are provided, update them
      if (req.body.emails && Array.isArray(req.body.emails)) {
        // Delete existing emails and recreate them (simpler than complex updating)
        const existingEmails = await storage.getDripCampaignEmails(req.params.id);
        for (const email of existingEmails) {
          await storage.deleteDripCampaignEmail(email.id);
        }

        for (let i = 0; i < req.body.emails.length; i++) {
          const emailData = insertDripCampaignEmailSchema.parse({
            ...req.body.emails[i],
            campaignId: req.params.id,
            sequenceIndex: i
          });
          await storage.createDripCampaignEmail(emailData);
        }
      }

      const campaignWithEmails = await storage.getDripCampaign(req.params.id);
      res.json(campaignWithEmails);
    } catch (error: any) {
      console.error('Update drip campaign error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/drip-campaigns/:id/approve", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const campaign = await storage.getDripCampaign(req.params.id);
      if (!campaign || campaign.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Drip campaign not found" });
      }

      if (campaign.status !== 'DRAFT') {
        return res.status(400).json({ message: "Only draft campaigns can be approved" });
      }

      const updated = await storage.updateDripCampaign(req.params.id, {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: req.user!.id
      });

      res.json(updated);
    } catch (error) {
      console.error('Approve drip campaign error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/drip-campaigns/:id/activate", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const campaign = await storage.getDripCampaign(req.params.id);
      if (!campaign || campaign.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Drip campaign not found" });
      }

      if (campaign.status !== 'APPROVED') {
        return res.status(400).json({ message: "Only approved campaigns can be activated" });
      }

      const updated = await storage.updateDripCampaign(req.params.id, {
        status: 'ACTIVE'
      });

      // TODO: Auto-subscribe eligible clients in the target stage
      // This would be implemented in the drip automation service

      res.json(updated);
    } catch (error) {
      console.error('Activate drip campaign error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/drip-campaigns/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const campaign = await storage.getDripCampaign(req.params.id);
      if (!campaign || campaign.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Drip campaign not found" });
      }

      await storage.deleteDripCampaign(req.params.id);
      res.json({ message: "Drip campaign deleted successfully" });
    } catch (error) {
      console.error('Delete drip campaign error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Individual email approval routes
  app.post("/api/drip-campaigns/:campaignId/emails/:emailId/approve", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { campaignId, emailId } = req.params;
      
      // Verify campaign ownership
      const campaign = await storage.getDripCampaign(campaignId);
      if (!campaign || campaign.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Verify email belongs to this campaign
      const emails = await storage.getDripCampaignEmails(campaignId);
      const targetEmail = emails.find(email => email.id === emailId);
      if (!targetEmail) {
        return res.status(404).json({ message: "Email not found in this campaign" });
      }

      // Approve the email
      await storage.approveEmail(emailId, req.user!.userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Approve email error:", error);
      res.status(500).json({ message: "Failed to approve email" });
    }
  });

  app.post("/api/drip-campaigns/:campaignId/emails/:emailId/reject", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { campaignId, emailId } = req.params;
      
      // Verify campaign ownership
      const campaign = await storage.getDripCampaign(campaignId);
      if (!campaign || campaign.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Verify email belongs to this campaign
      const emails = await storage.getDripCampaignEmails(campaignId);
      const targetEmail = emails.find(email => email.id === emailId);
      if (!targetEmail) {
        return res.status(404).json({ message: "Email not found in this campaign" });
      }

      // Reject the email
      await storage.rejectEmail(emailId, req.user!.userId, 'Manual rejection');
      
      res.json({ success: true });
    } catch (error) {
      console.error("Reject email error:", error);
      res.status(500).json({ message: "Failed to reject email" });
    }
  });

  // Static Campaign Settings routes
  app.get("/api/static-campaign-settings/:projectType", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { projectType } = req.params;
      const settings = await storage.getStaticCampaignSettings(
        req.user!.photographerId!,
        projectType
      );
      
      // Return default settings if none exist
      if (!settings) {
        res.json({
          campaignEnabled: false,
          emailToggles: null,
          projectType: projectType
        });
      } else {
        res.json(settings);
      }
    } catch (error) {
      console.error('Get static campaign settings error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/static-campaign-settings", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { projectType, campaignEnabled, emailToggles } = req.body;
      
      const settings = await storage.saveStaticCampaignSettings({
        photographerId: req.user!.photographerId!,
        projectType,
        campaignEnabled,
        emailToggles: JSON.stringify(emailToggles)
      });
      
      res.json(settings);
    } catch (error) {
      console.error('Save static campaign settings error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Drip Campaign Subscriptions routes
  app.get("/api/drip-subscriptions", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const subscriptions = await storage.getDripCampaignSubscriptionsByPhotographer(req.user!.photographerId!);
      res.json(subscriptions);
    } catch (error) {
      console.error('Get drip subscriptions error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/drip-subscriptions", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { campaignId, projectId } = req.body;

      // Verify campaign belongs to photographer
      const campaign = await storage.getDripCampaign(campaignId);
      if (!campaign || campaign.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Drip campaign not found" });
      }

      // Verify project belongs to photographer
      const project = await storage.getProject(projectId);
      if (!project || project.photographerId !== req.user!.photographerId!) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Calculate when to send the first email
      const firstEmailAt = new Date();
      firstEmailAt.setDate(firstEmailAt.getDate() + (campaign.emailFrequencyWeeks * 7));

      const subscriptionData = insertDripCampaignSubscriptionSchema.parse({
        campaignId,
        projectId,
        clientId: project.clientId,
        nextEmailAt: firstEmailAt
      });

      const subscription = await storage.createDripCampaignSubscription(subscriptionData);
      res.status(201).json(subscription);
    } catch (error: any) {
      console.error('Create drip subscription error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
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
        // Subscription lifecycle events
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if (customer.deleted) break;
          
          // Find photographer by stripe customer ID
          const photographers = await storage.getAllPhotographers();
          const photographer = photographers.find(p => p.stripeCustomerId === customer.id);
          
          if (photographer) {
            await storage.updatePhotographer(photographer.id, {
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
              trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
            });
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          const deletedCustomer = await stripe.customers.retrieve(deletedSubscription.customer as string);
          
          if (deletedCustomer.deleted) break;
          
          const photographersAll = await storage.getAllPhotographers();
          const photographerDeleted = photographersAll.find(p => p.stripeCustomerId === deletedCustomer.id);
          
          if (photographerDeleted) {
            await storage.updatePhotographer(photographerDeleted.id, {
              subscriptionStatus: 'canceled'
            });
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as Stripe.Invoice;
          if (failedInvoice.subscription) {
            const failedSub = await stripe.subscriptions.retrieve(failedInvoice.subscription as string);
            const failedCustomer = await stripe.customers.retrieve(failedSub.customer as string);
            
            if (failedCustomer.deleted) break;
            
            const allPhotographers = await storage.getAllPhotographers();
            const photographerFailed = allPhotographers.find(p => p.stripeCustomerId === failedCustomer.id);
            
            if (photographerFailed) {
              await storage.updatePhotographer(photographerFailed.id, {
                subscriptionStatus: 'past_due'
              });
            }
          }
          break;

        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const metadata = session.metadata;
          
          // Handle Smart File payments
          if (metadata?.projectSmartFileId && metadata?.photographerId) {
            const totalAmountCents = session.amount_total || 0;
            const paymentIntentId = session.payment_intent as string;
            const paymentType = metadata.paymentType || 'DEPOSIT';
            
            // Get current project smart file to calculate new balances
            const currentProjectSmartFile = await storage.getProjectSmartFileByToken(metadata.token || '');
            if (!currentProjectSmartFile) {
              console.error('Project smart file not found:', metadata.projectSmartFileId);
              break;
            }
            
            const currentAmountPaid = currentProjectSmartFile.amountPaidCents || 0;
            const newAmountPaid = currentAmountPaid + totalAmountCents;
            const totalOwed = currentProjectSmartFile.totalCents || 0;
            const newBalanceDue = Math.max(0, totalOwed - newAmountPaid);
            
            // Determine new status based on balance
            let newStatus = 'PAID';
            if (newBalanceDue > 0) {
              newStatus = 'DEPOSIT_PAID';
            }
            
            await storage.updateProjectSmartFile(metadata.projectSmartFileId, {
              status: newStatus,
              paidAt: newBalanceDue === 0 ? new Date() : currentProjectSmartFile.paidAt,
              paymentType,
              amountPaidCents: newAmountPaid,
              balanceDueCents: newBalanceDue,
              stripePaymentIntentId: paymentIntentId
            });

            // Log payment to project activity
            const paymentAmount = (totalAmountCents / 100).toFixed(2);
            const paymentTypeLabel = paymentType === 'DEPOSIT' ? 'Deposit' : paymentType === 'BALANCE' ? 'Balance' : 'Full Payment';
            await storage.addProjectActivityLog({
              projectId: metadata.projectId || currentProjectSmartFile.projectId,
              activityType: 'PAYMENT_RECEIVED',
              action: 'PAYMENT',
              title: `${paymentTypeLabel} payment received: $${paymentAmount}`,
              description: `Client paid $${paymentAmount} ${paymentType === 'DEPOSIT' ? 'deposit' : paymentType === 'BALANCE' ? 'balance' : 'in full'} for "${currentProjectSmartFile.smartFileName}"${newBalanceDue > 0 ? `. Balance due: $${(newBalanceDue / 100).toFixed(2)}` : ''}`,
              relatedId: metadata.projectSmartFileId,
              relatedType: 'PROJECT_SMART_FILE',
              metadata: JSON.stringify({
                paymentIntentId,
                amountCents: totalAmountCents,
                paymentType,
                balanceDueCents: newBalanceDue,
                status: newStatus
              })
            });

            // Auto-create gallery if deposit was paid and gallery platform is configured
            if (paymentType === 'DEPOSIT' && newStatus === 'DEPOSIT_PAID') {
              try {
                const photographer = await storage.getPhotographer(metadata.photographerId);
                const project = await storage.getProject(metadata.projectId || currentProjectSmartFile.projectId);
                
                if (photographer?.galleryPlatform && project && !project.galleryUrl) {
                  console.log(`Auto-creating gallery for project ${project.id}`);
                  const { galleryService } = await import('./services/gallery');
                  await galleryService.createGallery(project.id, metadata.photographerId);
                }
              } catch (galleryError) {
                console.error('Failed to auto-create gallery:', galleryError);
                // Don't fail the webhook if gallery creation fails
              }
            }

            try {
              // Get payment intent details
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
                earningStatus = 'available';
              } else {
                platformFeeCents = calculatePlatformFee(actualAmountCents);
                photographerEarningsCents = actualAmountCents - platformFeeCents;
                earningStatus = 'unconnected_pending';
              }

              // Create earnings record for Smart File payment
              await storage.createEarnings({
                photographerId: metadata.photographerId,
                projectId: metadata.projectId || '',
                estimatePaymentId: null,
                paymentIntentId,
                totalAmountCents: actualAmountCents,
                platformFeeCents,
                photographerEarningsCents,
                currency: 'USD',
                status: earningStatus
              });

            } catch (error: any) {
              console.error('Smart File payment earnings error:', error);
              // Continue even if earnings creation fails
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

  // NOTE: Test and SimpleTexting webhook routes are registered in server/index.ts

  // Reports
  app.get("/api/reports/summary", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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
  app.get("/api/bookings", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const bookings = await storage.getBookingsByPhotographer(req.user!.photographerId!);
      res.json(bookings);
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/bookings", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        photographerId
      });

      // Critical security check: If clientId is provided, validate tenant ownership
      if (bookingData.clientId) {
        const contact = await storage.getContact(bookingData.clientId);
        if (!contact || contact.photographerId !== photographerId) {
          return res.status(403).json({ message: "Client not found or access denied" });
        }
        
        // Populate client details for consistency (optional but recommended)
        bookingData.clientName = contact.name;
        bookingData.clientEmail = contact.email;
        bookingData.clientPhone = contact.phone;
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

  app.get("/api/bookings/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.put("/api/bookings/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.delete("/api/bookings/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

      // Send booking confirmation email to client
      console.log(`📧 Attempting to send booking confirmation email for booking ${booking.id}`);
      try {
        const photographer = await storage.getPhotographer(booking.photographerId);
        console.log(`📧 Photographer found: ${photographer?.businessName || 'NONE'}, Email: ${validatedData.clientEmail}`);
        if (photographer && validatedData.clientEmail) {
          const bookingDate = new Date(booking.startAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: photographer.timezone || 'America/New_York'
          });
          
          const bookingTime = new Date(booking.startAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: photographer.timezone || 'America/New_York'
          });
          
          const endTime = new Date(booking.endAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: photographer.timezone || 'America/New_York'
          });

          // Get the final booking to ensure we have the Google Meet link
          const finalBooking = await storage.getBooking(booking.id);
          
          // Get clientId from project if projectId exists
          let clientId = null;
          if (booking.projectId) {
            const project = await storage.getProject(booking.projectId);
            clientId = project?.clientId || null;
          }
          
          const emailSuccess = await sendEmail({
            to: validatedData.clientEmail,
            from: `${photographer.businessName} <${process.env.SENDGRID_FROM_EMAIL}>`,
            replyTo: photographer.emailFromAddr || process.env.SENDGRID_FROM_EMAIL,
            subject: `📸 Your appointment with ${photographer.businessName} is confirmed!`,
            photographerId: photographer.id,
            clientId: clientId || undefined,
            projectId: booking.projectId || undefined,
            source: 'MANUAL' as const,
            html: `
              <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0; font-size: 24px;">✅ Appointment Confirmed!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Your consultation with ${photographer.businessName}</p>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <h2 style="color: #4a5568; margin-top: 0;">📅 Appointment Details</h2>
                  
                  <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${bookingDate}</p>
                    <p style="margin: 5px 0;"><strong>🕒 Time:</strong> ${bookingTime} - ${endTime}</p>
                    <p style="margin: 5px 0;"><strong>👤 Client:</strong> ${validatedData.clientName}</p>
                    <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${validatedData.clientEmail}</p>
                    ${validatedData.clientPhone ? `<p style="margin: 5px 0;"><strong>📞 Phone:</strong> ${validatedData.clientPhone}</p>` : ''}
                  </div>

                  ${finalBooking?.googleMeetLink ? `
                    <div style="background: #e6fffa; border: 2px solid #38b2ac; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                      <h3 style="color: #2d3748; margin-top: 0;">🎥 Video Call Details</h3>
                      <p style="margin: 10px 0;">Join your appointment via Google Meet:</p>
                      <a href="${finalBooking.googleMeetLink}" 
                         style="background: #48bb78; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: 600; margin: 10px 0;">
                        🎥 Join Video Call
                      </a>
                      <p style="font-size: 14px; color: #718096; margin: 10px 0;">
                        <strong>Meeting Link:</strong> ${finalBooking.googleMeetLink}
                      </p>
                    </div>
                  ` : ''}

                  <div style="background: #fff5f5; border: 2px solid #fc8181; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2d3748; margin-top: 0;">⏰ Important Reminders</h3>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                      <li>You'll receive a reminder email on the morning of your appointment</li>
                      <li>Please join the video call 2-3 minutes early</li>
                      <li>Make sure you have a reliable internet connection</li>
                      <li>Have any questions or materials ready to discuss</li>
                    </ul>
                  </div>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #718096; font-size: 14px; margin: 5px 0;">
                      Need to reschedule or have questions? Reply to this email or contact us directly.
                    </p>
                    <p style="color: #718096; font-size: 14px; margin: 5px 0;">
                      <strong>Best regards,</strong><br>
                      ${photographer.businessName}
                    </p>
                  </div>
                </div>
              </div>
            `,
            text: `✅ Your appointment with ${photographer.businessName} is confirmed!

📅 APPOINTMENT DETAILS:
Date: ${bookingDate}
Time: ${bookingTime} - ${endTime}
Client: ${validatedData.clientName}
Email: ${validatedData.clientEmail}
${validatedData.clientPhone ? `Phone: ${validatedData.clientPhone}\n` : ''}
${finalBooking?.googleMeetLink ? `\n🎥 VIDEO CALL:\nJoin via Google Meet: ${finalBooking.googleMeetLink}\n\n` : ''}⏰ REMINDERS:
• You'll receive a reminder email on the morning of your appointment
• Please join the video call 2-3 minutes early
• Ensure you have a reliable internet connection
• Have any questions or materials ready to discuss

Need to reschedule or have questions? Reply to this email.

Best regards,
${photographer.businessName}`
          });
          
          if (emailSuccess) {
            console.log(`✅ Booking confirmation email sent to ${validatedData.clientEmail} for booking ${booking.id}`);
          } else {
            console.error(`❌ Failed to send confirmation email to ${validatedData.clientEmail} for booking ${booking.id}`);
          }
        } else {
          console.warn(`📧 Email not sent - Missing photographer (${!!photographer}) or email (${!!validatedData.clientEmail}) for booking ${booking.id}`);
        }
      } catch (emailError) {
        console.error('❌ Booking confirmation email error:', emailError);
        // Don't fail the booking confirmation if email sending fails
      }
      
      // Handle automatic stage progression for first bookings
      if (booking.isFirstBooking && booking.clientId) {
        try {
          const stages = await storage.getStagesByPhotographer(booking.photographerId);
          const consultationStage = stages.find(s => s.name.toLowerCase().includes("consultation"));
          
          if (consultationStage) {
            await storage.updateContact(booking.clientId, {
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
  app.get("/api/availability", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const slots = await storage.getAvailabilitySlotsByPhotographer(req.user!.photographerId!);
      res.json(slots);
    } catch (error) {
      console.error('Get availability slots error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get generated time slots for a specific date
  app.get("/api/availability/slots/:date", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { date } = req.params;
      const photographerId = req.user!.photographerId!;
      
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD" });
      }
      
      // Generate slots for the specific date using the slot generation service
      const slots = await slotGenerationService.getSlotsForDate(photographerId, new Date(date));
      res.json(slots);
    } catch (error) {
      console.error('Get availability slots for date error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Old availability slot endpoints removed - replaced by template-based system
  // Use /api/availability/templates, /api/availability/overrides, and /api/availability/slots instead

  // Daily Availability Templates API routes for photographers
  app.get("/api/availability/templates", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const templates = await storage.getDailyAvailabilityTemplatesByPhotographer(photographerId);
      res.json(templates);
    } catch (error) {
      console.error('Get availability templates error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/availability/templates", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      
      // Inject photographerId before validation
      const templateData = insertDailyAvailabilityTemplateSchema.parse({
        ...req.body,
        photographerId
      });
      
      const template = await storage.createDailyAvailabilityTemplate(templateData);
      
      // Regenerate slots for this template if enabled
      if (template.isEnabled) {
        await slotGenerationService.regenerateSlotsForTemplate(template.id);
      }
      
      res.status(201).json(template);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error('Create availability template error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/availability/templates/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const template = await storage.getDailyAvailabilityTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Verify ownership
      if (template.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = insertDailyAvailabilityTemplateSchema.partial().parse(req.body);
      const updatedTemplate = await storage.updateDailyAvailabilityTemplate(req.params.id, updateData);
      
      // Regenerate slots for this template
      await slotGenerationService.regenerateSlotsForTemplate(updatedTemplate.id);
      
      res.json(updatedTemplate);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error('Update availability template error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/availability/templates/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const template = await storage.getDailyAvailabilityTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Verify ownership
      if (template.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete template (cascading delete handled in storage)
      await storage.deleteDailyAvailabilityTemplate(req.params.id);
      
      res.status(204).send();
    } catch (error) {
      console.error('Delete availability template error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Daily Availability Template Breaks API routes
  app.get("/api/availability/templates/:templateId/breaks", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const template = await storage.getDailyAvailabilityTemplate(req.params.templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Verify ownership
      if (template.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Access denied" });
      }

      const breaks = await storage.getDailyAvailabilityBreaksByTemplate(req.params.templateId);
      res.json(breaks);
    } catch (error) {
      console.error('Get template breaks error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/availability/templates/:templateId/breaks", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const template = await storage.getDailyAvailabilityTemplate(req.params.templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Verify ownership
      if (template.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Inject templateId before validation
      const breakData = insertDailyAvailabilityBreakSchema.parse({
        ...req.body,
        templateId: req.params.templateId
      });
      
      const breakTime = await storage.createDailyAvailabilityBreak(breakData);
      
      // Regenerate slots for this template
      await slotGenerationService.regenerateSlotsForTemplate(template.id);
      
      res.status(201).json(breakTime);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid break data", errors: error.errors });
      }
      console.error('Create template break error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/availability/breaks/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Get the break to verify ownership through template
      const breakTime = await storage.getDailyAvailabilityBreak(req.params.id);
      if (!breakTime) {
        return res.status(404).json({ message: "Break not found" });
      }
      
      // Verify ownership through template
      const template = await storage.getDailyAvailabilityTemplate(breakTime.templateId);
      if (!template || template.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData = insertDailyAvailabilityBreakSchema.partial().parse(req.body);
      const updatedBreak = await storage.updateDailyAvailabilityBreak(req.params.id, updateData);
      
      // Regenerate slots for this template
      await slotGenerationService.regenerateSlotsForTemplate(template.id);
      
      res.json(updatedBreak);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid break data", errors: error.errors });
      }
      console.error('Update template break error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/availability/breaks/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Get the break to verify ownership through template
      const breakTime = await storage.getDailyAvailabilityBreak(req.params.id);
      if (!breakTime) {
        return res.status(404).json({ message: "Break not found" });
      }
      
      // Verify ownership through template
      const template = await storage.getDailyAvailabilityTemplate(breakTime.templateId);
      if (!template || template.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteDailyAvailabilityBreak(req.params.id);
      
      // Regenerate slots for this template
      await slotGenerationService.regenerateSlotsForTemplate(template.id);
      
      res.status(204).send();
    } catch (error) {
      console.error('Delete template break error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Daily Availability Overrides API routes
  app.get("/api/availability/overrides", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      
      const overrides = await storage.getDailyAvailabilityOverridesByPhotographer(
        photographerId, 
        startDate, 
        endDate
      );
      res.json(overrides);
    } catch (error) {
      console.error('Get availability overrides error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/availability/overrides", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      
      // Inject photographerId before validation
      const overrideData = insertDailyAvailabilityOverrideSchema.parse({
        ...req.body,
        photographerId
      });
      
      const override = await storage.createDailyAvailabilityOverride(overrideData);
      
      // Regenerate slots for this specific date
      const date = new Date(override.date);
      await slotGenerationService.regenerateSlotsForDate(photographerId, date);
      
      res.status(201).json(override);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid override data", errors: error.errors });
      }
      console.error('Create availability override error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/availability/overrides/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const override = await storage.getDailyAvailabilityOverride(req.params.id);
      if (!override) {
        return res.status(404).json({ message: "Override not found" });
      }
      
      // Verify ownership
      if (override.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData = insertDailyAvailabilityOverrideSchema.partial().parse(req.body);
      const updatedOverride = await storage.updateDailyAvailabilityOverride(req.params.id, updateData);
      
      // Regenerate slots for this specific date
      const date = new Date(updatedOverride.date);
      await slotGenerationService.regenerateSlotsForDate(updatedOverride.photographerId, date);
      
      res.json(updatedOverride);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid override data", errors: error.errors });
      }
      console.error('Update availability override error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/availability/overrides/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const override = await storage.getDailyAvailabilityOverride(req.params.id);
      if (!override) {
        return res.status(404).json({ message: "Override not found" });
      }
      
      // Verify ownership
      if (override.photographerId !== req.user!.photographerId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteDailyAvailabilityOverride(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete availability override error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Slot Generation API routes
  app.post("/api/availability/generate", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { startDate, endDate, slotDurationMinutes = 60 } = req.body;
      const photographerId = req.user!.photographerId!;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      
      await slotGenerationService.generateSlotsForDateRange({
        photographerId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        slotDurationMinutes
      });
      
      res.json({ message: "Slots generated successfully" });
    } catch (error) {
      console.error('Generate availability slots error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Google Calendar OAuth routes for photographers
  app.get("/api/auth/google-calendar", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const returnUrl = req.query.returnUrl as string | undefined;
      
      // Build dynamic redirect URI based on current request's host (dev or prod)
      // Always use HTTPS for OAuth redirects (Replit domains use HTTPS)
      const redirectUri = `https://${req.get('host')}/api/auth/google-calendar/callback`;
      
      const authResult = await googleCalendarService.getAuthUrl(photographerId, returnUrl, redirectUri);
      
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
      console.log('🔵 Google Calendar OAuth callback hit!', { 
        hasCode: !!req.query.code, 
        hasState: !!req.query.state,
        query: req.query 
      });
      
      const { code, state } = req.query;
      
      // Build base URL from current request to redirect back to same domain (dev or prod)
      // Always use HTTPS for redirects (Replit domains use HTTPS)
      const baseUrl = `https://${req.get('host')}`;
      
      if (!code || !state) {
        console.error('❌ Missing code or state in callback');
        return res.redirect(`${baseUrl}/settings?google_error=missing_params`);
      }

      // Validate state parameter for CSRF protection
      const stateValidation = googleCalendarService.validateState(state as string);
      if (!stateValidation.valid || !stateValidation.photographerId) {
        console.error('❌ Invalid state validation');
        return res.redirect(`${baseUrl}/settings?google_error=invalid_state`);
      }

      const photographerId = stateValidation.photographerId;
      const returnUrl = stateValidation.returnUrl;
      
      // Use the same redirect URI for token exchange as we used for auth URL
      const redirectUri = `https://${req.get('host')}/api/auth/google-calendar/callback`;
      const result = await googleCalendarService.exchangeCodeForTokens(code as string, photographerId, redirectUri);
      
      if (result.success) {
        console.log('✅ Google Calendar connected successfully for photographer:', photographerId);
        // Redirect back to the original page with success indicator
        res.redirect(`${baseUrl}${returnUrl}?google_connected=true`);
      } else {
        console.error('❌ Token exchange failed:', result.error);
        res.redirect(`${baseUrl}${returnUrl}?google_error=${encodeURIComponent(result.error || 'unknown')}`);
      }
    } catch (error) {
      console.error('Google Calendar callback error:', error);
      const baseUrl = `https://${req.get('host')}`;
      res.redirect(`${baseUrl}/settings?google_error=callback_failed`);
    }
  });

  app.get("/api/calendar/status", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const isConfigured = googleCalendarService.isConfigured();
      const isAuthenticated = await googleCalendarService.isAuthenticated(photographerId);
      
      // Get connected email if authenticated
      let connectedEmail: string | undefined;
      if (isAuthenticated) {
        const credentials = await storage.getGoogleCalendarCredentials(photographerId);
        connectedEmail = credentials?.email;
      }
      
      res.json({
        configured: isConfigured,
        authenticated: isAuthenticated,
        email: connectedEmail,
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
  app.delete("/api/calendar/disconnect", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      await googleCalendarService.disconnect(photographerId);
      
      res.json({ message: "Google Calendar disconnected successfully" });
    } catch (error) {
      console.error('Calendar disconnect error:', error);
      res.status(500).json({ message: "Failed to disconnect calendar" });
    }
  });

  // === GALLERY INTEGRATION ROUTES ===

  // Update gallery platform selection
  app.put("/api/gallery/platform", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const { platform } = req.body;

      if (platform && platform !== "GOOGLE_DRIVE" && platform !== "SHOOTPROOF") {
        return res.status(400).json({ message: "Invalid platform. Must be GOOGLE_DRIVE or SHOOTPROOF" });
      }

      await storage.updatePhotographer(photographerId, { galleryPlatform: platform || null });
      res.json({ message: "Gallery platform updated successfully" });
    } catch (error) {
      console.error('Gallery platform update error:', error);
      res.status(500).json({ message: "Failed to update gallery platform" });
    }
  });

  // Get gallery integration status
  app.get("/api/gallery/status", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const photographer = await storage.getPhotographer(photographerId);
      
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      const googleDriveConnected = !!(photographer.googleDriveAccessToken && photographer.googleDriveRefreshToken);
      const shootproofConnected = !!(photographer.shootproofAccessToken && photographer.shootproofRefreshToken);

      res.json({
        platform: photographer.galleryPlatform || null,
        googleDrive: {
          connected: googleDriveConnected,
          email: photographer.googleDriveEmail || null,
          connectedAt: photographer.googleDriveConnectedAt || null
        },
        shootproof: {
          connected: shootproofConnected,
          email: photographer.shootproofEmail || null,
          studioId: photographer.shootproofStudioId || null,
          connectedAt: photographer.shootproofConnectedAt || null
        }
      });
    } catch (error) {
      console.error('Gallery status error:', error);
      res.status(500).json({ message: "Failed to get gallery status" });
    }
  });

  // Initiate Google Drive OAuth
  app.get("/api/auth/google-drive", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { OAuth2Client } = await import('google-auth-library');
      const photographerId = req.user!.photographerId!;

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(503).json({ 
          message: "Google Drive integration not configured. Please contact support." 
        });
      }

      // Build dynamic redirect URI based on current request's host (dev or prod)
      // Always use HTTPS for OAuth redirects (Replit domains use HTTPS)
      const redirectUri = `https://${req.get('host')}/api/auth/google-drive/callback`;
      
      const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

      const state = Buffer.from(JSON.stringify({ 
        photographerId,
        nonce: nanoid(),
        timestamp: Date.now()
      })).toString('base64url');

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/userinfo.email'],
        prompt: 'consent',
        state
      });

      console.log(`🔗 Google Drive OAuth initiated for photographer ${photographerId}`);
      console.log(`🔗 Redirect URI: ${redirectUri}`);
      res.json({ authUrl });
    } catch (error) {
      console.error('Google Drive auth URL error:', error);
      res.status(500).json({ message: "Failed to generate authorization URL" });
    }
  });

  // Google Drive OAuth callback
  app.get("/api/auth/google-drive/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      // Build base URL from current request to redirect back to same domain (dev or prod)
      // Always use HTTPS for redirects (Replit domains use HTTPS)
      const baseUrl = `https://${req.get('host')}`;
      
      if (!code || !state) {
        console.error('❌ Missing code or state in Google Drive callback');
        return res.redirect(`${baseUrl}/settings?google_drive_error=missing_params`);
      }

      const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      const photographerId = stateData.photographerId;

      const { OAuth2Client } = await import('google-auth-library');
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `https://${req.get('host')}/api/auth/google-drive/callback`;

      const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2Client.getToken(code as string);

      oauth2Client.setCredentials(tokens);

      const { google } = await import('googleapis');
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      await storage.updatePhotographer(photographerId, {
        googleDriveAccessToken: tokens.access_token || null,
        googleDriveRefreshToken: tokens.refresh_token || null,
        googleDriveTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleDriveEmail: userInfo.data.email || null,
        googleDriveConnectedAt: new Date()
      });

      console.log('✅ Google Drive connected successfully for photographer:', photographerId);
      res.redirect(`${baseUrl}/settings?google_drive_connected=true`);
    } catch (error) {
      console.error('Google Drive callback error:', error);
      const baseUrl = `https://${req.get('host')}`;
      res.redirect(`${baseUrl}/settings?google_drive_error=callback_failed`);
    }
  });

  // Disconnect Google Drive
  app.delete("/api/gallery/google-drive/disconnect", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      
      await storage.updatePhotographer(photographerId, {
        googleDriveAccessToken: null,
        googleDriveRefreshToken: null,
        googleDriveTokenExpiry: null,
        googleDriveEmail: null,
        googleDriveConnectedAt: null
      });

      res.json({ message: "Google Drive disconnected successfully" });
    } catch (error) {
      console.error('Google Drive disconnect error:', error);
      res.status(500).json({ message: "Failed to disconnect Google Drive" });
    }
  });

  // Initiate ShootProof OAuth
  app.get("/api/auth/shootproof", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const clientId = process.env.SHOOTPROOF_CLIENT_ID;

      if (!clientId) {
        return res.status(503).json({ 
          message: "ShootProof integration not configured. Please contact support." 
        });
      }

      const redirectUri = process.env.SHOOTPROOF_REDIRECT_URI || `https://${req.get('host')}/api/auth/shootproof/callback`;
      
      const state = Buffer.from(JSON.stringify({ 
        photographerId,
        nonce: nanoid(),
        timestamp: Date.now()
      })).toString('base64url');

      const authUrl = `https://api.shootproof.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;

      res.json({ authUrl });
    } catch (error) {
      console.error('ShootProof auth URL error:', error);
      res.status(500).json({ message: "Failed to generate authorization URL" });
    }
  });

  // ShootProof OAuth callback
  app.get("/api/auth/shootproof/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: red;">❌ Authorization Failed</h2>
              <p>Missing authorization code or state.</p>
            </body>
          </html>
        `);
      }

      const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      const photographerId = stateData.photographerId;

      const clientId = process.env.SHOOTPROOF_CLIENT_ID;
      const clientSecret = process.env.SHOOTPROOF_CLIENT_SECRET;
      const redirectUri = process.env.SHOOTPROOF_REDIRECT_URI || `https://${req.get('host')}/api/auth/shootproof/callback`;

      const tokenResponse = await fetch('https://api.shootproof.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const tokens = await tokenResponse.json();

      const userResponse = await fetch('https://api.shootproof.com/v2/studio', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      const userData = await userResponse.json();

      await storage.updatePhotographer(photographerId, {
        shootproofAccessToken: tokens.access_token,
        shootproofRefreshToken: tokens.refresh_token,
        shootproofTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        shootproofStudioId: userData.id || null,
        shootproofEmail: userData.email || null,
        shootproofConnectedAt: new Date()
      });

      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: green;">✅ ShootProof Connected Successfully!</h2>
            <p>Your gallery integration is now active. You can close this window.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('ShootProof callback error:', error);
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

  // Disconnect ShootProof
  app.delete("/api/gallery/shootproof/disconnect", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      
      await storage.updatePhotographer(photographerId, {
        shootproofAccessToken: null,
        shootproofRefreshToken: null,
        shootproofTokenExpiry: null,
        shootproofStudioId: null,
        shootproofEmail: null,
        shootproofConnectedAt: null
      });

      res.json({ message: "ShootProof disconnected successfully" });
    } catch (error) {
      console.error('ShootProof disconnect error:', error);
      res.status(500).json({ message: "Failed to disconnect ShootProof" });
    }
  });

  // Create gallery for a project
  app.post("/api/projects/:projectId/gallery/create", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { projectId } = req.params;
      const photographerId = req.user!.photographerId!;

      const { galleryService } = await import('./services/gallery');
      const result = await galleryService.createGallery(projectId, photographerId);

      res.json({ 
        message: "Gallery created successfully",
        galleryUrl: result.url,
        galleryId: result.id
      });
    } catch (error: any) {
      console.error('Gallery creation error:', error);
      res.status(500).json({ message: error.message || "Failed to create gallery" });
    }
  });

  // Mark gallery as ready and trigger GALLERY_SHARED automation
  app.post("/api/projects/:projectId/gallery/share", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { projectId } = req.params;
      const photographerId = req.user!.photographerId!;

      const project = await storage.getProject(projectId);
      
      if (!project || project.photographerId !== photographerId) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.galleryUrl) {
        return res.status(400).json({ message: "No gallery URL set for this project" });
      }

      await storage.updateProject(projectId, {
        galleryReady: true,
        gallerySharedAt: new Date()
      });

      // Trigger GALLERY_SHARED automation
      await processAutomations("GALLERY_SHARED", projectId, photographerId);

      res.json({ message: "Gallery marked as ready and automation triggered" });
    } catch (error) {
      console.error('Gallery share error:', error);
      res.status(500).json({ message: "Failed to share gallery" });
    }
  });

  // Update gallery URL manually (fallback for photographers using other platforms)
  app.put("/api/projects/:projectId/gallery", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { galleryUrl } = req.body;
      const photographerId = req.user!.photographerId!;

      const project = await storage.getProject(projectId);
      
      if (!project || project.photographerId !== photographerId) {
        return res.status(404).json({ message: "Project not found" });
      }

      await storage.updateProject(projectId, {
        galleryUrl,
        galleryCreatedAt: new Date()
      });

      res.json({ message: "Gallery URL updated successfully" });
    } catch (error) {
      console.error('Gallery URL update error:', error);
      res.status(500).json({ message: "Failed to update gallery URL" });
    }
  });

  // === QUESTIONNAIRE TEMPLATE ROUTES ===

  // Get questionnaire templates for photographer
  app.get("/api/questionnaire-templates", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const templates = await storage.getQuestionnaireTemplatesByPhotographer(req.user!.photographerId!);
      res.json(templates);
    } catch (error) {
      console.error('Failed to fetch questionnaire templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Get single questionnaire template
  app.get("/api/questionnaire-templates/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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
  app.post("/api/questionnaire-templates", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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
  app.put("/api/questionnaire-templates/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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
  app.delete("/api/questionnaire-templates/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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
  app.get("/api/questionnaire-templates/:templateId/questions", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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
  app.post("/api/questionnaire-templates/:templateId/questions", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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
  app.put("/api/questionnaire-questions/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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
  app.delete("/api/questionnaire-questions/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  // Project Questionnaire Assignment Routes
  
  // Assign questionnaire template to a project
  app.post("/api/projects/:projectId/questionnaires", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { templateId } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
      }
      
      // Verify project belongs to photographer
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Verify template belongs to photographer
      const template = await storage.getQuestionnaireTemplate(templateId);
      if (!template || template.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Template access denied' });
      }
      
      // Check if already assigned
      const existing = await storage.getProjectQuestionnairesByProject(req.params.projectId);
      const alreadyAssigned = existing.find(q => q.templateId === templateId);
      
      if (alreadyAssigned) {
        return res.status(409).json({ error: 'Template already assigned to this project' });
      }
      
      const assignment = await storage.assignQuestionnaireToProject(req.params.projectId, templateId);
      
      // Add activity log entry for questionnaire assignment
      await storage.addProjectActivityLog({
        projectId: req.params.projectId,
        action: "ASSIGNED",
        activityType: "QUESTIONNAIRE_ASSIGNED",
        title: "Questionnaire Assigned",
        description: `Questionnaire "${template.title}" was assigned to this project`,
        relatedId: assignment.id,
        relatedType: "QUESTIONNAIRE"
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Failed to assign questionnaire:', error);
      res.status(500).json({ error: 'Failed to assign questionnaire' });
    }
  });
  
  // Get questionnaires assigned to a project - with template details
  app.get("/api/projects/:projectId/questionnaires", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Verify project belongs to photographer
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const questionnaires = await storage.getProjectQuestionnairesWithTemplates(req.params.projectId);
      res.json(questionnaires);
    } catch (error) {
      console.error('Failed to fetch project questionnaires:', error);
      res.status(500).json({ error: 'Failed to fetch questionnaires' });
    }
  });
  
  // Get all questionnaire assignments for photographer
  app.get("/api/questionnaire-assignments", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const assignments = await storage.getProjectQuestionnairesByPhotographer(req.user!.photographerId);
      res.json(assignments);
    } catch (error) {
      console.error('Failed to fetch questionnaire assignments:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  });
  
  // Update questionnaire assignment (e.g., mark as completed, save answers)
  app.put("/api/questionnaire-assignments/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Get assignment and verify ownership
      const assignment = await storage.getProjectQuestionnaire(req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
      
      // Verify project belongs to photographer
      const project = await storage.getProject(assignment.projectId);
      if (!project || project.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Validate and whitelist only mutable fields to prevent authorization bypass
      const updateSchema = z.object({
        answers: z.any().optional(),
        submittedAt: z.string().datetime().optional().nullable()
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      const updated = await storage.updateProjectQuestionnaire(req.params.id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update questionnaire assignment:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid update data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update assignment' });
    }
  });
  
  // Delete questionnaire assignment
  app.delete("/api/questionnaire-assignments/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      // Get assignment and verify ownership
      const assignment = await storage.getProjectQuestionnaire(req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
      
      // Verify project belongs to photographer
      const project = await storage.getProject(assignment.projectId);
      if (!project || project.photographerId !== req.user!.photographerId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      await storage.deleteProjectQuestionnaire(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete questionnaire assignment:', error);
      res.status(500).json({ error: 'Failed to delete assignment' });
    }
  });

  // Client Portal Data
  app.get("/api/client-portal", authenticateToken, async (req, res) => {
    try {
      // For now, assume user is a client - in production you'd have proper client auth
      const clientId = req.user!.id; // This should be the client ID in a real implementation
      
      // Get client's own projects
      const ownProjects = await storage.getProjectsByClient(clientId);
      
      // Get projects where user is a participant
      const participantProjects = await storage.getProjectsByParticipant(clientId);
      
      // Combine all projects
      const allProjects = [
        ...ownProjects.map(p => ({ ...p, role: 'PRIMARY' as const })),
        ...participantProjects.map(p => ({ ...p, role: 'PARTICIPANT' as const }))
      ];
      
      if (allProjects.length === 0) {
        return res.status(404).json({ error: 'No projects found for client' });
      }
      
      // Use the first project for client portal data
      const project = allProjects[0];
      
      // Get questionnaires for this client's projects
      const questionnaires = await storage.getQuestionnairesByClient(clientId);
      
      // Format questionnaires for client portal
      const formattedQuestionnaires = questionnaires.map(q => ({
        id: q.id,
        template: {
          title: q.templateTitle,
          description: q.templateDescription
        },
        status: q.submittedAt ? 'COMPLETED' : 'PENDING',
        completedAt: q.submittedAt
      }));
      
      // Format projects for display
      const formattedProjects = allProjects.map(p => ({
        id: p.id,
        title: p.title,
        projectType: p.projectType,
        eventDate: p.eventDate,
        status: p.status,
        role: p.role,
        stage: p.stage ? { name: p.stage.name } : undefined,
        primaryClient: {
          firstName: p.contact.firstName,
          lastName: p.contact.lastName,
          email: p.contact.email
        }
      }));
      
      const portalData = {
        contact: {
          firstName: project.contact.firstName,
          lastName: project.contact.lastName,
          email: project.contact.email,
          phone: project.contact.phone,
          weddingDate: project.eventDate,
          stage: project.stage ? { name: project.stage.name } : { name: 'Unknown' }
        },
        photographer: {
          businessName: "Wedding Photography Studio", // This would come from photographer data
          logoUrl: undefined
        },
        projects: formattedProjects,
        questionnaires: formattedQuestionnaires,
        checklistItems: [], // TODO: Implement checklist items
        links: [], // TODO: Implement client links
        bookings: [] // TODO: Implement bookings for client
      };
      
      res.json(portalData);
    } catch (error) {
      console.error('Failed to fetch client portal data:', error);
      res.status(500).json({ error: 'Failed to fetch client portal data' });
    }
  });

  // Dedicated CORS middleware for public endpoints
  const publicCorsMiddleware = (req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Vary", "Origin");
    
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  };

  // Apply CORS middleware to all public routes
  app.use("/api/public/*", publicCorsMiddleware);

  // Public endpoint to fetch lead form configuration by token (no auth required)
  app.get("/api/public/lead-forms/:formToken", async (req, res) => {
    try {
      const { formToken } = req.params;
      
      const form = await storage.getLeadFormByToken(formToken);
      if (!form || form.status !== 'ACTIVE') {
        return res.status(404).json({ 
          success: false,
          message: "Form not found or inactive" 
        });
      }
      
      const photographer = await storage.getPhotographer(form.photographerId);
      
      res.json({
        ...form,
        photographerName: photographer?.businessName || 'The Photo CRM'
      });
    } catch (error) {
      console.error("[GET FORM CONFIG ERROR]", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch form configuration" 
      });
    }
  });

  // Public lead form submission endpoint (no authentication required)
  app.post("/api/public/forms/:formToken/submit", async (req, res) => {
    try {
      const { formToken } = req.params;
      
      // Find form by public token
      const form = await storage.getLeadFormByToken(formToken);
      if (!form || form.status !== 'ACTIVE') {
        return res.status(404).json({ 
          success: false,
          message: "Form not found or inactive" 
        });
      }
      
      // Get photographer info
      const photographer = await storage.getPhotographer(form.photographerId);
      if (!photographer) {
        return res.status(404).json({ 
          success: false,
          message: "Photographer not found" 
        });
      }
      
      // Extract required fields and custom field data
      const requiredFields = {
        firstName: z.string().min(1, "First name is required"),
        email: z.string().email("Valid email is required"),
      };
      
      const baseSchema = z.object(requiredFields);
      const baseData = baseSchema.parse(req.body);
      
      // Get all custom field values
      const customFieldData = { ...req.body };
      delete customFieldData.firstName;
      delete customFieldData.email;
      
      // Get form config to map custom fields to core fields
      const formConfig = form.config as any;
      const customFields = formConfig?.customFields || [];
      
      // Map custom fields of specific types to core client fields
      let phone = req.body.phone || '';
      let lastName = req.body.lastName || '';
      let eventDate = req.body.eventDate || '';
      let message = req.body.message || '';
      
      // Find and map phone field from custom fields
      const phoneField = customFields.find((f: any) => f.type === 'phone');
      if (phoneField && req.body[phoneField.id]) {
        phone = req.body[phoneField.id];
      }
      
      // Find and map date field from custom fields  
      const dateField = customFields.find((f: any) => f.type === 'date');
      if (dateField && req.body[dateField.id]) {
        eventDate = req.body[dateField.id];
      }
      
      // Find and map textarea/message field from custom fields
      const textareaField = customFields.find((f: any) => f.type === 'textarea');
      if (textareaField && req.body[textareaField.id]) {
        message = req.body[textareaField.id];
      }
      
      const emailOptIn = req.body.emailOptIn !== undefined ? req.body.emailOptIn : true;
      const smsOptIn = req.body.smsOptIn !== undefined ? req.body.smsOptIn : true;
      
      const submissionData = {
        ...baseData,
        lastName,
        phone,
        eventDate,
        message,
        emailOptIn,
        smsOptIn,
        customFields: customFieldData
      };
      
      // Apply photographer's default opt-in settings
      const finalEmailOptIn = submissionData.emailOptIn ?? photographer.defaultEmailOptIn ?? true;
      const finalSmsOptIn = submissionData.smsOptIn ?? photographer.defaultSmsOptIn ?? false;
      
      // Check if client already exists (by photographer + email)
      let contact = await storage.getContactByEmail(submissionData.email, photographer.id);
      
      if (!contact) {
        // Create new client with contact information from lead form
        contact = await storage.createContact({
          photographerId: photographer.id,
          firstName: submissionData.firstName,
          lastName: submissionData.lastName,
          email: submissionData.email,
          phone: submissionData.phone,
          leadSource: `LEAD_FORM:${form.id}`, // Track which form captured this lead
          projectType: form.projectType
        });
      } else {
        // Update existing client info if provided
        if (submissionData.phone && submissionData.phone !== contact.phone) {
          await storage.updateContact(contact.id, { phone: submissionData.phone });
          contact = { ...contact, phone: submissionData.phone };
        }
      }
      
      // Create project with form's configured project type and submission data
      const project = await storage.createProject({
        photographerId: photographer.id,
        clientId: contact.id,
        title: `${form.projectType.toLowerCase().replace(/_/g, ' ')} for ${submissionData.firstName} ${submissionData.lastName}`,
        projectType: form.projectType,
        eventDate: submissionData.eventDate && !isNaN(Date.parse(submissionData.eventDate)) ? new Date(submissionData.eventDate) : undefined,
        leadSource: "WEBSITE_WIDGET",
        notes: submissionData.message,
        emailOptIn: finalEmailOptIn,
        smsOptIn: finalSmsOptIn,
        leadFormId: form.id,
        formSubmissionData: customFieldData
      });
      
      // Increment form submission count
      await storage.updateLeadForm(form.id, { 
        submissionCount: (form.submissionCount || 0) + 1 
      });
      
      console.log(`[FORM AUTOMATION] Form submitted. Automations will process this project based on stage: ${project.stageId}`);
      
      res.status(201).json({ 
        success: true, 
        message: "Form submitted successfully",
        clientId: contact.id,
        projectId: project.id,
        redirectUrl: (form.config as any)?.redirectUrl || ''
      });
      
    } catch (error: any) {
      console.error("[FORM SUBMISSION ERROR]", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false,
          message: "Validation error",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: "Failed to submit form" 
      });
    }
  });

  // Public widget API endpoint (no authentication required)
  app.post("/api/public/lead/:photographerToken", async (req, res) => {
    // CORS headers handled by middleware

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
      
      // Apply photographer's default opt-in settings if not explicitly provided
      const finalEmailOptIn = leadData.emailOptIn ?? photographer.defaultEmailOptIn ?? true;
      const finalSmsOptIn = leadData.smsOptIn ?? photographer.defaultSmsOptIn ?? false;
      
      // NEW: Create separate client and project records
      
      // 1. Create client with pure contact information
      const contact = await storage.createContact({
        photographerId: photographer.id,
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.email,
        phone: leadData.phone
      });
      
      // 2. Create project linked to the client
      const project = await storage.createProject({
        photographerId: photographer.id,
        clientId: contact.id,
        title: `${leadData.projectType.toLowerCase().replace(/_/g, ' ')} for ${leadData.firstName} ${leadData.lastName}`,
        projectType: leadData.projectType,
        eventDate: leadData.eventDate && !isNaN(Date.parse(leadData.eventDate)) ? new Date(leadData.eventDate) : undefined,
        leadSource: "WEBSITE_WIDGET",
        notes: leadData.message,
        emailOptIn: finalEmailOptIn,
        smsOptIn: finalSmsOptIn
        // stageId will be assigned automatically by createProject method
      });
      
      console.log(`[WIDGET AUTOMATION] Widget submission complete. Automations will process this project based on stage: ${project.stageId}`);
      
      res.status(201).json({ 
        success: true, 
        message: "Lead submitted successfully",
        clientId: contact.id,
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

  // Serve hosted widget JavaScript file
  app.get("/widget/embed.js", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Content-Type", "application/javascript");
    res.sendFile(path.resolve(process.cwd(), "server/public/widget-embed.js"));
  });

  // Serve form embed JavaScript file
  app.get("/widget/form-embed.js", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Content-Type", "application/javascript");
    res.sendFile(path.resolve(process.cwd(), "server/public/form-embed.js"));
  });

  // Public widget configuration API endpoint (no authentication required) 
  app.get("/api/public/widget/:photographerToken", async (req, res) => {
    // CORS headers handled by middleware

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

      // Return photographer's widget configuration with absolute API URL
      // Detect if we're behind a proxy (like Replit) and use HTTPS when appropriate
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const baseUrl = `${protocol}://${req.get('host')}`;
      
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
        apiEndpoint: `${baseUrl}/api/public/lead/${photographerToken}`
      });
    } catch (error) {
      console.error("Error fetching widget config:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch widget configuration" 
      });
    }
  });

  // Public booking calendar API - Get photographer info and templates for client booking
  app.get("/api/public/booking/calendar/:publicToken", async (req, res) => {
    try {
      const { publicToken } = req.params;
      
      // Find photographer by public token
      const photographer = await storage.getPhotographerByPublicToken(publicToken);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Get daily templates for this photographer
      const dailyTemplates = await storage.getDailyAvailabilityTemplatesByPhotographer(photographer.id);

      res.json({
        success: true,
        photographer: {
          id: photographer.id,
          businessName: photographer.businessName,
          timezone: photographer.timezone,
          brandPrimary: photographer.brandPrimary,
          profilePicture: photographer.profilePicture, // Add profile picture for branding
          logoUrl: photographer.logoUrl // Add logo for social sharing meta tags
        },
        dailyTemplates: dailyTemplates.filter(t => t.isEnabled) // Only return enabled templates
      });
    } catch (error) {
      console.error("Error fetching photographer info:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch photographer information" 
      });
    }
  });

  // Public booking calendar API - Get available slots for a specific date
  app.get("/api/public/booking/calendar/:publicToken/slots/:date", async (req, res) => {
    try {
      const { publicToken, date } = req.params;
      
      // Find photographer by public token
      const photographer = await storage.getPhotographerByPublicToken(publicToken);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD" });
      }

      // Generate slots for the specific date using the slot generation service
      const slots = await slotGenerationService.getSlotsForDate(photographer.id, new Date(date));
      
      // Filter out slots that are in the past
      const now = new Date();
      const futureSlots = slots.filter(slot => {
        const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
        return slotDateTime > now;
      });

      res.json({
        success: true,
        date,
        slots: futureSlots
      });
    } catch (error) {
      console.error('Get public availability slots for date error:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch available slots for this date" 
      });
    }
  });

  // Public booking calendar API - Book a time slot
  app.post("/api/public/booking/calendar/:publicToken/book/:date/:slotId", async (req, res) => {
    try {
      const { publicToken, date, slotId } = req.params;
      const { clientName, clientEmail, clientPhone, bookingNotes } = req.body;

      // Validate required fields
      if (!clientName || !clientEmail) {
        return res.status(400).json({ 
          message: "Client name and email are required" 
        });
      }

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD" });
      }

      // Parse slot ID to extract time range (format: "slot-09:00-10:00")
      const slotMatch = slotId.match(/^slot-(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      if (!slotMatch) {
        return res.status(400).json({ message: "Invalid slot format" });
      }

      const [, startTime, endTime] = slotMatch;

      // Find photographer by public token
      const photographer = await storage.getPhotographerByPublicToken(publicToken);
      if (!photographer) {
        return res.status(404).json({ message: "Photographer not found" });
      }

      // Verify the slot is actually available by checking templates
      const availableSlots = await slotGenerationService.getSlotsForDate(photographer.id, new Date(date));
      const requestedSlot = availableSlots.find(slot => slot.id === slotId);
      if (!requestedSlot) {
        return res.status(404).json({ message: "This time slot is not available" });
      }

      // Create start and end datetime objects
      const startAt = new Date(`${date}T${startTime}:00`);
      const endAt = new Date(`${date}T${endTime}:00`);

      // Check if slot is in the future
      if (startAt <= new Date()) {
        return res.status(400).json({ message: "Cannot book slots in the past" });
      }

      // Check if there's already a booking for this exact time slot
      const existingBookings = await storage.getBookingsByPhotographer(photographer.id);
      const conflictingBooking = existingBookings.find(booking => {
        const bookingStart = new Date(booking.startAt);
        const bookingEnd = new Date(booking.endAt);
        
        // Check for any time overlap
        return (startAt < bookingEnd && endAt > bookingStart);
      });

      if (conflictingBooking) {
        return res.status(400).json({ message: "This time slot is no longer available" });
      }

      // Helper function to format time from 24-hour to 12-hour format
      const formatTime12Hour = (time: string): string => {
        const [hours, minutes] = time.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      };

      // Create the booking
      const bookingData = {
        photographerId: photographer.id,
        title: `Consultation - ${formatTime12Hour(startTime)} to ${formatTime12Hour(endTime)}`,
        description: bookingNotes || `Booking consultation with ${clientName}`,
        startAt: startAt,
        endAt: endAt,
        status: "PENDING",
        bookingType: "CONSULTATION",
        isFirstBooking: true, // Public bookings are typically first bookings
        clientName,
        clientEmail,
        clientPhone
      };

      const booking = await storage.createBooking(bookingData);

      // Create calendar event if Google Calendar is connected
      try {
        const calendarResult = await createBookingCalendarEvent(
          photographer.id,
          {
            title: `Consultation - ${clientName}`,
            description: `Booking with ${clientName}\nEmail: ${clientEmail}\nPhone: ${clientPhone || 'Not provided'}\n\n${bookingNotes || ''}`,
            startTime: startAt,
            endTime: endAt,
            clientEmail: clientEmail,
            clientName: clientName,
            timeZone: photographer.timezone
          }
        );

        if (calendarResult.success && calendarResult.eventId) {
          await storage.updateBooking(booking.id, {
            googleCalendarEventId: calendarResult.eventId,
            googleMeetLink: calendarResult.googleMeetLink
          });
        }
      } catch (calendarError) {
        console.error("Failed to create calendar event:", calendarError);
        // Don't fail the booking if calendar creation fails
      }

      // Send booking confirmation email to client
      console.log(`📧 Attempting to send booking confirmation email for calendar booking ${booking.id}`);
      try {
        const bookingDate = new Date(booking.startAt).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: photographer.timezone || 'America/New_York'
        });
        
        const bookingTime = new Date(booking.startAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: photographer.timezone || 'America/New_York'
        });
        
        const endTimeStr = new Date(booking.endAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: photographer.timezone || 'America/New_York'
        });

        // Get the final booking to ensure we have the Google Meet link
        const finalBooking = await storage.getBooking(booking.id);
        console.log(`📧 Calendar booking photographer: ${photographer.businessName}, Client: ${clientEmail}, Meet Link: ${!!finalBooking?.googleMeetLink}`);
        
        // Get clientId from project if projectId exists
        let clientIdForEmail = null;
        if (booking.projectId) {
          const project = await storage.getProject(booking.projectId);
          clientIdForEmail = project?.clientId || null;
        }
        
        const emailSuccess = await sendEmail({
          to: clientEmail,
          from: `${photographer.businessName} <${process.env.SENDGRID_FROM_EMAIL}>`,
          replyTo: photographer.emailFromAddr || process.env.SENDGRID_FROM_EMAIL,
          subject: `📸 Your appointment with ${photographer.businessName} is confirmed!`,
          photographerId: photographer.id,
          clientId: clientIdForEmail || undefined,
          projectId: booking.projectId || undefined,
          source: 'MANUAL' as const,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">✅ Appointment Confirmed!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your consultation with ${photographer.businessName}</p>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #4a5568; margin-top: 0;">📅 Appointment Details</h2>
                
                <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${bookingDate}</p>
                  <p style="margin: 5px 0;"><strong>🕒 Time:</strong> ${bookingTime} - ${endTimeStr}</p>
                  <p style="margin: 5px 0;"><strong>👤 Client:</strong> ${clientName}</p>
                  <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${clientEmail}</p>
                  ${clientPhone ? `<p style="margin: 5px 0;"><strong>📞 Phone:</strong> ${clientPhone}</p>` : ''}
                </div>

                ${finalBooking?.googleMeetLink ? `
                  <div style="background: #e6fffa; border: 2px solid #38b2ac; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <h3 style="color: #2d3748; margin-top: 0;">🎥 Video Call Details</h3>
                    <p style="margin: 10px 0;">Join your appointment via Google Meet:</p>
                    <a href="${finalBooking.googleMeetLink}" 
                       style="background: #48bb78; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: 600; margin: 10px 0;">
                      🎥 Join Video Call
                    </a>
                    <p style="font-size: 14px; color: #718096; margin: 10px 0;">
                      <strong>Meeting Link:</strong> ${finalBooking.googleMeetLink}
                    </p>
                  </div>
                ` : ''}

                <div style="background: #fff5f5; border: 2px solid #fc8181; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #2d3748; margin-top: 0;">⏰ Important Reminders</h3>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>You'll receive a reminder email on the morning of your appointment</li>
                    <li>Please join the video call 2-3 minutes early</li>
                    <li>Make sure you have a reliable internet connection</li>
                    <li>Have any questions or materials ready to discuss</li>
                  </ul>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                  <p style="color: #718096; font-size: 14px; margin: 5px 0;">
                    Need to reschedule or have questions? Reply to this email or contact us directly.
                  </p>
                  <p style="color: #718096; font-size: 14px; margin: 5px 0;">
                    
Best regards,
${photographer.businessName}
                  </p>
                </div>
              </div>
            </div>
          `,
          text: `
Appointment Confirmed!

Your consultation with ${photographer.businessName} is confirmed for:

Date: ${bookingDate}
Time: ${bookingTime} - ${endTimeStr}
Client: ${clientName}
Email: ${clientEmail}
${clientPhone ? `Phone: ${clientPhone}` : ''}

${finalBooking?.googleMeetLink ? `Video Call Link: ${finalBooking.googleMeetLink}` : ''}

Important Reminders:
- You'll receive a reminder email on the morning of your appointment
- Please join the video call 2-3 minutes early
- Make sure you have a reliable internet connection
- Have any questions or materials ready to discuss

Need to reschedule or have questions? Reply to this email or contact us directly.

Best regards,
${photographer.businessName}
          `
        });
        
        if (emailSuccess) {
          console.log(`✅ Calendar booking confirmation email sent to ${clientEmail} for booking ${booking.id}`);
        } else {
          console.error(`❌ Failed to send calendar booking confirmation email to ${clientEmail} for booking ${booking.id}`);
        }
      } catch (emailError) {
        console.error('❌ Calendar booking confirmation email error:', emailError);
        // Don't fail the booking confirmation if email sending fails
      }

      res.json({
        success: true,
        booking: {
          id: booking.id,
          bookingToken: booking.bookingToken,
          title: booking.title,
          startAt: booking.startAt,
          endAt: booking.endAt,
          status: booking.status
        },
        message: "Booking created successfully! You'll receive a confirmation email shortly."
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to create booking" 
      });
    }
  });

  // Short Link API - Create short link for booking calendar
  app.post("/api/short-links", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const { targetUrl, linkType } = req.body;

      // Generate a unique 6-character short code
      const generateShortCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      // Try to generate a unique code
      let shortCode = generateShortCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await storage.getShortLink(shortCode);
        if (!existing) break;
        shortCode = generateShortCode();
        attempts++;
      }

      if (attempts >= 10) {
        return res.status(500).json({ message: "Failed to generate unique short code" });
      }

      const shortLink = await storage.createShortLink({
        photographerId,
        shortCode,
        targetUrl,
        linkType: linkType || 'BOOKING'
      });

      res.json({
        ...shortLink,
        shortUrl: `${req.protocol}://${req.get('host')}/s/${shortCode}`
      });
    } catch (error: any) {
      console.error('Error creating short link:', error);
      res.status(500).json({ message: "Failed to create short link" });
    }
  });

  // Public redirect route for short links
  app.get("/s/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const shortLink = await storage.getShortLink(code);

      if (!shortLink) {
        return res.status(404).send("Short link not found");
      }

      // Increment click counter
      await storage.incrementShortLinkClicks(code);

      // Redirect to target URL
      res.redirect(301, shortLink.targetUrl);
    } catch (error: any) {
      console.error('Error redirecting short link:', error);
      res.status(500).send("Error processing redirect");
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
  app.post("/api/stripe-connect/create-account", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.post("/api/stripe-connect/create-onboarding-link", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.get("/api/stripe-connect/account-status", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.get("/api/stripe-connect/balance", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.post("/api/stripe-connect/create-payout", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.get("/api/stripe-connect/earnings", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  app.get("/api/stripe-connect/payouts", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
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

  // ============================================
  // INBOX ROUTES
  // ============================================

  // Get all SMS conversations for photographer
  app.get("/api/inbox/conversations", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const conversations = await storage.getInboxConversations(photographerId);
      res.json(conversations);
    } catch (error: any) {
      console.error('Error fetching inbox conversations:', error);
      res.status(500).json({ 
        message: "Failed to get conversations",
        error: error.message 
      });
    }
  });

  // Get message thread for a specific contact
  app.get("/api/inbox/thread/:contactId", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const { contactId } = req.params;

      console.log(`📨 Fetching thread for contactId: ${contactId}, photographerId: ${photographerId}`);

      // Verify contact belongs to photographer
      const contact = await storage.getContact(contactId);
      if (!contact || contact.photographerId !== photographerId) {
        console.log(`❌ Contact not found or doesn't belong to photographer`);
        return res.status(404).json({ message: "Contact not found" });
      }

      const thread = await storage.getInboxThread(contactId, photographerId);
      console.log(`📬 Thread fetched: ${thread.length} messages found`);
      res.json(thread);
    } catch (error: any) {
      console.error('Error fetching inbox thread:', error);
      res.status(500).json({ 
        message: "Failed to get thread",
        error: error.message 
      });
    }
  });

  // Send SMS message
  app.post("/api/inbox/send-sms", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const { contactId, message } = req.body;

      if (!contactId || !message) {
        return res.status(400).json({ message: "Contact ID and message are required" });
      }

      // Verify contact belongs to photographer
      const contact = await storage.getContact(contactId);
      if (!contact || contact.photographerId !== photographerId) {
        return res.status(404).json({ message: "Contact not found" });
      }

      if (!contact.phone) {
        return res.status(400).json({ message: "Contact has no phone number" });
      }

      // Send SMS
      const result = await sendSms({
        to: contact.phone,
        body: message
      });

      if (!result.success) {
        return res.status(500).json({ 
          message: "Failed to send SMS",
          error: result.error 
        });
      }

      // Log the SMS
      await storage.createSmsLog({
        clientId: contactId,
        status: 'sent',
        providerId: result.sid,
        sentAt: new Date(),
        direction: 'OUTBOUND',
        fromPhone: process.env.SIMPLETEXTING_PHONE_NUMBER || '',
        toPhone: contact.phone,
        messageBody: message
      });

      // Log SMS to project activity if contact has a project
      const contactWithProjects = await storage.getContact(contactId);
      const latestProject = contactWithProjects?.projects?.[0];
      if (latestProject) {
        const messagePreview = message.length > 100 ? message.substring(0, 100) + '...' : message;
        await storage.addProjectActivityLog({
          projectId: latestProject.id,
          activityType: 'SMS_SENT',
          action: 'SENT',
          title: `SMS sent to ${contact.firstName} ${contact.lastName}`,
          description: messagePreview,
          relatedId: result.sid,
          relatedType: 'SMS_LOG'
        });
      }

      // Mark conversation as read (since photographer just sent a message)
      await storage.markConversationAsRead(photographerId, contactId);

      res.json({ 
        success: true,
        message: "SMS sent successfully",
        sid: result.sid 
      });

    } catch (error: any) {
      console.error('Error sending SMS:', error);
      res.status(500).json({ 
        message: "Failed to send SMS",
        error: error.message 
      });
    }
  });

  // Mark conversation as read
  app.post("/api/inbox/mark-read/:contactId", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const { contactId } = req.params;

      // Verify contact belongs to photographer
      const contact = await storage.getContact(contactId);
      if (!contact || contact.photographerId !== photographerId) {
        return res.status(404).json({ message: "Contact not found" });
      }

      await storage.markConversationAsRead(photographerId, contactId);
      res.json({ success: true });

    } catch (error: any) {
      console.error('Error marking conversation as read:', error);
      res.status(500).json({ 
        message: "Failed to mark as read",
        error: error.message 
      });
    }
  });

  // Get unread SMS count
  app.get("/api/inbox/unread-count", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const unreadCount = await storage.getUnreadCount(photographerId);
      res.json({ unreadCount });
    } catch (error: any) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ 
        message: "Failed to get unread count",
        error: error.message 
      });
    }
  });

  // Test SMS endpoint - send a test message to verify Twilio integration
  app.post("/api/test-sms", authenticateToken, requirePhotographer, async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const testMessage = message || "🎉 Twilio is working! This is a test SMS from Lazy Photog.";

      console.log('Sending test SMS to:', phoneNumber);

      // Send SMS
      const result = await sendSms({
        to: phoneNumber,
        body: testMessage
      });

      if (!result.success) {
        return res.status(500).json({ 
          message: "Failed to send test SMS",
          error: result.error 
        });
      }

      res.json({ 
        success: true,
        message: "Test SMS sent successfully! Check your phone.",
        sid: result.sid 
      });

    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      res.status(500).json({ 
        message: "Failed to send test SMS",
        error: error.message 
      });
    }
  });

  // ==================== AD CAMPAIGNS ROUTES ====================

  // Get all ad campaigns for photographer
  app.get("/api/ad-campaigns", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const campaigns = await storage.getAdCampaigns(photographerId);
      res.json(campaigns);
    } catch (error: any) {
      console.error('Error getting ad campaigns:', error);
      res.status(500).json({ 
        message: "Failed to get ad campaigns",
        error: error.message 
      });
    }
  });

  // Create new ad campaign
  app.post("/api/ad-campaigns", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      
      const { platform, monthlyBudgetCents, markupPercent } = req.body;
      
      if (!platform || !monthlyBudgetCents || !markupPercent) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if photographer has a payment method
      const paymentMethods = await storage.getAdPaymentMethods(photographerId);
      if (paymentMethods.length === 0) {
        return res.status(400).json({ message: "Payment method required" });
      }

      // Create campaign
      const campaign = await storage.createAdCampaign({
        photographerId,
        platform,
        status: 'DRAFT',
        monthlyBudgetCents,
        markupPercent
      });

      res.json(campaign);
    } catch (error: any) {
      console.error('Error creating ad campaign:', error);
      res.status(500).json({ 
        message: "Failed to create ad campaign",
        error: error.message 
      });
    }
  });

  // Update ad campaign
  app.patch("/api/ad-campaigns/:id", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const { id } = req.params;

      // Verify campaign belongs to photographer
      const campaign = await storage.getAdCampaign(id);
      if (!campaign || campaign.photographerId !== photographerId) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const updated = await storage.updateAdCampaign(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating ad campaign:', error);
      res.status(500).json({ 
        message: "Failed to update ad campaign",
        error: error.message 
      });
    }
  });

  // Get payment methods for photographer
  app.get("/api/ad-payment-methods", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      const paymentMethods = await storage.getAdPaymentMethods(photographerId);
      res.json(paymentMethods);
    } catch (error: any) {
      console.error('Error getting payment methods:', error);
      res.status(500).json({ 
        message: "Failed to get payment methods",
        error: error.message 
      });
    }
  });

  // Add payment method
  app.post("/api/ad-payment-methods", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const photographerId = req.user!.photographerId!;
      
      const { stripePaymentMethodId, cardBrand, cardLast4, cardExpMonth, cardExpYear } = req.body;
      
      if (!stripePaymentMethodId) {
        return res.status(400).json({ message: "Payment method ID required" });
      }

      const paymentMethod = await storage.createAdPaymentMethod({
        photographerId,
        stripePaymentMethodId,
        cardBrand,
        cardLast4,
        cardExpMonth,
        cardExpYear,
        isDefault: true
      });

      res.json(paymentMethod);
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      res.status(500).json({ 
        message: "Failed to add payment method",
        error: error.message 
      });
    }
  });

  // ==================== CHATBOT ROUTES ====================

  // Chatbot message handler (public endpoint - optional auth)
  app.post("/api/chatbot", async (req, res) => {
    try {
      const { message, context = "general", photographerName, history = [] } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      // Check if user is authenticated (optional)
      let photographerId: string | undefined;
      const token = req.cookies?.token;
      if (token) {
        try {
          const jwt = await import('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          photographerId = decoded.photographerId;
        } catch {
          // Token invalid or expired - continue without auth
        }
      }

      const { getChatbotResponse } = await import("./services/chatbot");
      const response = await getChatbotResponse(message, context, photographerName, history, photographerId);
      
      res.json({ message: response });
    } catch (error: any) {
      console.error('Chatbot error:', error);
      res.status(500).json({ 
        message: "Failed to get response",
        error: error.message 
      });
    }
  });

  // AI Creation Endpoints - Authenticated chatbot actions
  app.post("/api/chatbot/create-lead-form", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { name, description, projectType = "WEDDING", fields = [] } = req.body;
      const photographerId = req.user!.photographerId!;
      
      // Build default config for a wedding inquiry form
      const defaultConfig = {
        title: name || "Wedding Inquiry Form",
        description: description || "Let's discuss your wedding photography needs",
        primaryColor: "#3b82f6",
        backgroundColor: "#ffffff",
        buttonText: "Send Inquiry",
        successMessage: "Thank you! We'll be in touch soon.",
        showPhone: true,
        showMessage: true,
        showEventDate: true,
        redirectUrl: "",
        customFields: fields.length > 0 ? fields : [
          { id: "firstName", type: "text", label: "First Name", placeholder: "Jane", required: true, isSystem: true, width: "half" },
          { id: "lastName", type: "text", label: "Last Name", placeholder: "Smith", required: true, isSystem: true, width: "half" },
          { id: "email", type: "email", label: "Email", placeholder: "jane@example.com", required: true, isSystem: true, width: "full" },
          { id: "phone", type: "phone", label: "Phone", placeholder: "(555) 123-4567", required: true, isSystem: false, width: "full" },
          { id: "eventDate", type: "date", label: "Wedding Date", required: false, isSystem: false, width: "half" },
          { id: "venue", type: "text", label: "Venue Name", placeholder: "e.g. The Grand Hotel", required: false, isSystem: false, width: "half" },
          { id: "message", type: "textarea", label: "Tell us about your wedding", placeholder: "Share any details...", required: false, isSystem: false, width: "full" },
          { id: "optInSms", type: "checkbox", label: "I agree to receive SMS updates", required: false, options: ["Yes, text me updates"], isSystem: false, width: "full" }
        ]
      };

      const leadForm = await storage.createLeadForm({
        photographerId,
        name: name || "Wedding Inquiry Form",
        description: description || "AI-generated wedding inquiry form",
        projectType: projectType as any,
        config: defaultConfig,
        status: "ACTIVE"
      });

      res.status(201).json({
        success: true,
        form: leadForm,
        shareLink: `${process.env.REPLIT_DOMAINS?.split(',')[0] || ''}/f/${leadForm.publicToken}`,
        message: "Lead form created successfully!"
      });
    } catch (error: any) {
      console.error('AI create lead form error:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to create lead form",
        error: error.message 
      });
    }
  });

  app.post("/api/chatbot/create-contact", authenticateToken, requirePhotographer, requireActiveSubscription, async (req, res) => {
    try {
      const { firstName, lastName, email, phone, projectType = "WEDDING" } = req.body;
      const photographerId = req.user!.photographerId!;
      
      if (!firstName || !email) {
        return res.status(400).json({ 
          success: false,
          message: "First name and email are required" 
        });
      }

      // Get the photographer's first stage
      const stages = await storage.getStagesByPhotographer(photographerId);
      const firstStage = stages.find(s => s.order === 1) || stages[0];

      if (!firstStage) {
        return res.status(400).json({ 
          success: false,
          message: "No pipeline stages found. Please set up your pipeline first." 
        });
      }

      const contact = await storage.createContact({
        photographerId,
        firstName,
        lastName: lastName || "",
        email,
        phone: phone || null,
        currentStageId: firstStage.id,
        projectType: projectType as any,
        leadSource: "AI_ASSISTANT"
      });

      res.status(201).json({
        success: true,
        contact,
        message: `Contact ${firstName} ${lastName || ''} added to ${firstStage.name}!`
      });
    } catch (error: any) {
      console.error('AI create contact error:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to create contact",
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
