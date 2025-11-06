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
  onOpenReminderSettings, 
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
        borderRadius: 2,
        border: "1px solid #e0e0e0",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
      }}
    >
      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{
          borderBottom: "1px solid #e0e0e0",
          px: 3,
          "& .MuiTab-root": {
            fontWeight: 600,
            fontSize: "0.95rem",
            textTransform: "none",
            minHeight: 60,
            "&.Mui-selected": {
              color: "#1a237e",
            },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "#1a237e",
            height: 3,
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
            onOpenReminderSettings={onOpenReminderSettings}
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
