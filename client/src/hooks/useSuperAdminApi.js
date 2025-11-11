import { useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const useSuperAdminApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Helper: Verify superadmin token and user
  const verifySuperAdmin = useCallback(() => {
    const user = localStorage.getItem('superadmin_user');
    const token = localStorage.getItem('superadmin_token');
    
    if (!user || !token) {
      return false;
    }
    
    // Optional: Add token expiration check
    try {
      // If using JWT, you can decode and check expiration
      // const decoded = jwt_decode(token);
      // if (decoded.exp * 1000 < Date.now()) {
      //   return false;
      // }
      return true;
    } catch (err) {
      console.error('Token verification failed:', err);
      return false;
    }
  }, []);

  // Generic API call function
  const apiCall = useCallback(async (endpoint, method = 'GET', data = null) => {
    // Superadmin verification before API call
    if (!verifySuperAdmin()) {
      // Navigate to login page instead of dashboard
      navigate('/login');
      
      throw new Error('Authentication required');
    }

    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('superadmin_token');


      const config = {
        method,
        url: `${process.env.REACT_APP_API_STRING}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Add auth header
        },
      //  withCredentials: true,
      };

      // Only add data for non-GET requests
      if (data && method !== 'GET') {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (err) {
  console.error('API Call Error:', err.response?.status, err.response?.data);
  
  // Handle different error types
  if (err.response?.status === 401) {
    // Token expired or invalid
    localStorage.clear();
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_user');
    navigate('/login');
    throw new Error('Session expired. Please login again.');
  } else if (err.response?.status === 403) {
    // Forbidden - likely a backend authorization issue
    console.error('Access forbidden. Check backend route permissions.');
    throw new Error('Access forbidden. Please check your permissions.');
  }
  
  const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
  setError(errorMessage);
  throw err;
} finally {
      setLoading(false);
    }
  }, [navigate, verifySuperAdmin]);

  // Specific API methods
  const getDashboardAnalytics = useCallback(() => 
    apiCall('/dashboard/analytics'), [apiCall]
  );

  const getUserActivity = useCallback((type = 'active', limit = 5) => 
    apiCall(`/dashboard/user-activity?type=${type}&limit=${limit}`), [apiCall]
  );

  // OPTIMIZED: Unified customer API
  const getCustomers = useCallback((status = 'all', options = {}) => {
    const params = new URLSearchParams({ status });
    if (options.approval) params.append('approval', options.approval);
    if (options.includeKyc) params.append('includeKyc', options.includeKyc);
    
    return apiCall(`/customers?${params.toString()}`);
  }, [apiCall]);

  // DEPRECATED: Legacy methods for backward compatibility
  const getRegisteredCustomers = useCallback(() => {
    console.warn('DEPRECATED: Use getCustomers("registered") instead');
    return getCustomers('registered');
  }, [getCustomers]);

  const getInactiveCustomers = useCallback(() => {
    console.warn('DEPRECATED: Use getCustomers("inactive") instead');
    return getCustomers('inactive');
  }, [getCustomers]);

  const getKycRecords = useCallback(() => {
    console.warn('DEPRECATED: Use getCustomers("inactive", { includeKyc: true }) instead');
    return getCustomers('inactive', { includeKyc: true });
  }, [getCustomers]);

  const updateCustomerPassword = useCallback((customerId, newPassword) => 
    apiCall(`/customer/${customerId}/password`, 'PUT', { newPassword }), [apiCall]
  );

  const registerCustomer = useCallback((customerData) => 
    apiCall('/register', 'POST', customerData), [apiCall]
  );

  // Module management methods
  const getAvailableModules = useCallback(() => 
    apiCall('/modules/available'), [apiCall]
  );

  const getCustomerModuleAssignments = useCallback((customerId) => 
    apiCall(`/modules/customer/${customerId}`), [apiCall]
  );

  const updateCustomerModuleAssignments = useCallback((customerId, moduleIds) => 
    apiCall(`/modules/customer/${customerId}`, 'PUT', { assignedModules: moduleIds }), [apiCall]
  );

  const getAllCustomersWithModules = useCallback(() => 
    apiCall('/modules/customers'), [apiCall]
  );

  const bulkAssignModules = useCallback((assignments) => 
    apiCall('/modules/bulk-assign', 'POST', assignments), [apiCall]
  );

  return {
    loading,
    error,
    setError,
    // OPTIMIZED API methods
    getDashboardAnalytics,
    getUserActivity,
    getCustomers, // New unified method
    updateCustomerPassword,
    registerCustomer,
    // DEPRECATED: Legacy methods (use getCustomers instead)
    getKycRecords,
    getInactiveCustomers,
    getRegisteredCustomers,
    // Module management methods
    getAvailableModules,
    getCustomerModuleAssignments,
    updateCustomerModuleAssignments,
    getAllCustomersWithModules,
    bulkAssignModules,
    // Generic method for custom calls
    apiCall,
  };
};