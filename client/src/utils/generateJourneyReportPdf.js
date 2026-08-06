import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import { Chart, registerables } from "chart.js";
import logo from "../assets/images/srcc.png";

// Apply jspdf-autotable plugin to jsPDF (v5 requires explicit plugin registration)
applyPlugin(jsPDF);

// Register all Chart.js components for offscreen rendering
Chart.register(...registerables);

// ─── CONFIGURABLE THRESHOLDS ───
const SPEED_LIMIT = 60; // km/h
const HALT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ─── COLOR PALETTE ───
const COLORS = {
  primary: [33, 150, 243], // #2196F3
  primaryDark: [13, 71, 161], // #0D47A1
  success: [76, 175, 80], // #4CAF50
  warning: [255, 193, 7], // #FFC107
  error: [244, 67, 54], // #F44336
  gray: [158, 158, 158], // #9E9E9E
  lightGray: [240, 240, 240],
  white: [255, 255, 255],
  black: [0, 0, 0],
  bgLight: [248, 250, 252],
  headerBg: [25, 118, 210], // #1976D2
};

// ═══════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════

const formatAddress = (addressObj) => {
  if (!addressObj) return "";
  const parts = [];
  
  // 1. Street / Road / Place name
  const road = addressObj.road || addressObj.pedestrian || addressObj.suburb || addressObj.neighbourhood || addressObj.industrial;
  if (road) parts.push(road);
  
  // 2. City / Town / Village / Locality
  const city = addressObj.city || addressObj.town || addressObj.village || addressObj.hamlet || addressObj.municipality;
  if (city) parts.push(city);
  
  // 3. District / County / Region
  const district = addressObj.state_district || addressObj.county || addressObj.district;
  if (district) parts.push(district);
  
  // 4. State
  const state = addressObj.state;
  if (state) parts.push(state);
  
  return parts.join(", ");
};

const fetchAddress = async (lat, lon) => {
  if (!lat || !lon) return "";
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        signal: controller.signal,
        headers: { "Accept-Language": "en", "User-Agent": "AlVision-EXIM" }
      }
    );
    clearTimeout(id);
    if (!res.ok) return "";
    const data = await res.json();
    if (data && data.address) {
      const formatted = formatAddress(data.address);
      if (formatted) return formatted;
    }
    return data?.display_name || "";
  } catch (error) {
    clearTimeout(id);
    console.error("Geocoding error:", error);
    return "";
  }
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const formatShortTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};



