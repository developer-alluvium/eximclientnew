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

    // Call external API
    const response = await axios.get('http://3.108.244.38:9005/api/client-Transport-data', {
      params: { ieCodeNo }
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
