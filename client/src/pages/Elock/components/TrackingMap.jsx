import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
// eslint-disable-next-line import/no-webpack-loader-syntax
import mapboxgl from "!mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
// import PlayArrowIcon from "@mui/icons-material/PlayArrow";
// import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import Slider from "@mui/material/Slider";
import Swal from 'sweetalert2';
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
  Slide,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import MenuIcon from "@mui/icons-material/Menu";
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
// leaflet css removed
import axios from "axios";
import truckIcon from "../../../assets/truckpngs/greenTruck.png";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { generateJourneyReportPdf } from "../../../utils/generateJourneyReportPdf";
// API Configuration
const TOKEN_ID = "e36d2589-9dc3-4302-be7d-dc239af1846c";
const ADMIN_API_URL = "https://icloud.assetscontrols.com:3443/OpenApi/Admin";
const LBS_API_URL = "https://icloud.assetscontrols.com:3443/OpenApi/LBS";

// Custom numbered marker element for Mapbox
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const createNumberElement = (number, isFirst = false, isLast = false) => {
  const el = document.createElement("div");
  el.className = "custom-number-marker";
  const color = isFirst ? "#4CAF50" : isLast ? "#F44336" : "white";
  el.innerHTML = `<div class="marker-number" style="background-color: ${color}" title="${number}"></div>`;
  return el;
};

// Custom truck icon element for Mapbox
const createTruckElement = () => {
  const el = document.createElement("div");
  el.className = "custom-truck-marker";
  el.innerHTML = `<div class="truck-icon"><img src=${truckIcon} alt="truck" style="width: 100%; height: 100%; object-fit: contain;" /></div>`;
  return el;
};

// Custom destination icon element for Mapbox
const createDestinationElement = () => {
  const el = document.createElement("div");
  el.className = "custom-destination-marker";
  el.innerHTML = `<div class="destination-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#F44336">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>`;
  return el;
};

const animatePosition = (updateFn, startLngLat, endLngLat, duration, onComplete) => {
  let startTime = null;
  let animationFrame;

  const animate = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;
    const ratio = Math.min(progress / duration, 1);

    const currentLng = startLngLat[0] + (endLngLat[0] - startLngLat[0]) * ratio;
    const currentLat = startLngLat[1] + (endLngLat[1] - startLngLat[1]) * ratio;

    updateFn([currentLng, currentLat]);

    if (progress < duration) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      if (onComplete) onComplete();
    }
  };

  animationFrame = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationFrame);
};

