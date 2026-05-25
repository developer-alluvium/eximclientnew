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
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
 
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import { 
  Search, 
  Refresh, 
  FileDownload,
  Visibility,
  Business,
  ContentCopy,
  Lock,
  TrackChanges,
  FilterListOff,
  DirectionsBoat,
  Anchor,
  ArrowDropDown,
  Close,
  ChevronRight
} from "@mui/icons-material";
import axios from "axios";
import { getJsonCookie } from "../utils/cookies";
import BackButton from "./BackButton";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Status themes matching the standalone Export DSR
const statusThemes = {
  "Pending": { bg: "#f8fafc", border: "#94a3b8", text: "#475569", light: "#f1f5f9" },
  "SB Filed": { bg: "#f0f9ff", border: "#0ea5e9", text: "#0369a1", light: "#e0f2fe" },
  "L.E.O": { bg: "#fff1f2", border: "#f43f5e", text: "#be123c", light: "#ffe4e6" },
  "Container HO": { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", light: "#dcfce7" },
  "File Handover to IATA": { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", light: "#dcfce7" },
  "Rail Out": { bg: "#f5f3ff", border: "#8b5cf6", text: "#6d28d9", light: "#ede9fe" },
  "Departure": { bg: "#f5f3ff", border: "#8b5cf6", text: "#6d28d9", light: "#ede9fe" },
  "Billing Pending": { bg: "#fff7ed", border: "#f59e0b", text: "#b45309", light: "#ffedd5" },
  "Billing Done": { bg: "#f0fdfa", border: "#14b8a6", text: "#0f766e", light: "#ccfbf1" },
  "Completed": { bg: "#f1f5f9", border: "#64748b", text: "#334155", light: "#e2e8f0" },
  "default": { bg: "#ffffff", border: "#e5e7eb", text: "#374151", light: "#f9fafb" }
};

const getStatusTheme = (statusValue) => {
  return statusThemes[statusValue] || statusThemes["default"];
};

const getStatusColor = (statusValue) => getStatusTheme(statusValue).bg;

// Branch options
const branchOptions = [
  { code: "", label: "All Branches" },
  { code: "BRD", label: "BRD - BARODA" },
  { code: "GIM", label: "GIM - GANDHIDHAM" },
  { code: "HAZ", label: "HAZ - HAZIRA" },
  { code: "AMD", label: "AMD - AHMEDABAD" },
  { code: "COK", label: "COK - COCHIN" },
];

// Movement options
const movementTypeOptions = [
  { value: "", label: "All Movement" },
  { value: "FCL", label: "FCL" },
  { value: "LCL", label: "LCL" },
  { value: "AIR", label: "AIR" },
];

const buildShippingLineUrls = (num, containerFirst = "") => ({
  MSC: "https://www.msc.com/en/track-a-shipment",
  "M S C": "https://www.msc.com/en/track-a-shipment",
  "MSC LINE": "https://www.msc.com/en/track-a-shipment",
  "Maersk Line": `https://www.maersk.com/tracking/${num}`,
  "CMA CGM AGENCIES INDIA PVT. LTD": "https://www.cma-cgm.com/ebusiness/tracking/search",
  "Hapag-Lloyd": `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?booking=${num}`,
  "Trans Asia": `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst}&booking=${num}`,
  "ONE LINE": "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking",
  HMM: "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
  HYUNDI: "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
  "Cosco Container Lines": "https://elines.coscoshipping.com/ebusiness/cargotracking",
  COSCO: "https://elines.coscoshipping.com/ebusiness/cargotracking",
  "Unifeeder Agencies India Pvt Ltd": num ? `https://www.unifeeder.cargoes.com/tracking?ID=${num.slice(0, 3)}%2F${num.slice(3, 6)}%2F${num.slice(6, 8)}%2F${num.slice(8)}` : "#",
  UNIFEEDER: num ? `https://www.unifeeder.cargoes.com/tracking?ID=${num.slice(0, 3)}%2F${num.slice(3, 6)}%2F${num.slice(6, 8)}%2F${num.slice(8)}` : "#",
});

const getContainerSizeLabel = (value) => {
  const raw = (value || "").toString().toUpperCase().trim();
  const sizeMatch = raw.match(/\b(20|40|45)\b/);
  return sizeMatch ? sizeMatch[1] : raw;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
};

const STATUS_TABS = [
  { label: "Pending", value: "Pending" },
  { label: "Booking Pending", value: "Booking Pending" },
  { label: "Handover Pending", value: "Handover Pending" },
  { label: "Billing Pending", value: "Billing Pending" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

function CExportDSR() {
  const navigate = useNavigate();

  // Load user
  const user = React.useMemo(() => {
    return getJsonCookie("exim_user") || null;
  }, []);

  // Exporters list from user assignments
  const ieCodeAssignments = React.useMemo(() => {
    return user?.ie_code_assignments || [];
  }, [user]);

  // States
  const [tabValue, setTabValue] = React.useState(0);
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [limit, setLimit] = React.useState(100);
  const [totalCount, setTotalCount] = React.useState(0);

  // Filters State
  const [search, setSearch] = React.useState("");
  const [year, setYear] = React.useState("26-27");
  const [month, setMonth] = React.useState("");
  const [branch, setBranch] = React.useState("");
  const [customHouse, setCustomHouse] = React.useState("");
  const [consignmentType, setConsignmentType] = React.useState("");
  const [jobOwner, setJobOwner] = React.useState("");
  const [selectedExporter, setSelectedExporter] = React.useState("all");
  const [detailedStatus, setDetailedStatus] = React.useState([]);
  const [goodsStuffedAt, setGoodsStuffedAt] = React.useState("");
  const [pendingQueries, setPendingQueries] = React.useState(false);

  // Dialog and Menu states
  const [createJobDialogOpen, setCreateJobDialogOpen] = React.useState(false);
  const [excelDownloadLoading, setExcelDownloadLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "", severity: "success" });
  const [expandedContainers, setExpandedContainers] = React.useState({});
  
  // File menu states
  const [filesAnchorEl, setFilesAnchorEl] = React.useState(null);
  const [selectedFilesJob, setSelectedFilesJob] = React.useState(null);

  // Status Action menu states
  const [actionDocsAnchorEl, setActionDocsAnchorEl] = React.useState(null);
  const [selectedActionJob, setSelectedActionJob] = React.useState(null);

  // Dynamically populated filters from returned jobs
  const customHousesList = React.useMemo(() => {
    const set = new Set(["ICD SACHANA", "MUNDRA SEA", "HAZIRA PORT", "ICD KHODIYAR", "ICD SANAND"]);
    jobs.forEach(j => {
      if (j.custom_house) set.add(j.custom_house.toUpperCase().trim());
    });
    return Array.from(set).sort();
  }, [jobs]);

  const jobOwnersList = React.useMemo(() => {
    const set = new Set();
    jobs.forEach(j => {
      if (j.job_owner) set.add(j.job_owner);
    });
    return Array.from(set).map(o => ({ username: o, fullName: o }));
  }, [jobs]);

  // Fetch export jobs
  const fetchJobs = React.useCallback(async () => {
    setLoading(true);
    try {
      const status = STATUS_TABS[tabValue].value;
      const params = {
        page: page + 1,
        limit,
        search,
        year: year === "all" ? "" : year,
        consignmentType,
        branch,
        customHouse,
        month,
        goods_stuffed_at: goodsStuffedAt,
        jobOwner,
        pendingQueries: pendingQueries ? "true" : "false"
      };

      if (selectedExporter !== "all") {
        params.exporter = selectedExporter;
      }

      if (detailedStatus && detailedStatus.length > 0) {
        params.detailedStatus = detailedStatus.join(",");
      }

      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/exports/${status}`, {
        params,
        withCredentials: true
      });

      if (response.data.success) {
        setJobs(response.data.data.jobs || []);
        setTotalCount(response.data.data.total || response.data.data.pagination?.totalCount || 0);
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
  }, [tabValue, page, limit, search, year, consignmentType, branch, customHouse, month, goodsStuffedAt, jobOwner, pendingQueries, selectedExporter, detailedStatus]);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Clear filters
  const handleClearFilters = () => {
    setSearch("");
    setYear("26-27");
    setMonth("");
    setBranch("");
    setCustomHouse("");
    setConsignmentType("");
    setJobOwner("");
    setSelectedExporter("all");
    setDetailedStatus([]);
    setGoodsStuffedAt("");
    setPendingQueries(false);
    setPage(0);
  };

  // Excel DSR Export using ExcelJS
  const handleDownloadDSR = async () => {
    if (jobs.length === 0) {
      setSnackbar({ open: true, message: "No jobs available to export", severity: "warning" });
      return;
    }

    setExcelDownloadLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Export DSR");

      // Set columns
      worksheet.columns = [
        { header: "Job No", key: "job_no", width: 25 },
        { header: "Job Date", key: "job_date", width: 15 },
        { header: "Exporter", key: "exporter", width: 35 },
        { header: "Consignee", key: "consignee", width: 30 },
        { header: "Invoice No", key: "invoice_no", width: 20 },
        { header: "Invoice Value", key: "invoice_val", width: 18 },
        { header: "SB No", key: "sb_no", width: 15 },
        { header: "SB Date", key: "sb_date", width: 15 },
        { header: "Destination Port", key: "dest_port", width: 25 },
        { header: "Container(s)", key: "containers", width: 30 },
        { header: "Milestones", key: "milestones", width: 25 },
        { header: "Status", key: "status", width: 20 }
      ];

      // Format Header
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E3A8A" }, // Navy blue
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      // Add rows
      jobs.forEach((job) => {
        // Map Container info
        const containerStrs = (job.containers || []).map(c => 
          `${c.containerNo || ""}${c.type ? ` (${getContainerSizeLabel(c.type)})` : ""}`
        ).join("\n");

        // Map Handover Milestones
        const opDetails = job.operations?.[0]?.statusDetails?.[0] || {};
        const milestones = [];
        if (opDetails.leoDate) milestones.push(`LEO: ${formatDate(opDetails.leoDate)}`);
        if (opDetails.handoverForwardingNoteDate) milestones.push(`DHo: ${formatDate(opDetails.handoverForwardingNoteDate)}`);
        if (opDetails.handoverConcorTharSanganaRailRoadDate) {
          const outLbl = opDetails.railRoad === "road" ? "Road Out" : "Rail Out";
          milestones.push(`${outLbl}: ${formatDate(opDetails.handoverConcorTharSanganaRailRoadDate)}`);
        }
        if (opDetails.railOutReachedDate) {
          const reachedLbl = opDetails.railRoad === "road" ? "Road Rch" : "Rail Rch";
          milestones.push(`${reachedLbl}: ${formatDate(opDetails.railOutReachedDate)}`);
        }
        if (opDetails.billingDocsSentDt) milestones.push(`Bill: ${formatDate(opDetails.billingDocsSentDt)}`);
        const milestoneStr = milestones.join("\n");

        // Map invoice
        const inv = job.invoices?.[0] || {};
        const invValStr = inv.invoiceValue ? `${inv.termsOfInvoice || ""} ${inv.currency || ""} ${inv.invoiceValue.toLocaleString()}` : "";

        const rowData = {
          job_no: job.job_no,
          job_date: formatDate(job.job_date),
          exporter: job.exporter + (job.exporter_branch_name ? ` (${job.exporter_branch_name})` : ""),
          consignee: job.consignees?.[0]?.consignee_name || "-",
          invoice_no: inv.invoiceNumber || "-",
          invoice_val: invValStr,
          sb_no: job.sb_no || "-",
          sb_date: formatDate(job.sb_date),
          dest_port: job.destination_port || "-",
          containers: containerStrs || "-",
          milestones: milestoneStr || "-",
          status: (Array.isArray(job.detailedStatus) && job.detailedStatus.length > 0
            ? job.detailedStatus[job.detailedStatus.length - 1]
            : job.detailedStatus || job.status || "Pending")
        };

        const newRow = worksheet.addRow(rowData);

        // Apply alignment & cell styling
        newRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } }
          };
          
          // Color coding status column
          if (cell.col === 12) {
            const statusTheme = getStatusTheme(rowData.status);
            const cleanHex = statusTheme.bg.replace("#", "");
            if (cleanHex !== "transparent" && cleanHex.length === 6) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF" + cleanHex }
              };
            }
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const today = new Date().toISOString().split("T")[0];
      saveAs(new Blob([buffer]), `Export_DSR_Report_${today}.xlsx`);
      setSnackbar({ open: true, message: "Excel report downloaded successfully", severity: "success" });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "Error downloading Excel report", severity: "error" });
    } finally {
      setExcelDownloadLoading(false);
    }
  };

  const handleCopyText = (text, e) => {
    e?.stopPropagation();
    if (text) {
      navigator.clipboard.writeText(text);
      setSnackbar({ open: true, message: `Copied: "${text}"`, severity: "success" });
    }
  };

  const toggleContainers = (e, id) => {
    e?.stopPropagation();
    setExpandedContainers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Doc lists resolver
  const getJobFilesList = (job) => {
    const files = [];
    if (job.booking_copy) files.push({ name: "Booking Copy", url: job.booking_copy });
    if (job.shipping_bill_copy) files.push({ name: "Shipping Bill Copy", url: job.shipping_bill_copy });
    if (job.gate_in_copy) files.push({ name: "Gate In Copy", url: job.gate_in_copy });
    if (job.leo_copy) files.push({ name: "LEO Copy", url: job.leo_copy });
    if (job.bill_of_lading_copy) files.push({ name: "Bill of Lading Copy", url: job.bill_of_lading_copy });
    if (job.billing_copy) files.push({ name: "Billing Copy", url: job.billing_copy });
    
    if (job.other_documents && Array.isArray(job.other_documents)) {
      job.other_documents.forEach((doc, idx) => {
        if (doc) files.push({ name: `Other Document ${idx + 1}`, url: doc });
      });
    }
    return files;
  };

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", p: 0, fontFamily: "sans-serif" }}>
      {/* Header bar matching standalone design */}
      <Paper elevation={0} sx={{ borderBottom: "1px solid #e2e8f0", borderRadius: 0, bgcolor: "#fff", px: 3, py: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <BackButton />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "18px" }}>
              Export Jobs {totalCount > 0 && <span style={{ color: "#64748b", fontWeight: 500, fontSize: "14px" }}>({totalCount})</span>}
            </Typography>
            <Chip label="Beta" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={handleDownloadDSR}
              disabled={excelDownloadLoading}
              startIcon={excelDownloadLoading ? <CircularProgress size={16} color="inherit" /> : <FileDownload />}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12px",
                borderColor: "#cbd5e1",
                color: "#475569",
                borderRadius: "6px",
                bgcolor: "#fff",
                height: "32px",
                "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" }
              }}
            >
              {excelDownloadLoading ? "Downloading..." : "Download DSR Report"}
            </Button>

            <Button
              variant="contained"
              onClick={() => setCreateJobDialogOpen(true)}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12px",
                bgcolor: "#0f172a",
                borderRadius: "6px",
                height: "32px",
                "&:hover": { bgcolor: "#1e293b" }
              }}
            >
              + Create Job
            </Button>
          </Box>
        </Box>

        {/* Tab switcher matching standalone Export Job tab style */}
        <Box sx={{ mt: 1 }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, val) => {
              setTabValue(val);
              setPage(0);
            }}
            sx={{
              minHeight: "36px",
              "& .MuiTabs-indicator": {
                backgroundColor: "#2563eb",
                height: 3,
                borderRadius: "3px 3px 0 0"
              },
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "13px",
                minHeight: "36px",
                py: 1,
                px: 2,
                color: "#64748b",
                "&.Mui-selected": {
                  color: "#2563eb",
                  fontWeight: 700
                }
              }
            }}
          >
            {STATUS_TABS.map((tab, idx) => (
              <Tab 
                key={tab.value} 
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {tab.label}
                    {tabValue === idx && totalCount > 0 && (
                      <span style={{ 
                        fontSize: "10px", 
                        backgroundColor: "#eff6ff", 
                        color: "#2563eb", 
                        padding: "1px 6px", 
                        borderRadius: "10px",
                        fontWeight: "700"
                      }}>
                        {totalCount}
                      </span>
                    )}
                  </Box>
                } 
              />
            ))}
          </Tabs>
        </Box>
      </Paper>

      {/* Main DSR Table Layout & Filters */}
      <Box sx={{ p: 2 }}>
        
        {/* Filters Toolbar */}
        <Box 
          sx={{ 
            display: "flex", 
            gap: "8px", 
            alignItems: "center", 
            mb: 1.5, 
            flexWrap: "wrap", 
            bgcolor: "#fff", 
            p: 1, 
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
          }}
        >
          {/* Year dropdown */}
          <select
            style={selectStyle}
            value={year}
            onChange={(e) => { setYear(e.target.value); setPage(0); }}
          >
            <option value="all">All Years</option>
            <option value="26-27">26-27</option>
            <option value="25-26">25-26</option>
            <option value="24-25">24-25</option>
          </select>

          {/* Month dropdown */}
          <select
            style={selectStyle}
            value={month}
            onChange={(e) => { setMonth(e.target.value); setPage(0); }}
          >
            <option value="">All Months</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
          </select>

          {/* Branch dropdown */}
          <select
            style={selectStyle}
            value={branch}
            onChange={(e) => { setBranch(e.target.value); setPage(0); }}
          >
            {branchOptions.map(opt => (
              <option key={opt.code} value={opt.code}>{opt.label}</option>
            ))}
          </select>

          {/* Custom House dropdown */}
          <select
            style={selectStyle}
            value={customHouse}
            onChange={(e) => { setCustomHouse(e.target.value); setPage(0); }}
          >
            <option value="">All Custom Houses</option>
            {customHousesList.map(ch => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>

          {/* Movement Type Filter */}
          <select
            style={selectStyle}
            value={consignmentType}
            onChange={(e) => { setConsignmentType(e.target.value); setPage(0); }}
          >
            {movementTypeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Job Owner Filter */}
          <select
            style={selectStyle}
            value={jobOwner}
            onChange={(e) => { setJobOwner(e.target.value); setPage(0); }}
          >
            <option value="">All Job Owners</option>
            {jobOwnersList.map(opt => (
              <option key={opt.username} value={opt.username}>{opt.fullName}</option>
            ))}
          </select>

          {/* Exporter Filter (if multiple assigned) */}
          {ieCodeAssignments.length > 0 && (
            <select
              style={{ ...selectStyle, maxWidth: "180px" }}
              value={selectedExporter}
              onChange={(e) => { setSelectedExporter(e.target.value); setPage(0); }}
            >
              <option value="all">All Assigned Exporters</option>
              {ieCodeAssignments.map(a => (
                <option key={a.ie_code_no} value={a.importer_name || a.ie_code_no}>
                  {a.importer_name || a.ie_code_no}
                </option>
              ))}
            </select>
          )}

          {/* Detailed Status Select (Multi-Select) */}
          <FormControl size="small" sx={{ width: 140, minWidth: 140 }}>
            <Select
              multiple
              value={detailedStatus}
              onChange={(e) => {
                const value = e.target.value;
                setDetailedStatus(typeof value === 'string' ? value.split(',') : value);
                setPage(0);
              }}
              displayEmpty
              renderValue={(selected) => {
                if (selected.length === 0) return <em style={{ fontSize: "12px", color: "#64748b", fontStyle: "normal" }}>All Detailed Status</em>;
                return <span style={{ fontSize: "12px" }}>{selected.join(", ")}</span>;
              }}
              sx={{
                height: 28,
                bgcolor: "#fff",
                fontSize: "12px",
                "& .MuiSelect-select": { py: 0.5, px: 1, display: "flex", alignItems: "center" }
              }}
            >
              {[
                "Pending",
                "SB Filed",
                "L.E.O",
                "Container HO",
                "File Handover to IATA",
                "Rail Out",
                "Departure",
                "Billing Pending",
                "Billing Done",
              ].map((status) => (
                <MenuItem key={status} value={status} sx={{ py: 0.5, fontSize: "12px" }}>
                  <Checkbox size="small" checked={detailedStatus.indexOf(status) > -1} sx={{ p: 0.5 }} />
                  <span style={{
                    display: "inline-block",
                    width: 10, height: 10,
                    borderRadius: "50%",
                    backgroundColor: getStatusColor(status),
                    border: "1px solid #94a3b8",
                    marginRight: 8
                  }} />
                  <ListItemText primary={status} primaryTypographyProps={{ fontSize: "12px" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Goods Stuffed At */}
          <select
            style={selectStyle}
            value={goodsStuffedAt}
            onChange={(e) => { setGoodsStuffedAt(e.target.value); setPage(0); }}
          >
            <option value="">All Stuffed At</option>
            <option value="FACTORY">FACTORY</option>
            <option value="DOCK">DOCK</option>
          </select>

          {/* Pending Qs Button Toggle */}
          <button
            onClick={() => { setPendingQueries(!pendingQueries); setPage(0); }}
            style={{
              height: "28px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "0 8px",
              borderRadius: "4px",
              border: "1px solid",
              backgroundColor: pendingQueries ? "#fee2e2" : "#f8fafc",
              borderColor: pendingQueries ? "#ef4444" : "#cbd5e1",
              color: pendingQueries ? "#dc2626" : "#475569",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s"
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              backgroundColor: pendingQueries ? "#dc2626" : "#94a3b8"
            }} />
            Pending Qs
          </button>

          {/* Search Box on Right */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto", minWidth: "160px" }}>
            <input
              style={{
                height: "28px",
                padding: "0 8px",
                fontSize: "12px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                outline: "none",
                color: "#1e293b",
                width: "100%"
              }}
              placeholder="Search by Job No, Exporter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Tooltip title="Clear Filters">
              <IconButton 
                onClick={handleClearFilters} 
                size="small" 
                sx={{ 
                  bgcolor: "#f1f5f9", 
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  height: "28px",
                  width: "28px"
                }}
              >
                <FilterListOff sx={{ fontSize: 16, color: "#64748b" }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Premium Table Container */}
        <TableContainer 
          component={Paper} 
          sx={{ 
            borderRadius: "6px", 
            border: "1px solid #cbd5e1", 
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
            overflowX: "auto"
          }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: 1200, tableLayout: "fixed" }}>
            
            {/* Setting precise column widths */}
            <colgroup>
              <col style={{ width: "13%" }} /> {/* Job No */}
              <col style={{ width: "18%" }} /> {/* Exporter */}
              <col style={{ width: "12%" }} /> {/* Invoice */}
              <col style={{ width: "10%" }} /> {/* SB No */}
              <col style={{ width: "16%" }} /> {/* Port */}
              <col style={{ width: "11%" }} /> {/* Container */}
              <col style={{ width: "10%" }} /> {/* Handover */}
              <col style={{ width: "5%" }} />  {/* Docs */}
              <col style={{ width: "9%" }} />  {/* Status */}
            </colgroup>

            <TableHead>
              <TableRow>
                <TableCell style={tableHeaderStyle}>Job No</TableCell>
                <TableCell style={tableHeaderStyle}>Exporter</TableCell>
                <TableCell style={tableHeaderStyle}>Invoice</TableCell>
                <TableCell style={tableHeaderStyle}>SB No</TableCell>
                <TableCell style={tableHeaderStyle}>Port</TableCell>
                <TableCell style={tableHeaderStyle}>Container</TableCell>
                <TableCell style={tableHeaderStyle}>Handover</TableCell>
                <TableCell style={tableHeaderStyle} align="center">Docs</TableCell>
                <TableCell style={{ ...tableHeaderStyle, borderRight: "none" }} align="center">Status</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 12 }}>
                    <CircularProgress size={30} thickness={4} sx={{ color: "#1e3a8a" }} />
                    <Typography variant="body2" sx={{ mt: 1.5, color: "#64748b", fontWeight: 600 }}>
                      Loading DSR records...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 12 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <Business sx={{ fontSize: 40, color: "#cbd5e1" }} />
                      <Typography sx={{ color: "#475569", fontWeight: 700, fontSize: "14px" }}>
                        No export jobs found
                      </Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "12px" }}>
                        Try checking your assigned exporters or filters.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job, idx) => {
                  const currentStatus = (Array.isArray(job.detailedStatus) && job.detailedStatus.length > 0
                    ? job.detailedStatus[job.detailedStatus.length - 1]
                    : job.detailedStatus || job.status || "Pending");
                  const theme = getStatusTheme(currentStatus);
                  const files = getJobFilesList(job);

                  return (
                    <TableRow 
                      key={job._id || idx}
                      sx={{ 
                        bgcolor: theme.bg,
                        borderLeft: `4px solid ${theme.border}`,
                        transition: "background-color 0.15s ease",
                        "&:hover": { bgcolor: "#f8fafc" }
                      }}
                    >
                      {/* Job No Column */}
                      <TableCell style={tableCellStyle}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Typography 
                            variant="subtitle2" 
                            onClick={() => handleCopyText(job.job_no)}
                            sx={{ 
                              fontWeight: 800, 
                              color: "#2563eb", 
                              fontSize: "11px",
                              cursor: "pointer",
                              "&:hover": { textDecoration: "underline" }
                            }}
                          >
                            {job.job_no}
                          </Typography>
                          <IconButton size="small" onClick={(e) => handleCopyText(job.job_no, e)} sx={{ p: 0.2 }}>
                            <ContentCopy sx={{ fontSize: 10, color: "#64748b" }} />
                          </IconButton>
                        </Box>
                        
                        <Typography sx={{ fontSize: "10px", color: "#64748b", mt: 0.5 }}>
                          {formatDate(job.job_date)}
                        </Typography>

                        {job.custom_house && (
                          <Typography sx={{ fontSize: "10px", fontWeight: 600, color: "#475569", mt: 0.5 }}>
                            {job.custom_house}
                          </Typography>
                        )}

                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.8 }}>
                          {job.consignmentType && (
                            <span style={pillStyle}>
                              {job.consignmentType}
                            </span>
                          )}
                          {job.job_owner && (
                            <span style={pillStyle}>
                              {job.job_owner}
                            </span>
                          )}
                        </Box>
                      </TableCell>

                      {/* Exporter Column */}
                      <TableCell style={tableCellStyle}>
                        <Typography sx={{ fontWeight: 700, fontSize: "11px", color: "#0f172a" }}>
                          {job.exporter}
                          {job.exporter_branch_name && job.exporter_branch_name.toLowerCase() !== "main" && (
                            <span style={{ fontWeight: 500, color: "#64748b", fontSize: "10px" }}>
                              {` (${job.exporter_branch_name})`}
                            </span>
                          )}
                        </Typography>
                        
                        {job.consignees?.[0]?.consignee_name && (
                          <Typography sx={{ fontSize: "10px", color: "#475569", mt: 0.5, display: "flex", gap: 0.5 }}>
                            <span style={{ fontWeight: 700, color: "#94a3b8", fontSize: "9px" }}>CONS:</span>
                            {job.consignees[0].consignee_name.length > 35 
                              ? `${job.consignees[0].consignee_name.substring(0, 35)}...` 
                              : job.consignees[0].consignee_name}
                          </Typography>
                        )}

                        {job.buyerThirdPartyInfo?.buyer?.name && (
                          <Typography sx={{ fontSize: "10px", color: "#475569", mt: 0.5, display: "flex", gap: 0.5 }}>
                            <span style={{ fontWeight: 700, color: "#94a3b8", fontSize: "9px" }}>3rd PARTY:</span>
                            {job.buyerThirdPartyInfo.buyer.name}
                          </Typography>
                        )}

                        {job.booking_no && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                            <Typography sx={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>
                              Bk No: <span style={{ fontWeight: 500, color: "#0f172a" }}>{job.booking_no}</span>
                            </Typography>
                            <IconButton size="small" onClick={(e) => handleCopyText(job.booking_no, e)} sx={{ p: 0.2 }}>
                              <ContentCopy sx={{ fontSize: 9, color: "#94a3b8" }} />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>

                      {/* Invoice Column */}
                      <TableCell style={tableCellStyle}>
                        {job.invoices?.[0] ? (
                          <>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <Typography sx={{ fontWeight: 700, fontSize: "11px", color: "#0f172a" }}>
                                {job.invoices[0].invoiceNumber}
                              </Typography>
                              <IconButton size="small" onClick={(e) => handleCopyText(job.invoices[0].invoiceNumber, e)} sx={{ p: 0.2 }}>
                                <ContentCopy sx={{ fontSize: 10, color: "#cbd5e1" }} />
                              </IconButton>
                            </Box>
                            
                            <Typography sx={{ fontSize: "10px", color: "#64748b" }}>
                              {formatDate(job.invoices[0].invoiceDate)}
                            </Typography>

                            <Typography 
                              sx={{ 
                                display: "inline-block", 
                                mt: 0.5, 
                                py: 0.2, 
                                px: 0.5, 
                                borderRadius: "4px", 
                                bgcolor: "rgba(0,0,0,0.03)", 
                                fontWeight: 800, 
                                fontSize: "10px", 
                                color: "#0f172a" 
                              }}
                            >
                              <span style={{ color: "#64748b", fontWeight: 500 }}>{job.invoices[0].termsOfInvoice}</span>{" "}
                              {job.invoices[0].currency}{" "}
                              {job.invoices[0].invoiceValue?.toLocaleString()}
                            </Typography>
                          </>
                        ) : (
                          <Typography sx={{ fontSize: "10px", color: "#cbd5e1" }}>-</Typography>
                        )}
                      </TableCell>

                      {/* SB No Column */}
                      <TableCell style={tableCellStyle}>
                        {job.sb_no ? (
                          <>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <Typography sx={{ fontWeight: 800, fontSize: "11px", color: "#2563eb", textDecoration: "underline" }}>
                                {job.sb_no}
                              </Typography>
                              <IconButton size="small" onClick={(e) => handleCopyText(job.sb_no, e)} sx={{ p: 0.2 }}>
                                <ContentCopy sx={{ fontSize: 10, color: "#cbd5e1" }} />
                              </IconButton>
                            </Box>
                            <Typography sx={{ fontSize: "10px", color: "#64748b" }}>
                              {formatDate(job.sb_date)}
                            </Typography>
                          </>
                        ) : (
                          <Typography sx={{ fontSize: "10px", color: "#ef4444", fontWeight: 600 }}>N/A</Typography>
                        )}
                      </TableCell>

                      {/* Port Column */}
                      <TableCell style={tableCellStyle}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <span style={{ fontWeight: 800, fontSize: "9px", color: "#94a3b8", width: "30px" }}>DEST</span>
                            <span style={{ fontSize: "10px", color: "#0f172a", fontWeight: 700 }}>
                              {job.destination_port} {job.destination_country ? `(${job.destination_country})` : ""}
                            </span>
                          </Box>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <span style={{ fontWeight: 800, fontSize: "9px", color: "#94a3b8", width: "30px" }}>POL</span>
                            <span style={{ fontSize: "10px", color: "#475569" }}>{job.port_of_loading}</span>
                          </Box>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <span style={{ fontWeight: 800, fontSize: "9px", color: "#94a3b8", width: "30px" }}>DISCH</span>
                            <span style={{ fontSize: "10px", color: "#475569" }}>{job.port_of_discharge}</span>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Container Column */}
                      <TableCell style={tableCellStyle}>
                        {job.containers && job.containers.length > 0 ? (
                          (() => {
                            const validContainers = job.containers.filter(c => c.containerNo);
                            const key = job._id || job.job_no;
                            const isExpanded = !!expandedContainers[key];
                            const visible = isExpanded ? validContainers : validContainers.slice(0, 2);
                            const hiddenCount = validContainers.length - visible.length;

                            return (
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                {visible.map((container, cIdx) => (
                                  <Box 
                                    key={cIdx} 
                                    sx={{ 
                                      bgcolor: "rgba(37, 99, 235, 0.04)", 
                                      border: "1px solid rgba(37, 99, 235, 0.08)",
                                      p: 0.3, 
                                      borderRadius: "4px" 
                                    }}
                                  >
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <a 
                                        href={`https://www.ldb.co.in/ldb/containersearch/39/${container.containerNo}/1726651147706`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "#2563eb", fontWeight: 700, fontSize: "10px", textDecoration: "none" }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {container.containerNo}
                                      </a>
                                      {container.type && (
                                        <span style={{ fontSize: "8px", fontWeight: 900, bgcolor: "#e2e8f0", px: 0.5, borderRadius: "2px" }}>
                                          {getContainerSizeLabel(container.type)}
                                        </span>
                                      )}
                                    </Box>
                                  </Box>
                                ))}
                                
                                {hiddenCount > 0 && (
                                  <span 
                                    onClick={(e) => toggleContainers(e, key)}
                                    style={{ fontSize: "9px", color: "#b45309", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                                  >
                                    Show {hiddenCount} more
                                  </span>
                                )}
                                {isExpanded && (
                                  <span 
                                    onClick={(e) => toggleContainers(e, key)}
                                    style={{ fontSize: "9px", color: "#475569", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                                  >
                                    Show less
                                  </span>
                                )}

                                <Typography sx={{ fontSize: "9px", color: "#64748b", mt: 0.5 }}>
                                  Pkgs: {job.containers[0]?.pkgsStuffed || "-"} {job.package_unit || ""}
                                </Typography>
                                <Typography sx={{ fontSize: "9px", color: "#64748b" }}>
                                  GW: {job.containers[0]?.grossWeight?.toLocaleString() || "-"} kg
                                </Typography>
                              </Box>
                            );
                          })()
                        ) : (
                          <Typography sx={{ fontSize: "10px", color: "#cbd5e1" }}>-</Typography>
                        )}
                      </TableCell>

                      {/* Handover Column */}
                      <TableCell style={tableCellStyle}>
                        {(() => {
                          const opDetails = job.operations?.[0]?.statusDetails?.[0] || {};
                          const milestones = [];
                          
                          if (opDetails.leoDate) {
                            milestones.push({ label: "Leo", val: formatDate(opDetails.leoDate) });
                          }
                          if (opDetails.handoverForwardingNoteDate) {
                            milestones.push({ label: "DHo", val: formatDate(opDetails.handoverForwardingNoteDate) });
                          }
                          if (opDetails.handoverConcorTharSanganaRailRoadDate) {
                            const lbl = opDetails.railRoad === "road" ? "Road Out" : "Rail Out";
                            milestones.push({ label: lbl, val: formatDate(opDetails.handoverConcorTharSanganaRailRoadDate) });
                          }
                          if (opDetails.railOutReachedDate) {
                            const lbl = opDetails.railRoad === "road" ? "Road Rch" : "Rail Rch";
                            milestones.push({ label: lbl, val: formatDate(opDetails.railOutReachedDate) });
                          }
                          if (opDetails.billingDocsSentDt) {
                            milestones.push({ label: "Bill", val: formatDate(opDetails.billingDocsSentDt) });
                          }

                          if (milestones.length === 0) return <span style={{ color: "#94a3b8" }}>-</span>;

                          return (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.2 }}>
                              {milestones.map((m, mIdx) => (
                                <Typography key={mIdx} sx={{ fontSize: "10px", color: "#1e293b", fontWeight: 600 }}>
                                  <span style={{ color: "#64748b" }}>{m.label}:</span> {m.val}
                                </Typography>
                              ))}
                            </Box>
                          );
                        })()}
                      </TableCell>

                      {/* Docs Column */}
                      <TableCell style={tableCellStyle} align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            setFilesAnchorEl(e.currentTarget);
                            setSelectedFilesJob(job);
                          }}
                          disabled={files.length === 0}
                          endIcon={<ArrowDropDown sx={{ ml: -0.5 }} />}
                          sx={{ 
                            textTransform: "none", 
                            fontSize: "10px", 
                            height: "24px", 
                            py: 0.5, 
                            px: 1, 
                            borderRadius: "4px",
                            borderColor: "#cbd5e1",
                            color: "#475569"
                          }}
                        >
                          Files
                        </Button>
                      </TableCell>

                      {/* Status Column */}
                      <TableCell style={{ ...tableCellStyle, borderRight: "none" }} align="center">
                        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", mb: 0.8 }}>
                          {/* Sign button */}
                          <Tooltip title="DSC Document Signing">
                            <Button 
                              variant="contained" 
                              onClick={() => setSnackbar({ open: true, message: "DSC Signing is only available in Exim-Export Internal App", severity: "info" })}
                              sx={{ 
                                minWidth: "auto", 
                                px: 1, 
                                py: 0.2, 
                                fontSize: "9px", 
                                bgcolor: "#7c3aed", 
                                color: "#fff",
                                textTransform: "none",
                                height: "20px",
                                fontWeight: 700,
                                "&:hover": { bgcolor: "#6d28d9" }
                              }}
                            >
                              & Sign
                            </Button>
                          </Tooltip>

                          {/* Copy button */}
                          <Button 
                            variant="contained" 
                            onClick={(e) => handleCopyText(job.job_no, e)}
                            sx={{ 
                              minWidth: "auto", 
                              px: 1, 
                              py: 0.2, 
                              fontSize: "9px", 
                              bgcolor: "#10b981", 
                              color: "#fff",
                              textTransform: "none",
                              height: "20px",
                              fontWeight: 700,
                              "&:hover": { bgcolor: "#059669" }
                            }}
                          >
                            Copy
                          </Button>

                          {/* Docs dropdown */}
                          <Button 
                            variant="outlined" 
                            onClick={(e) => {
                              setActionDocsAnchorEl(e.currentTarget);
                              setSelectedActionJob(job);
                            }}
                            sx={{ 
                              minWidth: "auto", 
                              px: 0.5, 
                              py: 0.2, 
                              fontSize: "9px", 
                              borderColor: "#3b82f6", 
                              color: "#3b82f6",
                              textTransform: "none",
                              height: "20px",
                              fontWeight: 700,
                              "&:hover": { bgcolor: "#eff6ff" }
                            }}
                          >
                            Docs
                          </Button>
                        </Box>

                        {/* Status Badge */}
                        <Box
                          sx={{
                            display: "inline-block",
                            width: "100%",
                            textAlign: "center",
                            fontSize: "10px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            backgroundColor: theme.light,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            py: 0.5,
                            borderRadius: "4px",
                            letterSpacing: "0.2px"
                          }}
                        >
                          {currentStatus}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Table pagination footer */}
          <Box 
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              p: 1.5, 
              bgcolor: "#f8fafc", 
              borderTop: "1px solid #cbd5e1" 
            }}
          >
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
              Showing {jobs.length} of {totalCount} Records
            </Typography>
            
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                sx={{ textTransform: "none", fontSize: "11px", height: "28px" }}
              >
                Previous
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={(page + 1) * limit >= totalCount}
                onClick={() => setPage(p => p + 1)}
                sx={{ textTransform: "none", fontSize: "11px", height: "28px" }}
              >
                Next
              </Button>
            </Box>
          </Box>
        </TableContainer>
      </Box>

      {/* Docs Action Menu */}
      <Menu
        anchorEl={actionDocsAnchorEl}
        open={Boolean(actionDocsAnchorEl)}
        onClose={() => setActionDocsAnchorEl(null)}
      >
        <MenuItem onClick={() => { setActionDocsAnchorEl(null); setSnackbar({ open: true, message: "Standard documents generation is handled inside Exim-Export Internal App.", severity: "info" }); }} sx={{ fontSize: "12px" }}>
          Checklist
        </MenuItem>
        <MenuItem onClick={() => { setActionDocsAnchorEl(null); setSnackbar({ open: true, message: "Standard documents generation is handled inside Exim-Export Internal App.", severity: "info" }); }} sx={{ fontSize: "12px" }}>
          Consignment Note
        </MenuItem>
        <MenuItem onClick={() => { setActionDocsAnchorEl(null); setSnackbar({ open: true, message: "Standard documents generation is handled inside Exim-Export Internal App.", severity: "info" }); }} sx={{ fontSize: "12px" }}>
          Annexure C
        </MenuItem>
      </Menu>

      {/* Files List Menu */}
      <Menu
        anchorEl={filesAnchorEl}
        open={Boolean(filesAnchorEl)}
        onClose={() => setFilesAnchorEl(null)}
      >
        {selectedFilesJob && getJobFilesList(selectedFilesJob).map((file, idx) => (
          <MenuItem 
            key={idx}
            onClick={() => {
              window.open(file.url, "_blank");
              setFilesAnchorEl(null);
            }}
            sx={{ fontSize: "12px" }}
          >
            {file.name}
          </MenuItem>
        ))}
      </Menu>

      {/* Create Job Informative Dialog */}
      <Dialog
        open={createJobDialogOpen}
        onClose={() => setCreateJobDialogOpen(false)}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Create New Export Job</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#475569", mb: 2 }}>
            Creating and configuring new Export Jobs is done internally by the Operations and Custom House Agents team within the core Exim-Export Application.
          </Typography>
          <Typography variant="body2" sx={{ color: "#475569" }}>
            If you need a new export shipment job registered, please forward the booking copy and invoice details to your designated Alluvium operations manager.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateJobDialogOpen(false)} sx={{ fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Inline Styles to avoid external stylesheet dependencies
const selectStyle = {
  height: "28px",
  padding: "0 6px",
  fontSize: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  backgroundColor: "#fff",
  color: "#1e293b",
  cursor: "pointer",
  outline: "none"
};

const tableHeaderStyle = {
  background: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
  fontWeight: "700",
  fontSize: "12px",
  color: "#ffffff",
  padding: "8px 10px",
  borderBottom: "2px solid #0f172a",
  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
  zIndex: 10
};

const tableCellStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid #cbd5e1",
  borderRight: "1px solid #e2e8f0",
  color: "#1e293b",
  fontSize: "11px",
  verticalAlign: "top",
  wordBreak: "break-word"
};

const pillStyle = {
  display: "inline-block",
  padding: "2px 6px",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: "3px",
  fontSize: "9px",
  fontWeight: "700",
  color: "#475569"
};

export default React.memo(CExportDSR);
