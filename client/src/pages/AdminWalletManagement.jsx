import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  CircularProgress,
  Paper,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HistoryIcon from "@mui/icons-material/History";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";
import { getJsonCookie } from "../utils/cookies";

const CREDIT_RATE_INR = 9; // 1 Credit = ₹9

/**
 * SuperAdmin Wallet Management Dashboard
 * Centralized Enterprise Credit Allocation for SuperAdmin only (superadmin@exim.com)
 */
function AdminWalletManagement() {
  const navigate = useNavigate();
  const userData = getJsonCookie("exim_user") || {};
  const userEmail = (userData?.email || "").toLowerCase();
  const userRole = (userData?.role || "").toLowerCase();

  const isSuperAdmin =
    userEmail === "superadmin@exim.com" ||
    userEmail === "punit@alluvium.in" ||
    userRole === "superadmin" ||
    userRole === "super_admin";

  // Clients state
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Credits Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [creditsToAdd, setCreditsToAdd] = useState(100);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Audit Ledger Dialog state
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [ledgerClient, setLedgerClient] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Fetch client wallets
  const fetchClients = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setLoading(true);
      // Try /api/admin/wallet/clients first, fallback to /api/eway-bill/admin/wallet/clients
      let res;
      try {
        res = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/wallet/clients`);
      } catch (e) {
        res = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/admin/wallet/clients`);
      }

      if (res.data?.success && res.data?.data) {
        const clientList = res.data.data.clients || [];
        setClients(
          clientList.map((c, index) => ({
            ...c,
            id: c._id || c.id || `client_${index}`,
          }))
        );
      }
    } catch (err) {
      console.error("Error loading clients for wallet management:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Clients",
        text: err.response?.data?.message || "Could not retrieve client wallets",
      });
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Open Add Credits Dialog
  const handleOpenAddCredits = (client) => {
    setSelectedClient(client);
    setCreditsToAdd(100);
    setRemarks("");
    setDialogOpen(true);
  };

  // Submit Add Credits
  const handleSubmitAddCredits = async (e) => {
    if (e) e.preventDefault();
    if (!selectedClient) return;

    const amount = Number(creditsToAdd);
    if (!amount || amount <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Credit Amount",
        text: "Please enter a valid credit amount greater than 0.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        clientId: selectedClient._id || selectedClient.id,
        creditsToAdd: amount,
        creditsDelta: amount,
        remarks: remarks.trim() || `Enterprise manual top-up of +${amount} credits by SuperAdmin`,
      };

      let res;
      try {
        res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/admin/wallet/manual-adjustment`,
          payload
        );
      } catch (postErr) {
        // Fallback to eway-bill proxy route
        res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/eway-bill/admin/wallet/manual-adjustment`,
          payload
        );
      }

      if (res.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Credits Added Successfully!",
          html: `
            <p><strong>Client:</strong> ${selectedClient.name}</p>
            <p><strong>Added:</strong> +${amount} Credits (₹${(amount * CREDIT_RATE_INR).toLocaleString("en-IN")})</p>
            <p><strong>New Balance:</strong> ${res.data.data?.wallet?.availableCredits ?? "Updated"}</p>
          `,
          timer: 3000,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });

        setDialogOpen(false);
        fetchClients();
      }
    } catch (err) {
      console.error("Error adding credits:", err);
      Swal.fire({
        icon: "error",
        title: "Credit Allocation Failed",
        text: err.response?.data?.message || "Could not allocate credits",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Audit Ledger Dialog
  const handleOpenLedger = async (client) => {
    setLedgerClient(client);
    setLedgerDialogOpen(true);
    try {
      setLoadingLedger(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/admin/wallet/client-details/${client._id || client.id}`
      );
      if (res.data?.success && res.data?.data) {
        setLedgerData(res.data.data.recentTransactions || []);
      }
    } catch (err) {
      console.error("Error loading client ledger:", err);
      setLedgerData([]);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Filter clients by search term
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.trim().toLowerCase();
    return clients.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.ie_code_no && c.ie_code_no.toLowerCase().includes(query))
    );
  }, [clients, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalClients = clients.length;
    let circulatingCredits = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let healthyCount = 0;

    clients.forEach((c) => {
      const bal = c.availableCredits || 0;
      circulatingCredits += bal;
      if (bal <= 10) criticalCount++;
      else if (bal <= 20) warningCount++;
      else healthyCount++;
    });

    return {
      totalClients,
      circulatingCredits,
      criticalCount,
      warningCount,
      healthyCount,
    };
  }, [clients]);

  // DataGrid Columns Definition
  const columns = useMemo(
    () => [
      {
        field: "name",
        headerName: "CLIENT NAME",
        flex: 1.3,
        minWidth: 180,
        renderCell: (params) => (
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
              {params.value || "Unnamed Client"}
            </Typography>
            {params.row.ie_code_no && params.row.ie_code_no !== "N/A" && (
              <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
                IE: {params.row.ie_code_no}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: "email",
        headerName: "EMAIL ADDRESS",
        flex: 1.5,
        minWidth: 220,
        renderCell: (params) => (
          <Typography sx={{ fontSize: "0.82rem", color: "#334155", fontWeight: 500 }}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: "availableCredits",
        headerName: "AVAILABLE CREDITS",
        width: 170,
        renderCell: (params) => {
          const val = params.value || 0;
          const isCrit = val <= 10;
          const isWarn = val > 10 && val <= 20;

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={`${val} Credits`}
                size="small"
                color={isCrit ? "error" : isWarn ? "warning" : "success"}
                variant={isCrit ? "filled" : "outlined"}
                sx={{
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  bgcolor: isCrit ? "#dc2626" : isWarn ? "#fefce8" : "#f0fdf4",
                  color: isCrit ? "#ffffff" : isWarn ? "#854d0e" : "#166534",
                  borderColor: isCrit ? "#dc2626" : isWarn ? "#fde047" : "#86efac",
                }}
              />
              <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }}>
                (₹{(val * CREDIT_RATE_INR).toLocaleString("en-IN")})
              </Typography>
            </Box>
          );
        },
      },
      {
        field: "blockedCredits",
        headerName: "IN-FLIGHT BLOCKED",
        width: 150,
        renderCell: (params) => {
          const blocked = params.value || 0;
          return (
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: blocked > 0 ? 700 : 500,
                color: blocked > 0 ? "#ea580c" : "#94a3b8",
              }}
            >
              {blocked > 0 ? `${blocked} Credits` : "0"}
            </Typography>
          );
        },
      },
      {
        field: "walletServiceStatus",
        headerName: "SERVICE STATUS",
        width: 140,
        renderCell: (params) => {
          const status = (params.value || params.row.walletServiceStatus || "INACTIVE").toUpperCase();
          const isActive = status === "ACTIVE";
          return (
            <Chip
              label={isActive ? "ACTIVE" : "INACTIVE"}
              size="small"
              color={isActive ? "success" : "error"}
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 800,
              }}
            />
          );
        },
      },
      {
        field: "isSfplClient",
        headerName: "PARTNER TIER",
        width: 140,
        renderCell: (params) => {
          const isPartner = Boolean(params.value || params.row.isSfplClient);
          return (
            <Chip
              label={isPartner ? "SFPL+SRCC" : "STANDARD"}
              size="small"
              color={isPartner ? "success" : "default"}
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 700,
              }}
            />
          );
        },
      },
      {
        field: "status",
        headerName: "USER STATUS",
        width: 120,
        renderCell: (params) => {
          const status = (params.value || "active").toLowerCase();
          const isActive = status === "active";
          return (
            <Chip
              label={isActive ? "ACTIVE" : "INACTIVE"}
              size="small"
              color={isActive ? "success" : "default"}
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 700,
              }}
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "ACTIONS",
        width: 220,
        sortable: false,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
              onClick={() => handleOpenAddCredits(params.row)}
              sx={{
                bgcolor: "#16a34a",
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.74rem",
                borderRadius: 1.5,
                py: 0.4,
                px: 1.2,
                boxShadow: "none",
                "&:hover": { bgcolor: "#15803d" },
              }}
            >
              Add Credits
            </Button>
            <Tooltip title="View Transaction Ledger">
              <IconButton
                size="small"
                onClick={() => handleOpenLedger(params.row)}
                sx={{ border: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}
              >
                <HistoryIcon sx={{ fontSize: 16, color: "#64748b" }} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    []
  );

  // Access Control Guard
  if (!isSuperAdmin) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px solid #e2e8f0" }}>
          <AdminPanelSettingsIcon sx={{ fontSize: 60, color: "#dc2626", mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", mb: 1 }}>
            Access Restricted
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
            This portal is exclusively accessible to the SuperAdmin (superadmin@exim.com) for centralized credit allocations.
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
      {/* Top Header */}
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
              SuperAdmin Wallet Management
            </Typography>
            <Chip
              label="SuperAdmin: superadmin@exim.com"
              size="small"
              sx={{ bgcolor: "#f3e8ff", color: "#7c3aed", fontWeight: 700, fontSize: "0.75rem" }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5, ml: { sm: 5.5 } }}>
            Enterprise credit allocations and wallet governance. Clients do not recharge themselves.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={
              <RefreshIcon
                sx={{
                  animation: loading ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": { "100%": { transform: "rotate(360deg)" } },
                }}
              />
            }
            onClick={fetchClients}
            disabled={loading}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              bgcolor: "#ffffff",
              "&:hover": { bgcolor: "#f8fafc" },
            }}
          >
            Refresh Wallets
          </Button>
        </Box>
      </Box>

      {/* KPI Overview Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Total Clients */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Managed Client Accounts
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: "#0f172a", my: 0.5 }}>
                {stats.totalClients}
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                Enterprise tenants on platform
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Circulating Credits */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Total Circulating Credits
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: "#2563eb", my: 0.5 }}>
                {stats.circulatingCredits.toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" sx={{ color: "#2563eb", fontWeight: 600 }}>
                ≈ ₹{(stats.circulatingCredits * CREDIT_RATE_INR).toLocaleString("en-IN")} (@ ₹9/credit)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Critical Balance Clients */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: stats.criticalCount > 0 ? "#fecaca" : "#e2e8f0",
              bgcolor: stats.criticalCount > 0 ? "#fef2f2" : "#ffffff",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: stats.criticalCount > 0 ? "#b91c1c" : "#64748b", textTransform: "uppercase" }}>
                  Critical (≤ 10 Credits)
                </Typography>
                <ErrorOutlineIcon sx={{ color: stats.criticalCount > 0 ? "#dc2626" : "#94a3b8", fontSize: 20 }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 900, color: stats.criticalCount > 0 ? "#dc2626" : "#0f172a", my: 0.5 }}>
                {stats.criticalCount}
              </Typography>
              <Typography variant="caption" sx={{ color: stats.criticalCount > 0 ? "#b91c1c" : "#64748b", fontWeight: 500 }}>
                Clients unable or near block
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Warning Balance Clients */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Warning (11-20 Credits)
                </Typography>
                <WarningAmberIcon sx={{ color: "#ca8a04", fontSize: 20 }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 900, color: "#a16207", my: 0.5 }}>
                {stats.warningCount}
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                Approaching low thresholds
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main DataGrid Section */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
        {/* Table Search Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.05rem" }}>
              Enterprise Client Wallets
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              Showing {filteredClients.length} of {clients.length} registered organizations
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Search by client name, email, IE code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 280 }}
          />
        </Box>

        {/* DataGrid Component */}
        <Box sx={{ height: 520, width: "100%" }}>
          <DataGrid
            rows={filteredClients}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            disableRowSelectionOnClick
            sx={{
              border: "none",
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "#f8fafc",
                fontWeight: 800,
                fontSize: "0.78rem",
                color: "#475569",
                borderBottom: "1.5px solid #e2e8f0",
              },
              "& .MuiDataGrid-row:hover": {
                bgcolor: "#f8fafc",
              },
              "& .MuiDataGrid-cell": {
                borderColor: "#f1f5f9",
              },
            }}
          />
        </Box>
      </Paper>

      {/* Add Credits Modal Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !submitting && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "#f0fdf4",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AddCircleOutlineIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
                Add Credits to Client Wallet
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b" }}>
                Manual Enterprise Credit Allocation (1 Credit = ₹9)
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => !submitting && setDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSubmitAddCredits}>
          <DialogContent sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2.5 }}>
            {selectedClient && (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Selected Tenant
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {selectedClient.name}
                </Typography>
                <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.82rem" }}>
                  Email: {selectedClient.email}
                </Typography>
                <Typography variant="body2" sx={{ color: "#166534", fontWeight: 700, fontSize: "0.82rem", mt: 0.5 }}>
                  Current Balance: {selectedClient.availableCredits || 0} Credits
                </Typography>
              </Box>
            )}

            {/* Preset Amount Chips */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", display: "block", mb: 0.8 }}>
                Quick Preset Allocations:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {[50, 100, 250, 500, 1000].map((preset) => (
                  <Chip
                    key={preset}
                    label={`+${preset} Credits (₹${(preset * CREDIT_RATE_INR).toLocaleString("en-IN")})`}
                    onClick={() => setCreditsToAdd(preset)}
                    color={creditsToAdd === preset ? "primary" : "default"}
                    variant={creditsToAdd === preset ? "filled" : "outlined"}
                    sx={{ fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}
                  />
                ))}
              </Box>
            </Box>

            {/* Custom Amount Field */}
            <TextField
              label="Credits to Add"
              type="number"
              fullWidth
              value={creditsToAdd}
              onChange={(e) => setCreditsToAdd(Math.max(1, parseInt(e.target.value, 10) || 0))}
              helperText={`Equivalent to ₹${((creditsToAdd || 0) * CREDIT_RATE_INR).toLocaleString("en-IN")} (@ ₹9 per credit)`}
              InputProps={{
                inputProps: { min: 1 },
              }}
              required
            />

            {/* Remarks / Payment Reference */}
            <TextField
              label="Remarks / Payment Reference"
              placeholder="e.g., NEFT Ref #123456789 / Advance Quota Refill"
              fullWidth
              multiline
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              helperText="Audit description recorded into client's immutable credit ledger."
              required
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={submitting} sx={{ textTransform: "none", color: "#64748b" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !creditsToAdd || creditsToAdd <= 0}
              sx={{
                bgcolor: "#16a34a",
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                "&:hover": { bgcolor: "#15803d" },
              }}
            >
              {submitting ? "Allocating..." : `Confirm & Add ${creditsToAdd || 0} Credits`}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Audit Ledger Dialog */}
      <Dialog
        open={ledgerDialogOpen}
        onClose={() => setLedgerDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <HistoryIcon sx={{ color: "#2563eb" }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
              Audit Ledger: {ledgerClient?.name}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setLedgerDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {loadingLedger ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : ledgerData.length === 0 ? (
            <Typography sx={{ py: 4, textAlign: "center", color: "#64748b" }}>
              No historical ledger records found for this client.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {ledgerData.map((item, index) => (
                <Box
                  key={item._id || index}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid #f1f5f9",
                    bgcolor: "#f8fafc",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={item.transactionType}
                        size="small"
                        sx={{ fontSize: "0.68rem", fontWeight: 700 }}
                      />
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : ""}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: "#334155", mt: 0.5 }}>
                      {item.remarks || "No remarks"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 800,
                        color: (item.credits || 0) > 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {(item.credits || 0) > 0 ? `+${item.credits}` : item.credits} Credits
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                      Balance After: {item.balanceAfter}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLedgerDialogOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminWalletManagement;
