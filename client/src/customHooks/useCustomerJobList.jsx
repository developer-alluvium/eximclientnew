import React, { useCallback, useMemo, useState } from "react";
import EditableDeliveryAddressCell from "../components/EditableDeliveryAddressCell"; // Adjust the path as needed
import { Button, Tooltip, Modal } from "antd";
import { CopyOutlined, CarOutlined } from "@ant-design/icons";
import { MdContentCopy, MdLocalShipping } from "react-icons/md";
// import ScaleIcon from "@mui/icons-material/Scale";
// import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ScaleIcon from "@mui/icons-material/Scale";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ChecklistCell from "../components/ChecklistCell"; // Adjust the path as needed
// import NetWeightCell from "../components/Net weight/NetWeightCell"; // Adjust the path as needed
import DoPlanningToggle from "../components/DoPlanningToggle"; // Adjust the path as needed
import EditableTransporterCell from "../components/EditableTransporterCell";
import BENumberCell from "../components/BEnumberCell.jsx";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button as MuiButton,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SendIcon from "@mui/icons-material/Send";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

// Subcomponent for Raise Query Dialog to isolate text input state and eliminate typing lag
const RaiseQueryDialogContent = React.memo(({
  job,
  onSubmit,
  onClose,
  sending,
  uploadingAttachment,
  attachments,
  onFileUpload,
  onDeleteAttachment,
  fileInputRef
}) => {
  const [msg, setMsg] = useState("");

  return (
    <>
      <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #e2e8f0", py: 2 }}>
        Raise Query for Job {job?.job_no}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Message"
          placeholder="Write detailed message..."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          sx={{ mt: 1 }}
        />

        {attachments && attachments.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
            {attachments.map((att, idx) => (
              <Chip
                key={idx}
                size="small"
                label={att.fileName}
                onDelete={() => onDeleteAttachment(idx)}
                color="primary"
                variant="outlined"
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={onFileUpload}
          />
          <MuiButton
            size="small"
            variant="outlined"
            startIcon={<AttachFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAttachment}
            sx={{ textTransform: "none", fontSize: "12px" }}
          >
            {uploadingAttachment ? "Uploading..." : "Attach Document"}
          </MuiButton>
        </div>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
        <MuiButton onClick={onClose} sx={{ textTransform: "none", fontSize: "12px" }}>
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          onClick={() => onSubmit(msg)}
          disabled={sending || (!msg.trim() && attachments.length === 0)}
          sx={{ textTransform: "none", fontSize: "12px", bgcolor: "#2563eb" }}
        >
          {sending ? "Submitting..." : "Submit Query"}
        </MuiButton>
      </DialogActions>
    </>
  );
});

// Subcomponent for Chat Reply Input to isolate text input state and eliminate typing lag
const ChatReplyInputSection = React.memo(({
  onSendReply,
  sending,
  uploadingAttachment,
  attachments,
  onFileUpload,
  onDeleteAttachment,
  fileInputRef,
  activeQueryId
}) => {
  const [replyText, setReplyText] = useState("");

  const handleSend = () => {
    if (!replyText.trim() && attachments.length === 0) return;
    onSendReply(activeQueryId, replyText, () => setReplyText(""));
  };

  return (
    <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #cbd5e1" }}>
      {attachments.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
          {attachments.map((att, idx) => (
            <Chip
              key={idx}
              size="small"
              label={att.fileName}
              onDelete={() => onDeleteAttachment(idx)}
              color="primary"
              variant="outlined"
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={onFileUpload}
        />
        <IconButton
          size="small"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAttachment}
          title="Attach file"
          sx={{ color: "#475569" }}
        >
          {uploadingAttachment ? <CircularProgress size={18} /> : <AttachFileIcon style={{ fontSize: 20 }} />}
        </IconButton>

        <TextField
          fullWidth
          size="small"
          placeholder="Type your reply..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !sending) {
              handleSend();
            }
          }}
          sx={{ bgcolor: "#fff", borderRadius: "20px", "& .MuiOutlinedInput-root": { borderRadius: "20px" } }}
        />

        <IconButton
          onClick={handleSend}
          disabled={sending || (!replyText.trim() && attachments.length === 0)}
          sx={{ bgcolor: "#2563eb", color: "#fff", "&:hover": { bgcolor: "#1d4ed8" }, p: 1 }}
        >
          {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon style={{ fontSize: 18 }} />}
        </IconButton>
      </div>
    </div>
  );
});

// Component to handle editable ETD Date in movement timeline
const EditableEtdCell = ({ job, formatDate }) => {
  const [etdValue, setEtdValue] = useState(() => job.etd_date || job.etd || job.etdDate || "");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async (newVal) => {
    if (!job._id && !job.job_no) return;
    setLoading(true);
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const targetId = job._id || job.job_no;
      await axios.patch(`${apiString}/jobs/${targetId}`, {
        etd_date: newVal,
        etd: newVal,
        etdDate: newVal,
      });
      setEtdValue(newVal);
      job.etd_date = newVal;
      job.etd = newVal;
      job.etdDate = newVal;
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update ETD Date:", err);
      alert("Failed to save ETD Date.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <strong>ETD Date:</strong>
      {isEditing ? (
        <input
          type="date"
          defaultValue={etdValue ? String(etdValue).split("T")[0] : ""}
          disabled={loading}
          onChange={(e) => {
            if (e.target.value) handleSave(e.target.value);
          }}
          onBlur={() => setIsEditing(false)}
          style={{
            padding: "1px 4px",
            fontSize: "11px",
            borderRadius: "4px",
            border: "1px solid #0066cc",
          }}
          autoFocus
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          style={{
            cursor: "pointer",
            color: etdValue ? "#333" : "#0066cc",
            fontWeight: etdValue ? "normal" : "600",
            textDecoration: "underline",
            fontSize: "12px",
          }}
          title="Click to enter or edit ETD Date"
        >
          {etdValue ? formatDate(etdValue) : "+ Add ETD"}
          <span style={{ marginLeft: "4px", fontSize: "10px", opacity: 0.6 }}>✏️</span>
        </span>
      )}
    </div>
  );
};

// Custom hook to manage job columns configuration with centered content
function useCustomerJobList(detailedStatus, onEwayBillSuccess) {
  const badge = (bg, color, bold = false) => ({
    backgroundColor: bg,
    color,
    padding: "0 6px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: bold ? "bold" : 500,
  });

  const [containerModalOpen, setContainerModalOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalInitialTab, setModalInitialTab] = useState("tracking");

  // Query Management States
  const [clientQueriesStatus, setClientQueriesStatus] = useState({});
  const [queryChatOpen, setQueryChatOpen] = useState(false);
  const [queryChatJob, setQueryChatJob] = useState(null);
  const [queryChatData, setQueryChatData] = useState([]);
  const [queryChatLoading, setQueryChatLoading] = useState(false);
  const [queryChatReply, setQueryChatReply] = useState("");
  const [queryChatSending, setQueryChatSending] = useState(false);
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);
  const [chatAttachments, setChatAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // For raising a query
  const [raiseQueryOpen, setRaiseQueryOpen] = useState(false);
  const [raiseQueryJob, setRaiseQueryJob] = useState(null);
  const [raiseQueryMessage, setRaiseQueryMessage] = useState("");
  const [raiseQuerySending, setRaiseQuerySending] = useState(false);
  const [raiseQueryAttachments, setRaiseQueryAttachments] = useState([]);

  // Snackbar state
  const [querySnackbar, setQuerySnackbar] = useState({ open: false, message: "", severity: "info" });

  const fileInputRef = React.useRef(null);
  const raiseFileInputRef = React.useRef(null);
  const chatEndRef = React.useRef(null);

  // Fetch query status for a list of job numbers
  const fetchQueryStatusForJobs = useCallback(async (jobNos = []) => {
    if (!Array.isArray(jobNos) || jobNos.length === 0) return;
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const res = await axios.post(`${apiString}/client-queries/jobs-status`, {
        jobNos,
        isClient: true,
      });
      if (res.data?.success) {
        setClientQueriesStatus((prev) => ({
          ...prev,
          ...res.data.data,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch client queries status:", err);
    }
  }, []);

  // Sort jobs list with query priority at TOP
  const sortJobsByQueryPriority = useCallback((jobsList = []) => {
    if (!Array.isArray(jobsList) || jobsList.length === 0) return jobsList;

    return [...jobsList].sort((a, b) => {
      const statA = clientQueriesStatus[a.job_no] || {};
      const statB = clientQueriesStatus[b.job_no] || {};

      const scoreA = statA.hasUnseen ? 3 : statA.hasOpenQueries ? 2 : 0;
      const scoreB = statB.hasUnseen ? 3 : statB.hasOpenQueries ? 2 : 0;

      return scoreB - scoreA;
    });
  }, [clientQueriesStatus]);

  const handleRedClick = useCallback((job) => {
    setRaiseQueryJob(job);
    setRaiseQueryMessage("");
    setRaiseQueryAttachments([]);
    setRaiseQueryOpen(true);
  }, []);

  const handleYellowClick = useCallback((job) => {
    const queryStat = clientQueriesStatus[job.job_no] || { hasQueries: false };
    if (!queryStat.hasQueries) {
      setQuerySnackbar({ open: true, message: "No query history found. Click Red to raise a query.", severity: "info" });
      return;
    }
    handleOpenQueryChat(job);
  }, [clientQueriesStatus]);

  const handleOpenQueryChat = useCallback(async (job) => {
    setQueryChatJob(job);
    setQueryChatOpen(true);
    setActiveQueryIndex(0);
    setQueryChatLoading(true);
    setChatAttachments([]);
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const resp = await axios.get(`${apiString}/client-queries`, {
        params: { job_no: job.job_no },
      });
      const queries = resp.data?.queries || [];
      setQueryChatData(queries);

      if (queries.length > 0) {
        const unseenIds = queries.filter((q) => !q.seenByClient).map((q) => q._id);
        if (unseenIds.length > 0) {
          await axios.put(`${apiString}/client-queries/mark-seen`, {
            queryIds: unseenIds,
            isClient: true,
          });
          setClientQueriesStatus((prev) => ({
            ...prev,
            [job.job_no]: { ...prev[job.job_no], hasUnseen: false },
          }));
        }
      }
    } catch (error) {
      console.error("Failed to load client queries:", error);
      setQuerySnackbar({ open: true, message: "Failed to load queries", severity: "error" });
    } finally {
      setQueryChatLoading(false);
    }
  }, []);

  const handleResolveOpenQuery = useCallback(async (job) => {
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const resp = await axios.get(`${apiString}/client-queries`, {
        params: { job_no: job.job_no, status: "open" },
      });
      const openQueries = resp.data?.queries || [];
      if (openQueries.length === 0) {
        setQuerySnackbar({ open: true, message: "No open queries found for this job.", severity: "warning" });
        return;
      }

      const targetQuery = openQueries[0];
      await axios.put(`${apiString}/client-queries/${targetQuery._id}/resolve`, {
        resolvedBy: "Client",
        resolutionNote: "Resolved from dashboard",
      });

      setQuerySnackbar({ open: true, message: "Query resolved successfully.", severity: "success" });
      fetchQueryStatusForJobs([job.job_no]);
      if (queryChatOpen && queryChatJob?.job_no === job.job_no) {
        handleOpenQueryChat(job);
      }
    } catch (error) {
      console.error("Failed to resolve query:", error);
      setQuerySnackbar({ open: true, message: "Failed to resolve query.", severity: "error" });
    }
  }, [fetchQueryStatusForJobs, queryChatOpen, queryChatJob, handleOpenQueryChat]);

  const handleFileUpload = useCallback(async (e, isRaise = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${apiString}/client-queries/upload-attachment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.fileUrl) {
        const fileObj = {
          fileName: res.data.fileName || file.name,
          fileUrl: res.data.fileUrl,
          fileType: res.data.fileType || file.type,
        };

        if (isRaise) {
          setRaiseQueryAttachments((prev) => [...prev, fileObj]);
        } else {
          setChatAttachments((prev) => [...prev, fileObj]);
        }
        setQuerySnackbar({ open: true, message: `Attachment uploaded: ${file.name}`, severity: "success" });
      }
    } catch (err) {
      console.error("Attachment upload failed:", err);
      setQuerySnackbar({ open: true, message: "Attachment upload failed.", severity: "error" });
    } finally {
      setUploadingAttachment(false);
      e.target.value = "";
    }
  }, []);

  const handleSendReply = useCallback(async (queryId, replyText, resetCallback) => {
    const textToSend = replyText !== undefined ? replyText : queryChatReply;
    if (!textToSend.trim() && chatAttachments.length === 0) return;
    setQueryChatSending(true);
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      await axios.put(`${apiString}/client-queries/${queryId}/reply`, {
        message: textToSend.trim(),
        repliedBy: "Client",
        senderType: "client",
        attachments: chatAttachments,
      });

      const resp = await axios.get(`${apiString}/client-queries`, {
        params: { job_no: queryChatJob.job_no },
      });
      setQueryChatData(resp.data?.queries || []);
      setQueryChatReply("");
      setChatAttachments([]);
      if (resetCallback) resetCallback();
      fetchQueryStatusForJobs([queryChatJob.job_no]);
    } catch (error) {
      console.error("Failed to send reply:", error);
      setQuerySnackbar({ open: true, message: "Failed to send reply", severity: "error" });
    } finally {
      setQueryChatSending(false);
    }
  }, [queryChatReply, chatAttachments, queryChatJob, fetchQueryStatusForJobs]);

  const handleRaiseQuerySubmit = useCallback(async (messageText) => {
    const msg = messageText !== undefined ? messageText : raiseQueryMessage;
    if (!msg.trim() && raiseQueryAttachments.length === 0) {
      setQuerySnackbar({ open: true, message: "Message or attachment is required", severity: "warning" });
      return;
    }
    setRaiseQuerySending(true);
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const payload = {
        module_type: "import",
        job_no: raiseQueryJob.job_no,
        job_id: raiseQueryJob._id,
        subject: "Client Query",
        message: msg.trim() || "Query raised with attachment",
        client_name: "Client",
        attachments: raiseQueryAttachments,
      };

      await axios.post(`${apiString}/client-queries`, payload);

      setQuerySnackbar({ open: true, message: "Query raised successfully", severity: "success" });
      setRaiseQueryOpen(false);
      setRaiseQueryMessage("");
      setRaiseQueryAttachments([]);

      if (raiseQueryJob?.job_no) {
        fetchQueryStatusForJobs([raiseQueryJob.job_no]);
      }
    } catch (error) {
      console.error("Failed to raise query:", error);
      setQuerySnackbar({ open: true, message: "Failed to raise query", severity: "error" });
    } finally {
      setRaiseQuerySending(false);
    }
  }, [raiseQueryMessage, raiseQueryAttachments, raiseQueryJob, fetchQueryStatusForJobs]);

  const handleContainerClick = useCallback((container, jobData = null, tab = "tracking") => {
    setSelectedContainer(container);
    if (jobData) {
      setSelectedJob(jobData);
    }
    setModalInitialTab(tab);
    setContainerModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setContainerModalOpen(false);
    setSelectedContainer(null);
    setSelectedJob(null);
    setModalInitialTab("tracking");
  }, []);

  const handleCopy = useCallback((event, text) => {
    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Text copied to clipboard:", text);
        })
        .catch((err) => {
          alert("Failed to copy text to clipboard.");
          console.error("Failed to copy:", err);
        });
    } else {
      // Fallback approach for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard using fallback method:", text);
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, []);

  // Common cell styling for centering content
  const centeredCellStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    textAlign: "center",
    height: "100%",
  };

  // Optimized columns array with centered content
  const columns = useMemo(
    () => [
      // {
      //   accessorKey: "free_time",
      //   header: "Free Time",
      //   size: 85,

      //   Cell: ({ cell }) => (
      //     <div  style={{
      //     ...centeredCellStyle,
      //     wordWrap: 'break-word',
      //     whiteSpace: 'pre-wrap',
      //     maxWidth: '320px',
      //     padding: '8px',
      //     gap: '8px'
      //   }}>{cell.getValue() || "N/A"}</div>
      //   ),
      // },

      {
        // Group 2: Exporter & Job Number
        accessorKey: "supplier_exporter",
        header: (<>Exporter,<br /> Job Number & Free Time</>),
        size: 200,
        Cell: ({ cell }) => {
          const { job_no, job_date, detailed_status, free_time, shipping_line_airline, consignment_type } =
            cell.row.original;

          // Get color based on status
          let textColor = "inherit";
          let bgColor = "transparent";

          if (detailed_status === "Completed") {
            textColor = "#1a8917"; // Green for completed
            bgColor = "#e8f5e9";
          } else if (detailed_status === "In Progress") {
            textColor = "#b36200"; // Orange for in progress
            bgColor = "#fff3e0";
          }

          return (
            <div
              style={{
                ...centeredCellStyle,
                wordWrap: "break-word",
                whiteSpace: "pre-wrap",
                maxWidth: "320px",
                padding: "8px",
                gap: "4px",
              }}
            >
              <div style={{ fontWeight: "700", fontSize: "12px", color: "rgba(0,0,0,0.85)", lineHeight: "1.3", textAlign: "center" }}>
                {cell.getValue() || "N/A"}
              </div>

              {/* Freight Forwarder / Shipping Line — styled like ExportJobsTable FWDR label */}
              {shipping_line_airline && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "2px",
                  justifyContent: "center",
                }}>
                  <span style={{ fontWeight: "700", color: "#fc8019", fontSize: "9px" }}>FWDR:</span>
                  <span style={{ color: "#fc8019", fontWeight: "700", fontSize: "10px" }}>
                    {shipping_line_airline}
                  </span>
                </div>
              )}

              <div
                style={{
                  color: textColor,
                  backgroundColor: bgColor,
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9em",
                  fontWeight: "bold",
                  marginTop: "4px",
                }}
              >
                <div
                  key="job-number"
                  style={{
                    fontWeight: "bold",
                    fontSize: "0.8rem",
                    border: "1px solid black",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    backgroundColor: "#f8f9fa",
                    display: "inline-block",
                  }}
                >
                  Job: {job_no}
                </div>
                <div
                  key="free-time"
                  style={{
                    fontWeight: "bold",
                    fontSize: "0.8rem",
                    border: "1px solid black",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    backgroundColor: "#f8f9fa",
                    display: "inline-block",
                  }}
                >
                  Free Time: {free_time}
                </div>
                {consignment_type && (
                  <div
                    key="consignment-type"
                    style={{
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                      border: "1px solid black",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      marginBottom: "4px",
                      backgroundColor: "#e0f2fe",
                      color: "#0369a1",
                      display: "inline-block",
                      marginLeft: "4px",
                    }}
                  >
                    {consignment_type}
                  </div>
                )}

                {/* Query Action Buttons & Status inside Job Number Cell */}
                {(() => {
                  const queryStat = clientQueriesStatus[job_no] || {
                    hasQueries: false,
                    hasUnseen: false,
                    hasOpenQueries: false,
                  };
                  return (
                    <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                        {/* Raise Query Button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRedClick(cell.row.original); }}
                          style={{
                            padding: "2px 8px",
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "#dc2626",
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fca5a5",
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            lineHeight: "1.2",
                          }}
                          title="Raise new query"
                        >
                          + Query
                        </button>

                        {/* View / Reply Query Button */}
                        {queryStat.hasQueries && (
                          <div style={{ position: "relative", display: "inline-flex" }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleYellowClick(cell.row.original); }}
                              style={{
                                padding: "2px 8px",
                                fontSize: "10px",
                                fontWeight: "600",
                                color: "#d97706",
                                backgroundColor: "#fffbeb",
                                border: "1px solid #fcd34d",
                                borderRadius: "4px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                lineHeight: "1.2",
                              }}
                              title="View replies & reply back"
                            >
                              View Query
                            </button>
                            {queryStat.hasUnseen && (
                              <span
                                style={{
                                  position: "absolute",
                                  top: "-3px",
                                  right: "-3px",
                                  width: "7px",
                                  height: "7px",
                                  borderRadius: "50%",
                                  backgroundColor: "#ef4444",
                                  border: "1px solid #fff",
                                  pointerEvents: "none",
                                }}
                              />
                            )}
                          </div>
                        )}

                        {/* Resolve Query Button */}
                        {queryStat.hasOpenQueries && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleResolveOpenQuery(cell.row.original); }}
                            style={{
                              padding: "2px 8px",
                              fontSize: "10px",
                              fontWeight: "600",
                              color: "#059669",
                              backgroundColor: "#ecfdf5",
                              border: "1px solid #6ee7b7",
                              borderRadius: "4px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              lineHeight: "1.2",
                            }}
                            title="Resolve open query"
                          >
                            Resolve
                          </button>
                        )}
                      </div>

                      {/* Status Pill */}
                      {queryStat.hasQueries && (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "9px",
                            fontWeight: "700",
                            cursor: "pointer",
                            backgroundColor: queryStat.hasUnseen ? "#fee2e2" : queryStat.hasOpenQueries ? "#fef3c7" : "#dcfce7",
                            border: `1px solid ${queryStat.hasUnseen ? "#ef4444" : queryStat.hasOpenQueries ? "#f59e0b" : "#22c55e"}`,
                            color: queryStat.hasUnseen ? "#b91c1c" : queryStat.hasOpenQueries ? "#b45309" : "#15803d",
                          }}
                          onClick={(e) => { e.stopPropagation(); handleOpenQueryChat(cell.row.original); }}
                        >
                          {queryStat.hasUnseen ? "● New Message" : queryStat.hasOpenQueries ? "Open Query" : "Resolved"}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        },

      },

      // {
      //   accessorKey: "be_no",
      //   header: "BE Number & Date",
      //   size: 150,
      //   Cell: ({ cell }) => {
      //     const beNumber = cell?.getValue()?.toString();
      //     const rawBeDate = cell.row.original.be_date;
      //     const beDate = formatDate(rawBeDate);
      //     const {
      //       processed_be_attachment = [],
      //       ooc_copies = [],
      //       gate_pass_copies = []
      //     } = cell.row.original;

      //     // Combine all documents with labels
      //     const allDocuments = [
      //       ...processed_be_attachment.map((url, index) => ({
      //         url,
      //         name: `Processed BE ${index + 1}`,
      //         type: 'processed_be'
      //       })),
      //       ...ooc_copies.map((url, index) => ({
      //         url,
      //         name: `OOC Copy ${index + 1}`,
      //         type: 'ooc'
      //       })),
      //       ...gate_pass_copies.map((url, index) => ({
      //         url,
      //         name: `Gate Pass ${index + 1}`,
      //         type: 'gate_pass'
      //       }))
      //     ];

      //     return (
      //       <div style={centeredCellStyle}>
      //         {beNumber && (
      //           <div
      //             style={{
      //               display: "flex",
      //               flexDirection: "column",
      //               gap: "4px",
      //               alignItems: "center",
      //             }}
      //           >
      //             <div
      //               style={{
      //                 display: "flex",
      //                 alignItems: "center",
      //                 gap: "4px",
      //               }}
      //             >
      //               <a
      //                 href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${beNumber}&BE_DT=${beDate}`}
      //                 target="_blank"
      //                 rel="noopener noreferrer"
      //               >
      //                 {beNumber}
      //               </a>
      //               <IconButton
      //                 size="small"
      //                 onClick={(event) => handleCopy(event, beNumber)}
      //                 sx={{ padding: "2px" }}
      //               >
      //                 <abbr title="Copy BE Number">
      //                   <ContentCopyIcon fontSize="inherit" />
      //                 </abbr>
      //               </IconButton>
      //             </div>
      //             <span>{beDate}</span>

      //             {/* Documents section - matching esanchit format */}
      //             <div style={{ marginTop: "8px", width: "100%" }}>
      //               {allDocuments.length > 0 ? (
      //                 allDocuments.map((doc, index) => (
      //                   <div key={index} style={{ marginBottom: "4px" }}>
      //                     {doc.url ? (
      //                       <a
      //                         href={doc.url}
      //                         target="_blank"
      //                         rel="noopener noreferrer"
      //                         style={{
      //                           fontSize: "0.9rem",
      //                           color: "#007bff",
      //                           textDecoration: "underline"
      //                         }}
      //                       >
      //                         {doc.name}
      //                       </a>
      //                     ) : (
      //                       <span style={{ fontSize: "0.8em", color: "#999" }}>
      //                         {doc.name}
      //                       </span>
      //                     )}
      //                   </div>
      //                 ))
      //               ) : (
      //                 <span style={{ fontSize: "0.8em", color: "#999" }}>
      //                   No documents
      //                 </span>
      //               )}
      //             </div>
      //           </div>
      //         )}
      //       </div>
      //     );
      //   },
      // },
      {
        accessorKey: "be_no",
        // header: (
        //   <div className="flex flex-col text-center whitespace-normal leading-tight">
        //     <span>BE Number</span>
        //     <span>and Date</span>
        //   </div>
        // ),
        header: <>BE Number and Date</>,
        size: 230,
        Cell: ({ cell }) => <BENumberCell cell={cell} copyFn={handleCopy} onEwayBillSuccess={onEwayBillSuccess} />,
      },
      {
        accessorKey: "checklist",
        header: "Checklist/Shipping Line Invoices",
        enableSorting: false,
        size: 300,
        Cell: ({ cell }) => {
          const { do_shipping_line_invoice = [], remark_client } =
            cell.row.original;

          return (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "8px",
                textAlign: "left",
                width: "100%",
                height: "100%",
                fontSize: "12px",
                alignItems: "flex-start",
              }}
            >
              {/* Checklist Section - Left Side */}
              <div style={{ flex: "1", minWidth: "0" }}>
                <ChecklistCell {...{ cell }} />
                {(do_shipping_line_invoice.length > 0 || remark_client) && (
                  <div
                    style={{
                      flex: "1",
                      minWidth: "0",
                      borderLeft: "1px solid #e5e7eb",
                      paddingLeft: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {/* Remark Section */}
                    {remark_client && (
                      <div
                        style={{
                          backgroundColor: "#dbeafe",
                          // color: "#1e3a8a",
                          color: "#1E293B",
                          wordBreak: "break-word",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 600,
                          marginTop: "4px",
                          width: "fit-content",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Remark:</span>{" "}
                        {remark_client}
                      </div>
                    )}

                    {/* Shipping Line Invoices Section */}
                    {do_shipping_line_invoice.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          // gap: "4px",
                        }}
                      >
                        {/* Label */}
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#374151",
                            whiteSpace: "nowrap",
                            marginRight: "4px",
                          }}
                        >
                          Invoices:
                        </span>

                        {/* Invoice list */}
                        <span
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            flex: 1,
                          }}
                        >
                          {(() => {
                            const damageInvoices = [];
                            const { charges = [] } = cell.row.original;
                            if (Array.isArray(charges)) {
                              const damageMap = new Map();
                              charges.forEach(charge => {
                                if (charge.chargeHead && charge.chargeHead.toLowerCase().includes("damage")) {
                                  const headName = charge.chargeHead;
                                  if (!damageMap.has(headName)) {
                                    damageMap.set(headName, new Set());
                                  }
                                  const urlSet = damageMap.get(headName);

                                  if (charge.revenue?.url && Array.isArray(charge.revenue.url)) {
                                    charge.revenue.url.forEach(u => u && urlSet.add(u));
                                  }
                                  if (charge.cost?.url && Array.isArray(charge.cost.url)) {
                                    charge.cost.url.forEach(u => u && urlSet.add(u));
                                  }
                                }
                              });

                              damageMap.forEach((urlSet, headName) => {
                                if (urlSet.size > 0) {
                                  damageInvoices.push({
                                    document_name: headName,
                                    url: Array.from(urlSet),
                                    is_draft: false,
                                    is_final: false,
                                  });
                                }
                              });
                            }

                            const extraInvoices = [];
                            const { shipping_line_invoice_imgs = [] } = cell.row.original;
                            if (Array.isArray(shipping_line_invoice_imgs) && shipping_line_invoice_imgs.length > 0) {
                              extraInvoices.push({
                                document_name: "Shipping Line Invoice",
                                url: shipping_line_invoice_imgs,
                                is_draft: false,
                                is_final: false,
                              });
                            }

                            let allShippingInvoices = [...damageInvoices, ...do_shipping_line_invoice, ...extraInvoices];

                            // Deduplicate invoices with empty URLs if we injected the same name with actual URLs
                            const hasValidShippingLine = allShippingInvoices.some(inv =>
                              inv.document_name === "Shipping Line Invoice" && Array.isArray(inv.url) && inv.url.length > 0
                            );
                            if (hasValidShippingLine) {
                              allShippingInvoices = allShippingInvoices.filter(inv =>
                                !(inv.document_name === "Shipping Line Invoice" && (!Array.isArray(inv.url) || inv.url.length === 0))
                              );
                            }

                            return allShippingInvoices.map((invoice, index) => {
                              const isDamage = (invoice.document_name || "").toLowerCase().includes("damage");
                              const hasUrl = Array.isArray(invoice.url)
                                ? invoice.url.some((u) => u && String(u).trim() !== "")
                                : typeof invoice.url === "string" && invoice.url.trim() !== "";
                              const firstUrl = hasUrl
                                ? Array.isArray(invoice.url)
                                  ? invoice.url.find((u) => u && String(u).trim() !== "")
                                  : invoice.url
                                : null;
                              return (
                                <span
                                  key={index}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "2px",
                                    borderBottom: "1px solid #f3f4f6",
                                    paddingBottom: "4px",
                                    ...(isDamage ? {
                                      backgroundColor: "#fee2e2",
                                      border: "1px solid #ef4444",
                                      padding: "4px",
                                      borderRadius: "4px",
                                      marginTop: "2px"
                                    } : {})
                                  }}
                                >
                                  {/* Top row */}
                                  <span
                                    style={{
                                      display: "flex",
                                      justifyContent: "flex-start",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    {firstUrl ? (
                                      <a
                                        href={firstUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={invoice.document_name}
                                        style={{
                                          fontWeight: 500,
                                          color: isDamage ? "#b91c1c" : "#1d4ed8",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          maxWidth: "65%",
                                          textDecoration: "underline",
                                          cursor: "pointer",
                                        }}
                                      >
                                        {invoice.document_name ||
                                          `Invoice ${index + 1}`}
                                      </a>
                                    ) : (
                                      <span
                                        title={invoice.document_name}
                                        style={{
                                          fontWeight: 500,
                                          color: isDamage ? "#b91c1c" : "#6b7280",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          maxWidth: "65%",
                                        }}
                                      >
                                        {invoice.document_name ||
                                          `Invoice ${index + 1}`}
                                      </span>
                                    )}

                                    {/* Status badges */}
                                    <span style={{ display: "flex", gap: "4px" }}>
                                      {invoice.is_draft && (
                                        <span style={badge("#fef9c3", "#854d0e")}>
                                          Draft
                                        </span>
                                      )}
                                      {invoice.is_final && (
                                        <span
                                          style={badge("#dcfce7", "#166534", true)}
                                        >
                                          Final
                                        </span>
                                      )}
                                      {invoice.is_payment_made && (
                                        <span style={badge("#dcfce7", "#166534")}>
                                          Paid
                                        </span>
                                      )}
                                      {invoice.is_payment_requested &&
                                        !invoice.is_payment_made && (
                                          <span style={badge("#cffafe", "#155e75")}>
                                            Req
                                          </span>
                                        )}
                                    </span>
                                  </span>

                                  {/* Amount details */}
                                  {invoice.document_amount_details && (
                                    <span
                                      style={{
                                        color: "#545964ff",
                                        fontSize: "10px",
                                      }}
                                    >
                                      Amount: {invoice.document_amount_details}
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      color: "#666",
                                    }}
                                  >
                                    Mode: {invoice.payment_mode}
                                    {invoice.wire_transfer_method &&
                                      ` (${invoice.wire_transfer_method})`}
                                  </span>

                                  {/* Document links */}
                                  {Array.isArray(invoice.url) &&
                                    invoice.url.length > 0 && (
                                      <span
                                        style={{
                                          display: "flex",
                                          gap: "6px",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {invoice.url.map((link, i) => (
                                          <a
                                            key={i}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              color: "#3b82f6",
                                              textDecoration: "underline",
                                              fontSize: "10px",
                                            }}
                                          >
                                            Doc {i + 1}
                                          </a>
                                        ))}
                                      </span>
                                    )}
                                </span>
                              );
                            });
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Remarks & Invoices - Right Side */}
            </div>
          );
        },
        sx: centeredCellStyle,
      },

      {
        accessorKey: "shipment_details",
        header: <>Shipment & <br />Commercial Details</>,
        size: 240,
        Cell: ({ cell }) => {
          const {
            awb_bl_no,
            awb_bl_date,
            hawb_hbl_no,
            hawb_hbl_date,
            gross_weight,
            job_net_weight,
            invoice_number,
            invoice_date,
            inv_currency,
            loading_port,
            port_of_reporting,
            custom_house,
            freight,
            insurance,
            toi,
            importer_reference_no,
            consignment_type,
          } = cell.row.original;

          let toiStr = (toi !== undefined && toi !== null && toi !== "") ? toi : "N/A";
          let freightStr = (freight !== undefined && freight !== null && freight !== "") ? freight : "N/A";
          let insuranceStr = (insurance !== undefined && insurance !== null && insurance !== "") ? insurance : "N/A";

          let invDetails = cell.row.original.invoice_details || cell.row.original.invoices;
          if (typeof invDetails === "string") {
            try { invDetails = JSON.parse(invDetails); } catch (e) { }
          }
          if (Array.isArray(invDetails) && invDetails.length > 0) {
            const validToiInv = invDetails.find(inv => inv.toi !== undefined && inv.toi !== null && inv.toi !== "" || inv.termsOfInvoice);
            if (validToiInv) toiStr = validToiInv.toi || validToiInv.termsOfInvoice;

            const validFreightInv = invDetails.find(inv => (inv.freight !== undefined && inv.freight !== null && inv.freight !== "") || (inv.freightInsuranceCharges?.freight?.amount));
            if (validFreightInv) {
              const amt = validFreightInv.freightInsuranceCharges?.freight?.amount ?? validFreightInv.freight;
              const curr = validFreightInv.freightInsuranceCharges?.freight?.currency || validFreightInv.freight_currency || inv_currency || "";
              freightStr = `${amt} ${curr}`.trim();
            }

            const validInsuranceInv = invDetails.find(inv => (inv.insurance !== undefined && inv.insurance !== null && inv.insurance !== "") || (inv.freightInsuranceCharges?.insurance?.amount));
            if (validInsuranceInv) {
              const amt = validInsuranceInv.freightInsuranceCharges?.insurance?.amount ?? validInsuranceInv.insurance;
              const curr = validInsuranceInv.freightInsuranceCharges?.insurance?.currency || validInsuranceInv.insurance_currency || inv_currency || "";
              insuranceStr = `${amt} ${curr}`.trim();
            }
          }

          const jobObj = cell.row.original;
          const buyerStr = jobObj.buyerThirdPartyInfo?.buyer?.name || jobObj.buyer_name || jobObj.buyerName || jobObj.buyer_details?.name || "";
          const thirdPartyStr = jobObj.buyerThirdPartyInfo?.thirdParty?.name || jobObj.third_party_name || jobObj.thirdPartyName || jobObj.third_party_info?.name || "";

          return (
            <div style={{ alignItems: "center" }}>
              <strong>MBL:</strong>{" "}{awb_bl_no || "N/A"}
              {awb_bl_no && (
                <Button
                  type="text"
                  size="small"
                  onClick={(event) => handleCopy(event, awb_bl_no)}
                  icon={<CopyOutlined />}
                  title="Copy MBL Number"
                />
              )}{" "}
              {awb_bl_date} <br />
              <strong>HBL:</strong>{" "}{hawb_hbl_no || "N/A"}
              {hawb_hbl_no && (
                <Button
                  type="text"
                  size="small"
                  onClick={(event) => handleCopy(event, hawb_hbl_no)}
                  icon={<CopyOutlined />}
                  title="Copy HBL Number"
                />
              )}{" "}
              {hawb_hbl_date} <br />
              {importer_reference_no && (
                <>
                  <strong>Importer Ref No:</strong>{" "}{importer_reference_no} <br />
                </>
              )}
              <strong>Gross Weight:</strong>{" "}{gross_weight || ""} kg
              <br />
              <strong>Net weight:</strong>{" "}{job_net_weight || ""} kg
              <br />
              <strong>Invoice:</strong>{" "}{invoice_number}{" "}{invoice_date} <br />
              <strong>Value:</strong>{" "}{(() => {
                const job = cell.row.original;
                if (Array.isArray(invDetails) && invDetails.length > 0) {
                  const sumPV = invDetails.reduce((sum, r) => {
                    const pv = parseFloat(r.product_value || r.amount || r.invoiceValue);
                    if (!isNaN(pv) && pv > 0) return sum + pv;
                    return sum;
                  }, 0);
                  if (sumPV > 0) return sumPV.toFixed(2);
                }

                const topPV = parseFloat(job.product_value || job.invoiceValue);
                if (!isNaN(topPV) && topPV > 0) return topPV.toFixed(2);

                let descDetails = job.description_details;
                if (typeof descDetails === "string") {
                  try { descDetails = JSON.parse(descDetails); } catch (e) { }
                }
                if (Array.isArray(descDetails) && descDetails.length > 0) {
                  const sumDesc = descDetails.reduce((sum, d) => {
                    const amt = parseFloat(d.amount);
                    if (!isNaN(amt) && amt > 0) return sum + amt;
                    const up = parseFloat(d.unit_price);
                    const qty = parseFloat(d.quantity);
                    if (!isNaN(up) && up > 0 && !isNaN(qty) && qty > 0) return sum + (up * qty);
                    return sum;
                  }, 0);
                  if (sumDesc > 0) return sumDesc.toFixed(2);
                }

                return job.product_value || job.invoiceValue || "N/A";
              })()}{" "}{inv_currency || ""} <br />
              <strong>PO No:</strong>{" "}{(() => {
                const job = cell.row.original;
                const extractPo = (val, defaultDate) => {
                  if (!val) return null;
                  if (typeof val === "string" || typeof val === "number") {
                    const s = String(val).trim();
                    if (!s || s === "[object Object]") return null;
                    return defaultDate ? `${s} (${defaultDate})` : s;
                  }
                  if (Array.isArray(val)) {
                    const extracted = val.map(item => extractPo(item, defaultDate)).filter(Boolean);
                    return extracted.length > 0 ? extracted.join(", ") : null;
                  }
                  if (typeof val === "object") {
                    const num = val.po_no || val.po_number || val.po_num || val.poNo || val.poNumber || val.po || val.number;
                    const dt = val.po_date || val.poDate || val.date || defaultDate;
                    if (num) return extractPo(num, dt);
                  }
                  return null;
                };

                const pos = [];
                const topPo = extractPo(job.po_details) ||
                  extractPo(job.po_no || job.po_number || job.po_num || job.poNo || job.poNumber || job.po, job.po_date || job.poDate);
                if (topPo) pos.push(topPo);

                let invoices = invDetails || job.invoice_details || job.invoices;
                if (typeof invoices === "string") {
                  try { invoices = JSON.parse(invoices); } catch (e) { }
                }
                if (Array.isArray(invoices)) {
                  invoices.forEach(inv => {
                    if (!inv) return;
                    const invPo = extractPo(inv.po_details) ||
                      extractPo(inv.po_no || inv.po_number || inv.po_num || inv.poNo || inv.poNumber || inv.po, inv.po_date || inv.poDate);
                    if (invPo) pos.push(invPo);
                  });
                }

                const uniquePos = [...new Set(pos)].filter(p => p && p !== "[object Object]");
                return uniquePos.length > 0 ? uniquePos.join(", ") : "N/A";
              })()} <br />
              <strong>TOI:</strong>{" "}{toiStr} <br />
              {freightStr !== "N/A" && (
                <>
                  <strong>Freight:</strong>{" "}{freightStr} <br />
                </>
              )}
              {insuranceStr !== "N/A" && (
                <>
                  <strong>Insurance:</strong>{" "}{insuranceStr} <br />
                </>
              )}
              {buyerStr && (
                <>
                  <strong>Buyer:</strong>{" "}{buyerStr} <br />
                </>
              )}
              {thirdPartyStr && (
                <>
                  <strong>3rd Party:</strong>{" "}{thirdPartyStr} <br />
                </>
              )}
              <strong>POL:</strong>{" "}
              {loading_port ? loading_port.replace(/\(.*?\)\s*/, "") : ""}{" "}
              <br />
              <strong>POD:</strong>{" "}
              {port_of_reporting
                ? port_of_reporting.replace(/\(.*?\)\s*/, "")
                : ""}{" "}
              <br />
              <strong>ICD Port:</strong>{" "}{custom_house || "N/A"} <br />

            </div>
          );
        },
      },

      {
        // Group 4: Container
        accessorKey: "container_details",
        header: "Container",
        size: 230,
        Cell: ({ cell }) => {
          const containerNos = cell.row.original.container_nos;

          // Helper function to get color based on shortage amount
          const getShortageColor = (shortage) => {
            if (shortage < 0) {
              return "#e02251"; // Red for shortage
            } else {
              return "#2e7d32"; // Green for no shortage
            }
          };

          const getShortageText = (shortage) => {
            if (shortage < 0) {
              return `Shortage: -${Math.abs(shortage).toFixed(2)} kg`;
            } else if (shortage > 0) {
              return `Excess: +${Math.abs(shortage).toFixed(2)} kg`;
            } else {
              return "No shortage/excess";
            }
          };

          return (
            <React.Fragment>
              <div style={centeredCellStyle}>
                {containerNos?.map((container, id) => {
                  const weightShortage =
                    parseFloat(container.weight_shortage) || 0;
                  const containerColor = getShortageColor(weightShortage);
                  const tooltipText = getShortageText(weightShortage);
                  const containerType = container.container_type || container.containerType || container.type || cell.row.original.container_type || cell.row.original.containerType || "";

                  return (
                    <div
                      key={id}
                      className="mb-2 w-full"
                      style={{
                        marginBottom: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <Tooltip title={tooltipText} arrow placement="top">
                        <a
                          style={{
                            color: containerColor,
                            fontWeight: "bold",
                            textDecoration: "none",
                            cursor: "pointer",
                          }}
                          onClick={() => handleContainerClick(container, cell.row.original, 'tracking')}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.textDecoration = "underline")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.textDecoration = "none")
                          }
                        >
                          {container.container_number}
                        </a>
                      </Tooltip>

                      {containerType && (
                        <span style={{ color: "#475569", fontSize: "12px", fontWeight: "600" }}>
                          ({containerType})
                        </span>
                      )}

                      <span style={{ color: "#666" }}>
                        | "{container.size}"
                      </span>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Tooltip title="Copy Container Number" arrow>
                          <Button
                            type="text"
                            size="small"
                            style={{ minWidth: "24px", padding: 0 }}
                            onClick={(event) =>
                              handleCopy(event, container.container_number)
                            }
                            icon={<CopyOutlined style={{ fontSize: '14px' }} />}
                          />
                        </Tooltip>

                        <Tooltip title="Assign Transporter" arrow>
                          <Button
                            type="text"
                            size="small"
                            style={{ minWidth: "24px", padding: 0 }}
                            onClick={() =>
                              handleContainerClick(
                                container,
                                cell.row.original,
                                'transporter'
                              )
                            }
                            icon={<CarOutlined style={{ fontSize: '14px' }} />}
                          />
                        </Tooltip>
                      </span>
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          );
        },
      },

      {
        // Group 5: Movement Timeline
        accessorKey: "movement_timeline",
        header: "Movement Timeline",
        size: 300,
        Cell: ({ cell }) => {
          const {
            etd_date,
            etd,
            vessel_berthing,
            gateway_igm_date,
            gigm_date,
            igm_date,
            discharge_date,
            arrival_date: job_arrival_date,
            arrivalDate: job_arrivalDate,
            rail_out_date: job_rail_out_date,
            rail_out: job_rail_out,
            pcv_date,
            out_of_charge,
            container_nos = [],
          } = cell.row.original;

          // Helper to fetch container or job level dates
          const getDatesDisplay = (field, jobFallbacks = []) => {
            const dates = [];
            if (container_nos && Array.isArray(container_nos)) {
              container_nos.forEach((c) => {
                if (c[field] && String(c[field]).trim() !== "") {
                  dates.push(c[field]);
                }
              });
            }
            if (dates.length === 0) {
              for (const fb of jobFallbacks) {
                if (fb && String(fb).trim() !== "") {
                  dates.push(fb);
                  break;
                }
              }
            }
            if (dates.length === 0) return null;
            const uniqueFormatted = [...new Set(dates.map((d) => formatDate(d)))];
            return uniqueFormatted.join(", ");
          };

          const etdVal = etd_date || etd || cell.row.original.etdDate;
          const etaVal = vessel_berthing;
          const gigmVal = gateway_igm_date || gigm_date || igm_date;
          const dischargeVal = discharge_date;
          const railOutVal = getDatesDisplay("container_rail_out_date", [job_rail_out_date, job_rail_out]) || getDatesDisplay("rail_out_date");
          const arrivalVal = getDatesDisplay("arrival_date", [job_arrival_date, job_arrivalDate]);
          const pcvVal = pcv_date;
          const oocVal = out_of_charge;
          const deliveryVal = getDatesDisplay("delivery_date");
          const emptyOffVal = getDatesDisplay("emptyContainerOffLoadDate") || getDatesDisplay("empty_off_date");
          const detentionVal = getDatesDisplay("detention_from");

          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                textAlign: "left",
                gap: "2px",
                width: "100%",
              }}
            >
              <EditableEtdCell job={cell.row.original} formatDate={formatDate} />

              <div>
                <strong>ETA:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {etaVal ? formatDate(etaVal) : "Pending"}
                </span>
              </div>

              {gigmVal && (
                <div>
                  <strong>GIGM Date:</strong>
                  <span style={{ marginLeft: "8px" }}>{formatDate(gigmVal)}</span>
                </div>
              )}

              <div>
                <strong>Discharge Date:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {dischargeVal ? formatDate(dischargeVal) : "Pending"}
                </span>
              </div>

              {railOutVal && (
                <div>
                  <strong>Rail Out:</strong>
                  <span style={{ marginLeft: "8px" }}>{railOutVal}</span>
                </div>
              )}

              {arrivalVal && (
                <div>
                  <strong>Arrival Date:</strong>
                  <span style={{ marginLeft: "8px" }}>{arrivalVal}</span>
                </div>
              )}

              {pcvVal && (
                <div>
                  <strong>PCV Date:</strong>
                  <span style={{ marginLeft: "8px" }}>{formatDate(pcvVal)}</span>
                </div>
              )}

              <div>
                <strong>OOC Date:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {oocVal ? formatDate(oocVal) : "Pending"}
                </span>
              </div>

              <div>
                <strong>Delivery Date:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {deliveryVal || "Pending"}
                </span>
              </div>

              <div>
                <strong>Empty Off:</strong>
                <span style={{ marginLeft: "8px" }}>
                  {emptyOffVal || "Pending"}
                </span>
              </div>

              <div>
                <strong>Detention From:</strong>
                <span
                  style={{
                    marginLeft: "8px",
                    fontWeight: "bold",
                    color: detentionVal ? "#b91c1c" : "inherit",
                  }}
                >
                  {detentionVal || "N/A"}
                </span>
              </div>

              <div>
                <strong>Reason for Delay:</strong>
                <span
                  style={{
                    marginLeft: "8px",
                    color: (cell.row.original.reason_for_delay || cell.row.original.reasonForDelay || cell.row.original.delay_reason || cell.row.original.delayReason) ? "#b91c1c" : "inherit",
                  }}
                >
                  {cell.row.original.reason_for_delay ||
                    cell.row.original.reasonForDelay ||
                    cell.row.original.delay_reason ||
                    cell.row.original.delayReason ||
                    "N/A"}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        // Group 6: D.O. Validity
        accessorKey: "do_validity",
        header: "D.O. Validity",
        size: 200,
        Cell: ({ cell }) => {
          const { do_validity, do_copies, do_completed } = cell.row.original;

          return (
            <div style={centeredCellStyle}>
              <div
                style={{
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div>
                  <strong>Valid Upto:</strong>
                  <span
                    style={{
                      marginLeft: "8px",
                      color: do_validity ? "#d97706" : "inherit",
                      fontWeight: do_validity ? "bold" : "normal",
                    }}
                  >
                    {do_validity ? formatDate(do_validity) : "Not validated"}
                  </span>
                </div>
                {/* DO Completed Date */}
                <div>
                  <strong>DO Completed Date:</strong>
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "0.9em",
                      color: do_completed ? "#1a8917" : "#999",
                    }}
                  >
                    {do_completed ? formatDate(do_completed) : "Pending"}
                  </span>
                </div>
                <div>
                  <strong>DO Copies:</strong>
                  {Array.isArray(do_copies) && do_copies.length > 0 ? (
                    <div style={{ marginTop: "4px" }}>
                      {do_copies.map((url, index) => (
                        <div key={index}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#007bff",
                              textDecoration: "underline",
                            }}
                          >
                            DO Copy {index + 1}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginBottom: "5px" }}>
                      <span style={{ color: "gray" }}> No DO copies </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },

      {
        // Group 7: eSanchit Documents
        accessorKey: "esanchit_documents",
        header: "eSanchit Documents",
        size: 200,
        Cell: ({ cell }) => {
          const { cth_documents = [] } = cell.row.original;
          const validDocuments = cth_documents.filter(
            (doc) => doc.document_check_date,
          );

          return (
            <div>
              {validDocuments.length > 0 ? (
                validDocuments.map((doc, index) => (
                  <div key={index} style={{ marginBottom: "4px" }}>
                    {doc.url && doc.url[0] ? (
                      <a
                        href={doc.url[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {doc.document_name || `Document ${index + 1}`}
                      </a>
                    ) : (
                      <span>
                        {doc.document_name || `Document ${index + 1}`}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <span>No documents</span>
              )}
            </div>
          );
        },
      },

      {
        // Group 8: DO Planning
        accessorKey: "doPlanning",
        header: "DO Planning",
        Header: () => <div className="w-full text-left">DO Planning</div>,
        size: 250,
        Cell: ({ cell }) => {
          // Get the data from the row
          const {
            do_planning_date,
            doPlanning,
            do_planning_history,
            do_copies = [],
            do_validity,
            do_completed,
          } = cell.row.original;
          // console.log("DO Planning Cell Data:", cell.row.original.do_validity);

          return (
            <div
              style={{
                ...centeredCellStyle,
                alignItems: "flex-start",
                textAlign: "left",
              }}
            >
              {/* Commented out DoPlanningToggle component */}
              <DoPlanningToggle
                do_planning_date={do_planning_date}
                doPlanning={doPlanning}
                // do_planning_history={do_planning_history}
                cell={cell}
                row={cell.row}
              />

              {/* New DO Planning Display */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  width: "100%",
                  padding: "8px",
                }}
              >
                {/* DO Copies Documents */}

                {/* DO Validated */}
                {/* DO Validated */}
                <div>
                  <strong>DO Validity:</strong>
                  <span
                    style={{
                      marginLeft: "8px",
                      color: do_validity ? "#1a8917" : "#999",
                      fontSize: "0.9em",
                    }}
                  >
                    {do_validity ? formatDate(do_validity) : "Not validated"}
                  </span>
                </div>
                {/* DO Completed Date */}
                <div>
                  <strong>DO Completed Date:</strong>
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "0.9em",
                      color: do_completed ? "#1a8917" : "#999",
                    }}
                  >
                    {do_completed ? formatDate(do_completed) : "Pending"}
                  </span>
                </div>
                <div>
                  <strong>DO Copies:</strong>
                  {Array.isArray(do_copies) && do_copies.length > 0 ? (
                    <div style={{ marginTop: "4px" }}>
                      {do_copies.map((url, index) => (
                        <div key={index}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#007bff",
                              textDecoration: "underline",
                            }}
                          >
                            DO Copy {index + 1}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginBottom: "5px" }}>
                      <span style={{ color: "gray" }}> No DO copies </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },

      // {
      //   // Group 9: Delivery Planning
      //   accessorKey: "delivery_planning",
      //   header: "Delivery Planning",
      //   Header: () => (
      //     <div className="flex flex-col items-center justify-center text-center w-full">
      //       <span>Delivery</span>
      //       <span>Planning</span>
      //     </div>
      //   ),
      //   size: 200,
      //   Cell: ({ cell }) => {
      //     const { examinationPlanning } = cell.row.original;

      //     return (
      //       <div style={centeredCellStyle}>
      //         <span>{examinationPlanning ? "Planned" : "Not Planned"}</span>
      //       </div>
      //     );
      //   },
      // },

      // {
      //   accessorKey: "delivery_address",
      //   header: "Delivery Address",
      //   size: 320,
      //   Cell: ({ cell }) => (
      //     <div
      //       style={{
      //         ...centeredCellStyle,
      //         justifyContent: "center",
      //       }}
      //     >
      //       <EditableDeliveryAddressCell cell={cell} isCentered={true} />
      //     </div>
      //   ),
      // },

      {
        accessorKey: "reason_for_delay",
        header: "Reason for Delay",
        size: 220,
        Cell: ({ cell }) => {
          const val =
            cell.row.original.reason_for_delay ||
            cell.row.original.reasonForDelay ||
            cell.row.original.delay_reason ||
            cell.row.original.delayReason ||
            cell.row.original.reason_of_delay;

          return (
            <div style={{ textAlign: "center", padding: "4px" }}>
              <span style={{ color: val ? "#b91c1c" : "#6b7280", fontWeight: val ? "600" : "normal" }}>
                {val || "N/A"}
              </span>
            </div>
          );
        },
      },
    ],

    [
      centeredCellStyle,
      formatDate,
      handleCopy,
      handleContainerClick,
      containerModalOpen,
      handleModalClose,
      selectedContainer,
      onEwayBillSuccess,
      clientQueriesStatus,
      handleRedClick,
      handleYellowClick,
      handleResolveOpenQuery,
      handleOpenQueryChat,
    ],
  );

  const renderQueryModals = useCallback(() => {
    const activeQuery = queryChatData[activeQueryIndex];

    const chatMessages = [];
    if (activeQuery) {
      chatMessages.push({
        id: "original",
        senderName: activeQuery.client_name || "Client",
        message: activeQuery.message,
        subject: activeQuery.subject,
        createdAt: activeQuery.createdAt,
        align: "left",
        attachments: activeQuery.attachments || [],
        senderType: "client",
      });

      if (activeQuery.replies) {
        activeQuery.replies.forEach((r, ri) => {
          chatMessages.push({
            id: r._id || `reply-${ri}`,
            senderName: r.repliedBy,
            message: r.message,
            createdAt: r.repliedAt,
            align: r.senderType === "client" ? "left" : "right",
            attachments: r.attachments || [],
            senderType: r.senderType || "admin",
          });
        });
      }
    }

    const formatChatTime = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    };

    return (
      <>
        {/* Client Query Chat Dialog */}
        <Dialog
          open={queryChatOpen}
          onClose={() => {
            setQueryChatOpen(false);
            setQueryChatJob(null);
            setQueryChatData([]);
            setQueryChatReply("");
            setChatAttachments([]);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden" } }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 1.5,
              px: 3,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#fff",
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Queries &amp; Replies
              </Typography>
              {queryChatJob?.job_no && (
                <Typography variant="caption" sx={{ opacity: 0.9, display: "block", mt: 0.2 }}>
                  Job: {queryChatJob.job_no}
                </Typography>
              )}
            </Box>
            <IconButton
              onClick={() => {
                setQueryChatOpen(false);
                setQueryChatJob(null);
                setQueryChatData([]);
                setQueryChatReply("");
                setChatAttachments([]);
              }}
              size="small"
              sx={{ color: "#fff" }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </DialogTitle>

          {/* Multiple Queries Tabs */}
          {queryChatData.length > 1 && (
            <div style={{ display: "flex", gap: "8px", padding: "8px 12px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb", overflowX: "auto", whiteSpace: "nowrap" }}>
              {queryChatData.map((q, idx) => (
                <button
                  key={q._id || idx}
                  onClick={() => setActiveQueryIndex(idx)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "16px",
                    border: "1px solid",
                    borderColor: activeQueryIndex === idx ? "#2563eb" : "#d1d5db",
                    backgroundColor: activeQueryIndex === idx ? "#eff6ff" : "#fff",
                    color: activeQueryIndex === idx ? "#2563eb" : "#374151",
                    fontWeight: "600",
                    fontSize: "11px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  Query #{idx + 1} ({q.status?.toUpperCase()})
                </button>
              ))}
            </div>
          )}

          <DialogContent sx={{ p: 2, bgcolor: "#efeae2", minHeight: "320px", maxHeight: "420px", display: "flex", flexDirection: "column" }}>
            {queryChatLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : !activeQuery ? (
              <Typography sx={{ textTransform: "none", textAlign: "center", color: "#6b7280", py: 4 }}>
                No queries found.
              </Typography>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: msg.align === "right" ? "flex-end" : "flex-start",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: msg.align === "right" ? "#d9fdd3" : "#ffffff",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        maxWidth: "82%",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "2px" }}>
                        {msg.senderName}
                      </div>
                      <div style={{ fontSize: "13px", color: "#1f2937", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {msg.message}
                      </div>

                      {/* Render File Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {msg.attachments.map((att, attIdx) => (
                            <a
                              key={attIdx}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 8px",
                                backgroundColor: "#e0f2fe",
                                border: "1px solid #7dd3fc",
                                borderRadius: "6px",
                                color: "#0369a1",
                                fontSize: "11px",
                                fontWeight: "600",
                                textDecoration: "none",
                              }}
                            >
                              <InsertDriveFileIcon style={{ fontSize: "14px" }} />
                              {att.fileName || "View Attachment"}
                            </a>
                          ))}
                        </div>
                      )}

                      <div style={{ fontSize: "10px", color: "#94a3b8", textAlign: "right", marginTop: "4px" }}>
                        {formatChatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Input & Reply Bar */}
            {activeQuery && activeQuery.status === "open" ? (
              <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #cbd5e1" }}>
                {/* Uploaded Attachments preview pill */}
                {chatAttachments.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
                    {chatAttachments.map((att, idx) => (
                      <Chip
                        key={idx}
                        size="small"
                        label={att.fileName}
                        onDelete={() => setChatAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </div>
                )}

                <ChatReplyInputSection
                  onSendReply={handleSendReply}
                  sending={queryChatSending}
                  uploadingAttachment={uploadingAttachment}
                  attachments={chatAttachments}
                  onFileUpload={(e) => handleFileUpload(e, false)}
                  onDeleteAttachment={(idx) => setChatAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  fileInputRef={fileInputRef}
                  activeQueryId={activeQuery._id}
                />
              </div>
            ) : (
              <div style={{ marginTop: "12px", padding: "8px", backgroundColor: "#dcfce7", color: "#15803d", borderRadius: "8px", textAlign: "center", fontWeight: "700", fontSize: "12px" }}>
                This query has been marked as RESOLVED.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Raise Query Dialog */}
        <Dialog
          open={raiseQueryOpen}
          onClose={() => setRaiseQueryOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "12px" } }}
        >
          {raiseQueryOpen && (
            <RaiseQueryDialogContent
              job={raiseQueryJob}
              onSubmit={handleRaiseQuerySubmit}
              onClose={() => setRaiseQueryOpen(false)}
              sending={raiseQuerySending}
              uploadingAttachment={uploadingAttachment}
              attachments={raiseQueryAttachments}
              onFileUpload={(e) => handleFileUpload(e, true)}
              onDeleteAttachment={(idx) => setRaiseQueryAttachments((prev) => prev.filter((_, i) => i !== idx))}
              fileInputRef={raiseFileInputRef}
            />
          )}
        </Dialog>

        {/* Global Query Snackbar */}
        <Snackbar
          open={querySnackbar.open}
          autoHideDuration={4000}
          onClose={() => setQuerySnackbar((prev) => ({ ...prev, open: false }))}
        >
          <Alert severity={querySnackbar.severity} sx={{ width: "100%", borderRadius: 2 }}>
            {querySnackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }, [
    queryChatOpen,
    queryChatData,
    queryChatJob,
    queryChatLoading,
    queryChatReply,
    queryChatSending,
    activeQueryIndex,
    chatAttachments,
    uploadingAttachment,
    raiseQueryOpen,
    raiseQueryJob,
    raiseQueryMessage,
    raiseQuerySending,
    raiseQueryAttachments,
    querySnackbar,
    handleFileUpload,
    handleSendReply,
    handleRaiseQuerySubmit,
  ]);

  return {
    columns,
    containerModalOpen,
    handleModalClose,
    selectedContainer,
    selectedJob,
    modalInitialTab,
    renderQueryModals,
    fetchQueryStatusForJobs,
    sortJobsByQueryPriority,
    clientQueriesStatus,
  };
}

export default useCustomerJobList;
