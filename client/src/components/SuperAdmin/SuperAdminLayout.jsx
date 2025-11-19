import React, { useState, useContext, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Box, ThemeProvider, Alert } from "@mui/material";
import { UserContext } from "../../context/UserContext";
import { getJsonCookie, removeCookie, getCookie } from "../../utils/cookies";
import { useSuperAdminApi } from "../../hooks/useSuperAdminApi";

// Import modern theme and components
import { modernTheme } from "../../styles/modernTheme";
import ModernSidebar from "./ModernSidebar";
import LoadingScreen from "../LoadingScreen.jsx";

const SuperAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useContext(UserContext);

  // Use custom hook for API calls
  const { loading, error, setError, getDashboardAnalytics, getUserActivity } =
    useSuperAdminApi();

  // Sidebar state management
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Tab configuration
  const tabs = [
    { label: "Overview", icon: "dashboard", component: "overview" },
    { label: "Customer Management", icon: "people", component: "customers" },
    { label: "Module Management", icon: "settings", component: "modules" },
    // { label: 'Column Permissions', icon: 'visibility', component: 'columns' },
    // { label: 'System Analytics', icon: 'analytics', component: 'analytics' },
    // { label: 'User Activity', icon: 'timeline', component: 'activity' },
    // { label: 'Session Manager', icon: 'security', component: 'sessions' }
  ];

  // Authentication check
  useEffect(() => {
    const checkSuperAdminAuth = () => {
      const token = getCookie("superadmin_token");
      const user = getJsonCookie("superadmin_user");

      if (!token || !user) {
        navigate("/login");
        return;
      }

      setIsAuthenticating(false);
      fetchDashboardData();
    };

    checkSuperAdminAuth();
  }, [navigate]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const [analyticsData, activityData] = await Promise.all([
        getDashboardAnalytics(),
        getUserActivity("active", 5),
      ]);

      setDashboardData(analyticsData.data);
      setUserActivity(activityData.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
      } else {
        setError("Failed to load dashboard data");
      }
    }
  };

  // Handle navigation state for active tab
  useEffect(() => {
    if (location.state?.activeTab !== undefined) {
      setActiveTab(location.state.activeTab);
      // Clear the state to avoid issues with browser back/forward
      window.history.replaceState({}, "", location.pathname);
    }
  }, [location.state]);

  // Set active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === "/superadmin-dashboard") {
      // Don't change activeTab if it's already set by navigation state
      if (location.state?.activeTab === undefined) {
        setActiveTab(0); // Default to overview
      }
    } else if (path.includes("/customer/")) {
      setActiveTab(1); // Customer Management
    } else if (path.includes("/module")) {
      setActiveTab(2); // Module Management
    } else if (path.includes("/analytics")) {
      setActiveTab(4); // Analytics
    } else if (path.includes("/activity")) {
      setActiveTab(5); // Activity
    } else if (path.includes("/sessions")) {
      setActiveTab(5); // Sessions
    }
  }, [location.pathname]);

  // Handle navigation state for active tab (from navigation)
  useEffect(() => {
    if (location.state?.activeTab !== undefined) {
      setActiveTab(location.state.activeTab);
      // Clear the state to avoid issues with browser back/forward
      window.history.replaceState({}, "", location.pathname);
    }
  }, [location.state]);

  // Handle tab changes
  const handleTabChange = (tabIndex) => {
    setActiveTab(tabIndex);

    // Navigate to appropriate route
    switch (tabIndex) {
      case 0:
        navigate("/superadmin-dashboard");
        break;
      case 1:
        navigate("/superadmin-dashboard"); // Will show customer management
        break;
      case 2:
        navigate("/superadmin-dashboard"); // Will show module management
        break;
      case 3:
        navigate("/superadmin-dashboard"); // Will show analytics
        break;
      case 4:
        navigate("/superadmin-dashboard"); // Will show activity
        break;
      case 5:
        navigate("/superadmin-dashboard"); // Will show sessions
        break;
      default:
        navigate("/superadmin-dashboard");
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Get SuperAdmin user data from cookies (JSON cookie)
      const superAdminUser = getJsonCookie("superadmin_user");

      if (superAdminUser) {
        try {
          // Call logout API to update logout time
          await fetch(`${process.env.REACT_APP_API_STRING}/superadmin/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: superAdminUser.id }),
          });
        } catch (error) {
          console.error("Error calling SuperAdmin logout API:", error);
        }
      }

      // Clear cookies and redirect
      removeCookie("superadmin_token");
      removeCookie("superadmin_user");
      removeCookie("user_access_token");
      navigate("/login");
    } catch (error) {
      console.error("Error during SuperAdmin logout:", error);
      // Still clear localStorage and redirect even if API call fails
      removeCookie("superadmin_token");
      removeCookie("superadmin_user");
      navigate("/login");
    }
  };

  // Loading screen
  if (isAuthenticating) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider theme={modernTheme}>
      {/* Modern Sidebar - Single instance */}
      <ModernSidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={tabs}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          ml: {
            xs: 0,
            md: sidebarCollapsed ? "64px" : "240px",
          },
          transition: "margin-left 0.2s ease",
          width: {
            xs: "100%",
            md: `calc(100% - ${sidebarCollapsed ? "64px" : "240px"})`,
          },
          overflow: "hidden",
        }}
      >
        {/* Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 3 },
            backgroundColor: "#F8FAFC",
            minHeight: "100vh",
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
          }}
        >
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                border: "1px solid #FEE2E2",
                backgroundColor: "#FEF2F2",
                color: "#DC2626",
              }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* This is where child routes will render */}
          <Outlet
            context={{
              dashboardData,
              userActivity,
              fetchDashboardData,
              loading,
              activeTab,
              setActiveTab,
              error,
              setError,
            }}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default SuperAdminLayout;
