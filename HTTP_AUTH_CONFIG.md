# HTTP Authentication Configuration

## Overview
This document outlines the HTTP-compatible authentication configuration for the EXIM client application. The system is configured to work in HTTP environments for both development and production.

## Key Configuration Changes

### 1. Cookie Settings (authMiddleware.js)
- **secure**: Set to `false` for HTTP compatibility
- **sameSite**: Changed from "strict" to "lax" for better HTTP cross-origin support
- **httpOnly**: Kept as `true` for security

### 2. SSO Token Format (JWT)
The SSO token follows standardized JWT practices and includes:
- **sub** (subject): The user ID (standard JWT field)
- **ie_code_no**: Import/Export code for user identification
- **name**: User's name for display purposes
- **exp**: Expiration time (10 minutes from generation)
- **iat**: Issued at time

### 2. CORS Configuration (app.js)
- **credentials**: Set to `true` to allow cookies in HTTP requests
- **origins**: Configured for specific HTTP domains
- **methods**: All necessary HTTP methods allowed

### 3. Environment Variables (.env)
- **NODE_ENV**: Set to development/production as needed
- **JWT settings**: Configured with appropriate expiration times
- **Client URIs**: Set to HTTP endpoints

## Authentication Flow for HTTP

### Login Process
1. User submits credentials via HTTP POST
2. Server validates credentials
3. Server generates JWT tokens (access + refresh)
4. Tokens are set as HTTP-only cookies with secure=false
5. Client receives authentication response

### Protected Route Access
1. Client makes HTTP request with cookies automatically included
2. Server extracts JWT from cookies
3. Server validates token and user existence
4. Request proceeds if authentication successful

### SSO Token Generation (E-Lock)
1. Authenticated user requests SSO token
2. Server generates short-lived JWT (10 minutes)
3. Token contains only ie_code_no for security
4. Client redirects to E-Lock system with token parameter

## Security Considerations for HTTP

### What's Protected
- Tokens are httpOnly (cannot be accessed via JavaScript)
- Tokens have short expiration times
- User validation on every request
- Activity logging for audit trails

### HTTP-Specific Considerations
- Cookies use sameSite="lax" for cross-origin compatibility
- secure=false allows transmission over HTTP
- CORS properly configured for specific origins

## Testing Configuration

### Local Development
- Server: http://localhost:9001
- Client: http://localhost:3001
- E-Lock: http://elock-tracking.s3-website.ap-south-1.amazonaws.com

### Production URLs (HTTP)
- Configure in .env file with your production HTTP URLs
- Update CORS origins in app.js

## Troubleshooting

### Common Issues
1. **Cookies not being sent**: Check sameSite and secure settings
2. **CORS errors**: Verify origin configuration in app.js
3. **Token validation fails**: Ensure JWT_SECRET is consistent

### Debug Steps
1. Check browser network tab for cookie headers
2. Verify CORS preflight requests succeed
3. Check server logs for authentication errors

## Production Deployment Notes

### HTTP Production Environment
1. Ensure all URLs use HTTP protocol
2. Update CORS origins for production domains
3. Set appropriate JWT expiration times
4. Monitor authentication logs for issues

### Environment Variables
```env
NODE_ENV=production
PORT=9001
JWT_SECRET=your-secret-key
DEV_MONGODB_URI=your-mongodb-connection
DEV_CLIENT_URI=http://your-production-domain
```

## E-Lock Module SSO Implementation

### 1. SSO Token Flow
1. User clicks E-Lock module on dashboard
2. Frontend calls `/api/generate-sso-token` with authentication
3. Backend validates user and generates standardized JWT token
4. Token includes required fields: `sub`, `ie_code_no`, `name`, `exp`, `iat`
5. Frontend redirects to: `http://elock-tracking.s3-website.ap-south-1.amazonaws.com/?token={JWT_TOKEN}`
6. E-Lock system validates token and logs user in

### 2. Security Considerations
- Token expires after 10 minutes
- Activity is logged in the ActivityLog model
- HTTP-compatible while maintaining security best practices
- Cross-origin requests handled properly

## E-Lock URL Environment Variables

To make the E-Lock URL dynamic for both development and production, use environment variables in both frontend and backend:

### Frontend (.env)
```
REACT_APP_ELOCK_URL=http://localhost:3005
# For production, set to: http://elock-tracking.s3-website.ap-south-1.amazonaws.com/
```

### Backend (.env)
```
ELOCK_URL=http://localhost:3005/
# For production, set to: http://elock-tracking.s3-website.ap-south-1.amazonaws.com/
```

- The application will use the environment variable if set, otherwise fallback to localhost:3005 in development and the S3 URL in production.
- Update your deployment environment variables as needed to switch between environments.

## Implementation Status

✅ HTTP cookie configuration complete
✅ CORS setup for HTTP domains
✅ JWT token generation working
✅ SSO token endpoint implemented
✅ Authentication middleware updated
✅ Standardized JWT format with required fields
✅ Activity logging configured

## Next Steps

1. Test complete authentication flow
2. Verify SSO redirection works
3. Test in production HTTP environment
4. Monitor for any authentication issues
