import React, { useState, useEffect } from 'react';
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
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InviteUserDialog from './components/InviteUserDialog';
import EditUserDialog from './components/EditUserDialog';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Get user data from localStorage
  const currentUser = JSON.parse(localStorage.getItem('exim_user') || '{}');
  
  useEffect(() => {
    // Redirect if not logged in or not an admin
    if (!currentUser || !currentUser.ie_code_no) {
      navigate('/user/login', { replace: true });
      return;
    }
  }, []);

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  const fetchUsers = async () => {
    try {
      // Only fetch if we have an IE code
      if (!currentUser.ie_code_no) {
        showToast('User session invalid', 'error');
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/user-management/users?ie_code_no=${currentUser.ie_code_no}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        showToast(response.data.message || 'Error fetching users', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error fetching users', 'error');
      if (error.response?.status === 401) {
        // Session expired
        navigate('/user/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser.ie_code_no]);

  const handleInviteUser = async (userData) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/user-management/users/invite`,
        {
          ...userData,
          ie_code_no: currentUser.ie_code_no,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        showToast('User invited successfully');
        fetchUsers();
      } else {
        showToast(response.data.message || 'Error inviting user', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error inviting user', 'error');
      if (error.response?.status === 401) {
        navigate('/user/login', { replace: true });
      }
    }
    setInviteDialogOpen(false);
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const endpoint = updates.hasOwnProperty('role')
        ? `${process.env.REACT_APP_API_STRING}/user-management/users/${userId}/role`
        : `${process.env.REACT_APP_API_STRING}/user-management/users/${userId}/status`;

      const response = await axios.patch(
        `${process.env.REACT_APP_API_STRING}${endpoint}`,
        updates,
        { withCredentials: true }
      );
      
      if (response.data.success) {
        showToast('User updated successfully');
        fetchUsers();
      } else {
        showToast(response.data.message || 'Error updating user', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error updating user', 'error');
      if (error.response?.status === 401) {
        navigate('/user/login', { replace: true });
      }
    }
    setEditDialogOpen(false);
    setSelectedUser(null);
  };

  // Check if current user can manage other users
  const canManageUsers = currentUser.isAdmin;

  // Removed role color function as we only show admin status now

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      default:
        return 'error';
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          User Management
        </Typography>
        {canManageUsers && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteDialogOpen(true)}
          >
            Invite User
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Admin Status</TableCell>
              <TableCell>Status</TableCell>
              {canManageUsers && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.isAdmin ? 'Admin' : 'User'}
                    color={user.isAdmin ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
                    color={getStatusColor(user.status)}
                    size="small"
                  />
                </TableCell>
                {canManageUsers && (
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedUser(user);
                        setEditDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onSubmit={handleInviteUser}
      />

      {/* Edit User Dialog */}
      {selectedUser && (
        <EditUserDialog
          open={editDialogOpen}
          user={selectedUser}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedUser(null);
          }}
          onSubmit={(updates) => handleUpdateUser(selectedUser._id, updates)}
          currentUserRole={currentUser.role}
        />
      )}

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
