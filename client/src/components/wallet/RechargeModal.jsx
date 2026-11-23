import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BoltIcon from "@mui/icons-material/Bolt";
import EmailIcon from "@mui/icons-material/Email";
import HistoryIcon from "@mui/icons-material/History";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { getJsonCookie } from "../../utils/cookies";

function RechargeModal({ open, onClose }) {
  const navigate = useNavigate();
  const { balance, rechargeReason } = useWallet();

  const userData = getJsonCookie("exim_user") || {};
  const isPunitOrAdmin =
    userData?.email?.toLowerCase() === "punit@alluvium.in" ||
    userData?.role === "admin" ||
    userData?.role === "superadmin" ||
    userData?.role === "super_admin";

  const handleGoToWallet = () => {
    onClose();
    navigate("/wallet");
  };

  const handleGoToAdminWallet = () => {
    onClose();
    navigate("/admin/wallet");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: "#fef2f2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BoltIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
              Insufficient Credits
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              Current Balance: {balance || 0} Credits
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#94a3b8" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {rechargeReason && (
          <Alert severity="warning" sx={{ borderRadius: 2, fontSize: "0.82rem" }}>
            {rechargeReason}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 2.5,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b", mb: 0.5 }}>
            Credits Required for E-Way Bill Generation
          </Typography>
          <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.82rem", lineHeight: 1.5 }}>
            Each successful E-Way Bill generation consumes <strong>1 Credit (₹9)</strong>. Credits are centrally allocated and maintained by the EXIM system administrator.
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 2.5,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#1d4ed8", display: "block", mb: 0.5 }}>
            To Allocate More Credits:
          </Typography>
          <Typography variant="body2" sx={{ color: "#1e3a8a", fontSize: "0.82rem", mb: 1 }}>
            Please contact your account manager or email our credit administrator:
          </Typography>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<EmailIcon />}
            href="mailto:punit@alluvium.in?subject=E-Way%20Bill%20Credit%20Allocation%20Request"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.78rem",
              borderRadius: 1.5,
              boxShadow: "none",
              bgcolor: "#2563eb",
            }}
          >
            punit@alluvium.in
          </Button>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", color: "#64748b" }}>
          Close
        </Button>

        {isPunitOrAdmin && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AdminPanelSettingsIcon />}
            onClick={handleGoToAdminWallet}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          >
            Admin Control
          </Button>
        )}

        <Button
          variant="contained"
          startIcon={<HistoryIcon />}
          onClick={handleGoToWallet}
          sx={{
            bgcolor: "#0f172a",
            textTransform: "none",
            fontWeight: 700,
            borderRadius: 2,
            "&:hover": { bgcolor: "#1e293b" },
          }}
        >
          View Statement
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RechargeModal;
