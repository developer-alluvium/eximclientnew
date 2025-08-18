import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Avatar
} from '@mui/material';
import {
  AdminPanelSettings,
  PersonAdd,
  Edit,
  Delete,
  Search,
  Refresh,
  People,
  SupervisorAccount,
  Business,
  Block,
  CheckCircle,
  ToggleOn,
  ToggleOff,
  Assignment,
  GroupWork,
  Apps,
  Close,
  SelectAll,
  ExpandMore
} from '@mui/icons-material';
import axios from 'axios';

// Available modules for assignment
const AVAILABLE_MODULES = [
  {
    id: "/importdsr",
    name: "Import DSR",
    description: "View and manage import daily status reports and track shipments",
    category: "core"
  },
  {
    id: "/netpage", 
    name: "CostIQ",
    description: "Calculate shipping costs per kilogram for better pricing decisions",
    category: "core"
  },
  {
    id: "http://snapcheckv1.s3-website.ap-south-1.amazonaws.com/",
    name: "SnapCheck",
    description: "Beta Version - Quality control and inspection management system",
    category: "beta",
    isExternal: true
  },
  {
    id: "http://qrlocker.s3-website.ap-south-1.amazonaws.com/",
    name: "QR Locker", 
    description: "Beta Version - Digital locker management with QR code integration",
    category: "beta",
    isExternal: true
  },
  {
    id: "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com/",
    name: "Task Flow AI",
    description: "Task management system with organizational hierarchy",
    category: "core",
    isExternal: true
  },
  {
    id: "http://elock-tracking.s3-website.ap-south-1.amazonaws.com/",
    name: "E-Lock",
    description: "Secure electronic document locking and verification (Tracking)",
    category: "core",
    isExternal: true
  },
  {
    id: "/trademasterguide",
    name: "Trade Master Guide",
    description: "View and manage import daily status reports and track shipments",
    category: "core",
  }
];

