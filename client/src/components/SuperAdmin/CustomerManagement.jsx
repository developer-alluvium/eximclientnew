import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  InputAdornment,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  Snackbar,
  useTheme,
  alpha,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  PersonAdd,
  Edit,
  Visibility,
  VisibilityOff,
  ContentCopy,
  Search,
  FilterList,
  People,
  Security,
  Business,
  ContactMail,
  Info,
} from '@mui/icons-material';
import { useSuperAdminApi } from '../../hooks/useSuperAdminApi';
import CustomerDetailView from './CustomerDetailView';
import InactiveCustomers from './InactiveCustomers';

const CustomerManagement = ({ onRefresh }) => {
  const theme = useTheme();
  
  // Use custom hook instead of service
  const { 
    loading, 
    error, 
    setError,
    getCustomers,
    updateCustomerPassword,
    registerCustomer
  } = useSuperAdminApi();

  const [activeTab, setActiveTab] = useState(0);
  const [allCustomerData, setAllCustomerData] = useState({ registered: [], inactive: [], pending: [], summary: {} });
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hidePasswords, setHidePasswords] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Customer detail view state
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState(null);

  useEffect(() => {
    fetchAllCustomers();
  }, [viewMode, registrationMode]);

  useEffect(() => {
    filterCustomers();
  }, [allCustomerData, searchTerm, activeTab]);

  const fetchAllCustomers = async () => {
    try {
      // Fetch all customer data using the optimized unified API
      const response = await getCustomers('all', { includeKyc: true });
      setAllCustomerData(response.data || { registered: [], inactive: [], pending: [], summary: {} });
    } catch (error) {
      console.error('Error fetching customers:', error);
      showNotification('Failed to load customers', 'error');
    }
  };

  const filterCustomers = () => {
    let filtered = [];
    
    // Get the appropriate dataset based on view mode
    switch (viewMode) {
      case 'manage':
        // Combine registered and inactive customers for comprehensive management view
        const registeredCustomers = allCustomerData.registered || [];
        const inactiveCustomers = allCustomerData.inactive || [];
        filtered = [...registeredCustomers, ...inactiveCustomers];
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

    // Filter by tab
    switch (activeTab) {
      case 1: // Active/Registered customers
        filtered = filtered.filter(customer => customer.status === 'registered' && customer.isActive);
        break;
      case 2: // Inactive/Awaiting Registration customers
        filtered = filtered.filter(customer => 
          (customer.status === 'registered' && !customer.isActive) || 
          customer.status === 'inactive'
        );
        break;
      case 3: // Custom passwords
        filtered = filtered.filter(customer => customer.password_changed);
        break;
      default: // All customers
        break;
    }

    setFilteredCustomers(filtered);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ open: true, message, type });
  };

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification(`${type} copied to clipboard!`);
    } catch (error) {
      showNotification(`Failed to copy ${type.toLowerCase()}`, 'error');
    }
  };

  const handlePasswordChange = async () => {
    try {
      await updateCustomerPassword(selectedCustomer._id, newPassword);
      showNotification('Password updated successfully');
      setShowPasswordDialog(false);
      setNewPassword('');
      fetchCustomers();
      onRefresh?.();
    } catch (error) {
      showNotification('Failed to update password', 'error');
    }
  };

  const generatePassword = (ieCode, panNumber) => {
    if (!ieCode || !panNumber) return '';
    const iecPart = ieCode.slice(-4);
    const panPart = panNumber.slice(0, 4);
    return `${iecPart}@${panPart}`;
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

  // Handle customer detail view
  const handleCustomerClick = (customer) => {
    setSelectedCustomerForDetail(customer);
    setShowCustomerDetail(true);
  };

  // Handle register customer from inactive list
  const handleRegisterFromInactive = (customer) => {
    // Switch to register mode and pre-fill form
    setViewMode('register');
    setRegistrationMode('manual');
    setRegistrationForm({
      ie_code_no: customer.ie_code_no || '',
      pan_number: customer.pan_number || '',
      name: customer.name || ''
    });
  };

  // Handle KYC selection
  const handleKycSelection = (event, value) => {
    setSelectedKyc(value);
    if (value) {
      setRegistrationForm({
        ie_code_no: value.iec_no || '',
        pan_number: value.pan_no || '',
        name: value.name_of_individual || ''
      });
    } else {
      setRegistrationForm({
        ie_code_no: '',
        pan_number: '',
        name: ''
      });
    }
    setError(null);
  };

  // Handle registration form submission
  const handleRegistrationSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage('');
    setIsSubmitting(true);

    // Basic validation
    if (!registrationForm.ie_code_no || !registrationForm.pan_number) {
      setError('Please provide both IE Code and PAN Number');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await registerCustomer({
        ie_code_no: registrationForm.ie_code_no.toUpperCase(),
        pan_number: registrationForm.pan_number.toUpperCase(),
        name: registrationForm.name.trim() || undefined
      });

      if (response.success) {
        const { customer } = response;
        setSuccessMessage(`Registration successful! Account created for ${customer.name}.`);
        setGeneratedPassword(customer.initialPassword);

        // Reset form
        setSelectedKyc(null);
        setRegistrationForm({
          ie_code_no: '',
          pan_number: '',
          name: ''
        });

        // Refresh customer list if we're in manage mode
        if (viewMode === 'manage') {
          fetchCustomers();
        }

        // Switch to manage mode after 3 seconds
        setTimeout(() => {
          setViewMode('manage');
          setSuccessMessage('');
          setGeneratedPassword('');
        }, 3000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response) {
        switch (error.response.status) {
          case 400:
            setError(error.response.data.message);
            break;
          case 401:
          case 403:
            setError('SuperAdmin authentication expired. Please login again.');
            break;
          case 404:
            setError('No records found with the provided IE Code or PAN Number.');
            break;
          default:
            setError('An unexpected error occurred');
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Customer Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {viewMode === 'register' 
              ? 'Register new customers using KYC verified information or manual entry.'
              : viewMode === 'inactive'
              ? 'View and register KYC approved customers who are not yet active.'
              : 'Manage customer accounts, passwords, and access permissions.'
            }
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant={viewMode === 'register' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('register')}
            startIcon={<PersonAdd />}
            sx={{ borderRadius: 2, px: 3, py: 1 }}
          >
            Register Customer
          </Button>
          <Button
            variant={viewMode === 'inactive' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('inactive')}
            startIcon={<Info />}
            sx={{ borderRadius: 2, px: 3, py: 1 }}
          >
            Inactive Customers
          </Button>
          <Button
            variant={viewMode === 'manage' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('manage')}
            startIcon={<Edit />}
            sx={{ borderRadius: 2, px: 3, py: 1 }}
          >
            Manage Customers
          </Button>
        </Box>
      </Box>

      {/* Registration Form */}
      {viewMode === 'register' && (
        <Card sx={{ borderRadius: 3, mb: 4 }}>
          <CardContent>
            {/* Registration Method Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Registration Method
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card 
                    sx={{ 
                      cursor: "pointer",
                      border: registrationMode === "dropdown" ? 2 : 1,
                      borderColor: registrationMode === "dropdown" ? "primary.main" : "grey.300",
                      bgcolor: registrationMode === "dropdown" ? "primary.50" : "white",
                      transition: "all 0.2s ease",
                      "&:hover": { 
                        borderColor: "primary.main",
                        transform: "translateY(-2px)",
                        boxShadow: 2
                      }
                    }}
                    onClick={() => setRegistrationMode("dropdown")}
                  >
                    <CardContent sx={{ textAlign: "center", py: 2 }}>
                      <Business sx={{ 
                        fontSize: 32, 
                        color: registrationMode === "dropdown" ? "primary.main" : "grey.600",
                        mb: 1 
                      }} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Select Customer
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Choose from KYC records
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card 
                    sx={{ 
                      cursor: "pointer",
                      border: registrationMode === "manual" ? 2 : 1,
                      borderColor: registrationMode === "manual" ? "primary.main" : "grey.300",
                      bgcolor: registrationMode === "manual" ? "primary.50" : "white",
                      transition: "all 0.2s ease",
                      "&:hover": { 
                        borderColor: "primary.main",
                        transform: "translateY(-2px)",
                        boxShadow: 2
                      }
                    }}
                    onClick={() => setRegistrationMode("manual")}
                  >
                    <CardContent sx={{ textAlign: "center", py: 2 }}>
                      <ContactMail sx={{ 
                        fontSize: 32, 
                        color: registrationMode === "manual" ? "primary.main" : "grey.600",
                        mb: 1 
                      }} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Manual Entry
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Enter details manually
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* Error and Success Messages */}
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {successMessage && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                {successMessage}
                {generatedPassword && (
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: "success.50", 
                    borderRadius: 2, 
                    border: "1px solid", 
                    borderColor: "success.200" 
                  }}>
                    <Typography variant="body2" fontWeight="bold" color="success.dark" sx={{ mb: 1 }}>
                      🎉 Account Created Successfully!
                    </Typography>
                    <Box sx={{ 
                      bgcolor: "white", 
                      p: 2, 
                      borderRadius: 2, 
                      border: "2px solid", 
                      borderColor: "success.300" 
                    }}>
                      <Typography variant="body2" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
                        Login Credentials:
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1, flexWrap: "wrap", gap: 1 }}>
                        <Typography variant="body2">
                          <strong>Username:</strong> {registrationForm.ie_code_no}
                        </Typography>
                        <Tooltip title="Copy Username">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopy(registrationForm.ie_code_no, "Username")}
                            sx={{ color: "primary.main", p: 0.5 }}
                          >
                            <ContentCopy sx={{ fontSize: "1rem" }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                        <Typography variant="body2">
                          <strong>Password:</strong> 
                          <Chip 
                            label={generatedPassword}
                            sx={{ 
                              ml: 1,
                              fontFamily: "monospace",
                              fontWeight: "bold",
                              bgcolor: "primary.main",
                              color: "white"
                            }}
                          />
                        </Typography>
                        <Tooltip title="Copy Password">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopy(generatedPassword, "Password")}
                            sx={{ color: "primary.main", p: 0.5 }}
                          >
                            <ContentCopy sx={{ fontSize: "1rem" }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Alert>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegistrationSubmit}>
              {/* KYC Dropdown for dropdown mode */}
              {registrationMode === "dropdown" && (
                <Box sx={{ mb: 3 }}>
                  <Autocomplete
                    fullWidth
                    loading={loading}
                    options={allCustomerData.inactive || []}
                    value={selectedKyc}
                    onChange={handleKycSelection}
                    getOptionLabel={(option) => 
                      `${option.name} (IE: ${option.ie_code_no})`
                    }
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" fontWeight={500}>
                            {option.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            IE: {option.ie_code_no} | PAN: {option.pan_number}
                          </Typography>
                          {option.status && (
                            <Chip 
                              label={option.status} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ ml: 1, fontSize: "0.7rem" }}
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Customer from KYC Records"
                        placeholder="Search by name or IE code..."
                        helperText="Choose from existing KYC verified customers"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    noOptionsText={loading ? "Loading customers..." : "No customers found"}
                  />
                </Box>
              )}

              {/* Form Fields */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="IE Code Number"
                    value={registrationForm.ie_code_no}
                    onChange={(e) => setRegistrationForm(prev => ({
                      ...prev,
                      ie_code_no: e.target.value.toUpperCase()
                    }))}
                    helperText="Import Export Code"
                    required
                    disabled={registrationMode === "dropdown" && selectedKyc}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="PAN Number"
                    value={registrationForm.pan_number}
                    onChange={(e) => setRegistrationForm(prev => ({
                      ...prev,
                      pan_number: e.target.value.toUpperCase()
                    }))}
                    helperText="Permanent Account Number"
                    required
                    disabled={registrationMode === "dropdown" && selectedKyc}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company/Individual Name (Optional)"
                    value={registrationForm.name}
                    onChange={(e) => setRegistrationForm(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    helperText="Leave blank to use registered name"
                    disabled={registrationMode === "dropdown" && selectedKyc}
                  />
                </Grid>
              </Grid>

              {/* Password Preview */}
              {registrationForm.ie_code_no && registrationForm.pan_number && (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  bgcolor: "info.50", 
                  borderRadius: 1, 
                  border: "1px solid", 
                  borderColor: "info.200",
                  mb: 3
                }}>
                  <Typography variant="body2" fontWeight="bold" color="info.dark" sx={{ mb: 1 }}>
                    📋 Generated Password Preview:
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="body2">
                      Password: 
                      <span style={{ 
                        fontFamily: "monospace", 
                        backgroundColor: "#1976d2", 
                        color: "white",
                        padding: "4px 8px", 
                        borderRadius: "4px", 
                        marginLeft: "8px",
                        fontSize: "1rem",
                        fontWeight: "bold"
                      }}>
                        {generatePassword(registrationForm.ie_code_no, registrationForm.pan_number)}
                      </span>
                    </Typography>
                    <Tooltip title="Copy Generated Password">
                      <IconButton 
                        size="small" 
                        onClick={() => handleCopy(
                          generatePassword(registrationForm.ie_code_no, registrationForm.pan_number), 
                          "Generated Password"
                        )}
                        sx={{ color: "primary.main", p: 0.5 }}
                      >
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="caption" color="info.600" sx={{ mt: 1, display: "block" }}>
                    💡 Password format: IE Code (last 4 digits) + @ + PAN Number (first 4 characters)
                  </Typography>
                </Box>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={isSubmitting || (registrationMode === "dropdown" && !selectedKyc)}
                sx={{ py: 1.5 }}
              >
                {isSubmitting ? "Creating Account..." : "Register Customer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Inactive Customers View */}
      {viewMode === 'inactive' && (
        <InactiveCustomers onRegisterCustomer={handleRegisterFromInactive} />
      )}

      {/* Customer Management Section */}
      {viewMode === 'manage' && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {customers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Customers
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                  <People />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {customers.filter(c => c.isActive).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Accounts
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}>
                  <Security />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {customers.filter(c => c.password_changed).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Custom Passwords
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main' }}>
                  <Edit />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {customers.filter(c => !c.isActive).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inactive Accounts
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }}>
                  <FilterList />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Card */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ px: 3 }}
            >
              <Tab label="All Customers" />
              <Tab label="Active" />
              <Tab label="Inactive" />
              <Tab label="Custom Passwords" />
            </Tabs>
          </Box>

          {/* Controls */}
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={hidePasswords}
                        onChange={(e) => setHidePasswords(e.target.checked)}
                      />
                    }
                    label={hidePasswords ? 'Show Passwords' : 'Hide Passwords'}
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>IE Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>PAN Number</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Password</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {customer.name?.charAt(0) || 'C'}
                        </Avatar>
                        <Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              cursor: 'pointer',
                              color: 'primary.main',
                              '&:hover': {
                                textDecoration: 'underline'
                              }
                            }}
                            onClick={() => handleCustomerClick(customer)}
                          >
                            {customer.name || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Click to view details
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {customer.ie_code_no}
                        </Typography>
                        <Tooltip title="Copy IE Code">
                          <IconButton size="small" onClick={() => handleCopy(customer.ie_code_no, 'IE Code')}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {customer.pan_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            bgcolor: customer.password_changed ? 'warning.50' : 'primary.50',
                            color: customer.password_changed ? 'warning.800' : 'primary.800',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.8rem',
                          }}
                        >
                          {hidePasswords ? '••••••••' : 
                            (customer.password_changed && customer.initialPassword
                              ? customer.initialPassword
                              : generatePassword(customer.ie_code_no, customer.pan_number)
                            )
                          }
                        </Typography>
                        {!hidePasswords && (
                          <Tooltip title="Copy Password">
                            <IconButton 
                              size="small" 
                              onClick={() => handleCopy(
                                customer.password_changed && customer.initialPassword
                                  ? customer.initialPassword
                                  : generatePassword(customer.ie_code_no, customer.pan_number),
                                'Password'
                              )}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(customer)}
                        color={getStatusColor(customer)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleCustomerClick(customer)}
                          >
                            <Info fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Password">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowPasswordDialog(true);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
        </>
      )}

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Change Password for {selectedCustomer?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Current Password:</strong> {
                selectedCustomer?.password_changed && selectedCustomer?.initialPassword
                  ? selectedCustomer.initialPassword
                  : generatePassword(selectedCustomer?.ie_code_no, selectedCustomer?.pan_number)
              }
            </Typography>
          </Alert>
          <TextField
            fullWidth
            label="New Password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Password must be at least 6 characters long"
            sx={{ mt: 2 }}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
          <Button 
            onClick={handlePasswordChange} 
            variant="contained"
            disabled={!newPassword || newPassword.length < 6}
          >
            Update Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert 
          severity={notification.type} 
          onClose={() => setNotification({ ...notification, open: false })}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Customer Detail View */}
      <CustomerDetailView
        open={showCustomerDetail}
        onClose={() => setShowCustomerDetail(false)}
        customer={selectedCustomerForDetail}
        onRefresh={fetchCustomers}
        onPasswordUpdated={() => {
          fetchCustomers();
          onRefresh?.();
        }}
        onModulesUpdated={() => {
          fetchCustomers();
          onRefresh?.();
        }}
      />
    </Box>
  );
};

export default CustomerManagement;
