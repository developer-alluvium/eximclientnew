// Test script to verify module assignment sync after fix
// Run this in the terminal to test the API endpoints

const axios = require('axios');

// Alternative test using direct MongoDB query
const testDatabaseSync = async () => {
  console.log('\n🔍 Testing Database Sync...\n');
  
  // This would be run in MongoDB shell or Node.js environment
  const dbQuery = `
    db.customers.findOne(
      { ie_code_no: "ABDFM8378H" },
      { name: 1, ie_code_no: 1, assignedModules: 1 }
    );
  `;
  
  console.log('📋 MongoDB Query to run:');
  console.log(dbQuery);
  
  console.log('\n📊 Expected Result:');
  console.log(`{
    "_id": ObjectId("..."),
    "name": "MARUTI RECYCLING",
    "ie_code_no": "ABDFM8378H",
    "assignedModules": ["/importdsr", "/netpage"]
  }`);
};

// Instructions for manual testing
console.log('🧪 Module Assignment Sync Test Instructions:');
console.log('=====================================\n');

console.log('1. First, restart your Node.js server to apply the middleware fix');
console.log('2. Log in as the customer (MARUTI RECYCLING) in the browser');
console.log('3. Open browser console and run the following:');
console.log('');
console.log('   // Check localStorage');
console.log('   const user = JSON.parse(localStorage.getItem("exim_user"));');
console.log('   console.log("Assigned modules:", user.data?.user?.assignedModules);');
console.log('');
console.log('   // Test API directly');
console.log('   fetch("/api/validate-session", {');
console.log('     method: "GET",');
console.log('     credentials: "include"');
console.log('   })');
console.log('   .then(r => r.json())');
console.log('   .then(d => console.log("API modules:", d.user?.assignedModules));');
console.log('');
console.log('4. Expected result: assignedModules should contain ["/importdsr", "/netpage"]');
console.log('');
console.log('5. If modules are still empty, check server logs for any authentication errors');

// Run the database test
testDatabaseSync();
