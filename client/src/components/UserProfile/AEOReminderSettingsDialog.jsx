// components/UserProfile/AEOReminderSettingsDialog.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  Slider,
  Chip,
  Paper,
  Divider,
  Grid,
} from "@mui/material";
import { NotificationsActive as NotificationsIcon } from "@mui/icons-material";

const AEOReminderSettingsDialog = ({ open, onClose, user, aeoCertificates = [] }) => {
  const [settings, setSettings] = useState({
    reminder_enabled: true,
    reminder_days: 90,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setSettings({
        reminder_enabled: user.aeo_reminder_enabled ?? true,
        reminder_days: user.aeo_reminder_days ?? 90,
      });
    }
  }, [user, open]);

  // Calculate certificate expiry statistics
  const getCertificateStats = () => {
    const today = new Date();
    const expiringSoon = aeoCertificates.filter((cert) => {
      if (!cert.certificate_validity_date) return false;
      const expiryDate = new Date(cert.certificate_validity_date);
      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );
      return (
        daysUntilExpiry > 0 && daysUntilExpiry <= (settings.reminder_days || 90)
      );
    }).length;

    const expired = aeoCertificates.filter((cert) => {
      if (!cert.certificate_validity_date) return false;
      return new Date(cert.certificate_validity_date) < today;
    }).length;

    const active = aeoCertificates.filter((cert) => {
      if (!cert.certificate_validity_date) return false;
      const expiryDate = new Date(cert.certificate_validity_date);
      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry > (settings.reminder_days || 90);
    }).length;

    return { expiringSoon, expired, active, total: aeoCertificates.length };
  };

  const stats = getCertificateStats();

  const updateSettings = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/aeo/reminder-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(settings),
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: "Reminder settings updated successfully!",
        });
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (event, newValue) => {
    setSettings((prev) => ({ ...prev, reminder_days: newValue }));
  };

  const handleInputChange = (event) => {
    const value = Math.min(365, Math.max(1, Number(event.target.value)));
    setSettings((prev) => ({ ...prev, reminder_days: value }));
  };

  const handleBlur = () => {
    if (settings.reminder_days < 1) {
      setSettings((prev) => ({ ...prev, reminder_days: 1 }));
    } else if (settings.reminder_days > 365) {
      setSettings((prev) => ({ ...prev, reminder_days: 365 }));
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f7ff 0%, #ffffff 100%)',
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" sx={{ py: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              color: 'white',
            }}
          >
            <NotificationsIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a237e' }}>
              AEO Certificate Reminder Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure when to receive email notifications
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {message.text && (
          <Alert 
            severity={message.type} 
            sx={{ 
              mb: 3,
              borderRadius: 2,
            }}
          >
            {message.text}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Left Column - Settings */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                background: 'white',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.reminder_enabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        reminder_enabled: e.target.checked,
                      }))
                    }
                    color="primary"
                    size="medium"
                  />
                }
                label={
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Enable Email Reminders
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive notifications about expiring certificates
                    </Typography>
                  </Box>
                }
                sx={{ width: '100%', mb: 4 }}
              />

              {settings.reminder_enabled && (
                <Box>
                  <Typography
                    gutterBottom
                    variant="h6"
                    sx={{ fontWeight: 600, mb: 3, color: '#1a237e' }}
                  >
                    Remind me before expiry
                  </Typography>
                  
                  <Box sx={{ px: 1, mb: 4 }}>
                    <Slider
                      value={settings.reminder_days}
                      onChange={handleSliderChange}
                      min={1}
                      max={365}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${value} days`}
                      sx={{ 
                        mb: 3,
                        color: 'primary.main',
                      }}
                    />
                  </Box>

                  <Box display="flex" alignItems="center" gap={3} sx={{ mb: 4 }}>
                    <TextField
                      label="Days before expiry"
                      type="number"
                      value={settings.reminder_days}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      inputProps={{ min: 1, max: 365 }}
                      size="small"
                      sx={{ width: 140 }}
                      variant="outlined"
                    />
                    <Chip
                      label={`${settings.reminder_days} days`}
                      color="primary"
                      variant="filled"
                      sx={{ 
                        fontWeight: 700,
                        fontSize: '1rem',
                        px: 2,
                        py: 1
                      }}
                    />
                  </Box>

                  <Alert 
                    severity="info" 
                    sx={{ 
                      mt: 2,
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Reminders are sent automatically when certificates are within the specified days of expiry.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Right Column - Preview & Stats */}
          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                background: 'linear-gradient(135deg, #667eea0a 0%, #764ba20a 100%)',
                height: 'fit-content'
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#1a237e' }}>
                Certificate Status Overview
              </Typography>

              {settings.reminder_enabled ? (
                <Box>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 3, lineHeight: 1.6 }}
                  >
                    You will receive email reminders <strong>{settings.reminder_days} days</strong> before your AEO certificates expire.
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 2, color: '#1a237e' }}>
                      📊 Certificate Statistics
                    </Typography>
                    <Box sx={{ pl: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Active Certificates
                        </Typography>
                        <Chip 
                          label={stats.active} 
                          color="success" 
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      {stats.expiringSoon > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="body2" color="warning.main">
                            Expiring within {settings.reminder_days} days
                          </Typography>
                          <Chip 
                            label={stats.expiringSoon} 
                            color="warning" 
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      )}
                      {stats.expired > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="body2" color="error.main">
                            Expired Certificates
                          </Typography>
                          <Chip 
                            label={stats.expired} 
                            color="error" 
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Total Certificates
                        </Typography>
                        <Chip 
                          label={stats.total} 
                          color="primary" 
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Alert 
                    severity="success" 
                    sx={{ 
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      ✅ Your reminder settings are active. You'll receive email notifications automatically.
                    </Typography>
                  </Alert>
                </Box>
              ) : (
                <Alert 
                  severity="warning"
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Email reminders are currently disabled. You won't receive notifications about expiring AEO certificates.
                  </Typography>
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          sx={{
            px: 4,
            py: 1,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={updateSettings} 
          variant="contained"
          disabled={loading}
          sx={{ 
            px: 4,
            py: 1,
            borderRadius: 2,
            minWidth: 140,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
          }}
        >
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AEOReminderSettingsDialog;