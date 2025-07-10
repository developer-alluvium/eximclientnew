# SuperAdmin API Documentation

## Overview
This document provides a comprehensive list of all SuperAdmin APIs, their functionality, and data flow. All SuperAdmin APIs require JWT authentication with a valid SuperAdmin token.

---

## Authentication APIs

### 1. SuperAdmin Login
- **Endpoint:** `POST /api/superadmin/login`
- **Purpose:** Authenticate SuperAdmin users
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "username": "superadmin",
    "password": "password"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "jwt_token_here",
    "user": {
      "id": "superadmin_id",
      "username": "superadmin"
    }
  }
  ```

### 2. SuperAdmin Logout
- **Endpoint:** `POST /api/superadmin/logout`
- **Purpose:** Invalidate SuperAdmin session
- **Auth Required:** Yes
- **Response:** Success confirmation

### 3. SuperAdmin Profile
- **Endpoint:** `GET /api/superadmin/profile`
- **Purpose:** Get current SuperAdmin profile information
- **Auth Required:** Yes
- **Response:** SuperAdmin profile data

---

## Dashboard & Analytics APIs

### 4. Dashboard Analytics
- **Endpoint:** `GET /api/dashboard/analytics`
- **Purpose:** Get comprehensive dashboard statistics and metrics
- **Auth Required:** Yes
- **Query Parameters:**
  - `timeRange`: `1d`, `7d`, `30d`, `90d` (default: `7d`)
- **Data Fetched:**
  - **Customer Metrics:**
    - Total customers from KYC collection
    - KYC verified customers (approval = 'Approved')
    - Active/Inactive customers
    - Recent login activity
    - New registrations in time range
    - Active sessions (daily)
  - **Job Metrics:**
    - Total jobs
    - Jobs by status (active, completed, pending)
    - Recent job activity
  - **System Metrics:**
    - Server uptime
    - Memory usage percentage
    - Performance indicators
- **Response Example:**
  ```json
  {
    "success": true,
    "data": {
      "customers": {
        "total": 156,
        "kycVerified": 134,
        "active": 128,
        "inactive": 6,
        "recentLogins": 45,
        "newRegistrations": 12,
        "activeSessions": 23
      },
      "jobs": {
        "total": 2450,
        "active": 45,
        "completed": 2300,
        "pending": 105,
        "recentActivity": 67
      },
      "system": {
        "uptime": 345600,
        "memoryUsage": 78
      }
    }
  }
  ```

### 5. User Activity
- **Endpoint:** `GET /api/dashboard/user-activity`
- **Purpose:** Get recent user activity logs and statistics
- **Auth Required:** Yes
- **Query Parameters:**
  - `type`: `active`, `all` (default: `active`)
  - `limit`: number of records (default: `5`)
- **Data Fetched:**
  - Customer login/logout activities
  - Session management logs
  - Recent customer actions
- **Response:** List of user activities with timestamps

### 6. System Metrics
- **Endpoint:** `GET /api/dashboard/system-metrics`
- **Purpose:** Get detailed system performance metrics
- **Auth Required:** Yes
- **Data Fetched:**
  - Server performance data
  - Database connection stats
  - API response times

### 7. Historical Analytics
- **Endpoint:** `GET /api/dashboard/historical`
- **Purpose:** Get historical data for charts and trends
- **Auth Required:** Yes
- **Data Fetched:**
  - Customer growth over time
  - Activity trends
  - Performance history

---

## Customer Management APIs

### 8. Get All Customers (Unified API) ⭐ **OPTIMIZED**
- **Endpoint:** `GET /api/customers`
- **Purpose:** Unified API to fetch customers with filtering capabilities
- **Auth Required:** Yes
- **Query Parameters:**
  - `status`: `all`, `registered`, `inactive`, `pending` (default: `all`)
  - `approval`: `approved`, `pending`, `rejected` (filter by KYC approval status)
  - `includeKyc`: `true`, `false` (include KYC data in response)
- **Data Processing:**
  1. **Base Query**: Starts with KYC collection as the source of truth
  2. **Join Customer Data**: Left joins with Customer collection
  3. **Apply Filters**: Filters based on query parameters
  4. **Field Mapping**: Standardizes field names across collections
- **Response Examples:**

**All Customers (`?status=all`):**
```json
{
  "success": true,
  "data": {
    "registered": [
      {
        "id": "customer_id",
        "ie_code_no": "0805002146",
        "pan_number": "AKTPS8859A",
        "name": "REGISTERED_CUSTOMER",
        "status": "registered",
        "isActive": true,
        "kycApproval": "Approved",
        "registeredAt": "2025-01-15T10:30:00Z",
        "lastLogin": "2025-01-20T14:45:00Z",
        "assignedModules": ["/importdsr", "/netpage"]
      }
    ],
    "inactive": [
      {
        "id": "kyc_record_id", 
        "ie_code_no": "0805002147",
        "pan_number": "BKTPS8859B",
        "name": "INACTIVE_CUSTOMER",
        "status": "inactive",
        "kycApproval": "Approved",
        "kycApprovedAt": "2025-06-28T09:36:46.993Z",
        "isRegistered": false
      }
    ],
    "summary": {
      "total": 150,
      "registered": 127,
      "inactive": 23,
      "pendingKyc": 5
    }
  }
}
```

**Registered Only (`?status=registered`):**
```json
{
  "success": true,
  "data": [/* registered customers only */],
  "count": 127
}
```

**Inactive Only (`?status=inactive`):**
```json
{
  "success": true, 
  "data": [/* KYC approved but not registered */],
  "count": 23
}
```

### 9. Get Customer Details
- **Endpoint:** `GET /api/customer/:customerId`
- **Purpose:** Get detailed information for a specific customer
- **Auth Required:** Yes
- **Response:** Complete customer profile with KYC and module data

### 10. Register Customer
- **Endpoint:** `POST /api/register`
- **Purpose:** Register a new customer from approved KYC data
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "ie_code_no": "0805002146",
    "pan_number": "AKTPS8859A",
    "name": "CUSTOMER_NAME",
    "password": "generated_password"
  }
  ```
