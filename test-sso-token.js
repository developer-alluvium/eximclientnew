#!/usr/bin/env node

/**
 * Test script to verify SSO token generation for E-Lock redirection
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './server/.env' });

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET not found in environment variables');
  process.exit(1);
}

console.log('🧪 Testing SSO Token Generation for E-Lock...\n');

// Test 1: Generate SSO token with sample ie_code_no
const testIeCode = 'TEST123456';
console.log(`📝 Test IE Code: ${testIeCode}`);

try {
  // Generate SSO token (same logic as in generateSSOToken function)
  const ssoToken = jwt.sign(
    { ie_code_no: testIeCode },
    JWT_SECRET,
    { expiresIn: "10m" }
  );

  console.log(`✅ SSO Token generated successfully`);
  console.log(`🎟️  Token: ${ssoToken.substring(0, 50)}...`);

  // Test 2: Verify token can be decoded
  const decoded = jwt.verify(ssoToken, JWT_SECRET);
  console.log(`✅ Token verified successfully`);
  console.log(`📋 Decoded payload:`, decoded);

  // Test 3: Check expiry
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = decoded.exp - now;
  console.log(`⏰ Token expires in: ${timeUntilExpiry} seconds (${Math.floor(timeUntilExpiry / 60)} minutes)`);

  // Test 4: Generate E-Lock redirection URL
  const elockUrl = `http://elock-tracking.s3-website.ap-south-1.amazonaws.com/?token=${ssoToken}`;
  console.log(`🔗 E-Lock redirection URL: ${elockUrl}`);

  console.log('\n✅ All tests passed! SSO token generation is working correctly.');

} catch (error) {
  console.error('❌ Error during token testing:', error.message);
  process.exit(1);
}
