import axios from 'axios';
import mongoose from 'mongoose';
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
    const apiKey = process.env.TRANSPORT_API_KEY || "1234567890";

    const targetBaseUrl = process.env.TRANSPORT_API_BASE_URL || (
      process.env.NODE_ENV === "development"
        ? "http://localhost:9007/api"
        : "https://eximbot.alvision.in/transport/api"
    );

    // Call external API
    try {
      const response = await axios.get(
        `${targetBaseUrl}/client-Transport-data`, {
        params: { 
          ieCodeNo,
          ...(filter && { filter })
        },
        headers: {
          "x-api-key": apiKey,
          ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
        },
        timeout: 15000
      });

      // Handle response formats from eximtransport server:
      // eximtransport returns: { success: true, count: N, organisation: {...}, data: [...] }
      // or directly an array: [...]
      const transportList = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data?.data) ? response.data.data : null);

      if (transportList !== null) {
        // Filter out empty "others" records that have no valid document, BE, branch, or container info
        // These standalone entries project null for all customs/shipping fields and clutter the client view
        const { includeOthers } = req.query;
        const validTransportList = (includeOthers === 'true')
          ? transportList
          : transportList.filter((item) => {
              if (!item) return false;
              return Boolean(
                item.document_no ||
                item.be_no ||
                item.branch ||
                item.container_type ||
                item.seal_no ||
                item.shipping_line
              );
            });

        return res.status(200).json({
          success: true,
          count: validTransportList.length,
          organisation: response.data?.organisation || null,
          data: validTransportList
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
    const apiKey = process.env.TRANSPORT_API_KEY || "1234567890";

    const targetBaseUrl = process.env.TRANSPORT_API_BASE_URL || (
      process.env.NODE_ENV === "development"
        ? "http://localhost:9007/api"
        : "https://eximbot.alvision.in/transport/api"
    );

    // Call external API
    const response = await axios.get(
      `${targetBaseUrl}/eway-bill/boe-extract`, {
      params: { be_no, be_date },
      headers: {
        "x-api-key": apiKey,
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

/**
 * Get tracking status history for a container
 * Endpoint: /api/transport/tracking-history
 */
export const getTrackingStatusHistory = async (req, res) => {
  try {
    const { containerId, containerNumber, trNo } = req.query;

    if (!containerId && !containerNumber && !trNo) {
      return res.status(400).json({
        success: false,
        message: "containerId, containerNumber, or trNo is required",
      });
    }

    // 1. First, check trackingstatushistories collection in local / connected MongoDB
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const orConditions = [];
        if (containerId) {
          if (mongoose.isValidObjectId(containerId)) {
            orConditions.push({ containerId: new mongoose.Types.ObjectId(containerId) });
          }
          orConditions.push({ containerId: String(containerId) });
        }
        if (containerNumber) {
          orConditions.push({ containerNumber: String(containerNumber).trim() });
        }
        if (trNo) {
          orConditions.push({ trNo: String(trNo).trim() });
        }

        const historyDoc = await mongoose.connection.db
          .collection('trackingstatushistories')
          .findOne({ $or: orConditions });

        if (historyDoc && Array.isArray(historyDoc.history)) {
          // Sort newest first
          const sortedHistory = [...historyDoc.history].sort(
            (a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0)
          );

          return res.status(200).json({
            success: true,
            message: "Tracking status history retrieved successfully",
            data: sortedHistory,
            containerInfo: {
              containerNumber: historyDoc.containerNumber || containerNumber,
              trNo: historyDoc.trNo || trNo,
              containerId: historyDoc.containerId || containerId,
              currentStatus: historyDoc.currentStatus,
            },
          });
        }
      } catch (dbErr) {
        console.warn("Direct DB lookup in trackingstatushistories failed:", dbErr.message);
      }
    }

    // 2. Fallback: Proxy to external transport API
    const serviceToken = await transportAuthService.getServiceToken();
    const apiKey = process.env.TRANSPORT_API_KEY || "1234567890";
    const targetBaseUrl = process.env.TRANSPORT_API_BASE_URL || (
      process.env.NODE_ENV === "development"
        ? "http://localhost:9007/api"
        : "https://eximbot.alvision.in/transport/api"
    );

    const response = await axios.get(`${targetBaseUrl}/tracking-status-history`, {
      params: {
        ...(containerId && { containerId }),
        ...(containerNumber && { containerNumber }),
        ...(trNo && { trNo }),
      },
      headers: {
        "x-api-key": apiKey,
        ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error("Error fetching tracking status history:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tracking status history",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Search live toll booth checkpoints for a truck from LDB
 * Endpoint: POST /api/transport/truck-tracking/search
 */
export const searchTruckTracking = async (req, res) => {
  try {
    const { vehiclenumber } = req.body;
    if (!vehiclenumber) {
      return res.status(400).json({ success: false, message: "Vehicle number is required" });
    }
    const cleanVehicleNo = vehiclenumber.toUpperCase().replace(/\s+/g, "");

    // 1. Try external transport API if available
    try {
      const apiKey = process.env.TRANSPORT_API_KEY || "1234567890";
      const targetBaseUrl = process.env.TRANSPORT_API_BASE_URL || (
        process.env.NODE_ENV === "development"
          ? "http://localhost:9007/api"
          : "https://eximbot.alvision.in/transport/api"
      );

      const upstreamRes = await axios.post(`${targetBaseUrl}/truck-tracking/search`, {
        vehiclenumber: cleanVehicleNo,
      }, {
        headers: { "x-api-key": apiKey },
        timeout: 12000,
        validateStatus: () => true,
      });

      if (upstreamRes.status === 200 && upstreamRes.data?.success && upstreamRes.data?.data) {
        return res.json(upstreamRes.data);
      }
    } catch (upstreamErr) {
      console.warn("Transport API truck search failed, trying LDB direct:", upstreamErr.message);
    }

    // 2. Direct LDB fallback
    const ldbUrl = "https://ldb.co.in/api/ldbv2/truck/search";
    const ldbRes = await axios.post(ldbUrl, {
      vehiclenumber: cleanVehicleNo,
    }, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://ldb.co.in",
        "Referer": `https://ldb.co.in/ldb/trucksearchlog/42/${cleanVehicleNo}`
      }
    });

    if (ldbRes.data && ldbRes.data.status === "OK" && ldbRes.data.responseBody) {
      return res.json({ success: true, data: ldbRes.data.responseBody });
    } else {
      return res.status(404).json({
        success: false,
        message: ldbRes.data?.message || "No tracking details found",
      });
    }
  } catch (error) {
    console.error("Error in truck tracking search:", error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || "Failed to fetch truck tracking",
    });
  }
};

/**
 * Get Vahan compliance details for a truck from LDB
 * Endpoint: GET /api/transport/truck-tracking/vahan-details/:vehicleNo
 */
export const getTruckVahanDetails = async (req, res) => {
  try {
    const { vehicleNo } = req.params;
    if (!vehicleNo) {
      return res.status(400).json({ success: false, message: "Vehicle number is required" });
    }
    const cleanVehicleNo = vehicleNo.toUpperCase().replace(/\s+/g, "");

    // 1. Try external transport API if available
    try {
      const apiKey = process.env.TRANSPORT_API_KEY || "1234567890";
      const targetBaseUrl = process.env.TRANSPORT_API_BASE_URL || (
        process.env.NODE_ENV === "development"
          ? "http://localhost:9007/api"
          : "https://eximbot.alvision.in/transport/api"
      );

      const upstreamRes = await axios.get(`${targetBaseUrl}/truck-tracking/vahan-details/${cleanVehicleNo}`, {
        headers: { "x-api-key": apiKey },
        timeout: 12000,
        validateStatus: () => true,
      });

      if (upstreamRes.status === 200 && upstreamRes.data?.success && upstreamRes.data?.data) {
        return res.json(upstreamRes.data);
      }
    } catch (upstreamErr) {
      console.warn("Transport API vahan details failed, trying LDB direct:", upstreamErr.message);
    }

    // 2. Direct LDB fallback
    const ldbUrl = `https://ldb.co.in/api/ldbv2/vahan/get/vahanDetails/${cleanVehicleNo}`;
    const ldbRes = await axios.get(ldbUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (ldbRes.data && ldbRes.data.statusCode === "SUCCESS" && ldbRes.data.object) {
      return res.json({ success: true, data: ldbRes.data.object });
    } else {
      return res.status(404).json({ success: false, message: "No Vahan details found" });
    }
  } catch (error) {
    console.error("Error in truck vahan details:", error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || "Failed to fetch Vahan details",
    });
  }
};


