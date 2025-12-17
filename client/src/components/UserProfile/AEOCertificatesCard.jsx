import React, { useState, useEffect } from "react";
import {
  Business,
  AddCircle,
  Notifications,
  Settings,
  Close,
  CheckCircle,
  Warning,
} from "@mui/icons-material";
import axios from "axios";

// Simple Custom Modal Component
const CustomModal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          padding: "24px",
          borderRadius: "12px",
          width: "90%",
          maxWidth: "500px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <Close />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const AEOCertificatesCard = ({
  user,
  kycSummary,
  onFetchKYCSummary,
  onSetError,
  onSetSuccess,
  onUpdateReminderSettings,
}) => {
  const [updateCertificateOpen, setUpdateCertificateOpen] = useState(false);
  const [selectedImporterForUpdate, setSelectedImporterForUpdate] =
    useState(null);
  const [newCertificateNumber, setNewCertificateNumber] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  // Reminder Settings State
  const [reminderSettingsOpen, setReminderSettingsOpen] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(90);

  useEffect(() => {
    if (user) {
      setReminderEnabled(user.aeo_reminder_enabled ?? true);
      setReminderDays(user.aeo_reminder_days ?? 90);
    }
  }, [user]);

  const handleUpdateCertificateNumber = async () => {
    if (!newCertificateNumber.trim() || !selectedImporterForUpdate) return;
    setUpdateLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/aeo/update-certificate-number`,
        {
          ieCode: selectedImporterForUpdate.ie_code_no,
          certificateNumber: newCertificateNumber.trim(),
          userId: user._id,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      await onFetchKYCSummary();
      onSetSuccess("Certificate added successfully!");
      setUpdateCertificateOpen(false);
      setNewCertificateNumber("");
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to add certificate";
      onSetError(errorMsg);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSaveReminderSettings = async () => {
    try {
      await onUpdateReminderSettings({
        reminder_enabled: reminderEnabled,
        reminder_days: reminderDays,
      });
      onSetSuccess("Reminder settings updated!");
      setReminderSettingsOpen(false);
    } catch (error) {
      onSetError("Failed to update reminder settings");
    }
  };

  const openAddCertificateDialog = (importerData) => {
    setSelectedImporterForUpdate(importerData);
    setNewCertificateNumber("");
    setUpdateCertificateOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusClass = (status) => {
    return status === "Valid"
      ? "valid"
      : status === "Expired"
      ? "expired"
      : "warning";
  };

  return (
    <div className="section-card">
      <div className="card-header">
        <h3>
          <Business className="icon" /> AEO Certificates
        </h3>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setReminderSettingsOpen(true)}
        >
          <Notifications style={{ fontSize: 16 }} /> Reminders
        </button>
      </div>

      <div className="card-content">
        {kycSummary?.kyc_summaries?.length > 0 ? (
          <div className="certificate-grid">
            {kycSummary.kyc_summaries.map((kyc, index) => {
              const certificates = kyc.aeo_certificates || [];
              return (
                <div key={index} className="certificate-item">
                  <div className="cert-header">
                    <div>
                      <div className="cert-title">{kyc.importer_name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748B" }}>
                        IE: {kyc.ie_code_no}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openAddCertificateDialog(kyc)}
                      style={{ padding: "4px 8px" }}
                      title="Add Certificate"
                    >
                      <AddCircle style={{ fontSize: 16 }} />
                    </button>
                  </div>

                  {certificates.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        background: "#FFF7ED",
                        borderRadius: "8px",
                        color: "#C2410C",
                        fontSize: "0.9rem",
                      }}
                    >
                      No AEO certificates linked.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {certificates.map((cert, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "#F8FAFC",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "8px",
                            }}
                          >
                            <span
                              style={{ fontWeight: 600, fontSize: "0.9rem" }}
                            >
                              {cert.certificate_no}
                            </span>
                            <span
                              className={`cert-badge ${getStatusClass(
                                cert.certificate_present_validity_status
                              )}`}
                            >
                              {cert.certificate_present_validity_status}
                            </span>
                          </div>
                          <div className="cert-details">
                            <div className="detail">
                              <span className="label">Tier</span>
                              <span className="value">{cert.aeo_tier}</span>
                            </div>
                            <div className="detail">
                              <span className="label">Expiry</span>
                              <span
                                className="value"
                                style={{
                                  color:
                                    new Date(cert.certificate_validity_date) <
                                    new Date()
                                      ? "#EF4444"
                                      : "#16A34A",
                                }}
                              >
                                {formatDate(cert.certificate_validity_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{ textAlign: "center", padding: "2rem", color: "#64748B" }}
          >
            No importer assignments found.
          </div>
        )}
      </div>

      {/* Add Certificate Modal */}
      <CustomModal
        isOpen={updateCertificateOpen}
        onClose={() => setUpdateCertificateOpen(false)}
        title="Add AEO Certificate"
      >
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "0.9rem",
              color: "#64748B",
              marginBottom: "4px",
            }}
          >
            Importer:{" "}
            <strong>{selectedImporterForUpdate?.importer_name}</strong>
          </div>
          <div style={{ fontSize: "0.9rem", color: "#64748B" }}>
            IE Code: <strong>{selectedImporterForUpdate?.ie_code_no}</strong>
          </div>
        </div>
        <div className="form-group">
          <label>Certificate Number</label>
          <input
            type="text"
            value={newCertificateNumber}
            onChange={(e) => setNewCertificateNumber(e.target.value)}
            placeholder="e.g., AEO-T1-..."
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
            marginTop: "24px",
          }}
        >
          <button
            className="btn btn-outline"
            onClick={() => setUpdateCertificateOpen(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpdateCertificateNumber}
            disabled={updateLoading || !newCertificateNumber}
          >
            {updateLoading ? "Verifying..." : "Verify & Add"}
          </button>
        </div>
      </CustomModal>

      {/* Reminder Settings Modal */}
      <CustomModal
        isOpen={reminderSettingsOpen}
        onClose={() => setReminderSettingsOpen(false)}
        title="Reminder Settings"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
            gap: "10px",
          }}
        >
          <input
            type="checkbox"
            id="reminderEnabled"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            style={{ width: "20px", height: "20px" }}
          />
          <label
            htmlFor="reminderEnabled"
            style={{ margin: 0, fontSize: "1rem", fontWeight: 500 }}
          >
            Enable Email Reminders
          </label>
        </div>

        {reminderEnabled && (
          <div className="form-group">
            <label>Days before expiry to notify</label>
            <input
              type="number"
              value={reminderDays}
              onChange={(e) =>
                setReminderDays(Math.max(1, parseInt(e.target.value) || 0))
              }
              min="1"
              max="365"
            />
            <div
              style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "8px" }}
            >
              You will receive an email notification for any certificate
              expiring within {reminderDays} days.
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
            marginTop: "24px",
          }}
        >
          <button
            className="btn btn-outline"
            onClick={() => setReminderSettingsOpen(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveReminderSettings}
          >
            Save Settings
          </button>
        </div>
      </CustomModal>
    </div>
  );
};

export default AEOCertificatesCard;
