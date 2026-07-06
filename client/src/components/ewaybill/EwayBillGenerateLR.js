import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Autocomplete,
  TextField,
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
  Box,
  Typography,
  Divider,
  Grid,
} from "@mui/material";
import "../../styles/ewaybill.scss";
import { getCityAndStateByPinCode } from "../../utils/getCityAndStateByPinCode";
import {
  runClientSideValidations,
  isSezGstin,
  validateVehicleNumber as validateVehicleFormat,
} from "./ewbValidationHelpers";

const validateVehicleNumber = validateVehicleFormat;

// ==========================================
// UTILITIES (Exported for reuse)
// ==========================================

export const mapEwbApiErrorToFields = (nicMessage) => {
  if (!nicMessage) return {};
  const lowerMsg = String(nicMessage).toLowerCase();

  const mappings = [
    { code: '302', field: 'consigneeGstin', msg: 'The Consignee GSTIN is invalid. Please check and correct.' },
    { code: '301', field: 'consignorGstin', msg: 'The Consignor GSTIN is invalid.' },
    { code: '305', field: 'dispatchFromPincode', msg: 'Dispatch From Pincode is invalid.' },
    { code: '308', field: 'shipToPincode', msg: 'Ship To Pincode is invalid.' },
    { code: '235', field: 'consigneeGstin', msg: 'Consignee GSTIN should belong to the state selected.' },
    { code: '234', field: 'consignorGstin', msg: 'Consignor GSTIN should belong to the state selected.' },
    { code: '237', field: 'dispatchFromPincode', msg: 'Dispatch from pincode must match the State.' },
    { code: '238', field: 'shipToPincode', msg: 'Ship to pincode must match the State.' },
    { code: '436', field: 'dispatchFromPincode', msg: 'Consignor pincode must be 999999 for imports.' },
    { code: '437', field: 'shipToPincode', msg: 'Consignee pincode must be 999999 for exports.' },
    { code: '223', field: 'documentNumber', msg: '223: Invalid Transaction Document Number' },
    { code: '604', field: 'documentNumber', msg: 'Duplicate! E-way bill(s) are already generated for the same document number.' },
    { code: '311', field: 'ewayBillNo', msg: 'Vehicle details cannot be updated because the validity period has expired.' },
    { code: '333', field: 'transporterId', msg: 'Invalid Transporter ID.' },
    { code: '334', field: 'transporterId', msg: 'Transporter ID is inactive.' },
    { code: '351', field: 'vehicleNo', msg: 'Invalid Vehicle Number format.' },
    { code: '281', field: 'ewayBillNo', msg: 'E-Way Bill is already expired; update is not allowed.' },
    { code: '601', field: 'items[0].hsnCode', msg: 'HSN code does not exist.' },
    { code: '605', field: 'items[0].hsnCode', msg: 'HSN Code should be at least 4-8 digits.' },
  ];

  const errors = {};
  mappings.forEach(m => {
    if (lowerMsg.includes(m.code) || lowerMsg.includes(m.msg.toLowerCase())) {
      errors[m.field] = nicMessage;
    }
  });

  return errors;
};

export const parseNicErrorMessage = (rawMsg) => {
  if (!rawMsg) return "An unknown error occurred.";
  let nicMessage = rawMsg;
  try {
    const innerObj = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;
    if (innerObj?.results?.message) {
      nicMessage = typeof innerObj.results.message === 'string' ? innerObj.results.message : JSON.stringify(innerObj.results.message);
    }
  } catch (e) { /* ignore parse error */ }

  const apiErrors = mapEwbApiErrorToFields(nicMessage);
  const firstFieldKey = Object.keys(apiErrors)[0];
  if (firstFieldKey && apiErrors[firstFieldKey]) {
    return apiErrors[firstFieldKey];
  }
  return nicMessage;
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Ladakh", "Lakshadweep",
  "Puducherry", "Other Territory"
];

const splitCompanyNameAndAddress = (fullString) => {
  if (!fullString) return { name: "", address: "" };
  const suffixes = ["Private Limited", "Pvt Ltd", "Ltd", "Inc", "LLP", "Corporation"];
  const pattern = new RegExp(`^(.+?\\b(?:${suffixes.join('|')})\\b)(.*)$`, 'i');
  const match = fullString.match(pattern);
  if (match) {
    return {
      name: match[1].trim(),
      address: match[2].trim().replace(/^[., \s]+|[., \s]+$/g, '')
    };
  }
  const fallbackParts = fullString.split(/\s{2,}|,/);
  return {
    name: fallbackParts[0]?.trim() || "",
    address: fallbackParts.slice(1).join(',').trim() || fullString
  };
};

const normalizeState = (stateName) => {
  if (!stateName) return "";
  if (stateName.toLowerCase() === "uttrakhand") return "Uttarakhand";
  const match = INDIAN_STATES.find(s => s.toLowerCase() === stateName.toLowerCase());
  return match || stateName;
};

const formatLrDocumentNumber = (docNo) => {
  if (!docNo) return "";
  let str = String(docNo).trim();

  const parts = str.split('/');
  if (parts.length >= 4) {
    const lastPart = parts[parts.length - 1];
    if (/^[0-9-]+$/.test(lastPart) && lastPart.length <= 9) {
      str = parts.slice(0, parts.length - 1).join('/');
    }
  }
  console.log("formatLrDocumentNumber: input =", docNo, "output =", str);
  return str.substring(0, 16);
};

const getBoeItemHsnCode = (item = {}) => {
  const candidates = [
    item.HSN_CODE, item.HSN, item.hsn_code, item.hsnCode,
    item.RITC, item.CTH, item.CTH_CODE, item.CTHNO, item.CETH,
  ];
  for (const value of candidates) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).replace(/[^0-9]/g, "").trim();
    if (normalized) return normalized;
  }
  return "";
};

const EMPTY_ITEM = {
  productName: "", productDesc: "", hsnCode: "", quantity: 1, qtyUnit: "NOS",
  taxableAmount: "", cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: 0, cessNonAdvol: 0
};

const DEFAULT_FORM = {
  supplyType: "outward", subSupplyType: "Supply", documentType: "Tax Invoice",
  transactionType: 1, documentNumber: "",
  documentDate: new Date().toISOString().split('T')[0],
  consignorName: "", consignorGstin: "", consignorState: "",
  consignorAddress1: "", consignorAddress2: "", consignorCity: "", consignorPincode: "",
  dispatchFromAddress1: "", dispatchFromCity: "", dispatchFromPincode: "", dispatchFromState: "",
  consigneeName: "", consigneeGstin: "", consigneeState: "",
  consigneeAddress1: "", consigneeAddress2: "", consigneeCity: "", consigneePincode: "",
  shipToAddress1: "", shipToCity: "", shipToPincode: "", shipToState: "",
  items: [{ ...EMPTY_ITEM }], otherAmount: 0, totalInvoiceValue: "",
  transporterId: process.env.REACT_APP_DEFAULT_GSTIN || "",
  transporterName: "", transporterDocNo: "",
  transporterDocDate: new Date().toISOString().split('T')[0],
  transportationMode: "Road", transportDistance: "", vehicleNo: "", vehicleType: "Regular",
  userGstin: "", reasonCode: "duetobreakdown", reasonText: "",
};

// ── Flat UI styles injected once ──────────────────────────────────────────────
const FLAT_STYLES = `
  .ewb-wrap { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1f36; background: #f5f7fa; min-height: 100vh; }
  .ewb-wrap.as-dialog { background: transparent; min-height: auto; }

  /* Header */
  .ewb-header { padding: 20px 24px 0; display: flex; justify-content: space-between; align-items: center; }
  .ewb-header h2 { font-size: 1.25rem; font-weight: 700; color: #1a1f36; margin: 0; }
  .ewb-close-btn { background: none; border: none; font-size: 1.4rem; color: #8898aa; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 4px; }
  .ewb-close-btn:hover { background: #f0f2f5; color: #1a1f36; }

  /* Form body */
  .ewb-form { padding: 16px 24px 32px; }

  /* Section */
  .ewb-section { margin-bottom: 28px; }
  .ewb-section-title {
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    color: #8898aa; margin: 0 0 14px 0; padding-bottom: 8px;
    border-bottom: 1px solid #e4e9f0; display: flex; align-items: center; gap: 8px;
  }
  .ewb-section-title .title-accent { width: 3px; height: 14px; border-radius: 2px; background: #3b5bdb; display: inline-block; }
  .ewb-section-title .title-accent.green { background: #0ca678; }
  .ewb-section-title .title-accent.amber { background: #f59f00; }
  .ewb-section-title .title-accent.purple { background: #7950f2; }
  .ewb-section-title .title-accent.red { background: #e03131; }
  .ewb-section-title .section-badge {
    margin-left: auto; font-size: 0.65rem; padding: 2px 8px; border-radius: 99px;
    font-weight: 600; letter-spacing: 0.04em;
  }
  .ewb-section-title .badge-sync { background: #e8f5e9; color: #2e7d32; }
  .ewb-section-title .badge-ind  { background: #fff3e0; color: #e65100; }

  /* Grid helpers */
  .ewb-grid { display: grid; gap: 14px; }
  .ewb-grid.cols-2 { grid-template-columns: 1fr 1fr; }
  .ewb-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  .ewb-grid.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .ewb-grid.cols-5 { grid-template-columns: repeat(5, 1fr); }
  .ewb-split { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

  /* Field */
  .ewb-field { display: flex; flex-direction: column; gap: 5px; }
  .ewb-label { font-size: 0.72rem; font-weight: 600; color: #525f7f; }
  .ewb-label.req::after { content: ' *'; color: #e03131; }
  .ewb-input, .ewb-select {
    height: 36px; padding: 0 10px; border: 1px solid #d9e2ec; border-radius: 6px;
    font-size: 0.875rem; color: #1a1f36; background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s; outline: none; width: 100%; box-sizing: border-box;
  }
  .ewb-input:focus, .ewb-select:focus { border-color: #3b5bdb; box-shadow: 0 0 0 3px rgba(59,91,219,0.1); }
  .ewb-input.err, .ewb-select.err { border-color: #e03131; background: #fff5f5; }
  .ewb-input:read-only { background: #f5f7fa; color: #8898aa; cursor: default; }
  .ewb-err { font-size: 0.72rem; color: #e03131; margin-top: 2px; }
  .ewb-hint { font-size: 0.7rem; color: #a0aec0; margin-top: 2px; }

  /* Radio group */
  .ewb-radio-group { display: flex; gap: 16px; height: 36px; align-items: center; }
  .ewb-radio-opt { display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.85rem; color: #525f7f; }
  .ewb-radio-opt input { accent-color: #3b5bdb; }

  /* Divider between two columns */
  .ewb-col-divider { width: 1px; background: #e4e9f0; }

  /* Info strip */
  .ewb-strip {
    padding: 10px 14px; border-radius: 6px; font-size: 0.82rem;
    display: flex; align-items: flex-start; gap: 10px; margin-bottom: 20px;
  }
  .ewb-strip.blue  { background: #eff6ff; border-left: 3px solid #3b5bdb; color: #1e40af; }
  .ewb-strip.green { background: #f0fdf4; border-left: 3px solid #0ca678; color: #065f46; }
  .ewb-strip.amber { background: #fffbeb; border-left: 3px solid #f59f00; color: #92400e; }
  .ewb-strip.red   { background: #fff5f5; border-left: 3px solid #e03131; color: #9b1c1c; }
  .ewb-strip.gray  { background: #f8fafc; border-left: 3px solid #cbd5e1; color: #475569; }

  /* Part B banner */
  .ewb-partb-banner {
    background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
    padding: 12px 16px; display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px;
  }
  .ewb-partb-banner .icon { font-size: 1.3rem; line-height: 1; }
  .ewb-partb-banner strong { font-size: 0.9rem; color: #78350f; display: block; }
  .ewb-partb-banner span  { font-size: 0.78rem; color: #92400e; }

  /* Part A preview */
  .ewb-parta-preview {
    background: #f8fafc; border: 1px solid #e4e9f0; border-radius: 8px;
    padding: 16px 18px; margin-bottom: 24px;
  }
  .ewb-parta-preview .preview-header {
    display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    font-size: 0.82rem; font-weight: 700; color: #525f7f; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .ewb-parta-preview .lock-badge {
    margin-left: auto; background: #e4e9f0; color: #8898aa;
    font-size: 0.68rem; padding: 2px 8px; border-radius: 99px; font-weight: 700;
  }
  .ewb-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px 20px; margin-bottom: 12px; }
  .ewb-meta-item .meta-label { font-size: 0.68rem; color: #a0aec0; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.04em; }
  .ewb-meta-item .meta-val   { font-size: 0.88rem; font-weight: 600; color: #1a1f36; }
  .ewb-meta-item .meta-val.large { font-size: 1rem; font-weight: 700; }
  .ewb-meta-item .meta-val.danger { color: #e03131; }
  .status-pill { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 0.72rem; font-weight: 700; }
  .status-pill.active { background: #d1fae5; color: #065f46; }
  .status-pill.cancelled { background: #fee2e2; color: #9b1c1c; }
  .ewb-party-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
  .ewb-party-box { background: #fff; border: 1px solid #e4e9f0; border-radius: 6px; padding: 10px 12px; }
  .ewb-party-box .party-dir { font-size: 0.65rem; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .ewb-party-box .party-gstin { font-size: 0.78rem; font-weight: 700; color: #3b5bdb; }
  .ewb-party-box .party-name  { font-size: 0.88rem; font-weight: 600; color: #1a1f36; }
  .ewb-party-box .party-addr  { font-size: 0.75rem; color: #8898aa; margin-top: 2px; }
  .ewb-divider { border: none; border-top: 1px solid #e4e9f0; margin: 10px 0; }

  /* Items table-like */
  .ewb-item-row { padding: 14px 0; border-bottom: 1px dashed #e4e9f0; }
  .ewb-item-row:last-child { border-bottom: none; padding-bottom: 0; }
  .ewb-item-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .ewb-item-label { font-size: 0.75rem; font-weight: 700; color: #8898aa; text-transform: uppercase; letter-spacing: 0.04em; }
  .ewb-remove-btn { background: none; border: none; color: #e03131; cursor: pointer; font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; }
  .ewb-remove-btn:hover { background: #fff5f5; }

  /* Container weight cards */
  .ewb-container-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .ewb-container-card { background: #fff; border: 1px solid #e4e9f0; border-radius: 8px; padding: 12px 14px; }
  .ewb-container-card .cc-label { font-size: 0.65rem; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .ewb-container-card .cc-no    { font-size: 0.9rem; font-weight: 700; color: #1a1f36; margin-bottom: 10px; }
  .ewb-container-card .cc-row   { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .ewb-container-card .cc-key   { font-size: 0.75rem; color: #8898aa; }
  .ewb-wt-input {
    width: 90px; text-align: right; padding: 3px 7px; border: 1px solid #d9e2ec;
    border-radius: 4px; font-size: 0.88rem; font-weight: 700; color: #3b5bdb;
  }
  .ewb-container-card .cc-val-row { display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border-radius: 4px; padding: 5px 8px; margin-top: 6px; }
  .ewb-container-card .cc-val-label { font-size: 0.7rem; font-weight: 700; color: #92400e; }
  .ewb-container-card .cc-val       { font-size: 0.88rem; font-weight: 800; color: #b45309; }

  /* Summary stat row */
  .ewb-stat-row { display: flex; gap: 24px; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px dashed #e4e9f0; flex-wrap: wrap; }
  .ewb-stat { }
  .ewb-stat .s-label { font-size: 0.65rem; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
  .ewb-stat .s-val   { font-size: 1.15rem; font-weight: 800; color: #3b5bdb; }
  .ewb-stat .s-val span { font-size: 0.82rem; font-weight: 600; color: #8898aa; margin-left: 3px; }

  /* Duty summary row */
  .ewb-duty-row { display: flex; gap: 14px; flex-wrap: wrap; }
  .ewb-duty-cell { flex: 1; min-width: 200px; background: #fff; border: 1px solid #e4e9f0; border-radius: 6px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
  .ewb-duty-cell .dc-label { font-size: 0.7rem; font-weight: 700; color: #525f7f; text-transform: uppercase; letter-spacing: 0.04em; }
  .ewb-duty-cell .dc-val   { font-size: 1rem; font-weight: 800; color: #1e3a8a; }

  /* Total row */
  .ewb-total-row { background: #f0f4ff; border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
  .ewb-total-row .t-label { font-size: 0.8rem; font-weight: 700; color: #3b5bdb; }
  .ewb-total-row .t-val   { font-size: 1.15rem; font-weight: 800; color: #1a1f36; }

  /* Buttons */
  .ewb-btn { height: 38px; padding: 0 20px; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; display: inline-flex; align-items: center; gap: 8px; }
  .ewb-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .ewb-btn.primary { background: #3b5bdb; color: #fff; }
  .ewb-btn.primary:hover:not(:disabled) { background: #2f4ac7; }
  .ewb-btn.secondary { background: #fff; border: 1px solid #d9e2ec; color: #525f7f; }
  .ewb-btn.secondary:hover:not(:disabled) { background: #f5f7fa; }
  .ewb-btn.ghost { background: none; color: #8898aa; }
  .ewb-btn.ghost:hover:not(:disabled) { color: #525f7f; }
  .ewb-btn.sm { height: 32px; padding: 0 12px; font-size: 0.8rem; }
  .ewb-btn.link { background: none; border: none; color: #3b5bdb; font-size: 0.78rem; text-decoration: underline; cursor: pointer; padding: 0; height: auto; }

  .ewb-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e4e9f0; }

  /* Success card */
  .ewb-success { text-align: center; padding: 40px 24px; }
  .ewb-success .success-icon { font-size: 2.5rem; margin-bottom: 12px; }
  .ewb-success h3 { font-size: 1.1rem; color: #065f46; margin: 0 0 6px; }
  .ewb-success .ewb-no { font-size: 1.6rem; font-weight: 800; color: #1a1f36; letter-spacing: 0.02em; margin: 10px 0 4px; }
  .ewb-success .ewb-meta { font-size: 0.82rem; color: #8898aa; margin-bottom: 20px; }

  /* Spinner */
  .ewb-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: ewbSpin 0.7s linear infinite; }
  .ewb-spinner.dark { border: 2px solid rgba(0,0,0,0.15); border-top-color: #525f7f; }
  @keyframes ewbSpin { to { transform: rotate(360deg); } }

  /* Mode badge */
  .ewb-mode-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; margin-bottom: 16px; }
  .ewb-mode-badge.import { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
  .ewb-mode-badge.export { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .ewb-mode-badge .dot { width: 7px; height: 7px; border-radius: 50%; }
  .ewb-mode-badge.import .dot { background: #3b82f6; }
  .ewb-mode-badge.export .dot { background: #22c55e; }

  /* MV table */
  .ewb-mv-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .ewb-mv-table th { padding: 7px 10px; background: #f5f7fa; color: #8898aa; font-weight: 700; text-align: left; border-bottom: 1px solid #e4e9f0; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .ewb-mv-table td { padding: 8px 10px; border-bottom: 1px solid #f0f2f5; color: #1a1f36; }

  /* Goods items preview table */
  .ewb-preview-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; margin-top: 8px; }
  .ewb-preview-table th { padding: 5px 8px; background: #f5f7fa; color: #8898aa; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; text-align: left; border-bottom: 1px solid #e4e9f0; }
  .ewb-preview-table td { padding: 6px 8px; border-bottom: 1px solid #f5f7fa; color: #1a1f36; }
  .ewb-preview-table td:last-child, .ewb-preview-table th:last-child { text-align: right; }

  /* Caluculated value banner */
  .ewb-calc-banner { background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; }
  .ewb-calc-banner .cb-title { font-size: 0.88rem; font-weight: 700; color: #047857; display: flex; align-items: center; gap: 6px; }
  .ewb-calc-banner .cb-formula { font-size: 0.78rem; color: #065f46; margin-top: 4px; }
  .ewb-calc-banner .cb-note    { font-size: 0.7rem; color: #a0aec0; margin-top: 2px; font-style: italic; }

  @media (max-width: 640px) {
    .ewb-grid.cols-2, .ewb-grid.cols-3, .ewb-grid.cols-4, .ewb-grid.cols-5, .ewb-split { grid-template-columns: 1fr; }
    .ewb-party-row { grid-template-columns: 1fr; }
    .ewb-form { padding: 12px 16px 24px; }
  }
`;

