// AnalyticsOverview.jsx - Premium Combined Dashboard for Import DSR
import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import axios from "axios";
import ReactApexChart from "react-apexcharts";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Autocomplete,
  Stack,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  DensitySmall as DensitySmallIcon,
  HourglassBottom as HourglassBottomIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  DoDisturb as DoDisturbIcon,
} from "@mui/icons-material";
import { SelectedYearContext } from "../context/SelectedYearContext";
import { useImportersContext } from "../context/importersContext";
import { UserContext } from "../context/UserContext";
import { getCookie, getJsonCookie } from "../utils/cookies";
import { useNavigate } from "react-router-dom";

// Utility to format importer name for APIs
function formatImporter(importer) {
  if (!importer) return "";
  return importer
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[\.\-\/,\(\)\[\]]/g, "")
    .replace(/_+/g, "_");
}

const AnalyticsOverview = () => {
  const navigate = useNavigate();
  const { selectedYear, setSelectedYear } = useContext(SelectedYearContext);
  const { selectedImporter, setSelectedImporter } = useImportersContext();
  const { user } = useContext(UserContext);

  // States
  const [kpiData, setKpiData] = useState({
    totalJobs: 0,
    pendingJobs: 0,
    completedJobs: 0,
    cancelledJobs: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(false);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dateFilterType, setDateFilterType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [customStartDate, setCustomStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Drill-down dialog states
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [selectedJobList, setSelectedJobList] = useState([]);
  const [jobListDialogOpen, setJobListDialogOpen] = useState(false);

  // Donut chart states
  const [donutData, setDonutData] = useState([0, 0, 0, 0]);
  const [donutLoading, setDonutLoading] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState([]);

  // Year ranges list
  const yearRanges = ["24-25", "25-26", "26-27"];

  // Helper to retrieve assigned importers from user cookie
  const ieCodeAssignments = useMemo(() => {
    const userData = getJsonCookie("exim_user") || user;
    return userData?.ie_code_assignments || [];
  }, [user]);

  // Set default financial year if none set
  useEffect(() => {
    if (!selectedYear) {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentTwoDigits = String(currentYear).slice(-2);
      const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");
      const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");

      let defaultYearPair =
        currentMonth >= 4
          ? `${currentTwoDigits}-${nextTwoDigits}`
          : `${prevTwoDigits}-${currentTwoDigits}`;

      if (yearRanges.includes(defaultYearPair)) {
        setSelectedYear(defaultYearPair);
      } else {
        setSelectedYear(yearRanges[0]);
      }
    }
  }, [selectedYear, setSelectedYear]);

  // Set default importer if none selected and assignments exist
  useEffect(() => {
    if (!selectedImporter && ieCodeAssignments.length > 0) {
      setSelectedImporter(ieCodeAssignments[0].importer_name);
    }
  }, [selectedImporter, ieCodeAssignments, setSelectedImporter]);

  // Fetch KPI Summary Card counts
  const fetchKpiData = useCallback(async () => {
    if (!selectedYear) return;
    setKpiLoading(true);
    try {
      const token = getCookie("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const params = {};
      if (selectedImporter) {
        params.importer = selectedImporter;
      }

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-jobs-overview/${selectedYear}`,
        {
          params,
          headers,
          withCredentials: true,
        }
      );
      setKpiData(
        res.data || {
          totalJobs: 0,
          pendingJobs: 0,
          completedJobs: 0,
          cancelledJobs: 0,
        }
      );
    } catch (err) {
      console.error("Failed to fetch KPI data", err);
    } finally {
      setKpiLoading(false);
    }
  }, [selectedYear, selectedImporter]);

  // Date Range Helper for Horizontal Bar Chart
  const getStartEndDate = useCallback(() => {
    let start = new Date(selectedDate);
    let end = new Date(selectedDate);

    switch (dateFilterType) {
      case "daily":
        break;
      case "weekly": {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      }
      case "monthly":
        start.setDate(1);
        end = new Date(start);
        end.setMonth(start.getMonth() + 1);
        end.setDate(0);
        break;
      case "quarterly": {
        const quarterMonth = Math.floor(start.getMonth() / 3) * 3;
        start.setMonth(quarterMonth);
        start.setDate(1);
        end = new Date(start);
        end.setMonth(start.getMonth() + 3);
        end.setDate(0);
        break;
      }
      case "yearly":
        start.setMonth(0, 1);
        end = new Date(start);
        end.setMonth(12, 0);
        break;
      case "custom":
        start = new Date(customStartDate);
        end = new Date(customEndDate);
        break;
      default:
        break;
    }

    const toYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return { startDate: toYMD(start), endDate: toYMD(end) };
  }, [dateFilterType, selectedDate, customStartDate, customEndDate]);

  // Fetch Horizontal Bar Chart Statistics
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const token = getCookie("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { startDate, endDate } = getStartEndDate();

      const params = new URLSearchParams();
      if (selectedImporter) {
        params.append("importer", selectedImporter);
      }
      if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/user-dashboard-stats?${params.toString()}`,
        {
          headers,
          withCredentials: true,
        }
      );
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedImporter, getStartEndDate]);

  // Fetch Donut Chart counts & Assigned Users for Selected Importer
  const fetchDonutAndUsers = useCallback(async () => {
    if (!selectedImporter || !selectedYear) return;
    setDonutLoading(true);
    try {
      const token = getCookie("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const formattedImporter = formatImporter(selectedImporter);

      // Donut counts
      const countsRes = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-importer-jobs/${formattedImporter}/${selectedYear}`,
        {
          headers,
          withCredentials: true,
        }
      );
      setDonutData(countsRes.data || [0, 0, 0, 0]);

      // Assigned users
      try {
        const usersRes = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-users`,
          {
            params: { importerName: selectedImporter },
            headers,
            withCredentials: true,
          }
        );
        setAssignedUsers(usersRes.data || []);
      } catch (err) {
        console.error("Error fetching assigned users", err);
        setAssignedUsers([]);
      }
    } catch (err) {
      console.error("Failed to fetch donut chart data", err);
    } finally {
      setDonutLoading(false);
    }
  }, [selectedImporter, selectedYear]);

  // Trigger data load on parameters change
  useEffect(() => {
    fetchKpiData();
  }, [fetchKpiData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchDonutAndUsers();
  }, [fetchDonutAndUsers]);

  // Config for Horizontal Bar Chart
  const metricConfig = useMemo(
    () => [
      { label: "Jobs Created", key: "jobs_created_today", color: "#3b82f6" },
      { label: "Ops Completed", key: "operations_completed", color: "#10b981" },
      { label: "Exam Planned", key: "examination_planning", color: "#f59e0b" },
      { label: "Arrivals", key: "arrivals_today", color: "#6366f1" },
      { label: "Rail Out", key: "rail_out_today", color: "#8b5cf6" },
      { label: "BE Filed", key: "be_filed", color: "#ec4899" },
      { label: "OOC", key: "ooc", color: "#14b8a6" },
      { label: "DO Completed", key: "do_completed", color: "#f97316" },
      { label: "Billing Sent", key: "billing_sent", color: "#06b6d4" },
      { label: "ETA", key: "eta", color: "#84cc16" },
      { label: "Gateway IGM", key: "gateway_igm_date", color: "#a855f7" },
      { label: "Discharge", key: "discharge_date", color: "#ef4444" },
      { label: "Empty Offload", key: "empty_offload", color: "#64748b" },
    ],
    []
  );

  const barSeries = useMemo(() => {
    if (!stats || !stats.summary) return [{ name: "Count", data: [] }];
    return [
      {
        name: "Count",
        data: metricConfig.map((m) => stats.summary[m.key] || 0),
      },
    ];
  }, [stats, metricConfig]);

  const barOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        fontFamily: "inherit",
        toolbar: { show: false },
        events: {
          dataPointSelection: (event, chartContext, config) => {
            const index = config.dataPointIndex;
            const metric = metricConfig[index];
            if (metric && stats?.details?.[metric.key]) {
              const details = stats.details[metric.key];
              if (Array.isArray(details) && details.length > 0) {
                setSelectedJobTitle(metric.label);
                setSelectedJobList(details);
                setJobListDialogOpen(true);
              }
            }
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "45%",
          borderRadius: 2,
          distributed: true,
          dataLabels: { position: "top" },
        },
      },
      colors: metricConfig.map((m) => m.color),
      xaxis: {
        categories: metricConfig.map((m) => m.label),
        labels: {
          style: {
            fontSize: "11px",
            fontWeight: 500,
            colors: "#64748b",
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontSize: "12px", fontWeight: 600, colors: "#475569" },
          maxWidth: 180,
        },
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        textAnchor: "start",
        style: { colors: ["#000"] },
        formatter: (val) => val,
        offsetX: 15,
      },
      tooltip: {
        theme: "light",
        y: { formatter: (val) => val },
      },
      grid: {
        show: true,
        borderColor: "#f1f5f9",
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { top: 0, right: 80, bottom: 0, left: 30 },
      },
    }),
    [stats, metricConfig]
  );

  // Config for Donut Chart
  const donutState = useMemo(() => {
    return {
      series: donutData,
      options: {
        chart: {
          type: "donut",
          width: "100%",
        },
        labels: [
          "All Jobs",
          "Pending Jobs",
          "Completed Jobs",
          "Cancelled Jobs",
        ],
        plotOptions: {
          pie: {
            startAngle: -90,
            endAngle: 270,
            donut: {
              size: "65%",
            },
          },
        },
        dataLabels: { enabled: false },
        legend: {
          position: "bottom",
          horizontalAlign: "center",
          fontSize: "12px",
          fontFamily: "inherit",
          formatter: (val, opts) => {
            return `${val}: ${opts.w.globals.series[opts.seriesIndex]}`;
          },
        },
        colors: ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"],
        fill: {
          type: "gradient",
          gradient: {
            shade: "light",
            type: "vertical",
            shadeIntensity: 0.12,
            gradientToColors: ["#1d4ed8", "#d97706", "#047857", "#be123c"],
            inverseColors: false,
            opacityFrom: 1,
            opacityTo: 0.85,
            stops: [0, 50, 75, 100],
          },
        },
      },
    };
  }, [donutData]);

  // Render Layout
  return (
    <Box sx={{ p: 3, bgcolor: "#f8fafc", minHeight: "calc(100vh - 120px)" }}>
      {/* Top Selectors Row */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Typography variant="h5" fontWeight={700} color="#1e293b">
          Dashboard
        </Typography>

        {/* Financial Year Selector */}
        <Box sx={{ minWidth: 150 }}>
          <TextField
            select
            size="small"
            label="Financial Year"
            value={selectedYear || ""}
            onChange={(e) => setSelectedYear(e.target.value)}
            fullWidth
            sx={{
              bgcolor: "white",
              "& .MuiOutlinedInput-root": { borderRadius: "8px" },
            }}
          >
            {yearRanges.map((yr) => (
              <MenuItem key={yr} value={yr}>
                FY {yr}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Stack>

      {/* KPI Cards Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: "Total Jobs",
            value: kpiData.totalJobs,
            icon: <DensitySmallIcon sx={{ color: "#3b82f6" }} />,
            border: "4px solid #3b82f6",
            gradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
          },
          {
            title: "Pending Jobs",
            value: kpiData.pendingJobs,
            icon: <HourglassBottomIcon sx={{ color: "#f59e0b" }} />,
            border: "4px solid #f59e0b",
            gradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
          },
          {
            title: "Completed Jobs",
            value: kpiData.completedJobs,
            icon: <CheckCircleOutlineIcon sx={{ color: "#10b981" }} />,
            border: "4px solid #10b981",
            gradient: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
          },
          {
            title: "Cancelled Jobs",
            value: kpiData.cancelledJobs,
            icon: <DoDisturbIcon sx={{ color: "#ef4444" }} />,
            border: "4px solid #ef4444",
            gradient: "linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)",
          },
        ].map((card, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                borderLeft: card.border,
                background: "white",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                },
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="#64748b"
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                >
                  {card.title}
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, color: "#1e293b" }}>
                  {kpiLoading ? "..." : card.value}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  background: card.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {card.icon}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Left Column - Horizontal Bar Chart */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              background: "white",
              height: "100%",
            }}
          >
            {/* Chart Header */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 3 }}
            >
              <Typography variant="h6" fontWeight={700} color="#1e293b">
                📊 Operational Status Overview
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Select
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value)}
                  size="small"
                  sx={{
                    height: 32,
                    fontSize: "0.75rem",
                    bgcolor: "#f8fafc",
                    borderRadius: "8px",
                  }}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>

                {dateFilterType === "custom" ? (
                  <>
                    <TextField
                      type="date"
                      size="small"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      sx={{
                        bgcolor: "#f8fafc",
                        width: 130,
                        "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.75rem", borderRadius: "8px" },
                      }}
                    />
                    <TextField
                      type="date"
                      size="small"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      sx={{
                        bgcolor: "#f8fafc",
                        width: 130,
                        "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.75rem", borderRadius: "8px" },
                      }}
                    />
                  </>
                ) : dateFilterType === "monthly" ? (
                  <TextField
                    type="month"
                    size="small"
                    value={selectedDate.slice(0, 7)}
                    onChange={(e) => setSelectedDate(e.target.value + "-01")}
                    sx={{
                      bgcolor: "#f8fafc",
                      width: 140,
                      "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.75rem", borderRadius: "8px" },
                    }}
                  />
                ) : dateFilterType === "yearly" ? (
                  <TextField
                    type="number"
                    size="small"
                    placeholder="Year"
                    value={selectedDate.split("-")[0]}
                    onChange={(e) => setSelectedDate(`${e.target.value}-01-01`)}
                    sx={{
                      bgcolor: "#f8fafc",
                      width: 100,
                      "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.75rem", borderRadius: "8px" },
                    }}
                  />
                ) : (
                  <TextField
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    sx={{
                      bgcolor: "#f8fafc",
                      width: 140,
                      "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.75rem", borderRadius: "8px" },
                    }}
                  />
                )}

                <IconButton
                  onClick={fetchStats}
                  size="small"
                  sx={{
                    bgcolor: "#3b82f6",
                    color: "white",
                    width: 32,
                    height: 32,
                    borderRadius: "8px",
                    "&:hover": { bgcolor: "#2563eb" },
                  }}
                >
                  <RefreshIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            </Stack>

            {/* Apex Chart Rendering */}
            {statsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 350 }}>
                <Typography color="text.secondary">Loading status overview...</Typography>
              </Box>
            ) : stats && stats.summary ? (
              <Box sx={{ minHeight: 380, py: 1 }}>
                <ReactApexChart
                  options={barOptions}
                  series={barSeries}
                  type="bar"
                  width="100%"
                  height={380}
                />
              </Box>
            ) : (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 350 }}>
                <Typography color="text.secondary">No stats data found for this selection.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Donut Chart & Assigned Users */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              background: "white",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700} color="#1e293b" sx={{ mb: 3 }}>
                🏢 Importer Wise details
              </Typography>

              {/* Importer Autocomplete Selector */}
              {ieCodeAssignments.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Autocomplete
                    disablePortal
                    options={ieCodeAssignments.map((a) => a.importer_name)}
                    value={selectedImporter || null}
                    onChange={(event, newValue) => {
                      setSelectedImporter(newValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Select Importer"
                        sx={{
                          bgcolor: "white",
                          "& .MuiOutlinedInput-root": { borderRadius: "8px" },
                        }}
                      />
                    )}
                  />
                </Box>
              )}

              {/* Donut Chart Rendering */}
              {donutLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 250 }}>
                  <Typography color="text.secondary">Loading importer metrics...</Typography>
                </Box>
              ) : selectedImporter ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 4 }}>
                  <ReactApexChart
                    options={donutState.options}
                    series={donutState.series}
                    type="donut"
                    width="100%"
                  />
                </Box>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 250, mb: 4 }}>
                  <Typography color="text.secondary">Select an importer to load job distribution.</Typography>
                </Box>
              )}
            </Box>

            {/* Handling By Assigned Users Footer */}
            {selectedImporter && assignedUsers.length > 0 && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1",
                  mt: "auto",
                }}
              >
                <Typography variant="caption" fontWeight={600} color="#64748b" sx={{ textTransform: "uppercase" }}>
                  Handling By:
                </Typography>
                <Typography variant="body2" fontWeight={600} color="#334155" sx={{ mt: 0.5 }}>
                  {assignedUsers.join(", ")}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Drill-down Dialog */}
      <Dialog
        open={jobListDialogOpen}
        onClose={() => setJobListDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: "1.25rem",
            color: "#1e293b",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 2,
            py: 2.5,
          }}
        >
          <Box sx={{ width: 4, height: 28, bgcolor: "#3b82f6", borderRadius: 1 }} />
          {selectedJobTitle}
          <Chip
            label={`${selectedJobList?.length || 0} Records`}
            size="small"
            sx={{
              bgcolor: "#eff6ff",
              color: "#3b82f6",
              fontWeight: 600,
              fontSize: "0.75rem",
            }}
          />
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedJobList && selectedJobList.length > 0 ? (
            <Box>
              {/* Header Row */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `120px ${
                    selectedJobList.some((j) => j.importer) ? "1fr" : "0px"
                  } ${
                    selectedJobList.some((j) => j.shipping_line_airline)
                      ? "180px"
                      : "0px"
                  } ${
                    selectedJobList.some(
                      (j) =>
                        j.container_number ||
                        (Array.isArray(j.container_nos) &&
                          j.container_nos.length > 0)
                    )
                      ? "180px"
                      : "0px"
                  } ${
                    selectedJobList.some((j) => j.relevant_date)
                      ? "110px"
                      : "0px"
                  }`,
                  bgcolor: "#1e293b",
                  color: "#ffffff",
                  py: 1.5,
                  px: 3,
                  borderBottom: "2px solid #3b82f6",
                  gap: 1.5,
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#ffffff" }}>
                  Job No
                </Typography>
                {selectedJobList.some((j) => j.importer) && (
                  <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#ffffff" }}>
                    Importer
                  </Typography>
                )}
                {selectedJobList.some((j) => j.shipping_line_airline) && (
                  <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#ffffff" }}>
                    Shipping Line
                  </Typography>
                )}
                {selectedJobList.some(
                  (j) =>
                    j.container_number ||
                    (Array.isArray(j.container_nos) &&
                      j.container_nos.length > 0)
                ) && (
                  <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#ffffff" }}>
                    Container No
                  </Typography>
                )}
                {selectedJobList.some((j) => j.relevant_date) && (
                  <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#ffffff" }}>
                    Date
                  </Typography>
                )}
              </Box>

              {/* Data Rows */}
              <Box
                sx={{
                  maxHeight: 400,
                  overflowY: "auto",
                  "&::-webkit-scrollbar": { width: "6px" },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: "#cbd5e1",
                    borderRadius: "3px",
                  },
                }}
              >
                {selectedJobList.map((job, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `120px ${
                        selectedJobList.some((j) => j.importer) ? "1fr" : "0px"
                      } ${
                        selectedJobList.some((j) => j.shipping_line_airline)
                          ? "180px"
                          : "0px"
                      } ${
                        selectedJobList.some(
                          (j) =>
                            j.container_number ||
                            (Array.isArray(j.container_nos) &&
                              j.container_nos.length > 0)
                        )
                          ? "180px"
                          : "0px"
                      } ${
                        selectedJobList.some((j) => j.relevant_date)
                          ? "110px"
                          : "0px"
                      }`,
                      py: 1.5,
                      px: 3,
                      bgcolor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      "&:hover": { bgcolor: "#eff6ff" },
                      transition: "background-color 0.15s ease",
                      gap: 1.5,
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, color: "#3b82f6", fontSize: "0.875rem" }}>
                      {job.job_no || "-"}
                    </Typography>
                    {selectedJobList.some((j) => j.importer) && (
                      <Typography sx={{ color: "#334155", fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {job.importer || "-"}
                      </Typography>
                    )}
                    {selectedJobList.some((j) => j.shipping_line_airline) && (
                      <Typography sx={{ color: "#334155", fontSize: "0.875rem" }}>
                        {job.shipping_line_airline || "-"}
                      </Typography>
                    )}
                    {selectedJobList.some(
                      (j) =>
                        j.container_number ||
                        (Array.isArray(j.container_nos) &&
                          j.container_nos.length > 0)
                    ) && (
                      <Typography sx={{ color: "#334155", fontSize: "0.875rem", fontFamily: "monospace" }}>
                        {job.container_number ||
                          (Array.isArray(job.container_nos)
                            ? job.container_nos.join(", ")
                            : "-")}
                      </Typography>
                    )}
                    {selectedJobList.some((j) => j.relevant_date) && (
                      <Typography sx={{ color: "#334155", fontSize: "0.875rem" }}>
                        {job.relevant_date
                          ? new Date(job.relevant_date).toLocaleDateString("en-GB")
                          : "-"}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">No details available.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #e2e8f0", px: 3, py: 2 }}>
          <Button
            onClick={() => setJobListDialogOpen(false)}
            variant="outlined"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderColor: "#e2e8f0",
              color: "#475569",
              borderRadius: "8px",
              "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnalyticsOverview;
