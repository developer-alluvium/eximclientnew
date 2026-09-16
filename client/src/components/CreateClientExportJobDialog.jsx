import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Button,
  CircularProgress,
  Alert
} from "@mui/material";
import { Close, Add, Delete, Business, Group, LocalShipping } from "@mui/icons-material";
import axios from "axios";
import { getCookie } from "../utils/cookies";

// Standard Custom Houses
const CUSTOM_HOUSES = [
  "ICD SANAND",
  "ICD SABARMATI",
  "THAR DRY PORT",
  "MUNDRA SEA",
  "HAZIRA",
  "ANKLESHWAR ICD",
  "ICD VARNAMA",
  "ICD KHODIYAR",
  "ICD SACHANA",
  "ICD VIROCHAN NAGAR",
  "KANDLA SEA",
  "AHMEDABAD AIR CARGO",
  "COCHIN SEA",
  "COCHIN AIR CARGO"
];

// Standard Branches
const BRANCH_OPTIONS = [
  { code: "AMD", label: "AMD - AHMEDABAD" },
  { code: "BRD", label: "BRD - BARODA" },
  { code: "GIM", label: "GIM - GANDHIDHAM" },
  { code: "HAZ", label: "HAZ - HAZIRA" },
  { code: "COK", label: "COK - COCHIN" },
];

// Standard Ports of Loading
const PORT_OPTIONS = [
  { value: "INMUN1 - MUNDRA", label: "Mundra (INMUN1)" },
  { value: "INIXY1 - KANDLA", label: "Kandla (INIXY1)" },
  { value: "INPAV1 - PIPAVAV", label: "Pipavav (INPAV1)" },
  { value: "INHZA1 - HAZIRA", label: "Hazira (INHZA1)" },
  { value: "INNSA1 - NHAVA SHEVA", label: "Nhava Sheva (INNSA1)" },
  { value: "INAMD4 - AHMEDABAD AIR PORT", label: "Ahmedabad Air Port (INAMD4)" },
];

const getCurrentFinancialYear = () => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed: April = 3
  const currentYear = now.getFullYear();
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
};

const emptyConsignee = {
  consignee_name: "",
  consignee_address: "",
  consignee_country: "",
};

