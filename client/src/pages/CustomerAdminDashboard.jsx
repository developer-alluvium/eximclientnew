import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge
} from "@mui/material";
import {
  People,
  Person,
  PersonAdd,
  Settings,
  Notifications,
  ExitToApp,
  Edit,
  Visibility,
  Check,
  Close,
  Pending
} from "@mui/icons-material";
import { ThemeProvider } from '@mui/material/styles';
import { modernTheme } from "../styles/modernTheme";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function CustomerAdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/customer-admin/dashboard`, {
        withCredentials: true
      });
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      if (error.response?.status === 401) {
        navigate('/admin/login');
      }
      setError('Failed to fetch dashboard data');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/customer-admin/users`, {
        withCredentials: true
      });
      if (response.data.success) {
        setUsers(response.data.data.users);
      }
      setLoading(false);
    } catch (error) {
      console.error('Users fetch error:', error);
      setError('Failed to fetch users');
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await axios.put(`/${process.env.REACT_APP_API_STRING}api/customer-admin/users/${selectedUser._id}/status`, {
        status: newStatus,
        reason: statusReason
      }, { withCredentials: true });
      
      setStatusDialog(false);
      setSelectedUser(null);
      setNewStatus("");
      setStatusReason("");
      fetchUsers();
      fetchDashboardData();
    } catch (error) {
      console.error('Status update error:', error);
      setError('Failed to update user status');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout', {}, { withCredentials: true });
      localStorage.removeItem('exim_user');
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Check />;
      case 'pending': return <Pending />;
      case 'inactive': return <Close />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={modernTheme}>
        <Container>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <Typography>Loading dashboard...</Typography>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={modernTheme}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Admin Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {dashboardData?.customer?.name} - {dashboardData?.customer?.ie_code_no}
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Badge badgeContent={dashboardData?.notifications?.length || 0} color="error">
              <IconButton>
                <Notifications />
              </IconButton>
            </Badge>
            <Button
              variant="outlined"
              startIcon={<ExitToApp />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <People color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {dashboardData?.statistics?.totalUsers || 0}
                    </Typography>
                    <Typography color="text.secondary">Total Users</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PersonAdd color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {dashboardData?.statistics?.activeUsers || 0}
                    </Typography>
                    <Typography color="text.secondary">Active Users</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Pending color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {dashboardData?.statistics?.pendingUsers || 0}
                    </Typography>
                    <Typography color="text.secondary">Pending Users</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Card>
          <CardContent>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Users Management" />
              <Tab label="Notifications" />
            </Tabs>

            {/* Users Management Tab */}
            {tabValue === 0 && (
              <Box mt={3}>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Registration Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user._id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(user.status)}
                              label={user.status.toUpperCase()}
                              color={getStatusColor(user.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Edit Status">
                              <IconButton
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewStatus(user.status);
                                  setStatusDialog(true);
                                }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Notifications Tab */}
            {tabValue === 1 && (
              <Box mt={3}>
                {dashboardData?.notifications?.length > 0 ? (
                  dashboardData.notifications.map((notification) => (
                    <Alert 
                      key={notification._id} 
                      severity="info" 
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="subtitle2">{notification.title}</Typography>
                      <Typography variant="body2">{notification.message}</Typography>
                    </Alert>
                  ))
                ) : (
                  <Typography color="text.secondary">No new notifications</Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Status Update Dialog */}
        <Dialog open={statusDialog} onClose={() => setStatusDialog(false)}>
          <DialogTitle>Update User Status</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="normal"
              label="Reason (optional)"
              multiline
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleStatusUpdate} variant="contained">
              Update
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </ThemeProvider>
  );
}

export default CustomerAdminDashboard;
