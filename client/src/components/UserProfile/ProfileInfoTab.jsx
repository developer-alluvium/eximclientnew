// components/UserProfile/ProfileInfoTab.jsx
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Login as LoginIcon,
} from "@mui/icons-material";

const ProfileInfoTab = ({ user }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusChip = (status) => {
    const chipConfig = {
      active: { color: "success", label: "Active" },
      pending: { color: "warning", label: "Pending" },
      verified: { color: "success", label: "Verified" },
    };

    const config = chipConfig[status] || { color: "default", label: status };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const profileFields = [
    {
      label: "Full Name",
      value: user?.name || "N/A",
      icon: <PersonIcon fontSize="small" />,
      iconColor: "primary.main",
      status: "active",
    },
    {
      label: "Email Address",
      value: user?.email || "N/A",
      icon: <EmailIcon fontSize="small" />,
      iconColor: "success.main",
      status: user?.emailVerified ? "verified" : "pending",
    },
    {
      label: "Role",
      value: user?.role?.replace("_", " ").toUpperCase() || "N/A",
      icon: <BusinessIcon fontSize="small" />,
      iconColor: "warning.main",
      status: "active",
    },
    {
      label: "Last Login",
      value: formatDate(user?.lastLogin),
      icon: <LoginIcon fontSize="small" />,
      iconColor: "info.main",
      status: "active",
    },
  ];

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: "#f8f9fa" }}>
            <TableCell sx={{ fontWeight: 600, width: "200px" }}>
              Field
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
            <TableCell sx={{ fontWeight: 600, width: "100px" }}>
              Status
            </TableCell>
            </TableRow>
          </TableHead>
        <TableBody>
          {profileFields.map((field, index) => (
            <TableRow key={index} hover>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      mr: 1,
                      fontSize: "0.75rem",
                      bgcolor: field.iconColor,
                    }}
                  >
                    {field.icon}
                  </Avatar>
                  {field.label}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {field.value}
                </Typography>
              </TableCell>
              <TableCell>{getStatusChip(field.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProfileInfoTab;