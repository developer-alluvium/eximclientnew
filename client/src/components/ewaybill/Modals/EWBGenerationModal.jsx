
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stepper, Step, StepLabel, TextField,
  Grid, Typography, IconButton, CircularProgress
} from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';

// Helper for states
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Ladakh", "Lakshadweep",
  "Puducherry", "Other Territory"
];

const normalizeState = (stateName) => {
  if (!stateName) return "";
  if (stateName.toLowerCase() === "uttrakhand") return "Uttarakhand";
  const match = INDIAN_STATES.find(s => s.toLowerCase() === stateName.toLowerCase());
  return match || stateName;
};

const steps = ['Parties & Route', 'Item Details', 'Transport & Review'];

const EWBGenerationModal = ({ open, onClose, lrData, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatorRole, setGeneratorRole] = useState('consignor'); // 'consignor' | 'consignee' | 'transporter'
  const [formData, setFormData] = useState({
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
    consignorCity: "",
    consignorPincode: "",

    consigneeName: "",
    consigneeGstin: "",
    consigneeState: "",
    consigneeAddress1: "",
    consigneeCity: "",
    consigneePincode: "",

    items: [{
      productName: "Goods",
      productDesc: "",
      hsnCode: "",
      quantity: 1,
      qtyUnit: "NOS",
      taxableAmount: "",
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      cessRate: 0,
    }],

    totalInvoiceValue: "",
    otherAmount: 0,

    transporterId: "",
    transporterName: "",
    transporterDocNo: "",
    transporterDocDate: new Date().toISOString().split('T')[0],
    transportDistance: "",
    vehicleNo: "",
    vehicleType: "Regular"
  });

  // Calculate taxes on mount/update
  useEffect(() => {
    if (lrData && open) {
      populateFromLR(lrData);
    }
  }, [lrData, open]);

  const populateFromLR = (lr) => {
    setFormData(prev => ({
      ...prev,
      documentNumber: lr.pr_no || prev.documentNumber,
      documentDate: (lr.pr_date && !isNaN(new Date(lr.pr_date).getTime()))
        ? new Date(lr.pr_date).toISOString().split('T')[0]
        : prev.documentDate,

      consignorName: lr.consignorName || "", // Flattened in PendingLRsTab
      consignorGstin: lr.consignorGstin || "",
      // Note: Full address details might need fetching or be present in LR
      // For now we map what we have from the aggregate pipeline

      // Update: Does lrData include full address?
      // PendingLRs aggregation only projected name/gstin.
      // We might need to fetch full details if missing.

      consigneeName: lr.consigneeName || "",
      consigneeGstin: lr.consigneeGstin || "",

      vehicleNo: lr.vehicleNo || "",

      // Route
      consignorCity: lr.fromCity || "",
      consignorState: normalizeState(lr.fromState || ""),
      consigneeCity: lr.toCity || "",
      consigneeState: normalizeState(lr.toState || ""),
    }));

    // If full details are missing, we should fetch them.
    // Ideally we call /lr-details here if needed.
    if (lr._id) fetchFullLRDetails(lr._id, lr.containerIndex);
  };

  const fetchFullLRDetails = async (lrId, containerIndex) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/lr-details?lrId=${lrId}&containerIndex=${containerIndex}`
      );
      if (response.data.success && response.data.data) {
        const fullLr = response.data.data;
        const container = fullLr.container_details;

        setFormData(prev => ({
          ...prev,
          // Document
          documentNumber: fullLr.pr_no || "",
          documentDate: (fullLr.pr_date && !isNaN(new Date(fullLr.pr_date).getTime()))
            ? new Date(fullLr.pr_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],

          // Consignor
          consignorName: fullLr.consignor?.name || "",
          consignorGstin: fullLr.consignor?.gstin || "",
          consignorState: normalizeState(fullLr.consignor?.branches?.[0]?.state || ""),
          consignorAddress1: fullLr.consignor?.branches?.[0]?.address || "",
          consignorCity: fullLr.consignor?.branches?.[0]?.city || "",
          consignorPincode: fullLr.consignor?.branches?.[0]?.postalCode || "",

          // Consignee
          consigneeName: fullLr.consignee?.name || "",
          consigneeGstin: fullLr.consignee?.gstin || "",
          consigneeState: normalizeState(fullLr.consignee?.branches?.[0]?.state || ""),
          consigneeAddress1: fullLr.consignee?.branches?.[0]?.address || "",
          consigneeCity: fullLr.consignee?.branches?.[0]?.city || "",
          consigneePincode: fullLr.consignee?.branches?.[0]?.postalCode || "",

          // Transport
          transporterDocNo: fullLr.tr_no || "",
          vehicleNo: container?.vehicle_no || "",

          items: [{
            productName: "Goods",
            productDesc: fullLr.description || "Goods Description",
            hsnCode: "",
            quantity: 1,
            qtyUnit: "NOS",
            taxableAmount: "",
            cgstRate: 0,
            sgstRate: 0,
            igstRate: 0,
            cessRate: 0
          }]
        }));

        // Auto-fetch distance if pincodes are available
        if (fullLr.consignor?.branches?.[0]?.postalCode && fullLr.consignee?.branches?.[0]?.postalCode) {
          fetchDistance(fullLr.consignor.branches[0].postalCode, fullLr.consignee.branches[0].postalCode);
        }

        // Apply special Rule: Suraj
        setFormData(prev => {
          if (prev.consignorName.toLowerCase().includes("suraj")) {
            return { ...prev, consignorGstin: "URP", consignorPincode: "999999" };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error fetching full LR details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistance = async (fromPin, toPin) => {
    if (String(fromPin) === "999999" || String(toPin) === "999999") {
      setFormData(prev => ({ ...prev, transportDistance: "" }));
      return;
    }
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/distance?fromPincode=${fromPin}&toPincode=${toPin}`
      );
      if (response.data.success) {
        setFormData(prev => ({ ...prev, transportDistance: response.data.distance }));
      }
    } catch (e) {
      console.error("Distance fetch failed", e);
    }
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Rule: If consignor name contains "suraj", force URP and 999999 pincode
      if (name === "consignorName" && value.toLowerCase().includes("suraj")) {
        newData.consignorGstin = "URP";
        newData.consignorPincode = "999999";
      }

      // Rule: URP consignor GSTIN → auto-set pincode to 999999
      if (name === "consignorGstin" && value.trim().toUpperCase() === "URP") {
        newData.consignorPincode = "999999";
      }

      return newData;
    });
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [name]: value };

    const taxable = parseFloat(newItems[index].taxableAmount) || 0;
    const cgst = (taxable * (parseFloat(newItems[index].cgstRate) || 0)) / 100;
    const sgst = (taxable * (parseFloat(newItems[index].sgstRate) || 0)) / 100;
    const igst = (taxable * (parseFloat(newItems[index].igstRate) || 0)) / 100;
    const cess = (taxable * (parseFloat(newItems[index].cessRate) || 0)) / 100;

    const total = taxable + cgst + sgst + igst + cess;

    setFormData(prev => ({
      ...prev,
      items: newItems,
      totalInvoiceValue: (total + (parseFloat(prev.otherAmount) || 0)).toFixed(2)
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // Calculate totals
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
          cessRate: parseFloat(item.cessRate) || 0
        };
      });

      const payload = {
        lrId: lrData._id,
        containerId: lrData.container?._id || (lrData.container && lrData.container[lrData.containerIndex]?._id),
        // Note: Adjust depending on how lrData is structured passed from PendingLRsTab
        // PendingLRsTab passes 'lr' which has `container: Array`. But we need specific container ID?
        // PendingLRsTab maps `lr.containerIndex`.
        // So we need to access `lr.container[lr.containerIndex]._id`
        containerId: lrData.container && lrData.containerIndex !== undefined
          ? lrData.container[lrData.containerIndex]._id
          : undefined,

        formData: {
          ...formData,
          totalInvoiceValue: parseFloat(formData.totalInvoiceValue) || 0,
          taxableAmount: taxableTotal,
          cgstAmount: cgstTotal,
          sgstAmount: sgstTotal,
          igstAmount: igstTotal,
          cessAmount: cessTotal,
          generatorRole: generatorRole,
          userGstin: generatorRole === 'consignor' ? formData.consignorGstin :
            generatorRole === 'consignee' ? formData.consigneeGstin :
              formData.transporterId,
          items: itemsPayload
        }
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/eway-bill/generate`,
        payload
      );

      if (response.data.success) {
        Swal.fire("Success", "E-Way Bill Generated Successfully!", "success");
        onSuccess(response.data.data);
        onClose();
      }
    } catch (error) {
      console.error("Generation failed", error);
      Swal.fire("Error", error.response?.data?.message || "Failed to generate E-Way Bill", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Generate E-Way Bill</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ marginBottom: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {loading && <div style={{ textAlign: 'center', padding: 20 }}><CircularProgress /></div>}

        {!loading && (
          <>
            {/* Step 0: Parties */}
            {activeStep === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Generate E-Way Bill As"
                    value={generatorRole}
                    onChange={(e) => setGeneratorRole(e.target.value)}
                    SelectProps={{ native: true }}
                    margin="dense"
                    variant="outlined"
                    sx={{ backgroundColor: '#f0f9ff' }}
                  >
                    <option value="consignor">Supplier (Consignor)</option>
                    <option value="consignee">Recipient (Consignee)</option>
                    <option value="transporter">Transporter</option>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Bill From (Consignor)</Typography>
                  <TextField fullWidth label="Name" name="consignorName" value={formData.consignorName} onChange={handleChange} margin="dense" />
                  <TextField fullWidth label="GSTIN" name="consignorGstin" value={formData.consignorGstin} onChange={handleChange} margin="dense" />
                  <TextField fullWidth label="State" name="consignorState" value={formData.consignorState} onChange={handleChange} margin="dense" />
                  <TextField fullWidth label="Pincode" name="consignorPincode" value={formData.consignorPincode} onChange={handleChange} margin="dense" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Bill To (Consignee)</Typography>
                  <TextField fullWidth label="Name" name="consigneeName" value={formData.consigneeName} onChange={handleChange} margin="dense" />
                  <TextField fullWidth label="GSTIN" name="consigneeGstin" value={formData.consigneeGstin} onChange={handleChange} margin="dense" />
                  <TextField fullWidth label="State" name="consigneeState" value={formData.consigneeState} onChange={handleChange} margin="dense" />
                  <TextField fullWidth label="Pincode" name="consigneePincode" value={formData.consigneePincode} onChange={handleChange} margin="dense" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Distance (km)" name="transportDistance" value={formData.transportDistance} onChange={handleChange} margin="dense" type="number" />
                </Grid>
              </Grid>
            )}

            {/* Step 1: Items */}
            {activeStep === 1 && (
              <div>
                {formData.items.map((item, index) => (
                  <Grid container spacing={2} key={index} sx={{ marginBottom: 2, padding: 2, border: '1px solid #eee', borderRadius: 2 }}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Item {index + 1}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField fullWidth label="Product Name" name="productName" value={item.productName} onChange={(e) => handleItemChange(index, e)} size="small" />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField fullWidth label="HSN Code" name="hsnCode" value={item.hsnCode} onChange={(e) => handleItemChange(index, e)} size="small" />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField fullWidth label="Taxable Amount" name="taxableAmount" value={item.taxableAmount} onChange={(e) => handleItemChange(index, e)} size="small" type="number" />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField fullWidth label="IGST Rate (%)" name="igstRate" value={item.igstRate} onChange={(e) => handleItemChange(index, e)} size="small" type="number" />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField fullWidth label="CGST+SGST Rate (%)" name="cgstRate" value={item.cgstRate} onChange={(e) => handleItemChange(index, e)} size="small" type="number" helperText="Enter half (e.g. 9 for 18%)" />
                    </Grid>
                  </Grid>
                ))}
                <div style={{ textAlign: 'right', marginTop: 10 }}>
                  <Typography variant="h6">Total Invoice Value: ₹{formData.totalInvoiceValue || '0.00'}</Typography>
                </div>
              </div>
            )}

            {/* Step 2: Transport */}
            {activeStep === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Transporter ID" name="transporterId" value={formData.transporterId} onChange={handleChange} margin="dense" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Transporter Name" name="transporterName" value={formData.transporterName} onChange={handleChange} margin="dense" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Vehicle No" name="vehicleNo" value={formData.vehicleNo} onChange={handleChange} margin="dense" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Doc No" name="transporterDocNo" value={formData.transporterDocNo} onChange={handleChange} margin="dense" />
                </Grid>
              </Grid>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={activeStep === 0} onClick={handleBack}>Back</Button>
        {activeStep === steps.length - 1 ? (
          <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading}>
            Generate E-Way Bill
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext}>Next</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EWBGenerationModal;
