#!/usr/bin/env node

/**
 * Test script to verify the SSO endpoint works correctly
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const SERVER_URL = 'http://localhost:9001';
const JWT_SECRET = process.env.JWT_SECRET;

console.log('🧪 Testing SSO Endpoint for E-Lock...\n');

// First, we need to test with a valid user token
// For testing purposes, let's create a mock user token that matches the expected token structure
const mockUser = {
  id: '68380d1b78346f0635643c98',  // This should match the customer ID in database
  ie_code_no: '812023773',
  name: 'G.R.METALLOYS PRIVATE LIMITED',
  role: 'customer'
};

// Generate a test authentication token that matches the structure from generateToken()
const authToken = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });

console.log('📝 Generated test auth token for user:', mockUser.ie_code_no);

async function testSSOEndpoint() {
  try {
    // Test the SSO token generation endpoint
    const response = await axios.post(`${SERVER_URL}/api/generate-sso-token`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log('✅ SSO endpoint responded successfully');
      console.log('📋 Response data:', response);
      
      // Verify the returned token
      const token = response.data.data?.token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ SSO token verified successfully');
        console.log('📋 Decoded SSO token:', decoded);
        
        // Check if the token contains all required fields
        if (decoded.ie_code_no === mockUser.ie_code_no && 
            decoded.sub && 
            decoded.name && 
            decoded.exp && 
            decoded.iat) {
          console.log('✅ SSO token contains all required fields:');
          console.log('  ✓ sub (subject):', decoded.sub);
          console.log('  ✓ ie_code_no:', decoded.ie_code_no);
          console.log('  ✓ name:', decoded.name);
          console.log('  ✓ exp (expiry):', new Date(decoded.exp * 1000).toISOString());
          console.log('  ✓ iat (issued at):', new Date(decoded.iat * 1000).toISOString());
          
          // Test E-Lock redirection URL
          const elockUrl = `http://localhost:3005/?token=${token}`;
          console.log(`🔗 E-Lock redirection URL: ${elockUrl.substring(0, 80)}...`);
          
          console.log('\n✅ SSO endpoint test completed successfully!');
        } else {
          console.error('❌ SSO token is missing required fields:');
          console.error('  - sub (subject):', decoded.sub ? '✓' : '✗');
          console.error('  - ie_code_no:', decoded.ie_code_no === mockUser.ie_code_no ? '✓' : '✗');
          console.error('  - name:', decoded.name ? '✓' : '✗');
          console.error('  - exp (expiry):', decoded.exp ? '✓' : '✗');
          console.error('  - iat (issued at):', decoded.iat ? '✓' : '✗');
        }
      } else {
        console.error('❌ No token in response');
      }
    }
  } catch (error) {
    console.error('❌ Error testing SSO endpoint:', error.response?.data || error.message);
  }
}

// Run the test
testSSOEndpoint();
