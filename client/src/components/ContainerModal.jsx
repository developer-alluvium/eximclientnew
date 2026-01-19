import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Box,
  IconButton,
  Chip,
  Stack,
  Divider,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LaunchIcon from "@mui/icons-material/Launch";
import ImageIcon from "@mui/icons-material/Image";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ScaleIcon from "@mui/icons-material/Scale";

const ContainerModal = ({ open, onClose, container }) => {
  const [selectedOption, setSelectedOption] = useState("tracking");

  const handleOptionChange = (event, newOption) => {
    if (newOption !== null) {
      setSelectedOption(newOption);
    }
  };

  const handleTrackingRedirect = () => {
    if (container?.container_number) {
      const trackingUrl = `https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`;
      window.open(trackingUrl, "_blank", "noopener,noreferrer");
    }
  };

  const renderContent = () => {
    if (selectedOption === "tracking") {
      return (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "12px",
                bgcolor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LocalShippingIcon sx={{ color: "white", fontSize: 18 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: "grey.800",
                  fontSize: "1.1rem",
                }}
              >
                Container Tracking
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.85rem" }}
              >
                Track your container in real-time
              </Typography>
            </Box>
          </Stack>

          <Paper
            sx={{
              bgcolor: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              borderRadius: "16px",
              p: 3,
              border: "none",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "grey.600",
                fontWeight: 500,
                mb: 1.5,
                display: "block",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                fontSize: "0.75rem",
              }}
            >
              Container Number
            </Typography>
            <Chip
              label={container?.container_number}
              sx={{
                mb: 2.5,
                fontWeight: "600",
                fontSize: "0.9rem",
                height: "32px",
                bgcolor: "white",
                color: "grey.800",
                border: "2px solid rgba(102, 126, 234, 0.2)",
                boxShadow: "0 2px 8px rgba(102, 126, 234, 0.1)",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
                },
              }}
            />
            <Button
              variant="contained"
              startIcon={<LaunchIcon sx={{ fontSize: 18 }} />}
              onClick={handleTrackingRedirect}
              fullWidth
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: "600",
                py: 1.2,
                fontSize: "0.95rem",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                  boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
                  transform: "translateY(-1px)",
                },
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              Open Tracking
            </Button>
          </Paper>
        </Box>
      );
    } else if (selectedOption === "images") {
      return (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "12px",
                bgcolor: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
                background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ImageIcon sx={{ color: "grey.700", fontSize: 18 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: "grey.800",
                  fontSize: "1.1rem",
                }}
              >
                Container Images & Documents
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.85rem" }}
              >
                View container photos and weighment slips
              </Typography>
            </Box>
          </Stack>

          <Paper
            sx={{
              bgcolor: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
              background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
              borderRadius: "16px",
              p: 3,
              border: "none",
              maxHeight: 400,
              overflowY: "auto",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-track": {
                background: "rgba(255,255,255,0.3)",
                borderRadius: "10px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(255,255,255,0.6)",
                borderRadius: "10px",
                "&:hover": {
                  background: "rgba(255,255,255,0.8)",
                },
              },
            }}
          >
            {/* Container Images Section */}
            {Array.isArray(container?.container_images) &&
            container.container_images.length > 0 ? (
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#4caf50",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: "grey.700",
                      fontWeight: 500,
                      fontSize: "0.85rem",
                    }}
                  >
                    {container.container_images.length} container image
                    {container.container_images.length > 1 ? "s" : ""} available
                  </Typography>
                </Box>
                {container.container_images.map((imageUrl, index) => (
                  <Button
                    key={index}
                    component="a"
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    startIcon={<ImageIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      justifyContent: "flex-start",
                      textTransform: "none",
                      width: "100%",
                      borderRadius: "10px",
                      py: 1,
                      px: 2,
                      fontSize: "0.85rem",
                      fontWeight: "500",
                      bgcolor: "rgba(255, 255, 255, 0.9)",
                      color: "white",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.5)",
                      "&:hover": {
                        bgcolor: "white",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    Container Image {index + 1}
                  </Button>
                ))}
              </Stack>
            ) : (
              <Box sx={{ textAlign: "center", py: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: "rgba(255, 255, 255, 0.8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                    mb: 1,
                  }}
                >
                  <ImageIcon sx={{ fontSize: 24, color: "grey.400" }} />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.600",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                  }}
                >
                  No container images available
                </Typography>
              </Box>
            )}

            {/* Divider between sections */}
            {(Array.isArray(container?.container_images) &&
              container.container_images.length > 0) ||
            (Array.isArray(container?.weighment_slip_images) &&
              container.weighment_slip_images.length > 0) ? (
              <Divider
                sx={{
                  my: 3,
                  bgcolor: "rgba(255, 255, 255, 0.4)",
                  height: "2px",
                }}
              />
            ) : null}

            {/* Weighment Slip Images Section */}
            {Array.isArray(container?.weighment_slip_images) &&
            container.weighment_slip_images.length > 0 ? (
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#2196f3",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: "grey.700",
                      fontWeight: 500,
                      fontSize: "0.85rem",
                    }}
                  >
                    {container.weighment_slip_images.length} weighment slip
                    {container.weighment_slip_images.length > 1 ? "s" : ""}{" "}
                    available
                  </Typography>
                </Box>
                {container.weighment_slip_images.map((imageUrl, index) => (
                  <Button
                    key={index}
                    component="a"
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    startIcon={<ScaleIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      justifyContent: "flex-start",
                      textTransform: "none",
                      width: "100%",
                      borderRadius: "10px",
                      py: 1,
                      px: 2,
                      fontSize: "0.85rem",
                      fontWeight: "500",
                      bgcolor: "rgba(33, 150, 243, 0.1)",
                      color: "#ffffffff",
                      boxShadow: "0 2px 8px rgba(33, 150, 243, 0.1)",
                      border: "1px solid rgba(33, 150, 243, 0.2)",
                      "&:hover": {
                        bgcolor: "rgba(33, 150, 243, 0.15)",
                        boxShadow: "0 4px 12px rgba(33, 150, 243, 0.2)",
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    Weighment Slip {index + 1}
                  </Button>
                ))}
              </Stack>
            ) : !Array.isArray(container?.container_images) ||
              container.container_images.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: "rgba(255, 255, 255, 0.8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                    mb: 1,
                  }}
                >
                  <ScaleIcon sx={{ fontSize: 24, color: "grey.400" }} />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.600",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                  }}
                >
                  No weighment slips available
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.500",
                    fontSize: "0.8rem",
                  }}
                >
                  No weighment slips available
                </Typography>
              </Box>
            )}

            {/* Overall empty state when both are empty */}
            {(!Array.isArray(container?.container_images) ||
              container.container_images.length === 0) &&
            (!Array.isArray(container?.weighment_slip_images) ||
              container.weighment_slip_images.length === 0) ? (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    bgcolor: "rgba(255, 255, 255, 0.8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                    mb: 2,
                  }}
                >
                  <ImageIcon sx={{ fontSize: 32, color: "grey.400" }} />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.600",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                  }}
                >
                  No images or weighment slips available
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "grey.500",
                    fontSize: "0.8rem",
                    mt: 0.5,
                    display: "block",
                  }}
                >
                  Documents will appear here when uploaded
                </Typography>
              </Box>
            ) : null}
          </Paper>
        </Box>
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.12)",
          minWidth: { xs: "340px", sm: "450px" },
          maxWidth: "520px",
          margin: { xs: 1, sm: 2 },
          overflow: "hidden",
        },
      }}
      TransitionProps={{
        style: { transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)" },
      }}
    >
      <DialogTitle
        sx={{
          px: 0,
          py: 0,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.1)",
            transform: "translate(30px, -30px)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.05)",
            transform: "translate(-20px, 20px)",
          }}
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 3,
            py: 2.5,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                bgcolor: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LocalShippingIcon sx={{ fontSize: 20, color: "white" }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  mb: 0.5,
                }}
              >
                {container?.container_number}
              </Typography>
              {container?.size && (
                <Chip
                  label={container.size}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.25)",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "0.75rem",
                    height: "24px",
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                />
              )}
            </Box>
          </Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: "white",
              bgcolor: "rgba(255, 255, 255, 0.1)",
              width: 36,
              height: 36,
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.2)",
                transform: "scale(1.05)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          px: 3,
          py: 2,
          bgcolor: "#fafbff",
        }}
      >
        {/* Toggle Button Selection */}
        <Box sx={{ mb: 1 }}>
          <ToggleButtonGroup
            value={selectedOption}
            exclusive
            onChange={handleOptionChange}
            aria-label="container options"
            fullWidth
            sx={{
              bgcolor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
              p: 0.5,
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontWeight: "500",
                py: 1,
                px: 2,
                fontSize: "0.9rem",
                border: "none",
                borderRadius: "8px !important",
                margin: "2px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&.Mui-selected": {
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                  },
                },
                "&:hover": {
                  bgcolor: "grey.50",
                },
              },
            }}
          >
            <ToggleButton value="tracking" aria-label="tracking">
              <Stack direction="row" spacing={1} alignItems="center">
                <TrackChangesIcon sx={{ fontSize: 18 }} />
                <Typography
                  variant="body2"
                  sx={{ fontSize: "0.9rem", fontWeight: "500" }}
                >
                  Tracking
                </Typography>
              </Stack>
            </ToggleButton>
            <ToggleButton value="images" aria-label="images">
              <Stack direction="row" spacing={1} alignItems="center">
                <ImageIcon sx={{ fontSize: 18 }} />
                <Typography
                  variant="body2"
                  sx={{ fontSize: "0.9rem", fontWeight: "500" }}
                >
                  Images
                </Typography>
              </Stack>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Content based on selection */}
        {renderContent()}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2.5,
          bgcolor: "white",
          borderTop: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            textTransform: "none",
            fontWeight: "500",
            borderRadius: "10px",
            px: 3,
            py: 1,
            border: "2px solid #e0e7ff",
            color: "grey.700",
            "&:hover": {
              border: "2px solid #c7d2fe",
              bgcolor: "#f8faff",
              transform: "translateY(-1px)",
            },
            transition: "all 0.2s ease",
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContainerModal;
