import React, { useState, useEffect } from "react";
import FileUpload from "../utils/FileUpload";
import { FaUpload, FaPen, FaFileAlt } from "react-icons/fa";
import axios from "axios";
import {
  Checkbox,
  FormControlLabel,
  Tooltip,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

const ChecklistCell = ({ cell, onDocumentsUpdated }) => {
  const [checklistFiles, setChecklistFiles] = useState(
    cell.row.original.checklist || [],
  );
  const [isChecklistApproved, setIsChecklistApproved] = useState(
    cell.row.original.is_checklist_aprroved || false,
  );
  const [isChecklistClicked, setIsChecklistClicked] = useState(
    cell.row.original.is_checklist_clicked === true ||
      cell.row.original.is_checklist_clicked === "true",
  );
  const [approvalDate, setApprovalDate] = useState(
    cell.row.original.is_checklist_aprroved_date || null,
  );
  const [remarkClient, setRemarkClient] = useState(
    cell.row.original.remark_client || "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Sync checklist documents and approval states
  useEffect(() => {
    setChecklistFiles(cell.row.original.checklist || []);
    setIsChecklistApproved(cell.row.original.is_checklist_aprroved || false);
    setIsChecklistClicked(
      cell.row.original.is_checklist_clicked === true ||
        cell.row.original.is_checklist_clicked === "true",
    );
    setApprovalDate(cell.row.original.is_checklist_aprroved_date || null);
    setRemarkClient(cell.row.original.remark_client || "");
  }, [cell.row.original]);

  const rowId = cell.row.original._id || cell.row.original.id || cell.row.id;

  // Format approval date for display
  const formatApprovalDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleString(); // Shows date and time in local format
    } catch (error) {
      return null;
    }
  };

  // Handle file uploads
  const handleFilesUploaded = async (newFiles) => {
    // Extract URLs from the uploaded file objects
    const newUrls = newFiles.map((file) => file.url);
    const updatedFiles = [...checklistFiles, ...newUrls];
    setChecklistFiles(updatedFiles);

    try {
      await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${rowId}`, {
        checklist: updatedFiles,
      });

      if (onDocumentsUpdated) {
        onDocumentsUpdated(rowId, "checklist", updatedFiles);
      }
    } catch (error) {
      alert("Failed to update checklist documents. Please try again.");
    }
  };

  // Handle file delete
  const handleDeleteFile = async (fileUrl) => {
    const updatedFiles = checklistFiles.filter((file) => file !== fileUrl);
    setChecklistFiles(updatedFiles);
    try {
      await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${rowId}`, {
        checklist: updatedFiles,
      });
      if (onDocumentsUpdated) {
        onDocumentsUpdated(rowId, "checklist", updatedFiles);
      }
    } catch (error) {
      alert("Failed to delete checklist file. Please try again.");
    }
  };

  // Handle checklist click
  const handleChecklistClick = async () => {
    if (!isChecklistClicked) {
      try {
        await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${rowId}`, {
          is_checklist_clicked: true,
        });
        setIsChecklistClicked(true);
        if (onDocumentsUpdated) {
          onDocumentsUpdated(rowId, "is_checklist_clicked", true);
        }
      } catch (error) {
        console.error("Failed to update checklist clicked status:", error);
      }
    }
  };

  // Handle checklist approval
  const handleChecklistApproval = async (e) => {
    if (isChecklistApproved && !e.target.checked) {
      // Allow un-approving? Usually logic says approval is final, but in popup maybe editable?
      // Current code: "Don't allow changes if already approved".
      // I'll keep existing logic strictness unless user requested otherwise.
      // User said "check box for approval".
      return;
    }
    // Actually, allowing toggle might be better UX for "popup editor".
    // But adhering to original logic:
    if (isChecklistApproved) return;

    const checked = e.target.checked;
    setIsLoading(true);

    try {
      const approvalDateTime = checked ? new Date().toISOString() : null;

      await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${rowId}`, {
        is_checklist_aprroved: checked,
        is_checklist_aprroved_date: approvalDateTime,
      });

      setIsChecklistApproved(checked);
      setApprovalDate(approvalDateTime);

      if (onDocumentsUpdated) {
        onDocumentsUpdated(rowId, "is_checklist_aprroved", checked);
      }
    } catch (error) {
      alert("Failed to update checklist approval. Please try again.");
    }
    setIsLoading(false);
  };

  // Handle remark client update
  const handleRemarkClientUpdate = async (remarkText) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${rowId}`, {
        remark_client: remarkText,
      });

      setRemarkClient(remarkText);

      if (onDocumentsUpdated) {
        onDocumentsUpdated(rowId, "remark_client", remarkText);
      }
    } catch (error) {
      alert("Failed to update remark. Please try again.");
    }
  };

  const renderDocumentLinks = (documents) => {
    if (!documents || documents.length === 0) {
      return (
        <span style={{ color: "gray", fontSize: "0.85em" }}>No Checklist</span>
      );
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          alignItems: "flex-start",
        }}
      >
        {documents.map((doc, index) => (
          <div
            key={index}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <FaFileAlt style={{ color: "#3b82f6", fontSize: "12px" }} />
            <a
              href={doc}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleChecklistClick}
              style={{
                color: "#2563eb",
                fontSize: "12px",
                textDecoration: "none",
              }}
              onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
              onMouseOut={(e) => (e.target.style.textDecoration = "none")}
            >
              Checklist {index + 1}
            </a>
            {!isChecklistApproved && (
              <button
                style={{
                  color: "#ef4444",
                  marginLeft: "4px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
                onClick={() => handleDeleteFile(doc)}
                disabled={isLoading}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "4px",
        padding: "4px",
        width: "100%",
      }}
    >
      {/* Top Row: Docs + Upload Button */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: "8px",
        }}
      >
        {renderDocumentLinks(checklistFiles)}
        <Tooltip title="Upload / Edit Checklist Details">
          <IconButton
            size="small"
            onClick={() => setIsDialogOpen(true)}
            sx={{ padding: "2px", marginLeft: 1 }}
          >
            <FaUpload style={{ color: "#4b5563", fontSize: "12px" }} />
          </IconButton>
        </Tooltip>
      </div>

      {/* Status Row */}
      {isChecklistApproved && approvalDate && (
        <div
          style={{
            color: "#166534",
            backgroundColor: "#dcfce7",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: 600,
            marginTop: "4px",
            display: "inline-block",
          }}
        >
          Approved on: {formatApprovalDate(approvalDate)}
        </div>
      )}

      {/* Dialog Popup */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        onClick={(e) => e.stopPropagation()} // Prevent row selection if clicking dialog
      >
        <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>
          Checklist Actions
        </DialogTitle>
        <DialogContent dividers>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* 1. File Upload */}
            <div>
              <Typography
                variant="caption"
                style={{
                  marginBottom: "4px",
                  display: "block",
                  fontWeight: 600,
                  color: "#4b5563",
                }}
              >
                Documents
              </Typography>
              <FileUpload
                label="Upload Checklist"
                bucketPath="checklist"
                onFilesUploaded={handleFilesUploaded}
                multiple={true}
              />
            </div>

            {/* 2. Remark */}
            <div>
              <Typography
                variant="caption"
                style={{
                  marginBottom: "4px",
                  display: "block",
                  fontWeight: 600,
                  color: "#4b5563",
                }}
              >
                Client Remark
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                variant="outlined"
                placeholder="Enter remark..."
                value={remarkClient}
                onChange={(e) => setRemarkClient(e.target.value)}
                onBlur={(e) => handleRemarkClientUpdate(e.target.value)}
              />
            </div>

            {/* 3. Approval */}
            <div
              style={{
                marginTop: "8px",
                padding: "8px",
                backgroundColor: "#f9fafb",
                borderRadius: "4px",
                border: "1px solid #f3f4f6",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isChecklistApproved}
                    onChange={handleChecklistApproval}
                    disabled={
                      !isChecklistClicked || isChecklistApproved || isLoading
                    }
                    color="success"
                  />
                }
                label={
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                    Approve Checklist
                  </span>
                }
              />
              {!isChecklistClicked && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#f97316",
                    marginLeft: "32px",
                  }}
                >
                  * View document to enable approval
                </div>
              )}
              {isChecklistApproved && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#16a34a",
                    marginLeft: "32px",
                  }}
                >
                  Approved on {formatApprovalDate(approvalDate)}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsDialogOpen(false)}
            variant="contained"
            size="small"
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ChecklistCell;
