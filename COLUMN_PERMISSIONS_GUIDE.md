# Role-Based Column Visibility System

## Overview
The role-based column visibility system allows the SuperAdmin to control which columns specific users can see in the job list view. This provides a way to customize the user experience and restrict access to certain data fields based on user requirements.

## How It Works

### For SuperAdmins:
1. **Access Control Panel**: Navigate to the SuperAdmin Dashboard and select the "Column Permissions" tab.
2. **Individual User Management**:
   - Click on the "Manage" button next to a user to configure their specific column permissions.
   - Select which columns the user should be able to see.
   - Save the changes to apply the permissions.

3. **Bulk Assignment**:
   - Use the "Bulk Assign" button to manage permissions for multiple customers at once.
   - Select the customers you want to update.
   - Choose the columns that should be visible to them.
   - Apply the changes to all selected customers simultaneously.

### For Regular Users:
- Users will only see columns that the SuperAdmin has allowed them to view.
- If no specific permissions are set (empty permissions array), users will see all available columns by default.
- Column order preferences are still respected within the subset of visible columns.

## Technical Implementation

### Backend
- The `Customer` model includes an `allowedColumns` array that stores the column identifiers the user is permitted to see.
- Empty arrays indicate that all columns are permitted (default behavior).
- The system provides the column permissions along with column order when responding to column order requests.

### Frontend
- The job list component (`CJobList.jsx`) filters displayed columns based on:
  1. The user's role (SuperAdmins always see all columns)
  2. The `allowedColumns` array received from the server
- Column ordering is also filtered to only include allowed columns.

## API Endpoints

### For Users:
- `GET /api/column-order`: Retrieves the user's column order and allowed columns.

### For SuperAdmins:
- `GET /api/available-columns`: Gets all available columns in the system.
- `GET /api/customer/:customerId/column-permissions`: Gets column permissions for a specific customer.
- `PUT /api/customer/:customerId/column-permissions`: Updates column permissions for a customer.
- `POST /api/bulk-column-permissions`: Bulk updates column permissions for multiple customers.

## Troubleshooting

If a user reports missing columns:
1. Check if they have specific column permissions set in the SuperAdmin dashboard.
2. If the permissions array is empty, they should see all columns.
3. Verify that the column order data is being correctly loaded from the server.
4. Check browser console logs for any errors related to column data loading.

## Default Column Set
All users have access to the following columns by default (unless restricted):
- Exporter, Job Number & Free Time
- BE Number & Date
- Checklist
- Shipment & Commercial Details
- Container
- Weight Shortage/Excess
- Movement Timeline
- eSanchit Documents
- DO Planning
- Delivery Planning
