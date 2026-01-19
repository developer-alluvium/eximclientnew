import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { Box, Typography } from "@mui/material";
import "../styles/import-dsr.scss";
import axios from "axios";
import { getJsonCookie } from "../utils/cookies";
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
    const parsedUser = getJsonCookie("exim_user");
    if (parsedUser) {
      try {
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
          gandhidhamTabVisible: false,
        });
      }
    }
  }, []);

  // Tabs config - Analytics comes first
  const visibleTabs = [];

  if (tabVisibility.jobsTabVisible)
    visibleTabs.push({ label: "Jobs", key: "jobs" });
  if (tabVisibility.gandhidhamTabVisible)
    visibleTabs.push({ label: "Gandhidham", key: "gandhidham" });
  // if (tabVisibility.analyticsTabVisible)
  // visibleTabs.push({ label: "Analytics", key: "analytics" });

  return (
    <Box
      sx={{
        display: "flex",
        marginTop: "1px",
        minHeight: "calc(100vh - 70px)",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "#f8fafc",
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
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: { xs: "8px 12px", sm: "0 16px" },
              backgroundColor: "#ffffff",
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
                aria-label="navigation tabs"
                sx={{
                  minHeight: 44,
                  "& .MuiTab-root": {
                    minHeight: 44,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    textTransform: "none",
                    color: "#64748b",
                    padding: "8px 16px",
                    "&.Mui-selected": {
                      color: "#1e293b",
                      fontWeight: 600,
                    },
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#3b82f6",
                    height: 3,
                    borderRadius: "2px 2px 0 0",
                  },
                }}
              >
                {visibleTabs.map((tab, idx) => (
                  <Tab label={tab.label} {...a11yProps(idx)} key={tab.key} />
                ))}
              </Tabs>
            </Box>
            {selectedImporter && (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: "#1e293b",
                  fontSize: "0.9rem",
                }}
              >
                {selectedImporter}
              </Typography>
            )}
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
