import * as React from "react";
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Snackbar, 
  Alert,
  CircularProgress,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import { 
  Search, 
  Refresh, 
  FileDownload,
  Visibility,
  Assignment,
  Business
} from "@mui/icons-material";
import axios from "axios";
import { getJsonCookie } from "../utils/cookies";
import BackButton from "./BackButton";
import { useNavigate } from "react-router-dom";

const STATUS_TABS = [
  { label: "Pending", value: "pending", color: "#FEAF1A" },
  { label: "Handover Pending", value: "handover pending", color: "#3b82f6" },
  { label: "Booking Pending", value: "booking pending", color: "#8b5cf6" },
  { label: "Billing Ready", value: "billing ready", color: "#10b981" },
  { label: "Completed", value: "completed", color: "#00E4C5" },
  { label: "Cancelled", value: "cancelled", color: "#FF6378" },
  { label: "All", value: "all", color: "#64748b" }
];

function CExportDSR() {
  const navigate = useNavigate();
  
  // State
  const [tabValue, setTabValue] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [jobs, setJobs] = React.useState([]);
  const [pagination, setPagination] = React.useState({
    page: 0,
    limit: 10,
    totalCount: 0
  });
  const [search, setSearch] = React.useState("");
  const [selectedExporter, setSelectedExporter] = React.useState("all");
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "", severity: "success" });

  // IE Code assignments for exporter selection
  const ieCodeAssignments = React.useMemo(() => {
    const parsedUser = getJsonCookie("exim_user");
    return parsedUser?.ie_code_assignments || [];
  }, []);

  // Fetch jobs
  const fetchJobs = React.useCallback(async () => {
    setLoading(true);
    try {
      const status = STATUS_TABS[tabValue].value;
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
        search,
      };

      // If "all" is selected in dropdown but user has multiple assignments, 
      // the proxy will handle the multi-IE filter.
      // If a specific one is selected, we pass it.
      if (selectedExporter !== "all") {
        params.exporter = selectedExporter;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/exports/${status}`, {
        params,
        withCredentials: true
      });

      if (response.data.success) {
        setJobs(response.data.data.jobs || []);
        setPagination(prev => ({
          ...prev,
          totalCount: response.data.data.pagination.totalCount
        }));
      } else {
        setJobs([]);
        setSnackbar({ open: true, message: response.data.message || "Failed to fetch jobs", severity: "error" });
      }
    } catch (error) {
      console.error("Fetch export jobs error:", error);
      setJobs([]);
      setSnackbar({ open: true, message: "Error connecting to server", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [tabValue, pagination.page, pagination.limit, search, selectedExporter]);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handlers
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (event) => {
    setPagination(prev => ({ ...prev, limit: parseInt(event.target.value, 10), page: 0 }));
  };

  const handleExporterChange = (event) => {
    setSelectedExporter(event.target.value);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const getStatusChip = (status) => {
    const config = STATUS_TABS.find(t => t.value === status.toLowerCase()) || { color: "#64748b" };
    return (
      <Chip 
        label={status} 
        size="small" 
        sx={{ 
          bgcolor: `${config.color}15`, 
          color: config.color, 
          fontWeight: 600,
          border: `1px solid ${config.color}30`
        }} 
      />
    );
  };

  return (
    <Box sx={{ p: 0, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Bar */}
      <Paper elevation={0} sx={{ borderBottom: "1px solid #e2e8f0", borderRadius: 0 }}>
        <Box sx={{ px: 3, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <BackButton />
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Export DSR
            </Typography>
            <Chip label="Beta" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Exporter Selector */}
            {ieCodeAssignments.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="exporter-select-label">Filter by Exporter</InputLabel>
                <Select
                  labelId="exporter-select-label"
                  value={selectedExporter}
                  label="Filter by Exporter"
                  onChange={handleExporterChange}
                  sx={{ borderRadius: 2, bgcolor: "#fff" }}
                >
                  <MenuItem value="all">All Assigned Exporters</MenuItem>
                  {ieCodeAssignments.map((a) => (
                    <MenuItem key={a.ie_code_no} value={a.ie_code_no}>
                      {a.importer_name || a.ie_code_no}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <Tooltip title="Refresh Data">
              <IconButton onClick={fetchJobs} disabled={loading} sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                <Refresh fontSize="small" sx={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="contained"
              startIcon={<FileDownload />}
              sx={{ 
                borderRadius: 2, 
                textTransform: "none", 
                fontWeight: 600,
                bgcolor: "#1e293b",
                "&:hover": { bgcolor: "#0f172a" }
              }}
            >
              Export Excel
            </Button>
          </Box>
        </Box>
        
        {/* Status Tabs */}
        <Box sx={{ px: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.85rem",
                minHeight: 48,
                color: "#64748b",
                "&.Mui-selected": { color: "#1e293b", fontWeight: 700 }
              },
              "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" }
            }}
          >
            {STATUS_TABS.map((tab, index) => (
              <Tab 
                key={tab.value} 
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {tab.label}
                    {tabValue === index && jobs.length > 0 && (
                      <Chip label={pagination.totalCount} size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#f1f5f9" }} />
                    )}
                  </Box>
                } 
              />
            ))}
          </Tabs>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Search and Filters */}
        <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by Job No, SB No, Container No, or Invoice..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchJobs()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "#94a3b8" }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 3, bgcolor: "#fff" }
            }}
          />
        </Box>

        {/* Table Container */}
        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, color: "#475569" }}>Job Details</TableCell>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, color: "#475569" }}>Exporter</TableCell>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, color: "#475569" }}>SB Details</TableCell>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, color: "#475569" }}>Destination</TableCell>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, color: "#475569" }}>Status</TableCell>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, color: "#475569" }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <CircularProgress size={32} thickness={5} sx={{ color: "#1e293b" }} />
                    <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 500 }}>Loading export jobs...</Typography>
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <Assignment sx={{ fontSize: 48, color: "#e2e8f0" }} />
                      <Typography sx={{ color: "#64748b", fontWeight: 600 }}>No export jobs found</Typography>
                      <Typography variant="body2" sx={{ color: "#94a3b8" }}>Try adjusting your filters or search terms</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job._id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>{job.job_no}</Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>{job.job_date}</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip 
                          label={job.consignmentType} 
                          size="small" 
                          variant="outlined" 
                          sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, color: "#64748b" }} 
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Business sx={{ fontSize: 18, color: "#94a3b8" }} />
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: "#334155", fontSize: "0.85rem", maxWidth: 200, noWrap: true }}>
                            {job.exporter}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#94a3b8" }}>IEC: {job.ieCode}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {job.sb_no ? (
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: "#334155", fontSize: "0.85rem" }}>SB: {job.sb_no}</Typography>
                          <Typography variant="caption" sx={{ color: "#94a3b8" }}>Date: {job.sb_date || "N/A"}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: "#cbd5e1" }}>No Shipping Bill</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500, color: "#334155", fontSize: "0.85rem" }}>{job.destination_port}</Typography>
                      <Typography variant="caption" sx={{ color: "#94a3b8" }}>{job.destination_country}</Typography>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(job.status || "Pending")}
                      {job.detailedStatus && (
                        <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "#64748b", fontSize: "0.7rem" }}>
                          {job.detailedStatus}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" sx={{ color: "#3b82f6", bgcolor: "#3b82f610", "&:hover": { bgcolor: "#3b82f620" } }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <TablePagination
            component="div"
            count={pagination.totalCount}
            page={pagination.page}
            onPageChange={handlePageChange}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={handleLimitChange}
            sx={{ borderTop: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}
          />
        </TableContainer>
      </Box>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </Box>
  );
}

export default React.memo(CExportDSR);
