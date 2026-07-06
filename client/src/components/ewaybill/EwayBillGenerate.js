import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "../../utils/axiosConfig";
import Swal from "sweetalert2";
import { Autocomplete, TextField } from "@mui/material";
import "../../styles/ewaybill.scss";
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
    { code: '436', field: 'consignorPincode', msg: 'Consignor pincode must be 999999 for imports.' },
    { code: '437', field: 'shipToPincode', msg: 'Consignee pincode must be 999999 for exports.' },
    { code: '437', field: 'consigneePincode', msg: 'Consignee pincode must be 999999 for exports.' },
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
      // Dynamically pass through the actual API message instead of overwriting with hardcoded m.msg
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

// List of valid Indian States for E-Way Bill
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Ladakh", "Lakshadweep",
  "Puducherry", "Other Territory"
];

// Helper to split company name and address based on common suffixes
const splitCompanyNameAndAddress = (fullString) => {
  if (!fullString) return { name: "", address: "" };
  
  // Suffixes based on user request
  const suffixes = ["Private Limited", "Pvt Ltd", "Ltd", "Inc", "LLP", "Corporation"];
  // Create regex pattern: match up to the end of any suffix (case-insensitive)
  // Example: /^(.+?\b(?:Private Limited|Pvt Ltd|Ltd|Inc|LLP|Corporation)\b)(.*)$/i
  const pattern = new RegExp(`^(.+?\\b(?:${suffixes.join('|')})\\b)(.*)$`, 'i');
  
  const match = fullString.match(pattern);
  if (match) {
    return {
      name: match[1].trim(),
      address: match[2].trim().replace(/^[., \s]+|[., \s]+$/g, '') // clean leading/trailing dots/commas/spaces
    };
  }
  
  // Fallback: if no suffix found, try splitting by first comma or double space
  const fallbackParts = fullString.split(/\s{2,}|,/);
  return {
    name: fallbackParts[0]?.trim() || "",
    address: fallbackParts.slice(1).join(',').trim() || fullString
  };
};

// Helper to normalize state name
const normalizeState = (stateName) => {
  if (!stateName) return "";
  // Fix common typos
  if (stateName.toLowerCase() === "uttrakhand") return "Uttarakhand";

  // Try to find exact match
  const match = INDIAN_STATES.find(s => s.toLowerCase() === stateName.toLowerCase());
  return match || stateName; // Return corrected or original
};

const getBoeItemHsnCode = (item = {}) => {
  const candidates = [
    item.HSN_CODE,
    item.HSN,
    item.hsn_code,
    item.hsnCode,
    item.RITC,
    item.CTH,
    item.CTH_CODE,
    item.CTHNO,
    item.CETH,
  ];

  for (const value of candidates) {
    if (value === null || value === undefined) continue;
    // BUG-03 FIX: Strip non-numeric characters (e.g. "72042190 FOR" → "72042190")
    const normalized = String(value).replace(/[^0-9]/g, "").trim();
    if (normalized) return normalized;
  }

  return "";
};

// Default empty item
const EMPTY_ITEM = {
  productName: "",
  productDesc: "",
  hsnCode: "",
  quantity: 1,
  qtyUnit: "NOS",
  taxableAmount: "",
  cgstRate: 0,
  sgstRate: 0,
  igstRate: 0,
  cessRate: 0,
  cessNonAdvol: 0
};

// Default form state
const DEFAULT_FORM = {
  supplyType: "outward",
  subSupplyType: "Supply",
  documentType: "Tax Invoice",
  transactionType: 1,
  documentNumber: "",
  documentDate: new Date().toISOString().split('T')[0],
  consignorName: "",
  consignorGstin: "",
  consignorState: "",
  consignorAddress1: "",
  consignorAddress2: "",
  consignorCity: "",
  consignorPincode: "",
  dispatchFromAddress1: "",
  dispatchFromCity: "",
  dispatchFromPincode: "",
  dispatchFromState: "",
  consigneeName: "",
  consigneeGstin: "",
  consigneeState: "",
  consigneeAddress1: "",
  consigneeAddress2: "",
  consigneeCity: "",
  consigneePincode: "",
  shipToAddress1: "",
  shipToCity: "",
  shipToPincode: "",
  shipToState: "",
  items: [{ ...EMPTY_ITEM }],
  otherAmount: 0,
  totalInvoiceValue: "",
  transporterId: process.env.REACT_APP_DEFAULT_GSTIN || "",
  transporterName: "",
  transporterDocNo: "",
  transporterDocDate: new Date().toISOString().split('T')[0],
  transportationMode: "Road",
  transportDistance: "",
  vehicleNo: "",
  vehicleType: "Regular",
  userGstin: "", // Added for Part B robust lookup
  reasonCode: "duetobreakdown", // Added for Part B
  reasonText: "", // Added for Part B
};

