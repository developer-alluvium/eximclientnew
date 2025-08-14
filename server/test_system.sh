#!/bin/bash

# Test script for user registration and admin management system

echo "=== Testing User Registration & Admin Management System ==="
echo

# 1. Test customer admin login
echo "1. Testing Customer Admin Login..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:9000/api/customer-admin/login \
  -H "Content-Type: application/json" \
  -c admin_cookies.txt \
  -d '{
    "ie_code_no": "0812023773",
    "password": "Admin@123"
  }')

echo "Admin Login Response: $ADMIN_RESPONSE"
echo

# 2. Test customer admin dashboard
echo "2. Testing Customer Admin Dashboard..."
DASHBOARD_RESPONSE=$(curl -s -X GET http://localhost:9000/api/customer-admin/dashboard \
  -H "Content-Type: application/json" \
  -b admin_cookies.txt)

echo "Dashboard Response: $DASHBOARD_RESPONSE"
echo

# 3. Test getting users under admin
echo "3. Testing Get Users for Admin..."
USERS_RESPONSE=$(curl -s -X GET http://localhost:9000/api/customer-admin/users \
  -H "Content-Type: application/json" \
  -b admin_cookies.txt)

echo "Users Response: $USERS_RESPONSE"
echo

# 4. Test user registration
echo "4. Testing User Registration..."
USER_REG_RESPONSE=$(curl -s -X POST http://localhost:9000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test.user@metalloys.com",
    "password": "password123",
    "ie_code_no": "0812023773",
    "importer": "G.R.METALLOYS PRIVATE LIMITED"
  }')

echo "User Registration Response: $USER_REG_RESPONSE"
echo

# 5. Test approving a user (admin functionality)
echo "5. Testing User Approval by Admin..."
# First get the user ID from the users list
USER_ID=$(echo "$USERS_RESPONSE" | jq -r '.data.users[0]._id')
if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
  APPROVAL_RESPONSE=$(curl -s -X PUT http://localhost:9000/api/customer-admin/users/$USER_ID/status \
    -H "Content-Type: application/json" \
    -b admin_cookies.txt \
    -d '{
      "status": "approved",
      "reason": "Account verified and approved"
    }')
  echo "User Approval Response: $APPROVAL_RESPONSE"
else
  echo "No users found to approve"
fi
echo

# 6. Test user login after approval
echo "6. Testing User Login..."
USER_LOGIN_RESPONSE=$(curl -s -X POST http://localhost:9000/api/users/login \
  -H "Content-Type: application/json" \
  -c user_cookies.txt \
  -d '{
    "email": "jane.doe@metalloys.com",
    "password": "password123"
  }')

echo "User Login Response: $USER_LOGIN_RESPONSE"
echo

# 7. Test user dashboard
echo "7. Testing User Dashboard..."
USER_DASHBOARD_RESPONSE=$(curl -s -X GET http://localhost:9000/api/users/dashboard \
  -H "Content-Type: application/json" \
  -b user_cookies.txt)

echo "User Dashboard Response: $USER_DASHBOARD_RESPONSE"
echo

echo "=== Test Complete ==="

# Clean up cookie files
rm -f admin_cookies.txt user_cookies.txt
