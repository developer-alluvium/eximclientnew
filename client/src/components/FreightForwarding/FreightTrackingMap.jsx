import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { parseDate } from "../../utils/dateUtils";

// Coordinates dictionary for common ports (UN/LOCODE or substring)
const PORT_COORDS = {
  "INMUN": [22.75, 69.7],      // Mundra
  "INNSA": [18.95, 72.95],     // Nhava Sheva
  "AEJEA": [25.01, 55.06],     // Jebel Ali
  "MXZLO": [19.05, -104.31],   // Manzanillo
  "USNYC": [40.71, -74.00],    // New York
  "TRMER": [36.80, 34.63],     // Mersin
  "JPNGO": [35.18, 136.90],    // Nagoya
  "INAMD": [23.07, 72.63],     // Ahmedabad
  "INMAA": [13.08, 80.27],     // Chennai
  "SGSIN": [1.35, 103.87],     // Singapore
  "NLRTM": [51.92, 4.48],      // Rotterdam
  "CNSHA": [31.23, 121.47],    // Shanghai
  "GBFXT": [51.96, 1.35],      // Felixstowe
  "USLAX": [33.74, -118.26],   // Los Angeles
  "INBOM": [19.07, 72.87],     // Mumbai
  "LKCMB": [6.92, 79.86],      // Colombo
  "ZAPLY": [-33.96, 25.62],    // Port Elizabeth
  "EGSUZ": [29.97, 32.55],     // Suez
  "BEANT": [51.22, 4.40],      // Antwerp
  "DEHAM": [53.55, 9.99],      // Hamburg
};

// Extract coordinates from known ports dictionary. Returns null if port is not recognized.
function getPortCoordinates(portStr) {
  if (!portStr) return null;
  
  const clean = portStr.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Try to find matching UN/LOCODE (5 chars)
  for (const code of Object.keys(PORT_COORDS)) {
    if (clean.includes(code)) return PORT_COORDS[code];
  }
  
  // Try matching names
  const nameMap = {
    "MUNDRA": [22.75, 69.7],
    "NHAVA": [18.95, 72.95],
    "JEBEL": [25.01, 55.06],
    "MANZANILLO": [19.05, -104.31],
    "NEW YORK": [40.71, -74.00],
    "MERSIN": [36.80, 34.63],
    "NAGOYA": [35.18, 136.90],
    "AHMEDABAD": [23.07, 72.63],
    "CHENNAI": [13.08, 80.27],
    "SINGAPORE": [1.35, 103.87],
    "ROTTERDAM": [51.92, 4.48],
    "SHANGHAI": [31.23, 121.47],
    "FELIXSTOWE": [51.96, 1.35],
    "LOS ANGELES": [33.74, -118.26],
    "MUMBAI": [19.07, 72.87],
    "COLOMBO": [6.92, 79.86],
    "PORT ELIZABETH": [-33.96, 25.62],
    "SUEZ": [29.97, 32.55],
    "ANTWERP": [51.22, 4.40],
    "HAMBURG": [53.55, 9.99],
  };
  
  for (const name of Object.keys(nameMap)) {
    if (portStr.toUpperCase().includes(name)) return nameMap[name];
  }
  
  return null;
}

// Module-level cache for geocoded ports (persists across re-renders)
const geocodeCache = new Map();

// Clean a port string for geocoding: strip codes, parenthesized text, noise words
function cleanPortString(portStr) {
  if (!portStr) return "";
  let s = portStr;

  // 1. Remove parenthesized UN/LOCODE codes like (USIAH), (INMUN), (AEJEA)
  s = s.replace(/\([^)]*\)/g, "");

  // 2. Remove leading UN/LOCODE-like codes (e.g. "INAMD4 -", "INNSA1 -")
  s = s.replace(/^[A-Z]{2}[A-Z0-9]{2,5}\s*[-–]\s*/i, "");

  // 3. Replace slashes with commas (e.g. "APT/HOUSTON" → "APT, HOUSTON")
  s = s.replace(/\//g, ", ");

  // 4. Remove noise words that confuse geocoding
  const noiseWords = ["APT", "INTERCONTINENTAL", "INTERNATIONAL", "TERMINAL", "PORT", "AIR PORT", "AIRPORT", "SEA PORT", "SEAPORT", "CONTAINER", "DOCK", "BERTH", "WHARF", "PIER"];
  for (const word of noiseWords) {
    s = s.replace(new RegExp("\\b" + word + "\\b", "gi"), "");
  }

  // 5. Clean up extra spaces, commas, dashes
  s = s.replace(/[,\s-]+/g, " ").trim();

  return s;
}

