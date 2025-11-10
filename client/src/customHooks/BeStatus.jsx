import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Paper,
  Chip,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Close as CloseIcon,
  Print as PrintIcon,
  Info as InfoIcon,
  Description as DescriptionIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  FormatListBulleted as FormatListBulletedIcon,
} from "@mui/icons-material";
import axios from "axios";

const BEStatus = ({ isOpen, onClose, beNo, beDt, location }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [beDetails, setBeDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  const tabLabels = [
    { label: "BE Details", icon: <InfoIcon fontSize="small" /> },
    { label: "Current Status", icon: <CheckCircleIcon fontSize="small" /> },
    { label: "Payment Details", icon: <PaymentIcon fontSize="small" /> },
    { label: "eDocument Validity", icon: <DescriptionIcon fontSize="small" /> },
    { label: "BE Amendment", icon: <EditIcon fontSize="small" /> },
    { label: "Other Agencies", icon: <BusinessIcon fontSize="small" /> },
  ];

  const decodedLocation = location?.match(/\(([^)]+)\)/)?.[1] || location;

  useEffect(() => {
    if (isOpen && location && beNo && beDt) {
      fetchBEDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, location, beNo, beDt]);

  const fetchBEDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const formattedBeDt = beDt?.includes("-") ? beDt.replace(/-/g, "") : beDt;
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/be-details`,
        { location: decodedLocation, beNo, beDt: formattedBeDt },
        { timeout: 35000, headers: { "Content-Type": "application/json" } }
      );
      if (res.data?.success) {
        setBeDetails(res.data.data || null);
      } else {
        setError(res.data?.error || "Failed to fetch BE details");
      }
    } catch (err) {
      if (err.code === "ERR_NETWORK") {
        setError(
          "Cannot connect to backend server. Ensure the proxy server is running on port 5000."
        );
      } else if (err.code === "ECONNABORTED") {
        setError("Request timeout. The upstream service may be slow.");
      } else if (err.response) {
        setError(
          `Server error: ${err.response.status} - ${
            err.response.data?.error || "Unknown error"
          }`
        );
      } else {
        setError(`Network error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Value renderer: show value as-is; only replace if truly missing
  const renderValue = (v) =>
    v === undefined || v === null || v === "" ? "N.A." : String(v);

  const handleTabChange = (_e, val) => setActiveTab(val);

  // Clean key-value panel with strict alignment
  const KeyValuePanel = ({ title, fields }) => (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {title && (
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>
          {title}
        </Typography>
      )}
      {fields.map((field, idx) => (
        <Box
          key={idx}
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.5,
            py: 1,
            borderTop: idx === 0 ? "1px solid transparent" : "1px solid",
            borderColor: idx === 0 ? "transparent" : "divider",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: "text.secondary",
              minWidth: { xs: "auto", sm: 200 },
              pr: { xs: 0, sm: 2 },
              textAlign: { xs: "left", sm: "right" },
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              whiteSpace: "nowrap",
            }}
          >
            {field.icon}
            {field.label}:
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: "text.primary",
                wordBreak: "break-word",
              }}
            >
              {renderValue(field.value)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );

  const renderTabContent = () => {
    if (!beDetails)
      return <Typography variant="body2">No data available.</Typography>;

    if (activeTab === 0) {
      const d = beDetails.beDetailsModel?.[0] || {};
      const fields = [
        {
          label: "IEC",
          value: d.iec,
          icon: (
            <FormatListBulletedIcon
              fontSize="small"
              sx={{ fontSize: "0.9rem" }}
            />
          ),
        },
        { label: "Total Value", value: d.totalVal },
        { label: "Type", value: d.typ },
        { label: "CHA Number", value: d.chaNo },
        { label: "First Check", value: d.firstCheck },
        { label: "Prior BE", value: d.priorBe },
        { label: "Section 48", value: d.sec48 },
        { label: "Appraising Group", value: d.appraisingGroup },
        { label: "Assessible Value", value: d.totalAssessableValue },
        { label: "Total Package", value: d.totalPackage },
        {
          label: "Gross Weight",
          value: d.grossWeight ? `${d.grossWeight} Kg` : d.grossWeight,
        },
        { label: "Total Duty", value: d.totalDuty },
        { label: "Fine & Penalty", value: d.finePenalty },
        { label: "WBE Number", value: d.wbeNo },
      ];
      return (
        <KeyValuePanel title="Bill of Entry Information" fields={fields} />
      );
    }

    if (activeTab === 1) {
      const s = beDetails.currentStatusModel?.[0] || {};
      const fields = [
        { label: "Appraisement", value: s.appraisement },
        { label: "Current Queue", value: s.currentQueue },
        { label: "Query Raised", value: s.queryRaised },
        { label: "Query Reply", value: s.queryReply },
        { label: "Reply Date", value: s.replyDate },
        { label: "Reply Status", value: s.replyStatus },
        { label: "Appraisal Date", value: s.apprDate },
        { label: "Assessment Date", value: s.assessDate },
        { label: "Payment Date", value: s.pymtDate },
        { label: "Examination Date", value: s.examDate },
        { label: "Out of Charge", value: s.oocDate },
      ];
      return <KeyValuePanel title="Status Details" fields={fields} />;
    }

    if (activeTab === 2) {
      const p = beDetails.paymentDetailsModel?.[0] || {};
      const fields = [
        {
          label: "Challan Number",
          value: p.challaNo,
          icon: <PrintIcon fontSize="small" sx={{ fontSize: "0.9rem" }} />,
        },
        { label: "Duty Amount", value: p.dutyAmt },
        { label: "Fine Amount", value: p.fineAmt },
        { label: "Interest Amount", value: p.interestAmt },
        { label: "Penalty Amount", value: p.penalAmt },
        { label: "Total Duty Payable", value: p.totalDuty },
        { label: "Duty Paid", value: p.dutyPaid },
        { label: "Payment Mode", value: p.modeOfPymt },
      ];
      return <KeyValuePanel title="Payment Information" fields={fields} />;
    }

    if (activeTab === 3) {
      const rows = beDetails.edocValidityModel || [];
      if (rows.length === 0) {
        return (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              No Documents Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              eDocument validity data is not currently available for this BE.
            </Typography>
          </Paper>
        );
      }
      return (
        <Paper
          elevation={0}
          sx={{ borderRadius: 1, border: "1px solid", borderColor: "divider" }}
        >
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              eDocument Validity Status
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {rows.length} document{rows.length !== 1 ? "s" : ""} found
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Document Version
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>
                    Validity
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((doc, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Chip
                        label={renderValue(doc.docVersion)}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {renderValue(doc.docDescription)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {renderValue(doc.validity)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      );
    }

    if (activeTab === 4) {
      const rows = beDetails.beAmendmentModel || [];
      if (rows.length === 0) {
        return (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              No Amendments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No amendments recorded for this Bill of Entry.
            </Typography>
          </Paper>
        );
      }
      return (
        <Paper
          elevation={0}
          sx={{ borderRadius: 1, border: "1px solid", borderColor: "divider" }}
        >
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              BE Amendments History
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {rows.length} amendment{rows.length !== 1 ? "s" : ""} recorded
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Amendment No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Chip
                        label={renderValue(r.amendmentNo)}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {renderValue(r.amendmentDate)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={renderValue(r.amendmentType)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {renderValue(r.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      );
    }

    if (activeTab === 5) {
      const pq = beDetails.otherGovtAgencyModel?.pqAgencyModel || [];
      const others = beDetails.otherGovtAgencyModel?.otherAgencyModel || [];
      if (pq.length === 0 && others.length === 0) {
        return (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              No Agency Data
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No other government agency information available for this BE.
            </Typography>
          </Paper>
        );
      }

      const AgencyTable = ({ title, rows }) => (
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {rows.length} item{rows.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Agency Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {renderValue(row.agencyName)}
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      {renderValue(row.status)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {renderValue(row.date)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      );

      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
          {pq.length > 0 && <AgencyTable title="PQ Agency Status" rows={pq} />}
          {others.length > 0 && (
            <AgencyTable title="Other Agency Status" rows={others} />
          )}
        </Box>
      );
    }

    return null;
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? "100vh" : "88vh",
          borderRadius: isMobile ? 0 : 1.5,
          overflow: "hidden",
        },
      }}
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                BE Status Tracking
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Chip
                  label={renderValue(beNo)}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  icon={<InfoIcon fontSize="small" />}
                  label={renderValue(beDt)}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  icon={<BusinessIcon fontSize="small" />}
                  label={renderValue((decodedLocation || "").toUpperCase())}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton onClick={() => window.print()} title="Print">
                <PrintIcon />
              </IconButton>
              <IconButton onClick={onClose} title="Close">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          borderRadius: 0,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            "& .MuiTab-root": { minHeight: 48, textTransform: "none" },
          }}
        >
          {tabLabels.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  {tab.icon}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {tab.label}
                  </Typography>
                </Box>
              }
              sx={{ minWidth: 120, maxWidth: 220 }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 320,
            p: 3,
          }}
        >
          <CircularProgress size={48} />
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
            Loading BE Details
          </Typography>
          <LinearProgress
            sx={{ width: 200, height: 4, borderRadius: 2, mt: 1.5 }}
          />
        </Box>
      ) : error ? (
        <Box sx={{ p: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "error.light",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ color: "error.main", fontWeight: 700, mb: 1 }}
            >
              Request Failed
            </Typography>
            <Typography variant="body2" sx={{ color: "error.dark", mb: 2 }}>
              {error}
            </Typography>
            <Button variant="contained" color="error" onClick={fetchBEDetails}>
              Retry
            </Button>
          </Paper>
        </Box>
      ) : (
        <DialogContent
          sx={{
            p: { xs: 2, sm: 3 },
            overflow: "auto",
            bgcolor: "background.default",
          }}
        >
          {/* Ensure strict width to avoid overflow */}
          <Box sx={{ maxWidth: 1040, mx: "auto" }}>{renderTabContent()}</Box>
        </DialogContent>
      )}

      {/* Print cleanup */}
      <style jsx>{`
        @media print {
          .MuiDialog-paper {
            box-shadow: none !important;
            border: none !important;
            max-height: none !important;
            height: auto !important;
          }
        }
      `}</style>
    </Dialog>
  );
};

export default BEStatus;
