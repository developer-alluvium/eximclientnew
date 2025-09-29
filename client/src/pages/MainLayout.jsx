import React, { useState, useRef, useEffect } from "react";
import { Toolbar, Box, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import PersonIcon from "@mui/icons-material/Person";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";

const HeaderBar = ({
  userName,
  formattedTime,
  formattedDate,
  handleLogout,
}) => {
  const [open, setOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  const handleUserMenuOpen = () => setOpen(true);
  const handleUserMenuClose = () => setOpen(false);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const userDataFromStorage = localStorage.getItem("exim_user");

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        bgcolor: "white",
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        zIndex: 1300,
      }}
    >
      <Toolbar>
        <Box
          component="img"
          src={require("../../src/assets/images/logo.webp")}
          alt="EXIM User Portal"
          sx={{
            height: 40,
            width: "auto",
            display: "block",
            mr: 2,
            objectFit: "contain",
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        />
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}></Box>

        <Box sx={{ display: "flex", alignItems: "center", mr: 4 }}>
          <AccessTimeIcon sx={{ mr: 1 }} />
          <Box>
            <Typography
              variant="body2"
              sx={{ fontSize: "0.875rem", lineHeight: 1.2 }}
            >
              {formattedTime}
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontSize: "0.75rem", opacity: 0.8 }}
            >
              {formattedDate}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ position: "relative" }} ref={userMenuRef}>
          <Box
            onClick={handleUserMenuOpen}
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <Typography variant="body2" sx={{ mr: 0.5, fontWeight: 500 }}>
              {userName}
            </Typography>
            <AccountCircleIcon />
          </Box>

          {open && (
            <Box
              sx={{
                position: "absolute",
                top: "60px",
                right: 0,
                width: "15rem",
                bgcolor: "white",
                borderRadius: 2,
                boxShadow: "0px 4px 12px rgba(0,0,0,0.15)",
                zIndex: 1500,
                py: 1,
                border: "1px solid #e0e0e0",
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "#f5f5f5" },
                }}
                onClick={() => {
                  navigate("/user/profile");
                  handleUserMenuClose();
                }}
              >
                <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2">Profile</Typography>
              </Box>

              {JSON.parse(userDataFromStorage || "{}")?.role === "admin" && (
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "#f5f5f5" },
                  }}
                  onClick={() => {
                    navigate("/user-management");
                    handleUserMenuClose();
                  }}
                >
                  <ManageAccountsIcon sx={{ mr: 1, fontSize: 20 }} />
                  <Typography variant="body2">Users Management</Typography>
                </Box>
              )}

              <Box
                sx={{
                  px: 2,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "#f5f5f5" },
                }}
                onClick={() => {
                  handleLogout();
                  handleUserMenuClose();
                }}
              >
                <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2">Logout</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Toolbar>
    </Box>
  );
};

const MainLayout = ({ children }) => {
  const navigate = useNavigate();

  // Example user data, formattedTime, formattedDate & logout handler
  const userData = JSON.parse(localStorage.getItem("exim_user") || "{}");
  const userName =
    userData.name || userData.username || userData.email || "User";

  const now = new Date();
  const formattedTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedDate = now.toLocaleDateString();

  const handleLogout = () => {
    // Example logout logic: clear localStorage and navigate to login
    localStorage.clear();
    navigate("/login");
  };

  return (
    <>
      <HeaderBar
        userName={userName}
        formattedTime={formattedTime}
        formattedDate={formattedDate}
        handleLogout={handleLogout}
      />
      <main style={{ marginTop: 40, padding: 16 }}>{children}</main>
    </>
  );
};

export default MainLayout;