// Extract possible city name from port string (text after last slash or dash)
function extractCityName(portStr) {
  if (!portStr) return "";
  // Try after last "/"
  const slashParts = portStr.split("/");
  if (slashParts.length > 1) {
    const city = slashParts[slashParts.length - 1].replace(/\([^)]*\)/g, "").trim();
    if (city.length > 2) return city;
  }
  // Try after last " - "
  const dashParts = portStr.split(/\s*[-–]\s*/);
  if (dashParts.length > 1) {
    const city = dashParts[dashParts.length - 1].replace(/\([^)]*\)/g, "").trim();
    if (city.length > 2) return city;
  }
  return "";
}

// Single Nominatim fetch helper
async function nominatimSearch(query) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "EximExportApp/1.0"
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    }
  } catch (err) {
    console.warn("Nominatim search failed for:", query, err);
  }
  return null;
}

// Async function to resolve port coordinates: dictionary first, then Nominatim geocoding
async function resolvePortCoordinates(portStr) {
  if (!portStr) return null;
  
  // 1. Check hardcoded dictionary (instant)
  const dictResult = getPortCoordinates(portStr);
  if (dictResult) return dictResult;
  
  // 2. Check geocode cache
  const cacheKey = portStr.trim().toUpperCase();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);
  
  // 3. Build multiple search queries in priority order
  const cleaned = cleanPortString(portStr);
  const cityName = extractCityName(portStr);
  
  const queries = [];
  if (cleaned) queries.push(cleaned + " port");    // e.g. "GEORGE BUSH HOUSTON port"
  if (cleaned) queries.push(cleaned);              // e.g. "GEORGE BUSH HOUSTON"
  if (cityName) queries.push(cityName + " port");  // e.g. "HOUSTON port"
  if (cityName) queries.push(cityName);            // e.g. "HOUSTON"
  // Last resort: raw string
  queries.push(portStr.trim());

  // 4. Try each query until we get a result
  for (const query of queries) {
    const result = await nominatimSearch(query);
    if (result) {
      geocodeCache.set(cacheKey, result);
      return result;
    }
  }
  
  return null;
}

// Generate curved points for beautiful routing
const getCurvedPoints = (start, end) => {
  const points = [];
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = start[0] + (end[0] - start[0]) * t;
    const lng = start[1] + (end[1] - start[1]) * t;
    
    // Add arc shape based on distance
    const arcHeight = Math.sin(t * Math.PI) * (Math.abs(end[1] - start[1]) * 0.08);
    points.push([lat + arcHeight, lng]);
  }
  return points;
};

