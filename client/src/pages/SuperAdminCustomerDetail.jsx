import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, ThemeProvider, Alert, CircularProgress } from '@mui/material';
import { UserContext } from '../context/UserContext';
import { validateSuperAdminToken } from '../utils/tokenValidation';
import { useAutoLogout } from '../hooks/useAutoLogout';
import { useSuperAdminApi } from '../hooks/useSuperAdminApi';

// Import modern theme and components
import { modernTheme } from '../styles/modernTheme';
import ModernSidebar from '../components/SuperAdmin/ModernSidebar';
import ModernCustomerDetailView from '../components/SuperAdmin/ModernCustomerDetailView';
import LoadingScreen from '../components/SuperAdmin/LoadingScreen';
import SessionManager from '../components/SessionManager';

const SuperAdminCustomerDetail = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  // Use custom hook for API calls
  const { 
    loading, 
    error, 
    setError,
    getCustomers
  } = useSuperAdminApi();

  // Use auto-logout hook
  const { handleLogout: autoLogout } = useAutoLogout('superadmin');

  // State management
  const [customer, setCustomer] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  // Tab configuration for sidebar
  const tabs = [
    { label: 'Overview', component: 'overview', icon: 'dashboard' },
    { label: 'Customers', component: 'customers', icon: 'people' },
    { label: 'Modules', component: 'modules', icon: 'extension' },
    { label: 'Analytics', component: 'analytics', icon: 'analytics' },
    { label: 'Activity', component: 'activity', icon: 'history' },
    { label: 'Sessions', component: 'sessions', icon: 'schedule' },
  ];

  const [activeTab, setActiveTab] = useState(1); // Set to customers tab

  useEffect(() => {
    const authenticate = async () => {
      try {
        setIsAuthenticating(true);
        const token = localStorage.getItem("superadmin_token");
        
        if (!token) {
          navigate("/superadmin-login");
          return;
        }

        const isValid = await validateSuperAdminToken();
        if (!isValid) {
          localStorage.removeItem("superadmin_token");
          localStorage.removeItem("superadmin_user");
          navigate("/superadmin-login");
          return;
        }

        // Get user data from localStorage
        const superAdminUser = localStorage.getItem("superadmin_user");
        if (superAdminUser) {
          setUser(JSON.parse(superAdminUser));
        }

        setIsAuthenticating(false);
      } catch (error) {
        console.error('Authentication error:', error);
        navigate("/superadmin-login");
      }
    };

    authenticate();
  }, [navigate, setUser]);

  useEffect(() => {
    if (!isAuthenticating && customerId) {
      fetchCustomerData();
    }
  }, [isAuthenticating, customerId]);

  const fetchCustomerData = async () => {
    try {
      setDataLoading(true);
      const response = await getCustomers();
      const customers = response.data || [];
      const foundCustomer = customers.find(c => c._id === customerId);
      
      if (foundCustomer) {
        setCustomer(foundCustomer);
      } else {
        setError('Customer not found');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Failed to fetch customer data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
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

  const handleBack = () => {
    navigate('/superadmin-dashboard');
  };

  const handleTabChange = (newTab) => {
    if (newTab === 1) {
      // If customers tab is clicked, go back to customer management
      navigate('/superadmin-dashboard');
    } else {
      // For other tabs, go to dashboard with the appropriate tab
      navigate('/superadmin-dashboard');
    }
  };

  // Loading screen
  if (isAuthenticating || dataLoading) {
    return <LoadingScreen />;
  }

  if (!customer) {
    return (
      <ThemeProvider theme={modernTheme}>
        <Box sx={{ 
          display: 'flex', 
          minHeight: '100vh',
          backgroundColor: '#FFFFFF',
          position: 'relative'
        }}>
          <SessionManager userType="superadmin" />
          
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
            }}
          >
   

            <Box
              sx={{
                flexGrow: 1,
                p: { xs: 2, sm: 3, md: 3 },
                backgroundColor: '#F8FAFC',
                minHeight: '100vh',
                width: '100%',
                maxWidth: '100%',
                overflow: 'auto',
              }}
            >
              <Alert severity="error">
                Customer not found
              </Alert>
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={modernTheme}>
      <Box sx={{ 
        display: 'flex', 
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        position: 'relative'
      }}>
        {/* Session Manager for SuperAdmin */}
        <SessionManager userType="superadmin" />
        
        {/* Modern Sidebar */}
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
          }}
        >
        
          {/* Content Area */}
          <Box
            sx={{
              flexGrow: 1,
              p: { xs: 2, sm: 3, md: 3 },
              backgroundColor: '#F8FAFC',
              minHeight: '100vh',
              width: '100%',
              maxWidth: '100%',
              overflow: 'auto',
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
            
            <ModernCustomerDetailView 
              customer={customer} 
              onBack={handleBack}
              onRefresh={fetchCustomerData}
            />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default SuperAdminCustomerDetail;
