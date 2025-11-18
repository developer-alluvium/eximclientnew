import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getJsonCookie, getCookie, removeCookie } from "../../utils/cookies";
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
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormGroup,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Badge,
  Stack,
  Switch,
  Avatar,
  Container,
  Autocomplete,
} from "@mui/material";
import {
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  PersonAddAlt as PromoteIcon,
  PersonRemoveAlt1 as DemoteIcon,
  PowerSettingsNew as StatusIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
  Settings as SettingsIcon,
  ViewColumn as ColumnIcon,
  Assignment as PermissionIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import InviteUserDialog from "./components/InviteUserDialog";
import EditUserDialog from "./components/EditUserDialog";
import BackButton from "../../components/BackButton";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [columnPermissionDialog, setColumnPermissionDialog] = useState({
    open: false,
    user: null,
  });
  // Commented out bulk column dialog state
  // const [bulkColumnDialog, setBulkColumnDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuUserId, setMenuUserId] = useState(null);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [statusUpdateDialog, setStatusUpdateDialog] = useState({
    open: false,
    user: null,
  });
  const [availableColumns, setAvailableColumns] = useState([]);
  const [userColumns, setUserColumns] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);

  // Add importer filtering states
  const [availableImporters, setAvailableImporters] = useState([]);
  const [selectedImporter, setSelectedImporter] = useState("All Importers");
  const [selectedIeCodes, setSelectedIeCodes] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 50,
    total_count: 0,
    total_pages: 0,
  });

  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Get user data from cookies with multiple IE codes support
  const currentUser = getJsonCookie("exim_user") || {};

  useEffect(() => {
    if (!currentUser || !currentUser.ie_code_assignments?.length) {
      navigate("/login", { replace: true });
      return;
    }

    // Extract IE codes from assignments
    const ieCodes = currentUser.ie_code_assignments.map((a) => a.ie_code_no);
    setSelectedIeCodes(ieCodes);

    fetchUsers(ieCodes);
    fetchAvailableColumns();
    fetchAvailableImporters(ieCodes);
  }, [navigate]);

  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
  };

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  const getToken = () => {
    return (
      getCookie("access_token") ||
      getCookie("refresh_token") ||
      sessionStorage.getItem("jwt_token")
    );
  };

  const getAuthHeaders = () => {
    const token = getToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // API Client setup
  const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_STRING,
    withCredentials: true,
  });

  apiClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        removeCookie("exim_user");
        removeCookie("exim_token");
        removeCookie("jwt_token");
        navigate("/login", { replace: true });
      }
      return Promise.reject(error);
    }
  );

  // Updated fetchUsers to support multiple IE codes and importer filtering
  const fetchUsers = useCallback(
    async (
      ieCodes = selectedIeCodes,
      importer = selectedImporter,
      page = 1
    ) => {
      try {
        if (!ieCodes?.length) {
          showToast("No IE codes available", "error");
          return;
        }

        setLoading(true);

        const params = new URLSearchParams({
          ie_code_nos: ieCodes.join(","),
          page: page.toString(),
          limit: pagination.per_page.toString(),
        });

        if (importer && importer !== "All Importers") {
          params.append("importer", importer);
        }

        const response = await apiClient.get(
          `/user-management/users?${params}`
        );

        if (response.data.success) {
          setUsers(response.data.data);
          setPagination(
            response.data.pagination || {
              current_page: 1,
              per_page: 50,
              total_count: response.data.data.length,
              total_pages: 1,
            }
          );
        } else {
          showToast(response.data.message || "Error fetching users", "error");
        }
      } catch (error) {
        console.error("Fetch users error:", error);
        showToast(
          error.response?.data?.message || "Error fetching users",
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedIeCodes, selectedImporter, pagination.per_page]
  );

  // Fetch available importers for filtering
  const fetchAvailableImporters = useCallback(async (ieCodes) => {
    try {
      if (!ieCodes?.length) return;

      const response = await apiClient.get(
        `/user-management/importers?ie_code_nos=${ieCodes.join(",")}`
      );

      if (response.data.success) {
        const importerNames = response.data.data.map(
          (imp) => imp.importer_name
        );
        setAvailableImporters(["All Importers", ...importerNames]);
      }
    } catch (error) {
      console.error("Error fetching importers:", error);
    }
  }, []);

  const fetchAvailableColumns = useCallback(async () => {
    try {
      const response = await apiClient.get(
        `/user-management/available-columns`
      );
      if (response.data.success) {
        setAvailableColumns(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching available columns:", error);
    }
  }, []);

  // Updated invite user to support multiple IE code assignments
  const handleInviteUser = async (userData) => {
    try {
      // Build IE code assignments from current user's assignments
      const ie_code_assignments = currentUser.ie_code_assignments.map(
        (assignment) => ({
          ie_code_no: assignment.ie_code_no,
          importer_name: assignment.importer_name,
        })
      );

      const response = await apiClient.post(`/user-management/users/invite`, {
        ...userData,
        ie_code_assignments, // Use new structure instead of single ie_code_no
      });

      if (response.data.success) {
        showToast("User invited successfully");
        fetchUsers();
      } else {
        showToast(response.data.message || "Error inviting user", "error");
      }
    } catch (error) {
      console.error("Invite user error:", error);
      showToast(
        error.response?.data?.message || "Error inviting user",
        "error"
      );
    }
    setInviteDialogOpen(false);
  };

  const handlePromoteUser = async (userId) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await apiClient.patch(
        `/user-management/manage/${userId}/promote`
      );

      if (response.data.success) {
        showToast("User promoted to admin successfully");
        fetchUsers();
      } else {
        showToast(response.data.message || "Error promoting user", "error");
      }
    } catch (error) {
      console.error("Promote user error:", error);
      showToast(
        error.response?.data?.message || "Error promoting user",
        "error"
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
    handleMenuClose();
  };

  const handleDemoteUser = async (userId) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await apiClient.patch(
        `/user-management/manage/${userId}/demote`
      );

      if (response.data.success) {
        showToast("User demoted from admin successfully");
        fetchUsers();
      } else {
        showToast(response.data.message || "Error demoting user", "error");
      }
    } catch (error) {
      console.error("Demote user error:", error);
      showToast(
        error.response?.data?.message || "Error demoting user",
        "error"
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
    handleMenuClose();
  };

  const handleStatusUpdate = async (userId, newStatus, reason = "") => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await apiClient.patch(
        `/user-management/users/${userId}/status`,
        { status: newStatus, reason }
      );

      if (response.data.success) {
        showToast(`User status updated successfully`);
        fetchUsers();
      } else {
        showToast(
          response.data.message || "Error updating user status",
          "error"
        );
      }
    } catch (error) {
      console.error("Update user status error:", error);
      showToast(
        error.response?.data?.message || "Error updating user status",
        "error"
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
      setStatusUpdateDialog({ open: false, user: null });
    }
    handleMenuClose();
  };

  const handleUpdateColumnPermissions = async (userId, allowedColumns) => {
    try {
      const response = await apiClient.put(
        `/user-management/users/${userId}/column-permissions`,
        { allowedColumns }
      );

      if (response.data.success) {
        showToast("Column permissions updated successfully");
        fetchUsers();
      } else {
        showToast(
          response.data.message || "Error updating column permissions",
          "error"
        );
      }
    } catch (error) {
      console.error("Update column permissions error:", error);
      showToast(
        error.response?.data?.message || "Error updating column permissions",
        "error"
      );
    }
    setColumnPermissionDialog({ open: false, user: null, localColumns: [] });
  };

  // Commented out bulk column permissions function
  /*
  const handleBulkColumnPermissions = async (userIds, allowedColumns) => {
    try {
      const response = await apiClient.post(
        '/user-management/users/bulk-column-permissions',
        { userIds, allowedColumns }
      );
      
      if (response.data.success) {
        showToast(`Column permissions updated for ${response.data.data.modifiedCount} users`);
        fetchUsers();
      } else {
        showToast(response.data.message || 'Error updating bulk column permissions', 'error');
      }
    } catch (error) {
      console.error('Bulk update column permissions error:', error);
      showToast(error.response?.data?.message || 'Error updating bulk column permissions', 'error');
    }
    setBulkColumnDialog(false);
    setSelectedUsers([]);
  };
  */

  const handleMenuClick = (event, userId) => {
    setAnchorEl(event.currentTarget);
    setMenuUserId(userId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuUserId(null);
  };

  const handleColumnPermissionClick = (user) => {
    setColumnPermissionDialog({ open: true, user: user });
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user) => user._id));
    }
  };

  // Handle importer filter change
  const handleImporterChange = (event, newValue) => {
    setSelectedImporter(newValue || "All Importers");
    fetchUsers(selectedIeCodes, newValue || "All Importers", 1);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (event, newPage) => {
    fetchUsers(selectedIeCodes, selectedImporter, newPage + 1);
  };

  // Check if current user can manage other users
  const canManageUsers =
    currentUser.role === "admin" || currentUser.role === "superadmin";

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "warning";
      case "superadmin":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusColor = (status, isActive) => {
    if (!isActive) return "error";
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "inactive":
        return "error";
      case "suspended":
        return "error";
      default:
        return "default";
    }
  };

  const formatRole = (role) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "superadmin":
        return "Super Admin";
      case "user":
        return "User";
      default:
        return role || "User";
    }
  };

  // Enhanced Column Permission Dialog Component
  const ColumnPermissionDialog = ({
    open,
    user,
    onClose,
    onSubmit,
    availableColumns,
    apiClient,
  }) => {
    const [loading, setLoading] = useState(true);
    const [selectedColumns, setSelectedColumns] = useState([]);

    useEffect(() => {
      if (open && user) {
        setLoading(true);
        apiClient
          .get(`/user-management/users/${user._id}/column-permissions`)
          .then((response) => {
            if (response.data.success) {
              setSelectedColumns(response.data.data.user.allowedColumns || []);
            }
          })
          .catch((error) => {
            console.error("Error fetching permissions:", error);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }, [open, user, apiClient]);

    const handleToggleColumn = (columnId) => {
      setSelectedColumns((prev) =>
        prev.includes(columnId)
          ? prev.filter((id) => id !== columnId)
          : [...prev, columnId]
      );
    };

    const handleSave = () => {
      if (user) {
        onSubmit(user._id, selectedColumns);
      }
    };

    if (!open) {
      return null;
    }

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Permissions for {user?.name}</Typography>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={5}>
              <CircularProgress />
            </Box>
          ) : (
            <FormGroup>
              {availableColumns.map((column) => (
                <FormControlLabel
                  key={column.id}
                  control={
                    <Checkbox
                      checked={selectedColumns.includes(column.id)}
                      onChange={() => handleToggleColumn(column.id)}
                    />
                  }
                  label={column.name}
                />
              ))}
            </FormGroup>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
          gap={2}
        >
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" color="text.secondary">
            Loading users...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Enhanced Header */}
      <Box sx={{ mb: 2 }}>
        <BackButton />
      </Box>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              fontWeight={700}
              gutterBottom
            >
              User Management
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            {/* Commented out bulk permissions button */}
            {/*
            {canManageUsers && selectedUsers.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<PermissionIcon />}
                onClick={() => setBulkColumnDialog(true)}
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Bulk Permissions ({selectedUsers.length})
              </Button>
            )}
            */}
          </Stack>
        </Stack>
      </Paper>

      {/* Filtering Controls */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={3} alignItems="center">
          <Typography variant="h6">Filters:</Typography>

          <Autocomplete
            value={selectedImporter}
            onChange={handleImporterChange}
            options={availableImporters}
            sx={{ minWidth: 250 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Importer"
                variant="outlined"
                size="small"
              />
            )}
          />

          <Chip
            label={`${pagination.total_count} users found`}
            color="primary"
            variant="outlined"
          />
        </Stack>
      </Paper>

      {/* Enhanced Table */}
      <Paper elevation={1} sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 3 }}>
          {/* Bulk Actions */}
          {canManageUsers && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 2,
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "grey.200",
              }}
            >
              {/* <Stack direction="row" alignItems="center" spacing={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedUsers.length === users.length && users.length > 0}
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                      onChange={handleSelectAll}
                    />
                  }
                  label="Select All Users"
                />
                {selectedUsers.length > 0 && (
                  <Chip
                    label={`${selectedUsers.length} user(s) selected`}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack> */}
            </Paper>
          )}

          <TableContainer
            sx={{
              borderRadius: 2,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  {canManageUsers && <TableCell padding="checkbox" />}
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    IE Codes & Importers
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Last Login</TableCell>
                  {canManageUsers && (
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user._id}
                    hover
                    sx={{
                      "&:hover": {
                        bgcolor: "action.hover",
                        transform: "translateY(-1px)",
                        transition: "all 0.2s ease",
                      },
                    }}
                  >
                    {canManageUsers && (
                      <TableCell padding="checkbox">
                        {/* <Checkbox
                          checked={selectedUsers.includes(user._id)}
                          onChange={() => handleUserSelection(user._id)}
                        /> */}
                      </TableCell>
                    )}
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          sx={{
                            bgcolor:
                              user.role === "admin"
                                ? "warning.main"
                                : "primary.main",
                            width: 40,
                            height: 40,
                          }}
                        >
                          {user.role === "admin" ? <AdminIcon /> : <UserIcon />}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {user.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <EmailIcon
                              fontSize="small"
                              sx={{ mr: 0.5, verticalAlign: "middle" }}
                            />
                            {user.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatRole(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                          label={
                            user.isActive ? user.status || "Active" : "Inactive"
                          }
                          color={getStatusColor(user.status, user.isActive)}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                        <Switch
                          checked={user.isActive}
                          onChange={() =>
                            handleStatusUpdate(
                              user._id,
                              user.isActive ? "inactive" : "active"
                            )
                          }
                          disabled={actionLoading[user._id]}
                          size="small"
                          inputProps={{ "aria-label": "toggle user status" }}
                          sx={{ ml: 1 }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {user.ie_code_assignments?.length > 0 ? (
                          user.ie_code_assignments.map((assignment, index) => (
                            <Stack
                              key={index}
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{ mb: 0.5 }}
                            >
                              <BusinessIcon fontSize="small" color="action" />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {assignment.ie_code_no}:{" "}
                                {assignment.importer_name}
                              </Typography>
                            </Stack>
                          ))
                        ) : (
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <BusinessIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {user.ie_code_no || "No IE Code"}
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : "Never"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    {canManageUsers && (
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          <Tooltip title="Column Permissions">
                            <IconButton
                              size="small"
                              onClick={() => handleColumnPermissionClick(user)}
                              color="primary"
                              sx={{
                                borderRadius: 2,
                                "&:hover": {
                                  bgcolor: "primary.light",
                                  color: "white",
                                },
                              }}
                            >
                              <ColumnIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="More Actions">
                            <IconButton
                              size="small"
                              onClick={(event) =>
                                handleMenuClick(event, user._id)
                              }
                              sx={{
                                borderRadius: 2,
                                "&:hover": { bgcolor: "grey.200" },
                              }}
                              id={`menu-button-${user._id}`}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Button
                disabled={pagination.current_page <= 1}
                onClick={() =>
                  handlePageChange(null, pagination.current_page - 2)
                }
              >
                Previous
              </Button>
              <Typography sx={{ mx: 2, alignSelf: "center" }}>
                Page {pagination.current_page} of {pagination.total_pages}
              </Typography>
              <Button
                disabled={pagination.current_page >= pagination.total_pages}
                onClick={() => handlePageChange(null, pagination.current_page)}
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Enhanced Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            overflow: "visible",
            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.2))",
            mt: 1.5,
          },
        }}
      >
        {menuUserId &&
          (() => {
            const user = users.find((u) => u._id === menuUserId);
            if (!user) return null;

            return [
              user.role !== "admin" ? (
                <MenuItem
                  key="promote"
                  onClick={() => handlePromoteUser(menuUserId)}
                >
                  <ListItemIcon>
                    <PromoteIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Promote to Admin</ListItemText>
                </MenuItem>
              ) : (
                <MenuItem
                  key="demote"
                  onClick={() => handleDemoteUser(menuUserId)}
                >
                  <ListItemIcon>
                    <DemoteIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Demote from Admin</ListItemText>
                </MenuItem>
              ),
              <Divider key="d1" />,
              <MenuItem
                key="permissions"
                onClick={() => handleColumnPermissionClick(user)}
              >
                <ListItemIcon>
                  <ColumnIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Column Permissions</ListItemText>
              </MenuItem>,
            ];
          })()}
      </Menu>

      {/* All Dialogs */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onSubmit={handleInviteUser}
        ieCodeAssignments={currentUser.ie_code_assignments || []}
      />

      {selectedUser && (
        <EditUserDialog
          open={editDialogOpen}
          user={selectedUser}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedUser(null);
          }}
          onSubmit={(updates) => {
            setEditDialogOpen(false);
            setSelectedUser(null);
          }}
          currentUserRole={currentUser.role}
        />
      )}

      <ColumnPermissionDialog
        open={columnPermissionDialog.open}
        user={columnPermissionDialog.user}
        onClose={() => setColumnPermissionDialog({ open: false, user: null })}
        onSubmit={handleUpdateColumnPermissions}
        availableColumns={availableColumns}
        apiClient={apiClient}
      />

      {/* Enhanced Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{
            width: "100%",
            borderRadius: 2,
            fontWeight: 500,
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserManagement;
