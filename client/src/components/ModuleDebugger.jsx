import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  Alert,
} from "@mui/material";
import { getUserAssignedModules } from "../utils/moduleAccess";
import { getJsonCookie } from "../utils/cookies";

/**
 * Debug component to test module assignment synchronization
 * This component shows the current user's assigned modules and allows manual refresh
 */
const ModuleDebugger = () => {
  const [modules, setModules] = useState([]);
  const [userData, setUserData] = useState(null);

  const loadModules = () => {
    const currentModules = getUserAssignedModules();
    const currentUserData = getJsonCookie("exim_user");

    setModules(currentModules);
    setUserData(currentUserData || null);

    console.log("🔍 Debug - Current modules:", currentModules);
    console.log("🔍 Debug - User data:", currentUserData);
  };

  useEffect(() => {
    loadModules();
  }, []);

  return (
    <Paper sx={{ p: 2, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Module Assignment Debugger
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        This component shows the current user's assigned modules and updates in
        real-time
      </Alert>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">
          Current User:{" "}
          {userData?.name || userData?.data?.user?.name || "Not found"}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          IE Code:{" "}
          {userData?.ie_code_no ||
            userData?.data?.user?.ie_code_no ||
            "Not found"}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">
          Assigned Modules ({modules.length}):
        </Typography>
        {modules.length > 0 ? (
          <List dense>
            {modules.map((module, index) => (
              <ListItem key={index}>
                <ListItemText primary={module} secondary={`Index: ${index}`} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">No modules assigned</Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2 }}>
        <Button variant="outlined" onClick={loadModules}>
          Reload from cookies
        </Button>
      </Box>
    </Paper>
  );
};

export default ModuleDebugger;
