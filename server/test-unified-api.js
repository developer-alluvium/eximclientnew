// Test script for the new unified customer API
// Run this in the server directory: node test-unified-api.js

import express from 'express';
import { getAllCustomersUnified } from './controllers/customerController.js';

const app = express();

// Mock request and response objects for testing
const createMockReqRes = (query = {}) => {
  const req = {
    query,
    headers: {},
    ip: '127.0.0.1'
  };
  
  let responseData = null;
  let statusCode = 200;
  
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    getStatus: () => statusCode,
    getData: () => responseData
  };
  
  return { req, res };
};

// Test function
const testUnifiedAPI = async () => {
  console.log('🧪 Testing Unified Customer API\n');
  
  try {
    // Test 1: Get all customers
    console.log('📊 Test 1: Get all customers');
    const { req: req1, res: res1 } = createMockReqRes({ status: 'all' });
    await getAllCustomersUnified(req1, res1);
    console.log('Status:', res1.getStatus());
    console.log('Response:', JSON.stringify(res1.getData(), null, 2));
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Get only registered customers
    console.log('👥 Test 2: Get registered customers only');
    const { req: req2, res: res2 } = createMockReqRes({ status: 'registered' });
    await getAllCustomersUnified(req2, res2);
    console.log('Status:', res2.getStatus());
    console.log('Response:', JSON.stringify(res2.getData(), null, 2));
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Get only inactive customers
    console.log('😴 Test 3: Get inactive customers only');
    const { req: req3, res: res3 } = createMockReqRes({ status: 'inactive' });
    await getAllCustomersUnified(req3, res3);
    console.log('Status:', res3.getStatus());
    console.log('Response:', JSON.stringify(res3.getData(), null, 2));
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 4: Get with KYC data included
    console.log('📋 Test 4: Get customers with KYC data');
    const { req: req4, res: res4 } = createMockReqRes({ 
      status: 'all', 
      includeKyc: 'true' 
    });
    await getAllCustomersUnified(req4, res4);
    console.log('Status:', res4.getStatus());
    console.log('Response:', JSON.stringify(res4.getData(), null, 2));
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUnifiedAPI();
}

export { testUnifiedAPI };
