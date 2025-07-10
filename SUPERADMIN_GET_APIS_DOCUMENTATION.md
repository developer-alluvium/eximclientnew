# SuperAdmin GET APIs Documentation

## Overview
This document provides a comprehensive list of all GET APIs available for SuperAdmin functionality, specifically focusing on how they fetch data for customer management, registration processes, and active/inactive status tracking.

---

## 📊 Dashboard & Analytics APIs

### 1. GET `/api/dashboard/analytics`
**Purpose**: Fetch comprehensive dashboard analytics and metrics
**Authentication**: SuperAdmin token required
**Frontend Hook**: `getDashboardAnalytics()`

#### Data Fetched:
- **Total Customers**: Count from `customerKyc` collection
- **KYC Verified Customers**: Count with `approval = 'Approved'`
- **Active Sessions**: Customers with login today
- **Active/Inactive Customer Counts**: From `customer` collection based on `isActive` field
- **Recent Logins**: Customer activity within specified time range
- **New Registrations**: New customers created in time range
- **Job Statistics**: Total, active, completed, pending jobs
- **System Metrics**: Memory usage, uptime, error rates

#### Response Structure:
```json
{
  "success": true,
  "data": {
    "totalCustomers": 150,
    "kycRecords": 120,
    "activeSessions": 25,
    "users": {
      "total": 150,
      "active": 130,
      "inactive": 20,
      "recentLogins": 45,
      "newRegistrations": 5,
      "growthTrend": 3.33,
      "kycVerified": 120
    },
    "jobs": { "total": 500, "active": 50, "completed": 400, "pending": 50 },
    "system": { "uptime": 86400, "memory": { "used": 256, "total": 512 } }
  }
}
```

### 2. GET `/api/dashboard/user-activity`
**Purpose**: Fetch user activity logs for monitoring
**Authentication**: SuperAdmin token required
**Frontend Hook**: `getUserActivity(type, limit)`
**Query Parameters**: 
- `type`: 'active', 'inactive', 'recent' (default: 'active')
- `limit`: Number of records (default: 5)

#### Data Fetched:
- User login/logout activities
- Recent user interactions
- Customer status changes
- Activity timestamps and metadata

---

## 👥 Customer Management APIs

### 3. GET `/api/registered-customers`
**Purpose**: Fetch all registered customers from the customer collection
**Authentication**: SuperAdmin token required
**Frontend Hook**: `getCustomers()`

#### How Customer Registration Works:
1. **Customer KYC Application**: Customer submits KYC through external process
2. **KYC Approval**: SuperAdmin approves KYC (sets `approval = 'Approved'` in `customerKyc`)
3. **Customer Registration**: SuperAdmin creates account using approved KYC data
4. **Account Creation**: New document created in `customer` collection with:
   - Name from KYC record
   - IE code from associated job
   - Generated password (IE code + PAN pattern)
   - `isActive: true` by default

#### Data Fetched:
- All customers from `customer` collection
- Customer details: name, IE code, PAN, email, phone
- Account status: `isActive`, `password_changed`
- Registration timestamp, last login
- Assigned modules array

#### Response Structure:
```json
{
  "success": true,
  "data": [
    {
      "_id": "customer_id",
      "name": "ABC Corp",
      "ie_code_no": "ABCD1234567",
      "pan_number": "ABCDE1234F",
      "email": "contact@abc.com",
      "phone": "9876543210",
      "isActive": true,
      "password_changed": false,
      "assignedModules": ["/importdsr", "/netpage"],
      "createdAt": "2024-01-15T10:30:00Z",
      "lastLogin": "2024-01-20T14:45:00Z"
    }
  ]
}
```

### 4. GET `/api/customer-kyc-list`
**Purpose**: Fetch approved KYC records available for customer registration
**Authentication**: SuperAdmin token required
**Frontend Hook**: `getKycRecords()`

#### How KYC Process Works:
1. **External KYC Submission**: Customers submit KYC documents externally
2. **KYC Review**: Documents reviewed and status updated
3. **Approval**: KYC marked as `approval = 'Approved'`
4. **Registration Ready**: Approved KYCs appear in this list for account creation

