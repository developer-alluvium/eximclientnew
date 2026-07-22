import React, { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import logo from "../../assets/images/suraj_group_logo.png";
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
  CircularProgress,
  Paper,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import GetAppIcon from "@mui/icons-material/GetApp";
import DownloadIcon from "@mui/icons-material/Download";
import ReceiptIcon from "@mui/icons-material/Receipt";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CFreightBillOfLadingGenerator from "./CFreightBillOfLadingGenerator";
import CaptureRates from "./CaptureRates";
import FreightQuotation from "./FreightQuotation";
import FreightTrackingMap from "./FreightTrackingMap";
import BackButton from "../BackButton";
import "../../styles/freight-forwarding.scss";

const API = process.env.REACT_APP_API_STRING;

const getFirstLine = (text) => {
  if (!text) return "";
  return text.split("\n")[0].replace(/\r$/, "").trim();
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "";
  if (dateStr.includes("T")) {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const clean = dateStr.split(" ")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  }
  return dateStr;
};

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

const LEGAL_TEXT_1 =
  "Taken in charge in apparently good condition herein at the place of receipt for transport and delivery as mentioned above, unless otherwise stated. The MTO in accordance with the provisions contained in the MTD undertakes to perform or to procure the performance of the multimodal transport from the place at which the goods are taken in charge to the place designated for delivery and assumes responsibility for such transport.";

const LEGAL_TEXT_2 =
  "One of the MTD(s) must be surrendered, duly endorsed in exchange for the goods, in witness whereof the original MTD of all of this tenor and date have been signed in the number indicated below one of which being accomplished the other(s) to be void.";

const formatAddress = (val) => {
  if (!val) return "";
  return val
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, idx, arr) => {
      if (idx === arr.length - 1) return line;
      if (/[,.\-/]$/.test(line)) return line;
      return line + ",";
    })
    .join("<br/>");
};

const estimateLines = (text, maxCharsPerLine = 33) => {
  if (!text) return 0;
  return text.split('\n').reduce((totalLines, line) => {
    if (line.trim() === '') return totalLines + 1;
    return totalLines + Math.max(1, Math.ceil(line.length / maxCharsPerLine));
  }, 0);
};

const splitDescription = (desc, packagesDesc = "", hsnCode = "") => {
  if (!desc) return { p1: "", p2: "" };

  const maxContainerHeight = 295;
  const lineHeight = 11.5 * 1.45; // 16.675 px

  // Calculate height occupied by packages description (margin-bottom: 10px = 10px)
  const packagesLinesCount = estimateLines(packagesDesc, 35);
  const packagesHeight = (packagesLinesCount * lineHeight) + 10;

  // Calculate height occupied by HSN code (margin-top: 5px = 5px)
  const hsnText = hsnCode ? `HSN: ${hsnCode}` : '';
  const hsnLinesCount = hsnCode ? estimateLines(hsnText, 35) : 0;
  const hsnHeight = hsnCode ? (hsnLinesCount * lineHeight) + 5 : 0;

  // Height of "Continued on Annexure" label (margin-top: 5px)
  const continuedLabelHeight = (10 * 1.45) + 5; // ~19.5px

  // Remaining height without continued label
  let availableHeight = maxContainerHeight - packagesHeight - hsnHeight;

  const lines = desc.split("\n");
  let p1_lines = [];
  let p2_lines = [];
  let currentHeight = 0;
  let splitIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLinesCount = estimateLines(line, 35);
    const lineHeightTotal = lineLinesCount * lineHeight;

    if (currentHeight + lineHeightTotal <= availableHeight) {
      currentHeight += lineHeightTotal;
    } else {
      splitIndex = i;
      break;
    }
  }

  // If splitIndex is -1, it means the entire description fits!
  if (splitIndex === -1) {
    return {
      p1: desc,
      p2: ""
    };
  }

  // If it doesn't all fit, we need the continued label, which reduces the available height!
  availableHeight -= continuedLabelHeight;

  // Re-calculate how many lines fit with the reduced available height
  p1_lines = [];
  currentHeight = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLinesCount = estimateLines(line, 35);
    const lineHeightTotal = lineLinesCount * lineHeight;

    if (currentHeight + lineHeightTotal <= availableHeight) {
      p1_lines.push(line);
      currentHeight += lineHeightTotal;
    } else {
      p2_lines = lines.slice(i);
      break;
    }
  }

  if (p1_lines.length === 0 && lines.length > 0) {
    p1_lines.push(lines[0]);
    p2_lines = lines.slice(1);
  }

  return {
    p1: p1_lines.join("\n"),
    p2: p2_lines.join("\n")
  };
};

