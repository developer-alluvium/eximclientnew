import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Fade,
  Stack,
  TextField
} from '@mui/material';
import {
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const CurrencyRateDialog = ({ open, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currencyData, setCurrencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open && !currencyData) {
      handleDateChange(new Date());
    }
  }, [open]);

  const handleDateChange = async (date) => {
    if (!date || isNaN(date.getTime())) return;

    setSelectedDate(date);
    setError('');
    setLoading(true);
    setSearchTerm('');
    setCurrencyData(null);

    try {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;

      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/currency-rates/by-date/${formattedDate}`
      );

      if (response.data.success) {
        setCurrencyData(response.data.data);
      } else {
        setError(response.data.message || 'No data found');
        setCurrencyData(null);
      }
    } catch (err) {
      console.error('Error fetching currency rates:', err);
      setError(err.response?.data?.message || 'Failed to fetch currency rates');
      setCurrencyData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [day, month, year] = dateString.split('-');
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredRates = currencyData?.exchange_rates?.filter(
    (rate) =>
      rate.currency_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.currency_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '92vh'
        }
      }}
    >
      {/* Header with Note */}
      <Box
        sx={{
          bgcolor: 'white',
          color: 'text.primary',
          borderBottom: '1px solid #e0e0e0',
          px: 3,
          py: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            Currency Exchange Rates
          </Typography>
          <Chip
            label="ICEGATE"
            size="small"
            sx={{
              bgcolor: '#eceff1',
              color: '#37474f',
              fontWeight: 700,
              fontSize: '0.7rem',
              height: 22
            }}
          />
          {/* MOVED: Note is now here */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
              ml: 1 // Added margin
            }}
          >
            <InfoIcon sx={{ fontSize: '1.1rem' }} />
            <Typography
              variant="body2"
              sx={{ fontStyle: 'italic', fontSize: '0.8rem' }}
            >
              Rates based on ICEGATE (Customs) notifications.
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3, bgcolor: '#fafafa' }}>
        {/* Compact Controls Box */}
        <Box
          sx={{
            bgcolor: 'white',
            p: 2,
            borderRadius: 1,
            border: '1px solid #e0e0e0',
            mb: 2.5
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems="center"
          >
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={handleDateChange}
                format="dd/MM/yyyy"
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { width: { xs: '100%', md: 180 } } // Slightly smaller
                  }
                }}
              />
            </LocalizationProvider>

            <TextField
              label="Search Currency"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: { xs: '100%', md: 220 } }} // REDUCED width
              disabled={!currencyData}
            />

            {/* REMOVED: Note Box was here */}

            {/* MOVED: Notification Block is now inside this stack */}
            {currencyData && (
              <Stack
                direction="row"
                spacing={2}
                sx={{ ml: { md: 'auto' }, mt: { xs: 2, md: 0 } }} // Pushes to right
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                  >
                    NOTIFICATION
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {currencyData.notification_number}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                  >
                    EFFECTIVE DATE
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatDate(currencyData.effective_date)}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                  >
                    CURRENCIES
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {currencyData.exchange_rates?.length || 0}
                  </Typography>
                </Box>
              </Stack>
            )}
          </Stack>
          {/* REMOVED: Divider and separate Stack for notification */}
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Table */}
        {currencyData && !loading && (
          <Fade in={true}>
            <TableContainer
              component={Paper}
              sx={{
                boxShadow: 'none',
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                maxHeight: 'calc(92vh - 220px)' // Adjusted height
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...tableHeaderSx, width: '15%' }}>
                      CODE
                    </TableCell>
                    <TableCell sx={{ ...tableHeaderSx, width: '35%' }}>
                      CURRENCY NAME
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ ...tableHeaderSx, width: '10%' }}
                    >
                      UNIT
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...tableHeaderSx, width: '20%' }}
                    >
                      <Box sx={tableHeaderIconBox}>
                        <TrendingUpIcon sx={{ fontSize: 14 }} />
                        IMPORT
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...tableHeaderSx, width: '20%' }}
                    >
                      <Box sx={tableHeaderIconBox}>
                        <TrendingDownIcon sx={{ fontSize: 14 }} />
                        EXPORT
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRates?.map((rate, index) => (
                    <TableRow
                      key={rate._id || index}
                      sx={{
                        '&:nth-of-type(even)': { bgcolor: '#f5f5f5' },
                        '&:hover': { bgcolor: '#e3f2fd' },
                        height: 44
                      }}
                    >
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          label={rate.currency_code}
                          size="small"
                          sx={{
                            bgcolor: '#eceff1',
                            color: '#37474f',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 24,
                            letterSpacing: 0.5
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 500, fontSize: '0.85rem', py: 1 }}
                      >
                        {rate.currency_name}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, fontSize: '0.85rem', py: 1 }}
                      >
                        {rate.unit}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <Chip
                          label={`₹ ${rate.import_rate.toFixed(2)}`}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            height: 26,
                            minWidth: 90
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <Chip
                          label={`₹ ${rate.export_rate.toFixed(2)}`}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            height: 26,
                            minWidth: 90
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Fade>
        )}

        {/* Empty State */}
        {!currencyData && !loading && !error && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <CalendarIcon sx={{ fontSize: 48, mb: 1.5, opacity: 0.3 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Select a date to view exchange rates
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          bgcolor: '#fafafa',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'flex-end'
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          size="small"
          color="primary"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3
          }}
        >
          Close
        </Button>
      </Box>
    </Dialog>
  );
};

// Helper objects for styles
const tableHeaderSx = {
  bgcolor: '#f5f5ff',
  color: '#455a64',
  fontWeight: 700,
  fontSize: '0.75rem',
  py: 1.2,
  letterSpacing: 0.5,
  borderBottom: '2px solid #b0bec5'
};

const tableHeaderIconBox = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 0.5
};

export default CurrencyRateDialog;