- **Process:**
  1. Validates KYC approval status
  2. Creates customer record
  3. Generates secure password
  4. Returns registration confirmation

### 11. Update Customer Password
- **Endpoint:** `PUT /api/customer/:customerId/password`
- **Purpose:** Update a customer's password (SuperAdmin only)
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "newPassword": "new_secure_password"
  }
  ```

---

## Module Management APIs

### 12. Get Available Modules
- **Endpoint:** `GET /api/modules/available`
- **Purpose:** Get all modules available for assignment to customers
- **Auth Required:** Yes
- **Data Fetched:**
  - List of all application modules
  - Module metadata (name, description, category)
- **Response:** Array of module objects

### 13. Get Customer Module Assignments
- **Endpoint:** `GET /api/modules/customer/:customerId`
- **Purpose:** Get modules assigned to a specific customer
- **Auth Required:** Yes
- **Response:** List of assigned module IDs for the customer

### 14. Update Customer Module Assignments
- **Endpoint:** `PUT /api/modules/customer/:customerId`
- **Purpose:** Update modules assigned to a customer
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "assignedModules": ["module1", "module2", "module3"]
  }
  ```
- **Process:**
  1. Updates customer's module assignments
  2. Refreshes user session data if customer is currently logged in

### 15. Get All Customers with Modules
- **Endpoint:** `GET /api/modules/customers`
- **Purpose:** Get all customers with their current module assignments
- **Auth Required:** Yes
- **Data Fetched:**
  - Customer basic info
  - Assigned modules for each customer
  - Module assignment statistics
- **Used By:** Module Management interface

