import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Grid,
  Tabs,
  Tab,
  MenuItem,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  Snackbar,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";
import Swal from "sweetalert2";
import {
  checkCancellationWindow,
  checkRejectionWindow,
  validateVehicleNumber,
} from "../ewbValidationHelpers";

import EwayBillGenerateLR from "../EwayBillGenerateLR";
import { parseNicErrorMessage } from "../EwayBillGenerate";
import PartAPreview from "./PartAPreview";
import "../../../styles/ewaybill.scss";

// ─── Shared style tokens ────────────────────────────────────────────────────
const S = {
  sectionLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#64748b",
    mb: 1.5,
    mt: 0.5,
  },
  divider: { my: 2, borderColor: "#f1f5f9" },
  inputSm: { size: "small" },
  submitBtn: { minWidth: 110, fontWeight: 600, textTransform: "none", borderRadius: 1.5 },
  exitBtn: {
    minWidth: 90,
    fontWeight: 600,
    textTransform: "none",
    borderRadius: 1.5,
    bgcolor: "#ef4444",
    "&:hover": { bgcolor: "#dc2626" },
  },
  actionRow: { display: "flex", justifyContent: "flex-end", gap: 1.5, mt: 3 },
  sectionHead: {
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#1e40af",
    mb: 1.5,
    pb: 0.75,
    borderBottom: "2px solid #dbeafe",
  },
};

// ─── TabPanel ────────────────────────────────────────────────────────────────
const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`ewb-tabpanel-${index}`}
    aria-labelledby={`ewb-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ pt: 2.5 }}>{children}</Box>}
  </div>
);

// ─── Constants ───────────────────────────────────────────────────────────────
const EXTENSION_WINDOW_HOURS = 8;

const checkExtensionWindow = (validUpto) => {
  const now = new Date();
  let validDate = null;
  if (!validUpto) return { withinWindow: false, hoursUntilExpiry: 0, isExpired: false };
  const s = String(validUpto).trim();
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [_, day, month, year] = match;
    const t = s.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
    if (t) {
      let h = parseInt(t[1]);
      if (t[4].toUpperCase() === "PM" && h !== 12) h += 12;
      if (t[4].toUpperCase() === "AM" && h === 12) h = 0;
      validDate = new Date(year, month - 1, day, h, parseInt(t[2]), parseInt(t[3]));
    } else {
      validDate = new Date(year, month - 1, day, 23, 59, 59);
    }
  } else {
    validDate = new Date(validUpto);
  }
  if (isNaN(validDate.getTime())) return { withinWindow: false, error: "Invalid date" };
  const diff = (validDate - now) / (1000 * 60 * 60);
  return { withinWindow: Math.abs(diff) <= EXTENSION_WINDOW_HOURS, hoursUntilExpiry: diff, isExpired: diff < 0 };
};

const STATE_NAME_TO_CODE = {
  "JAMMU AND KASHMIR": "01", "HIMACHAL PRADESH": "02", "PUNJAB": "03", "CHANDIGARH": "04",
  "UTTAKHAND": "05", "UTTARAKHAND": "05", "HARYANA": "06", "DELHI": "07", "RAJASTHAN": "08",
  "UTTAR PRADESH": "09", "BIHAR": "10", "SIKKIM": "11", "ARUNACHAL PRADESH": "12",
  "NAGALAND": "13", "MANIPUR": "14", "MIZORAM": "15", "TRIPURA": "16", "MEGHALAYA": "17",
  "ASSAM": "18", "WEST BENGAL": "19", "JHARKHAND": "20", "ODISHA": "21", "CHHATTISGARH": "22",
  "MADHYA PRADESH": "23", "GUJARAT": "24",
  "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "26", "MAHARASHTRA": "27",
  "ANDHRA PRADESH": "28", "KARNATAKA": "29", "GOA": "30", "LAKSHADWEEP": "31",
  "KERALA": "32", "TAMIL NADU": "33", "PUDUCHERRY": "34",
  "ANDAMAN AND NICOBAR ISLANDS": "35", "TELANGANA": "36", "ANDHRA PRADESH (NEW)": "37",
  "LADAKH": "38", "OTHER TERRITORY": "97", "OTHERS": "99", "OTHER COUNTRY": "99",
};
const getStateCode = (name) => {
  if (!name) return "";
  return STATE_NAME_TO_CODE[String(name).trim().toUpperCase()] || "";
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const parseDateToYyyyMmDd = (s) => {
  if (!s) return "";
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  try {
    const d = new Date(str);
    if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch (_) {}
  return "";
};

const formatEwbDate = (s) => {
  if (!s) return "-";
  const str = String(s).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return str;
  try {
    const d = new Date(str);
    if (!isNaN(d)) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      let h = d.getHours();
      const min = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${dd}/${mm}/${yyyy} ${String(h).padStart(2, "0")}:${min}:${ss} ${ampm}`;
    }
  } catch (_) {}
  return str;
};

const mapEwbToPartAData = (raw) => {
  if (!raw) return null;
  const consignor_name = raw.consignorName || raw.fromTrdName || raw.fromName || raw.consignor_name || "N/A";
  const consignor_gstin = raw.consignorGstin || raw.fromGstin || raw.consignor_gstin || "N/A";
  const consignee_name = raw.consigneeName || raw.toTrdName || raw.toName || raw.consignee_name || "N/A";
  const consignee_gstin = raw.consigneeGstin || raw.toGstin || raw.consignee_gstin || "N/A";
  const eway_bill_number = raw.ewbNo || raw.ewayBillNo || raw.eway_bill_number || "N/A";
  const document_type = raw.documentType || raw.docType || raw.document_type || "N/A";
  let generated_date = raw.ewbDate || raw.generatedDate || raw.generatedAt || raw.generated_date || "N/A";
  if (generated_date !== "N/A") generated_date = formatEwbDate(generated_date);
  let valid_upto = raw.validUpto || raw.valid_upto || "N/A";
  if (valid_upto !== "N/A") valid_upto = formatEwbDate(valid_upto);
  const quantity = raw.quantity || raw.totalQuantity || raw.itemList?.[0]?.quantity || "N/A";
  const unit_code = raw.unitCode || raw.qtyUnit || raw.itemList?.[0]?.qtyUnit || raw.unit_code || "N/A";
  let mode_of_transport = raw.transportationMode || raw.modeOfTransport || raw.transMode || raw.trnsModeCode || raw.modeCode || raw.transType || raw.transactionType || raw.mode_of_transport || "N/A";
  const modeMap = { "0": "Road", "1": "Road", "2": "Rail", "3": "Air", "4": "Ship", "5": "Ship", road: "Road", rail: "Rail", air: "Air", ship: "Ship", road_transport: "Road", rail_transport: "Rail", air_transport: "Air", ship_transport: "Ship" };
  if (mode_of_transport && mode_of_transport !== "N/A") {
    mode_of_transport = modeMap[String(mode_of_transport).toLowerCase()] || modeMap[String(mode_of_transport).trim()] || mode_of_transport;
  }
  let status = raw.ewbStatus || raw.status || raw.statusCode || "UNKNOWN";
  if (status === "ACT" || status === "ACTIVE") status = "Generated";
  else if (status === "CNL") status = "Cancelled";
  else if (status === "REJ") status = "Rejected";
  else if (status === "EXP") status = "Expired";
  return { ...raw, consignor_name, consignor_gstin, consignee_name, consignee_gstin, eway_bill_number, document_type, generated_date, valid_upto, quantity, unit_code, mode_of_transport, status };
};

