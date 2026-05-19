import React, { useState, useEffect, useMemo } from "react";
import { Alert as AntAlert, Tag } from "antd";
import ReactApexChart from "react-apexcharts";
import { WarningOutlined, CloseCircleOutlined } from "@ant-design/icons";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  IconButton,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Radio,
  ListItemText,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import {
  Lock as LockIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Logout as LogoutIcon,
  ManageAccounts as ManageAccountsIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

// Icons for Admin panel only (since others are now Emojis)
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";

import AEOReminderSettings from "../components/AEOReminderSettings";
import { ThemeProvider, styled } from "@mui/material/styles";
import { modernTheme } from "../styles/modernTheme";
import { useUserData } from "../customHooks/useUserData";
import { filterModulesByAccess } from "../utils/moduleAccess";
import axios from "axios";
import {
  getCookie,
  setJsonCookie,
  setCookie,
  removeCookie,
  getJsonCookie,
} from "../utils/cookies";

// --- Styled Components ---

const StyledCard = styled(Card)(({ theme }) => ({
  height: "100%",
  minHeight: "130px",
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  transition: "all 0.2s ease",
  borderRadius: "12px",
  position: "relative",
  // overflow: "hidden",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  "&:hover": {
    transform: "translateY(-3px)",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.08)",
    borderColor: "#cbd5e1",
  },
}));

const BetaBadge = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 12,
  right: 12,
  background: "#10b981",
  color: "white",
  fontSize: "0.6rem",
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: "4px",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  zIndex: 2,
}));

const IconContainer = styled(Box)(({ theme }) => ({
  width: "72px",
  height: "72px",
  borderRadius: "20px",
  background: "linear-gradient(145deg, #e6f7ff 0%, #bae7ff 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: theme.spacing(2.5),
  fontSize: "36px",
  lineHeight: 1,
  userSelect: "none",
  boxShadow:
    "0 4px 12px rgba(24, 144, 255, 0.15), inset 0 1px 0 rgba(255,255,255,0.6)",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "scale(1.08) rotate(3deg)",
  },
}));

const WelcomeBanner = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5, 3),
  marginBottom: theme.spacing(1.5),
  borderRadius: "12px",
  background: "#ffffff",
  color: "#1e293b",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  border: "1px solid #e2e8f0",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));

const IECodeCard = styled(Box)(({ theme }) => ({
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(10px)",
  borderRadius: "12px",
  padding: theme.spacing(2, 2.5),
  minWidth: "260px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
  borderLeft: "4px solid #40a9ff",
  transition: "all 0.2s ease",
  "&:hover": {
    transform: "translateX(4px)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
  },
}));

const HeaderBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "#ffffff",
  color: "#1e293b",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  borderBottom: "1px solid #EAEEF2",
  position: "fixed",
  zIndex: theme.zIndex.drawer + 1,
}));

const DateTimeContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  justifyContent: "center",
  marginRight: theme.spacing(3),
  paddingRight: theme.spacing(3),
  borderRight: "1px solid #EAEEF2",
  height: "40px",
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  color: "#64748B",
  backgroundColor: "transparent",
  border: "1px solid transparent",
  borderRadius: "8px",
  padding: "8px",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: "#F1F5F9",
    color: "#0F172A",
    borderColor: "#E2E8F0",
  },
  "& svg": {
    fontSize: "20px",
  },
}));

const UserBadge = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: "4px 4px 4px 12px",
  backgroundColor: "#F8FAFC",
  border: "1px solid #EAEEF2",
  borderRadius: "30px",
  marginLeft: theme.spacing(2),
}));

