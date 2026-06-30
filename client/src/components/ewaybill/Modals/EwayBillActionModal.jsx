
import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Divider,
  CircularProgress,
  Paper,
  Collapse,
  IconButton,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import HistoryIcon from "@mui/icons-material/History";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import axios from "axios";
import Swal from "sweetalert2";
import { parseNicErrorMessage } from "../EwayBillGenerate";
import { 
  checkCancellationWindow, 
  checkRejectionWindow,
  validateVehicleNumber 
} from "../ewbValidationHelpers";

const TRANSPORT_MODE_MAP = { 1: "Road", 2: "Rail", 3: "Air", 4: "Ship" };

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Ladakh", "Lakshadweep",
  "Puducherry", "Other Territory"
];

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ewb-action-tabpanel-${index}`}
      aria-labelledby={`ewb-action-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
};

const EwayBillActionModal = ({ open, onClose, ewayBill, onSuccess }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initializedEwayBillNo, setInitializedEwayBillNo] = useState(null);

  // Time-window state (computed on modal open)
  const [cancelWindowOpen, setCancelWindowOpen] = useState(true);
  const [cancelHoursElapsed, setCancelHoursElapsed] = useState(0);
  const [rejectWindowOpen, setRejectWindowOpen] = useState(true);
  const [rejectHoursElapsed, setRejectHoursElapsed] = useState(0);

  const STATE_NAME_TO_CODE = {
    "JAMMU AND KASHMIR": "01", "HIMACHAL PRADESH": "02", "PUNJAB": "03", "CHANDIGARH": "04",
    "UTTARAKHAND": "05", "HARYANA": "06", "DELHI": "07", "RAJASTHAN": "08", "UTTAR PRADESH": "09",
    "BIHAR": "10", "SIKKIM": "11", "ARUNACHAL PRADESH": "12", "NAGALAND": "13", "MANIPUR": "14",
    "MIZORAM": "15", "TRIPURA": "16", "MEGHALAYA": "17", "ASSAM": "18", "WEST BENGAL": "19",
    "JHARKHAND": "20", "ODISHA": "21", "CHHATTISGARH": "22", "MADHYA PRADESH": "23",
    "GUJARAT": "24", "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "26", "MAHARASHTRA": "27",
    "ANDHRA PRADESH": "28", "KARNATAKA": "29", "GOA": "30", "LAKSHADWEEP": "31",
    "KERALA": "32", "TAMIL NADU": "33", "PUDUCHERRY": "34", "ANDAMAN AND NICOBAR ISLANDS": "35",
    "TELANGANA": "36", "ANDHRA PRADESH (NEW)": "37", "LADAKH": "38", "OTHER TERRITORY": "97", "OTHERS": "99",
    "OTHER COUNTRY": "99"
  };

  const getStateCode = (stateName) => {
    if (!stateName) return "";
    const key = String(stateName).trim().toUpperCase();
    return STATE_NAME_TO_CODE[key] || "";
  };

  const normalizeVehicleUpdateReasonCode = (code) => {
    if (!code) return "2";
    const normalized = String(code).trim().toLowerCase().replace(/\s+/g, '');
    switch (normalized) {
      case "duetobreakdown":
      case "breakdown":
      case "2":
        return "2";
      case "transshipment":
      case "1":
        return "1";
      case "others":
      case "3":
        return "3";
      case "firsttimeupdate":
      case "firsttimepartb":
      case "4":
        return "4";
      default:
        return code;
    }
  };

  // Form States
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNo: "",
    fromPlace: "",
    fromState: "",
    reasonCode: "1", // 1: Due to Break Down, etc.
    reasonText: "",
    modeOfTransport: "1",
    vehicleType: "r", // Default to 'r' for Regular
    transporterDocNo: "",
    transporterDocDate: "",
  });

  const [transporterForm, setTransporterForm] = useState({ transporterId: "" });

  const [extendForm, setExtendForm] = useState({
    remainingDistance: "",
    vehicleNo: "",
    currentPlace: "",
    currentState: "",
    reason: "Others",
    remarks: "Traffic Delay",
    currentPincode: "",
    modeOfTransport: "1",
    consignmentStatus: "M", // M: In Movement, T: In Transit
    transitType: "R", // R: Road, W: Warehouse, O: Others
    address1: "",
    address2: "",
    address3: "",
  });

  const [cancelForm, setCancelForm] = useState({
    cancelReason: "2",
    cancelRemark: "",
  });

  const [multiVehicleForm, setMultiVehicleForm] = useState({
    totalQuantity: "",
    unitCode: "NOS",
    placeOfConsignor: "",
    stateOfConsignor: "",
    placeOfConsignee: "",
    stateOfConsignee: "",
    reasonCode: "due to break down",
    reasonText: "",
    modeOfTransport: "1",
  });

  const [rejectForm, setRejectForm] = useState({
    userGstin: "",
    rejectReason: "",
  });

  // Multi-Vehicle State
  const [mvData, setMvData] = useState(null); // fetched from GET /multi-vehicle/:ewbId
  const [mvLoading, setMvLoading] = useState(false);
  const [selectedGroupNo, setSelectedGroupNo] = useState("NEW");
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [addVehicleForm, setAddVehicleForm] = useState({
    vehicleNumber: "",
    transporterDocNo: "",
    transporterDocDate: "",
    quantity: "",
    modeOfTransport: "1",
    vehicleType: "r",
  });

  const fetchMvData = useCallback(async () => {
    if (!ewayBill?._id) return;
    setMvLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/${ewayBill._id}`
      );
      if (res.data.success) {
        setMvData(res.data.data);
        const groups = res.data.data.multiVehicleGroups || [];
        if (groups.length > 0) {
           setSelectedGroupNo(groups[groups.length - 1].groupNo);
        } else if (res.data.data.multiVehicleGroup?.groupNo) {
           setSelectedGroupNo(res.data.data.multiVehicleGroup.groupNo);
        }
      }
    } catch (err) {
      console.error("Error fetching multi-vehicle data:", err);
    } finally {
      setMvLoading(false);
    }
  }, [ewayBill?._id]);

  useEffect(() => {
    if (!open) {
      setInitializedEwayBillNo(null);
      return;
    }

    if (!ewayBill) return;
    if (ewayBill.ewbNo && ewayBill.ewbNo === initializedEwayBillNo) return;

    setInitializedEwayBillNo(ewayBill.ewbNo);

    setVehicleForm((prev) => ({
      ...prev,
      vehicleNo: ewayBill.vehicleNumber || "",
      fromPlace: ewayBill.consignorPlace || "",
      fromState: ewayBill.consignorState || "",
      reasonCode: "2", // Default to Due to Break Down
      reasonText: "",
      modeOfTransport: "1",
      vehicleType: ewayBill.vehicleType === "ODC" ? "o" : "r",
      transporterDocNo: "",
      transporterDocDate: "",
    }));
    setTransporterForm({ transporterId: ewayBill.transporterId || "" });
    setExtendForm((prev) => ({
      ...prev,
      vehicleNo: ewayBill.vehicleNumber || "",
      currentPlace: ewayBill.consignorPlace || "",
      currentState: ewayBill.consignorState || "",
      currentPincode: ewayBill.consignorPincode || "",
      remainingDistance: ewayBill.transportDistance || "",
      reason: "Others",
      remarks: "Traffic Delay",
      modeOfTransport: "1",
      consignmentStatus: "M",
      transitType: "R",
      address1: ewayBill.consignorAddress1 || "",
      address2: ewayBill.consignorAddress2 || "",
      address3: "",
    }));
    setCancelForm({ cancelReason: "2", cancelRemark: "" });
    const isImport = ewayBill.consignorState === "Other Country" || ewayBill.consignorState === "OTHER COUNTRY";
    setMultiVehicleForm({
      totalQuantity: "",
      unitCode: "NOS",
      placeOfConsignor: (isImport ? ewayBill.consigneePlace : ewayBill.consignorPlace) || "",
      stateOfConsignor: (isImport ? ewayBill.consigneeState : ewayBill.consignorState) || "",
      placeOfConsignee: ewayBill.consigneePlace || "",
      stateOfConsignee: ewayBill.consigneeState || "",
      reasonCode: "due to break down",
      reasonText: "",
      modeOfTransport: "1",
    });
    setRejectForm({ userGstin: ewayBill.consigneeGstin || "", rejectReason: "" });
    setError(null);
    setMvData(null);
    setShowAddVehicleForm(false);
    // Auto-populate Doc No & Doc Date from the EWB record
    setAddVehicleForm({
      vehicleNumber: "",
      transporterDocNo: ewayBill.transporterDocNumber || ewayBill.transporterDocNo || "",
      transporterDocDate: ewayBill.transporterDocDate || "",
      quantity: "",
      modeOfTransport: "1",
      vehicleType: "r",
    });

    // Compute regulatory time windows
    const genTime = ewayBill.generatedAt || ewayBill.ewbDate || ewayBill.createdAt;
    const cancelWindow = checkCancellationWindow(genTime);
    const rejectWindow = checkRejectionWindow(genTime);
    setCancelWindowOpen(cancelWindow.withinWindow);
    setCancelHoursElapsed(cancelWindow.hoursElapsed);
    setRejectWindowOpen(rejectWindow.withinWindow);
    setRejectHoursElapsed(rejectWindow.hoursElapsed);
  }, [open, ewayBill]);

  // When user opens "Consolidate/Multi" tab, fetch data
  useEffect(() => {
    if (activeTab === 3 && open && ewayBill?._id) {
      fetchMvData();
    }
  }, [activeTab, open, fetchMvData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError(null);
  };

  const handleUpdateVehicle = async () => {
    try {
      setLoading(true);
      const fieldErrors = {};

      if (!vehicleForm.vehicleNo) fieldErrors.vehicleNo = "Vehicle Number is required";
      
      // NEW: Validate vehicle number format
      const vnErr = validateVehicleNumber(vehicleForm.vehicleNo);
      if (vnErr) fieldErrors.vehicleNo = vnErr;

      if (!vehicleForm.fromPlace) fieldErrors.fromPlace = "From Place is required";

      const effectiveFromState = getStateCode(vehicleForm.fromState);
      if (!effectiveFromState) fieldErrors.fromState = "From State is required and must be a valid Indian state";

      const effectiveReasonCode = normalizeVehicleUpdateReasonCode(vehicleForm.reasonCode);
      if (!effectiveReasonCode) fieldErrors.reasonCode = "Reason for vehicle update is required";

      if (Object.keys(fieldErrors).length > 0) {
        setError("Please complete all required fields before updating vehicle.");
        setLoading(false);
        return;
      }

      const payload = {
        ewayBillNo: ewayBill.ewbNo,
        vehicleNo: vehicleForm.vehicleNo,
        fromPlace: vehicleForm.fromPlace,
        fromState: effectiveFromState,
        reasonCode: effectiveReasonCode,
        reason_code_for_vehicle_updation: effectiveReasonCode,
        reasonText: vehicleForm.reasonText,
        modeOfTransport: vehicleForm.modeOfTransport,
        vehicleType: vehicleForm.vehicleType,
        transporterDocNo: vehicleForm.transporterDocNo,
        transporterDocDate: vehicleForm.transporterDocDate,
        stateOfConsignor: effectiveFromState,
        userGstin: ewayBill.userGstin || ewayBill.consignorGstin,
      };

      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/update-vehicle`, payload);
      if (response.data.success) {
        Swal.fire("Success", "Vehicle Details Updated", "success");
        onSuccess(response.data.data);
        onClose();
      }
    } catch (err) {
      const parsedMsg = parseNicErrorMessage(err.response?.data?.message || err.message);
      setError(parsedMsg);
      Swal.fire("Error", parsedMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTransporter = async () => {
    try {
      setLoading(true);
      if (!transporterForm.transporterId) throw new Error("Transporter ID is required");
      const payload = {
        ewayBillNo: ewayBill.ewbNo,
        transporterId: transporterForm.transporterId,
        userGstin: ewayBill.userGstin || ewayBill.consignorGstin,
      };
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/update-transporter`, payload);
      if (response.data.success) {
        Swal.fire("Success", "Transporter Updated", "success");
        onSuccess(response.data.data);
        onClose();
      }
    } catch (err) {
      const parsedMsg = parseNicErrorMessage(err.response?.data?.message || err.message);
      setError(parsedMsg);
      Swal.fire("Error", parsedMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExtendValidity = async () => {
    try {
      setLoading(true);
      const payload = {
        ewayBillNo: ewayBill.ewbNo,
        vehicleNo: extendForm.vehicleNo,
        currentPlace: extendForm.currentPlace,
        currentState: extendForm.currentState,
        currentPincode: extendForm.currentPincode,
        remainingDistance: extendForm.remainingDistance,
        reason: extendForm.reason,
        remarks: extendForm.remarks,
        modeOfTransport: extendForm.modeOfTransport,
        consignmentStatus: extendForm.consignmentStatus,
        transitType: extendForm.transitType,
        address1: extendForm.address1,
        address2: extendForm.address2,
        address3: extendForm.address3,
        userGstin: ewayBill.userGstin || ewayBill.consignorGstin,
      };
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/extend-validity`, payload);
      if (response.data.success) {
        Swal.fire("Success", "Validity Extended", "success");
        onSuccess(response.data.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setLoading(true);
      const payload = {
        ewayBillNo: ewayBill.ewbNo,
        cancelReason: cancelForm.cancelReason,
        cancelRemark: cancelForm.cancelRemark || "Cancelled by user",
        userGstin: ewayBill.userGstin || ewayBill.consignorGstin,
      };
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/cancel`, payload);
      if (response.data.success) {
        Swal.fire("Success", "E-Way Bill Cancelled", "success");
        onSuccess(response.data.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateMultiVehicle = async () => {
    try {
      setLoading(true);
      if (!multiVehicleForm.totalQuantity) throw new Error("Total Quantity is required");
      const payload = {
        ewayBillId: ewayBill._id,
        ewayBillNo: ewayBill.ewbNo,
        ...multiVehicleForm,
        stateOfConsignor: getStateCode(multiVehicleForm.stateOfConsignor) || multiVehicleForm.stateOfConsignor,
        stateOfConsignee: getStateCode(multiVehicleForm.stateOfConsignee) || multiVehicleForm.stateOfConsignee,
        userGstin: ewayBill.userGstin || ewayBill.consignorGstin,
      };
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/initiate`, payload);
      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Multi-Vehicle Initiated",
          html: `Group No: <strong>${response.data.data?.groupNo || "Created"}</strong>. You can now add vehicles to this group.`,
        });
        onSuccess(response.data.data);
        // Refresh data
        await fetchMvData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicleToGroup = async () => {
    try {
      setLoading(true);
      if (!addVehicleForm.vehicleNumber) throw new Error("Vehicle number is required");

      // NEW: Validate vehicle number format
      const vnErr = validateVehicleNumber(addVehicleForm.vehicleNumber);
      if (vnErr) throw new Error(vnErr);

      if (!addVehicleForm.quantity || parseFloat(addVehicleForm.quantity) <= 0) throw new Error("Quantity is required");

      const payload = {
        ewayBillId: ewayBill._id,
        ewayBillNo: ewayBill.ewbNo,
        groupNo: selectedGroupNo !== "NEW" ? selectedGroupNo : (mvData?.multiVehicleGroup?.groupNo || ""),
        userGstin: ewayBill.userGstin || ewayBill.consignorGstin,
        ...addVehicleForm,
      };
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/add-vehicle`, payload);
      if (response.data.success) {
        Swal.fire("Success", `Vehicle ${addVehicleForm.vehicleNumber} added to group successfully`, "success");
        setAddVehicleForm({ vehicleNumber: "", transporterDocNo: "", transporterDocDate: "", quantity: "", modeOfTransport: "1" });
        setShowAddVehicleForm(false);
        // Update local state with new list
        setMvData((prev) => ({
          ...prev,
          multiVehicleList: response.data.data?.multiVehicleList || prev.multiVehicleList,
        }));
        onSuccess(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      if (!rejectForm.userGstin) throw new Error("Consignee GSTIN is required");
      const payload = {
        ewayBillId: ewayBill._id,
        ewayBillNo: ewayBill.ewbNo,
        ...rejectForm,
      };
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/reject`, payload);
      if (response.data.success) {
        Swal.fire("Rejected", "E-Way Bill Rejected Successfully", "success");
        onSuccess(response.data.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Determine if multi-vehicle is already initiated (from DB or from local fetch)
  const isMultiInitiated =
    ewayBill?.isMultiVehicle || (mvData && mvData.isMultiVehicle);
  const multiVehicleGroups = mvData?.multiVehicleGroups?.length ? mvData.multiVehicleGroups : (mvData?.multiVehicleGroup ? [mvData.multiVehicleGroup] : []);
  
  const groupInfo = selectedGroupNo !== "NEW" 
    ? multiVehicleGroups.find(g => g.groupNo === selectedGroupNo) 
    : null;

  const vehicleList = (mvData?.multiVehicleList || []).filter(v => !v.groupNo || v.groupNo === selectedGroupNo);
  const vehicleUpdateHistory = mvData?.vehicleUpdateHistory || [];

  // Compute remaining quantity for the active group
  const totalGroupQty = parseFloat(groupInfo?.totalQuantity) || 0;
  const usedGroupQty = vehicleList.reduce((s, v) => s + (parseFloat(v.quantity) || 0), 0);
  const remainingGroupQty = totalGroupQty - usedGroupQty;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth disableEnforceFocus>
      <DialogTitle>
        Actions for EWB: {ewayBill?.ewbNo}
        <Typography variant="caption" display="block" color="text.secondary">
          Status: {ewayBill?.ewbStatus} | Valid Upto:{" "}
          {ewayBill?.validUpto ? new Date(ewayBill.validUpto).toLocaleDateString() : "N/A"}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="ewb actions">
            <Tab label="Update Vehicle" />
            <Tab label="Transporter" />
            <Tab label="Extend" />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Multi-Vehicle
                  {isMultiInitiated && (
                    <Chip label="Active" size="small" color="success" sx={{ height: 16, fontSize: "0.65rem" }} />
                  )}
                </Box>
              }
            />
            <Tab label="Reject" color="warning" />
            <Tab label="Cancel" sx={{ color: "#d32f2f" }} />
            <Tab label="Preview PDF" sx={{ color: "#1976d2" }} />
          </Tabs>
        </Box>

        {/* TAB 0: Update Vehicle */}
        <TabPanel value={activeTab} index={0}>
          {/* Address Info Header */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "#f8f9fa", borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>From</Typography>
                <Typography variant="body2" sx={{ fontSize: "0.75rem", lineHeight: 1.2 }}>
                  {ewayBill.consignorName}, {ewayBill.consignorAddress1}, {ewayBill.consignorPlace}, {ewayBill.consignorPincode}, {ewayBill.consignorState}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>To</Typography>
                <Typography variant="body2" sx={{ fontSize: "0.75rem", lineHeight: 1.2 }}>
                  {ewayBill.consigneeName}, {ewayBill.consigneeAddress1}, {ewayBill.consigneePlace}, {ewayBill.consigneePincode}, {ewayBill.consigneeState}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="subtitle2" sx={{ bgcolor: "#e8eff9", p: 0.5, px: 1, mb: 1.5, fontWeight: 700, color: "#1976d2", borderRadius: 0.5 }}>
            Update Part-B
          </Typography>

          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Mode Of Transport</Typography>
              <Box sx={{ display: "flex", gap: 3 }}>
                {[
                  { value: "1", label: "Road" },
                  { value: "2", label: "Rail" },
                  { value: "3", label: "Air" },
                  { value: "4", label: "Ship or Ship Cum Road/Rail" },
                ].map((m) => (
                  <Box key={m.value} sx={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="radio"
                      id={`mode-${m.value}`}
                      name="modeOfTransport"
                      value={m.value}
                      checked={vehicleForm.modeOfTransport === m.value}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, modeOfTransport: e.target.value })}
                      style={{ marginRight: "6px", cursor: "pointer" }}
                    />
                    <label htmlFor={`mode-${m.value}`} style={{ fontSize: "0.85rem", cursor: "pointer" }}>{m.label}</label>
                  </Box>
                ))}
              </Box>
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Vehicle No *"
                fullWidth
                size="small"
                value={vehicleForm.vehicleNo}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNo: e.target.value.toUpperCase() })}
                placeholder="e.g. TM1234"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Place of Change *"
                fullWidth
                size="small"
                value={vehicleForm.fromPlace}
                onChange={(e) => setVehicleForm({ ...vehicleForm, fromPlace: e.target.value })}
                placeholder="e.g. HANGAL"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="From State *"
                fullWidth
                size="small"
                value={vehicleForm.fromState}
                onChange={(e) => setVehicleForm({ ...vehicleForm, fromState: e.target.value })}
                placeholder="e.g. GUJARAT or OTHER COUNTRY"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Reason *"
                select
                fullWidth
                size="small"
                value={vehicleForm.reasonCode}
                onChange={(e) => setVehicleForm({ ...vehicleForm, reasonCode: e.target.value })}
              >
                <MenuItem value="1">Transshipment</MenuItem>
                <MenuItem value="2">Due to Break Down</MenuItem>
                <MenuItem value="3">Others</MenuItem>
                <MenuItem value="4">First Time Update</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Vehicle Type *"
                select
                fullWidth
                size="small"
                value={vehicleForm.vehicleType}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
              >
                <MenuItem value="r">Regular</MenuItem>
                <MenuItem value="o">ODC (Over Dimension Cargo)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="Transporter Doc. No."
                  fullWidth
                  size="small"
                  value={vehicleForm.transporterDocNo}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, transporterDocNo: e.target.value })}
                  placeholder="Doc Number"
                />
                <TextField
                  label="Doc Date"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={vehicleForm.transporterDocDate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, transporterDocDate: e.target.value })}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Remarks (Optional)"
                fullWidth
                size="small"
                value={vehicleForm.reasonText}
                onChange={(e) => setVehicleForm({ ...vehicleForm, reasonText: e.target.value })}
                inputProps={{ maxLength: 50 }}
                helperText={`${vehicleForm.reasonText?.length || 0}/50 characters`}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 2 }}>
            <Button variant="contained" onClick={handleUpdateVehicle} disabled={loading} sx={{ minWidth: 120, bgcolor: "#1976d2" }}>
              Submit
            </Button>
            <Button variant="contained" onClick={onClose} sx={{ minWidth: 100, bgcolor: "#d32f2f", "&:hover": { bgcolor: "#c62828" } }}>
              Exit
            </Button>
          </Box>
        </TabPanel>

        {/* TAB 1: Transporter */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="New Transporter ID"
                fullWidth
                value={transporterForm.transporterId}
                onChange={(e) => setTransporterForm({ ...transporterForm, transporterId: e.target.value.toUpperCase() })}
                placeholder="15-digit GSTIN"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button variant="contained" onClick={handleUpdateTransporter} disabled={loading}>
              Update Transporter
            </Button>
          </Box>
        </TabPanel>

        {/* TAB 2: Extend Validity */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Current Pincode"
                fullWidth
                value={extendForm.currentPincode}
                onChange={(e) => setExtendForm({ ...extendForm, currentPincode: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Remaining Distance (Km)"
                fullWidth
                type="number"
                value={extendForm.remainingDistance}
                onChange={(e) => setExtendForm({ ...extendForm, remainingDistance: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Current Place"
                fullWidth
                value={extendForm.currentPlace}
                onChange={(e) => setExtendForm({ ...extendForm, currentPlace: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Current State"
                fullWidth
                value={extendForm.currentState}
                onChange={(e) => setExtendForm({ ...extendForm, currentState: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Extension Reason"
                select
                fullWidth
                value={extendForm.reason}
                onChange={(e) => setExtendForm({ ...extendForm, reason: e.target.value })}
              >
                <MenuItem value="1">Natural Calamity</MenuItem>
                <MenuItem value="2">Law and Order Situation</MenuItem>
                <MenuItem value="4">Transshipment</MenuItem>
                <MenuItem value="5">Accident</MenuItem>
                <MenuItem value="99">Others</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Reason/Remarks"
                fullWidth
                value={extendForm.remarks}
                onChange={(e) => setExtendForm({ ...extendForm, remarks: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label="Consignment Status *"
                select
                fullWidth
                size="small"
                value={extendForm.consignmentStatus}
                onChange={(e) => setExtendForm({ ...extendForm, consignmentStatus: e.target.value })}
              >
                <MenuItem value="M">In Movement (On Vehicle)</MenuItem>
                <MenuItem value="T">In Transit (In Warehouse)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Transit Type"
                select
                fullWidth
                size="small"
                value={extendForm.transitType}
                onChange={(e) => setExtendForm({ ...extendForm, transitType: e.target.value })}
                disabled={extendForm.consignmentStatus === "M"}
              >
                <MenuItem value="R">Road</MenuItem>
                <MenuItem value="W">Warehouse</MenuItem>
                <MenuItem value="O">Others</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block", color: "#666" }}>Current Location Address</Typography>
                <Grid container spacing={1}>
                    <Grid item xs={4}>
                        <TextField label="Line 1" fullWidth size="small" value={extendForm.address1} onChange={(e) => setExtendForm({ ...extendForm, address1: e.target.value })} />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField label="Line 2" fullWidth size="small" value={extendForm.address2} onChange={(e) => setExtendForm({ ...extendForm, address2: e.target.value })} />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField label="Line 3" fullWidth size="small" value={extendForm.address3} onChange={(e) => setExtendForm({ ...extendForm, address3: e.target.value })} />
                    </Grid>
                </Grid>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button variant="contained" onClick={handleExtendValidity} disabled={loading}>
              Extend Validity
            </Button>
          </Box>
        </TabPanel>

        {/* TAB 3: Multi-Vehicle Movement */}
        <TabPanel value={activeTab} index={3}>
          {mvLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {multiVehicleGroups.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Multi-Vehicle Operation"
                    value={selectedGroupNo}
                    onChange={(e) => {
                      setSelectedGroupNo(e.target.value);
                      setShowAddVehicleForm(false);
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "#f3e5f5",
                        "& fieldset": { borderColor: "#ce93d8", borderWidth: 1 },
                      },
                    }}
                  >
                    <MenuItem value="NEW">Initiate New Movement</MenuItem>
                    {multiVehicleGroups.map((g) => (
                      <MenuItem key={g.groupNo} value={g.groupNo}>
                        Group: {g.groupNo} - {g.placeOfConsignor} to {g.placeOfConsignee}, {g.totalQuantity} {g.unitCode}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              )}

              {selectedGroupNo === "NEW" || multiVehicleGroups.length === 0 ? (
                <>
              <Alert severity="info" sx={{ mb: 2, fontSize: "0.75rem", py: 0.5 }}>
                <strong>NOTE:</strong> THIS OPTION WILL ALLOW YOU TO MOVE THE GOODS IN MULTIPLE VEHICLES FOR THE SELECTED EWAYBILL. THE TOTAL QUANTITY TO BE MOVED IN ALL VEHICLES CANNOT EXCEED QUANTITY MENTIONED IN THIS FORM.
              </Alert>
              <Paper variant="outlined" sx={{ p: 2, border: "1px solid #ccc" }}>
                <Typography variant="subtitle2" sx={{ bgcolor: "#e1bee7", p: 0.5, px: 1, mb: 1.5, fontWeight: 700, color: "#7b1fa2", textAlign: "center", borderRadius: 0.5 }}>
                  Multiple Vehicle Movement Details
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#d32f2f" }}>Mode Of Transport *</Typography>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        {[
                          { value: "1", label: "Road" },
                          { value: "2", label: "Rail" },
                          { value: "3", label: "Air" },
                          { value: "4", label: "Ship" },
                        ].map((m) => (
                          <Box key={m.value} sx={{ display: "flex", alignItems: "center" }}>
                            <input
                              type="radio"
                              id={`mv-mode-${m.value}`}
                              name="mvModeOfTransport"
                              value={m.value}
                              checked={multiVehicleForm.modeOfTransport === m.value}
                              onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, modeOfTransport: e.target.value })}
                              style={{ marginRight: "4px", cursor: "pointer" }}
                            />
                            <label htmlFor={`mv-mode-${m.value}`} style={{ fontSize: "0.8rem", cursor: "pointer" }}>{m.label}</label>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <TextField label="From Place *" fullWidth size="small" value={multiVehicleForm.placeOfConsignor} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, placeOfConsignor: e.target.value })} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="From State *" select fullWidth size="small" value={multiVehicleForm.stateOfConsignor} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, stateOfConsignor: e.target.value })}>
                      {INDIAN_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="To Place *" fullWidth size="small" value={multiVehicleForm.placeOfConsignee} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, placeOfConsignee: e.target.value })} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="To State *" select fullWidth size="small" value={multiVehicleForm.stateOfConsignee} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, stateOfConsignee: e.target.value })}>
                      {INDIAN_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <TextField label="Total Quantity *" fullWidth size="small" type="number" value={multiVehicleForm.totalQuantity} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, totalQuantity: e.target.value })} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Unit *" select fullWidth size="small" value={multiVehicleForm.unitCode} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, unitCode: e.target.value })}>
                      {["NOS", "KGS", "BOX", "PCS", "TON", "BAGS", "BTL", "CRT", "CAN", "MLT", "MTR", "SQM", "SQF", "CUM", "UGS"].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                    </TextField>
                  </Grid>

                  <Grid item xs={6}>
                    <TextField label="Reason *" select fullWidth size="small" value={multiVehicleForm.reasonCode} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, reasonCode: e.target.value })}>
                      <MenuItem value="duetobreakdown">Break Down</MenuItem>
                      <MenuItem value="transshipment">Transshipment</MenuItem>
                      <MenuItem value="others">Others</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Remarks *" fullWidth size="small" value={multiVehicleForm.reasonText} onChange={(e) => setMultiVehicleForm({ ...multiVehicleForm, reasonText: e.target.value })} placeholder="Enter Remarks" inputProps={{ maxLength: 50 }} helperText={`${multiVehicleForm.reasonText?.length || 0}/50 characters`} />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 2 }}>
                  <Button variant="contained" onClick={handleInitiateMultiVehicle} disabled={loading} sx={{ minWidth: 100, bgcolor: "#3f51b5" }}>
                    Submit
                  </Button>
                  <Button variant="contained" onClick={onClose} sx={{ minWidth: 100, bgcolor: "#d32f2f", "&:hover": { bgcolor: "#c62828" } }}>
                    Exit
                  </Button>
                </Box>

                <Typography variant="caption" sx={{ display: "block", mt: 2, textAlign: "center", color: "#1976d2", fontWeight: 700, bgcolor: "#e3f2fd", p: 0.5, border: "1px dashed #1976d2" }}>
                  Note*: After submission enter the vehicle details in "Update PART B (Vehicle)" option
                </Typography>
              </Paper>
            </>
          ) : (
            <>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: "#f0f7ff", borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={700}>Multi-Vehicle Group: {groupInfo?.groupNo}</Typography>
                <Typography variant="caption">Total {groupInfo?.totalQuantity} {groupInfo?.unitCode} | From {groupInfo?.placeOfConsignor} To {groupInfo?.placeOfConsignee}</Typography>
                {totalGroupQty > 0 && (
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ mt: 0.5, color: remainingGroupQty <= 0 ? "error.main" : "success.dark", fontWeight: 700 }}
                  >
                    Used: {usedGroupQty} | Remaining: {remainingGroupQty} {groupInfo?.unitCode}
                  </Typography>
                )}
              </Paper>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() => setShowAddVehicleForm(p => !p)}
                  disabled={remainingGroupQty <= 0 && totalGroupQty > 0}
                >
                  {showAddVehicleForm ? "Cancel" : "Add Vehicle Record"}
                </Button>
                <Collapse in={showAddVehicleForm}>
                  <Paper sx={{ p: 2, mt: 1 }} variant="outlined">
                    <Grid container spacing={2}>
                      <Grid item xs={6}><TextField label="Vehicle No *" fullWidth size="small" value={addVehicleForm.vehicleNumber} onChange={e => setAddVehicleForm({...addVehicleForm, vehicleNumber: e.target.value.toUpperCase()})} /></Grid>
                  <Grid item xs={6}><TextField label="Qty *" fullWidth size="small" type="number" value={addVehicleForm.quantity} onChange={e => setAddVehicleForm({...addVehicleForm, quantity: e.target.value})}
                    helperText={totalGroupQty > 0 ? `Remaining: ${remainingGroupQty} ${groupInfo?.unitCode || ""}` : ""}
                    inputProps={{ max: remainingGroupQty > 0 ? remainingGroupQty : undefined }}
                  /></Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Vehicle Type *"
                      select
                      fullWidth
                      size="small"
                      value={addVehicleForm.vehicleType}
                      onChange={(e) => setAddVehicleForm({ ...addVehicleForm, vehicleType: e.target.value })}
                    >
                      <MenuItem value="r">Regular</MenuItem>
                      <MenuItem value="o">ODC (Over Dimension Cargo)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Mode *"
                      select
                      fullWidth
                      size="small"
                      value={addVehicleForm.modeOfTransport}
                      onChange={(e) => setAddVehicleForm({ ...addVehicleForm, modeOfTransport: e.target.value })}
                    >
                      <MenuItem value="1">Road</MenuItem>
                      <MenuItem value="2">Rail</MenuItem>
                      <MenuItem value="3">Air</MenuItem>
                      <MenuItem value="4">Ship</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}><TextField label="Doc No" fullWidth size="small" value={addVehicleForm.transporterDocNo} onChange={e => setAddVehicleForm({...addVehicleForm, transporterDocNo: e.target.value})} /></Grid>
                  <Grid item xs={6}><TextField label="Doc Date" type="date" fullWidth size="small" InputLabelProps={{shrink:true}} value={addVehicleForm.transporterDocDate} onChange={e => setAddVehicleForm({...addVehicleForm, transporterDocDate: e.target.value})} /></Grid>
                </Grid>
                    <Button onClick={handleAddVehicleToGroup} variant="contained" color="success" fullWidth size="small" sx={{ mt: 1.5 }}>Submit Vehicle Entry</Button>
                  </Paper>
                </Collapse>
              </Box>
              {vehicleList.length > 0 && (
                <Table size="small">
                  <TableHead><TableRow sx={{ bgcolor: "#eee" }}><TableCell sx={{py:0.5}}>Vehicle</TableCell><TableCell sx={{py:0.5}}>Qty</TableCell><TableCell sx={{py:0.5}}>Doc</TableCell></TableRow></TableHead>
                  <TableBody>
                    {vehicleList.map((v, i) => (
                      <TableRow key={i}><TableCell>{v.vehicleNumber}</TableCell><TableCell>{v.quantity}</TableCell><TableCell>{v.transporterDocNo}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
          </>
        )}
        </TabPanel>

        {/* TAB 4: Reject */}
        <TabPanel value={activeTab} index={4}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Note: Only the consignee (recipient) can reject an E-Way Bill.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Your GSTIN (Consignee)"
                fullWidth
                value={rejectForm.userGstin}
                onChange={(e) => setRejectForm({ ...rejectForm, userGstin: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Reject Reason"
                fullWidth
                multiline
                rows={2}
                value={rejectForm.rejectReason}
                onChange={(e) => setRejectForm({ ...rejectForm, rejectReason: e.target.value })}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            {rejectWindowOpen ? (
              <Button variant="contained" color="warning" onClick={handleReject} disabled={loading}>
                Reject E-Way Bill
              </Button>
            ) : (
              <Alert severity="error" sx={{ width: "100%", fontSize: "0.82rem" }}>
                <strong>Rejection window expired.</strong> E-Way Bills can only be rejected within <strong>72 hours</strong> of generation. This EWB was generated {rejectHoursElapsed.toFixed(1)} hours ago.
              </Alert>
            )}
          </Box>
        </TabPanel>

        {/* TAB 5: Cancel */}
        <TabPanel value={activeTab} index={5}>
          {!cancelWindowOpen ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>Cancellation window expired.</strong> E-Way Bills can only be cancelled within <strong>24 hours</strong> of generation. This EWB was generated {cancelHoursElapsed.toFixed(1)} hours ago and can no longer be cancelled through the portal.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Warning: Cancellation is irreversible and must be done within 24 hours of generation.
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Cancel Reason"
                select
                fullWidth
                value={cancelForm.cancelReason}
                onChange={(e) => setCancelForm({ ...cancelForm, cancelReason: e.target.value })}
                disabled={!cancelWindowOpen}
              >
                <MenuItem value="Duplicate">Duplicate</MenuItem>
                <MenuItem value="Order Cancelled">Order Cancelled</MenuItem>
                <MenuItem value="Data Entry Error">Data Entry Error</MenuItem>
                <MenuItem value="others">Others</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Remarks"
                fullWidth
                value={cancelForm.cancelRemark}
                onChange={(e) => setCancelForm({ ...cancelForm, cancelRemark: e.target.value })}
                disabled={!cancelWindowOpen}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              sx={{ bgcolor: "#d32f2f", "&:hover": { bgcolor: "#b71c1c" } }}
              onClick={handleCancel}
              disabled={loading || !cancelWindowOpen}
            >
              Cancel E-Way Bill
            </Button>
          </Box>
        </TabPanel>

        {/* TAB 6: Preview PDF */}
        <TabPanel value={activeTab} index={6}>
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              E-Way Bill PDF Preview
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
              Click the button below to view the E-Way Bill PDF in a new tab
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => window.open(`https://ewbapi.mastersindia.co/ewb/print/${ewayBill.ewbNo}`, '_blank')}
              sx={{ minWidth: 200 }}
            >
              View PDF
            </Button>
          </Box>
        </TabPanel>

        {/* Persistent Vehicle Updation History (Matches Screenshot Columns) */}
        {(vehicleUpdateHistory.length > 0 || vehicleList.length > 0) && (
          <Box sx={{ mt: 2, p: 2, borderTop: "2px solid #eee" }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: "#7b1fa2", textAlign: "center" }}>
              ..: Vehicle Updation History :..
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", py: 0.5 }}>Trans Mode</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", py: 0.5 }}>Vehicle No/Trans Doc No</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", py: 0.5 }}>From Place</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", py: 0.5 }}>Updated By/Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", py: 0.5 }}>Cons.EWB No.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Regular Updates */}
                {vehicleUpdateHistory.map((h, i) => (
                  <TableRow key={`h-${i}`}>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}>{TRANSPORT_MODE_MAP[h.modeOfTransport] || "Road"}</TableCell>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}><strong>{h.newVehicle}</strong><br/>{h.transporterDocNo}</TableCell>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}>{h.fromPlace}</TableCell>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}>{h.updatedAt ? new Date(h.updatedAt).toLocaleString("en-IN") : "—"}</TableCell>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}>{h.apiResponse?.cewbNo || "NA"}</TableCell>
                  </TableRow>
                ))}
                {/* Multi-Vehicle Updates */}
                {vehicleList.map((h, i) => (
                  <TableRow key={`mv-${i}`}>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}>{TRANSPORT_MODE_MAP[h.modeOfTransport] || "Road"}</TableCell>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}><strong>{h.vehicleNumber}</strong><br/>{h.transporterDocNo}</TableCell>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}>{groupInfo?.placeOfConsignor}</TableCell>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}>{h.addedAt ? new Date(h.addedAt).toLocaleString("en-IN") : "—"}</TableCell>
                    <TableCell sx={{ fontSize: "0.7rem", py: 0.5 }}>{h.apiResponse?.cewbNo || "NA"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EwayBillActionModal;
