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
  Chip,
  Drawer,
  TextField,
  TablePagination,
  Alert
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptIcon from "@mui/icons-material/Receipt";
import InfoIcon from "@mui/icons-material/Info";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

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
  const [assignedIecList, setAssignedIecList] = useState([]);
  const [selectedIec, setSelectedIec] = useState("ALL");

  const [selectedAuthNo, setSelectedAuthNo] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authDetails, setAuthDetails] = useState(null);
  const [utilizationRecords, setUtilizationRecords] = useState([]);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);

  // Pagination & Search
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all authorizations matching the logged in user's ie_code_assignments
  useEffect(() => {
    async function loadAuthorizations() {
      setLoadingList(true);
      setError(null);
      try {
        const user = getJsonCookie("exim_user");
        const ieAssignments = user?.ie_code_assignments || [];

        const iecMap = new Map();
        ieAssignments.forEach((a) => {
          const code = (a.ie_code_no || "").toUpperCase().trim();
          if (code && !iecMap.has(code)) {
            iecMap.set(code, a.firm_name || a.party_name || "");
          }
        });

        const iecList = Array.from(iecMap.entries()).map(([code, name]) => ({
          iec_no: code,
          firm_name: name
        }));
        setAssignedIecList(iecList);

        if (iecList.length === 0) {
          setAuthorizations([]);
          setLoadingList(false);
          return;
        }

        const mergedList = [];
        const seenAuths = new Set();

        const iecResults = await Promise.all(
          iecList.map(async (iecObj) => {
            try {
              const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/get-authorizations-by-iec`,
                { params: { iec_no: iecObj.iec_no } }
              );
              if (res.data && Array.isArray(res.data)) {
                return res.data.map((item) => ({
                  ...item,
                  iec_no: item.iec_no || iecObj.iec_no,
                  party_name: item.party_name || iecObj.firm_name,
                }));
              }
            } catch (err) {
              console.error(`Failed to load authorizations for IEC: ${iecObj.iec_no}`, err);
            }
            return [];
          })
        );

        const flatList = iecResults.flat();

        const enrichedItems = await Promise.all(
          flatList.map(async (item) => {
            const uniqueKey = item.authorization_no || item.licence_no || item.registration_no || item._id;
            let fullItem = { ...item };
            if (uniqueKey && (!fullItem.bond_number && !fullItem.bond_no)) {
              try {
                const detRes = await axios.get(
                  `${process.env.REACT_APP_API_STRING}/get-authorization-by-no`,
                  { params: { authorization_no: uniqueKey } }
                );
                if (detRes.data) {
                  fullItem = {
                    ...fullItem,
                    ...detRes.data,
                    bond_number: detRes.data.bond_number || detRes.data.bond_no || fullItem.bond_number,
                    bond_amount: detRes.data.bond_amount || fullItem.bond_amount,
                    bond_expiry_date: detRes.data.bond_expiry_date || detRes.data.bond_expiry || fullItem.bond_expiry_date,
                    authorization_date: detRes.data.licence_date || detRes.data.auth_date || detRes.data.authorization_date || fullItem.authorization_date,
                  };
                }
              } catch (e) { }
            }
            return fullItem;
          })
        );

        enrichedItems.forEach((item) => {
          const uniqueKey = item.authorization_no || item.licence_no || item.registration_no || item._id;
          if (uniqueKey && !seenAuths.has(uniqueKey)) {
            seenAuths.add(uniqueKey);
            mergedList.push(item);
          }
        });

        setAuthorizations(mergedList);
      } catch (err) {
        console.error("Error matching user authorizations:", err);
        setError("Failed to fetch authorizations list.");
      } finally {
        setLoadingList(false);
      }
    }

    loadAuthorizations();
  }, []);

  // Open Drawer and load details when a License / Authorization is clicked
  const handleOpenDetails = async (authNo) => {
    if (!authNo) return;
    setSelectedAuthNo(authNo);
    setDrawerOpen(true);
    setLoadingDetails(true);
    setAuthDetails(null);
    setUtilizationRecords([]);

    try {
      const [detailsRes, utilRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/get-authorization-by-no`, {
          params: { authorization_no: authNo }
        }),
        axios.get(`${process.env.REACT_APP_API_STRING}/license-utilization/records`, {
          params: { authorization_no: authNo }
        })
      ]);

      setAuthDetails(detailsRes.data);
      setUtilizationRecords(utilRes.data || []);
    } catch (err) {
      console.error("Failed to load details for license", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Filter authorizations by selected IEC Code and Search Query
  const filteredAuthorizations = authorizations.filter((item) => {
    // 1. Filter by IEC
    if (selectedIec !== "ALL") {
      const itemIec = (item.iec_no || "").toUpperCase().trim();
      if (itemIec !== selectedIec) return false;
    }
    // 2. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const jobNo = String(item.job_no || item.lic_ref_no || "").toLowerCase();
      const authNo = String(item.authorization_no || item.licence_no || "").toLowerCase();
      const bondNo = String(item.bond_number || item.bond_no || "").toLowerCase();
      const scheme = String(item.scheme_code || "").toLowerCase();
      const port = String(item.port_code || item.port || "").toLowerCase();
      const category = String(item.job_category || item.job_categories || "").toLowerCase();
      return (
        jobNo.includes(q) ||
        authNo.includes(q) ||
        bondNo.includes(q) ||
        scheme.includes(q) ||
        port.includes(q) ||
        category.includes(q)
      );
    }
    return true;
  });

  const paginatedAuthorizations = filteredAuthorizations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const calculateUtilizationSums = () => {
    return utilizationRecords.reduce(
      (acc, item) => {
        acc.totalQty += parseFloat(String(item.qty || "0").replace(/[^0-9.-]/g, "")) || 0;
        acc.totalUSD += parseFloat(String(item.cif_usd || "0").replace(/[^0-9.-]/g, "")) || 0;
        acc.totalINR += parseFloat(String(item.cif_inr || "0").replace(/[^0-9.-]/g, "")) || 0;
        return acc;
      },
      { totalQty: 0, totalUSD: 0, totalINR: 0 }
    );
  };

  const utilSums = calculateUtilizationSums();

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header Bar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate("/user/dashboard")} sx={{ color: "#0F172A" }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="700" sx={{ color: "#0F172A" }}>
            DGFT Module
          </Typography>
        </Box>

        {/* Top Filter Bar: Select IEC Code */}
        {assignedIecList.length > 0 && (
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Typography variant="subtitle2" fontWeight="700" color="#334155">
              Select IEC Code:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <Select
                value={selectedIec}
                onChange={(e) => {
                  setSelectedIec(e.target.value);
                  setPage(0);
                }}
                sx={{
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                  fontWeight: "600",
                  fontSize: "13px",
                  borderColor: "#CBD5E1"
                }}
              >
                <MenuItem value="ALL">All Assigned IEC Codes ({assignedIecList.length})</MenuItem>
                {assignedIecList.map((item) => (
                  <MenuItem key={item.iec_no} value={item.iec_no}>
                    {item.iec_no} {item.firm_name ? `(${item.firm_name})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search License / Job / Scheme..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: "#94a3b8", fontSize: 18, mr: 1 }} />
              }}
              sx={{
                width: 240,
                backgroundColor: "#fff",
                borderRadius: "8px",
                "& .MuiOutlinedInput-root": { borderRadius: "8px" }
              }}
            />
          </Box>
        )}
      </Box>

      {/* Main Table View */}
      {loadingList ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : authorizations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: "12px", border: "1px dashed #CBD5E1" }}>
          <Typography variant="body1" color="text.secondary">
            No active DGFT authorizations found for your assigned IEC codes.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: "8px", border: "1px solid #1e3a8a", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <TableContainer>
            <Table size="small">
              <TableHead style={{ background: "linear-gradient(180deg, #19448a 0%, #102a56 100%)" }}>
                <TableRow>
                  <TableCell style={{ color: "#ffffff", fontWeight: "800", fontSize: "11px", letterSpacing: "0.5px" }}>Sr No.</TableCell>
                  <TableCell style={{ color: "#ffffff", fontWeight: "800", fontSize: "11px", letterSpacing: "0.5px" }}>AUTHORIZATION NUMBER</TableCell>
                  <TableCell style={{ color: "#ffffff", fontWeight: "800", fontSize: "11px", letterSpacing: "0.5px" }}>AUTHORIZATION DATE</TableCell>
                  <TableCell style={{ color: "#ffffff", fontWeight: "800", fontSize: "11px", letterSpacing: "0.5px" }}>BOND NO</TableCell>
                  <TableCell style={{ color: "#ffffff", fontWeight: "800", fontSize: "11px", letterSpacing: "0.5px" }}>BOND AMOUNT</TableCell>
                  <TableCell style={{ color: "#ffffff", fontWeight: "800", fontSize: "11px", letterSpacing: "0.5px" }}>BOND EXPIRY</TableCell>
                  <TableCell style={{ color: "#ffffff", fontWeight: "800", fontSize: "11px", letterSpacing: "0.5px" }}>SCHEME CODE</TableCell>
                  <TableCell style={{ color: "#ffffff", fontWeight: "800", fontSize: "11px", letterSpacing: "0.5px" }}>JOB CATEGORIES</TableCell>
                  <TableCell style={{ color: "#ffffff", fontWeight: "800", fontSize: "11px", letterSpacing: "0.5px" }}>PORT CODE</TableCell>
                  <TableCell style={{ color: "#ffffff", fontWeight: "800", fontSize: "11px", letterSpacing: "0.5px" }}>JOB STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAuthorizations.length > 0 ? (
                  paginatedAuthorizations.map((auth, idx) => {
                    const srNo = page * rowsPerP     age + idx + 1;
                    const authNoStr = auth.authorization_no || auth.licence_no || auth.registration_no || "—";
                    const authDateStr = auth.authorization_date || auth.licence_date || auth.auth_date || "—";
                    const bondNoStr = auth.bond_number || auth.bond_no || "—";
                    const bondAmtStr = auth.bond_amount ? (String(auth.bond_amount).startsWith("Rs.") ? auth.bond_amount : formatINR(auth.bond_amount)) : "—";
                    const bondExpiryStr = auth.bond_expiry_date || auth.bond_expiry || "—";
                    const statusStr = auth.job_status || auth.status || "Completed";

                    return (
                      <TableRow
                        key={auth._id || authNoStr || idx}
                        hover
                        onClick={() => handleOpenDetails(authNoStr)}
                        sx={{ "&:hover": { backgroundColor: "#f8fafc" }, cursor: "pointer" }}
                      >
                        {/* Sr No. */}
                        <TableCell sx={{ py: 1.2, color: "#475569", fontWeight: "600", fontSize: "12px" }}>
                          {srNo}
                        </TableCell>

                        {/* Authorization Number Link */}
                        <TableCell sx={{ py: 1.2 }}>
                          <Typography
                            variant="body2"
                            fontWeight="700"
                            color="#2563eb"
                            sx={{ textDecoration: "underline", cursor: "pointer" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetails(authNoStr);
                            }}
                          >
                            {authNoStr}
                          </Typography>
                        </TableCell>

                        {/* Authorization Date */}
                        <TableCell sx={{ py: 1.2, color: "#334155", fontWeight: "500", fontSize: "12px" }}>
                          {authDateStr}
                        </TableCell>

                        {/* Bond No */}
                        <TableCell sx={{ py: 1.2, color: "#334155", fontWeight: "500", fontSize: "12px" }}>
                          {bondNoStr}
                        </TableCell>

                        {/* Bond Amount */}
                        <TableCell sx={{ py: 1.2, color: "#334155", fontWeight: "500", fontSize: "12px" }}>
                          {bondAmtStr}
                        </TableCell>

                        {/* Bond Expiry */}
                        <TableCell sx={{ py: 1.2, color: "#334155", fontWeight: "500", fontSize: "12px" }}>
                          {bondExpiryStr}
                        </TableCell>

                        {/* Scheme Code */}
                        <TableCell sx={{ py: 1.2, color: "#1e293b", fontWeight: "600", fontSize: "12px" }}>
                          {auth.scheme_code || "—"}
                        </TableCell>

                        {/* Job Categories */}
                        <TableCell sx={{ py: 1.2, color: "#334155", fontWeight: "500", fontSize: "12px" }}>
                          {auth.job_category || auth.job_categories || auth.category || "BOND AA"}
                        </TableCell>

                        {/* Port Code */}
                        <TableCell sx={{ py: 1.2, color: "#1e293b", fontWeight: "600", fontSize: "12px" }}>
                          {auth.port_code || auth.port || "INSBI6"}
                        </TableCell>

                        {/* Job Status - View Only Badge */}
                        <TableCell sx={{ py: 1.2 }}>
                          <Chip
                            label={statusStr}
                            size="small"
                            sx={{
                              fontWeight: "700",
                              fontSize: "11px",
                              borderRadius: "6px",
                              color: statusStr === "Completed" ? "#15803d" : statusStr === "Billing" || statusStr === "Blling" ? "#c2410c" : "#1d4ed8",
                              backgroundColor: statusStr === "Completed" ? "#f0fdf4" : statusStr === "Billing" || statusStr === "Blling" ? "#fff7ed" : "#eff6ff",
                              border: "1px solid",
                              borderColor: statusStr === "Completed" ? "#bbf7d0" : statusStr === "Billing" || statusStr === "Blling" ? "#ffedd5" : "#bfdbfe"
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4, color: "#64748b" }}>
                      No matching records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Table Pagination */}
          <TablePagination
            rowsPerPageOptions={[25, 50, 100]}
            component="div"
            count={filteredAuthorizations.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>
      )}

      {/* Floating Right Drawer Overlay for License Details */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "90%", md: "75%", lg: "65%" },
            p: { xs: 2, md: 3 },
            backgroundColor: "#F8FAFC"
          }
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} pb={2} borderBottom="1px solid #E2E8F0">
          <Box display="flex" alignItems="center" gap={1.5}>
            <DescriptionIcon color="primary" sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" fontWeight="700" color="#0F172A">
                Authorization Details: {selectedAuthNo}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Scheme: {authDetails?.scheme_code || "DEEC"} | IEC: {authDetails?.iec_no || "—"}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ backgroundColor: "#e2e8f0" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {loadingDetails ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : (
          authDetails && (
            <Box display="flex" flexDirection="column" gap={3.5}>
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

              {/* 3. Item Details (Import) Table */}
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
                      <TableHead sx={{ backgroundColor: "#e2e8f0" }}>
                        <TableRow>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ px: 3, borderBottom: "2px solid #cbd5e1" }}>Sr No</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>HS Code</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>Description</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>Licensed Qty</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>Utilized Qty</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>Balance Qty</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>Utilization %</TableCell>
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
                                <Typography variant="body2" fontWeight="600" color="#3B82F6">
                                  {formatNumber(item.utilization_percent || 0)}%
                                </Typography>
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

              {/* 4. Item Details (Export) Table */}
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
                      <TableHead sx={{ backgroundColor: "#e2e8f0" }}>
                        <TableRow>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ px: 3, borderBottom: "2px solid #cbd5e1" }}>Sr No</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>HS Code</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>Description</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>Export Qty</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>FOB USD</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>FOB Rs</TableCell>
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

              {/* 5. Utilization Transactions Table */}
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
                      <TableHead sx={{ backgroundColor: "#e2e8f0" }}>
                        <TableRow>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ px: 3, borderBottom: "2px solid #cbd5e1" }}>BE No</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>BE Date</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>Port No</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>Qty Utilized</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>CIF USD</TableCell>
                          <TableCell style={{ color: "#1e293b", fontWeight: "800" }} sx={{ borderBottom: "2px solid #cbd5e1" }}>CIF INR</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {utilizationRecords.length > 0 ? (
                          <>
                            {utilizationRecords.map((item, idx) => (
                              <TableRow key={idx} sx={{ "&:hover": { backgroundColor: "#F8FAFC" } }}>
                                <TableCell sx={{ px: 3, fontWeight: "600", color: "#3B82F6" }}>{item.be_no || "—"}</TableCell>
                                <TableCell>{item.be_date || "—"}</TableCell>
                                <TableCell>{item.port || "—"}</TableCell>
                                <TableCell>{formatNumber(item.qty)} {item.unit || ""}</TableCell>
                                <TableCell>{formatUSD(item.cif_usd)}</TableCell>
                                <TableCell>{formatINR(item.cif_inr)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow sx={{ backgroundColor: "#f1f5f9", "& td": { borderTop: "2px solid #cbd5e1", fontWeight: "800", color: "#0f172a" } }}>
                              <TableCell sx={{ px: 3 }} colSpan={3}>Total</TableCell>
                              <TableCell>{formatNumber(utilSums.totalQty)} {utilizationRecords[0]?.unit || ""}</TableCell>
                              <TableCell>{formatUSD(utilSums.totalUSD)}</TableCell>
                              <TableCell>{formatINR(utilSums.totalINR)}</TableCell>
                            </TableRow>
                          </>
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
      </Drawer>
    </Box>
  );
}

export default CDgftModule;
