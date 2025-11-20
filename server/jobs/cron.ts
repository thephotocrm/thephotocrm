import cron from 'node-cron';
import { processAutomations, processPaymentReminders } from '../services/automation';
import { renewExpiringWatches } from '../services/gmail-watch';
import { storage } from '../storage';

export function startCronJobs() {
  // Run every 1 minute for testing
  cron.schedule('* * * * *', async () => {
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

  // Run daily at 2 AM to renew expiring Gmail watches
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Running Gmail watch renewal job');
      await renewExpiringWatches();
    } catch (error) {
      console.error('Gmail watch renewal cron job error:', error);
    }
  });

  console.log('Cron jobs started');
}
