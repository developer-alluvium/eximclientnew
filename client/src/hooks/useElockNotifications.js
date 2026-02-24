import { useState, useEffect, useRef } from 'react';
import { apiService } from '../pages/Elock/services/elockApi';
import { useImportersContext } from '../context/importersContext';
import { getJsonCookie } from '../utils/cookies';

export const useElockNotifications = () => {
  const [notificationsQueue, setNotificationsQueue] = useState([]);
  const { selectedImporter } = useImportersContext();
  const previousNotificationsRef = useRef({}); // Maps elockNo -> Set of notification IDs or latest timestamp
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    // Clear existing interval/EventSource when dependencies change
    if (pollingIntervalRef.current) {
      if (typeof pollingIntervalRef.current.close === 'function') {
        pollingIntervalRef.current.close();
      } else {
        clearInterval(pollingIntervalRef.current);
      }
      pollingIntervalRef.current = null;
    }

    const userData = getJsonCookie('exim_user');
    if (!userData) return;

    // Determine the IE code(s) to fetch assignments for based on selectedImporter
    let targetIeCodes = [];
    if (userData.ie_code_assignments && Array.isArray(userData.ie_code_assignments)) {
      if (selectedImporter && selectedImporter !== "All Importers") {
        const assignment = userData.ie_code_assignments.find(a => a.importer_name === selectedImporter);
        if (assignment && assignment.ie_code_no) {
          targetIeCodes.push(assignment.ie_code_no);
        }
      } else {
        // If no specific importer is selected, or "All Importers", get all related IE codes
        targetIeCodes = userData.ie_code_assignments.map(a => a.ie_code_no).filter(Boolean);
      }
    } else if (userData.ie_code_no) {
      targetIeCodes.push(userData.ie_code_no);
    }

    if (targetIeCodes.length === 0) return;

    // Fetch assignments and start polling
    const initializePolling = async () => {
      try {
        let allAssetIds = new Set();
        
        // Fetch assignments for all target IE codes
        for (const ieCode of targetIeCodes) {
          const response = await apiService.getElockAssignments({
            ieCodeNo: ieCode,
            limit: 1000, 
            status: 'ASSIGNED' // Only track assigned eLocks
          });
          
          if (response?.success && response?.data) {
            response.data.forEach(item => {
              const assetId = item.f_asset_id || item.elock_no;
              if (assetId) allAssetIds.add(assetId);
            });
          }
        }

        const assetIdsArray = Array.from(allAssetIds);
        if (assetIdsArray.length === 0) return;

        const assetIdsString = assetIdsArray.join(',');

        // 1. Initial fetch to populate the reference state (dont show snackbars for existing ones)
        const initialResponse = await apiService.getNotificationHistory(assetIdsString);
        let initialData = [];
        if (initialResponse && initialResponse.success !== false) {
           initialData = Array.isArray(initialResponse) ? initialResponse : (initialResponse.data || initialResponse.notifications || []);
        }

        const initialState = {};
        initialData.forEach(notif => {
            const assetId = notif.components?.assetId || notif.f_asset_id || notif.elock_no || "unknown";
            // We use time as a unique identifier if ID is missing. The API returns it in components or top level
            const timeStr = notif.components?.time || notif.createdAt; 
            const title = notif.components?.title || notif.title || "";
            const uniqueKey = `${title}_${timeStr}`;

            if (!initialState[assetId]) {
                initialState[assetId] = new Set();
            }
            initialState[assetId].add(uniqueKey);
        });
        
        previousNotificationsRef.current = initialState;

        // 2. Start SSE implementation instead of regular polling
        const baseUrl = process.env.REACT_APP_API_STRING || "http://localhost:5000/api";
        const eventSourceUrl = `${baseUrl}/notifications/stream?assetIds=${assetIdsString}`;
        const eventSource = new EventSource(eventSourceUrl, { withCredentials: true });

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                
                if (parsed.type === 'new') {
                    const pollData = parsed.data || [];
                    const newNotifications = [];
                    const currentState = { ...previousNotificationsRef.current };

                    pollData.forEach(notif => {
                        const assetId = notif.components?.assetId || notif.f_asset_id || notif.elock_no || "unknown";
                        // Try to extract elock from API string if assetId is not directly provided
                        let elockNoStr = assetId;
                        const titleRaw = notif.components?.title || notif.title || "Event";
                        
                        // The API often returns title like "8294630189: Pull out lock rope"
                        if (elockNoStr === "unknown" && titleRaw.includes(':')) {
                            elockNoStr = titleRaw.split(':')[0].trim();
                        }

                        const timeStr = notif.components?.time || notif.createdAt || new Date().toLocaleString(); 
                        let title = titleRaw;
                        if (title.includes(':')) {
                            title = title.split(':').slice(1).join(':').trim(); // Remove the elock number prefix if it exists
                        }
                        
                        const uniqueKey = `${title}_${timeStr}`;

                        if (!currentState[elockNoStr]) {
                            currentState[elockNoStr] = new Set();
                        }

                        // If we haven't seen this notification before
                        if (!currentState[elockNoStr].has(uniqueKey)) {
                            currentState[elockNoStr].add(uniqueKey);
                            
                            const titleLower = title.toLowerCase();
                            const isAlarm = titleLower.includes('alarm') || titleLower.includes('warning') || titleLower.includes('long-time') || titleLower.includes('cut') || titleLower.includes('abnormal');

                            newNotifications.push({
                                id: Math.random().toString(36).substr(2, 9), // generate temporary unique ID for React list
                                elockNo: elockNoStr,
                                title: title,
                                time: timeStr,
                                isAlarm: isAlarm
                            });
                        }
                    });

                    // Update ref with new state
                    previousNotificationsRef.current = currentState;

                    // If we found new notifications, add them to queue
                    if (newNotifications.length > 0) {
                        setNotificationsQueue(prev => [...prev, ...newNotifications]);
                    }
                }
            } catch (pollErr) {
                console.error("Error parsing SSE data:", pollErr);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE Error (reconnecting automatically expected):", err);
        };

        pollingIntervalRef.current = eventSource;

      } catch (err) {
        console.error("Failed to initialize notification polling:", err);
      }
    };

    initializePolling();

    return () => {
      if (pollingIntervalRef.current) {
        if (typeof pollingIntervalRef.current.close === 'function') {
          pollingIntervalRef.current.close();
        } else {
          clearInterval(pollingIntervalRef.current);
        }
      }
    };
  }, [selectedImporter]);

  const removeNotification = (id) => {
    setNotificationsQueue(prev => prev.filter(n => n.id !== id));
  };

  return { notificationsQueue, removeNotification };
};
