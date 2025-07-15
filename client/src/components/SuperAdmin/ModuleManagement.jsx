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
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Settings,
  Person,
  Edit,
  Save,
  Cancel,
  Search,
  FilterList,
  Assignment,
  CheckCircle,
  RadioButtonUnchecked,
  ExpandMore,
  Business,
  Lock,
  Security,
  Extension,
  Group,
  Refresh,
} from '@mui/icons-material';
import { useSuperAdminApi } from '../../hooks/useSuperAdminApi';
import { forceRefreshUserModules } from '../../utils/moduleAccess';

const ModuleManagement = () => {
  const theme = useTheme();
  const {
    loading,
    error,
    setError,
    getAvailableModules,
    getAllCustomersWithModules,
    updateCustomerModuleAssignments,
    bulkAssignModules,
  } = useSuperAdminApi();

  const [availableModules, setAvailableModules] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [tempModuleAssignments, setTempModuleAssignments] = useState([]);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkSelectedModules, setBulkSelectedModules] = useState([]);
  const [bulkSelectedCustomers, setBulkSelectedCustomers] = useState([]);
  const [notification, setNotification] = useState({ message: '', type: 'success' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  const loadData = async () => {
    try {
      setError(null);
      
      // Load available modules
      const modulesResponse = await getAvailableModules();
      setAvailableModules(modulesResponse.data || []);
      
      // Load customers with their module assignments
      const customersResponse = await getAllCustomersWithModules();
      setCustomers(customersResponse.data || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load module management data');
    }
  };

  const filterCustomers = () => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.ie_code_no?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: 'success' }), 3000);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setTempModuleAssignments(customer.assignedModules || []);
  };

  const handleSaveCustomerModules = async () => {
    try {
      setError(null);
      await updateCustomerModuleAssignments(editingCustomer._id, tempModuleAssignments);
      
      // Update local state
      setCustomers(prev => prev.map(c => 
        c._id === editingCustomer._id 
          ? { ...c, assignedModules: tempModuleAssignments }
          : c
      ));
      
      // Refresh user data in localStorage if this is the current user
      const currentUser = localStorage.getItem("exim_user");
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        const currentUserId = userData.id || userData.data?.user?.id;
        if (currentUserId === editingCustomer._id) {
          await forceRefreshUserModules();
        }
      }
      
      setEditingCustomer(null);
      setTempModuleAssignments([]);
      showNotification('Module assignments updated successfully');
    } catch (error) {
      console.error('Error updating module assignments:', error);
      setError('Failed to update module assignments');
    }
  };

  const handleCancelEdit = () => {
    setEditingCustomer(null);
    setTempModuleAssignments([]);
    setError(null);
  };

  const handleModuleToggle = (moduleId) => {
    setTempModuleAssignments(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleBulkAssign = async () => {
    try {
      setError(null);
      
      const assignments = bulkSelectedCustomers.map(customerId => ({
        customerId,
        moduleIds: bulkSelectedModules
      }));
      
      await bulkAssignModules({ assignments });
      
      // Check if any of the bulk assigned customers is the current user
      const currentUser = localStorage.getItem("exim_user");
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        const currentUserId = userData.id || userData.data?.user?.id;
        if (bulkSelectedCustomers.includes(currentUserId)) {
          await forceRefreshUserModules();
        }
      }
      
      // Refresh data
      await loadData();
      
      setBulkSelectedModules([]);
      setBulkSelectedCustomers([]);
      setShowBulkAssign(false);
      showNotification(`Bulk assigned modules to ${bulkSelectedCustomers.length} customers`);
    } catch (error) {
      console.error('Error with bulk assignment:', error);
      setError('Failed to perform bulk assignment');
    }
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

  const getModuleStats = () => {
    const totalAssignments = customers.reduce((sum, customer) => 
      sum + (customer.assignedModules?.length || 0), 0
    );
    const averageModulesPerCustomer = customers.length > 0 
      ? Math.round(totalAssignments / customers.length * 10) / 10 
      : 0;
    
    return {
      totalModules: availableModules.length,
      totalAssignments,
      averageModulesPerCustomer,
      customersWithModules: customers.filter(c => c.assignedModules?.length > 0).length
    };
  };

  const stats = getModuleStats();

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
            Module Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage customer access to different modules and features
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Group />}
            onClick={() => setShowBulkAssign(true)}
            sx={{ borderRadius: 2 }}
          >
            Bulk Assign
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Box>
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

      {/* Success Notification */}
      {notification.message && (
        <Alert 
          severity={notification.type}
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setNotification({ message: '', type: 'success' })}
        >
          {notification.message}
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
                    {stats.totalModules}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available Modules
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                  <Extension />
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
                    {stats.totalAssignments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Assignments
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}>
                  <Assignment />
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
                    {stats.averageModulesPerCustomer}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg per Customer
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}>
                  <Person />
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
                    {stats.customersWithModules}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Customers w/ Modules
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main' }}>
                  <Security />
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
          </Box>

          {/* Customer Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>IE Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Assigned Modules</TableCell>
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
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {customer.name || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.isActive ? 'Active' : 'Inactive'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {customer.ie_code_no}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {customer.assignedModules?.length > 0 ? (
                          customer.assignedModules.map((moduleId) => {
                            const module = availableModules.find(m => m.id === moduleId);
                            return (
                              <Chip
                                key={moduleId}
                                label={module?.name || moduleId}
                                color={getModuleCategoryColor(module?.category)}
                                size="small"
                                variant="outlined"
                              />
                            );
                          })
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No modules assigned
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit Module Assignments">
                        <IconButton
                          size="small"
                          onClick={() => handleEditCustomer(customer)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Edit Customer Modules Dialog */}
      <Dialog 
        open={!!editingCustomer} 
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit Module Assignments for {editingCustomer?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {availableModules.map((module) => {
              const isAssigned = tempModuleAssignments.includes(module.id);
              return (
                <Grid item xs={12} md={6} key={module.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isAssigned}
                        onChange={() => handleModuleToggle(module.id)}
                        color="primary"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getModuleIcon(module.id)}
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {module.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {module.description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>Cancel</Button>
          <Button 
            onClick={handleSaveCustomerModules}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Assignment Dialog */}
      <Dialog 
        open={showBulkAssign} 
        onClose={() => setShowBulkAssign(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Bulk Assign Modules
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Select modules and customers to assign them to multiple customers at once.
          </Alert>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Select Modules ({bulkSelectedModules.length} selected)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1}>
                {availableModules.map((module) => (
                  <Grid item xs={12} md={6} key={module.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={bulkSelectedModules.includes(module.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkSelectedModules(prev => [...prev, module.id]);
                            } else {
                              setBulkSelectedModules(prev => prev.filter(id => id !== module.id));
                            }
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getModuleIcon(module.id)}
                          <Typography variant="body2">{module.name}</Typography>
                        </Box>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Select Customers ({bulkSelectedCustomers.length} selected)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1}>
                {customers.map((customer) => (
                  <Grid item xs={12} md={6} key={customer._id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={bulkSelectedCustomers.includes(customer._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkSelectedCustomers(prev => [...prev, customer._id]);
                            } else {
                              setBulkSelectedCustomers(prev => prev.filter(id => id !== customer._id));
                            }
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
                            {customer.name?.charAt(0) || 'C'}
                          </Avatar>
                          <Typography variant="body2">{customer.name} ({customer.ie_code_no})</Typography>
                        </Box>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkAssign(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkAssign}
            variant="contained"
            disabled={bulkSelectedModules.length === 0 || bulkSelectedCustomers.length === 0 || loading}
          >
            {loading ? 'Assigning...' : 'Assign Modules'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModuleManagement;
