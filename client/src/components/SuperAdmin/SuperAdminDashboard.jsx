import React, { useState, useContext, useEffect } from "react";
import { Box, Container, useTheme, alpha, Alert, ThemeProvider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { validateSuperAdminToken } from "../../utils/tokenValidation";
import { useAutoLogout } from "../../hooks/useAutoLogout";

// Import modern theme
import { modernTheme } from "../../styles/modernTheme";

// Import dashboard components
import ModernSidebar from './ModernSidebar';
import ModernDashboardOverview from './ModernDashboardOverview';
import ModernCustomerManagement from './ModernCustomerManagement';
import ModuleManagement from './ModuleManagement';
import SystemAnalytics from './SystemAnalytics';
import UserActivity from './UserActivity';
import LoadingScreen from './LoadingScreen';
import ModuleAccessManagement from '../../pages/ModuleAccessManagement';
import SessionManager from '../SessionManager';

// Import custom hook
import { useSuperAdminApi } from '../../hooks/useSuperAdminApi';

const SuperAdminDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  // Use custom hook for API calls
  const { 
    loading, 
    error, 
    setError,
    getDashboardAnalytics, 
    getUserActivity 
  } = useSuperAdminApi();

  // Use auto-logout hook
  const { handleLogout: autoLogout } = useAutoLogout('superadmin');

  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Tab configuration
  const tabs = [
    { label: 'Overview', icon: 'dashboard', component: 'overview' },
    { label: 'Customer Management', icon: 'people', component: 'customers' },
    { label: 'Module Management', icon: 'settings', component: 'modules' },
    { label: 'System Analytics', icon: 'analytics', component: 'analytics' },
    { label: 'User Activity', icon: 'timeline', component: 'activity' },
    { label: 'Session Manager', icon: 'security', component: 'sessions' }
  ];

  // Authentication check
  useEffect(() => {
    const checkSuperAdminAuth = async () => {
      const validation = validateSuperAdminToken();
      
      if (!validation.isValid) {
        navigate("/superadmin-login");
        return;
      }
      
      setIsAuthenticating(false);
      await fetchDashboardData();
    };
    
    checkSuperAdminAuth();
  }, [navigate]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const [analyticsData, activityData] = await Promise.all([
        getDashboardAnalytics(),
        getUserActivity('active', 5)
      ]);
      
      setDashboardData(analyticsData.data);
      setUserActivity(activityData.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/superadmin-login");
      }
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Get SuperAdmin user data from localStorage
      const superAdminUser = localStorage.getItem("superadmin_user");
      
      if (superAdminUser) {
        try {
          const userData = JSON.parse(superAdminUser);
          
          // Call logout API to update logout time
          await fetch(`${process.env.REACT_APP_API_STRING}/superadmin/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: userData.id }),
          });
        } catch (error) {
          console.error('Error calling SuperAdmin logout API:', error);
        }
      }
      
      // Clear localStorage and redirect
      localStorage.removeItem("superadmin_token");
      localStorage.removeItem("superadmin_user");
      navigate("/superadmin-login");
    } catch (error) {
      console.error('Error during SuperAdmin logout:', error);
      // Still clear localStorage and redirect even if API call fails
      localStorage.removeItem("superadmin_token");
      localStorage.removeItem("superadmin_user");
      navigate("/superadmin-login");
    }
  };

  // Loading screen
  if (isAuthenticating || loading) {
    return <LoadingScreen />;
  }

  // Render active component
  const renderActiveComponent = () => {
    switch (tabs[activeTab].component) {
      case 'overview':
        return <ModernDashboardOverview data={dashboardData} onRefresh={fetchDashboardData} loading={loading} />;
      case 'customers':
        return <ModernCustomerManagement onRefresh={fetchDashboardData} />;
      case 'modules':
        return <ModuleManagement onRefresh={fetchDashboardData} />;
      case 'analytics':
        return <SystemAnalytics data={dashboardData} />;
      case 'activity':
        return <UserActivity data={userActivity} onRefresh={fetchDashboardData} />;
      case 'sessions':
        return <SessionManager userType="superadmin" />;
      default:
        return <ModernDashboardOverview data={dashboardData} onRefresh={fetchDashboardData} loading={loading} />;
    }
  };

  return (
    <ThemeProvider theme={modernTheme}>
      
        {/* Session Manager for SuperAdmin */}
        <SessionManager userType="superadmin" />
        
        {/* Modern Sidebar */}
        <ModernSidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
          onLogout={handleLogout}
          mobileOpen={mobileOpen}
          onMobileToggle={() => setMobileOpen(!mobileOpen)}
        />

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            ml: { 
              xs: 0, 
              md: sidebarCollapsed ? '64px' : '240px' 
            },
            transition: 'margin-left 0.2s ease',
            width: { 
              xs: '100%',
              md: `calc(100% - ${sidebarCollapsed ? '64px' : '240px'})`
            },
            overflow: 'hidden',
          }}
        >
          {/* Content Area */}
          <Box
            sx={{
              flexGrow: 1,
              p: { xs: 2, sm: 3, md: 3 },
              backgroundColor: '#F8FAFC',
              minHeight: '100vh',
              width: '95%',
              maxWidth: '100%',
              overflow: 'hidden',
            }}
          >
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  border: '1px solid #FEE2E2',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                }} 
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
            
            {renderActiveComponent()}
          </Box>
        </Box>
      
    </ThemeProvider>
  );
};

export default SuperAdminDashboard;
