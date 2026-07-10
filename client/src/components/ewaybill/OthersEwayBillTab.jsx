import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CancelIcon from "@mui/icons-material/Cancel";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PartAEwayBillModal from "./Modals/PartAEwayBillModal";

function OthersEwayBillTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Generation Modal State
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fileInputRef = useRef(null);

  const getContainersList = (row) => {
    if (row.containers && row.containers.length > 0) {
      return row.containers.map(c => c.containerNumber).filter(Boolean);
    }
    const boeDetail = row.parsedData?.data || row.parsedData || {};
    const containerDetails = boeDetail.ContainerDetails || [];
    return containerDetails
      .map(
        (bc) =>
          bc["CONTAINER NUMBER"] ||
          bc.ContainerNo ||
          bc.container_number ||
          bc.CONTR_NO ||
          bc.CONTR ||
          bc.containerNo ||
          ""
      )
      .filter(Boolean);
  };

  const getContainerObjectsList = (row) => {
    const containers = getContainersList(row);
    return containers.map((cNo) => ({
      container_number: cNo,
      container_no: cNo,
    }));
  };

  const renderContainersCell = (row) => {
    const containers = getContainersList(row);
    if (containers.length === 0) return <span style={{ color: "#94a3b8" }}>—</span>;
    return (
      <Tooltip title={containers.join(", ")} arrow>
        <Box sx={{ cursor: "help" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569" }}>
            {containers.length} {containers.length === 1 ? "Container" : "Containers"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              display: "block",
              maxWidth: 150,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {containers.join(", ")}
          </Typography>
        </Box>
      </Tooltip>
    );
  };

  const renderEwayBillInfo = (row) => {
    if (row.ewayBillStatus === "Pending") return "—";

    const ewbList = (row.containers || []).filter(c => c.ewayBillStatus === "Generated" && c.ewayBillNo);

    if (ewbList.length > 0) {
      const uniqueEwbs = new Set(ewbList.map(c => c.ewayBillNo));
      const isCombined = uniqueEwbs.size === 1 && (row.containers || []).length > 1;

      if (isCombined) {
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Chip
              label="Combined"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ width: "fit-content", mb: 0.5, fontSize: "0.7rem", height: 18 }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{ewbList[0].ewayBillNo}</span>
              {ewbList[0].ewayBillUrl && (
                <Tooltip title="Download E-Way Bill PDF">
                  <IconButton size="small" onClick={() => handleDownloadPdf(ewbList[0].ewayBillUrl)}>
                    <PictureAsPdfIcon fontSize="inherit" color="error" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        );
      }

      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Chip
            label="Individual"
            size="small"
            variant="outlined"
            sx={{ width: "fit-content", mb: 0.5, fontSize: "0.7rem", height: 18 }}
          />
          {ewbList.map((ewb, idx) => (
            <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{ewb.containerNumber}:</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{ewb.ewayBillNo}</span>
              {ewb.ewayBillUrl && (
                <Tooltip title={`Download E-Way Bill PDF for ${ewb.containerNumber}`}>
                  <IconButton size="small" onClick={() => handleDownloadPdf(ewb.ewayBillUrl)}>
                    <PictureAsPdfIcon fontSize="inherit" color="error" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}
          {(row.containers || []).filter(c => c.ewayBillStatus === "Cancelled" && c.ewayBillNo).map((ewb, idx) => (
            <Box key={`cancelled-${idx}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{ewb.containerNumber}:</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, textDecoration: "line-through", color: "#94a3b8" }}>{ewb.ewayBillNo}</span>
              <Chip label="Cancelled" size="small" color="error" variant="outlined" sx={{ fontSize: "0.6rem", height: 16 }} />
            </Box>
          ))}
        </Box>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {row.ewayBillNo ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{row.ewayBillNo}</span>
            {row.ewayBillUrl && (
              <Tooltip title="Download E-Way Bill PDF">
                <IconButton size="small" onClick={() => handleDownloadPdf(row.ewayBillUrl)}>
                  <PictureAsPdfIcon fontSize="inherit" color="error" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ) : (
          "—"
        )}
      </Box>
    );
  };

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/others/list`);
      if (res.data?.success) {
        setList(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch others list:", err);
      Swal.fire("Error", "Failed to load uploads list", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      Swal.fire("Invalid File Type", "Please upload a Bill of Entry PDF file only.", "warning");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      Swal.fire({
        title: "Uploading & Parsing...",
        text: "Uploading BOE to secure storage and running AI parser. This may take up to a minute.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/eway-bill/others/upload-boe`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      Swal.close();

      if (res.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Parsed Successfully",
          text: `Bill of Entry ${res.data.data.boeNumber || "extracted"} has been uploaded.`,
          showCancelButton: true,
          confirmButtonText: "Generate E-Way Bill Now",
          cancelButtonText: "Close",
        }).then((result) => {
          fetchList();
          if (result.isConfirmed) {
            handleOpenGenerate(res.data.data);
          }
        });
      }
    } catch (err) {
      Swal.close();
      console.error("Upload error:", err);
      Swal.fire(
        "Upload Failed",
        err.response?.data?.message || "An error occurred during file upload and extraction.",
        "error"
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleOpenGenerate = (record) => {
    setSelectedRecord(record);
    setGenerateOpen(true);
  };

  const handleCloseGenerate = () => {
    setSelectedRecord(null);
    setGenerateOpen(false);
  };

  const handleGenerationSuccess = async (results) => {
    if (!selectedRecord) return;

    // Support both single object (response.data.data) and array of results (multi-container)
    let ewbNo = "";
    let ewbDate = null;
    let ewbUrl = "";

    const singleResult = Array.isArray(results) ? results.find(r => r.status === "success") : results;

    if (singleResult) {
      const msg = singleResult.results?.message || singleResult;
      ewbNo = singleResult.ewbNo || msg.ewayBillNo || singleResult.ewayBillNo;
      ewbDate = singleResult.ewbDate || msg.ewayBillDate || singleResult.ewayBillDate;
      ewbUrl = singleResult.url || msg.url || singleResult.pdfUrl || msg.pdfUrl || singleResult.ewayBillUrl || msg.url;
    }

    if (!ewbNo) {
      console.warn("⚠️ Could not extract E-Way Bill Number from response:", results);
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/others/update-status`, {
        otherEwayBillId: selectedRecord._id,
        ewayBillNo: ewbNo ? String(ewbNo) : undefined,
        ewayBillDate: ewbDate,
        ewayBillUrl: ewbUrl,
        ewayBillData: results,
      });

      fetchList();
      handleCloseGenerate();
    } catch (err) {
      console.error("Failed to update status on server:", err);
      Swal.fire("Partial Success", `E-Way Bill generated (${ewbNo || "N/A"}), but failed to update status list.`, "warning");
      fetchList();
      handleCloseGenerate();
    }
  };

  const handleCancelEwayBill = async (record) => {
    const ewbList = (record.containers || []).filter(
      (c) => c.ewayBillStatus === "Generated" && c.ewayBillNo
    );

    let targetEwbNo = record.ewayBillNo;

    if (ewbList.length > 1) {
      // Prompt user to select which container's E-Way Bill to cancel
      const inputOptions = {};
      ewbList.forEach((ewb) => {
        inputOptions[ewb.ewayBillNo] = `${ewb.containerNumber} (EWB: ${ewb.ewayBillNo})`;
      });

      const { value: selectedEwb } = await Swal.fire({
        title: "Select E-Way Bill to Cancel",
        input: "select",
        inputOptions,
        inputPlaceholder: "Select E-Way Bill",
        showCancelButton: true,
      });

      if (!selectedEwb) return;
      targetEwbNo = selectedEwb;
    }

    if (!targetEwbNo) return;

    const { value: formValues } = await Swal.fire({
      title: `Cancel E-Way Bill ${targetEwbNo}`,
      html:
        '<select id="cancel-reason" class="swal2-select" style="display:flex; width:80%; margin:10px auto;">' +
        '<option value="1">1 - Duplicate</option>' +
        '<option value="2">2 - Order Cancelled</option>' +
        '<option value="3">3 - Data Entry Mistake</option>' +
        '<option value="4">4 - Others</option>' +
        "</select>" +
        '<input id="cancel-remarks" class="swal2-input" placeholder="Remarks (minimum 3 characters)" style="width:80%; margin:10px auto;">',
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const reason = document.getElementById("cancel-reason").value;
        const remarks = document.getElementById("cancel-remarks").value;
        if (!remarks || remarks.trim().length < 3) {
          Swal.showValidationMessage("Remarks must be at least 3 characters long");
          return false;
        }
        return { reason, remarks };
      },
    });

    if (!formValues) return;

    try {
      Swal.fire({
        title: "Cancelling E-Way Bill...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Proxy cancellation to Masters India
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/eway-bill/cancel`,
        {
          ewayBillNo: targetEwbNo,
          cancelReasonCode: parseInt(formValues.reason),
          cancelRemarks: formValues.remarks,
        }
      );

      if (response.data?.success) {
        // Update local database record status
        await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/others/update-cancellation`, {
          otherEwayBillId: record._id,
          ewayBillNo: targetEwbNo,
        });

        Swal.fire("Cancelled", `E-Way Bill ${targetEwbNo} cancelled successfully.`, "success");
        fetchList();
      } else {
        throw new Error(response.data?.message || "Failed to cancel E-Way Bill");
      }
    } catch (err) {
      console.error("Cancellation error:", err);
      Swal.fire(
        "Cancellation Failed",
        err.response?.data?.message || err.message || "Failed to cancel E-Way Bill",
        "error"
      );
    }
  };

  const handleDeleteRecord = async (record) => {
    Swal.fire({
      title: "Delete Record?",
      text: "Are you sure you want to remove this uploaded BOE? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, Delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await axios.delete(`${process.env.REACT_APP_API_STRING}/eway-bill/others/${record._id}`);
          if (res.data?.success) {
            Swal.fire("Deleted", "Record deleted successfully.", "success");
            fetchList();
          }
        } catch (err) {
          console.error("Failed to delete record:", err);
          Swal.fire("Error", "Failed to delete record", "error");
        }
      }
    });
  };

  const handleDownloadPdf = async (pdfUrl) => {
    if (!pdfUrl) return;
    try {
      const proxyUrl = `${process.env.REACT_APP_API_STRING}/eway-bill/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`;
      const response = await axios.get(proxyUrl, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `EWB_BOE_PDF.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch (err) {
      console.error("PDF download failed:", err);
      Swal.fire("Error", "Failed to download PDF", "error");
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "Generated":
        return <Chip label="Generated" color="success" size="small" sx={{ fontWeight: 600 }} />;
      case "Partially Generated":
        return <Chip label="Partially Generated" color="primary" size="small" sx={{ fontWeight: 600 }} />;
      case "Cancelled":
        return <Chip label="Cancelled" color="error" size="small" sx={{ fontWeight: 600 }} />;
      default:
        return <Chip label="Pending" color="warning" size="small" sx={{ fontWeight: 600 }} />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Upper Action Bar */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Others E-Way Bills
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
            Upload standalone Bill of Entries (BOE) and generate E-Way Bills.
          </Typography>
        </Box>
        <Box>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf"
            style={{ display: "none" }}
          />
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              bgcolor: "#2563eb",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              py: 1,
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            {uploading ? "Parsing PDF..." : "Upload BOE PDF"}
          </Button>
        </Box>
      </Box>

      {/* Main List Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
          <CircularProgress size={40} />
        </Box>
      ) : list.length === 0 ? (
        <Paper
          sx={{
            p: 5,
            textAlign: "center",
            borderRadius: 3,
            border: "1px dashed #cbd5e1",
            boxShadow: "none",
            bgcolor: "#f8fafc",
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 48, color: "#94a3b8", mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#475569" }}>
            No uploads found
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 1, mb: 3 }}>
            Upload a standalone Bill of Entry PDF file to start generating E-Way Bills.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Select PDF File
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "none" }}>
          <Table sx={{ minWidth: 650 }} aria-label="others eway bills table">
            <TableHead
              sx={{
                bgcolor: "#f8fafc",
                "& .MuiTableCell-head": {
                  color: "#000000 !important",
                  fontWeight: "700 !important",
                },
              }}
            >
              <TableRow>
                <TableCell>BOE Number</TableCell>
                <TableCell>Job Number</TableCell>
                <TableCell>Containers</TableCell>
                <TableCell>BOE Date</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell>E-Way Bill No</TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ textAlign: "right" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row._id} sx={{ "&:hover": { bgcolor: "#f1f5f9" } }}>
                  <TableCell sx={{ fontWeight: 600, color: "#0f172a" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {row.boeNumber || "—"}
                      {row.pdfUrl && (
                        <Tooltip title="View Uploaded BOE PDF">
                          <IconButton size="small" onClick={() => handleDownloadPdf(row.pdfUrl)}>
                            <VisibilityIcon fontSize="inherit" color="action" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {row.jobNo ? (
                      <span style={{ color: "#2563eb", fontWeight: 600 }}>{row.jobNo}</span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>No Match</span>
                    )}
                  </TableCell>
                  <TableCell>{renderContainersCell(row)}</TableCell>
                  <TableCell>{row.boeDate ? new Date(row.boeDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{renderEwayBillInfo(row)}</TableCell>
                  <TableCell>{getStatusChip(row.ewayBillStatus)}</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1 }}>
                      {/* Show Generate button if Pending or Partially Generated */}
                      {(row.ewayBillStatus === "Pending" || row.ewayBillStatus === "Partially Generated") && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<LocalShippingIcon />}
                          onClick={() => handleOpenGenerate(row)}
                          sx={{
                            bgcolor: "#1e293b",
                            textTransform: "none",
                            borderRadius: 1.5,
                            "&:hover": { bgcolor: "#334155" },
                          }}
                        >
                          Generate
                        </Button>
                      )}

                      {/* Show Cancel button if Generated or Partially Generated */}
                      {(row.ewayBillStatus === "Generated" || row.ewayBillStatus === "Partially Generated") && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={() => handleCancelEwayBill(row)}
                          sx={{ textTransform: "none", borderRadius: 1.5 }}
                        >
                          Cancel EWB
                        </Button>
                      )}

                      {/* Show Delete button if Pending or Cancelled */}
                      {(row.ewayBillStatus === "Pending" || row.ewayBillStatus === "Cancelled") && (
                        <Tooltip title={row.ewayBillStatus === "Cancelled" ? "Delete Record" : "Delete Upload"}>
                          <IconButton
                            size="small"
                            color={row.ewayBillStatus === "Cancelled" ? "default" : "error"}
                            onClick={() => handleDeleteRecord(row)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Generation Wizard Modal */}
      {selectedRecord && (
        <PartAEwayBillModal
          open={generateOpen}
          onClose={handleCloseGenerate}
          beNo={selectedRecord.boeNumber}
          beDate={selectedRecord.boeDate ? new Date(selectedRecord.boeDate).toISOString().split("T")[0] : ""}
          selectedContainers={getContainerObjectsList(selectedRecord)}
          jobId={selectedRecord.jobId}
          onSuccess={handleGenerationSuccess}
          boeData={selectedRecord.parsedData}
          skipFetchExisting={true}
        />
      )}
    </Box>
  );
}

export default OthersEwayBillTab;