function UserDashboard() {
  const {
    userData,
    loading: userLoading,
    error: userError,
    refreshUserData,
  } = useUserData();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moduleRequestDialog, setModuleRequestDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [requestReason, setRequestReason] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [docAlertOpen, setDocAlertOpen] = useState(true);
  const [aeoAlertOpen, setAeoAlertOpen] = useState(true);
  const [aeoCertificates, setAeoCertificates] = useState([]);
  const [reminderSettingsOpen, setReminderSettingsOpen] = useState(false);

  // New Stats State
  const eximUser = userData || getJsonCookie("exim_user");
  const parsedUser = userData || eximUser;
  const ieCodeAssignments = parsedUser?.ie_code_assignments || [];
  const userIeCode = parsedUser?.ie_code_assignments?.[0]?.ie_code_no || "";
  const userImporterName =
    parsedUser?.ie_code_assignments?.[0]?.importer_name || "";

  const [stats, setStats] = useState(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [selectedJobList, setSelectedJobList] = useState([]);
  const [jobListDialogOpen, setJobListDialogOpen] = useState(false);

  const metricConfig = [
    {
      label: "Jobs Created",
      key: "jobs_created_today",
      trendKey: "jobs_trend",
      color: "#3b82f6",
    },
    {
      label: "Ops Completed",
      key: "operations_completed",
      trendKey: "ops_trend",
      color: "#10b981",
    },
    {
      label: "Exam Planned",
      key: "examination_planning",
      trendKey: "exam_trend",
      color: "#f59e0b",
    },
    {
      label: "Arrivals",
      key: "arrivals_today",
      trendKey: "arrival_trend",
      color: "#6366f1",
    },
    {
      label: "Rail Out",
      key: "rail_out_today",
      trendKey: "rail_out_trend",
      color: "#8b5cf6",
    },
    {
      label: "BE Filed",
      key: "be_filed",
      trendKey: "be_trend",
      color: "#ec4899",
    },
    { label: "OOC", key: "ooc", trendKey: "ooc_trend", color: "#14b8a6" },
    {
      label: "DO Completed",
      key: "do_completed",
      trendKey: "do_trend",
      color: "#f97316",
    },
    {
      label: "Billing Sent",
      key: "billing_sent",
      trendKey: "billing_trend",
      color: "#06b6d4",
    },
    { label: "ETA", key: "eta", trendKey: "eta_trend", color: "#84cc16" },
    {
      label: "Gateway IGM",
      key: "gateway_igm_date",
      trendKey: "gateway_igm_trend",
      color: "#a855f7",
    },
    {
      label: "Discharge",
      key: "discharge_date",
      trendKey: "discharge_trend",
      color: "#ef4444",
    },
    {
      label: "Empty Offload",
      key: "empty_offload",
      trendKey: null,
      color: "#64748b",
    },
  ];
  // Horizontal Bar Chart Data
  const barSeries = useMemo(() => {
    if (!stats || !stats.summary) return [{ name: "Count", data: [] }];
    return [
      {
        name: "Count",
        data: metricConfig.map((m) => stats.summary[m.key] || 0),
      },
    ];
  }, [stats]);

  const barOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        fontFamily: "inherit",
        toolbar: { show: false },
        events: {
          dataPointSelection: (event, chartContext, config) => {
            const index = config.dataPointIndex;
            const metric = metricConfig[index];
            if (metric && stats?.details?.[metric.key]) {
              const details = stats.details[metric.key];
              // Ensure details is an array
              if (Array.isArray(details) && details.length > 0) {
                setSelectedJobTitle(metric.label);
                setSelectedJobList(details);
                setJobListDialogOpen(true);
              }
            }
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "45%", // Reduced from 60% for more spacing
          borderRadius: 2,
          distributed: true, // Use different color per bar
          dataLabels: {
            position: "top",
          },
        },
      },
      colors: metricConfig.map((m) => m.color),
      xaxis: {
        categories: metricConfig.map((m) => m.label),
        labels: {
          style: {
            width: "100%",
            fontSize: "11px",
            fontWeight: 500,
            colors: "#64748b",
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontSize: "12px", fontWeight: 600, colors: "#475569" },
          maxWidth: 180,
        },
      },
      legend: { show: false }, // Bars are self-labeled by axis
      dataLabels: {
        enabled: true,
        textAnchor: "start",
        style: { colors: ["#000"] },
        formatter: function (val, opt) {
          return val;
        },
        offsetX: 15, // Increased offset to push label further right
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: function (val) {
            return val;
          },
        },
      },
      grid: {
        show: true,
        borderColor: "#f1f5f9",
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { top: 0, right: 80, bottom: 0, left: 30 }, // Further increased right padding
      },
    }),
    [stats] // Added stats dependency so the event handler has access to latest data
  );

  // Set default importer if only one assignment exists
  useEffect(() => {
    if (ieCodeAssignments.length === 1 && !selectedImporter) {
      setSelectedImporter(ieCodeAssignments[0].importer_name);
    }
  }, [ieCodeAssignments]);

  const [selectedImporter, setSelectedImporter] = useState([]);
  const [dateFilterType, setDateFilterType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  // Custom range state
  const [customStartDate, setCustomStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const getStartEndDate = () => {
    const today = new Date();
    let start = new Date(selectedDate);
    let end = new Date(selectedDate);

    switch (dateFilterType) {
      case "daily":
        // start and end are the selected date
        break;
      case "weekly":
        // Week starting Monday
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case "monthly":
        start.setDate(1);
        end = new Date(start);
        end.setMonth(start.getMonth() + 1);
        end.setDate(0);
        break;
      case "quarterly":
        const quarterMonth = Math.floor(start.getMonth() / 3) * 3;
        start.setMonth(quarterMonth);
        start.setDate(1);
        end = new Date(start);
        end.setMonth(start.getMonth() + 3);
        end.setDate(0);
        break;
      case "yearly":
        start.setMonth(0, 1);
        end = new Date(start);
        end.setMonth(12, 0);
        break;
      case "custom":
        start = new Date(customStartDate);
        end = new Date(customEndDate);
        break;
      default:
        break;
    }

    // Format to YYYY-MM-DD
    const toYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return { startDate: toYMD(start), endDate: toYMD(end) };
  };

  const fetchStats = async () => {
    try {
      const token = getCookie("access_token");
      let url = `${process.env.REACT_APP_API_STRING}/user-dashboard-stats`;

      const params = new URLSearchParams();
      if (selectedImporter && selectedImporter.length > 0) {
        params.append(
          "importer",
          Array.isArray(selectedImporter)
            ? selectedImporter.join(",")
            : selectedImporter,
        );
      }
      const { startDate, endDate } = getStartEndDate();

      if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }
      console.log("Stats API Request URL:", `${url}?${params.toString()}`);

      const response = await axios.get(`${url}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedImporter, selectedDate, dateFilterType, customStartDate, customEndDate]);

  const fetchAndUpdateUserData = async () => {
    try {
      const token = getCookie("access_token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/users/current`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );

      if (response.data.success) {
        const userData = response.data.data.user;
        setJsonCookie("exim_user", userData);
        setDashboardData((prevData) => ({
          ...prevData,
          user: userData,
        }));
        return userData;
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        await fetchAndUpdateUserData();
        await refreshUserData();
        await fetchDashboardData();
        await fetchAEOCertificateData();
      } catch (error) {
        setError("Failed to load dashboard data.");
        if (error.response?.status === 401) handleLogout();
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
    const timer = setInterval(() => setCurrentDateTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const navigate = useNavigate();

  // --- Updated Modules with Category Labels ---
  const allModules = [
    {
      name: "Import DSR",
      description:
        "View and manage import daily status reports with real-time shipment tracking",
      path: "/importdsr",
      categoryLabel: "IMPORT MANAGEMENT",
      category: "core",
    },
    {
      name: "Export DSR",
      description:
        "Comprehensive export shipment tracking and IEC-wise data management",
      path: "/export",
      categoryLabel: "EXPORT MANAGEMENT",
      category: "core",
    },
    {
      name: "CostIQ",
      description:
        "Advanced freight cost calculator with per-kilogram pricing analysis",
      path: "/netpage",
      categoryLabel: "FINANCIAL ANALYSIS",
      category: "core",
    },
    {
      name: "E-Lock",
      description:
        "GPS-enabled electronic seal system for secure cargo transport verification",
      path: "/elock",
      categoryLabel: "SECURITY & TRACKING",
      category: "core",
      isExternal: false,
    },
    {
      name: "SnapCheck",
      description:
        "AI-powered quality inspection system with automated defect detection",
      path: "http://snapcheckv1.s3-website.ap-south-1.amazonaws.com/",
      categoryLabel: "QUALITY CONTROL",
      category: "beta",
      isExternal: true,
    },
    {
      name: "QR Locker",
      description:
        "Digital container management with QR code authentication for yards",
      path: "http://qrlocker.s3-website.ap-south-1.amazonaws.com/",
      categoryLabel: "WAREHOUSE MANAGEMENT",
      category: "beta",
      isExternal: true,
    },
    {
      name: "Task Flow AI",
      description:
        "Intelligent workflow automation with hierarchical task assignment",
      path: "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com/",
      categoryLabel: "WORKFLOW AUTOMATION",
      category: "core",
      isExternal: true,
    },
    {
      name: "Trade Master Guide",
      description:
        "Comprehensive trade documentation with compliance guidelines",
      path: "/trademasterguide",
      categoryLabel: "TRADE MANAGEMENT",
      category: "core",
    },
    {
      name: "Export DSR",
      description:
        "Export shipment tracking and daily status reporting with logistics coordination",
      path: "/exportdsr",
      categoryLabel: "EXPORT MANAGEMENT",
      category: "core",
    },
    {
      name: "Transport",
      description:
        "View transport details, track shipments, and manage logistics",
      path: "/transport",
      categoryLabel: "TRANSPORT MANAGEMENT",
      category: "core",
    },
  ];

  const formattedDate = currentDateTime.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const fetchAEOCertificateData = async () => {
    try {
      const token = getCookie("access_token");
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/aeo/kyc-summary`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        setAeoCertificates(data.kyc_summaries || []);
      }
    } catch (error) {
      console.error("Error fetching AEO certificate data:", error);
    }
  };

  const modules = useMemo(() => {
    const filteredModules = filterModulesByAccess(allModules);
    if (dashboardData?.user?.role === "admin") {
      filteredModules.push({
        name: "Admin Panel",
        description: "Manage users, settings, and system configurations",
        path: "/admin",
        // Admin Panel still uses an Icon, so we handle this in the render loop
        icon: <AdminPanelSettingsOutlinedIcon />,
        category: "admin",
        hasAccess: true,
        isLocked: false,
      });
    }
    return filteredModules;
  }, [dashboardData?.user?.role]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/users/dashboard`,
        { withCredentials: true },
      );
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      setError("Failed to load dashboard data.");
      if (error.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const expiringDocs = useMemo(() => {
    if (!parsedUser?.documents) return [];
    const today = new Date();
    return parsedUser.documents.filter((doc) => {
      if (!doc.expirationDate) return false;
      const expirationDate = new Date(doc.expirationDate);
      const daysUntilExpiration = Math.ceil(
        (expirationDate - today) / (1000 * 60 * 60 * 24),
      );
      return daysUntilExpiration > 0 && daysUntilExpiration <= 30;
    });
  }, [parsedUser?.documents]);

  const expiredDocs = useMemo(() => {
    if (!parsedUser?.documents) return [];
    const today = new Date();
    return parsedUser.documents.filter((doc) => {
      if (!doc.expirationDate) return false;
      const expirationDate = new Date(doc.expirationDate);
      const daysUntilExpiration = Math.ceil(
        (expirationDate - today) / (1000 * 60 * 60 * 24),
      );
      return daysUntilExpiration <= 0;
    });
  }, [parsedUser?.documents]);

  // --- UPDATED LOGIC FOR MULTIPLE CERTIFICATES ---
  const expiringAeoCertificates = useMemo(() => {
    const today = new Date();
    const allExpiring = [];

    // Loop through each Importer Summary
    aeoCertificates.forEach((summary) => {
      const certs = summary.aeo_certificates || [];

      // Loop through each Certificate for that importer
      certs.forEach((cert) => {
        if (!cert.certificate_validity_date) return;

        const validityDate = new Date(cert.certificate_validity_date);
        const daysUntilExpiry = Math.ceil(
          (validityDate - today) / (1000 * 60 * 60 * 24),
        );

        // Check condition (Expires in next 90 days)
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 90) {
          allExpiring.push({
            importer_name: summary.importer_name,
            certificate_no: cert.certificate_no,
            daysUntilExpiry: daysUntilExpiry,
          });
        }
      });
    });

    return allExpiring;
  }, [aeoCertificates]);

  const expiredAeoCertificates = useMemo(() => {
    const today = new Date();
    const allExpired = [];

    // Loop through each Importer Summary
    aeoCertificates.forEach((summary) => {
      const certs = summary.aeo_certificates || [];

      // Loop through each Certificate for that importer
      certs.forEach((cert) => {
        if (!cert.certificate_validity_date) return;

        const validityDate = new Date(cert.certificate_validity_date);
        const daysUntilExpiry = Math.ceil(
          (validityDate - today) / (1000 * 60 * 60 * 24),
        );

        // Check condition (Already expired)
        if (daysUntilExpiry <= 0) {
          allExpired.push({
            importer_name: summary.importer_name,
            certificate_no: cert.certificate_no,
          });
        }
      });
    });

    return allExpired;
  }, [aeoCertificates]);


  const handleLogout = async () => {
    try {
      const logoutData = {};
      if (dashboardData?.user?.id) logoutData.user_id = dashboardData.user.id;
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/users/logout`,
        logoutData,
        { withCredentials: true },
      );
      removeCookie("exim_user");
      removeCookie("access_token");
      removeCookie("refresh_token");
      removeCookie("sso_token");
      navigate("/login", { replace: true });
    } catch (error) {
      removeCookie("exim_user");
      navigate("/login", { replace: true });
    }
  };

  const handleModuleRequest = async () => {
    if (!selectedModule || !requestReason.trim()) return;
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/users/request-module-access`,
        { moduleKey: selectedModule.key, reason: requestReason },
        { withCredentials: true },
      );
      if (response.data.success) {
        setModuleRequestDialog(false);
        setSelectedModule(null);
        setRequestReason("");
        fetchDashboardData();
      }
    } catch (error) { }
  };
  const handleCardClick = async (
    path,
    isExternal = false,
    isLocked = false,
    moduleName = "",
  ) => {

    //console.log(parsedUser);
    if (isLocked) return;
    if (isExternal && path && path.startsWith("http")) {
      window.open(path, "_blank");
      return;
    }
    if (path && path.startsWith("/")) {
      navigate(path);
      return;
    }
  };

  const userName = dashboardData?.user?.name || "User";
  console.log(dashboardData);
  if (loading) {
    return (
      <ThemeProvider theme={modernTheme}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <Typography>Loading dashboard...</Typography>
        </Box>
      </ThemeProvider>
    );
  }
  if (error) {
    return (
      <ThemeProvider theme={modernTheme}>
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={modernTheme}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          // overflow: "hidden",
          backgroundColor: "#F8F9FB",
        }}
      >
        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            //overflow: "auto",
            padding: { xs: 1, md: 2 },
            pb: 2,

          }}
        >
          {/* Welcome Banner */}
          <WelcomeBanner elevation={0} sx={{ backgroundColor: "#1e293b", color: "#ffffffff" }}>
            {/* Row 1: Welcome + AEO/Active */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography
                variant="h5"
                fontWeight="700"
                sx={{ color: "#ffffffff" }}
              >
                Welcome back, {userName}
              </Typography>

              <Box>
                {expiredAeoCertificates.length > 0 ||
                  expiringAeoCertificates.length > 0 ? (
                  <Chip
                    icon={<WarningIcon style={{ color: "white" }} />}
                    label={
                      expiredAeoCertificates.length > 0
                        ? "AEO Expired"
                        : "AEO Expiring"
                    }
                    onClick={() => navigate("/user/profile")}
                    sx={{
                      bgcolor:
                        expiredAeoCertificates.length > 0
                          ? "#ef4444"
                          : "#f59e0b",
                      color: "white",
                      fontWeight: 600,
                      height: "28px",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      "& .MuiChip-icon": { fontSize: "16px" },
                    }}
                  />
                ) : (
                  expiredDocs.length === 0 &&
                  expiringDocs.length === 0 && (
                    <Chip
                      label="ACTIVE"
                      sx={{
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        fontWeight: 600,
                        borderRadius: "4px",
                        height: "28px",
                        fontSize: "0.7rem",
                        letterSpacing: "0.5px",
                      }}
                    />
                  )
                )}
              </Box>
            </Box>

            {/* Row 2: IE Code + Docs */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
            >
              <Box display="flex" flexDirection="column" gap={0.5}>
                {ieCodeAssignments.map((assignment, index) => (
                  <Typography
                    key={index}
                    variant="body2"
                    sx={{
                      fontWeight: 400,
                      fontSize: "0.875rem",
                      color: "#ffffffff",
                    }}
                  >
                    {assignment.ie_code_no && (
                      <>
                        <strong style={{ color: "#ffffffff" }}>IE Code:</strong>{" "}
                        {assignment.ie_code_no}
                      </>
                    )}
                    {assignment.importer_name && (
                      <>
                        <span style={{ margin: "0 12px", color: "#cbd5e1" }}>
                          |
                        </span>
                        <strong style={{ color: "#ffffffff" }}>Importer:</strong>{" "}
                        {assignment.importer_name}
                      </>
                    )}
                  </Typography>
                ))}
              </Box>

              <Box>
                {(expiredDocs.length > 0 || expiringDocs.length > 0) && (
                  <Chip
                    icon={<WarningIcon style={{ color: "white" }} />}
                    label={
                      expiredDocs.length > 0
                        ? `${expiredDocs.length} Docs Expired`
                        : `${expiringDocs.length} Docs Expiring`
                    }
                    onClick={() => navigate("/user/profile")}
                    sx={{
                      bgcolor: expiredDocs.length > 0 ? "#ef4444" : "#f59e0b",
                      color: "white",
                      fontWeight: 600,
                      height: "28px",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      "& .MuiChip-icon": { fontSize: "16px" },
                    }}
                  />
                )}
              </Box>
            </Box>
          </WelcomeBanner>

          {/* Alerts */}
          {/* Alerts Section */}

          {/* Main Content with Analytics Sidebar */}
          <Box
            sx={{
              display: "flex",
              gap: 5,
              flex: 1, // Fill remaining space
              minHeight: 0, // Allow nested scrolling
              overflow: "hidden",
              flexDirection: { xs: "column", lg: "row" },
              alignItems: "flex-start",
              mt: 1,
            }}
          >
            {/* Left Sidebar - Analytics */}
            <Box
              sx={{
                width: { xs: "100%", lg: "40%" },
                flexShrink: 0,
                overflowY: "auto",
                height: "100%",
                pr: 1,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": {
                  background: "#cbd5e1",
                  borderRadius: "4px",
                },
              }}
            >
              {/* Importer Selector - only renders Box when selector is visible */}
              {ieCodeAssignments.length > 1 && (
                <Box
                  sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <FormControl
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  >
                    <Select
                      multiple
                      displayEmpty
                      value={
                        Array.isArray(selectedImporter) ? selectedImporter : []
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        // If "all" is selected (empty string passed), reset to empty array
                        if (val.includes("")) {
                          setSelectedImporter([]);
                        } else {
                          setSelectedImporter(
                            typeof val === "string" ? val.split(",") : val,
                          );
                        }
                      }}
                      renderValue={(selected) => {
                        if (!Array.isArray(selected) || selected.length === 0) {
                          return <em>All Importers</em>;
                        }
                        return selected.join(", ");
                      }}
                      sx={{ color: "#1e293b !important" }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            "& .MuiMenuItem-root": {
                              color: "#1e293b !important",
                            },
                          },
                        },
                      }}
                    >
                      <MenuItem value="" dense sx={{ color: "#1e293b !important", py: 0.5 }}>
                        <Radio size="small" checked={!Array.isArray(selectedImporter) || selectedImporter.length === 0} sx={{ p: 0.5 }} />
                        <ListItemText primary="All Importers" primaryTypographyProps={{ variant: "body2", fontSize: "0.85rem" }} />
                      </MenuItem>
                      {ieCodeAssignments.map((assignment, index) => (
                        <MenuItem
                          key={index}
                          value={assignment.importer_name}
                          dense
                          sx={{ color: "#1e293b !important", py: 0.5 }}
                        >
                          <Checkbox size="small" checked={Array.isArray(selectedImporter) && selectedImporter.indexOf(assignment.importer_name) > -1} sx={{ p: 0.5 }} />
                          <ListItemText primary={assignment.importer_name} primaryTypographyProps={{ variant: "body2", fontSize: "0.85rem" }} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* Stats Grid */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  // mt:5 (40px) aligns with first module card row when no importer selector shown
                  // (heading 1rem ≈24px + mb:2=16px = 40px). When selector IS shown, it already pushes down.
                  mt: ieCodeAssignments.length > 1 ? 0 : 5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                   
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    color="#1e293b"
                  >
                    📊 Overview
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Select
                      value={dateFilterType}
                      onChange={(e) => setDateFilterType(e.target.value)}
                      size="small"
                      sx={{
                        height: 32,
                        fontSize: "0.75rem",
                        bgcolor: "#f8fafc",
                        "& .MuiSelect-select": { py: 0 },
                      }}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="quarterly">Quarterly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                      <MenuItem value="custom">Custom</MenuItem>
                    </Select>

                    {dateFilterType === "custom" ? (
                      <>
                        <TextField
                          type="date"
                          size="small"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          sx={{
                            bgcolor: "#f8fafc",
                            borderRadius: 1,
                            width: 130,
                            "& .MuiOutlinedInput-root": {
                              height: 32,
                              fontSize: "0.75rem",
                            },
                          }}
                        />
                        <TextField
                          type="date"
                          size="small"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          sx={{
                            bgcolor: "#f8fafc",
                            borderRadius: 1,
                            width: 130,
                            "& .MuiOutlinedInput-root": {
                              height: 32,
                              fontSize: "0.75rem",
                            },
                          }}
                        />
                      </>
                    ) : dateFilterType === "monthly" ? (
                      <TextField
                        type="month"
                        size="small"
                        value={selectedDate.slice(0, 7)}
                        onChange={(e) => setSelectedDate(e.target.value + "-01")}
                        sx={{
                          bgcolor: "#f8fafc",
                          borderRadius: 1,
                          width: 140,
                          "& .MuiOutlinedInput-root": {
                            height: 32,
                            fontSize: "0.75rem",
                          },
                        }}
                      />
                    ) : dateFilterType === "yearly" ? (
                      <TextField
                        type="number"
                        size="small"
                        placeholder="Year"
                        value={selectedDate.split("-")[0]}
                        onChange={(e) => setSelectedDate(`${e.target.value}-01-01`)}
                        sx={{
                          bgcolor: "#f8fafc",
                          borderRadius: 1,
                          width: 100,
                          "& .MuiOutlinedInput-root": {
                            height: 32,
                            fontSize: "0.75rem",
                          },
                        }}
                      />
                    ) : (
                      <TextField
                        type="date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        sx={{
                          bgcolor: "#f8fafc",
                          borderRadius: 1,
                          width: 140,
                          "& .MuiOutlinedInput-root": {
                            height: 32,
                            fontSize: "0.75rem",
                          },
                        }}
                      />
                    )}

                    <IconButton
                      onClick={fetchStats}
                      size="small"
                      sx={{
                        bgcolor: "#3b82f6",
                        color: "white",
                        borderRadius: 1,
                        width: 32,
                        height: 32,
                        "&:hover": { bgcolor: "#2563eb" },
                      }}
                    >
                      <RefreshIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                </Box>

                {stats && stats.summary ? (
                  <Box sx={{ minHeight: 350, py: 1 }}>
                    <ReactApexChart
                      options={barOptions}
                      series={barSeries}
                      type="bar"
                      width="100%"
                      height={350}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Loading stats...
                  </Typography>
                )}
              </Paper>
            </Box>

            {/* Right Side - Modules Grid */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                fontWeight="600"
                sx={{ color: "#1e293b", mb: 2, fontSize: "1rem" }}
              >
                Application Modules
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    lg: "repeat(3, 1fr)",
                  },
                  gap: 2,
                  rowGap: 2,
                  pb: 2,
                  overflowY: "auto",
                  maxHeight: "100%",
                }}
              >
                {modules.map((module, index) => (
                  <StyledCard
                    key={index}
                    onClick={() =>
                      handleCardClick(
                        module.path,
                        module.isExternal,
                        module.isLocked,
                        module.name,
                      )
                    }
                    sx={{
                      ...(module.isLocked
                        ? { opacity: 0.6, filter: "grayscale(100%)" }
                        : {}),
                    }}
                  >
                    {module.category === "beta" && <BetaBadge>BETA</BetaBadge>}

                    {module.isLocked && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          color: "#94a3b8",
                          zIndex: 2,
                        }}
                      >
                        <LockIcon fontSize="small" />
                      </Box>
                    )}

                    <CardContent
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "16px",
                      }}
                    >
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            fontSize: "1rem",
                            color: "#1e293b",
                            mb: 1,
                          }}
                        >
                          {module.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            color: "#64748b",
                            fontSize: "0.8rem",
                            lineHeight: 1.5,
                          }}
                        >
                          {module.isLocked
                            ? "Contact Admin for Access"
                            : module.description}
                        </Typography>
                      </Box>

                      <Typography
                        variant="caption"
                        sx={{
                          color: module.isLocked ? "#94a3b8" : "#6366f1",
                          fontSize: "0.7rem",
                          fontWeight: 500,
                          letterSpacing: "0.5px",
                          mt: 2,
                        }}
                      >
                        {module.categoryLabel || "MODULE"}
                      </Typography>
                    </CardContent>
                  </StyledCard>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        <AEOReminderSettings
          open={reminderSettingsOpen}
          onClose={() => setReminderSettingsOpen(false)}
          user={parsedUser}
        />

        <Dialog
          open={moduleRequestDialog}
          onClose={() => setModuleRequestDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Request Access to {selectedModule?.name}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please provide a reason for requesting access to this module. Your
              admin will review this request.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Reason for request"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModuleRequestDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleModuleRequest}
              variant="contained"
              disabled={!requestReason.trim()}
            >
              Submit Request
            </Button>
          </DialogActions>
        </Dialog>

        {/* Job Details Modal */}
        <Dialog
          open={jobListDialogOpen}
          onClose={() => setJobListDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              fontSize: "1.25rem",
              color: "#1e293b",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 2,
              py: 2,
            }}
          >
            <Box
              sx={{
                width: 4,
                height: 28,
                bgcolor: "#3b82f6",
                borderRadius: 1,
              }}
            />
            {selectedJobTitle}
            <Chip
              label={`${selectedJobList?.length || 0} Records`}
              size="small"
              sx={{
                bgcolor: "#eff6ff",
                color: "#3b82f6",
                fontWeight: 600,
                fontSize: "0.75rem",
              }}
            />
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {selectedJobList && selectedJobList.length > 0 ? (
              <Box>
                {/* Fixed Header Row */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: `100px ${selectedJobList.some((j) => j.importer) ? "1fr" : "0px"
                      } ${selectedJobList.some((j) => j.shipping_line_airline)
                        ? "150px"
                        : "0px"
                      } ${selectedJobList.some(
                        (j) =>
                          j.container_number ||
                          (Array.isArray(j.container_nos) &&
                            j.container_nos.length > 0),
                      )
                        ? "150px"
                        : "0px"
                      } ${selectedJobList.some((j) => j.relevant_date)
                        ? "100px"
                        : "0px"
                      }`,
                    bgcolor: "#1e293b",
                    color: "#ffffff",
                    py: 1.5,
                    px: 2,
                    borderBottom: "2px solid #3b82f6",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#ffffff",
                    }}
                  >
                    Job No
                  </Typography>
                  {selectedJobList.some((j) => j.importer) && (
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#ffffff",
                      }}
                    >
                      Importer
                    </Typography>
                  )}
                  {selectedJobList.some((j) => j.shipping_line_airline) && (
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#ffffff",
                      }}
                    >
                      Shipping Line
                    </Typography>
                  )}
                  {selectedJobList.some(
                    (j) =>
                      j.container_number ||
                      (Array.isArray(j.container_nos) &&
                        j.container_nos.length > 0),
                  ) && (
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#ffffff",
                        }}
                      >
                        Container No
                      </Typography>
                    )}
                  {selectedJobList.some((j) => j.relevant_date) && (
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#ffffff",
                      }}
                    >
                      Date
                    </Typography>
                  )}
                </Box>

                {/* Scrollable Data Rows */}
                <Box
                  sx={{
                    maxHeight: 400,
                    overflowY: "auto",
                    "&::-webkit-scrollbar": { width: "6px" },
                    "&::-webkit-scrollbar-thumb": {
                      bgcolor: "#cbd5e1",
                      borderRadius: "3px",
                    },
                  }}
                >
                  {selectedJobList.map((job, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: `100px ${selectedJobList.some((j) => j.importer)
                          ? "1fr"
                          : "0px"
                          } ${selectedJobList.some((j) => j.shipping_line_airline)
                            ? "150px"
                            : "0px"
                          } ${selectedJobList.some(
                            (j) =>
                              j.container_number ||
                              (Array.isArray(j.container_nos) &&
                                j.container_nos.length > 0),
                          )
                            ? "150px"
                            : "0px"
                          } ${selectedJobList.some((j) => j.relevant_date)
                            ? "100px"
                            : "0px"
                          }`,
                        py: 1.5,
                        px: 2,
                        bgcolor: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                        "&:hover": { bgcolor: "#eff6ff" },
                        transition: "background-color 0.15s ease",
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: "#3b82f6",
                          fontSize: "0.875rem",
                        }}
                      >
                        {job.job_no || "-"}
                      </Typography>
                      {selectedJobList.some((j) => j.importer) && (
                        <Typography
                          sx={{
                            color: "#334155",
                            fontSize: "0.875rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            pr: 2,
                          }}
                        >
                          {job.importer || "-"}
                        </Typography>
                      )}
                      {selectedJobList.some((j) => j.shipping_line_airline) && (
                        <Typography
                          sx={{ color: "#334155", fontSize: "0.875rem" }}
                        >
                          {job.shipping_line_airline || "-"}
                        </Typography>
                      )}
                      {selectedJobList.some(
                        (j) =>
                          j.container_number ||
                          (Array.isArray(j.container_nos) &&
                            j.container_nos.length > 0),
                      ) && (
                          <Typography
                            sx={{
                              color: "#334155",
                              fontSize: "0.875rem",
                              fontFamily: "monospace",
                            }}
                          >
                            {job.container_number ||
                              (Array.isArray(job.container_nos)
                                ? job.container_nos.join(", ")
                                : "-")}
                          </Typography>
                        )}
                      {selectedJobList.some((j) => j.relevant_date) && (
                        <Typography
                          sx={{ color: "#334155", fontSize: "0.875rem" }}
                        >
                          {job.relevant_date
                            ? new Date(job.relevant_date).toLocaleDateString(
                              "en-GB",
                            )
                            : "-"}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No details available.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions
            sx={{ borderTop: "1px solid #e2e8f0", px: 3, py: 1.5 }}
          >
            <Button
              onClick={() => setJobListDialogOpen(false)}
              variant="outlined"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#e2e8f0",
                color: "#475569",
                "&:hover": {
                  borderColor: "#cbd5e1",
                  bgcolor: "#f8fafc",
                },
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog >
      </Box >
    </ThemeProvider >
  );
}

export default UserDashboard;
