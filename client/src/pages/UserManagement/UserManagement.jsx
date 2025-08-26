import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormGroup,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Badge,
  Stack,
  Switch,
  Avatar,
  Container
} from '@mui/material';
import {
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  PersonAddAlt as PromoteIcon,
  PersonRemoveAlt1 as DemoteIcon,
  PowerSettingsNew as StatusIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
  Settings as SettingsIcon,
  ViewColumn as ColumnIcon,
  Assignment as PermissionIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import InviteUserDialog from './components/InviteUserDialog';
import EditUserDialog from './components/EditUserDialog';

// Place this component definition OUTSIDE and BEFORE your UserManagement component
const ColumnPermissionDialog = ({ open, user, onClose, onSubmit, availableColumns, apiClient }) => {
  const [loading, setLoading] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState([]);

  // This effect runs ONLY when the dialog is opened for a user
  useEffect(() => {
    if (open && user) {
      setLoading(true);
      // Fetch the user's current permissions when the dialog opens
      apiClient.get(`/user-management/users/${user._id}/column-permissions`)
        .then(response => {
          if (response.data.success) {
            // Set the local state with the fetched permissions
            setSelectedColumns(response.data.data.user.allowedColumns || []);
          }
        })
        .catch(error => {
          console.error('Error fetching user column permissions:', error);
          // Optionally, show a toast message here for the error
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, user, apiClient]); // Dependencies ensure this runs only when needed

  // This function updates the LOCAL state, which will NOT re-render the parent page
  const handleToggleColumn = (columnId) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  // This function calls the onSubmit prop from the parent with the final state
  const handleSave = () => {
    if (user) {
      onSubmit(user._id, selectedColumns);
    }
  };

  // Render null if the dialog isn't open
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Column Permissions for {user?.name}</Typography>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <FormGroup>
            {availableColumns.map(column => (
              <FormControlLabel
                key={column.id}
                control={
                  <Checkbox
                    checked={selectedColumns.includes(column.id)}
                    onChange={() => handleToggleColumn(column.id)}
                  />
                }
                label={column.name}
              />
            ))}
          </FormGroup>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
const [columnPermissionDialog, setColumnPermissionDialog] = useState({ 
  open: false, 
  user: null 
});
  const [bulkColumnDialog, setBulkColumnDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuUserId, setMenuUserId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [statusUpdateDialog, setStatusUpdateDialog] = useState({ open: false, user: null });
  const [availableColumns, setAvailableColumns] = useState([]);
  const [userColumns, setUserColumns] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Get user data from localStorage
  const currentUser = JSON.parse(localStorage.getItem('exim_user') || '{}');
  
  useEffect(() => {
    if (!currentUser || !currentUser.ie_code_no) {
      navigate('/login', { replace: true });
      return;
    }
    fetchUsers();
    fetchAvailableColumns();
  }, [navigate, currentUser.ie_code_no]);

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  const getToken = () => {
    return localStorage.getItem('exim_token') || 
           localStorage.getItem('jwt_token') || 
           sessionStorage.getItem('jwt_token');
  };

  const getAuthHeaders = () => {
    const token = getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // API Client setup
  const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_STRING,
    withCredentials: true,
  });

  apiClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('exim_user');
        localStorage.removeItem('exim_token');
        localStorage.removeItem('jwt_token');
        navigate('/login', { replace: true });
      }
      return Promise.reject(error);
    }
  );

  const fetchUsers = useCallback(async () => {
    try {
      if (!currentUser.ie_code_no) {
        showToast('User session invalid', 'error');
        return;
      }

      const response = await apiClient.get(
        `${process.env.REACT_APP_API_STRING}/user-management/users?ie_code_no=${currentUser.ie_code_no}`
      );

      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        showToast(response.data.message || 'Error fetching users', 'error');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      showToast(error.response?.data?.message || 'Error fetching users', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser.ie_code_no]); 

  const fetchAvailableColumns = useCallback(async () => {
    try {
      const response = await apiClient.get(`${process.env.REACT_APP_API_STRING}/user-management/available-columns`);
      if (response.data.success) {
        setAvailableColumns(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching available columns:', error);
    }
  }, []);


  const handleInviteUser = async (userData) => {
    try {
      const response = await apiClient.post(`${process.env.REACT_APP_API_STRING}/user-management/users/invite`, {
        ...userData,
        ie_code_no: currentUser.ie_code_no,
      });

      if (response.data.success) {
        showToast('User invited successfully');
        fetchUsers();
      } else {
        showToast(response.data.message || 'Error inviting user', 'error');
      }
    } catch (error) {
      console.error('Invite user error:', error);
      showToast(error.response?.data?.message || 'Error inviting user', 'error');
    }
    setInviteDialogOpen(false);
  };

  const handlePromoteUser = async (userId) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const response = await apiClient.patch(`/user-management/manage/${userId}/promote`);
      
      if (response.data.success) {
        showToast('User promoted to admin successfully');
        fetchUsers();
      } else {
        showToast(response.data.message || 'Error promoting user', 'error');
      }
    } catch (error) {
      console.error('Promote user error:', error);
      showToast(error.response?.data?.message || 'Error promoting user', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
    handleMenuClose();
  };

  const handleDemoteUser = async (userId) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const response = await apiClient.patch(`/user-management/manage/${userId}/demote`);
      
      if (response.data.success) {
        showToast('User demoted from admin successfully');
        fetchUsers();
      } else {
        showToast(response.data.message || 'Error demoting user', 'error');
      }
    } catch (error) {
      console.error('Demote user error:', error);
      showToast(error.response?.data?.message || 'Error demoting user', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
    handleMenuClose();
  };

  const handleStatusUpdate = async (userId, isActive, reason = '') => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const response = await apiClient.patch(
        `/user-management/users/${userId}/status`,
        { isActive, reason }
      );
      
      if (response.data.success) {
        showToast(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
        fetchUsers();
      } else {
        showToast(response.data.message || 'Error updating user status', 'error');
      }
    } catch (error) {
      console.error('Update user status error:', error);
      showToast(error.response?.data?.message || 'Error updating user status', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
      setStatusUpdateDialog({ open: false, user: null });
    }
    handleMenuClose();
  };

  const handleUpdateColumnPermissions = async (userId, allowedColumns) => {
    try {
      const response = await apiClient.put(
        `/user-management/users/${userId}/column-permissions`,
        { allowedColumns }
      );
      
      if (response.data.success) {
        showToast('Column permissions updated successfully');
        fetchUsers();
      } else {
        showToast(response.data.message || 'Error updating column permissions', 'error');
      }
    } catch (error) {
      console.error('Update column permissions error:', error);
      showToast(error.response?.data?.message || 'Error updating column permissions', 'error');
    }
    setColumnPermissionDialog({ open: false, user: null, localColumns: [] });
  };

  const handleBulkColumnPermissions = async (userIds, allowedColumns) => {
    try {
      const response = await apiClient.post(
        '/user-management/users/bulk-column-permissions',
        { userIds, allowedColumns }
      );
      
      if (response.data.success) {
        showToast(`Column permissions updated for ${response.data.data.modifiedCount} users`);
        fetchUsers();
      } else {
        showToast(response.data.message || 'Error updating bulk column permissions', 'error');
      }
    } catch (error) {
      console.error('Bulk update column permissions error:', error);
      showToast(error.response?.data?.message || 'Error updating bulk column permissions', 'error');
    }
    setBulkColumnDialog(false);
    setSelectedUsers([]);
  };

const handleMenuClick = (event, userId) => {
  // This sets the anchorEl state to the button element you clicked
  setAnchorEl(event.currentTarget);
  setMenuUserId(userId);
};
const handleMenuClose = () => {
  setAnchorEl(null);
  setMenuUserId(null);
};


// Replace it with this much simpler version
const handleColumnPermissionClick = (user) => {
  setColumnPermissionDialog({ open: true, user: user });
};
  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user._id));
    }
  };

  // Check if current user can manage other users
  const canManageUsers = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'warning';
      case 'superadmin': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status, isActive) => {
    if (!isActive) return 'error';
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'error';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const formatRole = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'superadmin': return 'Super Admin';
      case 'customer': return 'Customer';
      default: return role || 'Customer';
    }
  };

  // Enhanced Column Permission Dialog Component
