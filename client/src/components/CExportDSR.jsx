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
  ChevronRight,
  PictureAsPdf,
  CloudUpload,
  Delete
} from "@mui/icons-material";
import axios from "axios";
import { getJsonCookie, getCookie } from "../utils/cookies";
import BackButton from "./BackButton";
import { useNavigate } from "react-router-dom";
import { uploadFileToS3 } from "../utils/AwsFileUpload";
import ColumnSettingsModal from "./Transport/ColumnSettingsModal";
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

const EXPORT_DOC_CATEGORIES = [
  {
    name: "1. SHIPPING/PORT DOCS",
    files: [
      { field: "leoUpload", title: "LEO", source: "status" },
      { field: "eGatePassUpload", title: "GATE PASS", source: "status" },
      { field: "booking_copy", title: "BOOKING", source: "toplevel" },
      { field: "shippingInstructionsUpload", title: "SHIPPING INSTRUCTIONS", source: "status" },
      { field: "handoverImageUpload", title: "HO/DOC COPY", source: "status" },
    ],
  },
  {
    name: "2. VGM / ODEX DOCS",
    files: [
      { field: "manualVgmUpload", title: "MANUAL VGM", source: "status" },
      { field: "odexVgmUpload", title: "ODEX VGM", source: "status" },
      { field: "odexEsbUpload", title: "ODEX ESB", source: "status" },
      { field: "odexForm13Upload", title: "ODEX FORM 13", source: "status" },
      { field: "form13CopyUpload", title: "FORM-13 COPY", source: "status" },
      { field: "cmaForwardingNoteUpload", title: "CMA FORWARDING NOTE", source: "status" },
    ],
  },
  {
    name: "3. CONTAINER & CARGO",
    files: [
      { field: "images", title: "CONTAINER DOOR PHOTO", source: "container" },
      { field: "stuffingPhotoUpload", title: "STUFFING PHOTO", source: "status" },
      { field: "transporterDetails", title: "CARTING PHOTO", source: "section" },
    ],
  },
  {
    name: "4. OPERATIONAL DOCS",
    files: [
      { field: "weighmentImages", title: "WEIGHMENT SLIP", source: "container" },
      { field: "stuffingSheetUpload", title: "STUFFING SHEET", source: "status" },
    ],
  },
];

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
    return user?.exporter_ie_code_assignments || [];
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

  const exportColumnDefinitions = React.useMemo(() => [
    { id: "job_no", label: "JOB NO", width: "12%" },
    { id: "exporter", label: "EXPORTER", width: "17%" },
    { id: "invoice", label: "INVOICE", width: "11%" },
    { id: "sb_no", label: "SB NO", width: "9%" },
    { id: "port", label: "PORT", width: "16%" },
    { id: "container", label: "CONTAINER", width: "11%" },
    { id: "handover", label: "HANDOVER", width: "7%" },
    { id: "docs", label: "DOCS", width: "12%" },
  ], []);

  const [columnOrder, setColumnOrder] = React.useState(exportColumnDefinitions.map((col) => col.id));
  const [columnSettingsOpen, setColumnSettingsOpen] = React.useState(false);

  // Fetch saved column order on mount
  React.useEffect(() => {
    const fetchColumnOrder = async () => {
      try {
        const token = getCookie("access_token");
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/user-management/users/export-columns/order`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.columnOrder?.length) {
          setColumnOrder(res.data.columnOrder);
        }
      } catch (error) {
        console.error("Failed to fetch column order", error);
      }
    };
    fetchColumnOrder();
  }, []);
  const [docsMenuAnchor, setDocsMenuAnchor] = React.useState(null);
  const [selectedJobForDocs, setSelectedJobForDocs] = React.useState(null);
  const [pendingUploadMeta, setPendingUploadMeta] = React.useState(null);
  const [docUploadLoading, setDocUploadLoading] = React.useState(false);
  const hiddenFileInputRef = React.useRef(null);

  // Dialog and Menu states
  const [createJobDialogOpen, setCreateJobDialogOpen] = React.useState(false);
  const [excelDownloadLoading, setExcelDownloadLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "", severity: "success" });
  const [expandedContainers, setExpandedContainers] = React.useState({});

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
        params.ieCode = selectedExporter;
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

  const getUrlFileName = (url) => {
    if (!url || typeof url !== "string") return "Document";
    return decodeURIComponent(url.split("/").pop() || "Document");
  };

  const getJobDocumentUrls = (job, fileDef, idx = 0) => {
    if (!job || !fileDef) return [];

    const normalize = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter(Boolean);
      return [value];
    };

    const ops = job.operations?.[0] || {};

    switch (fileDef.source) {
      case "toplevel":
        return normalize(job[fileDef.field]);
      case "container": {
        const container = Array.isArray(job.containers) ? job.containers[idx] || {} : {};
        return normalize(container[fileDef.field]);
      }
      case "section": {
        const section = Array.isArray(ops[fileDef.field]) ? ops[fileDef.field] : [];
        const item = section[idx] || {};
        return normalize(item.images);
      }
      default: {
        const status = Array.isArray(ops.statusDetails) ? ops.statusDetails[0] || {} : {};
        return normalize(status[fileDef.field]);
      }
    }
  };

  const getDotPath = (fileDef, idx = 0) => {
    switch (fileDef.source) {
      case "toplevel":
        return fileDef.field;
      case "container":
        return `containers.${idx}.${fileDef.field}`;
      case "section":
        return `operations.0.${fileDef.field}.${idx}.images`;
      default:
        return `operations.0.statusDetails.0.${fileDef.field}`;
    }
  };

  const handleOpenDocsMenu = (event, job) => {
    setSelectedJobForDocs(job);
    setDocsMenuAnchor(event.currentTarget);
  };

  const handleCloseDocsMenu = () => {
    setDocsMenuAnchor(null);
    setSelectedJobForDocs(null);
    setPendingUploadMeta(null);
    setDocUploadLoading(false);
  };

  const handleRequestDocUpload = (fileDef, idx = 0) => {
    if (!hiddenFileInputRef.current) return;
    setPendingUploadMeta({ fileDef, idx });
    hiddenFileInputRef.current.click();
  };

  const handleDocFileSelected = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !selectedJobForDocs || !pendingUploadMeta) {
      setDocUploadLoading(false);
      return;
    }

    setDocUploadLoading(true);
    try {
      const uploadResult = await uploadFileToS3(file, "export-job-documents");
      const uploadedUrl = uploadResult?.Location || uploadResult?.location || uploadResult?.url;
      if (!uploadedUrl) {
        throw new Error("Upload did not return a valid file URL.");
      }

      const { fileDef, idx } = pendingUploadMeta;
      const currentUrls = getJobDocumentUrls(selectedJobForDocs, fileDef, idx);
      const updatedUrls = [...currentUrls, uploadedUrl];
      const dotPath = getDotPath(fileDef, idx);

      const endpoint = `/jobs/${selectedJobForDocs._id}`;
      const response = await axios.patch(
        `${process.env.REACT_APP_API_STRING}${endpoint}`,
        { [dotPath]: updatedUrls },
        { withCredentials: true }
      );

      const updatedJob = response.data?.data || response.data;
      if (!updatedJob) {
        throw new Error("Failed to save document.");
      }

      setJobs((prevJobs) =>
        prevJobs.map((job) => {
          if (job._id && updatedJob._id && job._id === updatedJob._id) return updatedJob;
          if (job.job_no && updatedJob.job_no && job.job_no === updatedJob.job_no) return updatedJob;
          return job;
        })
      );

      setSelectedJobForDocs(updatedJob);
      setSnackbar({ open: true, message: `${fileDef.title} uploaded successfully.`, severity: "success" });
      setPendingUploadMeta(null);
    } catch (error) {
      console.error("Document upload failed:", error);
      setSnackbar({ open: true, message: "Document upload failed. Please try again.", severity: "error" });
    } finally {
      setDocUploadLoading(false);
      if (hiddenFileInputRef.current) hiddenFileInputRef.current.value = "";
    }
  };

  const handleRemoveDoc = async (fileDef, url, idx = 0) => {
    if (!selectedJobForDocs || !fileDef || !url) return;

    if (!url.includes("export-job-documents")) {
      setSnackbar({ open: true, message: "Only client uploaded documents can be deleted.", severity: "error" });
      return;
    }

    const currentUrls = getJobDocumentUrls(selectedJobForDocs, fileDef, idx);
    const updatedUrls = currentUrls.filter((item) => item !== url);
    const dotPath = getDotPath(fileDef, idx);

    try {
      const endpoint = `/jobs/${selectedJobForDocs._id}`;
      const response = await axios.patch(
        `${process.env.REACT_APP_API_STRING}${endpoint}`,
        { [dotPath]: updatedUrls },
        { withCredentials: true }
      );

      const updatedJob = response.data?.data || response.data;
      setJobs((prevJobs) =>
        prevJobs.map((job) => {
          if (job._id && updatedJob._id && job._id === updatedJob._id) return updatedJob;
          if (job.job_no && updatedJob.job_no && job.job_no === updatedJob.job_no) return updatedJob;
          return job;
        })
      );
      setSelectedJobForDocs(updatedJob);
      setSnackbar({ open: true, message: `${fileDef.title} removed successfully.`, severity: "success" });
    } catch (error) {
      console.error("Failed to remove document:", error);
      setSnackbar({ open: true, message: "Could not remove document. Please try again.", severity: "error" });
    }
  };

  const renderExportRowCell = (columnId, job, isLast) => {
    const cellStyle = { ...tableCellStyle, borderRight: isLast ? "none" : "1px solid #f1f5f9" };
    const files = getJobFilesList(job);

    switch (columnId) {
      case "job_no": {
        const currentStatus = (Array.isArray(job.detailedStatus) && job.detailedStatus.length > 0
          ? job.detailedStatus[job.detailedStatus.length - 1]
          : job.detailedStatus || job.status || "Pending");
        return (
          <TableCell style={cellStyle}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
              <Typography
                variant="subtitle2"
                onClick={() => handleCopyText(job.job_no)}
                sx={{
                  fontWeight: 700,
                  color: "#2563eb",
                  fontSize: "11px",
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {job.job_no}
              </Typography>
              <IconButton size="small" onClick={(e) => handleCopyText(job.job_no, e)} sx={{ p: 0.2 }}>
                <ContentCopy sx={{ fontSize: 13, color: "#334155", "&:hover": { color: "#0f172a" } }} />
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

            <Box sx={{ display: "flex", gap: 0.5, mt: 0.8, flexWrap: "wrap" }}>
              {job.consignmentType && (
                <span style={pillStyle}>{job.consignmentType}</span>
              )}
            </Box>

            <Box sx={{ mt: 1 }}>
              <span
                style={{
                  ...pillStyle,
                  backgroundColor: getStatusTheme(currentStatus).light,
                  borderColor: getStatusTheme(currentStatus).border,
                  color: getStatusTheme(currentStatus).text,
                }}
              >
                {currentStatus}
              </span>
            </Box>
          </TableCell>
        );
      }

      case "exporter":
        return (
          <TableCell style={cellStyle}>
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
                  <ContentCopy sx={{ fontSize: 13, color: "#334155", "&:hover": { color: "#0f172a" } }} />
                </IconButton>
              </Box>
            )}
          </TableCell>
        );

      case "invoice": {
        const inv = job.invoices?.[0] || {};
        return (
          <TableCell style={cellStyle}>
            {inv.invoiceNumber ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "11px", color: "#0f172a" }}>
                    {inv.invoiceNumber}
                  </Typography>
                  <IconButton size="small" onClick={(e) => handleCopyText(inv.invoiceNumber, e)} sx={{ p: 0.2 }}>
                    <ContentCopy sx={{ fontSize: 13, color: "#334155", "&:hover": { color: "#0f172a" } }} />
                  </IconButton>
                </Box>
                <Typography sx={{ fontSize: "10px", color: "#64748b" }}>
                  {formatDate(inv.invoiceDate)}
                </Typography>
                <Typography sx={{ fontSize: "10px", color: "#0f172a", mt: 0.5 }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>{inv.termsOfInvoice}</span>{" "}
                  <span style={{ fontWeight: 700 }}>{inv.currency} {inv.invoiceValue?.toLocaleString()}</span>
                </Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: "10px", color: "#cbd5e1" }}>-</Typography>
            )}
          </TableCell>
        );
      }

      case "sb_no":
        return (
          <TableCell style={cellStyle}>
            {job.sb_no ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "11px", color: "#2563eb", textDecoration: "underline" }}>
                    {job.sb_no}
                  </Typography>
                  <IconButton size="small" onClick={(e) => handleCopyText(job.sb_no, e)} sx={{ p: 0.2 }}>
                    <ContentCopy sx={{ fontSize: 13, color: "#334155", "&:hover": { color: "#0f172a" } }} />
                  </IconButton>
                </Box>
                <Typography sx={{ fontSize: "10px", color: "#64748b" }}>
                  {formatDate(job.sb_date)}
                </Typography>
              </>
            ) : (
              <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "12px" }}>-</span>
            )}
          </TableCell>
        );

      case "port":
        return (
          <TableCell style={cellStyle}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <span style={{ fontWeight: 800, fontSize: "9px", color: "#94a3b8", width: "35px" }}>DEST</span>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "10px", color: "#0f172a", fontWeight: 700 }}>
                    {job.destination_port}
                  </span>
                  {job.destination_country && (
                    <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 500 }}>
                      ({job.destination_country})
                    </span>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <span style={{ fontWeight: 800, fontSize: "9px", color: "#94a3b8", width: "35px" }}>POL</span>
                <span style={{ fontSize: "10px", color: "#475569", fontWeight: 700 }}>{job.port_of_loading}</span>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <span style={{ fontWeight: 800, fontSize: "9px", color: "#94a3b8", width: "35px" }}>DISCH</span>
                <span style={{ fontSize: "10px", color: "#475569", fontWeight: 700 }}>{job.port_of_discharge}</span>
              </Box>
            </Box>
          </TableCell>
        );

      case "container": {
        const validContainers = (job.containers || []).filter((c) => c.containerNo);
        const totalPkgs = job.total_no_of_pkgs || (job.containers && job.containers.length > 0 ? job.containers.reduce((sum, c) => sum + (c.pkgsStuffed || 0), 0) : null);
        const pkgUnit = job.package_unit || "PKG";
        const totalGrossWt = job.gross_weight_kg || (job.containers && job.containers.length > 0 ? job.containers.reduce((sum, c) => sum + (c.grossWeight || 0), 0) : null);
        const totalNetWt = job.net_weight_kg || null;
        const key = job._id || job.job_no;
        const isExpanded = !!expandedContainers[key];
        const visible = isExpanded ? validContainers : validContainers.slice(0, 2);
        const hiddenCount = validContainers.length - visible.length;

        return (
          <TableCell style={cellStyle}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {validContainers.length > 0 ? (
                visible.map((container, cIdx) => (
                  <Box
                    key={cIdx}
                    sx={{
                      bgcolor: "rgba(37, 99, 235, 0.04)",
                      border: "1px solid rgba(37, 99, 235, 0.08)",
                      p: 0.3,
                      borderRadius: "4px",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <a
                          href={`https://www.ldb.co.in/ldb/containersearch/39/${container.containerNo}/1726651147706`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#2563eb", fontWeight: 700, fontSize: "10px", textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {container.containerNo}
                        </a>
                        <IconButton size="small" onClick={(e) => handleCopyText(container.containerNo, e)} sx={{ p: 0.1, ml: 0.5 }}>
                          <ContentCopy sx={{ fontSize: 11, color: "#334155", "&:hover": { color: "#0f172a" } }} />
                        </IconButton>
                      </Box>
                      {container.type && (
                        <span style={{ fontSize: "8px", fontWeight: 900, backgroundColor: "#e2e8f0", padding: "0 6px", borderRadius: "2px" }}>
                          {getContainerSizeLabel(container.type)}
                        </span>
                      )}
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography sx={{ fontSize: "11px", color: "#64748b" }}>-</Typography>
              )}

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

              {totalPkgs && (
                <Typography sx={{ fontSize: "10px", fontWeight: 700, color: "#1e293b", mt: 0.5 }}>
                  {totalPkgs} {pkgUnit}
                </Typography>
              )}

              {(totalGrossWt || totalNetWt) && (
                <Typography sx={{ fontSize: "9px", color: "#64748b" }}>
                  G: {totalGrossWt ? `${parseFloat(totalGrossWt).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg` : "-"}
                  {totalNetWt ? ` | N: ${parseFloat(totalNetWt).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg` : ""}
                </Typography>
              )}
            </Box>
          </TableCell>
        );
      }

      case "handover": {
        const opDetails = job.operations?.[0]?.statusDetails?.[0] || {};
        const isRoad = opDetails.railRoad === "road";
        const milestoneItems = [
          { label: "LEO", val: opDetails.leoDate ? formatDate(opDetails.leoDate) : null },
          { label: "DHO", val: opDetails.handoverForwardingNoteDate ? formatDate(opDetails.handoverForwardingNoteDate) : null },
          { label: isRoad ? "ROAD OUT" : "RAIL OUT", val: opDetails.handoverConcorTharSanganaRailRoadDate ? formatDate(opDetails.handoverConcorTharSanganaRailRoadDate) : null },
          { label: isRoad ? "ROAD RCH" : "RAIL RCH", val: opDetails.railOutReachedDate ? formatDate(opDetails.railOutReachedDate) : null },
        ];
        return (
          <TableCell style={cellStyle}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.2 }}>
              {milestoneItems.map((m, mIdx) => (
                <Typography
                  key={mIdx}
                  sx={{ fontSize: "10px", fontWeight: m.val ? 700 : 500, color: m.val ? "#1e293b" : "#94a3b8" }}
                >
                  {m.label}{m.val ? `: ${m.val}` : ""}
                </Typography>
              ))}
            </Box>
          </TableCell>
        );
      }

      case "docs": {
        return (
          <TableCell style={cellStyle} align="left">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, alignItems: "flex-start" }}>
              <Typography sx={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>
                {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : "No documents uploaded"}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={(event) => handleOpenDocsMenu(event, job)}
                endIcon={<ArrowDropDown />}
                sx={{
                  textTransform: "none",
                  fontSize: "10px",
                  mt: 0.5,
                  borderRadius: "6px",
                  color: "#1f2937",
                  borderColor: "#cbd5e1",
                }}
              >
                {files.length > 0 ? "View Files" : "Upload Files"}
              </Button>
            </Box>
          </TableCell>
        );
      }

      default:
        return <TableCell style={cellStyle}>-</TableCell>;
    }
  };

  // Doc lists resolver - returns only PDF files
  const getJobFilesList = (job) => {
    const files = [];
    const isPdf = (url) => {
      if (typeof url !== "string") return false;
      return url.toLowerCase().split(/[?#]/)[0].endsWith(".pdf");
    };

    const addFiles = (fieldVal, displayName) => {
      if (!fieldVal) return;
      if (Array.isArray(fieldVal)) {
        fieldVal.forEach((url, idx) => {
          if (isPdf(url)) {
            files.push({
              name: fieldVal.length > 1 ? `${displayName} ${idx + 1}` : displayName,
              url,
            });
          }
        });
      } else if (isPdf(fieldVal)) {
        files.push({ name: displayName, url: fieldVal });
      }
    };

    addFiles(job.booking_copy, "Booking Copy");
    addFiles(job.shipping_bill_copy, "Shipping Bill Copy");
    addFiles(job.gate_in_copy, "Gate In Copy");
    addFiles(job.leo_copy, "LEO Copy");
    addFiles(job.bill_of_lading_copy, "Bill of Lading Copy");
    addFiles(job.billing_copy, "Billing Copy");

    // Handover documents from status Details
    if (
      job.operations &&
      job.operations.length > 0 &&
      job.operations[0].statusDetails &&
      job.operations[0].statusDetails.length > 0
    ) {
      const handoverVal = job.operations[0].statusDetails[0].handoverImageUpload;
      addFiles(handoverVal, "Handover Copy");
    }

    if (job.other_documents && Array.isArray(job.other_documents)) {
      job.other_documents.forEach((doc, idx) => {
        if (doc) {
          addFiles(doc, `Other Document ${idx + 1}`);
        }
      });
    }

    if (job.documents && Array.isArray(job.documents)) {
      job.documents.forEach((doc, idx) => {
        if (!doc || !doc.url) return;
        const displayName = doc.document_name || `Document ${idx + 1}`;
        if (Array.isArray(doc.url)) {
          doc.url.forEach((url, urlIdx) => {
            addFiles(url, doc.url.length > 1 ? `${displayName} ${urlIdx + 1}` : displayName);
          });
        } else {
          addFiles(doc.url, displayName);
        }
      });
    }
    return files;
  };

  const currentJobTitle = selectedJobForDocs?.job_no || selectedJobForDocs?._id || "Export Documents";

  const getDisplayableCategoryItems = () => {
    if (!selectedJobForDocs) return [];

    return EXPORT_DOC_CATEGORIES.map((category) => {
      const items = [];

      category.files.forEach((fileDef) => {
        if (fileDef.source === "container") {
          const containers = Array.isArray(selectedJobForDocs.containers) ? selectedJobForDocs.containers : [];
          if (containers.length === 0) {
            items.push({ ...fileDef, idx: 0, label: fileDef.title, urls: [] });
          } else {
            containers.forEach((container, cIdx) => {
              const urls = getJobDocumentUrls(selectedJobForDocs, fileDef, cIdx);
              const containerNo = container.containerNo || container.container_no || `#${cIdx + 1}`;
              items.push({
                ...fileDef,
                idx: cIdx,
                label: containers.length > 1 ? `${fileDef.title} (${containerNo})` : fileDef.title,
                urls,
              });
            });
          }
        } else if (fileDef.source === "section") {
          const section = Array.isArray(selectedJobForDocs.operations?.[0]?.[fileDef.field])
            ? selectedJobForDocs.operations[0][fileDef.field]
            : [];
          if (section.length === 0) {
            items.push({ ...fileDef, idx: 0, label: fileDef.title, urls: [] });
          } else {
            section.forEach((sectionItem, sIdx) => {
              const urls = getJobDocumentUrls(selectedJobForDocs, fileDef, sIdx);
              const label = sectionItem?.title
                ? `${fileDef.title} (${sectionItem.title})`
                : `${fileDef.title} ${sIdx + 1}`;
              items.push({ ...fileDef, idx: sIdx, label, urls });
            });
          }
        } else {
          const urls = getJobDocumentUrls(selectedJobForDocs, fileDef, 0);
          items.push({ ...fileDef, idx: 0, label: fileDef.title, urls });
        }
      });

      return { name: category.name, items };
    });
  };

  const categoryItems = getDisplayableCategoryItems();

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", p: 0, fontFamily: "sans-serif", maxWidth: "100%", overflowX: "hidden" }}>
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={handleDocFileSelected}
      />
      <Menu
        anchorEl={docsMenuAnchor}
        open={Boolean(docsMenuAnchor)}
        onClose={handleCloseDocsMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 320 },
            maxWidth: "100%",
            borderRadius: "12px",
            p: 0,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ p: 1, bgcolor: "#fff", minWidth: 240 }}>
          <Box sx={{ maxHeight: 320, overflowY: "auto", pr: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", color: "#0f172a", textTransform: "uppercase" }}>
                ESANCHIT DOCUMENTS
              </Typography>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", mt: 0.5 }}>
                {currentJobTitle}
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleCloseDocsMenu} sx={{ p: 0.4 }}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          {categoryItems.map((category) => (
            <Box key={category.name} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", mb: 1 }}>
                {category.name}
              </Typography>
              {category.items.map((item) => {
                const hasUrl = Array.isArray(item.urls) && item.urls.length > 0;
                const firstUrl = hasUrl ? item.urls[0] : null;
                return (
                  <Box
                    key={`${item.field}-${item.idx}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      py: 0.5,
                      borderRadius: "8px",
                      bgcolor: hasUrl ? "#eff6ff" : "#f8fafc",
                      mb: 0.5,
                      px: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                      <PictureAsPdf sx={{ fontSize: 16, color: hasUrl ? "#2563eb" : "#94a3b8" }} />
                      {firstUrl ? (
                        <a
                          href={firstUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "#2563eb",
                            textDecoration: "none",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            maxWidth: "175px",
                          }}
                          title={item.label}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                          {item.label}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestDocUpload(item, item.idx);
                        }}
                        sx={{ p: 0.5, bgcolor: "#f8fafc", borderRadius: "10px" }}
                        disabled={docUploadLoading}
                      >
                        <CloudUpload sx={{ fontSize: 16, color: "#2563eb" }} />
                      </IconButton>
                      {hasUrl && firstUrl.includes("export-job-documents") && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDoc(item, firstUrl, item.idx);
                          }}
                          sx={{ p: 0.5, bgcolor: "#fee2e2", borderRadius: "10px" }}
                        >
                          <Delete sx={{ fontSize: 16, color: "#b91c1c" }} />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))}
          </Box>
        </Box>
      </Menu>
      {/* Header bar matching standalone design */}
      <Paper elevation={0} sx={{ borderBottom: "1px solid #e2e8f0", borderRadius: 0, bgcolor: "#fff", px: { xs: 1.5, sm: 3 }, py: { xs: 1, sm: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <BackButton />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "18px" }}>
              Export Jobs {totalCount > 0 && <span style={{ color: "#64748b", fontWeight: 500, fontSize: "14px" }}>({totalCount})</span>}
            </Typography>
            <Chip label="Beta" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
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
              variant="outlined"
              onClick={() => setColumnSettingsOpen(true)}
              startIcon={<TrackChanges />}
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
              Columns
            </Button>

            {/* Create Job button removed as requested */}
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
      <Box sx={{ p: 2, maxWidth: "100%", overflow: "hidden" }}>
        
        {/* Filters Toolbar */}
        <Box 
          sx={{ 
            display: "flex", 
            gap: { xs: 0.5, sm: 1 }, 
            alignItems: "center", 
            mb: 1.5, 
            flexWrap: "wrap", 
            bgcolor: "#fff", 
            p: { xs: 0.75, sm: 1 }, 
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

         

          {/* Exporter Filter (if multiple assigned) */}
          {ieCodeAssignments.length > 0 && (
            <select
              style={{ ...selectStyle, maxWidth: "180px" }}
              value={selectedExporter}
              onChange={(e) => { setSelectedExporter(e.target.value); setPage(0); }}
            >
              <option value="all">All Assigned Exporters</option>
              {ieCodeAssignments.map(a => (
                <option key={a.ie_code_no} value={a.ie_code_no}>
                  {a.importer_name} ({a.ie_code_no})
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
            overflowX: "auto",
            width: "100%"
          }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: 900, tableLayout: "auto", width: "100%" }}>
            <colgroup>
              {columnOrder.map((columnId) => {
                const definition = exportColumnDefinitions.find((col) => col.id === columnId);
                return <col key={columnId} style={{ width: definition?.width || "auto" }} />;
              })}
            </colgroup>

            <TableHead>
              <TableRow>
                {columnOrder.map((columnId, idx) => {
                  const isLast = idx === columnOrder.length - 1;
                  const definition = exportColumnDefinitions.find((column) => column.id === columnId);
                  return (
                    <TableCell
                      key={columnId}
                      style={{
                        ...tableHeaderStyle,
                        borderRight: isLast ? "none" : "1px solid #e2e8f0",
                      }}
                    >
                      {definition?.label || columnId.toUpperCase()}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columnOrder.length} align="center" sx={{ py: 12 }}>
                    <CircularProgress size={30} thickness={4} sx={{ color: "#1e3a8a" }} />
                    <Typography variant="body2" sx={{ mt: 1.5, color: "#64748b", fontWeight: 600 }}>
                      Loading DSR records...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnOrder.length} align="center" sx={{ py: 12 }}>
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

                  return (
                    <TableRow
                      key={job._id || idx}
                      sx={{
                        bgcolor: theme.bg,
                        borderLeft: `4px solid ${theme.border}`,
                        transition: "background-color 0.15s ease",
                        "&:hover": { bgcolor: "#f8fafc" },
                      }}
                    >
                      {columnOrder.map((columnId, colIdx) => renderExportRowCell(columnId, job, colIdx === columnOrder.length - 1))}
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

      <ColumnSettingsModal
        open={columnSettingsOpen}
        onClose={() => setColumnSettingsOpen(false)}
        columns={exportColumnDefinitions.map((col) => ({ id: col.id, header: col.label }))}
        columnOrder={columnOrder}
        onSave={async (newOrder) => {
          setColumnOrder(newOrder);
          try {
            const token = getCookie("access_token");
            await axios.post(
              `${process.env.REACT_APP_API_STRING}/user-management/users/export-columns/order`,
              { columnOrder: newOrder },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setSnackbar({ open: true, message: "Column order saved successfully.", severity: "success" });
          } catch (error) {
            console.error("Failed to save column order", error);
            setSnackbar({ open: true, message: "Failed to save column order.", severity: "error" });
          }
        }}
      />

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
  backgroundColor: "#1e293b",
  color: "white",
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: "600",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
  userSelect: "none",
  borderBottom: "2px solid #0f172a",
  borderRight: "1px solid rgba(255, 255, 255, 0.15)",
  position: "sticky",
  top: 0,
  zIndex: 10
};

const tableCellStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #e2e8f0",
  borderRight: "1px solid #f1f5f9",
  color: "#334155",
  fontSize: "0.8rem",
  verticalAlign: "top",
  wordBreak: "break-word",
  whiteSpace: "normal"
};

const pillStyle = {
  display: "inline-block",
  padding: "2px 6px",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "3px",
  fontSize: "9px",
  fontWeight: "600",
  color: "#475569"
};

export default React.memo(CExportDSR);
