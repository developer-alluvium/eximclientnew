import mongoose from 'mongoose';
import EximclientUser from '../models/eximclientUserModel.js';
import { logActivity } from '../utils/activityLogger.js';

async function migrateIeCodes() {
  try {
    console.log('Starting IE code migration...');
    
    // Find all users with legacy ie_code_no field
    const users = await EximclientUser.find({
      ie_code_no: { $exists: true, $ne: null }
    });
    
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      if (!user.ie_code_assignments) {
        user.ie_code_assignments = [];
      }
      
      // Only add to ie_code_assignments if not already present
      const existingAssignment = user.ie_code_assignments.find(
        a => a.ie_code_no === user.ie_code_no
      );
      
      if (!existingAssignment && user.ie_code_no) {
        user.ie_code_assignments.push({
          ie_code_no: user.ie_code_no,
          importer_name: user.assignedImporterName || 'Unknown',
          assigned_at: user.updatedAt || new Date(),
          assigned_by: user.adminId, // Use adminId as the assigner
          assigned_by_model: 'Admin'
        });
        
        // Log the migration
        await logActivity(
          'SYSTEM',
          'IE_CODE_MIGRATION',
          `Migrated user ${user.name} (${user.email}) IE code ${user.ie_code_no} to new structure`,
          {
            userId: user._id,
            oldIeCode: user.ie_code_no,
            oldImporterName: user.assignedImporterName,
            assignmentCount: user.ie_code_assignments.length
          }
        );
      }
      
      await user.save();
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Connect to MongoDB and run migration
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return migrateIeCodes();
  })
  .then(() => {
    console.log('Migration completed, closing connection');
    return mongoose.disconnect();
  })
  .catch(error => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
