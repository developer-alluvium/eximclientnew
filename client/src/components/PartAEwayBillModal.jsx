import React, { useState, useEffect } from "react";
import {
  Modal,
  Descriptions,
  Alert,
  Spin,
  Button,
  Space,
  Typography,
  Divider,
} from "antd";
import { LoadingOutlined, DownloadOutlined } from "@ant-design/icons";
import { fetchEwayBillDetails } from "../utils/axiosConfig";

const { Title, Text } = Typography;

const PartAEwayBillModal = ({ open, onClose, ewbNumber, beNumber }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ewbData, setEwbData] = useState(null);

  useEffect(() => {
    if (open && ewbNumber) {
      fetchEWBDetails();
    }
  }, [open, ewbNumber]);

  const fetchEWBDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEwayBillDetails(ewbNumber);
      setEwbData(data);
    } catch (err) {
      console.error("Error fetching E-Way Bill details:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch E-Way Bill details"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEwbData(null);
    setError(null);
    onClose();
  };

  const handleDownload = () => {
    // Placeholder for PDF download functionality
    console.log("Download E-Way Bill PDF:", ewbNumber);
    // TODO: Implement PDF download when backend API is ready
  };

  return (
    <Modal
      title={
        <div>
          <Title level={4} style={{ marginBottom: 0 }}>
            E-Way Bill Details (Part-A)
          </Title>
          <Text type="secondary" style={{ fontSize: "0.85rem" }}>
            EWB No: {ewbNumber} | BE No: {beNumber}
          </Text>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose}>Close</Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!ewbData}
          >
            Download PDF
          </Button>
        </Space>
      }
      width={800}
      bodyStyle={{ maxHeight: "70vh", overflowY: "auto" }}
      destroyOnClose
    >
      <Spin spinning={loading} indicator={<LoadingOutlined />}>
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: "16px" }}
          />
        )}

        {ewbData && (
          <div>
            <Alert
              message="Part-A Only"
              description="This E-Way Bill contains only Part-A (basic shipment details). Vehicle information (Part-B) can be added separately."
              type="info"
              showIcon
              style={{ marginBottom: "16px" }}
            />

            {/* EWB Header */}
            <Descriptions
              column={2}
              bordered
              size="small"
              style={{ marginBottom: "16px" }}
            >
              <Descriptions.Item label="EWB Number">
                <strong>{ewbData.ewb_number || ewbData.ewbNo}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <span style={{ color: "green" }}>
                  {ewbData.status || "DIS"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Created Date">
                {ewbData.created_date || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Validity">
                {ewbData.validity || "N/A"}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* Consignor Details */}
            <Title level={5}>Consignor Details</Title>
            <Descriptions column={2} size="small" style={{ marginBottom: "16px" }}>
              <Descriptions.Item label="GSTIN">
                {ewbData.consignor_gstin}
              </Descriptions.Item>
              <Descriptions.Item label="Name">
                {ewbData.consignor_name}
              </Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>
                {ewbData.consignor_address}
              </Descriptions.Item>
              <Descriptions.Item label="State">
                {ewbData.consignor_state}
              </Descriptions.Item>
              <Descriptions.Item label="Pincode">
                {ewbData.consignor_pincode}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* Consignee Details */}
            <Title level={5}>Consignee Details</Title>
            <Descriptions column={2} size="small" style={{ marginBottom: "16px" }}>
              <Descriptions.Item label="GSTIN">
                {ewbData.consignee_gstin}
              </Descriptions.Item>
              <Descriptions.Item label="Name">
                {ewbData.consignee_name}
              </Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>
                {ewbData.consignee_address}
              </Descriptions.Item>
              <Descriptions.Item label="State">
                {ewbData.consignee_state}
              </Descriptions.Item>
              <Descriptions.Item label="Pincode">
                {ewbData.consignee_pincode}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* Invoice & Goods Details */}
            <Title level={5}>Invoice & Goods Details</Title>
            <Descriptions column={2} size="small" style={{ marginBottom: "16px" }}>
              <Descriptions.Item label="Invoice Number">
                {ewbData.invoice_number}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Date">
                {ewbData.invoice_date}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Value">
                ₹ {ewbData.invoice_value}
              </Descriptions.Item>
              <Descriptions.Item label="HSN Code">
                {ewbData.hsn}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {ewbData.description}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* Logistics Details */}
            <Title level={5}>Logistics Details</Title>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Distance (km)">
                {ewbData.distance}
              </Descriptions.Item>
              <Descriptions.Item label="Transporter">
                {ewbData.transporter_name}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default PartAEwayBillModal;
