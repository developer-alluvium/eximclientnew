// components/UserProfile/AEOCertificatesTab.jsx
import React, { useState } from "react";
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
} from "@mui/material";
import {
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  VerifiedUser as VerifiedIcon,
  NotificationsActive as NotificationsIcon,
} from "@mui/icons-material";

const AEOCertificatesTab = ({
  user,
  kycSummary,
  aeoLoading,
  onUpdateImporterName,
  onFetchKYCSummary,
  onSetError,
  onSetSuccess,
  onUpdateReminderSettings,
}) => {
  const [selectedImporter, setSelectedImporter] = useState("");
  const [updateImporterOpen, setUpdateImporterOpen] = useState(false);
  const [selectedImporterForUpdate, setSelectedImporterForUpdate] =
    useState(null);
  const [newImporterName, setNewImporterName] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [reminderSettingsOpen, setReminderSettingsOpen] = useState(false);
  const [localReminderSettings, setLocalReminderSettings] = useState({
    reminder_enabled: true,
    reminder_days: 90,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const presetDays = [30, 60, 90, 120, 180, 365];

  // Initialize local settings from user data
  React.useEffect(() => {
    if (user) {
      setLocalReminderSettings({
        reminder_enabled: user.aeo_reminder_enabled ?? true,
        reminder_days: user.aeo_reminder_days ?? 90,
      });
    }
  }, [user]);

  const handleImporterChange = (event) => {
    setSelectedImporter(event.target.value);
  };

  const handleReminderEnableChange = (enabled) => {
    setLocalReminderSettings(prev => ({
      ...prev,
      reminder_enabled: enabled,
    }));
  };

  const handleDaysChange = (event) => {
    setLocalReminderSettings(prev => ({
      ...prev,
      reminder_days: Number(event.target.value),
    }));
  };

  const handleSaveReminderSettings = async () => {
    setSavingSettings(true);
    try {
      await onUpdateReminderSettings(localReminderSettings);
      onSetSuccess("Reminder settings updated successfully");
      setReminderSettingsOpen(false);
    } catch (error) {
      onSetError("Failed to update reminder settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateImporterName = async () => {
    if (!selectedImporterForUpdate || !newImporterName.trim()) {
      onSetError("Please enter a valid importer name");
      return;
    }

    setUpdateLoading(true);
    try {
      await onUpdateImporterName(
        selectedImporterForUpdate.ie_code_no,
        newImporterName.trim()
      );
      onSetSuccess("Importer name updated successfully");
      setUpdateImporterOpen(false);
      setNewImporterName("");
      setSelectedImporterForUpdate(null);
      await onFetchKYCSummary();
    } catch (error) {
      onSetError("Failed to update importer name: " + error.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const openUpdateImporterDialog = (importerData) => {
    setSelectedImporterForUpdate(importerData);
    setNewImporterName(importerData.importer_name);
    setUpdateImporterOpen(true);
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
    if (localReminderSettings.reminder_enabled === false) {
      return "Reminders disabled";
    }
    const days = localReminderSettings.reminder_days;
    return `Notify ${days} days before expiry`;
  };

  const ReminderSettingsCard = () => {
    const stats = kycSummary?.kyc_summaries || [];
    
    const today = new Date();
    const expiringSoon = stats.filter((cert) => {
      if (!cert.certificate_validity_date || !localReminderSettings.reminder_enabled) return false;
      const expiryDate = new Date(cert.certificate_validity_date);
      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry > 0 && daysUntilExpiry <= localReminderSettings.reminder_days;
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
        }}
      >
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          {/* Header */}
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
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#1a237e" }}>
                AEO Reminders
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Certificate expiry notifications
              </Typography>
            </Box>
          </Box>

          {/* Quick Status */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={localReminderSettings.reminder_enabled ? "Active" : "Disabled"}
                color={localReminderSettings.reminder_enabled ? "success" : "default"}
                size="small"
                variant={localReminderSettings.reminder_enabled ? "filled" : "outlined"}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
              {getReminderStatusText()}
            </Typography>
          </Box>

          {/* Settings Toggle */}
          <Box sx={{ mb: 3, border: "1px solid #e8eaf6", borderRadius: 2, p: 2, bgcolor: "#f8f9ff" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Enable Email Reminders
              </Typography>
              <Switch
                checked={localReminderSettings.reminder_enabled}
                onChange={(e) => handleReminderEnableChange(e.target.checked)}
                color="primary"
                size="small"
              />
            </Box>
            
            {localReminderSettings.reminder_enabled && (
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Notify before expiry</InputLabel>
                  <Select
                    value={localReminderSettings.reminder_days}
                    onChange={handleDaysChange}
                    label="Notify before expiry"
                    sx={{ minWidth: 120 }}
                  >
                    {presetDays.map((days) => (
                      <MenuItem key={days} value={days}>
                        {days} days before expiry
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>

          {/* Stats */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "#1a237e" }}>
              📊 Certificate Overview
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center", p: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#2e7d32" }}>
                    {stats.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center", p: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#1976d2" }}>
                    {stats.length - expired}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center", p: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: expiringSoon > 0 ? "#ed6c02" : "#2e7d32" }}>
                    {expiringSoon}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Alerts
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Action Button */}
          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={() => setReminderSettingsOpen(true)}
            startIcon={<SettingsIcon />}
            disabled={savingSettings}
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
            {savingSettings ? "Saving..." : "Advanced Settings"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const CertificateCard = ({ kyc }) => {
    const daysUntilExpiry = kyc.certificate_validity_date
      ? Math.ceil(
          (new Date(kyc.certificate_validity_date) - new Date()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return (
      <Card
        sx={{
          border: kyc.has_aeo_data ? "1px solid #e0e0e0" : "1px solid #ff9800",
          bgcolor: kyc.has_aeo_data ? "transparent" : "#fffbf0",
          borderRadius: 2,
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <CardContent>
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
            {!kyc.has_aeo_data && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => openUpdateImporterDialog(kyc)}
                sx={{ ml: 1, minWidth: "120px" }}
              >
                Update Name
              </Button>
            )}
          </Box>

          {/* Reminder Status Badge */}
          {daysUntilExpiry !== null && localReminderSettings.reminder_enabled && (
            <Box sx={{ mb: 2 }}>
              <Alert
                severity={
                  daysUntilExpiry <= (localReminderSettings.reminder_days || 90)
                    ? "info"
                    : "success"
                }
                icon={false}
                sx={{
                  py: 0.5,
                  "& .MuiAlert-message": { padding: "4px 0" },
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2">
                  {daysUntilExpiry <= (localReminderSettings.reminder_days || 90)
                    ? `🔔 Alert: Expires in ${daysUntilExpiry} days`
                    : `✅ Safe: ${daysUntilExpiry} days remaining`}
                </Typography>
              </Alert>
            </Box>
          )}

          {!kyc.has_aeo_data ? (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  AEO data not found
                </Typography>
                <Typography variant="body2">
                  The importer name might be different in AEO records. Try
                  updating the name to match AEO directory records.
                </Typography>
              </Alert>
              <Button
                variant="contained"
                color="warning"
                onClick={() => openUpdateImporterDialog(kyc)}
                startIcon={<RefreshIcon />}
              >
                Update & Retry Verification
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  AEO Tier
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {kyc.aeo_tier}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Certificate No
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {kyc.certificate_no}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Issue Date
                </Typography>
                <Typography variant="body2">
                  {formatDate(kyc.certificate_issue_date)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Validity Date
                </Typography>
                <Typography variant="body2">
                  {formatDate(kyc.certificate_validity_date)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Days Until Expiry
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    color:
                      daysUntilExpiry <= 30
                        ? "#d32f2f"
                        : daysUntilExpiry <= 90
                        ? "#ed6c02"
                        : "#2e7d32",
                  }}
                >
                  {daysUntilExpiry !== null ? `${daysUntilExpiry} days` : "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Validity Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusChip(kyc.certificate_present_validity_status)}
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  KYC Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusChip(kyc.kyc_status)}</Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Last Verified
                </Typography>
                <Typography variant="body2">
                  {formatDate(kyc.last_verification) || "Never"}
                </Typography>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    );
  };

  const AdvancedReminderSettings = () => (
    <Card
      sx={{
        mt: 2,
        border: "1px solid #e0e0e0",
        borderRadius: 2,
        bgcolor: "#fafcff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: "#1a237e" }}>
          Advanced Reminder Settings
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
            Enable Reminders
          </Typography>
          <Switch
            checked={localReminderSettings.reminder_enabled}
            onChange={(e) => handleReminderEnableChange(e.target.checked)}
            color="primary"
          />
        </Box>

        {localReminderSettings.reminder_enabled && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
              Notification Timing
            </Typography>
            <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Send reminder</InputLabel>
              <Select
                value={localReminderSettings.reminder_days}
                onChange={handleDaysChange}
                label="Send reminder"
              >
                {presetDays.map((days) => (
                  <MenuItem key={days} value={days}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>{days}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        days before expiry
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Alert severity="info" sx={{ mt: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                You'll receive an email notification when any AEO certificate is within the selected timeframe of expiry.
              </Typography>
            </Alert>
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button
            onClick={() => setReminderSettingsOpen(false)}
            disabled={savingSettings}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveReminderSettings}
            variant="contained"
            disabled={savingSettings || !localReminderSettings.reminder_enabled}
            sx={{ 
              borderRadius: 2,
              background: "linear-gradient(135deg, #667eea, #764ba2)",
            }}
          >
            {savingSettings ? "Saving..." : "Save Settings"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 3,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: "#1a237e", mb: 1 }}
            >
              AEO Certificates
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Automated verification from official AEO directories
            </Typography>
          </Box>
          
          {/* Reminder Settings Card - Moved to top right */}
          <ReminderSettingsCard />
        </Box>

        {/* Warning for failed verifications */}
        {kycSummary?.kyc_summaries?.some(
          (k) => !k.has_aeo_data && k.kyc_status === "not_found"
        ) && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Some certificates couldn't be verified automatically
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Update importer names to match official AEO records for better verification results.
            </Typography>
          </Alert>
        )}

        {/* Importer Selection */}
        {user?.ie_code_assignments?.length > 1 && (
          <FormControl fullWidth sx={{ mb: 3, maxWidth: 400 }}>
            <InputLabel>Select Importer</InputLabel>
            <Select
              value={selectedImporter}
              onChange={handleImporterChange}
              label="Select Importer"
            >
              <MenuItem value="">
                <em>All Importers</em>
              </MenuItem>
              {user.ie_code_assignments.map((assignment, index) => (
                <MenuItem key={index} value={assignment.ie_code_no}>
                  {assignment.importer_name} - {assignment.ie_code_no}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {aeoLoading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Advanced Settings - Inline */}
      {reminderSettingsOpen && <AdvancedReminderSettings />}

      {/* Certificates Grid */}
      {kycSummary?.kyc_summaries?.length > 0 ? (
        <Grid container spacing={3}>
          {kycSummary.kyc_summaries
            .filter(
              (kyc) => !selectedImporter || kyc.ie_code_no === selectedImporter
            )
            .map((kyc, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <CertificateCard kyc={kyc} />
              </Grid>
            ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <VerifiedIcon
            sx={{ fontSize: 64, color: "text.secondary", mb: 3, opacity: 0.5 }}
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No AEO Certificates Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Certificates will be automatically fetched and verified when available
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onFetchKYCSummary}
            disabled={aeoLoading}
          >
            Refresh Verification
          </Button>
        </Box>
      )}

      {/* Update Importer Dialog */}
      <Dialog
        open={updateImporterOpen}
        onClose={() => setUpdateImporterOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Update Importer Name
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              IE Code: <strong>{selectedImporterForUpdate?.ie_code_no}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Current Name: <strong>{selectedImporterForUpdate?.importer_name}</strong>
            </Typography>
          </Box>

          <TextField
            autoFocus
            margin="dense"
            label="New Importer Name"
            fullWidth
            variant="outlined"
            value={newImporterName}
            onChange={(e) => setNewImporterName(e.target.value)}
            sx={{ mt: 1 }}
            placeholder="Enter the exact importer name as in AEO records"
            helperText="Enter the exact company name as registered in AEO directory."
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Updating the name will trigger a new AEO verification with the updated name.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateImporterOpen(false)} disabled={updateLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateImporterName}
            variant="contained"
            disabled={updateLoading || !newImporterName.trim()}
            color="warning"
          >
            {updateLoading ? "Updating..." : "Update & Verify"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AEOCertificatesTab;
