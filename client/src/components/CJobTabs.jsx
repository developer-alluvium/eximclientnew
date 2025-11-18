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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
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
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "-16px",
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          [
          <Tab label="Pending" {...a11yProps(0)} key={0} />,
          <Tab label="Completed" {...a11yProps(1)} key={1} />,
          <Tab label="Cancelled" {...a11yProps(2)} key={2} />
          ,]
        </Tabs>

        {/* --- Grouped Buttons --- */}
        <Box sx={{ display: "flex", gap: 2, mr: 2 }}>
          {/* New Currency Rate Dialog Button */}
          <Button
            variant="contained"
            color="primary" // Changed color to differentiate
            startIcon={<AttachMoneyIcon />}
            onClick={handleCurrencyDialogOpen}
            sx={{
              textTransform: "none",
              fontWeight: "bold",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
              "&:hover": {
                boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)",
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            Currency Rates
          </Button>

          {/* Existing Container Summary Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AssessmentIcon />}
            onClick={handleContainerSummaryOpen}
            sx={{
              // mr: 2, // Removed mr, using gap on parent Box now
              textTransform: "none",
              fontWeight: "bold",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
              "&:hover": {
                boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)",
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            Container Summary
          </Button>
        </Box>

        {/* This <Box> was removed as it's replaced by the button
        <Box>
          CurrencyRateDialog
        </Box> 
        */}

        {/* {userImporterName && ( ...omitted for brevity... )} */}
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
