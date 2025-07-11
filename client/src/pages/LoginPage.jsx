import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { Container, Row, Col } from "react-bootstrap";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  Divider,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { logActivity } from "../utils/activityLogger";
import "../styles/login.scss";

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [ie_code_no, setIeCodeNo] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotPasswordIeCode, setForgotPasswordIeCode] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(null);
  const [resetPasswordError, setResetPasswordError] = useState(null);
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  // Check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem("exim_user");
    if (savedUser) {
      // If user is already logged in, redirect to home page
      setUser(JSON.parse(savedUser));
      navigate("/", { replace: true });
    }
  }, [navigate, setUser]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/login`,
        { ie_code_no, password },
        { withCredentials: true } // Important for cookie handling
      );

      if (res.status === 200) {
        const userData = res.data.data.user; // Extract user data from correct path

        // Log successful login activity
        try {
          await logActivity({
            userId: userData.id, // Use id instead of customerId
            activityType: 'login',
            description: `Successful login for IE Code: ${ie_code_no}`,
            severity: 'low',
            metadata: {
              ieCode: ie_code_no,
              loginTime: new Date().toISOString(),
              userAgent: navigator.userAgent
            }
          });
        } catch (logError) {
          console.error('Failed to log login activity:', logError);
        }

        // Store user data in localStorage for persistence across page refreshes
        localStorage.setItem("exim_user", JSON.stringify(userData));

        // Update user context
        setUser(userData);

        // Navigate to home page
        navigate("/");

        // Reset form fields
        setIeCodeNo("");
        setPassword("");
      }
    } catch (error) {
      let errorMessage = "An unexpected error occurred";
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = error.response.data.message;
            setLoginError(errorMessage);
            break;
          case 401:
            errorMessage = "Invalid credentials";
            setLoginError(errorMessage);
            break;
          case 500:
            errorMessage = "Server error. Please try again later.";
            setLoginError(errorMessage);
            break;
          default:
            setLoginError(errorMessage);
        }
      } else {
        errorMessage = "Network error. Please check your connection.";
        setLoginError(errorMessage);
      }

      // Log failed login attempt
      try {
        await logActivity({
          userId: null, // No user ID for failed login
          activityType: 'failed_login',
          description: `Failed login attempt for IE Code: ${ie_code_no}`,
          severity: 'medium',
          metadata: {
            ieCode: ie_code_no,
            errorMessage: errorMessage,
            attemptTime: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        });
      } catch (logError) {
        console.error('Failed to log failed login activity:', logError);
      }    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setResetPasswordError(null);
    setResetPasswordSuccess(null);
    setIsResettingPassword(true);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/forgot-password`,
        { ie_code_no: forgotPasswordIeCode },
        { withCredentials: true }
      );

      if (res.status === 200) {
        setResetPasswordSuccess({
          message: res.data.message,
          temporaryPassword: res.data.temporaryPassword,
        });
        setForgotPasswordIeCode("");
      }
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 400:
            setResetPasswordError(error.response.data.message);
            break;
          case 404:
            setResetPasswordError("Customer not found with the provided IE code");
            break;
          case 500:
            setResetPasswordError("Server error. Please try again later.");
            break;
          default:
            setResetPasswordError("An unexpected error occurred");
        }
      } else {
        setResetPasswordError("Network error. Please check your connection.");
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleBackToLogin = () => {
    setForgotPassword(false);
    setResetPasswordError(null);
    setResetPasswordSuccess(null);
    setForgotPasswordIeCode("");
  };
  return (
    <Container fluid className="login-container" style={{ height: "100vh", overflow: "hidden" }}>
      <Row className="login-row m-0" style={{ height: "100%" }}>
        <Col md={6} className="login-left-col p-0"></Col>
        <Col md={6} className="login-right-col" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "auto" }}>
          <div className="login-right-col-inner-container" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "1rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <img
                src={require("../assets/images/logo.webp")}
                alt="logo"
                style={{ 
                  maxWidth: "100%", 
                  height: "auto", 
                  maxHeight: "80px",
                  objectFit: "contain"
                }}
              />
            </div>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                maxWidth: 400,
                margin: "auto",
                padding: { xs: 1, sm: 2, md: 3 },
                width: "100%",
              }}
            >              <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                Login
              </Typography>

              {loginError && (
                <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                  {loginError}
                </Alert>
              )}

              <form onSubmit={handleSubmit} style={{ width: "100%" }}>
                <TextField
                  fullWidth
                  id="ie_code_no"
                  name="ie_code_no"
                  label="IE Code Number"
                  variant="outlined"
                  margin="normal"
                  value={ie_code_no}
                  onChange={(e) => setIeCodeNo(e.target.value)}
                  sx={{ mb: 1.5 }}
                />

                <TextField
                  fullWidth
                  id="password"
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  variant="outlined"
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{ mb: 2 }}
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
                  color="primary"
                  sx={{ mt: 2, mb: 2 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Logging In..." : "Login"}
                </Button>
                <Box sx={{ width: '100%', textAlign: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <span>Administrator access? </span>
                    <Link to="/superadmin-login" style={{ color: '#1976d2', textDecoration: 'underline', fontWeight: 500 }}>
                      Login as SuperAdmin
                    </Link>
                  </Typography>
                </Box>{forgotPassword ? (
                  <Box sx={{ mt: 2 }}>
                    {resetPasswordSuccess ? (
                      <Box sx={{ textAlign: "center" }}>
                        <Alert severity="success" sx={{ mb: 2 }}>
                          {resetPasswordSuccess.message}
                        </Alert>
                        <Box sx={{ 
                          p: 2, 
                          bgcolor: "success.50", 
                          borderRadius: 1, 
                          border: "1px solid", 
                          borderColor: "success.200",
                          mb: 2
                        }}>
                          <Typography variant="body2" fontWeight="bold" color="success.dark" sx={{ mb: 1 }}>
                            Your New Password:
                          </Typography>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontFamily: "monospace",
                              fontWeight: "bold",
                              color: "success.main",
                              bgcolor: "white",
                              p: 1,
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "success.300"
                            }}
                          >
                            {resetPasswordSuccess.temporaryPassword}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                            Please save this password securely and use it to login.
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleBackToLogin}
                          fullWidth
                          sx={{ mb: 1 }}
                        >
                          Back to Login
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="h6" align="center" sx={{ mb: 2 }}>
                          Reset Password
                        </Typography>
                        
                        {resetPasswordError && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {resetPasswordError}
                          </Alert>
                        )}

                        <form onSubmit={handleForgotPassword}>
                          <TextField
                            fullWidth
                            id="forgot_ie_code"
                            name="forgot_ie_code"
                            label="IE Code Number"
                            variant="outlined"
                            margin="normal"
                            value={forgotPasswordIeCode}
                            onChange={(e) => setForgotPasswordIeCode(e.target.value)}
                            helperText="Enter your Import Export Code to reset password"
                            required
                          />

                          <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            sx={{ mt: 2, mb: 1 }}
                            disabled={isResettingPassword}
                          >
                            {isResettingPassword ? "Resetting Password..." : "Reset Password"}
                          </Button>

                          <Button
                            fullWidth
                            variant="text"
                            color="primary"
                            onClick={handleBackToLogin}
                          >
                            Back to Login
                          </Button>
                        </form>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    align="right"
                    sx={{ cursor: "pointer", color: "primary.main" }}
                    onClick={() => setForgotPassword(true)}
                  >
                    {/* Forgot Password? */}
                  </Typography>
                )}

                
              </form>
            </Box>          </div>
          <div className="login-footer" style={{ 
            flexShrink: 0, 
            padding: "1rem", 
            marginTop: "auto",
            minHeight: "fit-content" 
          }}>
            <p style={{ 
              margin: 0, 
              color: "#000", 
              fontWeight: "bold",
              fontSize: "0.85rem",
              textAlign: "center"
            }}>
              Version: {process.env.REACT_APP_VERSION}
            </p>
            <img
              src={require("../assets/images/alluvium-logo.webp")}
              style={{
                width: "60px",
                height: "auto",
                maxWidth: "80px",
                objectFit: "contain"
              }}
              alt="Alluvium Logo"
            />
            <p style={{
              margin: 0,
              fontSize: "0.85rem",
              textAlign: "center"
            }}>
              Powered By:&nbsp;
              <a
                href="https://www.alluvium.in/"
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span>AIVision | EXIM&nbsp;</span>
              </a>
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default LoginPage;
