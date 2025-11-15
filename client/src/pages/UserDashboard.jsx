import React, { useState, useEffect, useMemo } from "react";
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

// --- Styled Components ---

const StyledCard = styled(Card)(({ theme }) => ({
  height: "100%",
  minHeight: "180px",
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  transition: "all 0.3s ease",
  borderRadius: "16px",
  position: "relative",
  overflow: "visible",
  border: "1px solid #aaa4a4ff",
  backgroundColor: "#ffffff",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.1)",
    borderColor: theme.palette.warning.main,
  },
}));

const BetaBadge = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 12,
  right: 12,
  backgroundColor: "#E4A959",
  color: "white",
  fontSize: "0.65rem",
  fontWeight: "bold",
  padding: "2px 8px",
  borderRadius: "6px",
  letterSpacing: "0.5px",
  zIndex: 2,
}));

const IconContainer = styled(Box)(({ theme }) => ({
  width: "64px",
  height: "64px",
  borderRadius: "16px",
  backgroundColor: "#FFF8EC", // Light warm background
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: theme.spacing(2),
  fontSize: "32px", // Size for the Emoji
  lineHeight: 1,
  userSelect: "none",
}));

const WelcomeBanner = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3, 4),
  marginBottom: theme.spacing(4),
  borderRadius: "16px",
  background: "linear-gradient(90deg, #E8A249 0%, #C6A681 100%)",
  color: "#1a1a1a",
  boxShadow: "none",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

