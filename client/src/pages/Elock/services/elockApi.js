import axios from "axios";
import { getJsonCookie, getCookie } from "../../../utils/cookies";

const API_BASE_URL =
    process.env.REACT_APP_API_STRING;

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

const getToken = () => {
    return (
        getCookie("access_token") ||
        getCookie("refresh_token") ||
        sessionStorage.getItem("jwt_token")
    );
};

// Add token to every request if available
api.interceptors.request.use((config) => {
    // Get token from cookies via helper
    const token = getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Response interceptor to handle token expiry
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            // In a merged app, we might want to trigger a global logout or redirect
            // For now, we'll just log it or let the app handle it
            console.error("Unauthorized access in Elock module");
            // Optional: window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

// API Service functions
export const apiService = {

    // Get user data - Adapted to use existing cookie data or fetch if needed
    getUserData: async () => {
        try {
            const user = getJsonCookie("exim_user");

            // Try to fetch current user profile from new backend
            const response = await api.get("/users/current");

            if (response.data.success) {
                const userData = response.data.data.user || response.data.data;
                return {
                    success: true,
                    user: {
                        ...userData,
                        ieCodes: userData.ie_code_assignments?.map(a => a.ie_code_no) || [userData.ie_code_no].filter(Boolean),
                        ieCodeAssignments: userData.ie_code_assignments || [],
                        ieCodeNo: userData.ie_code_no || ""
                    },
                };
            }
            return { success: false, error: "Failed to fetch user profile" };
        } catch (error) {
            console.error("Failed to fetch user data via /users/current:", error);

            // Fallback: return cookie data
            const user = getJsonCookie("exim_user");
            if (user) {
                return {
                    success: true,
                    user: {
                        ...user,
                        ieCodes: user.ie_code_assignments?.map(a => a.ie_code_no) || [user.ie_code_no || user.username].filter(Boolean),
                        ieCodeNo: user.ie_code_no || user.username
                    }
                }
            }

            return { success: false, error: error.message };
        }
    },

    // MAIN E-LOCK ASSIGNMENT ENDPOINT
    getElockAssignments: async ({
        page = 1,
        limit = "",
        search = "",
        status = "",
        filterType = "",
        ieCodeNo = "",
    } = {}) => {
        try {
            const params = {
                page,
                limit,
                ...(search && { search }),
                ...(status && { status }),
                ...(filterType && { filterType }),
                ...(ieCodeNo && { ieCodeNo }),
            };

            const response = await api.get("/elock/assignments", { params });
            return response.data;
        } catch (error) {
            console.error("❌ Error fetching assignments:", error);
            throw error;
        }
    },

    // ==================== E-LOCK MANAGEMENT ENDPOINTS ====================

    getElockDetails: async (params = {}) => {
        try {
            const response = await api.get(
                `/elock-details`,
                { params }
            );
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || "Failed to fetch e-lock details",
            };
        }
    },

    getElockDetail: async (id) => {
        try {
            const response = await api.get(`/elock-details/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || "Failed to fetch e-lock detail",
            };
        }
    },

    createElockDetail: async (data) => {
        try {
            const response = await api.post("/elock-details", data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || "Failed to create e-lock detail",
            };
        }
    },

    updateElockDetail: async (id, data) => {
        try {
            const response = await api.put(`/elock-details/${id}`, data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || "Failed to update e-lock detail",
            };
        }
    },

    deleteElockDetail: async (id) => {
        try {
            const response = await api.delete(`/elock-details/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || "Failed to delete e-lock detail",
            };
        }
    },

    bulkUpdateElockStatus: async (elockIds, status) => {
        try {
            const response = await api.patch("/elock-details/bulk/status", {
                elock_ids: elockIds,
                status,
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || "Failed to update e-lock status",
            };
        }
    },

    // ==================== EXISTING ENDPOINTS ====================

    getAssetLocation: async (assetId) => {
        try {
            const response = await api.get(`/elock/location/${assetId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    unlockDevice: async (assetId) => {
        try {
            const response = await api.post(`/elock/unlock/${assetId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getServiceStatus: async () => {
        try {
            const response = await api.get("/elock/status");
            return response.data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    getElockAssignLimits: async (ieCodeNo, type) => {
        try {
            const response = await api.get("/elock/assign-limits", {
                params: { ieCodeNo, type },
            });
            return response.data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    getNotificationHistory: async (elockNo) => {
        try {
            // Using /notifications?assetIds= as proxy endpoint we created
            const response = await api.get(`/notifications`, {
                params: { assetIds: elockNo }
            });
            return response.data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    uploadElockForecast: async (file) => {
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await axios.post(
                "http://3.108.244.38:9005/api/maintenance/elock-forecast/upload",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error("❌ Error uploading elock forecast:", error);
            return {
                success: false,
                error: error.response?.data?.error || error.message || "Failed to upload forecast",
            };
        }
    }
};

export { api };
export default apiService;
