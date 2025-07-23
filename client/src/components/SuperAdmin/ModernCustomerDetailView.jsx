import React, { useCallback, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Paper,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Security,
  Settings,
  Edit,
  Save,
  Cancel,
  Visibility,
  VisibilityOff,
  ContentCopy,
  Assignment,
  CheckCircle,
  RadioButtonUnchecked,
  Business,
  Code,
  Lock,
  Extension,
  Info,
  Key,
  Warning,
  HowToReg,
  AppRegistration,
  VerifiedUser,
  Save as SaveIcon,
  SelectAll as SelectAllIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

// Import modern components
import ModernCard from '../common/ModernCard';
import ModernButton from '../common/ModernButton';
import { useSuperAdminApi } from '../../hooks/useSuperAdminApi';
import axios from 'axios';
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export function getSuperAdminHeaders() {
  const token = localStorage.getItem('superadmin_token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  };
}

  

const ModernCustomerDetailView = ({ customer, onBack, onRefresh }) => {
  const {
    loading,
    error,
    setError,
    updateCustomerPassword,
    getAvailableModules,
    getCustomerModuleAssignments,
    updateCustomerModuleAssignments,
    registerCustomer,
  } = useSuperAdminApi();
  
  // Ensure we have a consistent customer ID (handle both id and _id from different API responses)
  const customerId = customer?.id || customer?._id;

  // Check if this is a registered customer (has both a valid customerId and is in the customer collection)
  // Unregistered customers come from the KYC collection and aren't in the customers collection yet
  // We can determine this by checking if there are certain customer-specific fields
  const isRegistered = Boolean(customer?.assignedModules !== undefined || customer?.isActive !== undefined);

  // Check if this is an unregistered customer with approved KYC
  const isKycApproved = !isRegistered && customer?.kycApproval === 'Approved';
  
  // Registration-related state variables
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredCustomer, setRegisteredCustomer] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);

  const [activeTab, setActiveTab] = useState(0);
  const [availableModules, setAvailableModules] = useState([]);
  const [assignedModules, setAssignedModules] = useState([]);
  const [tempAssignedModules, setTempAssignedModules] = useState([]);
  const [isEditingModules, setIsEditingModules] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: 'success' });
  // Registration form state removed - using simplified registration process

  // Column permissions state
  const [columnPermissions, setColumnPermissions] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [columnLoading, setColumnLoading] = useState(false);
  const [columnError, setColumnError] = useState(null);
  const [columnSaving, setColumnSaving] = useState(false);
  
  useEffect(() => {
    if (customer) {
      loadModuleData();
    }
  }, [customer]);

  useEffect(() => {
    if (activeTab === 3 && customerId) {
      fetchColumnPermissions();
    }
  }, [activeTab, customerId]);


    const handleCopy = useCallback((event, text, type= 'Text') => {
    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Text copied to clipboard:", text);
          setNotification({ message: `${type} copied to clipboard!`, type: 'success' });
        })
        .catch((err) => {
          alert("Failed to copy text to clipboard.");
          console.error("Failed to copy:", err);
            setNotification({ message: `Failed to copy ${type.toLowerCase()}`, type: 'error' });
        });
    } else {
      // Fallback approach for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard using fallback method:", text);
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  const loadModuleData = async () => {
    try {
      setError(null);
      
      // Always load available modules, as they're needed for display
      const availableResponse = await getAvailableModules();
      setAvailableModules(availableResponse.data || []);
      
      // Only load customer's assigned modules if this is a registered customer
      if (isRegistered) {
        const assignedResponse = await getCustomerModuleAssignments(customerId);
        const customerAssignedModules = assignedResponse.data?.customer?.assignedModules || [];
        setAssignedModules(customerAssignedModules);
        setTempAssignedModules(customerAssignedModules);
      } else {
        // For unregistered customers, set empty assigned modules
        setAssignedModules([]);
        setTempAssignedModules([]);
      }
    } catch (error) {
      console.error('Error loading module data:', error);
      setError('Failed to load module information');
    }
  };

  const fetchColumnPermissions = async () => {
    try {
      setColumnLoading(true);
      setColumnError(null);
      // Fetch available columns
      const columnsRes = await axios.get(`${process.env.REACT_APP_API_STRING}/available-columns`, getSuperAdminHeaders());
      setAvailableColumns(columnsRes.data.data || []);
      // Fetch customer column permissions
      const permRes = await axios.get(`${process.env.REACT_APP_API_STRING}/customer/${customerId}/column-permissions`, getSuperAdminHeaders());
      setColumnPermissions(permRes.data.data.customer.allowedColumns || []);
    } catch (err) {
      setColumnError(err.response?.data?.message || 'Failed to fetch column permissions');
      console.log('Error fetching column permissions:', err);
    } finally {
      setColumnLoading(false);
    }
  };

  const generatePassword = (ieCode, panNumber) => {
    if (!ieCode || !panNumber) return '';
    const iecPart = ieCode.slice(-4);
    const panPart = panNumber.slice(0, 4);
    return `${iecPart}@${panPart}`;
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      await updateCustomerPassword(customerId, newPassword);
      setNotification({ message: 'Password updated successfully!', type: 'success' });
      setIsEditingPassword(false);
      setNewPassword('');
      onRefresh?.();
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password');
    }
  };

  const handleModuleToggle = (moduleId) => {
    setTempAssignedModules(prev => {
      if (prev.includes(moduleId)) {
        return prev.filter(id => id !== moduleId);
      } else {
        return [...prev, moduleId];
      }
    });
  };

  const handleSaveModules = async () => {
    try {
      await updateCustomerModuleAssignments(customerId, tempAssignedModules);
      setAssignedModules(tempAssignedModules);
      setIsEditingModules(false);
      setNotification({ message: 'Module assignments updated successfully!', type: 'success' });
      onRefresh?.();
    } catch (error) {
      console.error('Error updating modules:', error);
      setError('Failed to update module assignments');
    }
  };

  const handleCancelModuleEdit = () => {
    setTempAssignedModules(assignedModules);
    setIsEditingModules(false);
  };

  // Handle customer registration - Unified handler for all registration buttons
  const handleRegisterCustomer = async () => {
    try {
      setIsRegistering(true);
      setError(null);

      // Ensure we have the required fields
      if (!customer?.ie_code_no || !customer?.pan_number || !customer?.name) {
        setError('Missing required customer information for registration.');
        setIsRegistering(false);
        return;
      }

      // Register the customer using the same format as in RegisterPage.jsx
      const response = await registerCustomer({
        ie_code_no: customer.ie_code_no.toUpperCase(),
        pan_number: customer.pan_number.toUpperCase(),
        name: customer.name.trim() || undefined
      });

      // Handle successful registration
      if (response.customer) {
        setRegisteredCustomer(response.customer);
        setGeneratedPassword(response.customer.initialPassword);
        setRegistrationSuccess(true);
        setShowRegistrationDialog(true);
        
        // Show success notification
        setNotification({
          message: `Registration successful! Customer ${response.customer.name} has been registered.`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error registering customer:', error);
      const errorMessage = error.response?.data?.message || 'Failed to register customer. Please try again.';
      setError(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCloseRegistrationDialog = () => {
    setShowRegistrationDialog(false);
    if (registrationSuccess && onRefresh) {
      onRefresh(); // Refresh the parent component to show updated customer data
    }
  };

  const getModuleIcon = (moduleId) => {
    const iconMap = {
      'import': Business,
      'export': Business,
      'documentation': Assignment,
      'analytics': Extension,
      'shipping': Business,
      default: Extension,
    };
    return iconMap[moduleId] || iconMap.default;
  };

  const getModuleCategoryColor = (category) => {
    const colorMap = {
      'trade': '#3B82F6',
      'documentation': '#10B981',
      'analytics': '#F59E0B',
      'shipping': '#8B5CF6',
      default: '#64748B',
    };
    return colorMap[category] || colorMap.default;
  };
  
  // Custom registration form is now deprecated - we use the main registration handler

  if (!customer) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#6B7280' }}>
          No customer selected
        </Typography>
      </Box>
    );
  }

  // Define handleSelectAllColumns and handleColumnToggle before use
  const handleSelectAllColumns = () => {
    if (columnPermissions.length === availableColumns.length) {
      setColumnPermissions([]);
    } else {
      setColumnPermissions(availableColumns.map(col => col.id));
    }
  };

  const handleColumnToggle = (columnId) => {
    setColumnPermissions(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleSaveColumnPermissions = async () => {
    try {
      setColumnSaving(true);
      setColumnError(null);
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/customer/${customerId}/column-permissions`,
        { allowedColumns: columnPermissions },
        getSuperAdminHeaders()
      );
      setNotification({ message: 'Column permissions updated!', type: 'success' });
      onRefresh?.();
    } catch (err) {
      setColumnError(err.response?.data?.message || 'Failed to save column permissions');
    } finally {
      setColumnSaving(false);
    }
  };

  // Add handleCopy definition
 


  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100%',
      height: '100%',
      overflow: 'auto',
      pb: 3
    }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <ModernButton
            variant="ghost"
            startIcon={<ArrowBack />}
            onClick={onBack}
            sx={{ mr: 2 }}
          >
            Back to Customers
          </ModernButton>
          
          {/* Registration button for KYC-approved unregistered customers */}
          {isKycApproved && (
            <ModernButton
              variant="contained"
              color="success"
              startIcon={<AppRegistration />}
              onClick={handleRegisterCustomer}
              disabled={isRegistering || registrationSuccess}
              sx={{ ml: 'auto' }}
            >
              {isRegistering ? 'Registering...' : 'Register Customer'}
              {isRegistering && <CircularProgress size={16} sx={{ ml: 1, color: 'white' }} />}
            </ModernButton>
          )}
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 2, sm: 3 },
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' }
        }}>
          <Avatar
            sx={{
              width: { xs: 60, sm: 80 },
              height: { xs: 60, sm: 80 },
              backgroundColor: '#3B82F6',
              fontSize: { xs: '1.5rem', sm: '2rem' },
              fontWeight: 600,
            }}
          >
            {customer.name?.charAt(0)?.toUpperCase() || 'C'}
          </Avatar>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#1F2937',
                mb: 1,
              }}
            >
              {customer.name || 'Unknown Customer'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {isRegistered ? (
                <Chip
                  label={customer.isActive !== false ? 'Active' : 'Inactive'}
                  color={customer.isActive !== false ? 'success' : 'error'}
                  size="small"
                  sx={{ fontSize: '0.75rem' }}
                />
              ) : (
                <Chip
                  label={isKycApproved ? "Ready for Registration" : "KYC Pending"}
                  color={isKycApproved ? "info" : "warning"}
                  size="small"
                  sx={{ fontSize: '0.75rem' }}
                  icon={isKycApproved ? <VerifiedUser sx={{ fontSize: '0.75rem !important' }} /> : undefined}
                />
              )}
              <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
                ID: {customerId?.slice(-8) || 'N/A'}
              </Typography>
              {isKycApproved && (
                <Chip
                  label="KYC Approved"
                  color="success"
                  size="small" 
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Notification */}
      {notification.message && (
        <Alert 
          severity={notification.type} 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setNotification({ message: '', type: 'success' })}
        >
          {notification.message}
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid #F3F4F6', mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              fontSize: '0.875rem',
              fontWeight: 500,
              textTransform: 'none',
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<Person />} label="Profile Information" />
          <Tab icon={<Security />} label="Security & Access" />
          <Tab icon={<Assignment />} label="Module Management" />
          <Tab icon={<SecurityIcon />} label="Column Permissions" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={8}>
            <ModernCard title="Customer Information">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                      Customer Name
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                      {customer.name || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                      IE Code Number
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', fontFamily: 'monospace' }}>
                        {customer.ie_code_no || 'N/A'}
                      </Typography>
                      {customer.ie_code_no && (
                        <IconButton
                          size="small"
                          onClick={(event) => handleCopy(event, customer.ie_code_no, 'IE Code')}
                        >
                          <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                      PAN Number
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', fontFamily: 'monospace' }}>
                        {customer.pan_number || 'N/A'}
                      </Typography>
                      {customer.pan_number && (
                        <IconButton
                          size="small"
                          onClick={(event) => handleCopy(event, customer.pan_number, 'PAN Number')}
                        >
                          <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                      Registration Date
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </ModernCard>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} md={4}>
            <ModernCard title="Account Stats">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    Assigned Modules
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#3B82F6' }}>
                    {assignedModules.length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    Account Status
                  </Typography>
                  <Chip
                    label={customer.isActive !== false ? 'Active' : 'Inactive'}
                    color={customer.isActive !== false ? 'success' : 'error'}
                    size="small"
                    sx={{ fontSize: '0.6875rem' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    Last Updated
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                    {customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </ModernCard>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <>
          {/* Show registration required alert for unregistered customers */}
          {!isRegistered && (
            <Alert 
              severity={isKycApproved ? "info" : "warning"} 
              sx={{ mb: 3, borderRadius: 2 }}
              icon={isKycApproved ? <Info /> : <Warning />}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {isKycApproved ? "Ready to Complete Registration" : "Password Management Not Available"}
                  </Typography>
                  <Typography variant="body2">
                    {isKycApproved 
                      ? "This customer's KYC has been approved and is ready for registration. Register the customer to enable password management and security features."
                      : "Password management will be available after customer registration is completed. The customer must be registered in the system before security features can be configured."
                    }
                  </Typography>
                </Box>
                {isKycApproved && (
                  <ModernButton
                    variant="contained"
                    color="primary"
                    startIcon={<AppRegistration />}
                    size="small"
                    onClick={handleRegisterCustomer}
                    disabled={isRegistering || registrationSuccess}
                  >
                    {isRegistering ? 'Registering...' : 'Register Customer'}
                    {isRegistering && <CircularProgress size={14} sx={{ ml: 1, color: 'white' }} />}
                  </ModernButton>
                )}
              </Box>
            </Alert>
          )}
        
          <Grid container spacing={3}>
            {/* Password Management */}
            <Grid item xs={12} md={8}>
              <ModernCard title="Password Management">
                {!isRegistered ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Lock sx={{ fontSize: 48, color: '#9CA3AF', mb: 2 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#4B5563', mb: 1 }}>
                      Password Management Unavailable
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6B7280', maxWidth: '80%', mx: 'auto' }}>
                      This customer is not fully registered in the system. Password management is only available after registration is completed.
                    </Typography>
                  </Box>
                ) : !isEditingPassword ? (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box>
                        <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', mb: 1 }}>
                          Current Password
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                          Password is encrypted and cannot be displayed
                        </Typography>
                      </Box>
                      <ModernButton
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => setIsEditingPassword(true)}
                      >
                        Change Password
                      </ModernButton>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Box>
                      <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', mb: 2 }}>
                        Generate Default Password
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                          size="small"
                          value={generatePassword(customer.ie_code_no, customer.pan_number)}
                          InputProps={{
                            readOnly: true,
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  size="small"
                                  onClick={(event) => handleCopy(event, generatePassword(customer.ie_code_no, customer.pan_number), 'Generated Password')}
                                >
                                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          sx={{ flex: 1 }}
                        />
                        <ModernButton
                          variant="outlined"
                          onClick={() => setNewPassword(generatePassword(customer.ie_code_no, customer.pan_number))}
                        >
                          Use This
                        </ModernButton>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.6875rem', mt: 1, display: 'block' }}>
                        Format: Last 4 digits of IE Code + @ + First 4 characters of PAN
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', mb: 3 }}>
                      Set New Password
                    </Typography>
                    <TextField
                      fullWidth
                      label="New Password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (minimum 6 characters)"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 3 }}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <ModernButton
                        variant="outlined"
                        startIcon={<Cancel />}
                        onClick={() => {
                          setIsEditingPassword(false);
                          setNewPassword('');
                        }}
                      >
                        Cancel
                      </ModernButton>
                      <ModernButton
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handlePasswordUpdate}
                        disabled={!newPassword || newPassword.length < 6}
                        loading={loading}
                      >
                        Update Password
                      </ModernButton>
                    </Box>
                  </Box>
                )}
              </ModernCard>
            </Grid>

            {/* Security Info */}
            <Grid item xs={12} md={4}>
              <ModernCard title="Security Information">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                      Account ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#1F2937' }}>
                      {customerId || 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                      Security Level
                    </Typography>
                    <Chip
                      label={isRegistered ? "Standard" : "Not Registered"}
                      color={isRegistered ? "info" : "default"}
                      size="small"
                      sx={{ fontSize: '0.6875rem', mt: 0.5 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                      Access Level
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#1F2937', fontWeight: 600 }}>
                      {isRegistered ? "Customer" : "Pending Registration"}
                    </Typography>
                  </Box>
                  {!isRegistered && (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                        Registration Status
                      </Typography>
                      <Chip
                        label="Not Registered"
                        color="warning"
                        size="small"
                        sx={{ fontSize: '0.6875rem', mt: 0.5 }}
                      />
                    </Box>
                  )}
                </Box>
              </ModernCard>
            </Grid>
          </Grid>
        </>
      )}

      {activeTab === 2 && (
        <>
          {/* Show registration required alert for unregistered customers */}
          {!isRegistered && (
            <Alert 
              severity={isKycApproved ? "info" : "warning"} 
              sx={{ mb: 3, borderRadius: 2 }}
              icon={isKycApproved ? <Info /> : <Warning />}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {isKycApproved ? "Customer Ready for Registration" : "Customer Registration Required"}
                  </Typography>
                  <Typography variant="body2">
                    {isKycApproved 
                      ? "This customer's KYC has been approved and is ready for registration. Use the Register button at the top of the page to complete registration and enable module management."
                      : "This customer needs to be registered before module assignment is available. KYC approval is required before registration can be completed."
                    }
                  </Typography>
                </Box>
                {isKycApproved ? (
                  <ModernButton
                    variant="contained"
                    color="success"
                    startIcon={<AppRegistration />}
                    size="small"
                    onClick={handleRegisterCustomer}
                    disabled={isRegistering || registrationSuccess}
                  >
                    {isRegistering ? 'Registering...' : 'Register Now'}
                    {isRegistering && <CircularProgress size={14} sx={{ ml: 1, color: 'white' }} />}
                  </ModernButton>
                ) : (
                  <ModernButton
                    variant="outlined"
                    startIcon={<HowToReg />}
                    size="small"
                    onClick={onBack}
                  >
                    Back to Customer List
                  </ModernButton>
                )}
              </Box>
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Module Assignment */}
            <Grid item xs={12} md={8}>
              <ModernCard
                title="Module Access Management"
                action={
                  !isEditingModules && isRegistered ? (
                    <ModernButton
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => setIsEditingModules(true)}
                    >
                      Edit Modules
                    </ModernButton>
                  ) : isEditingModules && isRegistered ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <ModernButton
                        variant="outlined"
                        startIcon={<Cancel />}
                        onClick={handleCancelModuleEdit}
                      >
                        Cancel
                      </ModernButton>
                      <ModernButton
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSaveModules}
                        loading={loading}
                      >
                        Save Changes
                      </ModernButton>
                    </Box>
                  ) : null
                }
              >
                {!isRegistered ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Info sx={{ fontSize: 48, color: '#9CA3AF', mb: 2 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#4B5563', mb: 1 }}>
                      Module Management Not Available
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6B7280', maxWidth: '80%', mx: 'auto' }}>
                      This customer is not fully registered in the system. Module assignment is only available after the registration process is completed.
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {availableModules.map((module, index) => {
                      const IconComponent = getModuleIcon(module.id);
                      const isAssigned = isEditingModules 
                        ? tempAssignedModules.includes(module.id)
                        : assignedModules.includes(module.id);

                      return (
                        <ListItem
                          key={module.id}
                          sx={{
                            px: 0,
                            py: 1.5,
                            borderBottom: index < availableModules.length - 1 ? '1px solid #F3F4F6' : 'none',
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                backgroundColor: alpha(getModuleCategoryColor(module.category), 0.1),
                              }}
                            >
                              <IconComponent 
                                sx={{ 
                                  fontSize: 16, 
                                  color: getModuleCategoryColor(module.category) 
                                }} 
                              />
                            </Avatar>
                          </ListItemIcon>
                          
                          <ListItemText
                            primary={
                              <Typography
                                variant="body1"
                                sx={{
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  color: '#1F2937',
                                }}
                              >
                                {module.name || module.id}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: '0.75rem',
                                  color: '#6B7280',
                                }}
                              >
                                {module.description || 'Module access and functionality'}
                              </Typography>
                            }
                          />
                          
                          {isEditingModules ? (
                            <Checkbox
                              checked={isAssigned}
                              onChange={() => handleModuleToggle(module.id)}
                              icon={<RadioButtonUnchecked />}
                              checkedIcon={<CheckCircle />}
                              sx={{
                                color: '#D1D5DB',
                                '&.Mui-checked': {
                                  color: '#10B981',
                                },
                              }}
                            />
                          ) : (
                            <Chip
                              label={isAssigned ? "Assigned" : "Not Assigned"}
                              color={isAssigned ? "success" : "default"}
                              size="small"
                              sx={{
                                fontSize: '0.6875rem',
                                fontWeight: 500,
                              }}
                            />
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </ModernCard>
            </Grid>

            {/* Module Summary */}
            <Grid item xs={12} md={4}>
              <ModernCard title="Module Summary">
                {!isRegistered ? (
                  <Box sx={{ py: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
                      No modules are available until customer registration is completed.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {isKycApproved ? (
                        <>
                          <VerifiedUser sx={{ fontSize: 16, color: '#10B981' }} />
                          <Typography variant="body2" sx={{ color: '#10B981', fontWeight: 500 }}>
                            KYC Approved - Ready for Registration
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Lock sx={{ fontSize: 16, color: '#9CA3AF' }} />
                          <Typography variant="body2" sx={{ color: '#4B5563', fontWeight: 500 }}>
                            Modules Locked - Pending KYC Approval
                          </Typography>
                        </>
                      )}
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                      Steps to Enable Modules:
                    </Typography>
                    {isKycApproved ? (
                      <Box component="ol" sx={{ pl: 2, mt: 1, mb: 0, fontSize: '0.75rem', color: '#6B7280' }}>
                        <li>Click the "Register Customer" button</li>
                        <li>Save the generated password</li>
                        <li>Assign modules to the customer</li>
                      </Box>
                    ) : (
                      <Box component="ol" sx={{ pl: 2, mt: 1, mb: 0, fontSize: '0.75rem', color: '#6B7280' }}>
                        <li>Wait for KYC approval</li>
                        <li>Complete customer registration</li>
                        <li>Return to assign modules</li>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                        Total Available Modules
                      </Typography>
                      <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937' }}>
                        {availableModules.length}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                        Assigned Modules
                      </Typography>
                      <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981' }}>
                        {assignedModules.length}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                        Access Percentage
                      </Typography>
                      <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#3B82F6' }}>
                        {availableModules.length > 0 
                          ? Math.round((assignedModules.length / availableModules.length) * 100)
                          : 0}%
                      </Typography>
                    </Box>
                  </Box>
                )}
              </ModernCard>
            </Grid>
          </Grid>
        </>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <ModernCard title="Column Permissions">
              {columnLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : columnError ? (
                <Alert severity="error" sx={{ mb: 2 }}>{columnError}</Alert>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Select which columns this customer can see in their job list view.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SelectAllIcon />}
                      onClick={handleSelectAllColumns}
                    >
                      {columnPermissions.length === availableColumns.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </Box>
                  <FormGroup>
                    {availableColumns.map((column) => (
                      <FormControlLabel
                        key={column.id}
                        control={
                          <Checkbox
                            checked={columnPermissions.includes(column.id)}
                            onChange={() => handleColumnToggle(column.id)}
                            color="primary"
                          />
                        }
                        label={column.name}
                      />
                    ))}
                  </FormGroup>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <ModernButton
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveColumnPermissions}
                      loading={columnSaving}
                      disabled={columnSaving}
                    >
                      Save Permissions
                    </ModernButton>
                  </Box>
                </>
              )}
            </ModernCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <ModernCard title="Column Access Summary">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                    Total Available Columns
                  </Typography>
                  <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937' }}>
                    {availableColumns.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                    Assigned Columns
                  </Typography>
                  <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981' }}>
                    {columnPermissions.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                    Access Percentage
                  </Typography>
                  <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#3B82F6' }}>
                    {availableColumns.length > 0 
                      ? Math.round((columnPermissions.length / availableColumns.length) * 100)
                      : 0}%
                  </Typography>
                </Box>
              </Box>
            </ModernCard>
          </Grid>
        </Grid>
      )}

      {/* Registration Success Dialog */}
      <Dialog
        open={showRegistrationDialog}
        onClose={handleCloseRegistrationDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: '1px solid #F3F4F6',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #F3F4F6' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VerifiedUser sx={{ color: '#10B981' }} />
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Customer Registration Successful
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Customer has been successfully registered and added to the system.
          </Alert>
          
          <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem', fontWeight: 600 }}>
            Customer Details:
          </Typography>
          
          <Box sx={{ mb: 3, pl: 2, borderLeft: '3px solid #10B981' }}>
            <Typography variant="body1" sx={{ mb: 0.5 }}>
              <strong>Name:</strong> {registeredCustomer?.name || customer?.name}
            </Typography>
            <Typography variant="body1" sx={{ mb: 0.5 }}>
              <strong>IE Code:</strong> {registeredCustomer?.ie_code_no || customer?.ie_code_no}
            </Typography>
            <Typography variant="body1">
              <strong>PAN:</strong> {registeredCustomer?.pan_number || customer?.pan_number}
            </Typography>
          </Box>
          
          <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem', fontWeight: 600 }}>
            Generated Password
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              value={generatedPassword}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={(event) => handleCopy(event, generatedPassword, 'Generated Password')}
                    >
                      <ContentCopy sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>
          
          <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
            Please keep this password safe. You can now assign modules to this customer.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #F3F4F6' }}>
          <ModernButton
            variant="outlined"
            onClick={handleCloseRegistrationDialog}
          >
            Close
          </ModernButton>
          <ModernButton
            variant="contained"
            startIcon={<Assignment />}
            onClick={() => {
              handleCloseRegistrationDialog();
              onRefresh?.();
              setActiveTab(2); // Switch to module management tab
            }}
          >
            Manage Modules
          </ModernButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModernCustomerDetailView;
