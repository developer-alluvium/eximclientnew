import React from "react";
import { Typography, Box, Grid, Paper, Button } from "@mui/material";
import {
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Verified as VerifiedIcon,
  Description as DescriptionIcon,
  Folder as FolderIcon,
} from "@mui/icons-material";

const ProfileHeader = ({
  user,
  kycSummary,
  onRefreshAEO,
  aeoLoading,
  onOpenReminderSettings,
}) => {
  const getProfileStats = () => {
    const totalDocs = user?.documents?.length || 0;

    const verifiedAEO =
      kycSummary?.kyc_summaries?.filter((k) => k.has_aeo_data).length || 0;
    const activeCertificates =
      kycSummary?.kyc_summaries?.filter(
        (k) => k.certificate_present_validity_status === "Valid"
      ).length || 0;

    return {
      totalDocs,
      verifiedAEO,
      activeCertificates,
      importers: user?.ie_code_assignments?.length || 0,
    };
  };

  const stats = getProfileStats();

  const StatCard = ({ title, value, color, icon: Icon }) => (
    <Paper
      sx={{
        p: 3,
        textAlign: "left",
        borderRadius: 2,
        border: "1px solid #e0e0e0",
        background: `linear-gradient(135deg, ${color}15, ${color}08)`,
        position: "relative",
        overflow: "hidden",
        "&:before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "4px",
          height: "100%",
          backgroundColor: color,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: `${color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 2,
          }}
        >
          <Icon sx={{ color: color, fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: color }}>
            {value}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {title}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );

  return (
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
            variant="h3"
            sx={{
              fontWeight: 700,
              color: "#1a237e",
              mb: 1,
              background: "linear-gradient(135deg, #1a237e, #3949ab)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            User Profile
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: 400 }}
          >
            Manage your profile, documents, and AEO certificate status
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={onRefreshAEO}
          disabled={aeoLoading}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #5a6fd8, #6a42a0)",
              boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
            },
          }}
        >
          Refresh AEO Data
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Assigned Importers"
            value={stats.importers}
            color="#1976d2"
            icon={BusinessIcon}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="AEO Verified"
            value={stats.verifiedAEO}
            color="#2e7d32"
            icon={VerifiedIcon}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Certificates"
            value={stats.activeCertificates}
            color="#ed6c02"
            icon={DescriptionIcon}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Documents"
            value={stats.totalDocs}
            color="#9c27b0"
            icon={FolderIcon}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfileHeader;