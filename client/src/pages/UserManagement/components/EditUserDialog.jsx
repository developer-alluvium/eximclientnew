import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';

const EditUserDialog = ({ open, onClose, onSubmit, user, currentUserRole }) => {
  const [formData, setFormData] = useState({
    role: user.role,
    status: user.status,
  });

  const canChangeRole = currentUserRole === 'super_admin' ||
    (currentUserRole === 'iecode_admin' && user.role !== 'super_admin');

  const roleOptions = currentUserRole === 'super_admin'
    ? ['super_admin', 'iecode_admin', 'customer']
    : ['iecode_admin', 'customer'];

  const statusOptions = ['active', 'inactive', 'pending'];

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (formData.role !== user.role) {
      updates.role = formData.role;
    }
    if (formData.status !== user.status) {
      updates.status = formData.status;
    }
    onSubmit(updates);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit User</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3}>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                User Details
              </Typography>
              <Typography variant="body1">{user.name}</Typography>
              <Typography variant="body2" color="textSecondary">
                {user.email}
              </Typography>
            </Box>

            {canChangeRole && (
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                >
                  {roleOptions.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={
              formData.role === user.role && formData.status === user.status
            }
          >
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditUserDialog;
