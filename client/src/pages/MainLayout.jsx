import React, { useState, useEffect } from "react";
import GlobalNotificationSnackbar from "../components/GlobalNotificationSnackbar";
import { Layout, Avatar, Tooltip, Space, Typography, Divider } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
  CalendarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getJsonCookie, removeCookie } from "../utils/cookies";
import CreditBadge from "../components/wallet/CreditBadge";

const { Header, Content } = Layout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();

  // User data
  const userData = getJsonCookie("exim_user") || {};
  const userName =
    userData.name || userData.username || userData.email || "User";
  const userRole = userData.role;
  const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

  // Time & Date state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    removeCookie("exim_user");
    removeCookie("access_token");
    removeCookie("refresh_token");
    window.dispatchEvent(new Event("exim:logout"));
    navigate("/login");
  };

  // Format time and date
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Icon button style
  const IconButton = ({ icon, tooltip, onClick, danger = false }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <Tooltip title={tooltip} placement="bottom">
        <div
          style={{
            width: 38,
            height: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 0.2s ease",
            background: isHovered
              ? danger
                ? "rgba(255, 77, 79, 0.15)"
                : "rgba(0, 0, 0, 0.05)"
              : "rgba(0, 0, 0, 0.02)",
            color: isHovered
              ? danger
                ? "#ff6b6b"
                : "#1e293b"
              : danger
              ? "#ff4d4f"
              : "#64748b",
          }}
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {icon}
        </div>
      </Tooltip>
    );
  };

  return (
    <Layout style={{ height: "100vh", overflow: "hidden", background: "#f5f7fa" }}>
      <style>{`
        @media (max-width: 768px) {
          .header-datetime-box {
            display: none !important;
          }
          .header-user-text {
            display: none !important;
          }
          .header-divider-mobile {
            display: none !important;
          }
          .main-layout-header {
            padding: 0 12px !important;
            height: 56px !important;
          }
          .main-layout-content-inner {
            padding: 8px 8px !important;
            height: calc(100vh - 56px) !important;
          }
          .header-logo-img {
            height: 42px !important;
            width: 110px !important;
          }
        }
        @media (min-width: 769px) {
          .main-layout-header {
            padding: 0 32px !important;
            height: 64px !important;
          }
          .main-layout-content-inner {
            padding: 24px 32px !important;
            height: calc(100vh - 64px) !important;
          }
        }
      `}</style>
      <Header
        className="main-layout-header"
        style={{
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
          zIndex: 100,
          position: "sticky",
          top: 0,
        }}
      >
        {/* Left Section - Logo */}
        <div
          onClick={() => navigate("/")}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <img
            src={require("../assets/images/logo.webp")}
            alt="EXIM User Portal"
            className="header-logo-img"
            style={{
              height: 55,
              width: 140,
              objectFit: "contain",
            }}
          />
        </div>

        {/* Right Section */}
        <Space size={16} align="center">
          {/* E-Way Bill Credit Badge */}
          <CreditBadge />

          {/* DateTime - Compact inline format */}
          <div
            className="header-datetime-box"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              background: "#f1f5f9",
              borderRadius: 8,
            }}
          >
            <CalendarOutlined
              style={{ color: "#64748b", fontSize: 14 }}
            />
            <Text style={{ fontSize: 13, color: "#475569" }}>
              {formattedDate}
            </Text>
            <Divider
              type="vertical"
              style={{
                margin: "0 4px",
                borderColor: "rgba(0, 0, 0, 0.1)",
              }}
            />
            <Text strong style={{ fontSize: 13, color: "#1e293b" }}>
              {formattedTime}
            </Text>
          </div>

          {/* Divider */}
          <Divider
            type="vertical"
            className="header-divider-mobile"
            style={{ height: 24, borderColor: "rgba(0, 0, 0, 0.1)" }}
          />

          {/* User Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar
              size={36}
              style={{
                backgroundColor: "#3b82f6",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {userInitial}
            </Avatar>
            <div className="header-user-text" style={{ lineHeight: 1.3 }}>
              <Text
                strong
                style={{ fontSize: 13, color: "#1e293b", display: "block" }}
              >
                {userName}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  textTransform: "capitalize",
                }}
              >
                {userRole || "User"}
              </Text>
            </div>
          </div>

          <Divider
            type="vertical"
            style={{ height: 24, borderColor: "rgba(0, 0, 0, 0.1)" }}
          />

          {/* Action Icons */}
          <Space size={8} >
            {/* Profile Button */}
            <IconButton
              icon={<UserOutlined style={{ fontSize: 16  }} />}
              tooltip="My Profile"
              onClick={() => navigate("/user/profile")}
            />

            {/* Users Management - Only for Admin */}
            {userRole === "admin" && (
              <IconButton
                icon={<TeamOutlined style={{ fontSize: 16 }} />}
                tooltip="Users Management"
                onClick={() => navigate("/user-management")}
              />
            )}

            {/* Logout Button */}
            <IconButton
              icon={<LogoutOutlined style={{ fontSize: 16 }} />}
              tooltip="Logout"
              onClick={handleLogout}
              danger
            />
          </Space>
        </Space>
      </Header>

      <Content style={{ background: "#f5f7fa" }}>
        <div
          className="main-layout-content-inner"
          style={{
            maxWidth: "100%",
            margin: "0 auto",
            overflow: "auto",
          }}
        >
          {children}
        </div>
      </Content>
      <GlobalNotificationSnackbar />
    </Layout>
  );
};

export default MainLayout;
