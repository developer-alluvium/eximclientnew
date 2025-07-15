# Auto-Logout Implementation Documentation

## Overview
This document describes the comprehensive auto-logout functionality implemented across the entire ExIM Client application. The system automatically logs out users when their JWT tokens expire and provides session warnings.

## Implementation Details

### 1. Token Expiration Configuration

#### Backend Changes
- **Customer Controller**: Token expiration set to 12 hours (`JWT_EXPIRATION = "12h"`)
- **Auth Middleware**: Access token expiration set to 12 hours (`ACCESS_TOKEN_EXPIRES = "12h"`)
- **SuperAdmin Controller**: Token expiration already set to 12 hours

#### Files Modified:
- `d:\eximclient\server\controllers\customerController.js`
- `d:\eximclient\server\middlewares\authMiddleware.js`
- `d:\eximclient\server\controllers\superAdminController.js`

### 2. Enhanced Token Validation Utilities

#### File: `d:\eximclient\client\src\utils\tokenValidation.js`

**Functions Added/Enhanced:**
- `validateUserToken()`: Validates regular user tokens
- `validateSuperAdminToken()`: Validates SuperAdmin tokens (existing, enhanced)
- `isTokenExpired()`: Checks if JWT token is expired
- `getTokenExpirationStatus()`: Returns expiration status with warnings

### 3. Auto-Logout Hook

#### File: `d:\eximclient\client\src\hooks\useAutoLogout.js`

**Custom Hook: `useAutoLogout(userType, onTokenExpiry)`**
- **Purpose**: Provides automatic logout functionality
- **Features**:
  - Periodic token validation (every 30 seconds)
  - Axios response interceptor for 401/403 errors
  - Automatic cleanup on component unmount
  - Support for both regular users and SuperAdmin

**Custom Hook: `useSessionWarning(userType)`**
- **Purpose**: Shows session expiration warnings
- **Features**:
  - Warns users 30 minutes before token expiration
  - Displays human-readable time remaining
  - Dismissible warning alerts

### 4. Session Manager Component

#### File: `d:\eximclient\client\src\components\SessionManager.jsx`

**Features:**
- Global session management component
- Displays session expiration warnings
- Shows logout notifications
- Handles both regular users and SuperAdmin

### 5. Application Integration

#### Main App Component
- **File**: `d:\eximclient\client\src\App.js`
- **Changes**: Added SessionManager for regular users

#### SuperAdmin Dashboard
- **File**: `d:\eximclient\client\src\components\SuperAdmin\SuperAdminDashboard.jsx`
- **Changes**: 
  - Integrated with useAutoLogout hook
  - Removed duplicate auto-logout logic
  - Added SessionManager component

#### Regular Components Updated
1. **CImportDSR Component**
   - File: `d:\eximclient\client\src\components\CImportDSR.jsx`
   - Enhanced logout function with auto-logout integration

2. **HomePage Component**
   - File: `d:\eximclient\client\src\pages\HomePage.jsx`
   - Integrated with auto-logout functionality

3. **NetPage Component**
   - File: `d:\eximclient\client\src\components\Net weight\NetPage.jsx`
   - Enhanced logout function with auto-logout integration

## Last Logout Time Tracking

### Overview
The system now tracks both `lastLogin` and `lastLogout` times for all user types in their respective database tables.

### Database Schema Updates

#### Customer Model
- **File**: `d:\eximclient\server\models\customerModel.js`
- **New Field**: `lastLogout: Date` - Stores the timestamp when user logged out

#### SuperAdmin Model
- **File**: `d:\eximclient\server\models\superAdminModel.js`
- **New Field**: `lastLogout: Date` - Stores the timestamp when SuperAdmin logged out

### Backend Implementation

#### Customer Logout Endpoint
- **File**: `d:\eximclient\server\controllers\customerController.js`
- **Enhancement**: Updates `lastLogout` field in customer record
- **Features**:
  - Accepts `user_id` in request body for user identification
  - Updates logout time before clearing cookies
  - Logs logout activity with timestamp

#### SuperAdmin Logout Endpoint
- **File**: `d:\eximclient\server\controllers\superAdminController.js`
- **New Endpoint**: `POST /api/superadmin/logout`
- **Features**:
  - Accepts `userId` in request body
  - Updates `lastLogout` field in SuperAdmin record
  - Returns success confirmation

### Frontend Implementation

#### Auto-Logout Hook Enhancement
- **File**: `d:\eximclient\client\src\hooks\useAutoLogout.js`
- **Enhancement**: Includes user ID in logout API calls
- **Features**:
  - Sends user identification data to logout endpoints
  - Handles both regular users and SuperAdmin logout time tracking
  - Ensures logout time is recorded even during automatic logout

