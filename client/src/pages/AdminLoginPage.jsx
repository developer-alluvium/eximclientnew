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
import { Visibility, VisibilityOff, AdminPanelSettings } from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import { modernTheme } from "../styles/modernTheme";
import axios from "axios";
import "../styles/auth.scss";

function AdminLoginPage() {
  const [formData, setFormData] = useState({
    ie_code_no: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check if admin is already logged in
  useEffect(() => {
    const savedAdmin = localStorage.getItem("exim_admin");
    if (savedAdmin) {
      navigate("/customer-admin/dashboard", { replace: true });
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
    if (!formData.ie_code_no || !formData.password) {
      setError("IE Code and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/customer-admin/login`,
        formData,
        { withCredentials: true }
      );

      if (response.data.success) {
        // Store admin data
        localStorage.setItem("exim_admin", JSON.stringify(response.data.data.user));
        
        // Navigate to customer admin dashboard
        navigate("/customer-admin/dashboard", { replace: true });
      }
    } catch (error) {
      let errorMessage = "Login failed. Please try again.";
      
      if (error.response?.status === 401) {
        errorMessage = "Invalid IE Code or password.";
      } else if (error.response?.status === 423) {
        errorMessage = "Account is temporarily locked. Please try again later.";
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
                Admin Portal
              </Typography>
              <Typography variant="body1" className="auth-left-subtitle">
                Manage users and module access for your organization
              </Typography>
              <div className="auth-left-features">
                <Typography variant="body2">✓ User verification & approval</Typography>
                <Typography variant="body2">✓ Module access management</Typography>
                <Typography variant="body2">✓ User activity monitoring</Typography>
                <Typography variant="body2">✓ Analytics & reports</Typography>
              </div>
            </div>
          </Col>
          
          <Col lg={6} className="auth-right-col">
            <div className="auth-right-content">
              <Card className="auth-card">
                <CardContent>
                  <Box className="auth-header">
                    <AdminPanelSettings 
                      sx={{ 
                        fontSize: 40, 
                        color: 'primary.main',
                        mb: 2 
                      }} 
                    />
            
                    <Typography variant="body2" color="text.secondary">
                      Access your admin dashboard
                    </Typography>
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}


                  <Box className="auth-footer">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <MuiLink 
                        component={Link} 
                        to="/login" 
                        color="secondary"
                        underline="hover"
                      >
                        User Login
                      </MuiLink>
                      {" | "}
                      <MuiLink 
                        component={Link} 
                        to="/login" 
                        color="secondary"
                        underline="hover"
                      >
                        SuperAdmin Login
                      </MuiLink>
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary">
                      Admin accounts are created by SuperAdmin
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

export default AdminLoginPage;