#### Data Fetched:
- KYC records with `approval = 'Approved'`
- Customer business details: company name, address, contact info
- Legal documents: PAN, GST, import license details
- Registration readiness status

#### Response Structure:
```json
{
  "success": true,
  "data": [
    {
      "_id": "kyc_id",
      "name_of_individual": "XYZ Traders",
      "pan_no": "XYZAB1234C",
      "gst_no": "27XYZAB1234C1Z5",
      "iec_no": "XYZD1234567",
      "approval": "Approved",
      "mobile_no": "9876543210",
      "email_id": "info@xyztraders.com",
      "office_address": "123 Business District",
      "createdAt": "2024-01-10T09:00:00Z"
    }
  ]
}
```

### 5. GET `/api/inactive-customers`
**Purpose**: Fetch customers who have KYC but no active account
**Authentication**: SuperAdmin token required
**Frontend Hook**: `getInactiveCustomers()`

#### How Inactive Customer Detection Works:
1. **Data Comparison**: Compares `customerKyc` vs `customer` collections
2. **Missing Accounts**: Finds approved KYCs without corresponding customer accounts
3. **Status Analysis**: Identifies customers who:
   - Have approved KYC records
   - Don't have accounts in customer collection
   - Have accounts but marked as `isActive: false`

#### Data Fetched:
- Approved KYC records without customer accounts
- Inactive customer accounts
- Registration gap analysis
- Potential account creation candidates

#### Response Structure:
```json
{
  "success": true,
  "data": {
    "inactiveCustomers": [
      {
        "_id": "kyc_id",
        "name_of_individual": "Inactive Corp",
        "pan_no": "INACT1234E",
        "iec_no": "INAC1234567",
        "approval": "Approved",
        "hasAccount": false,
        "reason": "KYC approved but no customer account created"
      }
    ],
    "summary": {
      "totalInactive": 5,
      "noAccount": 3,
      "inactiveAccounts": 2
    }
  }
}
```

---

## 🔧 Module Management APIs

### 6. GET `/api/modules/available`
**Purpose**: Fetch all available modules in the system
**Authentication**: SuperAdmin token required
**Frontend Hook**: `getAvailableModules()`

#### Data Fetched:
- System-wide module catalog
- Module metadata: ID, name, description, category
- Module types: core, beta, external
- Access URLs and routing information

#### Available Modules:
1. **Import DSR** (`/importdsr`) - Core import tracking
2. **CostIQ** (`/netpage`) - Cost calculation
3. **SnapCheck** (External) - Quality control
4. **QR Locker** (External) - Digital locker
5. **Task Flow AI** (External) - Task management
6. **E-Lock** (`#`) - Document security

### 7. GET `/api/modules/customer/:customerId`
**Purpose**: Fetch specific customer's module assignments
**Authentication**: SuperAdmin token required
**Frontend Hook**: `getCustomerModuleAssignments(customerId)`

#### Data Fetched:
- Customer's currently assigned modules
- Available modules for assignment
- Module assignment history
- Customer details for context

### 8. GET `/api/modules/customers`
**Purpose**: Fetch all customers with their module assignments
**Authentication**: SuperAdmin token required
**Frontend Hook**: `getAllCustomersWithModules()`

#### Data Fetched:
- Complete customer list with module mappings
- Module assignment overview
- Bulk assignment preparation data
- Module usage statistics

---

## 🔐 Authentication & Profile APIs

### 9. GET `/api/superadmin/profile`
**Purpose**: Fetch SuperAdmin profile information
**Authentication**: SuperAdmin token required

#### Data Fetched:
- SuperAdmin account details
- Session information
- Access permissions
- Account status

---

## 📈 System Metrics APIs

### 10. GET `/api/dashboard/system-metrics`
**Purpose**: Fetch system performance metrics
**Authentication**: SuperAdmin token required