const formatDurationMs = (ms) => {
  if (!ms || ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};



// ═══════════════════════════════════════════════════════
// ANALYTICS COMPUTATION
// ═══════════════════════════════════════════════════════

function computeAnalytics(sortedData) {
  if (!sortedData || sortedData.length === 0) {
    return {
      totalDistance: 0,
      totalDurationMs: 0,
      totalDuration: "0m",
      avgSpeed: 0,
      maxSpeed: 0,
      totalPoints: 0,
      batteryStart: 0,
      batteryEnd: 0,
      batteryDrain: 0,
      gpsPointCount: 0,
      lbsPointCount: 0,
      gpsPercentage: 0,
      avgGpsSignal: 0,
      avgCellSignal: 0,
      minBattery: 0,
    };
  }

  const first = sortedData[0];
  const last = sortedData[sortedData.length - 1];

  // Distance
  const totalDistance = Math.max(0, (last.Mil || 0) - (first.Mil || 0));

  // Duration
  const totalDurationMs =
    new Date(last.GT).getTime() - new Date(first.GT).getTime();
  const totalDuration = formatDurationMs(totalDurationMs);

  // Speed
  const movingPoints = sortedData.filter((p) => p.Speed > 0);
  let avgSpeed = 0;
  if (movingPoints.length > 0) {
    avgSpeed =
      movingPoints.reduce((sum, p) => sum + p.Speed, 0) / movingPoints.length;
  } else if (totalDurationMs > 0) {
    avgSpeed = totalDistance / (totalDurationMs / 3600000);
  }

  const maxSpeed = Math.max(...sortedData.map((p) => p.Speed || 0));

  // Battery
  const batteryStart = first.Bat || 0;
  const batteryEnd = last.Bat || 0;
  const batteryDrain = batteryStart - batteryEnd;
  const minBattery = Math.min(...sortedData.map((p) => p.Bat || 0));

  // GPS quality
  const gpsPoints = sortedData.filter((p) => p.LType === 1);
  const lbsPoints = sortedData.filter((p) => p.LType === 2);
  const gpsPointCount = gpsPoints.length;
  const lbsPointCount = lbsPoints.length;
  const gpsPercentage =
    sortedData.length > 0
      ? Math.round((gpsPointCount / sortedData.length) * 100)
      : 0;

  const avgGpsSignal =
    sortedData.length > 0
      ? (
          sortedData.reduce((sum, p) => sum + (p.GS || 0), 0) /
          sortedData.length
        ).toFixed(1)
      : 0;

  const avgCellSignal =
    sortedData.length > 0
      ? (
          sortedData.reduce((sum, p) => sum + (p.CS || 0), 0) /
          sortedData.length
        ).toFixed(1)
      : 0;

  return {
    totalDistance: totalDistance.toFixed(1),
    totalDurationMs,
    totalDuration,
    avgSpeed: avgSpeed.toFixed(1),
    maxSpeed,
    totalPoints: sortedData.length,
    batteryStart,
    batteryEnd,
    batteryDrain,
    gpsPointCount,
    lbsPointCount,
    gpsPercentage,
    avgGpsSignal,
    avgCellSignal,
    minBattery,
  };
}

function detectHalts(sortedData) {
  if (!sortedData || sortedData.length < 2) return [];

  const halts = [];
  let haltStartPoint = null;

  for (let i = 0; i < sortedData.length; i++) {
    const point = sortedData[i];

    if (point.Speed === 0) {
      if (!haltStartPoint) {
        haltStartPoint = point;
      }
    } else {
      if (haltStartPoint) {
        const prevPoint = sortedData[i - 1];
        const durationMs =
          new Date(prevPoint.GT).getTime() -
          new Date(haltStartPoint.GT).getTime();

        if (durationMs >= HALT_THRESHOLD_MS) {
          halts.push({
            startTime: haltStartPoint.GT,
            endTime: prevPoint.GT,
            durationMs,
            duration: formatDurationMs(durationMs),
            lat: haltStartPoint.Lat,
            lon: haltStartPoint.Lon,
          });
        }
        haltStartPoint = null;
      }
    }
  }

  // Check trailing halt (vehicle stopped at end of data)
  if (haltStartPoint) {
    const lastPoint = sortedData[sortedData.length - 1];
    const durationMs =
      new Date(lastPoint.GT).getTime() -
      new Date(haltStartPoint.GT).getTime();

    if (durationMs >= HALT_THRESHOLD_MS) {
      halts.push({
        startTime: haltStartPoint.GT,
        endTime: lastPoint.GT,
        durationMs,
        duration: formatDurationMs(durationMs),
        lat: haltStartPoint.Lat,
        lon: haltStartPoint.Lon,
      });
    }
  }

  return halts;
}

function detectOverspeedEvents(sortedData) {
  if (!sortedData || sortedData.length < 2) return [];

  const events = [];
  let eventStartPoint = null;
  let eventMaxSpeed = 0;

  for (let i = 0; i < sortedData.length; i++) {
    const point = sortedData[i];

    if (point.Speed > SPEED_LIMIT) {
      if (!eventStartPoint) {
        eventStartPoint = point;
        eventMaxSpeed = point.Speed;
      } else {
        eventMaxSpeed = Math.max(eventMaxSpeed, point.Speed);
      }
    } else {
      if (eventStartPoint) {
        const prevPoint = sortedData[i - 1];
        const durationMs =
          new Date(prevPoint.GT).getTime() -
          new Date(eventStartPoint.GT).getTime();

        events.push({
          startTime: eventStartPoint.GT,
          endTime: prevPoint.GT,
          durationMs,
          duration: formatDurationMs(durationMs),
          maxSpeed: eventMaxSpeed,
        });
        eventStartPoint = null;
        eventMaxSpeed = 0;
      }
    }
  }

  // Check trailing overspeed event
  if (eventStartPoint) {
    const lastPoint = sortedData[sortedData.length - 1];
    const durationMs =
      new Date(lastPoint.GT).getTime() -
      new Date(eventStartPoint.GT).getTime();

    events.push({
      startTime: eventStartPoint.GT,
      endTime: lastPoint.GT,
      durationMs,
      duration: formatDurationMs(durationMs),
      maxSpeed: eventMaxSpeed,
    });
  }

  return events;
}



// ═══════════════════════════════════════════════════════
// CHART RENDERING (OFFSCREEN CANVAS)
// ═══════════════════════════════════════════════════════



function renderHaltChart(halts) {
  if (!halts || halts.length === 0) return null;
  const canvas = document.createElement("canvas");
  
  // Dynamic height based on number of halts (min 400)
  const canvasHeight = Math.max(400, 100 + halts.length * 35);
  canvas.width = 1040;
  canvas.height = canvasHeight;

  const formatHaltTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const labels = halts.map((h, i) => `${i + 1}. ${formatHaltTime(h.startTime)}`);
  const data = halts.map(h => (h.durationMs / 60000).toFixed(1));

  const ctx = canvas.getContext("2d");

  const dataLabelsPlugin = {
    id: 'dataLabels',
    afterDatasetsDraw(chart) {
      const { ctx, data } = chart;
      ctx.save();
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      chart.getDatasetMeta(0).data.forEach((bar, index) => {
        const val = parseFloat(data.datasets[0].data[index]);
        let displayVal = `${val} min`;
        if (val >= 60) {
          displayVal = `${(val / 60).toFixed(1)} h`;
        }
        ctx.fillText(` ${displayVal}`, bar.x + 5, bar.y);
      });
      ctx.restore();
    }
  };

  const chart = new Chart(ctx, {
    type: "bar",
    plugins: [dataLabelsPlugin],
    data: {
      labels,
      datasets: [
        {
          label: "Halt Duration (minutes)",
          data,
          backgroundColor: "rgba(244, 67, 54, 0.7)",
          borderColor: "#D32F2F",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      animation: false,
      layout: {
        padding: {
          right: 60
        }
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 14 }, padding: 15 },
        },
        title: {
          display: true,
          text: "Halt Duration & Start Time",
          font: { size: 16, weight: "bold" },
          padding: { bottom: 15 },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Duration (min)", font: { size: 13, weight: "bold" } },
          beginAtZero: true,
          ticks: { font: { size: 12 } },
        },
        y: {
          title: { display: true, text: "Halt Start Time", font: { size: 13, weight: "bold" } },
          ticks: { font: { size: 12, weight: "bold" } },
          grid: { display: false },
        },
      },
    },
  });

  const imageDataUri = canvas.toDataURL("image/png");
  chart.destroy();
  
  // Return the image data and the canvas dimensions so we can maintain aspect ratio in PDF
  return {
    imageUri: imageDataUri,
    width: canvas.width,
    height: canvas.height
  };
}



