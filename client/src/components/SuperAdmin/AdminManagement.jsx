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
  Checkbox,
  Divider,
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
  AddCircle,
  RemoveCircle,
} from "@mui/icons-material";
import axios from "axios";
import { getCookie, getJsonCookie, removeCookie } from "../../utils/cookies";
import { Autocomplete } from "@mui/material";
import IeCodeDialog from "./IeCodeDialog";

// Available modules for assignment (unchanged)
const CUSTOM_HOUSE_OPTIONS = [
  {
    group: "Ahmedabad", branchCode: "AMD", items: [
      { value: "AHMEDABAD AIR CARGO", label: "Ahmedabad Air Cargo", code: "INAMD4" },
      { value: "ICD SABARMATI", label: "ICD Sabarmati", code: "INSBI6" },
      { value: "ICD SACHANA", label: "ICD SACHANA", code: "INJKA6" },
      { value: "ICD VIROCHAN NAGAR", label: "ICD Virochan Nagar", code: "INVCN6" },
      { value: "THAR DRY PORT", label: "THAR DRY PORT", code: "INSAU6" },
    ]
  },
  {
    group: "Baroda", branchCode: "BRD", items: [
      { value: "ANKLESHWAR ICD", label: "ANKLESHWAR ICD", code: "INAKV6" },
      { value: "ICD VARNAMA", label: "ICD VARNAMA", code: "INVRM6" },
    ]
  },
  {
    group: "Gandhidham", branchCode: "GIM", items: [
      { value: "MUNDRA SEA", label: "MUNDRA SEA", code: "INMUN1" },
      { value: "KANDLA SEA", label: "KANDLA SEA", code: "INIXY1" },
    ]
  },
  {
    group: "Cochin", branchCode: "COK", items: [
      { value: "COCHIN AIR CARGO", label: "COCHIN AIR CARGO", code: "INCOK4" },
      { value: "COCHIN SEA", label: "COCHIN SEA", code: "INCOK1" },
    ]
  },
  {
    group: "Hazira", branchCode: "HAZ", items: [
      { value: "HAZIRA", label: "HAZIRA", code: "INHZA1" },
    ]
  },
];

const BRANCH_OPTIONS = [
  { code: "AMD", label: "AMD - AHMEDABAD" },
  { code: "BRD", label: "BRD - BARODA" },
  { code: "GIM", label: "GIM - GANDHIDHAM" },
  { code: "COK", label: "COK - COCHIN" },
  { code: "HAZ", label: "HAZ - HAZIRA" },
];

