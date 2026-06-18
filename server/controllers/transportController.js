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
        ? "http://localhost:9005/api"
        : "https://eximbot.alvision.in/transport/api";

    // Call external API
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

    // Return data to frontend
    res.status(200).json({
      success: true,
      data: response.data
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
