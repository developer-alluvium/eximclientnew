import React from "react";
import { Box, Typography, Tooltip, CircularProgress, Chip } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { getJsonCookie } from "../../utils/cookies";

function CreditBadge() {
  const navigate = useNavigate();
  const {
    balance,
    availableCredits,
    blockedCredits,
    pricingTier,
    pricingReason,
    currencyRate,
    loading,
  } = useWallet();

  const userData = getJsonCookie("exim_user") || {};
  const isPunitOrAdmin =
    userData?.email?.toLowerCase() === "punit@alluvium.in" ||
    userData?.role === "admin" ||
    userData?.role === "superadmin" ||
    userData?.role === "super_admin";

  const isLowBalance = (balance || 0) < 5;
  const isPartnerTier = pricingTier === "SFPL_SRCC_PARTNER";

  const tooltipContent = (
    <Box sx={{ p: 0.5, fontSize: "0.78rem" }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", color: "#f8fafc" }}>
        ⚡ E-Way Bill Credit Balance
      </Typography>
      <div>Available: <strong>{availableCredits}</strong> credits</div>
      {blockedCredits > 0 && <div>In-flight Blocked: <strong>{blockedCredits}</strong></div>}
      <div>Rate: <strong>{currencyRate || "1 Credit = ₹9"}</strong></div>
      <div style={{ marginTop: 4, color: isPartnerTier ? "#86efac" : "#cbd5e1" }}>
        Tier: {pricingReason || "Standard Commercial Tier (1 Credit / EWB)"}
      </div>
      <div style={{ marginTop: 6, fontSize: "0.72rem", color: "#93c5fd", fontWeight: 600 }}>
        Click to view full transaction history & balance statement
      </div>
      {isPunitOrAdmin && (
        <div style={{ marginTop: 2, fontSize: "0.72rem", color: "#fde047", fontWeight: 700 }}>
          ⭐ Admin Access: Manage client credits
        </div>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="bottom">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          cursor: "pointer",
          transition: "all 0.2s ease",
          bgcolor: isPartnerTier
            ? "#ecfdf5"
            : isLowBalance
            ? "#fef2f2"
            : "#f8fafc",
          border: "1px solid",
          borderColor: isPartnerTier
            ? "#a7f3d0"
            : isLowBalance
            ? "#fecaca"
            : "#e2e8f0",
          "&:hover": {
            bgcolor: isPartnerTier
              ? "#d1fae5"
              : isLowBalance
              ? "#fee2e2"
              : "#f1f5f9",
            borderColor: isPartnerTier
              ? "#6ee7b7"
              : isLowBalance
              ? "#f87171"
              : "#cbd5e1",
            transform: "translateY(-1px)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          },
        }}
        onClick={() => navigate("/wallet")}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isPartnerTier ? "#059669" : isLowBalance ? "#dc2626" : "#2563eb",
          }}
        >
          {loading ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <BoltIcon sx={{ fontSize: 18 }} />
          )}
        </Box>

        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontSize: "0.82rem",
            color: isPartnerTier
              ? "#065f46"
              : isLowBalance
              ? "#b91c1c"
              : "#1e293b",
          }}
        >
          {loading ? "..." : `${balance || 0} Credits`}
        </Typography>

        {isLowBalance && (
          <Chip
            label="Low"
            size="small"
            color="error"
            variant="filled"
            sx={{
              height: 18,
              fontSize: "0.65rem",
              fontWeight: 700,
              px: 0.3,
            }}
          />
        )}
      </Box>
    </Tooltip>
  );
}

export default CreditBadge;
