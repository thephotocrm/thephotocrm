import { db } from './db';
import { DatabaseStorage } from './storage';

const storage = new DatabaseStorage(db);
const photographerId = 'demo-photog-test-2025';

async function setupGalleryDeliveredAutomations() {
  try {
    console.log('🚀 Setting up Gallery Delivered automations for demo@lazyphotog.test...\n');
    
    // Get stages
    const stages = await storage.getStagesByPhotographer(photographerId, "WEDDING");
    const galleryDeliveredStage = stages.find(s => s.name === "Gallery Delivered");
    
    if (!galleryDeliveredStage) {
      throw new Error("Gallery Delivered stage not found");
    }

    console.log(`✓ Found Gallery Delivered stage: ${galleryDeliveredStage.id}\n`);

    // Delete old automations for this stage
    console.log('Cleaning up old Gallery Delivered automations...');
    const existingAutomations = await storage.getAutomationsByPhotographer(photographerId, "WEDDING");
    const oldAutomations = existingAutomations.filter(a => 
      a.stageId === galleryDeliveredStage.id
    );
    
    for (const auto of oldAutomations) {
      try {
        await storage.deleteAutomation(auto.id);
        console.log(`  ✓ Deleted: ${auto.name}`);
      } catch (err) {
        console.log(`  ! Could not delete ${auto.name}, will create new ones anyway`);
      }
    }

    console.log('\n📧 Creating Gallery Delivered automation sequence...\n');

    // 1️⃣ Instant Email: Gallery Delivery Welcome
    const a1 = await storage.createAutomation({
      photographerId,
      name: "Gallery Delivery - Instant Welcome Email",
      description: "Welcome email with gallery link sent immediately when gallery is delivered",
      automationType: "COMMUNICATION",
      stageId: galleryDeliveredStage.id,
      channel: "EMAIL",
      projectType: "WEDDING",
      enabled: true,
      useEmailBuilder: true,
      subject: "Your wedding gallery is here ✨",
      emailBlocks: [
        {
          type: "HEADING",
          content: "Your Wedding Gallery is Ready!",
          level: 1
        },
        {
          type: "TEXT",
          content: "Hi {{first_name}},<br><br>It's here — your full wedding gallery!<br><br>You can view and download your images in full resolution, share the gallery with friends and family, and order beautiful prints and albums directly from the link.<br><br>Your gallery will remain active for {{gallery_expiration}} months. I recommend downloading everything soon so you have a backup."
        },
        {
          type: "BUTTON",
          text: "View Your Gallery",
          url: "{{gallery_link}}",
          style: "primary"
        },
        {
          type: "SPACER",
          height: 20
        },
        {
          type: "TEXT",
          content: "Enjoy reliving your day — and thank you again for letting me capture it.<br><br>– {{photographer_name}}"
        }
      ]
    });

    console.log(`1️⃣  Instant Email (Gallery Welcome) - CREATED`);

    // 2️⃣ SMS Reminder (+15 min) - COMMUNICATION automation with delay
    const a2 = await storage.createAutomation({
      photographerId,
      name: "Gallery Delivery - 15min SMS Reminder",
      description: "Quick SMS reminder 15 minutes after gallery delivery",
      automationType: "COMMUNICATION",
      stageId: galleryDeliveredStage.id,
      channel: "SMS",
      projectType: "WEDDING",
      enabled: true
    });

    await storage.createAutomationStep({
      automationId: a2.id,
      stepIndex: 0,
      delayMinutes: 15,
      actionType: "SMS",
      customSmsContent: "Hey {{first_name}}! Your wedding gallery is ready 🥳 Check your email for the link and enjoy reliving your day! – {{photographer_name}}",
      enabled: true
    });

    console.log(`2️⃣  SMS Reminder (T=15min) - CREATED`);

    // 3️⃣ Print Upsell Email (+3 days) - COMMUNICATION automation with delay
    const a3 = await storage.createAutomation({
      photographerId,
      name: "Gallery Delivery - 3 Day Print Upsell",
      description: "Print and album upsell email sent 3 days after gallery delivery",
      automationType: "COMMUNICATION",
      stageId: galleryDeliveredStage.id,
      channel: "EMAIL",
      projectType: "WEDDING",
      enabled: true,
      useEmailBuilder: true,
      subject: "Let's turn your favorite photos into something tangible 💎",
      emailBlocks: [
        {
          type: "HEADING",
          content: "Ready to See Your Favorites in Print?",
          level: 1
        },
        {
          type: "TEXT",
          content: "Hi {{first_name}},<br><br>Now that you've seen your gallery (so many favorites, right?), this is the perfect time to create your wedding album or wall art.<br><br>Here's a special bonus: <strong>10% off albums and prints for the next 7 days</strong>.<br>Just use code <strong>{{promo_code}}</strong> at checkout."
        },
        {
          type: "BUTTON",
          text: "Browse Print Options",
          url: "{{gallery_link}}",
          style: "primary"
        },
        {
          type: "SPACER",
          height: 20
        },
        {
          type: "TEXT",
          content: "If you'd like help designing your album, just reply \"Album Help\" and I'll walk you through the options.<br><br>– {{photographer_name}}"
        }
      ]
    });

    await storage.createAutomationStep({
      automationId: a3.id,
      stepIndex: 0,
      delayMinutes: 4320, // 3 days = 3 * 24 * 60
      actionType: "EMAIL",
      enabled: true
    });

    console.log(`3️⃣  Print Upsell Email (T=3 days) - CREATED`);

    // 4️⃣ Expiration Reminder Email (+14 days) - COMMUNICATION automation with delay
    const a4 = await storage.createAutomation({
      photographerId,
      name: "Gallery Delivery - 14 Day Expiration Reminder",
      description: "Gallery expiration reminder sent 14 days after delivery",
      automationType: "COMMUNICATION",
      stageId: galleryDeliveredStage.id,
      channel: "EMAIL",
      projectType: "WEDDING",
      enabled: true,
      useEmailBuilder: true,
      subject: "Your gallery expires soon ⏰",
      emailBlocks: [
        {
          type: "HEADING",
          content: "Don't Forget to Download Your Photos!",
          level: 1
        },
        {
          type: "TEXT",
          content: "Hi {{first_name}},<br><br>Just a quick reminder — your gallery link will expire on <strong>{{expiration_date}}</strong>.<br><br>Be sure to download all your images and favorites before then.<br><br>If you need extra time, just reply and I can extend it a bit."
        },
        {
          type: "BUTTON",
          text: "Download Gallery",
          url: "{{gallery_link}}",
          style: "primary"
        },
        {
          type: "SPACER",
          height: 20
        },
        {
          type: "TEXT",
          content: "And if you haven't ordered your album yet, now's the perfect time to start!<br><br>– {{photographer_name}}"
        }
      ]
    });

    await storage.createAutomationStep({
      automationId: a4.id,
      stepIndex: 0,
      delayMinutes: 20160, // 14 days = 14 * 24 * 60
      actionType: "EMAIL",
      enabled: true
    });

    console.log(`4️⃣  Expiration Reminder Email (T=14 days) - CREATED`);

    console.log('\n✅ Successfully created all 4 Gallery Delivered automations!');
    console.log('\nAutomation Summary:');
    console.log('  1. Instant Welcome Email (with gallery link)');
    console.log('  2. +15 min SMS Reminder');
    console.log('  3. +3 days Print Upsell Email (with promo code)');
    console.log('  4. +14 days Expiration Reminder Email');

  } catch (error) {
    console.error('❌ Error setting up Gallery Delivered automations:', error);
    throw error;
  } finally {
    await db.$client.end();
  }
}

// Run the script
setupGalleryDeliveredAutomations();
