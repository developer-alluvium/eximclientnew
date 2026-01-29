import React, { useState, useEffect } from "react";
import { Layout, Avatar, Tooltip, Space, Typography, Divider } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
  CalendarOutlined,
  ArrowLeftOutlined,
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
            // Darker background for visibility on white/green portions
            background: isHovered
              ? danger
                ? "rgba(255, 77, 79, 0.15)"
                : "rgba(255, 255, 255, 0.3)"
              : "rgba(255, 255, 255, 0.2)",
            border: "1px solid #000", // Bright black border as requested
            color: isHovered
              ? danger
                ? "#d32f2f"
                : "#000000"
              : "#000000", // Pure black for visibility
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
    <Layout style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      {/* 1. Main Header with Gradient Background */}
      <Header
        style={{
          // Linear Gradient: Orange -> White -> Green
          background:
            "linear-gradient(90deg, #FF9933 0%, #FFFFFF 35%, #FFFFFF 65%, #138808 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          zIndex: 100,
          height: 55, // Reduced height
          lineHeight: "normal",
        }}
      >
        {/* Left Section: Back Arrow & Suraj Group Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            onClick={() => window.history.back()}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "#333",
              fontSize: "20px",
            }}
          >
            <ArrowLeftOutlined />
          </div>
          <img
            src={require("../assets/images/suraj_group_logo.png")}
            alt="Suraj Group"
            style={{
              height: 50,
              width: "auto",
              objectFit: "contain",
              transform: "scale(1.7)",
              marginLeft: "15px", // Added margin to compensate for scale overlap
            }}
          />
        </div>

        {/* Center Section: 77 Logo + Republic Day Message */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <img
            src={require("../assets/images/republic_day_logo.png")}
            alt="77th Republic Day"
            style={{
              height: 65,
              width: "auto",
              objectFit: "contain",
            }}
          />
          <Text
            strong
            style={{
              fontSize: 18,
              color: "#000080", // Navy Blue for text
              whiteSpace: "nowrap",
            }}
          >
            Happy Republic Day! May our collective efforts build a stronger India.
          </Text>
        </div>

        {/* Right Section: User Info & Actions */}
        <Space size={16} align="center">
          {/* User Info (Dark text for visibility on Green/White) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255,255,255,0.6)",
              padding: "4px 12px",
              borderRadius: "20px",
            }}
          >
            <Avatar
              size={36}
              style={{
                backgroundColor: "#fff",
                color: "#ff9933",
                fontWeight: 600,
                fontSize: 14,
                border: "2px solid #138808",
              }}
            >
              {userInitial}
            </Avatar>
            <div style={{ lineHeight: 1.3 }}>
              <Text strong style={{ fontSize: 13, color: "#000" }}>
                {userName}
              </Text>
            </div>
          </div>

          {/* Action Icons */}
          <Space size={8}>
            <IconButton
              icon={<UserOutlined style={{ fontSize: 18 }} />}
              tooltip="My Profile"
              onClick={() => navigate("/user/profile")}
            />
            {userRole === "admin" && (
              <IconButton
                icon={<TeamOutlined style={{ fontSize: 18 }} />}
                tooltip="Users Management"
                onClick={() => navigate("/user-management")}
              />
            )}
            <IconButton
              icon={<LogoutOutlined style={{ fontSize: 18 }} />}
              tooltip="Logout"
              onClick={handleLogout}
              danger
            />
          </Space>
        </Space>
      </Header>

      {/* 2. Blue Floating Message Bar (Marquee) */}
      <div
        style={{
          background: "#1565C0", // Strong Blue
          color: "#fff",
          height: 36,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          position: "sticky",
          top: 0,

        }}
      >
        <div className="marquee-container" style={{ width: "100%", overflow: "hidden" }}>

          <style>
            {`
              @keyframes marquee {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
              .marquee-content {
                display: inline-block;
                white-space: nowrap;
                animation: marquee 25s linear infinite;
                padding-left: 100%; /* Start off-screen */
                font-weight: 500;
                font-size: 14px;
              }
            `}
          </style>
          {/* <div className="marquee-content">
            📢 Please note: Custom operations will remain closed on 26th
            January. Since 24th and 25th are Saturday and Sunday, kindly
            complete all pending work by 23rd January.
          </div> */}
        </div>
      </div>

      <Content style={{ background: "#f5f7fa" }}>
        <div
          style={{
            padding: "24px 32px",
            maxWidth: "100%",
            margin: "0 auto",
            minHeight: "calc(100vh - 116px)", // 80px header + 36px bar
          }}
        >
          {children}
        </div>
      </Content>
    </Layout>
  );
};

export default MainLayout;
