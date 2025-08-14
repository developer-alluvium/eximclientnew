import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Grid,
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
  Tooltip
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  MoreVert as MoreVertIcon,
  AccountCircle as AccountCircleIcon,
  AccessTime as AccessTimeIcon
} from "@mui/icons-material";

// Import module icons
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";

import { ThemeProvider, styled, alpha } from '@mui/material/styles';
import { modernTheme } from "../styles/modernTheme";
import { useNavigate } from "react-router-dom";
import { filterModulesByAccess, getUserAssignedModules } from "../utils/moduleAccess";
import { logActivity } from "../utils/activityLogger";
import axios from "axios";

// Styled components similar to HomePage
const StyledCard = styled(Card)(({ theme }) => ({
  height: "160px",
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
  }
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
  }
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
  }
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
  }
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
  }
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
  const navigate = useNavigate();

  // Define all modules similar to HomePage
  const allModules = [
    {
      name: "Import DSR",
      description: "View and manage import daily status reports and track shipments",
      path: "/importdsr",
      icon: <AssessmentOutlinedIcon />,
      category: "core"
    },
    {
      name: "CostIQ",
      description: "Calculate shipping costs per kilogram for better pricing decisions",
      path: "/netpage",
      icon: <CalculateOutlinedIcon />,
      category: "core"
    },
    {
      name: "SnapCheck",
      description: "Beta Version - Quality control and inspection management system",
      path: "http://snapcheckv1.s3-website.ap-south-1.amazonaws.com/",
      icon: <CameraAltOutlinedIcon />,
      category: "beta",
      isExternal: true
    },
    {
      name: "QR Locker",
      description: "Beta Version - Digital locker management with QR code integration",
      path: "http://qrlocker.s3-website.ap-south-1.amazonaws.com/",
      icon: <QrCodeScannerOutlinedIcon />,
      category: "beta",
      isExternal: true
    },
    {
      name: "Task Flow AI",
      description: "Task management system with organizational hierarchy",
      path:"http://task-flow-ai.s3-website.ap-south-1.amazonaws.com/",
      icon: <SecurityOutlinedIcon />,
      category: "core",
      isExternal: true
    },
    {
      name: "E-Lock",
      description: "E-Lock is a device used for secure transport of goods, ensuring tamper-proof delivery.",
      path: process.env.REACT_APP_ELOCK_URL,
      icon: <LockOutlinedIcon />,
      category: "core",
      isExternal: true
    },
    {
      name: "Intendor Management System",
      description: "Coming Soon -  Complete solution in material procurement and purchase indent.",
      path: "#",
      icon: <BusinessOutlinedIcon />,
      category: "coming-soon"
    },
    {
      name: "DocSure",
      description: "Coming Soon - Document management and verification platform",
      path: "#",
      icon: <DescriptionOutlinedIcon />,
      category: "coming-soon"
    },
    {
      name: "Trademaster Guide", 
      description: "Tutorials to master import and export procedures",
      path: "/trademasterguide", 
      icon : <VideocamOutlinedIcon />,
      category: "core"
    }
  ];

  // Format date and time
  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  useEffect(() => {
  useEffect(() => {
    fetchDashboardData();
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter modules based on user access (reactive to module changes)
  const modules = useMemo(() => {
    const userModules = getUserAssignedModules();
    const filteredModules = filterModulesByAccess(allModules);
    
    // Add admin module if user is admin
    if (dashboardData?.user?.role === "admin") {
      filteredModules.push({
        name: "Admin Panel",
        description: "Manage users, settings, and system configurations",
        path: "/admin",
        icon: <AdminPanelSettingsOutlinedIcon />,
        category: "admin",
        hasAccess: true,
        isLocked: false
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
      console.error("Dashboard fetch error:", error);
      setError("Failed to load dashboard data.");
      
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (path, isExternal = false, isLocked = false, moduleName = '') => {
    if (isLocked) {
      return;
    }

    if (moduleName === "E-Lock") {
      try {
        // Get user data from localStorage
        const eximUser = localStorage.getItem('exim_user');
        let token;
        
        if (eximUser) {
          try {
            const parsed = JSON.parse(eximUser);
            token = parsed.token || parsed.accessToken || parsed.jwt;
          } catch (e) {
            console.error('Error parsing user data:', e);
            navigate('/user/login');
            return;
          }
        }

        if (!token) {
          navigate('/user/login');
          return;
        }

        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/generate-sso-token`,
          {},
          {
            withCredentials: true,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const ssoToken = res.data?.data?.token;
        if (ssoToken) {
          localStorage.setItem('sso_token', ssoToken);
          const elockUrl = process.env.REACT_APP_ELOCK_URL || (process.env.NODE_ENV === "development"
            ? "http://localhost:3005"
            : "http://elock-tracking.s3-website.ap-south-1.amazonaws.com/");
          window.location.href = `${elockUrl}?token=${ssoToken}`;
        } else {
          alert("Failed to generate SSO token for E-Lock.");
        }
      } catch (err) {
        console.error('SSO token generation error:', err);
        
        if (err.response?.status === 401) {
          navigate('/user/login');
        } else {
          alert("Error generating SSO token for E-Lock.");
        }
      }
      return;
    }
    
    // Handle external links
    if (isExternal && path && path.startsWith('http')) {
      window.open(path, '_blank');
      return;
    }

    // Handle internal navigation
    if (path && path.startsWith('/')) {
      navigate(path);
      return;
    }

    // If path is '#' or invalid, do nothing
  };

  const handleLogout = async () => {
    try {
      // Log logout activity
      try {
        await logActivity({
          userId: dashboardData?.user?.id,
          activityType: 'logout',
          description: `User logged out from IE Code: ${dashboardData?.user?.ie_code_no || 'Unknown'}`,
          severity: 'low',
          metadata: {
            ieCode: dashboardData?.user?.ie_code_no,
            logoutTime: new Date().toISOString(),
            logoutMethod: 'manual',
            userAgent: navigator.userAgent
          }
        });
      } catch (logError) {
        console.error('Failed to log logout activity:', logError);
      }

      const logoutData = {};
      if (dashboardData?.user?.id) {
        logoutData.user_id = dashboardData.user.id;
      }

      await axios.post(
        `${process.env.REACT_APP_API_STRING}/users/logout`,
        logoutData,
        { withCredentials: true }
      );
      
      localStorage.removeItem("exim_user");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("sso_token");
      navigate("/user/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local storage and redirect even if API call fails
      localStorage.removeItem("exim_user");
      navigate("/user/login", { replace: true });
    }
  };

  const handleModuleRequest = async () => {
    if (!selectedModule || !requestReason.trim()) {
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/users/request-module-access`,
        {
          moduleKey: selectedModule.key,
          reason: requestReason
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setModuleRequestDialog(false);
        setSelectedModule(null);
        setRequestReason("");
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error("Module request error:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "success";
      case "pending": return "warning";
      case "inactive": return "error";
      default: return "default";
    }
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  // Get greeting and user info
  const hours = currentDateTime.getHours();
  let greeting = "Hi";
  
  const userName = dashboardData?.user?.name || "User";
  const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

  if (loading) {
    return (
      <ThemeProvider theme={modernTheme}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
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
        {/* Custom Header Bar */}
        <HeaderBar position="fixed">
          <Toolbar>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: '#1976d2' }}>
                EXIM User Portal
              </Typography>
            </Box>

            <DateTimeContainer>
              <AccessTimeIcon />
              <Box>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.2 }}>
                  {formattedTime}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  {formattedDate}
                </Typography>
              </Box>
            </DateTimeContainer>

            <IconButton
              size="large"
              color="inherit"
              onClick={(e) => setNotificationAnchor(e.currentTarget)}
            >
              <Badge badgeContent={dashboardData?.notifications?.length || 0} color="warning">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <UserMenu onClick={handleUserMenuOpen}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#1976d2', mr: 1 }}>
                {userInitial}
              </Avatar>
              <Typography variant="body2" sx={{ mr: 0.5, fontWeight: 500 }}>
                {userName}
              </Typography>
              <AccountCircleIcon />
            </UserMenu>
          </Toolbar>
        </HeaderBar>
        <Container>
          <Alert severity="error" sx={{ mt: 4 }}>
            {error}
          </Alert>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={modernTheme}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            EXIM User Dashboard
          </Typography>
          
          <IconButton
            color="inherit"
            onClick={(e) => setNotificationAnchor(e.currentTarget)}
          >
            <Badge badgeContent={dashboardData?.notifications?.length || 0} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <IconButton
            color="inherit"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <AccountCircleIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>
          <PersonIcon sx={{ mr: 2 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 2 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
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

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Welcome Section */}
        <Box mb={4}>
          <Typography variant="h4" gutterBottom>
            Welcome, {dashboardData?.user?.name}!
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body1" color="text.secondary">
              Status:
            </Typography>
            <Chip 
              label={dashboardData?.user?.status?.toUpperCase()} 
              color={getStatusColor(dashboardData?.user?.status)}
              size="small"
            />
            <Typography variant="body2" color="text.secondary">
              IE Code: {dashboardData?.user?.ie_code_no}
            </Typography>
          </Box>
        </Box>

        {/* Status Alert */}
        {dashboardData?.user?.status === "pending" && (
          <Alert severity="warning" sx={{ mb: 4 }}>
            Your account is pending verification. Please contact support for activation.
            Modules are currently locked until admin approval.
          </Alert>
        )}

        {/* Modules Grid */}
        <Typography variant="h5" gutterBottom>
          Available Modules
        </Typography>
        
        <Grid container spacing={3}>
          {dashboardData?.modules?.map((module) => (
            <Grid item xs={12} sm={6} md={4} key={module.key}>
              <Card 
                sx={{ 
                  height: '100%',
                  opacity: module.isEnabled && module.canAccess ? 1 : 0.6,
                  cursor: module.isEnabled && module.canAccess ? 'pointer' : 'not-allowed'
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6" component="div">
                      {module.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {module.isEnabled && module.canAccess ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <LockIcon color="disabled" />
                      )}
                      <Chip 
                        label={getModuleStatusText(module)}
                        color={getModuleStatusColor(module)}
                        size="small"
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {module.description}
                  </Typography>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Category: {module.category}
                    </Typography>
                    
                    {!module.isEnabled && dashboardData?.user?.status === "active" && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedModule(module);
                          setModuleRequestDialog(true);
                        }}
                      >
                        Request Access
                      </Button>
                    )}
                    
                    {module.isEnabled && module.canAccess && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          // Navigate to module
                          navigate(`/${module.key.replace('_', '')}`);
                        }}
                      >
                        Open
                      </Button>
                    )}
                  </Box>
                  
                  {module.lastAccessed && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Last accessed: {new Date(module.lastAccessed).toLocaleDateString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Module Request Dialog */}
      <Dialog 
        open={moduleRequestDialog} 
        onClose={() => setModuleRequestDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Request Access to {selectedModule?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Please provide a reason for requesting access to this module. 
            Your admin will review this request.
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
    </ThemeProvider>
  );
}

export default UserDashboard;
