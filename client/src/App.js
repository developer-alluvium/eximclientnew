import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import UserLoginPage from "./pages/UserLoginPage";
import UserRegistrationPage from "./pages/UserRegistrationPage";
import UserDashboard from "./pages/UserDashboard";
import AdminLoginPage from "./pages/AdminLoginPage";
import CustomerAdminDashboard from "./pages/CustomerAdminDashboard";

import { TabValueProvider } from "./context/TabValueContext";
import { UserContext } from "./context/UserContext";
import { SelectedYearContext } from "./context/SelectedYearContext";
import { ImportersProvider } from "./context/importersContext";
import AppbarComponent from "./components/home/AppbarComponent";
import NetPage from "./components/Net weight/NetPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import SuperAdminDashboard from "./components/SuperAdmin/SuperAdminDashboard.jsx";
import SuperAdminLayout from "./components/SuperAdmin/SuperAdminLayout.jsx";
import ModuleAccessManagement from "./components/SuperAdmin/ModuleAccessManagement.jsx";
import SuperAdminCustomerDetail from "./pages/SuperAdminCustomerDetail.jsx";
import SuperAdminLoginPage from "./pages/SuperAdminLoginPage.jsx";
import ImportVideoPage from "./pages/ImportVideoPage";
import UserManagement from "./pages/UserManagement/UserManagement.jsx"
import EmailVerification from "./pages/EmailVerification.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx"
// Protected route component for backward compatibility
const LegacyProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem("exim_user") !== null;

  // Don't interfere with SuperAdmin routes - but still call useEffect
  const shouldBypass = location.pathname.startsWith('/superadmin-dashboard') || 
                      location.pathname.startsWith('/module-access-management') ||
                      location.pathname === '/login';

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

// Route-aware session manager

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
              <Routes>
                {/* Legacy customer login */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* New user system routes */}
                <Route path="/login" element={<UserLoginPage />} />
                <Route path="/user/register" element={<UserRegistrationPage />} />
                <Route path="/verify-email/:token" element={<EmailVerification />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                <Route path="/user/dashboard" element={
                  localStorage.getItem("exim_user") ? <UserDashboard /> : <LoginPage />
                } />
                
                {/* Admin routes */}
               
                <Route path="/customer-admin/dashboard" element={
                  localStorage.getItem("exim_admin") ? <CustomerAdminDashboard /> : <AdminLoginPage />
                } />
                
                {/* SuperAdmin routes */}
                <Route path="/login" element={<SuperAdminLoginPage />} />
                <Route path="/superadmin-dashboard" element={
                  localStorage.getItem("superadmin_user") ? <SuperAdminLayout /> : <LoginPage />
                }>
                  <Route index element={<SuperAdminDashboard />} />
                  <Route path="customer/:customerId" element={<SuperAdminCustomerDetail />} />
                </Route>
                <Route path="/module-access-management" element={
                  localStorage.getItem("superadmin_user") ? <ModuleAccessManagement /> : <oginPage />
                } />

                {/* Legacy customer routes */}
                <Route path="/" element={
                  localStorage.getItem("exim_user") ? <UserDashboard /> : 
                  localStorage.getItem("exim_user") ? <HomePage /> : <LoginPage />
                } />
                <Route path="/netpage" element={
                  localStorage.getItem("exim_user") ? <NetPage /> : <LoginPage />
                } />
                <Route
                  path="/importdsr"
                  element={
                    localStorage.getItem("exim_user") ? <AppbarComponent /> : <LoginPage />
                  }
                />
                <Route path="/trademasterguide" element={
                  localStorage.getItem("exim_user") ? <ImportVideoPage /> : <LoginPage />
                } />
                <Route path="/user-management" element={
                  localStorage.getItem("exim_user") ? <UserManagement /> : <LoginPage />
                } />
                
              </Routes>
            </BrowserRouter>
          </ImportersProvider>
        </TabValueProvider>
      </SelectedYearContext.Provider>
    </UserContext.Provider>
  );
}

export default App;
