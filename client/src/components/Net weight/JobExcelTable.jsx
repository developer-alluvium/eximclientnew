import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Chip,
  Autocomplete,
  IconButton
   
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import axios from 'axios';
import TablePagination from '@mui/material/TablePagination';
import { detailedStatusOptions } from '../../assets/data/detailedStatusOptions';

const JobExcelTable = ({ userId, gandhidham }) => {
  const [jobData, setJobData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedYear, setSelectedYear] = useState('25-26');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  
  // New state variables for exporter and detailed status
  const [selectedExporter, setSelectedExporter] = useState("all");
  const [detailedStatus, setDetailedStatus] = useState("all");
  const [exporters, setExporters] = useState([]);
  
  // Use useRef for search input to improve performance
  const searchInputRef = useRef(null);

  // Available years
  const availableYears = [
    { value: '25-26', label: '2025-26' },
    { value: '24-25', label: '2024-25' }
  ];

  // Function to get background color based on status
  const getStatusColor = (statusValue) => {
    switch (statusValue) {
      case "ETA Date Pending":
        return "#ffebee"; // Light red
      case "Estimated Time of Arrival":
        return "#fff3e0"; // Light orange  
      case "Gateway IGM Filed":
        return "#e3f2fd"; // Light blue
      case "Discharged":
        return "#f3e5f5"; // Light purple
      case "Rail Out":
        return "#e8f5e9"; // Light green
      case "BE Noted, Arrival Pending":
        return "#fff8e1"; // Light yellow
      case "BE Noted, Clearance Pending":
        return "#fce4ec"; // Light pink
      case "PCV Done, Duty Payment Pending":
        return "#e0f2f1"; // Light teal
      case "Custom Clearance Completed":
        return "#e8f5e9"; // Light green
      case "Billing Pending":
        return "#fff3e0"; // Light orange
      case "Completed":
        return "#e8f5e9"; // Light green
      case "In Progress":
        return "#fff3e0"; // Light orange
      default:
        return "transparent"; // Default transparent background
    }
  };

  // Debounce search query with improved handling
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 800);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Function to get user's IE code from localStorage
  const getUserIECode = useCallback(() => {
    try {
      const userDataFromStorage = localStorage.getItem("exim_user");
      if (userDataFromStorage) {
        const parsedUser = JSON.parse(userDataFromStorage);
    
        return parsedUser?.ie_code_no || null;
      }
      
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    return null;
  }, []);

  // Get importer name from localStorage
  const getUserImporterName = useCallback(() => {
    try {
      const userDataFromStorage = localStorage.getItem("exim_user");
      if (userDataFromStorage) {
        const parsedUser = JSON.parse(userDataFromStorage);
        return parsedUser?.assignedImporterName || null;
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    return null;
  }, []);

  // Add effect to fetch exporters when dependencies change
  useEffect(() => {
    const fetchExporters = async () => {
      const userImporter = getUserImporterName();
      
      if (!userImporter) {
        console.log("Skipping exporter fetch - no valid importer found");
        return;
      }
      
      // Sanitize the importer name by replacing non-breaking spaces with regular spaces
      const sanitizedImporter = userImporter.replace(/\u00A0/g, ' ').trim();
      
      console.log("Fetching exporters with params:", {
        importer: sanitizedImporter,
        year: selectedYear,
        status: selectedStatus
      });
      
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-exporters`,
          {
            params: { 
              importer: sanitizedImporter,
              // year: selectedYear,
              // status: selectedStatus 
            }
          }
        );
        
        console.log("Exporters API response:", res.data);
        
        // Filter out null/undefined exporters and remove duplicates
        const uniqueExporters = [...new Set(res.data.filter(exporter => exporter && exporter.trim() !== ''))];
        console.log("Filtered exporters:", uniqueExporters);
        
        setExporters(uniqueExporters);
      } catch (error) {
        console.error("Error fetching exporters:", error);
        setExporters([]);
      }
    };

    fetchExporters();
  }, [getUserImporterName, selectedYear, selectedStatus]);

  // Reset exporter selection when year or status changes
  useEffect(() => {
    setSelectedExporter("all");
  }, [selectedYear, selectedStatus]);

  // Optimized fetch job data using new backend endpoints
  const fetchJobData = useCallback(async () => {
    const ieCode = getUserIECode();
    const userImporter = getUserImporterName();
    console.log('ieCode:', ieCode, 'selectedYear:', selectedYear, 'userImporter:', userImporter);

    if (!ieCode || !selectedYear || !userImporter) {
      // console.log('Missing IE code, selected year, or importer name');
      return;
    }

    setLoading(true);
    setError(null);

   try {
  // Use jobStatusController endpoint for consistency with CJobList
  // Sanitize the importer name by replacing non-breaking spaces with regular spaces
  const sanitizedImporter = userImporter.replace(/\u00A0/g, ' ').trim();
  const formattedImporter = encodeURIComponent(sanitizedImporter);
  const formattedSearchQuery = debouncedSearchQuery ? encodeURIComponent(debouncedSearchQuery) : "";
  const formattedExporter = selectedExporter && selectedExporter !== "all" ? encodeURIComponent(selectedExporter) : "";
  
  // Use the same API URL construction as CJobList for consistency

 let apiUrl;

// Utility function to capitalize first letter


if (gandhidham) {
  console.log("gandhidham is true");


  apiUrl = `${process.env.REACT_APP_API_STRING}/gandhidham/${selectedYear}/jobs/${selectedStatus}/${detailedStatus}/${formattedImporter}?page=${page}&limit=100&search=${formattedSearchQuery}${formattedExporter ? `&exporter=${formattedExporter}` : ''}`;
} else {
  apiUrl = `${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/${selectedStatus}/${detailedStatus}/${formattedImporter}?page=${page + 1}&limit=${rowsPerPage}&search=${formattedSearchQuery}${formattedExporter ? `&exporter=${formattedExporter}` : ''}`;
  console.log("gandhidham is false");
}

  //const apiUrl = `${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/${selectedStatus}/${detailedStatus}/${formattedImporter}?page=${page + 1}&limit=${rowsPerPage}&search=${formattedSearchQuery}${formattedExporter ? `&exporter=${formattedExporter}` : ''}`;

  console.log("Fetching jobs data from:", apiUrl);

  const response = await axios.get(apiUrl);
  
  // Filter by user's IE code since the API returns all jobs for the importer
  const userJobs = response.data.data ? response.data.data.filter(job => {
    const matches = job.ie_code_no == ieCode;
    if (!matches) {
      console.log('IE code mismatch:', {
        jobIECode: job.ie_code_no,
        userIECode: ieCode,
        jobIECodeType: typeof job.ie_code_no,
        userIECodeType: typeof ieCode
      });
    }
    return matches;
  }) : [];
  
  setJobData(userJobs);
  setTotalCount(userJobs.length); // Note: This is the filtered count, not the total from API

} catch (error) {
  console.error('Error fetching job data:', error);
  
  // Fallback to original API approach
  console.log('Falling back to original API...');
  await fetchJobDataFallback();
} finally {
  setLoading(false);
}
  }, [selectedYear, selectedStatus, detailedStatus, selectedExporter, page, rowsPerPage, debouncedSearchQuery, getUserIECode, getUserImporterName]);

  // Fallback method using original API structure
  const fetchJobDataFallback = useCallback(async () => {
    const ieCode = getUserIECode();
    
    try {
      let allJobs = [];
      
      if (selectedStatus === 'all') {
        // Fetch all statuses with reduced limit per request
        const [pendingResponse, completedResponse, cancelledResponse] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/pending/all/all?limit=500`),
          axios.get(`${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/completed/all/all?limit=500`),
          axios.get(`${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/cancelled/all/all?limit=500`)
        ]);
        
        allJobs = [
          ...(pendingResponse.data.data || []),
          ...(completedResponse.data.data || []),
          ...(cancelledResponse.data.data || [])
        ];
      } else {
        // Fetch only selected status with pagination-friendly limit
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/${selectedStatus}/all/all?limit=500`
        );
        allJobs = response.data.data || [];
      }

      // Filter by user's IE code
      console.log('Fallback: Total jobs before IE filtering:', allJobs.length);
      console.log('Fallback: User IE Code:', ieCode, typeof ieCode);
      console.log('Fallback: Sample job IE codes:', allJobs.slice(0, 3).map(job => ({ 
        job_no: job.job_no, 
        ie_code_no: job.ie_code_no, 
        ie_code_type: typeof job.ie_code_no 
      })));
      
      let userJobs = allJobs.filter(job => job.ie_code_no == ieCode);
      console.log('Fallback: Jobs after IE filtering:', userJobs.length);
      
      // Apply detailed status filter
      if (detailedStatus !== "all") {
        userJobs = userJobs.filter(job => job.detailed_status === detailedStatus);
      }
      
      // Apply exporter filter
      if (selectedExporter !== "all") {
        userJobs = userJobs.filter(job => job.supplier_exporter === selectedExporter);
      }
      
      // Apply search filter if exists
      if (debouncedSearchQuery) {
        const searchLower = debouncedSearchQuery.toLowerCase();
        userJobs = userJobs.filter(job => 
          job.job_no?.toLowerCase().includes(searchLower) ||
          job.supplier_exporter?.toLowerCase().includes(searchLower) ||
          job.importer?.toLowerCase().includes(searchLower) ||
          job.custom_house?.toLowerCase().includes(searchLower) ||
          job.awb_bl_no?.toLowerCase().includes(searchLower) ||
          job.origin_country?.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower)
        );
      }

      // Apply client-side pagination
      const startIndex = page * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      const paginatedJobs = userJobs.slice(startIndex, endIndex);
      
      setJobData(paginatedJobs);
      setTotalCount(userJobs.length);
      
      console.log('Fallback fetch successful:', {
        total: userJobs.length,
        page: page + 1,
        showing: paginatedJobs.length
      });
    } catch (error) {
      setError('Failed to fetch job data');
    }
  }, [selectedYear, selectedStatus, detailedStatus, selectedExporter, page, rowsPerPage, gandhidham, debouncedSearchQuery, getUserIECode]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [selectedYear, selectedStatus, detailedStatus, selectedExporter, debouncedSearchQuery]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchJobData();
  }, [fetchJobData, gandhidham]);

  // Memoized format functions for better performance
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB');
  }, []);

  // Individual charge formatters for separate columns
  const formatCharge = useCallback((value) => {
    if (!value || parseFloat(value) === 0) return '-';
    return `₹${parseFloat(value).toFixed(2)}`;
  }, []);

  const formatCustomCharges = useCallback((job) => {
    if (!job.net_weight_calculator?.custom_fields?.length) return '-';
    
    const customCharges = job.net_weight_calculator.custom_fields
      .filter(field => field.value && parseFloat(field.value) > 0)
      .map(field => `${field.name}: ₹${parseFloat(field.value).toFixed(2)}`);
    
    return customCharges.length > 0 ? customCharges.join('\n') : '-';
  }, []);

  const formatJobDetails = useCallback((job) => {
    const details = [];
    if (job.job_no) {
      details.push(
        <div key="job-no" style={{ 
          fontWeight: 'bold', 
          fontSize: '0.9rem', 
          border: '1px solid #ddd', 
          padding: '2px 6px', 
          borderRadius: '4px',
          marginBottom: '4px',
          backgroundColor: '#f8f9fa',
          display: 'inline-block'
        }}>
          Job: {job.job_no}
        </div>
      );
    }
    if (job.year) details.push(`Year: ${job.year}`);
    if (job.custom_house) details.push(`CH: ${job.custom_house}`);
    if (job.awb_bl_no) details.push(`AWB/BL: ${job.awb_bl_no}`);
    if (job.container_nos && job.container_nos.length > 0) {
      const containers = job.container_nos.map(c => c.container_no).filter(Boolean).join(', ');
      if (containers) details.push(`Containers: ${containers}`);
    }
    
    // Return JSX elements for the job details
    return (
      <div>
        {details.map((detail, index) => (
          typeof detail === 'string' ? 
            <div key={index} style={{ marginBottom: '2px' }}>{detail}</div> : 
            detail
        ))}
      </div>
    );
  }, []);

  const formatShipmentDetails = useCallback((job) => {
    const details = [];
    if (job.vessel_berthing) details.push(`Vessel: ${formatDate(job.vessel_berthing)}`);
    if (job.gateway_igm_date) details.push(`IGM: ${formatDate(job.gateway_igm_date)}`);
    if (job.discharge_date) details.push(`Discharge: ${formatDate(job.discharge_date)}`);
    if (job.loading_port) details.push(`Loading Port: ${job.loading_port}`);
    if (job.port_of_reporting) details.push(`Reporting Port: ${job.port_of_reporting}`);
    if (job.shipping_line_airline) details.push(`Line: ${job.shipping_line_airline}`);
    return details.join('\n') || '-';
  }, [formatDate]);

  const formatCommercialDetails = useCallback((job) => {
    const details = [];
    if (job.type_of_b_e) details.push(`BE Type: ${job.type_of_b_e}`);
    if (job.consignment_type) details.push(`Consignment: ${job.consignment_type}`);
    if (job.job_net_weight) details.push(`Net Weight: ${job.job_net_weight} kg`);
    if (job.gross_weight) details.push(`Gross Weight: ${job.gross_weight} kg`);
    if (job.per_kg_cost) details.push(`Per Kg: ₹${job.per_kg_cost}`);
    if (job.payment_method) details.push(`Payment: ${job.payment_method}`);
    return details.join('\n') || '-';
  }, []);

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Memoized table rows for performance
  const tableRows = useMemo(() => {
    return jobData.map((job, index) => {
      const statusBgColor = getStatusColor(job.detailed_status);
      return (
        <TableRow 
          key={`${job.job_no}-${job.year}-${page}-${index}`}
          sx={{ 
            '&:nth-of-type(odd)': { 
              backgroundColor: statusBgColor !== "transparent" ? statusBgColor : '#F9FAFB' 
            },
            '&:nth-of-type(even)': { 
              backgroundColor: statusBgColor !== "transparent" ? statusBgColor : 'inherit' 
            },
            '&:hover': { backgroundColor: '#F3F4F6' }
          }}
        >
      
        {/* Shipping */}
        <TableCell sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
          {formatCharge(job.net_weight_calculator?.shipping)}
        </TableCell>
        {/* Custom Clearance Charges */}
        <TableCell sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
          {formatCharge(job.net_weight_calculator?.custom_clearance_charges)}
        </TableCell>
        {/* Detention */}
        <TableCell sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
          {formatCharge(job.net_weight_calculator?.detention)}
        </TableCell>
        {/* CFS */}
        <TableCell sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
          {formatCharge(job.net_weight_calculator?.cfs)}
        </TableCell>
        {/* Transport */}
        <TableCell sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
          {formatCharge(job.net_weight_calculator?.transport)}
        </TableCell>
        {/* Labour */}
        <TableCell sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
          {formatCharge(job.net_weight_calculator?.Labour)}
        </TableCell>
        {/* Weight */}
        <TableCell sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
          {job.net_weight_calculator?.weight && parseFloat(job.net_weight_calculator.weight) > 0 
            ? `${parseFloat(job.net_weight_calculator.weight).toFixed(2)} kg` 
            : '-'}
        </TableCell>
        {/* Total Cost */}
        <TableCell sx={{ fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }}>
          {formatCharge(job.net_weight_calculator?.total_cost)}
        </TableCell>
        {/* Per Kg Cost */}
        <TableCell sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
          {formatCharge(job.net_weight_calculator?.per_kg_cost)}
        </TableCell>
        {/* Custom Charges */}
        <TableCell sx={{ whiteSpace: 'pre-line', fontSize: '0.75rem', maxWidth: '120px' }}>
          {formatCustomCharges(job)}
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
        <TableCell sx={{ whiteSpace: 'pre-line', fontSize: '0.75rem', maxWidth: '250px' }}>
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
          
            textOverflow: 'ellipsis',
            wordBreak: 'break-word'
          }}>
            {job.description || '-'}
          </div>
        </TableCell>
      </TableRow>
      );
    });
  }, [jobData, page, formatCharge, formatCustomCharges, formatJobDetails, formatShipmentDetails, formatCommercialDetails, formatDate, getStatusColor]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading job data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 3 , maxWidth: '150%'}}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" sx={{ color: '#1F2937', fontWeight: 'bold' }}>
          Job Data Overview 
          {totalCount > 0 && (
            <Chip 
              label={`${totalCount} total jobs`} 
              size="small" 
              sx={{ ml: 1 }}
              color="primary"
            />
          )}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search by Job No, Importer, or AWB/BL Number"
            size="small"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => {
                      setDebouncedSearchQuery(searchQuery);
                      setPage(0);
                    }}
                  >
                    <SearchIcon />
                  </IconButton>
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
              onChange={(e) => {
                console.log('Status changed to:', e.target.value);
                setSelectedStatus(e.target.value);
                setPage(0); // Reset page when status changes
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Detailed Status</InputLabel>
            <Select
              value={detailedStatus}
              label="Detailed Status"
              onChange={(e) => setDetailedStatus(e.target.value)}
            >
              {detailedStatusOptions.map((option, index) => (
                <MenuItem
                  key={`status-${option.id || option.value || index}`}
                  value={option.value}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1
                  }}
                >
                  {option.value !== "all" && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: getStatusColor(option.value),
                        border: "2px solid #666",
                        marginRight: "8px",
                        flexShrink: 0
                      }}
                    />
                  )}
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            size="small"
            options={["All Exporters", ...exporters]}
            value={selectedExporter === "all" ? "All Exporters" : selectedExporter}
            onChange={(event, newValue) => {
              const value = newValue === "All Exporters" ? "all" : newValue || "all";
              setSelectedExporter(value);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Exporter"
                variant="outlined"
                sx={{ minWidth: 200 }}
              />
            )}
            sx={{ minWidth: 200 }}
            isOptionEqualToValue={(option, value) => {
              if (value === "All Exporters" && option === "All Exporters") return true;
              if (value !== "All Exporters" && option !== "All Exporters" && option === value) return true;
              return false;
            }}
          />
        </Box>
      </Box>

      {totalCount == 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No job data found for the selected criteria.
        </Alert>
      ) : (
        <>
          <TableContainer 
            component={Paper} 
            sx={{ 
              maxHeight: 600, 
              overflow: 'auto',
              border: '1px solid #E5E7EB',
              borderRadius: '8px'
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                 
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '100px' }}>
                    Shipping
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '100px' }}>
                    Clearance
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '100px' }}>
                    Detention
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '100px' }}>
                    CFS
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '100px' }}>
                    Transport
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '100px' }}>
                    Labour
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '100px' }}>
                    Weight (kg)
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '100px' }}>
                    Total Cost
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '100px' }}>
                    Per Kg Cost
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '120px' }}>
                    Custom Charges
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
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB', minWidth: '200px' }}>
                    Shipment Details
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' , minWidth: '200px' }}>
                    Commercial Details
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' }}>
                    BE No. & Date
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#F9FAFB' , minHeight:'70px' }}>
                    Description
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{
              borderTop: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB'
            }}
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
            }
          />
        </>
      )}
    </Box>
  );
};

export default JobExcelTable;
