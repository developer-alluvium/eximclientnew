import React, { useState, useEffect } from "react";
import { Layout, Avatar, Tooltip, Space, Typography, Divider } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getJsonCookie, removeCookie } from "../utils/cookies";

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
                : "rgba(255, 255, 255, 0.15)"
              : "rgba(255, 255, 255, 0.08)",
            color: isHovered
              ? danger
                ? "#ff6b6b"
                : "#ffffff"
              : "rgba(255, 255, 255, 0.85)",
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
      <Header
        style={{
          background: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          zIndex: 100,
          position: "sticky",
          top: 0,
          height: 64,
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
            style={{
              height: 36,
              width: "auto",
              objectFit: "contain",
              filter: "brightness(0) invert(1)",
            }}
          />
        </div>

        {/* Right Section */}
        <Space size={16} align="center">
          {/* DateTime - Compact inline format */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: 8,
            }}
          >
            <CalendarOutlined
              style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 14 }}
            />
            <Text style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.85)" }}>
              {formattedDate}
            </Text>
            <Divider
              type="vertical"
              style={{
                margin: "0 4px",
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            />
            <Text strong style={{ fontSize: 13, color: "#ffffff" }}>
              {formattedTime}
            </Text>
          </div>

          {/* Divider */}
          <Divider
            type="vertical"
            style={{ height: 24, borderColor: "rgba(255, 255, 255, 0.2)" }}
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
            <div style={{ lineHeight: 1.3 }}>
              <Text
                strong
                style={{ fontSize: 13, color: "#ffffff", display: "block" }}
              >
                {userName}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: "rgba(255, 255, 255, 0.65)",
                  textTransform: "capitalize",
                }}
              >
                {userRole || "User"}
              </Text>
            </div>
          </div>

          {/* Divider */}
          <Divider
            type="vertical"
            style={{ height: 24, borderColor: "rgba(255, 255, 255, 0.2)" }}
          />

          {/* Action Icons */}
          <Space size={8}>
            {/* Profile Button */}
            <IconButton
              icon={<UserOutlined style={{ fontSize: 16 }} />}
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
          style={{
            padding: "24px 32px",
            maxWidth: "100%",
            margin: "0 auto",
            height: "calc(100vh - 64px)",
            overflow: "auto",
          }}
        >
          {children}
        </div>
      </Content>
    </Layout>
  );
};

export default MainLayout;
