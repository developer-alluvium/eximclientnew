import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { getJsonCookie } from "../utils/cookies";
import ContainerDetailsModal from "./ContainerDetailsModal";

// Styled components for better visual presentation
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: "bold",
  backgroundColor: theme.palette.grey[100],
  border: "1px solid #e0e0e0",
  textAlign: "center",
  fontSize: "1rem",
  padding: "12px 16px",
}));

const StyledDataCell = styled(TableCell)(({ theme }) => ({
  border: "1px solid #e0e0e0",
  textAlign: "center",
  fontSize: "1.1rem",
  fontWeight: "500",
  padding: "12px 16px",
  backgroundColor: "#fafafa",
}));

const ClickableDataCell = styled(StyledDataCell)(({ theme }) => ({
  cursor: "pointer",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    transform: "scale(1.02)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "2px solid #1976d2",
    color: "#1976d2",
    fontWeight: "bold",
  },
}));

const StyledTotalCell = styled(TableCell)(({ theme }) => ({
  border: "1px solid #e0e0e0",
  textAlign: "center",
  fontSize: "1.1rem",
  fontWeight: "bold",
  padding: "12px 16px",
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.contrastText,
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  fontWeight: "bold",
  ...(status === "arrived" && {
    backgroundColor: "#4caf50",
    color: "white",
  }),
  ...(status === "transit" && {
    backgroundColor: "#ff9800",
    color: "white",
  }),
}));

