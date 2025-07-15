import { useState, useCallback } from 'react';
import axios from 'axios';

export const useSuperAdminApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generic API call function
  const apiCall = useCallback(async (endpoint, method = 'GET', data = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get superadmin token from localStorage
      const token = localStorage.getItem('superadmin_token');
      const config = {
        method,
        url: `${process.env.REACT_APP_API_STRING}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        withCredentials: true,
      };

      if (data && method !== 'GET') {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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
