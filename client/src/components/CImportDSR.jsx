import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { Box, Typography } from "@mui/material";
import "../styles/import-dsr.scss";
import { MenuItem, TextField } from "@mui/material";
import axios from "axios";
import { SelectedYearContext } from "../context/SelectedYearContext";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import useTabs from "../customHooks/useTabs";
import { UserContext } from "../context/UserContext";
import { TabValueContext } from "../context/TabValueContext";
import CJobTabs from "./CJobTabs";
import Button from "@mui/material/Button";
import LogoutIcon from "@mui/icons-material/Logout";
import LogoutTwoToneIcon from "@mui/icons-material/LogoutTwoTone";
import { useNavigate } from "react-router-dom";
import AppbarComponent from "./home/AppbarComponent";
import BackButton from "./BackButton";
import { logActivity } from "../utils/activityLogger";
import { useImportersContext } from "../context/importersContext";

function CImportDSR() {
  const { a11yProps, CustomTabPanel } = useTabs();
  const { tabValue, setTabValue } = React.useContext(TabValueContext);
  const { user, setUser } = React.useContext(UserContext);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [alt, setAlt] = React.useState(false);
  const [lastJobsDate, setLastJobsDate] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { selectedImporter } = useImportersContext();
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: "",
    severity: "success",
  });

  const inputRef = React.useRef();
  const navigate = useNavigate();

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Enhanced logout function with auto-logout integration
  const handleLogout = async () => {
    setLoading(true);
    try {
      // Log logout activity before calling logout API

      // Call logout API with user ID for logout time tracking
      try {
        const logoutData = {};
        if (user?.id) {
          logoutData.user_id = user.id;
        }

        await axios.post(
          `${process.env.REACT_APP_API_STRING}/logout`,
          logoutData,
          { withCredentials: true }
        );
      } catch (logoutError) {
        console.error("Error calling logout API:", logoutError);
      }

      // Clear user data and navigate
      localStorage.removeItem("exim_user");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      setUser(null);
      navigate("/login");

      setSnackbar({
        open: true,
        message: "Logged out successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Logout error:", error);
      setSnackbar({
        open: true,
        message: "Logout failed. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  // Get tab visibility from localStorage
  const [tabVisibility, setTabVisibility] = React.useState({
    jobsTabVisible: true,
    gandhidhamTabVisible: false,
  });

  React.useEffect(() => {
    const userDataFromStorage = localStorage.getItem("exim_user");
    if (userDataFromStorage) {
      try {
        const parsedUser = JSON.parse(userDataFromStorage);
        setTabVisibility({
          jobsTabVisible:
            parsedUser.jobsTabVisible !== undefined
              ? parsedUser.jobsTabVisible
              : true,
          gandhidhamTabVisible:
            parsedUser.gandhidhamTabVisible !== undefined
              ? parsedUser.gandhidhamTabVisible
              : false,
        });
      } catch (e) {
        setTabVisibility({ jobsTabVisible: true, gandhidhamTabVisible: false });
      }
    }
  }, []);

  // Tabs config
  const visibleTabs = [];
  if (tabVisibility.jobsTabVisible)
    visibleTabs.push({ label: "Jobs", key: "jobs" });
  if (tabVisibility.gandhidhamTabVisible)
    visibleTabs.push({ label: "Gandhidham", key: "gandhidham" });

  return (
    <Box
      sx={{
        display: "flex",
        marginTop: "1px",
        minHeight: "calc(100vh - 70px)",
        width: "100%",
        overflow: "hidden",
        cborderColor: "red",
      }}
    >
      <SelectedYearContext.Provider value={{ selectedYear, setSelectedYear }}>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: "100%",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              padding: { xs: "8px", sm: "0 16px" },
              flexWrap: { xs: "wrap", sm: "nowrap" },
              gap: { xs: 1, sm: 0 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                minWidth: 0,
              }}
            >
              <BackButton />
              <Tabs
                value={tabValue}
                onChange={handleChange}
                aria-label="basic tabs example"
                sx={{
                  minHeight: { xs: "36px", sm: "48px" },
                  "& .MuiTab-root": {
                    minHeight: { xs: "36px", sm: "36px" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    padding: { xs: "6px 12px", sm: "12px 16px" },
                  },
                }}
              >
                {visibleTabs.map((tab, idx) => (
                  <Tab label={tab.label} {...a11yProps(idx)} key={tab.key} />
                ))}
              </Tabs>
            </Box>
            <Box
              sx={{
                position: "absolute", // Add this
                left: "50%", // Add this
                transform: "translateX(-50%)", // Add this
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "#000" }}
              >
                {selectedImporter || "hii"}
              </Typography>
            </Box>
          </Box>

          {visibleTabs.map((tab, idx) => (
            <CustomTabPanel value={tabValue} index={idx} key={tab.key}>
              <CJobTabs gandhidham={tab.key === "gandhidham"} />
            </CustomTabPanel>
          ))}
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          message={snackbar.message}
          severity={snackbar.severity}
        />
      </SelectedYearContext.Provider>
    </Box>
  );
}

export default React.memo(CImportDSR);
