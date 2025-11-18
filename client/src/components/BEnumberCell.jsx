import React, { useCallback, useMemo, useState, useEffect } from "react";
import FileUpload from "../utils/FileUpload";
import { FaUpload } from "react-icons/fa";
import axios from "axios";
import { getJsonCookie } from "../utils/cookies";
import { IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import BEStatusModal from "../customHooks/BeStatus"; // Import the modal component

const BENumberCell = ({ cell, onDocumentsUpdated, module, copyFn }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBE, setSelectedBE] = useState(null);
  const [activeUpload, setActiveUpload] = useState(null);
  const [processedBeFiles, setProcessedBeFiles] = useState(
    cell.row.original.processed_be_attachment || []
  );
  const [oocFiles, setOocFiles] = useState(cell.row.original.ooc_copies || []);
  const [gatePassFiles, setGatePassFiles] = useState(
    cell.row.original.gate_pass_copies || []
  );

  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`; // Format as YYYYMMDD for API
  }, []);

  const formatDateDisplay = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`; // Format as YYYY/MM/DD for display
  }, []);

  const getCustomHouseLocation = useMemo(
    () => (customHouse) => {
      const houseMap = {
        "ICD SACHANA": "INJKA6",
        "ICD SANAND": "INSAU6",
        "ICD KHODIYAR": "INSBI6",
      };
      return houseMap[customHouse] || customHouse;
    },
    []
  );

  // Sync BE Attachments
  useEffect(() => {
    setProcessedBeFiles(cell.row.original.processed_be_attachment || []);
  }, [cell.row.original.processed_be_attachment]);

  // Sync OOC Copies
  useEffect(() => {
    setOocFiles(cell.row.original.ooc_copies || []);
  }, [cell.row.original.ooc_copies]);

  // Sync Gate Pass Copies
  useEffect(() => {
    setGatePassFiles(cell.row.original.gate_pass_copies || []);
  }, [cell.row.original.gate_pass_copies]);

  const beNumber = cell?.getValue()?.toString();
  const rawBeDate = cell.row.original.be_date;
  const customHouse = cell.row.original.custom_house;
  const beDate = formatDateDisplay(rawBeDate); // For display
  const beDateForAPI = formatDate(rawBeDate); // For API (YYYYMMDD)
  const location = getCustomHouseLocation(customHouse);
  const rowId = cell.row.original._id || cell.row.id;

  // Handle BE number click to open modal
  const handleBEClick = (event) => {
    event.preventDefault();
    setSelectedBE({
      beNo: beNumber,
      beDt: beDateForAPI, // Use YYYYMMDD format
      location: location,
    });
    setModalOpen(true);
  };

  // Handle copy function
  const handleCopy = (event, text) => {
    event.stopPropagation();
    navigator.clipboard.writeText(text);
    // You can add a toast notification here if needed
    console.log(`Copied: ${text}`);
  };

  // Handle file uploads for different document types
  const handleFilesUploaded = async (newFiles, fieldName) => {
    let updatedFiles;

    // Determine which state to update based on the field
    if (fieldName === "processed_be_attachment") {
      updatedFiles = [...processedBeFiles, ...newFiles];
      setProcessedBeFiles(updatedFiles);
    } else if (fieldName === "ooc_copies") {
      updatedFiles = [...oocFiles, ...newFiles];
      setOocFiles(updatedFiles);
    } else if (fieldName === "gate_pass_copies") {
      updatedFiles = [...gatePassFiles, ...newFiles];
      setGatePassFiles(updatedFiles);
    }

    // Update the database with the complete array
    try {
      // Get user info from cookies for audit trail
      const user = getJsonCookie("exim_user") || {};
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };

      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/jobs/${rowId}`,
        {
          [fieldName]: updatedFiles,
        },
        { headers }
      );

      // Call parent component's update function if available
      if (onDocumentsUpdated) {
        onDocumentsUpdated(rowId, fieldName, updatedFiles);
      }
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      // You might want to show an error message to the user
    }

    // Close the upload popup
    setActiveUpload(null);
  };

  // Component to render the upload button and popup
  const renderUploadButton = (fieldName, title) => {
    const isActive = activeUpload === fieldName;

    return (
      <div
        style={{
          position: "relative",
          display: "inline-block",
          marginLeft: "10px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveUpload(isActive ? null : fieldName)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0",
            color: "#0066cc",
          }}
          title={`Upload ${title}`}
        >
          <FaUpload size={14} />
        </button>

        {isActive && (
          <div
            style={{
              position: "absolute",
              top: "-80px",
              right: 0,
              zIndex: 9999,
              width: "120px",
              padding: "5px",
              background: "#fff",
              boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
              borderRadius: "4px",
            }}
          >
            <FileUpload
              label={`Upload ${title}`}
              bucketPath={fieldName}
              onFilesUploaded={(newFiles) =>
                handleFilesUploaded(newFiles, fieldName)
              }
              multiple={fieldName !== "processed_be_attachment"}
              style={{ transform: "scale(0.8)", transformOrigin: "top right" }}
            />
            <button
              type="button"
              onClick={() => setActiveUpload(null)}
              style={{
                marginTop: "5px",
                padding: "2px 6px",
                background: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "10px",
                width: "auto",
                display: "block",
                marginLeft: "auto",
                marginRight: "0",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render document links with proper indexing
  const renderDocumentLinks = (documents, baseLabel) => {
    if (!documents || documents.length === 0) {
      return <span style={{ color: "gray" }}>No {baseLabel}</span>;
    }

    return (
      <>
        {documents.map((doc, index) => (
          <a
            key={index}
            href={doc}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "blue",
              textDecoration: "underline",
              cursor: "pointer",
              display: "block",
              marginTop: index === 0 ? 0 : "3px",
            }}
          >
            {baseLabel} {index + 1}
          </a>
        ))}
      </>
    );
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
        }}
      >
        {beNumber && (
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <a
                href="#"
                onClick={handleBEClick}
                style={{
                  display: "block",
                  fontWeight: "bold",
                  marginBottom: "5px",
                  color: "#0066cc",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                {beNumber}
              </a>
              {/* Copy BE Number */}
              <IconButton
                size="small"
                onClick={(event) => copyFn(event, beNumber)}
              >
                <abbr title="Copy BE Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <span>{beDate}</span>
          </div>
        )}

        {/* Processed Copy of BOE */}
        <div
          style={{ marginTop: "10px", display: "flex", alignItems: "center" }}
        >
          <div style={{ flex: 1 }}>
            {renderDocumentLinks(processedBeFiles, "Processed Copy of BOE")}
          </div>
          {renderUploadButton("processed_be_attachment", "BE Copy")}
        </div>

        {/* OOC Copies */}
        {module !== "list" && (
          <>
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                {renderDocumentLinks(oocFiles, "OOC Copy")}
              </div>
              {renderUploadButton("ooc_copies", "OOC Copy")}
            </div>

            {/* Gate Pass Copies */}
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                {renderDocumentLinks(gatePassFiles, "Gate Pass")}
              </div>
              {renderUploadButton("gate_pass_copies", "Gate Pass")}
            </div>
          </>
        )}
      </div>

      {/* BE Status Modal */}
      <BEStatusModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        beNo={selectedBE?.beNo}
        beDt={selectedBE?.beDt}
        location={selectedBE?.location}
      />
    </>
  );
};

export default BENumberCell;
