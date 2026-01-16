import React from "react";
import { Card, Avatar, Typography, Tag, Space, Divider } from "antd";
import {
  MailOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const ProfileSummaryCard = ({ user }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <Card
      style={{
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        height: "100%",
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Header with dark background */}
      <div
        style={{
          background: "#1e293b",
          padding: "32px 24px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <Avatar
          size={80}
          style={{
            backgroundColor: "#3b82f6",
            color: "#ffffff",
            fontSize: 32,
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            border: "3px solid rgba(255,255,255,0.2)",
          }}
        >
          {userInitial}
        </Avatar>

        <Title
          level={4}
          style={{ color: "#fff", margin: "16px 0 4px", fontWeight: 600 }}
        >
          {user?.name || "User Name"}
        </Title>

        <Tag
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
            padding: "2px 12px",
            fontSize: 12,
            fontWeight: 500,
            textTransform: "capitalize",
          }}
        >
          {user?.role?.replace("_", " ") || "User"}
        </Tag>
      </div>

      {/* Details section */}
      <div style={{ padding: "24px" }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {/* Email */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MailOutlined style={{ fontSize: 16, color: "#64748b" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                Email
              </Text>
              <Text strong style={{ fontSize: 13, wordBreak: "break-all" }}>
                {user?.email || "N/A"}
              </Text>
            </div>
          </div>

          <Divider style={{ margin: 0 }} />

          {/* Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: user?.emailVerified ? "#f0fdf4" : "#fff7ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {user?.emailVerified ? (
                <CheckCircleOutlined
                  style={{ fontSize: 16, color: "#22c55e" }}
                />
              ) : (
                <ClockCircleOutlined
                  style={{ fontSize: 16, color: "#f97316" }}
                />
              )}
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                Status
              </Text>
              <Tag
                color={user?.emailVerified ? "success" : "warning"}
                style={{ margin: 0, borderRadius: 4 }}
              >
                {user?.emailVerified ? "Verified" : "Pending"}
              </Tag>
            </div>
          </div>

          <Divider style={{ margin: 0 }} />

          {/* Last Login */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarOutlined style={{ fontSize: 16, color: "#64748b" }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                Last Login
              </Text>
              <Text strong style={{ fontSize: 13 }}>
                {formatDate(user?.lastLogin)}
              </Text>
            </div>
          </div>
        </Space>
      </div>
    </Card>
  );
};

export default ProfileSummaryCard;
