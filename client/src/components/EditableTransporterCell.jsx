import { useState, useEffect, useRef } from "react";
import { Tooltip } from "@mui/material";
import axios from "axios";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

const spinnerKeyframes = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = spinnerKeyframes;
  document.head.appendChild(style);
}

const EditableTransporterCell = ({ cell }) => {
  const { _id, container_nos = [] } = cell.row.original;

  const [containers, setContainers] = useState([...container_nos]);
  const [editable, setEditable] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState("");
  const inputRefs = useRef({});

  useEffect(() => {
    setContainers([...container_nos]);

    if (cell.targetContainerNumber) {
      const index = container_nos.findIndex(
        (c) => c.container_number === cell.targetContainerNumber
      );
      if (index !== -1 && !container_nos[index].transporter) {
        setEditable(index);
        setTempValue("");
      } else {
        setEditable(null);
        setTempValue("");
      }
    } else if (container_nos.length === 1 && !container_nos[0].transporter) {
      setEditable(0);
      setTempValue("");
    } else {
      setEditable(null);
      setTempValue("");
    }
    setError("");
  }, [cell.row.original, cell.targetContainerNumber]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editable !== null && inputRefs.current[editable]) {
      inputRefs.current[editable].focus();
    }
  }, [editable]);

  const handleEditStart = (index) => {
    setEditable(index);
    setTempValue(containers[index]?.transporter || "");
    setError("");
  };

  const handleCancel = () => {
    setEditable(null);
    setTempValue("");
    setError("");
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopySuccess("Copied!");
      setTimeout(() => setCopySuccess(""), 2000);
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleSubmit = (index) => {
    if (!tempValue || tempValue.trim() === "") {
      setError("Transporter name cannot be empty");
      return;
    }

    if (!_id) {
      setError("Cannot update: Job ID is missing");
      return;
    }

    setIsLoading(true);

    const updatedContainers = containers.map((c, i) =>
      i === index
        ? { ...c, transporter: tempValue, transporter_assigned_date: new Date().toISOString() }
        : c
    );

    axios
      .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
        container_nos: updatedContainers,
      })
      .then(() => {
        setContainers(updatedContainers);
        setEditable(null);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(`Failed to update: ${err.response?.status || "Network error"}`);
        setIsLoading(false);
      });
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") handleSubmit(index);
    else if (e.key === "Escape") handleCancel();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
      {containers.map((container, idx) => {
        if (
          cell.targetContainerNumber &&
          container.container_number !== cell.targetContainerNumber
        )
          return null;

        const isEditing = editable === idx;
        const hasTransporter = !!container.transporter;

        return (
          <div
            key={idx}
            style={{
              border: "1px solid #e1e5e9",
              borderRadius: 8,
              padding: 20,
              backgroundColor: "#ffffff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            {/* Container number header */}
            <div
              style={{
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: "1px solid #f0f0f0",
                fontWeight: 600,
                fontSize: 16,
                color: "#1a202c",
                letterSpacing: "0.025em",
              }}
            >
              {container.container_number ||
                container.container_no ||
                `Container #${idx + 1}`}
            </div>

            {/* Transporter row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40 }}>
              <span
                style={{
                  fontSize: 14,
                  color: "#4a5568",
                  fontWeight: 500,
                  minWidth: 90,
                  flexShrink: 0,
                }}
              >
                Transporter:
              </span>

              {/* === INLINE FIELD === */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                {isEditing ? (
                  <>
                    {/* Inline input — sits exactly where the label/placeholder was */}
                    <input
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      value={tempValue}
                      onChange={(e) => {
                        setTempValue(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      placeholder="Enter transporter name"
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: `2px solid ${error ? "#e53e3e" : "#667eea"}`,
                        fontSize: 14,
                        outline: "none",
                        boxShadow: error
                          ? "0 0 0 3px rgba(229,62,62,0.1)"
                          : "0 0 0 3px rgba(102,126,234,0.1)",
                        fontFamily: "inherit",
                        transition: "border-color 0.15s",
                      }}
                    />

                    {/* Confirm */}
                    <Tooltip title="Save (Enter)">
                      <button
                        onClick={() => handleSubmit(idx)}
                        disabled={isLoading}
                        style={{
                          background: isLoading ? "#a0aec0" : "linear-gradient(135deg,#48bb78,#38a169)",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 8px",
                          cursor: isLoading ? "not-allowed" : "pointer",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isLoading ? (
                          <span
                            style={{
                              display: "inline-block",
                              width: 14,
                              height: 14,
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderRadius: "50%",
                              borderTopColor: "#fff",
                              animation: "spin 1s linear infinite",
                            }}
                          />
                        ) : (
                          <CheckIcon style={{ fontSize: 16 }} />
                        )}
                      </button>
                    </Tooltip>

                    {/* Cancel */}
                    <Tooltip title="Cancel (Esc)">
                      <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        style={{
                          background: "transparent",
                          border: "1px solid #e2e8f0",
                          borderRadius: 6,
                          padding: "6px 8px",
                          cursor: "pointer",
                          color: "#718096",
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <CloseIcon style={{ fontSize: 16 }} />
                      </button>
                    </Tooltip>
                  </>
                ) : hasTransporter ? (
                  <>
                    {/* Assigned transporter display */}
                    <span
                      style={{
                        fontSize: 14,
                        color: "#2d3748",
                        fontWeight: 500,
                        padding: "5px 10px",
                        backgroundColor: "#f7fafc",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {container.transporter}
                    </span>

                    <Tooltip title="Copy">
                      <button
                        onClick={() => handleCopy(container.transporter)}
                        style={{
                          background: "none",
                          border: "1px solid #e2e8f0",
                          cursor: "pointer",
                          padding: "5px 6px",
                          borderRadius: 6,
                          color: "#718096",
                          display: "flex",
                          alignItems: "center",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        <ContentCopyIcon style={{ fontSize: 15 }} />
                      </button>
                    </Tooltip>

                    {copySuccess && (
                      <span style={{ fontSize: 12, color: "#38a169", fontWeight: 500 }}>
                        {copySuccess}
                      </span>
                    )}

                    {container.transporter_assigned_date && (
                      <span
                        style={{
                          color: "#718096",
                          fontSize: 12,
                          fontStyle: "italic",
                          marginLeft: "auto",
                        }}
                      >
                        Assigned: {formatDate(container.transporter_assigned_date)}
                      </span>
                    )}

                    {/* Edit button */}
                    <Tooltip title="Edit transporter">
                      <button
                        onClick={() => handleEditStart(idx)}
                        style={{
                          background: "linear-gradient(135deg,#667eea,#764ba2)",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          padding: "6px 14px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        <EditIcon style={{ fontSize: 14 }} /> Edit
                      </button>
                    </Tooltip>
                  </>
                ) : (
                  <>
                    {/* No transporter yet — "No transporter assigned" label + Assign + Edit side by side */}
                    <span
                      style={{
                        color: "#a0aec0",
                        fontSize: 14,
                        fontStyle: "italic",
                        padding: "5px 10px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: 6,
                        border: "1px dashed #e2e8f0",
                        flex: 1,
                      }}
                    >
                      No transporter assigned
                    </span>

                    {/* Assign */}
                    <button
                      onClick={() => handleEditStart(idx)}
                      style={{
                        background: "linear-gradient(135deg,#667eea,#764ba2)",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        padding: "6px 14px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      Assign
                    </button>

                    {/* Edit (same action, alternate entry point) */}
                    <Tooltip title="Edit transporter">
                      <button
                        onClick={() => handleEditStart(idx)}
                        style={{
                          background: "transparent",
                          border: "1px solid #e2e8f0",
                          cursor: "pointer",
                          padding: "6px 10px",
                          borderRadius: 6,
                          color: "#718096",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 13,
                          flexShrink: 0,
                        }}
                      >
                        <EditIcon style={{ fontSize: 14 }} /> Edit
                      </button>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>

            {/* Inline error — shown beneath the row, never causes layout shift above */}
            {isEditing && error && (
              <div
                style={{
                  color: "#e53e3e",
                  fontSize: 12,
                  marginTop: 6,
                  paddingLeft: 102, // align under the input (past the "Transporter:" label)
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EditableTransporterCell;