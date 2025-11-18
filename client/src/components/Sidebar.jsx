import React, { useState, useEffect } from "react";
import axios from "axios";
import { getJsonCookie } from "../utils/cookies";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

// Import for pie chart
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const drawerWidth = 280;

const Sidebar = ({ setParentJobCounts, initialJobCounts }) => {
  // Tab visibility logic from cookies
  const getTabVisibility = () => {
    const userDataFromStorage = getJsonCookie("exim_user");
    if (userDataFromStorage) {
      try {
        const parsedUser = userDataFromStorage;
        return {
          showJobsTab: !!parsedUser?.jobsTabVisible,
          showGandhidhamTab: !!parsedUser?.gandhidhamTabVisible,
        };
      } catch {
        return { showJobsTab: true, showGandhidhamTab: true };
      }
    }
    return { showJobsTab: true, showGandhidhamTab: true };
  };

  const { showJobsTab, showGandhidhamTab } = getTabVisibility();
  const [selectedView, setSelectedView] = useState("jobs"); // "jobs" or "gandhidham"
  // If initial job counts are provided, use them, otherwise default to zeros
  const [jobCounts, setJobCounts] = useState(initialJobCounts || [0, 0, 0, 0]);
  const [totalJobs, pendingJobs, completedJobs, cancelledJobs] = jobCounts;
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedImporter, setSelectedImporter] = useState(null);

  // Get user data from localStorage
  useEffect(() => {
    const userDataFromStorage = getJsonCookie("exim_user");

    if (userDataFromStorage) {
      try {
        const parsedUser = userDataFromStorage;

        // Handle both old and new user data structures
        const userName = parsedUser?.name || parsedUser?.data?.user?.name;
        if (userName) {
          setSelectedImporter(userName);
        }
      } catch (e) {
        console.error("Error parsing user data from cookies:", e);
      }
    }
  }, []);

  // Fetch available years
  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        const filteredYears = res.data.filter((year) => year !== null);
        setYears(filteredYears);

        // Set default year based on current date
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
        const currentTwoDigits = String(currentYear).slice(-2);
        const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");

        let defaultYearPair =
          currentMonth >= 4
            ? `${currentTwoDigits}-${nextTwoDigits}`
            : `${prevTwoDigits}-${currentTwoDigits}`;

        // Prioritize 25-26 if it exists
        if (filteredYears.includes("25-26")) {
          setSelectedYear("25-26");
        } else if (!selectedYear && filteredYears.length > 0) {
          const yearToSet = filteredYears.includes(defaultYearPair)
            ? defaultYearPair
            : filteredYears[0];
          setSelectedYear(yearToSet);
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, []); // Remove selectedYear from dependency to avoid loop

  // Update jobCounts if initialJobCounts changes
  useEffect(() => {
    if (
      initialJobCounts &&
      Array.isArray(initialJobCounts) &&
      initialJobCounts.length === 4
    ) {
      setJobCounts(initialJobCounts);
    }
  }, [initialJobCounts]);

  // Fetch importer data when importer or year changes
  useEffect(() => {
    async function getImporterData() {
      if (selectedImporter && selectedYear) {
        try {
          const sanitizedImporter = selectedImporter;
          // .toLowerCase()
          // .replace(/ /g, "_")
          // .replace(/\./g, "")
          // .replace(/\//g, "_")
          // .replace(/-/g, "")
          // .replace(/_+/g, "_")
          // .replace(/\(/g, "")
          // .replace(/\)/g, "")
          // .replace(/\[/g, "")
          // .replace(/\]/g, "")
          // .replace(/,/g, "");

          let apiUrl = "";
          if (showJobsTab && !showGandhidhamTab) {
            apiUrl = `${process.env.REACT_APP_API_STRING}/get-importer-jobs/${sanitizedImporter}/${selectedYear}`;
          } else if (!showJobsTab && showGandhidhamTab) {
            apiUrl = `${process.env.REACT_APP_API_STRING}/gandhidham/get-importer-jobs/${sanitizedImporter}/${selectedYear}`;
          } else if (showJobsTab && showGandhidhamTab) {
            apiUrl =
              selectedView === "jobs"
                ? `${process.env.REACT_APP_API_STRING}/get-importer-jobs/${sanitizedImporter}/${selectedYear}`
                : `${process.env.REACT_APP_API_STRING}/gandhidham/get-importer-jobs/${sanitizedImporter}/${selectedYear}`;
          }

          if (!apiUrl) return;

          const res = await axios.get(apiUrl);
          if (res.data && Array.isArray(res.data) && res.data.length === 4) {
            const newJobCounts = res.data;
            setJobCounts(newJobCounts);
            if (setParentJobCounts) {
              setParentJobCounts(newJobCounts);
            }
          }
        } catch (error) {
          console.error("Error fetching importer data:", error);
        }
      }
    }
    getImporterData();
  }, [
    selectedImporter,
    selectedYear,
    setParentJobCounts,
    showJobsTab,
    showGandhidhamTab,
    selectedView,
  ]);

  // Handle year change
  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  // Prepare data for pie chart
  const pieChartData = [
    { name: "Pending Jobs", value: pendingJobs, color: "#FEAF1A" },
    { name: "Completed Jobs", value: completedJobs, color: "#00E4C5" },
    { name: "Cancelled Jobs", value: cancelledJobs, color: "#FF6378" },
  ].filter((item) => item.value > 0); // Only show segments with values

  // If all jobs are of one type, add a dummy segment to create a complete circle
  if (pieChartData.length === 1) {
    pieChartData.push({ name: "Other", value: 0, color: "#f5f5f5" });
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "#f5f5f5",
        },
      }}
    >
      <Box sx={{ overflow: "auto", p: 2, pb: 6 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Job Analytics
        </Typography>

        {/* Dropdown/toggle for jobs/gandhidham if both are visible */}
        {showJobsTab && showGandhidhamTab && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Select View
            </Typography>
            <Select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              size="small"
            >
              <MenuItem value="jobs">Jobs</MenuItem>
              <MenuItem value="gandhidham">Gandhidham Jobs</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Year Selection */}
        {years.length > 0 && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Financial Year
            </Typography>
            <Select
              value={selectedYear || ""}
              onChange={handleYearChange}
              displayEmpty
              size="small"
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Pie Chart */}
        {totalJobs > 0 && (
          <Box sx={{ width: "100%", height: 250, mb: 2, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, entry) => [
                    `${value}`,
                    `${entry}`,
                    "  Count",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text overlay */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
            >
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "#1F2937" }}
              >
                {totalJobs}
              </Typography>
              <Typography variant="body2" sx={{ color: "#6B7280" }}>
                Total Jobs
              </Typography>
            </div>
          </Box>
        )}

        {/* Job Statistics */}
        <List>
          <ListItem>
            <ListItemIcon>
              <DashboardIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Total Jobs" secondary={totalJobs} />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <PendingActionsIcon sx={{ color: "#FEAF1A" }} />
            </ListItemIcon>
            <ListItemText primary="Pending Jobs" secondary={pendingJobs} />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: "#00E4C5" }} />
            </ListItemIcon>
            <ListItemText primary="Completed Jobs" secondary={completedJobs} />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CancelIcon sx={{ color: "#FF6378" }} />
            </ListItemIcon>
            <ListItemText primary="Cancelled Jobs" secondary={cancelledJobs} />
          </ListItem>
        </List>

        {/* App Version */}
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            textAlign: "center",
            borderTop: "1px solid #e0e0e0",
            pt: 2,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "#6B7280", fontSize: "0.75rem" }}
          >
            Version {process.env.REACT_APP_VERSION || "06.02.01"}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
