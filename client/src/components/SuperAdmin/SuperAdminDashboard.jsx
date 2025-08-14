import React, { useState, useEffect } from "react";
import { Box, Alert } from "@mui/material";
import { useOutletContext, useNavigate } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';

// Import dashboard components
import ModernDashboardOverview from './ModernDashboardOverview';
import ModernCustomerManagement from './ModernCustomerManagement';
import AdminManagement from './AdminManagement';
import ModuleManagement from "./ModuleManagement.jsx";
import SystemAnalytics from './SystemAnalytics.jsx';
import UserActivity from './UserActivity';
import ColumnPermissionsManagement from './ColumnPermissionsManagement';
import { modernTheme } from '../../styles/modernTheme';
import ModernSidebar from './ModernSidebar';
import LoadingScreen from "../LoadingScreen.jsx";

const SuperAdminDashboard = () => {
  // Get context data from the layout
  const { 
    dashboardData, 
    userActivity, 
    fetchDashboardData, 
    loading,
    activeTab
  } = useOutletContext();

  // Local state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [activeTabState, setActiveTab] = useState(activeTab || 0);
  
  const navigate = useNavigate();

  // Tab configuration
  const tabs = [
    { label: 'Overview', icon: 'dashboard', component: 'overview' },
    { label: 'Customer Management', icon: 'people', component: 'customers' },
    { label: 'Admin Management', icon: 'admin_panel_settings', component: 'admin' },
    { label: 'Module Management', icon: 'settings', component: 'modules' },
    { label: 'Column Permissions', icon: 'visibility', component: 'columns' },
    { label: 'System Analytics', icon: 'analytics', component: 'analytics' },
    { label: 'User Activity', icon: 'timeline', component: 'activity' },
    { label: 'Session Manager', icon: 'security', component: 'sessions' }
  ];

  // Handle logout
  const handleLogout = () => {
    // Add logout logic here
    navigate('/login');
  };

  // Render active component based on current tab
  const renderActiveComponent = () => {
    switch (tabs[activeTabState].component) {
      case 'overview':
        return <ModernDashboardOverview data={dashboardData} onRefresh={fetchDashboardData} loading={loading} />;
      case 'customers':
        return <ModernCustomerManagement onRefresh={fetchDashboardData} />;
      case 'admin':
        return <AdminManagement onRefresh={fetchDashboardData} />;
      case 'modules':
        return <ModuleManagement onRefresh={fetchDashboardData} />;
      case 'columns':
        return <ColumnPermissionsManagement onRefresh={fetchDashboardData} />;
      case 'analytics':
        return <SystemAnalytics data={dashboardData} />;
      case 'activity':
        return <UserActivity data={userActivity} onRefresh={fetchDashboardData} />;
      default:
        return <ModernDashboardOverview data={dashboardData} onRefresh={fetchDashboardData} loading={loading} />;
    }
  };

  return (
    <ThemeProvider theme={modernTheme}>
     
        {/* Modern Sidebar */}
        <ModernSidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeTab={activeTabState}
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
            position: 'absolute', // Position absolutely to remove gap
            right: 0, // Align to the right side of the screen
            left: { // Align to the edge of the sidebar
              xs: 0,
              md: sidebarCollapsed ? '64px' : '240px'
            },
            transition: 'left 0.2s ease',
            overflow: 'auto', // Allow content to scroll if needed
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
              overflow: 'visible', // Changed from auto to visible to ensure buttons don't get hidden
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