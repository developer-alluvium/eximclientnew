# EXIM Client - Complete Documentation

---

## TABLE OF CONTENTS

### Part 1: Non-Technical Guide

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Getting Started - User Guide](#getting-started---user-guide)
4. [Glossary of Terms](#glossary-of-terms)

### Part 2: Technical Guide

1. [Architecture Overview](#architecture-overview)
2. [Setup & Installation](#setup--installation)
3. [Project Structure](#project-structure)
4. [API Reference](#api-reference)
5. [How to Contribute](#how-to-contribute)

---

# PART 1: NON-TECHNICAL GUIDE

## Project Overview

### What is EXIM Client?

EXIM Client is a comprehensive web-based platform designed to streamline import-export operations and customs management for businesses involved in international trade. The system provides an intuitive interface for managing shipments, tracking deliveries, handling customs documentation, and analyzing trade activities. It serves as a central hub where importers, exporters, administrators, and superadmins can collaborate efficiently to manage their export-import business operations.

### What Problem Does This Project Solve?

- **Complex Documentation**: Simplifies the management of customs forms, IE codes, and trade documentation
- **Poor Visibility**: Provides real-time tracking and dashboards for shipment status and business analytics
- **Operational Inefficiency**: Automates routine tasks and job management across the supply chain
- **Access Control Issues**: Implements role-based access to ensure only authorized personnel can perform specific actions
- **Data Fragmentation**: Consolidates all trade-related data in one centralized platform

### Who Is This Project For?

- **Importers & Exporters**: Manage their shipments and trade operations
- **Administrators**: Oversee organizational operations and user management
- **Super Admins**: Manage system-wide configurations and multi-organization access
- **Business Analysts**: View analytics and reports on trade activities
- **Logistics & Customs Teams**: Track and update shipment status

---

## Key Features

### 1. **Multi-Role User Management**

Users can have different roles (Customer, Admin, Super Admin) with specific permissions. Each role has access to different features and information, ensuring data security and appropriate access levels. This allows organizations to assign responsibilities based on job roles.

### 2. **Job & Shipment Tracking**

Monitor the complete lifecycle of shipments from creation to delivery. Users can view job status in real-time, receive notifications about updates, and access detailed job information including delivery addresses and customs documentation.

### 3. **Dashboard & Analytics**

Get visual insights into your business operations with interactive dashboards displaying key metrics like shipment volumes, pending tasks, user activity, and financial analytics. Generate reports to understand trends and make data-driven decisions.

### 4. **Delivery Management**

Manage delivery addresses, track delivery status, and maintain delivery records. The system supports bulk operations and provides a comprehensive overview of all active and completed deliveries in your organization.

### 5. **Customs & IE Code Management**

Handle Import-Export (IE) codes, customs documentation, and integrate with government portals like iGate for seamless compliance. Administrators can manage IE codes for multiple organizations, and the system maintains audit trails for all customs-related activities.

---

## Getting Started - User Guide

### Common User Workflow

#### Step 1: Log In to the System

1. Navigate to the login page
2. Select your role type (Customer, Admin, or Super Admin)
3. Enter your email address and password
4. Click "Login"
5. If prompted, verify your email (if logging in for the first time)

#### Step 2: Access Your Dashboard

1. Once logged in, you'll see your personalized dashboard
2. The dashboard displays:
   - Overview of your active jobs/shipments
   - Pending tasks requiring action
   - Key performance metrics
   - Recent notifications

#### Step 3: Create or Manage a Job/Shipment

1. Navigate to the "Jobs" section from the menu
2. Click "Create New Job" to start a shipment
3. Fill in the required details:
   - Shipment type (Import/Export)
   - Destination/Origin
   - Cargo details
   - Delivery address
4. Click "Save" to create the job
5. Track the job status in the Jobs dashboard

#### Step 4: View Analytics & Reports

1. Go to the "Analytics" section
2. Select the date range and filters you want to analyze
3. View charts and metrics about your operations
4. Export reports as needed for external use

#### Step 5: Manage Your Profile

1. Click on your profile icon in the top-right corner
2. Select "Profile Settings"
3. Update your personal information or change your password
4. Save changes

---

## Glossary of Terms

### **IE Code (Import-Export Code)**

An official registration code issued by Indian customs authorities that identifies a business entity engaged in import-export activities. Every business involved in international trade must have a valid IE code.

### **Shipment/Job**

A single consignment of goods being sent from one location to another as part of an import or export transaction. The system tracks shipments through various stages from creation to delivery.

### **Delivery Address**

The final destination location where the shipment will be delivered. The system maintains a library of delivery addresses for efficient management and selection.

### **Customs Clearance**

The process of ensuring that a shipment complies with all government regulations before it can be released for delivery. This involves documentation, inspection, and approval by customs authorities.

### **Dashboard**

A personalized summary page showing key metrics, notifications, and quick access to frequently used features. Each user role has a customized dashboard with relevant information.

### **Module Access**

The system's permission system that determines which features and data a user can access based on their role and organization. Super Admins can manage module access for different users.

### **Audit Trail/Activity Log**

A record of all actions performed in the system (logins, job creation, status changes, etc.). This provides accountability and allows administrators to track who did what and when.

### **Role-Based Access Control (RBAC)**

A security model where user permissions are based on their assigned role. Different roles have different capabilities; for example, a Super Admin can manage users, while a regular user can only manage their own shipments.

### **iGate Integration**

A connection to the Indian Gateway for E-Commerce Clearance (iGate), which is the government portal for managing customs clearance for import-export goods. The system integrates with this portal for seamless compliance.

### **Notification**

An alert or message sent to users about important events in the system, such as shipment status changes, job assignments, or pending approvals. Users receive notifications in the dashboard and can configure notification preferences.

---

# PART 2: TECHNICAL GUIDE

## Architecture Overview

### Overall Architecture

EXIM Client follows a **MERN Stack (MongoDB, Express.js, React, Node.js)** architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER (React)                       │
│                    src/pages, src/components                     │
│                  (User Interface & Business Logic)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST API
                           │ Axios
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API TIER (Express.js Server)                   │
│              routes/ → controllers/ → services/                  │
│                   (Business Logic & Data Processing)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Mongoose ODM
                           │ CORS-enabled
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA TIER (MongoDB)                          │
│            Collections: Users, Jobs, Deliveries, etc.            │
│                    (Persistent Storage)                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ├─ External APIs (iGate, AWS S3)
                           └─ Email Services (Nodemailer)
```

### Primary Technologies

**Frontend (Client):**

- **React 19.1.0** - UI Framework
- **React Router DOM 7.4.1** - Client-side routing
- **Material-UI (MUI)** - UI component library
- **Recharts & ApexCharts** - Data visualization
- **Axios** - HTTP client
- **SASS** - Styling
- **ExcelJS & FileSaver** - Export functionality

**Backend (Server):**

- **Node.js with Express 5.1.0** - Web server framework
- **Mongoose 8.13.2** - MongoDB object modeling
- **JWT (jsonwebtoken 9.0.2)** - Authentication
- **bcryptjs 3.0.2** - Password hashing
- **Nodemailer 7.0.5** - Email service
- **AWS SDK** - Cloud storage integration
- **node-cron 4.2.1** - Scheduled tasks
- **Playwright 1.56.1** - Web scraping

**Database:**

- **MongoDB 8.13.2** - NoSQL database
- **Mongoose** - Data modeling & validation

---

## Setup & Installation

### Prerequisites

Before you start, ensure you have the following installed:

- **Node.js** v18 or higher
- **npm** v9 or higher (comes with Node.js)
- **MongoDB** v5 or higher (local or Atlas connection string)
- **Git** for version control
- **Docker** (optional, for containerized deployment)

### Step 1: Clone the Repository

```bash
git clone https://github.com/rauf-alluviam/eximclientnew.git
cd eximclientnew
```

### Step 2: Install Dependencies

**For Server:**

```bash
cd server
npm install
```

**For Client:**

```bash
cd ../client
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the `/server` directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/eximclient
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/eximclient

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d

# Email Configuration (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# AWS Configuration (for file uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your_bucket_name

# iGate Integration (Government Portal)
IGATE_USERNAME=your_igate_username
IGATE_PASSWORD=your_igate_password
IGATE_URL=https://igate-api.example.com

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3005
```

Create a `.env` file in the `/client` directory:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

### Step 4: Start MongoDB

If using local MongoDB:

```bash
# On macOS/Linux
brew services start mongodb-community

# On Windows (if installed as service)
net start MongoDB

# Or run MongoDB directly
mongod
```

If using MongoDB Atlas, ensure your connection string is in the `MONGO_URI` environment variable.

### Step 5: Start the Server

```bash
cd server
npm start
```

Server will run on `http://localhost:5000`

### Step 6: Start the Client (in a new terminal)

```bash
cd client
npm start
```

Client will run on `http://localhost:3000`

### Step 7: Verify Installation

- Open `http://localhost:3000` in your browser
- You should see the login page
- Attempt to log in (you may need to create a test user first)

### Optional: Docker Setup

To run with Docker:

```bash
cd server
docker build -t exim-server .
docker run -p 5000:5000 --env-file .env exim-server
```

---

## Project Structure

### Server (`/server`)

```
server/
├── app.js                          # Main Express application
├── package.json                    # Server dependencies
├── docker-compose.yml              # Docker configuration
├── .env                            # Environment variables (not in repo)
│
├── config/
│   ├── db.js                       # MongoDB connection setup
│   └── env.js                      # Environment configuration loader
│
├── models/                         # Mongoose schemas
│   ├── userModel.js                # User authentication model
│   ├── customerModel.js            # Customer organization model
│   ├── jobModel.js                 # Job/Shipment data model
│   ├── DeliveryAddressModel.js     # Delivery address model
│   ├── ActivityLogModel.js         # Audit trail model
│   ├── notificationModel.js        # Notification model
│   ├── moduleAccessModel.js        # RBAC permissions model
│   └── ...other models
│
├── controllers/                    # Business logic handlers
│   ├── authController.js           # Authentication logic
│   ├── jobController.js            # Job management logic
│   ├── customerController.js       # Customer management
│   ├── userController.js           # User operations
│   ├── adminController.js          # Admin operations
│   ├── superAdminController.js     # Super admin operations
│   ├── deliveryController.js       # Delivery management
│   ├── analyticsController.js      # Analytics & reporting
│   └── ...other controllers
│
├── routes/                         # API endpoint definitions
│   ├── userRoutes.js               # User endpoints
│   ├── jobRoutes.js                # Job endpoints
│   ├── customerRoutes.js           # Customer endpoints
│   ├── deliveryRoutes.js           # Delivery endpoints
│   ├── analyticsRoutes.js          # Analytics endpoints
│   ├── adminRoutes.js              # Admin endpoints
│   ├── superAdminRoutes.js         # Super admin endpoints
│   ├── aeoIntegrationRoutes.js     # AEO integration endpoints
│   └── ...other routes
│
├── middlewares/                    # Express middleware
│   ├── authMiddleware.js           # JWT verification
│   ├── roleMiddleware.js           # Role-based access control
│   └── errorHandler.js             # Error handling middleware
│
├── services/                       # External service integrations
│   ├── emailService.js             # Email sending
│   ├── s3Service.js                # AWS S3 integration
│   ├── iGateService.js             # Government portal integration
│   └── ...other services
│
└── utils/                          # Utility functions
    ├── validators.js               # Input validation
    ├── helpers.js                  # Helper functions
    └── constants.js                # Application constants
```

### Client (`/client/src`)

```
src/
├── App.js                          # Main app component with routing
├── index.js                        # React entry point
├── index.css                       # Global styles
│
├── pages/                          # Page components
│   ├── LoginPage.jsx               # General login
│   ├── UserLoginPage.jsx           # User-specific login
│   ├── AdminLoginPage.jsx          # Admin login
│   ├── SuperAdminLoginPage.jsx     # Super admin login
│   ├── UserDashboard.jsx           # Customer/User dashboard
│   ├── CustomerAdminDashboard.jsx  # Admin dashboard
│   ├── SuperAdminDashboard.jsx     # Super admin dashboard
│   ├── UserManagement/             # User management pages
│   ├── UserProfile.jsx             # User profile page
│   └── ...other pages
│
├── components/                     # Reusable UI components
│   ├── home/                       # Home page components
│   ├── SuperAdmin/                 # Super admin specific components
│   ├── UserManagement/             # User management components
│   └── ...other components
│
├── context/                        # React Context for state management
│   ├── UserContext.js              # User authentication state
│   ├── TabValueContext.js          # Tab navigation state
│   ├── importersContext.js         # Importers data context
│   └── SelectedYearContext.js      # Analytics year filter
│
├── customHooks/                    # Custom React hooks
│   └── ...custom hooks
│
├── hooks/                          # Additional hooks
│   └── ...hooks
│
├── styles/                         # Global and component styles
│   └── ...SCSS files
│
├── assets/                         # Static assets
│   ├── images/
│   └── icons/
│
└── utils/                          # Utility functions
    ├── api.js                      # API client setup
    ├── helpers.js                  # Helper functions
    └── constants.js                # App constants
```

---

## API Reference

### Base URL

```
http://localhost:5000/api
```

### Authentication

All API endpoints (except login/register) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens are typically stored in cookies or localStorage after login.

### Core API Endpoints

#### 1. **User Authentication**

**POST** `/auth/login`

- **Description:** Authenticate a user and return JWT token
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response (200):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "customer",
      "organization": "org_id"
    }
  }
  ```
- **Error Response (401):**
  ```json
  {
    "success": false,
    "message": "Invalid email or password"
  }
  ```

---

#### 2. **Job Management**

**GET** `/jobs`

- **Description:** Retrieve all jobs for the logged-in user
- **Query Parameters:**
  - `status` - Filter by status (pending, in-transit, delivered)
  - `page` - Pagination page number (default: 1)
  - `limit` - Items per page (default: 10)
- **Success Response (200):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "job_001",
        "shipmentType": "import",
        "status": "in-transit",
        "origin": "Shanghai, China",
        "destination": "Mumbai, India",
        "cargoWeight": 500,
        "createdAt": "2025-01-10T10:00:00Z"
      }
    ],
    "total": 45,
    "page": 1
  }
  ```

**POST** `/jobs`

- **Description:** Create a new job/shipment
- **Request Body:**
  ```json
  {
    "shipmentType": "export",
    "origin": "Mumbai",
    "destination": "Singapore",
    "cargoWeight": 1000,
    "cargoDescription": "Electronic components",
    "deliveryAddressId": "addr_123",
    "ieCode": "IE1234567890"
  }
  ```
- **Success Response (201):**
  ```json
  {
    "success": true,
    "data": {
      "id": "job_new_001",
      "status": "created",
      "shipmentType": "export",
      "createdAt": "2025-01-15T14:30:00Z"
    }
  }
  ```

**PUT** `/jobs/:jobId`

- **Description:** Update a job's information or status
- **Request Body:**
  ```json
  {
    "status": "delivered",
    "notes": "Successfully delivered"
  }
  ```
- **Success Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "id": "job_001",
      "status": "delivered",
      "updatedAt": "2025-01-16T09:15:00Z"
    }
  }
  ```

---

#### 3. **Delivery Address Management**

**GET** `/delivery-addresses`

- **Description:** Get all delivery addresses for the user's organization
- **Success Response (200):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "addr_123",
        "address": "123 Business Park, Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "country": "India"
      }
    ]
  }
  ```

**POST** `/delivery-addresses`

- **Description:** Create a new delivery address
- **Request Body:**
  ```json
  {
    "address": "456 Industrial Zone, Bangalore",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560034",
    "country": "India"
  }
  ```
- **Success Response (201):**
  ```json
  {
    "success": true,
    "data": {
      "id": "addr_new_001",
      "address": "456 Industrial Zone, Bangalore"
    }
  }
  ```

---

#### 4. **Dashboard & Analytics**

**GET** `/dashboard/stats`

- **Description:** Get dashboard statistics for the logged-in user
- **Success Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "totalJobs": 150,
      "pendingJobs": 12,
      "completedJobs": 138,
      "totalValue": 2500000,
      "activeUsers": 8,
      "thisMonthShipments": 25
    }
  }
  ```

**GET** `/analytics/report`

- **Description:** Get detailed analytics report
- **Query Parameters:**
  - `startDate` - Report start date (ISO 8601)
  - `endDate` - Report end date (ISO 8601)
  - `metric` - Metric type (shipments, revenue, users)
- **Success Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "period": "2025-01-01 to 2025-01-31",
      "metrics": [
        {
          "date": "2025-01-10",
          "shipments": 5,
          "revenue": 50000
        }
      ]
    }
  }
  ```

---

#### 5. **User Management (Admin)**

**GET** `/admin/users`

- **Description:** Get all users in the admin's organization
- **Query Parameters:**
  - `status` - Filter by status (active, inactive, pending)
  - `search` - Search by name or email
- **Success Response (200):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@company.com",
        "status": "active",
        "role": "user",
        "createdAt": "2024-12-01T10:00:00Z"
      }
    ]
  }
  ```

**POST** `/admin/users`

- **Description:** Create a new user in the organization
- **Request Body:**
  ```json
  {
    "name": "Jane Smith",
    "email": "jane@company.com",
    "role": "admin"
  }
  ```
- **Success Response (201):**
  ```json
  {
    "success": true,
    "data": {
      "id": "user_new_001",
      "email": "jane@company.com",
      "status": "pending"
    }
  }
  ```

---

### Error Handling

All endpoints follow a consistent error format:

```json
{
  "success": false,
  "message": "Descriptive error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

**Common HTTP Status Codes:**

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## How to Contribute

### Git Workflow

#### Step 1: Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or for bugfixes:
git checkout -b bugfix/your-bug-name
# or for documentation:
git checkout -b docs/your-doc-name
```

#### Step 2: Make Your Changes

- Follow the existing code style and naming conventions
- Keep commits atomic and well-described
- Test your changes thoroughly

#### Step 3: Commit Your Work

```bash
# Stage your changes
git add .

# Commit with a clear, descriptive message
git commit -m "feat: add user profile management feature"
# or
git commit -m "fix: resolve login token expiration issue"
# or
git commit -m "docs: update API documentation"
```

**Commit Message Format:**

```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

#### Step 4: Push Your Branch

```bash
git push origin feature/your-feature-name
```

#### Step 5: Create a Pull Request

1. Go to the GitHub repository
2. Click "New Pull Request"
3. Select your branch and base branch (`multiple-Aeo` by default)
4. Fill in the PR template:
   - Clear title summarizing the changes
   - Description of what changed and why
   - Reference to any related issues (#123)
   - Screenshots if UI changes
5. Request review from team members

#### Step 6: Address Review Feedback

- Make requested changes
- Commit and push updates
- PRs will be merged after approval

### Code Style Guidelines

**JavaScript/React:**

```javascript
// Use arrow functions
const handleClick = () => {};

// Use destructuring
const { name, email } = user;

// Use template literals
const message = `Hello, ${name}`;

// Meaningful variable names
const isUserAuthenticated = true; // Not: const x = true;
```

**Naming Conventions:**

- Components: PascalCase (e.g., `UserDashboard.jsx`)
- Functions: camelCase (e.g., `fetchUserData()`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- Files: camelCase or kebab-case (e.g., `userController.js`)

### Testing Before Submission

Before submitting a PR:

1. **Run linting (if available):**

   ```bash
   npm run lint
   ```

2. **Test locally:**

   - For frontend: Verify in browser that your changes work
   - For backend: Test API endpoints with Postman or curl

3. **Check for console errors:**

   - Open browser DevTools (F12)
   - Fix any errors or warnings

4. **Test edge cases:**
   - Empty inputs
   - Large data sets
   - Different user roles

### Branching Strategy

**Current Repository Strategy:**

- **Base Branch:** `multiple-Aeo` (main development branch)
- **Feature Branches:** Branch off from `multiple-Aeo`
- **Naming:** `feature/feature-name`, `bugfix/bug-name`, `docs/doc-name`
- **Release:** Merge to main/production branch when ready

### Communication

- Use clear commit messages and PR descriptions
- Ask questions in PR comments if anything is unclear
- Provide context for significant changes
- Be respectful and constructive in code reviews

### Resources

- **API Documentation:** See [API Reference](#api-reference) section
- **Project Structure:** See [Project Structure](#project-structure) section
- **Tech Stack:** See [Architecture Overview](#architecture-overview) section
- **Issues:** Check GitHub Issues for tasks and bugs

---

## Additional Resources

### Useful Commands

**Server Development:**

```bash
cd server
npm start              # Start server with nodemon (watch mode)
npm test              # Run tests
npm run lint          # Run linter
```

**Client Development:**

```bash
cd client
npm start              # Start React dev server
npm run build          # Create production build
npm test              # Run tests
npm run eject         # Eject from Create React App
```

**Database:**

```bash
# View MongoDB database
mongosh
show databases
use eximclient
db.users.find()        # Query users collection
```

### Useful Resources

- **React Documentation:** https://react.dev
- **Express.js Guide:** https://expressjs.com
- **MongoDB Documentation:** https://docs.mongodb.com
- **Material-UI Components:** https://mui.com
- **REST API Best Practices:** https://restfulapi.net

### Getting Help

1. Check the documentation first
2. Search existing GitHub Issues
3. Create a new issue with:
   - Clear title
   - Detailed description
   - Steps to reproduce (if bug)
   - Screenshots (if relevant)
   - Environment info (browser, OS, Node version)

---

**Last Updated:** November 12, 2025
**Maintained By:** Development Team
**Repository:** https://github.com/rauf-alluviam/eximclientnew
**Current Branch:** multiple-Aeo
