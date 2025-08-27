import React, { useEffect, useState, useCallback } from 'react';
import { SimpleHeader, SimpleCard } from './SharedComponents';
import { Calculate as CalculateIcon } from '@mui/icons-material';
import { TextField, Button, CircularProgress, Typography, Autocomplete } from '@mui/material';
import axios from 'axios';

const ImportAnalytics = () => {
  const [costAnalytics, setCostAnalytics] = useState(null);
  const [bestSuppliers, setBestSuppliers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sorting, setSorting] = useState({ field: null, direction: 'asc' });
  const [searchParams, setSearchParams] = useState({ hsCode: '', supplier: '' });
  const [searching, setSearching] = useState(false);
  
  // New state for dropdown data
  const [hsCodes, setHsCodes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  
  // Function to get user's importer name from localStorage
  const getUserImporterName = useCallback(() => {
    try {
      const userDataFromStorage = localStorage.getItem("exim_user");
      if (userDataFromStorage) {
        const parsedUser = JSON.parse(userDataFromStorage);

        return parsedUser?.assignedImporterName;
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    return null;
  }, []);

  // Function to fetch HS codes for dropdown
  const fetchHsCodes = useCallback(async () => {
    const userImporter = getUserImporterName();
     
    if (!userImporter) {
    
      return;
    }
  
    // Sanitize the importer name by replacing non-breaking spaces with regular spaces
    const sanitizedImporter = userImporter.replace(/\u00A0/g, ' ').trim();
    
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-hs-codes`,
        {
          params: { 
            importer: sanitizedImporter
          }
        }
      );
      
      // Filter out null/undefined HS codes and remove duplicates
      const uniqueHsCodes = [...new Set(res.data.filter(hsCode => hsCode && hsCode.trim() !== ''))];
      setHsCodes(uniqueHsCodes);
    } catch (error) {
      console.error("Error fetching HS codes:", error);
      setHsCodes([]);
    }
  }, [getUserImporterName]);

  // Function to fetch suppliers for dropdown
  const fetchSuppliers = useCallback(async () => {
    const userImporter = getUserImporterName();
    
    if (!userImporter) {
      console.log("Skipping suppliers fetch - no valid importer found");
      return;
    }
    
    // Sanitize the importer name by replacing non-breaking spaces with regular spaces
    const sanitizedImporter = userImporter.replace(/\u00A0/g, ' ').trim();
    
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-suppliers`,
        {
          params: { 
            importer: sanitizedImporter
          }
        }
      );
      
      // Filter out null/undefined suppliers and remove duplicates
      const uniqueSuppliers = [...new Set(res.data.filter(supplier => supplier && supplier.trim() !== ''))];
      setSuppliers(uniqueSuppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      setSuppliers([]);
    }
  }, [getUserImporterName]);

  const fetchAnalytics = async (search = {}) => {
    setSearching(true);
    try {
      const [costResponse, suppliersResponse] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/analytics/per-kg-cost`),
        axios.get(`${process.env.REACT_APP_API_STRING}/analytics/best-suppliers`, {
          params: {
            hsCode: search.hsCode || '',
            supplier: search.supplier || ''
          }
        })
      ]);

      setError(null);
      setCostAnalytics(costResponse.data.data);
      setBestSuppliers(suppliersResponse.data.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching analytics:', err);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Load dropdown data on component mount
  useEffect(() => {
    const loadDropdownData = async () => {
      setLoadingDropdowns(true);
      try {
        await Promise.all([fetchHsCodes(), fetchSuppliers()]);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    
    loadDropdownData();
  }, [fetchHsCodes, fetchSuppliers]);

  // Handle column sorting
  const handleSort = (field, data) => {
    const direction = sorting.field === field && sorting.direction === 'asc' ? 'desc' : 'asc';
    setSorting({ field, direction });

    const sortedData = [...data].sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];
      
      // Handle numeric fields
      if (['avg_per_kg_cost', 'min_avg_per_kg_cost', 'shipment_count'].includes(field)) {
        valueA = parseFloat(valueA) || 0;
        valueB = parseFloat(valueB) || 0;
      }

      if (direction === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    if (field === 'hs_code' || field === 'supplier') {
      return sortedData;
    }
    return sortedData.reverse();
  };

  const SortableHeader = ({ field, label, align = 'left' }) => (
    <th 
      style={{ 
        padding: '12px', 
        color: '#374151', 
        fontWeight: '600',
        textAlign: align,
        cursor: 'pointer',
        backgroundColor: sorting.field === field ? '#E5E7EB' : '#F3F4F6',
        transition: 'background-color 0.2s'
      }}
      onClick={() => {
        if (field.includes('best_')) {
          setBestSuppliers(handleSort(field.replace('best_', ''), bestSuppliers));
        } else {
          setCostAnalytics(handleSort(field, costAnalytics));
        }
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        gap: '4px'
      }}>
        {label}
        {sorting.field === field && (
          <span style={{ fontSize: '10px', marginLeft: '4px' }}>
            {sorting.direction === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    </th>
  );
  
  const renderSearchPanel = () => {
    return (
      <div style={{
        backgroundColor: '#F9FAFB',
        borderRadius: '4px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <Autocomplete
              size="small"
              options={["All HS Codes", ...hsCodes]}
              value={searchParams.hsCode === '' ? "All HS Codes" : searchParams.hsCode}
              onChange={(event, newValue) => {
                const value = newValue === "All HS Codes" ? '' : newValue || '';
                setSearchParams(prev => ({ ...prev, hsCode: value }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="HS Code"
                  placeholder="Select HS Code..."
                  variant="outlined"
                />
              )}
              loading={loadingDropdowns}
              isOptionEqualToValue={(option, value) => {
                if (value === "All HS Codes" && option === "All HS Codes") return true;
                if (value !== "All HS Codes" && option !== "All HS Codes" && option === value) return true;
                return false;
              }}
            />
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <Autocomplete
              size="small"
              options={["All Suppliers", ...suppliers]}
              value={searchParams.supplier === '' ? "All Suppliers" : searchParams.supplier}
              onChange={(event, newValue) => {
                const value = newValue === "All Suppliers" ? '' : newValue || '';
                setSearchParams(prev => ({ ...prev, supplier: value }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Supplier"
                  placeholder="Select Supplier..."
                  variant="outlined"
                />
              )}
              loading={loadingDropdowns}
              isOptionEqualToValue={(option, value) => {
                if (value === "All Suppliers" && option === "All Suppliers") return true;
                if (value !== "All Suppliers" && option !== "All Suppliers" && option === value) return true;
                return false;
              }}
            />
          </div>
          <div>
            <Button
              variant="contained"
              color="primary"
              onClick={() => fetchAnalytics(searchParams)}
              disabled={searching}
              style={{ height: '40px', width: '100px' }}
            >
              {searching ? <CircularProgress size={24} color="inherit" /> : 'Search'}
            </Button>
          </div>
        </div>
        {error && (
          <Typography color="error" variant="body2" style={{ marginTop: '8px' }}>
            {error}
          </Typography>
        )}
      </div>
    );
  };

  const renderLoadingOrError = () => {
    if (loading) {
      return (
        <div style={{
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          Loading analytics...
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#DC2626'
        }}>
          Error: {error}
        </div>
      );
    }

    return null;
  };

  const calculateTotals = () => {
    if (!costAnalytics?.length) return { shipments: 0, avgCost: "0.00" };

    const totalShipments = costAnalytics.reduce((sum, item) => sum + item.shipment_count, 0);
    const weightedAvgCost = costAnalytics.reduce((sum, item) => 
      sum + (item.avg_per_kg_cost * item.shipment_count), 0) / totalShipments;

    return {
      shipments: totalShipments,
      avgCost: weightedAvgCost.toFixed(2)
    };
  };

  const totals = calculateTotals();

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      marginTop: '24px'
    }}>
      <SimpleHeader bgColor="#4F46E5">
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CalculateIcon fontSize="small" />
          <span>Cost Analytics</span>
        </h2>
      </SimpleHeader>
      
      <div style={{ padding: '16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>          
          <SimpleCard bgColor="#EEF2FF">
            <div style={{ fontSize: '14px', color: '#4F46E5', marginBottom: '4px' }}>Total Shipments</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1E40AF' }}>
              {loading ? '...' : totals.shipments}
            </div>
          </SimpleCard>
          
          <SimpleCard bgColor="#ECFDF5">
            <div style={{ fontSize: '14px', color: '#059669', marginBottom: '4px' }}>Average Cost/KG</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#065F46' }}>
              {loading ? '...' : `₹ ${totals.avgCost}`}
            </div>
          </SimpleCard>
          
          <SimpleCard bgColor="#FEF3C7">
            <div style={{ fontSize: '14px', color: '#D97706', marginBottom: '4px' }}>Best Value Suppliers</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400E' }}>
              {loading ? '...' : bestSuppliers?.length || 0}
            </div>
          </SimpleCard>
        </div>

        {renderLoadingOrError() || (
          <>
            {/* Search Panel */}
            {renderSearchPanel()}

            {/* Best Suppliers Analysis */}
            <div style={{
              backgroundColor: '#F9FAFB',
              borderRadius: '4px',
              padding: '16px',
              overflowX: 'auto',
              marginBottom: '24px'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600',
                marginBottom: '12px',
                color: '#1F2937',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span role="img" aria-label="trophy">🏆</span>
                <span>Best Value Suppliers by HS Code</span>
              </h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#F3F4F6',
                    textAlign: 'left'
                  }}>
                    <SortableHeader field="best_hs_code" label="HS Code" />
                    <SortableHeader field="best_supplier" label="Best Supplier" />
                    <SortableHeader field="best_min_avg_per_kg_cost" label="Min Avg Cost/KG" align="right" />
                    <SortableHeader field="best_shipment_count" label="Shipments" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {bestSuppliers?.map((row, index) => (
                    <tr 
                      key={`${row.hs_code}-${index}`}
                      style={{
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB'
                      }}
                    >
                      <td style={{ padding: '12px', color: '#1F2937' }}>{row.hs_code || 'N/A'}</td>
                      <td style={{ padding: '12px', color: '#1F2937', fontWeight: '500' }}>{row.best_supplier || 'N/A'}</td>
                      <td style={{ padding: '12px', color: '#059669', textAlign: 'right', fontWeight: '600' }}>
                        ₹ {row.min_avg_per_kg_cost.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', color: '#6B7280', textAlign: 'right' }}>
                        {row.shipment_count}
                      </td>
                    </tr>
                  ))}
                  {(!bestSuppliers || bestSuppliers.length === 0) && (
                    <tr>
                      <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#6B7280' }}>
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* All Suppliers Analysis */}
            <div style={{
              backgroundColor: '#F9FAFB',
              borderRadius: '4px',
              padding: '16px',
              overflowX: 'auto'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600',
                marginBottom: '12px',
                color: '#1F2937'
              }}>
                All Suppliers Cost Analysis
              </h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#F3F4F6',
                    textAlign: 'left'
                  }}>
                    <SortableHeader field="hs_code" label="HS Code" />
                    <SortableHeader field="supplier" label="Supplier" />
                    <SortableHeader field="avg_per_kg_cost" label="Avg Cost/KG" align="right" />
                    <SortableHeader field="shipment_count" label="Shipments" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {costAnalytics?.map((row, index) => (
                    <tr 
                      key={`${row.hs_code}-${index}`}
                      style={{
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB'
                      }}
                    >
                      <td style={{ padding: '12px', color: '#1F2937' }}>{row.hs_code || 'N/A'}</td>
                      <td style={{ padding: '12px', color: '#1F2937' }}>{row.supplier || 'N/A'}</td>
                      <td style={{ padding: '12px', color: '#059669', textAlign: 'right' }}>
                        ₹ {row.avg_per_kg_cost.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', color: '#6B7280', textAlign: 'right' }}>
                        {row.shipment_count}
                      </td>
                    </tr>
                  ))}
                  {(!costAnalytics || costAnalytics.length === 0) && (
                    <tr>
                      <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#6B7280' }}>
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportAnalytics;