export default function CreateClientExportJobDialog({
  open,
  onClose,
  onJobCreated,
  user
}) {
  const finYear = React.useMemo(() => getCurrentFinancialYear(), []);

  // Compute organization and IE code assignments from logged in user
  const assignments = React.useMemo(() => {
    return user?.exporter_ie_code_assignments?.length > 0
      ? user.exporter_ie_code_assignments
      : (user?.ie_code_assignments || []);
  }, [user]);

  // Group by Organization Name
  const orgMap = React.useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => {
      const name = (a.importer_name || a.exporter_name || "").trim().toUpperCase();
      if (name) {
        if (!map.has(name)) map.set(name, []);
        if (a.ie_code_no) {
          const ie = a.ie_code_no.trim().toUpperCase();
          const list = map.get(name);
          if (!list.includes(ie)) list.push(ie);
        }
      }
    });

    // Fallback if assignments empty
    if (map.size === 0) {
      const fallbackOrg = (user?.assignedImporterName || user?.name || "CLIENT").toUpperCase();
      const fallbackIe = (user?.ie_code_no || "").toUpperCase();
      map.set(fallbackOrg, fallbackIe ? [fallbackIe] : []);
    }
    return map;
  }, [assignments, user]);

  const orgNames = React.useMemo(() => Array.from(orgMap.keys()), [orgMap]);
  const defaultOrg = orgNames[0] || "";
  const defaultIeCodes = orgMap.get(defaultOrg) || [];
  const defaultIe = defaultIeCodes[0] || "";

  const [formData, setFormData] = React.useState({
    branch_code: "AMD",
    exporter: defaultOrg,
    ieCode: defaultIe,
    job_date: new Date().toISOString().split("T")[0],
    export_ref_no: "",
    custom_house: "",
    consignees: [{ ...emptyConsignee }],
    consignmentType: "FCL",
    transportMode: "SEA",
    goods_stuffed_at: "FACTORY",
    port_of_loading: "INMUN1 - MUNDRA",
  });

  const [availableIeCodes, setAvailableIeCodes] = React.useState(defaultIeCodes);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  // Sync available IE codes when exporter changes
  React.useEffect(() => {
    if (open) {
      const org = formData.exporter || defaultOrg;
      const ies = orgMap.get(org) || [];
      setAvailableIeCodes(ies);
      if (!ies.includes(formData.ieCode)) {
        setFormData(prev => ({ ...prev, exporter: org, ieCode: ies[0] || "" }));
      }
    }
  }, [open, formData.exporter, orgMap, defaultOrg]);

  // Sync Transport Mode with Consignment Type
  const handleConsignmentTypeChange = (val) => {
    const isAir = val === "AIR";
    setFormData(prev => ({
      ...prev,
      consignmentType: val,
      transportMode: isAir ? "AIR" : "SEA",
      port_of_loading: isAir ? "INAMD4 - AHMEDABAD AIR PORT" : prev.port_of_loading
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOrgChange = (newOrg) => {
    const ies = orgMap.get(newOrg) || [];
    setAvailableIeCodes(ies);
    setFormData(prev => ({
      ...prev,
      exporter: newOrg,
      ieCode: ies[0] || ""
    }));
  };

  // Consignee handlers
  const handleConsigneeChange = (idx, field, val) => {
    const updated = [...formData.consignees];
    updated[idx][field] = val.toUpperCase();
    setFormData(prev => ({ ...prev, consignees: updated }));
  };

  const addConsignee = () => {
    setFormData(prev => ({
      ...prev,
      consignees: [...prev.consignees, { ...emptyConsignee }]
    }));
  };

  const removeConsignee = (idx) => {
    if (formData.consignees.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      consignees: prev.consignees.filter((_, i) => i !== idx)
    }));
  };

  const handleClear = () => {
    setErrorMsg("");
    setFormData({
      branch_code: "AMD",
      exporter: defaultOrg,
      ieCode: (orgMap.get(defaultOrg) || [])[0] || "",
      job_date: new Date().toISOString().split("T")[0],
      export_ref_no: "",
      custom_house: "",
      consignees: [{ ...emptyConsignee }],
      consignmentType: "FCL",
      transportMode: "SEA",
      goods_stuffed_at: "FACTORY",
      port_of_loading: "INMUN1 - MUNDRA",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.exporter) {
      setErrorMsg("Exporter Name is required.");
      return;
    }
    if (!formData.ieCode) {
      setErrorMsg("IE Code is required.");
      return;
    }
    if (!formData.custom_house) {
      setErrorMsg("Please select a Custom House.");
      return;
    }

    setLoading(true);
    try {
      const token = getCookie("access_token");
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/exports/create-client-job`,
        {
          branch_code: formData.branch_code,
          exporter: formData.exporter,
          ieCode: formData.ieCode,
          job_date: formData.job_date,
          exporter_ref_no: formData.export_ref_no,
          custom_house: formData.custom_house,
          consignees: formData.consignees,
          consignmentType: formData.consignmentType,
          transportMode: formData.transportMode,
          goods_stuffed_at: formData.goods_stuffed_at,
          port_of_loading: formData.port_of_loading,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (res.data?.success) {
        const createdJob = res.data.job || res.data.data;
        if (onJobCreated) onJobCreated(createdJob);
        handleClear();
        onClose();
      } else {
        setErrorMsg(res.data?.message || "Failed to create job.");
      }
    } catch (err) {
      console.error("Error creating client export job:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to create job.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "10px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          overflow: "hidden"
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          m: 0,
          px: 3,
          py: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#ffffff"
        }}
      >
        <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
          Create New Export Job
        </span>
        <IconButton
          size="small"
          onClick={onClose}
          disabled={loading}
          sx={{ color: "#64748b", "&:hover": { color: "#0f172a" } }}
        >
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, backgroundColor: "#f8fafc" }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: "6px" }} onClose={() => setErrorMsg("")}>
            {errorMsg}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. ORGANIZATION & DIRECTORY */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={iconBadgeStyle}>
                <Business style={{ fontSize: 16, color: "#2563eb" }} />
              </span>
              <span style={cardTitleStyle}>ORGANIZATION &amp; DIRECTORY</span>
            </div>
            <div style={{ padding: "16px" }}>
              <div style={gridRowStyle}>
                {/* Exporter Name (Locked to client organization) */}
                <div style={{ flex: 1.8 }}>
                  <label style={labelStyle}>
                    Exporter Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  {orgNames.length > 1 ? (
                    <select
                      style={selectControlStyle}
                      value={formData.exporter}
                      onChange={(e) => handleOrgChange(e.target.value)}
                    >
                      {orgNames.map((org) => (
                        <option key={org} value={org}>{org}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      style={{ ...inputControlStyle, backgroundColor: "#f1f5f9", cursor: "not-allowed" }}
                      value={formData.exporter}
                      readOnly
                      title="Locked to client account"
                    />
                  )}
                </div>

                {/* IE Code / PAN */}
                <div style={{ flex: 1.2 }}>
                  <label style={labelStyle}>
                    IE Code / PAN <span style={{ color: "#ef4444" }}>*</span>
                    {availableIeCodes.length <= 1 && (
                      <span style={autoBadgeStyle}>✓ Auto-filled</span>
                    )}
                  </label>
                  {availableIeCodes.length > 1 ? (
                    <select
                      style={selectControlStyle}
                      value={formData.ieCode}
                      onChange={(e) => handleInputChange("ieCode", e.target.value)}
                    >
                      {availableIeCodes.map((ie) => (
                        <option key={ie} value={ie}>{ie}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      style={{ ...inputControlStyle, backgroundColor: "#f1f5f9", cursor: "not-allowed", fontWeight: 700 }}
                      value={formData.ieCode}
                      readOnly
                    />
                  )}
                </div>

                {/* Job Date */}
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Job Date</label>
                  <input
                    type="date"
                    style={inputControlStyle}
                    value={formData.job_date}
                    onChange={(e) => handleInputChange("job_date", e.target.value)}
                  />
                </div>

                {/* Year (Auto financial year - locked) */}
                <div style={{ flex: 0.8 }}>
                  <label style={labelStyle}>Year</label>
                  <input
                    style={{ ...inputControlStyle, backgroundColor: "#f1f5f9", cursor: "not-allowed", fontWeight: 700, textAlign: "center" }}
                    value={finYear}
                    readOnly
                    title="Current Financial Year"
                  />
                </div>

                {/* Branch */}
                <div style={{ flex: 1.2 }}>
                  <label style={labelStyle}>Branch</label>
                  <select
                    style={selectControlStyle}
                    value={formData.branch_code}
                    onChange={(e) => handleInputChange("branch_code", e.target.value)}
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b.code} value={b.code}>{b.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Second row: Export Ref No and Custom House */}
              <div style={{ ...gridRowStyle, marginTop: "14px" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Export Reference No</label>
                  <input
                    style={inputControlStyle}
                    placeholder="Enter Reference Number..."
                    value={formData.export_ref_no}
                    onChange={(e) => handleInputChange("export_ref_no", e.target.value)}
                  />
                </div>

                <div style={{ flex: 1.5 }}>
                  <label style={labelStyle}>
                    Custom House <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    style={selectControlStyle}
                    value={formData.custom_house}
                    onChange={(e) => handleInputChange("custom_house", e.target.value)}
                  >
                    <option value="">SELECT CUSTOM HOUSE</option>
                    {CUSTOM_HOUSES.map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. PARTY DETAILS (CONSIGNEES) */}
          <div style={{ ...cardStyle, marginTop: "16px" }}>
            <div style={cardHeaderStyle}>
              <span style={iconBadgeStyle}>
                <Group style={{ fontSize: 16, color: "#2563eb" }} />
              </span>
              <span style={cardTitleStyle}>PARTY DETAILS (CONSIGNEES)</span>
            </div>
            <div style={{ padding: "16px" }}>
              {formData.consignees.map((consignee, idx) => (
                <div key={idx} style={{ ...gridRowStyle, marginBottom: "12px", alignItems: "flex-end" }}>
                  <div style={{ flex: 1.2 }}>
                    <label style={labelStyle}>Consignee Name</label>
                    <input
                      style={inputControlStyle}
                      placeholder="Name"
                      value={consignee.consignee_name}
                      onChange={(e) => handleConsigneeChange(idx, "consignee_name", e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Address</label>
                    <input
                      style={inputControlStyle}
                      placeholder="Full Address"
                      value={consignee.consignee_address}
                      onChange={(e) => handleConsigneeChange(idx, "consignee_address", e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Country</label>
                    <input
                      style={inputControlStyle}
                      placeholder="Type country..."
                      value={consignee.consignee_country}
                      onChange={(e) => handleConsigneeChange(idx, "consignee_country", e.target.value)}
                    />
                  </div>
                  {formData.consignees.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => removeConsignee(idx)}
                      sx={{
                        color: "#ef4444",
                        border: "1px solid #fecaca",
                        bgcolor: "#fef2f2",
                        borderRadius: "6px",
                        height: "32px",
                        width: "32px",
                        "&:hover": { bgcolor: "#fee2e2" }
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </div>
              ))}

              <Button
                size="small"
                startIcon={<Add />}
                onClick={addConsignee}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "11px",
                  color: "#2563eb",
                  bgcolor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  "&:hover": { bgcolor: "#dbeafe" }
                }}
              >
                Add Consignee
              </Button>
            </div>
          </div>

          {/* 3. SHIPMENT DETAILS */}
          <div style={{ ...cardStyle, marginTop: "16px" }}>
            <div style={cardHeaderStyle}>
              <span style={iconBadgeStyle}>
                <LocalShipping style={{ fontSize: 16, color: "#2563eb" }} />
              </span>
              <span style={cardTitleStyle}>SHIPMENT DETAILS</span>
            </div>
            <div style={{ padding: "16px" }}>
              <div style={gridRowStyle}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Consignment Type</label>
                  <select
                    style={selectControlStyle}
                    value={formData.consignmentType}
                    onChange={(e) => handleConsignmentTypeChange(e.target.value)}
                  >
                    <option value="FCL">FCL</option>
                    <option value="LCL">LCL</option>
                    <option value="AIR">AIR</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Transport</label>
                  <input
                    style={{ ...inputControlStyle, backgroundColor: "#f1f5f9", cursor: "not-allowed", fontWeight: 700 }}
                    value={formData.transportMode}
                    readOnly
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Goods Stuffed At</label>
                  <select
                    style={selectControlStyle}
                    value={formData.goods_stuffed_at}
                    onChange={(e) => handleInputChange("goods_stuffed_at", e.target.value)}
                  >
                    <option value="FACTORY">FACTORY</option>
                    <option value="DOCK">DOCK</option>
                  </select>
                </div>

                <div style={{ flex: 1.5 }}>
                  <label style={labelStyle}>Port of Loading</label>
                  <select
                    style={selectControlStyle}
                    value={formData.port_of_loading}
                    onChange={(e) => handleInputChange("port_of_loading", e.target.value)}
                  >
                    <option value="">SELECT PORT</option>
                    {PORT_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "10px",
              marginTop: "20px"
            }}
          >
            <Button
              variant="outlined"
              onClick={handleClear}
              disabled={loading}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12px",
                borderColor: "#cbd5e1",
                color: "#475569",
                bgcolor: "#ffffff",
                borderRadius: "6px",
                px: 3,
                "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" }
              }}
            >
              Clear
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: "12px",
                bgcolor: "#2563eb",
                color: "#ffffff",
                borderRadius: "6px",
                px: 3,
                boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
                "&:hover": { bgcolor: "#1d4ed8" }
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                  Creating...
                </>
              ) : (
                "Create Job"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// UI Styling matching Create New Export Job
const cardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  borderLeft: "4px solid #3b82f6",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
};

const cardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 16px",
  borderBottom: "1px solid #f1f5f9",
  backgroundColor: "#f8fafc"
};

const cardTitleStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#334155",
  letterSpacing: "0.5px"
};

const iconBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  borderRadius: "6px",
  backgroundColor: "#eff6ff"
};

const gridRowStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap"
};

const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: "700",
  color: "#475569",
  marginBottom: "4px"
};

const inputControlStyle = {
  width: "100%",
  boxSizing: "border-box",
  height: "32px",
  padding: "0 10px",
  fontSize: "12px",
  color: "#1e293b",
  backgroundColor: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: "5px",
  outline: "none"
};

const selectControlStyle = {
  width: "100%",
  boxSizing: "border-box",
  height: "32px",
  padding: "0 8px",
  fontSize: "12px",
  color: "#1e293b",
  backgroundColor: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: "5px",
  outline: "none",
  cursor: "pointer"
};

const autoBadgeStyle = {
  marginLeft: "6px",
  fontSize: "10px",
  fontWeight: "700",
  color: "#059669"
};
