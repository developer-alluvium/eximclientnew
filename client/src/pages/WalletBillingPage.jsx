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
  CircularProgress,
  Pagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import BoltIcon from "@mui/icons-material/Bolt";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import StarsIcon from "@mui/icons-material/Stars";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EmailIcon from "@mui/icons-material/Email";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";
import { useWallet } from "../context/WalletContext";

const CREDIT_RATE = 9; // 1 Credit = ₹9

function WalletBillingPage() {
  const navigate = useNavigate();
  const {
    balance,
    availableCredits,
    blockedCredits,
    walletServiceStatus,
    isFirstTimeActivated,
    isFreeTrial,
    daysRemaining,
    pricingTier,
    refreshBalance,
  } = useWallet();

  const [stats, setStats] = useState({
    totalDeposited: 0,
    totalDebited: 0,
    totalRewarded: 0,
    totalFreeTrialEwbs: 0,
    totalMoneySaved: 0,
  });
  const [totalMoneySaved, setTotalMoneySaved] = useState(0);
  const [totalFreeTrialEwbs, setTotalFreeTrialEwbs] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch Wallet Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/wallet/stats`
      );
      if (res.data?.success && res.data?.data) {
        setStats(res.data.data);
        if (res.data.data.totalMoneySaved !== undefined) {
          setTotalMoneySaved(res.data.data.totalMoneySaved);
        }
        if (res.data.data.totalFreeTrialEwbs !== undefined) {
          setTotalFreeTrialEwbs(res.data.data.totalFreeTrialEwbs);
        }
      }
    } catch (err) {
      console.warn("Could not fetch wallet stats:", err.message);
    }
  }, []);

  // Fetch Ledger Transactions
  const fetchLedger = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      const params = {
        page,
        limit: 15,
      };
      if (filterType !== "ALL") params.type = filterType;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/wallet/ledger`,
        { params }
      );

      if (res.data?.success && res.data?.data) {
        setTransactions(res.data.data.transactions || []);
        if (res.data.data.pagination) {
          setTotalPages(res.data.data.pagination.pages || 1);
          setTotalCount(res.data.data.pagination.total || 0);
        }
        if (res.data.data.totalMoneySaved !== undefined) {
          setTotalMoneySaved(res.data.data.totalMoneySaved);
        }
        if (res.data.data.totalFreeTrialEwbs !== undefined) {
          setTotalFreeTrialEwbs(res.data.data.totalFreeTrialEwbs);
        }
      }
    } catch (err) {
      console.error("Failed to load credit ledger:", err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [page, filterType, searchQuery]);

  // Initial Load
  useEffect(() => {
    refreshBalance();
    fetchStats();
    fetchLedger();
  }, [refreshBalance, fetchStats, fetchLedger]);

  // Auto-refresh ledger when an E-Way Bill is generated elsewhere on the page
  // The wallet:refresh event is dispatched after every successful EWB generation.
  useEffect(() => {
    const handleWalletRefresh = () => {
      fetchStats();
      fetchLedger();
    };
    window.addEventListener("wallet:refresh", handleWalletRefresh);
    return () => window.removeEventListener("wallet:refresh", handleWalletRefresh);
  }, [fetchStats, fetchLedger]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([refreshBalance(), fetchStats(), fetchLedger()]);
    setRefreshing(false);
  };

  // CSV Export for Ledger
  const handleExportCSV = () => {
    if (!transactions.length) return;

    const headers = [
      "Date",
      "Time",
      "Transaction Type",
      "Credits",
      "Money Saved (INR)",
      "Balance After",
      "BOE Number",
      "Container Number",
      "E-Way Bill Number",
      "Reference",
      "Remarks",
    ];

    const rows = transactions.map((t) => {
      const d = new Date(t.createdAt);
      const isTrial = t.transactionType === "EWAYBILL_TRIAL_FREE" || t.isFreeTrial;
      return [
        d.toLocaleDateString("en-IN"),
        d.toLocaleTimeString("en-IN"),
        isTrial ? "3 Months Free Trial" : t.transactionType,
        isTrial ? "0" : t.credits,
        t.moneySaved || (isTrial ? 9 : 0),
        t.balanceAfter,
        t.boeNo || "",
        t.containerNo || "",
        t.ewayBillNo || "",
        t.referenceId || "N/A",
        `"${(t.remarks || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `credit_ledger_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const effectiveCredits = balance !== undefined && balance !== null ? balance : availableCredits || 0;
  const isServiceInactive = walletServiceStatus === "INACTIVE";

  const isFreeTrialOffer = Boolean(
    !isServiceInactive &&
    (isFreeTrial ||
      (isFirstTimeActivated &&
       daysRemaining !== null &&
       daysRemaining !== undefined &&
       daysRemaining > 0))
  );

  const isPartnerTier = pricingTier === "SFPL_SRCC_PARTNER";
  const isUnlimitedOrFree = isFreeTrialOffer || isPartnerTier;

  const isCritical = !isUnlimitedOrFree && effectiveCredits <= 10;
  const isWarning = !isUnlimitedOrFree && effectiveCredits > 10 && effectiveCredits <= 20;
  const isLowBalance = !isUnlimitedOrFree && (isCritical || isWarning);

  return (
    <Container maxWidth="xl" sx={{ py: 3, px: { xs: 1.5, sm: 3 } }}>
      {/* Top Header Bar */}
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <IconButton
              size="small"
              onClick={() => navigate("/ewaybill")}
              sx={{ bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}
            >
              E-Way Bill Credit Wallet & Billing
            </Typography>

            {/* Service Status Chip */}
            <Chip
              label={isServiceInactive ? "Service Inactive" : "Service Active"}
              color={isServiceInactive ? "error" : "success"}
              size="small"
              sx={{ fontWeight: 800, fontSize: "0.75rem" }}
            />

            {/* 3 Months Free Benefit Chip */}
            {isFreeTrialOffer && (
              <Chip
                label={`🎁 3 Months Free Trial (${daysRemaining || 90}d left)`}
                color="success"
                size="small"
                variant="filled"
                sx={{ fontWeight: 800, fontSize: "0.75rem", bgcolor: "#16a34a", color: "#ffffff" }}
              />
            )}

            {/* Credit Balance Threshold Chip */}
            {!isFreeTrialOffer && (
              <Chip
                label={isCritical ? "Critical Balance" : isWarning ? "Warning Balance" : "Healthy Balance"}
                color={isCritical ? "error" : isWarning ? "warning" : "success"}
                size="small"
                sx={{ fontWeight: 800, fontSize: "0.75rem" }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5, ml: { sm: 5.5 } }}>
            Real-time balance tracking, commercial consumption metrics, and complete ledger transaction statement.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, alignSelf: { xs: "stretch", sm: "auto" } }}>
          <Button
            variant="outlined"
            startIcon={
              <RefreshIcon
                sx={{
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            }
            onClick={handleRefreshAll}
            disabled={refreshing}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              bgcolor: "#ffffff",
              "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" },
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Service Inactive Warning Banner */}
      {isServiceInactive && (
        <Alert
          severity="error"
          variant="filled"
          sx={{
            mb: 3,
            borderRadius: 2.5,
            fontWeight: 600,
            alignItems: "center",
            bgcolor: "#b91c1c",
            boxShadow: "0 4px 12px rgba(185, 28, 28, 0.25)",
          }}
          action={
            <Button
              color="inherit"
              size="small"
              sx={{ fontWeight: 800, textTransform: "none" }}
              href="mailto:superadmin@exim.com?subject=E-Way%20Bill%20Wallet%20Service%20Activation%20Request"
            >
              Contact SuperAdmin
            </Button>
          }
        >
          E-Way Bill Generation Service Inactive: Your account's E-Way Bill generation service is currently deactivated. Generation requests are blocked until activated by SuperAdmin. Introductory activation automatically includes 3 months of free service!
        </Alert>
      )}

      {/* 3-Tier Balance Status Banners */}
      {!isServiceInactive && isCritical && (
        <Alert
          severity="error"
          variant="filled"
          sx={{
            mb: 3,
            borderRadius: 2.5,
            fontWeight: 600,
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.15)",
          }}
          action={
            <Button
              color="inherit"
              size="small"
              sx={{ fontWeight: 800, textTransform: "none" }}
              href="mailto:superadmin@exim.com?subject=E-Way%20Bill%20Credit%20Allocation%20Request"
            >
              Contact SuperAdmin
            </Button>
          }
        >
          Critical Credit Balance ({effectiveCredits} credits remaining, ≤ 10 threshold). Please contact SuperAdmin (superadmin@exim.com) to allocate credits and avoid E-Way Bill generation blocks.
        </Alert>
      )}

      {!isServiceInactive && isWarning && (
        <Alert
          severity="warning"
          variant="filled"
          sx={{
            mb: 3,
            borderRadius: 2.5,
            fontWeight: 600,
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)",
          }}
          action={
            <Button
              color="inherit"
              size="small"
              sx={{ fontWeight: 800, textTransform: "none" }}
              href="mailto:superadmin@exim.com?subject=E-Way%20Bill%20Credit%20Topup%20Notice"
            >
              Contact SuperAdmin
            </Button>
          }
        >
          Warning: Low credit threshold reached ({effectiveCredits} credits remaining, 11-20 range). Contact your administrator (superadmin@exim.com) to maintain active balance.
        </Alert>
      )}

      {/* KPI Stats Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Available Balance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: isLowBalance ? "#fecaca" : "#bbf7d0",
              bgcolor: isLowBalance ? "#fef2f2" : "#f0fdf4",
              height: "100%",
              transition: "transform 0.2s ease",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: isLowBalance ? "#991b1b" : "#166534", textTransform: "uppercase" }}>
                    Available Credits
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: isLowBalance ? "#dc2626" : "#15803d", my: 0.5 }}>
                    {availableCredits}
                  </Typography>
                  <Typography variant="caption" sx={{ color: isLowBalance ? "#b91c1c" : "#166534", fontWeight: 600 }}>
                    ≈ ₹{availableCredits * CREDIT_RATE} (Rate: 1 Credit = ₹9)
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: isLowBalance ? "#fee2e2" : "#dcfce7",
                    color: isLowBalance ? "#dc2626" : "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BoltIcon sx={{ fontSize: 26 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Effective Balance / In-Flight Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
              transition: "transform 0.2s ease",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Ready for Generation
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: "#0f172a", my: 0.5 }}>
                    {balance}
                  </Typography>
                  <Typography variant="caption" sx={{ color: blockedCredits > 0 ? "#ea580c" : "#64748b", fontWeight: 600 }}>
                    {blockedCredits > 0 ? `${blockedCredits} credits in-flight blocked` : "Zero pending locks"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AccountBalanceWalletIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Debited (Usage) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
              transition: "transform 0.2s ease",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Total E-Way Bills Generated
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: "#475569", my: 0.5 }}>
                    {(stats.totalDebited || 0) + (stats.totalFreeTrialEwbs || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                    {stats.totalFreeTrialEwbs > 0
                      ? `${stats.totalFreeTrialEwbs} Free Trial + ${stats.totalDebited || 0} Paid (${stats.totalDebited || 0} Cr debited)`
                      : `Lifetime Consumption (${stats.totalDebited || 0} credits debited)`}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: "#f1f5f9",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <RemoveCircleOutlineIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Credited & Tier */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
              transition: "transform 0.2s ease",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Total Credits Allocated
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: "#2563eb", my: 0.5 }}>
                    {stats.totalDeposited}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                    <Chip
                      size="small"
                      label={isPartnerTier ? "Partner (0 Debit)" : "Standard (1 Cr = ₹9)"}
                      color={isPartnerTier ? "success" : "primary"}
                      variant="outlined"
                      sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                    />
                  </Box>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: "#faf5ff",
                    color: "#9333ea",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StarsIcon sx={{ fontSize: 26 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3 Months Free Trial Total Savings Card / Banner */}
      {(isFreeTrial || totalMoneySaved > 0 || totalFreeTrialEwbs > 0) && (
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 3,
            border: "1px solid #bbf7d0",
            background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
            p: 2.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2.5,
                  bgcolor: "#dcfce7",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  boxShadow: "0 2px 8px rgba(22, 163, 74, 0.15)",
                }}
              >
                🎁
              </Box>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#166534" }}>
                    Introductory Offer: 3 Months Free Trial Active
                  </Typography>
                  <Chip
                    size="small"
                    label={`${daysRemaining !== null ? daysRemaining : 90} days left`}
                    color="success"
                    sx={{ fontWeight: 800, fontSize: "0.72rem", height: 22 }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: "#15803d", mt: 0.3, fontWeight: 500 }}>
                  You have generated <strong>{totalFreeTrialEwbs} container / full E-Way Bill(s)</strong> at ₹0 charge. Standard charges: 1 Credit = ₹9 per bill.
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                bgcolor: "#ffffff",
                px: 3,
                py: 1.5,
                borderRadius: 2.5,
                border: "1px solid #86efac",
                textAlign: "right",
              }}
            >
              <Typography variant="caption" sx={{ color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
                Total Money Saved via Free Service
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#15803d" }}>
                ₹{totalMoneySaved || (totalFreeTrialEwbs * CREDIT_RATE)}
              </Typography>
            </Box>
          </Box>
        </Card>
      )}

      {/* Admin Recharge Notice & Support Card */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#f8fafc",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <InfoOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Credit Allocation & Account Management
            </Typography>
            <Typography variant="body2" sx={{ color: "#475569", mt: 0.3 }}>
              E-Way Bill credits are centrally controlled and allocated by the administrator. 1 Credit is deducted per successful E-Way Bill generation. To request additional credits or view invoice history, contact your account administrator.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EmailIcon />}
            href="mailto:superadmin@exim.com?subject=E-Way%20Bill%20Credit%20Allocation%20Request"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              px: 2.5,
              py: 1,
              bgcolor: "#2563eb",
              boxShadow: "none",
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            Contact superadmin@exim.com
          </Button>
        </Box>
      </Paper>

      {/* Full Transaction History (Ledger Maintenance) */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          overflow: "hidden",
          mb: 4,
        }}
      >
        {/* Table Filter & Action Bar */}
        <Box
          sx={{
            p: 2.5,
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.1rem" }}>
              Credit Ledger Statement
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              Showing {transactions.length} of {totalCount} total historical transaction records
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
              width: { xs: "100%", md: "auto" },
            }}
          >
            {/* Search Input */}
            <TextField
              size="small"
              placeholder="Search by BOE / Remarks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 220 }}
            />

            {/* Filter by Type */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="filter-type-label">Transaction Type</InputLabel>
              <Select
                labelId="filter-type-label"
                value={filterType}
                label="Transaction Type"
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="ALL">All Transactions</MenuItem>
                <MenuItem value="EWAYBILL_TRIAL_FREE">🎁 3 Months Free Trial (0 Cr)</MenuItem>
                <MenuItem value="CONTAINER_EWAYBILL">Container E-Way Bills</MenuItem>
                <MenuItem value="FULL_EWAYBILL">Full E-Way Bills</MenuItem>
                <MenuItem value="EWAYBILL_DEBIT">Debits (Paid Credits)</MenuItem>
                <MenuItem value="ADMIN_ADJUSTMENT">Admin Credit Grants</MenuItem>
                <MenuItem value="PAYMENT_CREDIT">Top-Up Deposits</MenuItem>
                <MenuItem value="OFFER_ACTIVATION">Offer Activation</MenuItem>
                <MenuItem value="EWAYBILL_REWARD">Partner Rewards</MenuItem>
              </Select>
            </FormControl>

            {/* Export CSV */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportCSV}
              disabled={!transactions.length}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                color: "#475569",
                borderColor: "#cbd5e1",
                height: 38,
              }}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {/* Ledger Table */}
        <TableContainer sx={{ minHeight: 300 }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>
                  DATE & TIME
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>
                  TYPE
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>
                  CREDITS
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>
                  BALANCE AFTER
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>
                  REFERENCE / BOE
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.78rem" }}>
                  REMARKS & AUDIT DETAILS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingTransactions ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" sx={{ color: "#64748b", mt: 1 }}>
                      Loading ledger transactions...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        bgcolor: "#f1f5f9",
                        color: "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 1.5,
                      }}
                    >
                      <AccountBalanceWalletIcon sx={{ fontSize: 30 }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#334155" }}>
                      No Transaction Records Found
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      {searchQuery || filterType !== "ALL"
                        ? "No transactions match your filter criteria."
                        : "Credits debited for E-Way Bills or added by admin will appear here."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => {
                  const dateObj = new Date(t.createdAt);
                  const isDebit = t.transactionType === "EWAYBILL_DEBIT";
                  const isReward = t.transactionType === "EWAYBILL_REWARD";
                  const isTrialFree = t.transactionType === "EWAYBILL_TRIAL_FREE" || t.isFreeTrial;

                  return (
                    <TableRow
                      key={t._id}
                      hover
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                        transition: "background-color 0.15s",
                      }}
                    >
                      {/* Date & Time */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b", fontSize: "0.82rem" }}>
                          {dateObj.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                          {dateObj.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })}
                        </Typography>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell sx={{ py: 1.5 }}>
                        {isTrialFree ? (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-start" }}>
                            <Chip
                              size="small"
                              label="🎁 3 Months Free Trial"
                              variant="filled"
                              sx={{ fontWeight: 800, fontSize: "0.72rem", bgcolor: "#0284c7", color: "#fff" }}
                            />
                            {t.containerNo && (
                              <Chip
                                size="small"
                                label={`Cont: ${t.containerNo}`}
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: "0.68rem", height: 20, borderColor: "#38bdf8", color: "#0369a1" }}
                              />
                            )}
                          </Box>
                        ) : t.transactionType === "CONTAINER_EWAYBILL" ? (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-start" }}>
                            <Chip
                              size="small"
                              label="Container E-Way Bill"
                              color="primary"
                              variant="filled"
                              sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#2563eb", color: "#fff" }}
                            />
                            {t.containerNo && (
                              <Typography variant="caption" sx={{ fontWeight: 700, color: "#1e40af", fontSize: "0.7rem" }}>
                                {t.containerNo}
                              </Typography>
                            )}
                          </Box>
                        ) : t.transactionType === "FULL_EWAYBILL" ? (
                          <Chip
                            size="small"
                            label="Full E-Way Bill"
                            variant="filled"
                            sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#7c3aed", color: "#fff" }}
                          />
                        ) : t.transactionType === "OFFER_ACTIVATION" ? (
                          <Chip
                            size="small"
                            label="🎁 Offer Activated"
                            color="success"
                            variant="filled"
                            sx={{ fontWeight: 800, fontSize: "0.72rem", bgcolor: "#16a34a", color: "#fff" }}
                          />
                        ) : isDebit ? (
                          <Chip
                            size="small"
                            label="E-Way Bill Debit"
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#fef2f2" }}
                          />
                        ) : isReward ? (
                          <Chip
                            size="small"
                            label="Partner Reward"
                            color="success"
                            variant="filled"
                            sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#10b981" }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label={t.transactionType === "ADMIN_ADJUSTMENT" ? "Admin Grant" : t.transactionType === "SERVICE_ACTIVATION" ? "Service Status" : "Top-Up Deposit"}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#eff6ff" }}
                          />
                        )}
                      </TableCell>

                      {/* Credits Change (+/-) */}
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.88rem",
                            color: isTrialFree ? "#0284c7" : isDebit ? "#dc2626" : isReward ? "#059669" : "#2563eb",
                          }}
                        >
                          {isTrialFree ? "0 Cr (Free)" : t.credits > 0 ? `+${t.credits}` : t.credits}
                        </Typography>
                        {(isTrialFree || t.moneySaved > 0) && (
                          <Box sx={{ mt: 0.3 }}>
                            <Chip
                              size="small"
                              label={`Saved ₹${t.moneySaved || 9}`}
                              sx={{
                                height: 18,
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                bgcolor: "#dcfce7",
                                color: "#15803d",
                                border: "1px solid #86efac",
                              }}
                            />
                          </Box>
                        )}
                      </TableCell>

                      {/* Balance After */}
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#334155", fontSize: "0.84rem" }}>
                          {t.balanceAfter}
                        </Typography>
                      </TableCell>

                      {/* Reference / BOE No. */}
                      <TableCell sx={{ py: 1.5 }}>
                        {t.boeNo && t.containerNo ? (
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                fontFamily: "monospace",
                                color: "#1e293b",
                                fontSize: "0.82rem",
                              }}
                            >
                              BOE: {t.boeNo}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: "#2563eb",
                                display: "block",
                                fontFamily: "monospace",
                              }}
                            >
                              Cont: {t.containerNo}
                            </Typography>
                            {t.ewayBillNo && (
                              <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, display: "block" }}>
                                EWB: {t.ewayBillNo}
                              </Typography>
                            )}
                          </Box>
                        ) : t.referenceId ? (
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                fontFamily: "monospace",
                                color: "#2563eb",
                                fontSize: "0.8rem",
                              }}
                            >
                              {typeof t.referenceId === "object"
                                ? JSON.stringify(t.referenceId)
                                : t.referenceId}
                            </Typography>
                            {t.ewayBillNo && (
                              <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, display: "block" }}>
                                EWB: {t.ewayBillNo}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                            -
                          </Typography>
                        )}
                        {t.referenceModel && !t.containerNo && (
                          <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                            {t.referenceModel}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Remarks & Audit Details */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.82rem" }}>
                          {t.remarks || "No details provided"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              size="small"
            />
          </Box>
        )}
      </Paper>

      {/* FAQ & Billing Rules Accordion */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
          Frequently Asked Questions & Billing Rules
        </Typography>

        <Accordion elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: "12px !important", mb: 1.5, "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
              How does the credit billing model work?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.6 }}>
              Each E-Way Bill generation successfully executed through the portal consumes <strong>1 Credit (₹9)</strong>. Credits are atomically deducted only when the E-Way Bill is officially generated by the NIC system.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: "12px !important", mb: 1.5, "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
              What happens if an E-Way Bill generation fails?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.6 }}>
              Our system employs <strong>Two-Phase Reservation Locking</strong>. When you start generation, 1 credit is temporarily blocked. If the NIC portal returns an error or the request fails, the blocked credit is instantly rolled back to your available balance. You are <strong>never charged for failed generations</strong>.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: "12px !important", mb: 1.5, "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
              How do I add or recharge credits?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.6 }}>
              Credit allocations are maintained directly by the EXIM system administrators. Please get in touch with your account manager or email <strong>punit@alluvium.in</strong> with your requirements. The administrator will grant credits to your account.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: "12px !important", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
              What is the SFPL + SRCC Partner incentive?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.6 }}>
              Qualified partner clients operating with SFPL and SRCC Transporters receive <strong>Zero Deductions (0 Credits)</strong> and a <strong>+1 Credit Reward</strong> for every valid E-Way Bill generated through the system.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Container>
  );
}

export default WalletBillingPage;
