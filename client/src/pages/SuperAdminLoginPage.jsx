import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CardContent,
  InputAdornment,
  IconButton,
  Container,
  Paper,
  Divider,
  Chip,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  AdminPanelSettings,
  Security,
  Email, // 1. Imported the Email icon
  Lock,
} from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";

function SuperAdminLoginPage() {
  // 2. Changed state from 'username' to 'email'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [sessionMessage, setSessionMessage] = useState(null);
  const navigate = useNavigate();

  // Check if already logged in (no changes needed here)
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("superadmin_token");
      const user = localStorage.getItem("superadmin_user");

      if (token && user) {
        try {
          JSON.parse(user);
          console.log("Valid auth found, redirecting...");
          navigate("/superadmin-dashboard", { replace: true });
        } catch (error) {
          console.error("Invalid user data in localStorage:", error);
          localStorage.removeItem("superadmin_token");
          localStorage.removeItem("superadmin_user");
        }
      }
    };

    checkAuth();
  }, [navigate]);

  // Listen for storage changes (no changes needed here)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("superadmin_token");
      const user = localStorage.getItem("superadmin_user");
      
      if (token && user) {
        navigate("/superadmin-dashboard", { replace: true });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSessionMessage(null);
    setIsLoading(true);

    // 3. Updated validation to check for 'email'
    if (!email || !password) {
      setError("Please provide both email and password");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Attempting login...");
      // 4. Send 'email' in the request payload
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/superadmin/login`,
        { email, password },
        { withCredentials: true }
      );

      console.log("Login response:", response.data);

      if (response.data.success) {
        console.log("Login successful, storing data...");
        setIsRedirecting(true);
        
        localStorage.setItem("superadmin_token", response.data.token);
        localStorage.setItem("superadmin_user", JSON.stringify(response.data.superAdmin));
        
        // 5. Clear 'email' state on success
        setEmail("");
        setPassword("");
        setError(null);
        setSessionMessage(null);
        
        const storedToken = localStorage.getItem("superadmin_token");
        const storedUser = localStorage.getItem("exim_user");
        console.log("Storage verification - Token:", !!storedToken, "User:", !!storedUser);
        
        setTimeout(() => {
          console.log("Redirecting to dashboard...");
          window.location.href = "/superadmin-dashboard";
        }, 100);
        
        setTimeout(() => {
          if (window.location.pathname === "/login") {
            console.log("Fallback navigation...");
            navigate("/superadmin-dashboard", { replace: true });
          }
        }, 1000);
      }
    } catch (error) {
      console.error("SuperAdmin login error:", error);
      setIsRedirecting(false);
      
      if (error.response) {
        switch (error.response.status) {
          case 401:
            setError("Invalid email or password"); // Updated error message
            break;
          case 423:
            setError("Account is temporarily locked due to too many failed attempts. Please try again later.");
            break;
          case 500:
            setError("Server error. Please try again later.");
            break;
          default:
            setError(error.response.data.message || "Login failed");
        }
      } else {
        setError("Network error. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Header (no changes needed) */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
              color: "white",
              p: 4,
              textAlign: "center",
            }}
          >
            <AdminPanelSettings sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              SuperAdmin Portal
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Customer Registration Management
            </Typography>
            <Chip
              icon={<Security />}
              label="Restricted Access"
              color="error"
              variant="outlined"
              sx={{
                mt: 2,
                borderColor: "rgba(255,255,255,0.5)",
                color: "white",
                "& .MuiChip-icon": { color: "white" },
              }}
            />
          </Box>

          <CardContent sx={{ p: 4 }}>
            {/* Alerts (no changes needed) */}
            <Alert
              severity="warning"
              sx={{ mb: 3, borderRadius: 2, "& .MuiAlert-icon": { fontSize: "1.5rem" } }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                🔐 SuperAdmin Access Required
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                Only authorized SuperAdmin users can access the customer registration system.
              </Typography>
            </Alert>
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: 2, "& .MuiAlert-icon": { fontSize: "1.2rem" } }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
            {sessionMessage && (
              <Alert
                severity="info"
                sx={{ mb: 3, borderRadius: 2, "& .MuiAlert-icon": { fontSize: "1.2rem" } }}
                onClose={() => setSessionMessage(null)}
              >
                {sessionMessage}
              </Alert>
            )}
            {isRedirecting && (
              <Alert
                severity="success"
                sx={{ mb: 3, borderRadius: 2, "& .MuiAlert-icon": { fontSize: "1.2rem" } }}
              >
                Login successful! Redirecting to dashboard...
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              {/* 6. Updated Email TextField */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="SuperAdmin Email"
                  type="email" // Added type="email" for better semantics
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="outlined"
                  required
                  disabled={isLoading || isRedirecting}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Box>

              {/* Password field (no changes needed) */}
              <Box sx={{ mb: 4 }}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  variant="outlined"
                  required
                  disabled={isLoading || isRedirecting}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          disabled={isLoading || isRedirecting}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Box>
              
              {/* Submit button (no changes needed) */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading || isRedirecting}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  background: isRedirecting 
                    ? "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  "&:hover": {
                    background: isRedirecting 
                      ? "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)"
                      : "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                  },
                  "&:disabled": { background: "#ccc" },
                }}
              >
                {isLoading ? "Authenticating..." : isRedirecting ? "Redirecting..." : "Access SuperAdmin Portal"}
              </Button>
            </form>

            <Divider sx={{ my: 3 }} />

            {/* Footer and Security Notice (no changes needed) */}
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Need customer access instead?
              </Typography>
              <Link to="/login" style={{ textDecoration: "none", color: "#667eea", fontWeight: 600 }}>
                Customer Login →
              </Link>
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 2, border: "1px solid #e0e0e0" }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
                🛡️ This portal is protected by enterprise-grade security measures.
                <br />
                Unauthorized access attempts are logged and monitored.
              </Typography>
            </Box>
          </CardContent>
        </Paper>

        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
            EXIM Client Management System v{process.env.REACT_APP_VERSION || "1.0.0"}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
            SuperAdmin Portal
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default SuperAdminLoginPage;