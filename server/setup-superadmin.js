import mongoose from 'mongoose';
import SuperAdminModel from './models/superAdminModel.js';
import dotenv from 'dotenv';

dotenv.config();

const setupSuperAdmin = async () => {
  try {
    console.log('=== SuperAdmin Setup ===');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check if SuperAdmin already exists
    const existingCount = await SuperAdminModel.countDocuments();
    
    if (existingCount > 0) {
      console.log('❌ SuperAdmin already exists! Skipping setup.');
      const existing = await SuperAdminModel.findOne({});
      console.log(`Existing SuperAdmin: ${existing.username}`);
      return;
    }
    
    // Create default SuperAdmin
    const defaultSuperAdmin = {
      username: 'superadmin',
      password: 'SecureAdmin123!', // Change this in production
      email: 'admin@eximclient.com',
      isActive: true
    };
    
    const superAdmin = new SuperAdminModel(defaultSuperAdmin);
    await superAdmin.save();
    
    console.log('✅ SuperAdmin created successfully!');
    console.log('==========================================');
    console.log('DEFAULT SUPERADMIN CREDENTIALS:');
    console.log(`Username: ${defaultSuperAdmin.username}`);
    console.log(`Password: ${defaultSuperAdmin.password}`);
    console.log(`Email: ${defaultSuperAdmin.email}`);
    console.log('==========================================');
    console.log('⚠️  IMPORTANT: Change these credentials immediately after first login!');
    console.log('🔐 Access the registration page at: /login');
    
  } catch (error) {
    console.error('❌ Error setting up SuperAdmin:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSuperAdmin();
}

export default setupSuperAdmin;
