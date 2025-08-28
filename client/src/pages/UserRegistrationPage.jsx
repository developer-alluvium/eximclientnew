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
  Chip
} from "@mui/material";
import { 
  Visibility, 
  VisibilityOff, 
  PersonAdd, 
  Email,
  CheckCircle 
} from "@mui/icons-material";
import { useNavigate, Link, useLocation } from "react-router-dom";
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

  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [registrationStep, setRegistrationStep] = useState('form'); // 'form' or 'email-sent'
  const navigate = useNavigate();
  const location = useLocation();

  // Check for verification success/error messages
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const verified = urlParams.get('verified');
    const message = urlParams.get('message');
    const errorParam = urlParams.get('error');
    
    if (verified === 'true' && message) {
      setSuccess(message);
      // Auto redirect to login after showing success
      setTimeout(() => {
        navigate("/login", { 
          state: { message: "Email verified successfully! You can now log in." }
        });
      }, 3000);
    } else if (errorParam && message) {
      setError(message);
    }
  }, [location.search, navigate]);

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
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
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
    
      });

      if (response.data.success) {
        setRegistrationStep('email-sent');
        setSuccess("Registration successful! Please check your email to verify your account before logging in.");
        
        // Clear form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
     
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Render email verification sent screen
  if (registrationStep === 'email-sent') {
    return (
      <ThemeProvider theme={modernTheme}>
        <Container fluid className="auth-container">
          <Row className="auth-row">
            <Col lg={6} className="auth-left-col">
              <div className="auth-left-content">
                <Typography variant="h2" className="auth-left-title">
                  Check Your Email
                </Typography>
                <Typography variant="body1" className="auth-left-subtitle">
                  We've sent you a verification link
                </Typography>
              </div>
            </Col>
            
            <Col lg={6} className="auth-right-col">
              <div className="auth-right-content">
                <Card className="auth-card">
                  <CardContent>
                    <Box className="auth-header" textAlign="center">
                      <Email 
                        sx={{ 
                          fontSize: 60, 
                          color: 'primary.main',
                          mb: 2 
                        }} 
                      />
                      <Typography variant="h4" className="auth-title">
                        Verify Your Email
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 3 }}>
                        We've sent a verification email to your registered email address. 
                        Please click the link in the email to activate your account.
                      </Typography>
                      
                      <Chip 
                        icon={<CheckCircle />}
                        label="Email Sent Successfully"
                        color="success"
                        sx={{ mb: 3 }}
                      />
                    </Box>

                    {success && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        {success}
                      </Alert>
                    )}

                    <Box className="email-verification-instructions">
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        <strong>Next steps:</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" component="div">
                        1. Check your email inbox<br/>
                        2. Click the verification link<br/>
                        3. You'll be redirected to login<br/>
                        4. Sign in with your credentials
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        onClick={() => setRegistrationStep('form')}
                        sx={{ mr: 2 }}
                      >
                        Register Another Account
                      </Button>
                      <Button
                        variant="contained"
                        component={Link}
                        to="/login"
                      >
                        Go to Login
                      </Button>
                    </Box>

                    <Box className="auth-footer" sx={{ mt: 3 }}>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Didn't receive the email? Check your spam folder or{" "}
                        <MuiLink 
                          component="button"
                          type="button"
                          color="primary"
                          underline="hover"
                          onClick={() => {
                            setRegistrationStep('form');
                            setError('Please try registering again or contact support.');
                          }}
                        >
                          contact support
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

  // Render registration form
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
                <Typography variant="body2">✓ Email verification required</Typography>
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
                      helperText="A verification email will be sent to this address"
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
                      {loading ? "Creating Account..." : "Register & Send Verification Email"}
                    </Button>
                  </Box>

                  <Box className="auth-footer">
                    <Typography variant="body2" color="text.secondary">
                      Already have an account?{" "}
                      <MuiLink 
                        component={Link} 
                        to="/login" 
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
