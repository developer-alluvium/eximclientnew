import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  Card,
  CardContent,
  Link as MuiLink,
  Switch, // Added for the toggle
  FormControlLabel, // Added for the toggle
} from "@mui/material";
import { Visibility, VisibilityOff, Login, SupervisorAccount } from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import { modernTheme } from "../styles/modernTheme";
import axios from "axios";
import "../styles/auth.scss";

function UserLoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 1. State to toggle between User and SuperAdmin login
  const [isSuperAdminLogin, setIsSuperAdminLogin] = useState(false);

  // 2. Updated useEffect to check for both user and superadmin sessions
  useEffect(() => {
    const superAdminToken = localStorage.getItem("superadmin_token");
    const userToken = localStorage.getItem("access_token");

    if (superAdminToken) {
      navigate("/superadmin-dashboard", { replace: true });
    } else if (userToken) {
      navigate("/user/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  // 3. Consolidated handleSubmit function
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    // Determine API endpoint and payload based on the toggle state
    const endpoint = isSuperAdminLogin
      ? `${process.env.REACT_APP_API_STRING}/superadmin/login`
      : `${process.env.REACT_APP_API_STRING}/users/login`;
    
    const payload = { email: formData.email, password: formData.password };

    try {
      const response = await axios.post(endpoint, payload, { withCredentials: true });

      if (response.data.success) {
        if (isSuperAdminLogin) {
          // Handle SuperAdmin successful login
          localStorage.setItem("superadmin_token", response.data.token);
          localStorage.setItem("superadmin_user", JSON.stringify(response.data.superAdmin));
          navigate("/superadmin-dashboard", { replace: true });
        } else {
          // Handle User successful login
          const { user } = response.data.data;
          const { accessToken, refreshToken } = response.data;
          localStorage.setItem("exim_user", JSON.stringify(user));
          localStorage.setItem("access_token", accessToken);
          localStorage.setItem("refresh_token", refreshToken);
          navigate("/user/dashboard", { replace: true });
        }
      }
    } catch (err) {
      let errorMessage = "Login failed. Please try again.";
      if (err.response) {
        switch (err.response.status) {
          case 401:
            errorMessage = "Invalid email or password.";
            break;
          case 423:
            errorMessage = "Account is temporarily locked. Please try again later.";
            break;
          case 403: // Specific to user login
            errorMessage = err.response.data.message || "Account pending verification.";
            break;
          default:
            errorMessage = err.response.data.message || "An unexpected error occurred.";
            break;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={modernTheme}>
      <Container fluid className="auth-container">
        <Row className="auth-row">
          <Col lg={6} className="auth-left-col">
            <div className="auth-left-content">
              <Typography variant="h2" className="auth-left-title">
                Welcome Back
              </Typography>
              <Typography variant="body1" className="auth-left-subtitle">
                Sign in to access your EXIM dashboard
              </Typography>
              <div className="auth-left-features">
                <Typography variant="body2">✓ Access your modules</Typography>
                <Typography variant="body2">✓ View analytics & reports</Typography>
                <Typography variant="body2">✓ Manage documents</Typography>
                <Typography variant="body2">✓ Track compliance</Typography>
              </div>
            </div>
          </Col>
          
          <Col lg={6} className="auth-right-col">
            <div className="auth-right-content">
              <Card className="auth-card">
                <CardContent>
                  <Box className="auth-header">
                    {isSuperAdminLogin ? (
                       <SupervisorAccount sx={{ fontSize: 40, color: 'error.main', mb: 2 }} />
                    ) : (
                       <Login sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    )}
                    <Typography variant="h4" className="auth-title">
                      {isSuperAdminLogin ? "SuperAdmin Login" : "User Login"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enter your credentials to continue
                    </Typography>
                  </Box>

                  {error && (
                    <Alert 
                      severity={error.includes("pending") ? "warning" : "error"} 
                      sx={{ mb: 2 }}
                    >
                      {error}
                    </Alert>
                  )}

                  <Box component="form" onSubmit={handleSubmit} className="auth-form">
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      className="auth-input"
                      disabled={loading}
                      autoComplete="email"
                    />

                    <TextField
                      fullWidth
                      label="Password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      className="auth-input"
                      disabled={loading}
                      autoComplete="current-password"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* 4. Added the Switch for toggling login type */}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isSuperAdminLogin}
                          onChange={(e) => setIsSuperAdminLogin(e.target.checked)}
                          name="superAdminToggle"
                          color="primary"
                        />
                      }
                      label="Log in as SuperAdmin"
                      sx={{ mt: 1, mb: 1, color: 'text.secondary' }}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading}
                      className="auth-submit-btn"
                      sx={{ mt: 1 }}
                    >
                      {loading ? "Signing In..." : "Sign In"}
                    </Button>
                  </Box>

                  <Box className="auth-footer">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Don't have an account?{" "}
                      <MuiLink 
                        component={Link} 
                        to="/user/register" 
                        color="primary"
                        underline="hover"
                      >
                        Register here
                      </MuiLink>
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>
    </ThemeProvider>
  );
}

export default UserLoginPage;