import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

// Styled components
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 'bold',
  backgroundColor: theme.palette.grey[100],
  border: '1px solid #e0e0e0',
  textAlign: 'center',
  fontSize: '0.9rem',
  padding: '8px 12px',
}));

const StyledDataCell = styled(TableCell)(({ theme }) => ({
  border: '1px solid #e0e0e0',
  textAlign: 'center',
  fontSize: '0.85rem',
  padding: '8px 12px',
  maxWidth: '150px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}));

const ClickableCell = styled(StyledDataCell)(({ theme }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    transform: 'scale(1.02)'
  }
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  fontWeight: 'bold',
  fontSize: '0.75rem',
  ...(status === 'arrived' && {
    backgroundColor: '#4caf50',
    color: 'white',
  }),
  ...(status === 'transit' && {
    backgroundColor: '#ff9800',
    color: 'white',
  }),
}));

const ContainerDetailsModal = ({ open, onClose, status, size, year }) => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [groupBy, setGroupBy] = useState('none');
  const [groupedContainers, setGroupedContainers] = useState({});

  // Get user IE codes from localStorage - supporting multiple IE codes
  const getUserIeCodes = () => {
    try {
      const userData = localStorage.getItem("exim_user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        
        // Check for multiple IE code assignments first
        if (parsedUser.ie_code_assignments && parsedUser.ie_code_assignments.length > 0) {
          return parsedUser.ie_code_assignments.map(assignment => assignment.ie_code_no);
        }
        
        // Fallback to single IE code
        return parsedUser.data?.user?.ie_code_no || parsedUser.ie_code_no ? 
          [parsedUser.data?.user?.ie_code_no || parsedUser.ie_code_no] : [];
      }
    } catch (error) {
      console.error("Error getting user IE codes:", error);
    }
    return [];
  };

  // Fetch container details with multiple IE codes support
  const fetchContainerDetails = async () => {
    if (!status || !year) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const ieCodes = getUserIeCodes();
      if (!ieCodes.length) {
        throw new Error("User authorization required - no IE codes found");
      }

      // Create comma-separated string of IE codes
      const ieCodesParam = ieCodes.join(',');
      const sizeParam = size ? `&size=${size}` : '';
      
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/container-details?year=${year}&status=${status}&ie_codes=${ieCodesParam}${sizeParam}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch container details");
      }

      const data = await response.json();
      if (data.success) {
        setContainers(data.data);
        groupContainers(data.data, groupBy);
      } else {
        throw new Error(data.message || "Failed to load container details");
      }
    } catch (err) {
      console.error("Error fetching container details:", err);
      setError(err.message);
      setContainers([]);
      setGroupedContainers({});
    } finally {
      setLoading(false);
    }
  };

  // Group containers based on selected criteria (unchanged)
  const groupContainers = (containerData, groupByOption) => {
    if (groupByOption === 'none') {
      setGroupedContainers({ 'All Containers': containerData });
      return;
    }

    const grouped = {};
    
    containerData.forEach(container => {
      let groupKey = '';
      
      switch (groupByOption) {
        case 'supplier':
          groupKey = container.supplier_exporter || 'Unknown Supplier';
          break;
        case 'port':
          groupKey = container.port_of_reporting?.replace(/^\(.*?\)\s*/, '') || 'Unknown Port';
          break;
        case 'size':
          groupKey = `${container.container_size}' Containers`;
          break;
        case 'month':
          if (container.arrival_date) {
            const date = new Date(container.arrival_date);
            groupKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          } else {
            groupKey = 'No Arrival Date';
          }
          break;
        case 'job_date':
          if (container.job_date) {
            const date = new Date(container.job_date);
            groupKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          } else {
            groupKey = 'Unknown Job Date';
          }
          break;
        case 'job_no':
          groupKey = container.job_no || 'Unknown Job No';
          break;
        case 'ie_code':
          groupKey = `IE Code: ${container.ie_code_no || 'Unknown'}`;
          break;
        default:
          groupKey = 'All Containers';
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(container);
    });

    // Sort groups by key and sort containers within each group
    const sortedGrouped = {};
    Object.keys(grouped).sort().forEach(key => {
      sortedGrouped[key] = grouped[key].sort((a, b) => a.job_no.localeCompare(b.job_no));
    });

    setGroupedContainers(sortedGrouped);
  };

  // Handle group by change
  const handleGroupByChange = (event) => {
    const newGroupBy = event.target.value;
    setGroupBy(newGroupBy);
    groupContainers(containers, newGroupBy);
  };

  // Fetch data when modal opens
  useEffect(() => {
    if (open && status && year) {
      fetchContainerDetails();
    }
  }, [open, status, year, size]);

  // Update grouping when containers or groupBy changes
  useEffect(() => {
    if (containers.length > 0) {
      groupContainers(containers, groupBy);
    }
  }, [containers, groupBy]);

  // Handle modal close
  const handleClose = () => {
    setContainers([]);
    setError(null);
    setSelectedContainer(null);
    setGroupBy('none');
    setGroupedContainers({});
    onClose();
  };

  // Handle container row click
  const handleContainerClick = (container) => {
    setSelectedContainer(container);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Handle tracking redirect
  const handleTrackingRedirect = (containerNumber) => {
    if (containerNumber) {
      const trackingUrl = `https://www.ldb.co.in/ldb/containersearch/39/${containerNumber}/1726651147706`;
      window.open(trackingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusColor = (status) => {
    return status === 'arrived' ? '#4caf50' : '#ff9800';
  };

  const renderGroupedContainers = () => {
    return Object.entries(groupedContainers).map(([groupName, groupContainers]) => (
      <Box key={groupName} sx={{ mb: 4 }}>
        {/* Group Header */}
        <Box sx={{ 
          mb: 2, 
          p: 2, 
          backgroundColor: '#f5f5f5', 
          borderRadius: 2,
          border: '1px solid #e0e0e0'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold', 
            color: '#1976d2',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            📦 {groupName}
            <Chip 
              label={`${groupContainers.length} container${groupContainers.length > 1 ? 's' : ''}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Typography>
        </Box>

        {/* Group Table */}
        <TableContainer 
          component={Paper} 
          sx={{ 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            mb: 2
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <StyledTableCell>Job No.</StyledTableCell>
                <StyledTableCell>Container No.</StyledTableCell>
                <StyledTableCell>Size</StyledTableCell>
                <StyledTableCell>Net Weight (PL)</StyledTableCell>
                <StyledTableCell>Supplier</StyledTableCell>
                <StyledTableCell>Arrival Date</StyledTableCell>
                <StyledTableCell>Port</StyledTableCell>
                <StyledTableCell>Tracking</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupContainers.map((container, index) => (
                <TableRow 
                  key={`${container.job_no}-${container.container_number}-${index}`}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: '#f5f5f5',
                      cursor: 'pointer'
                    }
                  }}
                  onClick={() => handleContainerClick(container)}
                >
                  <StyledDataCell>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {container.job_no}
                    </Typography>
                  </StyledDataCell>
                  <ClickableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InventoryIcon sx={{ fontSize: 16, color: 'grey.600' }} />
                      <Typography variant="body2" fontWeight="500">
                        {container.container_number || 'N/A'}
                      </Typography>
                    </Box>
                  </ClickableCell>
                  <StyledDataCell>
                    <StatusChip 
                      label={`${container.container_size}'`}
                      size="small"
                      sx={{ 
                        backgroundColor: container.container_size === '20' ? '#2196f3' : '#9c27b0',
                        color: 'white'
                      }}
                    />
                  </StyledDataCell>
                  <StyledDataCell>
                    <Tooltip title={container.net_weight_as_per_PL_document ? `Net Weight: ${container.net_weight_as_per_PL_document}` : 'Net weight not available'} arrow>
                      <Typography variant="body2" fontWeight="500" sx={{ color: container.net_weight_as_per_PL_document ? 'text.primary' : 'text.secondary' }}>
                        {container.net_weight_as_per_PL_document || 'N/A'}
                      </Typography>
                    </Tooltip>
                  </StyledDataCell>
                  <StyledDataCell>
                    <Tooltip title={container.supplier_exporter || 'N/A'} arrow>
                      <Typography variant="body2" noWrap>
                        {container.supplier_exporter?.substring(0, 20)}
                        {container.supplier_exporter?.length > 20 ? '...' : ''}
                      </Typography>
                    </Tooltip>
                  </StyledDataCell>
                  <StyledDataCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <CalendarTodayIcon sx={{ fontSize: 14, color: 'grey.600' }} />
                      <Typography variant="body2">
                        {formatDate(container.arrival_date)}
                      </Typography>
                      {status === 'arrived' && container.days_since_arrival !== null && (
                        <Chip 
                          label={`${container.days_since_arrival}d`}
                          size="small"
                          sx={{ 
                            fontSize: '0.7rem',
                            height: '18px',
                            backgroundColor: container.days_since_arrival > 10 ? '#ffeb3b' : '#e8f5e9'
                          }}
                        />
                      )}
                    </Box>
                  </StyledDataCell>
                  <StyledDataCell>
                    <Tooltip title={container.port_of_reporting || 'N/A'} arrow>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                        <LocationOnIcon sx={{ fontSize: 14, color: 'grey.600' }} />
                        <Typography variant="body2" noWrap>
                          {container.port_of_reporting?.replace(/^\(.*?\)\s*/, '').substring(0, 15) || 'N/A'}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </StyledDataCell>
                  <StyledDataCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackingRedirect(container.container_number);
                      }}
                      sx={{ 
                        color: 'primary.main',
                        '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                      }}
                    >
                      <LaunchIcon fontSize="small" />
                    </IconButton>
                  </StyledDataCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    ));
  };

  const renderContainerTable = () => (
    <TableContainer 
      component={Paper} 
      sx={{ 
        maxHeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <StyledTableCell>Job No.</StyledTableCell>
            <StyledTableCell>Container No.</StyledTableCell>
            <StyledTableCell>Size</StyledTableCell>
            <StyledTableCell>Net Weight (PL)</StyledTableCell>
            <StyledTableCell>Supplier</StyledTableCell>
            <StyledTableCell>Arrival Date</StyledTableCell>
            <StyledTableCell>Port</StyledTableCell>
            <StyledTableCell>Tracking</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {containers.map((container, index) => (
            <TableRow 
              key={`${container.job_no}-${container.container_number}-${index}`}
              sx={{ 
                '&:hover': { 
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer'
                }
              }}
              onClick={() => handleContainerClick(container)}
            >
              <StyledDataCell>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {container.job_no}
                </Typography>
              </StyledDataCell>
              <ClickableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InventoryIcon sx={{ fontSize: 16, color: 'grey.600' }} />
                  <Typography variant="body2" fontWeight="500">
                    {container.container_number || 'N/A'}
                  </Typography>
                </Box>
              </ClickableCell>
              <StyledDataCell>
                <StatusChip 
                  label={`${container.container_size}'`}
                  size="small"
                  sx={{ 
                    backgroundColor: container.container_size === '20' ? '#2196f3' : '#9c27b0',
                    color: 'white'
                  }}
                />
              </StyledDataCell>
              <StyledDataCell>
                <Tooltip title={container.net_weight_as_per_PL_document ? `Net Weight: ${container.net_weight_as_per_PL_document}` : 'Net weight not available'} arrow>
                  <Typography variant="body2" fontWeight="500" sx={{ color: container.net_weight_as_per_PL_document ? 'text.primary' : 'text.secondary' }}>
                    {container.net_weight_as_per_PL_document || 'N/A'}
                  </Typography>
                </Tooltip>
              </StyledDataCell>
              <StyledDataCell>
                <Tooltip title={container.supplier_exporter || 'N/A'} arrow>
                  <Typography variant="body2" noWrap>
                    {container.supplier_exporter?.substring(0, 20)}
                    {container.supplier_exporter?.length > 20 ? '...' : ''}
                  </Typography>
                </Tooltip>
              </StyledDataCell>
              <StyledDataCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                  <CalendarTodayIcon sx={{ fontSize: 14, color: 'grey.600' }} />
                  <Typography variant="body2">
                    {formatDate(container.arrival_date)}
                  </Typography>
                  {status === 'arrived' && container.days_since_arrival !== null && (
                    <Chip 
                      label={`${container.days_since_arrival}d`}
                      size="small"
                      sx={{ 
                        fontSize: '0.7rem',
                        height: '18px',
                        backgroundColor: container.days_since_arrival > 10 ? '#ffeb3b' : '#e8f5e9'
                      }}
                    />
                  )}
                </Box>
              </StyledDataCell>
              <StyledDataCell>
                <Tooltip title={container.port_of_reporting || 'N/A'} arrow>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                    <LocationOnIcon sx={{ fontSize: 14, color: 'grey.600' }} />
                    <Typography variant="body2" noWrap>
                      {container.port_of_reporting?.replace(/^\(.*?\)\s*/, '').substring(0, 15) || 'N/A'}
                    </Typography>
                  </Box>
                </Tooltip>
              </StyledDataCell>
              <StyledDataCell>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTrackingRedirect(container.container_number);
                  }}
                  sx={{ 
                    color: 'primary.main',
                    '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                  }}
                >
                  <LaunchIcon fontSize="small" />
                </IconButton>
              </StyledDataCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderContainerDetails = () => {
    if (!selectedContainer) return null;
    
    return (
      <Card sx={{ mt: 2, border: '2px solid', borderColor: getStatusColor(status), borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" sx={{ color: getStatusColor(status), fontWeight: 'bold' }}>
              Container Details: {selectedContainer.container_number}
            </Typography>
            <StatusChip 
              label={status.toUpperCase()}
              status={status}
              size="small"
            />
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Job Information</Typography>
              <Box sx={{ pl: 1, mt: 1 }}>
                <Typography variant="body2"><strong>Job No:</strong> {selectedContainer.job_no}</Typography>
                <Typography variant="body2"><strong>Job Date:</strong> {formatDate(selectedContainer.job_date)}</Typography>
                <Typography variant="body2"><strong>Importer:</strong> {selectedContainer.importer}</Typography>
                <Typography variant="body2"><strong>Supplier:</strong> {selectedContainer.supplier_exporter}</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Shipping Information</Typography>
              <Box sx={{ pl: 1, mt: 1 }}>
                <Typography variant="body2"><strong>AWB/BL No:</strong> {selectedContainer.awb_bl_no}</Typography>
                <Typography variant="body2"><strong>Vessel Berthing:</strong> {formatDate(selectedContainer.vessel_berthing)}</Typography>
                <Typography variant="body2"><strong>Discharge Date:</strong> {formatDate(selectedContainer.discharge_date)}</Typography>
                <Typography variant="body2"><strong>Shipping Line:</strong> {selectedContainer.shipping_line_airline}</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">Container Information</Typography>
              <Box sx={{ pl: 1, mt: 1 }}>
                <Typography variant="body2"><strong>Container Size:</strong> {selectedContainer.container_size}'</Typography>
                <Typography variant="body2"><strong>Net Weight (PL):</strong> {selectedContainer.net_weight_as_per_PL_document || 'N/A'}</Typography>
                <Typography variant="body2"><strong>Arrival Date:</strong> {formatDate(selectedContainer.arrival_date)}</Typography>
                <Typography variant="body2"><strong>Delivery Date:</strong> {formatDate(selectedContainer.delivery_date)}</Typography>
                <Typography variant="body2"><strong>Detention From:</strong> {formatDate(selectedContainer.detention_from)}</Typography>
                {selectedContainer.transporter && (
                  <Typography variant="body2"><strong>Transporter:</strong> {selectedContainer.transporter}</Typography>
                )}
                {selectedContainer.vehicle_no && (
                  <Typography variant="body2"><strong>Vehicle No:</strong> {selectedContainer.vehicle_no}</Typography>
                )}
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LaunchIcon />}
              onClick={() => handleTrackingRedirect(selectedContainer.container_number)}
            >
              Track Container
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedContainer(null)}
            >
              Back to List
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: '8px',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 'bold', 
        fontSize: '1.3rem',
        color: getStatusColor(status),
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalShippingIcon />
          <span>
            {status === 'arrived' ? '📦' : '🚢'} {status.charAt(0).toUpperCase() + status.slice(1)} Containers
            {size && ` (${size}')`}
          </span>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        {/* Summary Info */}
        <Box sx={{ mb: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {status} containers for year {year}
            {size && ` with size ${size}'`}
            {containers.length > 0 && ` (${containers.length} container${containers.length > 1 ? 's' : ''})`}
          </Typography>
        </Box>

        {/* Group By Controls - Added IE Code option */}
        {!loading && !error && containers.length > 0 && !selectedContainer && (
          <Box sx={{ mb: 3 }}>
            <FormControl sx={{ minWidth: 250 }}>
              <InputLabel sx={{ fontWeight: 'bold', color: '#333' }}>
                Group By
              </InputLabel>
              <Select
                value={groupBy}
                onChange={handleGroupByChange}
                label="Group By"
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }
                }}
              >
                <MenuItem value="none">No Grouping</MenuItem>
                <MenuItem value="job_no">Job Number</MenuItem>
                <MenuItem value="supplier">Supplier/Exporter</MenuItem>
                <MenuItem value="port">Port of Reporting</MenuItem>
                <MenuItem value="size">Container Size</MenuItem>
                <MenuItem value="month">Arrival Month</MenuItem>
                <MenuItem value="job_date">Job Month</MenuItem>
                <MenuItem value="ie_code">IE Code</MenuItem>
              </Select>
            </FormControl>
            <Divider sx={{ mt: 2 }} />
          </Box>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading container details...</Typography>
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Container List or Details */}
        {!loading && !error && containers.length > 0 && (
          <>
            {!selectedContainer ? (
              groupBy === 'none' ? renderContainerTable() : renderGroupedContainers()
            ) : (
              renderContainerDetails()
            )}
          </>
        )}

        {/* No Data State */}
        {!loading && !error && containers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No containers found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No {status} containers found for the selected criteria.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose}
          variant="contained"
          sx={{ 
            backgroundColor: getStatusColor(status),
            '&:hover': { 
              backgroundColor: status === 'arrived' ? '#45a049' : '#f57c00'
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContainerDetailsModal;