const AVAILABLE_MODULES = [
  {
    id: "/importdsr",
    name: "Import DSR",
    description:
      "View and manage import daily status reports and track shipments",
    category: "core",
  },
  {
    id: "/ewaybill",
    name: "E-Way Bill",
    description:
      "View and manage E-Way Bills linked to import shipments",
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
    id: "/elock",
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
  {
    id: "/transport",
    name: "Transport",
    description: "View transport details, track shipments, and manage logistics",
    category: "core",
  },
  {
    id: "/export",
    name: "Export DSR",
    description: "View and manage export shipment jobs, track IEC-wise export data from the Export module",
    category: "core",
  },
  {
    id: "/open-points",
    name: "Open Points",
    description: "Manage project discussion points, task assignments, and review timelines",
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
  const [tabVisibilityDialog, setTabVisibilityDialog] = useState(false); // kept for legacy but unused

  // IE Code selection states — separate arrays for import and export modules
  const [selectedUserModules, setSelectedUserModules] = useState([]);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState([]);
  const [bulkSelectedModules, setBulkSelectedModules] = useState([]);

  // Search states
  const [userSearch, setUserSearch] = useState({ value: "", options: [] });
  const [ieCodeSearch, setIeCodeSearch] = useState({ value: "", options: [] }); // New IE Code search


  // IE Code selection states — separate per module
  const [availableIeCodes, setAvailableIeCodes] = useState([]);
  // selectedIeCodes is used for the currently active mode
  const [selectedIeCodes, setSelectedIeCodes] = useState([]); // import codes to assign
  const [selectedExporterIeCodes, setSelectedExporterIeCodes] = useState([]); // export codes to assign
  // Remove mode: track which module to remove from ('import' | 'export' | 'both')
  const [removeModule, setRemoveModule] = useState('both'); // 'import' | 'export' | 'both'
  const [ieCodeReason, setIeCodeReason] = useState("");
  const [ieCodeMode, setIeCodeMode] = useState("assign_import"); // 'assign_import', 'assign_export', 'remove'
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  // Export-specific IEC codes from the Export API directory
  const [availableExporterIeCodes, setAvailableExporterIeCodes] = useState([]);

  // Enterprise Actions Modal state
  const [actionsMenuUser, setActionsMenuUser] = useState(null);
  const [actionsTab, setActionsTab] = useState(0); // 0: IE Codes, 1: Status, 2: Modules, 3: Role, 4: Branch Access

  // Branch Assignments
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedBranchIcdCodes, setSelectedBranchIcdCodes] = useState([]);
  const [branchAssignmentLoading, setBranchAssignmentLoading] = useState(false);

  // Admin-User assignment states
  const [tempAdminId, setTempAdminId] = useState("");
  const [tempAssignedUserIds, setTempAssignedUserIds] = useState([]);
  const [adminUserSearchQuery, setAdminUserSearchQuery] = useState("");

  // Drag scroll for main user table
  const tableContainerRef = React.useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e) => {
    const isInteractive = e.target.closest('button, input, select, textarea, a, [role="button"], .MuiChip-root, .MuiAvatar-root');
    if (isInteractive || !tableContainerRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - tableContainerRef.current.offsetLeft);
    setScrollLeftState(tableContainerRef.current.scrollLeft);
    document.body.style.userSelect = 'none';
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
    document.body.style.userSelect = 'auto';
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    document.body.style.userSelect = 'auto';
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // multiplier for scroll speed
    tableContainerRef.current.scrollLeft = scrollLeftState - walk;
  };

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

      const [usersRes, ieCodesRes, exportersRes] = await Promise.all([
        axios.get(
          `${process.env.REACT_APP_API_STRING}/superadmin/all-users`,
          config
        ),
        axios.get(
          `${process.env.REACT_APP_API_STRING}/superadmin/available-iec-codes`,
          config
        ),
        // Fetch exporters from Export API directory (graceful fallback if unavailable)
        axios
          .get(
            `${process.env.REACT_APP_API_STRING}/superadmin/available-exporters`,
            config
          )
          .catch(() => ({ data: { success: false, data: [] } })),
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

      // Combine import IEC codes + export IEC codes from Export API Directory
      let combined = [];

      if (ieCodesRes.data.success) {
        const importIeCodes = (ieCodesRes.data.data || []).map((c) => ({
          ...c,
          _source: "import",
        }));
        combined = [...importIeCodes];
        setAvailableIeCodes(importIeCodes);
      }

      if (exportersRes.data.success) {
        const exporterIeCodes = (exportersRes.data.data || [])
          .filter((e) => e.iecNo) // only entries with an IEC code
          .map((e) => ({
            iecNo: e.iecNo,
            importerName: e.exporterName || e.alias || e.iecNo,
            status: e.approvalStatus || "Approved",
            _source: "export",
          }));
        setAvailableExporterIeCodes(exporterIeCodes);
        // Merge: avoid duplicates by iecNo
        const existingNos = new Set(combined.map((c) => c.iecNo));
        const uniqueExporters = exporterIeCodes.filter(
          (e) => !existingNos.has(e.iecNo)
        );
        combined = [...combined, ...uniqueExporters];
      }

      // Populate merged IE code search options
      const ieCodeOptions = combined.map((ieCode) => ({
        label: `${ieCode.iecNo} - ${ieCode.importerName || ieCode.exporterName || ""}${
          ieCode._source === "export" ? " [Export]" : ""
        }`,
        value: ieCode.iecNo,
        ieCode: ieCode,
      }));
      setIeCodeSearch((prev) => ({ ...prev, options: ieCodeOptions }));
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

  const handleIeCodeOperation = async () => {
    const codesInUse = ieCodeMode === "assign_import" ? selectedIeCodes
      : ieCodeMode === "assign_export" ? selectedExporterIeCodes
      : [...selectedIeCodes, ...selectedExporterIeCodes]; // remove mode — union

    if (!selectedEntity || (ieCodeMode !== "remove" && codesInUse.length === 0))
      return;
    // In remove mode we need at least one code in either list
    if (ieCodeMode === "remove" && selectedIeCodes.length === 0 && selectedExporterIeCodes.length === 0)
      return;

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
      };

      if (ieCodeMode === "remove") {
        // Handle import removal
        if (selectedIeCodes.length > 0) {
          await axios.delete(
            `${process.env.REACT_APP_API_STRING}/superadmin/users/${selectedEntity._id}/ie-codes/remove-ie-codes`,
            {
              ...config,
              data: { ieCodes: selectedIeCodes, module: "import", reason: ieCodeReason },
            }
          );
        }
        // Handle export removal
        if (selectedExporterIeCodes.length > 0) {
          await axios.delete(
            `${process.env.REACT_APP_API_STRING}/superadmin/users/${selectedEntity._id}/ie-codes/remove-ie-codes`,
            {
              ...config,
              data: { ieCodes: selectedExporterIeCodes, module: "export", reason: ieCodeReason },
            }
          );
        }
        const totalRemoved = selectedIeCodes.length + selectedExporterIeCodes.length;
        setSuccess(`Successfully removed ${totalRemoved} IE Code(s) from ${selectedEntity.name}`);
      } else {
        const isExport = ieCodeMode === "assign_export";
        const codes = isExport ? selectedExporterIeCodes : selectedIeCodes;
        const endpoint = `${process.env.REACT_APP_API_STRING}/superadmin/users/${selectedEntity._id}/ie-codes`;
        const response = await axios.post(endpoint, {
          ieCodes: codes,
          module: isExport ? "export" : "import",
          reason: ieCodeReason,
        }, config);

        if (response.data.success) {
          const ieCodesStr = codes.join(", ");
          setSuccess(`Successfully assigned IE Code(s) ${ieCodesStr} to ${selectedEntity.name}`);
        }
      }

      fetchData();
      setSelectedIeCodes([]);
      setSelectedExporterIeCodes([]);
      setIeCodeReason("");
      setIeCodeMode("assign_import");
    } catch (error) {
      console.error("Error assigning/removing IE code:", error);
      setError(error.response?.data?.message || "Failed to assign/remove IE code");
    } finally {
      setLoading(false);
    }
  };

  const handleBranchAssignment = async (isRemoval = false) => {
    if (!selectedEntity) return;

    try {
      setBranchAssignmentLoading(true);
      setError(null);

      const superadminToken = getCookie("superadmin_token");
      const config = {
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          "Content-Type": "application/json",
        },
      };

      let response;
      if (isRemoval) {
        response = await axios.delete(
          `${process.env.REACT_APP_API_STRING}/superadmin/users/${selectedEntity._id}/branch-access`,
          {
            ...config,
            data: { removeAll: true }
          }
        );
      } else {
        response = await axios.post(
          `${process.env.REACT_APP_API_STRING}/superadmin/users/${selectedEntity._id}/branch-access`,
          {
            selectedBranches,
            selectedIcdCodes: selectedBranchIcdCodes,
          },
          config
        );
      }

      if (response.data.success) {
        setSuccess(response.data.message);
        fetchData();
        setActionsMenuUser(null);
        setActionsTab(0);
      }
    } catch (error) {
      console.error("Branch assignment error:", error);
      setError(error.response?.data?.message || "Failed to update branch access");
    } finally {
      setBranchAssignmentLoading(false);
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


  const handleSaveAdminAssignment = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getCookie("superadmin_token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };
      const response = await axios.put(
        `${process.env.REACT_APP_API_STRING}/superadmin/users/${actionsMenuUser._id}/assign-admin`,
        { adminId: tempAdminId || null },
        config
      );
      if (response.data.success) {
        setSuccess("Admin assigned successfully.");
        fetchData();
      }
    } catch (error) {
      console.error("Error assigning admin:", error);
      setError(error.response?.data?.message || "Failed to assign admin.");
    } finally {
      setLoading(false);
      setActionsMenuUser(null);
    }
  };

  const handleSaveUserAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getCookie("superadmin_token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };
      const response = await axios.put(
        `${process.env.REACT_APP_API_STRING}/superadmin/admins/${actionsMenuUser._id}/assign-users`,
        { userIds: tempAssignedUserIds },
        config
      );
      if (response.data.success) {
        setSuccess("Users assigned to admin successfully.");
        fetchData();
      }
    } catch (error) {
      console.error("Error assigning users:", error);
      setError(error.response?.data?.message || "Failed to assign users.");
    } finally {
      setLoading(false);
      setActionsMenuUser(null);
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



  // IE Code dialog opener
  const openIeCodeDialog = (user, isRemoving = false) => {
    setSelectedEntity(user);
    setSelectedIeCodes([]);
    setSelectedExporterIeCodes([]);
    setIeCodeReason("");
    setIeCodeMode(isRemoving ? "remove" : "assign_import");
    setIeCodeDialog(true);
  };

  // Utility functions
  const getModuleIcon = (moduleId) => {
    if (moduleId.includes("ewaybill") || moduleId.includes("eway")) return "🧾";
    if (moduleId.includes("dsr")) return "📊";
    if (moduleId.includes("net") || moduleId.includes("cost")) return "⚖️";
    if (moduleId.includes("snap")) return "📷";
    if (moduleId.includes("qr")) return "🔒";
    if (moduleId.includes("task") || moduleId.includes("ai")) return "🤖";
    if (moduleId.includes("elock") || moduleId.includes("lock")) return "🔐";
    if (moduleId.includes("trade")) return "📚";
    if (moduleId.includes("transport")) return "🚚";
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
    return users.filter((user) => {
      const userLabel = `${user.name} - ${user.email}${
        user.ie_code_no ? ` (${user.ie_code_no})` : ""
      }`.toLowerCase();

      return (
        user.name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm) ||
        user.ie_code_no?.toLowerCase().includes(searchTerm) ||
        user.assignedImporterName?.toLowerCase().includes(searchTerm) ||
        userLabel.includes(searchTerm) ||
        user.ie_code_assignments?.some(
          (assignment) =>
            assignment.ie_code_no?.toLowerCase().includes(searchTerm) ||
            assignment.importer_name?.toLowerCase().includes(searchTerm)
        )
      );
    });
  }, [users, userSearch.value]);
  // Filter IE codes based on search
  const filteredImportIeCodes = useMemo(() => {
    if (!ieCodeSearch.value) return availableIeCodes;
    const searchTerm = ieCodeSearch.value.toLowerCase();
    return availableIeCodes.filter((ieCode) => {
      return (
        ieCode.iecNo?.toLowerCase().includes(searchTerm) ||
        (ieCode.importerName || "").toLowerCase().includes(searchTerm)
      );
    });
  }, [availableIeCodes, ieCodeSearch.value]);

  const filteredExportIeCodes = useMemo(() => {
    if (!ieCodeSearch.value) return availableExporterIeCodes;
    const searchTerm = ieCodeSearch.value.toLowerCase();
    return availableExporterIeCodes.filter((ieCode) => {
      return (
        ieCode.iecNo?.toLowerCase().includes(searchTerm) ||
        (ieCode.exporterName || "").toLowerCase().includes(searchTerm)
      );
    });
  }, [availableExporterIeCodes, ieCodeSearch.value]);

  const filteredIeCodes = useMemo(() => {
    if (ieCodeMode === "assign_export") return filteredExportIeCodes;
    return filteredImportIeCodes;
  }, [ieCodeMode, filteredImportIeCodes, filteredExportIeCodes]);

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
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
          <Box
            sx={{
              mb: 3,
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
              alignItems: { xs: "stretch", md: "center" },
            }}
          >
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
                  sx={{ minWidth: { xs: "100%", md: 300 } }}
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

          <TableContainer
            ref={tableContainerRef}
            component={Paper}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            sx={{
              borderRadius: 2,
              overflowX: "auto",
              cursor: isMouseDown ? "grabbing" : "grab",
              userSelect: isMouseDown ? "none" : "auto",
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {["User", "Email", "IE Code", "Importer", "Role", "Status", "Modules", "Actions"].map((col) => (
                    <TableCell
                      key={col}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        bgcolor: "#1e293b",
                        color: "#ffffff",
                        borderBottom: "none",
                        whiteSpace: "nowrap",
                        py: 1.5,
                        px: 2,
                      }}
                    >
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                    <TableCell sx={{ py: 1.2, px: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar
                          sx={{ width: 34, height: 34, bgcolor: "#e2e8f0", color: "#374151", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0 }}
                        >
                          {user.name?.charAt(0) || "U"}
                        </Avatar>
                        <Typography sx={{ fontWeight: 600, fontSize: "0.82rem", color: "#0f172a", whiteSpace: "nowrap" }}>
                          {user.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.2, px: 2, fontSize: "0.78rem", color: "#475569" }}>{user.email}</TableCell>
                    <TableCell sx={{ py: 1.2, px: 2 }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, maxWidth: 200 }}>
                        {user.ie_code_assignments && user.ie_code_assignments.length > 0 ? (
                          <>
                            {user.ie_code_assignments.slice(0, 2).map((assignment) => (
                              <Chip
                                key={assignment.ie_code_no}
                                size="small"
                                label={assignment.ie_code_no}
                                color="primary"
                                variant="outlined"
                                sx={{ fontSize: "0.7rem", fontWeight: 600, height: 22 }}
                              />
                            ))}
                            {user.ie_code_assignments.length > 2 && (
                              <Chip
                                size="small"
                                label={`+${user.ie_code_assignments.length - 2} more`}
                                variant="outlined"
                                sx={{ fontSize: "0.68rem", height: 22, color: "#64748b", borderColor: "#cbd5e1" }}
                              />
                            )}
                          </>
                        ) : (
                          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>—</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.2, px: 2 }}>
                      <Box sx={{ maxWidth: 180 }}>
                        {user.ie_code_assignments && user.ie_code_assignments.length > 0 ? (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
                            {user.ie_code_assignments.slice(0, 2).map((assignment) => (
                              <Typography
                                key={assignment.ie_code_no}
                                sx={{ fontSize: "0.72rem", color: "#475569", lineHeight: 1.3,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 175 }}
                              >
                                {assignment.importer_name || "—"}
                              </Typography>
                            ))}
                            {user.ie_code_assignments.length > 2 && (
                              <Typography sx={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                                +{user.ie_code_assignments.length - 2} more
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>—</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.2, px: 2 }}>
                      <Chip
                        label={user.role === "admin" ? "Admin" : "User"}
                        size="small"
                        sx={{
                          height: 22, fontSize: "0.7rem", fontWeight: 700,
                          bgcolor: user.role === "admin" ? "#ede9fe" : "#f1f5f9",
                          color: user.role === "admin" ? "#7c3aed" : "#64748b",
                          border: "none",
                          mb: user.role !== "admin" && user.adminId ? 0.5 : 0
                        }}
                      />
                      {user.role !== "admin" && user.adminId && (
                        <Typography sx={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 500, display: "block" }}>
                          Admin: {user.adminId.name || user.adminId.email || "Assigned"}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1.2, px: 2 }}>
                      <Chip
                        label={user.isActive ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          height: 22, fontSize: "0.7rem", fontWeight: 700,
                          bgcolor: user.isActive ? "#dcfce7" : "#fee2e2",
                          color: user.isActive ? "#16a34a" : "#dc2626",
                          border: "none",
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.2, px: 2 }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, maxWidth: 220 }}>
                        {user.assignedModules && user.assignedModules.length > 0 ? (
                          <>
                            {user.assignedModules.slice(0, 2).map((moduleId) => {
                              const module = AVAILABLE_MODULES.find((m) => m.id === moduleId);
                              return (
                                <Chip
                                  key={moduleId}
                                  label={module?.name || moduleId.split("/").pop() || moduleId}
                                  size="small"
                                  sx={{ fontSize: "0.68rem", height: 22, fontWeight: 500,
                                    bgcolor: module?.category === "beta" ? "#fef3c7" : "#dbeafe",
                                    color: module?.category === "beta" ? "#92400e" : "#1d4ed8",
                                    border: "none",
                                  }}
                                />
                              );
                            })}
                            {user.assignedModules.length > 2 && (
                              <Chip
                                label={`+${user.assignedModules.length - 2}`}
                                size="small"
                                sx={{ fontSize: "0.68rem", height: 22, color: "#64748b", bgcolor: "#f1f5f9", border: "none" }}
                              />
                            )}
                          </>
                        ) : (
                          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>—</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setActionsMenuUser(user);
                          setActionsTab(0);
                          setSelectedEntity(user);
                          setSelectedUserModules(user.assignedModules || []);
                          setSelectedIeCodes([]);
                          setSelectedExporterIeCodes([]);
                          setIeCodeReason("");
                          setIeCodeMode("assign_import");
                          setSelectedBranches(user.selected_branches || []);
                          setSelectedBranchIcdCodes(user.selected_icd_codes || []);
                          setTempAdminId(user.adminId?._id || user.adminId || "");
                          const assigned = users.filter(u => u.adminId?._id === user._id || u.adminId === user._id);
                          setTempAssignedUserIds(assigned.map(u => u._id));
                          setAdminUserSearchQuery("");
                        }}
                        sx={{
                          textTransform: "none",
                          borderRadius: 1.5,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          borderColor: "#cbd5e1",
                          color: "#374151",
                          px: 1.5,
                          "&:hover": { borderColor: "#1e293b", bgcolor: "#f8fafc" },
                        }}
                      >
                        Actions
                      </Button>
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

      {/* ── Enterprise Actions Modal ── */}
      <Dialog
        open={Boolean(actionsMenuUser)}
        onClose={() => { setActionsMenuUser(null); setActionsTab(0); }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
            minHeight: { xs: "auto", md: 680 },
            maxHeight: { xs: "95vh", md: "90vh" },
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Top Header Bar */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a5f 100%)",
            px: 3.5, py: 2.5,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: "rgba(255,255,255,0.15)", color: "#fff",
                width: 46, height: 46, fontSize: "1.2rem", fontWeight: 700,
                border: "2px solid rgba(255,255,255,0.25)",
                boxShadow: "0 0 0 4px rgba(255,255,255,0.06)",
              }}
            >
              {actionsMenuUser?.name?.charAt(0) || "U"}
            </Avatar>
            <Box>
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3 }}>
                {actionsMenuUser?.name}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.3 }}>
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                  {actionsMenuUser?.email}
                </Typography>
                <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.3)" }} />
                <Chip
                  label={actionsMenuUser?.role === "admin" ? "Admin" : "User"}
                  size="small"
                  sx={{
                    height: 18, fontSize: "0.65rem", fontWeight: 700,
                    bgcolor: actionsMenuUser?.role === "admin" ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.12)",
                    color: actionsMenuUser?.role === "admin" ? "#c4b5fd" : "rgba(255,255,255,0.7)",
                    border: "none",
                  }}
                />
                <Chip
                  label={actionsMenuUser?.isActive ? "Active" : "Inactive"}
                  size="small"
                  sx={{
                    height: 18, fontSize: "0.65rem", fontWeight: 700,
                    bgcolor: actionsMenuUser?.isActive ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)",
                    color: actionsMenuUser?.isActive ? "#6ee7b7" : "#fca5a5",
                    border: "none",
                  }}
                />
              </Box>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => { setActionsMenuUser(null); setActionsTab(0); }}
            sx={{
              color: "rgba(255,255,255,0.6)",
              "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
              borderRadius: 1.5,
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Body: Sidebar + Content */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            flex: 1,
            overflow: "hidden",
          }}
        >

          {/* Left Sidebar */}
          <Box
            sx={{
              width: { xs: "100%", md: 200 },
              flexShrink: 0,
              bgcolor: "#f8fafc",
              borderRight: { xs: "none", md: "1px solid #e2e8f0" },
              borderBottom: { xs: "1px solid #e2e8f0", md: "none" },
              py: { xs: 1, md: 2 },
              px: { xs: 1.5, md: 0 },
              display: "flex",
              flexDirection: { xs: "row", md: "column" },
              gap: 0.5,
              overflowX: { xs: "auto", md: "visible" },
              whiteSpace: "nowrap",
            }}
          >
            {[
              { idx: 0, icon: <AccountBox sx={{ fontSize: 18 }} />, label: "IE Codes", desc: "Assign / Remove" },
              { idx: 1, icon: <ToggleOn sx={{ fontSize: 18 }} />, label: "Status", desc: actionsMenuUser?.isActive ? "Active" : "Inactive" },
              { idx: 2, icon: <Assignment sx={{ fontSize: 18 }} />, label: "Modules", desc: `${(actionsMenuUser?.assignedModules || []).length} assigned` },
              { idx: 3, icon: <AdminPanelSettings sx={{ fontSize: 18 }} />, label: "Role", desc: actionsMenuUser?.role === "admin" ? "Admin" : "User" },
              { idx: 4, icon: <Business sx={{ fontSize: 18 }} />, label: "Branch Access", desc: `${(actionsMenuUser?.selected_branches || []).length} branches` },
            ].map(({ idx, icon, label, desc }) => (
              <Box
                key={idx}
                onClick={() => setActionsTab(idx)}
                sx={{
                  mx: { xs: 0.5, md: 1.5 },
                  px: 1.5,
                  py: { xs: 0.8, md: 1.2 },
                  borderRadius: 2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexShrink: 0,
                  bgcolor: actionsTab === idx ? "#fff" : "transparent",
                  boxShadow: actionsTab === idx ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  borderLeft: {
                    xs: "none",
                    md: actionsTab === idx ? "3px solid #1e293b" : "3px solid transparent",
                  },
                  borderBottom: {
                    xs: actionsTab === idx ? "3px solid #1e293b" : "3px solid transparent",
                    md: "none",
                  },
                  transition: "all 0.15s",
                  "&:hover": { bgcolor: actionsTab === idx ? "#fff" : "#f1f5f9" },
                }}
              >
                <Box sx={{ color: actionsTab === idx ? "#1e293b" : "#94a3b8", display: "flex", alignItems: "center", transition: "color 0.15s" }}>
                  {icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: actionsTab === idx ? 700 : 500, color: actionsTab === idx ? "#0f172a" : "#475569", lineHeight: 1.2 }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: "0.65rem", color: "#94a3b8", mt: 0.2 }}>
                    {desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Right Content Panel */}
          <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

            {/* Panel 0: IE Codes */}
            {actionsTab === 0 && (
              <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5, flex: 1 }}>
                <Box sx={{ borderBottom: "1px solid #f1f5f9", pb: 2 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>IE Code Management</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#64748b", mt: 0.4 }}>Assign or remove IE codes for this user. Multiple codes can be assigned simultaneously.</Typography>
                </Box>

                <Box sx={{ display: "flex", p: 0.5, bgcolor: "#f1f5f9", borderRadius: 2.5, border: "1px solid #e2e8f0", gap: 0.5 }}>
                  <Button
                    fullWidth size="small"
                    variant="text"
                    onClick={() => { setIeCodeMode("assign_import"); setSelectedIeCodes([]); setSelectedExporterIeCodes([]); }}
                    sx={{
                      textTransform: "none", fontSize: "0.75rem", borderRadius: 2, fontWeight: 700, py: 1,
                      bgcolor: ieCodeMode === "assign_import" ? "#fff" : "transparent",
                      color: ieCodeMode === "assign_import" ? "#1e293b !important" : "#64748b !important",
                      boxShadow: ieCodeMode === "assign_import" ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
                      "&:hover": { bgcolor: ieCodeMode === "assign_import" ? "#fff" : "rgba(100, 116, 139, 0.08)" }
                    }}
                  >
                    Import IEC
                  </Button>
                  <Button
                    fullWidth size="small"
                    variant="text"
                    onClick={() => { setIeCodeMode("assign_export"); setSelectedIeCodes([]); setSelectedExporterIeCodes([]); }}
                    sx={{
                      textTransform: "none", fontSize: "0.75rem", borderRadius: 2, fontWeight: 700, py: 1,
                      bgcolor: ieCodeMode === "assign_export" ? "#fff" : "transparent",
                      color: ieCodeMode === "assign_export" ? "#1e293b !important" : "#64748b !important",
                      boxShadow: ieCodeMode === "assign_export" ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
                      "&:hover": { bgcolor: ieCodeMode === "assign_export" ? "#fff" : "rgba(100, 116, 139, 0.08)" }
                    }}
                  >
                    Exporter IEC
                  </Button>
                  <Button
                    fullWidth size="small"
                    variant="text"
                    onClick={() => { setIeCodeMode("remove"); setSelectedIeCodes([]); setSelectedExporterIeCodes([]); }}
                    sx={{
                      textTransform: "none", fontSize: "0.75rem", borderRadius: 2, fontWeight: 700, py: 1,
                      bgcolor: ieCodeMode === "remove" ? "#fff" : "transparent",
                      color: ieCodeMode === "remove" ? "#ef4444 !important" : "#64748b !important",
                      boxShadow: ieCodeMode === "remove" ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
                      "&:hover": { bgcolor: ieCodeMode === "remove" ? "#fff" : "rgba(100, 116, 139, 0.08)" }
                    }}
                  >
                    Remove
                  </Button>
                </Box>

                {/* Currently Assigned — split by module */}
                {(actionsMenuUser?.ie_code_assignments?.length > 0 || actionsMenuUser?.exporter_ie_code_assignments?.length > 0) && (
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", mb: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}>Currently Assigned</Typography>
                    
                    {/* Importer codes */}
                    {actionsMenuUser?.ie_code_assignments?.length > 0 && (
                      <Box sx={{ mb: 1.2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.6 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#3b82f6", flexShrink: 0 }} />
                          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.04em" }}>Importer IEC</Typography>
                        </Box>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6, pl: 1.5 }}>
                          {actionsMenuUser.ie_code_assignments.map((a) => (
                            <Chip key={a.ie_code_no} label={`${a.ie_code_no}${a.importer_name ? ` · ${a.importer_name}` : ""}`} size="small" variant="outlined" color="primary" sx={{ fontSize: "0.72rem", fontWeight: 500 }} />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Exporter codes */}
                    {actionsMenuUser?.exporter_ie_code_assignments?.length > 0 && (
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.6 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981", flexShrink: 0 }} />
                          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.04em" }}>Exporter IEC</Typography>
                        </Box>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6, pl: 1.5 }}>
                          {actionsMenuUser.exporter_ie_code_assignments.map((a) => (
                            <Chip key={a.ie_code_no} label={`${a.ie_code_no}${a.importer_name ? ` · ${a.importer_name}` : ""}`} size="small" variant="outlined" sx={{ fontSize: "0.72rem", fontWeight: 500, borderColor: "#10b981", color: "#059669" }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Assign/Remove form */}
                {ieCodeMode !== "remove" ? (
                  // ASSIGN MODE
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", mb: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {`Select ${ieCodeMode === "assign_import" ? "Import" : "Exporter"} Codes to Assign`}
                    </Typography>
                    <Autocomplete
                      multiple disableCloseOnSelect
                      options={ieCodeMode === "assign_export" ? filteredExportIeCodes : filteredImportIeCodes}
                      getOptionLabel={(opt) => opt.ie_code_no || opt.iecNo || ""}
                      isOptionEqualToValue={(opt, val) => (opt.ie_code_no || opt.iecNo) === (val.ie_code_no || val.iecNo)}
                      value={(() => {
                        const opts = ieCodeMode === "assign_export" ? filteredExportIeCodes : filteredImportIeCodes;
                        const codes = ieCodeMode === "assign_export" ? selectedExporterIeCodes : selectedIeCodes;
                        return codes.map(code => opts.find(o => (o.ie_code_no || o.iecNo) === code) || { ie_code_no: code });
                      })()}
                      onChange={(_, newVal) => {
                        const vals = newVal.map(v => v.ie_code_no || v.iecNo);
                        if (ieCodeMode === "assign_export") setSelectedExporterIeCodes(vals);
                        else setSelectedIeCodes(vals);
                      }}
                      filterOptions={(options, { inputValue }) => {
                        if (!inputValue) return options;
                        const lc = inputValue.toLowerCase();
                        return options.filter(o =>
                          (o.ie_code_no || o.iecNo || "").toLowerCase().includes(lc) ||
                          (o.importer_name || o.importerName || o.exporterName || "").toLowerCase().includes(lc)
                        );
                      }}
                      ListboxProps={{ style: { maxHeight: 220 } }}
                      renderOption={(props, option) => (
                        <li {...props} key={option.ie_code_no || option.iecNo}>
                          <Box sx={{ py: 1, px: 0.5, width: "100%" }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.88rem" }}>
                                {option.ie_code_no || option.iecNo}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500, display: "block", mt: 0.2 }}>
                              {option.importer_name || option.importerName || option.exporterName || "No Name"}
                            </Typography>
                          </Box>
                        </li>
                      )}
                      renderTags={(tagValue, getTagProps) =>
                        tagValue.map((option, index) => (
                          <Chip size="small" variant="outlined"
                            color={ieCodeMode === "assign_export" ? "success" : "primary"}
                            label={option.ie_code_no || option.iecNo}
                            {...getTagProps({ index })} key={option.ie_code_no || option.iecNo}
                            sx={{ fontSize: "0.72rem" }} />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField {...params} placeholder={`Search ${ieCodeMode === "assign_export" ? "exporters" : "importers"}...`} size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                      )}
                      noOptionsText="No codes found"
                    />
                  </Box>
                ) : (
                  // REMOVE MODE — two separate autocompletes
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.8 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#3b82f6", flexShrink: 0 }} />
                        <Typography sx={{ fontSize: "0.73rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em" }}>Remove from Importer</Typography>
                      </Box>
                      <Autocomplete
                        multiple disableCloseOnSelect
                        options={actionsMenuUser?.ie_code_assignments || []}
                        getOptionLabel={(opt) => opt.ie_code_no || ""}
                        isOptionEqualToValue={(opt, val) => opt.ie_code_no === val.ie_code_no}
                        value={(actionsMenuUser?.ie_code_assignments || []).filter(a => selectedIeCodes.includes(a.ie_code_no))}
                        onChange={(_, newVal) => setSelectedIeCodes(newVal.map(v => v.ie_code_no))}
                        filterOptions={(options, { inputValue }) => {
                          if (!inputValue) return options;
                          const lc = inputValue.toLowerCase();
                          return options.filter(o =>
                            (o.ie_code_no || "").toLowerCase().includes(lc) ||
                            (o.importer_name || "").toLowerCase().includes(lc)
                          );
                        }}
                        ListboxProps={{ style: { maxHeight: 200 } }}
                        renderOption={(props, option) => (
                          <li {...props} key={option.ie_code_no}>
                            <Box sx={{ py: 0.8, px: 0.5, width: "100%" }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.86rem" }}>{option.ie_code_no}</Typography>
                              <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "#64748b" }}>{option.importer_name || ""}</Typography>
                            </Box>
                          </li>
                        )}
                        renderTags={(tagValue, getTagProps) =>
                          tagValue.map((option, index) => (
                            <Chip size="small" variant="outlined" color="primary" label={option.ie_code_no} {...getTagProps({ index })} key={option.ie_code_no} sx={{ fontSize: "0.72rem" }} />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Select importer codes to remove..." size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                        )}
                        noOptionsText={actionsMenuUser?.ie_code_assignments?.length === 0 ? "No importer codes assigned" : "No codes found"}
                      />
                    </Box>

                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.8 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981", flexShrink: 0 }} />
                        <Typography sx={{ fontSize: "0.73rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em" }}>Remove from Exporter</Typography>
                      </Box>
                      <Autocomplete
                        multiple disableCloseOnSelect
                        options={actionsMenuUser?.exporter_ie_code_assignments || []}
                        getOptionLabel={(opt) => opt.ie_code_no || ""}
                        isOptionEqualToValue={(opt, val) => opt.ie_code_no === val.ie_code_no}
                        value={(actionsMenuUser?.exporter_ie_code_assignments || []).filter(a => selectedExporterIeCodes.includes(a.ie_code_no))}
                        onChange={(_, newVal) => setSelectedExporterIeCodes(newVal.map(v => v.ie_code_no))}
                        filterOptions={(options, { inputValue }) => {
                          if (!inputValue) return options;
                          const lc = inputValue.toLowerCase();
                          return options.filter(o =>
                            (o.ie_code_no || "").toLowerCase().includes(lc) ||
                            (o.importer_name || "").toLowerCase().includes(lc)
                          );
                        }}
                        ListboxProps={{ style: { maxHeight: 200 } }}
                        renderOption={(props, option) => (
                          <li {...props} key={option.ie_code_no}>
                            <Box sx={{ py: 0.8, px: 0.5, width: "100%" }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.86rem" }}>{option.ie_code_no}</Typography>
                              <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "#64748b" }}>{option.importer_name || ""}</Typography>
                            </Box>
                          </li>
                        )}
                        renderTags={(tagValue, getTagProps) =>
                          tagValue.map((option, index) => (
                            <Chip size="small" variant="outlined" color="success" label={option.ie_code_no} {...getTagProps({ index })} key={option.ie_code_no} sx={{ fontSize: "0.72rem" }} />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Select exporter codes to remove..." size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                        )}
                        noOptionsText={actionsMenuUser?.exporter_ie_code_assignments?.length === 0 ? "No exporter codes assigned" : "No codes found"}
                      />
                    </Box>
                  </Box>
                )}
                
                <Box>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", mb: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Reason <Typography component="span" sx={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</Typography>
                  </Typography>
                  <TextField fullWidth size="small" placeholder="Enter reason for this operation..." value={ieCodeReason} onChange={(e) => setIeCodeReason(e.target.value)} multiline rows={2} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                </Box>

                <Box sx={{ mt: "auto", pt: 1 }}>
                  <Button 
                    variant="contained" 
                    fullWidth 
                    disabled={loading || (
                      ieCodeMode === "assign_import" ? selectedIeCodes.length === 0
                      : ieCodeMode === "assign_export" ? selectedExporterIeCodes.length === 0
                      : (selectedIeCodes.length === 0 && selectedExporterIeCodes.length === 0)
                    )}
                    onClick={async () => { await handleIeCodeOperation(); setActionsMenuUser(null); setActionsTab(0); }}
                    sx={{  
                      borderRadius: 2, 
                      textTransform: "none", 
                      fontWeight: 700, 
                      py: 1.5, 
                      fontSize: "0.9rem",
                      bgcolor: ieCodeMode === "remove" ? "#ef4444" : "#1e293b",
                      color: "#ffffff !important",
                      "&:hover": {
                        bgcolor: ieCodeMode === "remove" ? "#dc2626" : "#0f172a",
                      },
                      "&.Mui-disabled": {
                         bgcolor: "rgba(30, 41, 59, 0.4)",
                         color: "rgba(255, 255, 255, 0.45) !important",
                         opacity: 0.8
                      }
                    }}
                  >
                    {loading ? "Processing..." : ieCodeMode === "remove"
                      ? `Remove ${selectedIeCodes.length + selectedExporterIeCodes.length} Selected Code${(selectedIeCodes.length + selectedExporterIeCodes.length) !== 1 ? "s" : ""}`
                      : `Assign ${ieCodeMode === "assign_export" ? selectedExporterIeCodes.length : selectedIeCodes.length} Selected Code${(ieCodeMode === "assign_export" ? selectedExporterIeCodes.length : selectedIeCodes.length) !== 1 ? "s" : ""}`}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Panel 1: Status */}
            {actionsTab === 1 && (
              <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5, flex: 1 }}>
                <Box sx={{ borderBottom: "1px solid #f1f5f9", pb: 2 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Account Status</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#64748b", mt: 0.4 }}>Control whether this user can access the platform.</Typography>
                </Box>

                <Box sx={{ border: `1.5px solid ${actionsMenuUser?.isActive ? "#bbf7d0" : "#fecaca"}`, borderRadius: 2.5, p: 3, bgcolor: actionsMenuUser?.isActive ? "#f0fdf4" : "#fff5f5", display: "flex", alignItems: "center", gap: 2.5 }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: actionsMenuUser?.isActive ? "#dcfce7" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {actionsMenuUser?.isActive ? <ToggleOn sx={{ color: "#16a34a", fontSize: 30 }} /> : <ToggleOff sx={{ color: "#dc2626", fontSize: 30 }} />}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>Account is currently {actionsMenuUser?.isActive ? "Active" : "Inactive"}</Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: "#64748b", mt: 0.5, lineHeight: 1.5 }}>
                      {actionsMenuUser?.isActive ? "This user can log in and access all their assigned modules." : "This user cannot log in. Their data and assignments are preserved."}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2, p: 2.5 }}>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", mb: 1.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>What will happen</Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {(actionsMenuUser?.isActive
                      ? ["User will immediately lose access to all modules", "Active sessions will be terminated", "User data and assignments are preserved"]
                      : ["User will regain access to all assigned modules", "User can log in with their existing credentials", "All previous settings and assignments are restored"]
                    ).map((item, i) => (
                      <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                        <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#94a3b8", mt: 0.7, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: "0.78rem", color: "#475569" }}>{item}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ mt: "auto" }}>
                  <Button variant="contained" fullWidth startIcon={actionsMenuUser?.isActive ? <ToggleOff /> : <ToggleOn />} disabled={loading}
                    onClick={async () => { await handleChangeUserStatus(actionsMenuUser, !actionsMenuUser?.isActive); setActionsMenuUser(null); setActionsTab(0); }}
                    sx={{ bgcolor: actionsMenuUser?.isActive ? "#dc2626" : "#16a34a", borderRadius: 2, textTransform: "none", fontWeight: 700, py: 1.2, fontSize: "0.88rem", "&:hover": { bgcolor: actionsMenuUser?.isActive ? "#b91c1c" : "#15803d" } }}
                  >
                    {loading ? "Processing..." : actionsMenuUser?.isActive ? "Deactivate Account" : "Activate Account"}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Panel 2: Modules */}
            {actionsTab === 2 && (
              <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5, flex: 1 }}>
                <Box sx={{ borderBottom: "1px solid #f1f5f9", pb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Module Access</Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: "#64748b", mt: 0.4 }}>Select which application modules this user can access.</Typography>
                    </Box>
                    <Chip label={`${selectedUserModules.length} / ${AVAILABLE_MODULES.length} selected`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem" }} />
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => setSelectedUserModules(AVAILABLE_MODULES.map(m => m.id))} sx={{ textTransform: "none", fontSize: "0.75rem", borderRadius: 1.5, fontWeight: 600, flex: 1 }}>Select All</Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => setSelectedUserModules([])} sx={{ textTransform: "none", fontSize: "0.75rem", borderRadius: 1.5, fontWeight: 600, flex: 1 }}>Clear All</Button>
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, overflowY: "auto", maxHeight: 500, pr: 0.5 }}>
                  {AVAILABLE_MODULES.map((module) => {
                    const isSelected = selectedUserModules.includes(module.id);
                    return (
                      <Box key={module.id}
                        onClick={() => setSelectedUserModules(prev => isSelected ? prev.filter(m => m !== module.id) : [...prev, module.id])}
                        sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5, borderRadius: 2, cursor: "pointer", border: `1.5px solid ${isSelected ? "#3b82f6" : "#e2e8f0"}`, bgcolor: isSelected ? "#eff6ff" : "#fff", transition: "all 0.15s", "&:hover": { borderColor: isSelected ? "#2563eb" : "#cbd5e1", bgcolor: isSelected ? "#dbeafe" : "#f8fafc" } }}
                      >
                        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: isSelected ? "#dbeafe" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0, transition: "all 0.15s" }}>
                          {getModuleIcon(module.id)}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: isSelected ? "#1d4ed8" : "#374151", lineHeight: 1.3 }}>{module.name}</Typography>
                          {isSelected && <Typography sx={{ fontSize: "0.68rem", color: "#3b82f6", fontWeight: 500 }}>✓ Enabled</Typography>}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                <Box sx={{ mt: "auto" }}>
                  <Button variant="contained" fullWidth disabled={loading}
                    onClick={async () => { await handleAssignModules(actionsMenuUser._id, selectedUserModules); setActionsMenuUser(null); setActionsTab(0); }}
                    sx={{ bgcolor: "#1d4ed8", borderRadius: 2, textTransform: "none", fontWeight: 700, py: 1.2, fontSize: "0.88rem", "&:hover": { bgcolor: "#1e40af" } }}
                  >
                    {loading ? "Saving..." : `Save Module Assignments (${selectedUserModules.length} enabled)`}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Panel 3: Role */}
            {actionsTab === 3 && (
              <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5, flex: 1 }}>
                <Box sx={{ borderBottom: "1px solid #f1f5f9", pb: 2 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Role & User Assignment Management</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#64748b", mt: 0.4 }}>Manage administrative privileges and user assignments.</Typography>
                </Box>

                <Box sx={{ border: `1.5px solid ${actionsMenuUser?.role === "admin" ? "#e9d5ff" : "#e2e8f0"}`, borderRadius: 2.5, p: 3, bgcolor: actionsMenuUser?.role === "admin" ? "#faf5ff" : "#f8fafc", display: "flex", alignItems: "center", gap: 2.5 }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: actionsMenuUser?.role === "admin" ? "#ede9fe" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {actionsMenuUser?.role === "admin" ? <AdminPanelSettings sx={{ color: "#7c3aed", fontSize: 28 }} /> : <People sx={{ color: "#64748b", fontSize: 28 }} />}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>Current Role: {actionsMenuUser?.role === "admin" ? "Administrator" : "Standard User"}</Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: "#64748b", mt: 0.5, lineHeight: 1.5 }}>
                      {actionsMenuUser?.role === "admin" ? "This user has elevated privileges to manage users, modules, and settings." : "This user has standard access limited to their assigned modules."}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 0.5 }}>
                  <Button variant="outlined" fullWidth disabled={loading}
                    startIcon={actionsMenuUser?.role === "admin" ? <Delete /> : <AdminPanelSettings />}
                    onClick={async () => {
                      if (actionsMenuUser?.role === "admin") {
                        await handleRevokeAdmin(actionsMenuUser, "user");
                      } else {
                        await handlePromoteToAdmin(actionsMenuUser, "user");
                      }
                      setActionsMenuUser(null); setActionsTab(0);
                    }}
                    sx={{ borderColor: actionsMenuUser?.role === "admin" ? "#dc2626" : "#7c3aed", color: actionsMenuUser?.role === "admin" ? "#dc2626" : "#7c3aed", borderRadius: 2, textTransform: "none", fontWeight: 700, py: 1, fontSize: "0.8rem", "&:hover": { bgcolor: actionsMenuUser?.role === "admin" ? "#fef2f2" : "#f5f3ff", borderColor: actionsMenuUser?.role === "admin" ? "#b91c1c" : "#6d28d9" } }}
                  >
                    {loading ? "Processing..." : actionsMenuUser?.role === "admin" ? "Demote to Standard User" : "Promote to Administrator"}
                  </Button>
                </Box>

                <Divider sx={{ my: 1 }} />

                {actionsMenuUser?.role !== "admin" ? (
                  // Regular User: Assign to an Admin
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: "#374151" }}>Assign to Admin</Typography>
                    <FormControl fullWidth size="small">
                      <InputLabel id="assign-admin-label">Select Admin</InputLabel>
                      <Select
                        labelId="assign-admin-label"
                        value={tempAdminId}
                        label="Select Admin"
                        onChange={(e) => setTempAdminId(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>None (Unassigned)</em>
                        </MenuItem>
                        {users.filter(u => u.role === "admin").map((admin) => (
                          <MenuItem key={admin._id} value={admin._id}>
                            {admin.name} ({admin.email})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      onClick={handleSaveAdminAssignment}
                      disabled={loading}
                      sx={{ textTransform: "none", borderRadius: 2, bgcolor: "#1e293b", "&:hover": { bgcolor: "#0f172a" }, py: 1 }}
                    >
                      Save Admin Assignment
                    </Button>
                  </Box>
                ) : (
                  // Admin User: Assign Users in Bulk
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, flexGrow: 1 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: "#374151" }}>Assign Users to this Admin</Typography>
                    
                    <TextField
                      placeholder="Search users to assign..."
                      size="small"
                      value={adminUserSearchQuery}
                      onChange={(e) => setAdminUserSearchQuery(e.target.value)}
                      sx={{
                        "& .MuiInputBase-root": {
                          height: 32,
                          fontSize: "0.78rem",
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ color: "text.secondary", fontSize: "1rem" }} />
                          </InputAdornment>
                        ),
                      }}
                    />


                    <Box sx={{ border: "1px solid #cbd5e1", borderRadius: 2, p: 1.5, maxHeight: 280, overflowY: "auto", bgcolor: "#f8fafc" }}>
                      {users
                        .filter(u => u._id !== actionsMenuUser?._id)
                        .filter(u => {
                          if (!adminUserSearchQuery) return true;
                          const search = adminUserSearchQuery.toLowerCase();
                          return u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search);
                        })
                        .map((userItem) => {
                          const isChecked = tempAssignedUserIds.includes(userItem._id);
                          const isAssignedToOther = userItem.adminId && (userItem.adminId?._id || userItem.adminId) !== actionsMenuUser?._id;
                          const otherAdminName = isAssignedToOther ? (userItem.adminId?.name || "Other Admin") : null;

                          return (
                            <Box
                              key={userItem._id}
                              onClick={() => {
                                if (isChecked) {
                                  setTempAssignedUserIds(prev => prev.filter(id => id !== userItem._id));
                                } else {
                                  setTempAssignedUserIds(prev => [...prev, userItem._id]);
                                }
                              }}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                p: 1.2,
                                mb: 1,
                                borderRadius: 2,
                                border: `1.5px solid ${isChecked ? "#3b82f6" : "#e2e8f0"}`,
                                bgcolor: isChecked ? "#eff6ff" : "#fff",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                "&:hover": {
                                  borderColor: isChecked ? "#2563eb" : "#cbd5e1",
                                  bgcolor: isChecked ? "#dbeafe" : "#f8fafc"
                                }
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    fontSize: "0.78rem",
                                    fontWeight: 700,
                                    bgcolor: isChecked ? "#3b82f6" : "#94a3b8",
                                    color: "#fff"
                                  }}
                                >
                                  {userItem.name ? userItem.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "?"}
                                </Avatar>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                                      {userItem.name}
                                    </Typography>
                                    {userItem.role === "admin" && (
                                      <Chip
                                        label="Admin"
                                        size="small"
                                        sx={{
                                          fontSize: "0.62rem",
                                          height: 16,
                                          bgcolor: "#f3e8ff",
                                          color: "#7e22ce",
                                          fontWeight: 700,
                                          px: 0.5,
                                          border: "none"
                                        }}
                                      />
                                    )}
                                  </Box>
                                  <Typography sx={{ fontSize: "0.72rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {userItem.email}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                {isAssignedToOther && (
                                  <Chip
                                    label={`Assigned to ${otherAdminName}`}
                                    size="small"
                                    sx={{
                                      fontSize: "0.65rem",
                                      height: 20,
                                      bgcolor: "#fee2e2",
                                      color: "#dc2626",
                                      fontWeight: 600,
                                      border: "none"
                                    }}
                                  />
                                )}
                                <Checkbox
                                  size="small"
                                  checked={isChecked}
                                  sx={{ p: 0.5 }}
                                />
                              </Box>
                            </Box>
                          );
                        })}
                      {users.filter(u => u._id !== actionsMenuUser?._id).filter(u => {
                        if (!adminUserSearchQuery) return true;
                        const search = adminUserSearchQuery.toLowerCase();
                        return u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search);
                      }).length === 0 && (
                        <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic", textAlign: "center", py: 2 }}>
                          No users match the search.
                        </Typography>
                      )}
                    </Box>

                    <Button
                      variant="contained"
                      onClick={handleSaveUserAssignments}
                      disabled={loading}
                      sx={{ textTransform: "none", borderRadius: 2, bgcolor: "#1e293b", "&:hover": { bgcolor: "#0f172a" }, py: 1 }}
                    >
                      Save User Assignments
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Panel 4: Branch Access */}
            {actionsTab === 4 && (
              <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5, flex: 1 }}>
                <Box sx={{ borderBottom: "1px solid #f1f5f9", pb: 2 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Branch Access Control</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#64748b", mt: 0.4 }}>Assign branches and specific custom houses/ports to control data visibility for this user.</Typography>
                </Box>

                {(actionsMenuUser?.selected_branches?.length > 0 || actionsMenuUser?.selected_icd_codes?.length > 0) && (
                  <Box sx={{ bgcolor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 2.5, p: 2 }}>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#0369a1", mb: 1, textTransform: "uppercase" }}>Current Access</Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {(actionsMenuUser.selected_branches || []).map(b => (
                        <Chip key={b} label={b} size="small" sx={{ bgcolor: "#fff", fontWeight: 700, border: "1px solid #bae6fd" }} />
                      ))}
                      {(actionsMenuUser.selected_icd_codes || []).map(c => (
                        <Chip key={c} label={c} size="small" variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.5)" }} />
                      ))}
                    </Box>
                  </Box>
                )}

                <Box>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", mb: 1.2 }}>ASSIGN BRANCHES</Typography>
                  <Grid container spacing={1}>
                    {BRANCH_OPTIONS.map((branch) => (
                      <Grid item xs={4} key={branch.code}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={selectedBranches.includes(branch.code)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBranches([...selectedBranches, branch.code]);
                                } else {
                                  setSelectedBranches(selectedBranches.filter(b => b !== branch.code));
                                }
                              }}
                            />
                          }
                          label={<Typography sx={{ fontSize: "0.78rem", fontWeight: 500 }}>{branch.label}</Typography>}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", mb: 1.2 }}>ASSIGN CUSTOM HOUSES / ICDs</Typography>
                  <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={CUSTOM_HOUSE_OPTIONS
                      .filter(branch => selectedBranches.includes(branch.branchCode))
                      .flatMap(branch => branch.items.map(item => ({
                        value: item.value,
                        label: `${item.label} (${item.code})`,
                        group: branch.group
                      })))}
                    groupBy={(option) => option.group}
                    getOptionLabel={(option) => option.label}
                    value={CUSTOM_HOUSE_OPTIONS
                      .flatMap(b => b.items)
                      .filter(i => selectedBranchIcdCodes.includes(i.value))
                      .map(i => ({ value: i.value, label: i.label }))}
                    onChange={(_, newValue) => setSelectedBranchIcdCodes(newValue.map(v => v.value))}
                    renderInput={(params) => (
                      <TextField {...params} size="small" placeholder={selectedBranches.length === 0 ? "Select branches first..." : "Search custom houses..."} />
                    )}
                    renderTags={(tagValue, getTagProps) =>
                      tagValue.map((option, index) => (
                        <Chip size="small" label={option.label} {...getTagProps({ index })} key={option.value} sx={{ fontSize: "0.7rem" }} />
                      ))
                    }
                    disabled={selectedBranches.length === 0}
                  />
                </Box>

                <Box sx={{ mt: "auto", display: "flex", gap: 1.5 }}>
                  <Button
                    fullWidth variant="contained"
                    onClick={() => handleBranchAssignment(false)}
                    disabled={branchAssignmentLoading || selectedBranches.length === 0}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, py: 1.2, bgcolor: "#1e293b", color: "#fff !important" }}
                  >
                    {branchAssignmentLoading ? "Updating..." : "Save Assignments"}
                  </Button>
                  <Button
                    variant="outlined" color="error"
                    onClick={() => handleBranchAssignment(true)}
                    disabled={branchAssignmentLoading || (!actionsMenuUser?.selected_branches?.length && !actionsMenuUser?.selected_icd_codes?.length)}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, px: 3 }}
                  >
                    Remove All
                  </Button>
                </Box>
              </Box>
            )}

          </Box>
        </Box>
      </Dialog>

      <IeCodeDialog
        open={ieCodeDialog}
        onClose={() => {
          setIeCodeDialog(false);
          setSelectedIeCodes([]);
          setIeCodeReason("");
          setIeCodeMode("assign_import");
        }}
        selectedEntity={selectedEntity}
        isRemovingIeCode={ieCodeMode === "remove"}
        setIsRemovingIeCode={(val) => setIeCodeMode(val ? "remove" : "assign_import")}
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
    </Box>
  );
};

export default AdminManagement;