const FieldErrorContext = React.createContext({ renderErr: () => null });

const Field = ({ label, req, name, children, hint }) => {
  const { renderErr } = React.useContext(FieldErrorContext);
  return (
    <div className="ewb-field">
      <label className={`ewb-label${req ? ' req' : ''}`}>{label}</label>
      {children}
      {hint && <div className="ewb-hint">{hint}</div>}
      {renderErr ? renderErr(name) : null}
    </div>
  );
};

function EwayBillGenerateLR({
  asDialog = false,
  action = "",
  existingEwb = "",
  prefilledLrId = "",
  prData = null,
  prefilledAssessableValue = null,
  hideTabs = false,
  boeOnly = false,
  selectedContainers = null,
  containerSelectionMode = null,
  containerAssessableValues = {},
  boeData = null,
  prefetchedBoeLrData = null,
  boeCalcData = null,
  documentDate = null,
  document_no = null,
  onClose,
  onSuccess
}) {
  const [activeTab, setActiveTab] = useState('boe');
  const [actionTab, setActionTab] = useState('generate');
  const [isPartBOnly, setIsPartBOnly] = useState(false);
  const [existingEwbNo, setExistingEwbNo] = useState('');
  const [ewbMode, setEwbMode] = useState('general');
  const [isMultiContainerMode, setIsMultiContainerMode] = useState(false);
  const [generationMode, setGenerationMode] = useState('single');
  const [boeContainers, setBoeContainers] = useState([]);
  const [weightPerContainer, setWeightPerContainer] = useState(0);
  const [containerWeights, setContainerWeights] = useState({});
  const [showFormula, setShowFormula] = useState(false);
  const [totalValueFromBoe, setTotalValueFromBoe] = useState(0);
  const [perKgValue, setPerKgValue] = useState(0);
  const [assessableValueFromBoe, setAssessableValueFromBoe] = useState(0);
  const [totalBoeWeight, setTotalBoeWeight] = useState(0);
  const [nonRefundableDuties, setNonRefundableDuties] = useState(0);
  const [showFormulaDialog, setShowFormulaDialog] = useState(false);
  const [boeList, setBoeList] = useState([]);
  const [selectedBoe, setSelectedBoe] = useState(null);
  const [boeNumber, setBoeNumber] = useState('');
  const [boeDate, setBoeDate] = useState(new Date().toISOString().split('T')[0]);
  const [boeLoading, setBoeLoading] = useState(false);
  const [boeLrLoading, setBoeLrLoading] = useState(false);
  const [boeLrData, setBoeLrData] = useState(null);
  const [boeError, setBoeError] = useState('');
  const [boeAutoFetched, setBoeAutoFetched] = useState(false);
  const [partADetails, setPartADetails] = useState(null);
  const [partALoading, setPartALoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadResults, setUploadResults] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const lastFetchedPins = useRef({ from: '', to: '' });
  const lastPromptedPins = useRef({ dispatch: '', ship: '' });
  const [lrList, setLrList] = useState([]);
  const [selectedLrId, setSelectedLrId] = useState("");
  const [selectedLr, setSelectedLr] = useState(null);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(null);
  const generatedBoeDocumentsRef = useRef(new Set());
  const [dutySummary, setDutySummary] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [mvData, setMvData] = useState(null);
  const [mvLoading, setMvLoading] = useState(false);
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [addVehicleForm, setAddVehicleForm] = useState({
    vehicleNumber: "", transporterDocNo: "", transporterDocDate: "",
    quantity: "", modeOfTransport: "1", vehicleType: "r",
  });
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [autoFetchedBoe, setAutoFetchedBoe] = useState(false);
  const [dispatchCities, setDispatchCities] = useState([]);
  const [shipCities, setShipCities] = useState([]);
  const [pincodeChoices, setPincodeChoices] = useState({ dispatch: [], ship: [] });
  const [pincodeLoading, setPincodeLoading] = useState({ dispatch: false, ship: false });
  const [activePincodeDropdown, setActivePincodeDropdown] = useState(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const clearFieldError = (fieldName) => setFieldErrors(prev => { const u = { ...prev }; delete u[fieldName]; return u; });

  const updateContainerWeight = (scNo, oIdx, rawVal) => {
    if (rawVal !== "" && !/^\d*\.?\d*$/.test(rawVal)) return;

    if (oIdx !== -1) {
      setContainerWeights((prev) => ({ ...prev, [oIdx]: rawVal }));
    } else {
      setContainerWeights((prev) => ({ ...prev, [`manual_${scNo}`]: rawVal }));
    }

    setFormData((f) => {
      const ni = [...f.items];
      const containersToUse = selectedContainers?.length > 0 ? selectedContainers : boeContainers;
      const totalW = containersToUse.reduce((acc, scont) => {
        const sNo = (scont.container_number || scont.container_no || scont.containerNo || "").trim().toUpperCase();
        if (sNo === scNo) return acc + (parseFloat(rawVal) || 0);
        const oi = boeContainers.findIndex((bc) => {
          const bNo = (bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "").trim().toUpperCase();
          return bNo === sNo || (bNo && sNo && bNo.includes(sNo));
        });
        const w = oi !== -1 ? containerWeights[oi] : containerWeights[`manual_${sNo}`];
        const finalW = w !== undefined && w !== null ? w : (scont.gross_weight || scont.grossWeight || 0);
        return acc + (parseFloat(finalW) || 0);
      }, 0);
      const totalA = totalW * perKgValue;
      if (ni[0]) {
        ni[0].quantity = totalW;
        ni[0].taxableAmount = totalA.toFixed(2);
      }
      return { ...f, items: ni, totalInvoiceValue: totalA.toFixed(2) };
    });
  };

  const applyPincodeData = (city, state, type) => {
    setFormData(prev => {
      const isTypeDispatch = type === 'dispatch';
      const isSame = isTypeDispatch
        ? (prev.transactionType == 1 || prev.transactionType == 2)
        : (prev.transactionType == 1 || prev.transactionType == 3);

      const updated = {
        ...prev,
        [isTypeDispatch ? 'dispatchFromCity' : 'shipToCity']: city,
        [isTypeDispatch ? 'dispatchFromState' : 'shipToState']: normalizeState(state),
      };
      if (isSame) {
        updated[isTypeDispatch ? 'consignorCity' : 'consigneeCity'] = city;
        updated[isTypeDispatch ? 'consignorState' : 'consigneeState'] = normalizeState(state);
      }
      return updated;
    });
  };

  const selectPincodeChoice = (option, type) => {
    applyPincodeData(option.city, option.state, type);
    setActivePincodeDropdown(null);
  };

  const openPincodeDropdown = (type, pin) => {
    const options = pincodeChoices[type] || [];
    if (options.length > 1) {
      setActivePincodeDropdown(type);
      return;
    }

    const normalizedPin = String(pin || "").trim();
    if (normalizedPin.length === 6 && normalizedPin !== "999999" && options.length === 0) {
      handlePincodeData(normalizedPin, type, true);
    }
  };

  const renderPincodeChoices = (type) => {
    const options = pincodeChoices[type] || [];
    if (activePincodeDropdown !== type) return null;

    return (
      <div className="pincode-choice-menu">
        {pincodeLoading[type] && (
          <div className="pincode-choice-status">Searching pincode...</div>
        )}
        {options.map((option, index) => (
          <button
            type="button"
            className="pincode-choice-option"
            key={`${option.name || option.city}-${option.block || ""}-${option.state || ""}-${index}`}
            onMouseDown={(e) => {
              e.preventDefault();
              selectPincodeChoice(option, type);
            }}
          >
            <span className="pincode-choice-name">{option.name || option.city}</span>
            <span className="pincode-choice-meta">
              {[option.block, option.state].filter(Boolean).join(", ")}
            </span>
          </button>
        ))}
        {!pincodeLoading[type] && options.length === 0 && (
          <div className="pincode-choice-status">No post offices found</div>
        )}
      </div>
    );
  };

  const handlePincodeData = async (pin, type, isManual = false) => {
    if (!pin || pin.length !== 6 || pin === "999999") return;

    if (!isManual && lastPromptedPins.current[type] === pin) {
      return;
    }
    lastPromptedPins.current[type] = pin;

    if (isManual) {
      setActivePincodeDropdown(type);
    }
    setPincodeLoading(prev => ({ ...prev, [type]: true }));

    const data = await getCityAndStateByPinCode(pin);
    setPincodeLoading(prev => ({ ...prev, [type]: false }));

    if (data) {
      const options = data.options || [];
      if (type === 'dispatch') {
        setDispatchCities(options);
      } else {
        setShipCities(options);
      }
      setPincodeChoices(prev => ({ ...prev, [type]: options }));

      if (options.length > 1) {
        if (isManual) {
          setActivePincodeDropdown(type);
        }
      } else if (options.length === 1) {
        applyPincodeData(options[0].city, options[0].state, type);
        setActivePincodeDropdown(null);
      } else if (data.city && data.state) {
        applyPincodeData(data.city, data.state, type);
        setActivePincodeDropdown(null);
      }
    } else {
      setPincodeChoices(prev => ({ ...prev, [type]: [] }));
      if (isManual) {
        setActivePincodeDropdown(type);
      }
    }
  };

  const handlePincodeKeyDown = async (e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission!
      const pin = e.target.value?.trim();
      if (pin && pin.length === 6 && pin !== "999999") {
        await handlePincodeData(pin, type, true);
      }
    }
  };

  const ic = (name, base = '') => {
    const err = fieldErrors[name] ? ' err' : '';
    return `ewb-input${err}${base ? ' ' + base : ''}`;
  };

  const renderErr = (name) => fieldErrors[name]
    ? <div className="ewb-err">{fieldErrors[name]}</div>
    : null;

  const normalizeBoeDocumentNo = (documentNo) => String(documentNo || "").trim();

  const markBoeDocumentGenerated = (documentNo) => {
    const normalized = normalizeBoeDocumentNo(documentNo);
    if (!normalized) return;

    generatedBoeDocumentsRef.current.add(normalized);
    try {
      window.sessionStorage?.setItem(`ewaybill.generatedBoeDocument.${normalized}`, "1");
    } catch (error) {
      // Non-critical: the in-memory guard still covers the current mounted component.
    }
  };

  const shouldSkipBoeLrDataFetch = (documentNo) => {
    const normalized = normalizeBoeDocumentNo(documentNo);
    if (!normalized) return false;

    if (generatedBoeDocumentsRef.current.has(normalized)) return true;
    try {
      return window.sessionStorage?.getItem(`ewaybill.generatedBoeDocument.${normalized}`) === "1";
    } catch (error) {
      return false;
    }
  };

  // Local mapEwbApiErrorToFields (component-level, same as before)
  const mapLocalEwbErrors = (errorMessage, existing = {}) => {
    const errors = { ...existing };
    if (!errorMessage) return errors;
    const cleaned = String(errorMessage).replace(/\s+/g, ' ').trim();
    const codeMapping = [
      { code: '371', field: 'consignorState' },
      { code: '721', field: 'transportDistance' },
      { code: '437', field: 'consignorPincode' },
      { code: '436', field: 'shipToPincode' },
      { code: '254', field: 'items[0].igstRate' },
      { code: '223', field: 'documentNumber' },
      { code: '604', field: 'documentNumber' },
      { code: '362', field: 'transporterDocDate' },
      { code: '311', field: 'ewayBillNo' },
      { code: '302', field: 'items[0].hsnCode' },
      { code: '312', field: 'consignorPincode' },
      { code: '314', field: 'shipToPincode' },
    ];
    codeMapping.forEach(m => { if (cleaned.includes(m.code)) errors[m.field] = errors[m.field] || errorMessage; });
    if (!Object.keys(errors).length && cleaned.toLowerCase().includes('state') && cleaned.toLowerCase().includes('pincode')) {
      errors.consignorState = errors.consignorState || cleaned;
      errors.shipToPincode = errors.shipToPincode || cleaned;
    }
    return errors;
  };

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { fetchLrList(); fetchTransporters(); }, []);

  useEffect(() => {
    if (boeOnly) setActiveTab('boe');
    else if (activeTab === 'boe' && !boeOnly) setActiveTab('lr');
  }, [boeOnly]);

  useEffect(() => {
    if (selectedContainers && selectedContainers.length > 0) {
      setIsMultiContainerMode(true);
      setGenerationMode(containerSelectionMode === 'all' ? 'batch-all' : 'batch-selected');
    } else {
      setIsMultiContainerMode(false);
      setGenerationMode("single");
    }
  }, [selectedContainers, containerSelectionMode]);

  useEffect(() => {
    if (isMultiContainerMode && selectedContainers.length > 0) {
      const firstContainer = selectedContainers[0];
      if (generationMode === "batch-all") {
        if (boeNumber && !autoFetchedBoe) { setAutoFetchedBoe(true); handleBoeFetch(); }
        
        const targetVal = parseFloat(boeCalcData?.assessableValue || boeData?.assessableValue || prefilledAssessableValue || 0);
        const targetQty = selectedContainers.reduce((s, c) => s + parseFloat(c.gross_weight || 0), 0);
        
        const currentVal = parseFloat(formData.totalInvoiceValue) || 0;
        const currentQty = parseFloat(formData.items[0]?.quantity) || 0;
        const currentTaxable = parseFloat(formData.items[0]?.taxableAmount) || 0;

        if (targetVal > 0) {
          const hasChanged = 
            Math.abs(currentVal - targetVal) > 0.01 ||
            Math.abs(currentQty - targetQty) > 0.01 ||
            Math.abs(currentTaxable - targetVal) > 0.01;

          if (hasChanged) {
            setFormData((prev) => ({
              ...prev,
              totalInvoiceValue: targetVal.toFixed(2),
              items: [{ ...(prev.items[0] || {}), quantity: targetQty, taxableAmount: targetVal.toFixed(2) }],
            }));
          }
        }
      } else if (generationMode === "batch-selected") {
        if (selectedContainers.length === 1 && (containerAssessableValues[firstContainer._id] || firstContainer.gross_weight)) {
          const weightVal = parseFloat(firstContainer.gross_weight || 0);
          const assessableVal = parseFloat(firstContainer.assessable_value || 0) || (weightVal * (perKgValue || 0));
          const calcData = containerAssessableValues[firstContainer._id] || { weight: weightVal, assessableValue: assessableVal };
          
          const targetVal = parseFloat(calcData.assessableValue) || 0;
          const targetQty = parseFloat(calcData.weight) || 0;
          
          const currentVal = parseFloat(formData.totalInvoiceValue) || 0;
          const currentQty = parseFloat(formData.items[0]?.quantity) || 0;
          const currentTaxable = parseFloat(formData.items[0]?.taxableAmount) || 0;
          const currentCalcVal = parseFloat(formData.calculatedAssessableValue) || 0;

          const hasChanged = 
            Math.abs(currentVal - targetVal) > 0.01 ||
            Math.abs(currentQty - targetQty) > 0.01 ||
            Math.abs(currentTaxable - targetVal) > 0.01 ||
            Math.abs(currentCalcVal - targetVal) > 0.01;

          if (hasChanged) {
            setFormData((prev) => ({
              ...prev,
              totalInvoiceValue: targetVal.toFixed(2),
              calculatedAssessableValue: targetVal,
              items: [{ ...(prev.items[0] || {}), quantity: targetQty, taxableAmount: targetVal.toFixed(2) }],
            }));
          }
        }
      }
    }
  }, [isMultiContainerMode, selectedContainers, generationMode, boeData, prefilledAssessableValue, containerAssessableValues, formData, perKgValue, boeCalcData]);

  useEffect(() => {
    if (asDialog) {
      if (action === "update" && existingEwb) {
        setIsPartBOnly(true); setActionTab('update'); setExistingEwbNo(String(existingEwb)); fetchPartADetails(String(existingEwb));
      } else if (action === "generate") {
        setIsPartBOnly(false); setActionTab('generate'); setExistingEwbNo('');
      }
    }
  }, [asDialog, action, existingEwb]);

  useEffect(() => {
    if (documentDate) {
      const parsed = parseBoeDate(documentDate);
      setBoeDate(parsed);
      setFormData(prev => ({
        ...prev,
        documentDate: parsed
      }));
    }
  }, [documentDate]);

  useEffect(() => {
    if (document_no) {
      setBoeNumber(document_no);
      setFormData(prev => ({
        ...prev,
        documentNumber: document_no
      }));
    }
  }, [document_no]);

  useEffect(() => { if (boeData) populateFromBoe(boeData, prefetchedBoeLrData); }, [boeData, prefetchedBoeLrData]);

  useEffect(() => {
    const fromPin = String(formData.dispatchFromPincode || formData.consignorPincode || "").trim();
    const toPin = String(formData.shipToPincode || formData.consigneePincode || "").trim();
    if (fromPin.length === 6 && toPin.length === 6 && fromPin !== "999999" && toPin !== "999999") {
      if (lastFetchedPins.current.from === fromPin && lastFetchedPins.current.to === toPin) {
        return;
      }
      if (!formData.transportDistance || formData.transportDistance === 0) {
        lastFetchedPins.current = { from: fromPin, to: toPin };
        const t = setTimeout(() => fetchDistance(), 1000);
        return () => clearTimeout(t);
      }
    }
  }, [formData.dispatchFromPincode, formData.consignorPincode, formData.shipToPincode, formData.consigneePincode]);

  // Auto-fetch city/state from dispatchFromPincode
  useEffect(() => {
    const pin = String(formData.dispatchFromPincode || "").trim();
    if (pin.length === 6 && pin !== "999999") {
      handlePincodeData(pin, 'dispatch', false);
    }
  }, [formData.dispatchFromPincode]);

  // Auto-fetch city/state from shipToPincode
  useEffect(() => {
    const pin = String(formData.shipToPincode || "").trim();
    if (pin.length === 6 && pin !== "999999") {
      handlePincodeData(pin, 'ship', false);
    }
  }, [formData.shipToPincode]);

  useEffect(() => {
    if (boeList && boeList.length > 0 && boeNumber && !selectedBoe) {
      const m = boeList.find(b => (b.document_no || b.be_no || '') === boeNumber);
      if (m) setSelectedBoe(m);
    }
  }, [boeList, boeNumber]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchBoeList = async () => {
    try {
      const r = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-list`);
      if (r.data.success && r.data.data) setBoeList(r.data.data);
    } catch (e) { console.error("BOE list fetch:", e); }
  };

  const fetchBoeLrData = async (documentNo, documentDate) => {
    if (!documentNo) return;
    if (shouldSkipBoeLrDataFetch(documentNo)) return;
    try {
      setBoeLrLoading(true); setBoeError('');
      const r = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-lr-data?document_no=${encodeURIComponent(documentNo)}`);
      if (r.data.success && r.data.data) {
        const lrData = r.data.data;
        setBoeLrData(lrData);
        const ie = (lrData.import_export || '').toLowerCase().trim();
        let detectedMode = 'general', modeDefaults = {};
        if (ie === 'import') { detectedMode = 'import'; modeDefaults = { supplyType: 'inward', subSupplyType: 'Import', documentType: 'Bill of Entry', transactionType: 1 }; }
        else if (ie === 'export') { detectedMode = 'export'; modeDefaults = { supplyType: 'outward', subSupplyType: 'Export', documentType: 'Tax Invoice', transactionType: 1 }; }
        setEwbMode(detectedMode);
        if (lrData.eWay_bill && lrData.eWay_bill !== '' && lrData.eWay_bill !== null) {
          setIsPartBOnly(true); setActionTab('update'); setExistingEwbNo(String(lrData.eWay_bill));
          setFormData(prev => ({ ...prev, ...modeDefaults, vehicleNo: lrData.container_details?.vehicle_no || '', transporterDocNo: formatLrDocumentNumber(lrData.container_details?.tr_no || ''), documentNumber: (lrData.document_no), documentDate: documentDate || prev.documentDate }));
          fetchPartADetails(String(lrData.eWay_bill));
        } else {
          setIsPartBOnly(false); setExistingEwbNo('');
          setFormData(prev => {
            const res = {
              ...prev, ...modeDefaults, documentNumber: documentNo, documentDate: documentDate || prev.documentDate,
              consignorName: lrData.consignor?.name || '', consignorGstin: lrData.consignor?.gstin || '',
              consignorState: normalizeState(lrData.consignor?.branches?.[0]?.state || ''),
              consignorAddress1: lrData.consignor?.branches?.[0]?.address || '',
              consignorCity: lrData.consignor?.branches?.[0]?.city || '',
              consignorPincode: lrData.consignor?.branches?.[0]?.postalCode || '',
              consigneeName: lrData.consignee?.name || '', consigneeGstin: lrData.consignee?.gstin || '',
              consigneeState: normalizeState(lrData.consignee?.branches?.[0]?.state || ''),
              consigneeAddress1: lrData.consignee?.branches?.[0]?.address || '',
              consigneeCity: lrData.consignee?.branches?.[0]?.city || '',
              consigneePincode: lrData.consignee?.branches?.[0]?.postalCode || '',
              vehicleNo: lrData.container_details?.vehicle_no || '',
              transporterDocNo: formatLrDocumentNumber(lrData.container_details?.tr_no || ''),
            };
            if (res.consignorName.toLowerCase().includes("suraj")) { res.consignorGstin = "URP"; res.consignorPincode = "999999"; res.dispatchFromPincode = "999999"; }
            if (res.consigneeName.toLowerCase().includes("suraj")) { res.consigneeGstin = "URP"; res.consigneePincode = "999999"; res.shipToPincode = "999999"; }
            return res;
          });
        }
      }
    } catch (e) { console.error('BOE LR data fetch error:', e); }
    finally { setBoeLrLoading(false); }
  };

  const fetchPartADetails = async (ewbNo) => {
    if (!ewbNo) return;
    try {
      setPartALoading(true); setPartADetails(null);
      const r = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/ewb-part-a?ewbNo=${encodeURIComponent(ewbNo)}`);
      if (r.data.success && r.data.data) setPartADetails({ apiData: r.data.data, meta: r.data.meta });
    } catch (e) { console.error('Part A fetch error:', e); }
    finally { setPartALoading(false); }
  };

  const fetchLrList = async () => {
    try {
      setLoading(true);
      const r = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/lr-list`);
      if (r.data.data) setLrList(r.data.data);
    } catch (e) { console.error("LR list:", e); Swal.fire("Error", "Failed to fetch LR list", "error"); }
    finally { setLoading(false); }
  };

  const fetchTransporters = async () => {
    try {
      const r = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/transporters`);
      if (r.data.success) setTransporters(r.data.data);
    } catch (e) { console.error("Transporters:", e); }
  };

  // ── LR population ──────────────────────────────────────────────────────────
  const populateFormData = (selected) => {
    setSelectedLr(selected);
    const compositeId = selected._id && selected.container_details?._id
      ? `${selected._id}-${selected.container_details._id}` : selected._id;
    setSelectedLrId(compositeId);
    const ewbRef = selected.eWay_bill || selected.container_details?.eWay_bill;
    if (action !== "generate" && ewbRef && ewbRef !== "" && ewbRef !== null) {
      setIsPartBOnly(true); setActionTab('update'); setExistingEwbNo(String(ewbRef));
      setFormData(prev => ({ ...prev, vehicleNo: selected.container_details?.vehicle_no || "", transporterDocNo: selected.tr_no || "" }));
      return;
    }
    setIsPartBOnly(false); setExistingEwbNo('');
    const ie = (selected.import_export || '').toLowerCase().trim();
    let modeDefaults = {}, detectedMode = 'general';
    if (ie === 'import') { detectedMode = 'import'; modeDefaults = { supplyType: 'inward', subSupplyType: 'Import', documentType: 'Bill of Entry', transactionType: 1 }; }
    else if (ie === 'export') { detectedMode = 'export'; modeDefaults = { supplyType: 'outward', subSupplyType: 'Export', documentType: 'Tax Invoice', transactionType: 1 }; }
    setEwbMode(detectedMode);
    setFormData(prev => {
      const cSignorState = normalizeState(selected.consignor?.branches?.[0]?.state || "");
      const cSigneeState = normalizeState(selected.consignee?.branches?.[0]?.state || "");
      const cSignorAddr = selected.consignor?.branches?.[0]?.address || "";
      const cSignorCity = selected.consignor?.branches?.[0]?.city || "";
      const cSignorPin = selected.consignor?.branches?.[0]?.postalCode || "";
      const cSigneeAddr = selected.consignee?.branches?.[0]?.address || "";
      const cSigneeCity = selected.consignee?.branches?.[0]?.city || "";
      const cSigneePin = selected.consignee?.branches?.[0]?.postalCode || "";
      const res = {
        ...prev, ...modeDefaults,
        documentNumber: selected.document_no || "",
        documentDate: (selected.pr_date && !isNaN(new Date(selected.pr_date).getTime()))
          ? new Date(selected.pr_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        consignorName: selected.consignor?.name || "", consignorGstin: selected.consignor?.gstin || "",
        consignorState: cSignorState, consignorAddress1: cSignorAddr, consignorCity: cSignorCity, consignorPincode: cSignorPin,
        dispatchFromAddress1: cSignorAddr, dispatchFromCity: cSignorCity, dispatchFromPincode: cSignorPin, dispatchFromState: cSignorState,
        consigneeName: selected.consignee?.name || "", consigneeGstin: selected.consignee?.gstin || "",
        consigneeState: cSigneeState, consigneeAddress1: cSigneeAddr, consigneeCity: cSigneeCity, consigneePincode: cSigneePin,
        shipToAddress1: cSigneeAddr, shipToCity: cSigneeCity, shipToPincode: cSigneePin, shipToState: cSigneeState,
        transporterDocNo: formatLrDocumentNumber(selected.tr_no || ""),
        vehicleNo: selected.container_details?.vehicle_no || "",
        items: [{ productName: "Goods", productDesc: selected.description || "Goods Description", hsnCode: "", quantity: 1, qtyUnit: "NOS", taxableAmount: prefilledAssessableValue && prefilledAssessableValue > 0 ? prefilledAssessableValue : "", cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: 0, cessNonAdvol: 0 }],
        otherAmount: 0,
        totalInvoiceValue: prefilledAssessableValue && prefilledAssessableValue > 0 ? prefilledAssessableValue : ""
      };
      if (res.consignorName.toLowerCase().includes("suraj") || detectedMode === 'import' || res.consignorState === "Other Countries" || res.consignorState === "Other Territory") { res.consignorGstin = "URP"; res.consignorPincode = "999999"; res.dispatchFromPincode = "999999"; }
      if (res.consigneeName.toLowerCase().includes("suraj") || detectedMode === 'export' || res.consigneeState === "Other Countries" || res.consigneeState === "Other Territory") { res.consigneeGstin = "URP"; res.consigneePincode = "999999"; res.shipToPincode = "999999"; }
      return res;
    });
  };

  const handleLrSelect = useCallback(async (lrId) => {
    if (!lrId) { setSelectedLr(null); setIsPartBOnly(false); setExistingEwbNo(''); return; }
    const selected = lrList.find(lr => `${lr._id}-${lr.container_details._id}` === lrId);
    if (selected) populateFormData(selected);
  }, [lrList]);

  useEffect(() => {
    if (asDialog && activeTab === 'lr' && prefilledLrId && lrList.length > 0) {
      if (selectedLrId !== prefilledLrId) handleLrSelect(prefilledLrId);
    }
  }, [asDialog, activeTab, prefilledLrId, lrList, selectedLrId, handleLrSelect]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lrId = params.get("lr");
    const containerIndex = params.get("containerIndex");
    if (lrId) {
      setLoading(true);
      axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/lr-details?lrId=${lrId}&containerIndex=${containerIndex}`)
        .then(r => { if (r.data.success && r.data.data) populateFormData(r.data.data); })
        .catch(() => Swal.fire("Error", "Failed to load details for the selected LR", "error"))
        .finally(() => setLoading(false));
    }
  }, []);

  // ── BOE handlers ───────────────────────────────────────────────────────────
  const handleBoeSelect = (boeItem) => {
    if (!boeItem) {
      setSelectedBoe(null); setBoeNumber(''); setBoeDate(new Date().toISOString().split('T')[0]);
      setBoeLrData(null); setPartADetails(null); setEwbMode('general'); setIsPartBOnly(false); setExistingEwbNo('');
      return;
    }
    setSelectedBoe(boeItem);
    const docNo = boeItem.document_no || boeItem.be_no || '';
    setBoeNumber(docNo);
    let dateStr = boeItem.document_date || boeItem.be_date || '';
    if (dateStr && dateStr.includes('/')) {
      const p = dateStr.split('/');
      if (p.length === 3) dateStr = `${p[2].length === 2 ? '20' + p[2] : p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
    const resolvedDate = dateStr || new Date().toISOString().split('T')[0];
    setBoeDate(resolvedDate);
    fetchBoeLrData(docNo, resolvedDate);
  };

  const handleBoeFetch = async (manualDocNo = null, manualDocDate = null) => {
    const docToFetch = manualDocNo || boeNumber;
    const dateToFetch = manualDocDate || boeDate;
    if (!docToFetch) {
      Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter or select a BOE (Document) Number', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
      return;
    }
    try {
      setBoeLoading(true); setBoeError('');
      const [lrResponse, boeResponse] = await Promise.allSettled([
        shouldSkipBoeLrDataFetch(docToFetch)
          ? Promise.resolve({ data: { success: false, data: null } })
          : axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-lr-data?document_no=${encodeURIComponent(docToFetch)}`),
        axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-extract?be_no=${encodeURIComponent(docToFetch)}&be_date=${dateToFetch}`),
      ]);
      if (boeResponse.status === 'fulfilled') {
        const bd = boeResponse.value.data;
        if (!bd || bd.status === 'error') {
          Swal.fire({ icon: 'warning', title: 'BOE Details Not Found', text: 'No details found regarding this boe number so please fill details manually', toast: true, position: 'top-end', showConfirmButton: false, timer: 6000 });
          setBoeError('');
          if (lrResponse.status === 'fulfilled' && lrResponse.value.data?.data) populateFromBoe({}, lrResponse.value.data.data);
        } else {
          setActiveTab('boe');
          populateFromBoe(bd, lrResponse.status === 'fulfilled' ? lrResponse.value.data?.data : null);
        }
      } else {
        Swal.fire({ icon: 'warning', title: 'External API Unavailable', text: 'No details found regarding this boe number so please fill details manually', toast: true, position: 'top-end', showConfirmButton: false, timer: 6000 });
        setBoeError('');
        if (lrResponse.status === 'fulfilled' && lrResponse.value.data?.data) populateFromBoe({}, lrResponse.value.data.data);
      }
    } catch (e) {
      console.error('BOE fetch error:', e);
      Swal.fire({ icon: 'warning', title: 'Fetch Error', text: 'No details found regarding this boe number so please fill details manually', toast: true, position: 'top-end', showConfirmButton: false, timer: 6000 });
      setBoeError('');
    } finally { setBoeLoading(false); }
  };

  const parseBoeDate = (dateStr) => {
    if (!dateStr || dateStr === '0') return new Date().toISOString().split('T')[0];
    if (dateStr.includes('/')) {
      const p = dateStr.split('/');
      if (p.length === 3) { const yr = p[2].length === 2 ? '20' + p[2] : p[2]; return `${yr}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`; }
    }
    return dateStr;
  };

  const populateFromBoe = (record, lrData = null) => {
    setIsPartBOnly(false); setExistingEwbNo('');
    const cleanTransacting = (str) => {
      if (!str) return "";
      return String(str).replace(/\bTRANSACTING\b/ig, "").replace(/\s+/g, " ").trim();
    };
    if (!record) return;
    const boeDetail = record.data || record;
    const importerDetails = boeDetail.ImporterDetails || {};
    const invoiceDetails = boeDetail.InvoiceAndItemDetails || {};
    const dutySummaryData = boeDetail.DutySummary || {};
    setDutySummary(Object.keys(dutySummaryData).length > 0 ? dutySummaryData : null);
    const itemDutyRates = boeDetail.ItemDutyRates || [];
    const items = invoiceDetails.ITEMS || [];

    // ========== Multi‑Rate Guard: Stop if ItemDutyRates has multiple different IGST values ==========
    if (itemDutyRates.length > 0) {
      const uniqueIgstValues = new Set();
      for (const rateItem of itemDutyRates) {
        const igstVal = parseFloat(rateItem['IGST']) || 0;
        uniqueIgstValues.add(igstVal);
      }
      if (uniqueIgstValues.size > 1) {
        Swal.fire({
          icon: 'error',
          title: 'Multi‑Rate BOE Not Supported',
          text: 'This BOE has items with multiple different IGST rates, which requires manual review. Please enter values manually.',
          confirmButtonText: 'OK',
        });
        // Still initialize basic form state so user can edit manually
        return;
      }
    }
    // =================================================================================================

    const prDataMerge = record._prData || null;
    const directoryData = record._directoryData || {};
    const consignorSrc = lrData?.consignor || prDataMerge?.consignor || directoryData.consignor;
    const consigneeSrc = lrData?.consignee || prDataMerge?.consignee || directoryData.consignee;
    const supplierAddr = invoiceDetails.SUPPLIER_NAME_ADDRESS || '';
    const buyerAddr = invoiceDetails.BUYER_NAME_ADDRESS || '';
    const parsedSupplier = record._parsedData?.supplier || splitCompanyNameAndAddress(supplierAddr);
    const parsedBuyer = record._parsedData?.buyer || splitCompanyNameAndAddress(buyerAddr);
    const supplierName = parsedSupplier.name || '';
    const supplierCleanAddr = cleanTransacting(parsedSupplier.address || '');
    const supplierCity = parsedSupplier.city || '';
    const supplierPincode = parsedSupplier.pincode || '';
    const supplierState = parsedSupplier.state || '';
    const buyerName = parsedBuyer.name || '';
    const buyerCleanAddr = cleanTransacting(parsedBuyer.address || '');
    const buyerCity = parsedBuyer.city || '';
    const buyerPincode = parsedBuyer.pincode || '';
    const buyerState = parsedBuyer.state || '';
    const manifestDetails = boeDetail.ManifestDetails || {};
    const containerDetails = boeDetail.ContainerDetails || [];
    const totalGW = parseFloat(manifestDetails.GW) || parseFloat(record._job?.gross_weight) || parseFloat(record.job?.gross_weight) || parseFloat(lrData?.gross_weight) || parseFloat(prData?.gross_weight) || 0;
    const numContainers = containerDetails.length;
    const weightPerCont = numContainers > 0 ? (totalGW / numContainers).toFixed(2) : 0;
    setBoeContainers(containerDetails);
    setWeightPerContainer(weightPerCont);

    // ========== New Calculation Logic ==========
    // Formula (as validated against real BOE):
    //  Y (Total Taxable) = IGST Amount ÷ (IGST Rate / 100)
    //  Per KG Value       = Y ÷ Total Gross Weight (ManifestDetails.GW)
    //  Container Taxable  = Per KG Value × Container Weight
    //  Container IGST     = Container Taxable × IGST Rate
    //  Total Inv. Amt      = Container Taxable + Container IGST
    const igstAbsolute = parseFloat(dutySummaryData['IGST']) || 0;
    const igstRate = itemDutyRates.length > 0 ? (parseFloat(itemDutyRates[0]['IGST']) || 0) : 0;
    const calcTotalValue = igstRate > 0 ? (igstAbsolute / (igstRate / 100)) : 0;
    const calcPerKgValue = totalGW > 0 ? (calcTotalValue / totalGW) : 0;
    const effectiveIgstPercent = igstRate;
    const totalAssVal = parseFloat(dutySummaryData['TOT.ASS VAL']) || 0; // keep for legacy reference
    const bcdVal = parseFloat(dutySummaryData['BCD']) || 0;
    const swsVal = parseFloat(dutySummaryData['SWS']) || parseFloat(dutySummaryData['SW Surcharge']) || 0;
    const addVal = parseFloat(dutySummaryData['ADD']) || parseFloat(dutySummaryData['Anti Dumping']) || parseFloat(dutySummaryData['Anti-Dumping']) || parseFloat(dutySummaryData['Anti Dumping Duty']) || parseFloat(dutySummaryData['Anti-Dumping Duty']) || 0;
    const cvdVal = parseFloat(dutySummaryData['CVD']) || parseFloat(dutySummaryData['Countervailing']) || parseFloat(dutySummaryData['Countervailing Duty']) || 0;
    const nccdVal = parseFloat(dutySummaryData['NCCD']) || 0;
    const safeguardVal = parseFloat(dutySummaryData['Safeguard']) || parseFloat(dutySummaryData['Safeguard Duty']) || 0;
    // ===========================================

    setTotalValueFromBoe(calcTotalValue);
    setPerKgValue(calcPerKgValue);
    setAssessableValueFromBoe(totalAssVal);
    setTotalBoeWeight(totalGW);
    setNonRefundableDuties(bcdVal + swsVal + addVal + cvdVal + nccdVal + safeguardVal);
    const initialWeights = {};
    let totalSelectedWeight = 0;
    containerDetails.forEach((bc, idx) => {
      const bcNo = (bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "").trim().toUpperCase();
      const matchedSelected = selectedContainers?.find(sc => {
        const scNo = (sc.container_number || sc.container_no || "").trim().toUpperCase();
        return scNo === bcNo || (bcNo && scNo && bcNo.includes(scNo));
      });
      if (matchedSelected && (matchedSelected.gross_weight || matchedSelected.grossWeight)) {
        const weight = parseFloat(matchedSelected.gross_weight || matchedSelected.grossWeight || 0);
        initialWeights[idx] = weight || "";
        totalSelectedWeight += (weight || 0);
      } else {
        initialWeights[idx] = "";
      }
    });
    if (totalSelectedWeight === 0 && selectedContainers?.length === 1) totalSelectedWeight = parseFloat(selectedContainers[0].gross_weight || selectedContainers[0].grossWeight || 0);
    setContainerWeights(initialWeights);
    const docNoVal = boeDetail.BE_NO || boeDetail.document_no || boeNumber;
    let docDateVal = boeDetail.BE_DATE || boeDetail.document_date || documentDate || boeDate;
    if (docDateVal) docDateVal = parseBoeDate(docDateVal);
    const mappedItems = items.length > 0 ? items.map((item) => ({
      productName: item.DESCRIPTION || "Goods", productDesc: item.DESCRIPTION || "",
      hsnCode: getBoeItemHsnCode(item), quantity: parseFloat(item.QUANTITY) || 1,
      qtyUnit: item.UQC || "KGS", taxableAmount: item.AMOUNT || "",
      cgstRate: 0, sgstRate: 0, igstRate: effectiveIgstPercent, cessRate: 0, cessNonAdvol: 0
    })) : [{ ...EMPTY_ITEM, igstRate: effectiveIgstPercent }];
    const ie = (lrData?.import_export || '').toLowerCase().trim();
    let modeDefaults = {}, detectedMode = 'general';
    if (ie === 'import' || ie === 'inward') { detectedMode = 'import'; modeDefaults = { supplyType: 'inward', subSupplyType: 'Import', documentType: 'Bill of Entry', transactionType: 1 }; }
    else if (ie === 'export' || ie === 'outward') { detectedMode = 'export'; modeDefaults = { supplyType: 'outward', subSupplyType: 'Export', documentType: 'Tax Invoice', transactionType: 1 }; }
    setFormData(prev => {
      const isImport = (ie === 'import' || ie === 'inward');
      const cSignorSt = isImport ? "Other Country" : normalizeState(supplierState || consignorSrc?.branches?.[0]?.state || "");
      const cSignorAd = cleanTransacting(supplierCleanAddr || consignorSrc?.branches?.[0]?.address || "");
      const cSignorCi = supplierCity || consignorSrc?.branches?.[0]?.city || "";
      const cSignorPin = isImport ? "999999" : (supplierPincode || consignorSrc?.branches?.[0]?.postalCode || "");
      const cSigneeSt = normalizeState(buyerState || consigneeSrc?.branches?.[0]?.state || "");
      const cSigneeAd = cleanTransacting(buyerCleanAddr || consigneeSrc?.branches?.[0]?.address || "");
      const cSigneeCi = buyerCity || consigneeSrc?.branches?.[0]?.city || "";
      const cSigneePin = buyerPincode || consigneeSrc?.branches?.[0]?.postalCode || "";
      const res = {
        ...prev, ...modeDefaults,
        documentNumber: docNoVal,
        documentDate: docDateVal,
        consignorName: supplierName || consignorSrc?.name || "", consignorGstin: consignorSrc?.gstin || "",
        consignorState: cSignorSt, consignorAddress1: cSignorAd, consignorCity: cSignorCi, consignorPincode: cSignorPin,
        dispatchFromAddress1: cSignorAd, dispatchFromCity: cSignorCi, dispatchFromPincode: cSignorPin, dispatchFromState: cSignorSt,
        consigneeName: buyerName || consigneeSrc?.name || "", consigneeGstin: consigneeSrc?.gstin || importerDetails['GSTIN/TYPE'] || "",
        consigneeState: cSigneeSt, consigneeAddress1: cSigneeAd, consigneeCity: cSigneeCi, consigneePincode: cSigneePin,
        shipToAddress1: cSigneeAd, shipToCity: cSigneeCi, shipToPincode: cSigneePin, shipToState: cSigneeSt,
        vehicleNo: lrData?.container_details?.vehicle_no || prev.vehicleNo || "",
        transporterDocNo: formatLrDocumentNumber(lrData?.container_details?.tr_no || prev.transporterDocNo || ""),
        items: mappedItems, otherAmount: 0,
        totalInvoiceValue: totalSelectedWeight > 0 
          ? (totalSelectedWeight * calcPerKgValue).toFixed(2) 
          : (calcTotalValue ? calcTotalValue.toFixed(2) : (dutySummaryData['TOT.ASS VAL'] || "")),
        transportDistance: isImport ? 0 : Math.min(parseInt(lrData?.transport_distance || lrData?.container_details?.transport_distance || prev.transportDistance || 0), 4000),
      };
      if (totalSelectedWeight > 0 && res.items?.length > 0) { 
        res.items[0].quantity = totalSelectedWeight; 
        res.items[0].taxableAmount = (totalSelectedWeight * calcPerKgValue).toFixed(2); 
      } else if (res.items?.length > 0 && calcTotalValue > 0) {
        res.items[0].taxableAmount = calcTotalValue.toFixed(2);
        res.items[0].quantity = totalGW || res.items[0].quantity || 1;
      }
      if (prefilledAssessableValue && prefilledAssessableValue > 0) { res.totalInvoiceValue = prefilledAssessableValue; if (res.items?.length > 0) res.items[0].taxableAmount = prefilledAssessableValue; }
      if (res.consignorName.toLowerCase().includes("suraj") || detectedMode === 'import' || res.consignorState === "Other Countries" || res.consignorState === "Other Territory") { res.consignorGstin = "URP"; res.consignorPincode = "999999"; res.dispatchFromPincode = "999999"; }
      if (res.consigneeName.toLowerCase().includes("suraj") || detectedMode === 'export' || res.consigneeState === "Other Countries" || res.consigneeState === "Other Territory") { res.consigneeGstin = "URP"; res.consigneePincode = "999999"; res.shipToPincode = "999999"; }
      return res;
    });
  };

  // ── Excel tab handlers ─────────────────────────────────────────────────────
  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (['pdf'].includes(ext)) { setUploadedFile(file); setUploadError(''); setUploadResults([]); }
      else setUploadError("Only .pdf files are allowed");
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) { setUploadError("Please select a file first"); return; }
    try {
      setUploadLoading(true); setUploadError('');
      const fd = new FormData(); fd.append('file', uploadedFile);
      const r = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const data = r.data;
      let records = [];
      if (data.status === 'success' && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) records = Object.values(data.data);
      else records = Array.isArray(data) ? data : (data.records || data.data || [data]);
      if (records.length === 0) { setUploadError("No records found in the uploaded file"); return; }
      if (records.length === 1 && records[0]?.error) { setUploadError(records[0].error); return; }
      if (records.length === 1) populateFromBoe(records[0]);
      else setUploadResults(records);
    } catch (e) { console.error("Upload error:", e); setUploadError(e.response?.data?.message || "Failed to upload file. Please try again."); }
    finally { setUploadLoading(false); }
  };

  const selectUploadRecord = (record) => { populateFromBoe(record); setUploadResults([]); };

  // ── Tab switching ──────────────────────────────────────────────────────────
  const handleTabSwitch = (tab) => {
    if (boeOnly && tab !== 'boe') return;
    if (tab === activeTab) return;
    const hasData = formData.documentNumber || formData.consignorName || formData.consigneeName || formData.items.some(item => item.hsnCode || item.taxableAmount);
    if (hasData) {
      Swal.fire({ title: 'Switch Tab?', text: 'Switching tabs will reset the current form data.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Switch', cancelButtonText: 'Stay', didOpen: () => { if (Swal.getContainer()) Swal.getContainer().style.zIndex = "1301"; } })
        .then(r => { if (r.isConfirmed) performTabSwitch(tab); });
    } else performTabSwitch(tab);
  };

  const performTabSwitch = (tab) => {
    setActiveTab(tab); handleReset();
    setSelectedBoe(null); setBoeNumber(''); setBoeDate(new Date().toISOString().split('T')[0]);
    setBoeError(''); setBoeLrData(null); setPartADetails(null); setEwbMode('general');
    setUploadedFile(null); setUploadResults([]); setUploadError(''); setDutySummary(null);
  };

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    clearFieldError(name);
    if (name === "dispatchFromPincode") {
      setActivePincodeDropdown(null);
      if (value.trim().length !== 6) {
        lastPromptedPins.current.dispatch = "";
        setPincodeChoices(prev => ({ ...prev, dispatch: [] }));
      }
    }
    if (name === "shipToPincode") {
      setActivePincodeDropdown(null);
      if (value.trim().length !== 6) {
        lastPromptedPins.current.ship = "";
        setPincodeChoices(prev => ({ ...prev, ship: [] }));
      }
    }
    setFormData(prev => {
      const valToUse = name === "transporterDocNo" ? formatLrDocumentNumber(value) : value;
      let n = { ...prev, [name]: valToUse };
      if (name === "subSupplyType") {
        if (value === "Import") { n.supplyType = "inward"; n.documentType = "Bill of Entry"; }
        else if (value === "Export") { n.supplyType = "outward"; n.documentType = "Tax Invoice"; }
      }
      if (name === "supplyType") {
        if (value === "inward" && n.subSupplyType === "Export") n.subSupplyType = "Supply";
        if (value === "outward" && n.subSupplyType === "Import") n.subSupplyType = "Supply";
      }
      if (name === "consignorGstin" && value.trim().toUpperCase() === "URP") {
        n.consignorPincode = "999999";
        if (n.transactionType == 1 || n.transactionType == 2) n.dispatchFromPincode = "999999";
      }
      if (name === "consignorName" && value.toLowerCase().includes("suraj")) {
        n.consignorGstin = "URP"; n.consignorPincode = "999999";
        if (n.transactionType == 1 || n.transactionType == 2) n.dispatchFromPincode = "999999";
      }
      if (name === "dispatchFromCity") {
        const matched = dispatchCities.find(c => c.city === value);
        if (matched) {
          n.dispatchFromState = matched.state;
          if (n.transactionType == 1 || n.transactionType == 2) {
            n.consignorState = matched.state;
          }
        }
      }
      if (name === "shipToCity") {
        const matched = shipCities.find(c => c.city === value);
        if (matched) {
          n.shipToState = matched.state;
          if (n.transactionType == 1 || n.transactionType == 3) {
            n.consigneeState = matched.state;
          }
        }
      }
      const isDispatchSame = n.transactionType == 1 || n.transactionType == 2;
      const isShipSame = n.transactionType == 1 || n.transactionType == 3;
      if (isDispatchSame) {
        if (["dispatchFromAddress1", "dispatchFromCity", "dispatchFromPincode", "dispatchFromState"].includes(name)) { const sfx = name.replace("dispatchFrom", ""); n[`consignor${sfx}`] = value; }
        if (name === "consignorState") n.dispatchFromState = value;
      }
      if (isShipSame) {
        if (["shipToAddress1", "shipToCity", "shipToPincode", "shipToState"].includes(name)) { const sfx = name.replace("shipTo", ""); n[`consignee${sfx}`] = value; }
        if (name === "consigneeState") n.shipToState = value;
      }
      if (name === "transactionType") {
        const val = parseInt(value);
        if (val === 1 || val === 2) { n.consignorAddress1 = n.dispatchFromAddress1; n.consignorCity = n.dispatchFromCity; n.consignorPincode = n.dispatchFromPincode; n.dispatchFromState = n.consignorState; }
        if (val === 1 || val === 3) { n.consigneeAddress1 = n.shipToAddress1; n.consigneeCity = n.shipToCity; n.consigneePincode = n.shipToPincode; n.shipToState = n.consigneeState; }
      }
      if (name === "consignorGstin" && isSezGstin(value)) { n.consignorState = "Other Territory"; n.dispatchFromState = "Other Territory"; }
      if (name === "transportationMode" && (value === "Ship" || value === "4")) n.vehicleType = "o";
      if (name === 'otherAmount') { const oa = parseFloat(value) || 0; n.totalInvoiceValue = (calculateItemsTotal(prev.items) + oa).toFixed(2); }
      return n;
    });
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    clearFieldError(`items[${index}].${name}`);
    setFormData(prev => {
      const ni = [...prev.items]; ni[index] = { ...ni[index], [name]: value };
      const oa = parseFloat(prev.otherAmount) || 0;
      return { ...prev, items: ni, totalInvoiceValue: (calculateItemsTotal(ni) + oa).toFixed(2) };
    });
  };

  const addItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData(prev => {
      const ni = prev.items.filter((_, i) => i !== index);
      const oa = parseFloat(prev.otherAmount) || 0;
      return { ...prev, items: ni, totalInvoiceValue: (calculateItemsTotal(ni) + oa).toFixed(2) };
    });
  };

  const calculateItemsTotal = (items) => items.reduce((acc, item) => {
    const t = parseFloat(item.taxableAmount) || 0;
    return acc + t + (t * (parseFloat(item.cgstRate) || 0)) / 100 + (t * (parseFloat(item.sgstRate) || 0)) / 100
      + (t * (parseFloat(item.igstRate) || 0)) / 100 + (t * (parseFloat(item.cessRate) || 0)) / 100
      + (parseFloat(item.cessNonAdvol) || 0);
  }, 0);

  const getEffectiveUserGstin = (fd = formData) => {
    const val = (fd.userGstin || (fd.supplyType === 'inward' ? fd.consigneeGstin : fd.consignorGstin) || "").toString().trim().toUpperCase();
    return (val && val !== "URP") ? val : (process.env.REACT_APP_DEFAULT_GSTIN || "");
  };

  const handleTransporterChange = (e) => {
    const value = e.target.value;
    const found = transporters.find(t => t.gstin === value || t.name === value);
    setFormData(prev => ({ ...prev, transporterId: found ? found.gstin : value, transporterName: found ? found.name : prev.transporterName }));
  };

  const fetchDistance = async () => {
    const fromPincode = formData.dispatchFromPincode || formData.consignorPincode;
    const toPincode = formData.shipToPincode || formData.consigneePincode;
    if (!fromPincode || !toPincode) { Swal.fire("Info", "PIN codes not available for distance calculation", "info"); return; }
    try {
      const r = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/distance?fromPincode=${fromPincode}&toPincode=${toPincode}`);
      if (r.data.success && r.data.distance) setFormData(prev => ({ ...prev, transportDistance: r.data.distance }));
      else Swal.fire("Info", "Could not calculate distance automatically. Please enter manually.", "info");
    } catch (e) { console.error("Distance error:", e); Swal.fire("Error", "Failed to fetch distance", "error"); }
  };

  // ── State code map ─────────────────────────────────────────────────────────
  const STATE_NAME_TO_CODE = {
    "JAMMU AND KASHMIR": "01", "HIMACHAL PRADESH": "02", "PUNJAB": "03", "CHANDIGARH": "04",
    "UTTARAKHAND": "05", "HARYANA": "06", "DELHI": "07", "RAJASTHAN": "08", "UTTAR PRADESH": "09",
    "BIHAR": "10", "SIKKIM": "11", "ARUNACHAL PRADESH": "12", "NAGALAND": "13", "MANIPUR": "14",
    "MIZORAM": "15", "TRIPURA": "16", "MEGHALAYA": "17", "ASSAM": "18", "WEST BENGAL": "19",
    "JHARKHAND": "20", "ODISHA": "21", "CHHATTISGARH": "22", "MADHYA PRADESH": "23",
    "GUJARAT": "24", "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "26", "MAHARASHTRA": "27",
    "ANDHRA PRADESH": "28", "KARNATAKA": "29", "GOA": "30", "LAKSHADWEEP": "31",
    "KERALA": "32", "TAMIL NADU": "33", "PUDUCHERRY": "34", "ANDAMAN AND NICOBAR ISLANDS": "35",
    "TELANGANA": "36", "ANDHRA PRADESH (NEW)": "37", "LADAKH": "38", "OTHER TERRITORY": "97", "OTHERS": "99"
  };

  const getStateCode = (stateName) => {
    if (!stateName) return "";
    const key = String(stateName).trim().toUpperCase();
    if (key === 'OTHER COUNTRY' || key === 'FOREIGN' || key === 'INTERNATIONAL') return STATE_NAME_TO_CODE['OTHER TERRITORY'];
    return STATE_NAME_TO_CODE[key] || stateName;
  };

  const normalizeVehicleUpdateReasonCode = (code) => {
    if (!code) return "1";
    const n = String(code).trim().toLowerCase().replace(/\s+/g, '');
    switch (n) {
      case "duetobreakdown":
      case "breakdown":
      case "1":
        return "1";
      case "transshipment":
      case "transhipment":
      case "2":
        return "2";
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

  // ── Multi-container submit ─────────────────────────────────────────────────
  const submitMultipleEwayBills = async () => {
    // ✅ No LR (tr_no) check needed here.
    // Transporter Doc No is manually entered in the form and sent to the API.
    // Internal tr_no (system LR record) is NOT required for EWB generation.
    try {
      setGenerating(true);
      const promises = selectedContainers.map(async (container) => {
        const scNo = (container.container_number || container.container_no || "").trim().toUpperCase();
        const oIdx = boeContainers.findIndex(bc => {
          const bcNo = (bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "").trim().toUpperCase();
          return bcNo === scNo || (bcNo && scNo && bcNo.includes(scNo));
        });
        const weight = parseFloat(oIdx !== -1 ? containerWeights[oIdx] : containerWeights[`manual_${scNo}`]) || 0;
        const containerValue = { weight, assessableValue: weight * perKgValue };
        if (weight <= 0) return { container: container.container_number, ewbNo: null, status: "failed", error: "Weight is zero or invalid." };
        if (!perKgValue || perKgValue <= 0) return { container: container.container_number, ewbNo: null, status: "failed", error: "Per KG value is not set." };
        const containerPayload = buildPayloadForContainer(container, containerValue);
        try {
          const r = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/generate`, containerPayload);
          if (r.data.success) {
            markBoeDocumentGenerated(formData.documentNumber || boeNumber);
            return {
              container: container.container_number,
              ewbNo: r.data.data.ewbNo,
              ewbDate: r.data.data.ewbDate,
              validUpto: r.data.data.validUpto,
              pdfUrl: r.data.data.pdfUrl,
              ewayBillId: r.data.data.ewayBillId,
              status: "success"
            };
          }
          else {
            let errorMsg = r.data.message || "Unknown error";
            if (r.data.errors?.length) errorMsg = r.data.errors.map(e => `${e.field}: ${e.message}`).join(", ");
            else if (r.data.validationErrors?.length) errorMsg = r.data.validationErrors.map(e => e.message).join(", ");
            return { container: container.container_number, ewbNo: null, status: "failed", error: errorMsg };
          }
        } catch (err) {
          const ed = err.response?.data;
          let et = parseNicErrorMessage(ed?.message || err.message);
          if (ed?.errors?.length) et = ed.errors.map(e => e.message).join(", ");
          else if (ed?.validationErrors?.length) et = ed.validationErrors.map(e => e.message).join(", ");
          return { container: container.container_number, ewbNo: null, status: "failed", error: et };
        }
      });
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === "success").length;
      const failedCount = results.filter(r => r.status === "failed").length;
      if (successCount > 0) {
        const sh = results.filter(r => r.status === "success").map(r => `<div><strong>${r.container}:</strong> ${r.ewbNo}</div>`).join("");
        const fh = failedCount > 0 ? `<hr><h5>Failed (${failedCount}):</h5>` + results.filter(r => r.status === "failed").map(r => `<div><strong>${r.container}:</strong> ${r.error}</div>`).join("") : "";
        Swal.fire({ icon: successCount === selectedContainers.length ? "success" : "warning", title: `${successCount}/${selectedContainers.length} E-Way Bills Generated`, html: `<div>${sh}${fh}</div>`, confirmButtonText: "OK" })
          .then(() => { if (onSuccess) onSuccess(results); if (onClose) onClose(); });
      } else {
        // ── Check if all failures are "already exists" → open the existing EWB for viewing/printing
        const alreadyExistsPattern = /e-?way\s*bill\s*(\d{12})\s*already\s*exists/i;
        const existingEwbs = results
          .map(r => {
            const m = (r.error || "").match(alreadyExistsPattern);
            return m ? { container: r.container, ewbNo: m[1], status: "exists" } : null;
          })
          .filter(Boolean);

        if (existingEwbs.length > 0 && existingEwbs.length === results.length) {
          // All failures are "already exists" — show info then open preview
          await Swal.fire({
            icon: "info",
            title: "E-Way Bill Already Exists",
            html: existingEwbs.map(e => `<div><strong>${e.container}:</strong> EWB ${e.ewbNo}</div>`).join(""),
            confirmButtonText: "View & Print",
          });
          if (onSuccess) onSuccess(existingEwbs);
        } else {
          const fh = results.map(r => `<div><strong>${r.container || 'Unknown'}:</strong> ${r.error || 'Unknown error'}</div>`).join("");
          Swal.fire({ icon: "error", title: "All E-Way Bills Failed", html: fh || "<div>No failure details available.</div>", confirmButtonText: "OK" });
        }
      }
    } catch (err) { console.error("submitMultipleEwayBills:", err); Swal.fire("Error", "Failed to generate E-Way Bills", "error"); }
    finally { setGenerating(false); }
  };

  const buildPayloadForContainer = (container, containerValue) => {
    const lrId = prData?._id || (selectedLrId ? selectedLrId.split("-")[0] : null);
    const containerObj = selectedLr ? selectedLr.container_details : null;
    const taxable = containerValue.assessableValue;

    // Scale items proportionally by taxable value and quantity
    const totalOriginalTaxable = formData.items.reduce((acc, item) => acc + (parseFloat(item.taxableAmount) || 0), 0) || 1;
    const totalOriginalQuantity = formData.items.reduce((acc, item) => acc + (parseFloat(item.quantity) || 0), 0) || 1;

    let cgstTotal = 0, sgstTotal = 0, igstTotal = 0, cessTotal = 0, cessNATotal = 0;

    const itemsPayload = formData.items.map(item => {
      const origTaxable = parseFloat(item.taxableAmount) || 0;
      const origQty = parseFloat(item.quantity) || 0;

      const itemTaxable = parseFloat(((taxable * origTaxable) / totalOriginalTaxable).toFixed(2));
      const itemQty = parseFloat(((containerValue.weight * origQty) / totalOriginalQuantity).toFixed(2));

      const cgst = parseFloat(((itemTaxable * parseFloat(item.cgstRate || 0)) / 100).toFixed(2));
      const sgst = parseFloat(((itemTaxable * parseFloat(item.sgstRate || 0)) / 100).toFixed(2));
      const igst = parseFloat(((itemTaxable * parseFloat(item.igstRate || 0)) / 100).toFixed(2));
      const cess = parseFloat(((itemTaxable * parseFloat(item.cessRate || 0)) / 100).toFixed(2));
      const cessNA = parseFloat(((containerValue.weight * (parseFloat(item.cessNonAdvol) || 0)) / totalOriginalQuantity).toFixed(2));

      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;
      cessTotal += cess;
      cessNATotal += cessNA;

      return {
        ...item,
        taxableAmount: itemTaxable,
        quantity: itemQty,
        cgstRate: parseFloat(item.cgstRate) || 0,
        sgstRate: parseFloat(item.sgstRate) || 0,
        igstRate: parseFloat(item.igstRate) || 0,
        cessRate: parseFloat(item.cessRate) || 0,
        cessNonAdvol: cessNA
      };
    });

    const otherAmt = parseFloat(formData.otherAmount) || 0;
    const totalIV = parseFloat((taxable + cgstTotal + sgstTotal + igstTotal + cessTotal + cessNATotal + otherAmt).toFixed(2));

    return {
      lrId, containerId: container?._id || containerObj?._id,
      formData: { ...formData, totalInvoiceValue: totalIV, taxableAmount: taxable, calculatedAssessableValue: containerValue.assessableValue, cgstAmount: cgstTotal, sgstAmount: sgstTotal, igstAmount: igstTotal, cessAmount: cessTotal, cessNonAdvol: cessNATotal, otherAmount: otherAmt, transporterId: formData.transporterId || undefined, generatorRole: formData.supplyType === "inward" ? "consignee" : "consignor", userGstin: getEffectiveUserGstin(), items: itemsPayload, data_source: "lrEwbUpdate" },
    };
  };

  // ── Main submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (isMultiContainerMode && generationMode === "batch-selected" && selectedContainers.length > 0) { await submitMultipleEwayBills(); return; }

    if (isPartBOnly) {
      const effFromState = getStateCode(formData.dispatchFromState || formData.consignorState || "");
      const partBErrs = {};
      if (!formData.vehicleNo) partBErrs.vehicleNo = "Vehicle number is required for Part B update";
      else { const vnErr = validateVehicleFormat(formData.vehicleNo); if (vnErr) partBErrs.vehicleNo = vnErr; }
      if (!effFromState) partBErrs.fromState = "From state is required";
      if (!formData.reasonCode) partBErrs.reasonCode = "Reason for vehicle update is required";
      if (Object.keys(partBErrs).length > 0) {
        setFieldErrors(partBErrs);
        Swal.fire({ icon: "error", title: "Validation Error", text: "Please correct the highlighted fields.", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });
        return;
      }
      try {
        setGenerating(true);
        const payload = {
          ewayBillNo: String(existingEwbNo), vehicleNo: formData.vehicleNo,
          vehicleType: formData.vehicleType === "ODC" ? "o" : "r",
          fromPlace: formData.dispatchFromCity || formData.consignorCity || "",
          fromState: getStateCode(formData.dispatchFromState || formData.consignorState || "") || "",
          stateOfConsignor: getStateCode(formData.dispatchFromState || formData.consignorState || "") || "",
          reasonCode: normalizeVehicleUpdateReasonCode(formData.reasonCode || "duetobreakdown"),
          reason_code_for_vehicle_updation: normalizeVehicleUpdateReasonCode(formData.reasonCode || "duetobreakdown"),
          reasonText: formData.reasonText || "", transporterDocNo: formData.transporterDocNo || "",
          transporterDocDate: formData.transporterDocDate || "",
          modeOfTransport: formData.transportationMode === "Road" ? 1 : formData.transportationMode === "Rail" ? 2 : formData.transportationMode === "Air" ? 3 : 4,
          userGstin: getEffectiveUserGstin(),
        };
        const r = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/update-vehicle`, payload);
        if (r.data.success) {
          Swal.fire({ icon: "success", title: "Part B Updated", html: `<p><strong>EWB:</strong> ${existingEwbNo}</p><p><strong>Vehicle:</strong> ${formData.vehicleNo}</p>` });
          setSuccess({ ewbNo: existingEwbNo, ewbDate: r.data.data?.ewbDate || "", validUpto: r.data.data?.validUpto || "" });
        }
      } catch (err) {
        console.error("Part B update error:", err);
        let msg = "Failed to update Part B";
        if (err.response?.data?.message) { msg = parseNicErrorMessage(err.response.data.message); setFieldErrors(prev => ({ ...prev, ...mapEwbApiErrorToFields(typeof err.response.data.message === 'string' ? err.response.data.message : JSON.stringify(err.response.data.message)) })); }
        Swal.fire("Error", msg, "error");
      } finally { setGenerating(false); }
      return;
    }

    // Full generation
    // ✅ No LR (tr_no) check needed here.
    // Part A or Part B can both be generated without a system LR record.
    // Transporter Doc No is manually entered in the form and is optional per the API.

    let hasError = false;
    const nfe = {};
    if (!formData.documentNumber) { nfe.documentNumber = "Document number is required"; hasError = true; }
    if (!formData.documentDate) { nfe.documentDate = "Document date is required"; hasError = true; }
    if (!formData.consignorName) { nfe.consignorName = "Consignor name is required"; hasError = true; }
    if (!formData.consignorGstin) { nfe.consignorGstin = "Consignor GSTIN/URP is required"; hasError = true; }
    if (!formData.consignorState) { nfe.consignorState = "Consignor state is required"; hasError = true; }
    if (!formData.consigneeName) { nfe.consigneeName = "Consignee name is required"; hasError = true; }
    if (!formData.consigneeGstin) { nfe.consigneeGstin = "Consignee GSTIN/URP is required"; hasError = true; }
    if (!formData.consigneeState) { nfe.consigneeState = "Consignee state is required"; hasError = true; }
    if (!formData.dispatchFromAddress1) { nfe.dispatchFromAddress1 = "Address is required"; hasError = true; }
    if (!formData.dispatchFromCity) { nfe.dispatchFromCity = "City/Place is required"; hasError = true; }
    if (!formData.dispatchFromPincode) { nfe.dispatchFromPincode = "Pincode is required"; hasError = true; }
    if (!formData.shipToAddress1) { nfe.shipToAddress1 = "Address is required"; hasError = true; }
    if (!formData.shipToCity) { nfe.shipToCity = "City/Place is required"; hasError = true; }
    if (!formData.shipToPincode) { nfe.shipToPincode = "Pincode is required"; hasError = true; }
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.hsnCode) { nfe[`items[${i}].hsnCode`] = "HSN Code is required"; hasError = true; }
      if (!item.taxableAmount || parseFloat(item.taxableAmount) <= 0) { nfe[`items[${i}].taxableAmount`] = "Valid Taxable Amount is required"; hasError = true; }
    }
    if (hasError) { setFieldErrors(nfe); Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'Please correct the errors highlighted in the form.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }); return; }

    const cv = runClientSideValidations(formData, 0);
    if (!cv.valid) {
      const ce = {}; cv.errors.forEach(e => { ce[e.field] = e.message; });
      setFieldErrors(prev => ({ ...prev, ...ce }));
      Swal.fire({ icon: 'error', title: 'Validation Error', text: cv.errors[0]?.message || 'Please fix the highlighted fields.', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
      return;
    }

    try {
      setGenerating(true);
      const lrId = prData?._id || (selectedLrId ? selectedLrId.split('-')[0] : null);
      const container = selectedLr ? selectedLr.container_details : null;
      const contId = container?._id || container?.container_number || prefilledLrId;
      let cgstTotal = 0, sgstTotal = 0, igstTotal = 0, cessTotal = 0, taxableTotal = 0;
      const itemsPayload = formData.items.map(item => {
        const taxable = parseFloat(item.taxableAmount) || 0;
        const cgst = parseFloat(((taxable * parseFloat(item.cgstRate || 0)) / 100).toFixed(2));
        const sgst = parseFloat(((taxable * parseFloat(item.sgstRate || 0)) / 100).toFixed(2));
        const igst = parseFloat(((taxable * parseFloat(item.igstRate || 0)) / 100).toFixed(2));
        const cess = parseFloat(((taxable * parseFloat(item.cessRate || 0)) / 100).toFixed(2));
        cgstTotal += cgst; sgstTotal += sgst; igstTotal += igst; cessTotal += cess; taxableTotal += taxable;
        return { ...item, taxableAmount: taxable, cgstRate: parseFloat(item.cgstRate) || 0, sgstRate: parseFloat(item.sgstRate) || 0, igstRate: parseFloat(item.igstRate) || 0, cessRate: parseFloat(item.cessRate) || 0, cessNonAdvol: parseFloat(item.cessNonAdvol) || 0 };
      });
      const payload = {
        lrId, containerId: contId,
        formData: {
          ...formData, totalInvoiceValue: parseFloat(formData.totalInvoiceValue) || 0,
          taxableAmount: taxableTotal, cgstAmount: cgstTotal, sgstAmount: sgstTotal, igstAmount: igstTotal,
          cessAmount: cessTotal, cessNonAdvol: formData.items.reduce((a, i) => a + (parseFloat(i.cessNonAdvol) || 0), 0),
          otherAmount: parseFloat(formData.otherAmount) || 0,
          transporterId: formData.transporterId || undefined,
          generatorRole: formData.supplyType === 'inward' ? 'consignee' : 'consignor',
          userGstin: getEffectiveUserGstin(),
          items: itemsPayload,
          ...(isMultiContainerMode && { data_source: "lrEwbUpdate", containerSelectionMode, selectedContainerCount: selectedContainers.length, containerIds: selectedContainers.map(c => c._id || c.container_number) }),
        }
      };
      const r = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/generate`, payload);
      if (r.data.success) {
        markBoeDocumentGenerated(formData.documentNumber || boeNumber);
        setSuccess(r.data.data);
        if (onSuccess) onSuccess(r.data.data);
        Swal.fire({ icon: "success", title: "E-Way Bill Generated", html: `<p><strong>EWB No:</strong> ${r.data.data.ewbNo}</p><p><strong>Valid Until:</strong> ${r.data.data.validUpto}</p>` });
      }
    } catch (error) {
      console.error("Generate EWB error:", error);
      if (error.response?.data?.validationErrors?.length > 0) {
        const errs = {};
        error.response.data.validationErrors.forEach(e => { errs[e.field] = e.message; });
        setFieldErrors(errs);
        Swal.fire({ icon: "error", title: "API Validation Error", text: error.response.data.validationErrors[0]?.message || error.response?.data?.message || "Some fields have invalid values as per GST rules.", toast: true, position: "top-end", showConfirmButton: false, timer: 5000 });
      } else {
        const rawMsg = error.response?.data?.message || "";
        const errMsg = parseNicErrorMessage(rawMsg);
        setFieldErrors(prev => ({ ...prev, ...mapEwbApiErrorToFields(typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg)) }));
        Swal.fire({ icon: "error", title: "API Error", text: errMsg, toast: true, position: "top-end", showConfirmButton: false, timer: 8000 });
      }
    } finally { setGenerating(false); }
  };

  const handleExtendValidity = async (e) => {
    if (e) e.preventDefault();
    try {
      setGenerating(true);
      const payload = {
        ewayBillNo: existingEwbNo, vehicleNo: formData.vehicleNo,
        currentPlace: formData.dispatchFromCity || formData.consignorCity,
        currentState: formData.dispatchFromState || formData.consignorState,
        currentPincode: formData.dispatchFromPincode || formData.consignorPincode,
        remainingDistance: formData.transportDistance, reason: formData.reasonCode || "99",
        remarks: formData.reasonText || "Traffic Delay",
        modeOfTransport: formData.transportationMode === "Road" ? 1 : formData.transportationMode === "Rail" ? 2 : formData.transportationMode === "Air" ? 3 : formData.transportationMode === "Ship" ? 4 : 5,
        consignmentStatus: formData.consignmentStatus || "M", transitType: formData.transitType || "R",
        address1: formData.dispatchFromAddress1 || formData.consignorAddress1, address2: formData.consignorAddress2 || "", address3: "",
        userGstin: getEffectiveUserGstin(),
      };
      const r = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/extend-validity`, payload);
      if (r.data.success) { Swal.fire("Success", "Validity Extended", "success"); setSuccess(r.data.data); if (onSuccess) onSuccess(r.data.data); }
    } catch (err) { Swal.fire("Error", err.response?.data?.message || err.message, "error"); }
    finally { setGenerating(false); }
  };

  const handleInitiateMultiVehicle = async (e) => {
    if (e) e.preventDefault();
    try {
      setGenerating(true);
      const payload = {
        ewayBillNo: existingEwbNo, totalQuantity: formData.totalQuantity, unitCode: formData.unitCode || "NOS",
        placeOfConsignor: formData.consignorCity, stateOfConsignor: formData.consignorState,
        placeOfConsignee: formData.consigneeCity, stateOfConsignee: formData.consigneeState,
        reasonCode: "due to break down",
        modeOfTransport: formData.transportationMode === "Road" ? 1 : 2,
        userGstin: getEffectiveUserGstin(),
      };
      const r = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/initiate`, payload);
      if (r.data.success) { Swal.fire("Success", "Multi-Vehicle Initiated", "success"); fetchMvData(); }
    } catch (err) { Swal.fire("Error", err.response?.data?.message || err.message, "error"); }
    finally { setGenerating(false); }
  };

  const fetchMvData = async () => {
    if (!existingEwbNo) return;
    try {
      setMvLoading(true);
      const r = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/${existingEwbNo}`);
      if (r.data.success) setMvData(r.data.data);
    } catch (err) { console.error("MV fetch error:", err); }
    finally { setMvLoading(false); }
  };

  const handleAddVehicleToGroup = async (e) => {
    if (e) e.preventDefault();
    try {
      setGenerating(true);
      const payload = { ewayBillNo: existingEwbNo, groupNo: mvData?.multiVehicleGroup?.groupNo, userGstin: getEffectiveUserGstin(), ...addVehicleForm };
      const r = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/add-vehicle`, payload);
      if (r.data.success) { Swal.fire("Success", "Vehicle added to group", "success"); setShowAddVehicleForm(false); fetchMvData(); }
    } catch (err) { Swal.fire("Error", err.response?.data?.message || err.message, "error"); }
    finally { setGenerating(false); }
  };

  const handleReset = () => {
    setSelectedLrId(""); setSelectedLr(null); setSuccess(null);
    setIsPartBOnly(false); setExistingEwbNo(''); setFieldErrors({});
    setFormData({ ...DEFAULT_FORM, items: [{ ...EMPTY_ITEM }] });
    setAssessableValueFromBoe(0);
    setTotalBoeWeight(0);
    setNonRefundableDuties(0);
    setTotalValueFromBoe(0);
    setPerKgValue(0);
    setShowFormulaDialog(false);
  };

  const handleDownloadPDF = async () => {
    const pdfUrl = partADetails?.meta?.pdfUrl || success?.pdfUrl;
    if (!pdfUrl) { Swal.fire({ icon: "error", title: "PDF URL not available", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 }); return; }
    let url = pdfUrl;
    if (!url.startsWith("http")) url = `https://${url}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network error");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.setAttribute("download", `EWayBill_${partADetails?.apiData?.ewayBillNo || success?.ewbNo || existingEwbNo || "download"}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      Swal.fire({ icon: "success", title: "PDF download started", toast: true, position: "top-end", showConfirmButton: false, timer: 2500 });
    } catch (_) {
      Swal.fire({ icon: "error", title: "Failed to download PDF", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });
    }
  };



  // ── Render sub-sections ────────────────────────────────────────────────────
  const renderUpdatePartB = () => (
    <div className="ewb-section">
      <div className="ewb-section-title"><span className="title-accent amber"></span>Vehicle & Transport (Part B Update)</div>
      <div className="ewb-grid cols-3" style={{ marginBottom: 14 }}>
        <Field label="Vehicle Number" req name="vehicleNo">
          <input className={ic("vehicleNo")} name="vehicleNo" value={formData.vehicleNo} onChange={handleInputChange} placeholder="e.g. MH01AB1234" />
        </Field>
        <Field label="Vehicle Type" name="vehicleType">
          <select className="ewb-select" name="vehicleType" value={formData.vehicleType} onChange={handleInputChange}>
            <option value="Regular">Regular</option>
            <option value="ODC">ODC (Over Dimensional Cargo)</option>
          </select>
        </Field>
        <Field label="Mode of Transport" name="transportationMode">
          <select className="ewb-select" name="transportationMode" value={formData.transportationMode} onChange={handleInputChange}>
            <option value="Road">Road</option><option value="Rail">Rail</option>
            <option value="Air">Air</option><option value="Ship">Ship</option>
          </select>
        </Field>
      </div>
      <div className="ewb-grid cols-3" style={{ marginBottom: 14 }}>
        <Field label="From Place" req name="consignorCity">
          <input className={ic("consignorCity")} name="consignorCity" value={formData.consignorCity || formData.dispatchFromCity} onChange={handleInputChange} placeholder="Origin City" />
        </Field>
        <Field label="From State" req name="consignorState">
          <input list="states" className={ic("consignorState")} name="consignorState" value={formData.consignorState || formData.dispatchFromState} onChange={handleInputChange} placeholder="Origin State" />
        </Field>
        <Field label="User GSTIN" req name="userGstin" hint="Used as Transporter ID">
          <input className={ic("userGstin")} name="userGstin" value={formData.userGstin || (formData.supplyType === 'inward' ? formData.consigneeGstin : formData.consignorGstin)} onChange={handleInputChange} placeholder="Your GSTIN" />
        </Field>
      </div>
      <div className="ewb-grid cols-2" style={{ marginBottom: 14 }}>
        <Field label="Reason for Update" name="reasonCode">
          <select className="ewb-select" name="reasonCode" value={formData.reasonCode} onChange={handleInputChange}>
            <option value="duetobreakdown">Due to breakdown</option>
            <option value="transshipment">Transshipment</option>
            <option value="others">Others</option>
            <option value="firstTimePartB">First time Part B update</option>
          </select>
        </Field>
        <Field label="Remarks" name="reasonText">
          <input className="ewb-input" name="reasonText" value={formData.reasonText} onChange={handleInputChange} placeholder="Additional info (optional)" />
        </Field>
      </div>
      <div className="ewb-grid cols-2">
        <Field label="Transporter Doc No" name="transporterDocNo">
          <input className="ewb-input" name="transporterDocNo" value={formData.transporterDocNo} onChange={handleInputChange} placeholder="GR/LR Number" />
        </Field>
        <Field label="Transporter Doc Date" name="transporterDocDate">
          <input type="date" className="ewb-input" name="transporterDocDate" value={formData.transporterDocDate} onChange={handleInputChange} />
        </Field>
      </div>
      <div className="ewb-actions">
        <button type="submit" className="ewb-btn primary" disabled={generating}>
          {generating ? <><span className="ewb-spinner"></span> Updating...</> : "Update Part B"}
        </button>
      </div>
    </div>
  );

  const renderExtendValidity = () => (
    <div className="ewb-section">
      <div className="ewb-section-title"><span className="title-accent amber"></span>Extend Validity</div>
      <div className="ewb-strip amber" style={{ marginBottom: 16 }}>Extension can only be done within 8 hours before/after expiry.</div>
      <div className="ewb-grid cols-3" style={{ marginBottom: 14 }}>
        <Field label="Current Place" req name="dispatchFromCity">
          <input className="ewb-input" name="dispatchFromCity" value={formData.dispatchFromCity || formData.consignorCity} onChange={handleInputChange} />
        </Field>
        <Field label="Current State" req name="dispatchFromState">
          <input list="states" className="ewb-input" name="dispatchFromState" value={formData.dispatchFromState || formData.consignorState} onChange={handleInputChange} />
        </Field>
        <Field label="Remaining Distance (KM)" req name="transportDistance">
          <input type="number" className="ewb-input" name="transportDistance" value={formData.transportDistance} onChange={handleInputChange} placeholder="Km" />
        </Field>
      </div>
      <div className="ewb-grid cols-2">
        <Field label="Reason for Extension" name="reasonCode">
          <select className="ewb-select" name="reasonCode" value={formData.reasonCode} onChange={handleInputChange}>
            <option value="Natural Calamity">Natural Calamity</option>
            <option value="Transshipment">Transshipment</option>
            <option value="Accident">Accident</option>
            <option value="Others">Others</option>
          </select>
        </Field>
        <Field label="Remarks" name="reasonText">
          <input className="ewb-input" name="reasonText" value={formData.reasonText} onChange={handleInputChange} placeholder="Brief explanation" />
        </Field>
      </div>
      <div className="ewb-actions">
        <button type="button" className="ewb-btn primary" onClick={handleExtendValidity} disabled={generating}>
          {generating ? "Extending..." : "Confirm Extension"}
        </button>
      </div>
    </div>
  );

  const renderMultiVehicle = () => (
    <div className="ewb-section">
      <div className="ewb-section-title"><span className="title-accent purple"></span>Multi-Vehicle Management</div>
      {!mvData ? (
        <div>
          <div className="ewb-grid cols-2" style={{ marginBottom: 14, maxWidth: 480 }}>
            <Field label="Total Quantity" name="totalQuantity">
              <input type="number" className="ewb-input" name="totalQuantity" value={formData.totalQuantity} onChange={handleInputChange} />
            </Field>
            <Field label="Unit" name="unitCode">
              <input className="ewb-input" name="unitCode" value={formData.unitCode} onChange={handleInputChange} placeholder="e.g. NOS" />
            </Field>
          </div>
          <button type="button" className="ewb-btn primary" onClick={handleInitiateMultiVehicle} disabled={generating}>
            {generating ? "Initiating..." : "Initiate Multi-Vehicle"}
          </button>
        </div>
      ) : (
        <>
          <div className="ewb-strip blue" style={{ marginBottom: 14 }}>
            <strong>Group No: {mvData.multiVehicleGroup?.groupNo}</strong>&nbsp;·&nbsp;
            Total Qty: {mvData.multiVehicleGroup?.totalQuantity} {mvData.multiVehicleGroup?.unitCode}
          </div>
          <table className="ewb-mv-table" style={{ marginBottom: 14 }}>
            <thead><tr><th>Vehicle No</th><th>Doc No</th><th>Qty</th><th>Date</th><th>Mode</th></tr></thead>
            <tbody>
              {mvData.vehicles?.map((v, i) => (
                <tr key={i}><td>{v.vehicleNo}</td><td>{v.transporterDocNo}</td><td>{v.quantity}</td><td>{v.transporterDocDate}</td><td>{v.modeOfTransport == 1 ? "Road" : "Rail"}</td></tr>
              ))}
              {(!mvData.vehicles || mvData.vehicles.length === 0) && <tr><td colSpan="5" style={{ textAlign: 'center', color: '#8898aa' }}>No vehicles added yet.</td></tr>}
            </tbody>
          </table>
          {!showAddVehicleForm ? (
            <button type="button" className="ewb-btn secondary" onClick={() => setShowAddVehicleForm(true)}>+ Add Vehicle to Group</button>
          ) : (
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e4e9f0', marginTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#525f7f', marginBottom: 12 }}>New Vehicle</div>
              <div className="ewb-grid cols-3" style={{ marginBottom: 12 }}>
                <Field label="Vehicle No" name="_mv_vno">
                  <input className="ewb-input" value={addVehicleForm.vehicleNumber} onChange={e => setAddVehicleForm({ ...addVehicleForm, vehicleNumber: e.target.value })} />
                </Field>
                <Field label="Quantity" name="_mv_qty">
                  <input type="number" className="ewb-input" value={addVehicleForm.quantity} onChange={e => setAddVehicleForm({ ...addVehicleForm, quantity: e.target.value })} />
                </Field>
                <Field label="Doc No (GR No)" name="_mv_doc">
                  <input className="ewb-input" value={addVehicleForm.transporterDocNo} onChange={e => setAddVehicleForm({ ...addVehicleForm, transporterDocNo: e.target.value })} />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="ewb-btn primary sm" onClick={handleAddVehicleToGroup} disabled={generating}>Add Vehicle</button>
                <button type="button" className="ewb-btn ghost sm" onClick={() => setShowAddVehicleForm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Part A Preview ─────────────────────────────────────────────────────────
  const renderPartAPreview = () => {
    if (partADetails) {
      const d = partADetails.apiData || {};
      const meta = partADetails.meta || {};
      const items = d.itemList || d.ItemList || [];
      const modeOfTransportRaw = d.mode_of_transport || d.transportationMode || d.modeOfTransport || d.transMode || "—";
      const modeOfTransportMap = { "1": "Road", "2": "Rail", "3": "Air", "4": "Ship", road: "Road", rail: "Rail", air: "Air", ship: "Ship" };
      const modeOfTransport = modeOfTransportMap[String(modeOfTransportRaw).toLowerCase()] || modeOfTransportRaw;
      return (
        <div className="ewb-parta-preview">
          <div className="preview-header">
            <span>📋</span> Part A Preview
            {partALoading && <span style={{ fontSize: '0.75rem', color: '#6366f1', marginLeft: 4 }}><span className="ewb-spinner dark" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Loading...</span>}
            {!partALoading && <span style={{ fontSize: '0.7rem', color: '#0ca678', marginLeft: 4 }}>✓ Live</span>}
            <span className="lock-badge">🔒 LOCKED</span>
          </div>
          <div className="ewb-meta-grid">
            <div className="ewb-meta-item"><div className="meta-label">EWB No.</div><div className="meta-val large">{d.ewayBillNo || existingEwbNo}</div></div>
            <div className="ewb-meta-item"><div className="meta-label">Generated Date</div><div className="meta-val">{d.ewayBillDate || meta.ewbDate || '—'}</div></div>
            <div className="ewb-meta-item"><div className="meta-label">Valid Until</div><div className="meta-val danger">{d.validUpto || meta.validUpto || '—'}</div></div>
            <div className="ewb-meta-item"><div className="meta-label">Status</div>
              <span className={`status-pill ${d.status === 'ACT' || meta.ewbStatus === 'Generated' ? 'active' : 'cancelled'}`}>
                {d.status === 'ACT' ? 'Active' : d.status === 'CNL' ? 'Cancelled' : meta.ewbStatus || d.status || '—'}
              </span>
            </div>
            <div className="ewb-meta-item"><div className="meta-label">Document</div><div className="meta-val">{d.docNo || formData.documentNumber || '—'}</div><div style={{ fontSize: '0.72rem', color: '#a0aec0' }}>{d.docDate || formData.documentDate || ''}</div></div>
            <div className="ewb-meta-item"><div className="meta-label">Supply Type</div><div className="meta-val">{d.supplyType || d.subSupplyType || '—'}</div></div>
            <div className="ewb-meta-item"><div className="meta-label">Mode of Transport</div><div className="meta-val">{modeOfTransport}</div></div>
          </div>
          {meta.pdfUrl && <a href={meta.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: '#3b5bdb', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>📄 Download EWB PDF</a>}
          <hr className="ewb-divider" />
          <div className="ewb-party-row">
            <div className="ewb-party-box">
              <div className="party-dir">📤 From (Consignor)</div>
              <div className="party-gstin">{d.fromGstNum || d.gstin_of_consignor || '—'}</div>
              <div className="party-name">{d.fromTrdName || d.legal_name_of_consignor || '—'}</div>
              <div className="party-addr">{[d.fromAddr1, d.fromAddr2, d.fromPlace, d.fromState, d.fromPincode].filter(Boolean).join(', ')}</div>
            </div>
            <div className="ewb-party-box">
              <div className="party-dir">📥 To (Consignee)</div>
              <div className="party-gstin">{d.toGstNum || d.gstin_of_consignee || '—'}</div>
              <div className="party-name">{d.toTrdName || d.legal_name_of_consignee || '—'}</div>
              <div className="party-addr">{[d.toAddr1, d.toAddr2, d.toPlace, d.toState, d.toPincode].filter(Boolean).join(', ')}</div>
            </div>
          </div>
          {items.length > 0 && (
            <>
              <hr className="ewb-divider" />
              <table className="ewb-preview-table">
                <thead><tr><th>HSN</th><th>Product</th><th>Qty</th><th>Taxable Amt</th><th>IGST %</th></tr></thead>
                <tbody>
                  {items.slice(0, 8).map((item, i) => (
                    <tr key={i}>
                      <td>{item.hsnCode || item.hsn_code || '—'}</td>
                      <td>{item.productName || item.product_name || '—'}</td>
                      <td>{item.quantity || '—'} {item.qtyUnit || item.unit_of_product || ''}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.taxableAmount || item.taxable_amount || '—'}</td>
                      <td>{item.igstRate || item.igst_rate || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length > 8 && <div style={{ fontSize: '0.72rem', color: '#a0aec0', marginTop: 4 }}>+{items.length - 8} more items</div>}
              <div style={{ marginTop: 8, fontSize: '0.82rem', fontWeight: 700, color: '#1a1f36' }}>Total Invoice Value: ₹{d.totalInvValue || d.total_invoice_value || '—'}</div>
            </>
          )}
          {(d.transporterId || d.vehicleNo) && (
            <>
              <hr className="ewb-divider" />
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.78rem', color: '#8898aa' }}>
                {d.transporterId && <span><strong style={{ color: '#525f7f' }}>Transporter ID:</strong> {d.transporterId}</span>}
                {d.transporterName && <span><strong style={{ color: '#525f7f' }}>Name:</strong> {d.transporterName}</span>}
                {d.vehicleNo && <span><strong style={{ color: '#525f7f' }}>Vehicle:</strong> {d.vehicleNo}</span>}
                {d.transDistance && <span><strong style={{ color: '#525f7f' }}>Distance:</strong> {d.transDistance} km</span>}
              </div>
            </>
          )}
        </div>
      );
    }
    // Fallback while loading
    return (
      <div className="ewb-parta-preview">
        <div className="preview-header">
          <span>📋</span> Part A Preview
          {partALoading && <span style={{ fontSize: '0.72rem', color: '#6366f1', marginLeft: 4 }}><span className="ewb-spinner dark" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Fetching live data...</span>}
          <span className="lock-badge">🔒 LOCKED</span>
        </div>
        <div className="ewb-meta-grid">
          <div className="ewb-meta-item"><div className="meta-label">Document No.</div><div className="meta-val">{formData.documentNumber || '—'}</div></div>
          <div className="ewb-meta-item"><div className="meta-label">Document Date</div><div className="meta-val">{formData.documentDate || '—'}</div></div>
          <div className="ewb-meta-item"><div className="meta-label">Consignor</div><div className="meta-val">{formData.consignorName || '—'}</div></div>
          <div className="ewb-meta-item"><div className="meta-label">Consignee</div><div className="meta-val">{formData.consigneeName || '—'}</div></div>
        </div>
      </div>
    );
  };

  // ── Container weight section ───────────────────────────────────────────────
  const renderContainerWeights = () => {
    const containersToUse = selectedContainers?.length > 0 ? selectedContainers : boeContainers;
    if (activeTab !== 'boe' || containersToUse.length === 0) return null;
    const totalSelectedWeight = containersToUse.reduce((sum, sc) => {
      const scNo = (sc.container_number || sc.container_no || sc.containerNo || "").trim().toUpperCase();
      const oIdx = boeContainers.findIndex(bc => {
        const bcNo = (bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "").trim().toUpperCase();
        return bcNo === scNo || (bcNo && scNo && bcNo.includes(scNo));
      });
      const w = oIdx !== -1 ? containerWeights[oIdx] : containerWeights[`manual_${scNo}`];
      return sum + (parseFloat(w) || 0);
    }, 0);
    return (
      <div className="ewb-section">
        <div className="ewb-section-title"><span className="title-accent"></span>Container Weight Distribution
          <button type="button" className="ewb-btn link" style={{ marginLeft: 12 }}
            onClick={() => setShowFormulaDialog(true)}>
            ⓘ Formula
          </button>
        </div>
        <div className="ewb-stat-row">
          <div className="ewb-stat"><div className="s-label">Total Weight</div><div className="s-val">{totalSelectedWeight.toFixed(2)}<span>KGS</span></div></div>
          <div className="ewb-stat"><div className="s-label">Containers</div><div className="s-val">{containersToUse.length}</div></div>
          <div className="ewb-stat"><div className="s-label">Per KG Value</div><div className="s-val">₹{perKgValue.toFixed(2)}</div></div>
        </div>
        <div className="ewb-container-grid">
          {containersToUse.map((sc, displayIdx) => {
            const scNo = (sc.container_number || sc.container_no || sc.containerNo || "").trim().toUpperCase();
            const oIdx = boeContainers.findIndex(bc => {
              const bcNo = (bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "").trim().toUpperCase();
              return bcNo === scNo || (bcNo && scNo && bcNo.includes(scNo));
            });
            const rawW = oIdx !== -1 ? containerWeights[oIdx] : containerWeights[`manual_${scNo}`];
            const currentWeight = rawW !== undefined && rawW !== null ? rawW : (sc.gross_weight || sc.grossWeight || "");
            const containerAssessable = ((parseFloat(currentWeight) || 0) * perKgValue).toFixed(2);
            return (
              <div key={displayIdx} className="ewb-container-card">
                <div className="cc-label">Container {displayIdx + 1}</div>
                <div className="cc-no">{scNo || 'N/A'}{oIdx === -1 && <span style={{ fontSize: '0.65rem', color: '#e03131', display: 'block', fontWeight: 600 }}>Not in BOE</span>}</div>
                <div className="cc-row">
                  <span className="cc-key">Weight (KG)</span>
                  <input type="text" className="ewb-wt-input" value={currentWeight}
                    onChange={(e) => updateContainerWeight(scNo, oIdx, e.target.value)}
                  />
                </div>
                <div className="cc-val-row">
                  <span className="cc-val-label">Value</span>
                  <span className="cc-val">₹{parseFloat(containerAssessable).toLocaleString('en-IN')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Calculated value banner ────────────────────────────────────────────────
  const renderCalcBanner = () => {
    if (!(isMultiContainerMode && generationMode === 'batch-selected' && selectedContainers?.length === 1)) return null;
    const firstContainer = selectedContainers[0];
    const cv = containerAssessableValues[firstContainer._id] || {
      weight: parseFloat(firstContainer.gross_weight || 0),
      assessableValue: parseFloat(firstContainer.gross_weight || 0) * (perKgValue || 0)
    };
    if (cv.assessableValue <= 0) return null;
    const pkv = perKgValue || (cv.assessableValue / cv.weight);
    return (
      <div className="ewb-calc-banner">
        <div className="cb-title">✓ Calculated Assessable Value: ₹{cv.assessableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div className="cb-formula">₹{pkv.toFixed(2)}/kg × {cv.weight} kg = ₹{cv.assessableValue.toFixed(2)}</div>
        <div className="cb-note">Pre-filled in Taxable Amount and Total Invoice Value below.</div>
      </div>
    );
  };

  const renderFormulaDialog = () => {
    const containersToUse = selectedContainers?.length > 0 ? selectedContainers : boeContainers;

    // Calculate totals for summary row
    let totalWeightSum = 0;
    let totalValueSum = 0;
    let totalIgstSum = 0;
    let totalFinalInvoiceSum = 0;

    const rows = containersToUse.map((sc, displayIdx) => {
      const scNo = (sc.container_number || sc.container_no || sc.containerNo || "").trim().toUpperCase();
      const oIdx = boeContainers.findIndex(bc => {
        const bcNo = (bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "").trim().toUpperCase();
        return bcNo === scNo || (bcNo && scNo && bcNo.includes(scNo));
      });
      const rawW = oIdx !== -1 ? containerWeights[oIdx] : containerWeights[`manual_${scNo}`];
      const currentWeight = rawW !== undefined && rawW !== null ? rawW : (sc.gross_weight || sc.grossWeight || "0");
      const weightNum = parseFloat(currentWeight) || 0;
      const containerValue = weightNum * perKgValue;
      const igstPercent = parseFloat(formData.items[0]?.igstRate || 0);
      const igstAmount = containerValue * (igstPercent / 100);
      const finalInvoiceValue = containerValue + igstAmount;

      totalWeightSum += weightNum;
      totalValueSum += containerValue;
      totalIgstSum += igstAmount;
      totalFinalInvoiceSum += finalInvoiceValue;

      return {
        scNo,
        oIdx,
        currentWeight,
        weightNum,
        containerValue,
        igstPercent,
        igstAmount,
        finalInvoiceValue,
      };
    });

    return (
      <Dialog
        open={showFormulaDialog}
        onClose={() => setShowFormulaDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: 12,
            padding: 16,
          }
        }}
        style={{ zIndex: 1302 }}
      >
        <DialogTitle style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div" style={{ fontWeight: 700 }}>
            E-Way Bill Calculation Flow
          </Typography>
          <button className="ewb-close-btn" style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#8898aa' }} onClick={() => setShowFormulaDialog(false)}>×</button>
        </DialogTitle>
        <DialogContent dividers>
          {/* Global variables display */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom style={{ fontWeight: 700, color: '#525f7f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Global BOE Reference Variables
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box p={2} border={1} borderColor="grey.200" borderRadius={2} bgcolor="#f8fafc">
                  <Typography variant="caption" color="textSecondary" display="block" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>Assessable Value from BOE</Typography>
                  <Typography variant="body1" style={{ fontWeight: 700, color: '#1a1f36', marginTop: 4 }}>₹{assessableValueFromBoe.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box p={2} border={1} borderColor="grey.200" borderRadius={2} bgcolor="#f8fafc">
                  <Typography variant="caption" color="textSecondary" display="block" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>Non-Refundable Duties</Typography>
                  <Typography variant="body1" style={{ fontWeight: 700, color: '#1a1f36', marginTop: 4 }}>₹{nonRefundableDuties.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box p={2} border={1} borderColor="grey.200" borderRadius={2} bgcolor="#f8fafc">
                  <Typography variant="caption" color="textSecondary" display="block" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>Total BOE Value</Typography>
                  <Typography variant="body1" style={{ fontWeight: 700, color: '#1a1f36', marginTop: 4 }}>₹{totalValueFromBoe.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box p={2} border={1} borderColor="grey.200" borderRadius={2} bgcolor="#f8fafc">
                  <Typography variant="caption" color="textSecondary" display="block" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>Total BOE Weight</Typography>
                  <Typography variant="body1" style={{ fontWeight: 700, color: '#1a1f36', marginTop: 4 }}>{totalBoeWeight.toLocaleString('en-IN')} KGS</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box p={2} border={1} borderColor="grey.200" borderRadius={2} bgcolor="#fffbeb">
                  <Typography variant="caption" color="amber.800" display="block" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Per KG Value (Derived)</Typography>
                  <Typography variant="body1" style={{ fontWeight: 800, color: '#b45309', marginTop: 4 }}>₹{perKgValue.toFixed(4)}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box mb={3} p={2} bgcolor="#eff6ff" borderRadius={2} borderLeft={4} style={{ borderLeftColor: '#3b5bdb' }}>
            <Typography variant="subtitle2" style={{ fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>
              Derivation Formulas
            </Typography>
            <Typography variant="body2" style={{ color: '#1e40af', fontSize: '0.85rem' }}>
              • <strong>Per KG Value</strong> = (Assessable Value [{assessableValueFromBoe.toFixed(2)}] + Non-Refundable Duties [{nonRefundableDuties.toFixed(2)}]) / Total BOE Weight [{totalBoeWeight}] = <strong>₹{perKgValue.toFixed(4)}</strong>
            </Typography>
            <Typography variant="body2" style={{ color: '#1e40af', fontSize: '0.85rem', marginTop: 4 }}>
              • <strong>Container Value</strong> = Container Weight × Per KG Value
            </Typography>
            <Typography variant="body2" style={{ color: '#1e40af', fontSize: '0.85rem', marginTop: 4 }}>
              • <strong>Final Invoice Value</strong> = Container Value + IGST Amount (Container Value × {formData.items[0]?.igstRate || 0}%)
            </Typography>
          </Box>

          {/* Container-wise breakdown table */}
          <Typography variant="subtitle2" gutterBottom style={{ fontWeight: 700, color: '#525f7f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Container-Wise Calculation Breakdown
          </Typography>
          <TableContainer component={Paper} variant="outlined" style={{ borderRadius: 8 }}>
            <Table size="small">
              <TableHead style={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell style={{ fontWeight: 700 }}>Container Number</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, width: '160px' }}>Container Weight (KG)</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700 }}>Container Value</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700 }}>IGST %</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700 }}>IGST Amount</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700 }}>Final Invoice Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell style={{ fontWeight: 600 }}>
                      {row.scNo || 'N/A'}
                      {row.oIdx === -1 && (
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#e03131', fontWeight: 600 }}>
                          Not in BOE
                        </span>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <input
                        type="text"
                        value={row.currentWeight}
                        onChange={(e) => updateContainerWeight(row.scNo, row.oIdx, e.target.value)}
                        className="ewb-wt-input"
                        style={{ width: '110px', padding: '4px 8px', border: '1px solid #d9e2ec', borderRadius: 4, fontWeight: 700, textAlign: 'right', color: '#3b5bdb' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <div style={{ fontWeight: 600 }}>₹{row.containerValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                        {row.weightNum.toLocaleString('en-IN')} kg × ₹{perKgValue.toFixed(4)}
                      </div>
                    </TableCell>
                    <TableCell align="right">{row.igstPercent}%</TableCell>
                    <TableCell align="right">
                      <div style={{ fontWeight: 600 }}>₹{row.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                        ₹{row.containerValue.toFixed(2)} × {row.igstPercent}%
                      </div>
                    </TableCell>
                    <TableCell align="right" style={{ fontWeight: 700 }}>
                      <div style={{ color: '#1e40af' }}>₹{row.finalInvoiceValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2, fontWeight: 400 }}>
                        ₹{row.containerValue.toFixed(2)} + ₹{row.igstAmount.toFixed(2)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Summary Totals Row */}
                <TableRow style={{ backgroundColor: '#f0f4ff' }}>
                  <TableCell style={{ fontWeight: 700 }}>Total Summary</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, paddingRight: '16px' }}>
                    {totalWeightSum.toLocaleString('en-IN')} KGS
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700 }}>
                    <div>₹{totalValueSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2, fontWeight: 400 }}>
                      {totalWeightSum.toLocaleString('en-IN')} kg × ₹{perKgValue.toFixed(4)}
                    </div>
                  </TableCell>
                  <TableCell align="right">—</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700 }}>
                    <div>₹{totalIgstSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2, fontWeight: 400 }}>
                      ₹{totalValueSum.toFixed(2)} × {formData.items[0]?.igstRate || 0}%
                    </div>
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 800, color: '#1a1f36' }}>
                    <div>₹{totalFinalInvoiceSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2, fontWeight: 400 }}>
                      ₹{totalValueSum.toFixed(2)} + ₹{totalIgstSum.toFixed(2)}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions style={{ padding: '12px 16px' }}>
          <Button onClick={() => setShowFormulaDialog(false)} variant="contained" color="primary" style={{ fontWeight: 600, textTransform: 'none', borderRadius: 6 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────
  const container = selectedLr?.container_details;

  return (
    <FieldErrorContext.Provider value={{ renderErr }}>
      <div className={`ewb-wrap${asDialog ? ' as-dialog' : ''}`}>
        <style>{FLAT_STYLES}</style>
        <datalist id="states">{INDIAN_STATES.map(s => <option key={s} value={s} />)}</datalist>
        <datalist id="transporters">{transporters.map(t => <option key={t._id} value={t.gstin}>{t.name}</option>)}</datalist>
        <datalist id="dispatchCitiesList">{dispatchCities.map((c, i) => <option key={i} value={c.city}>{c.city}, {c.state}</option>)}</datalist>
        <datalist id="shipCitiesList">{shipCities.map((c, i) => <option key={i} value={c.city}>{c.city}, {c.state}</option>)}</datalist>

        {/* Header */}
        <div className="ewb-header">
          <h2>Generate E-Way Bill</h2>
          {asDialog && onClose && <button className="ewb-close-btn" onClick={onClose}>×</button>}
        </div>

        {/* Success state */}
        {success ? (
          <div className="ewb-form">
            <div className="ewb-success">
              <div className="success-icon">✅</div>
              <h3>E-Way Bill {isPartBOnly ? "Part B Updated" : "Generated"} Successfully</h3>
              <div className="ewb-no">{success.ewbNo}</div>
              <div className="ewb-meta">Date: {success.ewbDate} &nbsp;·&nbsp; Valid Until: {success.validUpto}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                {success.pdfUrl && <a href={success.pdfUrl} target="_blank" rel="noopener noreferrer" className="ewb-btn primary">Download PDF</a>}
                <button className="ewb-btn secondary" onClick={handleReset}>Generate Another</button>
              </div>
            </div>
          </div>
        ) : (
          <form className="ewb-form" onSubmit={handleSubmit}>

            {/* Calculated value banner */}
            {renderCalcBanner()}

            {/* ── Part B only mode ── */}
            {isPartBOnly ? (
              <>
                <div className="ewb-partb-banner">
                  <div className="icon">🔒</div>
                  <div>
                    <strong>E-Way Bill Already Generated: {existingEwbNo}</strong>
                    <span>Part A is locked. You can only update Part B (vehicle/transport details).</span>
                  </div>
                </div>

                {renderPartAPreview()}

                {/* Action sub-tabs */}
                {!asDialog && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #e4e9f0', paddingBottom: 0 }}>
                    {['update', 'extend', 'multi'].map(t => (
                      <button key={t} type="button"
                        onClick={() => setActionTab(t)}
                        style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: actionTab === t ? 700 : 400, color: actionTab === t ? '#3b5bdb' : '#8898aa', borderBottom: actionTab === t ? '2px solid #3b5bdb' : '2px solid transparent', fontSize: '0.85rem', marginBottom: -1 }}>
                        {t === 'update' ? 'Update Vehicle' : t === 'extend' ? 'Extend Validity' : 'Multi-Vehicle'}
                      </button>
                    ))}
                  </div>
                )}

                {actionTab === 'update' && renderUpdatePartB()}
                {actionTab === 'extend' && renderExtendValidity()}
                {actionTab === 'multi' && renderMultiVehicle()}
              </>
            ) : (
              <>
                {/* Mode badge */}
                {ewbMode !== 'general' && (
                  <div className={`ewb-mode-badge ${ewbMode}`}>
                    <span className="dot"></span>
                    {ewbMode === 'import' ? 'Import Mode · Inward Supply · Bill of Entry · IGST Only' : 'Export Mode · Outward Supply · Tax Invoice · IGST Only'}
                  </div>
                )}

                {/* Container weight distribution */}
                {renderContainerWeights()}

                {/* Transaction & Document */}
                <div className="ewb-section">
                  <div className="ewb-section-title"><span className="title-accent"></span>Transaction & Document</div>
                  <div className="ewb-grid cols-4" style={{ marginBottom: 14 }}>
                    <Field label="Supply Type" name="supplyType">
                      <div className="ewb-radio-group">
                        <label className="ewb-radio-opt"><input type="radio" name="supplyType" value="outward" checked={formData.supplyType === "outward"} onChange={handleInputChange} /><span>Outward</span></label>
                        <label className="ewb-radio-opt"><input type="radio" name="supplyType" value="inward" checked={formData.supplyType === "inward"} onChange={handleInputChange} /><span>Inward</span></label>
                      </div>
                    </Field>
                    <Field label="Sub Type" name="subSupplyType">
                      <select className="ewb-select" name="subSupplyType" value={formData.subSupplyType} onChange={handleInputChange}>
                        <option value="Supply">Supply</option><option value="Import">Import</option><option value="Export">Export</option>
                        <option value="Job Work">Job Work</option><option value="SKD/CKD">SKD/CKD</option>
                        <option value="Recipient Not Known">Recipient Not Known</option><option value="For Own Use">For Own Use</option>
                        <option value="Exhibition or Fairs">Exhibition or Fairs</option><option value="Line Sales">Line Sales</option>
                        <option value="Others">Others</option>
                      </select>
                    </Field>
                    <Field label="Document Type" name="documentType">
                      <select className="ewb-select" name="documentType" value={formData.documentType} onChange={handleInputChange}>
                        <option value="Tax Invoice">Tax Invoice</option><option value="Bill of Supply">Bill of Supply</option>
                        <option value="Bill of Entry">Bill of Entry</option><option value="Delivery Challan">Delivery Challan</option>
                        <option value="Others">Others</option>
                      </select>
                    </Field>
                    <Field label="Transaction Type" name="transactionType">
                      <select className="ewb-select" name="transactionType" value={formData.transactionType} onChange={handleInputChange}>
                        <option value={1}>Regular</option>
                        <option value={2}>Bill To – Ship To</option>
                        <option value={3}>Bill From – Dispatch From</option>
                        <option value={4}>Combination of 2 & 3</option>
                      </select>
                    </Field>
                  </div>
                  <div className="ewb-grid cols-2">
                    <Field label="Document No" req name="documentNumber">
                      <input className={ic("documentNumber")} name="documentNumber" value={formData.documentNumber} onChange={handleInputChange} placeholder="Enter document number" />
                    </Field>
                    <Field label="Document Date" req name="documentDate">
                      <input type="date" className={ic("documentDate")} name="documentDate" value={formData.documentDate} onChange={handleInputChange} />
                    </Field>
                  </div>
                </div>

                {/* Bill From + Dispatch From */}
                <div className="ewb-split">
                  <div className="ewb-section" style={{ marginBottom: 0 }}>
                    <div className="ewb-section-title"><span className="title-accent"></span>Bill From (Consignor)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Field label="Name" req name="consignorName">
                        <input className={ic("consignorName")} name="consignorName" value={formData.consignorName} onChange={handleInputChange} placeholder="Consignor name" />
                      </Field>
                      <Field label="GSTIN / URP" req name="consignorGstin">
                        <input className={ic("consignorGstin")} name="consignorGstin" value={formData.consignorGstin} onChange={handleInputChange} placeholder="GSTIN or URP" />
                      </Field>
                      <Field label="State" req name="consignorState">
                        <input list="states" className={ic("consignorState")} name="consignorState" value={formData.consignorState} onChange={handleInputChange} placeholder="State" />
                      </Field>
                    </div>
                  </div>
                  <div className="ewb-section" style={{ marginBottom: 0 }}>
                    <div className="ewb-section-title">
                      <span className="title-accent green"></span>Dispatch From
                      <span className={`section-badge ${(formData.transactionType == 1 || formData.transactionType == 2) ? 'badge-sync' : 'badge-ind'}`}>
                        {(formData.transactionType == 1 || formData.transactionType == 2) ? 'Same as From' : 'Independent'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Field label="Address" req name="dispatchFromAddress1">
                        <input className={ic("dispatchFromAddress1")} name="dispatchFromAddress1" value={formData.dispatchFromAddress1} onChange={handleInputChange} placeholder="Pickup address" />
                      </Field>
                      <Field label="City / Place" req name="dispatchFromCity">
                        <input list="dispatchCitiesList" className={ic("dispatchFromCity")} name="dispatchFromCity" value={formData.dispatchFromCity} onChange={handleInputChange} placeholder="City" />
                      </Field>
                      <div className="ewb-grid cols-2">
                        <Field label="Pincode" req name="dispatchFromPincode">
                          <div
                            className="pincode-input-wrap"
                            onBlur={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget)) {
                                setActivePincodeDropdown(null);
                              }
                            }}
                          >
                            <input
                              className={ic("dispatchFromPincode")}
                              name="dispatchFromPincode"
                              value={formData.dispatchFromPincode}
                              onChange={handleInputChange}
                              onKeyDown={(e) => handlePincodeKeyDown(e, 'dispatch')}
                              onFocus={() => openPincodeDropdown('dispatch', formData.dispatchFromPincode)}
                              onClick={() => openPincodeDropdown('dispatch', formData.dispatchFromPincode)}
                              placeholder="Pincode"
                            />
                            {renderPincodeChoices('dispatch')}
                          </div>
                        </Field>
                        <Field label="State" name="dispatchFromState">
                          <input list="states" className="ewb-input" name="dispatchFromState" value={formData.dispatchFromState} onChange={handleInputChange} placeholder="State" />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill To + Ship To */}
                <div className="ewb-split" style={{ marginTop: 20 }}>
                  <div className="ewb-section" style={{ marginBottom: 0 }}>
                    <div className="ewb-section-title"><span className="title-accent purple"></span>Bill To (Consignee)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Field label="Name" req name="consigneeName">
                        <input className={ic("consigneeName")} name="consigneeName" value={formData.consigneeName} onChange={handleInputChange} placeholder="Consignee name" />
                      </Field>
                      <Field label="GSTIN / URP" req name="consigneeGstin">
                        <input className={ic("consigneeGstin")} name="consigneeGstin" value={formData.consigneeGstin} onChange={handleInputChange} placeholder="GSTIN or URP" />
                      </Field>
                      <Field label="State" req name="consigneeState">
                        <input list="states" className={ic("consigneeState")} name="consigneeState" value={formData.consigneeState} onChange={handleInputChange} placeholder="State" />
                      </Field>
                    </div>
                  </div>
                  <div className="ewb-section" style={{ marginBottom: 0 }}>
                    <div className="ewb-section-title">
                      <span className="title-accent amber"></span>Ship To
                      <span className={`section-badge ${(formData.transactionType == 1 || formData.transactionType == 3) ? 'badge-sync' : 'badge-ind'}`}>
                        {(formData.transactionType == 1 || formData.transactionType == 3) ? 'Same as To' : 'Independent'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Field label="Address" req name="shipToAddress1">
                        <input className={ic("shipToAddress1")} name="shipToAddress1" value={formData.shipToAddress1} onChange={handleInputChange} placeholder="Delivery address" />
                      </Field>
                      <Field label="City / Place" req name="shipToCity">
                        <input list="shipCitiesList" className={ic("shipToCity")} name="shipToCity" value={formData.shipToCity} onChange={handleInputChange} placeholder="City" />
                      </Field>
                      <div className="ewb-grid cols-2">
                        <Field label="Pincode" req name="shipToPincode">
                          <div
                            className="pincode-input-wrap"
                            onBlur={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget)) {
                                setActivePincodeDropdown(null);
                              }
                            }}
                          >
                            <input
                              className={ic("shipToPincode")}
                              name="shipToPincode"
                              value={formData.shipToPincode}
                              onChange={handleInputChange}
                              onKeyDown={(e) => handlePincodeKeyDown(e, 'ship')}
                              onFocus={() => openPincodeDropdown('ship', formData.shipToPincode)}
                              onClick={() => openPincodeDropdown('ship', formData.shipToPincode)}
                              placeholder="Pincode"
                            />
                            {renderPincodeChoices('ship')}
                          </div>
                        </Field>
                        <Field label="State" name="shipToState">
                          <input list="states" className="ewb-input" name="shipToState" value={formData.shipToState} onChange={handleInputChange} placeholder="State" />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="ewb-section" style={{ marginTop: 20 }}>
                  <div className="ewb-section-title">
                    <span className="title-accent amber"></span>Item Details
                    <button type="button" className="ewb-btn secondary sm" style={{ marginLeft: 'auto', padding: '0 12px' }} onClick={addItem}>+ Add Item</button>
                  </div>
                  {formData.items.map((item, index) => (
                    <div key={index} className="ewb-item-row">
                      <div className="ewb-item-head">
                        <span className="ewb-item-label">Item {index + 1}</span>
                        {formData.items.length > 1 && <button type="button" className="ewb-remove-btn" onClick={() => removeItem(index)}>✕ Remove</button>}
                      </div>
                      <div className="ewb-grid cols-2" style={{ marginBottom: 10 }}>
                        <Field label="Product Name" name={`items[${index}].productName`}>
                          <input className="ewb-input" name="productName" value={item.productName} onChange={e => handleItemChange(index, e)} />
                        </Field>
                        <Field label="Description" name={`items[${index}].productDesc`}>
                          <input className="ewb-input" name="productDesc" value={item.productDesc} onChange={e => handleItemChange(index, e)} />
                        </Field>
                      </div>
                      <div className="ewb-grid cols-3" style={{ marginBottom: 10 }}>
                        <Field label="HSN Code" req name={`items[${index}].hsnCode`}>
                          <input className={ic(`items[${index}].hsnCode`)} name="hsnCode" value={item.hsnCode} onChange={e => handleItemChange(index, e)} placeholder="HSN" />
                        </Field>
                        <Field label="Quantity" name={`items[${index}].quantity`}>
                          <input type="number" className="ewb-input" name="quantity" value={item.quantity} onChange={e => handleItemChange(index, e)} min="0" />
                        </Field>
                        <Field label="Unit" name={`items[${index}].qtyUnit`}>
                          <select className="ewb-select" name="qtyUnit" value={item.qtyUnit} onChange={e => handleItemChange(index, e)}>
                            <option value="NOS">Numbers</option><option value="KGS">Kilograms</option>
                            <option value="MTS">Metric Tons</option><option value="BO">Boxes</option><option value="CTN">Cartons</option>
                          </select>
                        </Field>
                      </div>
                      <div className={`ewb-grid ${ewbMode === 'general' ? 'cols-5' : 'cols-3'}`}>
                        <Field label="Taxable Amount" req name={`items[${index}].taxableAmount`}>
                          <input type="number" className={ic(`items[${index}].taxableAmount`)} name="taxableAmount" value={item.taxableAmount} onChange={e => handleItemChange(index, e)} placeholder="0.00" />
                        </Field>
                        {ewbMode === 'general' && (
                          <>
                            <Field label="CGST %" name={`items[${index}].cgstRate`}>
                              <input type="number" className="ewb-input" name="cgstRate" value={item.cgstRate} onChange={e => handleItemChange(index, e)} />
                            </Field>
                            <Field label="SGST %" name={`items[${index}].sgstRate`}>
                              <input type="number" className="ewb-input" name="sgstRate" value={item.sgstRate} onChange={e => handleItemChange(index, e)} />
                            </Field>
                          </>
                        )}
                        <Field label="IGST %" name={`items[${index}].igstRate`}>
                          <input type="number" className="ewb-input" name="igstRate" value={item.igstRate} onChange={e => handleItemChange(index, e)} />
                        </Field>
                        <Field label="CESS %" name={`items[${index}].cessRate`}>
                          <input type="number" className="ewb-input" name="cessRate" value={item.cessRate} onChange={e => handleItemChange(index, e)} />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Duty Summary */}
                {dutySummary && (() => {
                  const dAss = parseFloat(dutySummary['TOT.ASS VAL'] || 0);
                  const dIgst = parseFloat(dutySummary['IGST'] || 0);
                  return (
                    <div className="ewb-section">
                      <div className="ewb-section-title"><span className="title-accent"></span>Duty Summary <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(from Bill of Entry)</span></div>
                      <div className="ewb-duty-row">
                        <div className="ewb-duty-cell"><span className="dc-label">Assessable Value</span><span className="dc-val">₹{dAss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        <div className="ewb-duty-cell"><span className="dc-label">IGST</span><span className="dc-val">₹{dIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#a0aec0', marginTop: 8, fontStyle: 'italic' }}>Duty values from BOE extract. Taxable Value = Assessable Value + Custom Duty.</div>
                    </div>
                  );
                })()}

                {/* Invoice Totals */}
                <div className="ewb-section">
                  <div className="ewb-section-title"><span className="title-accent"></span>Invoice Totals</div>
                  <div className="ewb-grid cols-2">
                    <Field label="Other Amount (+/−)" name="otherAmount">
                      <input type="number" className="ewb-input" name="otherAmount" value={formData.otherAmount} onChange={handleInputChange} />
                    </Field>
                    <Field label="Total Invoice Value" name="totalInvoiceValue">
                      <input type="number" className={`ewb-input${fieldErrors.totalInvoiceValue ? ' err' : ''}`} name="totalInvoiceValue" value={formData.totalInvoiceValue} readOnly style={{ fontWeight: 700, color: '#1a1f36', background: '#f5f7fa' }} />
                    </Field>
                  </div>
                </div>

                {/* Transportation */}
                <div className="ewb-section">
                  <div className="ewb-section-title"><span className="title-accent"></span>Transportation Details (Part B)</div>
                  <div className="ewb-grid cols-2" style={{ marginBottom: 14 }}>
                    <Field label="Transporter ID (GSTIN)" name="transporterId">
                      <input list="transporters" className="ewb-input" name="transporterId" value={formData.transporterId} onChange={handleTransporterChange} placeholder="Enter or select GSTIN" />
                    </Field>
                    <Field label="Transporter Name" name="transporterName">
                      <input className="ewb-input" name="transporterName" value={formData.transporterName} onChange={handleInputChange} />
                    </Field>
                  </div>
                  <div className="ewb-grid cols-3" style={{ marginBottom: 14 }}>
                    <Field label="Distance (KM)" name="transportDistance">
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" className={ic("transportDistance")} name="transportDistance" value={formData.transportDistance} onChange={handleInputChange} placeholder="KM" style={{ flex: 1 }} />
                        <button type="button" className="ewb-btn secondary sm" onClick={fetchDistance} title="Calculate PIN-to-PIN">Verify</button>
                      </div>
                      {renderErr("transportDistance")}
                    </Field>
                    <Field label="Vehicle Type" name="vehicleType">
                      <select className="ewb-select" name="vehicleType" value={formData.vehicleType} onChange={handleInputChange}>
                        <option value="Regular">Regular</option>
                        <option value="ODC">Over Dimensional Cargo</option>
                      </select>
                    </Field>
                    <Field label="Mode" name="transportationMode">
                      <select className="ewb-select" name="transportationMode" value={formData.transportationMode} onChange={handleInputChange}>
                        <option value="Road">Road</option><option value="Rail">Rail</option>
                        <option value="Air">Air</option><option value="Ship">Ship</option>
                      </select>
                    </Field>
                  </div>
                  <div className="ewb-grid cols-3">
                    <Field label="Vehicle No" req name="vehicleNo">
                      <input className={ic("vehicleNo")} name="vehicleNo" value={formData.vehicleNo} onChange={handleInputChange} placeholder="XX00XX0000" />
                    </Field>
                    <Field label="Transporter Doc No" name="transporterDocNo">
                      <input className="ewb-input" name="transporterDocNo" value={formData.transporterDocNo} onChange={handleInputChange} />
                    </Field>
                    <Field label="Transporter Doc Date" name="transporterDocDate">
                      <input type="date" className="ewb-input" name="transporterDocDate" value={formData.transporterDocDate} onChange={handleInputChange} />
                    </Field>
                  </div>
                </div>

                {/* Actions */}
                <div className="ewb-actions">
                  <button type="button" className="ewb-btn secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="ewb-btn primary" disabled={generating}>
                    {generating ? <><span className="ewb-spinner"></span> Generating...</> : "Generate E-Way Bill →"}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
        {renderFormulaDialog()}
      </div>
    </FieldErrorContext.Provider>
  );
}

export default EwayBillGenerateLR;
