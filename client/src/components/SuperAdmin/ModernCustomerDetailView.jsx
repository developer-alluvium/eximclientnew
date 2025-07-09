import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';

// Import modern components
import ModernCard from '../common/ModernCard';
import ModernButton from '../common/ModernButton';
import { useSuperAdminApi } from '../../hooks/useSuperAdminApi';

const ModernCustomerDetailView = ({ customer, onBack, onRefresh }) => {
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
    if (customer) {
      loadModuleData();
    }
  }, [customer]);

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
      await updateCustomerPassword(customer._id, newPassword);
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
      await updateCustomerModuleAssignments(customer._id, tempAssignedModules);
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

  if (!customer) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#6B7280' }}>
          No customer selected
        </Typography>
      </Box>
    );
  }

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
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip
                label={customer.isActive !== false ? 'Active' : 'Inactive'}
                color={customer.isActive !== false ? 'success' : 'error'}
                size="small"
                sx={{ fontSize: '0.75rem' }}
              />
              <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
                ID: {customer._id?.slice(-8) || 'N/A'}
              </Typography>
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
                          onClick={() => handleCopy(customer.ie_code_no, 'IE Code')}
                        >
                          <ContentCopy sx={{ fontSize: 16 }} />
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
                          onClick={() => handleCopy(customer.pan_number, 'PAN Number')}
                        >
                          <ContentCopy sx={{ fontSize: 16 }} />
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
        <Grid container spacing={3}>
          {/* Password Management */}
          <Grid item xs={12} md={8}>
            <ModernCard title="Password Management">
              {!isEditingPassword ? (
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
                                onClick={() => handleCopy(
                                  generatePassword(customer.ie_code_no, customer.pan_number),
                                  'Generated Password'
                                )}
                              >
                                <ContentCopy sx={{ fontSize: 16 }} />
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
                    {customer._id || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                    Security Level
                  </Typography>
                  <Chip
                    label="Standard"
                    color="info"
                    size="small"
                    sx={{ fontSize: '0.6875rem', mt: 0.5 }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                    Access Level
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#1F2937', fontWeight: 600 }}>
                    Customer
                  </Typography>
                </Box>
              </Box>
            </ModernCard>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* Module Assignment */}
          <Grid item xs={12} md={8}>
            <ModernCard
              title="Module Access Management"
              action={
                !isEditingModules ? (
                  <ModernButton
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setIsEditingModules(true)}
                  >
                    Edit Modules
                  </ModernButton>
                ) : (
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
                )
              }
            >
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
            </ModernCard>
          </Grid>

          {/* Module Summary */}
          <Grid item xs={12} md={4}>
            <ModernCard title="Module Summary">
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
            </ModernCard>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ModernCustomerDetailView;
