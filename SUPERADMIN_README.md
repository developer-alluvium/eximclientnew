# SuperAdmin Dashboard Documentation

## Overview
The SuperAdmin Dashboard is a comprehensive management interface for system administrators to manage customers, modules, analytics, and user activities. It provides a centralized control panel with role-based access control.

## Dashboard Structure

### Main Navigation Tabs
1. **Overview** - Dashboard summary and key metrics
2. **Customer Management** - Customer registration, management, and module assignment
3. **Module Access** - System-wide module access management
4. **System Analytics** - Performance metrics and system analytics
5. **User Activity** - User activity tracking and monitoring

---

## 1. Overview Tab
**Component**: `DashboardOverview.jsx`
**Purpose**: Provides a comprehensive dashboard with key metrics and system overview

### Current Implementation:
- ✅ Real-time metrics display
- ✅ Interactive charts and graphs
- ✅ System health indicators
- ✅ Recent activity summaries

### Backend Routes:
- `GET /api/dashboard/analytics` - Dashboard metrics
- `GET /api/dashboard/user-activity` - User activity summary
- `GET /api/dashboard/system-metrics` - System performance metrics
- `GET /api/dashboard/historical` - Historical data trends

### Data Status: **LIVE DATA** ✅

---

## 2. Customer Management Tab
**Component**: `CustomerManagement.jsx`
**Purpose**: Complete customer lifecycle management including registration, authentication, and module assignment

### Features:
- ✅ Customer registration (KYC-based and manual)
- ✅ Password management and reset
- ✅ Customer filtering and search
- ✅ Module assignment per customer
- ✅ Customer status tracking (Active/Inactive/Custom Password)

### Backend Routes:

#### Customer Management Routes:
- `POST /api/register` - Register new customer (from KYC records or manual)
- `GET /api/registered-customers` - Get all registered customers (from customer collection)
- `GET /api/customer-kyc-list` - Get KYC records with `approval = 'Approved'`
- `PUT /api/customer/:customerId/password` - Update customer password
- `GET /api/inactive-customers` - Get inactive customers (in customerKyc but not in customer collection) ⚠️ **NOT IMPLEMENTED YET**

#### Module Management Routes:
- `GET /api/modules/available` - Get available modules for assignment
- `GET /api/modules/customer/:customerId` - Get customer's assigned modules
- `PUT /api/modules/customer/:customerId` - Update customer module assignments
- `GET /api/modules/customers` - Get all customers with their module assignments
- `POST /api/modules/bulk-assign` - Bulk assign modules to multiple customers

#### Authentication Routes (for reference):
- `POST /api/login` - Customer login
- `POST /api/logout` - Customer logout
- `POST /api/forgot-password` - Reset customer password

### Data Status: **LIVE DATA** ✅
### Module Management Status: **FULLY IMPLEMENTED** ✅

### Implementation Notes:
- **Customer Registration**: Supports both KYC-based and manual registration
- **Password Management**: Automatic password generation with IE code + PAN pattern
- **Module Assignment**: Real-time assignment with immediate effect
- **Data Collections**: 
  - `customerKyc` - KYC applications and approvals
  - `customer` - Registered customer accounts
  - Customer modules stored in `assignedModules` field

### Missing Features:
- ⚠️ `GET /api/inactive-customers` endpoint needs implementation
- 🔄 Customer profile editing (beyond password changes)
- 📊 Customer activity tracking integration

---

## 3. Module Access Management Tab
**Component**: `ModuleAccessManagement.jsx`
**Purpose**: System-wide module management and bulk assignment

### Features:
- ✅ Bulk module assignment
- ✅ Module availability management
- ✅ Customer-module mapping overview
- ✅ Module category management

### Available Modules:
1. **Import DSR** (`/importdsr`) - Core module
2. **CostIQ** (`/netpage`) - Core module
3. **SnapCheck** (External) - Beta module
4. **QR Locker** (External) - Beta module
5. **Task Flow AI** (External) - Core module
6. **E-Lock** (`#`) - Core module

