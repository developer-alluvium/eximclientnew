import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControlLabel,
  Button,
  Alert,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  Divider,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  SelectAll as SelectAllIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { validateSuperAdminToken } from '../../utils/tokenValidation';
import axios from 'axios';

function ColumnPermissionsManagement({ onRefresh }) {
  const theme = useTheme();
  const [customers, setCustomers] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerColumns, setCustomerColumns] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [bulkColumns, setBulkColumns] = useState([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Helper function to get SuperAdmin authorization headers
  const getSuperAdminHeaders = () => {
    const validation = validateSuperAdminToken();
    
    if (!validation.isValid) {
      return null;
    }
    
    return {
      headers: {
        Authorization: `Bearer ${validation.token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = getSuperAdminHeaders();
      if (!headers) return;

      const [customersRes, columnsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/registered-customers`, headers),
        axios.get(`${process.env.REACT_APP_API_STRING}/available-columns`, headers)
      ]);

      setCustomers(customersRes.data.data);
      setAvailableColumns(columnsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerClick = async (customer) => {
    try {
      setSelectedCustomer(customer);
      const headers = getSuperAdminHeaders();
      if (!headers) return;

      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/customer/${customer._id}/column-permissions`,
        headers
      );

      setCustomerColumns(response.data.data.customer.allowedColumns || []);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching customer permissions:', error);
      setError(error.response?.data?.message || 'Failed to fetch customer permissions');
    }
  };

  const handleColumnToggle = (columnId) => {
    setCustomerColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleSelectAll = () => {
    if (customerColumns.length === availableColumns.length) {
      setCustomerColumns([]);
    } else {
      setCustomerColumns(availableColumns.map(col => col.id));
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedCustomer) return;

    try {
      setSaving(true);
      setError(null);
      const headers = getSuperAdminHeaders();
      if (!headers) return;

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/customer/${selectedCustomer._id}/column-permissions`,
        { allowedColumns: customerColumns },
        headers
      );

      setSuccess(`Column permissions updated for ${selectedCustomer.name}!`);
      setDialogOpen(false);
      fetchData(); // Refresh the data
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error saving permissions:', error);
      setError(error.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedCustomers.length === 0 || bulkColumns.length === 0) {
      setError('Please select customers and columns for bulk assignment');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const headers = getSuperAdminHeaders();
      if (!headers) return;

      await axios.post(
        `${process.env.REACT_APP_API_STRING}/bulk-column-permissions`,
        {
          customerIds: selectedCustomers,
          allowedColumns: bulkColumns
        },
        headers
      );

      setSuccess(`Bulk column permissions updated for ${selectedCustomers.length} customers!`);
      setBulkDialogOpen(false);
      setSelectedCustomers([]);
      setBulkColumns([]);
      fetchData(); // Refresh the data
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      setError(error.response?.data?.message || 'Failed to update bulk permissions');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.ie_code_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getColumnCount = (customer) => {
    return customer.allowedColumns?.length || 0;
  };

  const getColumnStatus = (customer) => {
    const count = getColumnCount(customer);
    const total = availableColumns.length;
    
    if (count === 0) return { label: 'None', color: 'error' };
    if (count === total) return { label: 'All', color: 'success' };
    return { label: `${count}/${total}`, color: 'warning' };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Typography>Loading column permissions...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Column Permissions Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Control which table columns each customer can see in their job list view. 
            Empty permissions grant access to all columns by default.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Customers with restricted column visibility will only see the columns you allow them to access.
            You can manage permissions individually or use the "Bulk Assign" button to update multiple customers at once.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<GroupIcon />}
          onClick={() => setBulkDialogOpen(true)}
          sx={{ borderRadius: 2, px: 3, py: 1 }}
        >
          Bulk Assign
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
                  <GroupIcon />
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
                    {availableColumns.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available Columns
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}>
                  <VisibilityIcon />
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
                    {customers.filter(c => getColumnCount(c) === availableColumns.length).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Full Access
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}>
                  <SecurityIcon />
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
                    {customers.filter(c => getColumnCount(c) > 0 && getColumnCount(c) < availableColumns.length).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Restricted Access
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main' }}>
                  <VisibilityOffIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search customers by name or IE code..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          )
        }}
      />

      {/* Customers Table */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>IE Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Column Access</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const status = getColumnStatus(customer);
                  return (
                    <TableRow key={customer._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {customer.name?.charAt(0) || 'C'}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {customer.name || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {customer.ie_code_no || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getColumnCount(customer)} of {availableColumns.length} columns
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={status.label}
                          color={status.color}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontWeight: 'medium',
                            borderWidth: '2px',
                            // Make the chip more visually distinct based on status
                            ...(status.color === 'success' && {
                              bgcolor: alpha(theme.palette.success.main, 0.1)
                            }),
                            ...(status.color === 'warning' && {
                              bgcolor: alpha(theme.palette.warning.main, 0.1)
                            }),
                            ...(status.color === 'error' && {
                              bgcolor: alpha(theme.palette.error.main, 0.1)
                            })
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Manage Column Permissions">
                          <IconButton
                            onClick={() => handleCustomerClick(customer)}
                            color="primary"
                            size="small"
                          >
                            <SecurityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Individual Customer Permissions Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.05)
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Column Permissions
            </Typography>
            {selectedCustomer && (
              <Typography variant="body2" color="text.secondary">
                {selectedCustomer.name} ({selectedCustomer.ie_code_no})
              </Typography>
            )}
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SelectAllIcon />}
            onClick={handleSelectAll}
          >
            {customerColumns.length === availableColumns.length ? 'Deselect All' : 'Select All'}
          </Button>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select which table columns this customer can see in their job list view.
          </Typography>
          <FormGroup>
            {availableColumns.map((column) => (
              <FormControlLabel
                key={column.id}
                control={
                  <Checkbox
                    checked={customerColumns.includes(column.id)}
                    onChange={() => handleColumnToggle(column.id)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {column.name}
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1 }}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePermissions}
            disabled={saving}
            startIcon={<SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Assignment Dialog */}
      <Dialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: alpha(theme.palette.primary.main, 0.05)
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Bulk Column Permissions Assignment
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Assign the same column permissions to multiple customers at once.
          </Typography>
          
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Select Customers:
          </Typography>
          
          {/* Add bulk select for customers */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button 
              size="small"
              onClick={() => {
                if (selectedCustomers.length === customers.length) {
                  // If all are selected, deselect all
                  setSelectedCustomers([]);
                } else {
                  // Otherwise select all
                  setSelectedCustomers(customers.map(c => c._id));
                }
              }}
              sx={{ textTransform: 'none' }}
            >
              {selectedCustomers.length === customers.length ? 'Deselect All' : 'Select All'}
            </Button>
          </Box>
          
          <FormGroup sx={{ mb: 3, maxHeight: '200px', overflow: 'auto' }}>
            {customers.map((customer) => (
              <FormControlLabel
                key={customer._id}
                control={
                  <Checkbox
                    checked={selectedCustomers.includes(customer._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCustomers(prev => [...prev, customer._id]);
                      } else {
                        setSelectedCustomers(prev => prev.filter(id => id !== customer._id));
                      }
                    }}
                    color="primary"
                  />
                }
                label={`${customer.name} (${customer.ie_code_no})`}
              />
            ))}
          </FormGroup>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Select Columns:
          </Typography>
          
          {/* Add bulk select for columns */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button 
              size="small"
              onClick={() => {
                if (bulkColumns.length === availableColumns.length) {
                  // If all are selected, deselect all
                  setBulkColumns([]);
                } else {
                  // Otherwise select all
                  setBulkColumns(availableColumns.map(c => c.id));
                }
              }}
              sx={{ textTransform: 'none' }}
            >
              {bulkColumns.length === availableColumns.length ? 'Deselect All' : 'Select All'}
            </Button>
          </Box>
          
          <FormGroup>
            {availableColumns.map((column) => (
              <FormControlLabel
                key={column.id}
                control={
                  <Checkbox
                    checked={bulkColumns.includes(column.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkColumns(prev => [...prev, column.id]);
                      } else {
                        setBulkColumns(prev => prev.filter(id => id !== column.id));
                      }
                    }}
                    color="primary"
                  />
                }
                label={column.name}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setBulkDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleBulkAssign}
            disabled={saving || selectedCustomers.length === 0 || bulkColumns.length === 0}
            startIcon={<SaveIcon />}
          >
            {saving ? 'Assigning...' : 'Assign Permissions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ColumnPermissionsManagement;
