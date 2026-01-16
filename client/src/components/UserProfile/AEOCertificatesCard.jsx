import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Tag,
  Modal,
  Input,
  Switch,
  InputNumber,
  Space,
  Typography,
  Empty,
  Tooltip,
} from "antd";
import {
  SafetyCertificateOutlined,
  BellOutlined,
  PlusCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

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
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusConfig = (status) => {
    if (status === "Valid") {
      return { color: "success", icon: <CheckCircleOutlined /> };
    } else if (status === "Expired") {
      return { color: "error", icon: <CloseCircleOutlined /> };
    }
    return { color: "warning", icon: <ExclamationCircleOutlined /> };
  };

  return (
    <>
      <Card
        style={{
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        }}
        title={
          <Space>
            <SafetyCertificateOutlined
              style={{ fontSize: 18, color: "#1e293b" }}
            />
            <span style={{ fontWeight: 600 }}>AEO Certificates</span>
          </Space>
        }
        extra={
          <Button
            icon={<BellOutlined />}
            onClick={() => setReminderSettingsOpen(true)}
            style={{ borderRadius: 8 }}
          >
            Reminders
          </Button>
        }
      >
        {kycSummary?.kyc_summaries?.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {kycSummary.kyc_summaries.map((kyc, index) => {
              const certificates = kyc.aeo_certificates || [];
              return (
                <Card
                  key={index}
                  size="small"
                  style={{
                    borderRadius: 12,
                    border: "1px solid #f0f0f0",
                    background: "#fafafa",
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  {/* Importer Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: certificates.length > 0 ? 12 : 0,
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        {kyc.importer_name}
                      </Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          IE: {kyc.ie_code_no}
                        </Text>
                      </div>
                    </div>
                    <Tooltip title="Add Certificate">
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusCircleOutlined />}
                        onClick={() => openAddCertificateDialog(kyc)}
                        style={{ borderRadius: 8 }}
                      />
                    </Tooltip>
                  </div>

                  {/* Certificates */}
                  {certificates.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 16,
                        background: "#fff7e6",
                        borderRadius: 8,
                        border: "1px solid #ffd591",
                      }}
                    >
                      <Text type="secondary">No AEO certificates linked.</Text>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {certificates.map((cert, idx) => {
                        const statusConfig = getStatusConfig(
                          cert.certificate_present_validity_status
                        );
                        const isExpired =
                          new Date(cert.certificate_validity_date) < new Date();

                        return (
                          <div
                            key={idx}
                            style={{
                              background: "#ffffff",
                              padding: 12,
                              borderRadius: 10,
                              border: "1px solid #e8e8e8",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <Text
                                strong
                                style={{
                                  fontSize: 13,
                                  fontFamily: "monospace",
                                }}
                              >
                                {cert.certificate_no}
                              </Text>
                              <Tag
                                color={statusConfig.color}
                                icon={statusConfig.icon}
                                style={{ margin: 0, borderRadius: 6 }}
                              >
                                {cert.certificate_present_validity_status}
                              </Tag>
                            </div>

                            <div style={{ display: "flex", gap: 24 }}>
                              <div>
                                <Text
                                  type="secondary"
                                  style={{ fontSize: 11, display: "block" }}
                                >
                                  Tier
                                </Text>
                                <Tag
                                  color="blue"
                                  style={{ margin: 0, borderRadius: 4 }}
                                >
                                  {cert.aeo_tier}
                                </Tag>
                              </div>
                              <div>
                                <Text
                                  type="secondary"
                                  style={{ fontSize: 11, display: "block" }}
                                >
                                  Expiry
                                </Text>
                                <Text
                                  strong
                                  style={{
                                    fontSize: 13,
                                    color: isExpired ? "#ff4d4f" : "#52c41a",
                                  }}
                                >
                                  <CalendarOutlined
                                    style={{ marginRight: 4 }}
                                  />
                                  {formatDate(cert.certificate_validity_date)}
                                </Text>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Empty
            description="No importer assignments found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* Add Certificate Modal */}
      <Modal
        open={updateCertificateOpen}
        onCancel={() => setUpdateCertificateOpen(false)}
        title="Add AEO Certificate"
        footer={[
          <Button key="cancel" onClick={() => setUpdateCertificateOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={updateLoading}
            disabled={!newCertificateNumber}
            onClick={handleUpdateCertificateNumber}
          >
            Verify & Add
          </Button>,
        ]}
        styles={{ body: { paddingTop: 20 } }}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div>
            <Text type="secondary">Importer: </Text>
            <Text strong>{selectedImporterForUpdate?.importer_name}</Text>
          </div>
          <div>
            <Text type="secondary">IE Code: </Text>
            <Text strong>{selectedImporterForUpdate?.ie_code_no}</Text>
          </div>
          <div>
            <Text style={{ display: "block", marginBottom: 8 }}>
              Certificate Number
            </Text>
            <Input
              value={newCertificateNumber}
              onChange={(e) => setNewCertificateNumber(e.target.value)}
              placeholder="e.g., AEO-T1-..."
              style={{ borderRadius: 8 }}
            />
          </div>
        </Space>
      </Modal>

      {/* Reminder Settings Modal */}
      <Modal
        open={reminderSettingsOpen}
        onCancel={() => setReminderSettingsOpen(false)}
        title="Reminder Settings"
        footer={[
          <Button key="cancel" onClick={() => setReminderSettingsOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSaveReminderSettings}
          >
            Save Settings
          </Button>,
        ]}
        styles={{ body: { paddingTop: 20 } }}
      >
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch checked={reminderEnabled} onChange={setReminderEnabled} />
            <Text strong>Enable Email Reminders</Text>
          </div>

          {reminderEnabled && (
            <div>
              <Text style={{ display: "block", marginBottom: 8 }}>
                Days before expiry to notify
              </Text>
              <InputNumber
                value={reminderDays}
                onChange={(val) => setReminderDays(Math.max(1, val || 0))}
                min={1}
                max={365}
                style={{ width: "100%", borderRadius: 8 }}
              />
              <Text
                type="secondary"
                style={{ fontSize: 12, marginTop: 8, display: "block" }}
              >
                You will receive an email notification for any certificate
                expiring within {reminderDays} days.
              </Text>
            </div>
          )}
        </Space>
      </Modal>
    </>
  );
};

export default AEOCertificatesCard;
