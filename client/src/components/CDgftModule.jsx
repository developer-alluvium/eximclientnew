import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getJsonCookie } from "../utils/cookies";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Button,
  Grid,
  Alert
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TimelineIcon from "@mui/icons-material/Timeline";
import InfoIcon from "@mui/icons-material/Info";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";

// Custom helper formatters
const formatUSD = (val) => {
  if (val === undefined || val === null || val === "" || val === "—") return "—";
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return val;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
};

const formatINR = (val) => {
  if (val === undefined || val === null || val === "" || val === "—") return "—";
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return val;
  return "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num);
};

const formatNumber = (val) => {
  if (val === undefined || val === null || val === "" || val === "—") return "—";
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return val;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(num);
};

function CDgftModule() {
  const navigate = useNavigate();
  const [authorizations, setAuthorizations] = useState([]);
  const [selectedAuthNo, setSelectedAuthNo] = useState("");
  const [authDetails, setAuthDetails] = useState(null);
  const [utilizationRecords, setUtilizationRecords] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all authorizations matching the logged in user's ie_code_assignments
  useEffect(() => {
    async function loadAuthorizations() {
      setLoadingList(true);
      setError(null);
      try {
        const user = getJsonCookie("exim_user");
        const ieAssignments = user?.ie_code_assignments || [];
        const assignedIECs = ieAssignments
          .map((a) => (a.ie_code_no || "").toUpperCase().trim())
          .filter(Boolean);

        if (assignedIECs.length === 0) {
          setAuthorizations([]);
          setLoadingList(false);
          return;
        }

        const mergedList = [];
        const seenAuths = new Set();

        for (const iec of assignedIECs) {
          try {
            const res = await axios.get(
              `${process.env.REACT_APP_API_STRING}/get-authorizations-by-iec`,
              { params: { iec_no: iec } }
            );
            if (res.data && Array.isArray(res.data)) {
              res.data.forEach((item) => {
                const uniqueKey = item.authorization_no || item.licence_no;
                if (uniqueKey && !seenAuths.has(uniqueKey)) {
                  seenAuths.add(uniqueKey);
                  mergedList.push(item);
                }
              });
            }
          } catch (err) {
            console.error(`Failed to load authorizations for IEC: ${iec}`, err);
          }
        }

        setAuthorizations(mergedList);
        if (mergedList.length > 0) {
          setSelectedAuthNo(mergedList[0].authorization_no);
        }
      } catch (err) {
        console.error("Error matching user authorizations:", err);
        setError("Failed to fetch authorizations list.");
      } finally {
        setLoadingList(false);
      }
    }

    loadAuthorizations();
  }, []);

  // Fetch full details and utilization when a license is selected
  useEffect(() => {
    if (!selectedAuthNo) {
      setAuthDetails(null);
      setUtilizationRecords([]);
      return;
    }

    async function loadDetails() {
      setLoadingDetails(true);
      try {
        const [detailsRes, utilRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_STRING}/get-authorization-by-no`, {
            params: { authorization_no: selectedAuthNo }
          }),
          axios.get(`${process.env.REACT_APP_API_STRING}/license-utilization/records`, {
            params: { authorization_no: selectedAuthNo }
          })
        ]);

        setAuthDetails(detailsRes.data);
        setUtilizationRecords(utilRes.data || []);
      } catch (err) {
        console.error("Failed to load details for license", err);
      } finally {
        setLoadingDetails(false);
      }
    }

    loadDetails();
  }, [selectedAuthNo]);

  // Calculate dynamic sums for Import Summary Card Table
  const calculateImportSummary = () => {
    if (!authDetails?.import_details_array) {
      return {
        licensedQty: 0,
        utilizedQty: 0,
        balanceQty: 0,
        licensedUSD: 0,
        utilizedUSD: 0,
        balanceUSD: 0,
        licensedINR: 0,
        utilizedINR: 0,
        balanceINR: 0
      };
    }

    return authDetails.import_details_array.reduce(
      (acc, item) => {
        acc.licensedQty += parseFloat(String(item.qty || "0").replace(/[^0-9.-]/g, "")) || 0;
        acc.utilizedQty += parseFloat(item.total_utilized_qty) || 0;
        acc.balanceQty += parseFloat(item.balance_qty) || 0;

        acc.licensedUSD += parseFloat(String(item.value_usd || "0").replace(/[^0-9.-]/g, "")) || 0;
        acc.utilizedUSD += parseFloat(item.total_utilized_usd) || 0;
        acc.balanceUSD += parseFloat(item.balance_cif_usd) || 0;

        acc.licensedINR += parseFloat(String(item.value_rs || "0").replace(/[^0-9.-]/g, "")) || 0;
        acc.utilizedINR += parseFloat(item.total_utilized_inr) || 0;
        acc.balanceINR += parseFloat(item.balance_cif_inr) || 0;

        return acc;
      },
      {
        licensedQty: 0,
        utilizedQty: 0,
        balanceQty: 0,
        licensedUSD: 0,
        utilizedUSD: 0,
        balanceUSD: 0,
        licensedINR: 0,
        utilizedINR: 0,
        balanceINR: 0
      }
    );
  };

  const summary = calculateImportSummary();

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Title & Navigation */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate("/user/dashboard")} sx={{ color: "#0F172A" }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="700" sx={{ color: "#0F172A" }}>
          DGFT Module
        </Typography>
      </Box>

      {/* Select License Dropdown */}
      {loadingList ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={30} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : authorizations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: "12px", border: "1px dashed #CBD5E1" }}>
          <Typography variant="body1" color="text.secondary">
            No active DGFT authorizations or licenses found for your assigned IEC codes.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ mb: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
          <Typography variant="subtitle1" fontWeight="600" color="#475569">
            Select Authorization / License:
          </Typography>
          <FormControl sx={{ minWidth: 280 }}>
            <Select
              value={selectedAuthNo}
              onChange={(e) => setSelectedAuthNo(e.target.value)}
              size="small"
              sx={{
                borderRadius: "8px",
                backgroundColor: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                borderColor: "#E2E8F0"
              }}
            >
              {authorizations.map((auth) => (
                <MenuItem key={auth.authorization_no} value={auth.authorization_no}>
                  {auth.authorization_no} ({auth.scheme_code || "N/A"})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Details Sections */}
      {loadingDetails ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        authDetails && (
          <Box display="flex" flexDirection="column" gap={4}>

            {/* 1. General Information Table */}
            <Card sx={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", border: "1px solid #E2E8F0" }}>
              <Box sx={{ backgroundColor: "#F1F5F9", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <InfoIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight="700" color="#1E293B">
                  General Information
                </Typography>
              </Box>
              <CardContent sx={{ p: 0 }}>
                <TableContainer>
                  <Table sx={{ borderCollapse: "collapse" }}>
                    <TableBody>
                      <TableRow sx={{ "& td": { borderBottom: "1px solid #E2E8F0", py: 1.5, px: 3 } }}>
                        <TableCell sx={{ width: "25%", fontWeight: "600", color: "#475569" }}>Firm Name</TableCell>
                        <TableCell sx={{ width: "25%" }}>{authDetails.party_name || "—"}</TableCell>
                        <TableCell sx={{ width: "25%", fontWeight: "600", color: "#475569" }}>IEC Number</TableCell>
                        <TableCell sx={{ width: "25%" }}>{authDetails.iec_no || "—"}</TableCell>
                      </TableRow>
                      <TableRow sx={{ "& td": { borderBottom: "1px solid #E2E8F0", py: 1.5, px: 3 } }}>
                        <TableCell sx={{ fontWeight: "600", color: "#475569" }}>Authorization No</TableCell>
                        <TableCell>{authDetails.licence_no || authDetails.registration_no || "—"}</TableCell>
                        <TableCell sx={{ fontWeight: "600", color: "#475569" }}>Auth Date</TableCell>
                        <TableCell>{authDetails.licence_date || authDetails.auth_date || "—"}</TableCell>
                      </TableRow>
                      <TableRow sx={{ "& td": { borderBottom: "1px solid #E2E8F0", py: 1.5, px: 3 } }}>
                        <TableCell sx={{ fontWeight: "600", color: "#475569" }}>Import Validity</TableCell>
                        <TableCell>{authDetails.import_validity || "—"}</TableCell>
                        <TableCell sx={{ fontWeight: "600", color: "#475569" }}>Export Validity</TableCell>
                        <TableCell>{authDetails.export_validity || "—"}</TableCell>
                      </TableRow>
                      <TableRow sx={{ "& td": { borderBottom: "none", py: 1.5, px: 3 } }}>
                        <TableCell sx={{ fontWeight: "600", color: "#475569" }}>Scheme Code</TableCell>
                        <TableCell>{authDetails.scheme_code || "—"}</TableCell>
                        <TableCell sx={{ fontWeight: "600", color: "#475569" }}>Notification No</TableCell>
                        <TableCell>{authDetails.notification_number || "—"}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* 2. Compliance & Documents Table */}
            <Card sx={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", border: "1px solid #E2E8F0" }}>
              <Box sx={{ backgroundColor: "#F1F5F9", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <VerifiedUserIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight="700" color="#1E293B">
                  Compliance & Documents
                </Typography>
              </Box>
              <CardContent sx={{ p: 0 }}>
                <TableContainer>
                  <Table sx={{ borderCollapse: "collapse" }}>
                    <TableBody>
                      <TableRow sx={{ "& td": { borderBottom: "1px solid #E2E8F0", py: 1.5, px: 3 } }}>
                        <TableCell sx={{ width: "25%", fontWeight: "600", color: "#475569" }}>BG Number</TableCell>
                        <TableCell sx={{ width: "25%" }}>{authDetails.bg_number || "—"}</TableCell>
                        <TableCell sx={{ width: "25%", fontWeight: "600", color: "#475569" }}>BG Expiry Date</TableCell>
                        <TableCell sx={{ width: "25%" }}>{authDetails.bg_expiry_date || "—"}</TableCell>
                      </TableRow>
                      <TableRow sx={{ "& td": { borderBottom: "1px solid #E2E8F0", py: 1.5, px: 3 } }}>
                        <TableCell sx={{ fontWeight: "600", color: "#475569" }}>BG Amount</TableCell>
                        <TableCell>{authDetails.bg_amount ? formatINR(authDetails.bg_amount) : "—"}</TableCell>
                        <TableCell sx={{ fontWeight: "600", color: "#475569" }}>Bond Number</TableCell>
                        <TableCell>{authDetails.bond_number || "—"}</TableCell>
                      </TableRow>
                      <TableRow sx={{ "& td": { borderBottom: "none", py: 1.5, px: 3 } }}>
                        <TableCell sx={{ fontWeight: "600", color: "#475569" }}>Bond Expiry Date</TableCell>
                        <TableCell>{authDetails.bond_expiry_date || "—"}</TableCell>
                        <TableCell sx={{ fontWeight: "600", color: "#475569" }}>Bond Amount</TableCell>
                        <TableCell>{authDetails.bond_amount ? formatINR(authDetails.bond_amount) : "—"}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* 3. Summary Cards (Import) Table */}
            <Card sx={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", border: "1px solid #E2E8F0" }}>
              <Box sx={{ backgroundColor: "#F1F5F9", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <TimelineIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight="700" color="#1E293B">
                  Summary Cards (Import)
                </Typography>
              </Box>
              <CardContent sx={{ p: 0 }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: "700", color: "#475569", px: 3 }}>Metric</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Licensed</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Utilized</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow sx={{ "&:hover": { backgroundColor: "#F8FAFC" } }}>
                        <TableCell sx={{ fontWeight: "600", color: "#475569", px: 3 }}>Quantity</TableCell>
                        <TableCell>{formatNumber(summary.licensedQty)}</TableCell>
                        <TableCell>{formatNumber(summary.utilizedQty)}</TableCell>
                        <TableCell>{formatNumber(summary.balanceQty)}</TableCell>
                      </TableRow>
                      <TableRow sx={{ "&:hover": { backgroundColor: "#F8FAFC" } }}>
                        <TableCell sx={{ fontWeight: "600", color: "#475569", px: 3 }}>CIF Value (USD)</TableCell>
                        <TableCell>{formatUSD(summary.licensedUSD)}</TableCell>
                        <TableCell>{formatUSD(summary.utilizedUSD)}</TableCell>
                        <TableCell>{formatUSD(summary.balanceUSD)}</TableCell>
                      </TableRow>
                      <TableRow sx={{ "&:hover": { backgroundColor: "#F8FAFC" } }}>
                        <TableCell sx={{ fontWeight: "600", color: "#475569", px: 3 }}>CIF Value (INR)</TableCell>
                        <TableCell>{formatINR(summary.licensedINR)}</TableCell>
                        <TableCell>{formatINR(summary.utilizedINR)}</TableCell>
                        <TableCell>{formatINR(summary.balanceINR)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* 4. Item Details (Import) Table */}
            <Card sx={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", border: "1px solid #E2E8F0" }}>
              <Box sx={{ backgroundColor: "#F1F5F9", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <DescriptionIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight="700" color="#1E293B">
                  Item Details (Import)
                </Typography>
              </Box>
              <CardContent sx={{ p: 0 }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: "700", color: "#475569", px: 3 }}>Sr No</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>HS Code</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Licensed Qty</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Utilized Qty</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Balance Qty</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Utilization %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {authDetails.import_details_array && authDetails.import_details_array.length > 0 ? (
                        authDetails.import_details_array.map((item, idx) => (
                          <TableRow key={idx} sx={{ "&:hover": { backgroundColor: "#F8FAFC" } }}>
                            <TableCell sx={{ px: 3 }}>{item.sr_no || idx + 1}</TableCell>
                            <TableCell>{item.hs_code || "—"}</TableCell>
                            <TableCell>{item.item_description || "—"}</TableCell>
                            <TableCell>{formatNumber(item.qty)} {item.unit || ""}</TableCell>
                            <TableCell>{formatNumber(item.total_utilized_qty)} {item.unit || ""}</TableCell>
                            <TableCell>{formatNumber(item.balance_qty)} {item.unit || ""}</TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight="600" color="#3B82F6">
                                  {formatNumber(item.utilization_percent || 0)}%
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3, color: "#64748B" }}>
                            No import items configured.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* 5. Item Details (Export) Table */}
            <Card sx={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", border: "1px solid #E2E8F0" }}>
              <Box sx={{ backgroundColor: "#F1F5F9", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <DescriptionIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight="700" color="#1E293B">
                  Item Details (Export)
                </Typography>
              </Box>
              <CardContent sx={{ p: 0 }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: "700", color: "#475569", px: 3 }}>Sr No</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>HS Code</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Export Qty</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>FOB USD</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>FOB Rs</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {authDetails.export_details_array && authDetails.export_details_array.length > 0 ? (
                        authDetails.export_details_array.map((item, idx) => (
                          <TableRow key={idx} sx={{ "&:hover": { backgroundColor: "#F8FAFC" } }}>
                            <TableCell sx={{ px: 3 }}>{item.sr_no || idx + 1}</TableCell>
                            <TableCell>{item.hs_code || "—"}</TableCell>
                            <TableCell>{item.item_description || "—"}</TableCell>
                            <TableCell>{formatNumber(item.qty)} {item.unit || ""}</TableCell>
                            <TableCell>{formatUSD(item.value_usd)}</TableCell>
                            <TableCell>{formatINR(item.value_rs)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3, color: "#64748B" }}>
                            No export items configured.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* 6. Utilization Transactions Table */}
            <Card sx={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", border: "1px solid #E2E8F0" }}>
              <Box sx={{ backgroundColor: "#F1F5F9", px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <ReceiptIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight="700" color="#1E293B">
                  Utilization Transactions
                </Typography>
              </Box>
              <CardContent sx={{ p: 0 }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: "700", color: "#475569", px: 3 }}>BE No</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>BE Date</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Port No</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Qty Utilized</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>CIF USD</TableCell>
                        <TableCell sx={{ fontWeight: "700", color: "#475569" }}>CIF INR</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {utilizationRecords.length > 0 ? (
                        utilizationRecords.map((item, idx) => (
                          <TableRow key={idx} sx={{ "&:hover": { backgroundColor: "#F8FAFC" } }}>
                            <TableCell sx={{ px: 3, fontWeight: "600", color: "#3B82F6" }}>{item.be_no || "—"}</TableCell>
                            <TableCell>{item.be_date || "—"}</TableCell>
                            <TableCell>{item.port || "—"}</TableCell>
                            <TableCell>{formatNumber(item.qty)} {item.unit || ""}</TableCell>
                            <TableCell>{formatUSD(item.cif_usd)}</TableCell>
                            <TableCell>{formatINR(item.cif_inr)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3, color: "#64748B" }}>
                            No utilization records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

          </Box>
        )
      )}
    </Box>
  );
}

export default CDgftModule;
