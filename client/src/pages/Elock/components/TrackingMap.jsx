import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import { Icon, divIcon } from "leaflet";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Card,
  CardContent,
  Divider,
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import MenuIcon from "@mui/icons-material/Menu"; // Added from UI source
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {
  Route as RouteIcon,
  LocalShipping,
  DirectionsBoat,
  Lock,
  Phone,
  Person,
  Numbers,
  ConfirmationNumber,
  DirectionsCar,
  LocationOn,
} from "@mui/icons-material";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import truckIcon from "../assets/images/truckLong.svg";

// Fix for default Leaflet markers
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// API Configuration - Using backend proxy to avoid mixed content errors
const BASE_API_URL = process.env.REACT_APP_API_STRING;
const ELOCK_PROXY_URL = `${BASE_API_URL}/elock`;

// Custom numbered marker icon with hover effect (From Second Code Logic)
const createNumberIcon = (number, isFirst = false, isLast = false) => {
  const color = isFirst ? "#4CAF50" : isLast ? "#F44336" : "white";
  return divIcon({
    className: "custom-number-marker",
    html: `<div class="marker-number" style="background-color: ${color}" title="${number}"></div>`,
    iconSize: [10, 10],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

// Custom truck icon for active/ongoing journey (From Second Code Logic)
const createTruckIcon = () => {
  return divIcon({
    className: "custom-truck-marker",
    html: `<div class="truck-icon">
           <img src=${truckIcon} alt="truck" />
          </div>`,
    iconSize: [50, 50],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

// Custom destination icon for completed journey (From Second Code Logic)
const createDestinationIcon = () => {
  return divIcon({
    className: "custom-destination-marker",
    html: `<div class="destination-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#F44336">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

// Auto-adjust map bounds to fit all markers
const MapBounds = ({ positions, onBoundsSet }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = positions.map((pos) => [pos.Lat, pos.Lon]);
      map.fitBounds(bounds, { padding: [50, 50] });

      if (onBoundsSet) {
        setTimeout(() => {
          onBoundsSet();
        }, 1000);
      }
    }
  }, [map, positions, onBoundsSet]);
  return null;
};

// Component to update map center when new data arrives
const MapCenterUpdater = ({ center }) => {
  const map = useMap();
  const [userInteracted, setUserInteracted] = useState(false);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    const handleUserInteraction = () => {
      setUserInteracted(true);
      userInteractedRef.current = true;
    };

    map.on("dragstart", handleUserInteraction);
    map.on("zoomstart", handleUserInteraction);

    return () => {
      map.off("dragstart", handleUserInteraction);
      map.off("zoomstart", handleUserInteraction);
    };
  }, [map]);

  useEffect(() => {
    if (
      center &&
      center.length === 2 &&
      !userInteracted &&
      !userInteractedRef.current
    ) {
      map.panTo(center);
    }
  }, [map, center, userInteracted]);

  return null;
};

const TrackingMap = ({
  isOpen,
  onClose,
  elockNo,
  containerId,
  containerData,
  source,
}) => {
  // --- UI Responsive State (From First Code) ---
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Logic State (From Second Code) ---
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [showPath, setShowPath] = useState(true);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentLoading, setCurrentLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [assetInfo, setAssetInfo] = useState(null);
  const [currentInfo, setCurrentInfo] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(30);

  const [assignHistory, setAssignHistory] = useState([]);
  const [assignmentStartTime, setAssignmentStartTime] = useState(null);
  const [assignmentEndTime, setAssignmentEndTime] = useState(null);
  const [isJourneyComplete, setIsJourneyComplete] = useState(false);

  const [lockPeriods, setLockPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [filteredData, setFilteredData] = useState([]);

  const [hoveredMarkerIndex, setHoveredMarkerIndex] = useState(null);
  const [mapVisualizationLoading, setMapVisualizationLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const guidRef = useRef(null);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const mapRef = useRef(null);
  const mapKeyRef = useRef(0);

  // --- Effect: Reset GUID when elockNo changes ---
  useEffect(() => {
    guidRef.current = null;
    setIsInitialLoad(true);
    mapKeyRef.current += 1;
  }, [elockNo]);

  // --- Helper: Format Duration ---
  const formatDuration = (startTime, endTime) => {
    const diffMs = endTime - startTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`;
    } else {
      return `${diffMins}m`;
    }
  };

  // --- Logic: Extract Lock Periods ---
  const extractLockPeriods = useCallback(
    (data) => {
      if (!data || data.length === 0) return [];

      const periods = [];
      let lockStartTime = null;
      let lockStartIndex = null;

      const sortedData = [...data].sort(
        (a, b) => new Date(a.GT) - new Date(b.GT)
      );

      for (let i = 0; i < sortedData.length; i++) {
        const point = sortedData[i];
        const pointTime = new Date(point.GT);
        const lockState = point.LR; // 0: Lock, 1: Unlock

        if (lockState === 0 && lockStartTime === null) {
          lockStartTime = pointTime;
          lockStartIndex = i;
          continue;
        }

        if (lockState === 1 && lockStartTime !== null) {
          const endTime = pointTime;
          const duration = formatDuration(lockStartTime, endTime);

          periods.push({
            id: periods.length,
            type: "completed",
            startTime: lockStartTime,
            endTime: endTime,
            startIndex: lockStartIndex,
            endIndex: i - 1,
            duration: duration,
            durationMs: endTime - lockStartTime,
          });

          lockStartTime = null;
          lockStartIndex = null;
        }
      }

      if (lockStartTime !== null) {
        const endTime = isJourneyComplete
          ? new Date(sortedData[sortedData.length - 1].GT)
          : new Date();

        const duration = formatDuration(lockStartTime, endTime);

        periods.push({
          id: periods.length,
          type: "ongoing",
          startTime: lockStartTime,
          endTime: endTime,
          startIndex: lockStartIndex,
          endIndex: sortedData.length - 1,
          duration: duration,
          durationMs: endTime - lockStartTime,
        });
      }

      return periods;
    },
    [isJourneyComplete]
  );

  // --- Logic: Extract Assignment Times ---
  const extractAssignmentTimes = useCallback((history) => {
    if (!history || history.length === 0)
      return { startTime: null, endTime: null, isComplete: false };

    const sortedHistory = [...history].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    const lastAssignedEntry = sortedHistory.find(
      (entry) => entry.change === "UNASSIGNED to ASSIGNED"
    );

    if (!lastAssignedEntry)
      return { startTime: null, endTime: null, isComplete: false };

    const startTime = new Date(lastAssignedEntry.timestamp);

    const returnedEntry = history.find(
      (entry) =>
        entry.change === "ASSIGNED to RETURNED" &&
        new Date(entry.timestamp) > startTime
    );

    const endTime = returnedEntry ? new Date(returnedEntry.timestamp) : null;
    const isComplete = !!endTime;

    return { startTime, endTime, isComplete };
  }, []);

  // --- API: Fetch Asset Info ---
  const fetchAssetInfo = useCallback(async () => {
    try {
      const response = await axios.get(`${ELOCK_PROXY_URL}/asset-info/${elockNo}`);
      const result = response.data;
      
      if (result.Result === 200 && result.FObject?.length > 0) {
        setAssetInfo(result.FObject[0]);
        const guid = result.FObject[0].FGUID;
        guidRef.current = guid;
        return guid;
      } else {
        throw new Error("No asset data found");
      }
    } catch (err) {
      console.error("Fetch asset error:", err);
      throw err;
    }
  }, [elockNo]);

  // --- API: Fetch History Data ---
  const fetchHistoryData = useCallback(
    async (guid) => {
      setHistoryLoading(true);
      try {
        const startTime = assignmentStartTime;
        const endTime = assignmentEndTime || new Date();

        // Check if startTime is null before proceeding
        if (!startTime) {
          console.warn(
            "⚠️ Assignment start time is not available yet. Skipping history fetch."
          );
          setHistoryLoading(false);
          return;
        }

        // console.log(
        //   `🔄 Fetching history for GUID: ${guid}, Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`
        // );

        const response = await axios.post(`${ELOCK_PROXY_URL}/track-history`, {
          guid: guid,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          type: 2,
          assetTypeId: 3701
        });

        const result = response.data;

        if (result.Result === 200 && result.FObject) {
          setHistoryData((prevData) => {
            if (prevData.length > 0) {
              const sortedOldData = [...prevData].sort(
                (a, b) => new Date(a.GT) - new Date(b.GT)
              );
              const lastOldPointTime = new Date(
                sortedOldData[sortedOldData.length - 1].GT
              );

              const newPoints = result.FObject.filter(
                (point) => new Date(point.GT) > lastOldPointTime
              );

              return [...prevData, ...newPoints];
            } else {
              return result.FObject;
            }
          });

          setLastUpdate(new Date());
          setError(null);
        } else {
          setHistoryData([]);
        }
      } catch (err) {
        console.error("❌ Fetch history error:", err);
        setError(`Failed to fetch history: ${err.message}`);
      } finally {
        setHistoryLoading(false);
      }
    },
    [assignmentStartTime, assignmentEndTime, elockNo]
  );

  // --- API: Fetch Current Status ---
  async function fetchCurrentStatus(guid) {
    setCurrentLoading(true);
    try {
      const response = await axios.get(`${ELOCK_PROXY_URL}/location/${guid}`, {
        params: { type: 2 }
      });
      const result = response.data.data || response.data; // Adjusted for backend response wrapper
      if (result.FObject && result.FObject.length > 0) {
        setCurrentInfo(result.FObject[0]);
      }
    } catch (err) {
      console.error("❌ Error fetching current status:", err);
    } finally {
      setCurrentLoading(false);
    }
  }

  // --- Load Data Orchestrator ---
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let guid = guidRef.current;

      if (!guid) {
        guid = await fetchAssetInfo();
      }

      if (guid) {
        guidRef.current = guid;
        await Promise.all([fetchHistoryData(guid), fetchCurrentStatus(guid)]);
      }
    } catch (err) {
      setError(err.message || "Failed to load tracking data");
    } finally {
      setLoading(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [fetchAssetInfo, fetchHistoryData, isInitialLoad]);

  // --- Effect: Initial Load on Open ---
  useEffect(() => {
    if (isOpen && elockNo) {
      console.log(`📍 TrackingMap opened for E-lock: ${elockNo}`);
      setHistoryData([]);
      setCurrentInfo(null);
      loadData();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [isOpen, elockNo, loadData]);

  // --- Effect: Process History for Lock Periods ---
  useEffect(() => {
    if (historyData.length > 0) {
      const periods = extractLockPeriods(historyData);
      setLockPeriods(periods);

      if (!selectedPeriod && periods.length > 0) {
        setSelectedPeriod(periods[0].id);
      }
    }
  }, [historyData, extractLockPeriods, selectedPeriod]);

  // --- Effect: Filter Data by Period ---
  useEffect(() => {
    if (selectedPeriod !== null && lockPeriods.length > 0) {
      const period = lockPeriods.find((p) => p.id === selectedPeriod);
      if (period) {
        const sortedData = [...historyData].sort(
          (a, b) => new Date(a.GT) - new Date(b.GT)
        );
        const filtered = sortedData.slice(
          period.startIndex,
          period.endIndex + 1
        );
        setFilteredData(filtered);
      }
    } else {
      setFilteredData(
        [...historyData].sort((a, b) => new Date(a.GT) - new Date(b.GT))
      );
    }
  }, [selectedPeriod, lockPeriods, historyData]);

  // --- Effect: Auto Refresh ---
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isOpen || !autoRefresh || !guidRef.current || isJourneyComplete) {
      return;
    }

    const isOngoingPeriod =
      selectedPeriod !== null &&
      lockPeriods.find((p) => p.id === selectedPeriod)?.type === "ongoing";

    if (selectedPeriod !== null && !isOngoingPeriod) {
      return;
    }

    intervalRef.current = setInterval(() => {
      if (guidRef.current) {
        Promise.all([
          fetchHistoryData(guidRef.current),
          fetchCurrentStatus(guidRef.current),
        ]);
      }
      setNextRefreshIn(refreshInterval);
    }, refreshInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    isOpen,
    autoRefresh,
    refreshInterval,
    fetchHistoryData,
    isJourneyComplete,
    guidRef.current,
    selectedPeriod,
    lockPeriods,
  ]);

  // --- Effect: Countdown Timer ---
  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (!isOpen || !autoRefresh || isJourneyComplete) {
      return;
    }

    const isOngoingPeriod =
      selectedPeriod !== null &&
      lockPeriods.find((p) => p.id === selectedPeriod)?.type === "ongoing";

    if (selectedPeriod !== null && !isOngoingPeriod) {
      return;
    }

    setNextRefreshIn(refreshInterval);

    countdownRef.current = setInterval(() => {
      setNextRefreshIn((prev) => {
        if (prev <= 1) {
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [
    isOpen,
    autoRefresh,
    refreshInterval,
    isJourneyComplete,
    selectedPeriod,
    lockPeriods,
  ]);

  // --- Effect: Update Ongoing Period Duration ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (lockPeriods.length > 0) {
        const ongoingPeriod = lockPeriods.find((p) => p.type === "ongoing");
        if (ongoingPeriod) {
          const updatedPeriods = lockPeriods.map((p) => {
            if (p.id === ongoingPeriod.id) {
              const newEndTime = new Date();
              return {
                ...p,
                endTime: newEndTime,
                duration: formatDuration(p.startTime, newEndTime),
                durationMs: newEndTime - p.startTime,
              };
            }
            return p;
          });
          setLockPeriods(updatedPeriods);
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [lockPeriods]);

  // --- Effect: Fetch Assignment History ---
  useEffect(() => {
    const fetchAssignHistory = async () => {
      try {
        const apiUrl =
          source === "containers"
            ? `${ELOCK_PROXY_URL}/elock-status-history/${containerId}`
            : `${ELOCK_PROXY_URL}/elock-status-history-others/${containerId}`;

        console.log(apiUrl);
        const response = await axios.get(apiUrl);
        const history = response.data.data.history;
        setAssignHistory(history);

        const { startTime, endTime, isComplete } =
          extractAssignmentTimes(history);
        setAssignmentStartTime(startTime);
        setAssignmentEndTime(endTime);
        setIsJourneyComplete(isComplete);

        if (startTime && guidRef.current) {
          await Promise.all([
            fetchHistoryData(guidRef.current),
            fetchCurrentStatus(guidRef.current),
          ]);
        }
      } catch (error) {
        console.error("❌ Error fetching history:", error);
      }
    };

    if (isOpen) {
      fetchAssignHistory();
    }
  }, [isOpen, extractAssignmentTimes, source, containerId]);

  // --- Data Processing for Map ---
  const sortedData = useMemo(() => {
    return filteredData.length > 0
      ? filteredData
      : [...historyData].sort((a, b) => new Date(a.GT) - new Date(b.GT));
  }, [historyData, filteredData]);

  const pathPositions = useMemo(
    () => sortedData.map((point) => [point.Lat, point.Lon]),
    [sortedData]
  );

  // --- Event Handlers ---
  const handleMarkerClick = (index) => {
    setSelectedPoint(sortedData[index]);
  };

  const handleMarkerMouseOver = (index) => {
    setHoveredMarkerIndex(index);
    setSelectedPoint(sortedData[index]);
  };

  const handleMarkerMouseOut = () => {
    setHoveredMarkerIndex(null);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    return date.toLocaleString("en-GB", options);
  };

  const getBatteryColor = (level) => {
    if (level > 60) return "#4CAF50";
    if (level > 30) return "#FFC107";
    return "#F44336";
  };

  const getLockStatus = (status) => (status === 1 ? "Unlocked" : "Locked");

  const getLocationTypeLabel = (type) => {
    return type === 1 ? "GPS" : type === 2 ? "LBS" : "Unknown";
  };

  const handleRefresh = () => {
    setLoading(true);
    loadData();
    setNextRefreshIn(refreshInterval);
  };

  const toggleAutoRefresh = () => {
    const newState = !autoRefresh;
    setAutoRefresh(newState);
    if (newState) {
      setNextRefreshIn(refreshInterval);
    }
  };

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
  };

  const getElockNumber = () => {
    if (source === "containers") {
      return containerData?.elock_no || "N/A";
    } else {
      return containerData?.elock_no?.FAssetID || "N/A";
    }
  };

  const handleBoundsSet = useCallback(() => {
    if (isInitialLoad) {
      setMapVisualizationLoading(false);
    }
  }, [isInitialLoad]);

  useEffect(() => {
    if (sortedData.length > 0 && isInitialLoad) {
      setMapVisualizationLoading(true);
    }
  }, [sortedData, isInitialLoad]);

  const showLoading = loading || historyLoading || currentLoading;
  const hasData = sortedData.length > 0 || currentInfo;

  // --- RENDER (Using UI structure from First Code) ---
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: "95vh",
          height: "95vh",
          minWidth: "95vw",
        },
      }}
    >
      {/* Title Bar (First Code Style) */}
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          bgcolor: "primary.light",
          color: "primary.contrastText",
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {/* Mobile Menu Icon */}
          <IconButton
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            sx={{
              display: { xs: "flex", md: "none" },
              color: "inherit",
              mr: 1,
            }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: { xs: "1rem", md: "1.25rem" },
            }}
          >
            📍 Elock Tracking History
            <Typography
              component="span"
              sx={{
                fontWeight: 500,
                display: { xs: "none", sm: "inline" },
                ml: 1,
              }}
            >
              — E-lock No: {getElockNumber()}
            </Typography>
          </Typography>

          {/* Route Info Chip */}
          {containerData && !isMobile && (
            <Chip
              label={`Route: ${
                containerData.goods_pickup?.name || "Unknown"
              } → ${containerData.goods_delivery?.name || "Unknown"}`}
              size="small"
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 500,
              }}
            />
          )}

          {/* Last Updated Chip */}
          {lastUpdate && !isMobile && (
            <Chip
              label={`Updated: ${lastUpdate.toLocaleTimeString()}`}
              size="small"
              sx={{
                bgcolor: "success.light",
                color: "success.contrastText",
                fontWeight: 500,
              }}
            />
          )}

          {/* Auto Refresh Chip */}
          {autoRefresh && !isJourneyComplete && !isMobile && (
            <Chip
              icon={<RefreshIcon fontSize="small" />}
              label={`Next refresh: ${nextRefreshIn}s`}
              size="small"
              sx={{
                bgcolor: "info.light",
                color: "info.contrastText",
                fontWeight: 500,
              }}
            />
          )}

          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: "inherit",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.15)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ p: 0, display: "flex", flexDirection: "column", height: "100%" }}
      >
        {/* Controls Bar (First Code Style) */}
        <Box
          sx={{
            p: 2,
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ gap: 1 }}
          >
            <Chip
              label={
                isJourneyComplete ? "Journey Complete" : "Journey in Progress"
              }
              color={isJourneyComplete ? "success" : "warning"}
              variant="outlined"
              size={isMobile ? "small" : "medium"}
            />

            {assignmentStartTime && !isMobile && (
              <Chip
                label={`Start: ${formatTime(assignmentStartTime)}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}

            {assignmentEndTime && !isMobile && (
              <Chip
                label={`End: ${formatTime(assignmentEndTime)}`}
                size="small"
                color="secondary"
                variant="outlined"
              />
            )}

            {lockPeriods.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Lock Period</InputLabel>
                <Select
                  value={selectedPeriod || ""}
                  label="Lock Period"
                  onChange={handlePeriodChange}
                >
                  <MenuItem value="">All Periods</MenuItem>
                  {lockPeriods.map((period) => (
                    <MenuItem key={period.id} value={period.id}>
                      🔒 {period.duration}
                      {period.type === "ongoing" && " (ongoing)"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {!isMobile && (
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={toggleAutoRefresh}
                      color="success"
                      disabled={isJourneyComplete}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {autoRefresh ? (
                        <PlayArrowIcon fontSize="small" />
                      ) : (
                        <PauseIcon fontSize="small" />
                      )}
                      <Typography variant="body2">Auto Refresh</Typography>
                    </Stack>
                  }
                />

                <Button
                  variant="contained"
                  size="small"
                  startIcon={
                    showLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <RefreshIcon />
                    )
                  }
                  onClick={handleRefresh}
                  disabled={showLoading}
                >
                  Refresh Now
                </Button>

                <FormControlLabel
                  control={
                    <Switch
                      checked={showPath}
                      onChange={() => setShowPath(!showPath)}
                      color="primary"
                    />
                  }
                  label="Show Path"
                />
              </>
            )}

            {isMobile && (
              <Button
                variant="contained"
                size="small"
                onClick={handleRefresh}
                disabled={showLoading}
              >
                {showLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  "Refresh"
                )}
              </Button>
            )}

            <Chip
              label={`${sortedData.length} Points`}
              color="info"
              size="small"
              variant="outlined"
            />
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {showLoading && !hasData && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexGrow: 1,
              p: 4,
            }}
          >
            <Stack alignItems="center" spacing={2}>
              <CircularProgress />
              <Typography>
                {currentLoading && !historyLoading
                  ? "Loading current status..."
                  : historyLoading && !currentLoading
                  ? "Loading tracking history..."
                  : "Loading tracking data..."}
              </Typography>
            </Stack>
          </Box>
        )}

        {!showLoading && !hasData && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexGrow: 1,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No tracking data available for the selected assignment
            </Typography>
          </Box>
        )}

        {hasData && (
          <Box
            sx={{
              display: "flex",
              flexGrow: 1,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Floating Container Details Panel (First Code UI) */}
            {containerData && (
              <Paper
                elevation={6}
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: { xs: "100%", md: "30rem" },
                  height: "100%",
                  overflowY: "auto",
                  zIndex: 1000,
                  borderRadius: { xs: 0, md: 3 },
                  bgcolor: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  display: {
                    xs: isMobileMenuOpen ? "flex" : "none",
                    md: "flex",
                  },
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    position: "sticky",
                    top: 0,
                    bgcolor: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(6px)",
                    borderBottom: "1px solid #eee",
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    📦 Container Details
                  </Typography>

                  <Box sx={{ flexGrow: 1 }} />
                  <IconButton
                    onClick={() => setIsMobileMenuOpen(false)}
                    sx={{ display: { xs: "flex", md: "none" } }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>

                <Box sx={{ p: 3 }}>
                  {currentInfo ? (
                    <Card
                      variant="outlined"
                      sx={{
                        mb: 3,
                        background: "linear-gradient(135deg, #f5f9ff, #eef2ff)",
                        border: "1px solid #dbe2f0",
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: "bold",
                            mb: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          🔋 Current Device Status
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              {currentInfo.FOnline === 1 ? (
                                <WifiIcon color="success" />
                              ) : (
                                <WifiOffIcon color="error" />
                              )}
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Online Status
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {currentInfo.FOnline === 1
                                    ? "Online"
                                    : "Offline"}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>

                          <Grid item xs={6}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              {currentInfo.FLockStatus === 1 ? (
                                <LockOpenIcon color="success" />
                              ) : currentInfo.FLockStatus === 0 ? (
                                <LockIcon color="error" />
                              ) : (
                                <LockIcon color="disabled" />
                              )}
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Lock Status
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {currentInfo.FLockStatus === 1
                                    ? "Unlocked"
                                    : currentInfo.FLockStatus === 0
                                    ? "Locked"
                                    : "Undefined"}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>

                          <Grid item xs={6}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <BatteryChargingFullIcon
                                sx={{
                                  color: getBatteryColor(currentInfo.FBattery),
                                }}
                              />
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Battery Level
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {currentInfo.FBattery}%
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>

                          <Grid item xs={6}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <SignalCellularAltIcon
                                sx={{
                                  color:
                                    currentInfo.FCellSignal > 10
                                      ? "#4CAF50"
                                      : currentInfo.FCellSignal > 5
                                      ? "#FFC107"
                                      : "#F44336",
                                }}
                              />
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Cell Signal
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {currentInfo.FCellSignal}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>

                          <Grid item xs={12}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <AccessTimeIcon color="primary" />
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  GPS Time (UTC)
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {formatTime(currentInfo.FGPSTime)}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>

                          <Grid item xs={12}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <AccessTimeIcon color="secondary" />
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Data Receive Time (UTC)
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {formatTime(currentInfo.FRecvTime)}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ) : (
                    currentLoading && (
                      <Card
                        variant="outlined"
                        sx={{
                          mb: 3,
                          background:
                            "linear-gradient(135deg, #f5f9ff, #eef2ff)",
                          border: "1px solid #dbe2f0",
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: "bold",
                              mb: 2,
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            🔋 Current Device Status
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              p: 3,
                            }}
                          >
                            <Stack alignItems="center" spacing={2}>
                              <CircularProgress size={30} />
                              <Typography variant="body2">
                                Loading current status...
                              </Typography>
                            </Stack>
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  )}

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      mb: 3,
                      background: "linear-gradient(135deg, #f5f9ff, #eef2ff)",
                      border: "1px solid #dbe2f0",
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      justifyContent="center"
                    >
                      <RouteIcon color="primary" />
                      <Typography
                        sx={{
                          fontSize: "1.1rem",
                          fontWeight: "bold",
                          color: "primary.main",
                        }}
                      >
                        Route
                      </Typography>
                    </Stack>
                    <Typography
                      sx={{
                        mt: 1,
                        fontSize: "1.3rem",
                        fontWeight: 600,
                        textAlign: "center",
                        color: "#333",
                      }}
                    >
                      {containerData.goods_pickup?.name || "Unknown"} ➜{" "}
                      {containerData.goods_delivery?.name || "Unknown"}
                    </Typography>
                  </Paper>

                  <Stack spacing={2.5}>
                    {[
                      {
                        label: "LR Number",
                        value: containerData.tr_no,
                        icon: <ConfirmationNumber color="primary" />,
                      },
                      {
                        label: "Consignee",
                        value: containerData.consignee?.name,
                        icon: <Person color="primary" />,
                      },
                      {
                        label: "Consignor",
                        value: containerData.consignor?.name,
                        icon: <Person color="primary" />,
                      },
                      {
                        label: "Container Number",
                        value: containerData.container_number,
                        icon: <DirectionsBoat color="primary" />,
                      },
                      {
                        label: "E-lock Number",
                        value: getElockNumber(),
                        icon: <Lock color="primary" />,
                      },
                    ].map((item, index) => (
                      <Box
                        key={index}
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <IconButton
                          size="small"
                          sx={{
                            bgcolor: "#f1f5f9",
                            borderRadius: "0.8rem",
                            "&:hover": { bgcolor: "#e2e8f0" },
                          }}
                        >
                          {item.icon}
                        </IconButton>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {item.label}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: "bold", color: "#333" }}
                          >
                            {item.value || "N/A"}
                          </Typography>
                        </Box>
                      </Box>
                    ))}

                    <Divider sx={{ my: 1 }} />

                    <Typography
                      variant="subtitle2"
                      sx={{
                        mt: 1,
                        fontWeight: "bold",
                        color: "primary.main",
                      }}
                    >
                      Driver & Vehicle Details
                    </Typography>

                    {[
                      {
                        label: "Driver Name",
                        value: containerData.driver_name,
                        icon: <Person color="primary" />,
                      },
                      {
                        label: "Driver Phone",
                        value: containerData.driver_phone,
                        icon: <Phone color="primary" />,
                      },
                      {
                        label: "Vehicle Number",
                        value: containerData.vehicle_no,
                        icon: <DirectionsCar color="primary" />,
                      },
                    ].map((item, index) => (
                      <Box
                        key={index}
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <IconButton
                          size="small"
                          sx={{
                            bgcolor: "#f1f5f9",
                            borderRadius: "0.8rem",
                            "&:hover": { bgcolor: "#e2e8f0" },
                          }}
                        >
                          {item.icon}
                        </IconButton>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {item.label}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: "bold", color: "#333" }}
                          >
                            {item.value || "N/A"}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Paper>
            )}

            {/* Map Container Box (First Code UI) */}
            <Box
              sx={{
                flexGrow: 1,
                position: "relative",
                paddingLeft: { xs: 0, md: "30rem" },
                paddingRight: { xs: 0, md: "20px" },
              }}
            >
              {sortedData.length > 0 ? (
                <MapContainer
                  key={mapKeyRef.current}
                  center={[
                    sortedData[sortedData.length - 1]?.Lat || 0,
                    sortedData[sortedData.length - 1]?.Lon || 0,
                  ]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  ref={mapRef}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />

                  <MapBounds
                    positions={sortedData}
                    onBoundsSet={handleBoundsSet}
                  />

                  <MapCenterUpdater
                    center={[
                      sortedData[sortedData.length - 1]?.Lat || 0,
                      sortedData[sortedData.length - 1]?.Lon || 0,
                    ]}
                  />

                  {showPath && sortedData.length > 1 && (
                    <>
                      <Polyline
                        positions={pathPositions}
                        color="#0D47A1"
                        weight={10}
                        opacity={0.8}
                        smoothFactor={1}
                      />
                      <Polyline
                        positions={pathPositions}
                        color="#2196F3"
                        weight={8}
                        opacity={0.9}
                        smoothFactor={1}
                      />
                    </>
                  )}

                  {sortedData.map((point, index) => {
                    const isLastPoint = index === sortedData.length - 1;
                    let icon;

                    if (isLastPoint) {
                      icon = isJourneyComplete
                        ? createDestinationIcon()
                        : createTruckIcon();
                    } else {
                      icon = createNumberIcon(index + 1, index === 0, false);
                    }

                    return (
                      <Marker
                        key={`${point.GT}-${index}`}
                        position={[point.Lat, point.Lon]}
                        icon={icon}
                        eventHandlers={{
                          click: () => handleMarkerClick(index),
                          mouseover: () => {
                            handleMarkerMouseOver(index);
                          },
                          mouseout: () => {
                            handleMarkerMouseOut();
                            setSelectedPoint(null);
                          },
                        }}
                        opacity={
                          hoveredMarkerIndex === index || isLastPoint ? 1 : 3
                        }
                      >
                        <Popup>
                          <Box sx={{ minWidth: 200 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: "bold", mb: 1 }}
                            >
                              Point {index + 1}{" "}
                              {index === 0
                                ? "(Start)"
                                : isLastPoint
                                ? isJourneyComplete
                                  ? "(Destination)"
                                  : "(Current Location)"
                                : ""}
                            </Typography>
                            <Stack spacing={0.5}>
                              <Typography variant="caption">
                                <strong>GPS Time:</strong>{" "}
                                {formatTime(point.GT)}
                              </Typography>
                              <Typography variant="caption">
                                <strong>Receive Time:</strong>{" "}
                                {formatTime(point.RT)}
                              </Typography>
                              <Typography variant="caption">
                                <strong>Position:</strong>{" "}
                                {point.Lat.toFixed(6)}, {point.Lon.toFixed(6)}
                              </Typography>
                              <Typography variant="caption">
                                <strong>Speed:</strong> {point.Speed} km/h
                              </Typography>
                              <Typography variant="caption">
                                <strong>Direction:</strong> {point.Dir}°
                              </Typography>
                              <Typography variant="caption">
                                <strong>Mileage:</strong> {point.Mil} km
                              </Typography>
                              <Typography variant="caption">
                                <strong>Battery:</strong>{" "}
                                <span
                                  style={{ color: getBatteryColor(point.Bat) }}
                                >
                                  {point.Bat}%
                                </span>
                              </Typography>
                              <Typography variant="caption">
                                <strong>Lock:</strong> {getLockStatus(point.LR)}
                              </Typography>
                              <Typography variant="caption">
                                <strong>Location Type:</strong>{" "}
                                <Chip
                                  label={getLocationTypeLabel(point.LType)}
                                  size="small"
                                  color={
                                    point.LType === 1 ? "success" : "warning"
                                  }
                                  sx={{ height: 16, fontSize: "0.7rem" }}
                                />
                              </Typography>
                              <Typography variant="caption">
                                <strong>GPS Signal:</strong> {point.GS}
                              </Typography>
                              <Typography variant="caption">
                                <strong>Cell Signal:</strong> {point.CS}
                              </Typography>
                            </Stack>
                          </Box>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              ) : (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {historyLoading ? (
                    <>
                      <CircularProgress size={60} />
                      <Typography variant="h6">
                        Loading tracking history...
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="h6" color="text.secondary">
                        No tracking history available
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Current device status is available in the panel on the
                        left
                      </Typography>
                    </>
                  )}
                </Box>
              )}

              {mapVisualizationLoading && isInitialLoad && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    bgcolor: "rgba(255, 255, 255, 0.8)",
                    zIndex: 1000,
                  }}
                >
                  <Stack alignItems="center" spacing={2}>
                    <CircularProgress size={60} thickness={4} />
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      Visualizing tracking data...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Please wait while we render all {sortedData.length}{" "}
                      tracking points
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Box>

            {/* Selected Point Details Panel (From First Code UI) */}
            {selectedPoint && (
              <Box
                sx={{
                  width: { xs: "100%", md: 320 },
                  position: { xs: "absolute", md: "static" },
                  bottom: { xs: 0, md: "auto" },
                  left: { xs: 0, md: "auto" },
                  zIndex: { xs: 1100, md: 0 },
                  maxHeight: { xs: "60vh", md: "100%" },
                  bgcolor: "background.paper",
                  borderLeft: 1,
                  borderColor: "divider",
                  overflowY: "auto",
                  borderTop: { xs: "1px solid #ddd", md: "none" },
                  boxShadow: { xs: "0 -4px 10px rgba(0,0,0,0.1)", md: "none" },
                }}
              >
                <IconButton
                  aria-label="close"
                  onClick={() => setSelectedPoint(null)}
                  sx={{
                    color: "inherit",
                    position: "absolute",
                    right: 8,
                    top: 8,
                    "&:hover": { bgcolor: "rgba(0,0,0,0.05)" },
                    bgcolor: "rgba(255,255,255,0.8)",
                  }}
                >
                  <CloseIcon />
                </IconButton>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                    📍 Point Details
                  </Typography>

                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        GPS Time
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {formatTime(selectedPoint.GT)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Receive Time
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {formatTime(selectedPoint.RT)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Coordinates
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "bold", fontFamily: "monospace" }}
                      >
                        {selectedPoint.Lat.toFixed(6)},{" "}
                        {selectedPoint.Lon.toFixed(6)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Speed
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {selectedPoint.Speed} km/h
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Direction
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {selectedPoint.Dir}°
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Mileage
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {selectedPoint.Mil} km
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Battery Level
                      </Typography>
                      <Chip
                        label={`${selectedPoint.Bat}%`}
                        size="small"
                        sx={{
                          bgcolor: getBatteryColor(selectedPoint.Bat),
                          color: "white",
                          fontWeight: "bold",
                        }}
                      />
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Lock Status
                      </Typography>
                      <Chip
                        label={getLockStatus(selectedPoint.LR)}
                        size="small"
                        color={selectedPoint.LR === 0 ? "error" : "success"}
                      />
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Location Type
                      </Typography>
                      <Chip
                        label={getLocationTypeLabel(selectedPoint.LType)}
                        size="small"
                        color={
                          selectedPoint.LType === 1 ? "success" : "warning"
                        }
                      />
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        GPS Signal
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {selectedPoint.GS}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Cell Signal
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {selectedPoint.CS}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Network Info
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                      >
                        MCC: {selectedPoint.MCC}
                        <br />
                        MNC: {selectedPoint.MNC}
                        <br />
                        LAC: {selectedPoint.LAC}
                        <br />
                        CID: {selectedPoint.CID}
                      </Typography>
                    </Box>

                    {selectedPoint.Temp1 > -1000 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Temperature
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {selectedPoint.Temp1}°C
                        </Typography>
                      </Box>
                    )}

                    {selectedPoint.Hum1 > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Humidity
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {selectedPoint.Hum1}%
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <style jsx global>{`
        .custom-number-marker {
          color: white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .marker-number {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .custom-number-marker:hover {
          transform: scale(1.2);
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }

        .custom-truck-marker,
        .custom-destination-marker {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .custom-truck-marker:hover,
        .custom-destination-marker:hover {
          transform: scale(1.2);
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
        }

        .truck-icon,
        .destination-icon {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </Dialog>
  );
};

export default TrackingMap;