const IECodeCard = styled(Box)(({ theme }) => ({
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: theme.spacing(1.5, 2),
  minWidth: "240px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  borderLeft: "4px solid #E8A249",
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
      const token = localStorage.getItem("access_token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/users/current`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const userData = response.data.data.user;
        localStorage.setItem("exim_user", JSON.stringify(userData));
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

  // --- Updated Modules with Emojis ---
  const allModules = [
    {
      name: "Import DSR",
      description:
        "View and manage import daily status reports with real-time shipment tracking",
      path: "/importdsr",
      emoji: "📊", // Bar chart
      category: "core",
    },
    {
      name: "CostIQ",
      description:
        "Advanced freight cost calculator with per-kilogram pricing analysis",
      path: "/netpage",
      emoji: "💰", // Money bag
      category: "core",
    },
    {
      name: "E-Lock",
      description:
        "GPS-enabled electronic seal system for secure cargo transport verification",
      path: "http://elock-tracking.s3-website.ap-south-1.amazonaws.com/",
      emoji: "🔒", // Lock
      category: "core",
      isExternal: true,
    },
    {
      name: "SnapCheck",
      description:
        "AI-powered quality inspection system with automated defect detection",
      path: "http://snapcheckv1.s3-website.ap-south-1.amazonaws.com/",
      emoji: "📸", // Camera
      category: "beta",
      isExternal: true,
    },
    {
      name: "QR Locker",
      description:
        "Digital container management with QR code authentication for yards",
      path: "http://qrlocker.s3-website.ap-south-1.amazonaws.com/",
      emoji: "🔗", // Link/Chain
      category: "beta",
      isExternal: true,
    },
    {
      name: "Task Flow AI",
      description:
        "Intelligent workflow automation with hierarchical task assignment",
      path: "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com/",
      emoji: "⚡", // Lightning/Zap
      category: "core",
      isExternal: true,
    },
    {
      name: "Transporter Guide",
      description:
        "Comprehensive fleet management documentation with compliance guidelines",
      path: "/trademasterguide",
      emoji: "🚚", // Delivery Truck
      category: "core",
    },
    {
      name: "Export DSR",
      description:
        "Export shipment tracking and daily status reporting with logistics coordination",
      path: "/exportdsr",
      emoji: "📋", // Clipboard
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
      const token = localStorage.getItem("access_token");
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

  const eximUser = localStorage.getItem("exim_user");
  const parsedUser = userData;
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

  const expiringAeoCertificates = useMemo(() => {
    const today = new Date();
    return aeoCertificates.filter((cert) => {
      if (!cert.certificate_validity_date) return false;
      const validityDate = new Date(cert.certificate_validity_date);
      const daysUntilExpiry = Math.ceil(
        (validityDate - today) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
    });
  }, [aeoCertificates]);

  const expiredAeoCertificates = useMemo(() => {
    const today = new Date();
    return aeoCertificates.filter((cert) => {
      if (!cert.certificate_validity_date) return false;
      const validityDate = new Date(cert.certificate_validity_date);
      const daysUntilExpiry = Math.ceil(
        (validityDate - today) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 0;
    });
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
        let token = localStorage.getItem("access_token");
        if (!eximUser || !token) {
          navigate("/login");
          return;
        }
        const parsedUser = JSON.parse(eximUser);
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
          localStorage.setItem("sso_token", ssoToken);
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
      localStorage.removeItem("exim_user");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("sso_token");
      navigate("/login", { replace: true });
    } catch (error) {
      localStorage.removeItem("exim_user");
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
              <Typography variant="h4" fontWeight="700" sx={{ color: "#000" }}>
                Welcome back, {userName}
              </Typography>
              <Chip
                label="ACTIVE"
                sx={{
                  backgroundColor: "rgba(76, 175, 80, 0.2)",
                  color: "#1b5e20",
                  fontWeight: "bold",
                  borderRadius: "16px",
                  height: "28px",
                  border: "1px solid rgba(76, 175, 80, 0.3)",
                }}
              />
            </Box>

            <Box
              display="flex"
              gap={2}
              flexWrap="wrap"
              sx={{ mt: 1, width: "100%" }}
            >
                {ieCodeAssignments.map((assignment, index) => (
                    <Box
                      key={index}
                      display="flex"
                      flexDirection="column"
                      sx={{ mr: 2 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 400,
                          fontSize: "0.875rem",
                          color: "#000000ff",
                        }}
                      >
                        {assignment.ie_code_no
                          ? `IE Code: ${assignment.ie_code_no}`
                          : ""}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 400,
                          fontSize: "0.875rem",
                          color: "#000000ff",
                        }}
                      >
                        {assignment.importer_name
                          ? `Importer: ${assignment.importer_name}`
                          : ""}
                      </Typography>
                    </Box>
                  ))}
            </Box>
          </WelcomeBanner>

          {/* Alerts */}
          <Box sx={{ mb: 3 }}>
            {docAlertOpen &&
              (expiringDocs.length > 0 || expiredDocs.length > 0) && (
                <Alert
                  severity="warning"
                  onClose={() => setDocAlertOpen(false)}
                  onClick={() => navigate("/user/profile")}
                  sx={{ mb: 1, cursor: "pointer" }}
                >
                  Attention: You have documents expiring soon or expired.
                </Alert>
              )}
            {aeoAlertOpen &&
              (expiringAeoCertificates.length > 0 ||
                expiredAeoCertificates.length > 0) && (
                <Alert
                  severity="error"
                  onClose={() => setAeoAlertOpen(false)}
                  onClick={() => navigate("/user/profile")}
                  sx={{ cursor: "pointer" }}
                >
                  Attention: AEO Certificates expiring soon or expired.
                </Alert>
              )}
          </Box>

          {/* Modules Grid with Emojis */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 3,
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
                {(module.category === "beta" ||
                  module.name === "Import DSR" ||
                  module.name === "E-Lock" ||
                  module.name === "QR Locker") &&
                  module.category === "beta" && <BetaBadge>BETA</BetaBadge>}

                {module.isLocked && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      color: "#ef4444",
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
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "24px",
                  }}
                >
                  <IconContainer>
                    {/* Render Emoji or Fallback Icon (for Admin) */}
                    {module.emoji ? <span>{module.emoji}</span> : module.icon}
                  </IconContainer>

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
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
                      color: "#64748B",
                      fontSize: "0.8rem",
                      lineHeight: 1.5,
                      maxWidth: "90%",
                    }}
                  >
                    {module.isLocked
                      ? "Contact Admin for Access"
                      : module.description}
                  </Typography>
                </CardContent>
              </StyledCard>
            ))}
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
