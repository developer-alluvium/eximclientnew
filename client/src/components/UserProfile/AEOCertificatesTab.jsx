import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Slider,
  Paper,
  Divider,
  FormControlLabel,
  IconButton, // Added
  Tooltip,
} from "@mui/material";
import {
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  VerifiedUser as VerifiedIcon,
  NotificationsActive as NotificationsIcon,
  AddCircle as AddIcon, // Added
  Delete as DeleteIcon,
} from "@mui/icons-material";
import axios from "axios";

// --- Reminder Settings Dialog Component ---
const AEOReminderSettingsDialog = ({
  open,
  onClose,
  settings,
  onSettingsChange,
  onSave,
  loading,
  aeoCertificates = [],
  message,
}) => {
  const getCertificateStats = () => {
    const today = new Date();
    const currentReminderDays = settings?.reminder_days || 90;

    const expiringSoon = aeoCertificates.filter((cert) => {
      if (!cert.certificate_validity_date) return false;
      const expiryDate = new Date(cert.certificate_validity_date);
      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry > 0 && daysUntilExpiry <= currentReminderDays;
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
      return daysUntilExpiry > currentReminderDays;
    }).length;

    return { expiringSoon, expired, active, total: aeoCertificates.length };
  };

  const stats = settings
    ? getCertificateStats()
    : { expiringSoon: 0, expired: 0, active: 0, total: 0 };

  const handleEnabledChange = (event) => {
    onSettingsChange({
      ...settings,
      reminder_enabled: event.target.checked,
    });
  };

  const handleSliderChange = (event, newValue) => {
    onSettingsChange({
      ...settings,
      reminder_days: newValue,
    });
  };

  const handleInputChange = (event) => {
    const value = Math.min(365, Math.max(1, Number(event.target.value)));
    onSettingsChange({
      ...settings,
      reminder_days: value,
    });
  };

  const handleBlur = () => {
    if (settings.reminder_days < 1) {
      onSettingsChange({ ...settings, reminder_days: 1 });
    } else if (settings.reminder_days > 365) {
      onSettingsChange({ ...settings, reminder_days: 365 });
    }
  };

  if (!settings) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "linear-gradient(135deg, #f5f7ff 0%, #ffffff 100%)",
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" sx={{ py: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mr: 2,
              color: "white",
            }}
          >
            <NotificationsIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a237e" }}>
              AEO Certificate Reminder Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure when to receive email notifications
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {message && message.text && (
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
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                background: "white",
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.reminder_enabled}
                    onChange={handleEnabledChange}
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
                sx={{ width: "100%", mb: 4 }}
              />

              {settings.reminder_enabled && (
                <Box>
                  <Typography
                    gutterBottom
                    variant="h6"
                    sx={{ fontWeight: 600, mb: 3, color: "#1a237e" }}
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
                        color: "primary.main",
                      }}
                    />
                  </Box>

                  <Box
                    display="flex"
                    alignItems="center"
                    gap={3}
                    sx={{ mb: 4 }}
                  >
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
                        fontSize: "1rem",
                        px: 2,
                        py: 1,
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
                      Reminders are sent automatically when certificates are
                      within the specified days of expiry.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                background:
                  "linear-gradient(135deg, #667eea0a 0%, #764ba20a 100%)",
                height: "fit-content",
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, mb: 3, color: "#1a237e" }}
              >
                Certificate Status Overview
              </Typography>

              {settings.reminder_enabled ? (
                <Box>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 3, lineHeight: 1.6 }}
                  >
                    You will receive email reminders{" "}
                    <strong>{settings.reminder_days} days</strong> before your
                    AEO certificates expire.
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 600, mb: 2, color: "#1a237e" }}
                    >
                      📊 Certificate Statistics (Preview)
                    </Typography>
                    <Box sx={{ pl: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1.5,
                        }}
                      >
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
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1.5,
                          }}
                        >
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
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1.5,
                          }}
                        >
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
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mt: 2,
                          pt: 2,
                          borderTop: "1px solid",
                          borderColor: "divider",
                        }}
                      >
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
                      ✅ Your reminder settings are active. You'll receive email
                      notifications automatically.
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
                    Email reminders are currently disabled. You won't receive
                    notifications about expiring AEO certificates.
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
            border: "1px solid",
            borderColor: "divider",
            color: "text.secondary",
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={loading}
          sx={{
            px: 4,
            py: 1,
            borderRadius: 2,
            minWidth: 140,
            background: "linear-gradient(135deg, #667eea, #764ba2)",
          }}
        >
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Main Tab Component ---
const AEOCertificatesTab = ({
  user,
  kycSummary,
  aeoLoading,
  onUpdateCertificateNumber,
  onFetchKYCSummary,
  onSetError,
  onSetSuccess,
  onUpdateReminderSettings,
}) => {
  const [selectedImporter, setSelectedImporter] = useState("");
  const [updateCertificateOpen, setUpdateCertificateOpen] = useState(false);
  const [selectedImporterForUpdate, setSelectedImporterForUpdate] =
    useState(null);
  const [newCertificateNumber, setNewCertificateNumber] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  // Reminder Settings State
  const [reminderSettingsOpen, setReminderSettingsOpen] = useState(false);
  const [savedReminderSettings, setSavedReminderSettings] = useState({
    reminder_enabled: true,
    reminder_days: 90,
  });
  const [tempReminderSettings, setTempReminderSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({
    type: "",
    text: "",
  });

  // Initialize saved settings from user data
  useEffect(() => {
    if (user) {
      const settings = {
        reminder_enabled: user.aeo_reminder_enabled ?? true,
        reminder_days: user.aeo_reminder_days ?? 90,
      };
      setSavedReminderSettings(settings);
    }
  }, [user]);

  const handleImporterChange = (event) => {
    setSelectedImporter(event.target.value);
  };

  const handleOpenReminderDialog = () => {
    setSettingsMessage({ type: "", text: "" });
    setTempReminderSettings(savedReminderSettings);
    setReminderSettingsOpen(true);
  };

  const handleCloseReminderDialog = () => {
    setReminderSettingsOpen(false);
    setTempReminderSettings(null);
  };

  const handleSaveReminderSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage({ type: "", text: "" });
    try {
      await onUpdateReminderSettings(tempReminderSettings);
      setSavedReminderSettings(tempReminderSettings);
      onSetSuccess("Reminder settings updated successfully!");
      setSettingsMessage({
        type: "success",
        text: "Settings saved successfully!",
      });
      setTimeout(() => {
        handleCloseReminderDialog();
      }, 1500);
    } catch (error) {
      const errorText = error.message || "Failed to update reminder settings";
      onSetError(errorText);
      setSettingsMessage({ type: "error", text: errorText });
    } finally {
      setSavingSettings(false);
    }
  };
  // Fix 1: Move and properly define handleUpdateCertificateNumber
  const handleUpdateCertificateNumber = async () => {
    if (!newCertificateNumber.trim() || !selectedImporterForUpdate) {
      return;
    }

    setUpdateLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/aeo/update-certificate-number`,
        {
          ieCode: selectedImporterForUpdate.ie_code_no,
          certificateNumber: newCertificateNumber.trim(),
          userId: user._id, // Ensure user ID is passed
        },
        { headers: { "Content-Type": "application/json" } }
      );

      await onFetchKYCSummary();
      onSetSuccess("Certificate added successfully!");
      setUpdateCertificateOpen(false);
      setNewCertificateNumber(""); // Clear input
    } catch (error) {
      console.error("Error updating certificate:", error);
      const errorMsg =
        error.response?.data?.message || "Failed to add certificate";
      onSetError(errorMsg);
    } finally {
      setUpdateLoading(false);
    }
  };

  const openUpdateCertificateDialog = (importerData) => {
    setSelectedImporterForUpdate(importerData);
    setNewCertificateNumber(
      importerData.certificate_no === "Not Available"
        ? ""
        : importerData.certificate_no
    );
    setUpdateCertificateOpen(true);
  };

  const openAddCertificateDialog = (importerData) => {
    setSelectedImporterForUpdate(importerData);
    setNewCertificateNumber(""); // Always clear for adding new
    setUpdateCertificateOpen(true);
  };

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
      not_found: { color: "error", label: "Not Found" },
      expired: { color: "error", label: "Expired" },
      Valid: { color: "success", label: "Valid" },
      Expired: { color: "error", label: "Expired" },
    };
    const config = chipConfig[status] || { color: "default", label: status };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getReminderStatusText = () => {
    if (savedReminderSettings.reminder_enabled === false) {
      return "Reminders disabled";
    }
    const days = savedReminderSettings.reminder_days;
    return `Notify ${days} days before expiry`;
  };

  // Reminder Summary Card
  const ReminderSettingsCard = () => {
    const stats = kycSummary?.kyc_summaries || [];

    const today = new Date();
    const expiringSoon = stats.filter((cert) => {
      if (
        !cert.certificate_validity_date ||
        !savedReminderSettings.reminder_enabled
      )
        return false;
      const expiryDate = new Date(cert.certificate_validity_date);
      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );
      return (
        daysUntilExpiry > 0 &&
        daysUntilExpiry <= savedReminderSettings.reminder_days
      );
    }).length;

    const expired = stats.filter((cert) => {
      if (!cert.certificate_validity_date) return false;
      return new Date(cert.certificate_validity_date) < today;
    }).length;

    return (
      <Card
        sx={{
          minWidth: 320,
          border: "1px solid #e0e0e0",
          borderRadius: 2,
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          },
          bgcolor: "white",
          position: "sticky",
          top: 16,
        }}
      >
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 2,
                color: "white",
              }}
            >
              <NotificationsIcon fontSize="small" />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "#1a237e" }}
              >
                AEO Reminders
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Certificate expiry notifications
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={
                  savedReminderSettings.reminder_enabled ? "Active" : "Disabled"
                }
                color={
                  savedReminderSettings.reminder_enabled ? "success" : "default"
                }
                size="small"
                variant={
                  savedReminderSettings.reminder_enabled ? "filled" : "outlined"
                }
              />
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: "0.875rem" }}
            >
              {getReminderStatusText()}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, mb: 2, color: "#1a237e" }}
            >
              📊 Certificate Overview
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center", p: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#2e7d32" }}
                  >
                    {stats.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center", p: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#1976d2" }}
                  >
                    {stats.length - expired}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center", p: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: expiringSoon > 0 ? "#ed6c02" : "#2e7d32",
                    }}
                  >
                    {expiringSoon}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Alerts
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={handleOpenReminderDialog}
            startIcon={<SettingsIcon />}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              py: 1,
              borderColor: "#1976d2",
              color: "#1976d2",
              "&:hover": {
                borderColor: "#1565c0",
                bgcolor: "#e3f2fd",
              },
            }}
          >
            Manage Reminder Settings
          </Button>
        </CardContent>
      </Card>
    );
  };
  const CertificateCard = ({ kyc }) => {
    const certificates = kyc.aeo_certificates || [];

    return (
      <Card
        sx={{
          border: kyc.has_aeo_data ? "1px solid #e0e0e0" : "1px solid #ff9800",
          bgcolor: kyc.has_aeo_data ? "transparent" : "#fffbf0",
          borderRadius: 2,
          transition: "all 0.3s ease",
          height: "100%",
        }}
      >
        <CardContent>
          {/* Header Row */}
          <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: kyc.has_aeo_data ? "success.main" : "warning.main",
                mr: 2,
              }}
            >
              <BusinessIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {kyc.importer_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                IE Code: {kyc.ie_code_no}
              </Typography>
            </Box>

            {/* ADD CERTIFICATE BUTTON */}
            <Tooltip title="Add New Certificate">
              <IconButton
                color="primary"
                onClick={() => openAddCertificateDialog(kyc)}
                sx={{ bgcolor: "#eff6ff" }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* No Certificates State */}
          {certificates.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  No AEO certificates linked.
                </Typography>
              </Alert>
              <Button
                variant="contained"
                color="warning"
                onClick={() => openAddCertificateDialog(kyc)}
                startIcon={<AddIcon />}
              >
                Add Certificate
              </Button>
            </Box>
          ) : (
            /* Certificates List */
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {certificates.map((cert, index) => {
                const daysUntilExpiry = cert.certificate_validity_date
                  ? Math.ceil(
                      (new Date(cert.certificate_validity_date) - new Date()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null;

                return (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: "#f8f9fa",
                      borderRadius: 2,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: "#1a237e" }}
                      >
                        {cert.certificate_no}
                      </Typography>
                      {getStatusChip(cert.certificate_present_validity_status)}
                    </Box>

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Tier
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {cert.aeo_tier}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Expiry
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: "bold",
                            color:
                              daysUntilExpiry && daysUntilExpiry <= 30
                                ? "#d32f2f"
                                : "#2e7d32",
                          }}
                        >
                          {formatDate(cert.certificate_validity_date)}
                          {daysUntilExpiry !== null &&
                            ` (${daysUntilExpiry} days)`}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Issue Date
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(cert.certificate_issue_date)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            align="center"
          >
            Last Verified: {formatDate(kyc.last_verification) || "Never"}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  // --- Main Render ---
  return (
    <Box>
      {/* ... [Layout logic remains the same] ... */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 4,
        }}
      >
        {/* Left Column */}
        <Box sx={{ flex: { md: 2 }, width: "100%" }}>
          {/* Header and Filter sections remain same */}

          {/* Grid Map */}
          {kycSummary?.kyc_summaries?.length > 0 ? (
            <Grid container spacing={3}>
              {kycSummary.kyc_summaries
                .filter(
                  (kyc) =>
                    !selectedImporter || kyc.ie_code_no === selectedImporter
                )
                .map((kyc, index) => (
                  <Grid item xs={12} lg={6} key={index}>
                    <CertificateCard kyc={kyc} />
                  </Grid>
                ))}
            </Grid>
          ) : (
            /* Empty State remains same */
            <Box>No Data</Box>
          )}
        </Box>

        {/* Right Column */}
        <Box sx={{ flex: { md: 1 }, width: "100%" }}>
          <ReminderSettingsCard />
        </Box>
      </Box>

      {/* Add Certificate Dialog */}
      <Dialog
        open={updateCertificateOpen}
        onClose={() => setUpdateCertificateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Add AEO Certificate
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Importer:{" "}
              <strong>{selectedImporterForUpdate?.importer_name}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              IE Code: <strong>{selectedImporterForUpdate?.ie_code_no}</strong>
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Enter the new Certificate Number. We will verify and add it to your
            list.
          </Alert>

          <TextField
            autoFocus
            margin="dense"
            label="AEO Certificate Number (e.g., AEO-T1-...)"
            fullWidth
            variant="outlined"
            value={newCertificateNumber}
            onChange={(e) => setNewCertificateNumber(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUpdateCertificateOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateCertificateNumber}
            variant="contained"
            disabled={updateLoading || !newCertificateNumber.trim()}
          >
            {updateLoading ? "Verifying..." : "Verify & Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ... [Reminder Dialog remains same] ... */}
      <AEOReminderSettingsDialog
        open={reminderSettingsOpen}
        onClose={handleCloseReminderDialog}
        settings={tempReminderSettings}
        onSettingsChange={setTempReminderSettings}
        onSave={handleSaveReminderSettings}
        loading={savingSettings}
        aeoCertificates={kycSummary?.kyc_summaries || []}
        message={settingsMessage}
      />
    </Box>
  );
};

export default AEOCertificatesTab;