const generateBLTemplate = (enquiry, mode = 'draft') => {
  const bl = enquiry?.bl_details || {};
  const isLcl = (enquiry?.consignment_type?.toUpperCase() === 'LCL' || enquiry?.consignmentType?.toUpperCase() === 'LCL');

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const freightLabel = isLcl ? 'FREIGHT PREPAID<br/>LCL/LCL<br/>CFS/CFS' : 'FREIGHT PREPAID<br/>FCL/FCL<br/>CY/CY';
  const enquiryContainers = enquiry?.containers || [];
  let autoContainerNumbers = "";
  let autoSealNumbers = "";
  if (enquiryContainers.length > 0 && enquiryContainers.some(c => c.container_number || c.custom_seal || c.line_seal)) {
    autoContainerNumbers = enquiryContainers.map(c => c.container_number).filter(Boolean).join("\n");
    autoSealNumbers = enquiryContainers.map(c => {
      const parts = [];
      if (c.custom_seal) parts.push(`CUSTOM: ${c.custom_seal}`);
      if (c.line_seal) parts.push(`LINE: ${c.line_seal}`);
      return parts.length > 0 ? (c.container_number ? c.container_number + ": " : "") + parts.join(' / ') : '';
    }).filter(Boolean).join("\n");
  }
  const isOriginal = mode === 'original';

  // Split logic for description overflow
  const desc = bl.description_of_goods || "";
  const packagesDesc = bl.packages_description || "[NUMBER & KIND OF PACKAGES]";
  const hsnCode = bl.hsn_code || "";
  const { p1: p1_desc, p2: p2_desc } = splitDescription(desc, packagesDesc, hsnCode);

  const bColor = isOriginal ? 'transparent' : '#000';
  const b22 = `border: 2.2px solid ${bColor};`;
  const b18 = `border: 1.8px solid ${bColor};`;
  const bb22 = `border-bottom: 2.2px solid ${bColor};`;
  const bb2 = `border-bottom: 2px solid ${bColor};`;
  const bb18 = `border-bottom: 1.8px solid ${bColor};`;
  const br22 = `border-right: 2.2px solid ${bColor};`;
  const br18 = `border-right: 1.8px solid ${bColor};`;
  const br12 = `border-right: 1.2px solid ${bColor};`;

  const watermark = !isOriginal ? `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; color: rgba(0,0,0,0.08); font-weight: 900; pointer-events: none; z-index: 0; text-transform: uppercase;">DRAFT</div>
  ` : '';

  return `
    <div style="font-family: 'Helvetica', 'Arial', sans-serif; color: #000; width: 750px; margin: 0 auto; background-color: #fff; line-height: 1.15; padding-left: 0px; padding-right: 0px; box-sizing: border-box;">
      
      <!-- FIRST PAGE (MAIN BL) -->
      <div style="${b22} box-sizing: border-box; width: 750px; height: 1040px; max-height: 1040px; overflow-y: hidden; overflow-x: visible; ${p2_desc ? 'page-break-after: always; break-after: page;' : ''} position: relative; padding-left: 20px; padding-right: 20px;">
        ${watermark}
        <!-- TOP HEADER BOX -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
          <tr>
            <td style="width: 53%; ${br22} padding: 12px 10px; vertical-align: middle;">
              <div style="font-size: 19px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">MULTIMODAL TRANSPORT DOCUMENT</div>
            </td>
            <td style="width: 47%; padding: 0; vertical-align: top;">
               <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 2px 10px 0px; ${bb2}; height: 32px; box-sizing: border-box;">
                       <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: ${isOriginal ? '10px' : '0px'};">
                          <span style="font-weight: 900; font-size: 10px; white-space: nowrap; color: ${isOriginal ? 'transparent' : '#000'};">MTD. No.</span>
                          <span style="${b18} padding: 0px 10px; flex: 1; text-align: center; font-weight: 700; height: 22px; line-height: 18px; box-sizing: border-box; display: inline-block; font-size: 13px; position: relative; top: ${isOriginal ? '-10px' : '-2px'};">${enquiry?.hbl_no || ""}</span>
                       </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: ${isOriginal ? '6px 10px' : '2px 10px 0px'}; height: 32px; box-sizing: border-box;">
                       <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                          <span style="font-weight: 900; font-size: 10px; white-space: nowrap; color: ${isOriginal ? 'transparent' : '#000'};">Shipment Ref. No.</span>
                          <span style="${b18} padding: 0px 10px; flex: 1; text-align: center; font-weight: 700; height: 22px; line-height: 18px; box-sizing: border-box; display: inline-block; font-size: 13px; position: relative; top: ${isOriginal ? '0px' : '-2px'};">${bl.shipment_ref_no || ""}</span>
                       </div>
                    </td>
                  </tr>
               </table>
            </td>
          </tr>
        </table>

        <!-- PARTIES & BRANDING & LEGAL -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
          <tr>
            <td style="width: 53%; ${br22} vertical-align: top; padding: 0; ${isOriginal ? 'position: relative; height: 255px;' : ''}">
               <div style="padding: ${isOriginal ? '8px 10px 8px 0px' : '3px 8px'}; ${bb18} height: 85px; box-sizing: border-box; overflow: ${isOriginal ? 'visible' : 'hidden'}; ${isOriginal ? 'position: absolute; top: -25px; left: -10px; width: 100%;' : ''}">
                  ${isOriginal ? '' : '<div style="font-weight: 900; margin-bottom: 1px; font-size: 8.5px;">Consignor</div>'}
                  <div style="font-weight: 700; text-transform: uppercase; font-size: ${isOriginal ? '12px' : '9px'}; line-height: ${isOriginal ? '1.3' : '1.15'}; white-space: normal;">${formatAddress(bl.consignor || enquiry?.organization_name || "")}</div>
               </div>
               <div style="padding: ${isOriginal ? '8px 10px 8px 0px' : '3px 8px'}; ${bb18} height: 85px; box-sizing: border-box; overflow: ${isOriginal ? 'visible' : 'hidden'}; ${isOriginal ? 'position: absolute; top: 105px; left: -10px; width: 100%;' : ''}">
                  ${isOriginal ? '' : '<div style="font-weight: 900; margin-bottom: 1px; font-size: 8.5px;">Consignee (Or Order)</div>'}
                  <div style="font-weight: 700; text-transform: uppercase; font-size: ${isOriginal ? '12px' : '9px'}; line-height: ${isOriginal ? '1.3' : '1.15'}; white-space: normal;">${formatAddress(bl.consignee || "TO ORDER")}</div>
               </div>
               <div style="padding: ${isOriginal ? '8px 10px 8px 0px' : '3px 8px'}; height: 85px; box-sizing: border-box; overflow: ${isOriginal ? 'visible' : 'hidden'}; ${isOriginal ? 'position: absolute; top: 230px; left: -10px; width: 100%;' : ''}">
                  ${isOriginal ? '' : '<div style="font-weight: 900; margin-bottom: 1px; font-size: 8.5px;">Notify Address</div>'}
                  <div style="font-weight: 700; text-transform: uppercase; font-size: ${isOriginal ? '12px' : '9px'}; line-height: ${isOriginal ? '1.3' : '1.15'}; white-space: normal;">${formatAddress(bl.notify_party || "SAME AS CONSIGNEE")}</div>
               </div>
            </td>
            <td style="width: 47%; vertical-align: top; padding: 10px 12px; text-align: center;">
               <img src="${logo}" alt="Suraj Logo" style="width: 170px; margin: 0 auto 6px; display: block; opacity: ${isOriginal ? 0 : 1};" />
               <div style="font-size: 8.5px; line-height: 1.25; margin-bottom: 8px; font-weight: 700; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">
                  A-204,205, Wall Street II, Opp Orient Club, Ellis Bridge,<br/>
                  Ahmedabad - 380 006, (Gujarat) INDIA<br/>
                  Ph : (079) 3008 2020 / 21 / 22 | Fax : (079) 2640 1929<br/>
                  Email : info@surajforwarders.com | Site : www.surajforwarders.co
               </div>
               <div style="font-weight: 900; font-size: 12px; margin-bottom: 8px; border-bottom: 1.2px solid ${isOriginal ? 'transparent' : '#000'}; display: inline-block; padding-bottom: 2px; color: ${isOriginal ? 'transparent' : '#000'};">REGN NO. MTO/DGS/1148/JAN/2026</div>
               <div style="font-size: 7px; text-align: justify; margin-bottom: 6px; font-weight: 700; line-height: 1.2; color: ${isOriginal ? 'transparent' : '#000'};">${LEGAL_TEXT_1}</div>
               <div style="font-size: 7px; text-align: justify; margin-bottom: 12px; font-weight: 700; line-height: 1.2; color: ${isOriginal ? 'transparent' : '#000'};">${LEGAL_TEXT_2}</div>
               
               <div style="border-top: 1.8px solid ${isOriginal ? 'transparent' : '#000'}; padding-top: 8px; text-align: left; position: relative; top: ${isOriginal ? '30px' : '0'};">
                  <div style="font-weight: 900; border-bottom: 1.2px solid ${isOriginal ? 'transparent' : '#000'}; padding-bottom: 3px; margin-bottom: 6px; font-size: 10px; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">Agent Details</div>
                  <div style="font-size: 11.5px; line-height: 1.3; font-weight: 700; text-transform: uppercase; white-space: pre-wrap;">${bl.agent_details || '[OVERSEAS AGENT NAME]\n[OFFICE ADDRESS]\n[CITY / PORT], [COUNTRY]\nTEL: [PHONE]'}</div>
               </div>
            </td>
          </tr>
        </table>

        <!-- Wrapper to shift everything below the main table up by 30px in Original mode -->
        <div style="position: relative; top: ${isOriginal ? '-30px' : '0'};">

        <!-- PORT DATA GRID -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
          <tr style="${bb18}">
            <td style="width: 50%; ${br18} padding: 6px 10px 6px ${isOriginal ? '0px' : '8px'}; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Place of Acceptance</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '-3px' : '0'}; left: ${isOriginal ? '-10px' : '0'};">${bl.place_of_acceptance || enquiry?.place_of_receipt || ""}</div>
            </td>
            <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Port of Loading</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; left: ${isOriginal ? '-172px' : '0'}; top: ${isOriginal ? '-3px' : '0'};">${enquiry?.port_of_loading || ""}</div>
            </td>
          </tr> 
          <tr>
            <td style="width: 50%; ${br18} padding: 6px 10px 6px ${isOriginal ? '0px' : '8px'}; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Port of Discharge</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '-3px' : '0'}; left: ${isOriginal ? '-10px' : '0'};">${enquiry?.port_of_destination || ""}</div>
            </td>
            <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Place of Delivery</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; left: ${isOriginal ? '-172px' : '0'}; top: ${isOriginal ? '-3px' : '0'};">${enquiry?.port_of_destination || ""}</div>
            </td>
          </tr>
        </table> 

        <!-- VESSEL & TRANSPORT INFO -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
          <tr style="min-height: 40px;">
            <td style="width: 50%; ${br18} padding: 0; vertical-align: top;">
               <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                     <td style="width: 75%; ${br12} padding: 6px 10px 6px ${isOriginal ? '0px' : '8px'}; font-weight: 900; font-size: 9.5px; height: 31px; line-height: 1; color: ${isOriginal ? 'transparent' : '#000'};">Vessel & Voyage No.</td>
                     <td style="width: 25%; padding: 6px 10px; font-weight: 900; height: 31px; line-height: 1; font-size: 9.5px;">&nbsp;</td>
                  </tr>
                  <tr>
                     <td style="padding: 2px 10px 6px ${isOriginal ? '0px' : '8px'}; font-weight: 700; text-transform: uppercase; font-size: 12px;"><div style="position: relative; left: ${isOriginal ? '-10px' : '0'};">${bl.vessel_name || "[MV NAME AND VOY]"}</div></td>
                     <td style="padding: 2px 10px 6px; font-weight: 700; text-transform: uppercase; text-align: center;">&nbsp;</td>
                  </tr>
               </table>
            </td>
            <td style="width: 25%; ${br18} padding: 0; vertical-align: top;">
               <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 10px; font-weight: 900; font-size: 9.5px; height: 31px; line-height: 1; color: ${isOriginal ? 'transparent' : '#000'};">Mode of Transport</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 10px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px;">${bl.mode_of_transport || (enquiry?.shipment_type?.toUpperCase().includes('SEA') ? 'SEA' : 'AIR')}</td>
                  </tr>
               </table>
            </td>
            <td style="width: 25%; padding: 0; vertical-align: top;">
               <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 10px; font-weight: 900; font-size: 9.5px; height: 31px; line-height: 1; color: ${isOriginal ? 'transparent' : '#000'};">Route / transshipment</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 10px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px;">${bl.route_transshipment || ""}</td>
                  </tr>
               </table>
            </td>
          </tr>
        </table>

        <!-- CARGO DETAILS TABLE -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22}">
          <tr style="${bb18}; background-color: ${isOriginal ? 'transparent' : '#fcfcfc'};">
            <th style="width: 18%; ${br18} padding: 8px 10px 8px ${isOriginal ? '6px' : '8px'}; font-size: 8.5px; font-weight: 900; text-align: left; color: ${isOriginal ? 'transparent' : '#000'};">Container No (s)</th>
            <th style="width: 15%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: left; color: ${isOriginal ? 'transparent' : '#000'};">Marks & Numbers</th>
            <th style="width: 37%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: left; color: ${isOriginal ? 'transparent' : '#000'};">Number and kind of packages, general description of goods</th>
            <th style="width: 15%; ${br18} padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">Gross Weight</th>
            <th style="width: 15%; padding: 8px 6px; font-size: 8.5px; font-weight: 900; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">Measurement</th>
          </tr>
          <tr>
            <td style="${br18} min-height: 280px; height: 280px; vertical-align: top; padding: ${isOriginal ? '8px' : '12px'} 14px ${isOriginal ? '8px' : '12px'} ${isOriginal ? '0px' : '8px'}; font-size: 11.5px; line-height: 1.45; overflow-wrap: break-word; word-wrap: break-word;">
               <div style="${isOriginal ? 'position: relative; left: -10px;' : ''}">
                  <div style="font-weight: 900; white-space: pre-wrap;">${bl.container_numbers || autoContainerNumbers || "[CONTAINER DETAILS]"}</div> 
                  <div style="font-weight: 700; font-size: 10px; margin-top: 6px; white-space: pre-wrap;">${(bl.seal_numbers || autoSealNumbers) ? 'SEALS: ' + (bl.seal_numbers || autoSealNumbers) : ''}</div>
               </div>
            </td>
            <td style="${br18} vertical-align: top; padding: ${isOriginal ? '8px' : '12px'} 14px; font-size: 11.5px; line-height: 1.45; font-weight: 900; white-space: pre-wrap; overflow-wrap: break-word; word-wrap: break-word;">${bl.marks_numbers || "[SHIPPING MARKS]"}</td>
            <td style="${br18} vertical-align: top; padding: ${isOriginal ? '8px' : '12px'} 14px; font-size: 11.5px; line-height: 1.45; font-weight: 700; overflow-wrap: break-word; word-wrap: break-word;">
               <div style="max-height: 295px; overflow: hidden; display: flex; flex-direction: column; position: relative; left: ${isOriginal ? '10px' : '0'};">
                  <div style="font-weight: 900; margin-bottom: 10px; white-space: pre-wrap;">${bl.packages_description || "[NUMBER & KIND OF PACKAGES]"}</div>
                  <div style="white-space: pre-wrap; flex: 1;">${p1_desc || "[GOODS DESCRIPTION]"}</div>
                  <div style="margin-top: 5px;">${bl.hsn_code ? 'HSN: ' + bl.hsn_code : ''}</div>
               </div>
            </td>
            <td style="${br18} vertical-align: top; padding: ${isOriginal ? '8px' : '12px'} 14px; font-size: 12px; font-weight: 900; text-align: right;">
               ${bl.gross_weight || enquiry?.gross_weight || "0.000"} KGS
               <br/><br/>
               <span style="font-size: 11px; font-weight: 700; color: #333;">NET WEIGHT<br/>${enquiry?.net_weight || "0.000"} KGS</span>
            </td>
            <td style="vertical-align: top; padding: ${isOriginal ? '8px' : '12px'} 14px; font-size: 12px; font-weight: 900; text-align: right;">
               ${bl.measurement || "[CBM] CBM"}
                <br/><br/><br/><br/><br/>
                <div style="font-size: 11.5px; font-weight: 900; text-align: center; border-top: 1px solid ${isOriginal ? 'transparent' : '#eee'}; padding-top: 12px; line-height: 1.35; color: #000;">${freightLabel}</div>
            </td>
          </tr>
          </table>

        <!-- FREIGHT & ORIGINALS INFO -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; ${bb22} ${isOriginal ? 'margin-top: 12px;' : ''}">
          <tr style="min-height: 45px;">
            <td style="width: 25%; ${br18} padding: 6px 10px 6px ${isOriginal ? '0px' : '8px'}; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Freight Amount</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '45px' : '0'};">${bl.freight_amount || "AS AGREED"}</div>
            </td>
            <td style="width: 25%; ${br18} padding: 6px 10px; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Freight Payable at</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '45px' : '0'};">AHMEDABAD</div>
            </td>
            <td style="width: 25%; ${br18} padding: 6px 10px 6px 10px; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9px; color: ${isOriginal ? 'transparent' : '#000'};">Number of Original MTD (s)</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '45px' : '0'}; left: ${isOriginal ? '10px' : '0'};">${bl.no_of_originals || "3 (THREE)"}</div>
            </td>
            <td style="width: 25%; padding: 6px 10px 6px 20px; vertical-align: top;">
               <div style="font-weight: 900; margin-bottom: 3px; font-size: 9.5px; color: ${isOriginal ? 'transparent' : '#000'};">Place and Date of Issue</div>
               <div style="font-weight: 700; text-transform: uppercase; font-size: 12px; position: relative; top: ${isOriginal ? '40px' : '0'}; left: ${isOriginal ? '10px' : '0'};">${bl.place_of_issue || "AHMEDABAD"}<br/>${formatDate(enquiry?.sailing_date) || bl.date_of_issue || new Date().toLocaleDateString('en-GB')}</div>
            </td>
          </tr>
        </table>

        <!-- OTHER PARTICULARS & SIGNATORY -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="width: 58%; padding: 10px 12px 10px ${isOriginal ? '0px' : '8px'}; vertical-align: top; ${br22}">
               <div style="font-weight: 900; margin-top: 18px; margin-bottom: 6px; font-size: 10px; color: ${isOriginal ? 'transparent' : '#000'};">Other Particulars (If any)</div>
               <div style="white-space: pre-wrap; font-size: 11px; font-weight: 700; margin-bottom: 8px; position: relative; top: ${isOriginal ? '40px' : '0'};">${bl.other_particulars || ""}</div>
               <div style="margin-top: 30px; font-size: 9px; font-weight: 900; text-align: center; letter-spacing: 0.1px; color: ${isOriginal ? 'transparent' : '#000'};">Weight & Measurement of container not to be Included.</div>
               <div style="font-size: 9px; font-weight: 900; text-align: center; color: ${isOriginal ? 'transparent' : '#000'};">(TERMS CONTINUED ON BACK HERE OF)</div>
            </td>
            <td style="width: 42%; padding: 10px 15px; vertical-align: top; text-align: center;">
               <div style="font-weight: 900; font-size: 14.5px; margin-bottom: 65px; text-transform: uppercase; color: ${isOriginal ? 'transparent' : '#000'};">FOR SURAJ FORWARDERS PVT. LTD.</div>
               <div style="font-weight: 900; font-size: 12.5px; color: ${isOriginal ? 'transparent' : '#000'};">(Authorised Signatory)</div>
            </td>
          </tr>
        </table>
        </div>
      </div>
      ${p2_desc ? `
      <!-- SECOND PAGE (ANNEXURE) -->
      <div style="border: 2.2px solid ${isOriginal ? 'transparent' : '#000'}; padding: 20px 30px; width: 750px; height: 1040px; max-height: 1040px; overflow-y: hidden; overflow-x: visible; box-sizing: border-box; background-color: #fff; position: relative;">
        ${watermark}
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
          <div style="font-size: 15px; font-weight: 700; color: #000; text-align: left; margin: 0; line-height: 1.2;">Annexure to the Multimodal Transport Document.</div>
          <div style="font-size: 12px; font-weight: 700; color: #000; text-align: right; text-transform: uppercase;">MTD NO. : ${enquiry?.hbl_no || ""}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed;">
            <tr>
               <td style="width: 20%; vertical-align: top; padding: 0;">&nbsp;</td>
               <td style="width: 18%; vertical-align: top; padding: 0;">&nbsp;</td>
               <td style="width: 47%; vertical-align: top; padding: 0px 14px; font-size: 11.5px; line-height: 1.45; font-weight: 700; overflow-wrap: break-word; word-wrap: break-word;">
                  <div style="white-space: pre-wrap;">${p2_desc}</div>
               </td>
               <td style="width: 15%; vertical-align: top; padding: 0;">&nbsp;</td>
            </tr>
        </table>
      </div>
      ` : ''}
    </div>`;
};

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
  const [serverCounts, setServerCounts] = useState({
    Enquiry: 0,
    Rejected: 0,
    Pending: 0,
    "Draft BL": 0,
    SBO: 0,
    Billing: 0,
    "ETA Pending": 0,
    Delivery: 0,
    Completed: 0
  });

  const visibleTabs = useMemo(() => {
    const tabs = [];
    if (serverCounts.Enquiry > 0) tabs.push({ key: "Enquiry", count: serverCounts.Enquiry });
    if (serverCounts.Rejected > 0) tabs.push({ key: "Rejected", count: serverCounts.Rejected });

    tabs.push({ key: "Pending", count: serverCounts.Pending });
    tabs.push({ key: "Draft BL", count: serverCounts["Draft BL"] });
    tabs.push({ key: "SBO", count: serverCounts.SBO });
    tabs.push({ key: "Billing", count: serverCounts.Billing });
    tabs.push({ key: "ETA Pending", count: serverCounts["ETA Pending"] });
    tabs.push({ key: "Delivery", count: serverCounts.Delivery });
    tabs.push({ key: "Completed", count: serverCounts.Completed });

    return tabs;
  }, [serverCounts]);

  const fetchEnquiries = async (tabToFetch = activeTab) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/freight-enquiries`, {
        params: { tab: tabToFetch },
        withCredentials: true
      });
      if (res.data.success) {
        setRows(res.data.data || []);
        if (res.data.counts) {
          setServerCounts(res.data.counts);
        }
      }
    } catch (error) {
      console.error("Error fetching enquiries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (rows.length === 0) return;
    const initialData = {};
    rows.forEach((row) => {
      const jobId = row._id || row.enquiry_no;
      initialData[jobId] = {
        draftUploaded: !!row.documents?.hbl_copy || !!row.documents?.booking_copy || !!row.documents?.draft_bl || !!row.saved_quotation,
        draftApproved: row.draft_bl_approved === true,
        sboDate: row.sailing_date || "",
        agencyBillNo: row.billing_details?.agency_bill_no || "",
        agencyBillDate: row.billing_details?.agency_bill_date || "",
        reimbursementBillNo: row.billing_details?.reimbursement_bill_no || "",
        reimbursementBillDate: row.billing_details?.reimbursement_bill_date || "",
        arrivalDate: row.arrival_date || "",
      };
    });
    setPipelineData(initialData);
  }, [rows]);

  const downloadDraftPDF = async (row) => {
    try {
      const templateMarkup = generateBLTemplate(row, 'draft');
      const element = document.createElement("div");
      element.innerHTML = templateMarkup;

      await html2pdf()
        .from(element)
        .set({
          margin: [10, 5, 0, 5],
          filename: `Draft_MTD_${row.hbl_no || row.enquiry_no || "Freight"}.pdf`,
          image: { type: "jpeg", quality: 0.85 },
          html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 750 },
          jsPDF: { unit: "pt", format: "a4", orientation: "portrait", compress: true },
          pagebreak: { mode: ["css", "legacy"], avoid: "tr" },
        })
        .save();
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF");
    }
  };

  const updatePipelineValue = async (jobId, key, value) => {
    if (key === "draftApproved") {
      try {
        const res = await axios.put(`${API}/freight-enquiries/${jobId}`, { draft_bl_approved: value }, { withCredentials: true });
        if (res.data.success) {
          fetchEnquiries(activeTab);
        }
      } catch (err) {
        console.error("Error updating pipeline value:", err);
      }
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

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const needle = filters.search.trim().toUpperCase();
      const matchSearch =
        !needle ||
        [row.enquiry_no, row.success_no, row.rejected_no, row.organization_name, row.port_of_loading, row.port_of_destination]
          .filter(Boolean)
          .some((field) => String(field).toUpperCase().includes(needle));
      const matchShipment = !filters.shipment_type || row.shipment_type === filters.shipment_type;
      return matchSearch && matchShipment;
    });
  }, [rows, filters]);

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
                  <tr style={{ background: "linear-gradient(180deg, #245296 0%, #163666 100%)", color: "#fff", borderBottom: "2px solid #0f274a" }}>
                    {[
                      ["Pending", "Draft BL", "SBO", "Billing", "ETA Pending", "Delivery", "Completed"].includes(activeTab)
                        ? "Job No"
                        : activeTab === "Rejected"
                          ? "Rejected No"
                          : "Enquiry No",
                      "Consignee Details",
                      "Port & Routing",
                      "Container & Cargo Details",
                      "Tracking Dates",
                      "Logistics & Weights",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: h === "Actions" ? "center" : "left",
                          padding: "10px 12px",
                          fontWeight: "700",
                          fontSize: "11px",
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                          borderRight: "1px solid rgba(255,255,255,0.15)",
                          whiteSpace: "nowrap",
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
                      <td colSpan={7} style={{ padding: "40px 24px", textAlign: "center", color: "#64748b" }}>
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
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        onClick={() => handleRowClick(row)}
                      >
                        {/* Col 1: Job No / Identifiers / Badges / Document Info */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "165px", maxWidth: "210px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <span style={{ fontWeight: "800", color: "#19448aff", fontSize: "13px", borderBottom: "1.5px dashed #19448aff", width: "fit-content" }}>
                              {["Pending", "Draft BL", "SBO", "Billing", "ETA Pending", "Delivery", "Completed"].includes(activeTab)
                                ? row.success_no || row.enquiry_no
                                : activeTab === "Rejected"
                                  ? row.rejected_no || row.enquiry_no
                                  : row.enquiry_no}
                            </span>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ color: "#64748b", fontSize: "10px", fontWeight: "600" }}>Date: {row.enquiry_date}</span>
                              {row.source_job_no && (
                                <span
                                  style={{
                                    color: "#334155",
                                    fontSize: "9.5px",
                                    fontWeight: "600",
                                    backgroundColor: "#f1f5f9",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                    border: "1px solid #cbd5e1",
                                  }}
                                >
                                  Ref Job: {row.source_job_no}
                                </span>
                              )}
                              {(row.shipment_ref_no || row.bl_details?.shipment_ref_no) && (
                                <span
                                  style={{
                                    color: "#0f766e",
                                    fontSize: "9.5px",
                                    fontWeight: "600",
                                    backgroundColor: "#f0fdfa",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                    border: "1px solid #99f6e4",
                                  }}
                                >
                                  Ref: {row.shipment_ref_no || row.bl_details?.shipment_ref_no}
                                </span>
                              )}
                            </div>

                            {/* Pill Badges: Shipment Type, Container Size, Consignment Type, Goods Stuffed */}
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {row.shipment_type && (
                                <span
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: "700",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: "#eff6ff",
                                    color: "#1d4ed8",
                                    border: "1px solid #bfdbfe",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {row.shipment_type}
                                </span>
                              )}
                              {row.container_size && (
                                <span
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: "700",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: "#f1f5f9",
                                    color: "#334155",
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
                                    fontWeight: "700",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: "#f1f5f9",
                                    color: "#334155",
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
                                    fontWeight: "700",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: "#fef3c7",
                                    color: "#b45309",
                                    border: "1px solid #fde68a",
                                  }}
                                >
                                  {row.goods_stuffed}
                                </span>
                              )}
                            </div>

                            {/* Document Info Card */}
                            {(row.sb_no || row.egm_no || row.mbl_no || row.hbl_no || row.bl_details?.sb_no) && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "3px",
                                  backgroundColor: "#f8fafc",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0",
                                  marginTop: "2px",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "8.5px",
                                    fontWeight: "800",
                                    color: "#475569",
                                    borderBottom: "1px solid #cbd5e1",
                                    paddingBottom: "2px",
                                    marginBottom: "2px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                  }}
                                >
                                  DOCUMENT INFO
                                </div>
                                {(row.sb_no || row.bl_details?.sb_no) && (
                                  <div style={{ display: "flex", gap: "6px", alignItems: "baseline", fontSize: "10px" }}>
                                    <span style={{ color: "#64748b", fontWeight: "600", minWidth: "48px" }}>SB No:</span>
                                    <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                      {row.sb_no || row.bl_details?.sb_no} {row.sb_date ? `(${formatDateDisplay(row.sb_date)})` : ""}
                                    </span>
                                  </div>
                                )}
                                {row.egm_no && (
                                  <div style={{ display: "flex", gap: "6px", alignItems: "baseline", fontSize: "10px" }}>
                                    <span style={{ color: "#64748b", fontWeight: "600", minWidth: "48px" }}>EGM No:</span>
                                    <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                      {row.egm_no} {row.egm_date ? `(${formatDateDisplay(row.egm_date)})` : ""}
                                    </span>
                                  </div>
                                )}
                                {row.mbl_no && (
                                  <div style={{ display: "flex", gap: "6px", alignItems: "baseline", fontSize: "10px" }}>
                                    <span style={{ color: "#64748b", fontWeight: "600", minWidth: "48px" }}>MBL No:</span>
                                    <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                      {row.mbl_no} {row.mbl_date ? `(${formatDateDisplay(row.mbl_date)})` : ""}
                                    </span>
                                  </div>
                                )}
                                {row.hbl_no && (
                                  <div style={{ display: "flex", gap: "6px", alignItems: "baseline", fontSize: "10px" }}>
                                    <span style={{ color: "#64748b", fontWeight: "600", minWidth: "48px" }}>HBL No:</span>
                                    <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                      {row.hbl_no} {row.hbl_date ? `(${formatDateDisplay(row.hbl_date)})` : ""}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Col 2: Consignee Details */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "190px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "5px", backgroundColor: "#ffffff", padding: "8px 10px", borderRadius: "6px", border: "1px solid #f1f5f9", height: "100%", boxSizing: "border-box" }}>
                            <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              CONSIGNEE DETAILS
                            </div>
                            <div style={{ fontWeight: "700", fontSize: "12px", color: "#0f172a", lineHeight: "1.3" }}>
                              {getFirstLine(row.consignee_name || row.bl_details?.consignee || row.organization_name) || "-"}
                            </div>
                            {row.email && (
                              <div style={{ color: "#475569", fontSize: "10px" }}>
                                <span style={{ fontWeight: "600", color: "#64748b" }}>Email:</span> {row.email}
                              </div>
                            )}
                            {row.contact_no && (
                              <div style={{ color: "#475569", fontSize: "10px" }}>
                                <span style={{ fontWeight: "600", color: "#64748b" }}>Contact:</span> {row.contact_no}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Col 3: Port & Routing */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "200px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", backgroundColor: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#475569", borderBottom: "1px solid #cbd5e1", paddingBottom: "2px", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              PORT & ROUTING
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                              <span style={{ color: "#64748b", fontWeight: "600" }}>Receipt:</span>
                              <span style={{ color: "#0f172a", fontWeight: "700" }}>{row.place_of_receipt || row.bl_details?.place_of_acceptance || "-"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                              <span style={{ color: "#64748b", fontWeight: "600" }}>POL:</span>
                              <span style={{ color: "#0f172a", fontWeight: "700" }}>{row.port_of_loading || "-"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                              <span style={{ color: "#64748b", fontWeight: "600" }}>POD:</span>
                              <span style={{ color: "#0f172a", fontWeight: "700" }}>{row.port_of_destination || "-"}</span>
                            </div>

                            {row.bl_details?.vessel_name && (
                              <div style={{ marginTop: "2px", borderTop: "1px solid #e2e8f0", paddingTop: "3px", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Vessel:</span>
                                <span style={{ color: "#0f172a", fontWeight: "700" }}>
                                  {row.bl_details.vessel_name} {row.bl_details.voyage_no ? `V ${row.bl_details.voyage_no}` : ""}
                                </span>
                              </div>
                            )}
                            {row.shipping_line_airline && (
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Carrier:</span>
                                <span style={{ color: "#0f172a", fontWeight: "700" }}>{row.shipping_line_airline}</span>
                              </div>
                            )}

                            {/* Issue Place & No of MTD */}
                            {(row.bl_details?.place_of_issue || row.bl_details?.no_of_originals) && (
                              <div style={{ marginTop: "2px", borderTop: "1px solid #e2e8f0", paddingTop: "3px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                {row.bl_details?.place_of_issue && (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                    <span style={{ color: "#64748b", fontWeight: "600" }}>Issue Place:</span>
                                    <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.bl_details.place_of_issue}</span>
                                  </div>
                                )}
                                {row.bl_details?.no_of_originals && (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                    <span style={{ color: "#64748b", fontWeight: "600" }}>No of MTD:</span>
                                    <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.bl_details.no_of_originals}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Delay Reason */}
                            {row.delay_reason && (
                              <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", padding: "4px 6px", borderRadius: "4px", display: "flex", flexDirection: "column", gap: "1px", marginTop: "2px" }}>
                                <span style={{ fontSize: "8.5px", fontWeight: "800", color: "#d97706", textTransform: "uppercase" }}>Delay Reason:</span>
                                <span style={{ fontSize: "10px", fontWeight: "600", color: "#b45309", wordBreak: "break-word" }}>{row.delay_reason}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Col 4: Container & Cargo Details */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "190px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "3px",
                                backgroundColor: "#f8fafc",
                                padding: "8px 10px",
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
                                fontSize: "10px",
                                color: "#334155",
                              }}
                            >
                              <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#475569", borderBottom: "1px solid #cbd5e1", paddingBottom: "2px", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                CARGO DETAILS
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Pkgs:</span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                  {row.no_packages || "-"} {row.package_unit || ""}
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Gross Wt:</span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                  {row.gross_weight || "-"} {row.gross_weight_unit || ""}
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b", fontWeight: "600" }}>Net Wt:</span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                  {row.net_weight || "-"} {row.net_weight_unit || ""}
                                </span>
                              </div>
                              {row.volume_cbm && (
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ color: "#64748b", fontWeight: "600" }}>Volume:</span>
                                  <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                    {row.volume_cbm} {row.volume_unit || "CBM"}
                                  </span>
                                </div>
                              )}
                              {row.chargeable_weight && (
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ color: "#64748b", fontWeight: "600" }}>Chg Wt:</span>
                                  <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                    {row.chargeable_weight} {row.chargeable_weight_unit || "KG"}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Containers List */}
                            {row.containers && row.containers.length > 0 && row.containers.some(c => c.container_number || c.custom_seal || c.line_seal) && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "2px" }}>
                                {row.containers.map((c, cIdx) => (
                                  <div key={cIdx} style={{ fontSize: "9.5px", backgroundColor: "#f1f5f9", padding: "4px 6px", borderRadius: "5px", border: "1px solid #cbd5e1" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                                      <span style={{ fontWeight: "800", color: "#1e40af", fontFamily: "monospace", fontSize: "10.5px" }}>{c.container_number || "No Container #"}</span>
                                    </div>
                                    {(c.custom_seal || c.line_seal) && (
                                      <div style={{ display: "flex", gap: "8px", marginTop: "2px", color: "#475569" }}>
                                        {c.custom_seal && (
                                          <span><span style={{ fontWeight: "700", color: "#64748b" }}>Seal:</span> {c.custom_seal}</span>
                                        )}
                                        {c.line_seal && (
                                          <span><span style={{ fontWeight: "700", color: "#64748b" }}>L.Seal:</span> {c.line_seal}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Dimensions Grid */}
                            {row.dimensions && row.dimensions.length > 0 && row.dimensions.some(d => d.length && d.breadth && d.height) && (
                              <div style={{ marginTop: "3px", backgroundColor: "#faf5ff", border: "1px solid #e9d5ff", padding: "6px", borderRadius: "5px" }}>
                                <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#6b21a8", borderBottom: "1px solid #e9d5ff", paddingBottom: "2px", marginBottom: "3px", textTransform: "uppercase" }}>
                                  Dimensions Grid
                                </div>
                                <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr style={{ color: "#6b21a8", borderBottom: "1px solid #f3e8ff", fontWeight: "700" }}>
                                      <th style={{ textAlign: "left", padding: "1px" }}>Pkg</th>
                                      <th style={{ textAlign: "right", padding: "1px" }}>L x B x H</th>
                                      <th style={{ textAlign: "right", padding: "1px" }}>Gross</th>
                                      <th style={{ textAlign: "right", padding: "1px" }}>Vol</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.dimensions.map((d, dIdx) => (
                                      <tr key={dIdx} style={{ borderBottom: "1px solid rgba(107, 33, 168, 0.05)" }}>
                                        <td style={{ padding: "2px 1px", color: "#581c87", fontWeight: "600" }}>{d.no_packages || "-"}</td>
                                        <td style={{ padding: "2px 1px", textAlign: "right" }}>{d.length}x{d.breadth}x{d.height} {d.uom}</td>
                                        <td style={{ padding: "2px 1px", textAlign: "right" }}>{d.gross_weight || "-"}</td>
                                        <td style={{ padding: "2px 1px", textAlign: "right" }}>{d.calculated_cbm || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Col 5: Tracking Dates */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "170px" }}>
                          {(row.booking_date || row.cut_off_date || row.sailing_date || pipelineData[row._id || row.enquiry_no]?.sboDate || row.eta_date || row.arrival_date || pipelineData[row._id || row.enquiry_no]?.arrivalDate || row.consol_date) ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", backgroundColor: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                              <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#475569", borderBottom: "1px solid #cbd5e1", paddingBottom: "2px", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                TRANSIT DATES
                              </div>
                              {row.booking_date && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                  <span style={{ color: "#64748b", fontWeight: "600" }}>Booking:</span>
                                  <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                    {row.booking_no ? `${row.booking_no} (${formatDateDisplay(row.booking_date)})` : formatDateDisplay(row.booking_date)}
                                  </span>
                                </div>
                              )}
                              {row.cut_off_date && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                  <span style={{ color: "#64748b", fontWeight: "600" }}>Cut-off:</span>
                                  <span style={{ fontWeight: "700", color: "#0f172a" }}>{formatDateDisplay(row.cut_off_date)}</span>
                                </div>
                              )}
                              {(row.sailing_date || pipelineData[row._id || row.enquiry_no]?.sboDate) && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                  <span style={{ color: "#64748b", fontWeight: "600" }}>ETD:</span>
                                  <span style={{ fontWeight: "700", color: "#0f172a" }}>{formatDateDisplay(row.sailing_date || pipelineData[row._id || row.enquiry_no]?.sboDate)}</span>
                                </div>
                              )}
                              {row.eta_date && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                  <span style={{ color: "#64748b", fontWeight: "600" }}>E.T.A:</span>
                                  <span style={{ fontWeight: "700", color: "#0f172a" }}>{formatDateDisplay(row.eta_date)}</span>
                                </div>
                              )}
                              {(row.arrival_date || pipelineData[row._id || row.enquiry_no]?.arrivalDate) && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                  <span style={{ color: "#64748b", fontWeight: "600" }}>Arrival:</span>
                                  <span style={{ fontWeight: "700", color: "#0f172a" }}>{formatDateDisplay(row.arrival_date || pipelineData[row._id || row.enquiry_no]?.arrivalDate)}</span>
                                </div>
                              )}
                              {row.consol_date && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                  <span style={{ color: "#64748b", fontWeight: "600" }}>Consol Date:</span>
                                  <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                    {row.consol_no ? `${row.consol_no} (${formatDateDisplay(row.consol_date)})` : formatDateDisplay(row.consol_date)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "10px", fontStyle: "italic" }}>-</span>
                          )}
                        </td>

                        {/* Col 6: Logistics & Weights */}
                        <td style={{ padding: "10px 12px", verticalAlign: "top", minWidth: "175px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            {/* Transport & Sales Box */}
                            {(row.shipment_terms || row.cargo_type || row.freight_type || row.booking_thru || row.sales_person) && (
                              <div style={{ backgroundColor: "#f0fdfa", border: "1px solid #ccfbf1", padding: "6px 8px", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                                <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#0f766e", borderBottom: "1px solid #99f6e4", paddingBottom: "2px", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                  TRANSPORT & SALES
                                </div>
                                {row.shipment_terms && (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                    <span style={{ color: "#14b8a6", fontWeight: "600" }}>Terms:</span>
                                    <span style={{ fontWeight: "700", color: "#0f766e" }}>{row.shipment_terms}</span>
                                  </div>
                                )}
                                {row.cargo_type && (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                    <span style={{ color: "#14b8a6", fontWeight: "600" }}>Cargo Type:</span>
                                    <span style={{ fontWeight: "700", color: "#0f766e" }}>{row.cargo_type}</span>
                                  </div>
                                )}
                                {row.freight_type && (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                    <span style={{ color: "#14b8a6", fontWeight: "600" }}>Freight:</span>
                                    <span style={{ fontWeight: "700", color: "#0f766e" }}>{row.freight_type}</span>
                                  </div>
                                )}
                                {row.booking_thru && (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                    <span style={{ color: "#14b8a6", fontWeight: "600" }}>Booking Thru:</span>
                                    <span style={{ fontWeight: "700", color: "#0f766e" }}>{row.booking_thru}</span>
                                  </div>
                                )}
                                {row.sales_person && (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                                    <span style={{ color: "#14b8a6", fontWeight: "600" }}>Sales Person:</span>
                                    <span style={{ fontWeight: "700", color: "#0f766e" }}>{row.sales_person}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Manual Weights Box (Clean neutral slate styling) */}
                            {(row.net_weight_kg || row.gross_weight_kg || row.total_no_of_pkgs) && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px", backgroundColor: "#f8fafc", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "10px" }}>
                                <div style={{ fontSize: "8.5px", fontWeight: "800", color: "#475569", borderBottom: "1px solid #cbd5e1", paddingBottom: "2px", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                  MANUAL WEIGHTS
                                </div>
                                {row.net_weight_kg && (
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#64748b", fontWeight: "600" }}>Net Wt:</span>
                                    <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.net_weight_kg} KG</span>
                                  </div>
                                )}
                                {row.gross_weight_kg && (
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#64748b", fontWeight: "600" }}>Gross Wt:</span>
                                    <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.gross_weight_kg} KG</span>
                                  </div>
                                )}
                                {row.total_no_of_pkgs && (
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#64748b", fontWeight: "600" }}>Pkgs:</span>
                                    <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.total_no_of_pkgs} PKGS</span>
                                  </div>
                                )}
                                {row.volume_cbm && (
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#64748b", fontWeight: "600" }}>Volume:</span>
                                    <span style={{ fontWeight: "700", color: "#0f172a" }}>{row.volume_cbm} CBM</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "14px 12px", verticalAlign: "top" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                            {activeTab === "Draft BL" && (
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
                            )}

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

                            {row.status === "Converted" && row.shipment_type !== "Import-Air" && row.shipment_type !== "Export-Air" && (
                              <Tooltip title="Generate BL / Certificate">
                                <span>
                                  <CFreightBillOfLadingGenerator enquiry={row}>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => e.stopPropagation()}
                                      sx={{
                                        border: "1px solid #e2e8f0",
                                        backgroundColor: "#f8fafc",
                                        color: "#334155",
                                        "&:hover": { backgroundColor: "#e2e8f0", color: "#0f172a" },
                                      }}
                                    >
                                      <ReceiptIcon fontSize="small" />
                                    </IconButton>
                                  </CFreightBillOfLadingGenerator>
                                </span>
                              </Tooltip>
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
