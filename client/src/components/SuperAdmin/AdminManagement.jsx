import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Avatar,
  InputAdornment,
} from "@mui/material";
import {
  AdminPanelSettings,
  PersonAdd,
  Edit,
  Delete,
  Search,
  Refresh,
  People,
  SupervisorAccount,
  Business,
  Block,
  CheckCircle,
  ToggleOn,
  ToggleOff,
  Assignment,
  GroupWork,
  Apps,
  Close,
  SelectAll,
  ExpandMore,
  AccountBox,
} from "@mui/icons-material";
import axios from "axios";
import { getCookie, getJsonCookie, removeCookie } from "../../utils/cookies";
import { Autocomplete } from "@mui/material";
import IeCodeDialog from "./IeCodeDialog";

// Available modules for assignment (unchanged)
const AVAILABLE_MODULES = [
  {
    id: "/importdsr",
    name: "Import DSR",
    description:
      "View and manage import daily status reports and track shipments",
    category: "core",
  },
  {
    id: "/netpage",
    name: "CostIQ",
    description:
      "Calculate shipping costs per kilogram for better pricing decisions",
    category: "core",
  },
  {
    id: "http://snapcheckv1.s3-website.ap-south-1.amazonaws.com/",
    name: "SnapCheck",
    description:
      "Beta Version - Quality control and inspection management system",
    category: "beta",
    isExternal: true,
  },
  {
    id: "http://qrlocker.s3-website.ap-south-1.amazonaws.com/",
    name: "QR Locker",
    description:
      "Beta Version - Digital locker management with QR code integration",
    category: "beta",
    isExternal: true,
  },
  {
    id: "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com/",
    name: "Task Flow AI",
    description: "Task management system with organizational hierarchy",
    category: "core",
    isExternal: true,
  },
  {
    id: "http://elock-tracking.s3-website.ap-south-1.amazonaws.com/",
    // id:"http://localhost:3005/",
    name: "E-Lock",
    description:
      "Secure electronic document locking and verification (Tracking)",
    category: "core",
    isExternal: true,
  },
  {
    id: "/trademasterguide",
    name: "Trade Master Guide",
    description:
      "View and manage import daily status reports and track shipments",
    category: "core",
  },
];

