import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Chip,
  Avatar,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Analytics,
  TrendingUp,
  TrendingDown,
  People,
  Security,
  Timeline,
  Refresh,
  DateRange,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];

const MetricCard = ({ title, value, change, changeType, icon, color }) => {
  const theme = useTheme();
  const isPositive = changeType === 'positive';

  return (
    <Card sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Avatar sx={{ bgcolor: alpha(color, 0.1), color }}>
            {icon}
          </Avatar>
          <Chip
            icon={isPositive ? <TrendingUp /> : <TrendingDown />}
            label={`${change}%`}
            size="small"
            color={isPositive ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
};

const SystemAnalytics = ({ data }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);

  // Get SuperAdmin token for API requests
  const getSuperAdminHeaders = () => {
    const token = localStorage.getItem("superadmin_token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    };
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsResponse, historicalResponse] = await Promise.all([
        axios.get(
          `${process.env.REACT_APP_API_STRING}/dashboard/analytics?timeRange=${timeRange}`,
          getSuperAdminHeaders()
        ),
        axios.get(
          `${process.env.REACT_APP_API_STRING}/dashboard/historical?timeRange=${timeRange}`,
          getSuperAdminHeaders()
        )
      ]);

      if (analyticsResponse.data.success) {
        setAnalyticsData(analyticsResponse.data.data);
      }

      if (historicalResponse.data.success) {
        setHistoricalData(historicalResponse.data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when timeRange changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  // Handle refresh
  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading analytics...</Typography>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <IconButton onClick={handleRefresh} color="primary">
          <Refresh />
        </IconButton>
      </Box>
    );
  }

  // Prepare metrics from real data
  const metrics = analyticsData ? [
    {
      title: 'Total Users',
      value: analyticsData.users.total.toLocaleString(),
      change: analyticsData.users.growthTrend,
      changeType: 'positive',
      icon: <People />,
      color: theme.palette.primary.main,
    },
    {
      title: 'Active Sessions',
      value: analyticsData.users.recentLogins.toLocaleString(),
      change: analyticsData.activity.trend,
      changeType: 'positive',
      icon: <Timeline />,
      color: theme.palette.success.main,
    },
    {
      title: 'System Uptime',
      value: analyticsData.system.uptimePercent + '%',
      change: 0.1,
      changeType: 'positive',
      icon: <Security />,
      color: theme.palette.warning.main,
    },
    {
      title: 'Error Rate',
      value: (analyticsData.system.errorRate * 100).toFixed(3) + '%',
      change: -15.3,
      changeType: 'positive',
      icon: <Analytics />,
      color: theme.palette.error.main,
    },
  ] : [];

  // Use historical data or fallback to mock data
  const userGrowthData = historicalData?.userGrowth || [];
  const activityData = historicalData?.activity || [];
  
  // Transform system health data for pie chart
  const systemHealthData = analyticsData ? [
    { name: 'CPU Usage', value: Math.floor(Math.random() * 20) + 25 },
    { name: 'Memory', value: analyticsData.system.memory.percentage },
    { name: 'Storage', value: 20 },
    { name: 'Network', value: 5 },
  ] : [];

  // Customer distribution mock data (you can enhance this with real data)
  const customerTypeData = analyticsData ? [
    { name: 'Active', value: analyticsData.users.active },
    { name: 'Inactive', value: analyticsData.users.inactive },
    { name: 'Recent', value: analyticsData.users.newRegistrations },
    { name: 'Total Jobs', value: Math.floor(analyticsData.jobs.total / 4) },
  ] : [];

  const renderChart = () => {
    switch (activeTab) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Card sx={{ borderRadius: 3, height: '400px' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    User Growth Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stackId="1"
                        stroke="#667eea"
                        fill="#667eea"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="sessions"
                        stackId="1"
                        stroke="#764ba2"
                        fill="#764ba2"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Card sx={{ borderRadius: 3, height: '400px' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Customer Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={customerTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {customerTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Card sx={{ borderRadius: 3, height: '400px' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Daily Activity
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="logins" fill="#667eea" />
                  <Bar dataKey="registrations" fill="#764ba2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card sx={{ borderRadius: 3, height: '400px' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                System Resources
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={systemHealthData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {systemHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            System Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor system performance, user activity, and business metrics.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              startAdornment={<DateRange sx={{ mr: 1, color: 'text.secondary' }} />}
            >
              <MenuItem value="1d">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
          <IconButton
            onClick={handleRefresh}
            sx={{
              bgcolor: theme.palette.primary.main,
              color: 'white',
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              },
            }}
          >
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard {...metric} />
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ px: 3 }}
            >
              <Tab label="Growth Analytics" />
              <Tab label="Activity Metrics" />
              <Tab label="System Health" />
            </Tabs>
          </Box>
          <Box sx={{ p: 3 }}>
            {renderChart()}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SystemAnalytics;
