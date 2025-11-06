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
  onOpenReminderSettings, // Add this prop
}) => {
  const [selectedImporter, setSelectedImporter] = useState("");
  const [updateImporterOpen, setUpdateImporterOpen] = useState(false);
  const [selectedImporterForUpdate, setSelectedImporterForUpdate] =
    useState(null);
  const [newImporterName, setNewImporterName] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  const handleImporterChange = (event) => {
    setSelectedImporter(event.target.value);
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
          {daysUntilExpiry !== null && user?.aeo_reminder_enabled !== false && (
            <Box sx={{ mb: 2 }}>
              <Alert
                severity={
                  daysUntilExpiry <= (user?.aeo_reminder_days || 90)
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
                  {daysUntilExpiry <= (user?.aeo_reminder_days || 90)
                    ? `🔔 Reminder: Expires in ${daysUntilExpiry} days`
                    : `✅ Reminder set for ${
                        user?.aeo_reminder_days || 90
                      } days before expiry`}
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  AEO Tier
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {kyc.aeo_tier}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Certificate No
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {kyc.certificate_no}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Issue Date
                </Typography>
                <Typography variant="body2">
                  {formatDate(kyc.certificate_issue_date)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Validity Date
                </Typography>
                <Typography variant="body2">
                  {formatDate(kyc.certificate_validity_date)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Validity Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusChip(kyc.certificate_present_validity_status)}
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  KYC Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusChip(kyc.kyc_status)}</Box>
              </Grid>
              <Grid item xs={12}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
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

  return (
    <Box>
      {/* Header Section with Settings Button */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 600, color: "#1a237e", mb: 1 }}
            >
              AEO Certificate Status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Automatic verification from AEO Directory and AEO India portal
            </Typography>
          </Box>

          {/* Reminder Settings Quick Access */}
          <Card
            sx={{ minWidth: 280, border: "1px solid #e0e0e0", borderRadius: 2 }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Reminder Settings
                </Typography>
                <Chip
                  label={
                    user?.aeo_reminder_enabled !== false ? "Active" : "Disabled"
                  }
                  color={
                    user?.aeo_reminder_enabled !== false ? "success" : "default"
                  }
                  size="small"
                />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {user?.aeo_reminder_enabled !== false
                  ? `Notify ${user?.aeo_reminder_days || 90} days before expiry`
                  : "Reminders disabled"}
              </Typography>

              <Button
                variant="outlined"
                size="small"
                startIcon={<SettingsIcon />}
                onClick={onOpenReminderSettings}
                fullWidth
                sx={{ borderRadius: 1 }}
              >
                Configure
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Show manual update option if there are failed verifications */}
        {kycSummary?.kyc_summaries?.some(
          (k) => !k.has_aeo_data && k.kyc_status === "not_found"
        ) && (
          <Alert severity="warning" sx={{ mt: 2, mb: 2, borderRadius: 2 }}>
            <Typography variant="body2">
              Some importers couldn't be verified automatically. You can update
              the importer name and try again.
            </Typography>
          </Alert>
        )}

        {/* Importer Selection Dropdown */}
        {user?.ie_code_assignments?.length > 1 && (
          <FormControl fullWidth sx={{ mt: 2, mb: 2, maxWidth: 400 }}>
            <InputLabel>Select Importer</InputLabel>
            <Select
              value={selectedImporter}
              onChange={handleImporterChange}
              label="Select Importer"
            >
              {user.ie_code_assignments.map((assignment, index) => (
                <MenuItem key={index} value={assignment.ie_code_no}>
                  {assignment.importer_name} - {assignment.ie_code_no}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {aeoLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Certificate Cards */}
      {kycSummary?.kyc_summaries?.length > 0 ? (
        <Grid container spacing={3}>
          {kycSummary.kyc_summaries
            .filter(
              (kyc) => !selectedImporter || kyc.ie_code_no === selectedImporter
            )
            .map((kyc, index) => (
              <Grid item xs={12} md={6} key={index}>
                <CertificateCard kyc={kyc} />
              </Grid>
            ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <VerifiedIcon
            sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.5 }}
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No AEO Certificates Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            AEO data will be automatically fetched when you access your profile
          </Typography>
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
              Current Name:{" "}
              <strong>{selectedImporterForUpdate?.importer_name}</strong>
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
              Updating the name will trigger a new AEO verification with the
              updated name.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setUpdateImporterOpen(false)}
            disabled={updateLoading}
          >
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
