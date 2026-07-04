import React, { useCallback, useMemo, useState, useEffect } from "react";
import FileUpload from "../utils/FileUpload";
import { FaUpload } from "react-icons/fa";
import axios from "axios";
import { getJsonCookie } from "../utils/cookies";
import { IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Chip, Paper, Tabs, Tab } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import BEStatusModal from "../customHooks/BeStatus"; // Import the modal component
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PartAEwayBillModal from "./ewaybill/Modals/PartAEwayBillModal";
import EwayBillActionModal from "./ewaybill/Modals/EwayBillActionModal";
import { allContainersHaveEwb } from "./ewaybill/ewbContainerCoverage";
import Swal from "sweetalert2";

const ExistingEwayBillModal = ({ open, onClose, ewbList, containers }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [partAData, setPartAData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeIdx = selectedIdx >= (ewbList?.length || 0) ? 0 : selectedIdx;
  const ewb = ewbList?.[activeIdx];

  // Fetch full Part A data whenever selected EWB changes
  useEffect(() => {
    if (!open || !ewb?.ewbNo) return;
    setLoading(true);
    setError(null);
    setPartAData(null);
    axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/ewb-part-a?ewbNo=${encodeURIComponent(ewb.ewbNo)}`)
      .then(res => {
        setPartAData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load EWB Part A:", err);
        setError("Failed to load E-Way Bill details. Please try again.");
        setLoading(false);
      });
  }, [ewb?.ewbNo, open]);

  const handleDownloadPdf = async () => {
    const rawUrl =
      partAData?.meta?.pdfUrl ||
      partAData?.data?.url ||
      partAData?.data?.printUrl ||
      partAData?.data?.detailPrintUrl ||
      ewb?.pdfUrl || ewb?.printUrl ||
      ewb?.responseData?.url || ewb?.responseData?.printUrl;

    if (!rawUrl) {
      Swal.fire("Info", "PDF download URL not available for this E-Way Bill.", "info");
      return;
    }

    try {
      let pdfUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      const proxyUrl = `${process.env.REACT_APP_API_STRING}/eway-bill/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`;

      // Fetch as binary blob — guarantees a real file download, not browser navigation
      const response = await axios.get(proxyUrl, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `EWB_${ewb.ewbNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Release blob URL after short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch (err) {
      console.error("PDF download failed:", err);
      Swal.fire("Error", "Failed to download PDF. Please try again.", "error");
    }
  };

  if (!open || !ewbList || ewbList.length === 0) return null;

  const rawData = partAData?.data || {};
  const meta = partAData?.meta || {};
  // Map both camelCase and underscore case fields
  const data = {
    ewayBillNo: rawData.ewayBillNo || rawData.eway_bill_number,
    ewayBillDate: rawData.ewayBillDate || rawData.eway_bill_date,
    validUpto: rawData.validUpto || rawData.eway_bill_valid_date || meta.validUpto,
    status: rawData.status || rawData.eway_bill_status || meta.ewbStatus,
    fromGstIn: rawData.fromGstIn || rawData.gstin_of_consignor,
    fromTrdName: rawData.fromTrdName || rawData.legal_name_of_consignor,
    fromAddr1: rawData.fromAddr1 || rawData.address1_of_consignor,
    fromAddr2: rawData.fromAddr2 || rawData.address2_of_consignor,
    actFromStateCode: rawData.actFromStateCode || rawData.actual_from_state_name || rawData.state_of_consignor,
    toTrdName: rawData.toTrdName || rawData.legal_name_of_consignee,
    toGstIn: rawData.toGstIn || rawData.gstin_of_consignee,
    toAddr1: rawData.toAddr1 || rawData.address1_of_consignee,
    toAddr2: rawData.toAddr2 || rawData.address2_of_consignee,
    actToStateCode: rawData.actToStateCode || rawData.actual_to_state_name || rawData.state_of_supply,
    transMode: rawData.transMode || rawData.transport_mode || "N/A",
    vehicleNo: rawData.vehicleNo || rawData.vehicle_number || (rawData.VehiclListDetails?.[0]?.vehicleNo || rawData.VehiclListDetails?.[0]?.vehicle_number) || "N/A",
    transDistance: rawData.transDistance || rawData.transportation_distance,
    vehType: rawData.vehType || rawData.vehicle_type,
    totAmt: rawData.totAmt || rawData.taxable_amount,
    cgstValue: rawData.cgstValue || rawData.cgst_amount,
    sgstValue: rawData.sgstValue || rawData.sgst_amount,
    igstValue: rawData.igstValue || rawData.igst_amount,
    totInvValue: rawData.totInvValue || rawData.total_invoice_value,
    cessValue: rawData.cessValue || rawData.cess_amount,
  };

  const matchContainer = containers?.find(c => String(c._id) === String(ewb.containerId) || String(c.container_no) === String(ewb.containerId));
  const containerNo = matchContainer?.container_no || ewb.containerId || (ewb.requestPayload?.document_number?.split("-CH-")?.[1]) || "-";

  const renderRow = (label, value, fullWidth = false) => (
    <Box
      sx={{
        display: "flex",
        borderBottom: "1px solid #f1f5f9",
        ...(fullWidth ? {} : {})
      }}
    >
      <Typography sx={{ width: "45%", p: 1, fontSize: "0.83rem", color: "#64748b", fontWeight: 600, bgcolor: "#f8fafc", borderRight: "1px solid #f1f5f9" }}>
        {label}
      </Typography>
      <Typography sx={{ width: "55%", p: 1, fontSize: "0.83rem", color: "#1e293b" }}>
        {value ?? "-"}
      </Typography>
    </Box>
  );

  const renderSection = (title, children) => (
    <Box sx={{ mb: 2.5, border: "1px solid #e2e8f0", borderRadius: 1.5, overflow: "hidden" }}>
      <Typography sx={{ p: 1.2, px: 2, bgcolor: "#f1f5f9", fontWeight: 700, fontSize: "0.85rem", color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
        {title}
      </Typography>
      {children}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ py: 1.5, px: 3, borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
        <Typography variant="subtitle1" fontWeight="800" sx={{ color: "#1e293b" }}>
          Generate E-Way Bill
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b", mt: 0.3 }}>
          E-Way Bill Part A Preview
        </Typography>
      </DialogTitle>

      {/* Multi-EWB selector tabs */}
      {ewbList.length > 1 && (
        <Box sx={{ borderBottom: "1px solid #e2e8f0", px: 2, bgcolor: "#f8fafc" }}>
          <Tabs
            value={activeIdx}
            onChange={(e, val) => { setSelectedIdx(val); }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: "42px" }}
          >
            {ewbList.map((e, idx) => {
              const match = containers?.find(c => String(c._id) === String(e.containerId) || String(c.container_no) === String(e.containerId));
              const suffix = match?.container_no || e.containerId || (e.requestPayload?.document_number?.split("-CH-")?.[1]) || (idx + 1);
              return (
                <Tab
                  key={e._id || idx}
                  label={`Container ${suffix}`}
                  sx={{ textTransform: "none", fontWeight: 600, minHeight: "42px", fontSize: "0.8rem" }}
                />
              );
            })}
          </Tabs>
        </Box>
      )}

      <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <Typography sx={{ color: "#64748b" }}>Loading E-Way Bill details...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, bgcolor: "#fee2e2", borderRadius: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, overflow: "hidden", bgcolor: "#ffffff" }}
          >
            {/* EWB Header Strip */}
            <Box sx={{ p: 2, px: 3, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
              <Typography variant="h6" fontWeight="800" sx={{ color: "#1e293b" }}>
                E-Way Bill Details (Part A - Read Only)
              </Typography>
              <Chip
                label={meta.ewbStatus ? `EWB: ${meta.ewbStatus}` : `EWB: ${data.ewayBillNo || ewb.ewbNo || "N/A"}`}
                variant="outlined"
                size="small"
                color="primary"
                sx={{ fontWeight: 700, fontFamily: "monospace" }}
              />
            </Box>

            <Box sx={{ p: 2.5 }}>
              {/* Top Summary Row */}
              <Box sx={{ display: "flex", gap: 0, border: "1px solid #e2e8f0", borderRadius: 1.5, overflow: "hidden", mb: 2.5 }}>
                {[
                  ["EWB Number", data.ewayBillNo || meta.ewbNo || ewb.ewbNo || "N/A"],
                  ["Generated Date", data.ewayBillDate || meta.ewbDate || ewb.ewbDate || "-"],
                  ["Valid Upto", data.validUpto || "N/A"],
                  ["Status", data.status || "UNKNOWN"],
                ].map(([label, val], i) => (
                  <Box key={i} sx={{ flex: 1, p: 1.5, borderRight: i < 3 ? "1px solid #e2e8f0" : "none", bgcolor: i % 2 === 0 ? "#fafafa" : "#ffffff" }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, mb: 0.5 }}>{label}</Typography>
                    <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>{val}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Consignor Details */}
              {renderSection("Consignor Details", <>
                {renderRow("Name", data.fromGstIn === "URP" ? (data.fromTrdName || ewb.consignorName || "-") : (data.fromTrdName || ewb.consignorName))}
                {renderRow("GSTIN", data.fromGstIn || ewb.consignorGstin || "-")}
                {renderRow("Address", [data.fromAddr1, data.fromAddr2].filter(Boolean).join(", ") || ewb.consignorAddress1 || "-")}
                {renderRow("State", data.actFromStateCode || "-")}
              </>)}

              {/* Consignee Details */}
              {renderSection("Consignee Details", <>
                {renderRow("Name", data.toTrdName || ewb.consigneeName || "-")}
                {renderRow("GSTIN", data.toGstIn || ewb.consigneeGstin || "-")}
                {renderRow("Address", [data.toAddr1, data.toAddr2].filter(Boolean).join(", ") || ewb.consigneeAddress1 || "-")}
                {renderRow("State", data.actToStateCode || "-")}
              </>)}

              {/* Transport Details */}
              {renderSection("Transport Details", (
                <Box sx={{ display: "flex" }}>
                  <Box sx={{ flex: 1, borderRight: "1px solid #f1f5f9" }}>
                    {renderRow("Mode of Transport", data.transMode || "-")}
                    {renderRow("Vehicle Number", data.vehicleNo || "-")}
                    {renderRow("Container Number", containerNo)}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    {renderRow("Distance (km)", data.transDistance || "-")}
                    {renderRow("Vehicle Type", data.vehType || "-")}
                  </Box>
                </Box>
              ))}

              {/* Value Summary */}
              {renderSection("Value Summary", (
                <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                  {[
                    ["Taxable Amount", `₹ ${(data.totAmt || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                    ["CGST", `₹ ${(data.cgstValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                    ["SGST", `₹ ${(data.sgstValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                    ["IGST", `₹ ${(data.igstValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                    ["Total Invoice Value", `₹ ${(data.totInvValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                    ["Cess", `₹ ${(data.cessValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                  ].map(([label, val], i) => (
                    <Box key={i} sx={{ width: "50%", display: "flex", borderBottom: "1px solid #f1f5f9" }}>
                      <Typography sx={{ width: "55%", p: 1, fontSize: "0.83rem", color: "#64748b", fontWeight: 600, bgcolor: i === 4 ? "#eff6ff" : "#f8fafc", borderRight: "1px solid #f1f5f9" }}>
                        {label}
                      </Typography>
                      <Typography sx={{ width: "45%", p: 1, fontSize: "0.83rem", color: i === 4 ? "#1d4ed8" : "#1e293b", fontWeight: i === 4 ? 700 : 400 }}>
                        {val}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ))}

              <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", mt: 2, fontStyle: "italic" }}>
                Note: This is a read-only preview of your generated E-Way Bill (Part A). To make changes to vehicle details or other Part B information, use the tabs below.
              </Typography>
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e2e8f0", bgcolor: "#ffffff", justifyContent: "space-between" }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: "none", fontWeight: 600 }}>
          ← Back
        </Button>
        <Button
          onClick={handleDownloadPdf}
          variant="contained"
          disabled={loading}
          sx={{ bgcolor: "#1e293b", "&:hover": { bgcolor: "#0f172a" }, textTransform: "none", fontWeight: 700, px: 3 }}
        >
          ↓ Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const ContainerEwaybillStatusModal = ({ open, onClose, onContinue, containers, onViewExisting }) => {
  const hasExistingEwbs = containers?.some(container => container.ewaybill_no);
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ py: 1.5, px: 3, borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
        <Typography variant="h6" fontWeight="800" sx={{ color: "#1e293b" }}>
          Container E-Way Bill Status
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {containers?.map((container, index) => {
            const containerNo = container.container_no || container.container_number || `Container ${index + 1}`;
            const ewaybillNo = container.ewaybill_no;
            return (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 2,
                  borderRadius: 1.5,
                  border: `1px solid ${ewaybillNo ? "#bbf7d0" : "#fde68a"}`,
                  bgcolor: ewaybillNo ? "#f0fdf4" : "#fffbeb"
                }}
              >
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                  {containerNo}
                </Typography>
                <Chip
                  label={ewaybillNo ? ewaybillNo : "No E-Way Bill"}
                  size="small"
                  color={ewaybillNo ? "success" : "warning"}
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                />
              </Box>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e2e8f0", bgcolor: "#ffffff", justifyContent: "space-between" }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          {hasExistingEwbs && onViewExisting && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                const existingEwbs = containers
                  ?.filter(container => container.ewaybill_no)
                  ?.map(container => ({
                    ewbNo: container.ewaybill_no,
                    containerId: container.container_no || container.container_number
                  })) || [];
                onViewExisting(existingEwbs);
              }}
              sx={{ textTransform: "none", fontSize: "0.78rem", borderRadius: 1 }}
            >
              View Existing E-Way Bills
            </Button>
          )}
          <Button
            onClick={onContinue}
            variant="contained"
            sx={{ bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" }, textTransform: "none", fontWeight: 700 }}
          >
            Continue to Generate
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};


const BENumberCell = ({ cell, onDocumentsUpdated, module, copyFn, onEwayBillSuccess }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBE, setSelectedBE] = useState(null);
  const [activeUpload, setActiveUpload] = useState(null);
  const [processedBeFiles, setProcessedBeFiles] = useState(
    cell.row.original.processed_be_attachment || []
  );
  const [oocFiles, setOocFiles] = useState(cell.row.original.ooc_copies || []);
  const [gatePassFiles, setGatePassFiles] = useState(
    cell.row.original.gate_pass_copies || []
  );

  // E-Way Bill dialog state
  const [isPartAEwayBillDialogOpen, setIsPartAEwayBillDialogOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedEwb, setSelectedEwb] = useState(null);
  const [prefetchedEwbList, setPrefetchedEwbList] = useState([]);
  const [isContainerEwaybillStatusModalOpen, setIsContainerEwaybillStatusModalOpen] = useState(false);

  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`; // Format as YYYYMMDD for API
  }, []);

  const formatDateDisplay = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`; // Format as YYYY/MM/DD for display
  }, []);

  const getCustomHouseLocation = useMemo(
    () => (customHouse) => {
      const houseMap = {
        "ICD SACHANA": "INJKA6",
        "ICD SANAND": "INSAU6",
        "ICD KHODIYAR": "INSBI6",
      };
      return houseMap[customHouse] || customHouse;
    },
    []
  );

  // Sync BE Attachments
  useEffect(() => {
    setProcessedBeFiles(cell.row.original.processed_be_attachment || []);
  }, [cell.row.original.processed_be_attachment]);

  // Sync OOC Copies
  useEffect(() => {
    setOocFiles(cell.row.original.ooc_copies || []);
  }, [cell.row.original.ooc_copies]);

  // Sync Gate Pass Copies
  useEffect(() => {
    setGatePassFiles(cell.row.original.gate_pass_copies || []);
  }, [cell.row.original.gate_pass_copies]);

  const beNumber = cell?.getValue()?.toString();
  const rawBeDate = cell.row.original.be_date;
  const customHouse = cell.row.original.custom_house;
  const beDate = formatDateDisplay(rawBeDate); // For display
  const beDateForAPI = formatDate(rawBeDate); // For API (YYYYMMDD)
  const location = getCustomHouseLocation(customHouse);
  const rowId = cell.row.original._id || cell.row.id;

  // Handle BE number click to open modal
  const handleBEClick = (event) => {
    event.preventDefault();
    setSelectedBE({
      beNo: beNumber,
      beDt: beDateForAPI, // Use YYYYMMDD format
      location: location,
    });
    setModalOpen(true);
  };

  const handleEwayBillClick = (event) => {
    event.stopPropagation();
    if (!beNumber) {
      Swal.fire("Error", "No Bill of Entry (BE No) or Document No found.", "error");
      return;
    }
    setIsContainerEwaybillStatusModalOpen(true);
  };

  const handleContinueToGenerate = () => {
    setIsContainerEwaybillStatusModalOpen(false);
    setIsPartAEwayBillDialogOpen(true);
  };

  // Handle copy function
  const handleCopy = (event, text) => {
    event.stopPropagation();
    navigator.clipboard.writeText(text);
    // You can add a toast notification here if needed
    console.log(`Copied: ${text}`);
  };

  // Handle file uploads for different document types
  const handleFilesUploaded = async (newFiles, fieldName) => {
    let updatedFiles;

    // Determine which state to update based on the field
    if (fieldName === "processed_be_attachment") {
      updatedFiles = [...processedBeFiles, ...newFiles];
      setProcessedBeFiles(updatedFiles);
    } else if (fieldName === "ooc_copies") {
      updatedFiles = [...oocFiles, ...newFiles];
      setOocFiles(updatedFiles);
    } else if (fieldName === "gate_pass_copies") {
      updatedFiles = [...gatePassFiles, ...newFiles];
      setGatePassFiles(updatedFiles);
    }

    // Update the database with the complete array
    try {
      // Get user info from cookies for audit trail
      const user = getJsonCookie("exim_user") || {};
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };

      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/jobs/${rowId}`,
        {
          [fieldName]: updatedFiles,
        },
        { headers }
      );

      // Call parent component's update function if available
      if (onDocumentsUpdated) {
        onDocumentsUpdated(rowId, fieldName, updatedFiles);
      }
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      // You might want to show an error message to the user
    }

    // Close the upload popup
    setActiveUpload(null);
  };

  // Component to render the upload button and popup
  const renderUploadButton = (fieldName, title) => {
    const isActive = activeUpload === fieldName;

    return (
      <div
        style={{
          position: "relative",
          display: "inline-block",
          marginLeft: "10px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveUpload(isActive ? null : fieldName)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0",
            color: "#0066cc",
          }}
          title={`Upload ${title}`}
        >
          <FaUpload size={14} />
        </button>

        {isActive && (
          <div
            style={{
              position: "absolute",
              top: "-80px",
              right: 0,
              zIndex: 9999,
              width: "120px",
              padding: "5px",
              background: "#fff",
              boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
              borderRadius: "4px",
            }}
          >
            <FileUpload
              label={`Upload ${title}`}
              bucketPath={fieldName}
              onFilesUploaded={(newFiles) =>
                handleFilesUploaded(newFiles, fieldName)
              }
              multiple={fieldName !== "processed_be_attachment"}
              style={{ transform: "scale(0.8)", transformOrigin: "top right" }}
            />
            <button
              type="button"
              onClick={() => setActiveUpload(null)}
              style={{
                marginTop: "5px",
                padding: "2px 6px",
                background: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "10px",
                width: "auto",
                display: "block",
                marginLeft: "auto",
                marginRight: "0",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render document links with proper indexing
  const renderDocumentLinks = (documents, baseLabel) => {
    if (!documents || documents.length === 0) {
      return <span style={{ color: "gray" }}>No {baseLabel}</span>;
    }

    return (
      <>
        {documents.map((doc, index) => (
          <a
            key={index}
            href={doc}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "blue",
              textDecoration: "underline",
              cursor: "pointer",
              display: "block",
              marginTop: index === 0 ? 0 : "3px",
            }}
          >
            {baseLabel} {index + 1}
          </a>
        ))}
      </>
    );
  };

  const isEwayBillModule = window.location.pathname.includes("ewaybill");

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
        }}
      >
        {beNumber && (
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <a
                href="#"
                onClick={handleBEClick}
                style={{
                  display: "block",
                  fontWeight: "bold",
                  marginBottom: "5px",
                  color: "#0066cc",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                {beNumber}
              </a>
              {/* Copy BE Number */}
              <IconButton
                size="small"
                onClick={(event) => copyFn(event, beNumber)}
              >
                <abbr title="Copy BE Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <span>{beDate}</span>

            {isEwayBillModule && (
              <div style={{ marginTop: "8px" }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<LocalShippingIcon />}
                  onClick={handleEwayBillClick}
                  sx={{
                    fontSize: "0.65rem",
                    textTransform: "none",
                    fontWeight: "600",
                    backgroundColor: "#10b981",
                    color: "#ffffff",
                    "&:hover": {
                      backgroundColor: "#059669",
                    },
                  }}
                >
                  Generate E-Way Bill
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Processed Copy of BOE */}
        <div
          style={{ marginTop: "10px", display: "flex", alignItems: "center" }}
        >
          <div style={{ flex: 1 }}>
            {renderDocumentLinks(processedBeFiles, "Processed Copy of BOE")}
          </div>
          {renderUploadButton("processed_be_attachment", "BE Copy")}
        </div>

        {/* OOC Copies */}
        {module !== "list" && (
          <>
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                {renderDocumentLinks(oocFiles, "OOC Copy")}
              </div>
              {renderUploadButton("ooc_copies", "OOC Copy")}
            </div>

            {/* Gate Pass Copies */}
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                {renderDocumentLinks(gatePassFiles, "Gate Pass")}
              </div>
              {renderUploadButton("gate_pass_copies", "Gate Pass")}
            </div>
          </>
        )}
      </div>

      {/* BE Status Modal */}
      <BEStatusModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        beNo={selectedBE?.beNo}
        beDt={selectedBE?.beDt}
        location={selectedBE?.location}
      />

      {/* Container E-Way Bill Status Modal */}
      <ContainerEwaybillStatusModal
        open={isContainerEwaybillStatusModalOpen}
        onClose={() => setIsContainerEwaybillStatusModalOpen(false)}
        onContinue={handleContinueToGenerate}
        containers={cell.row.original.container_nos}
        onViewExisting={(list) => {
          setIsContainerEwaybillStatusModalOpen(false);
          setSelectedEwb(list);
          setIsActionModalOpen(true);
        }}
      />

      {/* E-Way Bill Part A Dialog */}
      <PartAEwayBillModal
        open={isPartAEwayBillDialogOpen}
        onClose={() => {
          setIsPartAEwayBillDialogOpen(false);
          setPrefetchedEwbList([]);
        }}
        beNo={beNumber}
        beDate={rawBeDate}
        selectedContainers={cell.row.original.container_nos}
        initialExistingEwbs={prefetchedEwbList}
        jobId={rowId}
        onViewExisting={(list) => {
          setIsPartAEwayBillDialogOpen(false);
          setSelectedEwb(list);
          setIsActionModalOpen(true);
        }}
        onSuccess={() => {
          setIsPartAEwayBillDialogOpen(false);
          setPrefetchedEwbList([]);
          if (onEwayBillSuccess) {
            onEwayBillSuccess();
          }
        }}
      />

      {/* E-Way Bill Action/Review/Print Modal */}
      {isActionModalOpen && selectedEwb && (
        <ExistingEwayBillModal
          open={isActionModalOpen}
          onClose={() => {
            setIsActionModalOpen(false);
            setSelectedEwb(null);
          }}
          ewbList={Array.isArray(selectedEwb) ? selectedEwb : [selectedEwb]}
          containers={cell.row.original.container_nos}
        />
      )}
    </>
  );
};

export default BENumberCell;