// Place this component definition OUTSIDE and BEFORE your UserManagement component
const ColumnPermissionDialog = ({ open, user, onClose, onSubmit, availableColumns, apiClient }) => {
  const [loading, setLoading] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState([]);

  useEffect(() => {
    // Only fetch data when the dialog is opened for a user
    if (open && user) {
      setLoading(true);
      apiClient.get(`/user-management/users/${user._id}/column-permissions`)
        .then(response => {
          if (response.data.success) {
            setSelectedColumns(response.data.data.user.allowedColumns || []);
          }
        })
        .catch(error => {
          console.error('Error fetching permissions:', error);
          // You might want to show a toast here
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, user, apiClient]); // Dependencies ensure this runs only when needed

  const handleToggleColumn = (columnId) => {
    // This updates local state and will NOT cause a flicker
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleSave = () => {
    // Pass the final state back to the parent to make the API call
    if (user) {
      onSubmit(user._id, selectedColumns);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Permissions for {user?.name}</Typography>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : (
          <FormGroup>
            {availableColumns.map(column => (
              <FormControlLabel
                key={column.id}
                control={
                  <Checkbox
                    checked={selectedColumns.includes(column.id)}
                    onChange={() => handleToggleColumn(column.id)}
                  />
                }
                label={column.name}
              />
            ))}
          </FormGroup>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};


  // Enhanced Bulk Column Permission Dialog Component
  const BulkColumnDialog = () => {
    const [bulkColumns, setBulkColumns] = useState([]);

    const handleBulkColumnToggle = (columnId) => {
      setBulkColumns(prev => 
        prev.includes(columnId) 
          ? prev.filter(id => id !== columnId)
          : [...prev, columnId]
      );
    };

    const handleSelectAllBulkColumns = () => {
      const allColumnIds = availableColumns.map(col => col.id);
      setBulkColumns(bulkColumns.length === allColumnIds.length ? [] : allColumnIds);
    };

    return (
      <Dialog 
        open={bulkColumnDialog} 
        onClose={() => setBulkColumnDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <PermissionIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600} color="white">
                Bulk Update Column Permissions
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {selectedUsers.length} users selected
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 2 }}>
          <Stack spacing={3}>
            <Alert 
              severity="warning" 
              sx={{ 
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.1)',
                color: 'white',
                '& .MuiAlert-icon': { color: 'white' }
              }}
            >
              This will overwrite existing column permissions for all selected users.
            </Alert>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={600} color="white">
                  Select Columns to Assign
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSelectAllBulkColumns}
                  sx={{ 
                    borderRadius: 2,
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  {bulkColumns.length === availableColumns.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Stack>

              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)' }}>
                <FormGroup>
                  {availableColumns.map((column, index) => (
                    <FormControlLabel
                      key={column.id}
                      control={
                        <Checkbox
                          checked={bulkColumns.includes(column.id)}
                          onChange={() => handleBulkColumnToggle(column.id)}
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            '&.Mui-checked': {
                              color: 'white',
                            }
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight={500} color="white">
                            {column.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            ID: {column.id}
                          </Typography>
                        </Box>
                      }
                      sx={{
                        mb: index < availableColumns.length - 1 ? 1 : 0,
                        p: 1,
                        borderRadius: 1,
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.1)',
                        }
                      }}
                    />
                  ))}
                </FormGroup>
              </Paper>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button 
            onClick={() => setBulkColumnDialog(false)}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleBulkColumnPermissions(selectedUsers, bulkColumns)}
            variant="contained"
            sx={{ 
              borderRadius: 2,
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.9)'
              }
            }}
          >
            Update All Selected
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Enhanced Status Update Dialog Component
  const StatusDialog = () => (
    <Dialog 
      open={statusUpdateDialog.open} 
      onClose={() => setStatusUpdateDialog({ open: false, user: null })}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: statusUpdateDialog.action === 'activate' 
            ? 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
            : 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
        }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar 
            sx={{ 
              bgcolor: statusUpdateDialog.action === 'activate' ? 'success.main' : 'error.main' 
            }}
          >
            {statusUpdateDialog.action === 'activate' ? <CheckCircleIcon /> : <BlockIcon />}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {statusUpdateDialog.action === 'activate' ? 'Activate' : 'Deactivate'} User
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {statusUpdateDialog.user?.name}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Stack spacing={3}>
          <Alert 
            severity={statusUpdateDialog.action === 'activate' ? 'info' : 'warning'}
            sx={{ borderRadius: 2 }}
          >
            Are you sure you want to {statusUpdateDialog.action} this user? 
            {statusUpdateDialog.action === 'deactivate' && 
              ' This will prevent them from accessing the system.'}
          </Alert>

          <TextField
            fullWidth
            label="Reason (Optional)"
            multiline
            rows={3}
            id="status-reason"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button 
          onClick={() => setStatusUpdateDialog({ open: false, user: null })}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button 
          onClick={() => {
            const reason = document.getElementById('status-reason')?.value || '';
            handleStatusUpdate(
              statusUpdateDialog.user._id,
              statusUpdateDialog.action === 'activate',
              reason
            );
          }}
          color={statusUpdateDialog.action === 'activate' ? 'success' : 'error'}
          variant="contained"
          disabled={actionLoading[statusUpdateDialog.user?._id]}
          sx={{ borderRadius: 2 }}
        >
          {actionLoading[statusUpdateDialog.user?._id] ? (
            <CircularProgress size={20} />
          ) : (
            statusUpdateDialog.action === 'activate' ? 'Activate' : 'Deactivate'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box 
          display="flex" 
          flexDirection="column"
          justifyContent="center" 
          alignItems="center" 
          minHeight="60vh"
          gap={2}
        >
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" color="text.secondary">
            Loading users...
          </Typography>
        </Box>
      </Container>
    );
  }

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Enhanced Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
              User Management
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Manage users, roles, and permissions for your organization
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2}>
            {canManageUsers && selectedUsers.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<PermissionIcon />}
                onClick={() => setBulkColumnDialog(true)}
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Bulk Permissions ({selectedUsers.length})
              </Button>
            )}
            {canManageUsers && (
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setInviteDialogOpen(true)}
                sx={{ 
                  bgcolor: 'white',
                  color: 'primary.main',
                  borderRadius: 2,
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)',
                  }
                }}
              >
                Invite User
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Enhanced Tabs */}
      <Paper elevation={1} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        

        {/* Enhanced Users Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ p: 3 }}>
            {/* Enhanced Bulk Actions */}
            {canManageUsers && (
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  mb: 3, 
                  borderRadius: 2,
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}
              >
                <Stack direction="row" alignItems="center" spacing={3}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedUsers.length === users.length && users.length > 0}
                        indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                        onChange={handleSelectAll}
                      />
                    }
                    label="Select All Users"
                  />
                  {selectedUsers.length > 0 && (
                    <Chip
                      label={`${selectedUsers.length} user(s) selected`}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Paper>
            )}

            {/* Enhanced Table */}
            <TableContainer 
              component={Paper} 
              sx={{ 
                borderRadius: 2,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                overflow: 'hidden'
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    {canManageUsers && <TableCell padding="checkbox" />}
                    <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Last Login</TableCell>
                    {canManageUsers && <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow 
                      key={user._id} 
                      hover
                      sx={{ 
                        '&:hover': { 
                          bgcolor: 'action.hover',
                          transform: 'translateY(-1px)',
                          transition: 'all 0.2s ease'
                        }
                      }}
                    >
                      {canManageUsers && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedUsers.includes(user._id)}
                            onChange={() => handleUserSelection(user._id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar 
                            sx={{ 
                              bgcolor: user.role === 'admin' ? 'warning.main' : 'primary.main',
                              width: 40,
                              height: 40
                            }}
                          >
                            {user.role === 'admin' ? (
                              <AdminIcon />
                            ) : (
                              <UserIcon />
                            )}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {user.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <EmailIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                              {user.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatRole(user.role)}
                          color={getRoleColor(user.role)}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                    <TableCell>
  <Stack direction="row" alignItems="center" spacing={1}>
    <Chip
      label={user.isActive ? (user.status || 'Active') : 'Inactive'}
      color={getStatusColor(user.status, user.isActive)}
      size="small"
      sx={{ fontWeight: 500 }}
    />
    <Switch
      checked={user.isActive}
      onChange={() => handleStatusUpdate(user._id, !user.isActive)}
      disabled={actionLoading[user._id]}
      size="small"
      inputProps={{ 'aria-label': 'toggle user status' }}
      sx={{ ml: 1 }}
    />
  </Stack>
</TableCell>

                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <BusinessIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {user.ie_code_no}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </Typography>
                        </Stack>
                      </TableCell>
                     {canManageUsers && (
  <TableCell align="right">
    <Stack direction="row" spacing={1} justifyContent="flex-end">
      <Tooltip title="Column Permissions">
        <IconButton
          size="small"
          onClick={() => handleColumnPermissionClick(user)}
          color="primary"
          sx={{ 
            borderRadius: 2,
            '&:hover': { bgcolor: 'primary.light', color: 'white' }
          }}
        >
          <ColumnIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="More Actions">
        <IconButton
          size="small"
          onClick={(event) => handleMenuClick(event, user._id)}
          sx={{ 
            borderRadius: 2,
            '&:hover': { bgcolor: 'grey.200' }
          }}
          id={`menu-button-${user._id}`} // Add an ID for better targeting
        >
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  </TableCell>
)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

       
      </Paper>

      {/* Enhanced Action Menu */}
<Menu
  // Tells the Menu which element to anchor to.
  // Without this, it doesn't know where to appear.
  anchorEl={anchorEl}

  // Controls whether the Menu is open or closed based on anchorEl.
  open={Boolean(anchorEl)}

  // The function that closes the menu.
  onClose={handleMenuClose}

  // *** THIS IS THE FIX ***
  // It tells the menu to attach to the BOTTOM RIGHT of the button.
  anchorOrigin={{
    vertical: 'bottom',
    horizontal: 'right',
  }}

  // *** THIS IS THE FIX ***
  // It aligns the menu's TOP RIGHT corner with the anchor point.
  transformOrigin={{
    vertical: 'top',
    horizontal: 'right',
  }}

  // Optional styling for a cleaner look
  PaperProps={{
    elevation: 3,
    sx: {
      overflow: 'visible',
      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.2))',
      mt: 1.5, // Adds a little space between the button and the menu
    },
  }}
>
  {/* Your MenuItem components go inside here */}
  {menuUserId && (() => {
    const user = users.find(u => u._id === menuUserId);
    if (!user) return null;

    return [
      // Promote/Demote Item
      user.role !== 'admin' ? (
        <MenuItem key="promote" onClick={() => handlePromoteUser(menuUserId)}>
          <ListItemIcon><PromoteIcon fontSize="small" /></ListItemIcon>
          Promote to Admin
        </MenuItem>
      ) : (
        <MenuItem key="demote" onClick={() => handleDemoteUser(menuUserId)}>
          <ListItemIcon><DemoteIcon fontSize="small" /></ListItemIcon>
          Demote from Admin
        </MenuItem>
      ),
      <Divider key="d1" />,
      // Deactivate Item
      <MenuItem key="deactivate" onClick={() => { /* your logic here */ }}>
        <ListItemIcon><BlockIcon fontSize="small" /></ListItemIcon>
        Deactivate User
      </MenuItem>,
      // Permissions Item
      <MenuItem key="permissions" onClick={() => { /* your logic here */ }}>
        <ListItemIcon><ColumnIcon fontSize="small" /></ListItemIcon>
        Column Permissions
      </MenuItem>
    ];
  })()}
</Menu>


      {/* All Dialogs */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onSubmit={handleInviteUser}
      />

      {selectedUser && (
        <EditUserDialog
          open={editDialogOpen}
          user={selectedUser}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedUser(null);
          }}
          onSubmit={(updates) => {
            setEditDialogOpen(false);
            setSelectedUser(null);
          }}
          currentUserRole={currentUser.role}
        />
      )}

<ColumnPermissionDialog
  open={columnPermissionDialog.open}
  user={columnPermissionDialog.user}
  onClose={() => setColumnPermissionDialog({ open: false, user: null })}
  onSubmit={handleUpdateColumnPermissions} // This function already correctly handles the save logic
  availableColumns={availableColumns}
  apiClient={apiClient} // Pass the configured axios instance
/>      <BulkColumnDialog />
      <StatusDialog />

      {/* Enhanced Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{ 
            width: '100%',
            borderRadius: 2,
            fontWeight: 500
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserManagement;
