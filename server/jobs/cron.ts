import cron from 'node-cron';
import { processAutomations, processPaymentReminders } from '../services/automation';
import { storage } from '../storage';

export function startCronJobs() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      console.log('Running automation check...');
      
      // Get all photographers
      const photographers = await storage.getPhotographer(''); // This needs to be implemented
      
      // For now, we'll process for all photographers
      // In a real implementation, you'd query all photographers
      
      // This is a placeholder - you'd need to implement getAllPhotographers
      // For demo purposes, we'll skip this until we have actual data
      
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });

  console.log('Cron jobs started');
}
