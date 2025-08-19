import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import JobList from "./CJobList";
import ContainerSummaryModal from "./ContainerSummaryModal";
import { useImportersContext } from "../context/importersContext";
import Typography from "@mui/material/Typography";
import AssessmentIcon from "@mui/icons-material/Assessment";

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
  const { importers } = React.useContext(useImportersContext) || {};
  const [userImporterName, setUserImporterName] = React.useState(null);

  React.useEffect(() => {
    const userDataFromStorage = localStorage.getItem("exim_user");
    if (userDataFromStorage) {
      try {
        const parsedUser = JSON.parse(userDataFromStorage);
        if (parsedUser && parsedUser.name) {
          setUserImporterName(parsedUser.name);
        }
      } catch (e) {
        console.error("Error parsing user data from storage:", e);
      }
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

  return (
     <Box sx={{ width: "100%" }}>
<Box sx={{ borderBottom: 1, borderColor: "divider", display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-16px' }}>        <Tabs
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

        {/* Container Summary Button - positioned in the top right */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<AssessmentIcon />}
          onClick={handleContainerSummaryOpen}
          sx={{
            mr: 2,
            textTransform: 'none',
            fontWeight: 'bold',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          Container Summary
        </Button>

        {/* {userImporterName && (
          <Typography
            variant="body1"
            sx={{
              marginRight: "20px",
              padding: "8px 16px", // Increased padding
              borderRadius: "4px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #dee2e6",
              // display: "flex",
              alignItems: "center",
              gap: "8px", // Increased gap
              fontWeight: 500,
              color: "#495057",
              fontSize: "1rem", // Slightly larger font
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              right: "20px",
              top: "15px",
              minWidth: "240px", // Added minimum width
              height: "40px", // Fixed height
              //transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: "#e9ecef",
                borderColor: "black",
              },
            }}
          >
            <span style={{ fontWeight: 600 }}>IMPORTER:</span>
            {userImporterName}
          </Typography>
        )} */}
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
      />
    </Box>
  );
}
export default React.memo(CJobTabs);
