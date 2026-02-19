import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Autocomplete, Alert, IconButton } from '@mui/material'; // Removed unused MenuItem
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Button, Input, message } from 'antd';
import { SaveOutlined, SettingOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import TransportTable from './TransportTable';
import { useImportersContext } from '../../context/importersContext';
import { getJsonCookie, getCookie } from '../../utils/cookies';
import '../../styles/transport.scss';

const TransportModule = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ieCodeAssignments, setIeCodeAssignments] = useState([]);
  
  // App State lifted from Table
  const [searchText, setSearchText] = useState('');
  const [columnOrder, setColumnOrder] = useState([]);
  const [isColumnOrderLoaded, setIsColumnOrderLoaded] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);

  // Context for selected importer (name)
  const { selectedImporter, setSelectedImporter } = useImportersContext();

  // Load user assignments on mount
  useEffect(() => {
    const userData = getJsonCookie("exim_user");
    if (userData && Array.isArray(userData.ie_code_assignments)) {
      const assignments = userData.ie_code_assignments || [];
      setIeCodeAssignments(assignments);
      
      // Auto-select if only one assignment
      if (!selectedImporter && assignments.length === 1) {
        setSelectedImporter(assignments[0].importer_name);
      }
    } else {
      setIeCodeAssignments([]);
    }
  }, []);

  // Fetch saved column order on mount
  useEffect(() => {
    const fetchColumnOrder = async () => {
      try {
        const token = getCookie("access_token");
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/user-management/users/transport-columns/order`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.columnOrder?.length) {
          setColumnOrder(res.data.columnOrder);
        }
      } catch (error) {
        console.error("Failed to fetch column order", error);
      } finally {
        setIsColumnOrderLoaded(true);
      }
    };
    fetchColumnOrder();
  }, []);

  // Save column order to backend
  const handleSaveLayout = async () => {
    try {
      const token = getCookie("access_token");
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/user-management/users/transport-columns/order`,
        { columnOrder },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Column layout saved successfully");
    } catch (error) {
      console.error("Failed to save column order", error);
      message.error("Failed to save layout");
    }
  };

  // Fetch data when selectedImporter changes
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedImporter) {
        setData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Find IE Code for selected importer
        const assignment = ieCodeAssignments.find(a => a.importer_name === selectedImporter);
        const ieCodeNo = assignment ? assignment.ie_code_no : null;

        if (!ieCodeNo) {
          setError("IE Code not found for selected importer");
          setLoading(false);
          return;
        }

        const token = getCookie("access_token");
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/transport/data`, {
          params: { ieCodeNo },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          // Flatten data structure logic
          let fetchedData = [];
           if (res.data.data && Array.isArray(res.data.data.data)) {
            fetchedData = res.data.data.data;
          } else if (res.data.data && Array.isArray(res.data.data)) {
             fetchedData = res.data.data;
          } else if (Array.isArray(res.data)) {
             fetchedData = res.data;
          } else {
            console.warn("Unexpected data format:", res.data);
          }
          setData(fetchedData);
        } else {
          setData([]);
        }
      } catch (err) {
        console.error("Error fetching transport data:", err);
        setError("Failed to fetch transport data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedImporter, ieCodeAssignments]);

  const handleRefresh = () => {
    const current = selectedImporter;
    setSelectedImporter(null);
    setTimeout(() => setSelectedImporter(current), 10);
  };

  return (
    <div className="transport-module-wrapper">
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => window.history.back()} size="small" sx={{ mr: 1 }}>
             <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Transport Module
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View transport details and tracking information
            </Typography>
          </Box>
        </Box>

        {/* Actions Area */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Search Input */}
           <Input 
             placeholder="Search transport..." 
             prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
             allowClear
             value={searchText}
             onChange={e => setSearchText(e.target.value)}
             style={{ width: 250 }}
           />

           {/* Toolbar Buttons */}
           <Button 
             icon={<SettingOutlined />} 
             onClick={() => setIsColumnSettingsOpen(true)}
           >
             Columns
           </Button>
           <Button 
             type="primary" 
             icon={<SaveOutlined />} 
             onClick={handleSaveLayout}
             style={{ backgroundColor: '#1E3A8A' }} 
             disabled={!isColumnOrderLoaded}
           >
             Save Layout
           </Button>

          {/* Importer Selection */}
          {ieCodeAssignments?.length > 1 && (
             <Autocomplete
             size="small"
             options={[
               "All Importers",
               ...(ieCodeAssignments?.map(
                 (assignment) => assignment.importer_name,
               ) || []),
             ]}
             value={selectedImporter || "All Importers"}
             onChange={(event, newValue) => {
               setSelectedImporter(
                 newValue === "All Importers" ? null : newValue,
               );
             }}
             sx={{
               width: { xs: "200px", sm: "250px" },
               minWidth: "150px",
               "& .MuiInputBase-input": {
                 fontSize: "0.85rem", // Match Antd input size roughly
               },
             }}
             renderInput={(params) => (
               <TextField {...params} placeholder="Select Importer" />
             )}
             isOptionEqualToValue={(option, value) => {
               if (value === "All Importers" && option === "All Importers")
                 return true;
               if (
                 value !== "All Importers" &&
                 option !== "All Importers" &&
                 option === value
               )
                 return true;
               return false;
             }}
           />
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ 
        flexGrow: 1, 
        overflowX: 'auto',
      }}>
        {/* Pass down everything needed */}
        <TransportTable 
          data={data} 
          loading={loading} 
          onRefresh={handleRefresh}
          // State props
          searchText={searchText}
          columnOrder={columnOrder}
          setColumnOrder={setColumnOrder}
          isColumnOrderLoaded={isColumnOrderLoaded}
          isColumnSettingsOpen={isColumnSettingsOpen}
          setIsColumnSettingsOpen={setIsColumnSettingsOpen}
        />
      </Box>
    </Box>
    </div>
  );
};

export default TransportModule;