function EwayBillGenerate({ 
  asDialog = false, 
  action = "", // "generate" or "update"
  existingEwb = "",
  prefilledLrId = "", 
  prData = null, 
  prefilledAssessableValue = null,
  hideTabs = false,
  boeOnly = false,
  // NEW: Multi-container support props
  selectedContainers = null,              // Array of selected container objects
  containerSelectionMode = null,          // "all" | "selected" | null
  containerAssessableValues = {},         // { containerId: { weight, perKgValue, assessableValue } }
  boeData = null,                         // Full BOE extract with perKgValue, duties, etc.
  onClose, 
  onSuccess,
  partAOnlyDefault = false,
  jobId = null
}) {
  // ---- Tab & Mode State ----
  // For BOE-only mode we always start in BOE tab and don't display the LR path.
  const [activeTab, setActiveTab] = useState('boe'); // default to BOE
  const [actionTab, setActionTab] = useState('generate'); // 'generate' | 'update' | 'extend' | 'multi' (Action Mode)
  const [isPartBOnly, setIsPartBOnly] = useState(false);

  useEffect(() => {
    if (boeOnly) {
      setActiveTab('boe');
    } else if (activeTab === 'boe' && !boeOnly) {
      setActiveTab('lr');
    }
  }, [boeOnly]);
  const [existingEwbNo, setExistingEwbNo] = useState('');
  // ewbMode: 'import' | 'export' | 'general' — auto-detected from PrData.import_export
  const [ewbMode, setEwbMode] = useState('general');

  // ---- Multi-container Detection & Tracking (NEW) ----
  const [isMultiContainerMode, setIsMultiContainerMode] = useState(false);
  const [generationMode, setGenerationMode] = useState('single'); // 'single' | 'batch-all' | 'batch-selected'

  const [boeContainers, setBoeContainers] = useState([]);
  const [weightPerContainer, setWeightPerContainer] = useState(0);
  const [containerWeights, setContainerWeights] = useState({}); // idx -> weight
  const [showFormula, setShowFormula] = useState(false);
  const [totalValueFromBoe, setTotalValueFromBoe] = useState(0);
  const [perKgValue, setPerKgValue] = useState(0);

  // ---- BOE State ----
  const [boeList, setBoeList] = useState([]); // autocomplete list from PrData.document_no
  const [selectedBoe, setSelectedBoe] = useState(null); // selected from autocomplete
  const [boeNumber, setBoeNumber] = useState('');
  const [boeDate, setBoeDate] = useState(new Date().toISOString().split('T')[0]);
  const [boeLoading, setBoeLoading] = useState(false);
  const [boeLrLoading, setBoeLrLoading] = useState(false); // loading for internal LR lookup
  const [boeLrData, setBoeLrData] = useState(null); // internal LR data fetched on BOE select
  const [boeError, setBoeError] = useState('');
  const [boeAutoFetched, setBoeAutoFetched] = useState(false);

  // ---- Part A Preview (from API, for existing EWB) ----
  const [partADetails, setPartADetails] = useState(null);
  const [partALoading, setPartALoading] = useState(false);

  // ---- Excel Upload State ----
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadResults, setUploadResults] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ---- LR Selection State (existing) ----
  const [lrList, setLrList] = useState([]);
  const [selectedLrId, setSelectedLrId] = useState("");
  const [selectedLr, setSelectedLr] = useState(null);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(null);
  const generatedBoeDocumentsRef = useRef(new Set());

  // ---- Duty Summary (from BOE upload/extract) ----
  const [dutySummary, setDutySummary] = useState(null);

  // ---- Field-level validation errors ----
  const [fieldErrors, setFieldErrors] = useState({});

  // ---- Multi-vehicle State ----
  const [mvData, setMvData] = useState(null);
  const [mvLoading, setMvLoading] = useState(false);
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [addVehicleForm, setAddVehicleForm] = useState({
    vehicleNumber: "",
    transporterDocNo: "",
    transporterDocDate: "",
    quantity: "",
    modeOfTransport: "1",
    vehicleType: "r",
  });

  const clearFieldError = (fieldName) => {
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  const getInputClass = (fieldName, baseClass = 'form-input') => {
    return `${baseClass} ${fieldErrors[fieldName] ? 'error' : ''}`;
  };

  const renderFieldError = (fieldName) => {
    if (!fieldErrors[fieldName]) return null;
    return <div className="field-error" style={{ color: '#dc3545', fontSize: '0.875em', marginTop: '0.25rem' }}>{fieldErrors[fieldName]}</div>;
  };

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

  const mapEwbApiErrorToFields = (errorMessage, existingFieldErrors = {}) => {
    const errors = { ...existingFieldErrors };
    if (!errorMessage) return errors;

    const cleaned = String(errorMessage).replace(/\s+/g, ' ').trim();

    // Mapping NIC Codes to user-friendly messages and form fields
    const codeMapping = [
      { code: '371', field: 'consignorState', msg: 'Import error: Consignor State must be "Other Country"' },
      { code: '721', field: 'transportDistance', msg: 'Distance not available. Please enter manually.' },
      { code: '436', field: 'consignorPincode', msg: 'Consignor pincode must be 999999 for imports.' },
      { code: '436', field: 'dispatchFromPincode', msg: 'Consignor pincode must be 999999 for imports.' },
      { code: '437', field: 'consigneePincode', msg: 'Consignee pincode must be 999999 for exports.' },
      { code: '437', field: 'shipToPincode', msg: 'Consignee pincode must be 999999 for exports.' },
      { code: '254', field: 'items[0].igstRate', msg: 'Invalid Tax Rate. Check if SGST/CGST should be used.' },
      { code: '223', field: 'documentNumber', msg: '223: Invalid Transaction Document Number' },
      { code: '604', field: 'documentNumber', msg: 'Duplicate! E-way bill(s) are already generated for the same document number.' },
      { code: '362', field: 'transporterDocDate', msg: 'Transporter date cannot be before Document Date.' },
      { code: '311', field: 'ewayBillNo', msg: 'Vehicle details cannot be updated because the validity period has expired.' },
      { code: '302', field: 'items[0].hsnCode', msg: 'Invalid HSN Code.' },
      { code: '312', field: 'consignorPincode', msg: 'Invalid Consignor Pincode.' },
      { code: '314', field: 'shipToPincode', msg: 'Invalid Destination Pincode.' },
    ];

    codeMapping.forEach(m => {
      if (cleaned.includes(m.code)) {
        // Dynamically pass through actual API errorMessage instead of hardcoded msg
        errors[m.field] = errors[m.field] || errorMessage;
      }
    });

    // Fallback for generic state/pincode errors
    if (!Object.keys(errors).length && cleaned.toLowerCase().includes('state') && cleaned.toLowerCase().includes('pincode')) {
      errors.consignorState = errors.consignorState || cleaned;
      errors.shipToPincode = errors.shipToPincode || cleaned;
    }

    return errors;
  };



  // ---- Form State ----
  const [formData, setFormData] = useState({ ...DEFAULT_FORM, partAOnly: partAOnlyDefault || false });

  // ==========================================
  // Data Fetching
  // ==========================================

  useEffect(() => {
    fetchLrList();
    fetchTransporters();
    fetchBoeList();
  }, []);

  // ---- Multi-container Detection (NEW) ----
  useEffect(() => {
    if (selectedContainers && selectedContainers.length > 0) {
      setIsMultiContainerMode(true);
      if (containerSelectionMode === 'all') {
        setGenerationMode('batch-all');
      } else if (containerSelectionMode === 'selected') {
        setGenerationMode('batch-selected');
      } else {
        setGenerationMode('batch-selected'); // Default fallback
      }
    } else {
      setIsMultiContainerMode(false);
      setGenerationMode("single");
    }
  }, [selectedContainers, containerSelectionMode]);

  // ---- Pre-populate form for multi-container scenarios (NEW) ----
  const [autoFetchedBoe, setAutoFetchedBoe] = useState(false);

  useEffect(() => {
    if (isMultiContainerMode && selectedContainers.length > 0) {
      const firstContainer = selectedContainers[0];

      if (generationMode === "batch-all") {
        // Scenario 2: Calculate combined totals for selected containers only
        const totalWeight = selectedContainers.reduce(
          (sum, c) => sum + parseFloat(c.container_gross_weight || c.gross_weight || 0),
          0
        );

        // Fetch BOE automatically to pull assessable value and items
        if (boeNumber && !autoFetchedBoe) {
          setAutoFetchedBoe(true);
          handleBoeFetch();
        }

        // Proportional assessable value when only a subset of containers is selected
        const proportionalValue =
          perKgValue > 0 && totalWeight > 0
            ? parseFloat((totalWeight * perKgValue).toFixed(2))
            : parseFloat(boeData?.assessableValue || prefilledAssessableValue || 0) || 0;

        if (proportionalValue > 0) {
          setFormData((prev) => {
            const currentVal = parseFloat(prev.totalInvoiceValue) || 0;
            const currentQty = parseFloat(prev.items[0]?.quantity) || 0;
            const currentTaxable = parseFloat(prev.items[0]?.taxableAmount) || 0;
            const currentCalcVal = parseFloat(prev.calculatedAssessableValue) || 0;

            const hasChanged =
              Math.abs(currentVal - proportionalValue) > 0.01 ||
              Math.abs(currentQty - totalWeight) > 0.01 ||
              Math.abs(currentTaxable - proportionalValue) > 0.01 ||
              Math.abs(currentCalcVal - proportionalValue) > 0.01;

            if (!hasChanged) return prev;

            return {
              ...prev,
              totalInvoiceValue: proportionalValue,
              calculatedAssessableValue: proportionalValue,
              items: [
                {
                  ...(prev.items[0] || {}),
                  quantity: totalWeight,
                  taxableAmount: proportionalValue,
                },
              ],
            };
          });
        }
      } else if (generationMode === "batch-selected") {
        // Scenario 3: Individual Generation Flow
        // If there's 1 container, pre-fill its assessable value 
        if (selectedContainers.length === 1 && (containerAssessableValues[firstContainer._id] || firstContainer.container_gross_weight || firstContainer.gross_weight)) {
          const weightVal = parseFloat(firstContainer.container_gross_weight || firstContainer.gross_weight || 0);
          const assessableVal = parseFloat(firstContainer.assessable_value || 0) || (weightVal * (perKgValue || 0));
          const calcData = containerAssessableValues[firstContainer._id] || { 
            weight: weightVal,
            assessableValue: assessableVal
          };
          setFormData((prev) => {
            const targetVal = parseFloat(calcData.assessableValue) || 0;
            const targetQty = parseFloat(calcData.weight) || 0;
            const currentVal = parseFloat(prev.totalInvoiceValue) || 0;
            const currentQty = parseFloat(prev.items[0]?.quantity) || 0;
            const currentTaxable = parseFloat(prev.items[0]?.taxableAmount) || 0;
            const currentCalcVal = parseFloat(prev.calculatedAssessableValue) || 0;

            const hasChanged =
              Math.abs(currentVal - targetVal) > 0.01 ||
              Math.abs(currentQty - targetQty) > 0.01 ||
              Math.abs(currentTaxable - targetVal) > 0.01 ||
              Math.abs(currentCalcVal - targetVal) > 0.01;

            if (!hasChanged) return prev;

            return {
              ...prev,
              totalInvoiceValue: targetVal || prev.totalInvoiceValue || 0,
              calculatedAssessableValue: targetVal,
              items: [
                {
                  ...(prev.items[0] || {}),
                  quantity: targetQty,
                  taxableAmount: targetVal || prev.items[0]?.taxableAmount || 0,
                },
              ],
            };
          });
        } else {
          // Keep as is for multiple rendering
        }
      }
    }
  }, [isMultiContainerMode, selectedContainers, generationMode, boeData, prefilledAssessableValue, containerAssessableValues, perKgValue]);

  const fetchBoeList = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/boe-list`
      );
      if (response.data.success && response.data.data) {
        setBoeList(response.data.data); // Each item: { document_no, document_date, pr_no, consignor_name, consignee_name }
      }
    } catch (error) {
      console.error("Error fetching BOE list:", error);
    }
  };

  // Pre-fill logic when used as a Dialog
  useEffect(() => {
    if (asDialog) {
      if (action === "update" && existingEwb) {
        setIsPartBOnly(true);
        setActionTab('update');
        setExistingEwbNo(String(existingEwb));
        fetchPartADetails(String(existingEwb));
      } else if (action === "generate") {
        setIsPartBOnly(false);
        setActionTab('generate');
        setExistingEwbNo('');
      }

      if (prData) {
        const isImport = (prData.import_export || "").toLowerCase() === "import";
        const hasDocNo = !!prData.document_no;

        if (isImport && hasDocNo && action !== "update" && !boeAutoFetched) {
          // Switch to BOE tab for imports if we are generating
          setActiveTab('boe');
          const docNo = prData.document_no;
          const docDate = prData.document_date ? new Date(prData.document_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          
          setBoeNumber(docNo);
          setBoeDate(docDate);
          setBoeAutoFetched(true);

          // Auto-select the matching BOE item in the dropdown (if list already loaded)
          if (boeList && boeList.length > 0) {
            const matchedBoe = boeList.find(b =>
              (b.document_no || b.be_no || '') === docNo
            );
            if (matchedBoe) setSelectedBoe(matchedBoe);
          }
          
          // Trigger the full external fetch with the details from PR
          handleBoeFetch(docNo, docDate);
        } else if (prefilledLrId && !boeOnly) {
          // Switch to LR tab (only when not BOE-only mode)
          setActiveTab('lr');
        }
      }
    }
  }, [asDialog, action, existingEwb, prData, prefilledLrId, boeList, boeOnly]);

  // BUG-09: Auto-fetch distance when pincodes are available
  useEffect(() => {
    const fromPincode = formData.dispatchFromPincode || formData.consignorPincode;
    const toPincode = formData.shipToPincode || formData.consigneePincode;

    if (fromPincode && toPincode && (!formData.transportDistance || formData.transportDistance === 0)) {
      // Small delay to avoid rapid calls during initialization
      const timer = setTimeout(() => {
        fetchDistance();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.dispatchFromPincode, formData.consignorPincode, formData.shipToPincode, formData.consigneePincode]);

  // Auto-select BOE dropdown item when boeList loads after boeNumber is already set from prData
  useEffect(() => {
    if (boeList && boeList.length > 0 && boeNumber && !selectedBoe) {
      const matchedBoe = boeList.find(b =>
        (b.document_no || b.be_no || '') === boeNumber
      );
      if (matchedBoe) setSelectedBoe(matchedBoe);
    }
  }, [boeList, boeNumber]);

  // Step 3A: Fetch internal LR data immediately when BOE is selected
  const fetchBoeLrData = async (documentNo, documentDate) => {
    if (!documentNo) return;
    if (shouldSkipBoeLrDataFetch(documentNo)) return;
    try {
      setBoeLrLoading(true);
      setBoeError('');
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/boe-lr-data?document_no=${encodeURIComponent(documentNo)}`
      );
      if (response.data.success && response.data.data) {
        const lrData = response.data.data;
        setBoeLrData(lrData);

        // ── Smart EWB Mode Detection from import_export field ──────────────
        const importExport = (lrData.import_export || '').toLowerCase().trim();
        let detectedMode = 'general';
        let modeDefaults = {};

        if (importExport === 'import') {
          detectedMode = 'import';
          modeDefaults = {
            supplyType: 'inward',
            subSupplyType: 'Import',
            documentType: 'Bill of Entry',
            transactionType: 1,   // always Regular for imports
          };
        } else if (importExport === 'export') {
          detectedMode = 'export';
          modeDefaults = {
            supplyType: 'outward',
            subSupplyType: 'Export',
            documentType: 'Tax Invoice',
            transactionType: 1,
          };
        }
        setEwbMode(detectedMode);
        // ── End Mode Detection ─────────────────────────────────────────────

        // Check if E-Way Bill already exists → Part B only mode
        if (lrData.eWay_bill && lrData.eWay_bill !== '' && lrData.eWay_bill !== null) {
          setIsPartBOnly(true);
          setActionTab('update');
          setExistingEwbNo(String(lrData.eWay_bill));
          // Pre-fill Part B transport fields from LR + apply mode defaults
          setFormData(prev => ({
            ...prev,
            ...modeDefaults,
            vehicleNo: lrData.container_details?.vehicle_no || '',
            transporterDocNo: lrData.container_details?.tr_no || '',
            documentNumber: documentNo,
            documentDate: documentDate || prev.documentDate,
          }));
          // ✅ Fetch live Part A details from the E-Way Bill API
          fetchPartADetails(String(lrData.eWay_bill));
        } else {
          // Part A: auto-populate from internal LR immediately
          setIsPartBOnly(false);
          setExistingEwbNo('');
          setFormData(prev => {
            const res = {
              ...prev,
              ...modeDefaults,
              documentNumber: documentNo,
              documentDate: documentDate || prev.documentDate,
              consignorName: lrData.consignor?.name || '',
              consignorGstin: lrData.consignor?.gstin || '',
              consignorState: normalizeState(lrData.consignor?.branches?.[0]?.state || ''),
              consignorAddress1: lrData.consignor?.branches?.[0]?.address || '',
              consignorCity: lrData.consignor?.branches?.[0]?.city || '',
              consignorPincode: lrData.consignor?.branches?.[0]?.postalCode || '',
              consigneeName: lrData.consignee?.name || '',
              consigneeGstin: lrData.consignee?.gstin || '',
              consigneeState: normalizeState(lrData.consignee?.branches?.[0]?.state || ''),
              consigneeAddress1: lrData.consignee?.branches?.[0]?.address || '',
              consigneeCity: lrData.consignee?.branches?.[0]?.city || '',
              consigneePincode: lrData.consignee?.branches?.[0]?.postalCode || '',
              vehicleNo: lrData.container_details?.vehicle_no || '',
              transporterDocNo: lrData.container_details?.tr_no || '',
            };

            // Apply special rule: Suraj
            if (res.consignorName.toLowerCase().includes("suraj")) {
              res.consignorGstin = "URP";
              res.consignorPincode = "999999";
              res.dispatchFromPincode = "999999";
            }
            if (res.consigneeName.toLowerCase().includes("suraj")) {
              res.consigneeGstin = "URP";
              res.consigneePincode = "999999";
              res.shipToPincode = "999999";
            }
            return res;
          });
        }
      }
    } catch (error) {
      console.error('BOE LR data fetch error:', error);
      // Non-blocking – form stays empty, user can still click Fetch Details
    } finally {
      setBoeLrLoading(false);
    }
  };

  // Fetch live Part A details from the EWB API for the preview panel
  const fetchPartADetails = async (ewbNo) => {
    if (!ewbNo) return;
    try {
      setPartALoading(true);
      setPartADetails(null);
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/ewb-part-a?ewbNo=${encodeURIComponent(ewbNo)}`
      );
      if (response.data.success && response.data.data) {
        setPartADetails({ apiData: response.data.data, meta: response.data.meta });
      }
    } catch (error) {
      console.error('Part A details fetch error:', error);
      // Non-blocking – Part A preview will fall back to formData
    } finally {
      setPartALoading(false);
    }
  };

  const fetchLrList = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/lr-list`
      );
      if (response.data.data) {
        setLrList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching LR list:", error);
      Swal.fire("Error", "Failed to fetch LR list", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransporters = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/transporters`
      );
      if (response.data.success) {
        setTransporters(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching transporters:", error);
    }
  };

  // ==========================================
  // LR Tab: Populate form from LR
  // ==========================================

  const populateFormData = (selected) => {
    setSelectedLr(selected);
    const compositeId = selected._id && selected.container_details?._id
      ? `${selected._id}-${selected.container_details._id}`
      : selected._id;

    setSelectedLrId(compositeId);

    // Check if LR already has an E-Way Bill (Skip if action is forced to "generate")
    const ewbRef = selected.eWay_bill || selected.container_details?.eWay_bill;
    if (action !== "generate" && ewbRef && ewbRef !== "" && ewbRef !== null) {
      // Part B only mode
      setIsPartBOnly(true);
      setActionTab('update');
      setExistingEwbNo(String(ewbRef));

      // Still populate transport details for Part B
      setFormData(prev => ({
        ...prev,
        vehicleNo: selected.container_details?.vehicle_no || "",
        transporterDocNo: selected.tr_no || "",
      }));
      return;
    }

    // Full form mode
    setIsPartBOnly(false);
    setExistingEwbNo('');

    // ── Smart EWB Mode Defaults from import_export field ──────────────
    const importExport = (selected.import_export || '').toLowerCase().trim();
    let modeDefaults = {};
    let detectedMode = 'general';
    if (importExport === 'import') {
      detectedMode = 'import';
      modeDefaults = { supplyType: 'inward', subSupplyType: 'Import', documentType: 'Bill of Entry', transactionType: 1 };
    } else if (importExport === 'export') {
      detectedMode = 'export';
      modeDefaults = { supplyType: 'outward', subSupplyType: 'Export', documentType: 'Tax Invoice', transactionType: 1 };
    }
    setEwbMode(detectedMode);
    // ── End Mode Defaults ─────────────────────────────────────────────

    setFormData(prev => {
      const consignorState = normalizeState(selected.consignor?.branches?.[0]?.state || "");
      const consigneeState = normalizeState(selected.consignee?.branches?.[0]?.state || "");
      const consignorAddress = selected.consignor?.branches?.[0]?.address || "";
      const consignorCity = selected.consignor?.branches?.[0]?.city || "";
      const consignorPincode = selected.consignor?.branches?.[0]?.postalCode || "";
      const consigneeAddress = selected.consignee?.branches?.[0]?.address || "";
      const consigneeCity = selected.consignee?.branches?.[0]?.city || "";
      const consigneePincode = selected.consignee?.branches?.[0]?.postalCode || "";

      const res = {
        ...prev,
        ...modeDefaults,
        documentNumber: selected.pr_no || "",
        documentDate: (selected.pr_date && !isNaN(new Date(selected.pr_date).getTime()))
          ? new Date(selected.pr_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],

        consignorName: selected.consignor?.name || "",
        consignorGstin: selected.consignor?.gstin || "",
        consignorState: consignorState,
        consignorAddress1: consignorAddress,
        consignorCity: consignorCity,
        consignorPincode: consignorPincode,

        // Sync Dispatch From by default
        dispatchFromAddress1: consignorAddress,
        dispatchFromCity: consignorCity,
        dispatchFromPincode: consignorPincode,
        dispatchFromState: consignorState,

        consigneeName: selected.consignee?.name || "",
        consigneeGstin: selected.consignee?.gstin || "",
        consigneeState: consigneeState,
        consigneeAddress1: consigneeAddress,
        consigneeCity: consigneeCity,
        consigneePincode: consigneePincode,

        // Sync Ship To by default
        shipToAddress1: consigneeAddress,
        shipToCity: consigneeCity,
        shipToPincode: consigneePincode,
        shipToState: consigneeState,

        transporterDocNo: selected.tr_no || "",
        vehicleNo: selected.container_details?.vehicle_no || "",

        items: [{
          productName: "Goods",
          productDesc: selected.description || "Goods Description",
          hsnCode: "",
          quantity: 1,
          qtyUnit: "NOS",
          taxableAmount: prefilledAssessableValue && prefilledAssessableValue > 0 ? prefilledAssessableValue : "",
          cgstRate: 0,
          sgstRate: 0,
          igstRate: 0,
          cessRate: 0,
          cessNonAdvol: 0
        }],
        otherAmount: 0,
        totalInvoiceValue: prefilledAssessableValue && prefilledAssessableValue > 0 ? prefilledAssessableValue : ""
      };

      // Apply special rule: Suraj or Foreign Address
      if (
        res.consignorName.toLowerCase().includes("suraj") || 
        detectedMode === 'import' || 
        res.consignorState === "Other Countries" || 
        res.consignorState === "Other Territory"
      ) {
        res.consignorGstin = "URP";
        res.consignorPincode = "999999";
        res.dispatchFromPincode = "999999";
      }
      if (
        res.consigneeName.toLowerCase().includes("suraj") || 
        detectedMode === 'export' || 
        res.consigneeState === "Other Countries" || 
        res.consigneeState === "Other Territory"
      ) {
        res.consigneeGstin = "URP";
        res.consigneePincode = "999999";
        res.shipToPincode = "999999";
      }
      return res;
    });
  };

  const handleLrSelect = useCallback(async (lrId) => {
    if (!lrId) {
      setSelectedLr(null);
      setIsPartBOnly(false);
      setExistingEwbNo('');
      return;
    }

    const selected = lrList.find(lr => `${lr._id}-${lr.container_details._id}` === lrId);
    if (selected) {
      populateFormData(selected);
    }
  }, [lrList]);

  // Pre-select LR when used as Dialog and LR tab is active
  useEffect(() => {
    if (asDialog && activeTab === 'lr' && prefilledLrId && lrList.length > 0) {
       // Only preselect if not already selected
       if (selectedLrId !== prefilledLrId) {
           handleLrSelect(prefilledLrId);
       }
    }
  }, [asDialog, activeTab, prefilledLrId, lrList, selectedLrId, handleLrSelect]);

  // Deep-link from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lrId = params.get("lr");
    const containerIndex = params.get("containerIndex");

    if (lrId) {
      setLoading(true);
      axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/lr-details?lrId=${lrId}&containerIndex=${containerIndex}`)
        .then(response => {
          if (response.data.success && response.data.data) {
            populateFormData(response.data.data);
          }
        })
        .catch(err => {
          console.error("Failed to load LR details from URL", err);
          Swal.fire("Error", "Failed to load details for the selected LR", "error");
        })
        .finally(() => setLoading(false));
    }
  }, []);

  // ==========================================
  // BOE Tab: Fetch from external API
  // ==========================================

  const handleBoeSelect = (boeItem) => {
    if (!boeItem) {
      setSelectedBoe(null);
      setBoeNumber('');
      setBoeDate(new Date().toISOString().split('T')[0]);
      setBoeLrData(null);
      setPartADetails(null);
      setEwbMode('general'); // reset mode on BOE clear
      setIsPartBOnly(false);
      setExistingEwbNo('');
      return;
    }
    setSelectedBoe(boeItem);
    // document_no from PrData-based list
    const docNo = boeItem.document_no || boeItem.be_no || '';
    setBoeNumber(docNo);

    // Auto-populate date from PrData document_date
    let dateStr = boeItem.document_date || boeItem.be_date || '';
    if (dateStr && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        dateStr = `${parts[2].length === 2 ? '20' + parts[2] : parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    const resolvedDate = dateStr || new Date().toISOString().split('T')[0];
    setBoeDate(resolvedDate);

    // ✅ Step 3A: Immediately fetch internal LR data for auto-population
    fetchBoeLrData(docNo, resolvedDate);
  };

  const handleBoeFetch = async (manualDocNo = null, manualDocDate = null) => {
    const docToFetch = manualDocNo || boeNumber;
    const dateToFetch = manualDocDate || boeDate;

    if (!docToFetch) {
      Swal.fire({
        icon: 'warning',
        title: 'Input Required',
        text: 'Please enter or select a BOE (Document) Number',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000
      });
      setBoeError('');
      return;
    }

    try {
      setBoeLoading(true);
      setBoeError('');

      // ✅ Step 3B: Parallel fetch — internal LR data + external API
      const [lrResponse, boeResponse] = await Promise.allSettled([
        shouldSkipBoeLrDataFetch(docToFetch)
          ? Promise.resolve({ data: { success: false, data: null } })
          : axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-lr-data?document_no=${encodeURIComponent(docToFetch)}`),
        axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-extract?be_no=${encodeURIComponent(docToFetch)}&be_date=${dateToFetch}`),
      ]);

      // Process external API result — items/import details
      if (boeResponse.status === 'fulfilled') {
        const boeData = boeResponse.value.data;
        if (!boeData || boeData.status === 'error') {
          // Changed to warning toast as requested
          Swal.fire({
            icon: 'warning',
            title: 'BOE Details Not Found',
            text: 'No details found regarding this boe number so please fill details manually',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 6000
          });
          setBoeError(''); // Clear red error
          
          // Still populate from LR if available
          if (lrResponse.status === 'fulfilled' && lrResponse.value.data?.data) {
            populateFromBoe({}, lrResponse.value.data.data);
          }
        } else {
          // Keep the user on BOE tab after successful BOE data load
          setActiveTab('boe');
          // Merge: LR data (already set by Step 3A) + external API items
          populateFromBoe(boeData, lrResponse.status === 'fulfilled' ? lrResponse.value.data?.data : null);
        }
      } else {
        // External API failed — show yellow warning toast instead of red error
        Swal.fire({
          icon: 'warning',
          title: 'External API Unavailable',
          text: 'No details found regarding this boe number so please fill details manually',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 6000
        });
        setBoeError(''); // Clear red error
        
        // Still populate from LR if available
        if (lrResponse.status === 'fulfilled' && lrResponse.value.data?.data) {
          populateFromBoe({}, lrResponse.value.data.data);
        }
      }

    } catch (error) {
      console.error('BOE fetch error:', error);
      Swal.fire({
        icon: 'warning',
        title: 'Fetch Error',
        text: 'No details found regarding this boe number so please fill details manually',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 6000
      });
      setBoeError('');
    } finally {
      setBoeLoading(false);
    }
  };

  // Helper: Parse date from DD/MM/YYYY to YYYY-MM-DD
  const parseBoeDate = (dateStr) => {
    if (!dateStr || dateStr === '0') return new Date().toISOString().split('T')[0];
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const yr = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        return `${yr}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  const populateFromBoe = (record, lrData = null) => {
    setIsPartBOnly(false);
    setExistingEwbNo('');

    const cleanTransacting = (str) => {
      if (!str) return "";
      return String(str).replace(/\bTRANSACTING\b/ig, "").replace(/\s+/g, " ").trim();
    };

    // Extract nested data from actual API response
    const boeDetail = record.data || record;
    const importerDetails = boeDetail.ImporterDetails || {};
    const invoiceDetails = boeDetail.InvoiceAndItemDetails || {};
    const dutySummaryData = boeDetail.DutySummary || {};
    // Store duty summary in state so we can render it below items
    setDutySummary(Object.keys(dutySummaryData).length > 0 ? dutySummaryData : null);
    const dutySummary = dutySummaryData;
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

    // Priority for party data:
    // 1. lrData (internal LR DB) — most accurate, already in our system
    // 2. _prData from backend merge
    // 3. _directoryData from Organisation lookup
    // 4. Raw API address strings (fallback)
    const prDataMerge = record._prData || null;
    const directoryData = record._directoryData || {};

    const consignorSrc = lrData?.consignor || prDataMerge?.consignor || directoryData.consignor;
    const consigneeSrc = lrData?.consignee || prDataMerge?.consignee || directoryData.consignee;

    // Parse supplier and buyer from address strings using NLP backend data or fallback
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

    // Weight distribution logic
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
    // ===========================================

    setTotalValueFromBoe(calcTotalValue);
    setPerKgValue(calcPerKgValue);
    
    // Initialize container weights from selected containers (priority) or average
    const initialWeights = {};
    let totalSelectedWeight = 0;
    
    // First, initialize from selectedContainers (since these are the ones the user is actually managing/generating for!)
    if (selectedContainers && selectedContainers.length > 0) {
      selectedContainers.forEach((sc, idx) => {
        const scNo = (sc.container_number || sc.container_no || "").trim().toUpperCase();
        
        // Find matching container in BOE
        const originalIdx = containerDetails.findIndex(bc => {
          const bcNo = (bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "").trim().toUpperCase();
          return bcNo === scNo || (bcNo && scNo && bcNo.includes(scNo));
        });

        // Use the container's weight from shipment database if available, else average weight
        const weight = parseFloat(sc.container_gross_weight || sc.gross_weight || sc.grossWeight || sc.weight || weightPerCont || (totalGW / selectedContainers.length) || 0);
        
        if (originalIdx !== -1) {
          initialWeights[originalIdx] = weight;
        }
        // Always store under the manual key as well to ensure fallback lookup succeeds
        initialWeights[`manual_${scNo}`] = weight;
        totalSelectedWeight += weight;
      });
    }

    // Also populate any remaining BOE containers
    containerDetails.forEach((bc, idx) => {
      if (initialWeights[idx] === undefined) {
        initialWeights[idx] = weightPerCont;
      }
    });

    // If only one container is selected but it wasn't matched in BOE list, we still want its weight
    if (totalSelectedWeight === 0 && selectedContainers?.length === 1) {
      totalSelectedWeight = parseFloat(selectedContainers[0].container_gross_weight || selectedContainers[0].gross_weight || 0);
      const scNo = (selectedContainers[0].container_number || selectedContainers[0].container_no || "").trim().toUpperCase();
      initialWeights[`manual_${scNo}`] = totalSelectedWeight;
    }

    setContainerWeights(initialWeights);

    // Auto-fill Part A Document No and Date
    const docNoVal = boeDetail.BE_NO || boeDetail.document_no || boeNumber;
    let docDateVal = boeDetail.BE_DATE || boeDetail.document_date || boeDate;
    
    // Ensure BE date is in YYYY-MM-DD for the input[type=date]
    if (docDateVal) {
      docDateVal = parseBoeDate(docDateVal);
    }
    
    setFormData(f => ({
      ...f,
      documentNumber: docNoVal,
      documentDate: docDateVal
    }));

    // Map items from BOE ITEMS array (from external API)
    // igstRate uses the EFFECTIVE % derived from actual duty amounts (not raw item rate)
    const mappedItems = items.length > 0 ? items.map((item, idx) => {
      return {
        productName: item.DESCRIPTION || "Goods",
        productDesc: item.DESCRIPTION || "",
        hsnCode: getBoeItemHsnCode(item),
        quantity: parseFloat(item.QUANTITY) || 1,
        qtyUnit: item.UQC || "KGS",
        taxableAmount: item.AMOUNT || "",
        cgstRate: 0,
        sgstRate: 0,
        igstRate: effectiveIgstPercent,  // ← effective IGST% (proportional-safe)
        cessRate: 0,
        cessNonAdvol: 0
      };
    }) : [{ ...EMPTY_ITEM, igstRate: effectiveIgstPercent }];

    // ── Smart EWB Mode Defaults from import_export field ──────────────
    const importExport = (lrData?.import_export || prData?.import_export || 'import').toLowerCase().trim();
    let modeDefaults = {};
    let detectedMode = 'general';
    if (importExport === 'import' || importExport === 'inward') {
      detectedMode = 'import';
      modeDefaults = { supplyType: 'inward', subSupplyType: 'Import', documentType: 'Bill of Entry', transactionType: 1 };
    } else if (importExport === 'export' || importExport === 'outward') {
      detectedMode = 'export';
      modeDefaults = { supplyType: 'outward', subSupplyType: 'Export', documentType: 'Tax Invoice', transactionType: 1 };
    }
    // ── End Mode Defaults ─────────────────────────────────────────────
    setFormData(prev => {
      const isImport = (importExport === 'import' || importExport === 'inward');
      const consignorState = isImport ? "Other Country" : normalizeState(supplierState || consignorSrc?.branches?.[0]?.state || "");
      const consignorAddress = cleanTransacting(supplierCleanAddr || consignorSrc?.branches?.[0]?.address || "");
      const consignorCity = supplierCity || consignorSrc?.branches?.[0]?.city || "";
      const consignorPincode = isImport ? "999999" : (supplierPincode || consignorSrc?.branches?.[0]?.postalCode || "");

      const consigneeState = normalizeState(buyerState || consigneeSrc?.branches?.[0]?.state || "");
      const consigneeAddress = cleanTransacting(buyerCleanAddr || consigneeSrc?.branches?.[0]?.address || "");
      const consigneeCity = buyerCity || consigneeSrc?.branches?.[0]?.city || "";
      const consigneePincode = buyerPincode || consigneeSrc?.branches?.[0]?.postalCode || "";

      const res = {
        ...prev,
        ...modeDefaults,
        // BOE-specific defaults
        documentNumber: boeNumber || importerDetails['BE No'] || "",
        documentDate: parseBoeDate(boeDate || importerDetails['BE Date']),

        // Consignor — API data takes priority for BOE extraction
        consignorName: supplierName || consignorSrc?.name || "",
        consignorGstin: consignorSrc?.gstin || "",
        consignorState: consignorState,
        consignorAddress1: consignorAddress,
        consignorCity: consignorCity,
        consignorPincode: consignorPincode,

        // Sync Dispatch From by default
        dispatchFromAddress1: consignorAddress,
        dispatchFromCity: consignorCity,
        dispatchFromPincode: consignorPincode,
        dispatchFromState: consignorState,

        // Consignee — API data takes priority for BOE extraction
        consigneeName: buyerName || consigneeSrc?.name || "",
        consigneeGstin: consigneeSrc?.gstin || importerDetails['GSTIN/TYPE'] || "",
        consigneeState: consigneeState,
        consigneeAddress1: consigneeAddress,
        consigneeCity: consigneeCity,
        consigneePincode: consigneePincode,

        // Sync Ship To by default
        shipToAddress1: consigneeAddress,
        shipToCity: consigneeCity,
        shipToPincode: consigneePincode,
        shipToState: consigneeState,

        // Vehicle/Transport from LR if available
        vehicleNo: lrData?.container_details?.vehicle_no || prev.vehicleNo || "",
        transporterDocNo: lrData?.container_details?.tr_no || prev.transporterDocNo || "",

        // Items from external API (import line item details)
        items: mappedItems,

        totalInvoiceValue: totalSelectedWeight > 0 
          ? (totalSelectedWeight * calcPerKgValue).toFixed(2)
          : (calcTotalValue ? calcTotalValue.toFixed(2) : (dutySummary['TOT.ASS VAL'] || "")),
        transportDistance: isImport ? 0 : Math.min(parseInt(lrData?.transport_distance || lrData?.container_details?.transport_distance || prev.transportDistance || 0), 4000),
      };

      // If we have selected containers, update the first item with combined weight and calculated assessable value
      if (totalSelectedWeight > 0 && res.items && res.items.length > 0) {
        res.items[0].quantity = totalSelectedWeight;
        res.items[0].taxableAmount = (totalSelectedWeight * calcPerKgValue).toFixed(2);
      } else if (res.items && res.items.length > 0 && calcTotalValue > 0) {
        res.items[0].taxableAmount = calcTotalValue.toFixed(2);
        res.items[0].quantity = totalGW || res.items[0].quantity || 1;
      }

      // Apply prefilled assessable value if provided via props
      if (prefilledAssessableValue && prefilledAssessableValue > 0) {
        res.totalInvoiceValue = prefilledAssessableValue;
        // Distribute or assign to first item's taxable amount
        if (res.items && res.items.length > 0) {
           res.items[0].taxableAmount = prefilledAssessableValue;
        }
      }

      // Apply special rule: Suraj or Foreign Address
      if (
        res.consignorName.toLowerCase().includes("suraj") || 
        detectedMode === 'import' || 
        res.consignorState === "Other Countries" || 
        res.consignorState === "Other Territory"
      ) {
        res.consignorGstin = "URP";
        res.consignorPincode = "999999";
        res.dispatchFromPincode = "999999";
      }
      if (
        res.consigneeName.toLowerCase().includes("suraj") || 
        detectedMode === 'export' || 
        res.consigneeState === "Other Countries" || 
        res.consigneeState === "Other Territory"
      ) {
        res.consigneeGstin = "URP";
        res.consigneePincode = "999999";
        res.shipToPincode = "999999";
      }
      return res;
    });
  };

  // Auto-populate when boeData prop is provided (e.g. for Others E-Way Bill)
  useEffect(() => {
    if (boeData) {
      console.log("ℹ️ [Others EWB] Prefilling form from boeData prop:", boeData);
      populateFromBoe(boeData);
      
      // Prefill BOE number and date fields in UI
      const boeDetail = boeData.data || boeData;
      const invoiceDetails = boeDetail.InvoiceAndItemDetails || {};
      const docNo = invoiceDetails.BE_NO || invoiceDetails.document_no || boeData.documentNumber || "";
      if (docNo) {
        setBoeNumber(docNo);
      }
      
      const rawBoeDate = invoiceDetails.BE_DATE || invoiceDetails.document_date || "";
      if (rawBoeDate) {
        if (rawBoeDate.includes("/")) {
          const parts = rawBoeDate.split("/");
          if (parts.length === 3) {
            const formatted = `${parts[2].length === 2 ? "20" + parts[2] : parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            setBoeDate(formatted);
          }
        } else {
          setBoeDate(rawBoeDate);
        }
      }
    }
  }, [boeData]);

  // ==========================================
  // Excel Tab: Upload & Extract
  // ==========================================

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (['pdf'].includes(ext)) {
        setUploadedFile(file);
        setUploadError('');
        setUploadResults([]);
      } else {
        setUploadError("Only .pdf files are allowed");
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      setUploadError("Please select a file first");
      return;
    }

    try {
      setUploadLoading(true);
      setUploadError('');

      const formDataUpload = new FormData();
      formDataUpload.append('file', uploadedFile);

      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/eway-bill/boe-upload`,
        formDataUpload,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const data = response.data;
      
      let records = [];
      if (data.status === 'success' && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        // Handle { status: "success", data: { "filename.pdf": { ... } } }
        records = Object.values(data.data);
      } else {
        records = Array.isArray(data) ? data : (data.records || data.data || [data]);
      }

      if (records.length === 0) {
        setUploadError("No records found in the uploaded file");
        return;
      }

      // If the processed record indicates an error string
      if (records.length === 1 && records[0]?.error) {
        setUploadError(records[0].error);
        return;
      }

      if (records.length === 1) {
        populateFromBoe(records[0]); // same mapping as BOE
      } else {
        setUploadResults(records);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error.response?.data?.message || "Failed to upload file. Please try again.");
    } finally {
      setUploadLoading(false);
    }
  };

  const selectUploadRecord = (record) => {
    populateFromBoe(record);
    setUploadResults([]);
  };

  // ==========================================
  // Tab Switching
  // ==========================================

  const handleTabSwitch = (tab) => {
    if (boeOnly && tab !== 'boe') return;
    if (tab === activeTab) return;

    // Check if form has data
    const hasData = formData.documentNumber || formData.consignorName || formData.consigneeName ||
      formData.items.some(item => item.hsnCode || item.taxableAmount);

    if (hasData) {
      Swal.fire({
        title: 'Switch Tab?',
        text: 'Switching tabs will reset the current form data.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Switch',
        cancelButtonText: 'Stay',
        didOpen: () => {
          // Set z-index slightly higher than MUI Dialog (1300) to ensure proper stacking
          if (Swal.getContainer()) Swal.getContainer().style.zIndex = "1301";
        },
      }).then((result) => {
        if (result.isConfirmed) {
          performTabSwitch(tab);
        }
      });
    } else {
      performTabSwitch(tab);
    }
  };

  const performTabSwitch = (tab) => {
    setActiveTab(tab);
    handleReset();
    // Reset tab-specific state
    setSelectedBoe(null);
    setBoeNumber('');
    setBoeDate(new Date().toISOString().split('T')[0]);
    setBoeError('');
    setBoeLrData(null);
    setPartADetails(null);
    setEwbMode('general'); // reset mode on tab change
    setUploadedFile(null);
    setUploadResults([]);
    setUploadError('');
    setDutySummary(null);
  };

  // ==========================================
  // Form Handlers (existing, unchanged)
  // ==========================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    clearFieldError(name);

    setFormData(prev => {
      let newData = { ...prev, [name]: value };

      // ---- E-way Bill Rules Implementation ----

      // Rule: Logic between Supply Type and Sub Type
      if (name === "subSupplyType") {
        if (value === "Import") {
          newData.supplyType = "inward";
          newData.documentType = "Bill of Entry";
        } else if (value === "Export") {
          newData.supplyType = "outward";
          newData.documentType = "Tax Invoice";
        }
      }

      if (name === "supplyType") {
        if (value === "inward" && newData.subSupplyType === "Export") {
          newData.subSupplyType = "Supply";
        }
        if (value === "outward" && newData.subSupplyType === "Import") {
          newData.subSupplyType = "Supply";
        }
      }

      // Rule: URP consignor GSTIN → auto-set pincode to 999999
      if (name === "consignorGstin" && value.trim().toUpperCase() === "URP") {
        newData.consignorPincode = "999999";
        // also sync dispatch pincode if dispatch is synced with consignor
        const isDispatchSynced = newData.transactionType == 1 || newData.transactionType == 2;
        if (isDispatchSynced) {
          newData.dispatchFromPincode = "999999";
        }
      }

      // Rule: If consignor name contains "suraj", force URP and 999999 pincode
      if (name === "consignorName" && value.toLowerCase().includes("suraj")) {
        newData.consignorGstin = "URP";
        newData.consignorPincode = "999999";
        const isDispatchSynced = newData.transactionType == 1 || newData.transactionType == 2;
        if (isDispatchSynced) {
          newData.dispatchFromPincode = "999999";
        }
      }

      // Rule: Sync addresses based on Transaction Type
      const isDispatchSame = newData.transactionType == 1 || newData.transactionType == 2;
      const isShipSame = newData.transactionType == 1 || newData.transactionType == 3;

      // In the refined layout, dispatchFrom and shipTo are the primay input fields for address details.
      // So if "sycned", we mirror dispatch back to consignor, and shipTo back to consignee.
      if (isDispatchSame) {
        if (["dispatchFromAddress1", "dispatchFromCity", "dispatchFromPincode"].includes(name)) {
          const suffix = name.replace("dispatchFrom", "");
          newData[`consignor${suffix}`] = value;
        }
        // State is still driven from consignor in Bill From section
        if (name === "consignorState") {
          newData.dispatchFromState = value;
        }
      }

      if (isShipSame) {
        if (["shipToAddress1", "shipToCity", "shipToPincode"].includes(name)) {
          const suffix = name.replace("shipTo", "");
          newData[`consignee${suffix}`] = value;
        }
        // State is still driven from consignee in Bill To section
        if (name === "consigneeState") {
          newData.shipToState = value;
        }
      }

      // Update sync on transactionType change
      if (name === "transactionType") {
        const val = parseInt(value);
        if (val === 1 || val === 2) {
          // If switching to synced, align backing data
          newData.consignorAddress1 = newData.dispatchFromAddress1;
          newData.consignorCity = newData.dispatchFromCity;
          newData.consignorPincode = newData.dispatchFromPincode;
          newData.dispatchFromState = newData.consignorState;
        }
        if (val === 1 || val === 3) {
          newData.consigneeAddress1 = newData.shipToAddress1;
          newData.consigneeCity = newData.shipToCity;
          newData.consigneePincode = newData.shipToPincode;
          newData.shipToState = newData.consigneeState;
        }
      }

      // Rule: SEZ Consignor — auto-force state to OTHERS (Code 99) per EWB spec
      if (name === "consignorGstin") {
        if (isSezGstin(value)) {
          newData.consignorState = "Other Territory";
          newData.dispatchFromState = "Other Territory";
        }
      }

      // Rule: Ship (mode 4) → vehicle type must be ODC
      if (name === "transportationMode" && (value === "Ship" || value === "4")) {
        newData.vehicleType = "o"; // Force ODC
      }

      if (name === 'otherAmount') {

        const otherAmt = parseFloat(value) || 0;
        const itemsTotal = calculateItemsTotal(prev.items);
        newData.totalInvoiceValue = (itemsTotal + otherAmt).toFixed(2);
      }
      return newData;
    });
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    clearFieldError(`items[${index}].${name}`);

    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [name]: value };

      const otherAmt = parseFloat(prev.otherAmount) || 0;
      const itemsTotal = calculateItemsTotal(newItems);

      return {
        ...prev,
        items: newItems,
        totalInvoiceValue: (itemsTotal + otherAmt).toFixed(2)
      };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const otherAmt = parseFloat(prev.otherAmount) || 0;
      const itemsTotal = calculateItemsTotal(newItems);
      return {
        ...prev,
        items: newItems,
        totalInvoiceValue: (itemsTotal + otherAmt).toFixed(2)
      };
    });
  };

  const calculateItemsTotal = (items) => {
    return items.reduce((acc, item) => {
      const taxable = parseFloat(item.taxableAmount) || 0;
      const cgst = (taxable * (parseFloat(item.cgstRate) || 0)) / 100;
      const sgst = (taxable * (parseFloat(item.sgstRate) || 0)) / 100;
      const igst = (taxable * (parseFloat(item.igstRate) || 0)) / 100;
      const cess = (taxable * (parseFloat(item.cessRate) || 0)) / 100;
      const cessNonAdvol = parseFloat(item.cessNonAdvol) || 0;
      return acc + taxable + cgst + sgst + igst + cess + cessNonAdvol;
    }, 0);
  };

  const handleTransporterChange = (e) => {
    const value = e.target.value;
    const found = transporters.find(t => t.gstin === value || t.name === value);

    setFormData(prev => ({
      ...prev,
      transporterId: found ? found.gstin : value,
      transporterName: found ? found.name : prev.transporterName
    }));
  };

  const fetchDistance = async () => {
    const fromPincode = formData.dispatchFromPincode || formData.consignorPincode;
    const toPincode = formData.shipToPincode || formData.consigneePincode;

    if (!fromPincode || !toPincode) {
      Swal.fire("Info", "PIN codes not available for distance calculation", "info");
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/distance?fromPincode=${fromPincode}&toPincode=${toPincode}`
      );
      if (response.data.success && response.data.distance) {
        setFormData(prev => ({
          ...prev,
          transportDistance: response.data.distance
        }));
      } else {
        Swal.fire("Info", "Could not calculate distance automatically. Please enter manually.", "info");
      }
    } catch (error) {
      console.error("Error fetching distance:", error);
      Swal.fire("Error", "Failed to fetch distance", "error");
    }
  };

  // ==========================================
  // Submit Handlers (including multi-container)
  // ==========================================

  /**
   * submitMultipleEwayBills: SCENARIO 3 - Submit separate EWB per container (NEW)
   * Called when generationMode === "batch-selected"
   * Iterates through selectedContainers and generates proportional EWBs
   */
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
        
        const containerValue = {
          weight: weight,
          assessableValue: weight * perKgValue,
        };

        if (weight <= 0) {
          return {
            container: container.container_number,
            ewbNo: null,
            status: "failed",
            error: "Weight is zero or invalid. Please check container weights.",
          };
        }

        if (!perKgValue || perKgValue <= 0) {
          return {
            container: container.container_number,
            ewbNo: null,
            status: "failed",
            error: "Assessable value (Per KG) is not set. Please fetch BOE details first.",
          };
        }

        // Build container-specific payload
        const containerPayload = buildPayloadForContainer(container, containerValue);

        try {
          const response = await axios.post(
            `${process.env.REACT_APP_API_STRING}/eway-bill/generate`,
            containerPayload
          );

          if (response.data.success) {
            markBoeDocumentGenerated(formData.documentNumber || boeNumber);
            return {
              container: container.container_number,
              ewbNo: response.data.data.ewbNo,
              ewbDate: response.data.data.ewbDate,
              validUpto: response.data.data.validUpto,
              pdfUrl: response.data.data.pdfUrl,
              ewayBillId: response.data.data.ewayBillId,
              status: "success",
            };
          } else {
            let errorMsg = response.data.message || "Unknown error";
            if (response.data.errors && Array.isArray(response.data.errors) && response.data.errors.length > 0) {
              errorMsg = response.data.errors.map(e => `${e.field}: ${e.message}`).join(", ");
            } else if (response.data.validationErrors && Array.isArray(response.data.validationErrors) && response.data.validationErrors.length > 0) {
              errorMsg = response.data.validationErrors.map(e => e.message).join(", ");
            }

            return {
              container: container.container_number,
              ewbNo: null,
              status: "failed",
              error: errorMsg,
            };
          }
        } catch (err) {
          console.error(`Error generating EWB for container ${container.container_number}:`, err);
          const errorData = err.response?.data;
          let errorText = parseNicErrorMessage(errorData?.message || err.message);
          
          if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
            errorText = errorData.errors.map(e => e.message).join(", ");
          } else if (errorData?.validationErrors && Array.isArray(errorData.validationErrors) && errorData.validationErrors.length > 0) {
            errorText = errorData.validationErrors.map(e => e.message).join(", ");
          }

          return {
            container: container.container_number,
            ewbNo: null,
            status: "failed",
            error: errorText,
          };
        }
      });

      const results = await Promise.all(promises);

      // Show summary
      const successCount = results.filter((r) => r.status === "success").length;
      const failedCount = results.filter((r) => r.status === "failed").length;

      if (successCount > 0) {
        // Save generated E-Way Bills to DB at container level
        const successList = results.filter((r) => r.status === "success" && r.container && r.ewbNo);
        if (successList.length > 0) {
          await saveGeneratedEwayBillsToDb(successList);
        }

        const successHtml = results
          .filter((r) => r.status === "success")
          .map((r) => `<div><strong>${r.container}:</strong> ${r.ewbNo}</div>`)
          .join("");

        const failedHtml =
          failedCount > 0
            ? `<hr><h5>Failed (${failedCount}):</h5>` +
              results
                .filter((r) => r.status === "failed")
                .map((r) => `<div><strong>${r.container}:</strong> ${r.error}</div>`)
                .join("")
            : "";

        Swal.fire({
          icon: successCount === selectedContainers.length ? "success" : "warning",
          title: `${successCount}/${selectedContainers.length} E-Way Bills Generated`,
          html: `<div>${successHtml}${failedHtml}</div>`,
          confirmButtonText: "OK",
        }).then(() => {
          if (onSuccess) {
            onSuccess(results);
          }
          if (onClose) {
            onClose();
          }
        });
      } else {
        const failedHtml = results
          .map((r) => {
            const containerLabel = r.container ? String(r.container) : "Unknown container";
            const errorText = r.error ? String(r.error) : "Unknown error";
            return `<div><strong>${containerLabel}:</strong> ${errorText}</div>`;
          })
          .join("");

        Swal.fire({
          icon: "error",
          title: "All E-Way Bills Failed",
          html: failedHtml || "<div>No failure details available.</div>",
          confirmButtonText: "OK",
        });
      }
    } catch (err) {
      console.error("Error in submitMultipleEwayBills:", err);
      Swal.fire("Error", "Failed to generate E-Way Bills", "error");
    } finally {
      setGenerating(false);
    }
  };

  /**
   * buildPayloadForContainer: Helper to create container-specific EWB payload (NEW)
   */
  const buildPayloadForContainer = (container, containerValue) => {
    const lrId = prData?._id || (selectedLrId ? selectedLrId.split("-")[0] : null);
    const containerObj = selectedLr ? selectedLr.container_details : null;

    // Calculate taxes for this container's assessable value
    const taxable = containerValue.assessableValue;
    const cgst = parseFloat(
      ((taxable * parseFloat(formData.items[0]?.cgstRate || 0)) / 100).toFixed(2)
    );
    const sgst = parseFloat(
      ((taxable * parseFloat(formData.items[0]?.sgstRate || 0)) / 100).toFixed(2)
    );
    const igst = parseFloat(
      ((taxable * parseFloat(formData.items[0]?.igstRate || 0)) / 100).toFixed(2)
    );
    const cess = parseFloat(
      ((taxable * parseFloat(formData.items[0]?.cessRate || 0)) / 100).toFixed(2)
    );

    const cessNonAdvol = parseFloat(formData.items[0]?.cessNonAdvol || 0);
    const otherAmount = parseFloat(formData.otherAmount) || 0;

    // Total Invoice Value = Taxable + Taxes + Other
    const totalInvoiceValue = parseFloat(
      (taxable + cgst + sgst + igst + cess + cessNonAdvol + otherAmount).toFixed(2)
    );

    const itemsPayload = [
      {
        ...(formData.items[0] || {}),
        taxableAmount: taxable,
        cgstRate: parseFloat(formData.items[0]?.cgstRate || 0),
        sgstRate: parseFloat(formData.items[0]?.sgstRate || 0),
        igstRate: parseFloat(formData.items[0]?.igstRate || 0),
        cessRate: parseFloat(formData.items[0]?.cessRate || 0),
        cessNonAdvol: cessNonAdvol,
        quantity: containerValue.weight,
      },
    ];

    return {
      lrId: lrId,
      containerId: container?._id || containerObj?._id,
      formData: {
        ...formData,
        documentType: generationMode === "batch-selected" ? "Delivery Challan" : (formData.documentType || "Bill of Entry"),
        documentNumber: generationMode === "batch-selected" 
          ? `${(formData.documentNumber || boeNumber || "").trim()}-CH-${(container.container_number || container.container_no || "").trim().toUpperCase().slice(-4)}` 
          : (formData.documentNumber || boeNumber),
        totalInvoiceValue: totalInvoiceValue,
        taxableAmount: taxable,
        calculatedAssessableValue: containerValue.assessableValue,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        cessAmount: cess,
        cessNonAdvol: cessNonAdvol,
        otherAmount: otherAmount,
        transporterId: formData.transporterId || undefined,
        generatorRole:
          formData.supplyType === "inward" ? "consignee" : "consignor",
        userGstin:
          (formData.supplyType === "inward"
            ? formData.consigneeGstin
            : formData.consignorGstin) === "URP"
            ? process.env.REACT_APP_DEFAULT_GSTIN || ""
            : formData.supplyType === "inward"
            ? formData.consigneeGstin
            : formData.consignorGstin,
        items: itemsPayload,
        data_source: "lrEwbUpdate", // For analytics
      },
    };
  };

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
    if (key === 'OTHER COUNTRY' || key === 'FOREIGN' || key === 'INTERNATIONAL') {
      return STATE_NAME_TO_CODE['OTHER TERRITORY'];
    }
    return STATE_NAME_TO_CODE[key] || stateName;
  };

  const normalizeVehicleUpdateReasonCode = (code) => {
    if (!code) return "1"; // default to breakdown fallback
    const normalized = String(code).trim().toLowerCase().replace(/\s+/g, '');
    switch (normalized) {
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

  const saveGeneratedEwayBillsToDb = async (successResults) => {
    if (!jobId || !successResults || successResults.length === 0) {
      return;
    }

    try {
      const updates = successResults.map(item => ({
        container_no: item.container,
        ewaybill_no: String(item.ewbNo)
      }));

      console.log("Saving E-Way Bill numbers to containers in DB...", updates);
      
      let extraHeaders = {};
      try {
        const userStr = localStorage.getItem("exim_user") || "{}";
        const user = JSON.parse(userStr);
        extraHeaders = {
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };
      } catch (e) {
        // ignore
      }

      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/jobs/container-ewaybill/${jobId}`,
        { updates },
        { headers: extraHeaders }
      );
      console.log("Successfully saved generated E-Way Bill numbers to containers in MongoDB.");
    } catch (err) {
      console.error("Error saving generated E-Way Bill numbers to MongoDB:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFieldErrors({});

    // ---- Multi-container batch submission (NEW - Scenario 3) ----
    if (isMultiContainerMode && generationMode === "batch-selected" && selectedContainers.length > 0) {
      // Submit separate EWB for each selected container
      await submitMultipleEwayBills();
      return;
    }

    // ---- Part B Only: Update Vehicle ----
    if (isPartBOnly) {
      const effectiveFromState = getStateCode(formData.dispatchFromState || formData.consignorState || "");
      const hasReasonCode = Boolean(formData.reasonCode);

      const partBFieldErrors = {};
      if (!formData.vehicleNo) {
        partBFieldErrors.vehicleNo = "Vehicle number is required for Part B update";
      } else {
        const vnErr = validateVehicleFormat(formData.vehicleNo);
        if (vnErr) partBFieldErrors.vehicleNo = vnErr;
      }
      if (!effectiveFromState) partBFieldErrors.fromState = "From state is required and should be a valid state name/code";
      if (!hasReasonCode) partBFieldErrors.reasonCode = "Reason for vehicle update is required";

      if (Object.keys(partBFieldErrors).length > 0) {
        setFieldErrors(partBFieldErrors);
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Please correct the highlighted fields.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      try {
        setGenerating(true);

        const effectiveFromState = getStateCode(formData.dispatchFromState || formData.consignorState || "");
        const effectiveReasonCode = normalizeVehicleUpdateReasonCode(formData.reasonCode || "duetobreakdown");

        const payload = {
          ewayBillNo: String(existingEwbNo),
          vehicleNo: formData.vehicleNo,
          vehicleType: formData.vehicleType === "ODC" ? "o" : "r",
          fromPlace: formData.dispatchFromCity || formData.consignorCity || "",
          fromState: effectiveFromState || "",
          stateOfConsignor: effectiveFromState || "",
          reasonCode: effectiveReasonCode,
          reason_code_for_vehicle_updation: effectiveReasonCode,
          reasonText: formData.reasonText || "",
          transporterDocNo: formData.transporterDocNo || "",
          transporterDocDate: formData.transporterDocDate || "",
          modeOfTransport: formData.transportationMode === "Road" ? 1 : 
                           formData.transportationMode === "Rail" ? 2 :
                           formData.transportationMode === "Air" ? 3 : 4,
          userGstin: formData.userGstin || (formData.supplyType === 'inward' ? formData.consigneeGstin : formData.consignorGstin),
        };

        const response = await axios.post(
          `${process.env.REACT_APP_API_STRING}/eway-bill/update-vehicle`,
          payload
        );

        if (response.data.success) {
          Swal.fire({
            icon: "success",
            title: "Part B Updated",
            html: `<p><strong>EWB:</strong> ${existingEwbNo}</p><p><strong>Vehicle:</strong> ${formData.vehicleNo}</p>`,
          });
          setSuccess({
            ewbNo: existingEwbNo,
            ewbDate: response.data.data?.ewbDate || "",
            validUpto: response.data.data?.validUpto || "",
          });
        }
      } catch (error) {
        console.error("Part B update error:", error);
        let msg = "Failed to update Part B";
        if (error.response?.data?.message) {
           msg = parseNicErrorMessage(error.response.data.message);
           setFieldErrors(prev => ({ ...prev, ...mapEwbApiErrorToFields(typeof error.response.data.message === 'string' ? error.response.data.message : JSON.stringify(error.response.data.message)) }));
        }
        Swal.fire("Error", msg, "error");
      } finally {
        setGenerating(false);
      }
      return;
    }

    // ---- Full Generate Flow ----
    // ✅ No LR (tr_no) check needed here.
    // Part A or Part B can both be generated without a system LR record.
    // Transporter Doc No is manually entered in the form and is optional per the API.

    let hasError = false;
    const newFieldErrors = {};

    // Basic Header Validation
    if (!formData.documentNumber) {
      newFieldErrors.documentNumber = "Document number is required";
      hasError = true;
    }
    if (!formData.documentDate) {
      newFieldErrors.documentDate = "Document date is required";
      hasError = true;
    }

    // Consignor Validation
    if (!formData.consignorName) {
      newFieldErrors.consignorName = "Consignor name is required";
      hasError = true;
    }
    if (!formData.consignorGstin) {
      newFieldErrors.consignorGstin = "Consignor GSTIN/URP is required";
      hasError = true;
    }
    if (!formData.consignorState) {
      newFieldErrors.consignorState = "Consignor state is required";
      hasError = true;
    }
    // (Consignor detailed address removed from UI, so we don't validate them)

    // Consignee Validation
    if (!formData.consigneeName) {
      newFieldErrors.consigneeName = "Consignee name is required";
      hasError = true;
    }
    if (!formData.consigneeGstin) {
      newFieldErrors.consigneeGstin = "Consignee GSTIN/URP is required";
      hasError = true;
    }
    if (!formData.consigneeState) {
      newFieldErrors.consigneeState = "Consignee state is required";
      hasError = true;
    }
    // (Consignee detailed address removed from UI, so we don't validate them)

    // Dispatch From Validation
    if (!formData.dispatchFromAddress1) {
      newFieldErrors.dispatchFromAddress1 = "Address is required";
      hasError = true;
    }
    if (!formData.dispatchFromCity) {
      newFieldErrors.dispatchFromCity = "City/Place is required";
      hasError = true;
    }
    if (!formData.dispatchFromPincode) {
      newFieldErrors.dispatchFromPincode = "Pincode is required";
      hasError = true;
    }

    // Ship To Validation
    if (!formData.shipToAddress1) {
      newFieldErrors.shipToAddress1 = "Address is required";
      hasError = true;
    }
    if (!formData.shipToCity) {
      newFieldErrors.shipToCity = "City/Place is required";
      hasError = true;
    }
    if (!formData.shipToPincode) {
      newFieldErrors.shipToPincode = "Pincode is required";
      hasError = true;
    }

    // Item Validation
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.hsnCode) {
        newFieldErrors[`items[${i}].hsnCode`] = "HSN Code is required";
        hasError = true;
      }
      if (!item.taxableAmount || parseFloat(item.taxableAmount) <= 0) {
        newFieldErrors[`items[${i}].taxableAmount`] = "Valid Taxable Amount is required";
        hasError = true;
      }
    }

    if (hasError) {
      setFieldErrors(newFieldErrors);
      Swal.fire({
        icon: 'error',
        title: 'Validation Failed',
        text: 'Please correct the errors highlighted in the form.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      return;
    }

    // ─── Client-side EWB regulatory validations ────────────────────────────
    const clientValidation = runClientSideValidations(formData, 0 /* autoKm not available client-side */);
    if (!clientValidation.valid) {
      const clientErrors = {};
      clientValidation.errors.forEach(err => {
        clientErrors[err.field] = err.message;
      });
      setFieldErrors(prev => ({ ...prev, ...clientErrors }));
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: clientValidation.errors[0]?.message || 'Please fix the highlighted fields.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000
      });
      return;
    }
    // ───────────────────────────────────────────────────────────────────────

    const isInterState = formData.consignorState?.toLowerCase() !== formData.consigneeState?.toLowerCase();

    for (const item of formData.items) {
      if (isInterState && (parseFloat(item.cgstRate) > 0 || parseFloat(item.sgstRate) > 0)) {
        console.warn("Possible tax mismatch: Inter-state detected but CGST/SGST present.");
      }
      if (!isInterState && (parseFloat(item.igstRate) > 0)) {
        console.warn("Possible tax mismatch: Intra-state detected but IGST present.");
      }
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

        cgstTotal += cgst;
        sgstTotal += sgst;
        igstTotal += igst;
        cessTotal += cess;
        taxableTotal += taxable;

        return {
          ...item,
          taxableAmount: taxable,
          cgstRate: parseFloat(item.cgstRate) || 0,
          sgstRate: parseFloat(item.sgstRate) || 0,
          igstRate: parseFloat(item.igstRate) || 0,
          cessRate: parseFloat(item.cessRate) || 0,
          cessNonAdvol: parseFloat(item.cessNonAdvol) || 0
        };
      });

      const payload = {
        lrId: lrId,
        containerId: contId,
        formData: {
          ...formData,
          totalInvoiceValue: parseFloat(formData.totalInvoiceValue) || 0,
          taxableAmount: taxableTotal,
          cgstAmount: cgstTotal,
          sgstAmount: sgstTotal,
          igstAmount: igstTotal,
          cessAmount: cessTotal,
          cessNonAdvol: formData.items.reduce((acc, item) => acc + (parseFloat(item.cessNonAdvol) || 0), 0),
          otherAmount: parseFloat(formData.otherAmount) || 0,
          transporterId: formData.transporterId || undefined,
          generatorRole: formData.supplyType === 'inward' ? 'consignee' : 'consignor',
          userGstin:
            (formData.supplyType === "inward"
              ? formData.consigneeGstin
              : formData.consignorGstin) === "URP"
              ? process.env.REACT_APP_DEFAULT_GSTIN || ""
              : formData.supplyType === "inward"
              ? formData.consigneeGstin
              : formData.consignorGstin,
          items: itemsPayload,
          // NEW: Multi-container metadata for analytics & tracking
          ...(isMultiContainerMode && {
            data_source: "lrEwbUpdate",
            containerSelectionMode: containerSelectionMode,
            selectedContainerCount: selectedContainers.length,
            containerIds: selectedContainers.map(c => c._id || c.container_number),
          }),
        }
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/eway-bill/generate`,
        payload
      );

      if (response.data.success) {
        markBoeDocumentGenerated(formData.documentNumber || boeNumber);
        setSuccess(response.data.data);

        // Save E-Way Bill to database at container level
        const ewbNo = response.data.data.ewbNo;
        if (ewbNo && selectedContainers && selectedContainers.length > 0) {
          const successList = selectedContainers.map(c => ({
            container: c.container_number || c.container_no,
            ewbNo: ewbNo
          })).filter(item => item.container && item.ewbNo);

          if (successList.length > 0) {
            await saveGeneratedEwayBillsToDb(successList);
          }
        }

        if (onSuccess) {
          onSuccess(response.data.data);
        }
        Swal.fire({
          icon: "success",
          title: "E-Way Bill Generated",
          html: `
            <p><strong>EWB No:</strong> ${response.data.data.ewbNo}</p>
            <p><strong>Valid Until:</strong> ${response.data.data.validUpto}</p>
          `,
        });
      }
    } catch (error) {
      console.error("Error generating E-Way Bill:", error);

      if (error.response?.data?.validationErrors && error.response.data.validationErrors.length > 0) {
        const errors = {};
        error.response.data.validationErrors.forEach(err => {
          errors[err.field] = err.message;
        });
        setFieldErrors(errors);

        const firstValidationMessage = error.response.data.validationErrors[0]?.message
          || error.response?.data?.message
          || "Some fields have invalid values as per GST rules. Please check highlighted fields.";

        Swal.fire({
          icon: "error",
          title: "API Validation Error",
          text: firstValidationMessage,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 5000
        });
      } else {
        const rawMsg = error.response?.data?.message || "";
        const errorMsg = parseNicErrorMessage(rawMsg);
        
        const rawMsgString = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
        setFieldErrors(prev => ({ ...prev, ...mapEwbApiErrorToFields(rawMsgString) }));

        Swal.fire({
          icon: "error",
          title: "API Error",
          text: errorMsg,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 8000
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleExtendValidity = async (e) => {
    if (e) e.preventDefault();
    try {
      setGenerating(true);
      const payload = {
        ewayBillNo: existingEwbNo,
        vehicleNo: formData.vehicleNo,
        currentPlace: formData.dispatchFromCity || formData.consignorCity,
        currentState: formData.dispatchFromState || formData.consignorState,
        currentPincode: formData.dispatchFromPincode || formData.consignorPincode,
        remainingDistance: formData.transportDistance,
        reason: formData.reasonCode || "99",
        remarks: formData.reasonText || "Traffic Delay",
        modeOfTransport: formData.transportationMode === "Road" ? 1 : 
                         formData.transportationMode === "Rail" ? 2 :
                         formData.transportationMode === "Air" ? 3 : 
                         formData.transportationMode === "Ship" ? 4 : 5,
        consignmentStatus: formData.consignmentStatus || "M",
        transitType: formData.transitType || "R",
        address1: formData.dispatchFromAddress1 || formData.consignorAddress1,
        address2: formData.consignorAddress2 || "",
        address3: "",
        userGstin: formData.userGstin || (formData.supplyType === 'inward' ? formData.consigneeGstin : formData.consignorGstin),
      };
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/extend-validity`, payload);
      if (response.data.success) {
        Swal.fire("Success", "Validity Extended", "success");
        setSuccess(response.data.data);
        if (onSuccess) onSuccess(response.data.data);
      }
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || err.message, "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleInitiateMultiVehicle = async (e) => {
    if (e) e.preventDefault();
    try {
      setGenerating(true);
      const payload = {
        ewayBillNo: existingEwbNo,
        totalQuantity: formData.totalQuantity,
        unitCode: formData.unitCode || "NOS",
        placeOfConsignor: formData.consignorCity,
        stateOfConsignor: formData.consignorState,
        placeOfConsignee: formData.consigneeCity,
        stateOfConsignee: formData.consigneeState,
        reasonCode: "due to break down",
        modeOfTransport: formData.transportationMode === "Road" ? 1 : 2,
        userGstin: formData.userGstin || (formData.supplyType === 'inward' ? formData.consigneeGstin : formData.consignorGstin),
      };
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/initiate`, payload);
      if (response.data.success) {
        Swal.fire("Success", "Multi-Vehicle Initiated", "success");
        fetchMvData();
      }
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || err.message, "error");
    } finally {
      setGenerating(false);
    }
  };

  const fetchMvData = async () => {
    if (!existingEwbNo) return;
    try {
      setMvLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/${existingEwbNo}`);
      if (res.data.success) setMvData(res.data.data);
    } catch (err) {
      console.error("Error fetching multi-vehicle data:", err);
    } finally {
      setMvLoading(false);
    }
  };

  const handleAddVehicleToGroup = async (e) => {
    if (e) e.preventDefault();
    try {
      setGenerating(true);
      const payload = {
        ewayBillNo: existingEwbNo,
        groupNo: mvData?.multiVehicleGroup?.groupNo,
        userGstin: formData.userGstin || (formData.supplyType === 'inward' ? formData.consigneeGstin : formData.consignorGstin),
        ...addVehicleForm,
      };
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/add-vehicle`, payload);
      if (response.data.success) {
        Swal.fire("Success", "Vehicle added to group", "success");
        setShowAddVehicleForm(false);
        fetchMvData();
      }
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || err.message, "error");
    } finally {
      setGenerating(false);
    }
  };

  // handleTabSwitch moved to line 935

  const handleReset = () => {
    setSelectedLrId("");
    setSelectedLr(null);
    setSuccess(null);
    setIsPartBOnly(false);
    setExistingEwbNo('');
    setFieldErrors({});
    setFormData({ ...DEFAULT_FORM, items: [{ ...EMPTY_ITEM }] });
  };

  // ==========================================
  // Render
  // ==========================================

  const renderUpdatePartB = () => (
    <div className="form-section">
      <h3 className="blue-dot">Vehicle & Transport Details (Part B Update)</h3>
      <div className="section-body">
         <div className="form-row three-cols">
            <div className="form-group">
                <label className="form-label required">Vehicle Number</label>
                <input type="text" className={getInputClass("vehicleNo")} name="vehicleNo" value={formData.vehicleNo} onChange={handleInputChange} placeholder="e.g. MH01AB1234" />
                {renderFieldError("vehicleNo")}
            </div>
            <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <select className="form-select" name="vehicleType" value={formData.vehicleType} onChange={handleInputChange}>
                    <option value="Regular">Regular</option>
                    <option value="ODC">ODC (Over Dimensional Cargo)</option>
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">Mode of Transport</label>
                <select className="form-select" name="transportationMode" value={formData.transportationMode} onChange={handleInputChange}>
                    <option value="Road">Road (1)</option>
                    <option value="Rail">Rail (2)</option>
                    <option value="Air">Air (3)</option>
                    <option value="Ship">Ship (4)</option>
                </select>
            </div>
         </div>

         <div className="form-row three-cols">
            <div className="form-group">
                <label className="form-label required">From Place</label>
                <input type="text" className={getInputClass("consignorCity")} name="consignorCity" value={formData.consignorCity || formData.dispatchFromCity} onChange={handleInputChange} placeholder="Origin City" />
            </div>
            <div className="form-group">
                <label className="form-label required">From State</label>
                <input type="text" list="states" className={getInputClass("consignorState")} name="consignorState" value={formData.consignorState || formData.dispatchFromState} onChange={handleInputChange} placeholder="Origin State" />
            </div>
            <div className="form-group">
                <label className="form-label required">User GSTIN</label>
                <input type="text" className={getInputClass("userGstin")} name="userGstin" value={formData.userGstin || (formData.supplyType === 'inward' ? formData.consigneeGstin : formData.consignorGstin)} onChange={handleInputChange} placeholder="Your GSTIN" />
                <span style={{fontSize: '0.7rem', color: '#64748b'}}>Transporter ID = User GSTIN</span>
            </div>
         </div>

         <div className="form-row two-cols">
            <div className="form-group">
                <label className="form-label">Reason for Update</label>
                <select className="form-select" name="reasonCode" value={formData.reasonCode} onChange={handleInputChange}>
                    <option value="duetobreakdown">Due to breakdown</option>
                    <option value="transshipment">Transshipment</option>
                    <option value="others">Others</option>
                    <option value="firstTimePartB">First time Part B update</option>
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">Remarks</label>
                <input type="text" className="form-input" name="reasonText" value={formData.reasonText} onChange={handleInputChange} placeholder="Additional info (optional)" />
            </div>
         </div>

         <div className="form-row two-cols">
            <div className="form-group">
                <label className="form-label">Transporter Doc No</label>
                <input type="text" className="form-input" name="transporterDocNo" value={formData.transporterDocNo} onChange={handleInputChange} placeholder="GR/LR Number" />
            </div>
            <div className="form-group">
                <label className="form-label">Transporter Doc Date</label>
                <input type="date" className="form-input" name="transporterDocDate" value={formData.transporterDocDate} onChange={handleInputChange} />
            </div>
         </div>
      </div>
      <div className="form-actions" style={{ marginTop: 20 }}>
          <button type="submit" className="btn btn-primary" disabled={generating}>
              {generating ? <span className="loading-spinner"></span> : "Update Part B"}
          </button>
      </div>
    </div>
  );

  const renderExtendValidity = () => (
    <div className="form-section">
      <h3 className="amber-dot">Extend Validity</h3>
      <div className="section-body">
        <div className="banner info" style={{ marginBottom: 16 }}>
            Extension can only be done within 8 hours before/after expiry.
        </div>
        <div className="form-row three-cols">
            <div className="form-group">
                <label className="form-label required">Current Place</label>
                <input type="text" className="form-input" name="dispatchFromCity" value={formData.dispatchFromCity || formData.consignorCity} onChange={handleInputChange} />
            </div>
            <div className="form-group">
                <label className="form-label required">Current State</label>
                <input type="text" list="states" className="form-input" name="dispatchFromState" value={formData.dispatchFromState || formData.consignorState} onChange={handleInputChange} />
            </div>
            <div className="form-group">
                <label className="form-label required">Remaining Distance</label>
                <input type="number" className="form-input" name="transportDistance" value={formData.transportDistance} onChange={handleInputChange} placeholder="Kms" />
            </div>
        </div>
        <div className="form-row two-cols">
            <div className="form-group">
                <label className="form-label">Reason for Extension</label>
                <select className="form-select" name="reasonCode" value={formData.reasonCode} onChange={handleInputChange}>
                    <option value="Natural Calamity">Natural Calamity</option>
                    <option value="Transshipment">Transshipment</option>
                    <option value="Accident">Accident</option>
                    <option value="Others">Others</option>
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">Remarks</label>
                <input type="text" className="form-input" name="reasonText" value={formData.reasonText} onChange={handleInputChange} placeholder="Brief explanation" />
            </div>
        </div>
      </div>
      <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={handleExtendValidity} disabled={generating}>
              {generating ? "Extending..." : "Confirm Extension"}
          </button>
      </div>
    </div>
  );

  const renderMultiVehicle = () => (
    <div className="form-section">
      <h3 className="purple-dot">Multi-Vehicle Management</h3>
      <div className="section-body">
         {!mvData ? (
           <div style={{ textAlign: 'center', padding: 20 }}>
             <p>This E-Way Bill is not yet initiated for multi-vehicle shipment.</p>
             <div className="form-row two-cols" style={{ justifyContent: 'center', maxWidth: 500, margin: '0 auto' }}>
                <div className="form-group">
                    <label className="form-label">Total Quantity</label>
                    <input type="number" className="form-input" name="totalQuantity" value={formData.totalQuantity} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label className="form-label">Unit</label>
                    <input type="text" className="form-input" name="unitCode" value={formData.unitCode} onChange={handleInputChange} placeholder="e.g. NOS" />
                </div>
             </div>
             <button type="button" className="btn btn-primary" onClick={handleInitiateMultiVehicle} disabled={generating}>
                {generating ? "Initiating..." : "Initiate Multi-Vehicle"}
             </button>
           </div>
         ) : (
           <div className="mv-management">
              <div className="alert-info" style={{ marginBottom: 16 }}>
                <strong>Group No:</strong> {mvData.multiVehicleGroup?.groupNo} | 
                <strong> Total Qty:</strong> {mvData.multiVehicleGroup?.totalQuantity} {mvData.multiVehicleGroup?.unitCode}
              </div>
              
              <table className="eway-table">
                <thead>
                  <tr>
                    <th>Vehicle No</th>
                    <th>Doc No</th>
                    <th>Qty</th>
                    <th>Date</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {mvData.vehicles?.map((v, i) => (
                    <tr key={i}>
                      <td>{v.vehicleNo}</td>
                      <td>{v.transporterDocNo}</td>
                      <td>{v.quantity}</td>
                      <td>{v.transporterDocDate}</td>
                      <td>{v.modeOfTransport == 1 ? "Road" : "Rail"}</td>
                    </tr>
                  ))}
                  {(!mvData.vehicles || mvData.vehicles.length === 0) && (
                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>No vehicles added to group yet.</td></tr>
                  )}
                </tbody>
              </table>

              {!showAddVehicleForm ? (
                <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setShowAddVehicleForm(true)}>+ Add Vehicle to Group</button>
              ) : (
                <div style={{ marginTop: 24, padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <h4>Add New Vehicle to Group</h4>
                  <div className="form-row three-cols">
                    <div className="form-group">
                      <label className="form-label">Vehicle No</label>
                      <input type="text" className="form-input" value={addVehicleForm.vehicleNumber} onChange={e => setAddVehicleForm({...addVehicleForm, vehicleNumber: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quantity</label>
                      <input type="number" className="form-input" value={addVehicleForm.quantity} onChange={e => setAddVehicleForm({...addVehicleForm, quantity: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Doc No (GR No)</label>
                      <input type="text" className="form-input" value={addVehicleForm.transporterDocNo} onChange={e => setAddVehicleForm({...addVehicleForm, transporterDocNo: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-actions" style={{ justifyContent: 'flex-start', gap: 12 }}>
                    <button type="button" className="btn btn-primary" onClick={handleAddVehicleToGroup} disabled={generating}>Add Vehicle</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowAddVehicleForm(false)}>Cancel</button>
                  </div>
                </div>
              )}
           </div>
         )}
      </div>
    </div>
  );

  const container = selectedLr?.container_details;

  return (
    <div className={`ewaybill-container ${asDialog ? 'as-dialog' : ''}`} style={asDialog ? { padding: '10px 0', margin: 0, boxShadow: 'none' } : {}}>
      {!asDialog && (
        <div className="ewaybill-header">
          <h2>Generate E-Way Bill</h2>
        </div>
      )}
      {asDialog && (
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 20px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Generate E-Way Bill</h2>
            {onClose && (
               <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            )}
         </div>
      )}

      {success ? (
        <div className="success-card">
          <h3>✓ E-Way Bill {isPartBOnly ? "Part B Updated" : "Generated"} Successfully</h3>
          <div className="ewb-number">{success.ewbNo}</div>
          <div className="ewb-details">
            <p>Date: {success.ewbDate}</p>
            <p>Valid Until: {success.validUpto}</p>
          </div>
          <div className="form-actions" style={{ justifyContent: "center" }}>
            {success.pdfUrl && (
              <a
                href={`${success.pdfUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Download PDF
              </a>
            )}
            <button className="btn btn-secondary" onClick={handleReset}>
              Generate Another
            </button>
          </div>
        </div>
      ) : (
          <form className="ewaybill-form" onSubmit={handleSubmit}>

          {/* ===== CALCULATED VALUE BANNER (Multi-Container Individual Mode) ===== */}
          {isMultiContainerMode && generationMode === 'batch-selected' && selectedContainers && selectedContainers.length === 1 && containerAssessableValues[selectedContainers[0]._id] && (
            <div className="form-section" style={{ borderLeft: '4px solid #10b981', backgroundColor: '#ecfdf5', marginBottom: '1.5rem', padding: '12px 20px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.2rem', color: '#10b981' }}>✓</span>
                <h3 style={{ margin: 0, color: '#047857', fontSize: '1.05rem', fontWeight: '600' }}>
                  Calculated Assessable Value for this Container: ₹{containerAssessableValues[selectedContainers[0]._id].assessableValue.toLocaleString()}
                </h3>
              </div>
              <p style={{ margin: '4px 0 0 28px', color: '#065f46', fontSize: '0.85rem' }}>
                Formula Breakdown: (₹{containerAssessableValues[selectedContainers[0]._id].perKgValue?.toFixed(2) || (containerAssessableValues[selectedContainers[0]._id].assessableValue / containerAssessableValues[selectedContainers[0]._id].weight).toFixed(2)}/kg × {containerAssessableValues[selectedContainers[0]._id].weight} kg = ₹{containerAssessableValues[selectedContainers[0]._id].assessableValue})
              </p>
              <p style={{ margin: '4px 0 0 28px', color: '#6b7280', fontSize: '0.75rem', fontStyle: 'italic' }}>
                *This value has been pre-filled in the Taxable Amount and Total Invoice Value fields below.
              </p>
            </div>
          )}

          {/* ===== Tab Switcher ===== */}
          {/* ===== Tab Switcher (Generate or Action) ===== */}
          {!hideTabs && (
            <div className="form-section">
              <h3 className="green-dot">{isPartBOnly ? "Manage E-Way Bill" : "Auto-fill Details"}</h3>
              <div className="section-body">
                <div className="ewb-tabs">
                  {!isPartBOnly ? (
                    <>
                      <button
                        type="button"
                        className={`ewb-tab ${activeTab === 'boe' ? 'active' : ''}`}
                        onClick={() => handleTabSwitch('boe')}
                      >
                        Bill of Entry
                      </button>
                      {!boeOnly && (
                        <button
                          type="button"
                          className={`ewb-tab ${activeTab === 'excel' ? 'active' : ''}`}
                          onClick={() => handleTabSwitch('excel')}
                        >
                          Upload PDF
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`ewb-tab ${actionTab === 'update' ? 'active' : ''}`}
                        onClick={() => setActionTab('update')}
                      >
                        Update (Part B)
                      </button>
                      <button
                        type="button"
                        className={`ewb-tab ${actionTab === 'extend' ? 'active' : ''}`}
                        onClick={() => setActionTab('extend')}
                      >
                        Extend Validity
                      </button>
                      <button
                        type="button"
                        className={`ewb-tab ${actionTab === 'multi' ? 'active' : ''}`}
                        onClick={() => setActionTab('multi')}
                      >
                        Add Multiple Vehicles
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== CALCULATED ASSESSABLE VALUE BANNER (Individual Mode) ===== */}
          {isMultiContainerMode && generationMode === 'batch-selected' && containerAssessableValues && Object.keys(containerAssessableValues).length > 0 && (
            <div className="form-section" style={{ backgroundColor: '#fffacd', borderLeft: '4px solid #ff9800', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#ff6f00', fontSize: '1rem' }}>💰 Calculated Assessable Value</h3>
              <div className="section-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <p style={{ margin: '0.5rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#d32f2f' }}>
                    ₹ {Object.values(containerAssessableValues)[0]?.assessableValue?.toFixed(2) || 'Calculating...'}
                  </p>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
                    For container: <strong>{Object.values(containerAssessableValues)[0]?.containerNumber || 'Loading...'}</strong>
                    {Object.values(containerAssessableValues)[0] && (
                      <span>
                        {' '}(₹{Object.values(containerAssessableValues)[0]?.perKgValue?.toFixed(2)}/kg × {Object.values(containerAssessableValues)[0]?.weight?.toFixed(2)}kg)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===== Content Branching: Part B Actions vs. New Generation ===== */}
          {isPartBOnly ? (
            <div className="action-mode-content">
               {/* Part B Header & Preview */}
               <div className="part-b-banner" style={{ marginBottom: 16 }}>
                 <span className="part-b-banner-icon">🔒</span>
                 <div>
                   <strong>E-Way Bill Already Generated: {existingEwbNo}</strong><br />
                   <span style={{ fontSize: '0.88rem' }}>Part A is locked. Only Part B (vehicle/transport details) can be updated.</span>
                 </div>
               </div>

               {/* Part A Preview — Live from GetEwayBill API */}
               <div style={{
                  background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10,
                  padding: '16px 20px', marginBottom: 20
               }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: '1.1rem' }}>📋</span>
                    <strong style={{ color: '#334155' }}>Part A Preview (Read-Only)</strong>
                    {partALoading && <span style={{ fontSize: '0.78rem', color: '#6366f1' }}><span className="loading-spinner" /> Loading from API...</span>}
                    {partADetails && !partALoading && (
                      <span style={{ fontSize: '0.72rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>✅ Live API data</span>
                    )}
                    <span style={{
                      marginLeft: 'auto', background: '#e2e8f0', color: '#64748b',
                      fontSize: '0.75rem', padding: '2px 8px', borderRadius: 99, fontWeight: 600
                    }}>🔒 LOCKED</span>
                  </div>

                  {partADetails ? (() => {
                    const d = partADetails.apiData || {};
                    const meta = partADetails.meta || {};
                    const items = d.itemList || d.ItemList || [];
                    return (
                      <div style={{ fontSize: '0.85rem' }}>
                        {/* EWB Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px 24px', marginBottom: 12 }}>
                          <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 2 }}>E-Way Bill No.</div>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{d.ewayBillNo || existingEwbNo}</div>
                          </div>
                          <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 2 }}>Generated Date</div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{d.ewayBillDate || meta.ewbDate || '—'}</div>
                          </div>
                          <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 2 }}>Valid Until</div>
                            <div style={{ fontWeight: 600, color: '#dc2626' }}>{d.validUpto || meta.validUpto || '—'}</div>
                          </div>
                          <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 2 }}>Status</div>
                            <span style={{
                              background: (d.status === 'ACT' || meta.ewbStatus === 'Generated') ? '#dcfce7' : '#fee2e2',
                              color: (d.status === 'ACT' || meta.ewbStatus === 'Generated') ? '#15803d' : '#dc2626',
                              padding: '1px 8px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600
                            }}>
                              {d.status === 'ACT' ? 'Active' : d.status === 'CNL' ? 'Cancelled' : meta.ewbStatus || d.status || '—'}
                            </span>
                          </div>
                          <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 2 }}>Document</div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{d.docNo || formData.documentNumber || '—'}</div>
                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{d.docDate || formData.documentDate || ''}</div>
                          </div>
                          <div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 2 }}>Supply Type</div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{d.supplyType || d.subSupplyType || '—'}</div>
                          </div>
                          {meta.pdfUrl && (
                            <div>
                              <a href={meta.pdfUrl} target="_blank" rel="noopener noreferrer"
                                style={{ color: '#6366f1', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'underline' }}>
                                📄 Download EWB PDF
                              </a>
                            </div>
                          )}
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

                        {/* Consignor & Consignee */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 12 }}>
                          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📤 From (Consignor)</div>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{d.fromGstNum || d.gstin_of_consignor || '—'}</div>
                            <div style={{ color: '#334155', fontWeight: 600 }}>{d.fromTrdName || d.legal_name_of_consignor || '—'}</div>
                            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{d.fromAddr1 || ''}{d.fromAddr2 ? ', ' + d.fromAddr2 : ''}</div>
                            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{d.fromPlace || ''}{d.fromState ? ', ' + d.fromState : ''} {d.fromPincode || ''}</div>
                          </div>
                          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📥 To (Consignee)</div>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{d.toGstNum || d.gstin_of_consignee || '—'}</div>
                            <div style={{ color: '#334155', fontWeight: 600 }}>{d.toTrdName || d.legal_name_of_consignee || '—'}</div>
                            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{d.toAddr1 || ''}{d.toAddr2 ? ', ' + d.toAddr2 : ''}</div>
                            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{d.toPlace || ''}{d.toState ? ', ' + d.toState : ''} {d.toPincode || ''}</div>
                          </div>
                        </div>

                        {/* Goods Items */}
                        {items.length > 0 && (
                          <>
                            <div style={{ borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />
                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Goods Details</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                              <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                  <th style={{ padding: '5px 8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>HSN</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Product</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Qty</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Taxable Amt</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>IGST Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.slice(0, 8).map((item, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '5px 8px' }}>{item.hsnCode || item.hsn_code || '—'}</td>
                                    <td style={{ padding: '5px 8px' }}>{item.productName || item.product_name || '—'}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{item.quantity || '—'} {item.qtyUnit || item.unit_of_product || ''}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>₹{item.taxableAmount || item.taxable_amount || '—'}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{item.igstRate || item.igst_rate || 0}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {items.length > 8 && <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 4 }}>+{items.length - 8} more items</div>}
                            <div style={{ marginTop: 8, fontSize: '0.82rem', color: '#1e293b' }}>
                              <strong>Total Invoice Value: ₹{d.totalInvValue || d.total_invoice_value || '—'}</strong>
                            </div>
                          </>
                        )}

                        {/* Transport */}
                        {(d.transporterId || d.vehicleNo) && (
                          <>
                            <div style={{ borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b' }}>
                              {d.transporterId && <span><strong>Transporter ID:</strong> {d.transporterId}</span>}
                              {d.transporterName && <span><strong>Name:</strong> {d.transporterName}</span>}
                              {d.vehicleNo && <span><strong>Vehicle:</strong> {d.vehicleNo}</span>}
                              {d.transDistance && <span><strong>Distance:</strong> {d.transDistance} km</span>}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })() : (
                    // Fallback: show formData-based preview while API data loads
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 24px', fontSize: '0.85rem', color: '#64748b' }}>
                      <div><div style={{ fontSize: '0.72rem' }}>Document No.</div><div style={{ fontWeight: 600, color: '#1e293b' }}>{formData.documentNumber || '—'}</div></div>
                      <div><div style={{ fontSize: '0.72rem' }}>Document Date</div><div style={{ fontWeight: 600, color: '#1e293b' }}>{formData.documentDate || '—'}</div></div>
                      <div><div style={{ fontSize: '0.72rem' }}>Consignor</div><div style={{ fontWeight: 600, color: '#1e293b' }}>{formData.consignorName || '—'}</div></div>
                      <div><div style={{ fontSize: '0.72rem' }}>Consignee</div><div style={{ fontWeight: 600, color: '#1e293b' }}>{formData.consigneeName || '—'}</div></div>
                      {partALoading && <div style={{ color: '#6366f1', gridColumn: '1/-1' }}><span className="loading-spinner" /> Fetching live Part A from API...</div>}
                    </div>
                  )}
               </div>

               {/* The Action Content (Update/Extend/Multi) */}
               <div className="action-tab-body">
                  {actionTab === 'update' && renderUpdatePartB()}
                  {actionTab === 'extend' && renderExtendValidity()}
                  {actionTab === 'multi' && renderMultiVehicle()}
               </div>
            </div>
          ) : (
            <>
               {/* ---- Tab 1: BOE ---- */}
               {!hideTabs && activeTab === 'boe' && (
                 <div>
                    <div className="boe-fetch-row">
                      <div className="form-group" style={{ flex: 2 }}>
                        <label className="form-label">
                          Document No. (BOE)
                          {prData?.document_no && boeNumber === prData.document_no && (
                            <span style={{ marginLeft: 8, fontSize: '0.7rem', background: '#dcfce7', color: '#16a34a', padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>
                              ✓ From Shipment
                            </span>
                          )}
                        </label>
                        <Autocomplete
                          options={boeList}
                          getOptionLabel={(option) =>
                            typeof option === 'string'
                              ? option
                              : `${option.document_no || option.be_no || ''} | LR: ${option.pr_no || 'N/A'} | ${option.consignee_name || option.importer || 'N/A'}`
                          }
                          isOptionEqualToValue={(option, value) =>
                            (option.document_no || option.be_no) === (value.document_no || value.be_no)
                          }
                          value={selectedBoe}
                          onChange={(event, newValue) => {
                            handleBoeSelect(newValue);
                            setBoeError('');
                          }}
                          onInputChange={(event, newInputValue, reason) => {
                            if (reason === 'input') {
                              setBoeNumber(newInputValue);
                              setBoeError('');
                            }
                          }}
                          freeSolo
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Search by Document No, LR No, Party..."
                              size="small"
                            />
                          )}
                          renderOption={(props, option) => (
                            <li {...props} key={option._id || option.document_no}>
                              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                  {option.document_no || option.be_no}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: '#666' }}>
                                  LR: {option.pr_no || '—'} &nbsp;|&nbsp; Party: {option.consignee_name || option.importer || '—'}
                                </span>
                              </div>
                            </li>
                          )}
                          fullWidth
                        />
                        {boeLrLoading && (
                          <div style={{ fontSize: '0.8rem', color: '#2563eb', marginTop: 4 }}>
                            <span className="loading-spinner" /> Loading LR data...
                          </div>
                        )}
                        {boeLrData && !boeLrLoading && (
                          <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: 4 }}>
                            ✅ Internal LR data loaded — Consignor/Consignee auto-filled
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Document Date (BE Date)</label>
                        <input
                          type="date"
                          className="form-input"
                          value={boeDate}
                          onChange={(e) => setBoeDate(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleBoeFetch}
                        disabled={boeLoading || !boeNumber}
                      >
                        {boeLoading ? (
                          <><span className="loading-spinner"></span> Fetching...</>
                        ) : (
                          'Fetch Item Details'
                        )}
                      </button>
                    </div>
                    {boeError && <div className="boe-error">{boeError}</div>}
                 </div>
               )}

               {/* ---- Tab 2: LR ---- */}
               {!hideTabs && !boeOnly && activeTab === 'lr' && (
                  <div className="form-row" style={{ flexDirection: 'column', gap: 8 }}>
                    <Autocomplete
                      options={lrList}
                      getOptionLabel={(option) => `${option.tr_no || 'N/A'} - ${option.consignor?.name || "N/A"} → ${option.consignee?.name || "N/A"}`}
                      value={selectedLr}
                      onChange={(event, newValue) => {
                        if (newValue) {
                          const compositeId = newValue._id && newValue.container_details?._id
                            ? `${newValue._id}-${newValue.container_details._id}`
                            : newValue._id;
                          handleLrSelect(compositeId);
                        } else {
                          handleLrSelect("");
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search by LR No, Consignor, Consignee..."
                          size="small"
                          className={getInputClass("selectedLrId", "")}
                          error={!!fieldErrors.selectedLrId}
                        />
                      )}
                      disabled={loading}
                      fullWidth
                    />
                    {selectedLr && selectedLr.container_details?.lr_completed && (
                      <div style={{
                        background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6,
                        padding: '8px 12px', fontSize: '0.85rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        ⚠️ <strong>LR Completed</strong> — This LR container is already marked as completed. E-Way Bill may already be processed.
                      </div>
                    )}
                  </div>
               )}

               {/* ---- Tab 3: Upload PDF ---- */}
               {!hideTabs && activeTab === 'excel' && (
                 <div>
                    <div
                      className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".pdf"
                        onChange={handleFileDrop}
                      />
                      <div className="upload-zone-icon">📁</div>
                      <div className="upload-zone-text">Drag & Drop or Click to Browse</div>
                      <div className="upload-zone-hint">Accepts .pdf files</div>

                      {uploadedFile && (
                        <div className="file-selected">
                          <span>📎 {uploadedFile.name}</span>
                          <button
                            type="button"
                            className="remove-file"
                            onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setUploadResults([]); }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {uploadLoading && (
                      <div className="upload-progress">
                        <div className="upload-progress-bar">
                          <div className="upload-progress-bar-fill"></div>
                        </div>
                      </div>
                    )}

                    {uploadedFile && (
                      <div style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleUpload}
                          disabled={uploadLoading}
                        >
                          {uploadLoading ? (
                            <><span className="loading-spinner"></span> Uploading...</>
                          ) : (
                            "Upload & Extract"
                          )}
                        </button>
                      </div>
                    )}

                    {uploadError && <div className="boe-error">{uploadError}</div>}

                    {/* Upload Results Table */}
                    {uploadResults.length > 1 && (
                      <div className="upload-results">
                        <div className="upload-results-title">{uploadResults.length} records found — select one to populate:</div>
                        <table className="upload-results-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Document No</th>
                              <th>Consignee</th>
                              <th>Value</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadResults.map((rec, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>{rec.be_no || rec.document_no || rec.documentNumber || "N/A"}</td>
                                <td>{rec.consignee_name || rec.importer_name || "N/A"}</td>
                                <td>{rec.total_invoice_value || rec.assessable_value || "–"}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn-select-row"
                                    onClick={() => selectUploadRecord(rec)}
                                  >
                                    Select
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                 </div>
               )}
            </>
          )}


          {/* ===== Smart Mode Badge ===== */}
          {!isPartBOnly && ewbMode !== 'general' && (
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: ewbMode === 'import' ? '#eff6ff' : '#f0fdf4', border: `1px solid ${ewbMode === 'import' ? '#dbeafe' : '#dcfce7'}`, borderRadius: '6px' }}>
              <div className={ewbMode === 'import' ? 'blue-dot' : 'green-dot'} style={{ margin: 0, padding: 0, border: 'none', background: 'none' }} />
              <div>
                <strong style={{ color: ewbMode === 'import' ? '#0369a1' : '#166534', fontSize: '0.9rem' }}>
                  {ewbMode === 'import' ? 'Import Mode Auto-Configured' : 'Export Mode Auto-Configured'}
                </strong>
                <div style={{ fontSize: '0.8rem', color: ewbMode === 'import' ? '#0ea5e9' : '#22c55e', marginTop: '2px' }}>
                  {ewbMode === 'import' ? 'Inward Supply · Bill of Entry · IGST Only' : 'Outward Supply · Tax Invoice · IGST Only'}
                </div>
              </div>
            </div>
          )}

          {/* ===== Full Form Sections (hidden in Part B mode) ===== */}
          {!isPartBOnly && (
            <>
              {/* Section: Container Weight Distribution (from BOE) */}
              {activeTab === 'boe' && (selectedContainers?.length > 0 ? selectedContainers.length : boeContainers.length) > 0 && (
                <div className="form-section container-weight-section" style={{ marginBottom: '24px' }}>
                  <h3 className="blue-dot">Container Weight Distribution <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b', marginLeft: 8 }}>(Calculated)</span></h3>
                  <div className="section-body">
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '24px', marginBottom: '16px', padding: '10px 15px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Total Gross Weight</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0369a1' }}>
                            {(() => {
                              // Sum weights for selected containers or default BOE containers
                              const containersToUse = selectedContainers?.length > 0 ? selectedContainers : boeContainers;
                              const totalSelectedWeight = containersToUse.reduce((sum, sc) => {
                                const scNo = (sc.container_number || sc.container_no || sc.containerNo || "").trim().toUpperCase();
                                // Find matching index in BOE
                                const originalIdx = boeContainers.findIndex(bc => {
                                  const bcNo = (bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "").trim().toUpperCase();
                                  return bcNo === scNo || (bcNo && scNo && bcNo.includes(scNo));
                                });
                                
                                // FIX: Check for manual weight if not found in BOE
                                const w = originalIdx !== -1 ? containerWeights[originalIdx] : containerWeights[`manual_${scNo}`];
                                return sum + (parseFloat(w) || 0);
                              }, 0);
                              
                              return totalSelectedWeight.toFixed(2);
                            })()} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>KGS</span></div>
                        </div>
                        <div style={{ height: '30px', width: '1px', background: '#e2e8f0' }} />
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Containers</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                            {selectedContainers?.length > 0 ? selectedContainers.length : boeContainers.length}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                        {(selectedContainers?.length > 0 ? selectedContainers : boeContainers).map((sc, displayIdx) => {
                          const scNo = (sc.container_number || sc.container_no || sc.containerNo || "").trim().toUpperCase();
                          
                          // Find matching index in BOE
                          const originalIdx = boeContainers.findIndex(bc => {
                            const bcNo = (bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "").trim().toUpperCase();
                            return bcNo === scNo || (bcNo && scNo && bcNo.includes(scNo));
                          });
                          
                          // FIX: Retrieval logic must account for manual keys
                          const currentWeight = (originalIdx !== -1 ? containerWeights[originalIdx] : containerWeights[`manual_${scNo}`]) || 0;
                          const containerAssessable = (currentWeight * perKgValue).toFixed(2);
                          
                          return (
                            <div key={displayIdx} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Container {displayIdx + 1}</div>
                                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', marginBottom: '8px' }}>
                                  {scNo || 'N/A'}
                                  {originalIdx === -1 && (
                                    <span style={{ fontSize: '0.65rem', color: '#ef4444', display: 'block' }}>(Not in BOE)</span>
                                  )}
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Weight (KG):</span>
                                  <input 
                                    type="number" 
                                    value={currentWeight}
                                    onChange={(e) => {
                                      // FIX: Store raw value or empty string to allow typing
                                      const rawVal = e.target.value;
                                      const newVal = rawVal === "" ? "" : (parseFloat(rawVal) || 0);
                                      
                                      // If matched in BOE, update the indexed weight
                                      if (originalIdx !== -1) {
                                        setContainerWeights(prev => ({ ...prev, [originalIdx]: newVal }));
                                      } else {
                                        setContainerWeights(prev => ({ ...prev, [`manual_${scNo}`]: newVal }));
                                      }
                                      
                                      // Always update the first item quantity and taxable amount based on new input weights
                                      setFormData(f => {
                                        const newItems = [...f.items];
                                        // Sum weights of ALL containers currently being managed in this section
                                        const containersToUse = selectedContainers?.length > 0 ? selectedContainers : boeContainers;
                                        const totalW = containersToUse.reduce((acc, scont) => {
                                          const sNo = (scont.container_number || scont.container_no || scont.containerNo || "").trim().toUpperCase();
                                          if (sNo === scNo) return acc + newVal;
                                          
                                          // Find weight for this other managed container
                                          const oIdx = boeContainers.findIndex(bc => {
                                            const bcNo = (bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "").trim().toUpperCase();
                                            return bcNo === sNo || (bcNo && sNo && bcNo.includes(sNo));
                                          });
                                          
                                          const w = oIdx !== -1 ? containerWeights[oIdx] : containerWeights[`manual_${sNo}`];
                                          return acc + (parseFloat(w) || 0);
                                        }, 0);
                                        
                                        const totalA = totalW * perKgValue;
                                        if (newItems[0]) {
                                          newItems[0].quantity = totalW;
                                          newItems[0].taxableAmount = totalA.toFixed(2);
                                        }
                                        return { ...f, items: newItems, totalInvoiceValue: totalA.toFixed(2) };
                                      });
                                    }}
                                    style={{ 
                                      width: '90px', 
                                      padding: '2px 5px', 
                                      border: '1px solid #cbd5e1', 
                                      borderRadius: '4px',
                                      textAlign: 'right',
                                      fontWeight: 700,
                                      color: '#0369a1',
                                      fontSize: '0.9rem'
                                    }}
                                  />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', padding: '5px', borderRadius: '4px' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>Value:</span>
                                  <span style={{ fontWeight: 800, color: '#b45309', fontSize: '0.9rem' }}>₹{parseFloat(containerAssessable).toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button 
                          type="button"
                          onClick={() => {
                            Swal.fire({
                              title: 'Weight & Value Calculation',
                              didOpen: () => {
                                // Ensure popup is above MUI dialog z-index (1300)
                                const container = Swal.getContainer();
                                if (container) container.style.zIndex = '3000';
                              },
                              html: `
                                <div style="text-align: left; font-size: 0.9rem;">
                                  <p><strong>Step 1: Determine Per KG Value</strong></p>
                                  <p>Total Value (Y) = Assessable Value + BCD + SWS</p>
                                  <p>Y = ₹${totalValueFromBoe.toLocaleString('en-IN')}</p>
                                  <p>Per KG = ₹${totalValueFromBoe.toLocaleString('en-IN')} / ${(weightPerContainer * boeContainers.length).toFixed(2)} KG = <strong>₹${perKgValue.toFixed(2)} / kg</strong></p>
                                  
                                  <hr/>
                                  <p><strong>Step 2: Proportional Container Value</strong></p>
                                  <p>Container Value = Your Input Weight × ₹${perKgValue.toFixed(2)}</p>
                                </div>
                              `,
                              icon: 'info'
                            });
                          }}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#0369a1', 
                            cursor: 'pointer', 
                            textDecoration: 'underline',
                            padding: 0,
                            font: 'inherit'
                          }}
                        >
                          ⓘ Info
                        </button>
                        <span>(Click for calculation details)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Transaction & Document Details */}
              <div className="form-section">
                 <h3 className="blue-dot">Transaction & Document</h3>
                 <div className="section-body">
                 <div className="form-row four-cols">

                  <div className="form-group">
                    <label className="form-label">Supply Type</label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input type="radio" name="supplyType" value="outward" checked={formData.supplyType === "outward"} onChange={handleInputChange} />
                        <span>Outward</span>
                      </label>
                      <label className="radio-option">
                        <input type="radio" name="supplyType" value="inward" checked={formData.supplyType === "inward"} onChange={handleInputChange} />
                        <span>Inward</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sub Type</label>
                    <select className="form-select" name="subSupplyType" value={formData.subSupplyType} onChange={handleInputChange}>
                      <option value="Supply">Supply</option>
                      <option value="Import">Import</option>
                      <option value="Export">Export</option>
                      <option value="Job Work">Job Work</option>
                      <option value="SKD/CKD">SKD/CKD</option>
                      <option value="Recipient Not Known">Recipient Not Known</option>
                      <option value="For Own Use">For Own Use</option>
                      <option value="Exhibition or Fairs">Exhibition or Fairs</option>
                      <option value="Line Sales">Line Sales</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Doc Type</label>
                    <select className="form-select" name="documentType" value={formData.documentType} onChange={handleInputChange}>
                      <option value="Tax Invoice">Tax Invoice</option>
                      <option value="Bill of Supply">Bill of Supply</option>
                      <option value="Bill of Entry">Bill of Entry</option>
                      <option value="Delivery Challan">Delivery Challan</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Transaction Type</label>
                    <select className="form-select" name="transactionType" value={formData.transactionType} onChange={handleInputChange}>
                      <option value={1}>Regular</option>
                      <option value={2}>Bill To - Ship To</option>
                      <option value={3}>Bill From - Dispatch From</option>
                      <option value={4}>Combination of 2 and 3</option>
                    </select>
                  </div>
                </div>

                <div className="form-row two-cols">
                  <div className="form-group">
                    <label className="form-label required">Document No</label>
                    <input type="text" className={getInputClass("documentNumber")} name="documentNumber" value={formData.documentNumber} onChange={handleInputChange} placeholder="Enter document number" />
                    {renderFieldError("documentNumber")}
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Document Date</label>
                    <input type="date" className={getInputClass("documentDate")} name="documentDate" value={formData.documentDate} onChange={handleInputChange} />
                    {renderFieldError("documentDate")}
                  </div>
                </div>
                </div>
              </div>

              <div className="form-row split-row">
                {/* Bill From (Consignor) */}
                <div className="form-section half-width">
                  <h3 className="blue-dot">
                    Bill From
                  </h3>
                  <div className="section-body" style={{ padding: '12px' }}>
                    <div className="form-row align-center" style={{ marginBottom: '10px' }}>
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>Name</label>
                      <div style={{ flex: 1 }}>
                        <input type="text" className={getInputClass("consignorName")} name="consignorName" value={formData.consignorName} onChange={handleInputChange} placeholder="Consignor name" />
                        {renderFieldError("consignorName")}
                      </div>
                    </div>
                    <div className="form-row align-center" style={{ marginBottom: '10px' }}>
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>GSTIN *</label>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          name="consignorGstin"
                          className={getInputClass("consignorGstin")}
                          value={formData.consignorGstin}
                          onChange={handleInputChange}
                          placeholder="GSTIN or URP"
                        />
                        {renderFieldError("consignorGstin")}
                      </div>
                    </div>
                    <div className="form-row align-center">
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>State *</label>
                      <div style={{ flex: 1 }}>
                        <datalist id="states">
                          {INDIAN_STATES.map(state => <option key={state} value={state} />)}
                        </datalist>
                        <input type="text" list="states" className={getInputClass("consignorState")} name="consignorState" value={formData.consignorState} onChange={handleInputChange} placeholder="State" />
                        {renderFieldError("consignorState")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dispatch From */}
                <div className="form-section half-width">
                  <h3 className="green-dot">
                    Dispatch From
                    {(formData.transactionType == 1 || formData.transactionType == 2) ? 
                      <span className="sync-badge">Auto (Same as From)</span> : 
                      <span className="edit-badge">Independent</span>}
                  </h3>
                  <div className="section-body" style={{ padding: '12px' }}>
                    <div className="form-row align-center" style={{ marginBottom: '10px' }}>
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>Address</label>
                      <div style={{ flex: 1 }}>
                        <input 
                          type="text" 
                          className={getInputClass("dispatchFromAddress1")} 
                          name="dispatchFromAddress1" 
                          value={formData.dispatchFromAddress1} 
                          onChange={handleInputChange}
                          placeholder="Pickup address"
                        />
                        {renderFieldError("dispatchFromAddress1")}
                      </div>
                    </div>
                    <div className="form-row align-center" style={{ marginBottom: '10px' }}>
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>Place</label>
                      <div style={{ flex: 1 }}>
                        <input 
                          type="text" 
                          className={getInputClass("dispatchFromCity")} 
                          name="dispatchFromCity" 
                          value={formData.dispatchFromCity} 
                          onChange={handleInputChange} 
                          placeholder="City/Place" 
                        />
                        {renderFieldError("dispatchFromCity")}
                      </div>
                    </div>
                    <div className="form-row align-center">
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>Pincode *</label>
                      <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="text" 
                            className={getInputClass("dispatchFromPincode")} 
                            name="dispatchFromPincode" 
                            value={formData.dispatchFromPincode} 
                            onChange={handleInputChange} 
                            placeholder="Pincode" 
                          />
                          {renderFieldError("dispatchFromPincode")}
                        </div>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="text" 
                            list="states" 
                            className={getInputClass("dispatchFromState")} 
                            name="dispatchFromState" 
                            value={formData.dispatchFromState} 
                            onChange={handleInputChange}
                            readOnly={true}
                            style={{ background: '#f8fafc', color: '#64748b' }}
                            placeholder="State linked to Bill From"
                          />
                          {renderFieldError("dispatchFromState")}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '10px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ color: '#94a3b8' }}>ⓘ</span>
                      {formData.transactionType == 3 || formData.transactionType == 4 ? 
                        "Enter actual pickup location (different from billing office)." : 
                        "Matches Consignor."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-row split-row">
                {/* Bill To (Consignee) */}
                <div className="form-section half-width">
                  <h3 className="purple-dot">
                    Bill To
                  </h3>
                  <div className="section-body" style={{ padding: '12px' }}>
                    <div className="form-row align-center" style={{ marginBottom: '10px' }}>
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>Name</label>
                      <div style={{ flex: 1 }}>
                        <input type="text" className={getInputClass("consigneeName")} name="consigneeName" value={formData.consigneeName} onChange={handleInputChange} placeholder="Consignee name" />
                        {renderFieldError("consigneeName")}
                      </div>
                    </div>
                    <div className="form-row align-center" style={{ marginBottom: '10px' }}>
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>GSTIN *</label>
                      <div style={{ flex: 1 }}>
                        <input type="text" className={getInputClass("consigneeGstin")} name="consigneeGstin" value={formData.consigneeGstin} onChange={handleInputChange} placeholder="GSTIN or URP" />
                        {renderFieldError("consigneeGstin")}
                      </div>
                    </div>
                    <div className="form-row align-center">
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>State *</label>
                      <div style={{ flex: 1 }}>
                        <input type="text" list="states" className={getInputClass("consigneeState")} name="consigneeState" value={formData.consigneeState} onChange={handleInputChange} placeholder="State" />
                        {renderFieldError("consigneeState")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ship To */}
                <div className="form-section half-width">
                  <h3 className="amber-dot">
                    Ship To
                    {(formData.transactionType == 1 || formData.transactionType == 3) ? 
                      <span className="sync-badge">Auto (Same as To)</span> : 
                      <span className="edit-badge">Independent</span>}
                  </h3>
                  <div className="section-body" style={{ padding: '12px' }}>
                    <div className="form-row align-center" style={{ marginBottom: '10px' }}>
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>Address</label>
                      <div style={{ flex: 1 }}>
                        <input 
                          type="text" 
                          className={getInputClass("shipToAddress1")} 
                          name="shipToAddress1" 
                          value={formData.shipToAddress1} 
                          onChange={handleInputChange}
                          placeholder="Delivery address"
                        />
                        {renderFieldError("shipToAddress1")}
                      </div>
                    </div>
                    <div className="form-row align-center" style={{ marginBottom: '10px' }}>
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>Place</label>
                      <div style={{ flex: 1 }}>
                        <input 
                          type="text" 
                          className={getInputClass("shipToCity")} 
                          name="shipToCity" 
                          value={formData.shipToCity} 
                          onChange={handleInputChange} 
                          placeholder="City/Place" 
                        />
                        {renderFieldError("shipToCity")}
                      </div>
                    </div>
                    <div className="form-row align-center">
                      <label className="form-label required" style={{ width: '100px', margin: 0 }}>Pincode *</label>
                      <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="text" 
                            className={getInputClass("shipToPincode")} 
                            name="shipToPincode" 
                            value={formData.shipToPincode} 
                            onChange={handleInputChange} 
                            placeholder="Pincode" 
                          />
                          {renderFieldError("shipToPincode")}
                        </div>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="text" 
                            list="states" 
                            className={getInputClass("shipToState")} 
                            name="shipToState" 
                            value={formData.shipToState} 
                            onChange={handleInputChange}
                            readOnly={true}
                            style={{ background: '#f8fafc', color: '#64748b' }}
                            placeholder="State linked to Bill To"
                          />
                          {renderFieldError("shipToState")}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '10px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ color: '#94a3b8' }}>ⓘ</span>
                      {formData.transactionType == 2 || formData.transactionType == 4 ? 
                        "Enter actual shipping destination." : 
                        "Matches Consignee."}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Item Details */}
              <div className="form-section">
                <h3 className="amber-dot">Item Details
                  <button type="button" className="section-action" onClick={addItem}>+ Add Item</button>
                </h3>
                <div className="section-body">

                {formData.items.map((item, index) => (
                  <div key={index} className="item-card">
                    <div className="item-header">
                      <span>Item {index + 1}</span>
                      {formData.items.length > 1 && (
                        <button type="button" className="remove-item-btn" onClick={() => removeItem(index)}>✕</button>
                      )}
                    </div>

                    <div className="form-row two-cols">
                      <div className="form-group">
                        <label className="form-label">Product Name</label>
                        <input type="text" className="form-input" name="productName" value={item.productName} onChange={(e) => handleItemChange(index, e)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <input type="text" className="form-input" name="productDesc" value={item.productDesc} onChange={(e) => handleItemChange(index, e)} />
                      </div>
                    </div>
                    <div className="form-row three-cols">
                      <div className="form-group">
                        <label className="form-label required">HSN Code</label>
                        <input type="text" className={getInputClass(`items[${index}].hsnCode`)} name="hsnCode" value={item.hsnCode} onChange={(e) => handleItemChange(index, e)} placeholder="HSN" />
                        {renderFieldError(`items[${index}].hsnCode`)}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Quantity</label>
                        <input type="number" className="form-input" name="quantity" value={item.quantity} onChange={(e) => handleItemChange(index, e)} min="0" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Unit</label>
                        <select className="form-select" name="qtyUnit" value={item.qtyUnit} onChange={(e) => handleItemChange(index, e)}>
                          <option value="NOS">Numbers</option>
                          <option value="KGS">Kilograms</option>
                          <option value="MTS">Metric Tons</option>
                          <option value="BO">Boxes</option>
                          <option value="CTN">Cartons</option>
                        </select>
                      </div>
                    </div>

                    <div className={ewbMode === 'general' ? "form-row five-cols" : "form-row three-cols"}>
                      <div className="form-group">
                        <label className="form-label required">Taxable</label>
                        <input type="number" className={getInputClass(`items[${index}].taxableAmount`)} name="taxableAmount" value={item.taxableAmount} onChange={(e) => handleItemChange(index, e)} placeholder="0.00" />
                        {renderFieldError(`items[${index}].taxableAmount`)}
                      </div>
                      
                      {/* Hide CGST/SGST in Import/Export mode (inter-state -> only IGST used) */}
                      {ewbMode === 'general' && (
                        <>
                          <div className="form-group">
                            <label className="form-label">CGST %</label>
                            <input type="number" className="form-input" name="cgstRate" value={item.cgstRate} onChange={(e) => handleItemChange(index, e)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">SGST %</label>
                            <input type="number" className="form-input" name="sgstRate" value={item.sgstRate} onChange={(e) => handleItemChange(index, e)} />
                          </div>
                        </>
                      )}

                      <div className="form-group">
                        <label className="form-label">IGST %</label>
                        <input type="number" className="form-input" name="igstRate" value={item.igstRate} onChange={(e) => handleItemChange(index, e)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">CESS %</label>
                        <input type="number" className="form-input" name="cessRate" value={item.cessRate} onChange={(e) => handleItemChange(index, e)} />
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>

              {/* Section: Duty Summary (from BOE) */}
              {dutySummary && (
                <div className="form-section duty-summary-section">
                  <h3>Duty Summary <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#ffffff', marginLeft: 8 }}>(from Bill of Entry)</span></h3>
                  <div className="section-body">
                    <div className="duty-summary-grid">
                      {(() => {
                        const displayAssVal = parseFloat(dutySummary['TOT.ASS VAL'] || 0);
                        const displayIgst = parseFloat(dutySummary['IGST'] || 0);
                        const displayTotalDuty = parseFloat(dutySummary['TOTAL DUTY'] || 0);

                        return (
                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '220px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase' }}>
                                ASSESSABLE VALUE<br/>(TOT.ASS VAL)
                              </span>
                              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a' }}>
                                ₹ {displayAssVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div style={{ flex: 1, background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '220px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase' }}>
                                IGST
                              </span>
                              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a' }}>
                                ₹ {displayIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                           
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                      ⓘ Duty values are from the BOE extract. Taxable Value = Assessable Value + Custom Duty.
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Tax Totals */}
              <div className="form-section">
                <h3>Invoice Totals</h3>
                <div className="section-body">
                <div className="form-row two-cols">
                  <div className="form-group">
                    <label className="form-label">Other Amount (+/-)</label>
                    <input type="number" className="form-input" name="otherAmount" value={formData.otherAmount} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Invoice Value (Auto)</label>
                    <input type="number" className={getInputClass("totalInvoiceValue")} name="totalInvoiceValue" value={formData.totalInvoiceValue} readOnly style={{ backgroundColor: '#f8fafc', fontWeight: 700, color: '#1e3a8a' }} />
                    {renderFieldError("totalInvoiceValue")}
                  </div>
                </div>
                </div>
              </div>

            </>
          )}

          {/* ===== Bottom Sections (Only for Generate mode) ===== */}
          {!isPartBOnly && (
            <>
              <div className="form-section">
                <h3 className="blue-dot">Transportation Details (Part B)</h3>
                <div className="section-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <input 
                      type="checkbox" 
                      id="partAOnlyCheckbox" 
                      checked={formData.partAOnly} 
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          partAOnly: isChecked,
                          ...(isChecked && {
                            vehicleNo: "",
                            transporterDocNo: "",
                            transportationMode: ""
                          })
                        }));
                      }}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="partAOnlyCheckbox" style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                      Generate Part A Only (No Vehicle Details / Part A Slip)
                    </label>
                  </div>

                  <div className="form-row">
                    <datalist id="transporters">
                      {transporters.map(t => <option key={t._id} value={t.gstin}>{t.name}</option>)}
                    </datalist>
                    <div className="form-group">
                      <label className="form-label">Transporter ID (GSTIN)</label>
                      <input
                        list="transporters"
                        className="form-input"
                        name="transporterId"
                        value={formData.transporterId}
                        onChange={handleTransporterChange}
                        placeholder="Enter or Select GSTIN"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Transporter Name</label>
                      <input type="text" className="form-input" name="transporterName" value={formData.transporterName} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="form-row three-cols">
                    <div className="form-group">
                      <label className="form-label">Approx Distance (KM)</label>
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="number" className={getInputClass("transportDistance")} name="transportDistance" value={formData.transportDistance} onChange={handleInputChange} placeholder="KM" />
                          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchDistance} title="Calculate PIN to PIN">Verify</button>
                        </div>
                        {renderFieldError("transportDistance")}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vehicle Type</label>
                      <select className="form-select" name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} disabled={formData.partAOnly}>
                        <option value="Regular">Regular</option>
                        <option value="ODC">Over Dimensional Cargo</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mode</label>
                      <select className="form-select" name="transportationMode" value={formData.transportationMode} onChange={handleInputChange} disabled={formData.partAOnly}>
                        <option value="Road">Road</option>
                        <option value="Rail">Rail</option>
                        <option value="Air">Air</option>
                        <option value="Ship">Ship</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row three-cols">
                    <div className="form-group">
                      <label className={`form-label ${formData.partAOnly ? '' : 'required'}`}>Vehicle No</label>
                      <input 
                        type="text" 
                        className={getInputClass("vehicleNo")} 
                        name="vehicleNo" 
                        value={formData.vehicleNo} 
                        onChange={handleInputChange} 
                        placeholder={formData.partAOnly ? "Not required for Part A" : "XX00XX0000"} 
                        disabled={formData.partAOnly} 
                      />
                      {!formData.partAOnly && renderFieldError("vehicleNo")}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Transporter Doc No</label>
                      <input type="text" className="form-input" name="transporterDocNo" value={formData.transporterDocNo} onChange={handleInputChange} disabled={formData.partAOnly} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Transporter Doc Date</label>
                      <input type="date" className="form-input" name="transporterDocDate" value={formData.transporterDocDate} onChange={handleInputChange} disabled={formData.partAOnly} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions (Generate EWB) */}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleReset}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={generating}>
                  {generating ? (
                    <>
                      <span className="loading-spinner"></span> Generating...
                    </>
                  ) : (
                    "Generate E-Way Bill →"
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}

export default EwayBillGenerate;
