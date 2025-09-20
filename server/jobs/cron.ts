import cron from 'node-cron';
import { processAutomations, processPaymentReminders } from '../services/automation';
import { storage } from '../storage';

export function startCronJobs() {
  // Run every 5 minutes to reduce log spam
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Temporarily disabled during client/project separation migration
      // Only log when there's actual work to do
      
      // Get all photographers
      const photographers = await storage.getAllPhotographers();
      
      // Process automations for each photographer
      for (const photographer of photographers) {
        await processAutomations(photographer.id);
        await processPaymentReminders(photographer.id);
      }
      
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });

  console.log('Cron jobs started');
}
