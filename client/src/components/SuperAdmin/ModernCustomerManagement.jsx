import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  alpha,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Person,
  Business,
  Security,
  Visibility,
  VisibilityOff,
  ContentCopy,
  Edit,
  Assignment,
  FilterList,
  Download,
  Refresh,
  CheckCircle,
  Cancel,
  Key,
} from '@mui/icons-material';

// Import modern components
import ModernCard from '../common/ModernCard';
import ModernButton from '../common/ModernButton';
import ModernDataTable from '../common/ModernDataTable';
import { useSuperAdminApi } from '../../hooks/useSuperAdminApi';

const ModernCustomerManagement = ({ onRefresh }) => {
  const navigate = useNavigate();
  
  // Use custom hook instead of service
  const { 
    loading, 
    error, 
    setError,
    getCustomers,
    updateCustomerPassword,
    getKycRecords,
    registerCustomer
  } = useSuperAdminApi();

  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [allCustomerData, setAllCustomerData] = useState({ registered: [], inactive: [], pending: [], summary: {} });
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('all'); // 'all', 'approved', 'notApproved'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', type: 'success' });

  // Registration states
  const [viewMode, setViewMode] = useState('manage'); // 'register', 'manage', 'inactive'
  const [registrationMode, setRegistrationMode] = useState('dropdown'); // 'dropdown' or 'manual'
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [registrationForm, setRegistrationForm] = useState({
    ie_code_no: '',
    pan_number: '',
    name: ''
  });

  // Password management
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAllCustomers();
  }, [viewMode, registrationMode]);

  useEffect(() => {
    filterCustomers();
  }, [allCustomerData, searchTerm, activeTab, approvalFilter]);

  const fetchAllCustomers = async () => {
    try {
      // Fetch all customer data using the optimized unified API
      const response = await getCustomers('all', { includeKyc: true });
      setAllCustomerData(response.data || { registered: [], inactive: [], pending: [], summary: {} });
      console.log('Fetched unified customer data:', response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to fetch customers');
    }
  };

  const filterCustomers = () => {
    let filtered = [];
    
    // Get the appropriate dataset based on view mode and active tab
    switch (viewMode) {
      case 'manage':
        // Combine registered and inactive customers for comprehensive management view
        const registeredCustomers = allCustomerData.registered || [];
        const inactiveCustomers = allCustomerData.inactive || [];
        
        // Merge both datasets
        filtered = [...registeredCustomers, ...inactiveCustomers];
        
        // Filter by tab 
        if (activeTab === 0) {
          // Tab 0: "Registered Customers" - Show all records from customer collection
          filtered = filtered.filter(customer => 
            customer.status === 'registered'
          );
        } else {
          // Tab 1: "Unregistered Customers" - Show records from customerKyc that aren't in customer collection
          // These are the 'inactive' and 'pending' status customers
          filtered = filtered.filter(customer => 
            customer.status === 'inactive' || customer.status === 'pending'
          );
        }
        break;
      case 'inactive':
        filtered = allCustomerData.inactive || [];
        break;
      case 'register':
        filtered = allCustomerData.inactive || []; // Show inactive customers for registration
        break;
      default:
        filtered = allCustomerData.registered || [];
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.ie_code_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.pan_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by KYC approval status (only applies to unregistered customers)
    if (activeTab === 1 && approvalFilter !== 'all') {
      filtered = filtered.filter(customer => {
        if (approvalFilter === 'approved') {
          // Show only KYC approved customers (status === 'inactive')
          return customer.status === 'inactive' && customer.kycApproval === 'Approved';
        } else if (approvalFilter === 'notApproved') {
          // Show only not approved customers (status === 'pending')
          return customer.status === 'pending' || !customer.kycApproval;
        }
        return true;
      });
    }
    
    setFilteredCustomers(filtered);
  };

  const handleCustomerClick = (customer) => {
    // Handle both id and _id property names from the unified API
    const customerId = customer.id || customer._id;
    navigate(`/superadmin-dashboard/customer/${customerId}`);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateCustomerPassword(selectedCustomer._id, newPassword);
      setNotification({ 
        open: true, 
        message: 'Password updated successfully!', 
        type: 'success' 
      });
      setShowPasswordDialog(false);
      setNewPassword('');
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePassword = (ieCode, panNumber) => {
    if (!ieCode || !panNumber) return '';
    const iecPart = ieCode.slice(-4);
    const panPart = panNumber.slice(0, 4);
    return `${iecPart}@${panPart}`;
  };

  // Status helper functions
  const getStatusText = (customer) => {
    if (customer.status === 'registered') {
      return customer.isActive ? 'Active' : 'Inactive';
    } else if (customer.status === 'inactive') {
      return 'Awaiting Registration';
    } else if (customer.status === 'pending') {
      return 'KYC Pending';
    }
    return 'Unknown';
  };

  const getStatusColor = (customer) => {
    if (customer.status === 'registered') {
      return customer.isActive ? 'success' : 'warning';
    } else if (customer.status === 'inactive') {
      return 'info';
    } else if (customer.status === 'pending') {
      return 'warning';
    }
    return 'default';
  };

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotification({ 
        open: true, 
        message: `${type} copied to clipboard!`, 
        type: 'success' 
      });
    } catch (error) {
      setNotification({ 
        open: true, 
        message: `Failed to copy ${type.toLowerCase()}`, 
        type: 'error' 
      });
    }
  };

  // Table columns configuration
  const columns = [
    {
      id: 'avatar',
      label: '',
      render: (value, row) => (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            backgroundColor: '#3B82F6',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {row.name?.charAt(0)?.toUpperCase() || 'C'}
        </Avatar>
      ),
    },
    {
      id: 'name',
      label: 'Customer Name',
      render: (value, row) => (
        <Box>
          <Typography
            variant="body1"
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#1F2937',
              cursor: 'pointer',
              '&:hover': { color: '#3B82F6' },
            }}
            onClick={() => handleCustomerClick(row)}
          >
            {value || 'N/A'}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6875rem',
              color: '#6B7280',
            }}
          >
            {row.ie_code_no || 'No IE Code'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'pan_number',
      label: 'PAN Number',
      render: (value) => (
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            color: '#1F2937',
          }}
        >
          {value || 'N/A'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      type: 'status',
      render: (value, row) => (
        <Chip
          label={getStatusText(row)}
          size="small"
          color={getStatusColor(row)}
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 500,
            height: 20,
          }}
        />
      ),
    },
    {
      id: 'assignedModules',
      label: 'Modules',
      render: (value, row) => (
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.75rem',
            color: '#6B7280',
          }}
        >
          {row.assignedModules?.length || 0} assigned
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100%',
      height: '100%',
      overflow: 'visible',
      p: 0
    }}>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1F2937',
                mb: 0.5,
              }}
            >
              Customer Management
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: '0.875rem',
                color: '#6B7280',
              }}
            >
              Manage customer accounts, passwords, and module access
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ModernButton
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchAllCustomers}
              disabled={loading}
            >
              Refresh
            </ModernButton>
          </Box>
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid #F3F4F6', borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                  Total Customers
                </Typography>
                <Typography variant="h5" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937' }}>
                  {(allCustomerData.summary?.registered || 0) + (allCustomerData.summary?.inactive || 0) + (allCustomerData.summary?.pending || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid #F3F4F6', borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                  Registered Customers
                </Typography>
                <Typography variant="h5" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981' }}>
                  {allCustomerData.summary?.registered || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid #F3F4F6', borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                  KYC Approved
                </Typography>
                <Typography variant="h5" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#F59E0B' }}>
                  {allCustomerData.summary?.inactive || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid #F3F4F6', borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                  KYC Not Approved
                </Typography>
                <Typography variant="h5" sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#6B7280' }}>
                  {allCustomerData.summary?.pending || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Main Content */}
      <ModernCard>
        {/* Filters and Search */}
        <Box sx={{ p: 3, borderBottom: '1px solid #F3F4F6' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTab-root': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  minHeight: 40,
                },
              }}
            >
              <Tab label="Registered Customers" />
              <Tab label="Unregistered Customers" />
            </Tabs>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: 18, color: '#6B7280' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: 250,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.8125rem',
                  },
                }}
              />
              {activeTab === 1 && (
                <TextField
                  select
                  label="KYC Status"
                  value={approvalFilter}
                  onChange={(e) => setApprovalFilter(e.target.value)}
                  size="small"
                  sx={{ width: 150 }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="approved">KYC Approved</MenuItem>
                  <MenuItem value="notApproved">Not Approved</MenuItem>
                </TextField>
              )}
            </Box>
          </Box>
        </Box>

        {/* Customer Table */}
        <Box sx={{ p: 0 }}>
          <ModernDataTable
            columns={columns}
            rows={filteredCustomers}
            loading={loading}
            onRowClick={handleCustomerClick}
            actions={(row) => console.log('Action for:', row)}
            dense={true}
          />
        </Box>
      </ModernCard>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 2,
            borderRadius: 2,
            border: '1px solid #FEE2E2',
            backgroundColor: '#FEF2F2',
          }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Password Change Dialog */}
      <Dialog 
        open={showPasswordDialog} 
        onClose={() => setShowPasswordDialog(false)}
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
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            Update Customer Password
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            fullWidth
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
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
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #F3F4F6' }}>
          <ModernButton
            variant="outlined"
            onClick={() => setShowPasswordDialog(false)}
          >
            Cancel
          </ModernButton>
          <ModernButton
            variant="contained"
            onClick={handlePasswordChange}
            loading={isSubmitting}
            disabled={!newPassword || newPassword.length < 6}
          >
            Update Password
          </ModernButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModernCustomerManagement;
