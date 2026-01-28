import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Typography,
  Box,
  IconButton,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  TextField,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Close as CloseIcon,
  BatteryStd as BatteryIcon,
  SignalCellularAlt as SignalIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  History as HistoryIcon,
  RadioButtonChecked as LiveIcon,
  RadioButtonUnchecked as OfflineIcon,
  GpsFixed as GpsIcon,
  MyLocation as LocationIcon,
  Speed as SpeedIcon,
  Navigation as DirectionIcon,
  Explore as CompassIcon,
  DeviceThermostat as ThermostatIcon,
  WaterDrop as HumidityIcon,
  LocalGasStation as FuelIcon,
  Person as PersonIcon,
  NetworkCell as NetworkIcon,
  CellTower as TowerIcon,
  Wifi as WifiIcon,
  SensorDoor as DoorIcon,
  CarRepair as MotorIcon,
  ElectricCar as AccIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  AccessTime as TimeIcon,
  Radar as RadarIcon,
  Satellite as SatelliteIcon,
  PhoneAndroid as DeviceIcon,
  Security as SecurityIcon,
  Sensors as SensorIcon,
  ElectricalServices as VoltageIcon,
  CellWifi as CellSignalIcon,
  Router as RouterIcon,
  Shield as ShieldIcon,
  Vibration as ShakeIcon,
  BatteryAlert as BatteryAlertIcon,
  Wifi as OnlineIcon,
  OfflineBolt as OfflineIconAlt,
  FlashOn as FlashIcon,
  DataUsage as DataIcon,
  Memory as MemoryIcon,
  Anchor as AnchorIcon,
  Map as MapIcon,
  LocationOn as LocationOnIcon,
  RadioButtonChecked as PulseIcon,
  StopCircle as StopIcon,
  Update as UpdateIcon,
  Settings as SettingsIcon,
  Build as BuildIcon,
  SignalCellular4Bar as StatusIcon,
  ControlCamera as ControlsIcon,
  CleaningServices as CleaningServicesIcon,
} from "@mui/icons-material";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import truckIcon from "../assets/images/truckLong.svg";
import { io } from "socket.io-client";
import { getJsonCookie } from "../../../utils/cookies";

// Enhanced CSS for advanced animations and effects
const advancedAnimations = `
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes glow {
    0% { box-shadow: 0 0 5px rgba(76, 175, 80, 0.5); }
    50% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.8), 0 0 30px rgba(76, 175, 80, 0.6); }
    100% { box-shadow: 0 0 5px rgba(76, 175, 80, 0.5); }
  }
  
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    60% { transform: translateY(-5px); }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(2px); }
  }
  
  @keyframes slideIn {
    0% { transform: translateX(-100%); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes fadeInUp {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes heartbeat {
    0% { transform: scale(1); }
    14% { transform: scale(1.1); }
    28% { transform: scale(1); }
    42% { transform: scale(1.1); }
    70% { transform: scale(1); }
  }
  
  @keyframes signal {
    0% { opacity: 1; }
    25% { opacity: 0.3; }
    50% { opacity: 0.7; }
    75% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  
  @keyframes colorShift {
    0% { color: #2196F3; }
    25% { color: #4CAF50; }
    50% { color: #FF9800; }
    75% { color: #9C27B0; }
    100% { color: #2196F3; }
  }
  
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
    100% { transform: translateY(0px); }
  }
  
  @keyframes ripple {
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(4); opacity: 0; }
  }

  @keyframes neonGlow {
    0% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.8); }
    50% { text-shadow: 0 0 20px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8); }
    100% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.8); }
  }

  @keyframes dataFlow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes scanLine {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  @keyframes breathe {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.02); opacity: 1; }
  }
  
  .pulse-animation { animation: pulse 2s infinite; }
  .glow-animation { animation: glow 2s infinite; }
  .bounce-animation { animation: bounce 2s infinite; }
  .spin-animation { animation: spin 2s linear infinite; }
  .shake-animation { animation: shake 0.5s infinite; }
  .slide-in-animation { animation: slideIn 0.5s ease-out; }
  .fade-in-up-animation { animation: fadeInUp 0.5s ease-out; }
  .heartbeat-animation { animation: heartbeat 1.5s infinite; }
  .signal-animation { animation: signal 2s infinite; }
  .color-shift-animation { animation: colorShift 3s infinite; }
  .float-animation { animation: float 3s ease-in-out infinite; }
  .ripple-animation { animation: ripple 0.6s linear; }
  .neon-glow-animation { animation: neonGlow 2s infinite; }
  .data-flow-animation { 
    background: linear-gradient(90deg, transparent, rgba(33, 150, 243, 0.3), transparent);
    background-size: 200% 100%;
    animation: dataFlow 2s infinite;
  }
  .scan-line-animation { animation: scanLine 2s infinite; }
  .breathe-animation { animation: breathe 3s infinite; }

  /* Advanced hover effects */
  .advanced-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .advanced-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  }
  
  .advanced-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }
  
  .advanced-card:hover::before {
    left: 100%;
  }

  /* Real-time status indicators */
  .status-online {
    background: radial-gradient(circle, rgba(76, 175, 80, 0.3) 0%, transparent 70%);
    animation: pulse 2s infinite;
  }
  
  .status-offline {
    background: radial-gradient(circle, rgba(244, 67, 54, 0.3) 0%, transparent 70%);
    animation: heartbeat 2s infinite;
  }

  /* Interactive elements */
  .interactive-icon {
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .interactive-icon:hover {
    transform: scale(1.2) rotate(15deg);
    filter: drop-shadow(0 0 8px rgba(33, 150, 243, 0.8));
  }
`;

// Time range options
const timeRangeOptions = [
  { value: "6h", label: "6 Hours Ago", hours: 6 },
  { value: "12h", label: "12 Hours Ago", hours: 12 },
  { value: "1d", label: "1 Day", hours: 24 },
  { value: "3d", label: "3 Days", hours: 72 },
  { value: "8d", label: "8 Days", hours: 192 },
  { value: "15d", label: "15 Days", hours: 360 },
  { value: "1m", label: "1 Month", hours: 720 },
  { value: "custom", label: "Custom Range", hours: 0 },
];
const SERVER_URL = process.env.REACT_APP_API_STRING || "http://15.207.11.214:5004/api";
const getTimeRange = (
  selectedRange,
  customStartTime = null,
  customEndTime = null
) => {
  const now = new Date();

  if (selectedRange === "custom" && customStartTime && customEndTime) {
    return {
      start: new Date(customStartTime).toISOString(),
      end: new Date(customEndTime).toISOString(),
    };
  }

  const option = timeRangeOptions.find((opt) => opt.value === selectedRange);
  const startTime = new Date(now.getTime() - option.hours * 60 * 60 * 1000);

  return {
    start: startTime.toISOString(),
    end: now.toISOString(),
  };
};


