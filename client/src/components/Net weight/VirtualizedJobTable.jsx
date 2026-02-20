import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import useOptimizedJobData from '../hooks/useOptimizedJobData';

const VirtualizedJobTable = ({ userId }) => {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedYear, setSelectedYear] = useState('25-26');
  const tableContainerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  
  const {
    jobData,
    loading,
    error,
    pagination,
    hasMore,
    loadMore,
    handleSearch,
    searchQuery
  } = useOptimizedJobData(selectedYear, selectedStatus, userId);

  // Available years
  const availableYears = [
    { value: '25-26', label: '2025-26' },
    { value: '24-25', label: '2024-25' }
  ];

  // Row height for virtualization
  const ROW_HEIGHT = 80;
  const CONTAINER_HEIGHT = 600;
  const VISIBLE_ROWS = Math.ceil(CONTAINER_HEIGHT / ROW_HEIGHT);
  const BUFFER_SIZE = 10;

  // Virtual scrolling calculation
  const handleScroll = (event) => {
    const scrollTop = event.target.scrollTop;
    const start = Math.floor(scrollTop / ROW_HEIGHT);
    const end = Math.min(start + VISIBLE_ROWS + BUFFER_SIZE, jobData.length);
    
    setVisibleRange({ start: Math.max(0, start - BUFFER_SIZE), end });

    // Infinite scrolling - load more when near bottom
    if (scrollTop + CONTAINER_HEIGHT >= (jobData.length * ROW_HEIGHT) - 200) {
      if (hasMore && !loading) {
        loadMore();
      }
    }
  };

  // Memoized visible data
  const visibleData = useMemo(() => {
    return jobData.slice(visibleRange.start, visibleRange.end);
  }, [jobData, visibleRange]);

  // Format functions (optimized)
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  const formatCharges = (job) => {
    const charges = [];
    
    if (job.net_weight_calculator) {
      const calc = job.net_weight_calculator;
      if (calc.duty && parseFloat(calc.duty) > 0) charges.push(`Duty: ₹${parseFloat(calc.duty).toFixed(2)}`);
      if (calc.shipping && parseFloat(calc.shipping) > 0) charges.push(`Shipping: ₹${parseFloat(calc.shipping).toFixed(2)}`);
      if (calc.custom_clearance_charges && parseFloat(calc.custom_clearance_charges) > 0) charges.push(`Clearance: ₹${parseFloat(calc.custom_clearance_charges).toFixed(2)}`);
      if (calc.detention && parseFloat(calc.detention) > 0) charges.push(`Detention: ₹${parseFloat(calc.detention).toFixed(2)}`);
      if (calc.cfs && parseFloat(calc.cfs) > 0) charges.push(`CFS: ₹${parseFloat(calc.cfs).toFixed(2)}`);
      if (calc.transport && parseFloat(calc.transport) > 0) charges.push(`Transport: ₹${parseFloat(calc.transport).toFixed(2)}`);
      if (calc.Labour && parseFloat(calc.Labour) > 0) charges.push(`Labour: ₹${parseFloat(calc.Labour).toFixed(2)}`);
      if (calc.total_cost && parseFloat(calc.total_cost) > 0) charges.push(`Total: ₹${parseFloat(calc.total_cost).toFixed(2)}`);
    }
    
    return charges.length > 0 ? charges.join('\n') : '-';
  };

  const formatJobDetails = (job) => {
    const details = [];
    if (job.job_no) details.push(`Job: ${job.job_no}`);
    if (job.year) details.push(`Year: ${job.year}`);
    if (job.custom_house) details.push(`CH: ${job.custom_house}`);
    if (job.awb_bl_no) details.push(`AWB/BL: ${job.awb_bl_no}`);
    if (job.container_nos && job.container_nos.length > 0) {
      const containers = job.container_nos.map(c => c.container_no).filter(Boolean).join(', ');
      if (containers) details.push(`Containers: ${containers}`);
    }
    return details.join('\n') || '-';
  };

  const formatShipmentDetails = (job) => {
    const details = [];
    if (job.vessel_berthing) details.push(`Vessel: ${formatDate(job.vessel_berthing)}`);
    if (job.gateway_igm_date) details.push(`IGM: ${formatDate(job.gateway_igm_date)}`);
    if (job.discharge_date) details.push(`Discharge: ${formatDate(job.discharge_date)}`);
    if (job.loading_port) details.push(`Loading Port: ${job.loading_port}`);
    if (job.port_of_reporting) details.push(`Reporting Port: ${job.port_of_reporting}`);
    if (job.shipping_line_airline) details.push(`Line: ${job.shipping_line_airline}`);
    return details.join('\n') || '-';
  };

  const formatCommercialDetails = (job) => {
    const details = [];
    if (job.type_of_b_e) details.push(`BE Type: ${job.type_of_b_e}`);
    if (job.consignment_type) details.push(`Consignment: ${job.consignment_type}`);
    if (job.job_net_weight) details.push(`Net Weight: ${job.job_net_weight} kg`);
    if (job.gross_weight) details.push(`Gross Weight: ${job.gross_weight} kg`);
    if (job.per_kg_cost) details.push(`Per Kg: ₹${job.per_kg_cost}`);
    if (job.payment_method) details.push(`Payment: ${job.payment_method}`);
    return details.join('\n') || '-';
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Header Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" sx={{ color: '#1F2937', fontWeight: 'bold' }}>
          Job Data Overview
          {jobData.length > 0 && (
            <Chip 
              label={`${pagination.total} total jobs`} 
              size="small" 
              sx={{ ml: 1 }}
              color="primary"
            />
          )}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              label="Year"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {availableYears.map((year) => (
                <MenuItem key={year.value} value={year.value}>
                  {year.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              label="Status"
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Virtualized Table */}
      <TableContainer 
        component={Paper} 
        ref={tableContainerRef}
        onScroll={handleScroll}
        sx={{ 
          height: CONTAINER_HEIGHT,
          overflow: 'auto',
          border: '1px solid #E5E7EB',
          borderRadius: '8px'
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' }}>
                Charges
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' }}>
                Origin Country
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' }}>
                Exporter
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' }}>
                Job Details
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' }}>
                Shipment Details
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' }}>
                Commercial Details
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' }}>
                BE No. & Date
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' }}>
                Description
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Spacer for virtual scrolling */}
            {visibleRange.start > 0 && (
              <TableRow>
                <TableCell 
                  colSpan={8} 
                  sx={{ 
                    height: visibleRange.start * ROW_HEIGHT,
                    padding: 0,
                    border: 'none'
                  }} 
                />
              </TableRow>
            )}
            
            {/* Visible rows */}
            {visibleData.map((job, index) => {
              const actualIndex = visibleRange.start + index;
              return (
                <TableRow 
                  key={`${job.job_no}-${job.year}-${actualIndex}`}
                  sx={{ 
                    height: ROW_HEIGHT,
                    '&:nth-of-type(odd)': { backgroundColor: '#F9FAFB' },
                    '&:hover': { backgroundColor: '#F3F4F6' }
                  }}
                >
                  <TableCell sx={{ whiteSpace: 'pre-line', fontSize: '0.75rem', maxWidth: '150px' }}>
                    {formatCharges(job)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>
                    {job.origin_country || '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', maxWidth: '120px' }}>
                    {job.supplier_exporter || '-'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'pre-line', fontSize: '0.75rem', maxWidth: '180px' }}>
                    {formatJobDetails(job)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'pre-line', fontSize: '0.75rem', maxWidth: '180px' }}>
                    {formatShipmentDetails(job)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'pre-line', fontSize: '0.75rem', maxWidth: '180px' }}>
                    {formatCommercialDetails(job)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>
                    {job.be_no && job.be_no !== '-' ? (
                      <div>
                        <div>{job.be_no}</div>
                        <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                          {formatDate(job.be_date)}
                        </div>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', maxWidth: '150px' }}>
                    <div style={{ 
                      maxHeight: '60px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      wordBreak: 'break-word'
                    }}>
                      {job.description || '-'}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Bottom spacer for virtual scrolling */}
            {visibleRange.end < jobData.length && (
              <TableRow>
                <TableCell 
                  colSpan={8} 
                  sx={{ 
                    height: (jobData.length - visibleRange.end) * ROW_HEIGHT,
                    padding: 0,
                    border: 'none'
                  }} 
                />
              </TableRow>
            )}

            {/* Loading indicator */}
            {loading && (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    Loading more jobs...
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {/* No data message */}
            {!loading && jobData.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No job data found for the selected criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Status indicator */}
      {hasMore && !loading && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Scroll down to load more jobs
          </Typography>
        </Box>
      )}
      
      {!hasMore && jobData.length > 0 && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            All {pagination.total} jobs loaded
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default VirtualizedJobTable;
