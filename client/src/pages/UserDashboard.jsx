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
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Avatar,
} from "@mui/material";
import {
  Lock as LockIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  AccessTime as AccessTimeIcon,
  ManageAccounts as ManageAccountsIcon,
} from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";

import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";

import { ThemeProvider, styled, alpha } from "@mui/material/styles";
import { modernTheme } from "../styles/modernTheme";

import {
  filterModulesByAccess,
  getUserAssignedModules,
} from "../utils/moduleAccess";
import { logActivity } from "../utils/activityLogger";
import axios from "axios";

const StyledCard = styled(Card)(({ theme }) => ({
  height: "180px",
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  transition: "all 0.3s ease",
  borderRadius: "16px",
  position: "relative",
  overflow: "hidden",
  border: "none",
  boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: "0 14px 26px rgba(0, 0, 0, 0.12)",
  },
  "&:before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    width: "5px",
    height: "100%",
    backgroundColor: theme.palette.warning.main,
    opacity: 0,
    transition: "opacity 0.3s",
  },
  "&:hover:before": {
    opacity: 1,
  },
}));

const IconContainer = styled(Box)(({ theme }) => ({
  width: "48px",
  height: "48px",
  minWidth: "48px",
  minHeight: "48px",
  borderRadius: "50%",
  backgroundColor: alpha(theme.palette.warning.main, 0.15),
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: theme.spacing(1.5),
  flexShrink: 0,
  aspectRatio: "1 / 1",
  "& svg": {
    fontSize: "24px",
    color: theme.palette.warning.main,
  },
}));

const WelcomeBanner = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4.5, 4),
  marginBottom: theme.spacing(4),
  borderRadius: "16px",
  background: `linear-gradient(135deg, rgba(243, 163, 16, 0.94) 0%, #a0a0a0 100%)`,
  color: "white",
  boxShadow: "0 10px 20px rgba(0, 0, 0, 0.12)",
  position: "relative",
  overflow: "hidden",
  "&:before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.08' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    opacity: 0.4,
  },
}));

const HeaderBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "#fff",
  color: theme.palette.text.primary,
  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
  position: "fixed",
  zIndex: theme.zIndex.drawer + 1,
}));

const DateTimeContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0.7, 2.5),
  borderRadius: "24px",
  backgroundColor: alpha(theme.palette.grey[100], 0.8),
  marginRight: theme.spacing(2),
  "& svg": {
    marginRight: theme.spacing(1),
    color: theme.palette.warning.main,
  },
}));

const UserMenu = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  padding: theme.spacing(0.6, 1.2),
  borderRadius: "24px",
  transition: "background-color 0.2s ease",
  "&:hover": {
    backgroundColor: alpha(theme.palette.grey[100], 0.8),
  },
}));

function UserDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [moduleRequestDialog, setModuleRequestDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [requestReason, setRequestReason] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [alertOpen, setAlertOpen] = useState(true);
  const navigate = useNavigate();
  const [docAlertOpen, setDocAlertOpen] = useState(true);
  const allModules = [
    {
      name: "Import DSR",
      description:
        "View and manage import daily status reports and track shipments",
      path: "/importdsr",
      icon: <AssessmentOutlinedIcon />,
      category: "core",
    },
    {
      name: "CostIQ",
      description:
        "Calculate shipping costs per kilogram for better pricing decisions",
      path: "/netpage",
      icon: <CalculateOutlinedIcon />,
      category: "core",
    },
    {
      name: "E-Lock",
      description:
        "E-Lock is a device used for secure transport of goods, ensuring tamper-proof delivery.",
      // path: "http://localhost:3005/",
      path: "http://elock-tracking.s3-website.ap-south-1.amazonaws.com/",
      icon: <LockOutlinedIcon />,
      category: "core",
      isExternal: true,
    },
    {
      name: "SnapCheck",
      description:
        "Beta Version - Quality control and inspection management system",
      path: "http://snapcheckv1.s3-website.ap-south-1.amazonaws.com/",
      icon: <CameraAltOutlinedIcon />,
      category: "beta",
      isExternal: true,
    },
    {
      name: "QR Locker",
      description:
        "Beta Version - Digital locker management with QR code integration",
      path: "http://qrlocker.s3-website.ap-south-1.amazonaws.com/",
      icon: <QrCodeScannerOutlinedIcon />,
      category: "beta",
      isExternal: true,
    },
    {
      name: "Task Flow AI",
      description: "Task management system with organizational hierarchy",
      path: "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com/",
      icon: <SecurityOutlinedIcon />,
      category: "core",
      isExternal: true,
    },
    {
      name: "Trademaster Guide",
      description: "Tutorials to master import and export procedures",
      path: "/trademasterguide",
      icon: <VideocamOutlinedIcon />,
      category: "core",
    },
  ];

  const formattedDate = currentDateTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setCurrentDateTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const modules = useMemo(() => {
    const filteredModules = filterModulesByAccess(allModules);
    if (dashboardData?.user?.role === "admin") {
      filteredModules.push({
        name: "Admin Panel",
        description: "Manage users, settings, and system configurations",
        path: "/admin",
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
  const parsedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("exim_user"));
    } catch {
      return null;
    }
  }, []);

  const ieCodeAssignments = parsedUser?.ie_code_assignments || [];
  const userIeCode = parsedUser?.ie_code_assignments?.[0]?.ie_code_no || "";
  const userImporterName =
    parsedUser?.ie_code_assignments?.[0]?.importer_name || "";

  // --- DOCUMENT EXPIRY CHECK LOGIC STARTS HERE ---
  const expiringDocs = useMemo(() => {
    if (!parsedUser?.documents) return [];
    const today = new Date();
    return parsedUser.documents.filter((doc) => {
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
      const expirationDate = new Date(doc.expirationDate);
      const daysUntilExpiration = Math.ceil(
        (expirationDate - today) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiration <= 0;
    });
  }, [parsedUser?.documents]);
  // --- DOCUMENT EXPIRY CHECK LOGIC ENDS HERE ---

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
          // const elockUrl = "http://localhost:3005/";
          const elockUrl =
            "http://elock-tracking.s3-website.ap-south-1.amazonaws.com/";
          window.location.href = `${elockUrl}?token=${ssoToken}`;
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

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "inactive":
        return "error";
      default:
        return "default";
    }
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const hours = currentDateTime.getHours();
  let greeting = "Hi";
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
      <Box sx={{ flexGrow: 1 }}>
        <HeaderBar position="fixed">
          <Toolbar>
            <Box
              component="img"
              src={require("../../src/assets/images/logo.webp")}
              alt="EXIM User Portal"
              sx={{
                height: 40,
                width: "auto",
                display: "block",
                mr: 2,
                objectFit: "contain",
              }}
            />
            <Box
              sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}
            ></Box>
            <DateTimeContainer>
              <AccessTimeIcon />
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontSize: "0.875rem", lineHeight: 1.2 }}
                >
                  {formattedTime}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.75rem", opacity: 0.8 }}
                >
                  {formattedDate}
                </Typography>
              </Box>
            </DateTimeContainer>
            <UserMenu onClick={handleUserMenuOpen}>
              <Typography variant="body2" sx={{ mr: 0.5, fontWeight: 500 }}>
                {userName}
              </Typography>
              <AccountCircleIcon />
            </UserMenu>
          </Toolbar>
        </HeaderBar>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleUserMenuClose}
          PaperProps={{
            elevation: 3,
            sx: { mt: 1.5, minWidth: 180, borderRadius: 2 },
          }}
        >
          <MenuItem onClick={() => navigate("/user/profile")}>
            <PersonIcon sx={{ mr: 2 }} />
            Profile
          </MenuItem>
          {JSON.parse(eximUser || "{}")?.role === "admin" && (
            <MenuItem onClick={() => navigate("/user-management")}>
              <ManageAccountsIcon sx={{ mr: 2 }} />
              Users Management
            </MenuItem>
          )}
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 2 }} />
            Logout
          </MenuItem>
        </Menu>

        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={() => setNotificationAnchor(null)}
        >
          {dashboardData?.notifications?.length > 0 ? (
            dashboardData.notifications.map((notification, index) => (
              <MenuItem key={index} onClick={() => setNotificationAnchor(null)}>
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    {notification.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {notification.message}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          ) : (
            <MenuItem>
              <Typography variant="body2" color="text.secondary">
                No new notifications
              </Typography>
            </MenuItem>
          )}
        </Menu>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            backgroundColor: "#F9FAFB",
            minHeight: "100vh",
            paddingTop: "80px",
            padding: "20px",
          }}
        >
          <Container maxWidth="xl" sx={{ mt: 7, px: { xs: 2, sm: 3, md: 4 } }}>
            <WelcomeBanner elevation={0}>
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Typography variant="h4" fontWeight="600" gutterBottom>
                  {greeting}, {userName}!
                </Typography>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={2}
                  sx={{ mt: 2, flexWrap: "wrap" }}
                >
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Status:
                  </Typography>
                  <Chip
                    label={dashboardData?.user?.status?.toUpperCase()}
                    color={getStatusColor(dashboardData?.user?.status)}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "white",
                    }}
                  />

                  {/* Render all IE code assignments */}
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
              </Box>
            </WelcomeBanner>

            {/* ALERT FOR EXPIRED OR SOON EXPIRING DOCUMENTS */}
            {docAlertOpen &&
              (expiringDocs.length > 0 || expiredDocs.length > 0) && (
                <Alert
                  severity="warning"
                  sx={{ mb: 3, cursor: "pointer" }}
                  onClick={() => navigate("/user/profile")}
                  action={
                    <IconButton
                      aria-label="close"
                      color="inherit"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation(); // prevent alert click from navigating
                        setDocAlertOpen(false);
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  {expiredDocs.length > 0 && (
                    <span>
                      The following documents have <strong>expired</strong>:{" "}
                      {expiredDocs
                        .map(
                          (doc) =>
                            `${doc.title} (expired on ${new Date(
                              doc.expirationDate
                            ).toLocaleDateString()})`
                        )
                        .join(", ")}
                      <br />
                    </span>
                  )}
                  {expiringDocs.length > 0 && (
                    <span>
                      The following documents are <strong>expiring soon</strong>
                      :{" "}
                      {expiringDocs
                        .filter((doc) => !expiredDocs.includes(doc))
                        .map(
                          (doc) =>
                            `${doc.title} (expires on ${new Date(
                              doc.expirationDate
                            ).toLocaleDateString()})`
                        )
                        .join(", ")}
                    </span>
                  )}
                </Alert>
              )}

            {dashboardData?.user?.status === "pending" && (
              <Alert severity="warning" sx={{ mb: 4 }}>
                Your account is pending verification. Please contact support for
                activation. Modules are currently locked until admin approval.
              </Alert>
            )}

            <Typography
              variant="h5"
              sx={{ mb: 3, fontWeight: 600, color: "#2c3e50" }}
            >
              Available Modules
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
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
                    ...(module.category === "beta"
                      ? {
                          "&:before": { backgroundColor: "#ff9800" },
                        }
                      : {}),
                    ...(module.category === "coming-soon"
                      ? {
                          opacity: 0.7,
                          cursor: "not-allowed",
                          "&:hover": {
                            transform: "none",
                            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
                          },
                          "&:before": { backgroundColor: "#9e9e9e" },
                        }
                      : {}),
                    ...(module.isLocked
                      ? {
                          opacity: 0.6,
                          filter: "grayscale(50%)",
                          cursor: "not-allowed",
                          "&:hover": {
                            transform: "none",
                            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
                          },
                          "&:before": { backgroundColor: "#f44336" },
                        }
                      : {}),
                  }}
                >
                  <CardContent
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: "24px",
                      position: "relative",
                    }}
                  >
                    {module.isLocked && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          backgroundColor: "error.main",
                          borderRadius: "50%",
                          p: 0.5,
                          minWidth: 28,
                          minHeight: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <LockOutlinedIcon
                          sx={{ fontSize: 18, color: "white" }}
                        />
                      </Box>
                    )}
                    <IconContainer
                      sx={{
                        width: "48px",
                        height: "48px",
                        ...(module.category === "beta"
                          ? { backgroundColor: "rgba(255, 152, 0, 0.1)" }
                          : module.category === "coming-soon"
                          ? { backgroundColor: "rgba(158, 158, 158, 0.1)" }
                          : {}),
                        ...(module.isLocked
                          ? { backgroundColor: "rgba(244, 67, 54, 0.1)" }
                          : {}),
                      }}
                    >
                      {module.category === "beta"
                        ? React.cloneElement(module.icon, {
                            sx: {
                              fontSize: "24px",
                              color: module.isLocked ? "#f44336" : "#ff9800",
                            },
                          })
                        : module.category === "coming-soon"
                        ? React.cloneElement(module.icon, {
                            sx: {
                              fontSize: "24px",
                              color: module.isLocked ? "#f44336" : "#9e9e9e",
                            },
                          })
                        : React.cloneElement(module.icon, {
                            sx: {
                              fontSize: "24px",
                              color: module.isLocked ? "#f44336" : undefined,
                            },
                          })}
                    </IconContainer>
                    <Typography
                      variant="h6"
                      fontWeight="500"
                      sx={{
                        color: module.isLocked ? "#666" : "#2c3e50",
                        fontSize: "16px",
                        lineHeight: 1.3,
                        mb: 1,
                      }}
                    >
                      {module.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        maxWidth: "90%",
                        mx: "auto",
                        lineHeight: 1.4,
                        fontSize: "13px",
                      }}
                    >
                      {module.isLocked
                        ? "Contact Admin for Access"
                        : module.description}
                    </Typography>
                    {module.isLocked && (
                      <Chip
                        size="small"
                        label="Access Restricted"
                        color="error"
                        sx={{ mt: 1, fontSize: "0.7rem" }}
                      />
                    )}
                  </CardContent>
                </StyledCard>
              ))}
            </Box>
          </Container>
        </Box>

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
              placeholder="Explain why you need access to this module..."
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