const ElockGPSOperation = ({ isOpen, onClose, elockNo }) => {
  // Inject CSS for advanced animations
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = advancedAnimations;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [loading, setLoading] = useState(false);
  const [assetData, setAssetData] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [assignmentData, setAssignmentData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("6h");
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [error, setError] = useState(null);
  const [mapUrl, setMapUrl] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Real-time tracking state
  const [currentTab, setCurrentTab] = useState(0);
  const [realTimeData, setRealTimeData] = useState(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);

  // Function to fetch assignment data and store in assignmentData state
  const fetchAssignmentData = useCallback(async () => {
    if (!elockNo) return;
    try {
      const user = getJsonCookie('exim_user');
      const token = user?.token;
      if (!token) {
        setError('No authentication token found');
        return;
      }
      const headers = {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json'
      };
      const assignmentResponse = await fetch(
        `${SERVER_URL}/elock/assignments?limit=1&elock_no=${elockNo}`,
        { headers }
      );
      const assignmentResult = await assignmentResponse.json();
      if (assignmentResult.success && assignmentResult.data && assignmentResult.data.length > 0) {
        setAssignmentData(assignmentResult.data[0]);
      } else {
        setAssignmentData(null);
      }
    } catch (err) {
      setError('Failed to fetch assignment data');
      setAssignmentData(null);
    }
  }, [elockNo, SERVER_URL]);

  // Fetch assignment data whenever elockNo changes
  useEffect(() => {
    fetchAssignmentData();
  }, [elockNo, fetchAssignmentData]);

  // --- Socket.IO client for /elock namespace ---
  useEffect(() => {
    // Dynamically import socket.io-client to avoid SSR issues
    let isMounted = true;
    import('socket.io-client').then(({ io }) => {
      // const socket = io('http://localhost:5004/elock', {
      //   transports: ['websocket', 'polling'],
      //   // Add auth/options if needed
      // });

      const socket = io('http://15.207.11.214:5004/elock', {
        transports: ['websocket', 'polling'],
        // Add auth/options if needed
      });
      socketRef.current = socket;
      socket.on('connect', () => {
        if (isMounted) setIsRealTimeConnected(true);
        console.log('Connected to /elock namespace:', socket.id);
      });
      socket.on('disconnect', () => {
        if (isMounted) setIsRealTimeConnected(false);
        console.log('Disconnected from /elock namespace');
      });
      // Example: listen for real-time updates
      socket.on('realTimeUpdate', (data) => {
        if (isMounted) setRealTimeUpdates((prev) => [...prev, data]);
      });
    });
    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Use refs to prevent excessive API calls
  const timeRangeRef = useRef(timeRange);
  const historyFetchedRef = useRef(false);
  const socketRef = useRef(null);

  const TOKEN_ID = "e36d2589-9dc3-4302-be7d-dc239af1846c";
  const ADMIN_API_URL = "http://icloud.assetscontrols.com:8092/OpenApi/Admin";
  const LBS_API_URL = "http://icloud.assetscontrols.com:8092/OpenApi/LBS";



  // Real-time tracking functions
  const connectToRealTimeTracking = useCallback(() => {
    if (socketRef.current || !elockNo) {
      console.log("🚫 Connection skipped:", {
        socketExists: !!socketRef.current,
        elockNo: elockNo,
        reason: !elockNo ? "No elock number" : "Socket already exists",
      });
      return;
    }

    console.log(`🔌 [ELOCK-GPS] Initiating real-time tracking connection...`, {
      device: elockNo,
      serverUrl: SERVER_URL,
      timestamp: new Date().toISOString(),
    });

    const newSocket = io(SERVER_URL, {
      transports: ["polling", "websocket"], // Start with polling, then upgrade to websocket
      timeout: 45000, // Match server connectTimeout
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000, // Increased delay
      reconnectionAttempts: 3, // Reduced attempts to avoid spam
      randomizationFactor: 0.5,
      upgrade: true, // Allow transport upgrades
      rememberUpgrade: false, // Don't remember upgrade choice
    });

    socketRef.current = newSocket;
    console.log(
      `📡 [SOCKET] Socket.IO instance created for device ${elockNo}`,
      {
        socketId: newSocket.id,
        connected: newSocket.connected,
        transport: newSocket.io.engine?.transport?.name,
      }
    );

    newSocket.on("connect", () => {
      console.log("✅ [CONNECTION] WebSocket connected successfully!", {
        socketId: newSocket.id,
        device: elockNo,
        transport: newSocket.io.engine?.transport?.name,
        timestamp: new Date().toISOString(),
        uptime: 0,
      });
      setIsRealTimeConnected(true);

      // Start tracking this device
      console.log(`🎯 [TRACKING] Starting device tracking for ${elockNo}`);
      newSocket.emit("startTracking", { deviceId: elockNo });

      // Also emit other tracking events
      newSocket.emit("join-elock-tracking");
      newSocket.emit("join-device-room", elockNo);

      console.log(`📤 [EMIT] Sent tracking events:`, {
        startTracking: { deviceId: elockNo },
        joinElockTracking: true,
        joinDeviceRoom: elockNo,
      });
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ [CONNECTION-ERROR] Socket.IO connection failed:", {
        error: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
        timestamp: new Date().toISOString(),
        serverUrl: SERVER_URL,
      });
      setError(`Connection failed: ${error.message}`);
    });

    newSocket.on("disconnect", (reason, details) => {
      console.log("❌ [DISCONNECT] WebSocket disconnected:", {
        reason: reason,
        details: details,
        timestamp: new Date().toISOString(),
      });
      setIsRealTimeConnected(false);
    });

    newSocket.on("reconnect", (attemptNumber) => {
      console.log("🔄 [RECONNECT] Reconnected after attempts:", attemptNumber);
      setIsRealTimeConnected(true);
    });

    newSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log(
        "🔄 [RECONNECT-ATTEMPT] Attempting to reconnect:",
        attemptNumber
      );
    });

    newSocket.on("reconnect_error", (error) => {
      console.error("❌ [RECONNECT-ERROR] Reconnection failed:", error);
    });

    newSocket.on("reconnect_failed", () => {
      console.error(
        "❌ [RECONNECT-FAILED] Failed to reconnect after all attempts"
      );
      setError("Failed to reconnect to server");
    });

    // Handle all socket event types from your response
    // Original events
    newSocket.on("positionUpdate", (data) => {
      console.log("📍 positionUpdate:", data);
      handleRealTimeUpdate(data, "positionUpdate");
    });

    newSocket.on("statusUpdate", (data) => {
      console.log("📊 statusUpdate:", data);
      handleRealTimeUpdate(data, "statusUpdate");
    });

    newSocket.on("alarm", (data) => {
      console.log("🚨 alarm:", data);
      handleRealTimeUpdate(data, "alarm");
    });

    // New events from your socket response
    newSocket.on("device-position", (data) => {
      console.log("📍 device-position:", data);
      handleRealTimeUpdate(data, "device-position");
    });

    newSocket.on("device-status", (data) => {
      console.log("📊 device-status:", data);
      handleRealTimeUpdate(data, "device-status");
    });

    newSocket.on("status-update", (data) => {
      console.log("📊 status-update:", data);
      handleRealTimeUpdate(data, "status-update");
    });

    // Generic handler function for all real-time updates
    const handleRealTimeUpdate = (data, eventType) => {
      if (data.deviceId === elockNo) {
        const updateTime = new Date().toLocaleString();
        const newUpdate = {
          ...data,
          timestamp: updateTime,
          type: eventType,
          rawData: JSON.stringify(data, null, 2), // Store raw JSON for inspection
        };

        setRealTimeData(newUpdate);
        setRealTimeUpdates((prev) => [newUpdate, ...prev.slice(0, 49)]);

        // Update location data for the map (only for position events)
        if (eventType.includes("position") || eventType === "positionUpdate") {
          setLocationData((prevLocation) => ({
            ...prevLocation,
            FLatitude: data.latitude,
            FLongitude: data.longitude,
            FSpeed: data.speed,
            FDirection: data.direction,
            FBattery: parseInt(data.battery) || 0,
            FGPSTime: data.gpsTime,
            FRecvTime: data.receivedTime,
            FOnline: data.online ? 1 : 0,
            FLocationType: data.locationType,
            FLockStatus: data.lockStatus,
            FAlarm: data.alarm,
            FGPSSignal: data.signals?.gps,
            FCellSignal: data.signals?.cell,
            FMCC: data.network?.mcc,
            FMNC: data.network?.mnc,
            FLAC: data.network?.lac,
            FCELLID: data.network?.cellId,
            FAwaken: data.awaken,
            FLockRope: data.vehicle?.lockRope,
            FACC: data.vehicle?.acc,
            FMotor: data.vehicle?.motor,
            FDoor: data.vehicle?.door,
            FFuelCut: data.vehicle?.fuelCut,
            // Extended properties
            FExpandProto: data.extended
              ? {
                FDesc: JSON.stringify(data.extended),
              }
              : null,
            // Temperature sensors
            FTemperature1: data.sensors?.temperature?.[0] || -1000,
            FTemperature2: data.sensors?.temperature?.[1] || -1000,
            FTemperature3: data.sensors?.temperature?.[2] || -1000,
            FTemperature4: data.sensors?.temperature?.[3] || -1000,
            FTemperature5: data.sensors?.temperature?.[4] || -1000,
            FTemperature6: data.sensors?.temperature?.[5] || -1000,
            // Humidity sensors
            FHumidity1: data.sensors?.humidity?.[0] || 0,
            FHumidity2: data.sensors?.humidity?.[1] || 0,
            FHumidity3: data.sensors?.humidity?.[2] || 0,
            FHumidity4: data.sensors?.humidity?.[3] || 0,
            FHumidity5: data.sensors?.humidity?.[4] || 0,
            FHumidity6: data.sensors?.humidity?.[5] || 0,
            // Fuel sensors
            FFuel1: data.sensors?.fuel?.[0] || 0,
            FFuel2: data.sensors?.fuel?.[1] || 0,
            FFuel3: data.sensors?.fuel?.[2] || 0,
          }));
        }
      }
    };

    newSocket.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
      setError(`Real-time tracking error: ${error.message}`);
    });
  }, [elockNo]);

  const disconnectFromRealTimeTracking = useCallback(() => {
    if (socketRef.current) {
      console.log("Disconnecting from real-time tracking");

      // Stop tracking this device
      socketRef.current.emit("stopTracking", { deviceId: elockNo });

      socketRef.current.disconnect();
      socketRef.current = null;
      setIsRealTimeConnected(false);
      setRealTimeData(null);
    }
  }, [elockNo]);

  // Handle tab change with enhanced animations
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // Do not disconnect real-time tracking on tab switch
    // Only handle tab-specific logic here
    // ...existing code for real-time tab if needed...
  };

  // Custom truck icon for the map
  // const customTruckIcon = L.icon({
  //   iconUrl: truckIcon,
  //   iconSize: [40, 40],
  //   iconAnchor: [20, 20],
  //   popupAnchor: [0, -20],
  // });
  const fetchHistoryData = useCallback(async () => {
    if (!assetData?.FGUID) return;

    setHistoryLoading(true);
    try {
      const { start, end } = getTimeRange(
        timeRange,
        customStartTime,
        customEndTime
      );

      const response = await fetch(LBS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FTokenID: TOKEN_ID,
          FAction: "QueryLBSTrackListByFGUID",
          FGUID: assetData.FGUID,
          FType: 2,
          FAssetTypeID: 3701,
          FStartTime: start,
          FEndTime: end,
          FLanguage: 0,
          FDateType: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`History request failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.Result === 200 && result.FObject) {
        setHistoryData(result.FObject);
      } else {
        setHistoryData([]);
      }
      historyFetchedRef.current = true;
    } catch (err) {
      console.error("History fetch error:", err);
      setError(`Failed to fetch history data: ${err.message}`);
    } finally {
      setHistoryLoading(false);
    }
  }, [assetData?.FGUID, timeRange, customStartTime, customEndTime]);

  // Only fetch history data when asset data is available for the first time
  useEffect(() => {
    if (assetData?.FGUID && !historyFetchedRef.current) {
      fetchHistoryData();
    }
  }, [assetData?.FGUID, fetchHistoryData]);


  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }; // Optimized time range change handler with debouncing
  const handleTimeRangeChange = (event) => {
    const newTimeRange = event.target.value;
    setTimeRange(newTimeRange);
    timeRangeRef.current = newTimeRange;

    // Clear any existing timeout
    if (window.timeRangeTimeout) {
      clearTimeout(window.timeRangeTimeout);
    }

    // If custom range is selected, set default values
    if (newTimeRange === "custom") {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Set default values if not already set
      if (!customStartTime) {
        setCustomStartTime(twentyFourHoursAgo.toISOString().slice(0, 16));
      }
      if (!customEndTime) {
        setCustomEndTime(now.toISOString().slice(0, 16));
      }
      return;
    }

    // Clear custom time values when switching away from custom
    if (customStartTime || customEndTime) {
      setCustomStartTime("");
      setCustomEndTime("");
    }

    // Debounce the API call by 500ms
    window.timeRangeTimeout = setTimeout(() => {
      if (assetData?.FGUID && timeRangeRef.current === newTimeRange) {
        fetchHistoryData();
      }
    }, 500);
  };
  // Handle custom date/time input changes
  const handleCustomStartTimeChange = (event) => {
    setCustomStartTime(event.target.value);
  };

  const handleCustomEndTimeChange = (event) => {
    setCustomEndTime(event.target.value);
  };
  // Apply custom time range
  const handleApplyCustomRange = () => {
    if (!customStartTime || !customEndTime) {
      setError("Please select both start and end date/time");
      return;
    }

    const startDate = new Date(customStartTime);
    const endDate = new Date(customEndTime);

    if (startDate >= endDate) {
      setError("Start time must be before end time");
      return;
    }

    if (endDate > new Date()) {
      setError("End time cannot be in the future");
      return;
    }

    // Check if the date range is reasonable (not more than 30 days)
    const diffInDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (diffInDays > 30) {
      setError("Date range cannot exceed 30 days");
      return;
    }

    setError(null);
    fetchHistoryData();
  };

  // Reset custom time inputs to default values
  const handleResetCustomRange = () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    setCustomStartTime(twentyFourHoursAgo.toISOString().slice(0, 16));
    setCustomEndTime(now.toISOString().slice(0, 16));
    setError(null);
  };
  const fetchAssetData = useCallback(async () => {
    if (!elockNo) {
      setError("No E-lock number provided");
      return;
    }

    setLoading(true);
    setError(null);
    setAssetData(null);
    setLocationData(null);
    setHistoryData([]);
    setTimeRange("6h"); // Reset to default time range
    setCustomStartTime(""); // Clear custom inputs
    setCustomEndTime(""); // Clear custom inputs
    historyFetchedRef.current = false;

    try {
      // Fetch asset information
      const assetResponse = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FAction: "QueryAdminAssetByAssetId",
          FTokenID: TOKEN_ID,
          FAssetID: elockNo,
        }),
      });

      if (!assetResponse.ok) {
        throw new Error(`Asset request failed: ${assetResponse.statusText}`);
      }

      const assetResult = await assetResponse.json();
      if (!assetResult.FObject?.length) {
        throw new Error("No asset data found");
      }

      const assetInfo = assetResult.FObject[0];
      setAssetData(assetInfo);

      // Fetch location information
      const locationResponse = await fetch(LBS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FAction: "QueryLBSMonitorListByFGUIDs",
          FTokenID: TOKEN_ID,
          FGUIDs: assetInfo.FGUID,
          FType: 2,
        }),
      });

      if (!locationResponse.ok) {
        throw new Error(
          `Location request failed: ${locationResponse.statusText}`
        );
      }

      const locationResult = await locationResponse.json();
      if (!locationResult.FObject?.length) {
        throw new Error("No location data found");
      }

      const locationInfo = locationResult.FObject[0];
      setLocationData(locationInfo);

      // Set Google Maps URL
      setMapUrl(
        `https://www.google.com/maps?q=${locationInfo.FLatitude},${locationInfo.FLongitude}`
      );
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch E-lock data");
    } finally {
      setLoading(false);
    }
  }, [elockNo]);
  console.log("LOCATION DATA", locationData);
  useEffect(() => {
    if (isOpen && elockNo) {
      fetchAssetData();
    } else if (!isOpen) {
      // Cleanup when dialog closes
      disconnectFromRealTimeTracking();
      setCurrentTab(0);
      setRealTimeUpdates([]);
    }
  }, [isOpen, elockNo, fetchAssetData, disconnectFromRealTimeTracking]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (window.timeRangeTimeout) {
        clearTimeout(window.timeRangeTimeout);
      }
      disconnectFromRealTimeTracking();
    };
  }, [disconnectFromRealTimeTracking]);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusChip = (online) => {
    return (
      <Chip
        label={online === 1 ? "Online" : "Offline"}
        color={online === 1 ? "success" : "error"}
        size="small"
      />
    );
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { maxHeight: "90vh" } }}
    >
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          gap={2}
          sx={{ position: "relative", overflow: "hidden" }}
        >
          {/* Animated background gradient */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "linear-gradient(45deg, rgba(33, 150, 243, 0.1) 25%, transparent 25%, transparent 75%, rgba(33, 150, 243, 0.1) 75%)",
              backgroundSize: "40px 40px",
              animation: "float 8s ease-in-out infinite",
              opacity: 0.3,
              zIndex: 0,
            }}
          />

          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              gap: 2,
              width: "100%",
            }}
          >
            <SatelliteIcon
              sx={{
                color: "primary.main",
                fontSize: 32,
                animation: "spin 4s linear infinite",
              }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", color: "primary.main" }}
              >
                🛰️ E-Lock GPS Operation
              </Typography>
              <Chip
                icon={<DeviceIcon className="pulse-animation" />}
                label={elockNo}
                color="primary"
                variant="outlined"
                sx={{
                  fontWeight: "bold",
                  animation: "glow 2s infinite",
                }}
              />
            </Box>

            {/* Connection Status Indicator */}
            <Box
              sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}
            >
              {isRealTimeConnected ? (
                <Chip
                  icon={<OnlineIcon className="pulse-animation" />}
                  label="LIVE"
                  color="success"
                  size="small"
                  sx={{ animation: "glow 2s infinite" }}
                />
              ) : (
                <Chip
                  icon={<OfflineIconAlt />}
                  label="STATIC"
                  color="warning"
                  size="small"
                />
              )}
            </Box>
          </Box>

          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              zIndex: 2,
              "&:hover": {
                animation: "spin 0.5s ease",
                bgcolor: "error.light",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 4,
              bgcolor: "rgba(33, 150, 243, 0.05)",
              borderRadius: 2,
              border: "1px solid rgba(33, 150, 243, 0.2)",
            }}
            className="fade-in-up-animation"
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <CircularProgress
                size={32}
                sx={{
                  color: "primary.main",
                  animation: "pulse 2s infinite",
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  sx={{ color: "primary.main", fontWeight: "bold" }}
                >
                  Loading GPS data...
                </Typography>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mt: 1 }}
                >
                  <SatelliteIcon
                    sx={{
                      color: "info.main",
                      fontSize: 16,
                      animation: "spin 2s linear infinite",
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Fetching real-time location and device status
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              border: "1px solid",
              borderColor: "error.main",
              borderRadius: 2,
              animation: "shake 0.5s ease",
            }}
            icon={<ErrorIcon sx={{ animation: "shake 0.5s infinite" }} />}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                ⚠️ GPS Operation Error
              </Typography>
              <Typography variant="body2">{error}</Typography>
            </Stack>
          </Alert>
        )}

        {assetData && locationData && (
          <Stack spacing={3}>
            {/* Enhanced Tabs with Animations */}
            <Box
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "rgba(0, 0, 0, 0.02)",
                borderRadius: "8px 8px 0 0",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Tab background animation */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    "linear-gradient(90deg, rgba(33, 150, 243, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)",
                  animation: "float 6s ease-in-out infinite",
                }}
              />

              <Tabs
                value={currentTab}
                onChange={handleTabChange}
                sx={{
                  position: "relative",
                  zIndex: 1,
                  "& .MuiTab-root": {
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                    },
                  },
                }}
              >
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <HistoryIcon
                        className={currentTab === 0 ? "bounce-animation" : ""}
                      />
                      <span>📊 Static Information</span>
                    </Stack>
                  }
                />
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LiveIcon
                        color={isRealTimeConnected ? "success" : "disabled"}
                        className={isRealTimeConnected ? "pulse-animation" : ""}
                      />
                      <span>🔴 Real-Time Tracking</span>
                      {isRealTimeConnected && (
                        <Badge
                          color="success"
                          variant="dot"
                          sx={{
                            "& .MuiBadge-dot": {
                              animation: "pulse 2s infinite",
                            },
                          }}
                        />
                      )}
                    </Stack>
                  }
                />
              </Tabs>
            </Box>

            {/* Tab Content */}
            {currentTab === 0 && (
              <Box>
                {/* Existing static content */}
                {/* Enhanced Asset Information */}
                <Box
                  sx={{
                    p: 3,
                    bgcolor:
                      "linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%)",
                    borderRadius: 2,
                    border: "1px solid rgba(76, 175, 80, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  className="fade-in-up-animation"
                >
                  {/* Background animation */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background:
                        "linear-gradient(45deg, rgba(76, 175, 80, 0.1) 25%, transparent 25%, transparent 75%, rgba(76, 175, 80, 0.1) 75%)",
                      backgroundSize: "30px 30px",
                      animation: "float 8s ease-in-out infinite",
                      opacity: 0.3,
                    }}
                  />

                  <Box sx={{ position: "relative", zIndex: 1 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      sx={{ mb: 3 }}
                    >
                      <DeviceIcon
                        sx={{
                          color: "success.main",
                          fontSize: 28,
                          animation: "heartbeat 2s infinite",
                        }}
                      />
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: "bold", color: "success.main" }}
                      >
                        🏷️ Asset Information
                      </Typography>
                      <Chip
                        icon={<InfoIcon />}
                        label="DEVICE INFO"
                        color="success"
                        size="small"
                        className="glow-animation"
                      />
                    </Stack>

                    <Grid container spacing={3}>
                      <Grid item xs={6} md={3}>
                        <Box
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.8)",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid rgba(33, 150, 243, 0.2)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <SecurityIcon
                              sx={{ color: "primary.main", fontSize: 18 }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "500" }}
                            >
                              E-Lock No.
                            </Typography>
                          </Stack>
                          <Typography
                            variant="h6"
                            sx={{ color: "primary.main", fontWeight: "bold" }}
                          >
                            {assetData.FAssetID}
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <Box
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.8)",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid rgba(255, 152, 0, 0.2)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <DirectionIcon
                              sx={{
                                color: "warning.main",
                                fontSize: 18,
                                animation: "spin 4s linear infinite",
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "500" }}
                            >
                              Vehicle Number
                            </Typography>
                          </Stack>
                          <Typography
                            variant="h6"
                            sx={{ color: "warning.main", fontWeight: "bold" }}
                          >
                            {assignmentData?.vehicle_no || "N/A"}
                          </Typography>
                        </Box>
                      </Grid>



                      <Grid item xs={6} md={3}>
                        <Box
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.8)",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid rgba(156, 39, 176, 0.2)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <PersonIcon
                              sx={{ color: "secondary.main", fontSize: 18 }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "500" }}
                            >
                              Agent
                            </Typography>
                          </Stack>
                          <Typography
                            variant="h6"
                            sx={{ color: "secondary.main", fontWeight: "bold" }}
                          >
                            {/* //{assetData.FAgentName} */}
                            Novusha Consulting Services India LLP
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <Box
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.8)",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid rgba(244, 67, 54, 0.2)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <TimeIcon
                              sx={{
                                color: "error.main",
                                fontSize: 18,
                                animation: "pulse 2s infinite",
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "500" }}
                            >
                              Expire Time
                            </Typography>
                          </Stack>
                          <Typography
                            variant="h6"
                            sx={{ color: "error.main", fontWeight: "bold" }}
                          >
                            {formatDateTime(assetData.FExpireTime)}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
                {/* Enhanced GPS Location Information */}
                <Box
                  sx={{
                    p: 3,
                    bgcolor:
                      "linear-gradient(135deg, #e3f2fd 0%, #f0f8ff 100%)",
                    borderRadius: 2,
                    border: "1px solid rgba(33, 150, 243, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  className="fade-in-up-animation"
                  style={{ animationDelay: "0.2s" }}
                >
                  {/* Background animation */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background:
                        "linear-gradient(45deg, rgba(33, 150, 243, 0.1) 25%, transparent 25%, transparent 75%, rgba(33, 150, 243, 0.1) 75%)",
                      backgroundSize: "30px 30px",
                      animation: "float 6s ease-in-out infinite",
                      opacity: 0.3,
                    }}
                  />

                  <Box sx={{ position: "relative", zIndex: 1 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      sx={{ mb: 3 }}
                    >
                      <SatelliteIcon
                        sx={{
                          color: "info.main",
                          fontSize: 28,
                          animation: "spin 3s linear infinite",
                        }}
                      />
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: "bold", color: "info.main" }}
                      >
                        🛰️ GPS Location Intelligence
                      </Typography>
                      <Chip
                        icon={<GpsIcon className="signal-animation" />}
                        label="LOCATION ACTIVE"
                        color="info"
                        size="small"
                        className="pulse-animation"
                      />
                    </Stack>

                    <Grid container spacing={3}>
                      <Grid item xs={6} md={3}>
                        <Box
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.9)",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid rgba(76, 175, 80, 0.2)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <OnlineIcon
                              sx={{
                                color:
                                  locationData.FOnline === 1
                                    ? "success.main"
                                    : "error.main",
                                fontSize: 18,
                                animation:
                                  locationData.FOnline === 1
                                    ? "pulse 2s infinite"
                                    : "shake 0.5s infinite",
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "500" }}
                            >
                              Status
                            </Typography>
                          </Stack>
                          {getStatusChip(locationData.FOnline)}
                        </Box>
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <Box
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.9)",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid rgba(33, 150, 243, 0.2)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <LocationOnIcon
                              sx={{
                                color: "primary.main",
                                fontSize: 18,
                                animation: "heartbeat 2s infinite",
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "500" }}
                            >
                              Latitude
                            </Typography>
                          </Stack>
                          <Typography
                            variant="h6"
                            sx={{
                              color: "primary.main",
                              fontWeight: "bold",
                              fontFamily: "monospace",
                            }}
                          >
                            {locationData.FLatitude}
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <Box
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.9)",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid rgba(33, 150, 243, 0.2)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <LocationOnIcon
                              sx={{
                                color: "primary.main",
                                fontSize: 18,
                                animation: "heartbeat 2s infinite",
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "500" }}
                            >
                              Longitude
                            </Typography>
                          </Stack>
                          <Typography
                            variant="h6"
                            sx={{
                              color: "primary.main",
                              fontWeight: "bold",
                              fontFamily: "monospace",
                            }}
                          >
                            {locationData.FLongitude}
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <Box
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.9)",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid rgba(255, 152, 0, 0.2)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <SpeedIcon
                              sx={{
                                color:
                                  locationData.FSpeed > 50
                                    ? "error.main"
                                    : locationData.FSpeed > 20
                                      ? "warning.main"
                                      : "success.main",
                                fontSize: 18,
                                animation:
                                  locationData.FSpeed > 0
                                    ? "bounce 1s infinite"
                                    : "none",
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "500" }}
                            >
                              Speed
                            </Typography>
                          </Stack>
                          <Typography
                            variant="h6"
                            sx={{
                              color:
                                locationData.FSpeed > 50
                                  ? "error.main"
                                  : locationData.FSpeed > 20
                                    ? "warning.main"
                                    : "success.main",
                              fontWeight: "bold",
                            }}
                          >
                            {locationData.FSpeed} km/h
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <Box
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.9)",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid rgba(76, 175, 80, 0.2)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <BatteryIcon
                              sx={{
                                color:
                                  locationData.FBattery > 50
                                    ? "success.main"
                                    : locationData.FBattery > 20
                                      ? "warning.main"
                                      : "error.main",
                                fontSize: 18,
                                animation:
                                  locationData.FBattery < 20
                                    ? "shake 0.5s infinite"
                                    : "pulse 2s infinite",
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "500" }}
                            >
                              Battery
                            </Typography>
                          </Stack>
                          <Typography
                            variant="h6"
                            sx={{
                              color:
                                locationData.FBattery > 50
                                  ? "success.main"
                                  : locationData.FBattery > 20
                                    ? "warning.main"
                                    : "error.main",
                              fontWeight: "bold",
                            }}
                          >
                            {locationData.FBattery}%
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <Box
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.9)",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid rgba(156, 39, 176, 0.2)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 1 }}
                          >
                            <SignalIcon
                              sx={{
                                color: "secondary.main",
                                fontSize: 18,
                                animation: "signal 2s infinite",
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: "500" }}
                            >
                              GPS Signal
                            </Typography>
                          </Stack>
                          <Typography
                            variant="h6"
                            sx={{ color: "secondary.main", fontWeight: "bold" }}
                          >
                            {locationData.FGPSSignal}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
                {/* Lock Status Section */}
                <Box sx={{ p: 2, bgcolor: "warning.light", borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Lock Status
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Lock Status
                      </Typography>
                      <Stack direction="row" alignItems="center" gap={1}>
                        {locationData.FLockStatus ? (
                          <LockIcon color="error" />
                        ) : (
                          <LockOpenIcon color="success" />
                        )}
                        <Typography variant="body1">
                          {locationData.FLockStatus ? "Locked" : "Unlocked"}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
                {/* Map View Section */}
                <Box sx={{ p: 2, bgcolor: "success.light", borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Current Location
                  </Typography>
                  <Box
                    sx={{ height: 400, borderRadius: 1, overflow: "hidden" }}
                  >
                    <MapContainer
                      center={[locationData.FLatitude, locationData.FLongitude]}
                      zoom={15}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <Marker
                        position={[
                          locationData.FLatitude,
                          locationData.FLongitude,
                        ]}
                      // icon={customTruckIcon}
                      >
                        <Popup>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {assetData.FVehicleName}
                            </Typography>
                            <Typography variant="caption" display="block">
                              E-Lock No.: {assetData.FAssetID}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Speed: {locationData.FSpeed} km/h
                            </Typography>
                            <Typography variant="caption" display="block">
                              Battery: {locationData.FBattery}%
                            </Typography>
                            <Typography variant="caption" display="block">
                              Status:{" "}
                              {locationData.FOnline === 1
                                ? "Online"
                                : "Offline"}
                            </Typography>
                          </Box>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </Box>
                </Box>{" "}
                {/* History Section */}
                <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Typography variant="h6">
                      <HistoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      GPS Tracking History
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Time Range</InputLabel>
                        <Select
                          value={timeRange}
                          label="Time Range"
                          onChange={handleTimeRangeChange}
                        >
                          {timeRangeOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Stack>

                  {/* Custom Date/Time Range Section */}
                  {timeRange === "custom" && (
                    <Box
                      sx={{
                        mb: 3,
                        p: 2,
                        bgcolor: "background.paper",
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        gutterBottom
                        sx={{ fontWeight: "bold" }}
                      >
                        Custom Date & Time Range
                      </Typography>{" "}
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                          <TextField
                            label="Start Date & Time"
                            type="datetime-local"
                            value={customStartTime}
                            onChange={handleCustomStartTimeChange}
                            fullWidth
                            size="small"
                            InputLabelProps={{
                              shrink: true,
                            }}
                            inputProps={{
                              max: new Date().toISOString().slice(0, 16), // Prevent future dates
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            label="End Date & Time"
                            type="datetime-local"
                            value={customEndTime}
                            onChange={handleCustomEndTimeChange}
                            fullWidth
                            size="small"
                            InputLabelProps={{
                              shrink: true,
                            }}
                            inputProps={{
                              max: new Date().toISOString().slice(0, 16), // Prevent future dates
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleApplyCustomRange}
                            disabled={
                              !customStartTime ||
                              !customEndTime ||
                              historyLoading
                            }
                            fullWidth
                            size="small"
                          >
                            Apply Range
                          </Button>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={handleResetCustomRange}
                            fullWidth
                            size="small"
                          >
                            Reset to Default
                          </Button>
                        </Grid>
                      </Grid>{" "}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: "block" }}
                      >
                        Note: End time cannot be in the future, must be after
                        start time, and date range cannot exceed 30 days
                      </Typography>
                    </Box>
                  )}

                  {historyLoading ? (
                    <Box
                      sx={{ display: "flex", justifyContent: "center", py: 2 }}
                    >
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        Loading history data...
                      </Typography>
                    </Box>
                  ) : historyData.length > 0 ? (
                    <Paper sx={{ width: "100%", overflow: "hidden" }}>
                      <TableContainer sx={{ maxHeight: 400 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>GPS Time</TableCell>
                              <TableCell>Receive Time</TableCell>
                              <TableCell>Latitude</TableCell>
                              <TableCell>Longitude</TableCell>
                              <TableCell>Speed (km/h)</TableCell>
                              <TableCell>Direction</TableCell>
                              <TableCell>Battery (%)</TableCell>
                              <TableCell>Lock Status</TableCell>
                              <TableCell>Location Type</TableCell>
                              <TableCell>Mileage</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {historyData
                              .slice(
                                page * rowsPerPage,
                                page * rowsPerPage + rowsPerPage
                              )
                              .map((record, index) => (
                                <TableRow hover key={index}>
                                  <TableCell>
                                    {new Date(record.GT).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(record.RT).toLocaleString()}
                                  </TableCell>
                                  <TableCell>{record.Lat.toFixed(6)}</TableCell>
                                  <TableCell>{record.Lon.toFixed(6)}</TableCell>
                                  <TableCell>{record.Speed}</TableCell>
                                  <TableCell>{record.Dir}°</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={`${record.Bat}%`}
                                      color={
                                        record.Bat > 30
                                          ? "success"
                                          : record.Bat > 15
                                            ? "warning"
                                            : "error"
                                      }
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      gap={0.5}
                                    >
                                      {record.LS ? (
                                        <LockIcon
                                          color="error"
                                          fontSize="small"
                                        />
                                      ) : (
                                        <LockOpenIcon
                                          color="success"
                                          fontSize="small"
                                        />
                                      )}
                                      <Typography variant="caption">
                                        {record.LS ? "Locked" : "Unlocked"}
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={record.LType === 1 ? "GPS" : "LBS"}
                                      color={
                                        record.LType === 1
                                          ? "success"
                                          : "warning"
                                      }
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>{record.Mil} km</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50, 100, 1000]}
                        component="div"
                        count={historyData.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                      />
                    </Paper>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: "center", py: 2 }}
                    >
                      No history data found for the selected time range.
                    </Typography>
                  )}
                </Box>
                {/* Action Buttons Section */}
                {/* Enhanced Actions Section */}
                <Box
                  sx={{
                    p: 3,
                    bgcolor:
                      "linear-gradient(135deg, #f5f5f5 0%, #e8f5e8 100%)",
                    borderRadius: 2,
                    border: "1px solid rgba(96, 125, 139, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  className="fade-in-up-animation"
                  style={{ animationDelay: "0.8s" }}
                >
                  {/* Background animation */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background:
                        "linear-gradient(45deg, rgba(96, 125, 139, 0.1) 25%, transparent 25%, transparent 75%, rgba(96, 125, 139, 0.1) 75%)",
                      backgroundSize: "30px 30px",
                      animation: "float 10s ease-in-out infinite",
                      opacity: 0.3,
                    }}
                  />

                  <Box sx={{ position: "relative", zIndex: 1 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      sx={{ mb: 3 }}
                    >
                      <SettingsIcon
                        sx={{
                          color: "grey.600",
                          fontSize: 28,
                          animation: "spin 4s linear infinite",
                        }}
                      />
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: "bold", color: "grey.600" }}
                      >
                        ⚡ Quick Actions
                      </Typography>
                      <Chip
                        icon={<FlashIcon />}
                        label="CONTROL PANEL"
                        color="default"
                        size="small"
                        className="pulse-animation"
                      />
                    </Stack>

                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={
                          <RefreshIcon
                            sx={{
                              animation: loading
                                ? "spin 1s linear infinite"
                                : "none",
                            }}
                          />
                        }
                        onClick={fetchAssetData}
                        disabled={loading}
                        sx={{
                          bgcolor: "primary.main",
                          color: "white",
                          px: 3,
                          py: 1.5,
                          fontWeight: "bold",
                          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.3)",
                          "&:hover": {
                            bgcolor: "primary.dark",
                            transform: "translateY(-2px)",
                            boxShadow: "0 6px 16px rgba(33, 150, 243, 0.4)",
                            animation: "glow 0.5s ease",
                          },
                          "&:disabled": {
                            bgcolor: "grey.400",
                          },
                        }}
                        className={loading ? "" : "bounce-animation"}
                      >
                        🔄 Refresh Data
                      </Button>

                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={
                          <HistoryIcon
                            sx={{
                              animation: historyLoading
                                ? "spin 1s linear infinite"
                                : "pulse 2s infinite",
                            }}
                          />
                        }
                        onClick={fetchHistoryData}
                        disabled={historyLoading || !assetData?.FGUID}
                        sx={{
                          borderColor: "info.main",
                          color: "info.main",
                          px: 3,
                          py: 1.5,
                          fontWeight: "bold",
                          "&:hover": {
                            borderColor: "info.dark",
                            color: "info.dark",
                            bgcolor: "info.light",
                            transform: "translateY(-2px)",
                            animation: "glow 0.5s ease",
                          },
                          "&:disabled": {
                            borderColor: "grey.400",
                            color: "grey.400",
                          },
                        }}
                      >
                        📊 Refresh History
                      </Button>

                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={
                          <MapIcon
                            sx={{
                              animation: "float 3s ease-in-out infinite",
                            }}
                          />
                        }
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          borderColor: "success.main",
                          color: "success.main",
                          px: 3,
                          py: 1.5,
                          fontWeight: "bold",
                          "&:hover": {
                            borderColor: "success.dark",
                            color: "success.dark",
                            bgcolor: "success.light",
                            transform: "translateY(-2px)",
                            animation: "glow 0.5s ease",
                          },
                        }}
                        className="slide-in-animation"
                      >
                        🗺️ Open in Google Maps
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Real-Time Tracking Tab */}
            {currentTab === 1 && (
              <Box>
                {/* Real-time connection status */}
                <Box
                  sx={{
                    p: 2,
                    bgcolor: isRealTimeConnected
                      ? "success.light"
                      : "warning.light",
                    borderRadius: 1,
                    mb: 2,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    {isRealTimeConnected ? (
                      <LiveIcon color="success" />
                    ) : (
                      <OfflineIcon color="warning" />
                    )}
                    <Typography variant="h6">
                      Real-Time Tracking:{" "}
                      {isRealTimeConnected ? "Connected" : "Disconnected"}
                    </Typography>
                    {isRealTimeConnected && (
                      <Chip
                        label="LIVE"
                        color="success"
                        size="small"
                        sx={{ animation: "pulse 2s infinite" }}
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {isRealTimeConnected
                      ? `Receiving live updates from device ${elockNo}`
                      : `Click to connect to device ${elockNo} for real-time tracking`}
                  </Typography>
                </Box>

                {/* Enhanced Real-Time Data Display with Icons and Animations */}
                {realTimeData && (
                  <Box
                    sx={{
                      p: 2,
                      background:
                        "linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)",
                      borderRadius: 2,
                      mb: 2,
                      border: "2px solid #2196F3",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    className="glow-animation"
                  >
                    {/* Animated Background Effect */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background:
                          "linear-gradient(45deg, rgba(33, 150, 243, 0.1) 25%, transparent 25%, transparent 75%, rgba(33, 150, 243, 0.1) 75%), linear-gradient(45deg, rgba(33, 150, 243, 0.1) 25%, transparent 25%, transparent 75%, rgba(33, 150, 243, 0.1) 75%)",
                        backgroundSize: "20px 20px",
                        backgroundPosition: "0 0, 10px 10px",
                        opacity: 0.3,
                        animation: "float 4s ease-in-out infinite",
                      }}
                    />

                    <Box sx={{ position: "relative", zIndex: 1 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        sx={{ mb: 3 }}
                      >
                        <RadarIcon
                          sx={{
                            fontSize: 32,
                            color: "primary.main",
                            animation: "spin 3s linear infinite",
                          }}
                        />
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: "bold", color: "primary.main" }}
                        >
                          🔍 Live Device Data Analysis
                        </Typography>
                        <Chip
                          icon={<PulseIcon className="pulse-animation" />}
                          label="REAL-TIME"
                          color="success"
                          variant="outlined"
                          sx={{
                            fontWeight: "bold",
                            animation: "glow 2s infinite",
                          }}
                        />
                      </Stack>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                        sx={{
                          mb: 3,
                          fontStyle: "italic",
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <CheckIcon
                          color="success"
                          className="bounce-animation"
                        />
                        All data points verified and enhanced with visual
                        indicators
                      </Typography>

                      <Grid container spacing={3}>
                        {/* Location Data Section */}
                        <Grid item xs={12} md={6}>
                          <Box
                            sx={{
                              bgcolor: "rgba(76, 175, 80, 0.1)",
                              borderRadius: 2,
                              p: 2,
                              border: "1px solid rgba(76, 175, 80, 0.3)",
                              height: "100%",
                            }}
                            className="fade-in-up-animation"
                            style={{ animationDelay: "0.1s" }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{ mb: 2 }}
                            >
                              <LocationOnIcon
                                sx={{
                                  color: "success.main",
                                  fontSize: 24,
                                  animation: "heartbeat 2s infinite",
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: "bold",
                                  color: "success.main",
                                }}
                              >
                                📍 Real-time Location
                              </Typography>
                            </Stack>

                            <Stack spacing={1.5}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontWeight: "500", minWidth: 80 }}
                                >
                                  Updated:
                                </Typography>
                                <Chip
                                  label={realTimeData.timestamp}
                                  size="small"
                                  color="info"
                                  className="pulse-animation"
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <GpsIcon
                                  sx={{
                                    color: "success.main",
                                    fontSize: 18,
                                    animation: "signal 2s infinite",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Coordinates:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "success.main",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {realTimeData.latitude},{" "}
                                  {realTimeData.longitude}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <SpeedIcon
                                  sx={{
                                    color:
                                      realTimeData.speed > 50
                                        ? "error.main"
                                        : realTimeData.speed > 20
                                          ? "warning.main"
                                          : "success.main",
                                    fontSize: 18,
                                    animation:
                                      realTimeData.speed > 0
                                        ? "bounce 1s infinite"
                                        : "none",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Speed:
                                </Typography>
                                <Chip
                                  label={`${realTimeData.speed} km/h`}
                                  size="small"
                                  color={
                                    realTimeData.speed > 50
                                      ? "error"
                                      : realTimeData.speed > 20
                                        ? "warning"
                                        : "success"
                                  }
                                  sx={{
                                    animation:
                                      realTimeData.speed > 60
                                        ? "shake 0.5s infinite"
                                        : "none",
                                  }}
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <CompassIcon
                                  sx={{
                                    color: "primary.main",
                                    fontSize: 18,
                                    transform: `rotate(${realTimeData.direction}deg)`,
                                    transition: "transform 0.5s ease",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Direction:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "primary.main",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {realTimeData.direction}°
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <BatteryIcon
                                  sx={{
                                    color:
                                      realTimeData.battery > 50
                                        ? "success.main"
                                        : realTimeData.battery > 20
                                          ? "warning.main"
                                          : "error.main",
                                    fontSize: 18,
                                    animation:
                                      realTimeData.battery < 20
                                        ? "shake 0.5s infinite"
                                        : "none",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Battery:
                                </Typography>
                                <Chip
                                  label={`${realTimeData.battery}%`}
                                  size="small"
                                  color={
                                    realTimeData.battery > 50
                                      ? "success"
                                      : realTimeData.battery > 20
                                        ? "warning"
                                        : "error"
                                  }
                                  icon={
                                    realTimeData.battery < 20 ? (
                                      <BatteryAlertIcon />
                                    ) : (
                                      <BatteryIcon />
                                    )
                                  }
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                {realTimeData.online ? (
                                  <OnlineIcon
                                    sx={{
                                      color: "success.main",
                                      fontSize: 18,
                                      animation: "pulse 2s infinite",
                                    }}
                                  />
                                ) : (
                                  <OfflineIconAlt
                                    sx={{
                                      color: "error.main",
                                      fontSize: 18,
                                      animation: "shake 0.5s infinite",
                                    }}
                                  />
                                )}
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Status:
                                </Typography>
                                <Chip
                                  label={
                                    realTimeData.online ? "ONLINE" : "OFFLINE"
                                  }
                                  size="small"
                                  color={
                                    realTimeData.online ? "success" : "error"
                                  }
                                  className={
                                    realTimeData.online
                                      ? "pulse-animation"
                                      : "shake-animation"
                                  }
                                />
                              </Box>
                            </Stack>
                          </Box>
                        </Grid>

                        {/* Device Status Section */}
                        <Grid item xs={12} md={6}>
                          <Box
                            sx={{
                              bgcolor: "rgba(255, 152, 0, 0.1)",
                              borderRadius: 2,
                              p: 2,
                              border: "1px solid rgba(255, 152, 0, 0.3)",
                              height: "100%",
                            }}
                            className="fade-in-up-animation"
                            style={{ animationDelay: "0.2s" }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{ mb: 2 }}
                            >
                              <SecurityIcon
                                sx={{
                                  color: "warning.main",
                                  fontSize: 24,
                                  animation: "float 3s ease-in-out infinite",
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: "bold",
                                  color: "warning.main",
                                }}
                              >
                                🔒 Security & Status
                              </Typography>
                            </Stack>

                            <Stack spacing={1.5}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                {realTimeData.lockStatus ? (
                                  <LockIcon
                                    sx={{
                                      color: "error.main",
                                      fontSize: 18,
                                      animation: "heartbeat 2s infinite",
                                    }}
                                  />
                                ) : (
                                  <LockOpenIcon
                                    sx={{
                                      color: "success.main",
                                      fontSize: 18,
                                      animation: "bounce 2s infinite",
                                    }}
                                  />
                                )}
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Lock Status:
                                </Typography>
                                <Chip
                                  label={realTimeData.lockStatus}
                                  size="small"
                                  color={
                                    realTimeData.lockStatus === "LOCKED"
                                      ? "error"
                                      : "success"
                                  }
                                  className={
                                    realTimeData.lockStatus === "LOCKED"
                                      ? "pulse-animation"
                                      : "glow-animation"
                                  }
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <WarningIcon
                                  sx={{
                                    color:
                                      realTimeData.alarm !== "NORMAL"
                                        ? "error.main"
                                        : "success.main",
                                    fontSize: 18,
                                    animation:
                                      realTimeData.alarm !== "NORMAL"
                                        ? "shake 0.5s infinite"
                                        : "none",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Alarm:
                                </Typography>
                                <Chip
                                  label={realTimeData.alarm}
                                  size="small"
                                  color={
                                    realTimeData.alarm !== "NORMAL"
                                      ? "error"
                                      : "success"
                                  }
                                  className={
                                    realTimeData.alarm !== "NORMAL"
                                      ? "shake-animation"
                                      : ""
                                  }
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <FlashIcon
                                  sx={{
                                    color: realTimeData.awaken
                                      ? "success.main"
                                      : "warning.main",
                                    fontSize: 18,
                                    animation: realTimeData.awaken
                                      ? "pulse 1.5s infinite"
                                      : "none",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Awaken:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "text.primary" }}
                                >
                                  {realTimeData.awaken}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <SatelliteIcon
                                  sx={{
                                    color: "info.main",
                                    fontSize: 18,
                                    animation: "signal 2s infinite",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  GPS Signal:
                                </Typography>
                                <Chip
                                  label={realTimeData.signals?.gps || "N/A"}
                                  size="small"
                                  color="info"
                                  className="signal-animation"
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <CellSignalIcon
                                  sx={{
                                    color: "secondary.main",
                                    fontSize: 18,
                                    animation: "signal 2.5s infinite",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Cell Signal:
                                </Typography>
                                <Chip
                                  label={realTimeData.signals?.cell || "N/A"}
                                  size="small"
                                  color="secondary"
                                  className="signal-animation"
                                />
                              </Box>
                            </Stack>
                          </Box>
                        </Grid>

                        {/* Network Information Section */}
                        <Grid item xs={12} md={6}>
                          <Box
                            sx={{
                              bgcolor: "rgba(156, 39, 176, 0.1)",
                              borderRadius: 2,
                              p: 2,
                              border: "1px solid rgba(156, 39, 176, 0.3)",
                              height: "100%",
                            }}
                            className="fade-in-up-animation"
                            style={{ animationDelay: "0.4s" }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{ mb: 2 }}
                            >
                              <NetworkIcon
                                sx={{
                                  color: "secondary.main",
                                  fontSize: 24,
                                  animation: "colorShift 3s infinite",
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: "bold",
                                  color: "secondary.main",
                                }}
                              >
                                📡 Network Data
                              </Typography>
                            </Stack>

                            <Stack spacing={1.5}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <TowerIcon
                                  sx={{ color: "info.main", fontSize: 18 }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  MCC:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "text.primary",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {realTimeData.network?.mcc || "N/A"}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <RouterIcon
                                  sx={{ color: "info.main", fontSize: 18 }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  MNC:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "text.primary",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {realTimeData.network?.mnc || "N/A"}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <WifiIcon
                                  sx={{
                                    color: "secondary.main",
                                    fontSize: 18,
                                    animation: "signal 2s infinite",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  LAC:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "text.primary",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {realTimeData.network?.lac || "N/A"}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <TowerIcon
                                  sx={{ color: "primary.main", fontSize: 18 }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Cell ID:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "text.primary",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {realTimeData.network?.cellId || "N/A"}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        </Grid>

                        {/* Vehicle Data Section */}
                        <Grid item xs={12} md={6}>
                          <Box
                            sx={{
                              bgcolor: "rgba(244, 67, 54, 0.1)",
                              borderRadius: 2,
                              p: 2,
                              border: "1px solid rgba(244, 67, 54, 0.3)",
                              height: "100%",
                            }}
                            className="fade-in-up-animation"
                            style={{ animationDelay: "0.6s" }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{ mb: 2 }}
                            >
                              <DirectionIcon
                                sx={{
                                  color: "error.main",
                                  fontSize: 24,
                                  animation: "spin 4s linear infinite",
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: "bold", color: "error.main" }}
                              >
                                🚛 Vehicle Systems
                              </Typography>
                            </Stack>

                            <Stack spacing={1.5}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <AccIcon
                                  sx={{
                                    color: realTimeData.vehicle?.acc
                                      ? "success.main"
                                      : "error.main",
                                    fontSize: 18,
                                    animation: realTimeData.vehicle?.acc
                                      ? "pulse 2s infinite"
                                      : "none",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  ACC:
                                </Typography>
                                <Chip
                                  label={
                                    realTimeData.vehicle?.acc ? "ON" : "OFF"
                                  }
                                  size="small"
                                  color={
                                    realTimeData.vehicle?.acc
                                      ? "success"
                                      : "error"
                                  }
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <MotorIcon
                                  sx={{
                                    color: realTimeData.vehicle?.motor
                                      ? "success.main"
                                      : "error.main",
                                    fontSize: 18,
                                    animation: realTimeData.vehicle?.motor
                                      ? "spin 2s linear infinite"
                                      : "none",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Motor:
                                </Typography>
                                <Chip
                                  label={
                                    realTimeData.vehicle?.motor
                                      ? "RUNNING"
                                      : "STOPPED"
                                  }
                                  size="small"
                                  color={
                                    realTimeData.vehicle?.motor
                                      ? "success"
                                      : "error"
                                  }
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <DoorIcon
                                  sx={{
                                    color: realTimeData.vehicle?.door
                                      ? "warning.main"
                                      : "success.main",
                                    fontSize: 18,
                                    animation: realTimeData.vehicle?.door
                                      ? "shake 0.5s infinite"
                                      : "none",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Door:
                                </Typography>
                                <Chip
                                  label={
                                    realTimeData.vehicle?.door
                                      ? "OPEN"
                                      : "CLOSED"
                                  }
                                  size="small"
                                  color={
                                    realTimeData.vehicle?.door
                                      ? "warning"
                                      : "success"
                                  }
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <FuelIcon
                                  sx={{
                                    color: realTimeData.vehicle?.fuelCut
                                      ? "error.main"
                                      : "success.main",
                                    fontSize: 18,
                                    animation: realTimeData.vehicle?.fuelCut
                                      ? "shake 0.5s infinite"
                                      : "none",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Fuel Cut:
                                </Typography>
                                <Chip
                                  label={
                                    realTimeData.vehicle?.fuelCut
                                      ? "CUT"
                                      : "NORMAL"
                                  }
                                  size="small"
                                  color={
                                    realTimeData.vehicle?.fuelCut
                                      ? "error"
                                      : "success"
                                  }
                                />
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <AnchorIcon
                                  sx={{
                                    color: realTimeData.vehicle?.lockRope
                                      ? "success.main"
                                      : "warning.main",
                                    fontSize: 18,
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: "500" }}
                                >
                                  Lock Rope:
                                </Typography>
                                <Chip
                                  label={
                                    realTimeData.vehicle?.lockRope
                                      ? "CONNECTED"
                                      : "DISCONNECTED"
                                  }
                                  size="small"
                                  color={
                                    realTimeData.vehicle?.lockRope
                                      ? "success"
                                      : "warning"
                                  }
                                />
                              </Box>
                            </Stack>
                          </Box>
                        </Grid>

                        {/* Sensor Data Section */}
                        <Grid item xs={12}>
                          <Box
                            sx={{
                              bgcolor: "rgba(0, 150, 136, 0.1)",
                              borderRadius: 2,
                              p: 2,
                              border: "1px solid rgba(0, 150, 136, 0.3)",
                            }}
                            className="fade-in-up-animation"
                            style={{ animationDelay: "0.8s" }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{ mb: 2 }}
                            >
                              <SensorIcon
                                sx={{
                                  color: "teal",
                                  fontSize: 24,
                                  animation: "float 3s ease-in-out infinite",
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: "bold", color: "teal" }}
                              >
                                🌡️ Environmental Sensors
                              </Typography>
                            </Stack>

                            <Grid container spacing={2}>
                              <Grid item xs={12} md={4}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <ThermostatIcon
                                    sx={{
                                      color: "error.main",
                                      fontSize: 18,
                                      animation: "colorShift 3s infinite",
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: "500" }}
                                  >
                                    Temperature:
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "text.primary",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {JSON.stringify(
                                      realTimeData.sensors?.temperature
                                    ) || "N/A"}
                                  </Typography>
                                </Box>
                              </Grid>

                              <Grid item xs={12} md={4}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <HumidityIcon
                                    sx={{
                                      color: "info.main",
                                      fontSize: 18,
                                      animation: "bounce 2s infinite",
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: "500" }}
                                  >
                                    Humidity:
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "text.primary",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {JSON.stringify(
                                      realTimeData.sensors?.humidity
                                    ) || "N/A"}
                                  </Typography>
                                </Box>
                              </Grid>

                              <Grid item xs={12} md={4}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <FuelIcon
                                    sx={{
                                      color: "warning.main",
                                      fontSize: 18,
                                      animation: "pulse 2s infinite",
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: "500" }}
                                  >
                                    Fuel:
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "text.primary",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {JSON.stringify(
                                      realTimeData.sensors?.fuel
                                    ) || "N/A"}
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </Grid>

                        {/* Extended Information Section */}
                        <Grid item xs={12}>
                          <Box
                            sx={{
                              bgcolor: "rgba(96, 125, 139, 0.1)",
                              borderRadius: 2,
                              p: 2,
                              border: "1px solid rgba(96, 125, 139, 0.3)",
                            }}
                            className="fade-in-up-animation"
                            style={{ animationDelay: "1s" }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{ mb: 2 }}
                            >
                              <BuildIcon
                                sx={{
                                  color: "grey.600",
                                  fontSize: 24,
                                  animation: "spin 5s linear infinite",
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: "bold", color: "grey.600" }}
                              >
                                🔧 Extended Device Information
                              </Typography>
                            </Stack>

                            <Grid container spacing={2}>
                              {[
                                {
                                  icon: (
                                    <ShieldIcon
                                      sx={{ color: "success.main" }}
                                    />
                                  ),
                                  label: "Back Cover",
                                  value: realTimeData.extended?.fBackCover,
                                },
                                {
                                  icon: (
                                    <UpdateIcon
                                      sx={{
                                        color: "info.main",
                                        animation: "spin 2s linear infinite",
                                      }}
                                    />
                                  ),
                                  label: "Change",
                                  value: realTimeData.extended?.fChange,
                                },
                                {
                                  icon: (
                                    <ShieldIcon
                                      sx={{ color: "warning.main" }}
                                    />
                                  ),
                                  label: "Down Cover",
                                  value: realTimeData.extended?.fDownCover,
                                },
                                {
                                  icon: (
                                    <BatteryIcon sx={{ color: "error.main" }} />
                                  ),
                                  label: "Main Battery",
                                  value: realTimeData.extended?.fMainBattery,
                                },
                                {
                                  icon: (
                                    <NetworkIcon
                                      sx={{ color: "primary.main" }}
                                    />
                                  ),
                                  label: "Network Type",
                                  value: realTimeData.extended?.fNetworkType,
                                },
                                {
                                  icon: (
                                    <ShakeIcon
                                      sx={{
                                        color: "warning.main",
                                        animation: "shake 0.5s infinite",
                                      }}
                                    />
                                  ),
                                  label: "Shake",
                                  value: realTimeData.extended?.fShake,
                                },
                                {
                                  icon: (
                                    <ShieldIcon sx={{ color: "info.main" }} />
                                  ),
                                  label: "Up Cover",
                                  value: realTimeData.extended?.fUpCover,
                                },
                                {
                                  icon: (
                                    <VoltageIcon
                                      sx={{
                                        color: "secondary.main",
                                        animation: "pulse 2s infinite",
                                      }}
                                    />
                                  ),
                                  label: "Voltage",
                                  value: realTimeData.extended?.fVoltage,
                                },
                              ].map((item, index) => (
                                <Grid item xs={12} sm={6} md={3} key={index}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    {item.icon}
                                    <Typography
                                      variant="caption"
                                      sx={{ fontWeight: "500" }}
                                    >
                                      {item.label}:
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{ color: "text.primary" }}
                                    >
                                      {item.value || "N/A"}
                                    </Typography>
                                  </Box>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        </Grid>

                        {/* Raw JSON Data with Enhanced Styling */}
                        <Grid item xs={12}>
                          <Box
                            sx={{
                              bgcolor: "rgba(0, 0, 0, 0.05)",
                              borderRadius: 2,
                              p: 2,
                              border: "1px dashed rgba(0, 0, 0, 0.2)",
                            }}
                            className="slide-in-animation"
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{ mb: 2 }}
                            >
                              <DataIcon
                                sx={{
                                  color: "grey.700",
                                  fontSize: 24,
                                  animation: "colorShift 4s infinite",
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: "bold", color: "grey.700" }}
                              >
                                📝 Complete Raw JSON Data Stream
                              </Typography>
                              <Chip
                                icon={<MemoryIcon />}
                                label="LIVE DATA"
                                size="small"
                                variant="outlined"
                                className="pulse-animation"
                              />
                            </Stack>

                            <Box
                              sx={{
                                bgcolor: "black",
                                color: "lime",
                                p: 2,
                                borderRadius: 1,
                                maxHeight: 300,
                                overflow: "auto",
                                fontFamily: "monospace",
                                fontSize: "12px",
                                border: "2px solid #333",
                                position: "relative",
                              }}
                            >
                              {/* Terminal-like header */}
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bgcolor: "#333",
                                  px: 1,
                                  py: 0.5,
                                  fontSize: "10px",
                                  color: "white",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: "red",
                                  }}
                                />
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: "yellow",
                                  }}
                                />
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: "green",
                                  }}
                                />
                                <Typography sx={{ ml: 1, fontSize: "10px" }}>
                                  live-data-stream.json
                                </Typography>
                                <Box
                                  sx={{
                                    ml: "auto",
                                    fontSize: "10px",
                                    animation: "pulse 1s infinite",
                                    color: "lime",
                                  }}
                                >
                                  ● STREAMING
                                </Box>
                              </Box>

                              <Typography
                                component="pre"
                                sx={{
                                  mt: 3,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  lineHeight: 1.4,
                                }}
                              >
                                {realTimeData.rawData}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>
                )}

                {/* Current Real-time Location Data */}
                {(realTimeData || locationData) && (
                  <Box sx={{ mb: 2 }}>
                    {/* Basic Location Information */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "primary.light",
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        🌍 Current Live Location
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Latitude
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {(
                              realTimeData?.latitude || locationData?.FLatitude
                            )?.toFixed(6) || "N/A"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Longitude
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {(
                              realTimeData?.longitude ||
                              locationData?.FLongitude
                            )?.toFixed(6) || "N/A"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Speed
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {realTimeData?.speed || locationData?.FSpeed || 0}{" "}
                            km/h
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Direction
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {realTimeData?.direction ||
                              locationData?.FDirection ||
                              0}
                            °
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Mileage
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {realTimeData?.mileage ||
                              locationData?.FMileage ||
                              0}{" "}
                            km
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            GPS Time
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FGPSTime
                              ? new Date(locationData.FGPSTime).toLocaleString()
                              : "N/A"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Receive Time
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FRecvTime
                              ? new Date(
                                locationData.FRecvTime
                              ).toLocaleString()
                              : "N/A"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Location Type
                          </Typography>
                          <Chip
                            label={
                              locationData?.FLocationType === 1
                                ? "GPS"
                                : locationData?.FLocationType === 2
                                  ? "LBS"
                                  : "Unknown"
                            }
                            color={
                              locationData?.FLocationType === 1
                                ? "success"
                                : "warning"
                            }
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Device Status Information */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "info.light",
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        🔋 Device Status & Sensors
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            <BatteryIcon fontSize="small" /> Battery Level
                          </Typography>
                          <Chip
                            label={`${realTimeData?.battery ||
                              locationData?.FBattery ||
                              0
                              }%`}
                            color={
                              (realTimeData?.battery ||
                                locationData?.FBattery ||
                                0) > 50
                                ? "success"
                                : (realTimeData?.battery ||
                                  locationData?.FBattery ||
                                  0) > 20
                                  ? "warning"
                                  : "error"
                            }
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            <SignalIcon fontSize="small" /> GPS Signal
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FGPSSignal || 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            📶 Cell Signal
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FCellSignal || 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            🌐 Online Status
                          </Typography>
                          <Chip
                            label={
                              locationData?.FOnline === 1 ? "Online" : "Offline"
                            }
                            color={
                              locationData?.FOnline === 1 ? "success" : "error"
                            }
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            💤 Awaken Status
                          </Typography>
                          <Chip
                            label={
                              locationData?.FAwaken === 1
                                ? "Sleep"
                                : locationData?.FAwaken === 2
                                  ? "Awake"
                                  : "Unknown"
                            }
                            color={
                              locationData?.FAwaken === 2
                                ? "success"
                                : "warning"
                            }
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            🏷️ Device Class
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FClassify || "N/A"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Lock & Security Status */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "warning.light",
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        🔒 Lock & Security Status
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Lock Status
                          </Typography>
                          <Stack direction="row" alignItems="center" gap={1}>
                            {locationData?.FLockStatus ? (
                              <LockIcon color="error" />
                            ) : (
                              <LockOpenIcon color="success" />
                            )}
                            <Typography variant="body1" fontWeight="bold">
                              {locationData?.FLockStatus
                                ? "Locked"
                                : "Unlocked"}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            🪢 Lock Rope
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FLockRope === 1
                              ? "Connected"
                              : locationData?.FLockRope === 0
                                ? "Disconnected"
                                : "N/A"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            🚨 Alarm Status
                          </Typography>
                          <Chip
                            label={
                              locationData?.FAlarm === -1
                                ? "Normal"
                                : `Alarm: ${locationData?.FAlarm}`
                            }
                            color={
                              locationData?.FAlarm === -1 ? "success" : "error"
                            }
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            🚪 Door Status
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FDoor === -1
                              ? "N/A"
                              : locationData?.FDoor === 1
                                ? "Open"
                                : "Closed"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Network & Cellular Information */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "secondary.light",
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        📡 Network & Cellular Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            MCC (Mobile Country Code)
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FMCC || "N/A"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            MNC (Mobile Network Code)
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FMNC || "N/A"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            LAC (Location Area Code)
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FLAC || "N/A"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Cell ID
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FCELLID || "N/A"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Environmental Sensors */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "success.light",
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        🌡️ Environmental Sensors
                      </Typography>
                      <Grid container spacing={2}>
                        {/* Temperature Sensors */}
                        {[1, 2, 3, 4, 5, 6].map((sensor) => {
                          const tempValue =
                            locationData?.[`FTemperature${sensor}`];
                          if (tempValue && tempValue !== -1000) {
                            return (
                              <Grid item xs={6} md={2} key={`temp${sensor}`}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  🌡️ Temp {sensor}
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {tempValue}°C
                                </Typography>
                              </Grid>
                            );
                          }
                          return null;
                        })}

                        {/* Humidity Sensors */}
                        {[1, 2, 3, 4, 5, 6].map((sensor) => {
                          const humidityValue =
                            locationData?.[`FHumidity${sensor}`];
                          if (humidityValue && humidityValue !== 0) {
                            return (
                              <Grid
                                item
                                xs={6}
                                md={2}
                                key={`humidity${sensor}`}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  💧 Humidity {sensor}
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {humidityValue}%
                                </Typography>
                              </Grid>
                            );
                          }
                          return null;
                        })}

                        {/* Show message if no sensors active */}
                        {![1, 2, 3, 4, 5, 6].some(
                          (sensor) =>
                            (locationData?.[`FTemperature${sensor}`] &&
                              locationData?.[`FTemperature${sensor}`] !==
                              -1000) ||
                            (locationData?.[`FHumidity${sensor}`] &&
                              locationData?.[`FHumidity${sensor}`] !== 0)
                        ) && (
                            <Grid item xs={12}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                style={{ fontStyle: "italic" }}
                              >
                                No environmental sensors active
                              </Typography>
                            </Grid>
                          )}
                      </Grid>
                    </Box>

                    {/* Vehicle & Fuel Information */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "error.light",
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        🚛 Vehicle & Fuel Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            ⛽ Fuel Cut Status
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FFuelCut === -1
                              ? "N/A"
                              : locationData?.FFuelCut === 1
                                ? "Cut"
                                : "Normal"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            🔧 Motor Status
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FMotor === -1
                              ? "N/A"
                              : locationData?.FMotor === 1
                                ? "On"
                                : "Off"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            📊 ACC Status
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FACC === -1
                              ? "N/A"
                              : locationData?.FACC === 1
                                ? "On"
                                : "Off"}
                          </Typography>
                        </Grid>

                        {/* Fuel Values */}
                        {[1, 2, 3].map((sensor) => {
                          const fuelValue =
                            locationData?.[`FFuelValue${sensor}`];
                          if (fuelValue && fuelValue !== -1) {
                            return (
                              <Grid item xs={6} md={3} key={`fuel${sensor}`}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  ⛽ Fuel {sensor}
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {fuelValue}
                                </Typography>
                              </Grid>
                            );
                          }
                          return null;
                        })}
                      </Grid>
                    </Box>

                    {/* Extended Protocol Data */}
                    {locationData?.FExpandProto && (
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "grey.100",
                          borderRadius: 1,
                          mb: 2,
                        }}
                      >
                        <Typography variant="h6" gutterBottom>
                          🔧 Extended Device Information
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} md={3}>
                            <Typography variant="body2" color="text.secondary">
                              ⚡ Voltage
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {locationData.FExpandProto.FDesc
                                ? JSON.parse(
                                  locationData.FExpandProto.FDesc
                                ).fVoltage?.toFixed(2) || "0.00"
                                : "N/A"}{" "}
                              V
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="body2" color="text.secondary">
                              📶 Network Type
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {locationData.FExpandProto.FDesc
                                ? JSON.parse(locationData.FExpandProto.FDesc)
                                  .fNetworkType === 0
                                  ? "2G/3G"
                                  : "4G/5G"
                                : "N/A"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="body2" color="text.secondary">
                              🔋 Main Battery
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {locationData.FExpandProto.FDesc
                                ? JSON.parse(locationData.FExpandProto.FDesc)
                                  .fMainBattery === -1
                                  ? "N/A"
                                  : JSON.parse(locationData.FExpandProto.FDesc)
                                    .fMainBattery
                                : "N/A"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="body2" color="text.secondary">
                              📱 Back Cover
                            </Typography>
                            <Chip
                              label={
                                locationData.FExpandProto.FDesc
                                  ? JSON.parse(locationData.FExpandProto.FDesc)
                                    .fBackCover === 1
                                    ? "Closed"
                                    : "Open"
                                  : "N/A"
                              }
                              color={
                                locationData.FExpandProto.FDesc &&
                                  JSON.parse(locationData.FExpandProto.FDesc)
                                    .fBackCover === 1
                                  ? "success"
                                  : "warning"
                              }
                              size="small"
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    )}

                    {/* Timestamps */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "background.paper",
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        ⏰ Timestamp Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary">
                            GPS Timestamp
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FGPSTimestamp
                              ? new Date(
                                locationData.FGPSTimestamp
                              ).toLocaleString()
                              : "N/A"}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary">
                            Receive Timestamp
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {locationData?.FRecvTimestamp
                              ? new Date(
                                locationData.FRecvTimestamp
                              ).toLocaleString()
                              : "N/A"}
                          </Typography>
                        </Grid>
                        {realTimeData?.timestamp && (
                          <Grid item xs={12}>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} md={6}>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  🔴 Last Real-Time Update
                                </Typography>
                                <Typography
                                  variant="body1"
                                  fontWeight="bold"
                                  color="success.main"
                                >
                                  {realTimeData.timestamp}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={1}
                                >
                                  <LocationIcon
                                    color="primary"
                                    fontSize="small"
                                  />
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Real-Time Location
                                    </Typography>
                                    <Typography
                                      variant="body1"
                                      fontWeight="bold"
                                    >
                                      {(
                                        realTimeData?.latitude ||
                                        locationData?.FLatitude
                                      )?.toFixed(6) || "N/A"}
                                      ,{" "}
                                      {(
                                        realTimeData?.longitude ||
                                        locationData?.FLongitude
                                      )?.toFixed(6) || "N/A"}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Grid>
                              {/* <Grid item xs={12} md={6}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <DiffIcon color="warning" fontSize="small" />
                                  <Box>
                                    <Typography variant="body2" color="text.secondary">
                                      Position Difference
                                    </Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                      {(realTimeData?.latitude || locationData?.FLatitude) && locationData?.FLatitude ? (
                                        <>
                                          Δ Lat: {((realTimeData?.latitude || locationData?.FLatitude) - locationData.FLatitude).toFixed(6)}
                                          <br />
                                          Δ Lng: {((realTimeData?.longitude || locationData?.FLongitude) - locationData.FLongitude).toFixed(6)}
                                        </>
                                      ) : (
                                        locationData?.FLatitude && locationData?.FLongitude ? "0.000000, 0.000000" : "N/A"
                                      )}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Grid> */}
                            </Grid>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Box>
                )}

                {/* Live Map */}
                {locationData && (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "success.light",
                      borderRadius: 1,
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Live Location Map
                    </Typography>
                    <Box
                      sx={{ height: 400, borderRadius: 1, overflow: "hidden" }}
                    >
                      <MapContainer
                        center={[
                          locationData.FLatitude,
                          locationData.FLongitude,
                        ]}
                        zoom={15}
                        style={{ height: "100%", width: "100%" }}
                        key={`${locationData.FLatitude}-${locationData.FLongitude}`} // Force re-render on location change
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker
                          position={[
                            locationData.FLatitude,
                            locationData.FLongitude,
                          ]}
                        // icon={customTruckIcon}
                        >
                          <Popup>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {assetData.FVehicleName} - LIVE
                              </Typography>
                              <Typography variant="caption" display="block">
                                E-Lock No.: {assetData.FAssetID}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Speed: {locationData.FSpeed} km/h
                              </Typography>
                              <Typography variant="caption" display="block">
                                Battery: {locationData.FBattery}%
                              </Typography>
                              <Typography variant="caption" display="block">
                                Status:{" "}
                                {locationData.FOnline === 1
                                  ? "Online"
                                  : "Offline"}
                              </Typography>
                              <Typography
                                variant="caption"
                                display="block"
                                color="success.main"
                              >
                                🔴 LIVE TRACKING
                              </Typography>
                            </Box>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </Box>
                  </Box>
                )}

                {/* Real-time Updates Log */}
                <Box sx={{ p: 2, bgcolor: "info.light", borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Live Updates Log - Raw Data Points
                  </Typography>
                  {realTimeUpdates.length > 0 ? (
                    <Paper sx={{ maxHeight: 500, overflow: "auto" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Time</TableCell>
                            <TableCell>Event Type</TableCell>
                            <TableCell>Device ID</TableCell>
                            <TableCell>Basic Data</TableCell>
                            {/* <TableCell>All Raw Data</TableCell> */}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {realTimeUpdates.map((update, index) => (
                            <TableRow key={index} hover>
                              <TableCell>
                                <Typography variant="caption">
                                  {update.timestamp}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={update.type}
                                  color={
                                    update.type.includes("alarm")
                                      ? "error"
                                      : update.type.includes("position")
                                        ? "success"
                                        : update.type.includes("status")
                                          ? "info"
                                          : "default"
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {update.deviceId}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" component="div">
                                  {update.type.includes("position") && (
                                    <div>
                                      <div>
                                        Lat: {update.latitude?.toFixed(6)}
                                      </div>
                                      <div>
                                        Lng: {update.longitude?.toFixed(6)}
                                      </div>
                                      <div>Speed: {update.speed} km/h</div>
                                      <div>Direction: {update.direction}°</div>
                                      <div>Battery: {update.battery}%</div>
                                      <div>
                                        Online: {update.online ? "Yes" : "No"}
                                      </div>
                                      <div>
                                        Lock Status: {update.lockStatus}
                                      </div>
                                      <div>
                                        Location Type: {update.locationType}
                                      </div>
                                      <div>Alarm: {update.alarm}</div>
                                    </div>
                                  )}
                                  {update.type.includes("status") && (
                                    <div>
                                      <div>Battery: {update.battery}%</div>
                                      <div>
                                        Online: {update.online ? "Yes" : "No"}
                                      </div>
                                      <div>
                                        Lock Status: {update.lockStatus}
                                      </div>
                                      <div>Alarm: {update.alarm}</div>
                                      <div>Awaken: {update.awaken}</div>
                                      <div>
                                        GPS Signal: {update.signals?.gps}
                                      </div>
                                      <div>
                                        Cell Signal: {update.signals?.cell}
                                      </div>
                                    </div>
                                  )}
                                  {update.type.includes("alarm") && (
                                    <div>
                                      <div>Alarm Type: {update.alarmType}</div>
                                      <div>Message: {update.message}</div>
                                    </div>
                                  )}
                                </Typography>
                              </TableCell>
                              {/* <TableCell>
                                <Box sx={{ maxWidth: 400, overflow: "auto" }}>
                                  <Typography
                                    variant="caption"
                                    component="pre"
                                    sx={{
                                      fontSize: "10px",
                                      fontFamily: "monospace",
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {update.rawData}
                                  </Typography>
                                </Box>
                              </TableCell> */}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: "center", py: 2 }}
                    >
                      {isRealTimeConnected
                        ? "Waiting for live updates..."
                        : "Connect to start receiving live updates"}
                    </Typography>
                  )}
                </Box>

                {/* Enhanced Real-Time Actions */}
                <Box
                  sx={{
                    p: 3,
                    bgcolor:
                      "linear-gradient(135deg, #f0f8ff 0%, #e8f5e8 100%)",
                    borderRadius: 2,
                    border: "2px solid",
                    borderColor: isRealTimeConnected
                      ? "success.main"
                      : "warning.main",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  className="glow-animation"
                >
                  {/* Dynamic background animation */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: isRealTimeConnected
                        ? "linear-gradient(45deg, rgba(76, 175, 80, 0.1) 25%, transparent 25%, transparent 75%, rgba(76, 175, 80, 0.1) 75%)"
                        : "linear-gradient(45deg, rgba(255, 152, 0, 0.1) 25%, transparent 25%, transparent 75%, rgba(255, 152, 0, 0.1) 75%)",
                      backgroundSize: "40px 40px",
                      animation: isRealTimeConnected
                        ? "float 3s ease-in-out infinite"
                        : "shake 4s ease-in-out infinite",
                      opacity: 0.4,
                    }}
                  />

                  <Box sx={{ position: "relative", zIndex: 1 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      sx={{ mb: 3 }}
                    >
                      <ControlsIcon
                        sx={{
                          color: isRealTimeConnected
                            ? "success.main"
                            : "warning.main",
                          fontSize: 32,
                          animation: isRealTimeConnected
                            ? "spin 3s linear infinite"
                            : "shake 1s infinite",
                        }}
                      />
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: "bold",
                          color: isRealTimeConnected
                            ? "success.main"
                            : "warning.main",
                        }}
                      >
                        🎮 Real-Time Control Center
                      </Typography>
                      <Chip
                        icon={
                          isRealTimeConnected ? (
                            <OnlineIcon className="pulse-animation" />
                          ) : (
                            <OfflineIconAlt />
                          )
                        }
                        label={isRealTimeConnected ? "LIVE MODE" : "STANDBY"}
                        color={isRealTimeConnected ? "success" : "warning"}
                        size="small"
                        sx={{
                          fontWeight: "bold",
                          animation: isRealTimeConnected
                            ? "glow 2s infinite"
                            : "none",
                        }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={3}>
                      {!isRealTimeConnected ? (
                        <Button
                          variant="contained"
                          color="success"
                          size="large"
                          startIcon={
                            <LiveIcon
                              sx={{
                                animation: "pulse 1.5s infinite",
                              }}
                            />
                          }
                          onClick={connectToRealTimeTracking}
                          sx={{
                            bgcolor: "success.main",
                            color: "white",
                            px: 4,
                            py: 2,
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                            boxShadow: "0 6px 16px rgba(76, 175, 80, 0.4)",
                            "&:hover": {
                              bgcolor: "success.dark",
                              transform: "translateY(-3px)",
                              boxShadow: "0 8px 20px rgba(76, 175, 80, 0.5)",
                              animation: "glow 0.5s ease",
                            },
                          }}
                          className="bounce-animation"
                        >
                          🚀 Start Live Tracking
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="error"
                          size="large"
                          startIcon={
                            <StopIcon
                              sx={{
                                animation: "pulse 1.5s infinite",
                              }}
                            />
                          }
                          onClick={disconnectFromRealTimeTracking}
                          sx={{
                            bgcolor: "error.main",
                            color: "white",
                            px: 4,
                            py: 2,
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                            boxShadow: "0 6px 16px rgba(244, 67, 54, 0.4)",
                            "&:hover": {
                              bgcolor: "error.dark",
                              transform: "translateY(-3px)",
                              boxShadow: "0 8px 20px rgba(244, 67, 54, 0.5)",
                              animation: "shake 0.5s ease",
                            },
                          }}
                          className="pulse-animation"
                        >
                          ⏹️ Stop Live Tracking
                        </Button>
                      )}

                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={
                          <CleaningServicesIcon
                            sx={{
                              animation: "spin 2s linear infinite",
                            }}
                          />
                        }
                        onClick={() => setRealTimeUpdates([])}
                        sx={{
                          borderColor: "info.main",
                          color: "info.main",
                          px: 4,
                          py: 2,
                          fontWeight: "bold",
                          fontSize: "1.1rem",
                          "&:hover": {
                            borderColor: "info.dark",
                            color: "info.dark",
                            bgcolor: "info.light",
                            transform: "translateY(-3px)",
                            animation: "glow 0.5s ease",
                          },
                        }}
                        className="slide-in-animation"
                      >
                        🧹 Clear Updates Log
                      </Button>
                    </Stack>

                    {/* Connection Status */}
                    <Box
                      sx={{
                        mt: 3,
                        p: 2,
                        bgcolor: "rgba(255, 255, 255, 0.8)",
                        borderRadius: 1,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <StatusIcon
                          sx={{
                            color: isRealTimeConnected
                              ? "success.main"
                              : "warning.main",
                            animation: isRealTimeConnected
                              ? "heartbeat 2s infinite"
                              : "none",
                          }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                          Connection Status:
                        </Typography>
                        <Chip
                          label={
                            isRealTimeConnected
                              ? "🟢 LIVE CONNECTION ACTIVE"
                              : "🟡 WAITING TO CONNECT"
                          }
                          color={isRealTimeConnected ? "success" : "warning"}
                          sx={{
                            fontWeight: "bold",
                            animation: isRealTimeConnected
                              ? "pulse 2s infinite"
                              : "none",
                          }}
                        />
                      </Stack>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ElockGPSOperation;
