// pages/UserProfile.js
import React, { useState, useEffect, useContext } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  LinearProgress,
  Alert,
} from "@mui/material";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { UserContext } from "../context/UserContext";
import BackButton from "../components/BackButton";
import { useAEOIntegration } from "../hooks/useAEOIntegration";
import ProfileHeader from "../components/UserProfile/ProfileHeader"
import ProfileTabs from "../components/UserProfile/ProfileTabs";
import AEOReminderSettingsDialog from "../components/UserProfile/AEOReminderSettingsDialog";
import { useSnackbar } from 'notistack'; 

const UserProfile = () => {
  const { user: contextUser } = useContext(UserContext);
  const {
    loading: aeoLoading,
    error: aeoError,
    autoVerifyImporters,
    fetchKYCSummary,
    kycSummary,
    updateImporterName,
  } = useAEOIntegration();
  const { enqueueSnackbar } = useSnackbar();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reminderSettingsOpen, setReminderSettingsOpen] = useState(false);

  
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/user/profile`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setUser(data.user);

        // Auto-verify AEO data when profile loads
        if (data.user.ie_code_assignments?.length > 0) {
          setTimeout(async () => {
            try {
              await autoVerifyImporters();
              await fetchKYCSummary();
            } catch (error) {
              console.error("AEO auto-verification failed:", error);
            }
          }, 1000);
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReminderSettings = async (settings) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/api/aeo/reminder-settings`,
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
        // Update local user state
        setUser(prev => ({
          ...prev,
          aeo_reminder_enabled: settings.reminder_enabled,
          aeo_reminder_days: settings.reminder_days,
        }));
        return data.settings;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("Error updating reminder settings:", error);
      throw error;
    }
  };
  const handleRefreshAEO = async () => {
    try {
      await autoVerifyImporters();
      await fetchKYCSummary();
      setSuccess("AEO data refreshed successfully");
    } catch (error) {
      setError("Failed to refresh AEO data");
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ width: "100%", mb: 2 }}>
          <LinearProgress />
        </Box>
        <Typography variant="h6" color="text.secondary" align="center">
          Loading your profile...
        </Typography>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}

        {aeoError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            AEO Verification: {aeoError}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <BackButton />
        </Box>

        {/* Header Section */}
        <ProfileHeader 
          user={user} 
          kycSummary={kycSummary}
          onRefreshAEO={handleRefreshAEO}
          aeoLoading={aeoLoading}
          onOpenReminderSettings={() => setReminderSettingsOpen(true)}
        />

        {/* Tabs Section */}
        <ProfileTabs
          user={user}
          kycSummary={kycSummary}
          aeoLoading={aeoLoading}
          onUpdateImporterName={updateImporterName}
          onFetchKYCSummary={fetchKYCSummary}
          onRefreshProfile={fetchUserProfile}
          onSetError={setError}
          onSetSuccess={setSuccess}
           onUpdateReminderSettings={handleUpdateReminderSettings}
        />

        {/* AEO Reminder Settings Dialog */}
        <AEOReminderSettingsDialog
          open={reminderSettingsOpen}
          onClose={() => setReminderSettingsOpen(false)}
          user={user}
          aeoCertificates={kycSummary?.kyc_summaries || []}
        />
      </Container>
    </LocalizationProvider>
  );
};

export default UserProfile;