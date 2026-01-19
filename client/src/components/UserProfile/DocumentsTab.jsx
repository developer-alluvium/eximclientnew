import React, { useState } from "react";
import {
  Search,
  Add,
  Visibility,
  Download,
  Delete,
  Close,
} from "@mui/icons-material";
import FileUpload from "../../utils/FileUpload";
import { getCookie } from "../../utils/cookies";

import "../../styles/UserProfile.scss";

// Simple Modal (updated with premium styles)
const CustomModal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="custom-modal-overlay">
      <div className="custom-modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>
            <Close />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

const DocumentsTab = ({ user, onRefreshProfile, onSetError, onSetSuccess }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [reminderDays, setReminderDays] = useState(30);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilExpiration = (expirationDate) => {
    if (!expirationDate) return null;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationBadge = (expirationDate) => {
    const daysUntil = getDaysUntilExpiration(expirationDate);
    if (daysUntil === null)
      return <span className="badge badge-outline">No Expiry</span>;

    let className = "badge-success";
    let label = `${daysUntil} days left`; // Using days left as clearer status

    if (daysUntil < 0) {
      className = "badge-error";
      label = `Expired`;
    } else if (daysUntil <= 30) {
      className = "badge-warning";
      label = `Expires in ${daysUntil} days`;
    }

    // We'll use inline styles for badges here or assume global pill classes were added to SCSS
    // or just use inline styles for simplicity since I missed defining .badge in SCSS explicitly (only .cert-badge)
    // I'll use inline styles to match the SCSS variables I know.
    const styles = {
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "0.75rem",
      fontWeight: 600,
      backgroundColor:
        daysUntil < 0 ? "#fee2e2" : daysUntil <= 30 ? "#ffedd5" : "#dcfce7",
      color:
        daysUntil < 0 ? "#ef4444" : daysUntil <= 30 ? "#F97316" : "#16A34A",
    };

    return <span style={styles}>{label}</span>;
  };

  const handleAddDocument = async () => {
    if (!documentTitle || uploadedFiles.length === 0) {
      onSetError("Please provide a title and upload a document");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/user/profile/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCookie("access_token")}`,
          },
          body: JSON.stringify({
            title: documentTitle,
            url: uploadedFiles[0].url,
            expirationDate: expirationDate || null,
            reminderDays: reminderDays,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        onSetSuccess("Document added successfully");
        setAddDocumentOpen(false);
        setDocumentTitle("");
        setUploadedFiles([]);
        setExpirationDate("");
        setReminderDays(30);
        onRefreshProfile();
      } else {
        onSetError(data.message);
      }
    } catch (error) {
      console.error("Error adding document:", error);
      onSetError("Failed to add document");
    }
  };

  const handleViewDocument = (url) => {
    if (!url) {
      onSetError("Document URL not available");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadDocument = async (url, title) => {
    if (!url) {
      onSetError("Document URL not available");
      return;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = title || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      onSetSuccess("Document downloaded successfully");
    } catch (error) {
      console.error("Error downloading document:", error);
      onSetError("Failed to download document");
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/user/profile/documents/${documentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getCookie("access_token")}`,
          },
        },
      );

      const data = await response.json();
      if (data.success) {
        onSetSuccess("Document deleted successfully");
        onRefreshProfile();
      } else {
        onSetError(data.message);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      onSetError("Failed to delete document");
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ position: "relative", width: "300px" }}>
          <Search
            style={{
              position: "absolute",
              left: "10px",
              top: "10px",
              color: "#94a3b8",
              fontSize: 20,
            }}
          />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 10px 10px 36px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "0.9rem",
            }}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setAddDocumentOpen(true)}
        >
          <Add style={{ fontSize: 18 }} /> Add Document
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Document Name</th>
              <th>Upload Date</th>
              <th>Expiration</th>
              <th>Status</th>
              <th>Reminder</th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {user?.documents?.length > 0 ? (
              user.documents
                .filter((doc) =>
                  doc.title.toLowerCase().includes(searchTerm.toLowerCase()),
                )
                .map((doc) => (
                  <tr key={doc._id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            background: "#e0e7ff",
                            color: "#4338ca",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                          }}
                        >
                          {doc.title.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{doc.title}</span>
                      </div>
                    </td>
                    <td>{formatDate(doc.uploadDate)}</td>
                    <td>{formatDate(doc.expirationDate)}</td>
                    <td>{getExpirationBadge(doc.expirationDate)}</td>
                    <td>
                      {doc.reminderDays ? `${doc.reminderDays} days` : "-"}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          className="btn btn-sm"
                          onClick={() => handleViewDocument(doc.url)}
                          title="View"
                          style={{ color: "#0ea5e9", background: "#e0f2fe" }}
                        >
                          <Visibility style={{ fontSize: 18 }} />
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            handleDownloadDocument(doc.url, doc.title)
                          }
                          title="Download"
                          style={{ color: "#16a34a", background: "#dcfce7" }}
                        >
                          <Download style={{ fontSize: 18 }} />
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleDeleteDocument(doc._id)}
                          title="Delete"
                          style={{ color: "#ef4444", background: "#fee2e2" }}
                        >
                          <Delete style={{ fontSize: 18 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#64748B",
                  }}
                >
                  No documents uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Document Modal */}
      <CustomModal
        isOpen={addDocumentOpen}
        onClose={() => setAddDocumentOpen(false)}
        title="Add New Document"
      >
        <div className="form-group">
          <label>Document Title*</label>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            placeholder="e.g. Passport"
          />
        </div>

        <div className="form-group">
          <label>Upload File</label>
          <FileUpload
            onFilesUploaded={setUploadedFiles}
            onFileDeleted={() => setUploadedFiles([])}
            bucketPath="user-documents"
            multiple={false}
            existingFiles={uploadedFiles}
            acceptedFileTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
            fullWidth={true}
            buttonSx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "10px",
              textTransform: "none",
              color: "#ffffff !important",
              fontWeight: 600,
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              },
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <div className="form-group">
            <label>Expiration Date (Optional)</label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Reminder</label>
            <select
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
            >
              <option value={7}>7 days before</option>
              <option value={15}>15 days before</option>
              <option value={30}>30 days before</option>
              <option value={60}>60 days before</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
            marginTop: "16px",
          }}
        >
          <button
            className="btn btn-outline"
            onClick={() => setAddDocumentOpen(false)}
          >
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleAddDocument}>
            Add Document
          </button>
        </div>
      </CustomModal>
    </div>
  );
};

export default DocumentsTab;
