import React, { useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { styled, alpha } from "@mui/material/styles";
import axios from "axios";
import { getJsonCookie } from "../utils/cookies";

// Import icons
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import LockResetIcon from "@mui/icons-material/LockReset";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const HeaderBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "#fff",
  color: theme.palette.text.primary,
  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
  position: "fixed",
  zIndex: theme.zIndex.drawer + 1,
}));

const DateTimeContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0.7, 2.5),
  borderRadius: "24px",
  backgroundColor: alpha(theme.palette.grey[100], 0.8),
  marginRight: theme.spacing(2),
  "& svg": {
    marginRight: theme.spacing(1),
    color: theme.palette.warning.main, // Orange icon
  },
}));

const UserMenu = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  padding: theme.spacing(0.6, 1.2),
  borderRadius: "24px",
  transition: "background-color 0.2s ease",
  "&:hover": {
    backgroundColor: alpha(theme.palette.grey[100], 0.8),
  },
}));

function Header({
  formattedDate,
  formattedTime,
  userName,
  userInitial,
  anchorEl,
  open,
  handleUserMenuOpen,
  handleUserMenuClose,
  handleLogout,
}) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  // Get user data from localStorage or context
  const getUserData = () => {
    try {
      const userData = getJsonCookie("exim_user");
      if (!userData) return null;

      const parsedData = userData;

      // Handle different user data structures
      if (parsedData.id || parsedData.ie_code_no) {
        return parsedData; // New structure: direct user data
      } else if (parsedData.data && parsedData.data.user) {
        return parsedData.data.user; // Old structure: { data: { user: {...} } }
      }

      return null;
    } catch (error) {
      console.error("Error parsing user data from cookies:", error);
      return null;
    }
  };

  const handlePasswordReset = () => {
    setShowPasswordDialog(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    handleUserMenuClose();
  };

  const handlePasswordDialogClose = () => {
    setShowPasswordDialog(false);
    setPasswordError(null);
    setPasswordSuccess(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const userData = getUserData();
      if (!userData || !userData.id) {
        setPasswordError("User session not found. Please login again.");
        return;
      }

      // First verify current password by attempting login
      const loginResponse = await axios.post(
        `${process.env.REACT_APP_API_STRING}/login`,
        {
          ie_code_no: userData.ie_code_no,
          password: currentPassword,
        },
        { withCredentials: true }
      );

      if (loginResponse.status === 200) {
        // Current password is correct, now update to new password
        const updateResponse = await axios.put(
          `${process.env.REACT_APP_API_STRING}/customer/${userData.id}/password`,
          { newPassword },
          { withCredentials: true }
        );

        if (updateResponse.data.success) {
          setPasswordSuccess("Password updated successfully!");

          // Clear form after success
          setTimeout(() => {
            handlePasswordDialogClose();
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Password update error:", error);
      if (error.response) {
        switch (error.response.status) {
          case 401:
            setPasswordError("Current password is incorrect");
            break;
          case 404:
            setPasswordError("User not found");
            break;
          case 500:
            setPasswordError("Server error. Please try again later.");
            break;
          default:
            setPasswordError(
              error.response.data?.message || "Failed to update password"
            );
        }
      } else {
        setPasswordError("Network error. Please check your connection.");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };
  return (
    <HeaderBar>
      <Toolbar sx={{ justifyContent: "flex-end", minHeight: "64px" }}>
        <DateTimeContainer>
          <AccessTimeIcon />
          <Typography variant="body2" fontWeight="medium">
            {formattedDate} | {formattedTime}
          </Typography>
        </DateTimeContainer>

        <UserMenu onClick={handleUserMenuOpen}>
          <Avatar
            sx={{
              width: 38,
              height: 38,
              bgcolor: "warning.main",
              marginRight: 1,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            {userInitial}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="500">
              {userName}
            </Typography>
          </Box>
          <KeyboardArrowDownIcon sx={{ ml: 0.5 }} />
        </UserMenu>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleUserMenuClose}
          PaperProps={{
            elevation: 3,
            sx: { minWidth: 200, mt: 1, borderRadius: 2 },
          }}
        >
          <MenuItem onClick={handleUserMenuClose} sx={{ py: 1 }}>
            <AccountCircleIcon sx={{ mr: 1.5 }} fontSize="small" />
            <Typography variant="body2">My Profile</Typography>
          </MenuItem>
          <MenuItem onClick={handlePasswordReset} sx={{ py: 1 }}>
            <LockResetIcon sx={{ mr: 1.5 }} fontSize="small" />
            <Typography variant="body2">Reset Password</Typography>
          </MenuItem>
          <Divider sx={{ my: 1 }} />
          <MenuItem onClick={handleLogout} sx={{ py: 1, color: "error.main" }}>
            <LogoutIcon sx={{ mr: 1.5 }} fontSize="small" />
            <Typography variant="body2">Logout</Typography>
          </MenuItem>
        </Menu>

        {/* Password Reset Dialog */}
        <Dialog
          open={showPasswordDialog}
          onClose={handlePasswordDialogClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <LockResetIcon sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h6" fontWeight="600">
                Reset Password
              </Typography>
            </Box>
          </DialogTitle>

          <form onSubmit={handlePasswordSubmit}>
            <DialogContent sx={{ pt: 1 }}>
              {passwordError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordError}
                </Alert>
              )}

              {passwordSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {passwordSuccess}
                </Alert>
              )}

              <Box sx={{ mb: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>User:</strong> {userName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>IE Code:</strong> {getUserData()?.ie_code_no || "N/A"}
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="Current Password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        edge="end"
                        size="small"
                      >
                        {showCurrentPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                required
                helperText="Password must be at least 6 characters long"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                        size="small"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
                helperText="Re-enter your new password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        edge="end"
                        size="small"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button
                onClick={handlePasswordDialogClose}
                variant="outlined"
                disabled={isUpdatingPassword}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isUpdatingPassword}
                sx={{ ml: 1 }}
              >
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Toolbar>
    </HeaderBar>
  );
}

export default Header;
