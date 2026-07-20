import React, { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  DialogActions,
  Paper,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import GetAppIcon from "@mui/icons-material/GetApp";
import DownloadIcon from "@mui/icons-material/Download";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CaptureRates from "./CaptureRates";
import FreightQuotation from "./FreightQuotation";
import FreightTrackingMap from "./FreightTrackingMap";
import BackButton from "../BackButton";
import "../../styles/freight-forwarding.scss";

const API = process.env.REACT_APP_API_STRING;

const THEME = {
  blue: "#16408f",
  border: "#cbd5e1",
};

// --- Style namespace used by CFreightForwarding ---
const s = {
  wrapper: {
    padding: 0,
    backgroundColor: "#f3f4f6",
    minHeight: "100vh",
  },
  toolbar: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
};

function DocsViewCell({ row }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);

  const getDocTypes = (shipmentType) => {
    switch (shipmentType) {
      case "Export-Sea":
        return [
          { label: "INVOICE", field: "invoice" },
          { label: "PACKING LIST", field: "packing_list" },
          { label: "BOOKING", field: "booking_copy" },
          { label: "LEO", field: "leo_copy" },
          { label: "GATE PASS", field: "gate_pass" },
          { label: "HBL", field: "hbl_copy" },
          { label: "MBL", field: "mbl_copy" },
          { label: "AGENT INVOICE", field: "agent_invoice" },
          { label: "OTHER", field: "other_copy" },
        ];
      case "Export-Air":
        return [
          { label: "INVOICE", field: "invoice" },
          { label: "PACKING LIST", field: "packing_list" },
          { label: "BOOKING", field: "booking_copy" },
          { label: "LEO", field: "leo_copy" },
          { label: "HAWB", field: "hawb_copy" },
          { label: "MAWB", field: "mawb_copy" },
          { label: "AGENT INVOICE", field: "agent_invoice" },
          { label: "OTHER", field: "other_copy" },
        ];
      case "Import-Sea":
        return [
          { label: "INVOICE", field: "invoice" },
          { label: "PACKING LIST", field: "packing_list" },
          { label: "HBL", field: "hbl_copy" },
          { label: "MBL", field: "mbl_copy" },
          { label: "DO", field: "do_copy" },
          { label: "AGENT INVOICE", field: "agent_invoice" },
          { label: "OTHER", field: "other_copy" },
        ];
      case "Import-Air":
        return [
          { label: "INVOICE", field: "invoice" },
          { label: "PACKING LIST", field: "packing_list" },
          { label: "HAWB", field: "hawb_copy" },
          { label: "MAWB", field: "mawb_copy" },
          { label: "DO", field: "do_copy" },
          { label: "AGENT INVOICE", field: "agent_invoice" },
          { label: "OTHER", field: "other_copy" },
        ];
      default:
        return [
          { label: "INVOICE", field: "invoice" },
          { label: "PACKING LIST", field: "packing_list" },
          { label: "LEO", field: "leo_copy" },
          { label: "BILL OF LADING", field: "bill_of_lading" },
        ];
    }
  };

  const docs = row.documents || {};
  const docTypes = getDocTypes(row.shipment_type);
  const uploadedCount = Object.keys(docs).filter((k) => docTypes.some((dt) => dt.field === k) && docs[k]).length;

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "center" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        className={`ff-docs-btn${uploadedCount > 0 ? "" : " is-empty"}`}
      >
        <DescriptionIcon style={{ fontSize: 14 }} />
        {uploadedCount > 0 ? `Docs (${uploadedCount})` : "Docs"}
      </button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          style: {
            maxHeight: 350,
            width: 220,
            borderRadius: 3,
            boxShadow: "0 1px 5px rgba(0,0,0,0.1)",
            border: "1px solid #cbd5e1",
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{
            px: 2,
            pt: 1,
            fontWeight: 800,
            color: "#64748b",
            display: "block",
            borderBottom: "1px solid #f3f4f6",
            mb: 1,
          }}
        >
          DOCUMENTS (VIEW ONLY)
        </Typography>

        {row.saved_quotation && (
          <MenuItem
            sx={{ display: "flex", justifyContent: "space-between", py: 1, px: 2, backgroundColor: "#ecfdf5" }}
            onClick={(e) => {
              e.stopPropagation();
              setShowQuoteDialog(true);
              setAnchorEl(null);
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#047857" }}>QUOTATION</span>
            <DownloadIcon sx={{ fontSize: 16, color: "#047857" }} />
          </MenuItem>
        )}

        {docTypes.map((doc) => (
          <MenuItem key={doc.field} sx={{ display: "flex", justifyContent: "space-between", py: 1, px: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#334155" }}>{doc.label}</span>
            {docs[doc.field] ? (
              <Tooltip title="View">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(docs[doc.field], "_blank");
                  }}
                  sx={{ color: "#059669", p: 0.5 }}
                >
                  <GetAppIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            ) : (
              <span style={{ fontSize: 10, color: "#94a3b8" }}>N/A</span>
            )}
          </MenuItem>
        ))}
      </Menu>

      {showQuoteDialog && row.saved_quotation && (
        <Dialog
          open={showQuoteDialog}
          onClose={() => setShowQuoteDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ style: { borderRadius: 6, overflow: "hidden" } }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#16408f",
              color: "#fff",
              py: 1.5,
              px: 3,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Saved Quotation - {row.enquiry_no}
            </Typography>
            <IconButton onClick={() => setShowQuoteDialog(false)} sx={{ color: "#fff" }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, backgroundColor: "#f3f4f6" }}>
            <FreightQuotation
              enquiry={row}
              selectedRate={row.saved_quotation}
              onBack={() => setShowQuoteDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CFreightForwarding() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDSRDialog, setOpenDSRDialog] = useState(false);
  const [dsrMode, setDsrMode] = useState("Export");
  const [dsrYear, setDsrYear] = useState(() => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    if (month < 3) return `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
    return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
  });
  const [dsrShipmentType, setDsrShipmentType] = useState("all");
  const [dsrStartDate, setDsrStartDate] = useState("");
  const [dsrEndDate, setDsrEndDate] = useState("");
  const [dsrLoading, setDsrLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "", shipment_type: "" });
  const [activeTab, setActiveTab] = useState("Pending");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [trackingEnquiry, setTrackingEnquiry] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [pipelineData, setPipelineData] = useState({});

  const enquiryCount = useMemo(() => rows.filter((r) => r.status === "Open").length, [rows]);
  const rejectedCount = useMemo(() => rows.filter((r) => r.status === "Rejected").length, [rows]);

  const visibleTabs = useMemo(() => {
    const tabs = [];
    if (enquiryCount > 0) tabs.push({ key: "Enquiry", count: enquiryCount });
    if (rejectedCount > 0) tabs.push({ key: "Rejected", count: rejectedCount });

    let pendingCount = 0;
    let draftBlCount = 0;
    let sboCount = 0;
    let billingCount = 0;
    let deliveryCount = 0;
    let completedCount = 0;

    rows.forEach((row) => {
      if (row.status !== "Converted") return;
      const jobId = row._id || row.enquiry_no;
      const pipe = pipelineData[jobId];

      if (pipe?.arrivalDate) {
        completedCount++;
      } else if (pipe?.agencyBillNo && pipe?.agencyBillDate && pipe?.reimbursementBillNo && pipe?.reimbursementBillDate) {
        deliveryCount++;
      } else if (pipe?.sboDate) {
        billingCount++;
      } else if (pipe?.draftApproved) {
        sboCount++;
      } else if (pipe?.draftUploaded) {
        draftBlCount++;
      } else {
        pendingCount++;
      }
    });

    tabs.push({ key: "Pending", count: pendingCount });
    tabs.push({ key: "Draft BL", count: draftBlCount });
    tabs.push({ key: "SBO", count: sboCount });
    tabs.push({ key: "Billing", count: billingCount });
    tabs.push({ key: "Delivery", count: deliveryCount });
    tabs.push({ key: "Completed", count: completedCount });

    return tabs;
  }, [enquiryCount, rejectedCount, rows, pipelineData]);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  useEffect(() => {
    if (rows.length === 0) return;
    const initialData = {};
    rows.forEach((row) => {
      const jobId = row._id || row.enquiry_no;
      initialData[jobId] = {
        draftUploaded: !!row.documents?.hbl_copy || !!row.documents?.booking_copy || !!row.documents?.draft_bl || !!row.saved_quotation,
        draftApproved: localStorage.getItem(`draft_bl_approved_${jobId}`) === "true",
        sboDate: row.shipped_on_board_date || "",
        agencyBillNo: row.billing_details?.agency_bill_no || "",
        agencyBillDate: row.billing_details?.agency_bill_date || "",
        reimbursementBillNo: row.billing_details?.reimbursement_bill_no || "",
        reimbursementBillDate: row.billing_details?.reimbursement_bill_date || "",
        arrivalDate: row.arrival_date || "",
      };
    });
    setPipelineData(initialData);
  }, [rows]);

  const updatePipelineValue = (jobId, key, value) => {
    if (key === "draftApproved") {
      localStorage.setItem(`draft_bl_approved_${jobId}`, String(value));
      setPipelineData((prev) => ({
        ...prev,
        [jobId]: {
          ...prev[jobId],
          draftApproved: value,
        },
      }));
    }
  };

  // If current tab has no data (hidden), switch to first visible tab
  useEffect(() => {
    if (loading) return;
    const keys = visibleTabs.map((t) => t.key);
    if (!keys.includes(activeTab)) {
      setActiveTab(keys[0] || "Pending");
    }
  }, [visibleTabs, activeTab, loading]);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/freight-enquiries`, { withCredentials: true });
      if (res.data.success) setRows(res.data.data || []);
    } catch (error) {
      console.error("Error fetching enquiries:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (activeTab === "Enquiry" && row.status !== "Open") return false;
      if (activeTab === "Rejected" && row.status !== "Rejected") return false;

      // Pipeline tabs filter
      if (row.status !== "Converted" && ["Pending", "Draft BL", "SBO", "Billing", "Delivery", "Completed"].includes(activeTab)) {
        return false;
      }

      const jobId = row._id || row.enquiry_no;
      const pipe = pipelineData[jobId];

      if (activeTab === "Completed" && !pipe?.arrivalDate) return false;
      if (activeTab === "Delivery" && (!pipe?.agencyBillNo || !pipe?.agencyBillDate || !pipe?.reimbursementBillNo || !pipe?.reimbursementBillDate || pipe?.arrivalDate)) return false;
      if (activeTab === "Billing" && (!pipe?.sboDate || (pipe?.agencyBillNo && pipe?.agencyBillDate && pipe?.reimbursementBillNo && pipe?.reimbursementBillDate))) return false;
      if (activeTab === "SBO" && (!pipe?.draftApproved || pipe?.sboDate)) return false;
      if (activeTab === "Draft BL" && (!pipe?.draftUploaded || pipe?.draftApproved)) return false;
      if (activeTab === "Pending" && (pipe?.draftUploaded || pipe?.draftApproved || pipe?.sboDate || pipe?.arrivalDate)) return false;

      const needle = filters.search.trim().toUpperCase();
      const matchSearch =
        !needle ||
        [row.enquiry_no, row.success_no, row.rejected_no, row.organization_name, row.port_of_loading, row.port_of_destination]
          .filter(Boolean)
          .some((field) => String(field).toUpperCase().includes(needle));
      const matchShipment = !filters.shipment_type || row.shipment_type === filters.shipment_type;
      return matchSearch && matchShipment;
    });
  }, [rows, filters, activeTab, pipelineData]);

  const handleDownloadDSR = async () => {
    setDsrLoading(true);
    try {
      const response = await axios.get(`${API}/freight-forwarding/generate-dsr`, {
        params: {
          year: dsrYear,
          shipment_type: dsrShipmentType,
          startDate: dsrStartDate,
          endDate: dsrEndDate,
          mode: dsrMode,
        },
        responseType: "blob",
        withCredentials: true,
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      link.setAttribute("download", `Freight_Forwarding_${dsrMode}_DSR_${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setOpenDSRDialog(false);
    } catch (err) {
      console.error("Error downloading Freight Forwarding DSR:", err);
      alert("Failed to download DSR report");
    } finally {
      setDsrLoading(false);
    }
  };

  const handleRowClick = (row) => {
    setSelectedEnquiry(row);
  };

  const outlinedBtnSx = {
    borderColor: "#cbd5e1",
    color: "#475569",
    fontWeight: "700",
    textTransform: "none",
    borderRadius: "4px",
    height: 32,
    fontSize: "12px",
    px: 2,
    backgroundColor: "#ffffff",
    "&:hover": { borderColor: "#16408f", color: "#16408f", backgroundColor: "#eff6ff" },
  };

  return (
    <div style={s.wrapper}>
      <Paper
        elevation={0}
        sx={{
          borderBottom: "1px solid #e2e8f0",
          borderRadius: 0,
          bgcolor: "#fff",
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1, sm: 1.5 },
          pb: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: { xs: 1, sm: 2 },
            position: "relative",
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <BackButton />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "18px" }}>
              Freight Forwarding {filteredRows.length > 0 && <span style={{ color: "#64748b", fontWeight: 500, fontSize: "14px" }}>({filteredRows.length})</span>}
            </Typography>
            <Chip
              label="Beta"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setDsrMode("Import");
                setDsrShipmentType("all");
                setOpenDSRDialog(true);
              }}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12px",
                borderColor: "#cbd5e1",
                color: "#475569",
                borderRadius: "6px",
                bgcolor: "#fff",
                height: "32px",
                px: 2,
                "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" }
              }}
            >
              Import DSR
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setDsrMode("Export");
                setDsrShipmentType("all");
                setOpenDSRDialog(true);
              }}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12px",
                borderColor: "#cbd5e1",
                color: "#475569",
                borderRadius: "6px",
                bgcolor: "#fff",
                height: "32px",
                px: 2,
                "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" }
              }}
            >
              Export DSR
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: "4px", backgroundColor: "#fff" }}>
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: "12.5px",
                  fontWeight: isActive ? "700" : "600",
                  color: isActive ? "#16408f" : "#64748b",
                  borderBottom: isActive ? "3px solid #16408f" : "3px solid transparent",
                  backgroundColor: "transparent",
                  border: "none",
                  outline: "none",
                  marginBottom: "-1px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {tab.key}
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "10.5px",
                    fontWeight: "800",
                    backgroundColor: isActive ? "#16408f" : "#f1f5f9",
                    color: isActive ? "#ffffff" : "#64748b",
                    marginLeft: "4px",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </Box>
      </Paper>

      <Box sx={{ p: 2, maxWidth: "100%", overflow: "hidden" }}>
        <Box sx={s.toolbar}>
            <input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search by Enquiry No, Org, Port..."
              style={{
                height: "32px",
                padding: "0 10px",
                fontSize: "12px",
                border: searchFocused || filters.search ? "1px solid #16408f" : "1px solid #cbd5e1",
                borderRadius: "4px",
                outline: "none",
                color: filters.search ? "#16408f" : "#333",
                backgroundColor: filters.search ? "#eff6ff" : "#fff",
                fontWeight: filters.search ? "600" : "normal",
                flex: 1,
                maxWidth: "350px",
              }}
            />
            <select
              value={filters.shipment_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, shipment_type: e.target.value }))}
              style={{
                height: "32px",
                padding: "0 8px",
                fontSize: "12px",
                border: filters.shipment_type ? "1px solid #16408f" : "1px solid #cbd5e1",
                borderRadius: "4px",
                backgroundColor: filters.shipment_type ? "#eff6ff" : "#fff",
                color: filters.shipment_type ? "#16408f" : "#333",
                cursor: "pointer",
                fontWeight: "600",
                outline: "none",
              }}
            >
              <option value="">All Shipment Types</option>
              <option value="Import-Sea">Import - Sea</option>
              <option value="Export-Sea">Export - Sea</option>
              <option value="Import-Air">Import - Air</option>
              <option value="Export-Air">Export - Air</option>
            </select>
          </Box>

          <Box
            sx={{
              background: "#fff",
              border: "1px solid #cccccc",
              borderRadius: "3px",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              marginBottom: "20px",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#19448aff", color: "#fff" }}>
                    {[
                      ["Pending", "Draft BL", "SBO", "Billing", "Delivery", "Completed"].includes(activeTab)
                        ? "Job No"
                        : activeTab === "Rejected"
                          ? "Rejected No"
                          : "Enquiry No",
                      "Consignee Details",
                      "Port & Routing",
                      "Container & Cargo Details",
                      "Tracking & Timeline",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: h === "Actions" ? "center" : "left",
                          padding: "10px 8px",
                          fontWeight: "700",
                          fontSize: "12px",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "40px 24px", textAlign: "center", color: "#64748b" }}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredRows.length ? (
                    filteredRows.map((row) => (
                      <tr
                        key={row._id || row.enquiry_no}
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        onClick={() => handleRowClick(row)}
                      >
                        <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontWeight: "800", color: "#16408f", fontSize: "12px" }}>
                              {["Pending", "Draft BL", "SBO", "Billing", "Delivery", "Completed"].includes(activeTab)
                                ? row.success_no || row.enquiry_no
                                : activeTab === "Rejected"
                                  ? row.rejected_no || row.enquiry_no
                                  : row.enquiry_no}
                            </span>
                            <div style={{ color: "#64748b", fontSize: "10px" }}>Date: {row.enquiry_date}</div>
                            {row.source_job_no && (
                              <div
                                style={{
                                  color: "#334155",
                                  fontSize: "10px",
                                  fontWeight: "600",
                                  backgroundColor: "#f1f5f9",
                                  padding: "2px 4px",
                                  borderRadius: "3px",
                                  width: "fit-content",
                                }}
                              >
                                Ref Job: {row.source_job_no}
                              </div>
                            )}
                            {(row.shipment_ref_no || row.bl_details?.shipment_ref_no) && (
                              <div
                                style={{
                                  color: "#0f766e",
                                  fontSize: "10px",
                                  fontWeight: "600",
                                  backgroundColor: "#f0fdfa",
                                  padding: "2px 4px",
                                  borderRadius: "3px",
                                  width: "fit-content",
                                  border: "1px solid #99f6e4",
                                }}
                              >
                                Ref: {row.shipment_ref_no || row.bl_details?.shipment_ref_no}
                              </div>
                            )}
                            <span
                              style={{
                                fontSize: "9px",
                                fontWeight: "700",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                backgroundColor: "#eff6ff",
                                color: "#1e40af",
                                border: "1px solid #bfdbfe",
                                textTransform: "uppercase",
                                width: "fit-content",
                              }}
                            >
                              {row.shipment_type}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                          <div style={{ fontWeight: "700", fontSize: "12px", color: "#1e293b" }}>
                            Consignee: {row.consignee_name || row.bl_details?.consignee || row.organization_name || "-"}
                          </div>
                          {row.email && (
                            <div style={{ color: "#475569", fontSize: "10px", marginTop: 2 }}>
                              <span style={{ fontWeight: 600, color: "#64748b" }}>Email:</span> {row.email}
                            </div>
                          )}
                          {row.contact_no && (
                            <div style={{ color: "#475569", fontSize: "10px" }}>
                              <span style={{ fontWeight: 600, color: "#64748b" }}>Contact:</span> {row.contact_no}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <span style={{ fontWeight: 800, fontSize: "9px", color: "#64748b", width: 85 }}>
                                Place of Receipt:
                              </span>
                              <span style={{ fontSize: "11px", fontWeight: 700 }}>
                                {row.place_of_receipt || row.bl_details?.place_of_acceptance || "-"}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <span style={{ fontWeight: 800, fontSize: "9px", color: "#64748b", width: 85 }}>POL:</span>
                              <span style={{ fontSize: "11px", fontWeight: 700 }}>{row.port_of_loading || "-"}</span>
                            </div>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <span style={{ fontWeight: 800, fontSize: "9px", color: "#64748b", width: 85 }}>POD:</span>
                              <span style={{ fontSize: "11px", fontWeight: 700 }}>{row.port_of_destination || "-"}</span>
                            </div>
                            {row.bl_details?.vessel_name && (
                              <div style={{ fontSize: "9.5px", color: "#475569", marginTop: 4 }}>
                                <span style={{ fontWeight: 700 }}>Vessel:</span> {row.bl_details.vessel_name}{" "}
                                {row.bl_details.voyage_no ? `V ${row.bl_details.voyage_no}` : ""}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: 4 }}>
                            {row.container_size && (
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                  backgroundColor: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                }}
                              >
                                {row.container_size}
                              </span>
                            )}
                            {row.consignment_type && (
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                  backgroundColor: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                }}
                              >
                                {row.consignment_type}
                              </span>
                            )}
                            {row.goods_stuffed && (
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                  backgroundColor: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                }}
                              >
                                {row.goods_stuffed}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              backgroundColor: "#f8fafc",
                              padding: "4px 6px",
                              borderRadius: 4,
                              border: "1px solid #e2e8f0",
                              fontSize: 10,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748b", fontWeight: 600 }}>Pkgs:</span>
                              <span style={{ fontWeight: 700 }}>
                                {row.no_packages || "-"} {row.package_unit || ""}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748b", fontWeight: 600 }}>Gross Wt:</span>
                              <span style={{ fontWeight: 700 }}>
                                {row.gross_weight || "-"} {row.gross_weight_unit || ""}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748b", fontWeight: 600 }}>Net Wt:</span>
                              <span style={{ fontWeight: 700 }}>
                                {row.net_weight || "-"} {row.net_weight_unit || ""}
                              </span>
                            </div>
                            {row.volume_cbm && (
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b", fontWeight: 600 }}>Volume:</span>
                                <span style={{ fontWeight: 700 }}>
                                  {row.volume_cbm} {row.volume_unit || "CBM"}
                                </span>
                              </div>
                            )}
                          </div>
                          {row.containers?.some((c) => c.container_number) && (
                            <div style={{ marginTop: 4 }}>
                              {row.containers
                                .filter((c) => c.container_number)
                                .map((c, i) => (
                                  <div key={i} style={{ fontSize: "9.5px", fontWeight: 800, color: "#16408f" }}>
                                    {c.container_number}
                                  </div>
                                ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                          {activeTab === "SBO" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b" }}>SHIPPED ON BOARD DATE</span>
                              <span style={{ fontWeight: 700, fontSize: "11px" }}>
                                {pipelineData[row._id || row.enquiry_no]?.sboDate ? pipelineData[row._id || row.enquiry_no].sboDate.split("-").reverse().join("/") : "-"}
                              </span>
                            </div>
                          ) : activeTab === "Delivery" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b" }}>ARRIVAL DATE</span>
                              <span style={{ fontWeight: 700, fontSize: "11px" }}>
                                {pipelineData[row._id || row.enquiry_no]?.arrivalDate ? pipelineData[row._id || row.enquiry_no].arrivalDate.split("-").reverse().join("/") : "-"}
                              </span>
                            </div>
                          ) : activeTab === "Completed" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "10.5px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b", fontWeight: 700, fontSize: 9 }}>SBO DATE:</span>
                                <span style={{ fontWeight: 700 }}>
                                  {pipelineData[row._id || row.enquiry_no]?.sboDate ? pipelineData[row._id || row.enquiry_no].sboDate.split("-").reverse().join("/") : "-"}
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b", fontWeight: 700, fontSize: 9 }}>ARRIVAL DATE:</span>
                                <span style={{ fontWeight: 700 }}>
                                  {pipelineData[row._id || row.enquiry_no]?.arrivalDate ? pipelineData[row._id || row.enquiry_no].arrivalDate.split("-").reverse().join("/") : "-"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px" }}>
                                <span style={{ color: "#64748b", fontWeight: 700, fontSize: 9 }}>E.T.A:</span>
                                <span style={{ fontWeight: 700 }}>
                                  {row.eta_date ? row.eta_date.split("-").reverse().join("/") : "-"}
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px" }}>
                                <span style={{ color: "#64748b", fontWeight: 700, fontSize: 9 }}>ARRIVAL:</span>
                                <span style={{ fontWeight: 700 }}>
                                  {row.arrival_date ? row.arrival_date.split("-").reverse().join("/") : "-"}
                                </span>
                              </div>
                              {row.delay_reason && (
                                <div
                                  style={{
                                    marginTop: 4,
                                    backgroundColor: "#fffbeb",
                                    border: "1px solid #fef3c7",
                                    padding: "4px 6px",
                                    borderRadius: 4,
                                  }}
                                >
                                  <span style={{ fontSize: 8.5, fontWeight: 800, color: "#d97706" }}>Delay Reason:</span>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: "#b45309" }}>{row.delay_reason}</div>
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td style={{ padding: "10px 8px", verticalAlign: "middle" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                            {activeTab === "Pending" ? (
                              <span style={{ color: "#64748b", fontWeight: "700", fontSize: "11px" }}>Awaiting Draft BL</span>
                            ) : activeTab === "Draft BL" ? (
                              <>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => window.open(row.documents?.hbl_copy || row.documents?.booking_copy || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", "_blank")}
                                  sx={{
                                    textTransform: "none",
                                    borderColor: "#cbd5e1",
                                    color: "#475569",
                                    fontWeight: 700,
                                    fontSize: "11px",
                                    height: "28px",
                                    "&:hover": { borderColor: "#16408f", color: "#16408f" },
                                  }}
                                >
                                  Download Draft
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  color="success"
                                  onClick={() => updatePipelineValue(row._id || row.enquiry_no, "draftApproved", true)}
                                  sx={{
                                    textTransform: "none",
                                    backgroundColor: "#10b981",
                                    fontWeight: 700,
                                    fontSize: "11px",
                                    height: "28px",
                                    "&:hover": { backgroundColor: "#059669" },
                                  }}
                                >
                                  Approve
                                </Button>
                              </>
                            ) : activeTab === "SBO" ? (
                              <span style={{ color: "#334155", fontWeight: "700", fontSize: "11px" }}>Awaiting SBO Date</span>
                            ) : activeTab === "Billing" ? (
                              <span style={{ color: "#0f766e", fontWeight: "700", fontSize: "11px" }}>Awaiting Billing</span>
                            ) : activeTab === "Delivery" ? (
                              <span style={{ color: "#1e40af", fontWeight: "700", fontSize: "11px" }}>Awaiting Arrival</span>
                            ) : activeTab === "Completed" ? (
                              <Chip
                                label="Completed"
                                color="success"
                                size="small"
                                sx={{ fontWeight: 700, fontSize: "10px" }}
                              />
                            ) : (
                              <>
                                <DocsViewCell row={row} />
                                {row.status === "Converted" && (
                                  <Tooltip title="Track Shipment">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTrackingEnquiry(row);
                                      }}
                                      sx={{
                                        border: "1px solid #e2e8f0",
                                        backgroundColor: "#f8fafc",
                                        color: "#fc8019",
                                        "&:hover": { backgroundColor: "#fff5ec", borderColor: "#fc8019" },
                                      }}
                                    >
                                      <LocalShippingIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: "40px 24px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                        No {activeTab.toLowerCase()} records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Box>
        </Box>

      <Dialog
        open={!!selectedEnquiry}
        onClose={() => setSelectedEnquiry(null)}
        maxWidth="md"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: "3px", overflow: "hidden" } }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #cbd5e1",
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: "14px", color: "#1e293b" }}>
            Enquiry Details - {selectedEnquiry?.enquiry_no}
          </Typography>
          <IconButton onClick={() => setSelectedEnquiry(null)} sx={{ color: "#64748b" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>{selectedEnquiry && <CaptureRates enquiry={selectedEnquiry} />}</DialogContent>
      </Dialog>

      {trackingEnquiry && (
        <FreightTrackingMap enquiry={trackingEnquiry} onClose={() => setTrackingEnquiry(null)} />
      )}

      <Dialog
        open={openDSRDialog}
        onClose={() => {
          setOpenDSRDialog(false);
          setDsrStartDate("");
          setDsrEndDate("");
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ style: { borderRadius: "3px" } }}
      >
        <DialogTitle
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1, borderBottom: "1px solid #e2e8f0" }}
        >
          <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
            Freight Forwarding {dsrMode} DSR Report
          </span>
          <IconButton
            size="small"
            onClick={() => {
              setOpenDSRDialog(false);
              setDsrStartDate("");
              setDsrEndDate("");
            }}
            sx={{ color: "#64748b" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Financial Year</InputLabel>
              <Select
                value={dsrYear}
                label="Financial Year"
                onChange={(e) => setDsrYear(e.target.value)}
                sx={{ borderRadius: "3px", fontSize: "12px" }}
              >
                <MenuItem value="all" style={{ fontSize: "12px" }}>
                  All Years
                </MenuItem>
                <MenuItem value="26-27" style={{ fontSize: "12px" }}>
                  2026-2027 (26-27)
                </MenuItem>
                <MenuItem value="25-26" style={{ fontSize: "12px" }}>
                  2025-2026 (25-26)
                </MenuItem>
                <MenuItem value="24-25" style={{ fontSize: "12px" }}>
                  2024-2025 (24-25)
                </MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Shipment Type</InputLabel>
              <Select
                value={dsrShipmentType}
                label="Shipment Type"
                onChange={(e) => setDsrShipmentType(e.target.value)}
                sx={{ borderRadius: "3px", fontSize: "12px" }}
              >
                {dsrMode === "Import" ? (
                  <>
                    <MenuItem value="all" style={{ fontSize: "12px" }}>
                      All Import Shipments
                    </MenuItem>
                    <MenuItem value="Import-Sea" style={{ fontSize: "12px" }}>
                      Import - Sea
                    </MenuItem>
                    <MenuItem value="Import-Air" style={{ fontSize: "12px" }}>
                      Import - Air
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem value="all" style={{ fontSize: "12px" }}>
                      All Export Shipments
                    </MenuItem>
                    <MenuItem value="Export-Sea" style={{ fontSize: "12px" }}>
                      Export - Sea
                    </MenuItem>
                    <MenuItem value="Export-Air" style={{ fontSize: "12px" }}>
                      Export - Air
                    </MenuItem>
                  </>
                )}
              </Select>
            </FormControl>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                value={dsrStartDate}
                onChange={(e) => setDsrStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                inputProps={{ style: { fontSize: "12px" } }}
              />
              <TextField
                label="End Date"
                type="date"
                size="small"
                value={dsrEndDate}
                onChange={(e) => setDsrEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                inputProps={{ style: { fontSize: "12px" } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleDownloadDSR}
            disabled={dsrLoading}
            variant="contained"
            sx={{
              backgroundColor: "#16408f",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "12px",
              "&:hover": { backgroundColor: "#19448a" },
            }}
          >
            {dsrLoading ? "Downloading..." : "Download Report"}
          </Button>
        </DialogActions>
      </Dialog>


    </div>
  );
}

export default CFreightForwarding;
