import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Switch,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Tab,
  Tabs,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close,
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
  ExpandMore,
  Business,
  Code,
  Lock,
  Extension,
  Info,
} from '@mui/icons-material';
import { useSuperAdminApi } from '../../hooks/useSuperAdminApi';
import { forceRefreshUserModules } from '../../utils/moduleAccess';

const CustomerDetailView = ({ 
  open, 
  onClose, 
  customer, 
  onRefresh,
  onPasswordUpdated,
  onModulesUpdated 
}) => {
  const theme = useTheme();
  const {
    loading,
    error,
    setError,
    updateCustomerPassword,
    getAvailableModules,
    getCustomerModuleAssignments,
    updateCustomerModuleAssignments,
  } = useSuperAdminApi();

  const [activeTab, setActiveTab] = useState(0);
  const [availableModules, setAvailableModules] = useState([]);
  const [assignedModules, setAssignedModules] = useState([]);
  const [tempAssignedModules, setTempAssignedModules] = useState([]);
  const [isEditingModules, setIsEditingModules] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: 'success' });

  useEffect(() => {
    if (open && customer) {
      loadModuleData();
    }
  }, [open, customer]);

  const loadModuleData = async () => {
    try {
      setError(null);
      
      // Load available modules
      const availableResponse = await getAvailableModules();
      setAvailableModules(availableResponse.data || []);
      
      // Load customer's assigned modules
      const assignedResponse = await getCustomerModuleAssignments(customer._id);
      const customerAssignedModules = assignedResponse.data?.customer?.assignedModules || [];
      setAssignedModules(customerAssignedModules);
      setTempAssignedModules(customerAssignedModules);
      
    } catch (error) {
      console.error('Error loading module data:', error);
      setError('Failed to load module information');
    }
  };

  const handleClose = () => {
    setActiveTab(0);
    setIsEditingModules(false);
    setIsEditingPassword(false);
    setNewPassword('');
    setShowPassword(false);
    setError(null);
    setNotification({ message: '', type: 'success' });
    onClose();
  };

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotification({ message: `${type} copied to clipboard!`, type: 'success' });
    } catch (error) {
      setNotification({ message: `Failed to copy ${type.toLowerCase()}`, type: 'error' });
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
      setError(null);
      await updateCustomerPassword(customer._id, newPassword);
      setNotification({ message: 'Password updated successfully!', type: 'success' });
      setIsEditingPassword(false);
      setNewPassword('');
      onPasswordUpdated?.();
      onRefresh?.();
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password');
    }
  };

  const handleModuleToggle = (moduleId) => {
    setTempAssignedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSaveModules = async () => {
    try {
      setError(null);
      await updateCustomerModuleAssignments(customer._id, tempAssignedModules);
      setAssignedModules(tempAssignedModules);
      setIsEditingModules(false);
      setNotification({ message: 'Module assignments updated successfully!', type: 'success' });
      
      // Refresh the user data in localStorage if this is the current user
      const currentUser = localStorage.getItem("exim_user");
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        const currentUserId = userData.id || userData.data?.user?.id;
        if (currentUserId === customer._id) {
          console.log('🔄 Module assignment changed for current user, refreshing...');
          await forceRefreshUserModules();
        }
      }
      
      onModulesUpdated?.();
      onRefresh?.();
    } catch (error) {
      console.error('Error updating module assignments:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update module assignments';
      setError(errorMessage);
      setNotification({ message: errorMessage, type: 'error' });
    }
  };

  const handleCancelModuleEdit = () => {
    setTempAssignedModules(assignedModules);
    setIsEditingModules(false);
    setError(null);
  };

  const getModuleIcon = (moduleId) => {
    if (moduleId.includes('importdsr')) return <Assignment />;
    if (moduleId.includes('netpage')) return <Business />;
    if (moduleId.includes('snapcheck')) return <CheckCircle />;
    if (moduleId.includes('qrlocker')) return <Lock />;
    if (moduleId.includes('task-flow')) return <Settings />;
    return <Extension />;
  };

  const getModuleCategoryColor = (category) => {
    switch (category) {
      case 'core': return 'primary';
      case 'beta': return 'warning';
      default: return 'default';
    }
  };

  if (!customer) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '70vh',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #F3F4F6',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 2,
        borderBottom: '1px solid #F3F4F6',
        backgroundColor: '#FFFFFF',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ 
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            width: 48, 
            height: 48,
            fontSize: '1.2rem',
            fontWeight: 600,
          }}>
            {customer.name?.charAt(0) || 'C'}
          </Avatar>
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                fontSize: '1.125rem',
                color: '#1F2937',
                lineHeight: 1.2,
              }}
            >
              {customer.name || 'Customer Details'}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{
                color: '#6B7280',
                fontSize: '0.875rem',
                mt: 0.25,
              }}
            >
              {customer.ie_code_no} • {customer.pan_number}
            </Typography>
          </Box>
        </Box>
        <IconButton 
          onClick={handleClose}
          sx={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E5E7EB',
            '&:hover': {
              backgroundColor: '#F1F5F9',
              borderColor: '#D1D5DB',
            },
          }}
        >
          <Close fontSize="small" sx={{ color: '#6B7280' }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Modern Tabs */}
        <Box sx={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#FFFFFF' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ 
              px: 3,
              '& .MuiTab-root': {
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
                color: '#6B7280',
                '&.Mui-selected': {
                  color: '#3B82F6',
                  fontWeight: 600,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#3B82F6',
                height: 2,
              },
            }}
          >
            <Tab icon={<Person fontSize="small" />} label="Profile" />
            <Tab icon={<Security fontSize="small" />} label="Security" />
            <Tab icon={<Settings fontSize="small" />} label="Module Access" />
          </Tabs>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ m: 3, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Success Notification */}
        {notification.message && (
          <Alert 
            severity={notification.type}
            sx={{ m: 3, borderRadius: 2 }}
            onClose={() => setNotification({ message: '', type: 'success' })}
          >
            {notification.message}
          </Alert>
        )}

        {/* Profile Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Company Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Company Name
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {customer.name || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Import Export Code
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {customer.ie_code_no}
                          </Typography>
                          <Tooltip title="Copy IE Code">
                            <IconButton 
                              size="small" 
                              onClick={() => handleCopy(customer.ie_code_no, 'IE Code')}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          PAN Number
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {customer.pan_number}
                          </Typography>
                          <Tooltip title="Copy PAN Number">
                            <IconButton 
                              size="small" 
                              onClick={() => handleCopy(customer.pan_number, 'PAN Number')}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Account Status
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                        <Chip
                          label={customer.isActive ? 'Active' : 'Inactive'}
                          color={customer.isActive ? 'success' : 'default'}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Password Type
                        </Typography>
                        <Chip
                          label={customer.password_changed ? 'Custom Password' : 'Generated Password'}
                          color={customer.password_changed ? 'warning' : 'primary'}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Module Access
                        </Typography>
                        <Chip
                          label={`${assignedModules.length} modules assigned`}
                          color="info"
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Security Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Password Management
                  </Typography>
                  {!isEditingPassword && (
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => setIsEditingPassword(true)}
                      size="small"
                    >
                      Change Password
                    </Button>
                  )}
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Current Password:</strong><br />
                        {customer.password_changed && customer.initialPassword
                          ? customer.initialPassword
                          : generatePassword(customer.ie_code_no, customer.pan_number)
                        }
                      </Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Username:</strong> {customer.ie_code_no}<br />
                        <strong>Login Method:</strong> IE Code + Password
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>

                {isEditingPassword && (
                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 3 }} />
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      Set New Password
                    </Typography>
                    <TextField
                      fullWidth
                      label="New Password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      helperText="Password must be at least 6 characters long"
                      sx={{ mb: 2 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handlePasswordUpdate}
                        disabled={!newPassword || newPassword.length < 6 || loading}
                      >
                        {loading ? 'Updating...' : 'Update Password'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Cancel />}
                        onClick={() => {
                          setIsEditingPassword(false);
                          setNewPassword('');
                          setError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Module Access Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Module Permissions
                  </Typography>
                  {!isEditingModules && (
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => setIsEditingModules(true)}
                      size="small"
                    >
                      Edit Modules
                    </Button>
                  )}
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {availableModules.map((module) => {
                      const isAssigned = isEditingModules 
                        ? tempAssignedModules.includes(module.id)
                        : assignedModules.includes(module.id);

                      return (
                        <Grid item xs={12} md={6} key={module.id}>
                          <Card sx={{ 
                            border: isAssigned ? '2px solid' : '1px solid',
                            borderColor: isAssigned ? 'primary.main' : 'divider',
                            bgcolor: isAssigned ? alpha(theme.palette.primary.main, 0.05) : 'transparent'
                          }}>
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                <Box sx={{ 
                                  color: isAssigned ? 'primary.main' : 'text.secondary',
                                  mt: 0.5
                                }}>
                                  {getModuleIcon(module.id)}
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                      {module.name}
                                    </Typography>
                                    <Chip
                                      label={module.category}
                                      color={getModuleCategoryColor(module.category)}
                                      size="small"
                                      variant="outlined"
                                    />
                                  </Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {module.description}
                                  </Typography>
                                  {module.isExternal && (
                                    <Chip
                                      label="External"
                                      color="secondary"
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                                <Box>
                                  {isEditingModules ? (
                                    <Checkbox
                                      checked={isAssigned}
                                      onChange={() => handleModuleToggle(module.id)}
                                      color="primary"
                                    />
                                  ) : (
                                    <IconButton disabled>
                                      {isAssigned ? (
                                        <CheckCircle color="primary" />
                                      ) : (
                                        <RadioButtonUnchecked color="disabled" />
                                      )}
                                    </IconButton>
                                  )}
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}

                {isEditingModules && (
                  <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSaveModules}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Cancel />}
                        onClick={handleCancelModuleEdit}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailView;
