import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableRow, Typography, Box, Chip, Divider } from "@mui/material";

/**
 * Robust date formatter to handle DD/MM/YYYY, ISO strings, and Date objects
 */
const formatEwbDate = (dateStr) => {
  if (!dateStr) return "-";
  const s = String(dateStr).trim();
  
  // If it is already in DD/MM/YYYY format, keep it!
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    return s;
  }
  
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      let hh = d.getHours();
      const min = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      const ampm = hh >= 12 ? "PM" : "AM";
      hh = hh % 12;
      hh = hh ? hh : 12; // hour '0' should be '12'
      const hhStr = String(hh).padStart(2, "0");
      return `${dd}/${mm}/${yyyy} ${hhStr}:${min}:${ss} ${ampm}`;
    }
  } catch (e) {
    // ignore
  }
  
  return s;
};

/**
 * Map mode of transport code to label
 */
const getModeLabel = (mode) => {
  if (!mode) return "-";
  const m = String(mode).trim().toLowerCase();
  if (m === "1" || m === "road") return "Road";
  if (m === "2" || m === "rail") return "Rail";
  if (m === "3" || m === "air") return "Air";
  if (m === "4" || m === "ship") return "Ship";
  return mode;
};

/**
 * Map vehicle type code to label
 */
const getVehicleTypeLabel = (type) => {
  if (!type) return "-";
  const t = String(type).trim().toLowerCase();
  if (t === "r" || t === "regular") return "Regular";
  if (t === "o" || t === "odc") return "ODC (Over Dimension Cargo)";
  return type;
};

/**
 * PartAPreview Component
 * Displays read-only Part A details of a generated E-Way Bill
 * Shows consignor, consignee, items, and transport details
 */
