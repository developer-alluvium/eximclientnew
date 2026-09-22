import React from "react";
import { Box, Typography, Tooltip, CircularProgress, Chip, Button } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { getJsonCookie } from "../../utils/cookies";

/**
 * CreditBadge Component
 * Displays real-time E-Way Bill credit balance in Navbar with 3-tier visual indicators:
 * - > 20 Credits: Healthy (Green)
 * - 11 to 20 Credits: Warning (Yellow)
 * - <= 10 Credits: Critical (Red)
 * 
 * Admin-Managed Enterprise Model:
 * - Normal clients cannot recharge themselves (no Top Up button).
 * - Only SuperAdmin (superadmin@exim.com) sees "Manage Wallets" leading to /admin/wallet-management.
 */
function CreditBadge() {
  const navigate = useNavigate();
  const {
    balance,
    availableCredits,
    blockedCredits,
    walletServiceStatus,
    isFirstTimeActivated,
    daysRemaining,
    pricingTier,
    pricingReason,
    currencyRate,
    loading,
  } = useWallet();

  const userData = getJsonCookie("exim_user") || {};
  const userEmail = (userData?.email || "").toLowerCase();
  const userRole = (userData?.role || "").toLowerCase();

  const isSuperAdmin =
    userEmail === "superadmin@exim.com" ||
    userEmail === "punit@alluvium.in" ||
    userRole === "superadmin" ||
    userRole === "super_admin";

  const effectiveCredits = balance !== undefined && balance !== null ? balance : availableCredits || 0;
  const isServiceInactive = walletServiceStatus === "INACTIVE";

  // 3-Tier Visual Thresholds
  // > 20: Healthy (Green)
  // 11-20: Warning (Yellow)
  // <= 10: Critical (Red)
  const isCritical = effectiveCredits <= 10;
  const isWarning = effectiveCredits > 10 && effectiveCredits <= 20;

  // Palette assignment
  const badgeColors = isServiceInactive
    ? {
        bg: "#fef2f2",
        border: "#f87171",
        text: "#991b1b",
        icon: "#dc2626",
        hoverBg: "#fee2e2",
        tag: "Service Inactive",
        tagColor: "error",
      }
    : isCritical
    ? {
        bg: "#fef2f2",
        border: "#fca5a5",
        text: "#b91c1c",
        icon: "#dc2626",
        hoverBg: "#fee2e2",
        tag: "Critical",
        tagColor: "error",
      }
    : isWarning
    ? {
        bg: "#fefce8",
        border: "#fde047",
        text: "#854d0e",
        icon: "#ca8a04",
        hoverBg: "#fef9c3",
        tag: "Warning",
        tagColor: "warning",
      }
    : {
        bg: "#f0fdf4",
        border: "#86efac",
        text: "#166534",
        icon: "#16a34a",
        hoverBg: "#dcfce7",
        tag: isFirstTimeActivated ? "3 Mos Free" : "Healthy",
        tagColor: "success",
      };

  const isPartnerTier = pricingTier === "SFPL_SRCC_PARTNER";

  const tooltipContent = (
    <Box sx={{ p: 1, fontSize: "0.8rem", maxWidth: 290 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.8 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          ⚡ E-Way Bill Wallet
        </Typography>
        <Chip
          label={badgeColors.tag}
          size="small"
          color={badgeColors.tagColor}
          sx={{ height: 18, fontSize: "0.65rem", fontWeight: 800 }}
        />
      </Box>

      {/* Service Status */}
      <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.3 }}>
        <span style={{ color: "#cbd5e1" }}>Service Status:</span>
        <strong style={{ color: isServiceInactive ? "#f87171" : "#4ade80", fontWeight: 800 }}>
          {isServiceInactive ? "INACTIVE (Disabled)" : "ACTIVE"}
        </strong>
      </Box>

      {isFirstTimeActivated && (
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.3 }}>
          <span style={{ color: "#38bdf8" }}>Introductory Offer:</span>
          <strong style={{ color: "#38bdf8" }}>🎁 3 Months Free Trial</strong>
        </Box>
      )}

      {daysRemaining !== null && daysRemaining !== undefined && (
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.3 }}>
          <span style={{ color: "#cbd5e1" }}>Validity Remaining:</span>
          <strong style={{ color: daysRemaining <= 10 ? "#f87171" : "#e2e8f0" }}>
            {daysRemaining > 0 ? `${daysRemaining} days left` : "Expired"}
          </strong>
        </Box>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.3 }}>
        <span style={{ color: "#cbd5e1" }}>Available Credits:</span>
        <strong style={{ color: "#f8fafc" }}>{availableCredits}</strong>
      </Box>

      {blockedCredits > 0 && (
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.3 }}>
          <span style={{ color: "#fdba74" }}>In-flight Blocked:</span>
          <strong style={{ color: "#fdba74" }}>{blockedCredits}</strong>
        </Box>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.3 }}>
        <span style={{ color: "#cbd5e1" }}>Ready for Generation:</span>
        <strong style={{ color: isCritical ? "#f87171" : isWarning ? "#fde047" : "#4ade80" }}>
          {effectiveCredits} Credits
        </strong>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.3, borderTop: "1px dashed #475569", mt: 0.5, pt: 0.5 }}>
        <span style={{ color: "#94a3b8" }}>Commercial Rate:</span>
        <strong style={{ color: "#e2e8f0" }}>{currencyRate || "1 Credit = ₹9"}</strong>
      </Box>

      <Box sx={{ mt: 0.8, fontSize: "0.74rem", color: isPartnerTier ? "#86efac" : "#94a3b8" }}>
        Tier: {pricingReason || (isPartnerTier ? "SFPL + SRCC Partner (0 Debit, +1 Reward)" : "Standard Tier (1 Credit per EWB)")}
      </Box>

      {isServiceInactive && (
        <Box sx={{ mt: 1, p: 0.8, bgcolor: "rgba(220, 38, 38, 0.2)", borderRadius: 1.5, border: "1px solid rgba(248, 113, 113, 0.4)", color: "#fca5a5", fontSize: "0.72rem" }}>
          🚫 Service INACTIVE! E-Way Bill generation is blocked. Contact SuperAdmin (superadmin@exim.com) to activate your account.
        </Box>
      )}

      {!isServiceInactive && isCritical && (
        <Box sx={{ mt: 1, p: 0.8, bgcolor: "rgba(220, 38, 38, 0.2)", borderRadius: 1.5, border: "1px solid rgba(248, 113, 113, 0.4)", color: "#fca5a5", fontSize: "0.72rem" }}>
          ⚠️ Critical balance! Contact SuperAdmin (superadmin@exim.com) to allocate credits before generating E-Way Bills.
        </Box>
      )}

      {!isServiceInactive && isWarning && (
        <Box sx={{ mt: 1, p: 0.8, bgcolor: "rgba(234, 179, 8, 0.15)", borderRadius: 1.5, border: "1px solid rgba(253, 224, 71, 0.4)", color: "#fef08a", fontSize: "0.72rem" }}>
          ⚠️ Approaching low balance. Notify SuperAdmin to top up credits.
        </Box>
      )}

      {isSuperAdmin && (
        <Box sx={{ mt: 1.2, pt: 0.8, borderTop: "1px solid #334155" }}>
          <Button
            size="small"
            variant="contained"
            fullWidth
            startIcon={<AdminPanelSettingsIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/wallet-management");
            }}
            sx={{
              bgcolor: "#7c3aed",
              color: "#ffffff",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.72rem",
              py: 0.4,
              "&:hover": { bgcolor: "#6d28d9" },
            }}
          >
            Manage Wallets (SuperAdmin)
          </Button>
        </Box>
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
          bgcolor: badgeColors.bg,
          border: "1.5px solid",
          borderColor: badgeColors.border,
          boxShadow: isCritical ? "0 0 8px rgba(239, 68, 68, 0.25)" : "none",
          "&:hover": {
            bgcolor: badgeColors.hoverBg,
            transform: "translateY(-1px)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          },
        }}
        onClick={() => {
          if (isSuperAdmin) {
            navigate("/admin/wallet-management");
          } else {
            navigate("/wallet");
          }
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: badgeColors.icon,
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
            fontWeight: 800,
            fontSize: "0.82rem",
            color: badgeColors.text,
          }}
        >
          {loading ? "..." : `${effectiveCredits} Credits`}
        </Typography>

        <Chip
          label={badgeColors.tag}
          size="small"
          color={badgeColors.tagColor}
          variant="filled"
          sx={{
            height: 18,
            fontSize: "0.65rem",
            fontWeight: 800,
            px: 0.3,
          }}
        />

        {isSuperAdmin && (
          <Button
            size="small"
            variant="text"
            startIcon={<AdminPanelSettingsIcon sx={{ fontSize: 15 }} />}
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/wallet-management");
            }}
            sx={{
              ml: 0.5,
              py: 0.1,
              px: 0.8,
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "none",
              color: "#7c3aed",
              bgcolor: "rgba(124, 58, 237, 0.08)",
              borderRadius: 1.5,
              "&:hover": {
                bgcolor: "rgba(124, 58, 237, 0.16)",
              },
            }}
          >
            Manage
          </Button>
        )}
      </Box>
    </Tooltip>
  );
}

export default CreditBadge;