const AdminManagement = ({ onRefresh }) => {
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Dialog states
  const [adminDialog, setAdminDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [moduleDialog, setModuleDialog] = useState(false);
  const [bulkModuleDialog, setBulkModuleDialog] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [adminAction, setAdminAction] = useState(''); // 'promote', 'demote'
  const [statusAction, setStatusAction] = useState(''); // 'activate', 'deactivate'
  
  // Module assignment states
  const [selectedUserModules, setSelectedUserModules] = useState([]);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState([]);
  const [bulkSelectedModules, setBulkSelectedModules] = useState([]);
  
  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // IE Code selection states
  const [availableIeCodes, setAvailableIeCodes] = useState([]);
  const [selectedIeCode, setSelectedIeCode] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check for SuperAdmin authentication
      const superadminToken = localStorage.getItem('superadmin_token');
      const superadminUser = localStorage.getItem('superadmin_user');
      
      if (!superadminToken || !superadminUser) {
        setError('SuperAdmin authentication required. Please login again.');
        return;
      }

      // Configure axios headers with authentication
      const config = {
        headers: {
          'Authorization': `Bearer ${superadminToken}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      };

      const [customersRes, usersRes, ieCodesRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/superadmin/customers`, config),
        axios.get(`${process.env.REACT_APP_API_STRING}/superadmin/all-users`, config),
        axios.get(`${process.env.REACT_APP_API_STRING}/superadmin/available-ie-codes`, config)
      ]);

      if (customersRes.data.success) {
        setCustomers(customersRes.data.data.customers || []);
      }
      
      if (usersRes.data.success) {
        setUsers(usersRes.data.data.users || []);
      }

      if (ieCodesRes.data.success) {
        setAvailableIeCodes(ieCodesRes.data.data.availableIeCodes || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('SuperAdmin authentication expired. Please login again.');
        // Clear invalid tokens
        localStorage.removeItem('superadmin_token');
        localStorage.removeItem('superadmin_user');
      } else {
        setError('Failed to fetch data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async (entity, type) => {
    try {
      setLoading(true);
      setError(null);

      // Check for SuperAdmin authentication
      const superadminToken = localStorage.getItem('superadmin_token');
      if (!superadminToken) {
        setError('SuperAdmin authentication required. Please login again.');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${superadminToken}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      };

      let endpoint, data;
      if (type === 'customer') {
        // For customers, we just update their admin status
        endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/customers/${entity._id}/admin-status`;
        data = { isAdmin: true };
      } else {
        // For users, we promote them to admin with IE code assignment
        if (!selectedIeCode) {
          setError('Please select an IE code to assign to the user.');
          return;
        }
        endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${entity._id}/promote-admin`;
        data = { ie_code_no: selectedIeCode };
      }

      const response = await axios.put(endpoint, data, config);

      if (response.data.success) {
        setSuccess(`Successfully promoted ${entity.name} to admin${type === 'user' ? ` with IE code ${selectedIeCode}` : ''}`);
        fetchData();
        setAdminDialog(false);
        setSelectedIeCode(''); // Reset selection
      }
    } catch (error) {
      console.error('Error promoting to admin:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('SuperAdmin authentication expired. Please login again.');
        localStorage.removeItem('superadmin_token');
        localStorage.removeItem('superadmin_user');
      } else {
        setError(error.response?.data?.message || 'Failed to promote to admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAdmin = async (entity, type) => {
    try {
      setLoading(true);
      setError(null);

      // Check for SuperAdmin authentication
      const superadminToken = localStorage.getItem('superadmin_token');
      if (!superadminToken) {
        setError('SuperAdmin authentication required. Please login again.');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${superadminToken}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      };

      let endpoint, data;
      if (type === 'customer') {
        endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/customers/${entity._id}/admin-status`;
        data = { isAdmin: false };
      } else {
        endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${entity._id}/demote-admin`;
        data = {};
      }

      const response = await axios.put(endpoint, data, config);

      if (response.data.success) {
        setSuccess(`Successfully revoked admin access for ${entity.name}`);
        fetchData();
        setAdminDialog(false);
      }
    } catch (error) {
      console.error('Error revoking admin:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('SuperAdmin authentication expired. Please login again.');
        localStorage.removeItem('superadmin_token');
        localStorage.removeItem('superadmin_user');
      } else {
        setError(error.response?.data?.message || 'Failed to revoke admin access');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeUserStatus = async (user, newStatus) => {
    try {
      setLoading(true);
      setError(null);

      // Check for SuperAdmin authentication
      const superadminToken = localStorage.getItem('superadmin_token');
      if (!superadminToken) {
        setError('SuperAdmin authentication required. Please login again.');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${superadminToken}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      };

      const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${user._id}/status`;
      const data = { isActive: newStatus };

      const response = await axios.put(endpoint, data, config);

      if (response.data.success) {
        setSuccess(`Successfully ${newStatus ? 'activated' : 'deactivated'} user ${user.name}`);
        fetchData();
        setStatusDialog(false);
      }
    } catch (error) {
      console.error('Error changing user status:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('SuperAdmin authentication expired. Please login again.');
        localStorage.removeItem('superadmin_token');
        localStorage.removeItem('superadmin_user');
      } else {
        setError(error.response?.data?.message || 'Failed to change user status');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssignModules = async (userId, moduleIds) => {
    try {
      setLoading(true);
      setError(null);

      const superadminToken = localStorage.getItem('superadmin_token');
      if (!superadminToken) {
        setError('SuperAdmin authentication required. Please login again.');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${superadminToken}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      };

      const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${userId}/modules`;
      const data = { moduleIds };

      const response = await axios.put(endpoint, data, config);

      if (response.data.success) {
        setSuccess(`Successfully updated module assignments`);
        fetchData();
        setModuleDialog(false);
        setSelectedUserModules([]);
      }
    } catch (error) {
      console.error('Error assigning modules:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('SuperAdmin authentication expired. Please login again.');
      } else {
        setError(error.response?.data?.message || 'Failed to assign modules');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssignModules = async () => {
    try {
      setLoading(true);
      setError(null);

      const superadminToken = localStorage.getItem('superadmin_token');
      if (!superadminToken) {
        setError('SuperAdmin authentication required. Please login again.');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${superadminToken}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      };

      const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/bulk-assign-modules`;
      const data = { 
        userIds: bulkSelectedUsers,
        moduleIds: bulkSelectedModules 
      };

      const response = await axios.post(endpoint, data, config);

      if (response.data.success) {
        setSuccess(`Successfully assigned modules to ${bulkSelectedUsers.length} users`);
        fetchData();
        setBulkModuleDialog(false);
        setBulkSelectedUsers([]);
        setBulkSelectedModules([]);
      }
    } catch (error) {
      console.error('Error bulk assigning modules:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('SuperAdmin authentication expired. Please login again.');
      } else {
        setError(error.response?.data?.message || 'Failed to bulk assign modules');
      }
    } finally {
      setLoading(false);
    }
  };

  const openAdminDialog = (entity, action, type) => {
    setSelectedEntity({ ...entity, type });
    setAdminAction(action);
    setAdminDialog(true);
  };

  const openStatusDialog = (user, action) => {
    setSelectedEntity(user);
    setStatusAction(action);
    setStatusDialog(true);
  };

  const openModuleDialog = (user) => {
    setSelectedEntity(user);
    // Get user's current modules - assuming they're stored in assignedModules field
    setSelectedUserModules(user.assignedModules || []);
    setModuleDialog(true);
  };

  const openBulkModuleDialog = () => {
    setBulkModuleDialog(true);
  };

  const getModuleIcon = (moduleId) => {
    // Simple icon mapping based on module ID or category
    if (moduleId.includes('dsr')) return '📊';
    if (moduleId.includes('net') || moduleId.includes('cost')) return '⚖️';
    if (moduleId.includes('snap')) return '📷';
    if (moduleId.includes('qr')) return '🔒';
    if (moduleId.includes('task') || moduleId.includes('ai')) return '🤖';
    if (moduleId.includes('elock') || moduleId.includes('lock')) return '🔐';
    if (moduleId.includes('trade')) return '📚';
    return '📱';
  };

  const getModuleCategoryColor = (category) => {
    switch (category) {
      case 'core': return 'primary';
      case 'beta': return 'warning';
      case 'external': return 'secondary';
      default: return 'default';
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.ie_code_no?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.ie_code_no?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 1 }}>
            Admin Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage customer and user admin privileges
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchData}
          disabled={loading}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            px: 3,
            mr: 2
          }}
        >
          Refresh
        </Button>
        <Button
          variant="outlined"
          startIcon={<GroupWork />}
          onClick={openBulkModuleDialog}
          disabled={loading}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            px: 3
          }}
        >
          Bulk Module Assignment
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                    {customers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Customers
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#dbeafe', color: '#1d4ed8' }}>
                  <Business />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                    {customers.filter(c => c.isAdmin).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Customer Admins
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a' }}>
                  <SupervisorAccount />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                    {users.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fef3c7', color: '#d97706' }}>
                  <People />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                    {users.filter(u => u.isAdmin).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    User Admins
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fce7f3', color: '#be185d' }}>
                  <AdminPanelSettings />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Customer Admin Management" />
            <Tab label="User Admin Management" />
          </Tabs>
        </Box>

        {/* Customer Admin Management Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ flexGrow: 1 }}
              />
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>IE Code</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Admin Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Users Count</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: '#e5e7eb', color: '#374151' }}>
                            {customer.name?.charAt(0) || 'C'}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {customer.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{customer.ie_code_no}</TableCell>
                      <TableCell>{customer.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={customer.isAdmin ? 'Admin' : 'Regular Customer'}
                          color={customer.isAdmin ? 'success' : 'default'}
                          size="small"
                          icon={customer.isAdmin ? <AdminPanelSettings /> : <Business />}
                        />
                      </TableCell>
                      <TableCell>
                        {users.filter(u => u.ie_code_no === customer.ie_code_no).length}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {customer.isAdmin ? (
                            <Tooltip title="Revoke Admin Access">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => openAdminDialog(customer, 'demote', 'customer')}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Make Admin">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openAdminDialog(customer, 'promote', 'customer')}
                              >
                                <AdminPanelSettings />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                          No customers found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* User Admin Management Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ flexGrow: 1 }}
              />
            </Box>

            {/* Info Alert for IE Code Source */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                IE codes are fetched from active jobs in year 25-26. Only codes not already assigned to admins are available for assignment.
                {availableIeCodes.length > 0 && (
                  <span> Currently {availableIeCodes.length} IE codes are available for assignment.</span>
                )}
              </Typography>
            </Alert>

            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>IE Code</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Assigned Modules</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: '#e5e7eb', color: '#374151' }}>
                            {user.name?.charAt(0) || 'U'}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {user.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.ie_code_no}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.isAdmin ? 'Admin' : 'User'}
                          color={user.isAdmin ? 'secondary' : 'default'}
                          size="small"
                          icon={user.isAdmin ? <AdminPanelSettings /> : <People />}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          color={user.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 300 }}>
                          {user.assignedModules && user.assignedModules.length > 0 ? (
                            user.assignedModules.slice(0, 3).map((moduleId) => {
                              const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
                              return (
                                <Chip
                                  key={moduleId}
                                  label={module?.name || moduleId.split('/').pop() || moduleId}
                                  color={getModuleCategoryColor(module?.category)}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              );
                            })
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No modules assigned
                            </Typography>
                          )}
                          {user.assignedModules && user.assignedModules.length > 3 && (
                            <Chip
                              label={`+${user.assignedModules.length - 3} more`}
                              size="small"
                              variant="outlined"
                              color="default"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {/* Status Toggle Button */}
                          <Tooltip title={user.isActive ? 'Deactivate User' : 'Activate User'}>
                            <IconButton
                              size="small"
                              color={user.isActive ? 'warning' : 'success'}
                              onClick={() => openStatusDialog(user, user.isActive ? 'deactivate' : 'activate')}
                            >
                              {user.isActive ? <ToggleOff /> : <ToggleOn />}
                            </IconButton>
                          </Tooltip>

                          {/* Module Assignment Button */}
                          <Tooltip title="Assign Modules">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => openModuleDialog(user)}
                            >
                              <Assignment />
                            </IconButton>
                          </Tooltip>
                          
                          {/* Admin Role Toggle Button */}
                          {user.isAdmin ? (
                            <Tooltip title="Remove Admin Role">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => openAdminDialog(user, 'demote', 'user')}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Promote to Admin">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openAdminDialog(user, 'promote', 'user')}
                              >
                                <AdminPanelSettings />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                          No users found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Card>

      {/* Admin Action Dialog */}
      <Dialog 
        open={adminDialog} 
        onClose={() => {
          setAdminDialog(false);
          setSelectedIeCode(''); // Reset IE code selection when dialog closes
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {adminAction === 'promote' ? 'Promote to Admin' : 'Revoke Admin Access'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {adminAction === 'promote' 
              ? `Are you sure you want to promote "${selectedEntity?.name}" to admin?`
              : `Are you sure you want to revoke admin access for "${selectedEntity?.name}"?`
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {adminAction === 'promote' 
              ? 'This will give them administrative privileges over users and modules.'
              : 'This will remove their administrative privileges.'
            }
          </Typography>

          {/* IE Code Selection for User Promotion */}
          {adminAction === 'promote' && selectedEntity?.type === 'user' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select IE Code to Assign</InputLabel>
              <Select
                value={selectedIeCode}
                onChange={(e) => setSelectedIeCode(e.target.value)}
                label="Select IE Code to Assign"
                required
              >
                {availableIeCodes.map((ieCode) => (
                  <MenuItem key={ieCode.ie_code_no} value={ieCode.ie_code_no}>
                    <Box sx={{ py: 1 }}>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {ieCode.ie_code_no}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {ieCode.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Jobs: {ieCode.jobCount || 0} | PAN: {ieCode.pan_number || 'Not Available'}
                      </Typography>
                      {ieCode.lastJobDate && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Last Job: {new Date(ieCode.lastJobDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
                {availableIeCodes.length === 0 && (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      No available IE codes for year 25-26
                    </Typography>
                  </MenuItem>
                )}
              </Select>
              {availableIeCodes.length === 0 && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
                  Note: Only IE codes from jobs in year 25-26 that are not already assigned to admins are shown.
                </Typography>
              )}
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAdminDialog(false);
            setSelectedIeCode(''); // Reset IE code selection
          }}>Cancel</Button>
          <Button
            variant="contained"
            color={adminAction === 'promote' ? 'primary' : 'error'}
            onClick={() => {
              if (adminAction === 'promote') {
                handlePromoteToAdmin(selectedEntity, selectedEntity?.type);
              } else {
                handleRevokeAdmin(selectedEntity, selectedEntity?.type);
              }
            }}
            disabled={loading || (adminAction === 'promote' && selectedEntity?.type === 'user' && !selectedIeCode)}
          >
            {adminAction === 'promote' ? 'Promote' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Status Change Dialog */}
      <Dialog 
        open={statusDialog} 
        onClose={() => setStatusDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {statusAction === 'activate' ? 'Activate User' : 'Deactivate User'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {statusAction === 'activate' 
              ? `Are you sure you want to activate "${selectedEntity?.name}"?`
              : `Are you sure you want to deactivate "${selectedEntity?.name}"?`
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {statusAction === 'activate' 
              ? 'This will allow the user to log in and access their assigned modules.'
              : 'This will prevent the user from logging in and accessing the system.'
            }
          </Typography>
          
          {statusAction === 'deactivate' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Warning:</strong> Deactivating this user will immediately log them out and prevent them from accessing the system.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={statusAction === 'activate' ? 'success' : 'warning'}
            onClick={() => {
              const newStatus = statusAction === 'activate';
              handleChangeUserStatus(selectedEntity, newStatus);
            }}
            disabled={loading}
          >
            {statusAction === 'activate' ? 'Activate' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Module Assignment Dialog */}
      <Dialog 
        open={moduleDialog} 
        onClose={() => setModuleDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Assignment color="primary" />
            Assign Modules to {selectedEntity?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select modules to assign to this user. Users can only access modules that are assigned to them.
          </Typography>
          
          <Grid container spacing={2}>
            {AVAILABLE_MODULES.map((module) => {
              const isAssigned = selectedUserModules.includes(module.id);
              return (
                <Grid item xs={12} md={6} key={module.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      cursor: 'pointer',
                      border: isAssigned ? '2px solid' : '1px solid',
                      borderColor: isAssigned ? 'primary.main' : 'divider',
                      bgcolor: isAssigned ? 'primary.50' : 'background.paper',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'primary.50'
                      }
                    }}
                    onClick={() => {
                      if (isAssigned) {
                        setSelectedUserModules(prev => prev.filter(id => id !== module.id));
                      } else {
                        setSelectedUserModules(prev => [...prev, module.id]);
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ fontSize: '1.2rem' }}>{getModuleIcon(module.id)}</Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {module.name}
                        </Typography>
                        {isAssigned && <CheckCircle color="primary" fontSize="small" />}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {module.description}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip 
                          label={module.category || 'general'} 
                          size="small" 
                          color={getModuleCategoryColor(module.category)}
                          variant="outlined"
                        />
                        {module.isExternal && (
                          <Chip 
                            label="External" 
                            size="small" 
                            color="secondary"
                            variant="outlined"
                            sx={{ ml: 0.5 }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          
          <Typography variant="body2" color="primary" sx={{ mt: 2, fontWeight: 500 }}>
            Selected: {selectedUserModules.length} modules
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModuleDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleAssignModules(selectedEntity._id, selectedUserModules)}
            disabled={loading}
            startIcon={<Assignment />}
          >
            Assign Modules
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Module Assignment Dialog */}
      <Dialog 
        open={bulkModuleDialog} 
        onClose={() => setBulkModuleDialog(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GroupWork color="primary" />
            Bulk Module Assignment
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select users and modules to assign in bulk. This will add the selected modules to all selected users.
          </Typography>
          
          <Grid container spacing={3}>
            {/* User Selection */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <People />
                Select Users ({bulkSelectedUsers.length} selected)
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Button
                  size="small"
                  startIcon={<SelectAll />}
                  onClick={() => {
                    if (bulkSelectedUsers.length === filteredUsers.length) {
                      setBulkSelectedUsers([]);
                    } else {
                      setBulkSelectedUsers(filteredUsers.map(u => u._id));
                    }
                  }}
                >
                  {bulkSelectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>
              
              <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {filteredUsers.map((user) => (
                  <FormControlLabel
                    key={user._id}
                    control={
                      <Switch
                        checked={bulkSelectedUsers.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelectedUsers(prev => [...prev, user._id]);
                          } else {
                            setBulkSelectedUsers(prev => prev.filter(id => id !== user._id));
                          }
                        }}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email} • {user.ie_code_no}
                        </Typography>
                      </Box>
                    }
                    sx={{ display: 'block', mb: 1 }}
                  />
                ))}
              </Box>
            </Grid>
            
            {/* Module Selection */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Apps />
                Select Modules ({bulkSelectedModules.length} selected)
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Button
                  size="small"
                  startIcon={<SelectAll />}
                  onClick={() => {
                    if (bulkSelectedModules.length === AVAILABLE_MODULES.length) {
                      setBulkSelectedModules([]);
                    } else {
                      setBulkSelectedModules(AVAILABLE_MODULES.map(m => m.id));
                    }
                  }}
                >
                  {bulkSelectedModules.length === AVAILABLE_MODULES.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>
              
              <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {AVAILABLE_MODULES.map((module) => (
                  <FormControlLabel
                    key={module.id}
                    control={
                      <Switch
                        checked={bulkSelectedModules.includes(module.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelectedModules(prev => [...prev, module.id]);
                          } else {
                            setBulkSelectedModules(prev => prev.filter(id => id !== module.id));
                          }
                        }}
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ fontSize: '1rem' }}>{getModuleIcon(module.id)}</Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {module.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {module.category} {module.isExternal && '• External'}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{ display: 'block', mb: 1 }}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> This will add the selected modules to the selected users. 
              Existing module assignments will be preserved.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkModuleDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkAssignModules}
            disabled={loading || bulkSelectedUsers.length === 0 || bulkSelectedModules.length === 0}
            startIcon={<GroupWork />}
          >
            Assign to {bulkSelectedUsers.length} Users
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminManagement;