// ═══════════════════════════════════════════════════════
// PDF PAGE BUILDERS
// ═══════════════════════════════════════════════════════

function addPageHeader(doc, pageNum, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray);
  doc.text(
    `Page ${pageNum} of ${totalPages}`,
    pageWidth - 40,
    doc.internal.pageSize.getHeight() - 15,
    { align: "right" }
  );
  doc.text(
    "AlVision EXIM Management System",
    40,
    doc.internal.pageSize.getHeight() - 15
  );
}

function buildPage1(
  doc,
  {
    containerData,
    analytics,
    lockPeriods,
    selectedPeriod,
    isJourneyComplete,
    assignmentStartTime,
    assignmentEndTime,
    source,
    halts,
    overspeedEvents,
  }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;

  // ── Header Band ──
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, pageWidth, 60, "F");

  // Logo
  try {
    doc.addImage(logo, "PNG", margin, 10, 100, 40);
  } catch (e) {
    // Logo load failed - continue without it
  }

  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text("E-LOCK JOURNEY REPORT", pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated: ${new Date().toLocaleString("en-GB")}`,
    pageWidth - margin,
    48,
    { align: "right" }
  );

  // ── Journey Details Table ──
  let y = 75;

  const getElockNumber = () => {
    if (source === "containers") {
      return containerData?.elock_no || "N/A";
    } else {
      return containerData?.elock_no?.FAssetID || "N/A";
    }
  };

  doc.autoTable({
    startY: y,
    theme: "plain",
    head: [
      [
        {
          content: "JOURNEY DETAILS",
          colSpan: 4,
          styles: {
            fillColor: COLORS.lightGray,
            textColor: COLORS.black,
            fontStyle: "bold",
            fontSize: 10,
            halign: "center",
          },
        },
      ],
    ],
    body: [
      [
        { content: "LR Number", styles: { fontStyle: "bold", fontSize: 8 } },
        { content: containerData?.tr_no || "N/A", styles: { fontSize: 8 } },
        {
          content: "Container Number",
          styles: { fontStyle: "bold", fontSize: 8 },
        },
        {
          content: containerData?.container_number || "N/A",
          styles: { fontSize: 8 },
        },
      ],
      [
        {
          content: "E-lock Number",
          styles: { fontStyle: "bold", fontSize: 8 },
        },
        { content: getElockNumber(), styles: { fontSize: 8 } },
        {
          content: "Vehicle Number",
          styles: { fontStyle: "bold", fontSize: 8 },
        },
        {
          content: containerData?.vehicle_no || "N/A",
          styles: { fontSize: 8 },
        },
      ],
      [
        { content: "Driver Name", styles: { fontStyle: "bold", fontSize: 8 } },
        {
          content: containerData?.driver_name || "N/A",
          styles: { fontSize: 8 },
        },
        { content: "Driver Phone", styles: { fontStyle: "bold", fontSize: 8 } },
        {
          content: containerData?.driver_phone || "N/A",
          styles: { fontSize: 8 },
        },
      ],
      [
        { content: "Consignor", styles: { fontStyle: "bold", fontSize: 8 } },
        {
          content: containerData?.consignor?.name || "N/A",
          styles: { fontSize: 8 },
        },
        { content: "Consignee", styles: { fontStyle: "bold", fontSize: 8 } },
        {
          content: containerData?.consignee?.name || "N/A",
          styles: { fontSize: 8 },
        },
      ],
    ],
    styles: {
      lineWidth: 0.3,
      lineColor: [200, 200, 200],
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.18 },
      1: { cellWidth: contentWidth * 0.32 },
      2: { cellWidth: contentWidth * 0.18 },
      3: { cellWidth: contentWidth * 0.32 },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Route & Status Bar ──
  const routeFrom = containerData?.goods_pickup?.name || "Unknown";
  const routeTo = containerData?.goods_delivery?.name || "Unknown";
  const statusText = isJourneyComplete
    ? "Journey Complete"
    : "Journey In Progress";
  const statusColor = isJourneyComplete ? COLORS.success : COLORS.warning;

  doc.autoTable({
    startY: y,
    theme: "plain",
    body: [
      [
        {
          content: `Route:  ${routeFrom} To  ${routeTo}`,
          styles: {
            fontStyle: "bold",
            fontSize: 10,
            halign: "center",
            fillColor: [232, 245, 233],
            textColor: COLORS.black,
          },
        },
        {
          content: statusText,
          styles: {
            fontStyle: "bold",
            fontSize: 10,
            halign: "center",
            fillColor: [statusColor[0], statusColor[1], statusColor[2]],
            textColor: COLORS.white,
          },
        },
      ],
    ],
    styles: {
      lineWidth: 0.3,
      lineColor: [200, 200, 200],
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.65 },
      1: { cellWidth: contentWidth * 0.35 },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 5;

  // ── Lock Period Info ──
  const period =
    selectedPeriod !== null
      ? lockPeriods.find((p) => p.id === selectedPeriod)
      : null;

  if (period) {
    doc.autoTable({
      startY: y,
      theme: "plain",
      head: [
        [
          {
            content: "SELECTED LOCK PERIOD",
            colSpan: 4,
            styles: {
              fillColor: COLORS.lightGray,
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 9,
              halign: "center",
            },
          },
        ],
      ],
      body: [
        [
          {
            content: `Type: ${period.type === "ongoing" ? "Ongoing" : "Completed"}`,
            styles: { fontSize: 8 },
          },
          {
            content: `Start: ${formatShortTime(period.startTime)} (Locked)`,
            styles: { fontSize: 8 },
          },
          {
            content: `End: ${formatShortTime(period.endTime)} (unlocked)`,
            styles: { fontSize: 8 },
          },
          {
            content: `Duration: ${period.duration}`,
            styles: { fontStyle: "bold", fontSize: 8 },
          },
        ],
      ],
      styles: {
        lineWidth: 0.3,
        lineColor: [200, 200, 200],
        cellPadding: 4,
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Key Metrics Grid ──
  const totalHaltTime = halts.reduce((sum, h) => sum + h.durationMs, 0);
  const longestHalt =
    halts.length > 0 ? Math.max(...halts.map((h) => h.durationMs)) : 0;

  doc.autoTable({
    startY: y,
    theme: "grid",
    head: [
      [
        {
          content: "KEY METRICS",
          colSpan: 6,
          styles: {
            fillColor: COLORS.headerBg,
            textColor: COLORS.white,
            fontStyle: "bold",
            fontSize: 10,
            halign: "center",
          },
        },
      ],
    ],
    body: [
      [
        {
          content: `Total Distance\n${analytics.totalDistance} km`,
          styles: { halign: "center", fontSize: 8, cellPadding: 6 },
        },
        {
          content: `Total Duration\n${analytics.totalDuration}`,
          styles: { halign: "center", fontSize: 8, cellPadding: 6 },
        },
        {
          content: `Total Points\n${analytics.totalPoints}`,
          styles: { halign: "center", fontSize: 8, cellPadding: 6 },
        },
        {
          content: `Avg Speed\n${analytics.avgSpeed} km/h`,
          styles: { halign: "center", fontSize: 8, cellPadding: 6 },
        },
        {
          content: `Max Speed\n${analytics.maxSpeed} km/h`,
          styles: { halign: "center", fontSize: 8, cellPadding: 6 },
        },
        {
          content: `Overspeed Events\n${overspeedEvents.length}`,
          styles: {
            halign: "center",
            fontSize: 8,
            cellPadding: 6,
            textColor:
              overspeedEvents.length > 0 ? COLORS.error : COLORS.black,
          },
        },
      ],
      [
        {
          content: `Total Halt Time\n${formatDurationMs(totalHaltTime)}`,
          styles: { halign: "center", fontSize: 8, cellPadding: 6 },
        },
        {
          content: `Number of Halts\n${halts.length}`,
          styles: { halign: "center", fontSize: 8, cellPadding: 6 },
        },
        {
          content: `Longest Halt\n${formatDurationMs(longestHalt)}`,
          styles: { halign: "center", fontSize: 8, cellPadding: 6 },
        },
        {
          content: `Battery Start\n${analytics.batteryStart}%`,
          styles: { halign: "center", fontSize: 8, cellPadding: 6 },
        },
        {
          content: `Battery End\n${analytics.batteryEnd}%`,
          styles: { halign: "center", fontSize: 8, cellPadding: 6 },
        },
        {
          content: `Battery Drain\n${analytics.batteryDrain}%`,
          styles: {
            halign: "center",
            fontSize: 8,
            cellPadding: 6,
            textColor:
              analytics.batteryDrain > 30 ? COLORS.error : COLORS.black,
          },
        },
      ],
    ],
    styles: {
      lineWidth: 0.3,
      lineColor: [180, 180, 180],
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 10;

  return y;
}

function buildPage2(doc, { halts, overspeedEvents, haltChartImage, startY }) {
  const margin = 30;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = startY;

  // Check if we need a new page
  const remainingSpace = doc.internal.pageSize.getHeight() - y - 30;
  if (remainingSpace < 120) {
    doc.addPage();
    y = 30;
  }

  // ── Halt Analysis Table ──
  if (halts.length > 0) {
    doc.autoTable({
      startY: y,
      theme: "grid",
      head: [
        [
          {
            content: `HALT ANALYSIS (Threshold: ${HALT_THRESHOLD_MS / 60000} minutes, ${halts.length} halt${halts.length !== 1 ? "s" : ""} detected)`,
            colSpan: 5,
            styles: {
              fillColor: COLORS.headerBg,
              textColor: COLORS.white,
              fontStyle: "bold",
              fontSize: 9,
              halign: "center",
            },
          },
        ],
        [
          {
            content: "#",
            styles: {
              fillColor: COLORS.lightGray,
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 8,
            },
          },
          {
            content: "Start Time",
            styles: {
              fillColor: COLORS.lightGray,
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 8,
            },
          },
          {
            content: "End Time",
            styles: {
              fillColor: COLORS.lightGray,
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 8,
            },
          },
          {
            content: "Duration",
            styles: {
              fillColor: COLORS.lightGray,
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 8,
            },
          },
          {
            content: "Location / Address",
            styles: {
              fillColor: COLORS.lightGray,
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 8,
            },
          },
        ],
      ],
      body: halts.map((halt, i) => [
        { content: `${i + 1}`, styles: { fontSize: 8, halign: "center" } },
        { content: formatShortTime(halt.startTime), styles: { fontSize: 8 } },
        { content: formatShortTime(halt.endTime), styles: { fontSize: 8 } },
        {
          content: halt.duration,
          styles: { fontSize: 8, fontStyle: "bold" },
        },
        {
          content: halt.address
            ? `${halt.address}`
            : `${halt.lat.toFixed(4)}, ${halt.lon.toFixed(4)}`,
          styles: { fontSize: 7, fontFamily: "helvetica" },
        },
      ]),
      styles: {
        lineWidth: 0.3,
        lineColor: [180, 180, 180],
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.05 },
        1: { cellWidth: contentWidth * 0.20 },
        2: { cellWidth: contentWidth * 0.20 },
        3: { cellWidth: contentWidth * 0.15 },
        4: { cellWidth: contentWidth * 0.40 },
      },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 12;
  } else {
    doc.autoTable({
      startY: y,
      theme: "grid",
      head: [
        [
          {
            content: `HALT ANALYSIS (Threshold: ${HALT_THRESHOLD_MS / 60000} minutes)`,
            colSpan: 1,
            styles: {
              fillColor: COLORS.headerBg,
              textColor: COLORS.white,
              fontStyle: "bold",
              fontSize: 9,
              halign: "center",
            },
          },
        ],
      ],
      body: [
        [
          {
            content:
              "No halts detected exceeding the threshold duration.",
            styles: {
              fontSize: 8,
              halign: "center",
              textColor: COLORS.gray,
              cellPadding: 8,
            },
          },
        ],
      ],
      styles: {
        lineWidth: 0.3,
        lineColor: [180, 180, 180],
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 12;
  }

  // ── Halt Duration Chart ──
  if (haltChartImage && haltChartImage.imageUri) {
    const chartWidth = contentWidth;
    const chartHeight = (chartWidth * haltChartImage.height) / haltChartImage.width;

    const spaceForChart = doc.internal.pageSize.getHeight() - y - 30;
    if (chartHeight > spaceForChart) {
      doc.addPage();
      y = 30;
    }

    doc.addImage(
      haltChartImage.imageUri,
      "PNG",
      margin,
      y,
      chartWidth,
      chartHeight
    );
    y += chartHeight + 12;
  }

  // Check space for overspeed table
  const spaceLeft = doc.internal.pageSize.getHeight() - y - 30;
  if (spaceLeft < 100) {
    doc.addPage();
    y = 30;
  }

  // ── Overspeed Events Table ──
  if (overspeedEvents.length > 0) {
    doc.autoTable({
      startY: y,
      theme: "grid",
      head: [
        [
          {
            content: `OVERSPEED EVENTS (Limit: ${SPEED_LIMIT} km/h, ${overspeedEvents.length} event${overspeedEvents.length !== 1 ? "s" : ""} detected)`,
            colSpan: 5,
            styles: {
              fillColor: COLORS.error,
              textColor: COLORS.white,
              fontStyle: "bold",
              fontSize: 9,
              halign: "center",
            },
          },
        ],
        [
          {
            content: "#",
            styles: {
              fillColor: [255, 235, 238],
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 8,
            },
          },
          {
            content: "Start Time",
            styles: {
              fillColor: [255, 235, 238],
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 8,
            },
          },
          {
            content: "End Time",
            styles: {
              fillColor: [255, 235, 238],
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 8,
            },
          },
          {
            content: "Duration",
            styles: {
              fillColor: [255, 235, 238],
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 8,
            },
          },
          {
            content: "Max Speed",
            styles: {
              fillColor: [255, 235, 238],
              textColor: COLORS.black,
              fontStyle: "bold",
              fontSize: 8,
            },
          },
        ],
      ],
      body: overspeedEvents.map((event, i) => [
        { content: `${i + 1}`, styles: { fontSize: 8, halign: "center" } },
        {
          content: formatShortTime(event.startTime),
          styles: { fontSize: 8 },
        },
        { content: formatShortTime(event.endTime), styles: { fontSize: 8 } },
        {
          content: event.duration,
          styles: { fontSize: 8, fontStyle: "bold" },
        },
        {
          content: `${event.maxSpeed} km/h`,
          styles: { fontSize: 8, fontStyle: "bold", textColor: COLORS.error },
        },
      ]),
      styles: {
        lineWidth: 0.3,
        lineColor: [180, 180, 180],
        cellPadding: 4,
      },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 12;
  } else {
    doc.autoTable({
      startY: y,
      theme: "grid",
      head: [
        [
          {
            content: `OVERSPEED EVENTS (Limit: ${SPEED_LIMIT} km/h)`,
            colSpan: 1,
            styles: {
              fillColor: COLORS.success,
              textColor: COLORS.white,
              fontStyle: "bold",
              fontSize: 9,
              halign: "center",
            },
          },
        ],
      ],
      body: [
        [
          {
            content:
              "No overspeed events detected. All speeds within the limit.",
            styles: {
              fontSize: 8,
              halign: "center",
              textColor: COLORS.success,
              cellPadding: 8,
            },
          },
        ],
      ],
      styles: {
        lineWidth: 0.3,
        lineColor: [180, 180, 180],
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 12;
  }

  return y;
}

function addReportFooter(doc, sortedData) {
  const margin = 30;
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerY = doc.internal.pageSize.getHeight() - 50;

  // Set page to the last page
  const totalPages = doc.internal.getNumberOfPages();
  doc.setPage(totalPages);

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray);
  doc.setFont("helvetica", "normal");

  const first = sortedData[0];
  const last = sortedData[sortedData.length - 1];

  doc.text(
    `Report Generated: ${new Date().toLocaleString("en-GB")}  |  Total GPS Coordinates Analyzed: ${sortedData.length}`,
    margin,
    footerY + 12
  );
  doc.text(
    `Data Range: ${formatTime(first?.GT)} — ${formatTime(last?.GT)}  |  Speed Limit: ${SPEED_LIMIT} km/h  |  Halt Threshold: ${HALT_THRESHOLD_MS / 60000} min`,
    margin,
    footerY + 24
  );
  doc.text(
    "AlVision EXIM Management System — Confidential",
    pageWidth - margin,
    footerY + 24,
    { align: "right" }
  );
}

// ═══════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════

export const generateJourneyReportPdf = async ({
  sortedData,
  containerData,
  lockPeriods,
  selectedPeriod,
  currentInfo,
  isJourneyComplete,
  assignmentStartTime,
  assignmentEndTime,
  source,
}) => {
  if (!sortedData || sortedData.length === 0) {
    console.error("No data available for report generation");
    return;
  }

  // ── Compute Analytics ──
  const analytics = computeAnalytics(sortedData);
  const halts = detectHalts(sortedData);
  const overspeedEvents = detectOverspeedEvents(sortedData);

  // ── Fetch Addresses for Halts in Parallel ──
  if (halts.length > 0) {
    try {
      await Promise.all(
        halts.map(async (halt) => {
          halt.address = await fetchAddress(halt.lat, halt.lon);
        })
      );
    } catch (err) {
      console.error("Failed to fetch halt addresses:", err);
    }
  }

  // ── Render Charts ──
  let haltChartImage = null;

  try {
    if (halts.length > 0) {
      haltChartImage = renderHaltChart(halts);
    }
  } catch (e) {
    console.error("Error rendering halt chart:", e);
  }

  // ── Create PDF ──
  const doc = new jsPDF("p", "pt", "a4");

  // ── Page 1: Journey Summary + Metrics + Speed Chart ──
  let currentY = buildPage1(doc, {
    containerData,
    analytics,
    lockPeriods,
    selectedPeriod,
    isJourneyComplete,
    assignmentStartTime,
    assignmentEndTime,
    source,
    halts,
    overspeedEvents,
  });

  // ── Page 2: Halt Analysis + Overspeed Events ──
  buildPage2(doc, {
    halts,
    overspeedEvents,
    haltChartImage,
    startY: currentY,
  });

  // ── Add report footer ──
  addReportFooter(doc, sortedData);

  // ── Add page numbers ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageHeader(doc, i, totalPages);
  }

  // ── Output: Directly download the PDF ──
  const fileName = `Journey_Report_${containerData?.tr_no || "Elock"}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};
