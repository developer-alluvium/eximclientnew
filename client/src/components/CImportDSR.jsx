import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { Box, Typography } from "@mui/material";
import "../styles/import-dsr.scss";
import axios from "axios";
import { SelectedYearContext } from "../context/SelectedYearContext";
import Snackbar from "@mui/material/Snackbar";
import useTabs from "../customHooks/useTabs";
import { UserContext } from "../context/UserContext";
import { TabValueContext } from "../context/TabValueContext";
import CJobTabs from "./CJobTabs";
import { useNavigate } from "react-router-dom";
import BackButton from "./BackButton";
import { useImportersContext } from "../context/importersContext";
import AnalyticsTab from "./AnalyticsTab";

function CImportDSR() {
  const { a11yProps, CustomTabPanel } = useTabs();
  const { tabValue, setTabValue } = React.useContext(TabValueContext);
  const { user, setUser } = React.useContext(UserContext);
  const [selectedYear, setSelectedYear] = React.useState("");
  const { selectedImporter } = useImportersContext();
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: "",
    severity: "success",
  });

  const navigate = useNavigate();

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  // Get tab visibility from localStorage
  const [tabVisibility, setTabVisibility] = React.useState({
    analyticsTabVisible: true,
    jobsTabVisible: true,
    gandhidhamTabVisible: false,
  });

  React.useEffect(() => {
    const userDataFromStorage = localStorage.getItem("exim_user");
    if (userDataFromStorage) {
      try {
        const parsedUser = JSON.parse(userDataFromStorage);
        setTabVisibility({
          analyticsTabVisible: 
            parsedUser.analyticsTabVisible !== undefined
              ? parsedUser.analyticsTabVisible
              : true,
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
        setTabVisibility({ 
          analyticsTabVisible: true,
          jobsTabVisible: true, 
          gandhidhamTabVisible: false 
        });
      }
    }
  }, []);

  // Tabs config - Analytics comes first
  const visibleTabs = [];
  if (tabVisibility.analyticsTabVisible)
    visibleTabs.push({ label: "Analytics", key: "analytics" });
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
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
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
                {selectedImporter || ""}
              </Typography>
            </Box>
          </Box>

          {visibleTabs.map((tab, idx) => (
            <CustomTabPanel value={tabValue} index={idx} key={tab.key}>
              {tab.key === "analytics" ? (
                <AnalyticsTab />
              ) : (
                <CJobTabs gandhidham={tab.key === "gandhidham"} />
              )}
            </CustomTabPanel>
          ))}
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          message={snackbar.message}
        />
      </SelectedYearContext.Provider>
    </Box>
  );
}

export default React.memo(CImportDSR);