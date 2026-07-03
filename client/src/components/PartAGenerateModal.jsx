import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Alert,
  Spin,
  Space,
  Typography,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import {
  validateEwayBillForm,
  validateGSTIN,
  validatePincode,
  validateInvoiceValue,
  validateHSN,
} from "../utils/ewbValidationHelpers";
import {
  fetchBoeExtract,
  fetchTransporters,
  fetchDistance,
  generateEwayBill,
} from "../utils/axiosConfig";

const { Title, Text } = Typography;

const PartAGenerateModal = ({ open, onClose, beNumber, beDate, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [boeLoading, setBoeLoading] = useState(false);
  const [transportersLoading, setTransportersLoading] = useState(false);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [transporters, setTransporters] = useState([]);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Format date to YYYY-MM-DD for BOE extraction API
  const formatDateForAPI = useCallback((date) => {
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    if (typeof date === "string" && /^\d{8}$/.test(date)) {
      return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    }
    if (typeof date === "string" && date.includes("/")) {
      const parts = date.split("/");
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
      if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return date;
  }, []);

  const extractPincode = useCallback((text) => {
    const match = String(text || "").match(/\b[1-9][0-9]{5}\b/);
    return match ? match[0] : "";
  }, []);

  const toNumber = useCallback((value) => {
    const parsed = parseFloat(String(value || "").replace(/,/g, ""));
    return Number.isNaN(parsed) ? undefined : parsed;
  }, []);

  const normalizeBoeExtract = useCallback((response) => {
    const boeData = response?.data || response || {};
    const dutySummary = boeData.DutySummary || {};
    const importerDetails = boeData.ImporterDetails || {};
    const invoiceDetails = boeData.InvoiceAndItemDetails || {};
    const firstItem = Array.isArray(invoiceDetails.ITEMS) ? invoiceDetails.ITEMS[0] || {} : {};
    const sourceJob = response?.source_job || {};
    const importerGstin = String(importerDetails["GSTIN/TYPE"] || "").split("/")[0];

    const buyerAddress = invoiceDetails.BUYER_NAME_ADDRESS || "";
    const supplierAddress = invoiceDetails.SUPPLIER_NAME_ADDRESS || "";
    const consigneePincode = extractPincode(buyerAddress);
    const consignorPincode = extractPincode(supplierAddress);
    const invoiceValue = toNumber(dutySummary["TOT.ASS VAL"] || firstItem.AMOUNT);

    return {
      consignor_gstin: response?.consignor_gstin || "URP",
      consignor_name: response?.consignor_name || supplierAddress,
      consignor_address: response?.consignor_address || supplierAddress,
      consignor_state: response?.consignor_state || "",
      consignor_pincode: response?.consignor_pincode || consignorPincode,
      consignee_gstin: response?.consignee_gstin || importerGstin,
      consignee_name: response?.consignee_name || buyerAddress,
      consignee_address: response?.consignee_address || buyerAddress,
      consignee_state: response?.consignee_state || "",
      consignee_pincode: response?.consignee_pincode || consigneePincode,
      invoice_value: response?.invoice_value || invoiceValue,
      invoice_number: response?.invoice_number || importerDetails["BE No"] || sourceJob.be_no || beNumber,
      invoice_date: response?.invoice_date || sourceJob.be_date || formatDateForAPI(importerDetails["BE Date"] || beDate),
      hsn: response?.hsn || firstItem.CTH || "",
      description: response?.description || response?.goods_description || firstItem.DESCRIPTION || "",
      pickup_pincode: response?.pickup_pincode || consignorPincode || consigneePincode,
      delivery_pincode: response?.delivery_pincode || consigneePincode,
    };
  }, [beDate, beNumber, extractPincode, formatDateForAPI, toNumber]);

  // Fetch BOE extract data on modal open
  useEffect(() => {
    if (open && beNumber && beDate) {
      fetchBOEData();
      fetchTransportersList();
    }
  }, [open, beNumber, beDate, normalizeBoeExtract]);

  const fetchBOEData = async () => {
    setBoeLoading(true);
    setError(null);
    try {
      const formattedDate = formatDateForAPI(beDate);
      const response = await fetchBoeExtract(beNumber, formattedDate);
      const data = normalizeBoeExtract(response);

      // Validate required fields from response
      const requiredFields = [
        "consignor_gstin",
        "consignor_name",
        "consignee_gstin",
        "consignee_name",
        "invoice_value",
        "hsn",
        "description",
      ];
      const missingFields = requiredFields.filter((field) => !data[field]);

      if (missingFields.length > 0) {
        setError(
          `Incomplete BOE data. Missing: ${missingFields.join(", ")}. Please fill these fields manually.`
        );
      }

      // Populate form with fetched data
      form.setFieldsValue({
        consignorGSTIN: data.consignor_gstin || "",
        consignorName: data.consignor_name || "",
        consignorAddress: data.consignor_address || "",
        consignorState: data.consignor_state || "",
        consignorPincode: data.consignor_pincode || "",
        consigneeGSTIN: data.consignee_gstin || "",
        consigneeName: data.consignee_name || "",
        consigneeAddress: data.consignee_address || "",
        consigneeState: data.consignee_state || "",
        consigneePincode: data.consignee_pincode || "",
        invoiceValue: data.invoice_value,
        invoiceNumber: data.invoice_number || "",
        invoiceDate: data.invoice_date || "",
        hsn: data.hsn || "",
        description: data.description || data.goods_description || "",
        pickupPincode: data.pickup_pincode || data.consignor_pincode || "",
        deliveryPincode: data.delivery_pincode || data.consignee_pincode || "",
      });

      // Fetch distance if both pincodes are available
      if (data.pickup_pincode && data.delivery_pincode) {
        await fetchDistanceData(data.pickup_pincode, data.delivery_pincode);
      }
    } catch (err) {
      console.error("Error fetching BOE data:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch BOE data. Please try again."
      );
    } finally {
      setBoeLoading(false);
    }
  };

  const fetchTransportersList = async () => {
    setTransportersLoading(true);
    try {
      const data = await fetchTransporters();
      setTransporters(Array.isArray(data) ? data : data.transporters || []);
    } catch (err) {
      console.error("Error fetching transporters:", err);
      setError("Failed to fetch transporters list");
    } finally {
      setTransportersLoading(false);
    }
  };

  const fetchDistanceData = async (pickupPincode, deliveryPincode) => {
    setDistanceLoading(true);
    try {
      const data = await fetchDistance(pickupPincode, deliveryPincode);
      form.setFieldValue("distance", data.distance || 0);
    } catch (err) {
      console.error("Error fetching distance:", err);
      // Distance fetch failure is not critical, user can enter manually
    } finally {
      setDistanceLoading(false);
    }
  };

  // Handle pincodes change to fetch distance
  const handlePincodesChange = useCallback(() => {
    const pickupPincode = form.getFieldValue("pickupPincode");
    const deliveryPincode = form.getFieldValue("deliveryPincode");

    if (
      pickupPincode &&
      deliveryPincode &&
      validatePincode(pickupPincode).isValid &&
      validatePincode(deliveryPincode).isValid
    ) {
      fetchDistanceData(pickupPincode, deliveryPincode);
    }
  }, [form]);

  const handleSubmit = async (values) => {
    setFormSubmitted(true);
    setError(null);
    setSuccessMessage(null);

    // Client-side validation
    const validation = validateEwayBillForm({
      ...values,
      distance: values.distance || 0,
    });

    if (!validation.isValid) {
      setError("Please fix the errors below and try again");
      return;
    }

    setLoading(true);
    try {
      // Prepare payload for API
      const payload = {
        beNumber,
        beDate: formatDateForAPI(beDate),
        consignorGSTIN: values.consignorGSTIN,
        consignorName: values.consignorName,
        consignorAddress: values.consignorAddress,
        consignorState: values.consignorState,
        consignorPincode: values.consignorPincode,
        consigneeGSTIN: values.consigneeGSTIN,
        consigneeName: values.consigneeName,
        consigneeAddress: values.consigneeAddress,
        consigneeState: values.consigneeState,
        consigneePincode: values.consigneePincode,
        invoiceValue: values.invoiceValue,
        invoiceNumber: values.invoiceNumber,
        invoiceDate: values.invoiceDate,
        hsn: values.hsn,
        description: values.description,
        distance: values.distance || 0,
        transporterId: values.transporterId,
        // Part-A only - explicitly omit these
        transDocNo: "",
        transMode: "",
        vehicleNo: "",
      };

      const response = await generateEwayBill(payload);

      // Show success with returned E-Way Bill details
      setSuccessMessage({
        ewbNo: response.ewb_number || response.ewbNo,
        status: response.status || "DIS",
        message:
          "E-Way Bill (Part-A) generated successfully! Vehicle information can be added separately.",
      });

      // Call success callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(response);
        }
        // Close modal after another delay
        setTimeout(() => {
          handleClose();
        }, 1000);
      }, 2000);
    } catch (err) {
      console.error("Error generating E-Way Bill:", err);

      // Show actual API error message
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to generate E-Way Bill";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setError(null);
    setSuccessMessage(null);
    setFormSubmitted(false);
    onClose();
  };

  return (
    <Modal
      title={
        <div>
          <Title level={4} style={{ marginBottom: 0 }}>
            Generate E-Way Bill (Part-A)
          </Title>
          <Text type="secondary" style={{ fontSize: "0.85rem" }}>
            BE No: {beNumber} | Date: {beDate}
          </Text>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={900}
      bodyStyle={{ maxHeight: "70vh", overflowY: "auto" }}
      destroyOnClose
    >
      <Spin spinning={boeLoading} indicator={<LoadingOutlined />}>
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

        {successMessage && (
          <Alert
            message="Success"
            description={
              <div>
                <p>
                  <strong>E-Way Bill Generated: {successMessage.ewbNo}</strong>
                </p>
                <p>Status: {successMessage.status}</p>
                <p>{successMessage.message}</p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginBottom: "16px" }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          {/* Consignor Section */}
          <div style={{ marginBottom: "24px", borderBottom: "1px solid #f0f0f0", paddingBottom: "16px" }}>
            <Title level={5}>Consignor (Shipper)</Title>
            <Form.Item
              label="GSTIN"
              name="consignorGSTIN"
              rules={[
                { required: true, message: "Consignor GSTIN is required" },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const validation = validateGSTIN(value);
                    if (!validation.isValid) {
                      return Promise.reject(new Error(validation.error));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              validateStatus={formSubmitted && form.getFieldError("consignorGSTIN").length > 0 ? "error" : ""}
            >
              <Input placeholder="e.g., 27AABAB0000B1Z5" />
            </Form.Item>

            <Form.Item
              label="Name"
              name="consignorName"
              rules={[{ required: true, message: "Consignor name is required" }]}
            >
              <Input placeholder="Consignor name" />
            </Form.Item>

            <Form.Item
              label="Address"
              name="consignorAddress"
              rules={[{ required: false }]}
            >
              <Input.TextArea rows={2} placeholder="Consignor address" />
            </Form.Item>

            <Form.Item
              label="State"
              name="consignorState"
              rules={[{ required: false }]}
            >
              <Input placeholder="State" />
            </Form.Item>

            <Form.Item
              label="Pincode"
              name="consignorPincode"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const validation = validatePincode(value);
                    if (!validation.isValid) {
                      return Promise.reject(new Error(validation.error));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="6-digit pincode" />
            </Form.Item>
          </div>

          {/* Consignee Section */}
          <div style={{ marginBottom: "24px", borderBottom: "1px solid #f0f0f0", paddingBottom: "16px" }}>
            <Title level={5}>Consignee (Receiver)</Title>
            <Form.Item
              label="GSTIN"
              name="consigneeGSTIN"
              rules={[
                { required: true, message: "Consignee GSTIN is required" },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const validation = validateGSTIN(value);
                    if (!validation.isValid) {
                      return Promise.reject(new Error(validation.error));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="e.g., 27AABAB0000B1Z5" />
            </Form.Item>

            <Form.Item
              label="Name"
              name="consigneeName"
              rules={[{ required: true, message: "Consignee name is required" }]}
            >
              <Input placeholder="Consignee name" />
            </Form.Item>

            <Form.Item
              label="Address"
              name="consigneeAddress"
              rules={[{ required: false }]}
            >
              <Input.TextArea rows={2} placeholder="Consignee address" />
            </Form.Item>

            <Form.Item
              label="State"
              name="consigneeState"
              rules={[{ required: false }]}
            >
              <Input placeholder="State" />
            </Form.Item>

            <Form.Item
              label="Pincode"
              name="consigneePincode"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const validation = validatePincode(value);
                    if (!validation.isValid) {
                      return Promise.reject(new Error(validation.error));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="6-digit pincode" />
            </Form.Item>
          </div>

          {/* Invoice Details Section */}
          <div style={{ marginBottom: "24px", borderBottom: "1px solid #f0f0f0", paddingBottom: "16px" }}>
            <Title level={5}>Invoice Details</Title>
            <Form.Item
              label="Invoice Number"
              name="invoiceNumber"
              rules={[{ required: false }]}
            >
              <Input placeholder="Invoice number" />
            </Form.Item>

            <Form.Item
              label="Invoice Date"
              name="invoiceDate"
              rules={[{ required: false }]}
            >
              <Input placeholder="Invoice date (YYYY-MM-DD)" />
            </Form.Item>

            <Form.Item
              label="Invoice Value (₹)"
              name="invoiceValue"
              rules={[
                { required: true, message: "Invoice value is required" },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const validation = validateInvoiceValue(value);
                    if (!validation.isValid) {
                      return Promise.reject(new Error(validation.error));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                placeholder="0.00"
                min={0}
                precision={2}
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              label="HSN Code"
              name="hsn"
              rules={[
                { required: true, message: "HSN code is required" },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const validation = validateHSN(value);
                    if (!validation.isValid) {
                      return Promise.reject(new Error(validation.error));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="e.g., 390290" maxLength={8} />
            </Form.Item>

            <Form.Item
              label="Description of Goods"
              name="description"
              rules={[{ required: true, message: "Description is required" }]}
            >
              <Input.TextArea rows={2} placeholder="Description of goods" />
            </Form.Item>
          </div>

          {/* Logistics Details Section */}
          <div style={{ marginBottom: "24px", borderBottom: "1px solid #f0f0f0", paddingBottom: "16px" }}>
            <Title level={5}>Logistics Details</Title>
            <Form.Item
              label="Pickup Pincode"
              name="pickupPincode"
              rules={[
                { required: true, message: "Pickup pincode is required" },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const validation = validatePincode(value);
                    if (!validation.isValid) {
                      return Promise.reject(new Error(validation.error));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="6-digit pincode"
                onBlur={handlePincodesChange}
              />
            </Form.Item>

            <Form.Item
              label="Delivery Pincode"
              name="deliveryPincode"
              rules={[
                { required: true, message: "Delivery pincode is required" },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const validation = validatePincode(value);
                    if (!validation.isValid) {
                      return Promise.reject(new Error(validation.error));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="6-digit pincode"
                onBlur={handlePincodesChange}
              />
            </Form.Item>

            <Form.Item
              label="Distance (km)"
              name="distance"
              rules={[{ required: true, message: "Distance is required" }]}
            >
              <InputNumber
                placeholder="Distance in kilometers"
                min={0}
                style={{ width: "100%" }}
                loading={distanceLoading}
              />
            </Form.Item>

            <Form.Item
              label="Transporter"
              name="transporterId"
              rules={[{ required: true, message: "Please select a transporter" }]}
            >
              <Select
                placeholder="Select transporter"
                loading={transportersLoading}
                options={transporters.map((t) => ({
                  value: t._id || t.id,
                  label: t.name || t.transporter_name,
                }))}
              />
            </Form.Item>
          </div>

          {/* Form Actions */}
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={boeLoading || transportersLoading}
            >
              Generate E-Way Bill (Part-A)
            </Button>
          </Space>
        </Form>
      </Spin>
    </Modal>
  );
};

export default PartAGenerateModal;
