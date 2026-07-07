import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  Paper,
  Divider,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import Swal from "sweetalert2";
import EwayBillGenerate from "../EwayBillGenerate";

const API = process.env.REACT_APP_API_STRING;

/**
 * Determines EWB status for a container
 */
const getEwbStatus = (container) => {
  const ewb = container?.eWay_bill;
  if (!ewb || ewb === "") return { status: "none", label: "No EWB", color: "default" };
  // If it's an object ID or number string, it means generated
  return { status: "generated", label: "EWB Generated", color: "success" };
};

/**
 * EwayBillMultiContainerDialog
 *
 * Props:
 * - open: boolean
 * - onClose: function
 * - prData: PR record (from Example.jsx row.original)
 * - containers: array of container objects
 * - onSuccess: callback when EWB is generated/updated
 */
const EwayBillMultiContainerDialog = ({ open, onClose, prData, containers, onSuccess }) => {
  // --- State ---
  const [step, setStep] = useState("select"); // 'select' | 'ewb-form'
  const [selectedIds, setSelectedIds] = useState([]);
  const [boeCalcData, setBoeCalcData] = useState(null);
  const [boeCalcLoading, setBoeCalcLoading] = useState(false);
  const [boeCalcError, setBoeCalcError] = useState("");
  const [userWeights, setUserWeights] = useState({}); // containerId -> weight override
  const [ewbDialogData, setEwbDialogData] = useState(null);

  // Active containers (with tr_no)
  const activeContainers = useMemo(
    () => (containers || []).filter((c) => c.tr_no && c.tr_no !== ""),
    [containers]
  );

  // Is this a single-container scenario?
  const isSingleContainer = activeContainers.length === 1;

  const pending = useMemo(
    () => activeContainers.filter((c) => !c.eWay_bill || c.eWay_bill === ""),
    [activeContainers]
  );
  const pendingIds = useMemo(() => pending.map((c) => c._id), [pending]);
  const allPendingSelected = useMemo(
    () => pendingIds.length > 0 && pendingIds.every((id) => selectedIds.includes(id)),
    [pendingIds, selectedIds]
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // Auto-select pending containers (those without an existing e-way bill number)
      if (isSingleContainer) {
        const hasEwb = activeContainers[0]?.eWay_bill && activeContainers[0]?.eWay_bill !== "";
        setSelectedIds(hasEwb ? [] : [activeContainers[0]?._id]);
      } else {
        setSelectedIds(pendingIds);
      }
      setStep("select");
      setBoeCalcData(null);
      setBoeCalcError("");
      setUserWeights({});
      setEwbDialogData(null);
    }
  }, [open, isSingleContainer, activeContainers, pendingIds]);

  // --- Selection Handlers ---
  const toggleContainer = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (allPendingSelected) {
      // Deselect all pending
      setSelectedIds((prev) => prev.filter((id) => !pendingIds.includes(id)));
    } else {
      // Select all pending
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pendingIds])));
    }
  };

  const selectedContainers = useMemo(
    () => activeContainers.filter((c) => selectedIds.includes(c._id)),
    [activeContainers, selectedIds]
  );

  const allSelected = selectedIds.length === activeContainers.length;

  // --- Fetch BOE Value Calculation from Backend ---
  const fetchBoeCalc = useCallback(async () => {
    if (!prData?.document_no) return;
    try {
      setBoeCalcLoading(true);
      setBoeCalcError("");

      const rawDate = prData?.document_date || prData?.be_date || prData?.boe_date || "";
      let docDate = "";
      if (rawDate) {
        const s = String(rawDate).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          docDate = s;
        } else {
          const match = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
          if (match) {
            docDate = `${match[3]}-${match[2]}-${match[1]}`;
          } else {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
              docDate = d.toISOString().split("T")[0];
            }
          }
        }
      }
      if (!docDate) {
        docDate = new Date().toISOString().split("T")[0];
      }

      const response = await axios.get(
        `${API}/eway-bill/boe-value-calc?document_no=${encodeURIComponent(prData.document_no)}&be_date=${docDate}`
      );
      if (response.data.success) {
        setBoeCalcData(response.data.data);
      } else {
        setBoeCalcError(response.data.message || "Failed to fetch BOE values");
      }
    } catch (error) {
      console.error("BOE value calc error:", error);
      setBoeCalcError(
        error.response?.data?.message || "Failed to fetch BOE values. You can still proceed with manual entry."
      );
    } finally {
      setBoeCalcLoading(false);
    }
  }, [prData?.document_no]);

  // Fetch BOE calc on dialog open (only for imports with document_no)
  useEffect(() => {
    if (open && prData?.document_no) {
      fetchBoeCalc();
    }
  }, [open, fetchBoeCalc]);

  // --- Calculate Assessable Value ---
  const calculateAssessableValue = useCallback(() => {
    if (!boeCalcData) return null;

    const { perKgValue, totalValue, grossWeight, assessableValue } = boeCalcData;

    if (allSelected || activeContainers.length === 1) {
      // Case A: All containers → use total assessable value
      return {
        value: assessableValue,
        type: "total",
        label: "Total Assessable Value (all containers)",
      };
    }

    // Case B: Partial containers → proportional by weight
    let totalContainerWeight = 0;
    selectedContainers.forEach((c) => {
      const w = parseFloat(userWeights[c._id]) || parseFloat(c.gross_weight) || 0;
      totalContainerWeight += w;
    });

    if (totalContainerWeight <= 0 || perKgValue <= 0) {
      return {
        value: 0,
        type: "proportional",
        label: "Proportional (enter container weights)",
      };
    }

    const proportionalValue = perKgValue * totalContainerWeight;
    return {
      value: parseFloat(proportionalValue.toFixed(2)),
      type: "proportional",
      label: `Proportional: ₹${perKgValue.toFixed(2)}/kg × ${totalContainerWeight.toFixed(2)} kg`,
    };
  }, [boeCalcData, allSelected, activeContainers, selectedContainers, userWeights]);

  const assessableResult = calculateAssessableValue();

  // --- Determine EWB action for selected containers ---
  const getEwbAction = useCallback(() => {
    if (selectedContainers.length === 0) return null;

    const hasExistingEwb = selectedContainers.some((c) => c.eWay_bill && c.eWay_bill !== "");
    const allHaveEwb = selectedContainers.every((c) => c.eWay_bill && c.eWay_bill !== "");

    if (allHaveEwb) {
      return {
        action: "update",
        label: "Update Part B / Extend Validity",
        description: "All selected containers already have E-Way Bills. You can update Part B or extend validity.",
      };
    }

    if (hasExistingEwb) {
      return {
        action: "mixed",
        label: "Mixed: Some have EWB",
        description: "Some containers have existing E-Way Bills. Select only containers without EWB to generate, or only those with EWB to update.",
      };
    }

    return {
      action: "generate",
      label: "Generate New E-Way Bill",
      description: "No existing E-Way Bills found. A new E-Way Bill will be generated.",
    };
  }, [selectedContainers]);

  const ewbAction = getEwbAction();

  // --- Proceed to EWB Form ---
  const handleProceed = () => {
    if (selectedContainers.length === 0) {
      Swal.fire("Warning", "Please select at least one container", "warning");
      return;
    }

    if (ewbAction?.action === "mixed") {
      Swal.fire("Mixed Selection", "Please select containers that are all in the same state (all with EWB or all without EWB).", "warning");
      return;
    }

    const existingEwb = selectedContainers[0]?.eWay_bill || "";
    const compositeId = prData?._id && selectedContainers[0]?._id
      ? `${prData._id}-${selectedContainers[0]._id}`
      : prData?._id;

    setEwbDialogData({
      action: ewbAction?.action === "update" ? "update" : "generate",
      existingEwb: existingEwb,
      lrId: compositeId,
      prData: prData,
      containerId: selectedContainers[0]?._id,
      selectedContainers: selectedContainers,
      assessableValue: assessableResult?.value || 0,
      hideTabs: isSingleContainer,
    });
    setStep("ewb-form");
  };

  // --- Handle single container auto-proceed ---
  useEffect(() => {
    if (open && isSingleContainer && activeContainers.length === 1) {
      // Auto-detect action for single container
      const container = activeContainers[0];
      const hasEwb = container.eWay_bill && container.eWay_bill !== "";

      const compositeId = prData?._id && container._id
        ? `${prData._id}-${container._id}`
        : prData?._id;

      setEwbDialogData({
        action: hasEwb ? "update" : "generate",
        existingEwb: hasEwb ? container.eWay_bill : "",
        lrId: compositeId,
        prData: prData,
        containerId: container._id,
        selectedContainers: [container],
        assessableValue: boeCalcData?.assessableValue || 0,
        hideTabs: true,
      });
      setStep("ewb-form");
    }
  }, [open, isSingleContainer, activeContainers, prData, boeCalcData]);

  // --- Render ---
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={step === "ewb-form" ? "lg" : "md"}
      fullWidth
      PaperProps={{ style: { minHeight: step === "ewb-form" ? "80vh" : "auto" } }}
    >
      {step === "select" && (
        <>
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6" component="span">
                Generate E-Way Bill
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                PR: {prData?.pr_no || "N/A"} | BOE: {prData?.document_no || "N/A"}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            {/* BOE Calc Status */}
            {boeCalcLoading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">Fetching BOE assessable values...</Typography>
              </Box>
            )}
            {boeCalcError && (
              <Alert severity="warning" sx={{ mb: 2, fontSize: "0.8rem" }}>{boeCalcError}</Alert>
            )}

            {/* BOE Calculation Summary */}
            {boeCalcData && (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "#f0f9ff", borderColor: "#93c5fd" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e40af", mb: 0.5 }}>
                  BOE Value Summary
                </Typography>
                <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", fontSize: "0.82rem" }}>
                  <span><strong>Assessable Value:</strong> ₹{boeCalcData.assessableValue?.toLocaleString()}</span>
                  <span><strong>BCD:</strong> ₹{boeCalcData.bcd?.toLocaleString()}</span>
                  <span><strong>SWS:</strong> ₹{boeCalcData.sws?.toLocaleString()}</span>
                  <span><strong>IGST:</strong> ₹{boeCalcData.igst?.toLocaleString()} ({boeCalcData.igstRate}%)</span>
                  <span><strong>Total (Y):</strong> ₹{boeCalcData.totalValue?.toLocaleString()}</span>
                  <span><strong>Gross Wt:</strong> {boeCalcData.grossWeight} kg</span>
                  <span><strong>Per KG:</strong> ₹{boeCalcData.perKgValue?.toFixed(2)}</span>
                </Box>
              </Paper>
            )}

            {/* Container Selection Table */}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              Select Container(s) for E-Way Bill
            </Typography>

            <Table size="small" sx={{ "& .MuiTableCell-root": { py: 0.8, px: 1 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allPendingSelected && pending.length > 0}
                      indeterminate={selectedIds.some((id) => pendingIds.includes(id)) && !allPendingSelected}
                      onChange={toggleAll}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>TR No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Container No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Gross Weight (kg)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Vehicle No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>EWB Status</TableCell>
                  {!allSelected && selectedIds.length > 0 && boeCalcData && (
                    <TableCell sx={{ fontWeight: 700 }}>Actual Weight (kg)</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeContainers.map((container) => {
                  const ewbStatus = getEwbStatus(container);
                  const isSelected = selectedIds.includes(container._id);
                  const showWeightInput = !allSelected && isSelected && boeCalcData;

                  return (
                    <TableRow
                      key={container._id}
                      hover
                      selected={isSelected}
                      onClick={() => toggleContainer(container._id)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={isSelected} size="small" />
                      </TableCell>
                      <TableCell>{container.tr_no || "—"}</TableCell>
                      <TableCell>{container.container_number || "—"}</TableCell>
                      <TableCell>{container.gross_weight || "—"}</TableCell>
                      <TableCell>{container.vehicle_no || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={ewbStatus.label}
                          size="small"
                          color={ewbStatus.color}
                          variant={ewbStatus.status === "none" ? "outlined" : "filled"}
                          sx={{ fontSize: "0.7rem", height: 22 }}
                        />
                      </TableCell>
                      {!allSelected && selectedIds.length > 0 && boeCalcData && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {showWeightInput ? (
                            <TextField
                              size="small"
                              type="number"
                              value={userWeights[container._id] || container.gross_weight || ""}
                              onChange={(e) => {
                                setUserWeights((prev) => ({
                                  ...prev,
                                  [container._id]: e.target.value,
                                }));
                              }}
                              inputProps={{ min: 0, step: "0.01" }}
                              sx={{ width: 120 }}
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {activeContainers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.disabled" }}>
                      No containers with LR (TR No) found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Assessable Value Result */}
            {assessableResult && selectedIds.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#f0fdf4", borderColor: "#86efac" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#166534" }}>
                    Calculated Bill Value (Assessable + BCD + SWS)
                  </Typography>
                  <Typography variant="h6" sx={{ color: "#15803d", fontWeight: 800 }}>
                    ₹{assessableResult.value?.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {assessableResult.label.replace("Assessable Value", "Value (Incl. BCD & SWS)")}
                  </Typography>
                </Paper>
              </>
            )}

            {/* EWB Action Info */}
            {ewbAction && selectedIds.length > 0 && (
              <Alert
                severity={ewbAction.action === "mixed" ? "warning" : ewbAction.action === "update" ? "info" : "success"}
                sx={{ mt: 2, fontSize: "0.82rem" }}
              >
                <strong>{ewbAction.label}</strong> — {ewbAction.description}
              </Alert>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button
              variant="contained"
              onClick={handleProceed}
              disabled={selectedIds.length === 0 || ewbAction?.action === "mixed"}
              sx={{ minWidth: 160 }}
            >
              {ewbAction?.action === "update" ? "Update Part B" : "Generate E-Way Bill"}
            </Button>
          </DialogActions>
        </>
      )}

      {/* Step 2: EWB Generation Form */}
      {step === "ewb-form" && ewbDialogData && (
        <DialogContent style={{ padding: 0 }}>
          <EwayBillGenerate
            asDialog={true}
            action={ewbDialogData.action}
            existingEwb={ewbDialogData.existingEwb}
            prefilledLrId={ewbDialogData.lrId}
            prData={ewbDialogData.prData}
            prefilledAssessableValue={ewbDialogData.assessableValue}
            hideTabs={ewbDialogData.hideTabs}
            onClose={() => {
              onClose();
            }}
            onSuccess={(data) => {
              if (onSuccess) onSuccess(data);
              onClose();
            }}
          />
        </DialogContent>
      )}
    </Dialog>
  );
};

export default EwayBillMultiContainerDialog;
