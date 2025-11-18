import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Divider,
  Paper,
  Tooltip,
  Slide,
  ClickAwayListener,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Calculate as CalculateIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { getJsonCookie } from "../../utils/cookies";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Custom styled components
const CalculatorIcon = styled(Box)(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.success.light,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginRight: theme.spacing(1),
}));

// Compact input field component
const CompactField = ({ id, label, tooltipText, value, onChange }) => (
  <Box sx={{ mb: 1.5, display: "flex", alignItems: "center" }}>
    <Box sx={{ width: "55%", display: "flex", alignItems: "center" }}>
      <Typography variant="body2" color="textPrimary" noWrap>
        {label}
      </Typography>
    </Box>
    <Box sx={{ width: "45%" }}>
      <TextField
        id={id}
        fullWidth
        size="small"
        type="number"
        value={value}
        onChange={onChange}
        placeholder="0.00"
        sx={{ "& .MuiOutlinedInput-root": { height: 32 } }}
      />
    </Box>
  </Box>
);

// Main NetWeightCalculator component
const NetWeightCalculator = ({
  open,
  onClose,
  jobNo,
  initialWeight = "",
  initialDuty = "",
  anchorEl = null,
  onPerKgCostUpdate,
  setPerKgCost,
  perKgCost,
}) => {
  const [loading, setLoading] = useState(false);
  const [popperOpen, setPopperOpen] = useState(false);

  // State for form inputs
  const [calculatorData, setCalculatorData] = useState({
    duty: initialDuty || "",
    shipping: "",
    detention: "",
    cfs: "",
    transport: "",
    Labour: "",
    miscellaneous: "",
    weight: initialWeight || "",
  });

  // const [perKgCost, setPerKgCost] = useState("0.00");
  const [totalCost, setTotalCost] = useState("0.00");

  console.log("per", perKgCost);
  // Animation effect when opening/closing
  useEffect(() => {
    if (open) {
      setPopperOpen(true);

      // Reset data when opened
      setCalculatorData({
        duty: initialDuty || "",
        shipping: "",
        detention: "",
        cfs: "",
        transport: "",
        Labour: "",
        weight: initialWeight || "",
      });

      if (jobNo) {
        fetchJobData(jobNo);
      }
    } else {
      setPopperOpen(false);
    }
  }, [open, jobNo, initialDuty, initialWeight]);

  // Fetch actual duty data from API
  const fetchJobData = async (jobId) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/get-duties/${jobId}`
      );

      if (response.ok) {
        const responseData = await response.json();

        if (responseData.success && responseData.data) {
          const { total_duty, job_net_weight } = responseData.data;

          setCalculatorData((prev) => ({
            ...prev,
            duty: total_duty || "0",
            weight: job_net_weight || prev.weight,
          }));
        } else {
          console.warn("API returned success false or no data");
          // Allow manual entry with initial values
          setCalculatorData((prev) => ({
            ...prev,
            duty: initialDuty || "",
            weight: initialWeight || prev.weight,
          }));
        }
      } else {
        console.warn("API returned error status:", response.status);
        // Enable manual entry on API error
        setCalculatorData((prev) => ({
          ...prev,
          duty: initialDuty || "",
          weight: initialWeight || prev.weight,
        }));
      }
    } catch (error) {
      console.error("Error fetching duty data:", error);
      // Enable manual entry on any error
      setCalculatorData((prev) => ({
        ...prev,
        duty: initialDuty || "",
        weight: initialWeight || prev.weight,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (e) => {
    const { id, value } = e.target;
    setCalculatorData((prev) => ({
      ...prev,
      [id]: value,
    }));

    // Auto-calculate when duty or weight changes
    if ((id === "duty" || id === "weight") && jobNo && value) {
      await triggerAutoCalculation(id, value);
    }
  };

  // Function to trigger auto-calculation via API when duty or weight changes
  const triggerAutoCalculation = async (fieldId, fieldValue) => {
    try {
      const currentWeight =
        fieldId === "weight" ? fieldValue : calculatorData.weight;
      const currentDuty = fieldId === "duty" ? fieldValue : calculatorData.duty;

      // Only trigger if we have both duty and weight
      if (
        !currentDuty ||
        !currentWeight ||
        parseFloat(currentDuty) <= 0 ||
        parseFloat(currentWeight) <= 0
      ) {
        return;
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/api/update-job-duty-weight/${jobNo}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            year: "25-26", // You might want to get this dynamically
            total_duty: currentDuty,
            job_net_weight: currentWeight,
            ie_code_no: (() => {
              try {
                const user = getJsonCookie("exim_user");
                return user?.primary_ie_code || user?.ie_code_no || null;
              } catch (e) {
                return null;
              }
            })(), // Get user's IE code from cookies
          }),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success && responseData.data.per_kg_cost) {
          const newPerKgCost = responseData.data.per_kg_cost;
          setPerKgCost(newPerKgCost);

          // Notify parent component about the updated per kg cost
          if (onPerKgCostUpdate) {
            onPerKgCostUpdate(newPerKgCost);
          }
        }
      }
    } catch (error) {
      console.error("Error triggering auto-calculation:", error);
    }
  };

  const calculateCost = () => {
    const duty = parseFloat(calculatorData.duty) || 0;
    const shipping = parseFloat(calculatorData.shipping) || 0;
    const customclearancecharges =
      parseFloat(calculatorData.customclearancecharges) || 0;
    const detention = parseFloat(calculatorData.detention) || 0;
    const cfs = parseFloat(calculatorData.cfs) || 0;
    const transport = parseFloat(calculatorData.transport) || 0;
    const Labour = parseFloat(calculatorData.Labour) || 0;
    const miscellaneous = parseFloat(calculatorData.miscellaneous) || 0;
    const weight = parseFloat(calculatorData.weight) || 0;

    const totalINR =
      duty +
      shipping +
      detention +
      cfs +
      transport +
      Labour +
      miscellaneous +
      customclearancecharges;
    setTotalCost(totalINR.toFixed(2));

    const perKG = weight > 0 ? (totalINR / weight).toFixed(2) : "0.00";
    setPerKgCost(perKG);

    // Notify parent component about the updated per kg cost
    if (onPerKgCostUpdate) {
      onPerKgCostUpdate(perKG);
    }
  };

  // Calculate cost whenever input changes
  useEffect(() => {
    calculateCost();
  }, [calculatorData]);

  // Handle closing with escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Regular dialog for center positioning (removed Popper implementation for consistency)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          maxWidth: 600,
          position: "fixed",
          m: 0,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          overflowY: "visible",
        },
      }}
      sx={{
        zIndex: 9999,
        "& .MuiDialog-container": {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
      }}
    >
      {renderCalculatorContent()}
    </Dialog>
  );

  // Common calculator content for dialog
  function renderCalculatorContent() {
    return (
      <>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "primary.main",
            color: "white",
            px: 2,
            py: 1.5,
          }}
        >
          <Typography variant="subtitle1">Net Weight Calculator</Typography>
          <IconButton
            size="small"
            onClick={onClose}
            edge="end"
            sx={{ color: "white" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Content */}
        <DialogContent sx={{ p: 2, pt: 1.5 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box>
              {jobNo && (
                <Box sx={{ mb: 1.5, display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ width: "45%" }}
                  >
                    Job Reference:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {jobNo}
                  </Typography>
                </Box>
              )}

              {/* Duty Amount */}
              <Box sx={{ mb: 1.5, display: "flex", alignItems: "center" }}>
                <Box
                  sx={{ width: "55%", display: "flex", alignItems: "center" }}
                >
                  <Typography
                    variant="body2"
                    color="textPrimary"
                    fontWeight="medium"
                    noWrap
                  >
                    Duty Amount (₹)
                  </Typography>
                </Box>
                <Box sx={{ width: "45%" }}>
                  <TextField
                    id="duty"
                    fullWidth
                    size="small"
                    type="number"
                    value={calculatorData.duty}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    InputProps={{ sx: { height: 32 } }}
                    sx={{ "& .MuiOutlinedInput-root": { height: 32 } }}
                  />
                </Box>
              </Box>

              {/* Other charges using the compact field component */}
              <CompactField
                id="shipping"
                label="Shipping Line Charges (₹)"
                tooltipText="All charges from the shipping line"
                value={calculatorData.shipping}
                onChange={handleInputChange}
              />

              <CompactField
                id="customclearancecharges"
                label="Custom Clearance Charges (₹)"
                tooltipText="Custom clearance charges"
                value={calculatorData.customclearancecharges}
                onChange={handleInputChange}
              />

              <CompactField
                id="detention"
                label="Detention Charges (₹)"
                tooltipText="Container detention charges"
                value={calculatorData.detention}
                onChange={handleInputChange}
              />

              <CompactField
                id="cfs"
                label="CFS/ICD Charges (₹)"
                tooltipText="Container freight station or inland container depot charges"
                value={calculatorData.cfs}
                onChange={handleInputChange}
              />

              <CompactField
                id="transport"
                label="Transportation Charges (₹)"
                tooltipText="Costs for transporting containers"
                value={calculatorData.transport}
                onChange={handleInputChange}
              />

              <CompactField
                id="Labour"
                label="Labour Charges (₹)"
                tooltipText="Labour costs for loading/unloading"
                value={calculatorData.Labour}
                onChange={handleInputChange}
              />

              <CompactField
                id="miscellaneous"
                label="Miscellaneous Charges (₹)"
                tooltipText="Any other additional charges"
                value={calculatorData.miscellaneous}
                onChange={handleInputChange}
              />

              <CompactField
                id="weight"
                label="Net Weight (KG)"
                tooltipText="Net weight of the shipment in kilograms"
                value={calculatorData.weight}
                onChange={handleInputChange}
              />

              {/* Summary (no divider, just spacing) */}
              <Box sx={{ mt: 2 }} />

              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" fontWeight="medium">
                  Total Cost (₹)
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {totalCost || "0.00"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" fontWeight="medium">
                  Per KG Cost (₹)
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {perKgCost || "0.00"}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ p: 2, pt: 1, justifyContent: "center" }}>
          {/* <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<CalculateIcon />}
            onClick={calculateCost}
            sx={{ width: "100%" }}
          >
            RECALCULATE
          </Button> */}
        </DialogActions>
      </>
    );
  }
};

export default NetWeightCalculator;
