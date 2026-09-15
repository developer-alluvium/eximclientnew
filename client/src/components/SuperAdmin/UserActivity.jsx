import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Drawer,
  Tabs,
  Tab,
  Divider,
  Button,
} from "@mui/material";
import {
  Person,
  AccessTime,
  Mouse,
  Search,
  Refresh,
  Visibility,
  CheckCircle,
  RadioButtonUnchecked,
  LocationOn,
  Timeline as TimelineIcon,
  Close,
  Download,
} from "@mui/icons-material";
import { useSuperAdminApi } from "../../hooks/useSuperAdminApi";

const UserActivity = () => {
  const {
    loading,
    error,
    getMonitoringAnalytics,
    getUserMonitoringSummary,
    getUserDetailedTimeline,
    getLiveClickStream,
  } = useSuperAdminApi();

  // Component state
  const [activeTab, setActiveTab] = useState(0); // 0: User Summary Table, 1: Live Click Stream
  const [dateRange, setDateRange] = useState("30d");
  const [searchQuery, setSearchQuery] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [usersSummary, setUsersSummary] = useState([]);
  const [clickEvents, setClickEvents] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // User details drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTimeline, setUserTimeline] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Fetch monitoring data
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [analyticsRes, usersRes, clicksRes] = await Promise.all([
        getMonitoringAnalytics(dateRange),
        getUserMonitoringSummary(searchQuery, dateRange, 1, 50),
        getLiveClickStream("", "", searchQuery, 50),
      ]);

      if (analyticsRes?.success) setAnalytics(analyticsRes.data);
      if (usersRes?.success) setUsersSummary(usersRes.data || []);
      if (clicksRes?.success) setClickEvents(clicksRes.data || []);
    } catch (err) {
      console.error("Error loading user activity monitoring:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [dateRange, searchQuery, getMonitoringAnalytics, getUserMonitoringSummary, getLiveClickStream]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle drawer open for user timeline
  const handleOpenUserTimeline = async (user) => {
    setSelectedUser(user);
    setDrawerOpen(true);
    setLoadingTimeline(true);
    try {
      const res = await getUserDetailedTimeline(user.userId);
      if (res?.success) {
        setUserTimeline(res.data);
      }
    } catch (err) {
      console.error("Failed to load user timeline:", err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Format active duration human readable
  const formatDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds <= 0) return "0 mins";
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} mins`;
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Header & Controls */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#000000" }}>
            User Activity & Time Spent Monitoring
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track user session duration, click streams, active online users, and feature usage. (Super Admin Only)
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search user, email, IEC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 220, bgcolor: "#FFFFFF" }}
          />

          <FormControl size="small" sx={{ minWidth: 140, bgcolor: "#FFFFFF" }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="1d">Today (24h)</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={isRefreshing ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
            onClick={fetchData}
            disabled={isRefreshing}
            sx={{
              bgcolor: "#1E293B",
              "&:hover": { bgcolor: "#0F172A" },
              borderRadius: 1.5,
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* KPI Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              border: "1px solid #E2E8F0",
              background: "linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700 }}>
                    Live Online Now
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#16A34A", mt: 0.5 }}>
                    {analytics?.onlineUsersCount || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#DCFCE7", color: "#16A34A", width: 48, height: 48 }}>
                  <RadioButtonUnchecked sx={{ animation: "pulse 2s infinite" }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              border: "1px solid #E2E8F0",
              background: "linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700 }}>
                    Total Time Spent
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#2563EB", mt: 0.5 }}>
                    {analytics?.totalActiveHours || 0} hrs
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#DBEAFE", color: "#2563EB", width: 48, height: 48 }}>
                  <AccessTime />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              border: "1px solid #E2E8F0",
              background: "linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700 }}>
                    Total Clicks Logged
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#9333EA", mt: 0.5 }}>
                    {analytics?.totalClicks || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#F3E8FF", color: "#9333EA", width: 48, height: 48 }}>
                  <Mouse />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              border: "1px solid #E2E8F0",
              background: "linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700 }}>
                    Top Active Module
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F172A", mt: 0.5, wordBreak: "break-all" }}>
                    {analytics?.topPages?.[0]?.path || "/importdsr"}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#FEF3C7", color: "#D97706", width: 48, height: 48 }}>
                  <LocationOn />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<Person />} iconPosition="start" label={`User Summary & Time Spent (${usersSummary.length})`} />
          <Tab icon={<TimelineIcon />} iconPosition="start" label={`Live Click Stream (${clickEvents.length})`} />
        </Tabs>
      </Paper>

      {/* TAB 0: User Summary Table */}
      {activeTab === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <Table>
            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role / IEC</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Time Spent</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sessions</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Clicks</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Active</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && usersSummary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : usersSummary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No user activity records found for selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                usersSummary.map((user) => (
                  <TableRow key={user.userId} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: "#3B82F6", width: 36, height: 36, fontSize: 14 }}>
                          {user.userName ? user.userName.charAt(0).toUpperCase() : "U"}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F172A" }}>
                            {user.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.userEmail}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        <Chip
                          label={user.userRole || "user"}
                          size="small"
                          sx={{
                            width: "fit-content",
                            fontSize: 10,
                            height: 20,
                            bgcolor: user.userRole === "superadmin" ? "#FEE2E2" : "#E0F2FE",
                            color: user.userRole === "superadmin" ? "#991B1B" : "#075985",
                            fontWeight: 700,
                          }}
                        />
                        {user.ieCode && (
                          <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#64748B" }}>
                            IEC: {user.ieCode}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        icon={<AccessTime sx={{ fontSize: "14px !important" }} />}
                        label={formatDuration(user.totalActiveSeconds)}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {user.sessionCount}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#9333EA" }}>
                        {user.totalClicks}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {user.isOnline ? (
                        <Chip
                          icon={<CheckCircle sx={{ fontSize: "14px !important" }} />}
                          label="Online Now"
                          size="small"
                          sx={{ bgcolor: "#DCFCE7", color: "#166534", fontWeight: 700 }}
                        />
                      ) : (
                        <Chip
                          label="Offline"
                          size="small"
                          sx={{ bgcolor: "#F1F5F9", color: "#64748B", fontWeight: 600 }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(user.lastHeartbeat)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="View User Detailed Activity Stream">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => handleOpenUserTimeline(user)}
                        >
                          Details
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* TAB 1: Live Click Stream */}
      {activeTab === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <Table>
            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Event Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Page Route</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Element / Interaction</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clickEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No click events recorded recently.
                  </TableCell>
                </TableRow>
              ) : (
                clickEvents.map((evt) => (
                  <TableRow key={evt._id} hover>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(evt.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {evt.userName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {evt.userEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={evt.eventType}
                        size="small"
                        sx={{
                          fontSize: 10,
                          fontWeight: 700,
                          bgcolor: evt.eventType === "page_view" ? "#DBEAFE" : "#F3E8FF",
                          color: evt.eventType === "page_view" ? "#1E40AF" : "#6B21A8",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#2563EB" }}>
                        {evt.path}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "#0F172A" }}>
                        {evt.elementText || evt.elementId || "<element>"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* User Timeline Slide-out Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 550 }, p: 3 },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            User Activity Timeline
          </Typography>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <Close />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {loadingTimeline ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : selectedUser ? (
          <Box>
            {/* User Details Header */}
            <Card sx={{ bgcolor: "#F8FAFC", mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: "#2563EB", width: 44, height: 44 }}>
                    {selectedUser.userName?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {selectedUser.userName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedUser.userEmail}
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={1} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Total Active Time:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#2563EB" }}>
                      {formatDuration(userTimeline?.totalActiveSeconds || selectedUser.totalActiveSeconds)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Online Status:
                    </Typography>
                    <Box>
                      {selectedUser.isOnline ? (
                        <Chip label="Online Now" size="small" color="success" sx={{ fontWeight: 700 }} />
                      ) : (
                        <Chip label="Offline" size="small" sx={{ color: "#64748B" }} />
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Click Stream Timeline */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Activity Stream & Click Log ({userTimeline?.events?.length || 0} events)
            </Typography>

            <Box sx={{ maxHeight: 480, overflowY: "auto", pr: 1 }}>
              {userTimeline?.events?.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No recorded events for this user yet.
                </Typography>
              ) : (
                userTimeline?.events?.map((evt, idx) => (
                  <Paper
                    key={evt._id || idx}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      mb: 1.5,
                      borderRadius: 1.5,
                      borderColor: evt.eventType === "page_view" ? "#BFDBFE" : "#E2E8F0",
                      bgcolor: evt.eventType === "page_view" ? "#EFF6FF" : "#FFFFFF",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Chip
                        label={evt.eventType}
                        size="small"
                        sx={{ fontSize: 9, height: 18, fontWeight: 700 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(evt.timestamp)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F172A" }}>
                      {evt.elementText || evt.elementId || `Visited ${evt.path}`}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#2563EB" }}>
                      Route: {evt.path}
                    </Typography>
                  </Paper>
                ))
              )}
            </Box>
          </Box>
        ) : null}
      </Drawer>
    </Box>
  );
};

export default UserActivity;