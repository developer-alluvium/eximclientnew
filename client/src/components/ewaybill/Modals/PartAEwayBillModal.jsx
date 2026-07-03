import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Checkbox,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import axios from "axios";
import Swal from "sweetalert2";
import EwayBillGenerate from "../EwayBillGenerate";
import {
  getContainerKey,
  getContainerNo,
  getExistingEwbForContainer as findEwbForContainer,
  getPendingContainers,
  hasAnyCombinedEwb,
  isCombinedEwb,
} from "../ewbContainerCoverage";

const parseAnyDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr);
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
};

const getContainerWeight = (c) =>
  parseFloat(c.container_gross_weight || c.gross_weight || c.net_weight || 0);

const PartAEwayBillModal = ({
  open,
  onClose,
  beNo,
  beDate,
  selectedContainers,
  initialExistingEwbs = [],
  onViewExisting,
  onSuccess,
  jobId,
}) => {
  const [step, setStep] = useState("select");
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [selectionMode, setSelectionMode] = useState("all");
  const [activeContainers, setActiveContainers] = useState([]);
  const [existingEwbs, setExistingEwbs] = useState([]);
  const [ewbLoading, setEwbLoading] = useState(false);

  const allContainers = useMemo(() => selectedContainers || [], [selectedContainers]);
  const hasMultiple = allContainers.length > 1;

  const parsedDate = parseAnyDate(beDate);
  const formattedDate = parsedDate.toISOString().split("T")[0];

  const getExistingEwbForContainer = useCallback(
    (cont) => findEwbForContainer(cont, existingEwbs, beNo),
    [existingEwbs, beNo]
  );

  const combinedEwbExists = useMemo(
    () => hasAnyCombinedEwb(existingEwbs, beNo),
    [existingEwbs, beNo]
  );

  const pendingContainers = useMemo(
    () => getPendingContainers(allContainers, existingEwbs, beNo),
    [allContainers, existingEwbs, beNo]
  );

  useEffect(() => {
    if (!open || !beNo) return;

    if (initialExistingEwbs?.length > 0) {
      setExistingEwbs(initialExistingEwbs);
      setEwbLoading(false);
      return;
    }

    const fetchExistingEwbs = async () => {
      try {
        setEwbLoading(true);
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/eway-bill/list?search=${encodeURIComponent(beNo)}`
        );
        if (res.data?.success && Array.isArray(res.data.data)) {
          setExistingEwbs(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching existing E-Way Bills in background:", error);
      } finally {
        setEwbLoading(false);
      }
    };

    fetchExistingEwbs();
  }, [open, beNo, initialExistingEwbs]);

  useEffect(() => {
    if (!open) {
      setStep("select");
      setCheckedKeys([]);
      setActiveContainers([]);
      setExistingEwbs([]);
      setSelectionMode("all");
      return;
    }
    if (!hasMultiple) {
      setActiveContainers(allContainers);
      setStep("form");
    } else {
      setStep("select");
    }
  }, [open, hasMultiple, allContainers]);

  useEffect(() => {
    if (open && combinedEwbExists) {
      setSelectionMode("selected");
    }
  }, [open, combinedEwbExists]);

  useEffect(() => {
    if (!open || !hasMultiple || ewbLoading) return;
    setCheckedKeys(
      pendingContainers.map((c) => {
        const idx = allContainers.indexOf(c);
        return getContainerKey(c, idx >= 0 ? idx : 0);
      })
    );
  }, [open, hasMultiple, ewbLoading, pendingContainers, allContainers]);

  const resolveContainerByKey = useCallback(
    (key) => {
      const idx = allContainers.findIndex((c, i) => getContainerKey(c, i) === key);
      return idx >= 0 ? allContainers[idx] : null;
    },
    [allContainers]
  );

  const checkedContainers = useMemo(
    () => checkedKeys.map(resolveContainerByKey).filter(Boolean),
    [checkedKeys, resolveContainerByKey]
  );

  const handleToggleContainer = (cont, idx) => {
    const key = getContainerKey(cont, idx);
    if (getExistingEwbForContainer(cont)) return;
    setCheckedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllPending = (checked) => {
    if (checked) {
      setCheckedKeys(
        pendingContainers.map((c) => {
          const idx = allContainers.indexOf(c);
          return getContainerKey(c, idx >= 0 ? idx : 0);
        })
      );
    } else {
      setCheckedKeys([]);
    }
  };

  const handleModeChange = (_, newMode) => {
    if (newMode !== null) setSelectionMode(newMode);
  };

  const handleContinue = () => {
    if (checkedContainers.length === 0) {
      Swal.fire("Selection Required", "Please select at least one container.", "warning");
      return;
    }
    if (selectionMode === "all" && combinedEwbExists) {
      Swal.fire(
        "Combined EWB Already Exists",
        "A combined E-Way Bill already exists for this Bill of Entry (one EWB per BE number). Use Individual mode to generate Delivery Challan EWBs for the remaining containers.",
        "info"
      );
      return;
    }
    setActiveContainers(checkedContainers);
    setStep("form");
  };

  const handleBackToSelect = () => {
    setCheckedKeys(
      activeContainers.map((c) => {
        const idx = allContainers.indexOf(c);
        return getContainerKey(c, idx >= 0 ? idx : 0);
      })
    );
    setStep("select");
  };

  const handleClose = () => {
    setStep(hasMultiple ? "select" : "form");
    onClose();
  };

  const handleFormSuccess = () => {
    if (onSuccess) onSuccess();
    handleClose();
  };

  const mockPrData = {
    import_export: "import",
    document_no: beNo,
    document_date: formattedDate,
    container_details: activeContainers[0] || null,
    containers: activeContainers,
  };

  const containerSelectionMode =
    selectionMode === "all" ? "all" : "selected";

  const renderContainerSelection = () => (
    <Box sx={{ p: 3, bgcolor: "#f8fafc", minHeight: 280 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", mb: 0.5 }}>
        Select Containers for E-Way Bill
      </Typography>
      <Typography sx={{ fontSize: "0.82rem", color: "#64748b", mb: 2 }}>
        BE {beNo} · {allContainers.length} container{allContainers.length !== 1 ? "s" : ""} ·{" "}
        {pendingContainers.length} pending
        {existingEwbs.length > 0 && ` · ${existingEwbs.length} EWB(s) on file`}
      </Typography>

      {ewbLoading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Checking existing E-Way Bills...
          </Typography>
        </Box>
      )}

      {combinedEwbExists && (
        <Alert severity="info" sx={{ mb: 2, fontSize: "0.82rem" }}>
          Combined E-Way Bill <strong>{existingEwbs.find((e) => isCombinedEwb(e, beNo))?.ewbNo || ""}</strong> already
          exists for this BE. Select the remaining containers and use <strong>Individual</strong> mode — GST allows only
          one combined EWB per BE number.
        </Alert>
      )}

      {pendingContainers.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          All containers on this job already have E-Way Bills. Close and use Preview to view them.
        </Alert>
      ) : (
        <>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1.5, gap: 0.5 }}>
            <Checkbox
              size="small"
              disabled={ewbLoading}
              checked={
                pendingContainers.length > 0 &&
                checkedKeys.length === pendingContainers.length
              }
              indeterminate={
                checkedKeys.length > 0 && checkedKeys.length < pendingContainers.length
              }
              onChange={(e) => handleSelectAllPending(e.target.checked)}
              sx={{ p: 0.5 }}
            />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
              Select All Pending ({pendingContainers.length})
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2.5 }}>
            {allContainers.map((cont, idx) => {
              const key = getContainerKey(cont, idx);
              const cNo = getContainerNo(cont) || "—";
              const weight = getContainerWeight(cont);
              const existingEwb = getExistingEwbForContainer(cont);
              const isSelected = checkedKeys.includes(key);
              const isDisabled = !!existingEwb;

              return (
                <Box
                  key={key}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 1.5,
                    border: `1px solid ${
                      isDisabled ? "#bbf7d0" : isSelected ? "#bfdbfe" : "#e2e8f0"
                    }`,
                    bgcolor: isDisabled ? "#f0fdf4" : isSelected ? "#eff6ff" : "#fff",
                    transition: "all .15s",
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={isSelected}
                    onChange={() => handleToggleContainer(cont, idx)}
                    disabled={isDisabled || ewbLoading}
                    sx={{ p: 0.5, flexShrink: 0 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                      {cNo}
                    </Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {weight > 0 ? `${weight.toLocaleString("en-IN")} kg` : "Weight not set"}
                      {cont.size ? ` · ${cont.size}` : ""}
                    </Typography>
                  </Box>
                  <Chip
                    label={
                      existingEwb
                        ? isCombinedEwb(existingEwb, beNo)
                          ? `Combined · ${existingEwb.ewbNo || "EWB"}`
                          : existingEwb.ewbNo || "Generated"
                        : "Pending"
                    }
                    size="small"
                    color={existingEwb ? "success" : "warning"}
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                  />
                </Box>
              );
            })}
          </Box>

          <Box
            sx={{
              p: 2,
              mb: 2,
              bgcolor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 1.5,
            }}
          >
            <Typography variant="body2" fontWeight="700" sx={{ color: "#475569", mb: 1.5 }}>
              Generation Mode
            </Typography>
            <ToggleButtonGroup
              value={selectionMode}
              exclusive
              onChange={handleModeChange}
              size="small"
              color="primary"
              sx={{ flexWrap: "wrap" }}
            >
              <ToggleButton
                value="all"
                disabled={combinedEwbExists}
                sx={{ textTransform: "none", fontWeight: 600, px: 2 }}
              >
                Combined — one EWB for selected containers
              </ToggleButton>
              <ToggleButton value="selected" sx={{ textTransform: "none", fontWeight: 600, px: 2 }}>
                Individual — separate EWB per selected container
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", mt: 1.5, fontStyle: "italic" }}>
              {combinedEwbExists
                ? "A combined EWB already exists on this BE — use Individual mode for remaining containers."
                : selectionMode === "all"
                ? "Selected containers move on one E-Way Bill (BE number, proportional assessable value)."
                : "Each selected container gets its own Delivery Challan E-Way Bill (BE-CH-xxxx)."}
            </Typography>
          </Box>
        </>
      )}

      <Box
        sx={{
          pt: 2,
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>
          {checkedContainers.length > 0 ? (
            <>
              <strong>{checkedContainers.length}</strong> selected
              {selectionMode === "all"
                ? " → 1 E-Way Bill"
                : ` → ${checkedContainers.length} E-Way Bill(s)`}
            </>
          ) : (
            "Select containers to continue"
          )}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {existingEwbs.length > 0 && onViewExisting && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => onViewExisting(existingEwbs)}
              sx={{ textTransform: "none", fontSize: "0.78rem", borderRadius: 1 }}
            >
              View Existing EWB ({existingEwbs.length})
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={handleClose}
            sx={{ textTransform: "none", fontSize: "0.78rem", borderRadius: 1 }}
          >
            Cancel
          </Button>
          {pendingContainers.length > 0 && (
            <Button
              variant="contained"
              size="small"
              onClick={handleContinue}
              disabled={checkedContainers.length === 0 || ewbLoading}
              sx={{
                textTransform: "none",
                fontSize: "0.78rem",
                fontWeight: 600,
                borderRadius: 1,
                bgcolor: "#1e40af",
              }}
            >
              Continue to Part A Preview
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
      <DialogTitle
        sx={{
          py: 1.5,
          px: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {step === "form" && hasMultiple && (
            <IconButton onClick={handleBackToSelect} size="small" sx={{ color: "#64748b", mr: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Box>
            <Typography variant="h6" fontWeight="800" sx={{ color: "#1e293b" }}>
              Generate E-Way Bill
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b", mt: 0.3 }}>
              {step === "select"
                ? "E-Way Bill — Select Containers"
                : "E-Way Bill Part A Preview"}
              {step === "form" && activeContainers.length > 0 && (
                <>
                  {" "}
                  · {activeContainers.length} container{activeContainers.length !== 1 ? "s" : ""} ·{" "}
                  {containerSelectionMode === "all" ? "Combined" : "Individual"}
                </>
              )}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: "#64748b" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, bgcolor: "#f1f5f9" }}>
        {step === "select" && hasMultiple ? (
          renderContainerSelection()
        ) : (
          activeContainers.length > 0 && (
            <EwayBillGenerate
              asDialog={true}
              action="generate"
              prefilledDocNo={beNo}
              prefilledDocDate={formattedDate}
              onClose={handleClose}
              onSuccess={handleFormSuccess}
              hideTabs={true}
              boeOnly={true}
              partAOnlyDefault={true}
              selectedContainers={activeContainers}
              containerSelectionMode={containerSelectionMode}
              prData={mockPrData}
              jobId={jobId}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PartAEwayBillModal;
