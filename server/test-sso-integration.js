#!/usr/bin/env node

/**
 * Test script to create a test customer and test SSO token generation
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const SERVER_URL = 'http://localhost:9001';
const JWT_SECRET = process.env.JWT_SECRET;

console.log('🧪 Integration Test: SSO Token Generation...\n');

// Test credentials for a customer that might exist
const testCredentials = {
  ie_code_no: 'ABDFM8378H',
  password: '8378@ABDF' // Generated password format: last 4 of IE + @ + first 4 of PAN
};

async function testSSOFlow() {
  try {
    console.log('1. Testing customer login...');
    
    // Step 1: Login as customer
    const loginResponse = await axios.post(`${SERVER_URL}/api/login`, testCredentials, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (loginResponse.status === 200) {
      console.log('✅ Customer login successful');
      
      // Extract token from response
      const token = loginResponse.data.token;
      if (!token) {
        console.error('❌ No token received from login');
        return;
      }
      
      console.log('📝 Login token received');
      
      // Step 2: Test SSO token generation
      console.log('\n2. Testing SSO token generation...');
      
      const ssoResponse = await axios.post(`${SERVER_URL}/api/generate-sso-token`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (ssoResponse.status === 200) {
        console.log('✅ SSO token generation successful');
        console.log('📋 SSO Response:', ssoResponse.data);
        
        // Step 3: Verify the SSO token
        const { token: ssoToken } = ssoResponse.data;
        if (ssoToken) {
          const decoded = jwt.verify(ssoToken, JWT_SECRET);
          console.log('✅ SSO token verified successfully');
          console.log('📋 Decoded SSO token:', decoded);
          
          // Step 4: Test E-Lock URL generation
          const elockUrl = `http://localhost:3005/?token=${ssoToken}`;
          console.log('🔗 E-Lock URL:', elockUrl);
          
          console.log('\n✅ Complete SSO flow test passed!');
        } else {
          console.error('❌ No SSO token in response');
        }
      } else {
        console.error('❌ SSO token generation failed');
      }
    } else {
      console.error('❌ Customer login failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Suggestion: Customer credentials might be incorrect.');
      console.log('   Check the customer database or try creating a customer first.');
    }
  }
}

// Run the test
testSSOFlow();
