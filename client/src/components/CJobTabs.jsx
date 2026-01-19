import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import JobList from "./CJobList";
import ContainerSummaryModal from "./ContainerSummaryModal";
import { useImportersContext } from "../context/importersContext";
import { getJsonCookie } from "../utils/cookies";
import Typography from "@mui/material/Typography";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney"; // Added for new button
import CurrencyRateDialog from "./CurrencyRateDialog"; // Added import for the dialog

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0, mt: 2 }}>{children}</Box>}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

function CJobTabs({ gandhidham = false }) {
  const [value, setValue] = React.useState(0);
  const [containerSummaryOpen, setContainerSummaryOpen] = React.useState(false);

  // --- New State for Currency Dialog ---
  const [currencyDialogOpen, setCurrencyDialogOpen] = React.useState(false);

  const { importers } = React.useContext(useImportersContext) || {};
  const [userImporterName, setUserImporterName] = React.useState(null);

  React.useEffect(() => {
    const parsedUser = getJsonCookie("exim_user");
    if (parsedUser && parsedUser.name) {
      setUserImporterName(parsedUser.name);
    }
  }, []);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleContainerSummaryOpen = () => {
    setContainerSummaryOpen(true);
  };

  const handleContainerSummaryClose = () => {
    setContainerSummaryOpen(false);
  };

  // --- New Handlers for Currency Dialog ---
  const handleCurrencyDialogOpen = () => {
    setCurrencyDialogOpen(true);
  };

  const handleCurrencyDialogClose = () => {
    setCurrencyDialogOpen(false);
  };

  return (
    <Box sx={{ backgroundColor: "#ffffffff" }}>
      <Box
        sx={{
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff",
          px: 2,
          py: 0.5,
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="job status tabs"
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.875rem",
              color: "#64748b",
              minHeight: 44,
              px: 3,
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
          <Tab label="Pending" {...a11yProps(0)} />
          <Tab label="Completed" {...a11yProps(1)} />
          <Tab label="Cancelled" {...a11yProps(2)} />
        </Tabs>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AttachMoneyIcon sx={{ fontSize: 18 }} />}
            onClick={handleCurrencyDialogOpen}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.8rem",
              borderRadius: 2,
              borderColor: "#e2e8f0",
              color: "#475569",
              px: 2,
              py: 0.75,
              "&:hover": {
                borderColor: "#94a3b8",
                backgroundColor: "#f8fafc",
              },
            }}
          >
            Currency Rates
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<AssessmentIcon sx={{ fontSize: 18 }} />}
            onClick={handleContainerSummaryOpen}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.8rem",
              borderRadius: 2,
              backgroundColor: "#1e293b",
              px: 2,
              py: 0.75,
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "#334155",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              },
            }}
          >
            Container Summary
          </Button>
        </Box>
      </Box>

      <CustomTabPanel value={value} index={0}>
        <JobList status="Pending" gandhidham={gandhidham} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <JobList status="Completed" gandhidham={gandhidham} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <JobList status="Cancelled" gandhidham={gandhidham} />
      </CustomTabPanel>

      {/* Container Summary Modal */}
      <ContainerSummaryModal
        open={containerSummaryOpen}
        onClose={handleContainerSummaryClose}
        gandhidham={gandhidham}
      />

      {/* --- New Currency Rate Dialog --- */}
      <CurrencyRateDialog
        open={currencyDialogOpen}
        onClose={handleCurrencyDialogClose}
      />
    </Box>
  );
}
export default React.memo(CJobTabs);