### 16. Bulk Assign Modules
- **Endpoint:** `POST /api/modules/bulk-assign`
- **Purpose:** Assign modules to multiple customers simultaneously
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "assignments": [
      {
        "customerId": "customer1_id",
        "moduleIds": ["module1", "module2"]
      },
      {
        "customerId": "customer2_id", 
        "moduleIds": ["module1", "module3"]
      }
    ]
  }
  ```

---

## Column Permissions APIs

### 17. Get Available Columns
- **Endpoint:** `GET /api/available-columns`
- **Purpose:** Get all columns available for permission management
- **Auth Required:** Yes
- **Data Fetched:** List of all data table columns that can be shown/hidden

### 18. Get Customer Column Permissions
- **Endpoint:** `GET /api/customer/:customerId/column-permissions`
- **Purpose:** Get column visibility permissions for a specific customer
- **Auth Required:** Yes
- **Response:** Customer's column visibility settings

### 19. Update Customer Column Permissions
- **Endpoint:** `PUT /api/customer/:customerId/column-permissions`
- **Purpose:** Update column permissions for a customer
- **Auth Required:** Yes
- **Request Body:** Column permission settings

### 20. Bulk Update Column Permissions
- **Endpoint:** `POST /api/bulk-column-permissions`
- **Purpose:** Update column permissions for multiple customers
- **Auth Required:** Yes
- **Request Body:** Bulk permission updates

---

## Data Flow Summary

### Optimized Customer Management Flow:
1. **Single Source of Truth** → `GET /api/customers` with filtering replaces 3 separate APIs
2. **KYC Submission** → Customer submits KYC documents
3. **KYC Approval** → SuperAdmin approves KYC (sets `approval: 'Approved'`)
4. **Unified Customer View** → `GET /api/customers?status=all` shows complete picture
5. **Filter by Status** → Use query parameters to get specific customer types:
   - `?status=registered` → Active customer accounts
   - `?status=inactive` → Approved KYC but no account
   - `?status=pending` → Pending KYC approval
6. **Customer Registration** → `POST /api/register` creates customer account
7. **Updated View** → Customer moves from inactive to registered status

### API Optimization Benefits:
- **Reduced API Calls**: One endpoint instead of three
- **Consistent Data**: Single query ensures data consistency
- **Better Performance**: Eliminates redundant database queries
- **Easier Maintenance**: One endpoint to maintain instead of three
- **Flexible Filtering**: Query parameters provide granular control

### Module Assignment Flow:
1. **Get Available Modules** → `GET /api/modules/available`
2. **View Current Assignments** → `GET /api/modules/customers`
3. **Update Assignments** → `PUT /api/modules/customer/:id` or `POST /api/modules/bulk-assign`
4. **Auto-refresh** → User sessions updated automatically

### Dashboard Data Flow:
1. **Real-time Analytics** → `GET /api/dashboard/analytics` aggregates live data
2. **Activity Monitoring** → `GET /api/dashboard/user-activity` tracks user actions
3. **System Health** → `GET /api/dashboard/system-metrics` monitors performance

---

## Authentication & Security

### Token Validation:
- All SuperAdmin APIs require valid JWT token
- Token validation happens via `protectSuperAdmin` middleware
- Tokens include SuperAdmin permissions and session data

### Security Features:
- SuperAdmin-only access to all customer data
- Password management capabilities
- Session monitoring and control
- Module access control

---

## Error Handling

### Common Error Responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

### HTTP Status Codes:
- `200` - Success
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error

---

## Usage Examples

### Dashboard Integration:
```javascript
// Get dashboard data
const analytics = await getDashboardAnalytics();
const userActivity = await getUserActivity('active', 10);

// Display real-time customer stats
console.log(`Total Customers: ${analytics.data.customers.total}`);
console.log(`Active Sessions: ${analytics.data.customers.activeSessions}`);
```

### Customer Management:
```javascript
// Get all customers with status breakdown (OPTIMIZED)
const allCustomers = await getCustomers('all');
console.log(`Total: ${allCustomers.data.summary.total}`);
console.log(`Registered: ${allCustomers.data.summary.registered}`);
console.log(`Inactive: ${allCustomers.data.summary.inactive}`);

// Get only inactive customers ready for registration
const inactiveCustomers = await getCustomers('inactive');
console.log(`${inactiveCustomers.count} customers ready for registration`);

// Get only registered customers
const registeredCustomers = await getCustomers('registered');

// Register a customer
const registrationData = {
  ie_code_no: "0805002146",
  pan_number: "AKTPS8859A", 
  name: "CUSTOMER_NAME"
};
await registerCustomer(registrationData);
```

### Module Management:
```javascript
// Get all customers with their modules
const customersWithModules = await getAllCustomersWithModules();

// Bulk assign modules
const assignments = [
  { customerId: "customer1", moduleIds: ["module1", "module2"] },
  { customerId: "customer2", moduleIds: ["module1", "module3"] }
];
await bulkAssignModules({ assignments });
```

---

*Last Updated: July 10, 2025*
*SuperAdmin API Version: 1.0*
