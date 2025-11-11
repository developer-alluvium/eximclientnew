import express from 'express';
import CurrencyRate from '../models/CurrencyRate.mjs';

const router = express.Router();

// Get all currency rates
router.get('/api/currency-rates', async (req, res) => {
  try {
    const { notification_number, effective_date, limit = 50, skip = 0 } = req.query;
    
    const filter = { is_active: true };
    
    if (notification_number) {
      filter.notification_number = notification_number;
    }
    
    if (effective_date) {
      filter.effective_date = effective_date;
    }
    
    const currencyRates = await CurrencyRate.find(filter)
      .sort({ scraped_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await CurrencyRate.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: currencyRates,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch currency rates',
      error: error.message
    });
  }
});

// Get latest currency rates
router.get('/api/currency-rates/latest', async (req, res) => {
  try {
    const latestRate = await CurrencyRate.findOne({ is_active: true })
      .sort({ scraped_at: -1 });
    
    if (!latestRate) {
      return res.status(404).json({
        success: false,
        message: 'No currency rates found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: latestRate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest currency rates',
      error: error.message
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
        message: 'Currency rate not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: currencyRate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch currency rate',
      error: error.message
    });
  }
});


// Get currency rate for a specific date (finds immediate lower date)
router.get('/api/currency-rates/by-date/:date', async (req, res) => {
  try {
    const { date } = req.params; // Format: DD-MM-YYYY
    
    // Parse the input date
    const [day, month, year] = date.split('-');
    const inputDate = new Date(`${year}-${month}-${day}`);
    
    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use DD-MM-YYYY'
      });
    }

    // Find all currency rates with effective_date <= input date
    const allRates = await CurrencyRate.find({ is_active: true });
    
    // Filter and parse dates
    const validRates = allRates
      .map(rate => {
        const [d, m, y] = rate.effective_date.split('-');
        const effectiveDate = new Date(`${y}-${m}-${d}`);
        
        return {
          ...rate.toObject(),
          parsedDate: effectiveDate
        };
      })
      .filter(rate => !isNaN(rate.parsedDate.getTime()) && rate.parsedDate <= inputDate)
      .sort((a, b) => b.parsedDate - a.parsedDate); // Sort descending (latest first)

    if (validRates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No currency rates found for the selected date or before'
      });
    }

    // Get the immediate lower (most recent before or on selected date)
    const immediateLower = validRates[0];
    
    // Remove parsedDate before sending response
    delete immediateLower.parsedDate;

    res.status(200).json({
      success: true,
      data: immediateLower,
      message: `Showing rates for ${immediateLower.effective_date} (immediate lower to ${date})`
    });
  } catch (error) {
    console.error('Error fetching currency rate by date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch currency rate',
      error: error.message
    });
  }
});

export default router;