export default function FreightTrackingMap({ enquiry, onClose }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const progressMarkerRef = useRef(null);
  const polylineRef = useRef(null);

  // Read-only values from the enquiry prop
  const etaDate = enquiry.eta_date || "";
  const arrivalDate = enquiry.arrival_date || "";
  const delayReason = enquiry.delay_reason || "";

  // Detect shipment type details
  const isAir = enquiry.shipment_type && enquiry.shipment_type.toLowerCase().includes("air");
  const trackingNumber = enquiry.success_no || enquiry.enquiry_no;

  // Coordinate setup — async resolution with Nominatim fallback
  const [polCoords, setPolCoords] = useState(() => getPortCoordinates(enquiry.port_of_loading));
  const [podCoords, setPodCoords] = useState(() => getPortCoordinates(enquiry.port_of_destination));
  const [coordsLoading, setCoordsLoading] = useState(polCoords === null || podCoords === null);

  // Async resolve coordinates on mount or when ports change
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const needsPol = getPortCoordinates(enquiry.port_of_loading) === null && enquiry.port_of_loading;
      const needsPod = getPortCoordinates(enquiry.port_of_destination) === null && enquiry.port_of_destination;

      if (!needsPol && !needsPod) {
        // Both already resolved from dictionary
        setPolCoords(getPortCoordinates(enquiry.port_of_loading));
        setPodCoords(getPortCoordinates(enquiry.port_of_destination));
        setCoordsLoading(false);
        return;
      }

      setCoordsLoading(true);
      const [resolvedPol, resolvedPod] = await Promise.all([
        resolvePortCoordinates(enquiry.port_of_loading),
        resolvePortCoordinates(enquiry.port_of_destination),
      ]);

      if (!cancelled) {
        setPolCoords(resolvedPol);
        setPodCoords(resolvedPod);
        setCoordsLoading(false);
      }
    }
    resolve();
    return () => { cancelled = true; };
  }, [enquiry.port_of_loading, enquiry.port_of_destination]);

  const mapAvailable = polCoords !== null && podCoords !== null && !coordsLoading;
  const routePoints = mapAvailable ? getCurvedPoints(polCoords, podCoords) : [];

  // Compute travel times and progress
  const parsedStart = parseDate(enquiry.enquiry_date) || new Date();
  const parsedEta = parseDate(etaDate);
  const parsedArrival = parseDate(arrivalDate);

  const targetDate = parsedArrival ? parsedArrival : (parsedEta ? parsedEta : new Date(new Date().setDate(parsedStart.getDate() + 14)));
  
  // Current time representation
  const today = new Date();

  // Midnight normalized helper to get pure date day math
  const getMidnightDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const midnightToday = getMidnightDate(today);
  const midnightTarget = getMidnightDate(targetDate);

  // Determine realistic start date
  // A cargo from India to Mexico might take 30 days. If the user created the job 2 days ago,
  // the progress shouldn't be based on 2 days. It should use a synthetic start date based on typical transit.
  const assumedTransitDays = isAir ? 7 : 35;
  
  // The synthetic start date is Target - assumedTransitDays
  const syntheticStartDate = new Date(midnightTarget.getTime() - (assumedTransitDays * 24 * 60 * 60 * 1000));
  
  // Use whichever is earlier: the actual enquiry creation date, or the synthetic start date
  const actualStartDate = parsedStart < syntheticStartDate ? parsedStart : syntheticStartDate;
  const midnightStart = getMidnightDate(actualStartDate);

  // Calculate day difference
  const totalDays = Math.round((midnightTarget - midnightStart) / (24 * 60 * 60 * 1000));
  const elapsedDays = Math.round((midnightToday - midnightStart) / (24 * 60 * 60 * 1000));

  // ONLY count as arrived if arrivalDate is specified AND the arrival date has already passed or is today
  // Prevent empty strings from falsely triggering arrival
  const hasArrived = Boolean(arrivalDate && parsedArrival && getMidnightDate(parsedArrival) <= midnightToday);

  // Progress percentage calculation
  let progress = 0;
  if (hasArrived) {
    progress = 1.0;
  } else if (totalDays > 0) {
    const rawProgress = elapsedDays / totalDays;
    // Clamp progress: minimum 5% to show transit departure, maximum 98% until actually arrived
    progress = Math.max(elapsedDays >= 0 ? 0.05 : 0, Math.min(0.98, rawProgress));
  } else {
    progress = 0.5;
  }

  const currentCoords = routePoints[Math.min(Math.floor(progress * (routePoints.length - 1)), routePoints.length - 1)];

  // Delayed warning logic: only if not arrived yet, today is past ETA
  const isDelayed = !hasArrived && etaDate && midnightToday > getMidnightDate(parseDate(etaDate));

  // Helper to draw or update all markers/polylines on the map
  const updateMapElements = () => {
    const map = mapInstance.current;
    if (!map) return;

    // Custom HTML Icons
    const polIcon = L.divIcon({
      html: `
        <div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #10b981; animation: pulse 1.8s infinite; pointer-events: none;"></div>
        </div>
      `,
      className: "custom-pin",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const podIcon = L.divIcon({
      html: `
        <div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #ef4444; animation: pulse 1.8s infinite; pointer-events: none;"></div>
        </div>
      `,
      className: "custom-pin",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const vehicleIcon = L.divIcon({
      html: `
        <div style="background-color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 12px rgba(0,0,0,0.2); border: 2px solid ${isAir ? "#3b82f6" : "#fc8019"}; font-size: 20px;">
          ${isAir ? "✈️" : "🚢"}
        </div>
      `,
      className: "custom-vehicle",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // 1. Update or create startMarker
    if (startMarkerRef.current) {
      startMarkerRef.current.setLatLng(polCoords);
      startMarkerRef.current.setIcon(polIcon);
      startMarkerRef.current.setTooltipContent(`<b>POL:</b> ${enquiry.port_of_loading || "Origin"}`);
    } else {
      startMarkerRef.current = L.marker(polCoords, { icon: polIcon }).addTo(map);
      startMarkerRef.current.bindTooltip(`<b>POL:</b> ${enquiry.port_of_loading || "Origin"}`, { permanent: false, direction: "top" });
    }

    // 2. Update or create endMarker
    if (endMarkerRef.current) {
      endMarkerRef.current.setLatLng(podCoords);
      endMarkerRef.current.setIcon(podIcon);
      endMarkerRef.current.setTooltipContent(`<b>POD:</b> ${enquiry.port_of_destination || "Destination"}`);
    } else {
      endMarkerRef.current = L.marker(podCoords, { icon: podIcon }).addTo(map);
      endMarkerRef.current.bindTooltip(`<b>POD:</b> ${enquiry.port_of_destination || "Destination"}`, { permanent: false, direction: "top" });
    }

    // 3. Update or create progressMarker (vehicle)
    if (progressMarkerRef.current) {
      progressMarkerRef.current.setLatLng(currentCoords);
      progressMarkerRef.current.setIcon(vehicleIcon);
      progressMarkerRef.current.setTooltipContent(`<b>Shipment Status:</b> ${hasArrived ? "Arrived" : "In Transit"}`);
    } else {
      progressMarkerRef.current = L.marker(currentCoords, { icon: vehicleIcon }).addTo(map);
      progressMarkerRef.current.bindTooltip(`<b>Shipment Status:</b> ${hasArrived ? "Arrived" : "In Transit"}`, { permanent: true, direction: "top" });
    }

    // 4. Update or create polyline path
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(routePoints);
      polylineRef.current.setStyle({
        color: isAir ? "#3b82f6" : "#fc8019"
      });
    } else {
      polylineRef.current = L.polyline(routePoints, {
        color: isAir ? "#3b82f6" : "#fc8019",
        weight: 3,
        dashArray: "8, 10",
        className: "animated-polyline",
        opacity: 0.8
      }).addTo(map);
    }

    // 5. Fit bounds to contain both ports
    const group = L.featureGroup([startMarkerRef.current, endMarkerRef.current]);
    map.fitBounds(group.getBounds().pad(0.15));
  };

  // Flag: dialog is fully open and map div is ready for Leaflet
  const [mapReady, setMapReady] = useState(false);

  // Called by MUI Dialog when the enter transition completes
  const handleDialogEntered = useCallback(() => {
    setMapReady(true);
  }, []);

  // Initialize Leaflet Map ONLY after the dialog is fully open
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    // Prevent double-init
    if (mapInstance.current) return;

    // Inject pulse animations & Dash styles (only if not already present)
    let style = document.getElementById("leaflet-map-pulse-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "leaflet-map-pulse-style";
      style.innerHTML = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.6); opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -40;
          }
        }
        .animated-polyline {
          animation: dash 25s linear infinite;
        }
        .custom-pin {
          border: none !important;
          background: none !important;
        }
        .custom-vehicle {
          border: none !important;
          background: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Initialize Map Instance
    const map = L.map(mapRef.current, {
      zoomControl: true,
      maxZoom: 18,
      minZoom: 2,
    });
    mapInstance.current = map;

    // OpenStreetMap tiles (reliable worldwide)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Initial render of elements
    updateMapElements();

    // Force Leaflet to recalculate container size now that dialog is fully open
    map.invalidateSize();

    // Use ResizeObserver for safety — if container resizes at any point, recalculate
    let resizeObserver;
    if (mapRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      progressMarkerRef.current = null;
      polylineRef.current = null;
    };
  }, [mapReady]); // Only runs when mapReady flips to true

  // Update map elements when any dependency changes, without destroying the map
  useEffect(() => {
    if (!mapInstance.current) return;
    updateMapElements();
  }, [
    JSON.stringify(polCoords),
    JSON.stringify(podCoords),
    JSON.stringify(currentCoords),
    isAir,
    hasArrived
  ]);

  // Format delivery time headers
  const getEtaHeader = () => {
    if (hasArrived) {
      return {
        title: "Shipment Delivered",
        sub: `Arrived on ${arrivalDate.split("-").reverse().join("/")}`,
        color: "#10b981",
      };
    }
    if (arrivalDate) {
      // Final arrival date is defined but in the future
      const days = Math.ceil((midnightTarget.getTime() - midnightToday.getTime()) / (1000 * 60 * 60 * 24));
      return {
        title: `Arriving in ${days > 0 ? days : 0} ${days === 1 ? "day" : "days"}`,
        sub: `Scheduled: ${arrivalDate.split("-").reverse().join("/")}`,
        color: "#fc8019",
      };
    }
    if (isDelayed) {
      return {
        title: "Shipment Delayed",
        sub: `Scheduled ETA: ${etaDate ? etaDate.split("-").reverse().join("/") : "-"}`,
        color: "#ef4444",
      };
    }
    if (etaDate) {
      const days = Math.ceil((midnightTarget.getTime() - midnightToday.getTime()) / (1000 * 60 * 60 * 24));
      return {
        title: `Arriving in ${days > 0 ? days : 0} ${days === 1 ? "day" : "days"}`,
        sub: `Estimated: ${etaDate.split("-").reverse().join("/")}`,
        color: "#fc8019",
      };
    }
    return {
      title: "Tracking Details",
      sub: "ETA date pending update",
      color: "#6b7280",
    };
  };

  const etaInfo = getEtaHeader();

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown
      TransitionProps={{ onEntered: handleDialogEntered }}
      PaperProps={{
        style: {
          borderRadius: 8,
          overflow: "hidden",
          height: "90vh",
          maxHeight: 720,
          margin: 16,
        },
      }}
    >
      {/* Dialog Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#16408f",
          px: 3,
          py: 1.5,
          color: "#fff",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
            Live Shipment Tracker
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8, fontSize: 11 }}>
            Job Reference: {trackingNumber} | Mode: {isAir ? "Air Freight" : "Ocean Freight"}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "#fff", p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Main Container */}
      <DialogContent sx={{ p: 0, height: "100%", display: "flex", overflow: "hidden" }}>
        
        {/* Left Panel: Swiggy/Zomato Tracking Info */}
        <Box
          sx={{
            width: "38%",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            backgroundColor: "#fcfcfd",
            p: 3,
          }}
        >
          {/* Pulse Banner */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              p: 2,
              mb: 2.5,
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            {/* Pulsing indicator */}
            <Box sx={{ position: "relative", width: 10, height: 10, mr: 0.5 }}>
              <Box
                sx={{
                  position: "absolute",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: etaInfo.color,
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: etaInfo.color,
                  animation: "pulse 1.5s infinite",
                  opacity: 0.5,
                }}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: etaInfo.color, lineHeight: 1.2 }}>
                {etaInfo.title}
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b", fontSize: 11.5, mt: 0.2 }}>
                {etaInfo.sub}
              </Typography>
            </Box>
          </Box>

          {/* Warning delay alert if delayed */}
          {isDelayed && (
            <Box
              sx={{
                backgroundColor: "#fffbeb",
                border: "1px solid #fef3c7",
                borderRadius: 2,
                p: 2,
                mb: 2.5,
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#b45309", display: "flex", alignItems: "center", gap: 0.5 }}>
                ⚠️ SHIPMENT DELAY ALERT
              </Typography>
              <Typography sx={{ fontSize: 11, color: "#d97706", mt: 0.5, lineHeight: 1.4 }}>
                {delayReason ? delayReason : "Shipment is delayed past its ETA. Reason details are being logged by dispatch."}
              </Typography>
            </Box>
          )}

          {/* Timeline Tracking */}
          <Box sx={{ pl: 1, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b", fontSize: 11.5, mb: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Shipment Milestones
            </Typography>

            {/* Vertical Milestones */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              
              {/* Step 1: Confirmed */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Box sx={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: "bold" }}>
                    ✓
                  </Box>
                  <Box sx={{ width: 2, flexGrow: 1, minHeight: 24, backgroundColor: "#10b981" }} />
                </Box>
                <Box sx={{ pb: 2.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: "#1e293b" }}>Booking Confirmed</Typography>
                  <Typography sx={{ fontSize: 10.5, color: "#64748b" }}>Order placed & vessel bookings secured</Typography>
                </Box>
              </Box>

              {/* Step 2: Left POL */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: progress > 0 ? "#10b981" : "#e2e8f0",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {progress > 0 ? "✓" : "2"}
                  </Box>
                  <Box sx={{ width: 2, flexGrow: 1, minHeight: 24, backgroundColor: progress > 0.05 ? "#10b981" : "#e2e8f0" }} />
                </Box>
                <Box sx={{ pb: 2.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: progress > 0 ? "#1e293b" : "#94a3b8" }}>
                    Departed POL
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: "#64748b" }}>
                    {enquiry.port_of_loading ? `Left port of loading: ${enquiry.port_of_loading}` : "Departed origin port"}
                  </Typography>
                </Box>
              </Box>

              {/* Step 3: In Transit */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: hasArrived ? "#10b981" : (progress > 0 ? "#fc8019" : "#e2e8f0"),
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {hasArrived ? "✓" : "3"}
                  </Box>
                  <Box sx={{ width: 2, flexGrow: 1, minHeight: 24, backgroundColor: hasArrived ? "#10b981" : "#e2e8f0" }} />
                </Box>
                <Box sx={{ pb: 2.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: progress > 0 ? "#1e293b" : "#94a3b8" }}>
                    In Transit
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: "#64748b" }}>
                    {hasArrived ? "Completed sea/air journey" : `Moving along route: ${Math.round(progress * 100)}% progress`}
                  </Typography>
                </Box>
              </Box>

              {/* Step 4: Arrived */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: hasArrived ? "#10b981" : "#e2e8f0",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {hasArrived ? "✓" : "4"}
                  </Box>
                </Box>
                <Box sx={{ pb: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: hasArrived ? "#10b981" : "#94a3b8" }}>
                    Arrived at POD
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: "#64748b" }}>
                    {enquiry.port_of_destination ? `Reached final port: ${enquiry.port_of_destination}` : "Arrived at destination port"}
                  </Typography>
                </Box>
              </Box>

            </Box>
          </Box>
        </Box>

        {/* Right Panel: Leaflet Map Container or Unavailable Message */}
        <Box sx={{ width: "62%", height: "100%", position: "relative" }}>
          {mapAvailable ? (
            <>
              <div ref={mapRef} style={{ width: "100%", height: "100%", outline: "none" }} />
              
              {/* Overlay info box on map (like Swiggy maps showing rider info) */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 20,
                  right: 20,
                  zIndex: 1000,
                  backgroundColor: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  borderRadius: 2,
                  p: 2,
                  width: 250,
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 11, color: "#16408f", textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.5 }}>
                  Vessel/Cargo Details
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: "#334155" }}>
                  {enquiry.bl_details?.vessel_name || "N/A"}
                </Typography>
                {enquiry.bl_details?.voyage_no && (
                  <Typography sx={{ fontSize: 11, color: "#64748b" }}>
                    Voyage: {enquiry.bl_details.voyage_no}
                  </Typography>
                )}
                
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Origin Port:</span>
                    <span style={{ fontSize: "10px", color: "#1e293b", fontWeight: "700" }}>{enquiry.port_of_loading || "N/A"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Destination Port:</span>
                    <span style={{ fontSize: "10px", color: "#1e293b", fontWeight: "700" }}>{enquiry.port_of_destination || "N/A"}</span>
                  </div>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8fafc",
              gap: 2,
            }}>
              {coordsLoading ? (
                <>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: "50%",
                    border: "3px solid #e2e8f0", borderTopColor: "#16408f",
                    animation: "spin 0.8s linear infinite",
                    "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                  }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#64748b" }}>
                    Locating Ports...
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: "#94a3b8", textAlign: "center", maxWidth: 280 }}>
                    Resolving coordinates for {enquiry.port_of_loading || "origin"} → {enquiry.port_of_destination || "destination"}
                  </Typography>
                </>
              ) : (
                <>
                  <Box sx={{ fontSize: 48, opacity: 0.3 }}>{isAir ? "✈️" : "🚢"}</Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#64748b" }}>
                    Map Not Available
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#94a3b8", textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
                    {!polCoords && !podCoords
                      ? `Could not locate "${enquiry.port_of_loading || "—"}" and "${enquiry.port_of_destination || "—"}".`
                      : !polCoords
                        ? `Could not locate origin port "${enquiry.port_of_loading || "—"}".`
                        : `Could not locate destination port "${enquiry.port_of_destination || "—"}".`
                    }
                  </Typography>
                </>
              )}
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid #e2e8f0", width: 250 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Origin Port:</span>
                  <span style={{ fontSize: "10px", color: "#1e293b", fontWeight: "700" }}>{enquiry.port_of_loading || "N/A"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Destination Port:</span>
                  <span style={{ fontSize: "10px", color: "#1e293b", fontWeight: "700" }}>{enquiry.port_of_destination || "N/A"}</span>
                </div>
              </Box>
            </Box>
          )}
        </Box>

      </DialogContent>
    </Dialog>
  );
}
