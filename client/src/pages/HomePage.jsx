import React, { useState, useContext, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import { styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { filterModulesByAccess, getUserAssignedModules, onUserDataRefresh } from "../utils/moduleAccess";
import { logActivity } from "../utils/activityLogger";
import { useAutoLogout } from "../hooks/useAutoLogout";
import ModuleDebugger from "../components/ModuleDebugger";

// Import icons
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import "../styles/home.scss";
import {  alpha } from "@mui/material/styles";

const StyledCard = styled(Card)(({ theme }) => ({
  height: "160px", // Reduced height as requested
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  transition: "all 0.3s ease",
  borderRadius: "16px", // More rounded corners
  position: "relative",
  overflow: "hidden",
  border: "none", // Remove border
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
    backgroundColor: theme.palette.warning.main, // Orange accent
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
  minWidth: "48px", // Prevent shrinking
  minHeight: "48px", // Prevent shrinking
  borderRadius: "50%",
  backgroundColor: alpha(theme.palette.warning.main, 0.15),
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: theme.spacing(1.5),
  flexShrink: 0, // Prevent the container from shrinking
  aspectRatio: "1 / 1", // Ensure 1:1 aspect ratio
  "& svg": {
    fontSize: "24px", 
    color: theme.palette.warning.main,
  }
}));

const WelcomeBanner = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4.5, 4), // More vertical padding
  marginBottom: theme.spacing(4),
  borderRadius: "16px", // More rounded corners
  background: `linear-gradient(135deg, rgba(243, 163, 16, 0.94) 0%, #a0a0a0 100%)`,
  color: "white",
  boxShadow: "0 10px 20px rgba(0, 0, 0, 0.12)",
  position: "relative",
  overflow: "hidden",
  "&:before": { // Add subtle pattern overlay
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
    color: theme.palette.warning.main, // Orange icon
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

function HomePage() {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [jobCounts, setJobCounts] = useState([0, 0, 0, 0]); // [total, pending, completed, cancelled]
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedImporter, setSelectedImporter] = useState(null);
  const [moduleRefreshKey, setModuleRefreshKey] = useState(0); // Force re-render for module updates
  const open = Boolean(anchorEl);

  // Use auto-logout hook for enhanced session management
  const { handleLogout: autoLogout } = useAutoLogout('user');

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
  });   useEffect(() => {
      const userDataFromStorage = localStorage.getItem("exim_user");
    
      if (userDataFromStorage) {
        try {
          const parsedUser = JSON.parse(userDataFromStorage);
          
          // Set user in context if not already set
          if (!user && parsedUser) {
            setUser(parsedUser);
          }
          
          // Handle both old and new user data structures
          const userName = parsedUser?.name || parsedUser?.data?.user?.name;
          if (userName) {
            setSelectedImporter(userName);
            console.log("Selected importer:", userName);
          }
        } catch (e) {
          console.error("Error parsing user data from storage:", e);
        }
      }
    }, [user, setUser]);
  
  // Listen for user data refresh events to update module access
  useEffect(() => {
    const cleanup = onUserDataRefresh(() => {
      console.log('🔄 User data refreshed, updating module access...');
      setModuleRefreshKey(prev => prev + 1);
    });
    
    return cleanup;
  }, []);
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // This function will be called from the Sidebar component to update the job counts in HomePage
  const updateJobCounts = useCallback((counts) => {
    setJobCounts(counts);
    console.log("Job Counts:", counts);
  }, []);
  useEffect(() => {
    // Only redirect if we're sure there's no user data in localStorage
    const savedUser = localStorage.getItem("exim_user");
    if (!user && !savedUser) {
      navigate("/login"); // Redirect to login if user is not authenticated
    }
  }, [user, navigate]);

  const [tabValue, setTabValue] = useState(
    JSON.parse(localStorage.getItem("tab_value") || "0")
  );

  // Get user's assigned modules for access control
  const userAssignedModules = getUserAssignedModules();

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
      description: "Secure electronic document locking and verification",
      path: "#",
      icon: <LockOutlinedIcon />,
      category: "core"
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
  ];

  // Filter modules based on user access (reactive to module changes)
  const modules = useMemo(() => {
    const userModules = getUserAssignedModules();
    const filteredModules = filterModulesByAccess(allModules);
    
    // Add admin module if user is admin
    if (user?.role === "admin") {
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
  }, [moduleRefreshKey, user?.role]);

  const handleCardClick = async (path, isExternal = false, isLocked = false, moduleName = '') => {
    if (isLocked) {
      // Show a message or modal for locked modules
      return;
    }
    
    if (path === "#") {
      // Do nothing for coming soon modules
      return;
    }
    
    if (isExternal) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      // Log logout activity before calling logout API
      try {
        await logActivity({
          userId: user?.id,
          activityType: 'logout',
          description: `User logged out from IE Code: ${user?.ie_code_no || 'Unknown'}`,
          severity: 'low',
          metadata: {
            ieCode: user?.ie_code_no,
            logoutTime: new Date().toISOString(),
            logoutMethod: 'manual',
            userAgent: navigator.userAgent
          }
        });
      } catch (logError) {
        console.error('Failed to log logout activity:', logError);
      }

      // Call logout API with user ID for logout time tracking
      const logoutData = {};
      if (user?.id) {
        logoutData.user_id = user.id;
      }

      await axios.post(
        `${process.env.REACT_APP_API_STRING}/logout`,
        logoutData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      localStorage.removeItem("exim_user");
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Get the current date and user's name for greeting
  const currentDate = new Date();
  const hours = currentDate.getHours();
  let greeting;
  
  if (hours < 12) {
    greeting = "Hi";
  } else if (hours < 17) {
    greeting = "Hi";
  } else {
    greeting = "Hi";
  }
  
  const userName = selectedImporter || user?.name || "User";
  const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      
      {/* Custom Header Bar */}
      <Header
        formattedDate={formattedDate}
        formattedTime={formattedTime}
        userName={userName}
        userInitial={userInitial}
        anchorEl={anchorEl}
        open={open}
        handleUserMenuOpen={handleUserMenuOpen}
        handleUserMenuClose={handleUserMenuClose}
        handleLogout={handleLogout}
      />
      
      {/* Sidebar with job counts */}
      <Sidebar setParentJobCounts={updateJobCounts} initialJobCounts={jobCounts} />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - 280px)` },
          // backgroundColor: "#F9FAFB",
          height: "100vh",
          overflow: "auto",
          padding: "20px",
          paddingTop: 0,
          // marginLeft: { xs: 0, sm: '280px' }
        }}
      >
        <Toolbar />
        
        <Container maxWidth="lg" sx={{ mt: 2, px: { xs: 2, sm: 3, md: 4 } }}>
          {/* Welcome Banner */}
     <WelcomeBanner elevation={0}>
  <Box sx={{ position: 'relative', zIndex: 1 }}> {/* Container to ensure content is above pattern */}
    <Typography variant="h4" fontWeight="600" gutterBottom>
      {greeting}, {userName}
    </Typography>
    {/* <Typography 
      variant="subtitle1" 
      sx={{ 
        opacity: 0.9,
        maxWidth: '600px'
      }}
    >
      Welcome to EXIM Management System. Select a module below to get started.
    </Typography> */}
  </Box>
</WelcomeBanner>
          
          {/* Core Modules Section */}
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Import Management
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3, md: 4 } }}>
            {/* First row: Import DSR, CostIQ, SnapCheck */}
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 2, sm: 2.5, md: 3 }, 
              flexWrap: 'wrap',
              '& > *': { 
                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' },
                maxWidth: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' }
              }
            }}>
              {modules.filter(module => ["Import DSR", "CostIQ", "SnapCheck"].includes(module.name)).map((module, index) => (
                <StyledCard 
                  key={index}
                  onClick={() => handleCardClick(module.path, module.isExternal, module.isLocked, module.name)}
                  sx={{
                    ...(module.category === "beta" ? { 
                      "&:before": {
                        backgroundColor: "#ff9800" // Orange color for beta modules
                      }
                    } : {}),
                    ...(module.isLocked ? {
                      opacity: 0.6,
                      filter: "grayscale(50%)",
                      cursor: "not-allowed",
                      "&:hover": {
                        transform: "none",
                        boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
                      },
                      "&:before": {
                        backgroundColor: "#f44336" // Red color for locked modules
                      }
                    } : {})
                  }}
                >
                  <CardContent sx={{ 
                    height: "100%", 
                    display: "flex", 
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: { xs: "16px", sm: "20px", md: "24px" },
                    gap: 1,
                    position: "relative"
                  }}>
                    {module.isLocked && (
                      <Box sx={{ 
                        position: "absolute", 
                        top: 8, 
                        right: 8, 
                        backgroundColor: "error.main", 
                        borderRadius: "50%", 
                        p: 0.5,
                        minWidth: 24,
                        minHeight: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <LockOutlinedIcon sx={{ fontSize: 16, color: "white" }} />
                      </Box>
                    )}
                    
                    <IconContainer sx={{
                      ...(module.category === "beta" ? { backgroundColor: "rgba(255, 152, 0, 0.1)" } : {}),
                      ...(module.isLocked ? { backgroundColor: "rgba(244, 67, 54, 0.1)" } : {})
                    }}>
                      {module.category === "beta" ? 
                        React.cloneElement(module.icon, { 
                          sx: { 
                            color: module.isLocked ? "#f44336" : "#ff9800"
                          } 
                        }) : 
                        React.cloneElement(module.icon, { 
                          sx: { 
                            color: module.isLocked ? "#f44336" : undefined
                          } 
                        })
                      }
                    </IconContainer>
                    
                    <Typography 
                      variant="subtitle1" 
                      fontWeight="500" 
                      gutterBottom
                      sx={{ 
                        color: module.isLocked ? "#666" : '#424242', 
                        fontSize: '16px' 
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
                        fontSize: "13px"
                      }}
                    >
                      {module.isLocked ? "Contact Admin for Access" : module.description}
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
            
            {/* Second row: QR Locker, Task Flow AI, E-Lock */}
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 2, sm: 2.5, md: 3 }, 
              flexWrap: 'wrap',
              '& > *': { 
                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' },
                maxWidth: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' }
              }
            }}>
              {modules.filter(module => ["QR Locker", "Task Flow AI", "E-Lock"].includes(module.name)).map((module, index) => (
                <StyledCard 
                  key={`second-row-${index}`}
                  onClick={() => handleCardClick(module.path, module.isExternal, module.isLocked, module.name)}
                  sx={{
                    ...(module.category === "beta" ? { 
                      "&:before": {
                        backgroundColor: "#ff9800" // Orange color for beta modules
                      }
                    } : {}),
                    ...(module.category === "coming-soon" ? {
                      opacity: 0.7,
                      cursor: "not-allowed",
                      "&:hover": {
                        transform: "none",
                        boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
                      },
                      "&:before": {
                        backgroundColor: "#9e9e9e" // Gray color for coming soon modules
                      }
                    } : {}),
                    ...(module.isLocked ? {
                      opacity: 0.6,
                      filter: "grayscale(50%)",
                      cursor: "not-allowed",
                      "&:hover": {
                        transform: "none",
                        boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
                      },
                      "&:before": {
                        backgroundColor: "#f44336" // Red color for locked modules
                      }
                    } : {})
                  }}
                >
                  <CardContent sx={{ 
                    height: "100%", 
                    display: "flex", 
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: { xs: "16px", sm: "20px", md: "24px" },
                    gap: 1,
                    position: "relative"
                  }}>
                    {module.isLocked && (
                      <Box sx={{ 
                        position: "absolute", 
                        top: 8, 
                        right: 8, 
                        backgroundColor: "error.main", 
                        borderRadius: "50%", 
                        p: 0.5,
                        minWidth: 24,
                        minHeight: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <LockOutlinedIcon sx={{ fontSize: 16, color: "white" }} />
                      </Box>
                    )}
                    
                    <IconContainer sx={{
                      ...(module.category === "beta" ? 
                        { backgroundColor: "rgba(255, 152, 0, 0.1)" } : 
                      module.category === "coming-soon" ? 
                        { backgroundColor: "rgba(158, 158, 158, 0.1)" } : 
                        {}),
                      ...(module.isLocked ? { backgroundColor: "rgba(244, 67, 54, 0.1)" } : {})
                    }}>
                      {module.category === "beta" ?
                        React.cloneElement(module.icon, { 
                          sx: { 
                            color: module.isLocked ? "#f44336" : "#ff9800"
                          } 
                        }) :
                       module.category === "coming-soon" ?
                        React.cloneElement(module.icon, { 
                          sx: { 
                            color: module.isLocked ? "#f44336" : "#9e9e9e"
                          } 
                        }) :
                        React.cloneElement(module.icon, { 
                          sx: { 
                            color: module.isLocked ? "#f44336" : undefined
                          } 
                        })
                      }
                    </IconContainer>
                    
                    <Typography 
                      variant="subtitle1" 
                      fontWeight="500" 
                      gutterBottom
                      sx={{ 
                        color: module.isLocked ? "#666" : '#424242', 
                        fontSize: '16px' 
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
                        fontSize: "13px"
                      }}
                    >
                      {module.isLocked ? "Contact Admin for Access" : module.description}
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
            
            {/* Third row: Intendor Management System, DocSure */}
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 2, sm: 2.5, md: 3 }, 
              flexWrap: 'wrap',
              '& > *': { 
                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' },
                maxWidth: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' }
              }
            }}>
              {modules.filter(module => ["Intendor Management System", "DocSure"].includes(module.name)).map((module, index) => (
                <StyledCard 
                  key={`third-row-${index}`}
                  onClick={() => handleCardClick(module.path, module.isExternal, module.isLocked, module.name)}
                  sx={{
                    ...(module.category === "coming-soon" ? {
                      opacity: 0.7,
                      cursor: "not-allowed",
                      "&:hover": {
                        transform: "none",
                        boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
                      },
                      "&:before": {
                        backgroundColor: "#9e9e9e" // Gray color for coming soon modules
                      }
                    } : {}),
                    ...(module.isLocked ? {
                      opacity: 0.6,
                      filter: "grayscale(50%)",
                      cursor: "not-allowed",
                      "&:hover": {
                        transform: "none",
                        boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
                      },
                      "&:before": {
                        backgroundColor: "#f44336" // Red color for locked modules
                      }
                    } : {})
                  }}
                >
                  <CardContent sx={{ 
                    height: "100%", 
                    display: "flex", 
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: { xs: "16px", sm: "20px", md: "24px" },
                    gap: 1,
                    position: "relative"
                  }}>
                    {module.isLocked && (
                      <Box sx={{ 
                        position: "absolute", 
                        top: 8, 
                        right: 8, 
                        backgroundColor: "error.main", 
                        borderRadius: "50%", 
                        p: 0.5,
                        minWidth: 24,
                        minHeight: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <LockOutlinedIcon sx={{ fontSize: 16, color: "white" }} />
                      </Box>
                    )}
                    
                    <IconContainer sx={{
                      ...(module.category === "coming-soon" ? 
                        { backgroundColor: "rgba(158, 158, 158, 0.1)" } : 
                        {}),
                      ...(module.isLocked ? { backgroundColor: "rgba(244, 67, 54, 0.1)" } : {})
                    }}>
                      {module.category === "coming-soon" ?
                        React.cloneElement(module.icon, { 
                          sx: { 
                            color: module.isLocked ? "#f44336" : "#9e9e9e"
                          } 
                        }) :
                        React.cloneElement(module.icon, { 
                          sx: { 
                            color: module.isLocked ? "#f44336" : undefined
                          } 
                        })
                      }
                    </IconContainer>
                    
                    <Typography 
                      variant="subtitle1" 
                      fontWeight="500" 
                      gutterBottom
                      sx={{ 
                        color: module.isLocked ? "#666" : '#424242', 
                        fontSize: '16px' 
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
                        fontSize: "13px"
                      }}
                    >
                      {module.isLocked ? "Contact Admin for Access" : module.description}
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
          </Box>
          
          {/* Admin Section (Conditionally rendered) */}
          {user?.role === "admin" && (
            <>
              {/* <Divider sx={{ my: 4 }} /> */}
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                Administration
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 2, sm: 2.5, md: 3 }, 
                flexWrap: 'wrap',
                '& > *': { 
                  flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' },
                  maxWidth: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' }
                }
              }}>
                {modules.filter(module => module.category === "admin").map((module, index) => (
                  <StyledCard 
                    key={index}
                    onClick={() => handleCardClick(module.path, module.isExternal, module.isLocked, module.name)}
                    sx={{ 
                      ...(module.isLocked ? {
                        opacity: 0.6,
                        filter: "grayscale(50%)",
                        cursor: "not-allowed",
                        "&:hover": {
                          transform: "none",
                          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
                        },
                        "&:before": {
                          backgroundColor: "#f44336" // Red color for locked modules
                        }
                      } : {
                        "&:before": {
                          backgroundColor: "#d32f2f" // Different color for admin modules
                        }
                      })
                    }}
                  >
                    <CardContent sx={{ 
                      height: "100%", 
                      display: "flex", 
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: { xs: "16px", sm: "20px", md: "24px" },
                      gap: 1,
                      position: "relative"
                    }}>
                      {module.isLocked && (
                        <Box sx={{ 
                          position: "absolute", 
                          top: 8, 
                          right: 8, 
                          backgroundColor: "error.main", 
                          borderRadius: "50%", 
                          p: 0.5,
                          minWidth: 24,
                          minHeight: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <LockOutlinedIcon sx={{ fontSize: 16, color: "white" }} />
                        </Box>
                      )}
                      
                      <IconContainer sx={{ 
                        backgroundColor: module.isLocked ? "rgba(244, 67, 54, 0.1)" : "rgba(211, 47, 47, 0.1)" 
                      }}>
                        <AdminPanelSettingsOutlinedIcon sx={{ 
                          color: module.isLocked ? "#f44336" : "#d32f2f" 
                        }} />
                      </IconContainer>
                      
                      <Typography 
                        variant="h6" 
                        component="div" 
                        fontWeight="500" 
                        gutterBottom
                        sx={{ 
                          color: module.isLocked ? "#666" : undefined 
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
                          fontSize: "13px"
                        }}
                      >
                        {module.isLocked ? "Contact Admin for Access" : module.description}
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
              
              {/* Debug Component - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <ModuleDebugger />
              )}
            </>
          )}
        </Container>
      </Box>
    </Box>
  );
}

export default HomePage;