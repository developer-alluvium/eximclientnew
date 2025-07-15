import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
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

function CImportDSR() {
  const { a11yProps, CustomTabPanel } = useTabs();
  const { tabValue, setTabValue } = React.useContext(TabValueContext);
  const { user, setUser } = React.useContext(UserContext);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [alt, setAlt] = React.useState(false);
  const [lastJobsDate, setLastJobsDate] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
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
      try {
        await logActivity({
          userId: user?.id,
          activityType: 'logout',
          description: `User logged out from Import DSR module with IE Code: ${user?.ie_code_no || 'Unknown'}`,
          severity: 'low',
          metadata: {
            ieCode: user?.ie_code_no,
            logoutTime: new Date().toISOString(),
            logoutMethod: 'manual',
            module: 'Import DSR',
            userAgent: navigator.userAgent
          }
        });
      } catch (logError) {
        console.error('Failed to log logout activity:', logError);
      }

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
        console.error('Error calling logout API:', logoutError);
      }

      // Clear user data and navigate
      localStorage.removeItem("exim_user");
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

  return (
    <Box sx={{ 
      display: "flex", 
      marginTop: "70px",
      minHeight: "calc(100vh - 70px)",
      width: "100%",
      overflow: "hidden"
    }}>

      <SelectedYearContext.Provider value={{ selectedYear, setSelectedYear }}>
        <Box sx={{ 
          width: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          overflow: "hidden",
      
        }}>
          <Box
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: { xs: "8px", sm: "0 16px" },
              flexWrap: { xs: "wrap", sm: "nowrap" },
              gap: { xs: 1, sm: 0 },
            }}
          >
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              // gap: { xs: 1, sm: 2 },
              minWidth: 0,
              // flex: { xs: "1 1 auto", sm: "0 1 auto" }
            }}>
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
                  }
                }}
              >
                <Tab label="Jobs" {...a11yProps(2)} key={1} />
              </Tabs>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutTwoToneIcon />}
              onClick={handleLogout}
              disabled={loading}
              sx={{
                marginRight: { xs: 0, sm: 2 },
                minWidth: { xs: "auto", sm: "auto" },
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                padding: { xs: "4px 8px", sm: "6px 16px" },
                "& .MuiButton-startIcon": {
                  marginRight: { xs: "4px", sm: "8px" },
                },
                "&:hover": {
                  backgroundColor: "red",
                  color: "white",
                },
              }}
            >
              {loading ? <CircularProgress size={20} /> : "Logout"}
            </Button>
          </Box>

          <CustomTabPanel value={tabValue} index={0}>
            <CJobTabs />
          </CustomTabPanel>
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
