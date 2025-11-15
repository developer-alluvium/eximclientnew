// components/UserProfile/ProfileInfoTab.jsx
import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Stack,
  Divider,
  Paper,
  Grid,
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Login as LoginIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";

const ProfileInfoTab = ({ user }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusChip = (status) => {
    const chipConfig = {
      active: { 
        color: "success", 
        label: "Active",
        icon: <CheckCircleIcon sx={{ fontSize: 16 }} />
      },
      pending: { 
        color: "warning", 
        label: "Pending",
        icon: <ScheduleIcon sx={{ fontSize: 16 }} />
      },
      verified: { 
        color: "success", 
        label: "Verified",
        icon: <CheckCircleIcon sx={{ fontSize: 16 }} />
      },
    };

    const config = chipConfig[status] || { color: "default", label: status };
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small"
        icon={config.icon}
        sx={{ 
          fontWeight: 600,
          borderRadius: '8px',
          px: 0.5
        }} 
      />
    );
  };

  const profileFields = [
    {
      label: "Full Name",
      value: user?.name || "N/A",
      icon: <PersonIcon />,
      iconBg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      status: "active",
    },
    {
      label: "Email Address",
      value: user?.email || "N/A",
      icon: <EmailIcon />,
      iconBg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      status: user?.emailVerified ? "verified" : "pending",
    },
    {
      label: "Role",
      value: user?.role?.replace("_", " ").toUpperCase() || "N/A",
      icon: <BusinessIcon />,
      iconBg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      status: "active",
    },
    {
      label: "Last Login",
      value: formatDate(user?.lastLogin),
      icon: <LoginIcon />,
      iconBg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      status: "active",
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        {profileFields.map((field, index) => (
          <Paper
            key={index}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                transform: 'translateY(-2px)',
                borderColor: 'primary.main',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2.5 }}>
              {/* Icon Section */}
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  background: field.iconBg,
                  mr: 2.5,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}
              >
                {field.icon}
              </Avatar>

              {/* Content Section */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.7rem',
                  }}
                >
                  {field.label}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                    mt: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {field.value}
                </Typography>
              </Box>

              {/* Status Section */}
              <Box sx={{ ml: 2 }}>
                {getStatusChip(field.status)}
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>

     
    </Box>
  );
};

export default ProfileInfoTab;