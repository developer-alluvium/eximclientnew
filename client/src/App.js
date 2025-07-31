import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";

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
import ImportVideo from "./components/ImportVideo.jsx"; // Import the new component
import ImportVideoPage from "./pages/ImportVideoPage"; // Import the new ImportVideoPage component
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
                <Route path="/login" element={<LoginPage />} />
                <Route path="/superadmin-login" element={<SuperAdminLoginPage />} />

                {/* SuperAdmin routes with localStorage check */}
                <Route path="/superadmin-dashboard" element={
                  localStorage.getItem("superadmin_user") ? <SuperAdminLayout /> : <SuperAdminLoginPage />
                }>
                  <Route index element={<SuperAdminDashboard />} />
                  <Route path="customer/:customerId" element={<SuperAdminCustomerDetail />} />
                </Route>

                <Route path="/module-access-management" element={
                  localStorage.getItem("superadmin_user") ? <ModuleAccessManagement /> : <SuperAdminLoginPage />
                } />

                {/* User routes with localStorage check */}
                <Route path="/" element={
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
                
              </Routes>
            </BrowserRouter>
          </ImportersProvider>
        </TabValueProvider>
      </SelectedYearContext.Provider>
    </UserContext.Provider>
  );
}

export default App;
