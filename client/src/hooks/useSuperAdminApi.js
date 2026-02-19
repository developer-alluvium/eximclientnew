import { useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getCookie, getJsonCookie, removeCookie } from "../utils/cookies";

export const useSuperAdminApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Helper: Verify superadmin token and user
  const verifySuperAdmin = useCallback(() => {
    const user = getJsonCookie("superadmin_user");
    const token = getCookie("superadmin_token");

    if (!user || !token) {
      return false;
    }

    try {
      return true;
    } catch (err) {
      console.error("Token verification failed:", err);
      return false;
    }
  }, []);

  // Generic API call function
  const apiCall = useCallback(
    async (endpoint, method = "GET", data = null) => {
      if (!verifySuperAdmin()) {
        navigate("/login");
        throw new Error("Authentication required");
      }

      try {
        setLoading(true);
        setError(null);

        const token = getCookie("superadmin_token");

        const config = {
          method,
          url: `${process.env.REACT_APP_API_STRING}${endpoint}`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        };

        if (data && method !== "GET") {
          config.data = data;
        }

        const response = await axios(config);
        return response.data;
      } catch (err) {
        console.error(
          "API Call Error:",
          err.response?.status,
          err.response?.data
        );

        if (err.response?.status === 401) {
          removeCookie("superadmin_token");
          removeCookie("superadmin_user");
          navigate("/login");
          throw new Error("Session expired. Please login again.");
        } else if (err.response?.status === 403) {
          console.error("Access forbidden. Check backend route permissions.");
          throw new Error("Access forbidden. Please check your permissions.");
        }

        const errorMessage =
          err.response?.data?.message || err.message || "An error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [navigate, verifySuperAdmin]
  );

  // Specific API methods
  const getDashboardAnalytics = useCallback(
    () => apiCall("/dashboard/analytics"),
    [apiCall]
  );

  const getUserActivity = useCallback(
    (type = "active", limit = 5) =>
      apiCall(`/dashboard/user-activity?type=${type}&limit=${limit}`),
    [apiCall]
  );

  const getClientEngagement = useCallback(
    () => apiCall("/dashboard/client-engagement"),
    [apiCall]
  );

  const getJobsBreakdown = useCallback(
    () => apiCall("/dashboard/jobs-breakdown"),
    [apiCall]
  );

  // Module management methods
  const getAvailableModules = useCallback(
    () => apiCall("/modules/available"),
    [apiCall]
  );

  const getCustomerModuleAssignments = useCallback(
    (customerId) => apiCall(`/modules/customer/${customerId}`),
    [apiCall]
  );

  const updateCustomerModuleAssignments = useCallback(
    (customerId, moduleIds) =>
      apiCall(`/modules/customer/${customerId}`, "PUT", {
        assignedModules: moduleIds,
      }),
    [apiCall]
  );

  const getAllCustomersWithModules = useCallback(
    () => apiCall("/modules/customers"),
    [apiCall]
  );

  const bulkAssignModules = useCallback(
    (assignments) => apiCall("/modules/bulk-assign", "POST", assignments),
    [apiCall]
  );

  return {
    loading,
    error,
    setError,
    getDashboardAnalytics,
    getUserActivity,
    getClientEngagement,
    getJobsBreakdown,
    getAvailableModules,
    getCustomerModuleAssignments,
    updateCustomerModuleAssignments,
    getAllCustomersWithModules,
    bulkAssignModules,
    apiCall,
  };
};