const PartAPreview = ({ ewayBill }) => {
  if (!ewayBill) {
    return (
      <Box sx={{ p: 2, textAlign: "center", color: "#999" }}>
        <Typography>No E-Way Bill data available</Typography>
      </Box>
    );
  }

  // Resolve properties with robust fallbacks for both Database and Mastersindia API models
  const ewbNo = ewayBill.ewbNo || ewayBill.ewayBillNo || ewayBill.eway_bill_number || "-";
  const generatedDate = formatEwbDate(ewayBill.ewbDate || ewayBill.generatedDate || ewayBill.ewayBillDate || ewayBill.generatedAt || ewayBill.createdAt);
  const validUpto = formatEwbDate(ewayBill.validUpto || ewayBill.valid_upto);
  
  let status = ewayBill.ewbStatus || ewayBill.status || ewayBill.statusCode || "Generated";
  if (status === "ACT" || status === "ACTIVE") status = "Generated";
  else if (status === "CNL") status = "Cancelled";
  else if (status === "REJ") status = "Rejected";
  else if (status === "EXP") status = "Expired";

  const consignorName = ewayBill.consignorName || ewayBill.fromName || ewayBill.fromTrdName || ewayBill.legal_name_of_consignor || "-";
  const consignorGstin = ewayBill.consignorGstin || ewayBill.fromGstin || ewayBill.gstin_of_consignor || "-";
  const consignorAddress = ewayBill.consignorAddress1 || ewayBill.fromAddr1 || ewayBill.address1_of_consignor || "-";
  const consignorAddress2 = ewayBill.consignorAddress2 || ewayBill.fromAddr2 || "";
  const consignorState = ewayBill.consignorState || ewayBill.fromStateCode || ewayBill.state_of_consignor || "-";

  const consigneeName = ewayBill.consigneeName || ewayBill.toName || ewayBill.toTrdName || ewayBill.legal_name_of_consignee || "-";
  const consigneeGstin = ewayBill.consigneeGstin || ewayBill.toGstin || ewayBill.gstin_of_consignee || "-";
  const consigneeAddress = ewayBill.consigneeAddress1 || ewayBill.toAddr1 || ewayBill.address1_of_consignee || "-";
  const consigneeAddress2 = ewayBill.consigneeAddress2 || ewayBill.toAddr2 || "";
  const consigneeState = ewayBill.consigneeState || ewayBill.toStateCode || ewayBill.state_of_supply || "-";

  const modeOfTransport = getModeLabel(ewayBill.transportationMode || ewayBill.modeOfTransport || ewayBill.transportation_mode);
  const distance = ewayBill.transportDistance || ewayBill.transportation_distance || "-";
  const vehicleNo = ewayBill.vehicleNumber || ewayBill.vehicleNo || ewayBill.vehicle_number || "-";
  const vehicleType = getVehicleTypeLabel(ewayBill.vehicleType || ewayBill.vehicle_type);

  const taxableAmount = ewayBill.taxableAmount || ewayBill.taxable_amount || 0;
  const cgstAmount = ewayBill.cgstAmount || ewayBill.cgst_amount || 0;
  const sgstAmount = ewayBill.sgstAmount || ewayBill.sgst_amount || 0;
  const igstAmount = ewayBill.igstAmount || ewayBill.igst_amount || 0;
  const totalInvoiceValue = ewayBill.totalInvoiceValue || ewayBill.total_invoice_value || 0;
  const cessAmount = ewayBill.cessAmount || ewayBill.cess_amount || 0;

  return (
    <Paper sx={{ p: 2, bgcolor: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            E-Way Bill Details (Part A - Read Only)
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip
              label={`EWB: ${ewbNo}`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </Box>
        <Divider />
      </Box>

      {/* Key Details Row */}
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small" sx={{ "& td": { borderBottom: "1px solid #e0e0e0", py: 0.8 } }}>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: "30%", bgcolor: "#f5f5f5" }}>EWB Number</TableCell>
              <TableCell>{ewbNo}</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Generated Date</TableCell>
              <TableCell>{generatedDate}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Valid Upto</TableCell>
              <TableCell>{validUpto}</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Status</TableCell>
              <TableCell>
                <Chip
                  label={status}
                  size="small"
                  color={status === "Cancelled" ? "error" : status === "Rejected" ? "warning" : "success"}
                  variant="outlined"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Party Details */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
        Consignor Details
      </Typography>
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small" sx={{ "& td": { borderBottom: "1px solid #e0e0e0", py: 0.6 } }}>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Name</TableCell>
              <TableCell>{consignorName}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>GSTIN</TableCell>
              <TableCell sx={{ fontFamily: "monospace" }}>{consignorGstin}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Address</TableCell>
              <TableCell>{consignorAddress}{consignorAddress2 ? `, ${consignorAddress2}` : ""}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>State</TableCell>
              <TableCell>{consignorState}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
        Consignee Details
      </Typography>
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small" sx={{ "& td": { borderBottom: "1px solid #e0e0e0", py: 0.6 } }}>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Name</TableCell>
              <TableCell>{consigneeName}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>GSTIN</TableCell>
              <TableCell sx={{ fontFamily: "monospace" }}>{consigneeGstin}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Address</TableCell>
              <TableCell>{consigneeAddress}{consigneeAddress2 ? `, ${consigneeAddress2}` : ""}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>State</TableCell>
              <TableCell>{consigneeState}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Transport Details */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
        Transport Details
      </Typography>
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small" sx={{ "& td": { borderBottom: "1px solid #e0e0e0", py: 0.6 } }}>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Mode of Transport</TableCell>
              <TableCell>{modeOfTransport}</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Distance (km)</TableCell>
              <TableCell>{distance}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Vehicle Number</TableCell>
              <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{vehicleNo}</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Vehicle Type</TableCell>
              <TableCell>{vehicleType}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Financial Summary */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
        Value Summary
      </Typography>
      <TableContainer>
        <Table size="small" sx={{ "& td": { borderBottom: "1px solid #e0e0e0", py: 0.6 } }}>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Taxable Amount</TableCell>
              <TableCell sx={{ textAlign: "right" }}>₹ {Number(taxableAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>CGST</TableCell>
              <TableCell sx={{ textAlign: "right" }}>₹ {Number(cgstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>SGST</TableCell>
              <TableCell sx={{ textAlign: "right" }}>₹ {Number(sgstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>IGST</TableCell>
              <TableCell sx={{ textAlign: "right" }}>₹ {Number(igstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: "#e3f2fd" }}>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#e3f2fd" }}>Total Invoice Value</TableCell>
              <TableCell sx={{ textAlign: "right", fontWeight: 600, bgcolor: "#e3f2fd" }}>₹ {Number(totalInvoiceValue).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#e3f2fd" }}>Cess</TableCell>
              <TableCell sx={{ textAlign: "right", fontWeight: 600, bgcolor: "#e3f2fd" }}>₹ {Number(cessAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" sx={{ display: "block", mt: 2, color: "#666", fontStyle: "italic" }}>
        Note: This is a read-only preview of your generated E-Way Bill (Part A). To make changes to vehicle details or other Part B information, use the tabs below.
      </Typography>
    </Paper>
  );
};

export default PartAPreview;