#### Data Fetched:
- Server performance metrics
- Memory and CPU usage
- Database connection status
- Application health indicators

### 11. GET `/api/dashboard/historical`
**Purpose**: Fetch historical analytics data
**Authentication**: SuperAdmin token required

#### Data Fetched:
- Trend analysis data
- Historical performance metrics
- Growth patterns
- Comparative analytics

---

## 🏢 Column Permissions APIs

### 12. GET `/api/available-columns`
**Purpose**: Fetch available data columns for permission management
**Authentication**: SuperAdmin token required

#### Data Fetched:
- System-wide available data columns
- Column metadata and descriptions
- Permission-assignable fields
- Column categories and groups

### 13. GET `/api/customer/:customerId/column-permissions`
**Purpose**: Fetch specific customer's column permissions
**Authentication**: SuperAdmin token required

#### Data Fetched:
- Customer's current column access permissions
- Available columns for assignment
- Permission inheritance settings
- Access level configurations

---

## 🔄 Data Flow for Customer Registration

### Step 1: KYC Submission & Approval
```
External System → customerKyc collection (approval: 'Pending')
SuperAdmin Review → customerKyc.approval = 'Approved'
```

### Step 2: Registration Readiness Check
```
GET /api/customer-kyc-list → Approved KYCs ready for registration
```

### Step 3: Customer Account Creation
```
POST /api/register → Creates customer account
- Links to approved KYC record
- Generates initial password
- Sets isActive: true
- Assigns default modules
```

### Step 4: Active Customer Management
```
GET /api/registered-customers → All active customer accounts
GET /api/inactive-customers → KYCs without accounts or inactive accounts
```

---

## 🔍 Customer Status Detection Logic

### Active Customers:
- Have approved KYC records (`customerKyc.approval = 'Approved'`)
- Have customer accounts (`customer` collection)
- Account status is active (`customer.isActive = true`)
- Recent login activity (optional)

### Inactive Customers:
- **Type 1**: Approved KYC but no customer account
- **Type 2**: Customer account exists but `isActive = false`
- **Type 3**: Customer account with no recent activity

### Registration Process:
1. **KYC Approval**: External KYC system marks record as approved
2. **Account Creation**: SuperAdmin uses approved KYC to create customer account
3. **Password Generation**: System generates password using IE code + PAN pattern
4. **Module Assignment**: Default or custom modules assigned
5. **Activation**: Account marked as active and ready for use

---

## 🔧 API Authentication Flow

All SuperAdmin APIs require authentication:
1. **Login**: `POST /api/superadmin/login` returns JWT token
2. **Token Storage**: Frontend stores token in localStorage
3. **API Calls**: All requests include `Authorization: Bearer <token>`
4. **Validation**: Backend validates token using `protectSuperAdmin` middleware
5. **Response**: API returns data or 401 Unauthorized

---

## 📱 Frontend Integration

### API Hook Usage:
```javascript
const {
  getDashboardAnalytics,
  getCustomers,
  getKycRecords,
  getInactiveCustomers,
  getAvailableModules,
  loading,
  error
} = useSuperAdminApi();

// Fetch dashboard data
const analytics = await getDashboardAnalytics();

// Fetch customers
const customers = await getCustomers();

// Fetch inactive customers
const inactive = await getInactiveCustomers();
```

### Error Handling:
- All APIs return structured responses with `success` boolean
- Error messages included in response for user feedback
- Loading states managed through `loading` state
- Authentication errors trigger redirect to login

---

## 🗄️ Database Collections Used

### Primary Collections:
- **`customerKyc`**: KYC applications and approvals
- **`customer`**: Registered customer accounts
- **`job`**: Import/export job records (linked via IE codes)
- **`activityLog`**: User activity tracking

### Data Relationships:
- `customerKyc._id` → `customer.pan_id`
- `customer.ie_code_no` → `job.ie_code_no`
- `customer.assignedModules` → Module IDs array

---

*Last Updated: July 10, 2025*
*Document Version: 1.0*
*Status: Complete - All SuperAdmin GET APIs documented*