const TrackingMap = ({
  isOpen,
  onClose,
  elockNo,
  containerId,
  containerData,
  source,
}) => {
  console.log("containerData", containerData);
  console.log("Elock No", elockNo);
  console.log("source", source);

  // --- Responsive States & Hooks ---
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedPointAddress, setSelectedPointAddress] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [shouldGeocode, setShouldGeocode] = useState(false);

  useEffect(() => {
    if (!selectedPoint) {
      setSelectedPointAddress("");
      return;
    }

    if (!shouldGeocode) {
      setSelectedPointAddress("");
      return;
    }

    const fetchAddressForPoint = async () => {
      setAddressLoading(true);
      setSelectedPointAddress("");
      const lat = selectedPoint.Lat;
      const lon = selectedPoint.Lon;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          { headers: { "Accept-Language": "en", "User-Agent": "AlVision-EXIM" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            setSelectedPointAddress(data.display_name);
          } else {
            setSelectedPointAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
          }
        } else {
          setSelectedPointAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        }
      } catch (error) {
        console.error("Error reverse geocoding point:", error);
        setSelectedPointAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
      } finally {
        setAddressLoading(false);
      }
    };

    fetchAddressForPoint();
  }, [selectedPoint, shouldGeocode]);

  const [showPath, setShowPath] = useState(true);
  const [is3DMode, setIs3DMode] = useState(false);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/novusha/cmrufice400dv01qz7jnq9hhu");
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
  const [isLockedToTarget, setIsLockedToTarget] = useState(true);

  const [lockPeriods, setLockPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [filteredData, setFilteredData] = useState([]);

  const [hoveredMarkerIndex, setHoveredMarkerIndex] = useState(null);
  const [mapVisualizationLoading, setMapVisualizationLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false); // <--- ADD THIS LINE

  const guidRef = useRef(null);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const mapKeyRef = useRef(0);

  // Mapbox refs
  const mapContainerRef = useRef(null);
  const mapboxMap = useRef(null);
  const mapboxMarkers = useRef([]);
  const truckMarkerRef = useRef(null);
  const liveTruckMarkerRef = useRef(null);
  const liveTruckAnimationRef = useRef(null);
  const playbackAnimationRef = useRef(null);
  const flatTruckMarkerRef = useRef(null);

  // Smart Follow Camera refs
  const isFollowingCenter = useRef(true);
  const isDefaultCamera = useRef(true);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackTimeoutRef = useRef(null);

  // Cleanup Mapbox
  useEffect(() => {
    return () => {
      if (flatTruckMarkerRef.current) {
        flatTruckMarkerRef.current.remove();
        flatTruckMarkerRef.current = null;
      }
      if (mapboxMap.current) {
        mapboxMap.current.remove();
        mapboxMap.current = null;
      }
      clearTimeout(playbackTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    guidRef.current = null;
    setIsInitialLoad(true);
    mapKeyRef.current += 1;
    setSelectedPoint(null);
    setShouldGeocode(false);
  }, [elockNo]);

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

  const extractLockPeriods = useCallback(
    (data) => {
      if (!data || data.length === 0) return [];

      const periods = [];
      let lockStartTime = null;
      let lockStartIndex = null;

      // Sort data by GPS time
      const sortedData = [...data].sort(
        (a, b) => new Date(a.GT) - new Date(b.GT)
      );

      for (let i = 0; i < sortedData.length; i++) {
        const point = sortedData[i];
        const pointTime = new Date(point.GT);
        const lockState = point.LR; // 0: Lock, 1: Unlock

        // If the lock state is 0 (locked) and we don't have a lock start time, start tracking
        if (lockState === 0 && lockStartTime === null) {
          lockStartTime = pointTime;
          lockStartIndex = i;
          continue;
        }

        // If the lock state is 1 (unlocked) and we have a lock start time, complete the period
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

      // Handle the case where the last point is still locked
      if (lockStartTime !== null) {
        // Use the last point's time instead of current time
        const endTime = new Date(sortedData[sortedData.length - 1].GT);

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

  const fetchAssetInfo = useCallback(async () => {
    try {
      const response = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FAction: "QueryAdminAssetByAssetId",
          FTokenID: TOKEN_ID,
          FAssetID: elockNo,
        }),
      });

      if (!response.ok) {
        throw new Error(`Asset request failed: ${response.statusText}`);
      }

      const result = await response.json();
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

  const fetchHistoryData = useCallback(
    async (guid) => {
      setHistoryLoading(true);
      try {
        const startTime = assignmentStartTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
        const endTime = assignmentEndTime || new Date();

        console.log(
          `🔄 Fetching history for GUID: ${guid}, Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`
        );

        const response = await fetch(LBS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            FAction: "QueryLBSTrackListByFGUID",
            FTokenID: TOKEN_ID,
            FGUID: guid,
            FType: 2,
            FAssetTypeID: 3701,
            FStartTime: startTime.toISOString(),
            FEndTime: endTime.toISOString(),
            FLanguage: 0,
            FDateType: 1,
          }),
        });

        if (!response.ok) {
          throw new Error(`History request failed: ${response.statusText}`);
        }

        const result = await response.json();

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

  async function fetchCurrentStatus(guid) {
    setCurrentLoading(true);
    try {
      const response = await fetch(LBS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FAction: "QueryLBSMonitorListByFGUIDs",
          FTokenID: TOKEN_ID,
          FGUIDs: guid,
          FType: 2,
        }),
      });

      if (!response.ok) {
        throw new Error(`Status request failed: ${response.statusText}`);
      }

      const result = await response.json();
      setCurrentInfo(result.FObject[0]);
    } catch (err) {
      console.error("❌ Error fetching current status:", err);
    } finally {
      setCurrentLoading(false);
    }
  }

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

  useEffect(() => {
    if (isOpen && elockNo) {
      console.log(`📍 TrackingMap opened for E-lock: ${elockNo}`);
      setHistoryData([]);
      setCurrentInfo(null);
      loadData();
    } else if (!isOpen) {
      // Clear cache and instances when modal is closed
      if (mapboxMap.current) {
        mapboxMap.current.remove();
        mapboxMap.current = null;
      }
      mapboxMarkers.current.forEach((m) => m.remove());
      mapboxMarkers.current = [];
      setMapLoaded(false);
      setHistoryData([]);
      setCurrentInfo(null);
      setFilteredData([]);
      setSelectedPoint(null);
      setAssetInfo(null);
      setAssignHistory([]);
      setIsInitialLoad(true);
      if (truckMarkerRef.current) {
        truckMarkerRef.current = null;
      }
      if (liveTruckMarkerRef.current) {
        liveTruckMarkerRef.current = null;
      }
      if (liveTruckAnimationRef.current) liveTruckAnimationRef.current();
      if (playbackAnimationRef.current) playbackAnimationRef.current();
      setIsPlaying(false);
      setPlaybackIndex(0);
      guidRef.current = null;
      mapKeyRef.current += 1;
      setShouldGeocode(false);
      setLastUpdate(null);
      setLockPeriods([]);
      setSelectedPeriod(null);
      setIsJourneyComplete(false);
      setAssignmentStartTime(null);
      setAssignmentEndTime(null);
      setIsLockedToTarget(true);
      isFollowingCenter.current = true;
      isDefaultCamera.current = true;
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

  // Extract lock periods when history data changes
  useEffect(() => {
    if (historyData.length > 0) {
      const periods = extractLockPeriods(historyData);
      setLockPeriods(periods);

      // If no period is selected, check for default selection
      if (selectedPeriod === null && periods.length > 0) {
        // Prioritize "ongoing" period
        const ongoingPeriod = periods.find((p) => p.type === "ongoing");
        if (ongoingPeriod) {
          setSelectedPeriod(ongoingPeriod.id);
        } else {
          // Fallback to the longest duration period if no ongoing period exists
          const sortedPeriods = [...periods].sort((a, b) => b.durationMs - a.durationMs);
          if (sortedPeriods.length > 0) {
            setSelectedPeriod(sortedPeriods[0].id);
          } else {
            setSelectedPeriod(periods[0].id);
          }
        }
      }
    }
  }, [historyData, extractLockPeriods, selectedPeriod]);

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

  useEffect(() => {
    const fetchAssignHistory = async () => {
      try {
        const apiUrl =
          source === "containers"
            ? `${process.env.REACT_APP_API_STRING}/elock/elock-status-history/${containerId}`
            : `${process.env.REACT_APP_API_STRING}/elock/elock-status-history-others/${containerId}`;

        const response = await axios.get(apiUrl);
        let history = [];
        if (response.data && response.data.success && response.data.data && response.data.data.history) {
          history = response.data.data.history;
        }

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
        if (error.response?.status === 404) {
          Swal.fire({
            icon: "info",
            title: "No History",
            text: error.response?.data?.message || "No e-lock status history found for this container",
          });
        }
      }
    };

    if (isOpen) {
      fetchAssignHistory();
    }
  }, [isOpen, extractAssignmentTimes, source, containerId]);

  const sortedData = useMemo(() => {
    return filteredData.length > 0
      ? filteredData
      : [...historyData].sort((a, b) => new Date(a.GT) - new Date(b.GT));
  }, [historyData, filteredData]);

  const pathPositions = useMemo(
    () => sortedData.map((point) => [point.Lat, point.Lon]),
    [sortedData]
  );

  // For map markers, we apply marker thinning to prevent browser hang
  // with a large number of tracking points. We show few key points:
  // start, end, lock status changes, and a regular sampled subset of the middle interval.
  const mapMarkers = useMemo(() => {
    // If we have few points, render all of them
    if (sortedData.length <= 50) {
      return sortedData.map((d, i) => ({ ...d, originalIndex: i }));
    }

    const sampleRate = Math.ceil(sortedData.length / 50);
    const indicesToInclude = new Set();

    // Always include first and last
    indicesToInclude.add(0);
    indicesToInclude.add(sortedData.length - 1);

    for (let i = 0; i < sortedData.length; i++) {
      // Include if lock status changes compared to previous
      if (i > 0 && sortedData[i].LR !== sortedData[i - 1].LR) {
        indicesToInclude.add(i);
        indicesToInclude.add(i - 1); // optionally add the previous point
      }

      // Include sample points to show the route progression
      if (i % sampleRate === 0) {
        indicesToInclude.add(i);
      }
    }

    // Sort indices and convert to marker objects with originalIndex
    const sortedIndices = Array.from(indicesToInclude).sort((a, b) => a - b);
    return sortedIndices.map(index => ({
      ...sortedData[index],
      originalIndex: index
    }));
  }, [sortedData]);

  // Initialize Mapbox map
  // 1. Initialize Mapbox EXACTLY ONCE
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (sortedData.length === 0) return;

    if (!mapboxMap.current) {
      mapboxMap.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: [Number(sortedData[0].Lon), Number(sortedData[0].Lat)],
        zoom: 15.5,
        pitch: 60,
        bearing: -17.6,
        antialias: true
      });

      mapboxMap.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      mapboxMap.current.on("load", () => {
        const map = mapboxMap.current;
        if (map) {
          try {
            // Load 3D model
            if (!map.hasModel || !map.hasModel('container')) {
              try {
                map.addModel('container', '/container.glb');
              } catch (e) {}
            }

            // Add source for the model
            if (!map.getSource('container-source')) {
              map.addSource('container-source', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: { rotation: [0, 0, ((sortedData[0]?.Dir || 0) + 180) % 360] },
                  geometry: {
                    type: 'Point',
                    coordinates: [Number(sortedData[0].Lon), Number(sortedData[0].Lat)]
                  }
                }
              });
            }

            // Add layer for the model
            if (!map.getLayer('container-model-layer')) {
              map.addLayer({
                id: 'container-model-layer',
                type: 'model',
                source: 'container-source',
                layout: {
                  'model-id': 'container'
                },
                paint: {
                  'model-rotation': ['get', 'rotation'],
                  'model-scale': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    2, [150000, 150000, 150000],
                    4, [35000, 35000, 35000],
                    6, [8500, 8500, 8500],
                    8, [2200, 2200, 2200],
                    10, [550, 550, 550],
                    12, [140, 140, 140],
                    14, [35, 35, 35],
                    16, [9, 9, 9],
                    18, [2.5, 2.5, 2.5],
                    20, [1.5, 1.5, 1.5]
                  ]
                }
              });
            }

            // Add 3D Terrain
            if (!map.getSource('mapbox-dem')) {
              map.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                'tileSize': 512,
                'maxzoom': 14
              });
            }
            map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

            // Add Atmospheric Sky
            if (!map.getLayer('sky')) {
              map.addLayer({
                'id': 'sky',
                'type': 'sky',
                'paint': {
                  'sky-type': 'atmosphere',
                  'sky-atmosphere-sun': [0.0, 90.0],
                  'sky-atmosphere-sun-intensity': 15
                }
              });
            }

            // Add 3D Building Extrusion
            const style = map.getStyle();
            const layers = (style && style.layers) || [];
            const labelLayerId = layers.find(
              (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
            )?.id;

            map.on('dragstart', (e) => {
              if (e.originalEvent) {
                setIsLockedToTarget(false);
                isFollowingCenter.current = false;
              }
            });
            map.on('zoomstart', (e) => {
              if (e.originalEvent) {
                setIsLockedToTarget(false);
                isDefaultCamera.current = false;
              }
            });
            map.on('pitchstart', (e) => {
              if (e.originalEvent) {
                isDefaultCamera.current = false;
              }
            });
            map.on('rotatestart', (e) => {
              if (e.originalEvent) {
                isDefaultCamera.current = false;
              }
            });

            if (map.getSource('composite') && !map.getLayer('3d-buildings')) {
              map.addLayer({
                'id': '3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15,
                'paint': {
                  'fill-extrusion-color': '#aaa',
                  'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
                  'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
                  'fill-extrusion-opacity': 0.6
                }
              }, labelLayerId);
            }
          } catch (error) {
            console.error("Error loading 3D terrain/sky/buildings layers:", error);
          }
        }

        // Create flat 2D truck marker (hidden by default in 3D mode)
        if (!flatTruckMarkerRef.current) {
          const truckEl = createTruckElement();
          truckEl.style.display = 'none'; // hidden in 3D mode
          flatTruckMarkerRef.current = new mapboxgl.Marker({ element: truckEl, rotationAlignment: 'map' })
            .setLngLat([Number(sortedData[0].Lon), Number(sortedData[0].Lat)])
            .setRotation(Number(sortedData[0]?.Dir || 0))
            .addTo(map);
        }

        handleBoundsSet();

        // TELL REACT THE MAP IS READY! 
        setMapLoaded(true);
      });
    }
  }, [sortedData, mapStyle]); // We no longer need updateMapboxData here

  // Toggle 2D / 3D mode
  useEffect(() => {
    const map = mapboxMap.current;
    if (!map || !mapLoaded) return;

    const layersToToggle = ['3d-buildings', 'sky', 'container-model-layer'];

    if (is3DMode) {
      map.setMaxPitch(85);
      map.easeTo({ pitch: 60, duration: 500 });
      map.dragRotate.enable();
      layersToToggle.forEach(id => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
      });
      if (flatTruckMarkerRef.current) {
        flatTruckMarkerRef.current.getElement().style.display = 'none';
      }
    } else {
      map.setMaxPitch(0);
      map.easeTo({ pitch: 0, bearing: 0, duration: 500 });
      map.dragRotate.enable(); // Allow 2D rotation
      layersToToggle.forEach(id => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
      });
      if (flatTruckMarkerRef.current) {
        flatTruckMarkerRef.current.getElement().style.display = '';
      }
    }
  }, [is3DMode, mapLoaded]);

  // 2. Draw Data whenever the Map is loaded OR data changes
  useEffect(() => {
    if (mapLoaded && sortedData.length > 0) {
      updateMapboxData();
    }
  }, [mapLoaded, sortedData, showPath, isPlaying, isJourneyComplete, isLockedToTarget, autoRefresh]);

  const updateMapboxData = () => {
    const map = mapboxMap.current;
    if (!map) return;

    // if (!map.isStyleLoaded()) {
    //     map.off('style.load', updateMapboxData);
    //     map.once('style.load', updateMapboxData);
    //     return;
    // }

    const coordinates = sortedData.map(p => [Number(p.Lon), Number(p.Lat)]);
    const geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: coordinates
      }
    };

    if (map.getSource('route')) {
      map.getSource('route').setData(geojson);
    } else {
      map.addSource('route', {
        type: 'geojson',
        data: geojson
      });

      map.addLayer({
        id: 'route-line-bg',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#0D47A1', 'line-width': 10, 'line-opacity': 0.8 }
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2196F3', 'line-width': 8, 'line-opacity': 0.9 }
      });
    }

    if (map.getLayer('route-line')) {
      map.setLayoutProperty('route-line-bg', 'visibility', showPath ? 'visible' : 'none');
      map.setLayoutProperty('route-line', 'visibility', showPath ? 'visible' : 'none');
    }

    // Update markers
    mapboxMarkers.current.forEach(m => m.remove());
    mapboxMarkers.current = [];

    mapMarkers.forEach((point) => {
      const index = point.originalIndex;
      const isLastPoint = index === sortedData.length - 1;

      if (isLastPoint) {
        // Handle live marker separately below
        return;
      }

      let el = createNumberElement(index + 1, index === 0, false);

      el.addEventListener('click', () => handleMarkerClick(index));
      el.addEventListener('mouseenter', () => handleMarkerMouseOver(index));
      el.addEventListener('mouseleave', () => handleMarkerMouseOut());

      const markerOptions = { element: el };

      const marker = new mapboxgl.Marker(markerOptions)
        .setLngLat([Number(point.Lon), Number(point.Lat)])
        .addTo(map);

      mapboxMarkers.current.push(marker);
    });

    // --- Live Truck Marker Logic ---
    const lastPoint = mapMarkers[mapMarkers.length - 1];
    if (lastPoint && !isPlaying) {
      const endLngLat = [Number(lastPoint.Lon), Number(lastPoint.Lat)];
      const dir = isJourneyComplete ? 180 : ((lastPoint.Dir || 0) + 180) % 360;
      const dir2D = isJourneyComplete ? 0 : Number(lastPoint.Dir || 0);

      if (!liveTruckMarkerRef.current) {
        liveTruckMarkerRef.current = { lngLat: endLngLat, isJourneyComplete };

        try {
          const src = map.getSource('container-source');
          if (src) {
            src.setData({
              type: 'Feature',
              properties: { rotation: [0, 0, dir] },
              geometry: { type: 'Point', coordinates: endLngLat }
            });
          }
        } catch (e) {}
        // Sync flat 2D marker
        if (flatTruckMarkerRef.current) {
          flatTruckMarkerRef.current.setLngLat(endLngLat).setRotation(dir2D);
        }
      } else {
        const startLngLat = liveTruckMarkerRef.current.lngLat;
        liveTruckMarkerRef.current.isJourneyComplete = isJourneyComplete;

        if (startLngLat[0] !== endLngLat[0] || startLngLat[1] !== endLngLat[1]) {
          // Animate for 2000ms
          if (liveTruckAnimationRef.current) liveTruckAnimationRef.current();
          liveTruckAnimationRef.current = animatePosition(
            (lngLat) => {
              liveTruckMarkerRef.current.lngLat = lngLat;
              try {
                const src = map.getSource('container-source');
                if (src) {
                  src.setData({
                    type: 'Feature',
                    properties: { rotation: [0, 0, dir] },
                    geometry: { type: 'Point', coordinates: lngLat }
                  });
                }
              } catch (e) {}
              // Sync flat 2D marker during animation
              if (flatTruckMarkerRef.current) {
                flatTruckMarkerRef.current.setLngLat(lngLat).setRotation(dir2D);
              }
            },
            startLngLat, endLngLat, 2000
          );
        } else {
          liveTruckMarkerRef.current.lngLat = endLngLat;
          try {
            const src = map.getSource('container-source');
            if (src) {
              src.setData({
                type: 'Feature',
                properties: { rotation: [0, 0, dir] },
                geometry: { type: 'Point', coordinates: endLngLat }
              });
            }
          } catch (e) {}
          // Sync flat 2D marker
          if (flatTruckMarkerRef.current) {
            flatTruckMarkerRef.current.setLngLat(endLngLat).setRotation(dir2D);
          }
        }
      }
    }

    // Camera and Auto-Zoom Logic
    if (coordinates.length > 0 && !isPlaying) {
      if (isJourneyComplete) {
        const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
        for (const coord of coordinates) {
          bounds.extend(coord);
        }
        map.fitBounds(bounds, { padding: 50 });
      } else if (autoRefresh && isFollowingCenter.current) {
        const lastCoord = coordinates[coordinates.length - 1];
        const lastPoint = sortedData[sortedData.length - 1];
        const cameraBearing = Number(lastPoint?.Dir || 0);
        if (isDefaultCamera.current) {
          map.easeTo({
            center: lastCoord,
            bearing: cameraBearing,
            pitch: 65,
            zoom: 17.5,
            duration: 1000,
            essential: true
          });
        } else {
          map.easeTo({
            center: lastCoord,
            duration: 1000,
            essential: true
          });
        }
      }
    }
  };

  // Playback Loop
  useEffect(() => {
    if (isPlaying) {
      playbackTimeoutRef.current = setTimeout(() => {
        setPlaybackIndex(prev => {
          if (prev >= sortedData.length - 1) {
            setIsPlaying(false);
            return sortedData.length - 1;
          }
          return prev + 1;
        });
      }, 500 / playbackSpeed);
    }
    return () => clearTimeout(playbackTimeoutRef.current);
  }, [isPlaying, playbackIndex, sortedData.length, playbackSpeed]);

  // Update Truck marker position during playback
  useEffect(() => {
    const map = mapboxMap.current;
    if (!map || sortedData.length === 0) return;

    if (!truckMarkerRef.current) {
      truckMarkerRef.current = { lngLat: [Number(sortedData[0].Lon), Number(sortedData[0].Lat)] };
    }

    if (sortedData[playbackIndex]) {
      const p = sortedData[playbackIndex];
      const endLngLat = [Number(p.Lon), Number(p.Lat)];
      const dir = ((p.Dir || 0) + 180) % 360;
      const dir2D = Number(p.Dir || 0);

      if (isPlaying || playbackIndex > 0) {
        if (isPlaying) {
          const startLngLat = truckMarkerRef.current.lngLat;
          const duration = 500 / playbackSpeed;

          if (startLngLat[0] !== endLngLat[0] || startLngLat[1] !== endLngLat[1]) {
            if (playbackAnimationRef.current) playbackAnimationRef.current();
            playbackAnimationRef.current = animatePosition(
              (lngLat) => {
                truckMarkerRef.current.lngLat = lngLat;
                try {
                  const src = map.getSource('container-source');
                  if (src) {
                    src.setData({
                      type: 'Feature',
                      properties: { rotation: [0, 0, dir] },
                      geometry: { type: 'Point', coordinates: lngLat }
                    });
                  }
                } catch (e) {}
                // Sync flat 2D marker during playback animation
                if (flatTruckMarkerRef.current) {
                  flatTruckMarkerRef.current.setLngLat(lngLat).setRotation(dir2D);
                }
              },
              startLngLat, endLngLat, duration
            );
          } else {
            truckMarkerRef.current.lngLat = endLngLat;
            try {
              const src = map.getSource('container-source');
              if (src) {
                src.setData({
                  type: 'Feature',
                  properties: { rotation: [0, 0, dir] },
                  geometry: { type: 'Point', coordinates: endLngLat }
                });
              }
            } catch (e) {}
            // Sync flat 2D marker
            if (flatTruckMarkerRef.current) {
              flatTruckMarkerRef.current.setLngLat(endLngLat).setRotation(dir2D);
            }
          }

          if (isFollowingCenter.current) {
            const cameraBearing = Number(p.Dir || 0);
            if (isDefaultCamera.current) {
              map.easeTo({
                center: endLngLat,
                bearing: cameraBearing,
                pitch: 65,
                zoom: 17.5,
                duration: duration,
                easing: (t) => t,
                essential: true
              });
            } else {
              map.easeTo({
                center: endLngLat,
                duration: duration,
                easing: (t) => t,
                essential: true
              });
            }
          }
          setSelectedPoint(p);
          setShouldGeocode(false);
        } else {
          if (playbackAnimationRef.current) playbackAnimationRef.current();
          truckMarkerRef.current.lngLat = endLngLat;
          try {
            const src = map.getSource('container-source');
            if (src) {
              src.setData({
                type: 'Feature',
                properties: { rotation: [0, 0, dir] },
                geometry: { type: 'Point', coordinates: endLngLat }
              });
            }
          } catch (e) {}
          // Sync flat 2D marker on seek
          if (flatTruckMarkerRef.current) {
            flatTruckMarkerRef.current.setLngLat(endLngLat).setRotation(dir2D);
          }
        }
      }
    }
  }, [playbackIndex, sortedData, isPlaying, playbackSpeed]);

  const handleRecenterCamera = () => {
    isFollowingCenter.current = true;
    isDefaultCamera.current = true;
    setIsLockedToTarget(true);
  };

  const togglePlayback = () => {
    if (sortedData.length === 0) return;
    if (!isPlaying && playbackIndex >= sortedData.length - 1) {
      setPlaybackIndex(0);
    }
    setIsPlaying(!isPlaying);
    setAutoRefresh(false);
    // Reset camera follow when starting playback
    isFollowingCenter.current = true;
    isDefaultCamera.current = true;
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setPlaybackIndex(0);
    if (sortedData.length > 0) {
      const endLngLat = [Number(sortedData[0].Lon), Number(sortedData[0].Lat)];
      if (truckMarkerRef.current) truckMarkerRef.current.lngLat = endLngLat;
      setSelectedPoint(null);
      setShouldGeocode(false);
    }
  };

  const handlePlaybackSeek = (event, newValue) => {
    setPlaybackIndex(newValue);
    if (sortedData[newValue]) {
      const p = sortedData[newValue];
      if (truckMarkerRef.current) {
        truckMarkerRef.current.lngLat = [Number(p.Lon), Number(p.Lat)];
      }
      if (mapboxMap.current) {
        mapboxMap.current.panTo([Number(p.Lon), Number(p.Lat)], { duration: 0 });
      }
      setSelectedPoint(p);
      setShouldGeocode(false);
    }
  };

  const handleMarkerClick = (index) => {
    setSelectedPoint(sortedData[index]);
    setShouldGeocode(true);
  };

  const handleMarkerMouseOver = (index) => {
    setHoveredMarkerIndex(index);
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

  const handleRefreshIntervalChange = (e) => {
    const newInterval = e.target.value;
    setRefreshInterval(newInterval);
    setNextRefreshIn(newInterval);
  };

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
  };

  const handleStyleChange = (e) => {
    setMapStyle(e.target.value);
    if (mapboxMap.current) {
      if (flatTruckMarkerRef.current) {
        flatTruckMarkerRef.current.remove();
        flatTruckMarkerRef.current = null;
      }
      mapboxMarkers.current.forEach((m) => m.remove());
      mapboxMarkers.current = [];
      if (liveTruckAnimationRef.current) liveTruckAnimationRef.current();
      if (playbackAnimationRef.current) playbackAnimationRef.current();
      liveTruckMarkerRef.current = null;
      truckMarkerRef.current = null;

      mapboxMap.current.remove();
      mapboxMap.current = null;
      setMapLoaded(false);
    }
  };

  const getElockNumber = () => {
    if (source === "containers") {
      return containerData?.elock_no || "N/A";
    } else {
      return containerData?.elock_no?.FAssetID || "N/A";
    }
  };

  const handleDownloadReport = async () => {
    if (sortedData.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Data",
        text: "No tracking data available to generate report",
      });
      return;
    }

    Swal.fire({
      title: "Generating Report...",
      text: "Fetching addresses for halts. Please wait...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      await generateJourneyReportPdf({
        sortedData,
        containerData,
        lockPeriods,
        selectedPeriod,
        currentInfo,
        isJourneyComplete,
        assignmentStartTime,
        assignmentEndTime,
        source,
      });
      Swal.close();
    } catch (e) {
      console.error("Report generation failed:", e);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to generate journey report PDF",
      });
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
              fontSize: { xs: "0.9rem", md: "1.1rem" },
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

          {containerData && !isMobile && (
            <Chip
              label={`Route: ${containerData.goods_pickup?.name || "Unknown"
                } → ${containerData.goods_delivery?.name || "Unknown"}`}
              size="small"
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 500,
              }}
            />
          )}

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
                  value={selectedPeriod ?? ""}
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

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Map Style</InputLabel>
              <Select
                value={mapStyle}
                label="Map Style"
                onChange={handleStyleChange}
              >
                <MenuItem value="mapbox://styles/novusha/cmrw2xtge00hf01qxhv06gnnh">Day</MenuItem>
                <MenuItem value="mapbox://styles/novusha/cmrufice400dv01qz7jnq9hhu">Dusk</MenuItem>
                <MenuItem value="mapbox://styles/novusha/cmrufhj1h00d201sccaynbzzq">Satellite</MenuItem>
              </Select>
            </FormControl>

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

                {!isJourneyComplete && (
                  <Button
                    variant={isLockedToTarget ? "contained" : "outlined"}
                    size="small"
                    color={isLockedToTarget ? "primary" : "inherit"}
                    startIcon={<LocationOn />}
                    onClick={handleRecenterCamera}
                    sx={{ opacity: isLockedToTarget ? 1 : 0.6 }}
                  >
                    Live Tracking
                  </Button>
                )}

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

                <FormControlLabel
                  control={
                    <Switch
                      checked={is3DMode}
                      onChange={() => setIs3DMode(!is3DMode)}
                      color="primary"
                    />
                  }
                  label="3D View"
                />

                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleDownloadReport}
                  disabled={sortedData.length === 0 || showLoading}
                >
                  Download Report
                </Button>
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

        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Floating Container Details Panel */}
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
                  variant="subtitle1"
                  sx={{
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontSize: "1rem",
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
                        variant="subtitle1"
                        sx={{
                          fontWeight: "bold",
                          mb: 1.5,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          fontSize: "0.95rem",
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
                          variant="subtitle1"
                          sx={{
                            fontWeight: "bold",
                            mb: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            fontSize: "0.95rem",
                          }}
                        >
                          🔋 Current Device Status
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
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
                        fontSize: "1rem",
                        fontWeight: "bold",
                        color: "primary.main",
                      }}
                    >
                      Route
                    </Typography>
                  </Stack>
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: "1.1rem",
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

          <Box
            sx={{
              flexGrow: 1,
              position: "relative",
              paddingLeft: { xs: 0, md: "30rem" },
              paddingRight: { xs: 0, md: "20px" },
            }}
          >
            <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
              <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />

              <Tooltip
                title={
                  <Box sx={{ p: 1, maxWidth: 300 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, borderBottom: '1px solid rgba(255,255,255,0.3)', pb: 0.5 }}>
                      Map Controls
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Zoom:</strong> Scroll wheel / Pinch (touch) / +/- buttons.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Rotate Map:</strong> Right-click + drag / Ctrl + Left-click + drag / Two-finger twist (touch).
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Tilt 3D:</strong> Right-click + drag up/down / Shift + Up/Down arrows / Two-finger drag up/down (touch).
                    </Typography>
                    <Typography variant="body2">
                      <strong>Reset North:</strong> Click the compass icon.
                    </Typography>
                  </Box>
                }
                placement="right-end"
                arrow
              >
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 20,
                    left: 20,
                    zIndex: 1000,
                    bgcolor: 'background.paper',
                    boxShadow: 2,
                    '&:hover': { bgcolor: 'background.paper' }
                  }}
                  size="small"
                >
                  <InfoOutlinedIcon />
                </IconButton>
              </Tooltip>

              {showLoading && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: "rgba(255, 255, 255, 0.7)",
                    zIndex: 1000,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <CircularProgress />
                </Box>
              )}

              {sortedData.length > 0 ? (
                <Paper sx={{
                  position: 'absolute',
                  bottom: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 10,
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  width: '80%',
                  maxWidth: 500,
                  bgcolor: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 4,
                }}>
                  <IconButton color="primary" onClick={togglePlayback}>
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                  <IconButton color="secondary" onClick={stopPlayback} disabled={playbackIndex === 0 && !isPlaying}>
                    <StopIcon />
                  </IconButton>
                  <Slider
                    value={playbackIndex}
                    min={0}
                    max={Math.max(0, sortedData.length - 1)}
                    onChange={handlePlaybackSeek}
                    disabled={sortedData.length <= 1}
                    sx={{ flexGrow: 1 }}
                  />
                  <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
                    {sortedData.length > 0 ? Math.round((playbackIndex / (sortedData.length - 1)) * 100) : 0}%
                  </Typography>
                  <FormControl size="small" variant="standard" sx={{ minWidth: 60, ml: 1 }}>
                    <Select
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(e.target.value)}
                      disableUnderline
                      sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}
                    >
                      <MenuItem value={0.5}>0.5x</MenuItem>
                      <MenuItem value={1}>1x</MenuItem>
                      <MenuItem value={2}>2x</MenuItem>
                      <MenuItem value={4}>4x</MenuItem>
                      <MenuItem value={8}>8x</MenuItem>
                    </Select>
                  </FormControl>
                </Paper>
              ) : (
                !showLoading && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "column",
                      gap: 2,
                      zIndex: 10,
                      bgcolor: "rgba(255, 255, 255, 0.8)",
                      p: 3,
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="h6" color="text.secondary">
                      No tracking history available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current device status is available in the panel on the left
                    </Typography>
                  </Box>
                )
              )}
            </Box>

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

          <Slide direction={isMobile ? "up" : "left"} in={Boolean(selectedPoint) && !isPlaying} mountOnEnter unmountOnExit>
            <Box
              sx={{
                width: { xs: "100%", md: 320 },
                position: "absolute",
                right: 0,
                bottom: 0,
                top: { xs: "auto", md: 0 },
                zIndex: 1100,
                maxHeight: { xs: "60vh", md: "100%" },
                height: { xs: "auto", md: "100%" },
                bgcolor: "background.paper",
                borderLeft: 1,
                borderColor: "divider",
                overflowY: "auto",
                borderTop: { xs: "1px solid #ddd", md: "none" },
                boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
              }}
            >
              {selectedPoint && (
                <>
                  <IconButton
                    aria-label="close"
                    onClick={() => setSelectedPoint(null)}
                    sx={{
                      color: "inherit",
                      position: "absolute",
                      right: 8,
                      top: 8,
                      "&:hover": {
                        bgcolor: "rgba(0,0,0,0.05)",
                      },
                      bgcolor: "rgba(255,255,255,0.8)",
                      zIndex: 1,
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1.5, fontSize: "1rem" }}>
                      📍 Coordinate Details
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
                          Actual Location
                        </Typography>
                        {addressLoading ? (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                            <CircularProgress size={14} />
                            <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                              Resolving address...
                            </Typography>
                          </Box>
                        ) : selectedPointAddress ? (
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "bold" }}
                          >
                            {selectedPointAddress}
                          </Typography>
                        ) : (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold", mb: 0.5 }}
                            >
                              {selectedPoint.Lat.toFixed(6)}, {selectedPoint.Lon.toFixed(6)}
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setShouldGeocode(true)}
                              sx={{
                                textTransform: "none",
                                fontSize: "0.75rem",
                                py: 0.25,
                                px: 1,
                                borderRadius: 1,
                              }}
                            >
                              Get exact location
                            </Button>
                          </Box>
                        )}
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
                </>
              )}
            </Box>
          </Slide>
        </Box>
      </DialogContent>

      <style jsx global>{`
        .custom-number-marker {
          color: white;
          border-radius: 50%;
          width: 8px;
          height: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid white;
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
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
          transform: scale(2.2);
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
        }

        .custom-truck-marker {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .custom-destination-marker {
          width: 80px;
          height: 80px;
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
