// pages/UserProfile.js
import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Typography,
  Button,
  Alert,
  Space,
  Spin,
  Row,
  Col,
  message,
} from "antd";
import { ReloadOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { getCookie } from "../utils/cookies";
import { useAEOIntegration } from "../hooks/useAEOIntegration";

// Components
import ProfileSummaryCard from "../components/UserProfile/ProfileSummaryCard";
import AEOCertificatesCard from "../components/UserProfile/AEOCertificatesCard";
import ProfileTabsContent from "../components/UserProfile/ProfileTabsContent";

// Styles
import "../styles/UserProfile.scss";

const { Title, Text } = Typography;

const UserProfile = () => {
  const navigate = useNavigate();
  const { user: contextUser } = useContext(UserContext);
  const {
    loading: aeoLoading,
    error: aeoError,
    autoVerifyImporters,
    fetchKYCSummary,
    kycSummary,
    updateImporterName,
  } = useAEOIntegration();
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
        setUser((prev) => ({
          ...prev,
          aeo_reminder_enabled: settings.reminder_enabled,
          aeo_reminder_days: settings.reminder_days,
        }));
        message.success("Reminder settings updated successfully");
        return data.settings;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("Error updating reminder settings:", error);
      message.error("Failed to update reminder settings");
      throw error;
    }
  };

  const handleRefreshAEO = async () => {
    try {
      await autoVerifyImporters();
      await fetchKYCSummary();
      setSuccess("AEO data refreshed successfully");
      message.success("AEO data refreshed successfully");
    } catch (error) {
      setError("Failed to refresh AEO data");
      message.error("Failed to refresh AEO data");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Spin size="large" />
        <Text type="secondary">Loading profile...</Text>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <Space size={16} align="center">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ borderRadius: 8 }}
          >
            Back
          </Button>
          <div>
            <Title level={4} style={{ margin: 0, color: "#1e293b" }}>
              User Profile
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Manage your profile, documents, and AEO certificate status
            </Text>
          </div>
        </Space>

        <Button
          type="primary"
          icon={<ReloadOutlined spin={aeoLoading} />}
          onClick={handleRefreshAEO}
          loading={aeoLoading}
          style={{
            borderRadius: 8,
            background: "#1e293b",
            borderColor: "#1e293b",
          }}
        >
          Refresh AEO Data
        </Button>
      </div>

      {/* Global Alerts */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError("")}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {success && (
        <Alert
          message={success}
          type="success"
          showIcon
          closable
          onClose={() => setSuccess("")}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* Main 2-Column Layout */}
      <Row gutter={[24, 24]}>
        {/* Left Column: Profile Summary */}
        <Col xs={24} lg={7}>
          <ProfileSummaryCard user={user} />
        </Col>

        {/* Right Column: Content */}
        <Col xs={24} lg={17}>
          {/* Top Card: AEO Certificates */}
          <div style={{ marginBottom: 24 }}>
            <AEOCertificatesCard
              user={user}
              kycSummary={kycSummary}
              onFetchKYCSummary={fetchKYCSummary}
              onSetError={setError}
              onSetSuccess={setSuccess}
              onUpdateReminderSettings={handleUpdateReminderSettings}
            />
          </div>

          {/* Bottom Card: Tabs (Documents & Importers) */}
          <ProfileTabsContent
            user={user}
            kycSummary={kycSummary}
            onRefreshProfile={fetchUserProfile}
            onSetError={setError}
            onSetSuccess={setSuccess}
          />
        </Col>
      </Row>
    </div>
  );
};

export default UserProfile;
