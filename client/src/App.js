import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SuperAdminLoginPage from "./pages/SuperAdminLoginPage";
import { TabValueProvider } from "./context/TabValueContext";
import { UserContext } from "./context/UserContext";
import { SelectedYearContext } from "./context/SelectedYearContext";
import { ImportersProvider } from "./context/importersContext";
import AppbarComponent from "./components/home/AppbarComponent";
import NetPage from "./components/Net weight/NetPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import SuperAdminDashboard from "./components/SuperAdmin/SuperAdminDashboard.jsx";
import SuperAdminLayout from "./components/SuperAdmin/SuperAdminLayout.jsx";
import ModuleAccessManagement from "./pages/ModuleAccessManagement.jsx";
import SessionManager from "./components/SessionManager.jsx";
import { validateSuperAdminToken } from "./utils/tokenValidation";
import SuperAdminCustomerDetail from "./pages/SuperAdminCustomerDetail.jsx";

// Protected route component
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem("exim_user") !== null;

  // Don't interfere with SuperAdmin routes - but still call useEffect
  const shouldBypass = location.pathname.startsWith('/superadmin-dashboard') || 
                      location.pathname.startsWith('/module-access-management') ||
                      location.pathname === '/superadmin-login';

  useEffect(() => {
    if (!shouldBypass && !isAuthenticated && location.pathname !== "/login") {
      // Redirect to login page if not authenticated
      navigate("/login", { replace: true });
    }
  }, [shouldBypass, isAuthenticated, navigate, location.pathname]);

  // Early return after hooks
  if (shouldBypass) {
    return children;
  }

  return isAuthenticated ? children : null;
};

// SuperAdmin protected route component
const SuperAdminProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if SuperAdmin is authenticated
  const validation = validateSuperAdminToken();

  useEffect(() => {
    if (!validation.isValid) {
      // Redirect to SuperAdmin login page if not authenticated
      navigate("/superadmin-login", { replace: true });
    }
  }, [validation.isValid, navigate, validation.reason]);

  return validation.isValid ? children : null;
};

// Route-aware session manager
const RouteAwareSessionManager = () => {
  const location = useLocation();
  
  // Check if we're on SuperAdmin routes
  const isSuperAdminRoute = location.pathname.startsWith('/superadmin-dashboard') || 
                           location.pathname.startsWith('/module-access-management');
  
  // Check if we're on SuperAdmin login
  const isSuperAdminLogin = location.pathname === '/superadmin-login';
  
  // Don't run any session manager on login pages
  if (location.pathname === '/login' || isSuperAdminLogin) {
    return null;
  }
  
  // Run SuperAdmin session manager only on SuperAdmin routes
  if (isSuperAdminRoute) {
    return <SessionManager userType="superadmin" />;
  }
  
  // Run regular user session manager on all other routes
  return <SessionManager userType="user" />;
};

function App() {
  const [user, setUser] = React.useState(() => {
    // Initialize user state from localStorage if available
    const savedUser = localStorage.getItem("exim_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [selectedYear, setSelectedYear] = React.useState("");

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <SelectedYearContext.Provider value={{ selectedYear, setSelectedYear }}>
        <TabValueProvider>
          <ImportersProvider>
            <BrowserRouter>
              <RouteAwareSessionManager />
              
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/superadmin-login" element={<SuperAdminLoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* SuperAdmin routes with shared layout */}
                <Route path="/superadmin-dashboard" element={
                  <SuperAdminProtectedRoute>
                    <SuperAdminLayout />
                  </SuperAdminProtectedRoute>
                }>
                  <Route index element={<SuperAdminDashboard />} />
                  <Route path="customer/:customerId" element={<SuperAdminCustomerDetail />} />
                </Route>
                
                <Route path="/module-access-management" element={
                  <SuperAdminProtectedRoute>
                    <ModuleAccessManagement />
                  </SuperAdminProtectedRoute>
                } />
               
                <Route path="/" element={<HomePage />} />
                <Route path="/netpage" element={<NetPage />} />
                <Route
                  path="/importdsr"
                  element={
                    <ProtectedRoute>
                      <AppbarComponent />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </ImportersProvider>
        </TabValueProvider>
      </SelectedYearContext.Provider>
    </UserContext.Provider>
  );
}

export default App;
