import { db } from './db';
import { DatabaseStorage } from './storage';

const storage = new DatabaseStorage(db);
const photographerId = 'demo-photog-test-2025';

async function setupDemoAutomations() {
  try {
    console.log('🚀 Setting up wedding inquiry automations for demo@lazyphotog.test...\n');
    
    // Get stages
    const stages = await storage.getStagesByPhotographer(photographerId, "WEDDING");
    const inquiryStage = stages.find(s => s.name === "New Inquiry");
    
    if (!inquiryStage) {
      throw new Error("New Inquiry stage not found");
    }

    console.log(`✓ Found New Inquiry stage: ${inquiryStage.id}\n`);

    // Delete old communication automations (keep stage move)
    console.log('Cleaning up old automations...');
    const existingAutomations = await storage.getAutomationsByPhotographer(photographerId, "WEDDING");
    const oldComms = existingAutomations.filter(a => 
      a.stageId === inquiryStage.id && 
      a.automationType === 'COMMUNICATION'
    );
    
    for (const auto of oldComms) {
      try {
        await storage.deleteAutomation(auto.id);
        console.log(`  ✓ Deleted: ${auto.name}`);
      } catch (err) {
        console.log(`  ! Could not delete ${auto.name}, will create new ones anyway`);
      }
    }

    console.log('\n📧 Creating new automation sequence...\n');

    // Helper function to create templates
    const existingTemplates = await storage.getTemplatesByPhotographer(photographerId);
    const getOrCreateTemplate = async (templateData: any) => {
      const existing = existingTemplates.find(t => t.name === templateData.name);
      if (existing) {
        console.log(`  ↻ Reusing template: ${templateData.name}`);
        return existing;
      }
      const created = await storage.createTemplate(templateData);
      console.log(`  + Created template: ${templateData.name}`);
      return created;
    };

    // 1. Instant Email (0 min)
    const t1Template = await getOrCreateTemplate({
      photographerId,
      name: "Wedding Inquiry - Instant Email",
      channel: "EMAIL",
      subject: "Got your wedding inquiry 🎉 — let's plan something beautiful",
      htmlBody: `<p>Hi {{first_name}},</p>
<p>Thank you so much for reaching out about your wedding!<br>
I'm thrilled to hear from you and can't wait to learn about your day, your venue, and the vision you have for your photos.</p>
<p>Here's the quickest next step — pick a time that works for you:<br>
{{scheduler_link}}</p>
<p>If you'd like a little inspiration, here's a highlight gallery from recent weddings:<br>
{{gallery_link}}</p>
<p>Talk soon,<br>
{{photographer_name}}</p>`,
      textBody: `Hi {{first_name}},\n\nThank you so much for reaching out about your wedding!\nI'm thrilled to hear from you and can't wait to learn about your day, your venue, and the vision you have for your photos.\n\nHere's the quickest next step — pick a time that works for you:\n{{scheduler_link}}\n\nIf you'd like a little inspiration, here's a highlight gallery from recent weddings:\n{{gallery_link}}\n\nTalk soon,\n{{photographer_name}}`
    });

    const a1 = await storage.createAutomation({
      photographerId,
      name: "Send email immediately when contact enters New Inquiry",
      description: "Instant email response - sets warmth, professionalism, and instant credibility",
      automationType: "COMMUNICATION",
      stageId: inquiryStage.id,
      channel: "EMAIL",
      projectType: "WEDDING",
      enabled: true
    });

    await storage.createAutomationStep({
      automationId: a1.id,
      stepIndex: 0,
      delayMinutes: 0,
      actionType: "EMAIL",
      templateId: t1Template.id,
      enabled: true
    });

    console.log(`1️⃣  Instant Email (T=0min) - CREATED`);

    // 2. Instant SMS (1 min)
    const a2 = await storage.createAutomation({
      photographerId,
      name: "Send text 1 minute after entering New Inquiry",
      description: "Instant SMS - confirms legitimacy and keeps you top-of-mind on mobile",
      automationType: "COMMUNICATION",
      stageId: inquiryStage.id,
      channel: "SMS",
      projectType: "WEDDING",
      enabled: true
    });

    await storage.createAutomationStep({
      automationId: a2.id,
      stepIndex: 0,
      delayMinutes: 1,
      actionType: "SMS",
      customSmsContent: "Hey {{first_name}}! This is {{business_name}} — thanks for reaching out about your wedding 🎉 Excited to hear what you're planning! You can grab a quick time to chat here: {{scheduler_link}}",
      enabled: true
    });

    console.log(`2️⃣  Instant SMS (T=1min) - CREATED`);

    // 3. Follow-Up Email (6 hours)
    const t3Template = await getOrCreateTemplate({
      photographerId,
      name: "Wedding Inquiry - 6h Inspiration",
      channel: "EMAIL",
      subject: "A little wedding inspiration for you 💐",
      htmlBody: `<p>Hi {{first_name}},</p>
<p>I pulled together a few of my favorite wedding stories — full of candid moments, beautiful details, and the kind of emotion that lasts a lifetime.</p>
<p>Take a look here:<br>{{gallery_link}}</p>
<p>Every wedding is different, and I'd love to hear what matters most to you.<br>You can pick a time here to chat about it:<br>{{scheduler_link}}</p>
<p>– {{photographer_name}}</p>`,
      textBody: `Hi {{first_name}},\n\nI pulled together a few of my favorite wedding stories — full of candid moments, beautiful details, and the kind of emotion that lasts a lifetime.\n\nTake a look here:\n{{gallery_link}}\n\nEvery wedding is different, and I'd love to hear what matters most to you.\nYou can pick a time here to chat about it:\n{{scheduler_link}}\n\n– {{photographer_name}}`
    });

    const a3 = await storage.createAutomation({
      photographerId,
      name: "Send email 6 hours after entering New Inquiry",
      description: "6-hour follow-up - visual proof + emotional tone while lead is still warm",
      automationType: "COMMUNICATION",
      stageId: inquiryStage.id,
      channel: "EMAIL",
      projectType: "WEDDING",
      enabled: true
    });

    await storage.createAutomationStep({
      automationId: a3.id,
      stepIndex: 0,
      delayMinutes: 360,
      actionType: "EMAIL",
      templateId: t3Template.id,
      enabled: true
    });

    console.log(`3️⃣  Inspiration Email (T=6h) - CREATED`);

    // 4. Reminder Email (24 hours)
    const t4Template = await getOrCreateTemplate({
      photographerId,
      name: "Wedding Inquiry - 24h Reminder",
      channel: "EMAIL",
      subject: "Still searching for the right wedding photographer?",
      htmlBody: `<p>Hi {{first_name}},</p>
<p>Just checking in in case my last note got buried — are you still looking for your wedding photographer?<br>I'd love to hear about your venue and what kind of photos feel "you."</p>
<p>Here's my calendar again if it's easier to grab a time:<br>{{scheduler_link}}</p>
<p>– {{photographer_name}}</p>`,
      textBody: `Hi {{first_name}},\n\nJust checking in in case my last note got buried — are you still looking for your wedding photographer?\nI'd love to hear about your venue and what kind of photos feel "you."\n\nHere's my calendar again if it's easier to grab a time:\n{{scheduler_link}}\n\n– {{photographer_name}}`
    });

    const a4 = await storage.createAutomation({
      photographerId,
      name: "Send email 24 hours after entering New Inquiry",
      description: "24-hour reminder - keeps conversation alive without being pushy",
      automationType: "COMMUNICATION",
      stageId: inquiryStage.id,
      channel: "EMAIL",
      projectType: "WEDDING",
      enabled: true
    });

    await storage.createAutomationStep({
      automationId: a4.id,
      stepIndex: 0,
      delayMinutes: 1440,
      actionType: "EMAIL",
      templateId: t4Template.id,
      enabled: true
    });

    console.log(`4️⃣  Reminder Email (T=24h) - CREATED`);

    // 5. Social Proof Email (48 hours)
    const t5Template = await getOrCreateTemplate({
      photographerId,
      name: "Wedding Inquiry - 48h Social Proof",
      channel: "EMAIL",
      subject: "What our couples say about working with us 💬",
      htmlBody: `<p>Hi {{first_name}},</p>
<p>I thought you'd enjoy hearing directly from our couples — how they felt, what they loved most, and what surprised them about their photos.</p>
<p>You can see their stories and favorite images here:<br>{{testimonials_link}}</p>
<p>If you'd like, I can hold {{event_date}} on my calendar for a couple of days while we chat.<br>Just reply or book here: {{scheduler_link}}</p>
<p>– {{photographer_name}}</p>`,
      textBody: `Hi {{first_name}},\n\nI thought you'd enjoy hearing directly from our couples — how they felt, what they loved most, and what surprised them about their photos.\n\nYou can see their stories and favorite images here:\n{{testimonials_link}}\n\nIf you'd like, I can hold {{event_date}} on my calendar for a couple of days while we chat.\nJust reply or book here: {{scheduler_link}}\n\n– {{photographer_name}}`
    });

    const a5 = await storage.createAutomation({
      photographerId,
      name: "Send email 48 hours after entering New Inquiry",
      description: "48-hour social proof - validates you through others, builds trust",
      automationType: "COMMUNICATION",
      stageId: inquiryStage.id,
      channel: "EMAIL",
      projectType: "WEDDING",
      enabled: true
    });

    await storage.createAutomationStep({
      automationId: a5.id,
      stepIndex: 0,
      delayMinutes: 2880,
      actionType: "EMAIL",
      templateId: t5Template.id,
      enabled: true
    });

    console.log(`5️⃣  Social Proof Email (T=48h) - CREATED`);

    // 6. Hold Offer Email (4 days)
    const t6Template = await getOrCreateTemplate({
      photographerId,
      name: "Wedding Inquiry - 4 Day Hold Offer",
      channel: "EMAIL",
      subject: "Want me to hold your wedding date?",
      htmlBody: `<p>Hi {{first_name}},</p>
<p>Popular weekends book up quickly, and I'd hate for you to miss your date if you're still deciding.<br>I'm happy to place a <strong>48-hour soft hold</strong> on {{event_date}} while we talk details — no pressure at all.</p>
<p>Just reply "Hold it" or grab a call here:<br>{{scheduler_link}}</p>
<p>– {{photographer_name}}</p>`,
      textBody: `Hi {{first_name}},\n\nPopular weekends book up quickly, and I'd hate for you to miss your date if you're still deciding.\nI'm happy to place a 48-hour soft hold on {{event_date}} while we talk details — no pressure at all.\n\nJust reply "Hold it" or grab a call here:\n{{scheduler_link}}\n\n– {{photographer_name}}`
    });

    const a6 = await storage.createAutomation({
      photographerId,
      name: "Send email 4 days after entering New Inquiry",
      description: "4-day hold offer - creates gentle urgency and micro-commitment",
      automationType: "COMMUNICATION",
      stageId: inquiryStage.id,
      channel: "EMAIL",
      projectType: "WEDDING",
      enabled: true
    });

    await storage.createAutomationStep({
      automationId: a6.id,
      stepIndex: 0,
      delayMinutes: 5760,
      actionType: "EMAIL",
      templateId: t6Template.id,
      enabled: true
    });

    console.log(`6️⃣  Hold Offer Email (T=4d) - CREATED`);

    // 7. Story Gallery Email (7 days)
    const t7Template = await getOrCreateTemplate({
      photographerId,
      name: "Wedding Inquiry - 7 Day Story Gallery",
      channel: "EMAIL",
      subject: "Imagine your wedding photos like this ✨",
      htmlBody: `<p>Hi {{first_name}},</p>
<p>I just posted a new wedding gallery that captures exactly what most couples tell me they want — real emotion, relaxed moments, and timeless color.</p>
<p>Take a look here:<br>{{demo_gallery_link}}</p>
<p>If you'd like to chat through what your own story could look like, here's my link:<br>{{scheduler_link}}</p>
<p>– {{photographer_name}}</p>`,
      textBody: `Hi {{first_name}},\n\nI just posted a new wedding gallery that captures exactly what most couples tell me they want — real emotion, relaxed moments, and timeless color.\n\nTake a look here:\n{{demo_gallery_link}}\n\nIf you'd like to chat through what your own story could look like, here's my link:\n{{scheduler_link}}\n\n– {{photographer_name}}`
    });

    const a7 = await storage.createAutomation({
      photographerId,
      name: "Send email 7 days after entering New Inquiry",
      description: "7-day story gallery - re-engages cold leads through emotion and visualization",
      automationType: "COMMUNICATION",
      stageId: inquiryStage.id,
      channel: "EMAIL",
      projectType: "WEDDING",
      enabled: true
    });

    await storage.createAutomationStep({
      automationId: a7.id,
      stepIndex: 0,
      delayMinutes: 10080,
      actionType: "EMAIL",
      templateId: t7Template.id,
      enabled: true
    });

    console.log(`7️⃣  Story Gallery Email (T=7d) - CREATED`);

    // 8. Final Check Email (14 days)
    const t8Template = await getOrCreateTemplate({
      photographerId,
      name: "Wedding Inquiry - 14 Day Final Check",
      channel: "EMAIL",
      subject: "Should I keep {{event_date}} open for you?",
      htmlBody: `<p>Hi {{first_name}},</p>
<p>I don't want to fill your inbox, but before I close out my calendar, I wanted to check — should I keep {{event_date}} open for you?</p>
<p>If you're still deciding, I'm happy to answer questions or customize coverage for your day.<br>Otherwise, I'll release the hold so another couple can book it.</p>
<p>Here's my calendar one more time:<br>{{scheduler_link}}</p>
<p>– {{photographer_name}}</p>`,
      textBody: `Hi {{first_name}},\n\nI don't want to fill your inbox, but before I close out my calendar, I wanted to check — should I keep {{event_date}} open for you?\n\nIf you're still deciding, I'm happy to answer questions or customize coverage for your day.\nOtherwise, I'll release the hold so another couple can book it.\n\nHere's my calendar one more time:\n{{scheduler_link}}\n\n– {{photographer_name}}`
    });

    const a8 = await storage.createAutomation({
      photographerId,
      name: "Send email 14 days after entering New Inquiry",
      description: "14-day final check - last touchpoint before closing the lead",
      automationType: "COMMUNICATION",
      stageId: inquiryStage.id,
      channel: "EMAIL",
      projectType: "WEDDING",
      enabled: true
    });

    await storage.createAutomationStep({
      automationId: a8.id,
      stepIndex: 0,
      delayMinutes: 20160,
      actionType: "EMAIL",
      templateId: t8Template.id,
      enabled: true
    });

    console.log(`8️⃣  Final Check Email (T=14d) - CREATED`);

    console.log('\n✅ Successfully set up complete 8-email + 1-SMS automation sequence!');
    console.log('   for demo@lazyphotog.test (Demo Photography Studio)\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

setupDemoAutomations();
