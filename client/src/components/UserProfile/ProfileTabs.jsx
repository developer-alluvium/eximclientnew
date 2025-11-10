// components/UserProfile/ProfileTabs.js
import React, { useState } from "react";
import { Paper, Box, Tabs, Tab } from "@mui/material";
import ProfileInfoTab from "./ProfileInfoTab";
import AEOCertificatesTab from "./AEOCertificatesTab";
import DocumentsTab from "./DocumentsTab";
import AssignedImportersTab from "./AssignedImportersTab";

const ProfileTabs = ({
  user,
  kycSummary,
  aeoLoading,
  onUpdateImporterName,
  onFetchKYCSummary,
  onRefreshProfile,
  onSetError,
  onSetSuccess,
  onUpdateReminderSettings, // Updated prop name
}) => {
  const [tabValue, setTabValue] = useState(0);

  const TabPanel = ({ children, value, index }) => (
    <Box sx={{ p: 3 }} hidden={value !== index}>
      {value === index && children}
    </Box>
  );

  return (
    <Paper
      sx={{
        width: "100%",
        borderRadius: 3,
        border: "1px solid #e0e0e0",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        background: "linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)",
      }}
    >
      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        variant="fullWidth"
        sx={{
          borderBottom: "1px solid #e8eaf6",
          px: 3,
          py: 1,
          "& .MuiTab-root": {
            fontWeight: 600,
            fontSize: "1rem",
            textTransform: "none",
            minHeight: 56,
            borderRadius: 2,
            marginRight: 1,
            px: 3,
            "&.Mui-selected": {
              color: "#1a237e",
              background: "rgba(26, 35, 126, 0.04)",
              boxShadow: "0 2px 8px rgba(26, 35, 126, 0.1)",
            },
            "&:hover": {
              background: "rgba(0, 0, 0, 0.04)",
            },
          },
          "& .MuiTabs-indicator": {
            background: "transparent",
          },
        }}
      >
        <Tab label="Profile Information" />
        <Tab label="AEO Certificates" />
        <Tab label="Documents" />
        <Tab label="Assigned Importers" />
      </Tabs>

      <Box sx={{ p: 0 }}>
        <TabPanel value={tabValue} index={0}>
          <ProfileInfoTab user={user} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <AEOCertificatesTab
            user={user}
            kycSummary={kycSummary}
            aeoLoading={aeoLoading}
            onUpdateImporterName={onUpdateImporterName}
            onFetchKYCSummary={onFetchKYCSummary}
            onSetError={onSetError}
            onSetSuccess={onSetSuccess}
            onUpdateReminderSettings={onUpdateReminderSettings}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <DocumentsTab
            user={user}
            onRefreshProfile={onRefreshProfile}
            onSetError={onSetError}
            onSetSuccess={onSetSuccess}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <AssignedImportersTab user={user} kycSummary={kycSummary} />
        </TabPanel>
      </Box>
    </Paper>
  );
};

export default ProfileTabs;
