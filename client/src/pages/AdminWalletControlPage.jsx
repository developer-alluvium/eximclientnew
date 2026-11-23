import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Pagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import HistoryIcon from "@mui/icons-material/History";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";
import { getJsonCookie } from "../utils/cookies";

const CREDIT_RATE = 9; // 1 Credit = ₹9

function AdminWalletControlPage() {
  const navigate = useNavigate();
  const userData = getJsonCookie("exim_user") || {};

  const userEmail = (userData?.email || "").toLowerCase();
  const userRole = (userData?.role || "").toLowerCase();
  const isPunit = userEmail === "punit@alluvium.in";
  const isAdmin =
    userRole === "admin" ||
    userRole === "superadmin" ||
    userRole === "super_admin" ||
    Boolean(userData?.isAdmin);

  const hasAccess = isPunit || isAdmin;

  // State
  const [clients, setClients] = useState([]);
  const [summary, setSummary] = useState({
    totalClients: 0,
    totalCirculatingCredits: 0,
    totalLifetimeDebited: 0,
    totalLifetimeDeposited: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("ALL");

  // Adjust Credits Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [adjustType, setAdjustType] = useState("ADD"); // "ADD" or "DEDUCT"
  const [creditsAmount, setCreditsAmount] = useState("100");
  const [adjustRemarks, setAdjustRemarks] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Client Ledger Audit Modal
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerClient, setLedgerClient] = useState(null);
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [ledgerFilterType, setLedgerFilterType] = useState("ALL");

  // Fetch Clients
  const fetchClients = useCallback(async () => {
    if (!hasAccess) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/admin/wallet/clients`,
        {
          params: { search: searchQuery.trim() },
        }
      );
      if (res.data?.success && res.data?.data) {
        setClients(res.data.data.clients || []);
        if (res.data.data.summary) {
          setSummary(res.data.data.summary);
        }
      }
    } catch (err) {
      console.error("Error fetching admin clients:", err);
      Swal.fire({
        icon: "error",
        title: "Access Error",
        text: err.response?.data?.message || "Failed to load admin client wallets",
      });
    } finally {
      setLoading(false);
    }
  }, [hasAccess, searchQuery]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Open Adjust Modal
  const handleOpenAdjust = (client, defaultType = "ADD") => {
    setSelectedClient(client);
    setAdjustType(defaultType);
    setCreditsAmount(defaultType === "ADD" ? "100" : "10");
    setAdjustRemarks("");
    setAdjustModalOpen(true);
  };

  // Submit Credit Adjustment
  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;

    const numCredits = Number(creditsAmount);
    if (!numCredits || numCredits <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Credits",
        text: "Please enter a valid positive number of credits.",
      });
      return;
    }

    const delta = adjustType === "ADD" ? numCredits : -numCredits;

    if (adjustType === "DEDUCT" && numCredits > selectedClient.availableCredits) {
      Swal.fire({
        icon: "error",
        title: "Insufficient Balance",
        text: `Client only has ${selectedClient.availableCredits} credits. You cannot deduct ${numCredits} credits.`,
      });
      return;
    }

    try {
      setAdjusting(true);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/eway-bill/admin/wallet/adjust-credits`,
        {
          clientId: selectedClient._id,
          creditsDelta: delta,
          remarks:
            adjustRemarks.trim() ||
            (adjustType === "ADD"
              ? `Admin credit allocation of +${numCredits} credits`
              : `Admin deduction of -${numCredits} credits`),
        }
      );

      if (res.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Credits Adjusted!",
          text: res.data.message,
          timer: 2000,
          showConfirmButton: false,
        });
        setAdjustModalOpen(false);
        fetchClients();
      }
    } catch (err) {
      console.error("Error adjusting credits:", err);
      Swal.fire({
        icon: "error",
        title: "Adjustment Failed",
        text: err.response?.data?.message || "Could not adjust credits",
      });
    } finally {
      setAdjusting(false);
    }
  };

  // Fetch Ledger for Client
  const fetchClientLedger = useCallback(
    async (client, pageNum = 1, type = "ALL") => {
      if (!client) return;
      try {
        setLoadingLedger(true);
        const params = { page: pageNum, limit: 15 };
        if (type !== "ALL") params.type = type;

        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/eway-bill/admin/wallet/client-ledger/${client._id}`,
          { params }
        );
        if (res.data?.success && res.data?.data) {
          setLedgerTransactions(res.data.data.transactions || []);
          if (res.data.data.pagination) {
            setLedgerTotalPages(res.data.data.pagination.pages || 1);
          }
        }
      } catch (err) {
        console.error("Failed to fetch client ledger:", err);
      } finally {
        setLoadingLedger(false);
      }
    },
    []
  );

  const handleOpenLedger = (client) => {
    setLedgerClient(client);
    setLedgerPage(1);
    setLedgerFilterType("ALL");
    setLedgerModalOpen(true);
    fetchClientLedger(client, 1, "ALL");
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    if (balanceFilter === "ZERO") return c.availableCredits === 0;
    if (balanceFilter === "LOW") return c.availableCredits > 0 && c.availableCredits < 5;
    if (balanceFilter === "HIGH") return c.availableCredits >= 50;
    return true;
  });

  if (!hasAccess) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px solid #e2e8f0" }}>
          <AdminPanelSettingsIcon sx={{ fontSize: 56, color: "#dc2626", mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", mb: 1 }}>
            Access Denied
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
            This page is restricted to administrator accounts (punit@alluvium.in or system administrators).
          </Typography>
          <Button variant="contained" onClick={() => navigate("/wallet")} sx={{ textTransform: "none", borderRadius: 2 }}>
            Return to Wallet
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3, px: { xs: 1.5, sm: 3 } }}>
      {/* Header Bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton
              size="small"
              onClick={() => navigate("/wallet")}
              sx={{ bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
              Admin Credit Control Panel
            </Typography>
            <Chip
              label={isPunit ? "Admin: punit@alluvium.in" : "Administrator"}
              size="small"
              sx={{ bgcolor: "#f3e8ff", color: "#7c3aed", fontWeight: 700, fontSize: "0.75rem" }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5, ml: { sm: 5.5 } }}>
            Centrally manage and allocate E-Way Bill credits for all client organizations.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => navigate("/wallet")}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              bgcolor: "#ffffff",
            }}
          >
            Client Wallet View
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchClients}
            disabled={loading}
            sx={{
              bgcolor: "#7c3aed",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              "&:hover": { bgcolor: "#6d28d9" },
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Global Summary KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Total Clients */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Total Clients
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: "#0f172a", my: 0.5 }}>
                {summary.totalClients}
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                Active Accounts in Portal
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Circulating Credits */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #bbf7d0", bgcolor: "#f0fdf4" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                Circulating Credits
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: "#15803d", my: 0.5 }}>
                {summary.totalCirculatingCredits}
              </Typography>
              <Typography variant="caption" sx={{ color: "#166534", fontWeight: 600 }}>
                ≈ ₹{summary.totalCirculatingCredits * CREDIT_RATE} Current Float
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Lifetime Used (Debits) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #fed7aa", bgcolor: "#fff7ed" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#c2410c", textTransform: "uppercase" }}>
                Lifetime E-Way Bills
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: "#ea580c", my: 0.5 }}>
                {summary.totalLifetimeDebited}
              </Typography>
              <Typography variant="caption" sx={{ color: "#c2410c", fontWeight: 600 }}>
                Total Generations Consumed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Credits Granted */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #ddd6fe", bgcolor: "#faf5ff" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>
                Total Allocated
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: "#7c3aed", my: 0.5 }}>
                {summary.totalLifetimeDeposited}
              </Typography>
              <Typography variant="caption" sx={{ color: "#7c3aed", fontWeight: 600 }}>
                Admin Grants & Top-Ups
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Client List Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff", overflow: "hidden" }}>
        {/* Table Filter Bar */}
        <Box
          sx={{
            p: 2.5,
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.1rem" }}>
              Client Accounts & Credit Balances
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              Showing {filteredClients.length} of {clients.length} client organizations
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
            <TextField
              size="small"
              placeholder="Search by client name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 240 }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Balance Filter</InputLabel>
              <Select
                value={balanceFilter}
                label="Balance Filter"
                onChange={(e) => setBalanceFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Balances</MenuItem>
                <MenuItem value="LOW">Low Credits (&lt; 5)</MenuItem>
                <MenuItem value="ZERO">Zero Balance (0)</MenuItem>
                <MenuItem value="HIGH">High Balance (&ge; 50)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Table */}
        <TableContainer sx={{ minHeight: 320 }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>CLIENT NAME & DETAILS</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>AVAILABLE CREDITS</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>BLOCKED</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>LIFETIME USED</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>LIFETIME GRANTED</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" sx={{ color: "#64748b", mt: 1 }}>
                      Loading clients...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                      No clients found matching the search criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const isZero = client.availableCredits === 0;
                  const isLow = client.availableCredits < 5 && client.availableCredits > 0;

                  return (
                    <TableRow key={client._id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      {/* Client info */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                          {client.name || "Unnamed Client"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                          {client.email}
                        </Typography>
                        {client.ie_code_no && (
                          <Typography variant="caption" sx={{ color: "#2563eb", fontWeight: 600 }}>
                            IE Code: {client.ie_code_no}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Available Credits */}
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 900,
                              fontSize: "1rem",
                              color: isZero ? "#dc2626" : isLow ? "#ea580c" : "#15803d",
                            }}
                          >
                            {client.availableCredits}
                          </Typography>
                          {isZero && <Chip label="Empty" size="small" color="error" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />}
                          {isLow && <Chip label="Low" size="small" color="warning" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />}
                        </Box>
                        <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                          ≈ ₹{client.availableCredits * CREDIT_RATE}
                        </Typography>
                      </TableCell>

                      {/* Blocked Credits */}
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: client.blockedCredits > 0 ? "#ea580c" : "#94a3b8" }}>
                          {client.blockedCredits || 0}
                        </Typography>
                      </TableCell>

                      {/* Lifetime Used */}
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569" }}>
                          {client.totalDebited || 0}
                        </Typography>
                      </TableCell>

                      {/* Lifetime Granted */}
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#2563eb" }}>
                          {client.totalDeposited || 0}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddCircleIcon sx={{ fontSize: "16px !important" }} />}
                            onClick={() => handleOpenAdjust(client, "ADD")}
                            sx={{
                              bgcolor: "#15803d",
                              textTransform: "none",
                              fontWeight: 700,
                              borderRadius: 1.5,
                              px: 1.5,
                              fontSize: "0.75rem",
                              "&:hover": { bgcolor: "#166534" },
                            }}
                          >
                            Add Credits
                          </Button>

                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<HistoryIcon sx={{ fontSize: "16px !important" }} />}
                            onClick={() => handleOpenLedger(client)}
                            sx={{
                              color: "#475569",
                              borderColor: "#cbd5e1",
                              textTransform: "none",
                              fontWeight: 600,
                              borderRadius: 1.5,
                              px: 1.5,
                              fontSize: "0.75rem",
                            }}
                          >
                            Ledger
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Adjust Credits Dialog */}
      <Dialog
        open={adjustModalOpen}
        onClose={() => !adjusting && setAdjustModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccountBalanceWalletIcon sx={{ color: adjustType === "ADD" ? "#15803d" : "#dc2626" }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
              {adjustType === "ADD" ? "Allocate / Grant Credits" : "Deduct Credits"}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setAdjustModalOpen(false)} disabled={adjusting}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSubmitAdjustment}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {selectedClient && (
              <Box sx={{ p: 1.5, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                  Selected Client:
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {selectedClient.name} ({selectedClient.email})
                </Typography>
                <Typography variant="caption" sx={{ color: "#166534", fontWeight: 700 }}>
                  Current Balance: {selectedClient.availableCredits} Credits
                </Typography>
              </Box>
            )}

            {/* Action Toggle */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant={adjustType === "ADD" ? "contained" : "outlined"}
                color="success"
                fullWidth
                onClick={() => setAdjustType("ADD")}
                startIcon={<AddCircleIcon />}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
              >
                Add Credits
              </Button>
              <Button
                variant={adjustType === "DEDUCT" ? "contained" : "outlined"}
                color="error"
                fullWidth
                onClick={() => setAdjustType("DEDUCT")}
                startIcon={<RemoveCircleIcon />}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
              >
                Deduct
              </Button>
            </Box>

            {/* Quick Preset Chips for Add */}
            {adjustType === "ADD" && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "#64748b", mb: 0.5, display: "block" }}>
                  Quick Packages:
                </Typography>
                <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                  {[50, 100, 200, 500, 1000].map((amt) => (
                    <Chip
                      key={amt}
                      label={`+${amt} Cr`}
                      clickable
                      color={Number(creditsAmount) === amt ? "primary" : "default"}
                      variant={Number(creditsAmount) === amt ? "filled" : "outlined"}
                      onClick={() => setCreditsAmount(String(amt))}
                      sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Credits Amount Input */}
            <TextField
              label="Credits Amount"
              type="number"
              value={creditsAmount}
              onChange={(e) => setCreditsAmount(e.target.value)}
              fullWidth
              size="small"
              required
              inputProps={{ min: 1, step: 1 }}
              helperText={`Equivalent to ₹${Number(creditsAmount || 0) * CREDIT_RATE} (Rate: ₹9 / credit)`}
            />

            {/* Remarks / Reason */}
            <TextField
              label="Adjustment Reason / Remarks"
              placeholder="e.g. Bank payment received, UTR12345678, Initial credit grant"
              value={adjustRemarks}
              onChange={(e) => setAdjustRemarks(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
              required
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button onClick={() => setAdjustModalOpen(false)} disabled={adjusting} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={adjusting}
              color={adjustType === "ADD" ? "success" : "error"}
              sx={{ textTransform: "none", fontWeight: 700, px: 3, borderRadius: 2 }}
            >
              {adjusting
                ? "Processing..."
                : adjustType === "ADD"
                ? `Add ${creditsAmount || 0} Credits`
                : `Deduct ${creditsAmount || 0} Credits`}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Client Ledger History Modal */}
      <Dialog
        open={ledgerModalOpen}
        onClose={() => setLedgerModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
              Client Audit Ledger: {ledgerClient?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              {ledgerClient?.email} | Available: {ledgerClient?.availableCredits} Credits
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setLedgerModalOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          {/* Ledger Filter */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Filter Type</InputLabel>
              <Select
                value={ledgerFilterType}
                label="Filter Type"
                onChange={(e) => {
                  setLedgerFilterType(e.target.value);
                  setLedgerPage(1);
                  fetchClientLedger(ledgerClient, 1, e.target.value);
                }}
              >
                <MenuItem value="ALL">All Transactions</MenuItem>
                <MenuItem value="EWAYBILL_DEBIT">Debits (E-Way Bills)</MenuItem>
                <MenuItem value="ADMIN_ADJUSTMENT">Admin Grants</MenuItem>
                <MenuItem value="PAYMENT_CREDIT">Payment Credits</MenuItem>
                <MenuItem value="EWAYBILL_REWARD">Rewards</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer sx={{ maxHeight: 380, border: "1px solid #e2e8f0", borderRadius: 2 }}>
            <Table stickyHeader size="small">
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>DATE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>TYPE</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>CREDITS</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>BALANCE AFTER</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>REFERENCE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>REMARKS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingLedger ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : ledgerTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                      No ledger entries found for this client.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerTransactions.map((t) => (
                    <TableRow key={t._id} hover>
                      <TableCell sx={{ fontSize: "0.78rem" }}>
                        {new Date(t.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>
                        <Chip
                          size="small"
                          label={t.transactionType}
                          color={t.credits < 0 ? "error" : "success"}
                          variant="outlined"
                          sx={{ fontSize: "0.68rem", height: 18 }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: t.credits < 0 ? "#dc2626" : "#16a34a" }}>
                        {t.credits > 0 ? `+${t.credits}` : t.credits}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t.balanceAfter}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{t.referenceId || "-"}</TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", color: "#475569" }}>{t.remarks}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {ledgerTotalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Pagination
                count={ledgerTotalPages}
                page={ledgerPage}
                onChange={(e, val) => {
                  setLedgerPage(val);
                  fetchClientLedger(ledgerClient, val, ledgerFilterType);
                }}
                size="small"
                color="primary"
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}

export default AdminWalletControlPage;