const ContainerSummaryModal = ({ open, onClose, gandhidham = false }) => {
  // Add gandhidham prop
  const [summaryData, setSummaryData] = useState(null);
  const [selectedYear, setSelectedYear] = useState("25-26");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // State for Container Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsModalStatus, setDetailsModalStatus] = useState("");
  const [detailsModalSize, setDetailsModalSize] = useState("");
  const [detailsModalYear, setDetailsModalYear] = useState("");

  // Get user IE codes from cookie-stored exim_user (supports multiple IE codes)
  const getUserIeCodes = () => {
    try {
      const userData = getJsonCookie("exim_user");
      if (userData) {
        const parsedUser = userData;

        // Check for multiple IE code assignments first
        if (
          parsedUser.ie_code_assignments &&
          parsedUser.ie_code_assignments.length > 0
        ) {
          return parsedUser.ie_code_assignments.map(
            (assignment) => assignment.ie_code_no
          );
        }

        // Fallback to single IE code for backward compatibility
        if (parsedUser.data?.user?.ie_code_no) {
          return [parsedUser.data.user.ie_code_no];
        }

        if (parsedUser.ie_code_no) {
          return [parsedUser.ie_code_no];
        }
      }
    } catch (error) {
      console.error("Error getting user IE codes:", error);
    }
    return [];
  };

  // Get the appropriate API endpoint based on gandhidham mode
  const getApiEndpoint = () => {
    const baseUrl = process.env.REACT_APP_API_STRING;
    return gandhidham
      ? `${baseUrl}/gandhidham/container-summary`
      : `${baseUrl}/container-summary`;
  };

  // Fetch container summary data with multiple IE codes support
  const fetchContainerSummary = async (year) => {
    setLoading(true);
    setError(null);

    try {
      const ieCodes = getUserIeCodes();
      if (!ieCodes.length) {
        throw new Error("User authorization required - no IE codes found");
      }

      // Create comma-separated string of IE codes for the API call
      const ieCodesParam = ieCodes.join(",");

      // Use different endpoint based on gandhidham mode
      const apiEndpoint = getApiEndpoint();
      const response = await fetch(
        `${apiEndpoint}?year=${year}&ie_codes=${ieCodesParam}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch container summary"
        );
      }

      const data = await response.json();
      if (data.success) {
        setSummaryData(data.summary);
        setLastUpdated(new Date(data.last_updated).toLocaleString());
      } else {
        throw new Error(data.message || "Failed to load container summary");
      }
    } catch (err) {
      console.error("Error fetching container summary:", err);
      setError(err.message);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle year change
  const handleYearChange = (event) => {
    const newYear = event.target.value;
    setSelectedYear(newYear);
    fetchContainerSummary(newYear);
  };

  // Fetch data when modal opens or gandhidham mode changes
  useEffect(() => {
    if (open) {
      fetchContainerSummary(selectedYear);
    }
  }, [open, gandhidham]); // Add gandhidham as dependency

  // Handle modal close
  const handleClose = () => {
    setSummaryData(null);
    setError(null);
    onClose();
  };

  // Handle opening container details modal
  const handleOpenDetailsModal = (status, size) => {
    setDetailsModalStatus(status);
    setDetailsModalSize(size);
    setDetailsModalYear(selectedYear);
    setDetailsModalOpen(true);
  };

  // Handle closing container details modal
  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setDetailsModalStatus("");
    setDetailsModalSize("");
    setDetailsModalYear("");
  };

  // Get IE codes display text for header
  const getIeCodesDisplayText = () => {
    const ieCodes = getUserIeCodes();
    if (ieCodes.length === 0) return "";
    if (ieCodes.length === 1) return `IE Code: ${ieCodes[0]}`;
    if (ieCodes.length <= 3) return `IE Codes: ${ieCodes.join(", ")}`;
    return `${ieCodes.length} IE Codes`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          padding: "8px",
        },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "1.5rem",
          color: "#1976d2",
          pb: 1,
        }}
      >
        🚢 {gandhidham ? "Gandhidham" : "Shipping"} Container Analysis Summary
        {/* Show mode indicator */}
        {gandhidham && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            📍 Gandhidham Port Data
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        {/* Filter Section */}
        <Box
          sx={{
            mb: 3,
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          {/* Year Filter */}
          <FormControl component="fieldset">
            <FormLabel
              component="legend"
              sx={{
                fontWeight: "bold",
                color: "#333",
                fontSize: "1.1rem",
                mb: 1,
              }}
            >
              Select Fiscal Year:
            </FormLabel>
            <RadioGroup
              row
              value={selectedYear}
              onChange={handleYearChange}
              sx={{ gap: 3 }}
            >
              <FormControlLabel
                value="25-26"
                control={<Radio color="primary" />}
                label="2025-26"
                sx={{
                  "& .MuiFormControlLabel-label": {
                    fontSize: "1rem",
                    fontWeight: "500",
                  },
                }}
              />
              <FormControlLabel
                value="24-25"
                control={<Radio color="primary" />}
                label="2024-25"
                sx={{
                  "& .MuiFormControlLabel-label": {
                    fontSize: "1rem",
                    fontWeight: "500",
                  },
                }}
              />
            </RadioGroup>
          </FormControl>

          {/* Mode indicator chip */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Chip
              label={gandhidham ? "Gandhidham Mode" : "Standard Mode"}
              color={gandhidham ? "warning" : "primary"}
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>
              Loading {gandhidham ? "Gandhidham" : ""} container data...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Summary Table */}
        {summaryData && !loading && (
          <>
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "#333" }}
              >
                {gandhidham ? "Gandhidham " : ""}Container Status Overview for{" "}
                {selectedYear}
              </Typography>
              {lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  Last updated: {lastUpdated}
                </Typography>
              )}
            </Box>

            {/* Click hint */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                backgroundColor: "#e3f2fd",
                borderRadius: 1,
                border: "1px solid #bbdefb",
              }}
            >
              <Typography
                variant="body2"
                color="primary"
                sx={{ textAlign: "center", fontSize: "0.9rem" }}
              >
                💡 <strong>Tip:</strong> Click on any container count below to
                view detailed container lists
              </Typography>
            </Box>

            <TableContainer
              component={Paper}
              sx={{
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <StyledTableCell sx={{ width: "25%" }}>
                      STATUS
                    </StyledTableCell>
                    <StyledTableCell sx={{ width: "25%" }}>
                      20' CONTAINERS
                    </StyledTableCell>
                    <StyledTableCell sx={{ width: "25%" }}>
                      40' CONTAINERS
                    </StyledTableCell>
                    <StyledTableCell sx={{ width: "25%" }}>
                      TOTAL
                    </StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Arrived Row */}
                  <TableRow>
                    <StyledDataCell>
                      <StatusChip
                        label="ARRIVED"
                        status="arrived"
                        size="small"
                      />
                    </StyledDataCell>
                    <ClickableDataCell
                      onClick={() => handleOpenDetailsModal("arrived", "20")}
                      title="Click to view detailed list of 20' arrived containers"
                    >
                      {summaryData["20_arrived"]}
                    </ClickableDataCell>
                    <ClickableDataCell
                      onClick={() => handleOpenDetailsModal("arrived", "40")}
                      title="Click to view detailed list of 40' arrived containers"
                    >
                      {summaryData["40_arrived"]}
                    </ClickableDataCell>
                    <ClickableDataCell
                      onClick={() => handleOpenDetailsModal("arrived", "")}
                      title="Click to view detailed list of all arrived containers"
                      sx={{ backgroundColor: "#e8f5e9", fontWeight: "bold" }}
                    >
                      {summaryData.total_arrived}
                    </ClickableDataCell>
                  </TableRow>

                  {/* In Transit Row */}
                  <TableRow>
                    <StyledDataCell>
                      <StatusChip
                        label="IN TRANSIT"
                        status="transit"
                        size="small"
                      />
                    </StyledDataCell>
                    <ClickableDataCell
                      onClick={() => handleOpenDetailsModal("transit", "20")}
                      title="Click to view detailed list of 20' in-transit containers"
                    >
                      {summaryData["20_transit"]}
                    </ClickableDataCell>
                    <ClickableDataCell
                      onClick={() => handleOpenDetailsModal("transit", "40")}
                      title="Click to view detailed list of 40' in-transit containers"
                    >
                      {summaryData["40_transit"]}
                    </ClickableDataCell>
                    <ClickableDataCell
                      onClick={() => handleOpenDetailsModal("transit", "")}
                      title="Click to view detailed list of all in-transit containers"
                      sx={{ backgroundColor: "#fff3e0", fontWeight: "bold" }}
                    >
                      {summaryData.total_transit}
                    </ClickableDataCell>
                  </TableRow>

                  {/* Total Row */}
                  <TableRow>
                    <StyledTotalCell>TOTAL</StyledTotalCell>
                    <StyledTotalCell>
                      {summaryData["20_arrived"] + summaryData["20_transit"]}
                    </StyledTotalCell>
                    <StyledTotalCell>
                      {summaryData["40_arrived"] + summaryData["40_transit"]}
                    </StyledTotalCell>
                    <StyledTotalCell sx={{ backgroundColor: "#1976d2" }}>
                      {summaryData.grand_total}
                    </StyledTotalCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary Statistics */}
            <Box
              sx={{
                mt: 3,
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Chip
                label={`${summaryData.total_arrived} Containers Arrived`}
                color="success"
                variant="outlined"
                size="medium"
              />
              <Chip
                label={`${summaryData.total_transit} Containers In Transit`}
                color="warning"
                variant="outlined"
                size="medium"
              />
              <Chip
                label={`${summaryData.grand_total} Total Containers`}
                color="primary"
                variant="filled"
                size="medium"
              />
            </Box>
          </>
        )}

        {/* No Data State */}
        {!summaryData && !loading && !error && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No container data available for the selected year.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          variant="contained"
          color="primary"
          sx={{ px: 4 }}
        >
          Close
        </Button>
      </DialogActions>

      {/* Container Details Modal - pass gandhidham prop */}
      <ContainerDetailsModal
        open={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        status={detailsModalStatus}
        size={detailsModalSize}
        year={detailsModalYear}
        gandhidham={gandhidham} // Pass gandhidham prop to details modal too
      />
    </Dialog>
  );
};

export default ContainerSummaryModal;
