import React from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Typography } from "@mui/material";
import CImportDSR from "../CImportDSR";
import { useImportersContext } from "../../context/importersContext";
import { getJsonCookie } from "../../utils/cookies";

const drawerWidth = 60;

function AppbarComponent(props) {
  const navigate = useNavigate();

  const { selectedImporter } = useImportersContext();
  // Get user data from cookies
  const userData = getJsonCookie("exim_user") || { name: "User" };

  // Extract name (handle both old and new user data structures)
  const userName =
    userData.name ||
    userData?.data?.user?.name ||
    userData.username ||
    userData.email ||
    "User";

  const userImporterName =
    userData?.ie_code_assignments?.[0]?.importer_name || "";

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          //width: { lg: `calc(100% - ${drawerWidth}px)` },
          width: "100%",
          ml: { lg: `${drawerWidth}px` },
          backgroundColor: "rgba(249, 250, 251, 0.3)",
          backdropFilter: "blur(6px) !important",
          boxShadow: "none",
        }}
      >
        <Toolbar>
          {/* <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => props.setMobileOpen(!props.mobileOpen)}
          sx={{ mr: 2, display: { lg: "none" } }}
        >
          <MenuIcon sx={{ color: "#000" }} />
        </IconButton> */}

          {/* <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => window.history.back()}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon sx={{ color: "#000" }} />
        </IconButton> */}

          <div>
            <img
              src={require("../../assets/images/logo.webp")}
              alt="logo"
              height="50px"
              onClick={() => navigate("/")}
              style={{ cursor: "pointer" }}
            />
          </div>

          {/* Centered User Name */}
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#000" }}>
              {selectedImporter || userImporterName}
            </Typography>
          </Box>

          {/* Version text at the right */}
          <Box sx={{ textAlign: "right" }}>
            <Typography
              variant="body1"
              sx={{ fontWeight: "bold", color: "#000" }}
            >
              Version: {process.env.REACT_APP_VERSION}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Centered User Name */}
      {/* <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          marginTop: "30px",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "#000" }}>
          {selectedImporter || userImporterName || "hii"}
        </Typography>
      </Box> */}
      <CImportDSR />
    </>
  );
}

export default AppbarComponent;
