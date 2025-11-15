import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import AnalyticsOverview from "./AnalyticsOverview";

const AnalyticsTab = () => {
  return (
    <Box>
      <Paper>
        <AnalyticsOverview />
      </Paper>
    </Box>
  );
};

export default AnalyticsTab;