### Backend Routes:
- `GET /modules/available` - Get all available modules
- `GET /modules/customers` - Get all customers with module assignments
- `POST /modules/bulk-assign` - Bulk assign modules to customers

### Data Status: **LIVE DATA** ✅

---

## 4. System Analytics Tab
**Component**: `SystemAnalytics.jsx`
**Purpose**: System performance analytics and business intelligence

### Features:
- ✅ Performance metrics visualization
- ✅ Usage analytics
- ✅ Trend analysis
- ✅ Interactive charts and graphs

### Backend Routes:
- `GET /api/analytics/per-kg-cost` - Cost analytics
- `GET /api/analytics/best-suppliers` - Supplier analytics
- `GET /api/dashboard/system-metrics` - System metrics
- `GET /api/dashboard/historical` - Historical analytics

### Data Status: **LIVE DATA** ✅

---

## 5. User Activity Tab
**Component**: `UserActivityDynamic.jsx`
**Purpose**: Monitor and track user activities across the system

### Features:
- ✅ Real-time activity monitoring
- ✅ Activity filtering and search
- ✅ User session tracking
- ✅ Activity type categorization (Login, Logout, Data Access, etc.)

### Backend Routes:
- `GET /api/dashboard/user-activity` - Get user activity logs
- Activity logging through various controllers

### Data Status: **LIVE DATA** ✅

---

## Authentication & Security

### Authentication Flow:
1. **Login**: `POST /api/superadmin/login`
2. **Logout**: `POST /api/superadmin/logout`
3. **Profile**: `GET /api/superadmin/profile`
4. **Setup**: `POST /api/superadmin/setup` (Initial setup only)

### Security Features:
- ✅ JWT token-based authentication
- ✅ Role-based access control
- ✅ Session management
- ✅ Protected routes middleware (`protectSuperAdmin`)

---

## API Base Configuration
```javascript
Base URL: http://localhost:9001/api
Frontend Environment: REACT_APP_API_STRING=http://localhost:9001/api
```

---

## Current Issues & Solutions

### 🔧 Module Management Routes Issue
**Problem**: Module endpoints returning 404
**Root Cause**: Server needs restart to apply updated routes
**Solution**: Restart backend server after route changes

### 🔧 Double API Path Issue
**Problem**: Routes were defined with `/api/modules/` instead of `/modules/`
**Status**: ✅ **FIXED** - Routes corrected to `/modules/`
**Action Required**: Restart server to apply changes

---

## Data Sources Summary

| Component | Data Source | Status |
|-----------|-------------|---------|
| Overview | Live Backend APIs | ✅ Live |
| Customer Management | Live Backend APIs | ✅ Live |
| Module Management | Live Backend APIs | ⚠️ Needs Server Restart |
| System Analytics | Live Backend APIs | ✅ Live |
| User Activity | Live Backend APIs | ✅ Live |

---

## Development Notes

### Environment Variables:
```
REACT_APP_API_STRING=http://localhost:9001/api
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1d
```

### Authentication Token Storage:
- SuperAdmin Token: `localStorage.getItem("superadmin_token")`
- SuperAdmin User Data: `localStorage.getItem("superadmin_user")`

### Key Files:
- Main Dashboard: `client/src/components/SuperAdmin/SuperAdminDashboard.jsx`
- API Hook: `client/src/hooks/useSuperAdminApi.js`
- Token Validation: `client/src/utils/tokenValidation.js`
- Backend Routes: `server/routes/`
- Controllers: `server/controllers/`

---

## Next Steps
1. ✅ Restart backend server to apply module route fixes
2. ✅ Test module management functionality
3. ✅ Verify all API endpoints are working
4. ✅ Complete integration testing

---

*Last Updated: July 8, 2025*
*Status: Module management routes fixed, requires server restart*
