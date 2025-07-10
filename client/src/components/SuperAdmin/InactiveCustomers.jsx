import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  InputAdornment,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PersonAdd,
  Search,
  Business,
  ContactMail,
  ContentCopy,
  Refresh,
  Info,
} from '@mui/icons-material';
import { useSuperAdminApi } from '../../hooks/useSuperAdminApi';

const InactiveCustomers = ({ onRegisterCustomer }) => {
  const theme = useTheme();
  const { 
    loading, 
    error, 
    setError,
    getCustomers, // Using new unified API
  } = useSuperAdminApi();

  const [inactiveCustomers, setInactiveCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInactiveCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [inactiveCustomers, searchTerm]);

  const fetchInactiveCustomers = async () => {
    try {
      setError(null);
      // Use new unified API to get inactive customers
      const response = await getCustomers('inactive');
      setInactiveCustomers(response.data || []);
      console.log('Fetched inactive customers:', response.data);
    } catch (error) {
      console.error('Error fetching inactive customers:', error);
      setError('Failed to load inactive customers');
    }
  };

  const filterCustomers = () => {
    if (!searchTerm) {
      setFilteredCustomers(inactiveCustomers);
      return;
    }

    const filtered = inactiveCustomers.filter(customer =>
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.ie_code_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.pan_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  };

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleRegisterClick = (customer) => {
    onRegisterCustomer?.(customer);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Inactive Customers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            KYC approved customers who haven't been registered yet
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchInactiveCustomers}
          sx={{ borderRadius: 2, px: 3, py: 1 }}
        >
          Refresh
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {inactiveCustomers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Inactive
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main' }}>
                  <PersonAdd />
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
                    {filteredCustomers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Filtered Results
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}>
                  <Search />
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
                    Ready
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    For Registration
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}>
                  <Business />
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
                    KYC
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved Status
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                  <ContactMail />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {/* Search Controls */}
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  placeholder="Search by name, IE code, or PAN number..."
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
              <Grid item xs={12} md={4}>
                <Alert severity="info" sx={{ py: 1 }}>
                  <Typography variant="body2">
                    <strong>{filteredCustomers.length}</strong> customers ready for registration
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Box>

          {/* Table */}
          {filteredCustomers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Avatar sx={{ 
                bgcolor: alpha(theme.palette.info.main, 0.1), 
                color: 'info.main',
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2
              }}>
                <Info />
              </Avatar>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {searchTerm ? 'No matching customers found' : 'No inactive customers'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'All KYC approved customers have been registered'
                }
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Customer Details</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>IE Code</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>PAN Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCustomers.map((customer, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {customer.name?.charAt(0) || customer.ie_code_no?.charAt(0) || 'C'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {customer.name || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              KYC Approved
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
                            <IconButton 
                              size="small" 
                              onClick={() => handleCopy(customer.ie_code_no, 'IE Code')}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
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
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Ready to Register"
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<PersonAdd />}
                          onClick={() => handleRegisterClick(customer)}
                          sx={{ borderRadius: 2 }}
                        >
                          Register
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default InactiveCustomers;
