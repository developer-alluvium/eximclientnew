// routes/currencyRateRoutes.js
import express from 'express';
import axios from 'axios';
import CurrencyRate from '../models/CurrencyRate.mjs';

const router = express.Router();
const EXPORT_API_BASE_URL = process.env.EXPORT_API_BASE_URL || 'https://eximbot.alvision.in/export/api';

// Trigger currency rate scraping via Export API
router.post('/api/currency-rates/scrape', async (req, res) => {
  try {
    console.log('Triggering currency rate scrape via Export API:', `${EXPORT_API_BASE_URL}/currency-rates/scrape`);
    const response = await axios.post(
      `${EXPORT_API_BASE_URL}/currency-rates/scrape`,
      req.body || {},
      { timeout: 30000 }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Scraping error via Export API:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to scrape currency rates via Export API',
      error: error.message,
    });
  }
});

// Get all currency rates via Export API
router.get('/api/currency-rates', async (req, res) => {
  try {
    const response = await axios.get(`${EXPORT_API_BASE_URL}/currency-rates`, {
      params: req.query,
      timeout: 15000,
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error fetching currency rates from Export API:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    // Local DB fallback
    try {
      const { notification_number, effective_date, limit = 50, skip = 0 } = req.query;
      const filter = { is_active: true };
      if (notification_number) filter.notification_number = notification_number;
      if (effective_date) filter.effective_date = effective_date;

      const currencyRates = await CurrencyRate.find(filter)
        .sort({ scraped_at: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));
      const total = await CurrencyRate.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: currencyRates,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (dbErr) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch currency rates',
        error: error.message,
      });
    }
  }
});

// Get currency rate for a specific date via Export API
router.get('/api/currency-rates/by-date/:date?', async (req, res) => {
  try {
    const { date } = req.params;
    const url = date && date !== 'undefined' && date !== 'null'
      ? `${EXPORT_API_BASE_URL}/currency-rates/by-date/${encodeURIComponent(date)}`
      : `${EXPORT_API_BASE_URL}/currency-rates/by-date`;

    const response = await axios.get(url, { timeout: 15000 });
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error fetching currency rate by date from Export API:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    // Local DB fallback
    try {
      let { date } = req.params;
      if (!date || date.trim() === '' || date === 'undefined' || date === 'null') {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        date = `${dd}-${mm}-${yyyy}`;
      }

      const parts = date.split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const inputDate = new Date(`${year}-${month}-${day}`);
        if (!isNaN(inputDate.getTime())) {
          const allRates = await CurrencyRate.find({ is_active: true });
          const validRates = allRates
            .map((rate) => {
              const [d, m, y] = (rate.effective_date || '').split('-');
              return {
                ...rate.toObject(),
                parsedDate: new Date(`${y}-${m}-${d}`),
              };
            })
            .filter((r) => !isNaN(r.parsedDate.getTime()) && r.parsedDate <= inputDate)
            .sort((a, b) => b.parsedDate - a.parsedDate);

          if (validRates.length > 0) {
            const immediateLower = validRates[0];
            delete immediateLower.parsedDate;
            return res.status(200).json({
              success: true,
              data: immediateLower,
              message: `Showing rates from fallback for ${immediateLower.effective_date}`,
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn('Local DB fallback failed:', dbErr.message);
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch currency rate',
      error: error.message,
    });
  }
});

// Get latest currency rates via Export API
router.get('/api/currency-rates/latest', async (req, res) => {
  try {
    const response = await axios.get(`${EXPORT_API_BASE_URL}/currency-rates/by-date`, {
      timeout: 15000,
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error fetching latest currency rate from Export API:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch latest currency rate',
      error: error.message,
    });
  }
});

// Get specific currency rate by ID
router.get('/api/currency-rates/:id', async (req, res) => {
  try {
    const currencyRate = await CurrencyRate.findById(req.params.id);
    if (!currencyRate) {
      return res.status(404).json({
        success: false,
        message: 'Currency rate not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: currencyRate,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch currency rate',
      error: error.message,
    });
  }
});

export default router;
