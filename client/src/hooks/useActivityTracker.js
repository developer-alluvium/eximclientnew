import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { getCookie } from "../utils/cookies";

// Get or generate session ID per browser tab session
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("exim_user_session_id");
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("exim_user_session_id", sessionId);
  }
  return sessionId;
};

export const useActivityTracker = () => {
  const location = useLocation();
  const eventBufferRef = useRef([]);
  const sessionIdRef = useRef(getSessionId());

  // Helper to send headers safely
  const getHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    const token =
      getCookie("superadmin_token") ||
      getCookie("access_token") ||
      getCookie("exim_user_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  // Flush buffered events to backend
  const flushEvents = async () => {
    if (eventBufferRef.current.length === 0) return;

    const eventsToSend = [...eventBufferRef.current];
    eventBufferRef.current = [];

    try {
      await axios.post(
        "/api/activity/log-events",
        { events: eventsToSend },
        { headers: getHeaders(), withCredentials: true }
      );
    } catch (err) {
      // Silently catch error to not disturb UI
      console.debug("Telemetry event flush failed silently:", err);
    }
  };

  // Heartbeat function
  const sendHeartbeatPing = async () => {
    const isActiveTab = !document.hidden && document.hasFocus();
    try {
      await axios.post(
        "/api/activity/heartbeat",
        {
          sessionId: sessionIdRef.current,
          isActiveTab,
          currentPath: window.location.pathname,
          secondsIncrement: 30,
        },
        { headers: getHeaders(), withCredentials: true }
      );
    } catch (err) {
      console.debug("Telemetry heartbeat failed silently:", err);
    }
  };

  // 1. Initial Heartbeat & 30-Second Interval Heartbeat
  useEffect(() => {
    // Initial ping on mount
    sendHeartbeatPing();

    const intervalId = setInterval(() => {
      sendHeartbeatPing();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  // 2. Track Route Navigation / Page Views
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Add page view event to buffer
    eventBufferRef.current.push({
      sessionId: sessionIdRef.current,
      eventType: "page_view",
      path: currentPath,
      elementId: "",
      elementText: `Visited page ${currentPath}`,
      timestamp: new Date().toISOString(),
    });

    // Flush immediately on route change
    flushEvents();
  }, [location.pathname]);

  // 3. Track Click Events
  useEffect(() => {
    const handleClick = (e) => {
      try {
        let target = e.target;
        if (!target) return;

        // Traverse up to find clickable container if clicked child element
        let depth = 0;
        while (
          target &&
          target !== document.body &&
          depth < 4 &&
          !target.getAttribute("onClick") &&
          !["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) &&
          !target.classList?.contains("MuiButtonBase-root") &&
          !target.classList?.contains("ant-btn")
        ) {
          target = target.parentElement;
          depth++;
        }

        if (!target || target === document.body) return;

        // Extract element text/identifier
        let text =
          target.getAttribute("data-track-name") ||
          target.getAttribute("aria-label") ||
          target.getAttribute("title") ||
          target.innerText ||
          target.value ||
          target.name ||
          "";

        text = text.trim().replace(/\s+/g, " ");
        if (text.length > 100) text = text.substring(0, 100) + "...";

        // Ignore clicks on huge structural container blocks without distinct text
        if (!text && !target.id) return;

        const eventData = {
          sessionId: sessionIdRef.current,
          eventType: "click",
          path: window.location.pathname,
          elementId: target.id || target.name || "",
          elementText: text || `<${target.tagName.toLowerCase()}>`,
          componentName: target.tagName.toLowerCase(),
          timestamp: new Date().toISOString(),
        };

        eventBufferRef.current.push(eventData);

        // If buffer gets large, flush early
        if (eventBufferRef.current.length >= 8) {
          flushEvents();
        }
      } catch (err) {
        // Silently catch error
      }
    };

    document.addEventListener("click", handleClick, true);

    // Buffer flush interval every 10 seconds
    const flushInterval = setInterval(() => {
      flushEvents();
    }, 10000);

    // Page unload listener to flush remaining events
    const handleUnload = () => {
      if (eventBufferRef.current.length > 0) {
        const payload = JSON.stringify({ events: eventBufferRef.current });
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/activity/log-events", blob);
        }
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      document.removeEventListener("click", handleClick, true);
      clearInterval(flushInterval);
      window.removeEventListener("beforeunload", handleUnload);
      flushEvents();
    };
  }, []);
};
