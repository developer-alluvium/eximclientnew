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
// import AnalyticsTab from "./AnalyticsTab";

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

  // Both tabs always visible — Tab Visibility replaced by Branch Management
  const visibleTabs = [
    { label: "Jobs", key: "jobs" },
    // { label: "Gandhidham", key: "gandhidham" },
  ];

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
              position: "relative", // Added for absolute positioning of center text
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
            
            {/* Centered Importer Name */}
            {selectedImporter && (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: "#1e293b",
                  fontSize: "1rem",
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  display: { xs: "none", md: "block" } // Hide on small screens if needed
                }}
              >
                {selectedImporter}
              </Typography>
            )}
          </Box>

          {visibleTabs.map((tab, idx) => (
            <CustomTabPanel value={tabValue} index={idx} key={tab.key}>
              {/* {tab.key === "analytics" ? (
                <AnalyticsTab />
              ) : ( */}
                <CJobTabs gandhidham={tab.key === "gandhidham"} />
              {/* )} */}
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
