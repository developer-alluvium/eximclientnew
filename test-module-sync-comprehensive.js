#!/usr/bin/env node

// Comprehensive test for module assignment sync
// This tests the complete flow from database to frontend

const { MongoClient } = require('mongodb');
const axios = require('axios');

// Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eximclient';
const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const TEST_IE_CODE = 'ABDFM8378H';
const EXPECTED_MODULES = ['/importdsr', '/netpage'];

async function testModuleSync() {
  console.log('🧪 Starting Module Assignment Sync Test');
  console.log('=====================================\n');

  try {
    // 1. Test Database Direct Query
    console.log('📋 Step 1: Testing Database Direct Query');
    await testDatabaseQuery();
    
    // 2. Test Backend API (requires authentication)
    console.log('\n📋 Step 2: Testing Backend API');
    console.log('⚠️  Note: This requires valid authentication cookies');
    
    // 3. Instructions for manual testing
    console.log('\n📋 Step 3: Manual Testing Instructions');
    printManualTestInstructions();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testDatabaseQuery() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db();
    const customer = await db.collection('customers').findOne(
      { ie_code_no: TEST_IE_CODE },
      { projection: { name: 1, ie_code_no: 1, assignedModules: 1, isActive: 1 } }
    );
    
    if (!customer) {
      console.log('❌ Customer not found in database');
      return;
    }
    
    console.log('📊 Database Result:');
    console.log('   Name:', customer.name);
    console.log('   IE Code:', customer.ie_code_no);
    console.log('   Active:', customer.isActive);
    console.log('   Assigned Modules:', customer.assignedModules || []);
    
    // Verify expected modules
    const actualModules = customer.assignedModules || [];
    const hasExpectedModules = EXPECTED_MODULES.every(module => actualModules.includes(module));
    
    if (hasExpectedModules) {
      console.log('✅ Database contains expected modules');
    } else {
      console.log('❌ Database missing expected modules');
      console.log('   Expected:', EXPECTED_MODULES);
      console.log('   Actual:', actualModules);
    }
    
    await client.close();
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

function printManualTestInstructions() {
  console.log(`
🔧 Manual Testing Steps:
========================

1. **Restart Node.js Server** (to apply middleware changes)
   cd server
   npm restart

2. **Open Browser and Login**
   - Navigate to your application
   - Login with IE Code: ${TEST_IE_CODE}
   - Check browser console for login logs

3. **Test Login Response**
   Open browser console and check login response:
   
   // Should see these logs during login:
   📊 Customer object before createSendTokens: {
     id: "...",
     name: "MARUTI RECYCLING",
     ie_code_no: "${TEST_IE_CODE}",
     assignedModules: ["/importdsr", "/netpage"],
     isActive: true
   }

5. **Check localStorage**
   In browser console, run:
   
   const userData = localStorage.getItem('exim_user');
   const parsed = JSON.parse(userData);
   console.log('User data format:', parsed);
   console.log('Assigned modules:', 
     parsed.assignedModules || parsed.data?.user?.assignedModules || []
   );

6. **Verify Homepage Module Display**
   - Check that only assigned modules are visible
   - Modules should not be locked/greyed out
   - Test clicking on assigned modules

Expected Results:
✅ assignedModules should contain: ${JSON.stringify(EXPECTED_MODULES)}
✅ Homepage should show only assigned modules as accessible
✅ Non-assigned modules should be locked/hidden

If modules are still empty:
1. Check server logs for authentication errors
2. Verify customer exists in database with assignedModules
3. Check if cookies are being set properly
4. Ensure middleware changes are applied (restart server)
`);
}

// Run the test
testModuleSync();
