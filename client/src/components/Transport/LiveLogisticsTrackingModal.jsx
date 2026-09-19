import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Fade,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  Close as CloseIcon,
  LocalShipping as LocalShippingIcon,
  LocationOn as LocationIcon,
  LocalGasStation as GasIcon,
  VerifiedUser as ShieldIcon,
  EventAvailable as DateIcon,
  Receipt as TaxIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Navigation as NavigationIcon,
} from "@mui/icons-material";

const formatDisplayDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const date = d.toLocaleDateString("en-GB"); // DD/MM/YYYY
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${date} | ${time}`;
  } catch (e) {
    return dateStr;
  }
};

export default function LiveLogisticsTrackingModal({
  open,
  onClose,
  vehicleNo,
  vehicleType,
  ownHired,
  driverName,
  driverPhone,
}) {
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  const [vahanData, setVahanData] = useState(null);
  const [vahanLoading, setVahanLoading] = useState(false);

  const cleanVehicleNo = vehicleNo ? String(vehicleNo).toUpperCase().replace(/\s+/g, "") : "";

  const fetchAllData = useCallback(async () => {
    if (!cleanVehicleNo) return;

    setTrackingLoading(true);
    setTrackingError("");
    setTrackingData(null);

    setVahanLoading(true);
    setVahanData(null);

    try {
      const [trackingRes, vahanRes] = await Promise.allSettled([
        axios.post(`${process.env.REACT_APP_API_STRING}/transport/truck-tracking/search`, {
          vehiclenumber: cleanVehicleNo,
        }),
        axios.get(`${process.env.REACT_APP_API_STRING}/transport/truck-tracking/vahan-details/${cleanVehicleNo}`),
      ]);

      // Handle Location / Toll Tracking Result
      if (trackingRes.status === "fulfilled" && trackingRes.value.data?.success && trackingRes.value.data?.data) {
        setTrackingData(trackingRes.value.data.data);
      } else {
        const errMsg =
          trackingRes.status === "rejected"
            ? trackingRes.reason?.response?.data?.message || trackingRes.reason?.message
            : trackingRes.value?.data?.message || "No tracking checkpoints found for this vehicle.";
        setTrackingError(errMsg);
      }

      // Handle Vahan Compliance Result
      if (vahanRes.status === "fulfilled" && vahanRes.value.data?.success && vahanRes.value.data?.data) {
        setVahanData(vahanRes.value.data.data);
      } else {
        setVahanData(null);
      }
    } catch (err) {
      console.error("Error fetching live logistics tracking data:", err);
      setTrackingError("Failed to fetch live logistics tracking data.");
    } finally {
      setTrackingLoading(false);
      setVahanLoading(false);
    }
  }, [cleanVehicleNo]);

  useEffect(() => {
    if (open && cleanVehicleNo) {
      fetchAllData();
    }
  }, [open, cleanVehicleNo, fetchAllData]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 350 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#1e293b",
          color: "#fff",
          py: 2,
          px: 3,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <LocalShippingIcon sx={{ color: "#4ade80", fontSize: 26 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: 0.3 }}>
            Live Logistics Tracking
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "#94a3b8", "&:hover": { color: "#fff" } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3.5 }, minHeight: 320, bgcolor: "#f8fafc" }}>
        {/* Top 3 Cards Grid */}
        <Box
          sx={{
            mb: 3.5,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1.1fr 1.5fr" },
            gap: 2.5,
          }}
        >
          {/* Card 1: Vehicle Info */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: "#fff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: "#64748b",
                  fontSize: "0.72rem",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                Vehicle Details
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1.2}>
                <LocalShippingIcon sx={{ color: "#334155", fontSize: 22 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: 0.5, lineHeight: 1.2 }}>
                  {cleanVehicleNo || "N/A"}
                </Typography>
              </Box>
              {vehicleType && (
                <Typography variant="body2" sx={{ color: "#475569", fontWeight: 600, mt: 1, fontSize: "0.82rem" }}>
                  Type: {vehicleType}
                </Typography>
              )}
              {ownHired && (
                <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 500, mt: 0.3, fontSize: "0.8rem" }}>
                  Category: {ownHired}
                </Typography>
              )}
            </Box>

            <Box mt={1.5}>
              {vahanData?.rcVhClassDesc ? (
                <Chip
                  icon={<LocalShippingIcon sx={{ fontSize: "14px !important" }} />}
                  label={vahanData.rcVhClassDesc}
                  size="small"
                  sx={{
                    bgcolor: "#eff6ff",
                    color: "#2563eb",
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    border: "1px solid #bfdbfe",
                  }}
                />
              ) : vahanLoading ? (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                  Loading class...
                </Typography>
              ) : null}
            </Box>
          </Box>

          {/* Card 2: Driver Info */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: "#fff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "#64748b",
                fontSize: "0.72rem",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                mb: 1.5,
              }}
            >
              Driver Details
            </Typography>
            {driverName || driverPhone ? (
              <Box display="flex" flexDirection="column" gap={1.5}>
                {driverName && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon sx={{ color: "#475569", fontSize: 20 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.88rem" }}>
                      {driverName}
                    </Typography>
                  </Box>
                )}
                {driverPhone && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <PhoneIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                    <Typography
                      variant="body2"
                      component="a"
                      href={`tel:${driverPhone}`}
                      sx={{
                        color: "#16a34a",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {driverPhone}
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, fontStyle: "italic", fontSize: "0.82rem" }}>
                No driver assigned
              </Typography>
            )}
          </Box>

          {/* Card 3: Vahan Compliance Dates */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: "#fff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "#64748b",
                fontSize: "0.72rem",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                mb: 1.8,
              }}
            >
              Vahan Compliance
            </Typography>
            {vahanData ? (
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <GasIcon sx={{ color: "#0284c7", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500, display: "block", fontSize: "0.68rem", lineHeight: 1.1 }}>
                      Fuel Type
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", mt: 0.2, fontSize: "0.82rem" }}>
                      {vahanData.rcFuelDesc || "N/A"}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  <DateIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500, display: "block", fontSize: "0.68rem", lineHeight: 1.1 }}>
                      Fitness Upto
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", mt: 0.2, fontSize: "0.82rem" }}>
                      {vahanData.rcFitUpto || "N/A"}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  <TaxIcon sx={{ color: "#ea580c", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500, display: "block", fontSize: "0.68rem", lineHeight: 1.1 }}>
                      Tax Upto
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", mt: 0.2, fontSize: "0.82rem" }}>
                      {vahanData.rcTaxUpto || "N/A"}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  <ShieldIcon sx={{ color: "#4f46e5", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500, display: "block", fontSize: "0.68rem", lineHeight: 1.1 }}>
                      Insurance Upto
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", mt: 0.2, fontSize: "0.82rem" }}>
                      {vahanData.rcInsuranceUpto || "N/A"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, fontStyle: "italic", fontSize: "0.82rem" }}>
                {vahanLoading ? "Loading Vahan compliance..." : "Vahan details unavailable"}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Loading Spinner */}
        {trackingLoading && (
          <Box display="flex" flexDirection="column" alignItems="center" py={6} gap={2}>
            <CircularProgress size={42} thickness={4} sx={{ color: "#16a34a" }} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Querying LDB Live Toll Booth Checkpoints...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {trackingError && !trackingLoading && (
          <Box display="flex" flexDirection="column" alignItems="center" py={6} gap={2}>
            <Typography variant="subtitle1" color="error" align="center" fontWeight={600}>
              ⚠️ {trackingError}
            </Typography>
            <Button variant="outlined" color="primary" onClick={fetchAllData} sx={{ borderRadius: 2 }}>
              Retry Connection
            </Button>
          </Box>
        )}

        {/* Timeline of Toll Plazas Crossed */}
        {!trackingLoading && !trackingError && (() => {
          const events = [];
          if (trackingData?.groupEvents) {
            trackingData.groupEvents.forEach((group) => {
              if (group.containerGroupingList) {
                group.containerGroupingList.forEach((evt) => {
                  events.push({ ...evt, groupTimestamp: group.timestamp });
                });
              }
            });
          }

          if (events.length === 0) {
            return (
              <Box display="flex" justifyContent="center" py={5}>
                <Typography variant="body1" color="text.secondary" fontWeight={500}>
                  No toll plaza checkpoints recorded for vehicle {cleanVehicleNo}.
                </Typography>
              </Box>
            );
          }

          // Sort latest first
          events.sort(
            (a, b) => new Date(b.eventTime || b.groupTimestamp || 0) - new Date(a.eventTime || a.groupTimestamp || 0)
          );

          return (
            <Box display="flex" flexDirection="column" gap={0} position="relative" sx={{ px: 1 }}>
              <style>{`
                @keyframes pulse-green {
                  0% {
                    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
                  }
                  70% {
                    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
                  }
                  100% {
                    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
                  }
                }
                .timeline-line {
                  position: absolute;
                  left: 23px;
                  top: 32px;
                  bottom: -8px;
                  width: 2px;
                  background-color: #cbd5e1;
                  z-index: 1;
                }
                .timeline-node {
                  position: relative;
                  z-index: 2;
                  width: 48px;
                  display: flex;
                  justify-content: center;
                  margin-top: 8px;
                }
              `}</style>

              {events.map((evt, idx) => {
                const isLatest = idx === 0;
                const timeStr = formatDisplayDateTime(evt.eventTime || evt.groupTimestamp);
                const cleanLat = evt.locLat?.trim();
                const cleanLng = evt.locLong?.trim();
                const hasMap = cleanLat && cleanLng;

                return (
                  <Box key={idx} display="flex" position="relative" sx={{ pb: 3.5 }}>
                    {/* Timeline Line */}
                    {idx < events.length - 1 && (
                      <div
                        className="timeline-line"
                        style={{ backgroundColor: isLatest ? "#4ade80" : "#cbd5e1" }}
                      />
                    )}

                    {/* Timeline Node */}
                    <div className="timeline-node">
                      {isLatest ? (
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            bgcolor: "#22c55e",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            boxShadow: "0 0 0 4px #dcfce7",
                            animation: "pulse-green 1.8s infinite",
                          }}
                        >
                          <LocalShippingIcon sx={{ fontSize: 18 }} />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: "#94a3b8",
                            border: "2px solid #fff",
                            boxShadow: "0 0 0 1px #cbd5e1",
                            mt: 1,
                          }}
                        />
                      )}
                    </div>

                    {/* Content Card */}
                    <Box
                      flex={1}
                      sx={{
                        ml: 2,
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: "#fff",
                        border: "1px solid",
                        borderColor: isLatest ? "#86efac" : "#e2e8f0",
                        boxShadow: isLatest ? "0 4px 12px rgba(34, 197, 94, 0.12)" : "0 1px 3px rgba(0,0,0,0.05)",
                        position: "relative",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
                        },
                      }}
                    >
                      {isLatest && (
                        <Chip
                          label="Current Location"
                          size="small"
                          sx={{
                            position: "absolute",
                            top: -10,
                            right: 16,
                            bgcolor: "#22c55e",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "0.68rem",
                            height: 22,
                          }}
                        />
                      )}

                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isLatest ? "#15803d" : "#1e293b", fontSize: "1rem" }}>
                            {evt.locName || "Unknown Checkpoint"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.82rem" }}>
                            <LocationIcon sx={{ fontSize: 15, color: isLatest ? "#22c55e" : "#64748b" }} />
                            {evt.eventName || "TOLL PLAZA CROSSED"}
                          </Typography>
                        </Box>

                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            color: "#64748b",
                            bgcolor: "#f1f5f9",
                            px: 1.5,
                            py: 0.6,
                            borderRadius: 1,
                            fontSize: "0.75rem",
                          }}
                        >
                          {timeStr}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />

                      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                        <Box display="flex" gap={3}>
                          {evt.laneDirection && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block" fontSize="0.7rem">
                                Direction
                              </Typography>
                              <Typography variant="body2" fontWeight={700} color="#1e293b">
                                {evt.laneDirection}
                              </Typography>
                            </Box>
                          )}
                          {evt.vehicleType && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block" fontSize="0.7rem">
                                Type
                              </Typography>
                              <Typography variant="body2" fontWeight={700} color="#1e293b">
                                {evt.vehicleType}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {hasMap && (
                          <Button
                            size="small"
                            variant={isLatest ? "contained" : "outlined"}
                            color="success"
                            component="a"
                            href={`https://www.google.com/maps/search/?api=1&query=${cleanLat},${cleanLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<NavigationIcon sx={{ transform: "rotate(45deg)", fontSize: 16 }} />}
                            sx={{
                              textTransform: "none",
                              borderRadius: 1.5,
                              px: 2,
                              fontWeight: 600,
                              fontSize: "0.78rem",
                              boxShadow: "none",
                            }}
                          >
                            Maps
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
