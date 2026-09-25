import React, { useEffect } from "react";
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
    isFreeTrial,
    daysRemaining,
    pricingTier,
    pricingReason,
    currencyRate,
    loading,
    isInitialized,
    refreshBalance,
  } = useWallet();

  // Automatically fetch fresh balance when CreditBadge mounts in the navbar
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

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

  // Prevent false "Service Inactive" flash while initial fetch is completing
  const isInitialLoading = !isInitialized || (loading && availableCredits === 0 && walletServiceStatus === "INACTIVE");

  // Free Trial Offer condition: active service + introductory 3-month trial
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

  // 3-Tier Visual Thresholds (Only applies when NOT on free trial or partner tier)
  const isCritical = !isUnlimitedOrFree && effectiveCredits <= 10;
  const isWarning = !isUnlimitedOrFree && effectiveCredits > 10 && effectiveCredits <= 20;

  // Palette assignment
  const badgeColors = isInitialLoading
    ? {
        bg: "#f8fafc",
        border: "#cbd5e1",
        text: "#475569",
        icon: "#64748b",
        hoverBg: "#f1f5f9",
        tag: "Loading...",
        tagColor: "default",
      }
    : isServiceInactive
    ? {
        bg: "#fef2f2",
        border: "#f87171",
        text: "#991b1b",
        icon: "#dc2626",
        hoverBg: "#fee2e2",
        tag: "Service Inactive",
        tagColor: "error",
      }
    : isFreeTrialOffer
    ? {
        bg: "#f0fdf4",
        border: "#86efac",
        text: "#166534",
        icon: "#16a34a",
        hoverBg: "#dcfce7",
        tag: "🎁 3 Months Free Trial",
        tagColor: "success",
      }
    : isPartnerTier
    ? {
        bg: "#f0fdf4",
        border: "#86efac",
        text: "#166534",
        icon: "#16a34a",
        hoverBg: "#dcfce7",
        tag: "SFPL Partner",
        tagColor: "success",
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
        tag: "Healthy",
        tagColor: "success",
      };

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

      {/* Free Trial Highlight Card in Tooltip */}
      {isFreeTrialOffer ? (
        <Box sx={{ mt: 0.5, mb: 1, p: 1, bgcolor: "rgba(34, 197, 94, 0.15)", borderRadius: 1.5, border: "1px solid rgba(74, 222, 128, 0.4)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.2 }}>
            <span style={{ color: "#86efac", fontWeight: 700 }}>Introductory Offer:</span>
            <strong style={{ color: "#4ade80", fontWeight: 800 }}>🎁 3 Months Free Trial</strong>
          </Box>
          {daysRemaining !== null && daysRemaining !== undefined && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.2 }}>
              <span style={{ color: "#cbd5e1" }}>Validity Remaining:</span>
              <strong style={{ color: daysRemaining <= 10 ? "#f87171" : "#4ade80", fontWeight: 800 }}>
                {daysRemaining > 0 ? `${daysRemaining} days left` : "Expired"}
              </strong>
            </Box>
          )}
          <Box sx={{ fontSize: "0.72rem", color: "#bbf7d0", mt: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
            <span>✅</span>
            <span>Free E-Way Bill generation active for all containers!</span>
          </Box>
        </Box>
      ) : (
        <>
          {/* Service Status */}
          <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.3 }}>
            <span style={{ color: "#cbd5e1" }}>Service Status:</span>
            <strong style={{ color: isServiceInactive ? "#f87171" : "#4ade80", fontWeight: 800 }}>
              {isServiceInactive ? "INACTIVE (Disabled)" : "ACTIVE"}
            </strong>
          </Box>

          {daysRemaining !== null && daysRemaining !== undefined && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.3 }}>
              <span style={{ color: "#cbd5e1" }}>Validity Remaining:</span>
              <strong style={{ color: daysRemaining <= 10 ? "#f87171" : "#e2e8f0" }}>
                {daysRemaining > 0 ? `${daysRemaining} days left` : "Expired"}
              </strong>
            </Box>
          )}
        </>
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
        <strong style={{ color: isFreeTrialOffer ? "#4ade80" : isCritical ? "#f87171" : isWarning ? "#fde047" : "#4ade80" }}>
          {isFreeTrialOffer ? "Free (Trial Active)" : `${effectiveCredits} Credits`}
        </strong>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.3, borderTop: "1px dashed #475569", mt: 0.5, pt: 0.5 }}>
        <span style={{ color: "#94a3b8" }}>Commercial Rate:</span>
        <strong style={{ color: "#e2e8f0" }}>{currencyRate || "1 Credit = ₹9"}</strong>
      </Box>

      <Box sx={{ mt: 0.8, fontSize: "0.74rem", color: isPartnerTier ? "#86efac" : isFreeTrialOffer ? "#4ade80" : "#94a3b8" }}>
        Tier: {pricingReason || (isFreeTrialOffer ? "3 Months Free Trial (0 Credits / Free Now)" : isPartnerTier ? "SFPL + SRCC Partner (0 Debit, +1 Reward)" : "Standard Tier (1 Credit per EWB)")}
      </Box>

      {isServiceInactive && (
        <Box sx={{ mt: 1, p: 0.8, bgcolor: "rgba(220, 38, 38, 0.2)", borderRadius: 1.5, border: "1px solid rgba(248, 113, 113, 0.4)", color: "#fca5a5", fontSize: "0.72rem" }}>
          🚫 Service INACTIVE! E-Way Bill generation is blocked. Contact SuperAdmin (superadmin@exim.com) to activate your account.
        </Box>
      )}

      {!isServiceInactive && !isUnlimitedOrFree && isCritical && (
        <Box sx={{ mt: 1, p: 0.8, bgcolor: "rgba(220, 38, 38, 0.2)", borderRadius: 1.5, border: "1px solid rgba(248, 113, 113, 0.4)", color: "#fca5a5", fontSize: "0.72rem" }}>
          ⚠️ Critical balance! Contact SuperAdmin (superadmin@exim.com) to allocate credits before generating E-Way Bills.
        </Box>
      )}

      {!isServiceInactive && !isUnlimitedOrFree && isWarning && (
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
          {loading || isInitialLoading ? (
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
          {isInitialLoading ? "Loading..." : loading ? "..." : `${effectiveCredits} Credits`}
        </Typography>

        {isFreeTrialOffer ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
            <Chip
              label="🎁 3 Months Free Trial"
              size="small"
              color="success"
              variant="filled"
              sx={{
                height: 20,
                fontSize: "0.68rem",
                fontWeight: 800,
                bgcolor: "#16a34a",
                color: "#ffffff",
                px: 0.4,
              }}
            />
            {daysRemaining !== null && daysRemaining !== undefined && daysRemaining > 0 && (
              <Chip
                label={`${daysRemaining} days left`}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: "#15803d",
                  borderColor: "#86efac",
                  bgcolor: "#f0fdf4",
                  px: 0.4,
                }}
              />
            )}
          </Box>
        ) : (
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
        )}

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
