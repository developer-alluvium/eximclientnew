import React, { useState } from "react";
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
import { Visibility, VisibilityOff, PersonAdd } from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import { modernTheme } from "../styles/modernTheme";
import axios from "axios";
import "../styles/auth.scss";

function UserRegistrationPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    ie_code_no: "",
    importer: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

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
    setSuccess(null);

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.ie_code_no || 
        !formData.importer) {
      setError("All required fields must be filled.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/users/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        ie_code_no: formData.ie_code_no,
        importer: formData.importer
      });

      if (response.data.success) {
        setSuccess("Registration successful! Your account is pending verification. You can now login with your credentials.");
        // Clear form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          ie_code_no: "",
          importer: ""
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/user/login");
        }, 3000);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Registration failed. Please try again.";
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
                Join EXIM Platform
              </Typography>
              <Typography variant="body1" className="auth-left-subtitle">
                Register to access import/export management tools
              </Typography>
              <div className="auth-left-features">
                <Typography variant="body2">✓ Secure document management</Typography>
                <Typography variant="body2">✓ Real-time analytics</Typography>
                <Typography variant="body2">✓ Compliance tracking</Typography>
                <Typography variant="body2">✓ Admin verification process</Typography>
              </div>
            </div>
          </Col>
          
          <Col lg={6} className="auth-right-col">
            <div className="auth-right-content">
              <Card className="auth-card">
                <CardContent>
                  <Box className="auth-header">
                    <PersonAdd 
                      sx={{ 
                        fontSize: 40, 
                        color: 'primary.main',
                        mb: 2 
                      }} 
                    />
                    <Typography variant="h4" className="auth-title">
                      User Registration
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create your account to get started
                    </Typography>
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      {success}
                    </Alert>
                  )}

                  <Box component="form" onSubmit={handleSubmit} className="auth-form">
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      className="auth-input"
                      disabled={loading}
                    />

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
                    />

                    <TextField
                      fullWidth
                      label="IE Code"
                      name="ie_code_no"
                      value={formData.ie_code_no}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      className="auth-input"
                      disabled={loading}
                      helperText="Enter your Import/Export Code"
                    />

                    <TextField
                      fullWidth
                      label="Importer/Company Name"
                      name="importer"
                      value={formData.importer}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      className="auth-input"
                      disabled={loading}
                      helperText="Enter your company or importer name"
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
                      helperText="Minimum 8 characters"
                    />

                    <TextField
                      fullWidth
                      label="Confirm Password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      className="auth-input"
                      disabled={loading}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
                      {loading ? "Creating Account..." : "Register"}
                    </Button>
                  </Box>

                  <Box className="auth-footer">
                    <Typography variant="body2" color="text.secondary">
                      Already have an account?{" "}
                      <MuiLink 
                        component={Link} 
                        to="/user/login" 
                        color="primary"
                        underline="hover"
                      >
                        Sign in here
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

export default UserRegistrationPage;