// ─── Row helper for Part A details grid ──────────────────────────────────────
const InfoRow = ({ label, value, chip }) => (
  <Grid item xs={12} sm={6}>
    <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", mb: 0.25, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </Typography>
    {chip ? (
      <Chip label={value} size="small" color="primary" sx={{ fontWeight: 600, fontSize: "0.75rem" }} />
    ) : (
      <Typography sx={{ fontSize: "0.875rem", color: "#1e293b", fontWeight: 500 }}>{value || "—"}</Typography>
    )}
  </Grid>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const LrEwayBillDialog = ({
  open = false,
  mode = "generate",
  container = null,
  prData = null,
  containers = null,
  existingEwb = null,
  onClose,
  onSuccess,
}) => {
  const [internalStep, setInternalStep] = useState("form");
  const [containerSelectionMode, setContainerSelectionMode] = useState(null);
  const [selectedContainers, setSelectedContainers] = useState([]);
  const [multiContainerData, setMultiContainerData] = useState([]);
  const [isLoadingContainers, setIsLoadingContainers] = useState(false);

  const [selectedEWB, setSelectedEWB] = useState(null);
  const lastEwbNoRef = useRef(null);
  const currentGroupNoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ewbUpdateError, setEwbUpdateError] = useState(null);
  const [ewayBillList, setEwayBillList] = useState([]);

  const [ewbManagementMode, setEwbManagementMode] = useState(0);
  const [organizationList, setOrganizationList] = useState([]);
  const [boeCalcData, setBoeCalcData] = useState(null);
  const [boeExtractData, setBoeExtractData] = useState(null);
  const [boeLrData, setBoeLrData] = useState(null);
  const [boeLoading, setBoeLoading] = useState(false);
  const [boeError, setBoeError] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "error" });

  const showToast = (message, type = "error") => setSnackbar({ open: true, message, type });

  const isImport = (prData?.import_export || "").toLowerCase() === "import";
  const docNo = prData?.be_no || prData?.boe_no || prData?.document_no || prData?.BOE_NO || "";
  const has7DigitDoc = /\d{7}/.test(docNo);
  const canGenerateEWB = isImport && has7DigitDoc;

  // ── Form State ──────────────────────────────────────────────────────────────
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNo: "", vehicleType: "r", fromPlace: "", fromState: "",
    reasonCode: "1", reasonText: "", transporterDocNo: "",
    transporterDocDate: "", modeOfTransport: "1", groupNo: "", quantity: "",
  });
  const [extendForm, setExtendForm] = useState({
    currentPincode: "", remainingDistance: "", currentPlace: "", currentState: "",
    reason: "99", remarks: "", consignmentStatus: "M", transitType: "R",
    address1: "", address2: "", address3: "", modeOfTransport: "1",
  });
  const [transporterForm, setTransporterForm] = useState({ transporterId: "", selectedOrg: null });
  const [multiVehicleForm, setMultiVehicleForm] = useState({
    isInitiated: false, groupNo: null, totalQuantity: "", unitCode: "NOS",
    placeOfConsignor: "", stateOfConsignor: "", placeOfConsignee: "", stateOfConsignee: "",
    modeOfTransport: "1", reasonCode: "1", reasonText: "", multiVehicleList: [], vehicleUpdateHistory: [],
  });
  const [addVehicleForm, setAddVehicleForm] = useState({
    vehicleNumber: "", quantity: "", transporterDocNo: "", transporterDocDate: "", modeOfTransport: "1",
  });
  const [rejectForm, setRejectForm] = useState({ userGstin: "", rejectReason: "", selectedOrg: null });
  const [cancelForm, setCancelForm] = useState({ cancelReason: "2", cancelRemark: "" });
  const [partAForm, setPartAForm] = useState({ selectedOrg: null, organizationName: "", gstin: "", ewayBillNo: "" });
  const [partAData, setPartAData] = useState(null);
  const [partALoading, setPartALoading] = useState(false);

  const [centerWindowOpen, setCenterWindowOpen] = useState(true);
  const [cancelWindowOpen, setCancelWindowOpen] = useState(true);
  const [extendWindowOpen, setExtendWindowOpen] = useState(false);
  const [hoursRemainingForExtend, setHoursRemainingForExtend] = useState(0);
  const [hoursRemainingForCancel, setHoursRemainingForCancel] = useState(0);
  const [hoursRemainingForReject, setHoursRemainingForReject] = useState(0);
  const [wasModified, setWasModified] = useState(false);

  const vehicleNoInputRef = useRef(null);
  const placeOfChangeInputRef = useRef(null);
  const [activeVehicleInput, setActiveVehicleInput] = useState(null);

  // ── Memoised handlers ───────────────────────────────────────────────────────
  const handleVehicleNoChange = useCallback((e) => setVehicleForm((p) => ({ ...p, vehicleNo: e.target.value.toUpperCase() })), []);
  const handlePlaceChange = useCallback((e) => setVehicleForm((p) => ({ ...p, fromPlace: e.target.value })), []);
  const handleReasonCodeChange = useCallback((e) => setVehicleForm((p) => ({ ...p, reasonCode: e.target.value })), []);
  const handleVehicleTypeChange = useCallback((e) => setVehicleForm((p) => ({ ...p, vehicleType: e.target.value })), []);
  const handleTransporterDocNoChange = useCallback((e) => setVehicleForm((p) => ({ ...p, transporterDocNo: e.target.value })), []);
  const handleTransporterDocDateChange = useCallback((e) => setVehicleForm((p) => ({ ...p, transporterDocDate: e.target.value })), []);
  const handleRemarksChange = useCallback((e) => setVehicleForm((p) => ({ ...p, reasonText: e.target.value })), []);
  const handleModeOfTransportChange = useCallback((e) => setVehicleForm((p) => ({ ...p, modeOfTransport: e.target.value })), []);
  const handleFromStateChange = useCallback((e) => setVehicleForm((p) => ({ ...p, fromState: e.target.value })), []);
  const handleExtendPincodeChange = useCallback((e) => setExtendForm((p) => ({ ...p, currentPincode: e.target.value })), []);
  const handleExtendDistanceChange = useCallback((e) => setExtendForm((p) => ({ ...p, remainingDistance: e.target.value })), []);
  const handleExtendPlaceChange = useCallback((e) => setExtendForm((p) => ({ ...p, currentPlace: e.target.value })), []);
  const handleExtendStateChange = useCallback((e) => setExtendForm((p) => ({ ...p, currentState: e.target.value })), []);
  const handleExtendReasonChange = useCallback((e) => setExtendForm((p) => ({ ...p, reason: e.target.value })), []);
  const handleExtendRemarksChange = useCallback((e) => setExtendForm((p) => ({ ...p, remarks: e.target.value })), []);
  const handleConsignmentStatusChange = useCallback((e) => setExtendForm((p) => ({ ...p, consignmentStatus: e.target.value })), []);
  const handleTransitTypeChange = useCallback((e) => setExtendForm((p) => ({ ...p, transitType: e.target.value })), []);
  const handleAddress1Change = useCallback((e) => setExtendForm((p) => ({ ...p, address1: e.target.value })), []);
  const handleAddress2Change = useCallback((e) => setExtendForm((p) => ({ ...p, address2: e.target.value })), []);
  const handleAddress3Change = useCallback((e) => setExtendForm((p) => ({ ...p, address3: e.target.value })), []);
  const handleTransporterIdChange = useCallback((e) => setTransporterForm((p) => ({ ...p, transporterId: e.target.value.toUpperCase() })), []);
  const handleTransporterOrgChange = useCallback((_, v) => setTransporterForm((p) => ({ ...p, selectedOrg: v, transporterId: v?.gstin || "" })), []);

  const getFieldError = (keywords) => {
    if (!ewbUpdateError) return null;
    const lower = ewbUpdateError.toLowerCase();
    const generalKw = ["validity", "expired", "lapsed", "cancelled", "rejected", "311", "312", "invalid gstin"];
    if (generalKw.some((k) => lower.includes(k))) return null;
    return keywords.some((k) => lower.includes(k.toLowerCase())) ? ewbUpdateError : null;
  };

  // ── Re-focus fix ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (internalStep !== "ewb-manage" || ewbManagementMode !== 1 || !activeVehicleInput) return;
    if (document.activeElement === document.body) {
      const ref = activeVehicleInput === "vehicleNo" ? vehicleNoInputRef.current : placeOfChangeInputRef.current;
      if (ref) { ref.focus(); try { ref.setSelectionRange(ref.value?.length || 0, ref.value?.length || 0); } catch (_) {} }
    }
  }, [vehicleForm, internalStep, ewbManagementMode, activeVehicleInput]);

  // ── Fetch helpers ───────────────────────────────────────────────────────────
  const fetchOrganisationList = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/organization/list`, { params: { limit: 1000 } });
      if (res.data.success) {
        const list = Array.isArray(res.data.data) ? res.data.data : res.data.data?.organizations || [];
        setOrganizationList(list);
      }
    } catch (err) { setOrganizationList([]); }
  };

  const fetchPartAData = async (gstin, ewayBillNo) => {
    if (!ewayBillNo) { setEwbUpdateError("Please provide an E-Way Bill Number"); return false; }
    try {
      setPartALoading(true); setEwbUpdateError(null);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/ewb-part-a`, { params: { ewbNo: ewayBillNo, gstin: gstin || undefined } });
      if (res.data.success && res.data.data) { setPartAData(mapEwbToPartAData(res.data.data)); return true; }
      setEwbUpdateError(res.data.message || "No Part A data found."); setPartAData(null); return false;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setEwbUpdateError(parseNicErrorMessage(msg)); setPartAData(null); return false;
    } finally { setPartALoading(false); }
  };

  const handlePreviewEWB = useCallback(async (ewbNo) => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/ewb-part-a`, { params: { ewbNo } });
      if (res.data.success && res.data.data) {
        const mapped = mapEwbToPartAData(res.data.data);
        setSelectedEWB(mapped);
        setPartAData(mapped);
        setInternalStep("preview");
      }
      else throw new Error(res.data.message || "Failed to fetch Part A");
    } catch (err) {
      showToast(parseNicErrorMessage(err.response?.data?.message || err.message), "error");
    } finally { setIsLoading(false); }
  }, []);

  const loadExistingEwbForManagement = useCallback(async (ewbInput) => {
    const ewbNo = typeof ewbInput === "string" ? ewbInput : ewbInput?.ewbNo || ewbInput?.ewb_no || ewbInput?.ewbNumber || "";
    if (!ewbNo) return false;
    try {
      setIsLoading(true);
      const listRes = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/list?search=${encodeURIComponent(ewbNo)}`);
      let exact = null;
      if (listRes.data.success && Array.isArray(listRes.data.data) && listRes.data.data.length > 0) {
        exact = listRes.data.data.find((e) => e.ewbNo === ewbNo) || listRes.data.data[0] || null;
      }

      let merged = exact || { ewbNo };
      try {
        const partARes = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/ewb-part-a`, { params: { ewbNo, gstin: exact?.userGstin } });
        if (partARes.data.success && partARes.data.data) {
          merged = { ...(exact || {}), ...partARes.data.data, ewbNo, _id: exact?._id || merged._id };
        }
      } catch (_) {}

      const mapped = mapEwbToPartAData(merged);
      setSelectedEWB(merged);
      setPartAData(mapped);
      setPartAForm((p) => ({ ...p, ewayBillNo: ewbNo, gstin: merged.userGstin || p.gstin || process.env.REACT_APP_DEFAULT_GSTIN || "24ANGPR7652E1ZV" }));
      setInternalStep("ewb-manage");
      return true;
    } catch (_) {
      setSelectedEWB({ ewbNo });
      setPartAForm((p) => ({ ...p, ewayBillNo: ewbNo }));
      setInternalStep("ewb-manage");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFetchBoeData = useCallback(async (targetDocNo) => {
    if (!targetDocNo) return;
    try {
      setBoeLoading(true);
      setBoeError("");
      setBoeCalcData(null);
      setBoeExtractData(null);
      setBoeLrData(null);

      const rawDate = prData?.be_date || prData?.document_date || prData?.boe_date || "";
      const docDate = parseDateToYyyyMmDd(rawDate) || new Date().toISOString().split("T")[0];

      const [calcRes, extractRes, lrRes] = await Promise.allSettled([
        axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-value-calc?document_no=${encodeURIComponent(targetDocNo)}&be_date=${docDate}`),
        axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-extract?be_no=${encodeURIComponent(targetDocNo)}&be_date=${docDate}`),
        axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-lr-data?document_no=${encodeURIComponent(targetDocNo)}`)
      ]);

      let calcData = null;
      let extractData = null;
      let lrDataResult = null;

      if (calcRes.status === "fulfilled" && calcRes.value.data?.success) {
        calcData = calcRes.value.data.data;
        setBoeCalcData(calcData);
      } else {
        console.warn("boe-value-calc failed or returned unsuccessful:", calcRes);
      }

      if (extractRes.status === "fulfilled" && extractRes.value.data && extractRes.value.data.status !== "error") {
        extractData = extractRes.value.data;
        setBoeExtractData(extractData);
      } else {
        console.warn("boe-extract failed or returned error:", extractRes);
      }

      if (lrRes.status === "fulfilled" && lrRes.value.data?.success) {
        lrDataResult = lrRes.value.data.data;
        setBoeLrData(lrDataResult);
      } else {
        console.warn("boe-lr-data failed or returned unsuccessful:", lrRes);
      }

      if (!calcData && !extractData) {
        setBoeError("No details found regarding this BOE number. Please fill details manually.");
      }
    } catch (err) {
      console.error("Error fetching BOE details:", err);
      setBoeError(err.message || "Failed to fetch BOE details. Please fill details manually.");
    } finally {
      setBoeLoading(false);
    }
  }, [prData]);

  const handleContainerAction = useCallback((cont, action) => {
    if (action === "generate") {
      if (!cont.container_number || !cont.tr_no) {
        Swal.fire("Error", "LR is not generated for the selected container. Please add the container number and generate the LR first.", "error");
        return;
      }
      setSelectedContainers([cont]); setContainerSelectionMode("selected");
      const targetDocNo = prData?.be_no || prData?.boe_no || prData?.document_no || prData?.BOE_NO || "";
      if (targetDocNo) {
        handleFetchBoeData(targetDocNo);
      }
      setInternalStep("form");
    } else if (action === "update") {
      if (!cont.eWay_bill) { Swal.fire("Error", "Cannot manage E-Way Bill. EWB number is pending.", "error"); return; }
      const ewbNumber = cont.eWay_bill;
      (async () => {
        try {
          Swal.fire({ title: "Loading EWB Details…", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          const res = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/list?search=${ewbNumber}`);
          if (res.data.success && res.data.data?.length > 0) {
            const exact = res.data.data.find((e) => e.ewbNo === ewbNumber);
            if (exact) {
              setSelectedEWB(exact); setPartAData(mapEwbToPartAData(exact));
              try {
                const api = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/ewb-part-a`, { params: { ewbNo: ewbNumber, gstin: exact.userGstin } });
                if (api.data.success && api.data.data) {
                  const merged = { ...exact, ...api.data.data, _id: exact._id, lr: exact.lr };
                  setSelectedEWB(merged); setPartAData(mapEwbToPartAData(merged));
                }
              } catch (_) {}
            } else { setSelectedEWB({ ewbNo: ewbNumber }); }
          } else { setSelectedEWB({ ewbNo: ewbNumber }); }
        } catch (_) {
          setSelectedEWB({ ewbNo: ewbNumber, userGstin: process.env.REACT_APP_DEFAULT_GSTIN || "24ANGPR7652E1ZV" });
        } finally {
          Swal.close();
          setPartAForm({ selectedOrg: null, organizationName: "", gstin: process.env.REACT_APP_DEFAULT_GSTIN || "24ANGPR7652E1ZV", ewayBillNo: ewbNumber });
          setInternalStep("ewb-manage");
        }
      })();
    } else if (action === "preview") {
      if (cont.eWay_bill) handlePreviewEWB(cont.eWay_bill);
    }
  }, [handlePreviewEWB, handleFetchBoeData, prData]);

  const loadContainerData = useCallback(async () => {
    try {
      setIsLoadingContainers(true); setError(null);
      let all = [];
      if (containers && Array.isArray(containers)) all = containers;
      else if (container && typeof container === "object") all = [container];
      else if (prData?._id) {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/pr/${prData._id}`);
        if (res.data.success) all = res.data.data.containers || [];
      } else { setError("PR data is not available."); return; }
      setMultiContainerData(all);
      const lr_id = prData?._id || containers?.[0]?.lr_id || container?.lr_id;
      if (lr_id) {
        try {
          const ewbRes = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/list?lrId=${lr_id}&limit=100`);
          if (ewbRes.data.success) setEwayBillList(ewbRes.data.data);
        } catch (_) {}
      }
      setInternalStep("container-select");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load container data");
    } finally { setIsLoadingContainers(false); }
  }, [containers, container, prData]);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const has = prData || containers || container;
      if (mode === "generate" && has) loadContainerData();
      else if (mode === "update" && existingEwb) {
        loadExistingEwbForManagement(existingEwb).then(() => setEwbManagementMode(1));
      } else if (mode === "update" && has) loadContainerData().then(() => { if (existingEwb && container) handleContainerAction(container, "update"); });
      else if (existingEwb) handlePreviewEWB(existingEwb);
    }
  }, [open, mode, prData, containers, container, existingEwb, loadContainerData, handleContainerAction, handlePreviewEWB, loadExistingEwbForManagement]);

  useEffect(() => {
    if (!open) {
      setInternalStep("form");
      setContainerSelectionMode(null);
      setSelectedContainers([]);
      setMultiContainerData([]);
      setSelectedEWB(null);
      setError(null);
      setBoeCalcData(null);
      setBoeExtractData(null);
      setBoeLrData(null);
      setBoeLoading(false);
      setBoeError("");
    }
  }, [open]);

  useEffect(() => { fetchOrganisationList(); }, []);

  useEffect(() => {
    if (!selectedEWB) return;
    const isEwbChanged = lastEwbNoRef.current !== selectedEWB.ewbNo;
    if (isEwbChanged) { setEwbManagementMode(0); lastEwbNoRef.current = selectedEWB.ewbNo; }

    const isForeign = ["other country", "99", "foreign", "international"].includes((selectedEWB.consignorState || "").toLowerCase().trim());
    const fromPlace = isForeign ? (selectedEWB.consigneePlace || "") : (selectedEWB.consignorPlace || "");
    const fromState = isForeign ? (selectedEWB.consigneeState || "") : (selectedEWB.consignorState || "");
    const fromPin = isForeign ? (selectedEWB.consigneePincode || "") : (selectedEWB.consignorPincode || "");

    // Resolve active group to use
    const currentGroupNo = currentGroupNoRef.current;
    const matchedGroup = (selectedEWB.multiVehicleGroups || []).find(grp => grp.groupNo === currentGroupNo);
    const g = matchedGroup || (
      (selectedEWB.multiVehicleGroups && selectedEWB.multiVehicleGroups.length > 0)
        ? selectedEWB.multiVehicleGroups[selectedEWB.multiVehicleGroups.length - 1]
        : selectedEWB.multiVehicleGroup
    );

    // Sync group number ref
    if (g?.groupNo) {
      currentGroupNoRef.current = g.groupNo;
    }

    setVehicleForm((p) => ({
      ...p,
      vehicleNo: selectedEWB.vehicleNumber || "",
      fromPlace,
      fromState,
      transporterDocNo: selectedEWB.transporterDocNo || selectedEWB.transporterDocNumber || container?.tr_no || prData?.tr_no || selectedEWB.transDocNo || selectedEWB.transporter_document_number || selectedEWB.docNo || "",
      transporterDocDate: parseDateToYyyyMmDd(selectedEWB.transporterDocDate || selectedEWB.transDocDate || selectedEWB.transporter_document_date || selectedEWB.docDate || container?.lr_date || prData?.lr_date || ""),
      modeOfTransport: "1",
      groupNo: g?.groupNo || "",
      quantity: g?.totalQuantity || "",
    }));
    setTransporterForm({ transporterId: selectedEWB.transporterId || "", selectedOrg: null });
    setRejectForm({ userGstin: selectedEWB.consigneeGstin || "", rejectReason: "", selectedOrg: null });
    setAddVehicleForm((p) => ({
      ...p,
      transporterDocNo: selectedEWB.transporterDocNo || selectedEWB.transporterDocNumber || container?.tr_no || prData?.tr_no || selectedEWB.transDocNo || selectedEWB.transporter_document_number || selectedEWB.docNo || p.transporterDocNo,
      transporterDocDate: parseDateToYyyyMmDd(selectedEWB.transporterDocDate || selectedEWB.transDocDate || selectedEWB.transporter_document_date || selectedEWB.docDate || p.transporterDocDate),
    }));
    setExtendForm((p) => ({ ...p, currentPincode: fromPin, currentPlace: fromPlace, currentState: fromState, address1: selectedEWB.consignorAddress1 || "", address2: selectedEWB.consignorAddress2 || "", address3: selectedEWB.consignorAddress3 || "", modeOfTransport: "1" }));

    if (selectedEWB.isMultiVehicle && g) {
      if (!isEwbChanged && !multiVehicleForm.isInitiated) {
        // Preserve "Initiate New Movement" (NEW) view state while updating histories
        setMultiVehicleForm((p) => ({
          ...p,
          multiVehicleList: selectedEWB.multiVehicleList || [],
          vehicleUpdateHistory: selectedEWB.vehicleUpdateHistory || []
        }));
      } else {
        setMultiVehicleForm({
          isInitiated: true,
          groupNo: g.groupNo,
          totalQuantity: g.totalQuantity || "",
          unitCode: g.unitCode || "NOS",
          placeOfConsignor: g.placeOfConsignor || "",
          stateOfConsignor: g.stateOfConsignor || "",
          placeOfConsignee: g.placeOfConsignee || "",
          stateOfConsignee: g.stateOfConsignee || "",
          modeOfTransport: String(g.modeOfTransport || "1"),
          reasonCode: g.reasonCode || "1",
          reasonText: g.reasonText || "",
          multiVehicleList: selectedEWB.multiVehicleList || [],
          vehicleUpdateHistory: selectedEWB.vehicleUpdateHistory || []
        });
      }
    } else {
      setMultiVehicleForm((p) => ({
        ...p,
        isInitiated: false,
        placeOfConsignor: fromPlace,
        stateOfConsignor: fromState,
        placeOfConsignee: selectedEWB.consigneePlace || "",
        stateOfConsignee: selectedEWB.consigneeState || "",
        totalQuantity: selectedEWB.itemList?.[0]?.quantity || selectedEWB.quantity || "",
        unitCode: selectedEWB.itemList?.[0]?.qtyUnit || "NOS",
        modeOfTransport: "1",
        multiVehicleList: [],
        vehicleUpdateHistory: []
      }));
    }

    if (selectedEWB.generatedAt || selectedEWB.ewbDate || selectedEWB.createdAt) {
      const genTime = selectedEWB.generatedAt || selectedEWB.ewbDate || selectedEWB.createdAt;
      const cw = checkCancellationWindow(genTime);
      setCancelWindowOpen(cw.withinWindow); setHoursRemainingForCancel(24 - (cw.hoursElapsed || 0));
      const rw = checkRejectionWindow(genTime);
      setCenterWindowOpen(rw.withinWindow); setHoursRemainingForReject(72 - (rw.hoursElapsed || 0));
    }
    if (selectedEWB.validUpto) {
      const ew = checkExtensionWindow(selectedEWB.validUpto);
      setHoursRemainingForExtend(ew.hoursUntilExpiry); setExtendWindowOpen(ew.withinWindow);
    }
  }, [selectedEWB]);

  // ── Action Handlers ─────────────────────────────────────────────────────────
  const handleBulkAction = async (action) => {
    if (action !== "generate" || !canGenerateEWB) return;
    const targets = selectedContainers.length > 0 ? selectedContainers : multiContainerData.filter((c) => !c.eWay_bill);
    if (!targets.length) return;
    if (targets.some((c) => !c.container_number || !c.tr_no)) { Swal.fire("Error", "LR is not generated for the selected container.", "error"); return; }
    setSelectedContainers(targets);
    setContainerSelectionMode(targets.length === 1 ? "selected" : "all");
    const targetDocNo = prData?.be_no || prData?.boe_no || prData?.document_no || prData?.BOE_NO || "";
    if (targetDocNo) {
      handleFetchBoeData(targetDocNo);
    }
    setInternalStep("form");
  };

  const handleUpdateVehicle = async () => {
    try {
      setIsLoading(true);
      if (!vehicleForm.vehicleNo) throw new Error("Vehicle number is required");
      const vnErr = validateVehicleNumber(vehicleForm.vehicleNo);
      if (vnErr) { setEwbUpdateError(vnErr); throw new Error(vnErr); }
      const ewayBillNo = partAForm.ewayBillNo || selectedEWB?.ewbNo;
      const userGstin = partAForm.gstin || selectedEWB?.userGstin || process.env.REACT_APP_DEFAULT_GSTIN || "24ANGPR7652E1ZV";
      if (!ewayBillNo || !userGstin) throw new Error("E-Way Bill number and GSTIN are required");
      if (selectedEWB?.isMultiVehicle && (vehicleForm.groupNo || multiVehicleForm.groupNo)) { await handleAddVehicle({ vehicleNumber: vehicleForm.vehicleNo, quantity: vehicleForm.quantity, transporterDocNo: vehicleForm.transporterDocNo, transporterDocDate: vehicleForm.transporterDocDate, modeOfTransport: vehicleForm.modeOfTransport }); return; }
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/update-vehicle`, { ewayBillNo, vehicleNo: vehicleForm.vehicleNo, vehicleType: vehicleForm.vehicleType, fromPlace: vehicleForm.fromPlace, fromState: getStateCode(vehicleForm.fromState) || vehicleForm.fromState, reasonCode: vehicleForm.reasonCode, reason_code_for_vehicle_updation: vehicleForm.reasonCode, reasonText: vehicleForm.reasonText, transporterDocNo: vehicleForm.transporterDocNo, transporterDocDate: vehicleForm.transporterDocDate, modeOfTransport: vehicleForm.modeOfTransport, userGstin });
      if (res.data.success) { await Swal.fire("Success", "Vehicle updated successfully", "success"); if (onSuccess) onSuccess(); handleClose(); }
    } catch (err) {
      const msg = parseNicErrorMessage(err.response?.data?.message || err.message);
      setEwbUpdateError(msg); showToast(msg, "error");
    } finally { setIsLoading(false); }
  };

  const handleExtendValidity = async () => {
    try {
      setIsLoading(true);
      if (!extendForm.remarks) throw new Error("Remarks are required");
      const ewayBillNo = partAForm.ewayBillNo || selectedEWB?.ewbNo;
      const userGstin = partAForm.gstin || selectedEWB?.userGstin || process.env.REACT_APP_DEFAULT_GSTIN || "24ANGPR7652E1ZV";
      if (!ewayBillNo || !userGstin) throw new Error("E-Way Bill number and GSTIN are required");
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/extend-validity`, { ewayBillNo, vehicleNo: extendForm.vehicleNo || selectedEWB?.vehicleNumber, currentPlace: extendForm.currentPlace, currentState: extendForm.currentState, currentPincode: extendForm.currentPincode, remainingDistance: extendForm.remainingDistance, reason: extendForm.reason, remarks: extendForm.remarks, consignmentStatus: extendForm.consignmentStatus, transitType: extendForm.transitType, address1: extendForm.address1, address2: extendForm.address2, address3: extendForm.address3, modeOfTransport: extendForm.modeOfTransport, userGstin });
      if (res.data.success) { await Swal.fire("Success", "E-Way Bill validity extended successfully", "success"); if (onSuccess) onSuccess(); handleClose(); }
    } catch (err) {
      const msg = parseNicErrorMessage(err.response?.data?.message || err.message);
      setEwbUpdateError(msg); Swal.fire("Error", msg, "error");
    } finally { setIsLoading(false); }
  };

  const handleUpdateTransporter = async () => {
    try {
      setIsLoading(true);
      const newId = transporterForm.selectedOrg?.gstin || transporterForm.transporterId;
      if (!newId) throw new Error("Transporter GSTIN is required");
      const ewayBillNo = partAForm.ewayBillNo || selectedEWB?.ewbNo;
      const userGstin = partAForm.gstin || selectedEWB?.userGstin || process.env.REACT_APP_DEFAULT_GSTIN || "24ANGPR7652E1ZV";
      if (!ewayBillNo || !userGstin) throw new Error("E-Way Bill number and GSTIN are required");
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/update-transporter`, { ewayBillNo, transporterId: newId, userGstin });
      if (res.data.success) { await Swal.fire("Success", "Transporter updated successfully", "success"); if (onSuccess) onSuccess(); handleClose(); }
    } catch (err) {
      const msg = parseNicErrorMessage(err.response?.data?.message || err.message);
      setEwbUpdateError(msg); Swal.fire("Error", msg, "error");
    } finally { setIsLoading(false); }
  };

  const handleInitiateMultiVehicle = async () => {
    try {
      setIsLoading(true);
      if (!multiVehicleForm.totalQuantity) throw new Error("Total quantity is required");
      const userGstin = selectedEWB?.userGstin || partAForm?.gstin || process.env.REACT_APP_DEFAULT_GSTIN || "24ANGPR7652E1ZV";
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/initiate`, { ewayBillNo: selectedEWB.ewbNo, totalQuantity: multiVehicleForm.totalQuantity, unitCode: multiVehicleForm.unitCode, placeOfConsignor: multiVehicleForm.placeOfConsignor, stateOfConsignor: getStateCode(multiVehicleForm.stateOfConsignor) || multiVehicleForm.stateOfConsignor, placeOfConsignee: multiVehicleForm.placeOfConsignee, stateOfConsignee: getStateCode(multiVehicleForm.stateOfConsignee) || multiVehicleForm.stateOfConsignee, modeOfTransport: multiVehicleForm.modeOfTransport, reasonCode: multiVehicleForm.reasonCode, reasonText: multiVehicleForm.reasonText, userGstin });
      if (res.data.success) { setMultiVehicleForm((p) => ({ ...p, isInitiated: true, groupNo: res.data.data.groupNo })); setEwbUpdateError(null); await fetchMvData(); Swal.fire("Success", "Multi-vehicle movement initiated", "success"); }
    } catch (err) {
      let msg = parseNicErrorMessage(err.response?.data?.message || err.message);
      if (typeof msg === "string" && msg.includes("||")) msg = msg.split("||").map((s) => `• ${s.trim()}`).join("\n");
      setEwbUpdateError(msg); showToast(String(msg).replace(/\n/g, " "), "error");
    } finally { setIsLoading(false); }
  };

  const handleAddVehicle = async (vehicleData) => {
    try {
      setIsLoading(true);
      const vnErr = validateVehicleNumber(vehicleData.vehicleNumber);
      if (vnErr) { setEwbUpdateError(vnErr); Swal.fire("Validation Error", vnErr, "error"); return; }
      const userGstin = selectedEWB?.userGstin || partAForm?.gstin || process.env.REACT_APP_DEFAULT_GSTIN || "24ANGPR7652E1ZV";
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/add-vehicle`, { ewayBillNo: selectedEWB.ewbNo, groupNo: multiVehicleForm.groupNo, vehicleNumber: vehicleData.vehicleNumber, transporterDocNo: vehicleData.transporterDocNo, transporterDocDate: vehicleData.transporterDocDate, quantity: vehicleData.quantity, modeOfTransport: vehicleData.modeOfTransport, userGstin });
      if (res.data.success) {
        const fromPlace = vehicleData.fromPlace || multiVehicleForm.placeOfConsignor || vehicleForm.fromPlace || "";
        const apiList = res.data.data.multiVehicleList;
        const mergedList = apiList
          ? apiList.map((v) => v.fromPlace ? v : { ...v, fromPlace: v.vehicleNumber === vehicleData.vehicleNumber ? fromPlace : v.fromPlace || "" })
          : [...(multiVehicleForm.multiVehicleList || []), { ...vehicleData, fromPlace }];
        setMultiVehicleForm((p) => ({ ...p, multiVehicleList: mergedList }));
        setEwbUpdateError(null);
        await fetchMvData();
        // Re-apply fromPlace after fetchMvData since API may not return it
        setMultiVehicleForm((p) => ({
          ...p,
          multiVehicleList: p.multiVehicleList.map((v) =>
            v.fromPlace ? v : { ...v, fromPlace: v.vehicleNumber === vehicleData.vehicleNumber ? fromPlace : "" }
          ),
        }));
        Swal.fire("Success", "Vehicle added successfully", "success");
      }
    } catch (err) {
      const msg = parseNicErrorMessage(err.response?.data?.message || err.message);
      setEwbUpdateError(msg); showToast(msg, "error");
    } finally { setIsLoading(false); }
  };

  const fetchMvData = async () => {
    try {
      setIsLoading(true);
      const ewbNo = partAForm.ewayBillNo || selectedEWB?.ewbNo;
      if (!ewbNo) return;
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/list?ewbNo=${ewbNo}`);
      if (res.data.success && res.data.data) {
        const mv = res.data.data;
        setSelectedEWB((p) => p ? { ...p, isMultiVehicle: mv.isMultiVehicle, multiVehicleGroup: mv.multiVehicleGroup, multiVehicleGroups: mv.multiVehicleGroups, multiVehicleList: mv.multiVehicleList, vehicleUpdateHistory: mv.vehicleUpdateHistory } : p);
        const ag = mv.multiVehicleGroups?.length ? mv.multiVehicleGroups[mv.multiVehicleGroups.length - 1] : mv.multiVehicleGroup;
        setMultiVehicleForm((p) => ({ ...p, isInitiated: !!ag, groupNo: ag?.groupNo || p.groupNo || null, totalQuantity: ag?.totalQuantity || p.totalQuantity || "", unitCode: ag?.unitCode || p.unitCode || "NOS", placeOfConsignor: ag?.placeOfConsignor || p.placeOfConsignor || "", stateOfConsignor: ag?.stateOfConsignor || p.stateOfConsignor || "", placeOfConsignee: ag?.placeOfConsignee || p.placeOfConsignee || "", stateOfConsignee: ag?.stateOfConsignee || p.stateOfConsignee || "", multiVehicleList: (mv.multiVehicleList || []).filter((v) => !v.groupNo || v.groupNo === (ag?.groupNo || p.groupNo)), vehicleUpdateHistory: mv.vehicleUpdateHistory || p.vehicleUpdateHistory || [] }));
      }
    } catch (_) {} finally { setIsLoading(false); }
  };

  const handleRejectEWB = async () => {
    try {
      setIsLoading(true);
      const gstin = rejectForm.selectedOrg?.gstin || rejectForm.userGstin;
      if (!gstin) throw new Error("User GSTIN is required");
      const ewayBillNo = partAForm.ewayBillNo || selectedEWB?.ewbNo;
      if (!ewayBillNo) throw new Error("E-Way Bill number is required");
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/reject`, { ewayBillNo, userGstin: gstin, rejectReason: rejectForm.rejectReason });
      if (res.data.success) { await Swal.fire("Rejected", "E-Way Bill rejected successfully", "success"); if (onSuccess) onSuccess(); handleClose(); }
    } catch (err) {
      const msg = parseNicErrorMessage(err.response?.data?.message || err.message);
      setEwbUpdateError(msg); Swal.fire("Error", msg, "error");
    } finally { setIsLoading(false); }
  };

  const handleCancelEWB = async () => {
    try {
      setIsLoading(true);
      if (!cancelForm.cancelReason) throw new Error("Cancellation reason is required");
      if (!cancelForm.cancelRemark?.trim()) { setEwbUpdateError("Cancellation remarks are required"); return; }
      const ewayBillNo = partAForm.ewayBillNo || selectedEWB?.ewbNo;
      const userGstin = partAForm.gstin || selectedEWB?.userGstin || "";
      if (!ewayBillNo) throw new Error("E-Way Bill number is required");
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/cancel`, { ewayBillNo, cancelReason: cancelForm.cancelReason, cancelRemark: cancelForm.cancelRemark, ...(userGstin ? { userGstin } : {}) });
      if (res.data.success) { await Swal.fire("Cancelled", "E-Way Bill cancelled successfully.", "success"); if (onSuccess) onSuccess(); handleClose(); }
    } catch (err) {
      const msg = parseNicErrorMessage(err.response?.data?.message || err.message);
      setEwbUpdateError(msg); Swal.fire("Error", msg, "error");
    } finally { setIsLoading(false); }
  };

  const handleGenerationSuccess = (data) => {
    setWasModified(true);
    let ewbData = data;
    if (Array.isArray(data)) {
      const successResult = data.find(r => r.status === "success" && r.ewbNo);
      if (successResult) {
        ewbData = successResult;
      }
    }

    const ewbNo = ewbData?.ewbNo;
    const validUpto = ewbData?.validUpto;
    const ewbDate = ewbData?.ewbDate;

    Swal.fire({ icon: "success", title: "E-Way Bill Generated", html: `<strong>EWB No:</strong> ${ewbNo || "N/A"}`, timer: 2000, showConfirmButton: true, confirmButtonText: "OK" }).then(() => { if (onSuccess) onSuccess(); handleClose(); });
    if (ewbNo) {
      setSelectedEWB({ ewbNo, validUpto, ewbDate, ...ewbData });
      setPartAForm({ selectedOrg: null, organizationName: "", gstin: process.env.REACT_APP_DEFAULT_GSTIN , ewayBillNo: ewbNo });
      setInternalStep("ewb-manage");
      setTimeout(() => setEwbManagementMode(1), 100);
    } else { if (onSuccess) onSuccess(); handleClose(); }
  };

  const handleClose = () => {
    if (wasModified && onSuccess) { onSuccess(); return; }
    setInternalStep("form"); setContainerSelectionMode(null); setSelectedContainers([]); setMultiContainerData([]); setError(null); setSelectedEWB(null); setEwbManagementMode(0);
    setVehicleForm({ vehicleNo: "", vehicleType: "r", fromPlace: "", fromState: "", reasonCode: "1", reasonText: "", transporterDocNo: "", transporterDocDate: "", modeOfTransport: "1", groupNo: "", quantity: "" });
    setExtendForm({ currentPincode: "", remainingDistance: "", currentPlace: "", currentState: "", reason: "99", remarks: "", consignmentStatus: "M", transitType: "R", address1: "", address2: "", address3: "", modeOfTransport: "1" });
    setTransporterForm({ transporterId: "", selectedOrg: null });
    setRejectForm({ userGstin: "", rejectReason: "", selectedOrg: null });
    setCancelForm({ cancelReason: "2", cancelRemark: "" });
    setMultiVehicleForm({ isInitiated: false, groupNo: null, totalQuantity: "", unitCode: "NOS", placeOfConsignor: "", stateOfConsignor: "", placeOfConsignee: "", stateOfConsignee: "", modeOfTransport: "1", multiVehicleList: [], vehicleUpdateHistory: [], reasonCode: "1", reasonText: "" });
    setAddVehicleForm({ vehicleNumber: "", quantity: "", transporterDocNo: "", transporterDocDate: "", modeOfTransport: "1" });
    if (onClose) onClose();
  };

  const handleDownloadPDF = async () => {
    const pdfUrl = partAData?.meta?.pdfUrl || partAData?.pdfUrl || selectedEWB?.meta?.pdfUrl || selectedEWB?.pdfUrl;
    if (!pdfUrl) { showToast("PDF URL not available", "error"); return; }
    let url = pdfUrl;
    if (!url.startsWith("http")) url = `https://${url}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network error");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.setAttribute("download", `EWayBill_${selectedEWB?.ewbNo || partAData?.eway_bill_number || partAForm.ewayBillNo || "download"}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      showToast("PDF download started", "success");
    } catch (_) {
      showToast("Failed to download PDF", "error");
    }
  };

  const handleContainerSelect = (id) => {
    setSelectedContainers((prev) => {
      const has = prev.some((c) => c._id === id);
      return has ? prev.filter((c) => c._id !== id) : [...prev, multiContainerData.find((c) => c._id === id)];
    });
  };

  // ── Mode labels ──────────────────────────────────────────────────────────────
  const MODES = ["Road", "Rail", "Air", "Ship"];
  const modeLabel = (v) => MODES[parseInt(v) - 1] || v || "Road";

  // ─── History Table ──────────────────────────────────────────────────────────
  const HistoryTable = ({ history = [], mvList = [], unitCode = "NOS", sourceList }) => {
    const rows = [...history];
    if (mvList.length) {
      mvList
        .filter((v) => !history.some((h) => (h.newVehicle || h.oldVehicle) === v.vehicleNumber))
        .forEach((v) => rows.push({
          newVehicle: v.vehicleNumber,
          transporterDocNo: v.transporterDocNo,
          updatedAt: v.addedAt || v.updatedAt || v.createdAt,
          groupNo: v.groupNo,
          qty: v.quantity,
          modeOfTransport: v.modeOfTransport,
        }));
    }
    if (!rows.length) return <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8", py: 1.5 }}>No vehicle update history yet.</Typography>;
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontSize: "0.72rem", fontWeight: 700, color: "#64748b", borderBottom: "2px solid #e2e8f0", py: 1 } }}>
              <TableCell>Mode</TableCell><TableCell>Vehicle / Doc No</TableCell>
              <TableCell>Updated At</TableCell><TableCell>Group / Qty</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i} sx={{ "&:last-child td": { border: 0 }, "& td": { fontSize: "0.8rem", py: 0.75 } }}>
                <TableCell>{modeLabel(r.modeOfTransport)}</TableCell>
                <TableCell><strong>{r.newVehicle || r.oldVehicle || "—"}</strong><br /><span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>{r.transporterDocNo || "—"}</span></TableCell>
                <TableCell>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}</TableCell>
                <TableCell>{r.groupNo ? `Group: ${r.groupNo}` : "—"}<br /><span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>{r.qty || (sourceList?.find((v) => v.vehicleNumber === (r.newVehicle || r.oldVehicle))?.quantity) || "—"} {unitCode}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // ─── RENDER: EWB Management Tabs ────────────────────────────────────────────
  const renderEWBManagementTabs = () => (
    <Box>
      {selectedEWB?.ewbStatus === "Cancelled" && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button size="small" variant="outlined" color="inherit" onClick={() => { setInternalStep("form"); setSelectedEWB(null); setEwbManagementMode(0); setEwbUpdateError(null); }}>Regenerate</Button>}>
          <strong>E-Way Bill Cancelled</strong> — cancelled on {selectedEWB.cancelledAt ? new Date(selectedEWB.cancelledAt).toLocaleString() : "N/A"}. Generate a new one.
        </Alert>
      )}

      {/* Header bar */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography sx={{ fontSize: "0.82rem", color: "#475569" }}>
          E-Way Bill: <strong style={{ color: "#1e40af" }}>{partAForm.ewayBillNo || selectedEWB?.ewbNo || "—"}</strong>
        </Typography>
        <Button size="small" variant="text" sx={{ textTransform: "none", color: "#64748b", fontWeight: 600, fontSize: "0.78rem" }}
          onClick={() => { setInternalStep("container-select"); setSelectedEWB(null); setPartAData(null); setPartAForm({ selectedOrg: null, organizationName: "", gstin: "", ewayBillNo: "" }); setEwbManagementMode(0); setEwbUpdateError(null); }}>
          ← Back to Containers
        </Button>
      </Box>

      <Tabs
        value={ewbManagementMode}
        onChange={(_, v) => { setEwbManagementMode(v); setEwbUpdateError(null); if (v === 4) fetchMvData(); }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: "2px solid #e2e8f0", mb: 0, "& .MuiTab-root": { textTransform: "none", fontSize: "0.8rem", fontWeight: 600, minHeight: 40, py: 0 }, "& .Mui-selected": { color: "#1e40af" }, "& .MuiTabs-indicator": { bgcolor: "#1e40af", height: 2 } }}
      >
        <Tab label="Part A Preview" />
        <Tab label="Update Vehicle" disabled={selectedEWB?.ewbStatus === "Cancelled"} />
        <Tab label="Extend Validity" disabled={selectedEWB?.ewbStatus === "Cancelled"} />
        <Tab label="Update Transporter" disabled={selectedEWB?.ewbStatus === "Cancelled"} />
        <Tab label="Multi-Vehicle" disabled={selectedEWB?.ewbStatus === "Cancelled"} />
        <Tab label="Reject" disabled={selectedEWB?.ewbStatus === "Cancelled"} />
        <Tab label="Cancel" disabled={selectedEWB?.ewbStatus === "Cancelled"} />
      </Tabs>

      {/* ── TAB 0: Part A Preview ── */}
      <TabPanel value={ewbManagementMode} index={0}>
        {!partAData ? (
          <Box>
            <Typography sx={S.sectionHead}>Fetch Part A Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Autocomplete
                  options={organizationList}
                  getOptionLabel={(o) => `${o.name} (${o.gstin || "N/A"})`}
                  isOptionEqualToValue={(o, v) => o?._id === v?._id}
                  value={partAForm.selectedOrg || null}
                  onChange={(_, v) => setPartAForm({ ...partAForm, selectedOrg: v, organizationName: v?.name || "", gstin: v?.gstin || "" })}
                  filterOptions={(opts, s) => !s.inputValue ? opts : opts.filter((o) => o.name?.toLowerCase().includes(s.inputValue.toLowerCase()) || o.gstin?.toLowerCase().includes(s.inputValue.toLowerCase()))}
                  renderInput={(params) => <TextField {...params} label="Organization Name" placeholder="Search by name or GSTIN" size="small" autoComplete="off" />}
                  size="small" freeSolo={false} clearOnBlur selectOnFocus
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="GSTIN" value={partAForm.gstin} onChange={(e) => setPartAForm({ ...partAForm, gstin: e.target.value.toUpperCase() })} placeholder="Auto-filled from selection" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="E-Way Bill Number *" value={partAForm.ewayBillNo} onChange={(e) => setPartAForm({ ...partAForm, ewayBillNo: e.target.value })} placeholder="e.g. 321009218808" />
              </Grid>
              <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="contained" size="small" onClick={() => fetchPartAData(partAForm.gstin, partAForm.ewayBillNo)} disabled={partALoading || !partAForm.gstin || !partAForm.ewayBillNo} sx={{ ...S.submitBtn, bgcolor: "#1e40af" }}>
                  {partALoading ? <CircularProgress size={16} /> : "Fetch Details"}
                </Button>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography sx={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: 600 }}>✓ E-Way Bill {partAForm.ewayBillNo} loaded</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" variant="contained" startIcon={<DownloadIcon sx={{ fontSize: 15 }} />} sx={{ textTransform: "none", fontSize: "0.78rem", bgcolor: "#1e40af" }} onClick={handleDownloadPDF}>Download PDF</Button>
              </Box>
            </Box>
            <Grid container spacing={2}>
              <InfoRow label="Consignor Name" value={partAData?.consignor_name} />
              <InfoRow label="Consignor GSTIN" value={partAData?.consignor_gstin} />
              <InfoRow label="Consignee Name" value={partAData?.consignee_name} />
              <InfoRow label="Consignee GSTIN" value={partAData?.consignee_gstin} />
              <Grid item xs={12}><Divider sx={S.divider} /></Grid>
              <InfoRow label="E-Way Bill No" value={partAData?.eway_bill_number} />
              <InfoRow label="Document Type" value={partAData?.document_type} />
              <InfoRow label="Generated Date" value={partAData?.generated_date} />
              <InfoRow label="Valid Until" value={partAData?.valid_upto} />
              <InfoRow label="Total Quantity" value={partAData?.quantity} />

              <Grid item xs={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", mb: 0.25, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mode of Transport</Typography>
                    <Typography sx={{ fontSize: "0.875rem", color: "#1e293b", fontWeight: 500 }}>
                      {partAData?.mode_of_transport || partAData?.modeOfTransport || partAData?.transportationMode || partAData?.transMode || "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</Typography>
                    <Chip
                      label={partAData?.status || "—"}
                      size="small"
                      color={partAData?.status === "Generated" ? "success" : partAData?.status === "Cancelled" ? "error" : partAData?.status === "Expired" ? "warning" : "primary"}
                      sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                    />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </TabPanel>

      {/* ── TAB 1: Update Vehicle ── */}
      <TabPanel value={ewbManagementMode} index={1}>
        {/* Route info strip */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2.5, p: 1.5, bgcolor: "#f8fafc", borderRadius: 1, border: "1px solid #e2e8f0" }}>
          <Box><Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", mb: 0.25 }}>From</Typography><Typography sx={{ fontSize: "0.8rem", color: "#334155" }}>{[selectedEWB?.consignorName, selectedEWB?.consignorPlace, selectedEWB?.consignorState].filter(Boolean).join(", ") || "—"}</Typography></Box>
          <Box><Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", mb: 0.25 }}>To</Typography><Typography sx={{ fontSize: "0.8rem", color: "#334155" }}>{[selectedEWB?.consigneeName, selectedEWB?.consigneePlace, selectedEWB?.consigneeState].filter(Boolean).join(", ") || "—"}</Typography></Box>
        </Box>

        {selectedEWB?.isMultiVehicle && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={S.sectionLabel}>Multi-Vehicle Group</Typography>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <TextField select fullWidth size="small" label="Select Group" value={vehicleForm.groupNo || multiVehicleForm.groupNo || ""} onChange={(e) => {
                const val = e.target.value;
                currentGroupNoRef.current = val;
                const groups = selectedEWB?.multiVehicleGroups?.length ? selectedEWB.multiVehicleGroups : selectedEWB?.multiVehicleGroup ? [selectedEWB.multiVehicleGroup] : [];
                const g = groups.find((x) => x.groupNo === val);
                setVehicleForm((prev) => ({
                  ...prev,
                  groupNo: val,
                  quantity: g?.totalQuantity || prev.quantity || ""
                }));
                if (g) {
                  setMultiVehicleForm((prev) => ({
                    ...prev,
                    isInitiated: true,
                    groupNo: g.groupNo,
                    totalQuantity: g.totalQuantity,
                    unitCode: g.unitCode,
                    placeOfConsignor: g.placeOfConsignor,
                    stateOfConsignor: g.stateOfConsignor,
                    placeOfConsignee: g.placeOfConsignee,
                    stateOfConsignee: g.stateOfConsignee,
                    multiVehicleList: (selectedEWB.multiVehicleList || []).filter((v) => !v.groupNo || v.groupNo === g.groupNo),
                  }));
                }
              }} sx={{ flex: 1 }}>
                {(selectedEWB.multiVehicleGroups?.length ? selectedEWB.multiVehicleGroups : selectedEWB.multiVehicleGroup ? [selectedEWB.multiVehicleGroup] : []).filter((g, i, a) => a.findIndex((x) => x.groupNo === g.groupNo) === i).map((g) => (
                  <MenuItem key={g.groupNo} value={g.groupNo}>Group {g.groupNo} — {g.placeOfConsignor} → {g.placeOfConsignee} ({g.totalQuantity} {g.unitCode})</MenuItem>
                ))}
              </TextField>
              <Button size="small" variant="outlined" sx={{ textTransform: "none", whiteSpace: "nowrap" }} onClick={() => setEwbManagementMode(4)}>New Entry</Button>
            </Box>
          </Box>
        )}

        <Typography sx={S.sectionHead}>Update Part-B</Typography>

        <Typography sx={{ ...S.sectionLabel, mt: 0 }}>Mode of Transport</Typography>
        <Box sx={{ display: "flex", gap: 2.5, mb: 2 }}>
          {[["1", "Road"], ["2", "Rail"], ["3", "Air"], ["4", "Ship"]].map(([v, l]) => (
            <label key={v} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="radio" name="modeOfTransport" value={v} checked={vehicleForm.modeOfTransport === v} onChange={handleModeOfTransportChange} />
              {l}
            </label>
          ))}
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Vehicle Number *" inputRef={vehicleNoInputRef} value={vehicleForm.vehicleNo} onFocus={() => setActiveVehicleInput("vehicleNo")} onChange={handleVehicleNoChange} placeholder="e.g. TM1234" /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Place of Change *" inputRef={placeOfChangeInputRef} value={vehicleForm.fromPlace} onFocus={() => setActiveVehicleInput("fromPlace")} onChange={handlePlaceChange} placeholder="e.g. Surat" /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="From State *" value={vehicleForm.fromState} onChange={handleFromStateChange} placeholder="e.g. Gujarat" helperText="Indian state where vehicle currently is" /></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Reason *" value={vehicleForm.reasonCode} onChange={handleReasonCodeChange}><MenuItem value="1">Transshipment</MenuItem><MenuItem value="2">Due to Break Down</MenuItem><MenuItem value="3">Others</MenuItem><MenuItem value="4">First Time Update</MenuItem></TextField></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Vehicle Type *" value={vehicleForm.vehicleType} onChange={handleVehicleTypeChange}><MenuItem value="r">Regular</MenuItem><MenuItem value="o">ODC (Over Dimension Cargo)</MenuItem></TextField></Grid>
          {selectedEWB?.isMultiVehicle && <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="Quantity in Vehicle *" value={vehicleForm.quantity} onChange={(e) => setVehicleForm({ ...vehicleForm, quantity: e.target.value })} helperText={`Unit: ${multiVehicleForm.unitCode || "NOS"}`} /></Grid>}
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Transporter Doc No." value={vehicleForm.transporterDocNo} onChange={handleTransporterDocNoChange} error={!!getFieldError(["transporter_document_number", "transporter doc", "document number"])} helperText={getFieldError(["transporter_document_number", "transporter doc", "document number"])} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="date" label="Doc Date" InputLabelProps={{ shrink: true }} value={vehicleForm.transporterDocDate} onChange={handleTransporterDocDateChange} error={!!getFieldError(["transporter_document_date", "doc date"])} helperText={getFieldError(["transporter_document_date", "doc date"])} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" multiline rows={2} label="Remarks (Optional)" value={vehicleForm.reasonText} onChange={handleRemarksChange} inputProps={{ maxLength: 50 }} helperText={`${vehicleForm.reasonText?.length || 0}/50`} /></Grid>
          <Grid item xs={12}><Box sx={S.actionRow}><Button variant="contained" onClick={handleUpdateVehicle} disabled={isLoading} sx={{ ...S.submitBtn, bgcolor: "#1e40af" }}>{isLoading ? <CircularProgress size={16} /> : "Submit"}</Button><Button variant="contained" onClick={() => setInternalStep("container-select")} sx={S.exitBtn}>Exit</Button></Box></Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography sx={S.sectionLabel}>Vehicle Updation History</Typography>
        <HistoryTable history={selectedEWB?.vehicleUpdateHistory} mvList={selectedEWB?.multiVehicleList} unitCode={selectedEWB?.multiVehicleGroup?.unitCode} />
      </TabPanel>

      {/* ── TAB 2: Extend Validity ── */}
      <TabPanel value={ewbManagementMode} index={2}>
        <Alert severity={extendWindowOpen ? "success" : "error"} sx={{ mb: 2.5, py: 0.75 }}>
          {extendWindowOpen
            ? hoursRemainingForExtend < 0 ? `Expired ${Math.abs(hoursRemainingForExtend).toFixed(1)}h ago — extension allowed within ${EXTENSION_WINDOW_HOURS}h of expiry.` : `${hoursRemainingForExtend.toFixed(1)} hours remaining.`
            : hoursRemainingForExtend > EXTENSION_WINDOW_HOURS ? `Extension not yet allowed — only available within ${EXTENSION_WINDOW_HOURS}h of expiry. (${hoursRemainingForExtend.toFixed(1)}h left)` : `Extension window closed — expired ${Math.abs(hoursRemainingForExtend).toFixed(1)}h ago.`}
        </Alert>

        <Typography sx={S.sectionHead}>Extend Validity Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Current Pincode" value={extendForm.currentPincode} onChange={handleExtendPincodeChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="Remaining Distance (km)" value={extendForm.remainingDistance} onChange={handleExtendDistanceChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Current Place" value={extendForm.currentPlace} onChange={handleExtendPlaceChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Current State *" value={extendForm.currentState} onChange={handleExtendStateChange} helperText="Indian state where vehicle currently is" /></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Extension Reason" value={extendForm.reason} onChange={handleExtendReasonChange}><MenuItem value="1">Natural Calamity</MenuItem><MenuItem value="2">Law and Order Situation</MenuItem><MenuItem value="4">Transshipment</MenuItem><MenuItem value="5">Accident</MenuItem><MenuItem value="99">Others</MenuItem></TextField></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Consignment Status *" value={extendForm.consignmentStatus} onChange={handleConsignmentStatusChange}><MenuItem value="M">In Movement (On Vehicle)</MenuItem><MenuItem value="T">In Transit (In Warehouse)</MenuItem></TextField></Grid>
          {extendForm.consignmentStatus === "T" && <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Transit Type" value={extendForm.transitType} onChange={handleTransitTypeChange}><MenuItem value="R">Road</MenuItem><MenuItem value="W">Warehouse</MenuItem><MenuItem value="O">Others</MenuItem></TextField></Grid>}
          <Grid item xs={12}><TextField fullWidth size="small" multiline rows={2} label="Reason / Remarks *" value={extendForm.remarks} onChange={handleExtendRemarksChange} /></Grid>
          <Grid item xs={12}>
            <Typography sx={S.sectionLabel}>Current Location Address</Typography>
            <Grid container spacing={1.5}><Grid item xs={4}><TextField fullWidth size="small" label="Line 1" value={extendForm.address1} onChange={handleAddress1Change} /></Grid><Grid item xs={4}><TextField fullWidth size="small" label="Line 2" value={extendForm.address2} onChange={handleAddress2Change} /></Grid><Grid item xs={4}><TextField fullWidth size="small" label="Line 3" value={extendForm.address3} onChange={handleAddress3Change} /></Grid></Grid>
          </Grid>
          <Grid item xs={12}><Box sx={S.actionRow}><Button variant="contained" onClick={handleExtendValidity} disabled={isLoading || !extendWindowOpen} sx={{ ...S.submitBtn, bgcolor: "#16a34a" }}>{isLoading ? <CircularProgress size={16} /> : "Submit"}</Button><Button variant="contained" onClick={() => setInternalStep("container-select")} sx={S.exitBtn}>Exit</Button></Box></Grid>
        </Grid>
      </TabPanel>

      {/* ── TAB 3: Update Transporter ── */}
      <TabPanel value={ewbManagementMode} index={3}>
        <Typography sx={S.sectionHead}>Update Transporter</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete options={organizationList} getOptionLabel={(o) => `${o.name} (${o.gstin || "N/A"})`} value={transporterForm.selectedOrg} onChange={handleTransporterOrgChange} renderInput={(p) => <TextField {...p} label="New Transporter" placeholder="Search by name or GSTIN" size="small" />} size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Transporter GSTIN" value={transporterForm.transporterId} onChange={handleTransporterIdChange} placeholder="Auto-filled from selection above" disabled={!!transporterForm.selectedOrg} />
          </Grid>
          <Grid item xs={12}><Box sx={S.actionRow}><Button variant="contained" onClick={handleUpdateTransporter} disabled={isLoading || !transporterForm.transporterId} sx={{ ...S.submitBtn, bgcolor: "#1e40af" }}>{isLoading ? <CircularProgress size={16} /> : "Submit"}</Button><Button variant="contained" onClick={() => setInternalStep("container-select")} sx={S.exitBtn}>Exit</Button></Box></Grid>
        </Grid>
      </TabPanel>

      {/* ── TAB 4: Multi-Vehicle ── */}
      <TabPanel value={ewbManagementMode} index={4}>
        {/* Group selector */}
        <Box sx={{ mb: 2.5, display: "flex", gap: 1.5, alignItems: "center" }}>
          <TextField select fullWidth size="small" label="Multi-Vehicle Operation" value={multiVehicleForm.isInitiated ? (multiVehicleForm.groupNo || "ACTIVE") : "NEW"}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "NEW") {
                currentGroupNoRef.current = null;
                const isForeign = ["other country", "99"].includes((selectedEWB.consignorState || "").toLowerCase().trim());
                const totalQty = parseFloat(selectedEWB.itemList?.[0]?.quantity || selectedEWB.quantity || 0);
                const initiatedQty = (selectedEWB.multiVehicleGroups || []).reduce((sum, grp) => sum + parseFloat(grp.totalQuantity || 0), 0);
                const remainingQty = Math.max(0, totalQty - initiatedQty);
                setMultiVehicleForm((p) => ({
                  ...p,
                  isInitiated: false,
                  groupNo: null,
                  placeOfConsignor: isForeign ? selectedEWB.consigneePlace : selectedEWB.consignorPlace,
                  stateOfConsignor: isForeign ? selectedEWB.consigneeState : selectedEWB.consignorState,
                  placeOfConsignee: selectedEWB.consigneePlace || "",
                  stateOfConsignee: selectedEWB.consigneeState || "",
                  totalQuantity: remainingQty > 0 ? remainingQty : ""
                }));
              }
              else {
                currentGroupNoRef.current = val;
                const groups = selectedEWB.multiVehicleGroups?.length ? selectedEWB.multiVehicleGroups : selectedEWB.multiVehicleGroup ? [selectedEWB.multiVehicleGroup] : [];
                const g = groups.find((x) => x.groupNo === val) || selectedEWB.multiVehicleGroup;
                if (g) {
                  setMultiVehicleForm((p) => ({
                    ...p,
                    isInitiated: true,
                    groupNo: g.groupNo,
                    totalQuantity: g.totalQuantity,
                    unitCode: g.unitCode,
                    placeOfConsignor: g.placeOfConsignor,
                    stateOfConsignor: g.stateOfConsignor,
                    placeOfConsignee: g.placeOfConsignee,
                    stateOfConsignee: g.stateOfConsignee,
                    multiVehicleList: (selectedEWB.multiVehicleList || []).filter((v) => !v.groupNo || v.groupNo === g.groupNo),
                    vehicleUpdateHistory: selectedEWB.vehicleUpdateHistory || []
                  }));
                  setVehicleForm((prev) => ({
                    ...prev,
                    groupNo: g.groupNo,
                    quantity: g.totalQuantity || prev.quantity || ""
                  }));
                }
              }
            }}>
            <MenuItem value="NEW">Initiate New Movement</MenuItem>
            {(selectedEWB?.multiVehicleGroups?.length ? selectedEWB.multiVehicleGroups : selectedEWB?.multiVehicleGroup ? [selectedEWB.multiVehicleGroup] : []).filter((g, i, a) => a.findIndex((x) => x.groupNo === g.groupNo) === i).map((g) => (
              <MenuItem key={g.groupNo} value={g.groupNo || "ACTIVE"}>Group {g.groupNo} — {g.placeOfConsignor} → {g.placeOfConsignee} ({g.totalQuantity} {g.unitCode})</MenuItem>
            ))}
          </TextField>
          <Chip label={multiVehicleForm.isInitiated ? "Active" : "Pending"} size="small" color={multiVehicleForm.isInitiated ? "success" : "warning"} sx={{ fontWeight: 700, flexShrink: 0 }} />
        </Box>

        {!multiVehicleForm.isInitiated ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2, py: 0.75, fontSize: "0.8rem" }}>Goods can be split across multiple vehicles. Total quantity across all vehicles cannot exceed the E-Way Bill quantity.</Alert>
            <Typography sx={S.sectionHead}>Initiate Movement</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Total Quantity *" type="number" value={multiVehicleForm.totalQuantity} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, totalQuantity: e.target.value })} /></Grid>
              <Grid item xs={12} sm={6}><FormControl fullWidth size="small"><InputLabel>Unit Code</InputLabel><Select value={multiVehicleForm.unitCode} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, unitCode: e.target.value })} label="Unit Code"><MenuItem value="NOS">Numbers</MenuItem><MenuItem value="KGS">Kilograms</MenuItem><MenuItem value="LTR">Liters</MenuItem></Select></FormControl></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Place of Consignor *" value={multiVehicleForm.placeOfConsignor} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, placeOfConsignor: e.target.value })} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="State of Consignor *" value={multiVehicleForm.stateOfConsignor} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, stateOfConsignor: e.target.value })} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Place of Consignee *" value={multiVehicleForm.placeOfConsignee} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, placeOfConsignee: e.target.value })} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="State of Consignee *" value={multiVehicleForm.stateOfConsignee} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, stateOfConsignee: e.target.value })} /></Grid>
              <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Reason *" value={multiVehicleForm.reasonCode} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, reasonCode: e.target.value })}><MenuItem value="1">Transshipment</MenuItem><MenuItem value="2">Due to Break Down</MenuItem><MenuItem value="3">Others</MenuItem><MenuItem value="4">First Time Update</MenuItem></TextField></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Remarks *" value={multiVehicleForm.reasonText} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, reasonText: e.target.value })} inputProps={{ maxLength: 50 }} helperText={`${multiVehicleForm.reasonText?.length || 0}/50`} /></Grid>
              <Grid item xs={12}><Box sx={S.actionRow}><Button variant="contained" onClick={handleInitiateMultiVehicle} disabled={isLoading || !multiVehicleForm.totalQuantity} sx={{ ...S.submitBtn, bgcolor: "#7c3aed" }}>{isLoading ? <CircularProgress size={16} /> : "Initiate"}</Button></Box></Grid>
            </Grid>
          </Box>
        ) : (
          <Box>
            {/* Group summary strip */}
            <Box sx={{ p: 1.5, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 1, mb: 2.5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
              <Typography sx={{ fontSize: "0.8rem" }}><strong>Group:</strong> {multiVehicleForm.groupNo}</Typography>
              <Typography sx={{ fontSize: "0.8rem" }}><strong>Total Qty:</strong> {multiVehicleForm.totalQuantity} {multiVehicleForm.unitCode}</Typography>
              <Typography sx={{ fontSize: "0.8rem" }}><strong>From:</strong> {multiVehicleForm.placeOfConsignor}, {multiVehicleForm.stateOfConsignor}</Typography>
              <Typography sx={{ fontSize: "0.8rem" }}><strong>To:</strong> {multiVehicleForm.placeOfConsignee}, {multiVehicleForm.stateOfConsignee}</Typography>
            </Box>

            <Typography sx={S.sectionHead}>Add Vehicle to Group</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Vehicle Number *" value={addVehicleForm.vehicleNumber} onChange={(e) => { setAddVehicleForm({ ...addVehicleForm, vehicleNumber: e.target.value.toUpperCase() }); if (ewbUpdateError) setEwbUpdateError(null); }} error={!!getFieldError(["vehicle", "vehicle_number"])} helperText={getFieldError(["vehicle", "vehicle_number"])} placeholder="e.g. TM1234" /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="Quantity *" value={addVehicleForm.quantity} onChange={(e) => { setAddVehicleForm({ ...addVehicleForm, quantity: e.target.value }); if (ewbUpdateError) setEwbUpdateError(null); }} error={!!getFieldError(["quantity"])} helperText={getFieldError(["quantity"])} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Transporter Doc No" value={addVehicleForm.transporterDocNo} onChange={(e) => { setAddVehicleForm({ ...addVehicleForm, transporterDocNo: e.target.value }); if (ewbUpdateError) setEwbUpdateError(null); }} helperText="Auto-filled from EWB" /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="date" label="Doc Date" InputLabelProps={{ shrink: true }} value={addVehicleForm.transporterDocDate} onChange={(e) => { setAddVehicleForm({ ...addVehicleForm, transporterDocDate: e.target.value }); if (ewbUpdateError) setEwbUpdateError(null); }} helperText="Auto-filled from EWB" /></Grid>
              <Grid item xs={12}>
                <Box sx={S.actionRow}>
                  <Button variant="contained" onClick={() => {
                    if (!addVehicleForm.vehicleNumber || !addVehicleForm.quantity) { const m = "Vehicle Number and Quantity are required"; setEwbUpdateError(m); showToast(m, "error"); return; }
                    const fromPlace = multiVehicleForm.placeOfConsignor || vehicleForm.fromPlace || "";
                    handleAddVehicle({ ...addVehicleForm, fromPlace });
                    setAddVehicleForm({ vehicleNumber: "", quantity: "", transporterDocNo: vehicleForm.transporterDocNo || "", transporterDocDate: vehicleForm.transporterDocDate || "", modeOfTransport: "1" });
                  }} disabled={isLoading} sx={{ ...S.submitBtn, bgcolor: "#7c3aed" }}>{isLoading ? <CircularProgress size={16} /> : "Add Vehicle"}</Button>
                  <Button variant="contained" onClick={() => setInternalStep("container-select")} sx={S.exitBtn}>Exit</Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />
        <Typography sx={S.sectionLabel}>Vehicle Updation History</Typography>
        <HistoryTable history={multiVehicleForm.vehicleUpdateHistory} mvList={multiVehicleForm.multiVehicleList} unitCode={multiVehicleForm.unitCode} />
      </TabPanel>

      {/* ── TAB 5: Reject ── */}
      <TabPanel value={ewbManagementMode} index={5}>
        <Alert severity={centerWindowOpen ? "success" : "error"} sx={{ mb: 2.5, py: 0.75 }}>
          {centerWindowOpen ? `Within rejection window — ${hoursRemainingForReject.toFixed(1)} hours remaining.` : `Rejection window expired — ${Math.abs(hoursRemainingForReject).toFixed(1)} hours have passed. Only consignee can reject within 72 hours.`}
        </Alert>
        <Typography sx={S.sectionHead}>Reject E-Way Bill</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}><Autocomplete options={organizationList} getOptionLabel={(o) => `${o.name} (${o.gstin || "N/A"})`} value={rejectForm.selectedOrg} onChange={(_, v) => setRejectForm({ ...rejectForm, selectedOrg: v, userGstin: v?.gstin || "" })} renderInput={(p) => <TextField {...p} label="Consignee Organization" placeholder="Search by name or GSTIN" size="small" />} size="small" /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Consignee GSTIN" value={rejectForm.userGstin} onChange={(e) => setRejectForm({ ...rejectForm, userGstin: e.target.value.toUpperCase() })} placeholder="Auto-filled from selection" disabled={!!rejectForm.selectedOrg} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" multiline rows={2} label="Rejection Reason (Optional)" value={rejectForm.rejectReason} onChange={(e) => setRejectForm({ ...rejectForm, rejectReason: e.target.value })} /></Grid>
          <Grid item xs={12}><Box sx={S.actionRow}><Button variant="contained" onClick={handleRejectEWB} disabled={isLoading || !centerWindowOpen || !rejectForm.userGstin} sx={{ ...S.submitBtn, bgcolor: "#dc2626" }}>{isLoading ? <CircularProgress size={16} /> : "Submit"}</Button><Button variant="contained" onClick={() => setInternalStep("container-select")} sx={S.exitBtn}>Exit</Button></Box></Grid>
        </Grid>
      </TabPanel>

      {/* ── TAB 6: Cancel ── */}
      <TabPanel value={ewbManagementMode} index={6}>
        <Alert severity={cancelWindowOpen ? "warning" : "error"} sx={{ mb: 2.5, py: 0.75 }}>
          {cancelWindowOpen ? `Within cancellation window — ${hoursRemainingForCancel.toFixed(1)} hours remaining.` : `Cancellation window expired — ${Math.abs(hoursRemainingForCancel).toFixed(1)} hours have passed. Only generator can cancel within 24 hours.`}
        </Alert>
        <Typography sx={S.sectionHead}>Cancel E-Way Bill</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}><FormControl fullWidth size="small"><InputLabel>Cancellation Reason *</InputLabel><Select value={cancelForm.cancelReason} onChange={(e) => setCancelForm({ ...cancelForm, cancelReason: e.target.value })} label="Cancellation Reason *"><MenuItem value="1">Duplicate</MenuItem><MenuItem value="2">Order Cancelled</MenuItem><MenuItem value="3">Data Entry Mistake</MenuItem><MenuItem value="4">Other</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" multiline rows={2} label="Cancellation Remarks *" value={cancelForm.cancelRemark} onChange={(e) => { setCancelForm({ ...cancelForm, cancelRemark: e.target.value }); if (ewbUpdateError === "Cancellation remarks are required") setEwbUpdateError(null); }} error={ewbUpdateError === "Cancellation remarks are required"} helperText={ewbUpdateError === "Cancellation remarks are required" ? ewbUpdateError : ""} /></Grid>
          <Grid item xs={12}><Box sx={S.actionRow}><Button variant="contained" onClick={handleCancelEWB} disabled={isLoading || !cancelWindowOpen} sx={{ ...S.submitBtn, bgcolor: "#dc2626" }}>{isLoading ? <CircularProgress size={16} /> : "Submit"}</Button><Button variant="contained" onClick={() => setInternalStep("container-select")} sx={S.exitBtn}>Exit</Button></Box></Grid>
        </Grid>
      </TabPanel>
    </Box>
  );

  // ─── RENDER: Container Selection ────────────────────────────────────────────
  const renderContainerSelection = () => {
    const pending = multiContainerData.filter((c) => !c.eWay_bill);
    const generated = multiContainerData.filter((c) => c.eWay_bill);
    return (
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", mb: 0.5 }}>Container E-Way Bill Management</Typography>
        <Typography sx={{ fontSize: "0.82rem", color: "#64748b", mb: 2.5 }}>
          {generated.length} generated · {pending.length} pending · {multiContainerData.length} total
        </Typography>

        {/* Select all row */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5, gap: 0.5 }}>
          <Checkbox size="small" checked={pending.length > 0 && selectedContainers.length === pending.length} indeterminate={selectedContainers.length > 0 && selectedContainers.length < pending.length}
            onChange={(e) => setSelectedContainers(e.target.checked ? pending : [])} sx={{ p: 0.5 }} />
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>Select All Pending</Typography>
        </Box>

        {/* Container rows */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {multiContainerData.map((cont) => {
            const ewb = cont.eWay_bill ? ewayBillList.find((e) => e.ewbNo === cont.eWay_bill) : null;
            const isInvalid = ewb?.ewbStatus === "Cancelled" || ewb?.ewbStatus === "Rejected";
            const sharedCount = cont.eWay_bill ? multiContainerData.filter((c) => c.eWay_bill === cont.eWay_bill).length : 0;
            const isSelected = selectedContainers.some((c) => c._id === cont._id);

            return (
              <Box key={cont._id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 1.5, border: `1px solid ${cont.eWay_bill && !isInvalid ? "#bbf7d0" : isSelected ? "#bfdbfe" : "#e2e8f0"}`, bgcolor: cont.eWay_bill && !isInvalid ? "#f0fdf4" : isSelected ? "#eff6ff" : "#fff", transition: "all .15s" }}>
                <Checkbox size="small" checked={isSelected} onChange={() => handleContainerSelect(cont._id)} disabled={!!cont.eWay_bill} sx={{ p: 0.5, flexShrink: 0 }} />

                {/* Container info */}
                <Box sx={{ flex: "0 0 130px" }}>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>{cont.container_number || "—"}</Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>TR: {cont.tr_no || "—"}</Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>{cont.gross_weight || 0} kg</Typography>
                </Box>

                {/* EWB chip */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Chip label={cont.eWay_bill ? cont.eWay_bill : "Pending"} size="small" color={cont.eWay_bill && !isInvalid ? "success" : isInvalid ? "error" : "warning"} variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem", maxWidth: "100%" }} />
                  {ewb?.ewbStatus && isInvalid && <Chip label={ewb.ewbStatus} size="small" color="error" sx={{ ml: 0.75, height: 18, fontSize: "0.65rem" }} />}
                  {sharedCount > 1 && <Chip label={`Shared ×${sharedCount}`} size="small" color="info" variant="outlined" sx={{ ml: 0.75, height: 18, fontSize: "0.65rem" }} />}
                </Box>

                {/* Actions */}
                <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
                  {!cont.eWay_bill || isInvalid ? (
                    canGenerateEWB && <Button size="small" variant="contained" onClick={() => handleContainerAction(cont, "generate")} sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.4, px: 1.25, fontWeight: 600, bgcolor: isInvalid ? "#dc2626" : "#1e40af", borderRadius: 1 }}>{isInvalid ? "Regenerate" : "Generate"}</Button>
                  ) : (
                    <>
                      <Tooltip title="Preview Part A"><Button size="small" variant="outlined" onClick={() => handleContainerAction(cont, "preview")} sx={{ textTransform: "none", fontSize: "0.72rem", py: 0.4, px: 1, borderRadius: 1 }}>Preview</Button></Tooltip>
                      <Tooltip title="7 management operations"><Button size="small" variant="contained" color="secondary" onClick={() => handleContainerAction(cont, "update")} sx={{ textTransform: "none", fontSize: "0.72rem", py: 0.4, px: 1, borderRadius: 1 }}>Manage</Button></Tooltip>
                    </>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Footer summary */}
        <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>
            {selectedContainers.length > 0 ? <><strong>{selectedContainers.length}</strong> selected — </> : null}
            <strong>{generated.length}</strong> generated · <strong>{pending.length}</strong> pending
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" onClick={handleClose} sx={{ textTransform: "none", fontSize: "0.78rem", borderRadius: 1 }}>Close</Button>
            {canGenerateEWB && (pending.length > 0 || selectedContainers.length > 0) && (
              <Button variant="contained" size="small" onClick={() => handleBulkAction("generate")} sx={{ textTransform: "none", fontSize: "0.78rem", fontWeight: 600, borderRadius: 1, bgcolor: "#1e40af" }}>
                {selectedContainers.length > 0 ? `Generate Selected (${selectedContainers.length})` : "Generate All Pending"}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  // ─── RENDER: Generate Mode ───────────────────────────────────────────────────
  const renderGenerateMode = () => {
    const formatDocDate = (s) => {
      if (!s) return "—";
      const str = String(s).trim();
      try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          return `${dd}-${mm}-${d.getFullYear()}`;
        }
      } catch (_) {}
      return str;
    };

    return (
      <Box>
        {/* BOE Calc Status */}
        {boeLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Fetching BOE details...</Typography>
          </Box>
        )}
        {boeError && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: "0.8rem" }}>{boeError}</Alert>
        )}

        {/* Unified Shipment & BOE Summary Panel */}
        {(boeLrData || prData) && (
          <Box sx={{ p: 2, mb: 3, bgcolor: "#f8fafc", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e3a8a", mb: 2, pb: 0.5, borderBottom: "1.5px solid #cbd5e1", textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.05em" }}>
              Fetched Shipment & BOE Summary
            </Typography>
            <Grid container spacing={3}>
              {/* Shipment Details Column */}
              <Grid item xs={12} md={boeCalcData ? 5 : 12}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", display: "block", mb: 1, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.03em" }}>
                  Shipment Information
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>Document No. (BOE)</Typography>
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                      {boeLrData?.document_no || prData?.document_no || prData?.be_no || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>Document Date (BE Date)</Typography>
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                      {formatDocDate(boeLrData?.document_date || prData?.document_date || prData?.be_date)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>Party (Consignee)</Typography>
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                      {boeLrData?.consignee?.name || prData?.consignee_name || prData?.importer || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>LR No. / Date</Typography>
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                      {boeLrData?.pr_no || prData?.pr_no || "—"} 
                      {boeLrData?.pr_date ? ` (${formatDocDate(boeLrData.pr_date)})` : ""}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Vertical Divider for desktop screens */}
              {boeCalcData && (
                <Grid item xs={false} md={1} sx={{ display: { xs: "none", md: "flex" }, justifyContent: "center" }}>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: "#e2e8f0" }} />
                </Grid>
              )}

              {/* Value Summary Column */}
              {boeCalcData && (
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", display: "block", mb: 1, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.03em" }}>
                    Value & Weight Details
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>Assessable Value</Typography>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                        ₹{boeCalcData.assessableValue?.toLocaleString('en-IN')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>BCD / SWS</Typography>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                        ₹{(boeCalcData.bcd || 0).toLocaleString('en-IN')} / ₹{(boeCalcData.sws || 0).toLocaleString('en-IN')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>IGST ({boeCalcData.igstRate}%)</Typography>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                        ₹{boeCalcData.igst?.toLocaleString('en-IN')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.72rem", color: "#1e3a8a", fontWeight: 600 }}>Total Value (Y)</Typography>
                      <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e3a8a" }}>
                        ₹{boeCalcData.totalValue?.toLocaleString('en-IN')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>Gross Weight</Typography>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                        {boeCalcData.grossWeight} kg
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: "0.72rem", color: "#0369a1", fontWeight: 600 }}>Per KG Value</Typography>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: "#0369a1" }}>
                        ₹{boeCalcData.perKgValue?.toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        <EwayBillGenerateLR
          asDialog
          prData={prData}
          boeOnly
          prefilledLrId={container?._id || selectedContainers?.[0]?._id}
          selectedContainers={selectedContainers}
          containerSelectionMode={containerSelectionMode}
          boeData={boeExtractData}
          prefetchedBoeLrData={boeLrData}
          document_no={boeLrData?.document_no || prData?.document_no || prData?.be_no}
          documentDate={boeLrData?.document_date || prData?.document_date || prData?.be_date}
          boeCalcData={boeCalcData}
          onClose={handleClose}
          onSuccess={handleGenerationSuccess}
        />
      </Box>
    );
  };

  // ─── RENDER: Preview ─────────────────────────────────────────────────────────
  const renderPreview = () => (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", mb: 2 }}>E-Way Bill Part A Preview</Typography>
      {selectedEWB && <PartAPreview ewayBill={selectedEWB} />}
      <Box sx={{ mt: 3, display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button variant="outlined" size="small" sx={{ textTransform: "none", borderRadius: 1 }} onClick={() => setInternalStep("container-select")}>← Back</Button>
        <Button variant="contained" size="small" startIcon={<DownloadIcon sx={{ fontSize: 15 }} />} sx={{ textTransform: "none", borderRadius: 1, bgcolor: "#1e40af" }} onClick={handleDownloadPDF}>Download PDF</Button>
      </Box>
    </Box>
  );

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth disableEnforceFocus PaperProps={{ sx: { minHeight: 500, borderRadius: 2 } }} sx={{ zIndex: 1200 }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", py: 1.5, px: 3 }}>
        <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
          {mode === "generate" ? "Generate E-Way Bill" : "Manage E-Way Bill"}
        </Typography>
        <Button size="small" onClick={handleClose} sx={{ minWidth: "auto", p: 0.5, color: "#94a3b8", "&:hover": { color: "#334155" } }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 2.5, pb: 3 }}>
        {isLoadingContainers || (mode === "update" && existingEwb && !selectedEWB) || (isLoading && !selectedEWB) ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : internalStep === "container-select" ? renderContainerSelection()
          : internalStep === "form" ? renderGenerateMode()
          : internalStep === "preview" ? renderPreview()
          : (internalStep === "ewb-manage" || internalStep === "update" || mode === "update") ? renderEWBManagementTabs()
          : renderContainerSelection()}
      </DialogContent>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.type || "error"} variant="filled" sx={{ width: "100%", boxShadow: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default LrEwayBillDialog;