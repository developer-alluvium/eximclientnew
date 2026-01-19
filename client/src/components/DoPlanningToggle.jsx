import React, { useState, useCallback } from "react";
import {
  Switch,
  Badge,
  Tooltip,
  IconButton,
  Popover,
  Snackbar,
  Alert,
  Typography,
  Paper,
  Box,
  Chip,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
} from "@mui/lab";
import InfoIcon from "@mui/icons-material/Info";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HistoryIcon from "@mui/icons-material/History";
import BlockIcon from "@mui/icons-material/Block";

const DoPlanningToggle = ({
  do_planning_date,
  doPlanning,
  do_planning_history = [],
  onUpdate,
  cell,
  row,
}) => {
  const [isPlanned, setIsPlanned] = useState(doPlanning || false);
  const [planHistory, setPlanHistory] = useState(do_planning_history || []);
  const [anchorEl, setAnchorEl] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasBeenToggled, setHasBeenToggled] = useState(doPlanning || false);

  // Count of how many times planning was canceled
  const cancelCount = planHistory.filter(
    (record) => record.action === "canceled",
  ).length;

  // Handle toggle change
  const handleToggle = useCallback(
    async (event) => {
      const newStatus = event.target.checked;
      const timestamp = new Date().toISOString();

      // Create history record
      const historyRecord = {
        action: newStatus ? "planned" : "canceled",
        timestamp,
        jobId: null,
      };

      // Prepare update data
      const updateData = {
        doPlanning: newStatus,
        do_planning_date: newStatus ? timestamp : "",
        do_planning_history: [...planHistory, historyRecord],
      };

      try {
        // Simulated API call - replace with actual API endpoint
        const response = await fetch(
          `${process.env.REACT_APP_API_STRING}/jobs/${row.original._id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          },
        );

        if (!response.ok) {
          throw new Error(`Update failed: ${response.status}`);
        }

        // Update local state only after successful server update
        setIsPlanned(newStatus);
        setPlanHistory([...planHistory, historyRecord]);
        setHasBeenToggled(true); // Mark that toggle has been used

        // Call optional parent update function
        if (onUpdate) {
          onUpdate(updateData);
        }
      } catch (err) {
        // More detailed error handling
        console.error("Update failed:", err);
        setErrorMessage(err.message || "Failed to update planning status");

        // Revert UI state on error
        setIsPlanned(!newStatus);
      }
    },
    [planHistory, onUpdate],
  );

  // Error handling
  const handleErrorClose = () => {
    setErrorMessage(null);
  };

  // Info button handlers
  const handleInfoClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleInfoClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: true,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="flex flex-col w-full relative">
        {/* Status Toggle and Label Container */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Switch
              checked={isPlanned}
              onChange={handleToggle}
              color="primary"
              size="small"
              className="transform scale-90"
              disabled={hasBeenToggled} // Disable once toggled
            />

            {cancelCount > 0 && (
              <Badge
                badgeContent={cancelCount}
                color="error"
                sx={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  "& .MuiBadge-badge": {
                    fontSize: "0.6rem",
                    height: "16px",
                    minWidth: "16px",
                  },
                }}
              />
            )}
            <span className="sr-only">Cancellation count: {cancelCount}</span>
          </div>

          <div className="flex">
            <span
              className={`font-semibold text-sm transition-colors duration-200 
                ${isPlanned ? "text-blue-600" : "text-gray-500"}`}
            >
              {isPlanned ? "Planned" : "Not Planned"}
            </span>
          </div>
        </div>

        {/* Planning Date */}
        {isPlanned && do_planning_date && (
          <div className="text-xs text-gray-500 italic mt-1">
            Planned on: {formatDate(do_planning_date)}
          </div>
        )}

        {/* Info Button - Commented out once toggle is used */}
        {/* {!hasBeenToggled && (
          <Tooltip title="View Planning History" arrow>
            <IconButton
              size="small"
              onClick={handleInfoClick}
              className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all duration-200 ease-in-out"
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )} */}
        {/* 
        Commented out info button after toggle is used to prevent further interaction
        <Tooltip title="View Planning History" arrow>
          <IconButton
            size="small"
            onClick={handleInfoClick}
            className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all duration-200 ease-in-out"
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        */}

        {/* Popover for Planning History - Only show if not toggled yet */}
        {!hasBeenToggled && (
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleInfoClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            PaperProps={{
              className: "rounded-2xl shadow-2xl border border-gray-200",
              sx: {
                width: "600px", // Increased width
                maxHeight: "400px", // Controlled height
                overflowY: "auto",
              },
            }}
          >
            <div className="p-6 bg-white rounded-2xl w-full">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
                {" "}
                {/* Reduced margins and padding */}
                <h4 className="text-lg font-bold text-gray-900 flex items-center">
                  <HistoryIcon className="mr-2 text-blue-600" />
                  Planning Timeline
                </h4>
                {cancelCount > 0 && (
                  <Chip
                    icon={<CancelIcon />}
                    label={`${cancelCount} Cancellations`}
                    color="error"
                    size="small"
                    variant="outlined"
                    className="bg-red-50"
                  />
                )}
              </div>

              {planHistory.length > 0 ? (
                <div className="max-h-70 overflow-y-auto pr-2">
                  <Timeline position="right" className="p-0">
                    {planHistory.map((record, index) => (
                      <TimelineItem key={index} className="before:content-none">
                        <TimelineSeparator>
                          <TimelineDot
                            color={
                              record.action === "planned" ? "success" : "error"
                            }
                            variant="outlined"
                          >
                            {record.action === "planned" ? (
                              <CheckCircleIcon />
                            ) : (
                              <CancelIcon />
                            )}
                          </TimelineDot>
                          {index < planHistory.length - 1 && (
                            <TimelineConnector />
                          )}
                        </TimelineSeparator>

                        <TimelineContent>
                          <Paper
                            elevation={0}
                            className={`p-3 rounded-lg transition-all duration-300 
                    ${
                      record.action === "planned"
                        ? "bg-green-50 hover:bg-green-100"
                        : "bg-red-50 hover:bg-red-100"
                    }`}
                          >
                            <Typography
                              variant="body2"
                              color={
                                record.action === "planned"
                                  ? "success.main"
                                  : "error.main"
                              }
                              className="font-semibold"
                            >
                              {record.action === "planned"
                                ? "Planning Initiated"
                                : "Planning Canceled"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              className="block mt-1"
                            >
                              {formatDate(record.timestamp)}
                            </Typography>
                          </Paper>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                </div>
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  p={4}
                  className="bg-gray-50 rounded-lg"
                >
                  <BlockIcon className="text-gray-400 mb-2" fontSize="large" />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                  >
                    No planning history available
                  </Typography>
                </Box>
              )}
            </div>
          </Popover>
        )}
      </div>

      {/* Error Snackbar for user feedback */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleErrorClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleErrorClose}
          severity="error"
          sx={{ width: "100%" }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DoPlanningToggle;