const AdminManagement = ({ onRefresh }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog states
  const [adminDialog, setAdminDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [moduleDialog, setModuleDialog] = useState(false);
  const [bulkModuleDialog, setBulkModuleDialog] = useState(false);
  const [ieCodeDialog, setIeCodeDialog] = useState(false); // New IE Code dialog
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [adminAction, setAdminAction] = useState(""); // 'promote', 'demote'
  const [statusAction, setStatusAction] = useState(""); // 'activate', 'deactivate'
  const [tabVisibilityDialog, setTabVisibilityDialog] = useState(false);

  // Module assignment states
  const [selectedUserModules, setSelectedUserModules] = useState([]);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState([]);
  const [bulkSelectedModules, setBulkSelectedModules] = useState([]);

  // Search states
  const [userSearch, setUserSearch] = useState("");
  const [ieCodeSearch, setIeCodeSearch] = useState(""); // New IE Code search
  const [tabSettings, setTabSettings] = useState({
    jobsTabVisible: false,
    gandhidhamTabVisible: false,
  });

  // IE Code selection states
  const [availableIeCodes, setAvailableIeCodes] = useState([]);
  const [selectedIeCodes, setSelectedIeCodes] = useState([]); // Now an array
  const [ieCodeReason, setIeCodeReason] = useState("");
  const [isRemovingIeCode, setIsRemovingIeCode] = useState(false);
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const superadminToken = getCookie("superadmin_token");
      const superadminUser = getJsonCookie("superadmin_user");

      if (!superadminToken || !superadminUser) {
        setError("SuperAdmin authentication required. Please login again.");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      const [usersRes, ieCodesRes] = await Promise.all([
        axios.get(
          `${process.env.REACT_APP_API_STRING}/superadmin/all-users`,
          config
        ),
        axios.get(
          `${process.env.REACT_APP_API_STRING}/superadmin/available-iec-codes`,
          config
        ),
      ]);

      if (usersRes.data.success) {
        const usersData = usersRes.data.data.users || [];
        setUsers(usersData);

        // Pre-populate user search options
        const userOptions = usersData.map((user) => ({
          label: `${user.name} - ${user.email}${
            user.ie_code_no ? ` (${user.ie_code_no})` : ""
          }`,
          value: user._id,
          user: user,
        }));
        setUserSearch((prev) => ({ ...prev, options: userOptions }));
      }

      if (ieCodesRes.data.success) {
        const ieCodesData = ieCodesRes.data.data || [];
        setAvailableIeCodes(ieCodesData);

        // Pre-populate IE code search options
        const ieCodeOptions = ieCodesData.map((ieCode) => ({
          label: `${ieCode.iecNo} - ${ieCode.importerName}`,
          value: ieCode.iecNo,
          ieCode: ieCode,
        }));
        setIeCodeSearch((prev) => ({ ...prev, options: ieCodeOptions }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("SuperAdmin authentication expired. Please login again.");
        removeCookie("superadmin_token");
        removeCookie("superadmin_user");
      } else {
        setError("Failed to fetch data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Search IE codes with autocomplete
  const searchIeCodes = async (searchTerm) => {
    try {
      const superadminToken = getCookie("superadmin_token");
      if (!superadminToken) return;

      const config = {
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      const response = await axios.get(
        `${
          process.env.REACT_APP_API_STRING
        }/superadmin/available-iec-codes?search=${encodeURIComponent(
          searchTerm
        )}`,
        config
      );

      if (response.data.success) {
        const ieCodesData = response.data.data || [];
        const ieCodeOptions = ieCodesData.map((ieCode) => ({
          label: `${ieCode.iecNo} - ${ieCode.importerName}`,
          value: ieCode.iecNo,
          ieCode: ieCode,
        }));
        setIeCodeSearch((prev) => ({ ...prev, options: ieCodeOptions }));
      }
    } catch (error) {
      console.error("Error searching IE codes:", error);
    }
  };

  // Filter users based on search

  // IE Code Assignment/Removal Handler
  const handleIeCodeOperation = async () => {
    if (!selectedEntity || (!isRemovingIeCode && selectedIeCodes.length === 0))
      return;

    try {
      setLoading(true);
      setError(null);

      const superadminToken = getCookie("superadmin_token");
      if (!superadminToken) {
        setError("SuperAdmin authentication required. Please login again.");
        return;
      }
      console.log(superadminToken);
      const config = {
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          "Content-Type": "application/json",
        },
        //withCredentials: true,
      };

      let response;
      if (isRemovingIeCode) {
        const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${selectedEntity._id}/ie-codes/remove-ie-codes`;

        response = await axios.delete(endpoint, {
          ...config,
          data: {
            ieCodes: selectedIeCodes,
            reason: ieCodeReason,
          },
        });
      } else {
        const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${selectedEntity._id}/ie-codes`;
        const data = {
          ieCodes: selectedIeCodes,
          reason: ieCodeReason,
        };
        response = await axios.post(endpoint, data, config);
      }

      if (response.data.success) {
        const action = isRemovingIeCode ? "removed" : "assigned";
        const ieCodesStr = selectedIeCodes.join(", ");
        setSuccess(
          `Successfully ${action} IE Code(s) ${ieCodesStr} ${
            isRemovingIeCode ? "from" : "to"
          } ${selectedEntity.name}`
        );
        fetchData();
        setIeCodeDialog(false);
        setSelectedIeCodes([]);
        setIeCodeReason("");
        setIsRemovingIeCode(false);
      }
    } catch (error) {
      console.error("Error assigning/removing IE code:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("SuperAdmin authentication expired. Please login again.");
      } else {
        setError(
          error.response?.data?.message || "Failed to assign/remove IE code"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // All existing handler functions remain the same...
  const handlePromoteToAdmin = async (entity, type) => {
    try {
      setLoading(true);
      setError(null);

      const superadminToken = getCookie("superadmin_token");
      if (!superadminToken) {
        setError("SuperAdmin authentication required. Please login again.");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      // For users, we promote them to admin with optional IE code assignments
      const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${entity._id}/promote-admin`;

      // Check if user already has any IE codes
      const hasExistingIeCodes =
        entity.ie_code_assignments?.length > 0 || entity.ie_code_no;

      let data;
      if (hasExistingIeCodes) {
        // User has IE codes - new assignments are optional
        data = selectedIeCodes.length > 0 ? { ieCodes: selectedIeCodes } : {};
      } else {
        // User doesn't have any IE codes - at least one is required
        if (selectedIeCodes.length === 0) {
          setError(
            "This user does not have any IE codes. Please select at least one IE code to assign."
          );
          setLoading(false);
          return;
        }
        data = { ieCodes: selectedIeCodes };
      }

      const response = await axios.put(endpoint, data, config);

      if (response.data.success) {
        // Enhanced success message based on IE code assignments
        const hasExistingIeCodes =
          entity.ie_code_assignments?.length > 0 || entity.ie_code_no;
        let successMessage;
        if (hasExistingIeCodes && selectedIeCodes.length === 0) {
          successMessage = `Successfully promoted ${entity.name} to admin using existing IE codes`;
        } else if (selectedIeCodes.length > 0) {
          const ieCodesStr = selectedIeCodes.join(", ");
          successMessage = `Successfully promoted ${entity.name} to admin with IE codes: ${ieCodesStr}`;
        } else {
          successMessage = `Successfully promoted ${entity.name} to admin`;
        }

        setSuccess(successMessage);
        fetchData();
        setAdminDialog(false);
        setSelectedIeCodes([]);
      }
    } catch (error) {
      console.error("Error promoting to admin:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("SuperAdmin authentication expired. Please login again.");
        removeCookie("superadmin_token");
        removeCookie("superadmin_user");
      } else {
        setError(error.response?.data?.message || "Failed to promote to admin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAdmin = async (entity, type) => {
    try {
      setLoading(true);
      setError(null);

      const superadminToken = getCookie("superadmin_token");
      if (!superadminToken) {
        setError("SuperAdmin authentication required. Please login again.");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${entity._id}/demote-admin`;
      const data = {};

      const response = await axios.put(endpoint, data, config);

      if (response.data.success) {
        setSuccess(`Successfully revoked admin access for ${entity.name}`);
        fetchData();
        setAdminDialog(false);
      }
    } catch (error) {
      console.error("Error revoking admin:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("SuperAdmin authentication expired. Please login again.");
        removeCookie("superadmin_token");
        removeCookie("superadmin_user");
      } else {
        setError(
          error.response?.data?.message || "Failed to revoke admin access"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeUserStatus = async (user, newStatus) => {
    try {
      setLoading(true);
      setError(null);

      const superadminToken = getCookie("superadmin_token");
      if (!superadminToken) {
        setError("SuperAdmin authentication required. Please login again.");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${user._id}/status`;
      const data = { status: newStatus ? "active" : "inactive" };
      console.log("Changing user status with data:", data);
      const response = await axios.put(endpoint, data, config);

      if (response.data.success) {
        setSuccess(
          `Successfully ${newStatus ? "activated" : "deactivated"} user ${
            user.name
          }`
        );
        fetchData();
        setStatusDialog(false);
      }
    } catch (error) {
      console.error("Error changing user status:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("SuperAdmin authentication expired. Please login again.");
        removeCookie("superadmin_token");
        removeCookie("superadmin_user");
      } else {
        setError(
          error.response?.data?.message || "Failed to change user status"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // All other handler functions remain the same...
  const handleAssignModules = async (userId, moduleIds) => {
    try {
      setLoading(true);
      setError(null);

      const superadminToken = getCookie("superadmin_token");
      if (!superadminToken) {
        setError("SuperAdmin authentication required. Please login again.");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${userId}/modules`;
      const data = { moduleIds };

      const response = await axios.put(endpoint, data, config);

      if (response.data.success) {
        setSuccess(`Successfully updated module assignments`);
        fetchData();
        setModuleDialog(false);
        setSelectedUserModules([]);
      }
    } catch (error) {
      console.error("Error assigning modules:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("SuperAdmin authentication expired. Please login again.");
      } else {
        setError(error.response?.data?.message || "Failed to assign modules");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssignModules = async () => {
    try {
      setLoading(true);
      setError(null);

      const superadminToken = getCookie("superadmin_token");
      if (!superadminToken) {
        setError("SuperAdmin authentication required. Please login again.");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/bulk-assign-modules`;
      const data = {
        userIds: bulkSelectedUsers,
        moduleIds: bulkSelectedModules,
      };

      const response = await axios.post(endpoint, data, config);

      if (response.data.success) {
        setSuccess(
          `Successfully assigned modules to ${bulkSelectedUsers.length} users`
        );
        fetchData();
        setBulkModuleDialog(false);
        setBulkSelectedUsers([]);
        setBulkSelectedModules([]);
      }
    } catch (error) {
      console.error("Error bulk assigning modules:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("SuperAdmin authentication expired. Please login again.");
      } else {
        setError(
          error.response?.data?.message || "Failed to bulk assign modules"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTabVisibility = async () => {
    if (!selectedEntity) return;

    try {
      setLoading(true);
      setError(null);

      const superadminToken = getCookie("superadmin_token");
      if (!superadminToken) {
        setError("SuperAdmin authentication required. Please login again.");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      const endpoint = `${process.env.REACT_APP_API_STRING}/user-management/superadmin/user/${selectedEntity._id}/tab-visibility`;
      const data = tabSettings;

      const response = await axios.patch(endpoint, data, config);

      if (response.data.success) {
        setSuccess(
          `Tab visibility for ${selectedEntity.name} updated successfully.`
        );
        fetchData();
        setTabVisibilityDialog(false);
      }
    } catch (error) {
      console.error("Error updating tab visibility:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("SuperAdmin authentication expired. Please login again.");
      } else {
        setError(
          error.response?.data?.message || "Failed to update tab visibility"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Dialog helper functions
  const openAdminDialog = (entity, action, type) => {
    setSelectedEntity({ ...entity, type });
    setAdminAction(action);
    setAdminDialog(true);
  };

  const openStatusDialog = (user, action) => {
    setSelectedEntity(user);
    setStatusAction(action);
    setStatusDialog(true);
  };

  const openModuleDialog = (user) => {
    setSelectedEntity(user);
    setSelectedUserModules(user.assignedModules || []);
    setModuleDialog(true);
  };

  const openBulkModuleDialog = () => {
    setBulkModuleDialog(true);
  };

  const openTabVisibilityDialog = (user) => {
    setSelectedEntity(user);
    setTabSettings({
      jobsTabVisible: user.jobsTabVisible || false,
      gandhidhamTabVisible: user.gandhidhamTabVisible || false,
    });
    setTabVisibilityDialog(true);
  };

  // IE Code dialog opener
  const openIeCodeDialog = (user, isRemoving = false) => {
    setSelectedEntity(user);
    setSelectedIeCodes([]);
    setIeCodeReason("");
    setIsRemovingIeCode(isRemoving);
    setIeCodeDialog(true);
  };

  // Utility functions
  const getModuleIcon = (moduleId) => {
    if (moduleId.includes("dsr")) return "📊";
    if (moduleId.includes("net") || moduleId.includes("cost")) return "⚖️";
    if (moduleId.includes("snap")) return "📷";
    if (moduleId.includes("qr")) return "🔒";
    if (moduleId.includes("task") || moduleId.includes("ai")) return "🤖";
    if (moduleId.includes("elock") || moduleId.includes("lock")) return "🔐";
    if (moduleId.includes("trade")) return "📚";
    return "📱";
  };

  const getModuleCategoryColor = (category) => {
    switch (category) {
      case "core":
        return "primary";
      case "beta":
        return "warning";
      case "external":
        return "secondary";
      default:
        return "default";
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.value) return users;

    const searchTerm = userSearch.value.toLowerCase();
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm) ||
        user.ie_code_no?.toLowerCase().includes(searchTerm) ||
        user.assignedImporterName?.toLowerCase().includes(searchTerm) ||
        user.ie_code_assignments?.some(
          (assignment) =>
            assignment.ie_code_no?.toLowerCase().includes(searchTerm) ||
            assignment.importer_name?.toLowerCase().includes(searchTerm)
        )
    );
  }, [users, userSearch.value]);
  // Filter IE codes based on search
  // Filter IE codes based on search
  const filteredIeCodes = useMemo(() => {
    if (!ieCodeSearch.value) return availableIeCodes;

    const searchTerm = ieCodeSearch.value.toLowerCase();
    return availableIeCodes.filter(
      (ieCode) =>
        ieCode.iecNo?.toLowerCase().includes(searchTerm) ||
        ieCode.importerName?.toLowerCase().includes(searchTerm)
    );
  }, [availableIeCodes, ieCodeSearch.value]);

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 600, color: "#1a1a1a", mb: 1 }}
          >
            User Admin Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage user admin privileges, modules, and settings
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={loading}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
            }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<GroupWork />}
            onClick={openBulkModuleDialog}
            disabled={loading}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
            }}
          >
            Bulk Module Assignment
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: "1px solid #e5e7eb" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1f2937" }}
                  >
                    {users.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#fef3c7", color: "#d97706" }}>
                  <People />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: "1px solid #e5e7eb" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1f2937" }}
                  >
                    {users.filter((u) => u.role === "admin").length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    User Admins
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#fce7f3", color: "#be185d" }}>
                  <AdminPanelSettings />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: "1px solid #e5e7eb" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1f2937" }}
                  >
                    {users.filter((u) => u.isActive).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#dcfce7", color: "#16a34a" }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: "1px solid #e5e7eb" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1f2937" }}
                  >
                    {availableIeCodes.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available IE Codes
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#dbeafe", color: "#1d4ed8" }}>
                  <Business />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Card */}
      <Card sx={{ borderRadius: 2, border: "1px solid #e5e7eb" }}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "center" }}>
            {/* User Search with Autocomplete */}
            <Autocomplete
              freeSolo
              options={userSearch.options}
              value={userSearch.value}
              onChange={(event, newValue) => {
                if (typeof newValue === "string") {
                  setUserSearch((prev) => ({ ...prev, value: newValue }));
                } else if (newValue && newValue.label) {
                  setUserSearch((prev) => ({ ...prev, value: newValue.label }));
                } else {
                  setUserSearch((prev) => ({ ...prev, value: "" }));
                }
              }}
              onInputChange={(event, newInputValue) => {
                setUserSearch((prev) => ({ ...prev, value: newInputValue }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search users by name, email, IE code, or importer name..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <Search sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                  sx={{ flexGrow: 1 }}
                />
              )}
              sx={{ flexGrow: 1 }}
            />

            {/* IE Code Search with Autocomplete */}
            <Autocomplete
              freeSolo
              options={ieCodeSearch.options}
              value={ieCodeSearch.value}
              onChange={(event, newValue) => {
                if (typeof newValue === "string") {
                  setIeCodeSearch((prev) => ({ ...prev, value: newValue }));
                  searchIeCodes(newValue);
                } else if (newValue && newValue.label) {
                  setIeCodeSearch((prev) => ({
                    ...prev,
                    value: newValue.label,
                  }));
                } else {
                  setIeCodeSearch((prev) => ({ ...prev, value: "" }));
                }
              }}
              onInputChange={(event, newInputValue) => {
                setIeCodeSearch((prev) => ({ ...prev, value: newInputValue }));
                if (newInputValue.length > 2) {
                  searchIeCodes(newInputValue);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search IE codes by code or importer name..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <Business sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                  sx={{ minWidth: 300 }}
                />
              )}
            />
          </Box>

          {/* Info Alert for IE Code Source */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              IE codes are fetched from active jobs in year 25-26. You can
              assign or reassign IE codes to users at any time.
              {availableIeCodes.length > 0 && (
                <span>
                  {" "}
                  Currently {availableIeCodes.length} IE codes are available for
                  assignment.
                </span>
              )}
            </Typography>
          </Alert>

          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f9fafb" }}>
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>IE Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Importer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Assigned Modules
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tab Visibility</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar
                          sx={{ mr: 2, bgcolor: "#e5e7eb", color: "#374151" }}
                        >
                          {user.name?.charAt(0) || "U"}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {user.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 250 }}>
                        {user.ie_code_assignments &&
                        user.ie_code_assignments.length > 0 ? (
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                            }}
                          >
                            {user.ie_code_assignments.map((assignment, idx) => (
                              <Chip
                                key={assignment.ie_code_no}
                                size="small"
                                label={
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{ fontWeight: 500 }}
                                    >
                                      {assignment.ie_code_no}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      (
                                      {new Date(
                                        assignment.assigned_at
                                      ).toLocaleDateString()}
                                      )
                                    </Typography>
                                  </Box>
                                }
                                color={idx === 0 ? "primary" : "default"}
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not Assigned
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 200 }}>
                        {user.ie_code_assignments &&
                        user.ie_code_assignments.length > 0 ? (
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                            }}
                          >
                            {user.ie_code_assignments.map((assignment) => (
                              <Typography
                                key={assignment.ie_code_no}
                                variant="caption"
                                color="text.secondary"
                              >
                                {assignment.importer_name || "No Name"}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not Assigned
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role === "admin" ? "Admin" : "User"}
                        color={user.role === "admin" ? "secondary" : "default"}
                        size="small"
                        icon={
                          user.role === "admin" ? (
                            <AdminPanelSettings />
                          ) : (
                            <People />
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? "Active" : "Inactive"}
                        color={user.isActive ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.5,
                          maxWidth: 300,
                        }}
                      >
                        {user.assignedModules &&
                        user.assignedModules.length > 0 ? (
                          user.assignedModules.slice(0, 3).map((moduleId) => {
                            const module = AVAILABLE_MODULES.find(
                              (m) => m.id === moduleId
                            );
                            return (
                              <Chip
                                key={moduleId}
                                label={
                                  module?.name ||
                                  moduleId.split("/").pop() ||
                                  moduleId
                                }
                                color={getModuleCategoryColor(module?.category)}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: "0.7rem" }}
                              />
                            );
                          })
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No modules assigned
                          </Typography>
                        )}
                        {user.assignedModules &&
                          user.assignedModules.length > 3 && (
                            <Chip
                              label={`+${user.assignedModules.length - 3} more`}
                              size="small"
                              variant="outlined"
                              color="default"
                              sx={{ fontSize: "0.7rem" }}
                            />
                          )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        <Chip
                          label={`Jobs: ${user.jobsTabVisible ? "On" : "Off"}`}
                          color={user.jobsTabVisible ? "success" : "default"}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`Gandhidham: ${
                            user.gandhidhamTabVisible ? "On" : "Off"
                          }`}
                          color={
                            user.gandhidhamTabVisible ? "success" : "default"
                          }
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {/* IE Code Assignment Buttons */}
                        <Tooltip title="Manage IE Codes">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => openIeCodeDialog(user, false)}
                          >
                            <AccountBox />
                          </IconButton>
                        </Tooltip>

                        {/* Status Toggle Button */}
                        <Tooltip
                          title={
                            user.isActive ? "Deactivate User" : "Activate User"
                          }
                        >
                          <IconButton
                            size="small"
                            color={user.isActive ? "warning" : "success"}
                            onClick={() =>
                              openStatusDialog(
                                user,
                                user.isActive ? "deactivate" : "activate"
                              )
                            }
                          >
                            {user.isActive ? <ToggleOff /> : <ToggleOn />}
                          </IconButton>
                        </Tooltip>

                        {/* Module Assignment Button */}
                        <Tooltip title="Assign Modules">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => openModuleDialog(user)}
                          >
                            <Assignment />
                          </IconButton>
                        </Tooltip>

                        {/* Admin Role Toggle Button */}
                        {user.role === "admin" ? (
                          <Tooltip title="Remove Admin Role">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                openAdminDialog(user, "demote", "user")
                              }
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Promote to Admin">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() =>
                                openAdminDialog(user, "promote", "user")
                              }
                            >
                              <AdminPanelSettings />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Manage Tab Visibility">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => openTabVisibilityDialog(user)}
                          >
                            <ToggleOn />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">
                        No users found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Card>

      <IeCodeDialog
        open={ieCodeDialog}
        onClose={() => {
          setIeCodeDialog(false);
          setSelectedIeCodes([]);
          setIeCodeReason("");
          setIsRemovingIeCode(false);
        }}
        selectedEntity={selectedEntity}
        isRemovingIeCode={isRemovingIeCode}
        setIsRemovingIeCode={setIsRemovingIeCode}
        selectedIeCodes={selectedIeCodes}
        setSelectedIeCodes={setSelectedIeCodes}
        ieCodeReason={ieCodeReason}
        setIeCodeReason={setIeCodeReason}
        loading={loading}
        handleIeCodeOperation={handleIeCodeOperation}
        filteredIeCodes={filteredIeCodes}
      />

      {/* Admin Action Dialog */}
      <Dialog
        open={adminDialog}
        onClose={() => {
          setAdminDialog(false);
          setSelectedIeCodes([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {adminAction === "promote"
            ? "Promote to Admin"
            : "Revoke Admin Access"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {adminAction === "promote"
              ? `Are you sure you want to promote "${selectedEntity?.name}" to admin?`
              : `Are you sure you want to revoke admin access for "${selectedEntity?.name}"?`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {adminAction === "promote"
              ? "This will give them administrative privileges over users and modules."
              : "This will remove their administrative privileges."}
          </Typography>

          {/* IE Code Selection for User Promotion */}
          {adminAction === "promote" && selectedEntity?.type === "user" && null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAdminDialog(false);
              setSelectedIeCodes([]);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={adminAction === "promote" ? "primary" : "error"}
            onClick={() => {
              if (adminAction === "promote") {
                handlePromoteToAdmin(selectedEntity, selectedEntity?.type);
              } else {
                handleRevokeAdmin(selectedEntity, selectedEntity?.type);
              }
            }}
            disabled={
              loading ||
              (adminAction === "promote" &&
                selectedEntity?.type === "user" &&
                !selectedEntity?.ie_code_assignments?.length &&
                selectedIeCodes.length === 0)
            }
            startIcon={
              adminAction === "promote" ? <SupervisorAccount /> : <Block />
            }
          >
            {adminAction === "promote"
              ? `Promote${
                  selectedIeCodes.length > 0
                    ? ` with ${selectedIeCodes.length} IE Code${
                        selectedIeCodes.length > 1 ? "s" : ""
                      }`
                    : ""
                }`
              : "Revoke"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Dialog */}
      <Dialog
        open={statusDialog}
        onClose={() => setStatusDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {statusAction === "activate" ? "Activate User" : "Deactivate User"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {statusAction === "activate"
              ? `Are you sure you want to activate "${selectedEntity?.name}"?`
              : `Are you sure you want to deactivate "${selectedEntity?.name}"?`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {statusAction === "activate"
              ? "This will allow the user to log in and access their assigned modules."
              : "This will prevent the user from logging in and accessing the system."}
          </Typography>

          {statusAction === "deactivate" && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Warning:</strong> Deactivating this user will
                immediately log them out and prevent them from accessing the
                system.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={statusAction === "activate" ? "success" : "warning"}
            onClick={() => {
              const newStatus = statusAction === "activate";
              handleChangeUserStatus(selectedEntity, newStatus);
            }}
            disabled={loading}
          >
            {statusAction === "activate" ? "Activate" : "Deactivate"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Module Assignment Dialog */}
      <Dialog
        open={moduleDialog}
        onClose={() => setModuleDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Assignment color="primary" />
            Assign Modules to {selectedEntity?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select modules to assign to this user. Users can only access modules
            that are assigned to them.
          </Typography>

          <Grid container spacing={2}>
            {AVAILABLE_MODULES.map((module) => {
              const isAssigned = selectedUserModules.includes(module.id);
              return (
                <Grid item xs={12} md={6} key={module.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: "pointer",
                      border: isAssigned ? "2px solid" : "1px solid",
                      borderColor: isAssigned ? "primary.main" : "divider",
                      bgcolor: isAssigned ? "primary.50" : "background.paper",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: "primary.50",
                      },
                    }}
                    onClick={() => {
                      if (isAssigned) {
                        setSelectedUserModules((prev) =>
                          prev.filter((id) => id !== module.id)
                        );
                      } else {
                        setSelectedUserModules((prev) => [...prev, module.id]);
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Box sx={{ fontSize: "1.2rem" }}>
                          {getModuleIcon(module.id)}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {module.name}
                        </Typography>
                        {isAssigned && (
                          <CheckCircle color="primary" fontSize="small" />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {module.description}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={module.category || "general"}
                          size="small"
                          color={getModuleCategoryColor(module.category)}
                          variant="outlined"
                        />
                        {module.isExternal && (
                          <Chip
                            label="External"
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ ml: 0.5 }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          <Typography
            variant="body2"
            color="primary"
            sx={{ mt: 2, fontWeight: 500 }}
          >
            Selected: {selectedUserModules.length} modules
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModuleDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() =>
              handleAssignModules(selectedEntity._id, selectedUserModules)
            }
            disabled={loading}
            startIcon={<Assignment />}
          >
            Assign Modules
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Module Assignment Dialog */}
      <Dialog
        open={bulkModuleDialog}
        onClose={() => setBulkModuleDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <GroupWork color="primary" />
            Bulk Module Assignment
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select users and modules to assign in bulk. This will add the
            selected modules to all selected users.
          </Typography>

          <Grid container spacing={3}>
            {/* User Selection */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="h6"
                sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
              >
                <People />
                Select Users ({bulkSelectedUsers.length} selected)
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Button
                  size="small"
                  startIcon={<SelectAll />}
                  onClick={() => {
                    if (bulkSelectedUsers.length === filteredUsers.length) {
                      setBulkSelectedUsers([]);
                    } else {
                      setBulkSelectedUsers(filteredUsers.map((u) => u._id));
                    }
                  }}
                >
                  {bulkSelectedUsers.length === filteredUsers.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </Box>

              <Box
                sx={{
                  maxHeight: 300,
                  overflow: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                }}
              >
                {filteredUsers.map((user) => (
                  <FormControlLabel
                    key={user._id}
                    control={
                      <Switch
                        checked={bulkSelectedUsers.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelectedUsers((prev) => [...prev, user._id]);
                          } else {
                            setBulkSelectedUsers((prev) =>
                              prev.filter((id) => id !== user._id)
                            );
                          }
                        }}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email} • {user.ie_code_no}
                        </Typography>
                      </Box>
                    }
                    sx={{ display: "block", mb: 1 }}
                  />
                ))}
              </Box>
            </Grid>

            {/* Module Selection */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="h6"
                sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
              >
                <Apps />
                Select Modules ({bulkSelectedModules.length} selected)
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Button
                  size="small"
                  startIcon={<SelectAll />}
                  onClick={() => {
                    if (
                      bulkSelectedModules.length === AVAILABLE_MODULES.length
                    ) {
                      setBulkSelectedModules([]);
                    } else {
                      setBulkSelectedModules(
                        AVAILABLE_MODULES.map((m) => m.id)
                      );
                    }
                  }}
                >
                  {bulkSelectedModules.length === AVAILABLE_MODULES.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </Box>

              <Box
                sx={{
                  maxHeight: 300,
                  overflow: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                }}
              >
                {AVAILABLE_MODULES.map((module) => (
                  <FormControlLabel
                    key={module.id}
                    control={
                      <Switch
                        checked={bulkSelectedModules.includes(module.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelectedModules((prev) => [
                              ...prev,
                              module.id,
                            ]);
                          } else {
                            setBulkSelectedModules((prev) =>
                              prev.filter((id) => id !== module.id)
                            );
                          }
                        }}
                        size="small"
                      />
                    }
                    label={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box sx={{ fontSize: "1rem" }}>
                          {getModuleIcon(module.id)}
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {module.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {module.category}{" "}
                            {module.isExternal && "• External"}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{ display: "block", mb: 1 }}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> This will add the selected modules to the
              selected users. Existing module assignments will be preserved.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkModuleDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkAssignModules}
            disabled={
              loading ||
              bulkSelectedUsers.length === 0 ||
              bulkSelectedModules.length === 0
            }
            startIcon={<GroupWork />}
          >
            Assign to {bulkSelectedUsers.length} Users
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tab Visibility Dialog */}
      <Dialog
        open={tabVisibilityDialog}
        onClose={() => setTabVisibilityDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Manage Tab Visibility for {selectedEntity?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Control which data tabs are visible to this specific user.
          </Typography>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={tabSettings.jobsTabVisible}
                  onChange={(e) =>
                    setTabSettings((prev) => ({
                      ...prev,
                      jobsTabVisible: e.target.checked,
                    }))
                  }
                />
              }
              label="Jobs Tab Visibility"
            />
          </Box>
          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={tabSettings.gandhidhamTabVisible}
                  onChange={(e) =>
                    setTabSettings((prev) => ({
                      ...prev,
                      gandhidhamTabVisible: e.target.checked,
                    }))
                  }
                />
              }
              label="Gandhidham Tab Visibility"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTabVisibilityDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateTabVisibility}
            disabled={loading}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminManagement;
