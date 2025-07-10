import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Box, Alert } from '@mui/material';
import { useSuperAdminApi } from '../hooks/useSuperAdminApi';

// Import components
import ModernCustomerDetailView from '../components/SuperAdmin/ModernCustomerDetailView';
import LoadingScreen from '../components/SuperAdmin/LoadingScreen';

const SuperAdminCustomerDetail = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();

  // Get context from parent layout
  const outletContext = useOutletContext() || {};

  // Use custom hook for API calls
  const { 
    loading, 
    error, 
    setError,
    getCustomers
  } = useSuperAdminApi();

  // State management
  const [customer, setCustomer] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      setDataLoading(true);
      const response = await getCustomers();
      const customers = response.data || [];
      const foundCustomer = customers.find(c => c._id === customerId);
      
      if (foundCustomer) {
        setCustomer(foundCustomer);
      } else {
        setError('Customer not found');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Failed to fetch customer data');
    } finally {
      setDataLoading(false);
    }
  };



  const handleBack = () => {
    navigate('/superadmin-dashboard');
  };

  // Loading screen
  if (dataLoading) {
    return <LoadingScreen />;
  }

  if (!customer) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%',
        p: 3
      }}>
        <Alert severity="error">
          Customer not found
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      p: 0
    }}>
      <ModernCustomerDetailView 
        customer={customer} 
        onBack={handleBack}
        onRefresh={fetchCustomerData}
      />
    </Box>
  );
};

export default SuperAdminCustomerDetail;
