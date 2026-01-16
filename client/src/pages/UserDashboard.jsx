import React, { useState, useEffect, useMemo } from "react";
import { Alert as AntAlert, Tag } from "antd";
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
} from "@mui/material";
import {
  Lock as LockIcon,
  Person as PersonIcon,
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
  minHeight: "170px",
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  transition: "all 0.2s ease",
  borderRadius: "12px",
  position: "relative",
  overflow: "hidden",
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
  padding: theme.spacing(3, 4),
  marginBottom: theme.spacing(3),
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

  const fetchAndUpdateUserData = async () => {
    try {
      const token = getCookie("access_token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/users/current`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
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
      path: "http://elock-tracking.s3-website.ap-south-1.amazonaws.com/",
      categoryLabel: "SECURITY & TRACKING",
      category: "core",
      isExternal: true,
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
      name: "Transporter Guide",
      description:
        "Comprehensive fleet management documentation with compliance guidelines",
      path: "/trademasterguide",
      categoryLabel: "FLEET MANAGEMENT",
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
        }
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
        { withCredentials: true }
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

  const eximUser = userData || getJsonCookie("exim_user");
  const parsedUser = userData || eximUser;
  const ieCodeAssignments = parsedUser?.ie_code_assignments || [];
  const userIeCode = parsedUser?.ie_code_assignments?.[0]?.ie_code_no || "";
  const userImporterName =
    parsedUser?.ie_code_assignments?.[0]?.importer_name || "";

  const expiringDocs = useMemo(() => {
    if (!parsedUser?.documents) return [];
    const today = new Date();
    return parsedUser.documents.filter((doc) => {
      if (!doc.expirationDate) return false;
      const expirationDate = new Date(doc.expirationDate);
      const daysUntilExpiration = Math.ceil(
        (expirationDate - today) / (1000 * 60 * 60 * 24)
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
        (expirationDate - today) / (1000 * 60 * 60 * 24)
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
          (validityDate - today) / (1000 * 60 * 60 * 24)
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
          (validityDate - today) / (1000 * 60 * 60 * 24)
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

  const handleCardClick = async (
    path,
    isExternal = false,
    isLocked = false,
    moduleName = ""
  ) => {
    if (isLocked) return;
    if (moduleName === "E-Lock") {
      try {
        let token = getCookie("access_token");
        if (!eximUser || !token) {
          navigate("/login");
          return;
        }
        const parsedUser = parsedUser || eximUser;
        let selectedIeCode = "";
        if (
          parsedUser?.ie_code_assignments &&
          parsedUser.ie_code_assignments.length > 0
        )
          selectedIeCode = parsedUser.ie_code_assignments[0].ie_code_no;
        else if (parsedUser?.ie_code_no) selectedIeCode = parsedUser.ie_code_no;
        else {
          alert("IE Code not found. Cannot generate SSO token.");
          return;
        }
        const res = await axios.post(
          `${
            process.env.REACT_APP_API_STRING
          }/users/generate-sso-token?ie_code_no=${encodeURIComponent(
            selectedIeCode
          )}`,
          {},
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const ssoToken = res.data?.data?.token;
        if (ssoToken) {
          setCookie("sso_token", ssoToken, 1);
          window.location.href = `http://elock-tracking.s3-website.ap-south-1.amazonaws.com/?token=${ssoToken}`;
        } else alert("Failed to generate SSO token for E-Lock.");
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
        else alert("Error generating SSO token for E-Lock.");
      }
      return;
    }
    if (isExternal && path && path.startsWith("http")) {
      window.open(path, "_blank");
      return;
    }
    if (path && path.startsWith("/")) {
      navigate(path);
      return;
    }
  };

  const handleLogout = async () => {
    try {
      const logoutData = {};
      if (dashboardData?.user?.id) logoutData.user_id = dashboardData.user.id;
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/users/logout`,
        logoutData,
        { withCredentials: true }
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
        { withCredentials: true }
      );
      if (response.data.success) {
        setModuleRequestDialog(false);
        setSelectedModule(null);
        setRequestReason("");
        fetchDashboardData();
      }
    } catch (error) {}
  };

  const userName = dashboardData?.user?.name || "User";
  const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

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
          height: "100vh",
          overflow: "hidden",
          backgroundColor: "#F8F9FB",
        }}
      >
        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflow: "auto",
            padding: { xs: 2, md: 4 },
            pb: 4,
          }}
        >
          {/* Welcome Banner */}
          <WelcomeBanner elevation={0}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography
                variant="h5"
                fontWeight="700"
                sx={{ color: "#1e293b" }}
              >
                Welcome back, {userName}
              </Typography>
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
            </Box>

            <Box
              display="flex"
              gap={3}
              flexWrap="wrap"
              sx={{ width: "100%" }}
            >
              {ieCodeAssignments.map((assignment, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{
                    fontWeight: 400,
                    fontSize: "0.875rem",
                    color: "#64748b",
                  }}
                >
                  {assignment.ie_code_no && (
                    <>
                      <strong style={{ color: "#475569" }}>IE Code:</strong> {assignment.ie_code_no}
                    </>
                  )}
                  {assignment.importer_name && (
                    <>
                      <span style={{ margin: "0 12px", color: "#cbd5e1" }}>|</span>
                      <strong style={{ color: "#475569" }}>Importer:</strong> {assignment.importer_name}
                    </>
                  )}
                </Typography>
              ))}
            </Box>
          </WelcomeBanner>

          {/* Alerts */}
          {/* Alerts Section */}
          <Box sx={{ mb: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Document Alert (Existing) */}
            {docAlertOpen &&
              (expiringDocs.length > 0 || expiredDocs.length > 0) && (
                <Alert
                  severity="warning"
                  onClose={() => setDocAlertOpen(false)}
                  onClick={() => navigate("/user/profile")}
                  sx={{
                    cursor: "pointer",
                    borderRadius: "12px",
                    border: "1px solid #ffd591",
                    boxShadow: "0 2px 8px rgba(250, 173, 20, 0.15)",
                    "& .MuiAlert-icon": {
                      fontSize: "24px",
                    },
                    "&:hover": {
                      boxShadow: "0 4px 12px rgba(250, 173, 20, 0.25)",
                    },
                  }}
                >
                  <Typography sx={{ fontWeight: 500 }}>
                    Attention: You have documents expiring soon or expired.
                  </Typography>
                </Alert>
              )}

            {/* AEO Alert (Updated) */}
            {aeoAlertOpen &&
              (expiringAeoCertificates.length > 0 ||
                expiredAeoCertificates.length > 0) && (
                <Alert
                  severity="error"
                  onClose={() => setAeoAlertOpen(false)}
                  onClick={() => navigate("/user/profile")}
                  sx={{
                    cursor: "pointer",
                    borderRadius: "12px",
                    border: "1px solid #ffccc7",
                    boxShadow: "0 2px 8px rgba(255, 77, 79, 0.15)",
                    "& .MuiAlert-icon": {
                      fontSize: "24px",
                    },
                    "&:hover": {
                      boxShadow: "0 4px 12px rgba(255, 77, 79, 0.25)",
                    },
                  }}
                >
                  <Typography sx={{ fontWeight: 500 }}>
                    Attention:{" "}
                    {expiredAeoCertificates.length > 0
                      ? `${expiredAeoCertificates.length} AEO Certificate(s) have expired.`
                      : `${expiringAeoCertificates.length} AEO Certificate(s) match your reminder settings.`}
                  </Typography>
                </Alert>
              )}
          </Box>

          {/* Main Content with Analytics Sidebar */}
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
            
            {/* Left Sidebar - Analytics */}
            <Box sx={{ width: { xs: '100%', lg: '280px' }, flexShrink: 0 }}>
              {/* Quick Stats Card */}
              <Paper elevation={0} sx={{ 
                p: 2.5, 
                mb: 2.5, 
                borderRadius: 3,
                border: '1px solid #e2e8f0',
              }}>
                <Typography variant="subtitle2" fontWeight={600} color="#1e293b" sx={{ mb: 2 }}>
                  📊 Quick Stats
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 2,
                    background: '#f0fdf4',
                  }}>
                    <Typography variant="body2" color="#166534">Active Modules</Typography>
                    <Typography variant="h6" fontWeight={700} color="#166534">
                      {modules.filter(m => !m.isLocked).length}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 2,
                    background: '#fef3c7',
                  }}>
                    <Typography variant="body2" color="#92400e">Pending Access</Typography>
                    <Typography variant="h6" fontWeight={700} color="#92400e">
                      {modules.filter(m => m.isLocked).length}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 2,
                    background: '#eff6ff',
                  }}>
                    <Typography variant="body2" color="#1e40af">IE Codes</Typography>
                    <Typography variant="h6" fontWeight={700} color="#1e40af">
                      {ieCodeAssignments?.length || 0}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* AEO Certificate Status */}
              <Paper elevation={0} sx={{ 
                p: 2.5, 
                mb: 2.5, 
                borderRadius: 3,
                border: '1px solid #e2e8f0',
              }}>
                <Typography variant="subtitle2" fontWeight={600} color="#1e293b" sx={{ mb: 2 }}>
                  🏆 AEO Certificate Status
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {expiringAeoCertificates.length > 0 || expiredAeoCertificates.length > 0 ? (
                    <>
                      {expiredAeoCertificates.length > 0 && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                        }}>
                          <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            background: '#ef4444' 
                          }} />
                          <Typography variant="body2" color="#dc2626">
                            {expiredAeoCertificates.length} Expired
                          </Typography>
                        </Box>
                      )}
                      {expiringAeoCertificates.length > 0 && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                        }}>
                          <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            background: '#f59e0b' 
                          }} />
                          <Typography variant="body2" color="#d97706">
                            {expiringAeoCertificates.length} Expiring Soon
                          </Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                    }}>
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        background: '#22c55e' 
                      }} />
                      <Typography variant="body2" color="#16a34a">
                        All certificates valid
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Document Status */}
              <Paper elevation={0} sx={{ 
                p: 2.5, 
                borderRadius: 3,
                border: '1px solid #e2e8f0',
              }}>
                <Typography variant="subtitle2" fontWeight={600} color="#1e293b" sx={{ mb: 2 }}>
                  📄 Document Status
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {(expiringDocs.length > 0 || expiredDocs.length > 0) ? (
                    <>
                      {expiredDocs.length > 0 && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1.5,
                          borderRadius: 2,
                          background: '#fef2f2',
                        }}>
                          <Typography variant="body2" color="#dc2626">Expired</Typography>
                          <Chip 
                            label={expiredDocs.length} 
                            size="small" 
                            sx={{ 
                              bgcolor: '#ef4444', 
                              color: 'white',
                              fontWeight: 600,
                              height: 24,
                            }} 
                          />
                        </Box>
                      )}
                      {expiringDocs.length > 0 && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1.5,
                          borderRadius: 2,
                          background: '#fffbeb',
                        }}>
                          <Typography variant="body2" color="#d97706">Expiring Soon</Typography>
                          <Chip 
                            label={expiringDocs.length} 
                            size="small" 
                            sx={{ 
                              bgcolor: '#f59e0b', 
                              color: 'white',
                              fontWeight: 600,
                              height: 24,
                            }} 
                          />
                        </Box>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" color="#64748b" sx={{ textAlign: 'center', py: 2 }}>
                      ✅ All documents up to date
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Box>

            {/* Right Side - Modules Grid */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight="600" sx={{ color: "#1e293b", mb: 2 }}>
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
                  gap: 2.5,
                  mb: 4,
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
                    module.name
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
                    padding: "20px",
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
      </Box>
    </ThemeProvider>
  );
}

export default UserDashboard;
