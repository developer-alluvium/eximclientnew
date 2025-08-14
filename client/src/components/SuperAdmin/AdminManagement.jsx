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
  Business
} from '@mui/icons-material';
import axios from 'axios';

const AdminManagement = ({ onRefresh }) => {
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Dialog states
  const [adminDialog, setAdminDialog] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [adminAction, setAdminAction] = useState(''); // 'promote', 'demote'
  
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

  const openAdminDialog = (entity, action, type) => {
    setSelectedEntity({ ...entity, type });
    setAdminAction(action);
    setAdminDialog(true);
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
            px: 3
          }}
        >
          Refresh
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
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
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
    </Box>
  );
};

export default AdminManagement;
