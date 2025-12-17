// pages/UserProfile.js
import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../context/UserContext";
import { getCookie } from "../utils/cookies";
import BackButton from "../components/BackButton";
import { useAEOIntegration } from "../hooks/useAEOIntegration";
import { useSnackbar } from "notistack";
import { Refresh } from "@mui/icons-material";

// Components
import ProfileSummaryCard from "../components/UserProfile/ProfileSummaryCard";
import AEOCertificatesCard from "../components/UserProfile/AEOCertificatesCard";
import ProfileTabsContent from "../components/UserProfile/ProfileTabsContent";

// Styles
import "../styles/UserProfile.scss";

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

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = getCookie("access_token");
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/user/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
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
      const token = getCookie("access_token");
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
        setUser((prev) => ({
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
      <div
        className="user-profile-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      {/* Compact Header Section */}
      <div className="profile-header-compact">
        <div className="header-left">
          <BackButton />
          <div className="header-text">
            <h1 className="profile-header-title">User Profile</h1>
            <span className="profile-header-subtitle">
              Manage your profile, documents, and AEO certificate status
            </span>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleRefreshAEO}
          disabled={aeoLoading}
        >
          <Refresh style={{ fontSize: 16 }} /> Refresh AEO Data
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            background: "#fee2e2",
            color: "#ef4444",
            borderRadius: "8px",
            border: "1px solid #fecaca",
          }}
        >
          {error}{" "}
          <button
            onClick={() => setError("")}
            style={{
              float: "right",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            x
          </button>
        </div>
      )}
      {success && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            background: "#dcfce7",
            color: "#16a34a",
            borderRadius: "8px",
            border: "1px solid #bbf7d0",
          }}
        >
          {success}{" "}
          <button
            onClick={() => setSuccess("")}
            style={{
              float: "right",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            x
          </button>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="profile-layout">
        {/* Left Column: Profile Summary */}
        <div className="left-column">
          <ProfileSummaryCard user={user} />
        </div>

        {/* Right Column: Content */}
        <div className="right-column">
          {/* Top Card: AEO Certificates */}
          <AEOCertificatesCard
            user={user}
            kycSummary={kycSummary}
            onFetchKYCSummary={fetchKYCSummary}
            onSetError={setError}
            onSetSuccess={setSuccess}
            onUpdateReminderSettings={handleUpdateReminderSettings}
          />

          {/* Bottom Card: Tabs (Documents & Importers) */}
          <ProfileTabsContent
            user={user}
            kycSummary={kycSummary}
            onRefreshProfile={fetchUserProfile}
            onSetError={setError}
            onSetSuccess={setSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
