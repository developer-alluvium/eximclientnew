import axios from 'axios';
import express from "express";
const router = express.Router();



router.post('/api/be-details', async (req, res) => {
  
  try {
    const { location, beNo, beDt } = req.body;

    // Validate required fields
    if (!location || !beNo || !beDt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: location, beNo, beDt'
      });
    }

    // Format date to YYYYMMDD (remove dashes)
    const formattedDate = beDt.replace(/-/g, '');

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Origin': 'https://foservices.icegate.gov.in',
      'Referer': 'https://foservices.icegate.gov.in/#/public-enquiries/document-status/ds-bill-of-entry',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Create URL-encoded form data - try different parameter names
    const formData = new URLSearchParams();
    
    // Try different parameter combinations based on common ICEGATE patterns
    formData.append('location', location);
    formData.append('beNo', beNo);
    formData.append('beDt', formattedDate);
    
    // Also try alternative parameter names
    formData.append('beDate', formattedDate);
    formData.append('beno', beNo);
    formData.append('loc', location);


    const response = await axios.post(
      'https://foservices.icegate.gov.in/enquiry/publicEnquiries/BETrack_Ices_action_Public',
      formData,
      {
        headers,
        timeout: 30000,
        validateStatus: (status) => true // Don't throw on any status
      }
    );


    
    if (response.status === 200 && response.data) {
      res.json({
        success: true,
        status: response.status,
        data: response.data
      });
    } else {
      // Try alternative approach with JSON content type
      
      const jsonResponse = await axios.post(
        'https://foservices.icegate.gov.in/enquiry/publicEnquiries/BETrack_Ices_action_Public',
        {
          location,
          beNo,
          beDt: formattedDate
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://foservices.icegate.gov.in',
            'Referer': 'https://foservices.icegate.gov.in/#/public-enquiries/document-status/ds-bill-of-entry'
          },
          timeout: 30000,
          validateStatus: (status) => true
        }
      );

      if (jsonResponse.status === 200 && jsonResponse.data) {
        res.json({
          success: true,
          status: jsonResponse.status,
          data: jsonResponse.data
        });
      } else {
        res.status(jsonResponse.status).json({
          success: false,
          error: `ICEGATE API returned status: ${jsonResponse.status}`,
          data: jsonResponse.data
        });
      }
    }

  } catch (error) {
    console.error('API Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: `ICEGATE API error: ${error.response.status}`,
        details: error.response.data
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        success: false,
        error: 'Request timeout'
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Network error: ${error.message}`
      });
    }
  }
});

export default router;