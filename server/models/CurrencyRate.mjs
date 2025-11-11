import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema({
  currency_code: {
    type: String,
    required: true,
  },
  currency_name: {
    type: String,
    required: true,
  },
  unit: {
    type: Number,
    default: 1.0,
  },
  import_rate: {
    type: Number,
    required: true,
  },
  export_rate: {
    type: Number,
    required: true,
  }
});

const currencyRateSchema = new mongoose.Schema({
  notification_number: {
    type: String,
    required: true,
    index: true,
  },
  effective_date: {
    type: String,
    required: true,
  },
  exchange_rates: [exchangeRateSchema],
  meta: {
    parsed_currency_count: Number,
    raw_lines_detected: Number,
    total_lines: Number,
  },
  pdf_filename: String,
  scraped_at: {
    type: Date,
    default: Date.now,
  },
  is_active: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

// Index for faster queries
currencyRateSchema.index({ notification_number: 1, effective_date: 1 });

const CurrencyRate = mongoose.model('CurrencyRate', currencyRateSchema);

export default CurrencyRate;
