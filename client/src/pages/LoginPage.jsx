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
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
// Import Link from react-router-dom
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { logActivity } from "../utils/activityLogger";
import "../styles/login.scss";

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(null);
  const [resetPasswordError, setResetPasswordError] = useState(null);

  // State to toggle between User and SuperAdmin login
  const [isSuperAdminLogin, setIsSuperAdminLogin] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  // // Updated useEffect to check for both user and superadmin sessions
  // useEffect(() => {
  //   const superAdminToken = localStorage.getItem("superadmin_token");
  //   const userToken = localStorage.getItem("access_token");

  //   if (superAdminToken) {
  //     navigate("/superadmin-dashboard", { replace: true });
  //   } else if (userToken) {
  //     // For regular users, we keep the original navigation to home
  //     navigate("/", { replace: true });
  //   }
  // }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    const endpoint = isSuperAdminLogin
      ? `${process.env.REACT_APP_API_STRING}/superadmin/login`
      : `${process.env.REACT_APP_API_STRING}/users/login`;

    const payload = { email, password };

    try {
      const res = await axios.post(endpoint, payload, {
        withCredentials: true,
      });

      if (res.data.success) {
        if (isSuperAdminLogin) {
          // Handle SuperAdmin successful login
          localStorage.setItem("superadmin_token", res.data.token);
          localStorage.setItem("user_access_token", res.data.token);
          localStorage.setItem(
            "superadmin_user",
            JSON.stringify(res.data.superAdmin)
          );
          navigate("/superadmin-dashboard", { replace: true });
        } else {
          // Handle User successful login
          const userData = res.data.data.user;
          const { accessToken, refreshToken } = res.data;

          // CHECK IF USER IS ACTIVE
          if (!userData.isActive) {
            setError(
              "Your account is not active. Please contact a SuperAdmin or higher authority for access."
            );
            setLoading(false);
            return;
          }

          localStorage.setItem("exim_user", JSON.stringify(userData));
          localStorage.setItem("access_token", accessToken);
          localStorage.setItem("refresh_token", refreshToken);

          setUser(userData);
          navigate("/", { replace: true });
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
            errorMessage =
              "Account is temporarily locked. Please try again later.";
            break;
          case 403:
            errorMessage =
              err.response.data.message || "Account pending verification.";
            break;
          default:
            errorMessage =
              err.response.data.message || "An unexpected error occurred.";
            break;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setResetPasswordError(null);
    setResetPasswordSuccess(null);
    setIsResettingPassword(true);

    try {
      // Point to the new endpoint for requesting the reset link
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/users/request-password-reset`,
        { email: forgotPasswordEmail }
      );

      if (res.status === 200) {
        setResetPasswordSuccess(res.data.message); // Display the confirmation message
        setForgotPasswordEmail("");
      }
    } catch (error) {
      setResetPasswordError(
        error.response?.data?.message || "An error occurred."
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleBackToLogin = () => {
    setForgotPassword(false);
    setResetPasswordError(null);
    setResetPasswordSuccess(null);
    setForgotPasswordEmail("");
  };

  return (
    <Container fluid className="login-container">
      <Row className="login-row m-0" style={{ height: "100vh" }}>
        <Col md={6} className="login-left-col p-0"></Col>
        <Col
          md={6}
          className="login-right-col"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
          }}
        >
          <div
            className="login-right-col-inner-container"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <img
                src={require("../assets/images/logo.webp")}
                alt="logo"
                style={{ maxHeight: "80px" }}
              />
            </div>

            <Box sx={{ maxWidth: 400, margin: "auto", width: "100%" }}>
              <Typography
                component="h1"
                variant="h5"
                sx={{ mb: 2, textAlign: "center" }}
              >
                {isSuperAdminLogin ? "SuperAdmin Login" : "User Login"}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Main Login Form */}
              {!forgotPassword && (
                <form onSubmit={handleSubmit} style={{ width: "100%" }}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    variant="outlined"
                    margin="normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{ mb: 1.5 }}
                    autoComplete="email"
                  />

                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    variant="outlined"
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    sx={{ mb: 2 }}
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

                  <FormControlLabel
                    control={
                      <Switch
                        checked={isSuperAdminLogin}
                        onChange={(e) => setIsSuperAdminLogin(e.target.checked)}
                        name="superAdminToggle"
                      />
                    }
                    label="Log in as SuperAdmin"
                    sx={{
                      mb: 1,
                      color: "text.secondary",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2, mb: 2 }}
                    disabled={loading}
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>

                  {!isSuperAdminLogin && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mt: 2,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ cursor: "pointer", color: "primary.main" }}
                        onClick={() => setForgotPassword(true)} // Toggle the forgot password view
                      >
                        Forgot Password?
                      </Typography>
                      <Link
                        to="/user/register"
                        style={{ textDecoration: "none" }}
                      >
                        <Typography variant="body2" color="primary">
                          Register
                        </Typography>
                      </Link>
                    </Box>
                  )}
                </form>
              )}

              {/* Forgot Password Form */}
              {forgotPassword && (
                <Box sx={{ mt: 2 }}>
                  {resetPasswordSuccess ? (
                    <Box sx={{ textAlign: "center" }}>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        {resetPasswordSuccess}
                      </Alert>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleBackToLogin}
                        fullWidth
                        sx={{ mt: 2 }}
                      >
                        Back to Login
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="h6" align="center" sx={{ mb: 2 }}>
                        Forgot Your Password?
                      </Typography>
                      <Typography
                        variant="body2"
                        align="center"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        Enter your email address below and we'll send you a link
                        to reset your password.
                      </Typography>
                      {resetPasswordError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {resetPasswordError}
                        </Alert>
                      )}
                      <form onSubmit={handleForgotPassword}>
                        <TextField
                          fullWidth
                          label="Email Address"
                          variant="outlined"
                          margin="normal"
                          value={forgotPasswordEmail}
                          onChange={(e) =>
                            setForgotPasswordEmail(e.target.value)
                          }
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
                          {isResettingPassword
                            ? "Sending..."
                            : "Send Reset Link"}
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
              )}
            </Box>
          </div>
          {/* Footer remains the same */}
          <div
            className="login-footer"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 2rem",

              boxSizing: "border-box",
              fontSize: "1rem",
            }}
          >
            {/* Left: Version */}
            <div style={{ flex: 1, textAlign: "left", color: "#141414ff" }}>
              Version: {process.env.REACT_APP_VERSION}
            </div>

            {/* Center: Logo */}
            <div style={{ flex: 1, textAlign: "center" }}>
              <img
                src={require("../assets/images/output-onlinegiftools.gif")}
                alt="Novusha  Logo"
                style={{
                  height: "150px",
                  maxWidth: "175px",
                  objectFit: "contain",
                }}
              />
            </div>

            {/* Right: Powered by */}
            <div style={{ flex: 1, textAlign: "right", color: "#000000ff" }}>
              Powered By:{" "}
              <a
                href="https://www.novusha.com/"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#000000ff",
                  textDecoration: "none",
                  fontWeight: 400,
                }}
              >
                Novusha Consulting
                <br></br>Service India LLP. | EXIM
              </a>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default LoginPage;
