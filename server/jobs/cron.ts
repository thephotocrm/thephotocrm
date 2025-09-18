import cron from 'node-cron';
import { processAutomations, processPaymentReminders } from '../services/automation';
import { storage } from '../storage';

export function startCronJobs() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      console.log('Running automation check...');
      
      // Get all photographers
      const photographers = await storage.getAllPhotographers();
      
      // Process automations for each photographer
      // TODO: Temporarily disabled during client/project separation migration
      // for (const photographer of photographers) {
      //   await processAutomations(photographer.id);
      //   await processPaymentReminders(photographer.id);
      // }
      
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });

  console.log('Cron jobs started');
}
