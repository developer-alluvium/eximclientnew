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
  Link as MuiLink
} from "@mui/material";
import { Visibility, VisibilityOff, Login } from "@mui/icons-material";
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

  // Check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem("exim_user");
    if (savedUser) {
      navigate("/user/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email || !formData.password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/users/login`,
        formData,
        { withCredentials: true }
      );

      if (response.data.success) {
        // Store user data
        localStorage.setItem("exim_user", JSON.stringify(response.data.data.user));
        
        // Navigate to dashboard
        navigate("/user/dashboard", { replace: true });
      }
    } catch (error) {
      let errorMessage = "Login failed. Please try again.";
      
      if (error.response?.status === 401) {
        errorMessage = "Invalid email or password.";
      } else if (error.response?.status === 423) {
        errorMessage = "Account is temporarily locked. Please try again later.";
      } else if (error.response?.status === 403) {
        errorMessage = error.response.data.message || "Account pending verification.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
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
                    <Login 
                      sx={{ 
                        fontSize: 40, 
                        color: 'primary.main',
                        mb: 2 
                      }} 
                    />
                    <Typography variant="h4" className="auth-title">
                      User Login
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

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading}
                      className="auth-submit-btn"
                      sx={{ mt: 2 }}
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
                    
                    <Typography variant="body2" color="text.secondary">
                      <MuiLink 
                        component={Link} 
                        to="/admin/login" 
                        color="secondary"
                        underline="hover"
                      >
                        Admin Login
                      </MuiLink>
                      {" | "}
                      <MuiLink 
                        component={Link} 
                        to="/superadmin-login" 
                        color="secondary"
                        underline="hover"
                      >
                        SuperAdmin Login
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
