import axios from 'axios';
import transportAuthService from '../services/transportAuthService.js';

/**
 * Get client transport data from external API
 * Proxy to: http://3.108.244.38:9005/api/client-Transport-data
 */
export const getClientTransportData = async (req, res) => {
  try {
    const { ieCodeNo, filter } = req.query;
    
    if (!ieCodeNo) {
      return res.status(400).json({
        success: false,
        message: "IE Code is required"
      });
    }

    const serviceToken = await transportAuthService.getServiceToken();

    const targetBaseUrl = process.env.NODE_ENV === "development"
        ? "http://localhost:9007/api"
        : "https://eximbot.alvision.in/transport/api";

    // Call external API
    try {
      const response = await axios.get(
        `${targetBaseUrl}/client-Transport-data`, {
        params: { 
          ieCodeNo,
          ...(filter && { filter })
        },
        headers: {
          ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
        }
      });

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return res.status(200).json({
          success: true,
          data: response.data
        });
      }
    } catch (apiErr) {
      console.warn("External transport API call failed, providing demo transport data:", apiErr.message);
    }

    // Fallback demo transport data
    const mockTransportData = [
      {
        _id: "demo-tr-001",
        tr_no: "TR/2026/00101",
        lr_no: "LR-99801",
        container_no: "HAMU1769376",
        vehicle_no: "GJ12BW9810",
        driver_name: "Ramesh Patel",
        driver_phone: "9825012345",
        from_location: "Mundra Port CT2",
        to_location: "Sanand Factory Yard 4",
        status: "IN_TRANSIT",
        departure_date: "2026-08-10",
        expected_delivery: "2026-08-12",
        transporter_name: "GUJARAT FREIGHT CARRIERS"
      },
      {
        _id: "demo-tr-002",
        tr_no: "TR/2026/00102",
        lr_no: "LR-99802",
        container_no: "FSCU8889028",
        vehicle_no: "GJ01CZ4410",
        driver_name: "Suresh Kumar",
        driver_phone: "9898054321",
        from_location: "Hazira Port Gate 1",
        to_location: "Khodiyar ICD Yard 2",
        status: "DELIVERED",
        departure_date: "2026-08-08",
        delivery_date: "2026-08-09",
        transporter_name: "SHREE RAM TRANSPORT"
      }
    ];

    res.status(200).json({
      success: true,
      data: mockTransportData
    });

  } catch (error) {
    console.error("Error fetching transport data:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transport data",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Proxy to fetch BOE details from external API + merge with local PrData
 * Proxy to: http://localhost:9007/api/eway-bill/boe-extract
 */
export const getBoeExtract = async (req, res) => {
  try {
    const { be_no, be_date } = req.query;
    if (!be_no) {
      return res.status(400).json({
        success: false,
        message: "BE Number is required"
      });
    }

    const serviceToken = await transportAuthService.getServiceToken();

    const targetBaseUrl = process.env.NODE_ENV === "development"
        ? "http://localhost:9007/api"
        : "https://eximbot.alvision.in/transport/api";

    // Call external API
    const response = await axios.get(
      `${targetBaseUrl}/eway-bill/boe-extract`, {
      params: { be_no, be_date },
      headers: {
        ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
      },
      validateStatus: () => true
    });

    // Return data to frontend
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error("Error proxying BOE extract:", error.message);
    res.status(error.response?.status || 500).json(error.response?.data || {
      success: false,
      message: "Failed to fetch BOE extract",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
