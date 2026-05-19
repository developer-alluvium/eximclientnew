import axios from 'axios';

/**
 * Get client transport data from external API
 * Proxy to: http://3.108.244.38:9005/api/client-Transport-data
 */
export const getClientTransportData = async (req, res) => {
  try {
    const { ieCodeNo } = req.query;
    
    if (!ieCodeNo) {
      return res.status(400).json({
        success: false,
        message: "IE Code is required"
      });
    }

    // Extract authToken from Authorization header or cookies
    let authToken = req.headers.authorization;
    if (!authToken) {
        const cookieToken = req.cookies?.access_token || req.cookies?.user_access_token || req.cookies?.customer_admin_access_token;
        if (cookieToken) {
            authToken = `Bearer ${cookieToken}`;
        }
    }

    const targetBaseUrl = process.env.NODE_ENV === "development"
        ? "http://localhost:9005/api"
        : "https://eximbot.alvision.in/transport/api";

    // Call external API
    const response = await axios.get(
      `${targetBaseUrl}/client-Transport-data`, {
      params: { ieCodeNo },
      headers: {
        ...(authToken && { Authorization: authToken }),
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