#### Component Updates
All logout functions in components now include user ID for proper logout time tracking:

1. **CImportDSR Component**
   - Sends user ID to logout API
   - Maintains activity logging functionality

2. **HomePage Component**
   - Includes user ID in logout request
   - Preserves existing logout flow

3. **NetPage Component**
   - Adds user ID to logout API call
   - Maintains activity logging

4. **SuperAdmin Dashboard**
   - Calls SuperAdmin logout endpoint with user ID
   - Maintains localStorage cleanup

### Usage Benefits

1. **Activity Tracking**: Complete audit trail of user sessions
2. **Security Monitoring**: Track login/logout patterns
3. **Analytics**: Session duration analysis
4. **Compliance**: Meet audit requirements for user activity tracking

### Database Queries

#### Get Customer Login/Logout History
```javascript
const customer = await CustomerModel.findById(userId).select('lastLogin lastLogout');
```

#### Get SuperAdmin Login/Logout History
```javascript
const superAdmin = await SuperAdminModel.findById(userId).select('lastLogin lastLogout');
```

### Future Enhancements

1. **Session Duration Calculation**: Calculate time spent per session
2. **Reporting Dashboard**: Visual representation of login/logout patterns
3. **Automated Cleanup**: Remove old logout records for performance
4. **Multi-Device Tracking**: Track logout times across multiple devices

## How It Works

### 1. Token Expiration Detection
- **SuperAdmin**: JWT tokens are decoded client-side to check expiration
- **Regular Users**: Session validation API calls to backend every 30 seconds
- **Global**: Axios interceptor catches 401/403 responses

### 2. Automatic Logout Process
1. Token expiration detected
2. User logged out automatically
3. Local storage cleared
4. User redirected to appropriate login page
5. Optional callback executed

### 3. Session Warning System
- **SuperAdmin**: 30-minute warning before token expiration
- **Regular Users**: Can be extended to show API-based warnings
- **Display**: Fixed position alerts with dismiss functionality

### 4. Consistent Logout Experience
- All logout buttons now use the same auto-logout functionality
- Activity logging before logout
- Proper cleanup of user state
- Standardized error handling

## Testing

### 1. Manual Testing
1. Login as regular user or SuperAdmin
2. Wait for token expiration (or manually expire token)
3. Verify automatic logout occurs
4. Check session warnings appear at appropriate times

### 2. API Testing
- Test `/api/validate-session` endpoint with valid/invalid tokens
- Verify 401/403 responses trigger logout
- Check cookie-based authentication works properly

## Security Benefits

1. **Automatic Session Cleanup**: Prevents abandoned sessions
2. **Consistent Token Handling**: Unified approach across all components
3. **Proactive Warnings**: Users can save work before logout
4. **Activity Logging**: All logout events are logged for audit trails
5. **Secure Token Storage**: SuperAdmin tokens in localStorage, regular users use cookies

## Files Changed Summary

### Backend Files
- `server/controllers/customerController.js`
- `server/controllers/superAdminController.js`
- `server/middlewares/authMiddleware.js`
- `server/routes/customerRoutes.js`

### Frontend Files
- `client/src/utils/tokenValidation.js`
- `client/src/hooks/useAutoLogout.js`
- `client/src/components/SessionManager.jsx`
- `client/src/App.js`
- `client/src/components/SuperAdmin/SuperAdminDashboard.jsx`
- `client/src/components/CImportDSR.jsx`
- `client/src/pages/HomePage.jsx`
- `client/src/components/Net weight/NetPage.jsx`

## Configuration

### Token Expiration Times
- **Regular Users**: 12 hours
- **SuperAdmin**: 12 hours
- **Refresh Tokens**: 7 days (unchanged)

### Warning Timing
- **Session Warning**: 30 minutes before expiration
- **Validation Interval**: Every 30 seconds
- **Warning Check**: Every 60 seconds

## Deployment Notes

1. **Backend**: Restart server to apply token expiration changes
2. **Frontend**: Clear browser cache after deployment
3. **Testing**: Verify all logout flows work correctly
4. **Monitoring**: Check logs for auto-logout events

## Future Enhancements

1. **Configurable Warning Times**: Allow admins to set warning intervals
2. **Session Extension**: Option to extend session before expiration
3. **Multiple Device Management**: Track sessions across devices
4. **Enhanced Security**: Add device fingerprinting
5. **Real-time Notifications**: WebSocket-based session alerts

This implementation provides a robust, secure, and user-friendly auto-logout system that works consistently across the entire application.
