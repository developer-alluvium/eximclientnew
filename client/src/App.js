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
import UserManagement from "./pages/UserManagement/UserManagement.jsx";
import EmailVerification from "./pages/EmailVerification.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import MainLayout from "./pages/MainLayout.jsx";

// Layout wrapper component to conditionally show header
const LayoutWrapper = ({ children }) => {
  const location = useLocation();
  
  // Pages that should not show the header
  const noHeaderPages = [
    "/login",
    "/user/login", 
    "/admin/login",
    "/superadmin/login",
    "/user/register",
    "/verify-email",
    "/reset-password"
  ];
  
  const shouldShowHeader = !noHeaderPages.some(page => 
    location.pathname.startsWith(page)
  );
  
  if (shouldShowHeader) {
    return <MainLayout>{children}</MainLayout>;
  }
  
  return <>{children}</>;
};

// Protected Route component
const ProtectedRoute = ({ children, requiredAuth }) => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    const checkAuth = () => {
      switch (requiredAuth) {
        case 'superadmin':
          if (!localStorage.getItem("superadmin_user")) {
            navigate("/login", { replace: true });
          }
          break;
        case 'admin':
          if (!localStorage.getItem("exim_admin")) {
            navigate("/admin/login", { replace: true });
          }
          break;
        case 'user':
          if (!localStorage.getItem("exim_user")) {
            navigate("/login", { replace: true });
          }
          break;
        default:
          break;
      }
    };
    
    checkAuth();
  }, [navigate, requiredAuth]);
  
  return children;
};

function App() {
  const [user, setUser] = React.useState(() => {
    // Initialize user state from localStorage if available
    const savedUser = localStorage.getItem("exim_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [selectedYear, setSelectedYear] = React.useState("");
  

  return (
    <BrowserRouter>
      <UserContext.Provider value={{ user, setUser }}>
        <SelectedYearContext.Provider
          value={{ selectedYear, setSelectedYear }}
        >
          <TabValueProvider>
            <ImportersProvider>
              <LayoutWrapper>
                <Routes>
                  {/* Login routes - no header */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/user/login" element={<UserLoginPage />} />
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />

                  {/* User system routes - no header */}
                  <Route
                    path="/user/register"
                    element={<UserRegistrationPage />}
                  />
                  <Route
                    path="/verify-email/:token"
                    element={<EmailVerification />}
                  />
                  <Route
                    path="/reset-password/:token"
                    element={<ResetPasswordPage />}
                  />

                  {/* Protected routes - with header */}
                  <Route
                    path="/user/dashboard"
                    element={
                      <ProtectedRoute requiredAuth="user">
                        <UserDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin routes */}
                  <Route
                    path="/customer-admin/dashboard"
                    element={
                      <ProtectedRoute requiredAuth="admin">
                        <CustomerAdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* SuperAdmin routes */}
                  <Route
                    path="/superadmin-dashboard"
                    element={
                      <ProtectedRoute requiredAuth="superadmin">
                        <SuperAdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<SuperAdminDashboard />} />
                    <Route
                      path="customer/:customerId"
                      element={<SuperAdminCustomerDetail />}
                    />
                  </Route>
                  
                  <Route
                    path="/module-access-management"
                    element={
                      <ProtectedRoute requiredAuth="superadmin">
                        <ModuleAccessManagement />
                      </ProtectedRoute>
                    }
                  />

                  {/* Legacy customer routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute requiredAuth="user">
                        <UserDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/netpage"
                    element={
                      <ProtectedRoute requiredAuth="user">
                        <NetPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/importdsr"
                    element={
                      <ProtectedRoute requiredAuth="user">
                        <AppbarComponent />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/trademasterguide"
                    element={
                      <ProtectedRoute requiredAuth="user">
                        <ImportVideoPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/user/profile"
                    element={
                      <ProtectedRoute requiredAuth="user">
                        <UserProfile />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* User Management route - check for admin role */}
                  <Route
                    path="/user-management"
                    element={(() => {
                      const user = localStorage.getItem("exim_user");
                      if (!user) return <LoginPage />;

                      try {
                        const userData = JSON.parse(user);
                        const isAdmin =
                          userData.role === "admin" ||
                          userData.role === "superadmin";
                        return isAdmin ? <UserManagement /> : <LoginPage />;
                      } catch (error) {
                        console.error("Error parsing user data:", error);
                        return <LoginPage />;
                      }
                    })()}
                  />
                </Routes>
              </LayoutWrapper>
            </ImportersProvider>
          </TabValueProvider>
        </SelectedYearContext.Provider>
      </UserContext.Provider>
    </BrowserRouter>
  );
}

export default App;
