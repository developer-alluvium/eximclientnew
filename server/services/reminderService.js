// services/reminderService.js
import EximclientUser from "../models/eximclientUserModel.js";
import { sendReminderEmail } from "./emailService.js";
import cron from "node-cron";

// Configuration object for reminder settings
const reminderConfig = {
  // Time to send reminders (24-hour format, IST)
  reminderTime: {
    hour: 14,     // 2 PM
    minute: 30   // 30 minutes
  },
  
  // Enable/disable testing mode
  testMode:  'development',
  
  // Test interval (in minutes) - for testing purposes
  testInterval: 2, // Run every 2 minutes in test mode
  
  // Time zone
  timezone: 'Asia/Kolkata'
};

export const checkDocumentReminders = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Starting document reminder check...`);
    
    const users = await EximclientUser.find({
      'documents.expirationDate': { $exists: true, $ne: null },
      'documents.reminderDays': { $exists: true, $ne: null },
      'documents.reminderSent': false
    });

    console.log(`Found ${users.length} users with documents to check`);

    let remindersSent = 0;

    for (const user of users) {
      for (const document of user.documents) {
        if (!document.expirationDate || !document.reminderDays || document.reminderSent) {
          continue;
        }

        const expirationDate = new Date(document.expirationDate);
        const reminderDate = new Date(expirationDate);
        reminderDate.setDate(reminderDate.getDate() - document.reminderDays);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        reminderDate.setHours(0, 0, 0, 0);
        expirationDate.setHours(23, 59, 59, 999); // End of expiration day

        // Check if today is the reminder date and document hasn't expired
        if (today >= reminderDate && today < expirationDate) {
          try {
            await sendReminderEmail(user.email, user.name, document);
            
            // Mark reminder as sent
            document.reminderSent = true;
            await user.save();
            
            remindersSent++;
            console.log(`✅ Reminder sent for document: "${document.title}" to ${user.email}`);
            
            // Add delay between emails to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (emailError) {
            console.error(`❌ Failed to send reminder for document "${document.title}" to ${user.email}:`, emailError);
          }
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Reminder check completed. Sent ${remindersSent} reminders.`);
    
  } catch (error) {
    console.error('Error checking document reminders:', error);
  }
};

// Manual trigger for testing
export const triggerReminderCheck = async () => {
  console.log('🧪 Manual reminder check triggered...');
  await checkDocumentReminders();
};

// Schedule reminder check
// const scheduleReminders = () => {
//   if (reminderConfig.testMode) {
//     // Test mode: run every X minutes
//     console.log(`🧪 TEST MODE: Scheduling reminders every ${reminderConfig.testInterval} minutes`);
    
//     cron.schedule(`*/${reminderConfig.testInterval} * * * *`, () => {
//       console.log('🧪 Running TEST document reminder check...');
//       checkDocumentReminders();
//     });
    
  
//   } else {
//     // Production mode: run daily at specified time
//     const { hour, minute } = reminderConfig.reminderTime;
    
//     // Convert IST to UTC for cron (IST = UTC + 5:30)
//     const utcHour = (hour - 5 + 24) % 24;
//     const utcMinute = (minute - 30 + 60) % 60;
    
//     const cronExpression = `${utcMinute} ${utcHour} * * *`;
    
//     console.log(`📅 PRODUCTION MODE: Scheduling daily reminders at ${hour}:${minute} IST (${utcHour}:${utcMinute} UTC)`);
//     console.log(`📅 Cron expression: ${cronExpression}`);
    
//     cron.schedule(cronExpression, () => {
//       console.log(`📅 Running scheduled document reminder check at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
//       checkDocumentReminders();
//     });
//   }
// };

// Initialize scheduling
// scheduleReminders();

// Export configuration for external use
export { reminderConfig };
