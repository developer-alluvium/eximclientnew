import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  alpha,
} from '@mui/material';
import {
  People,
  Business,
  Analytics,
  Security,
  TrendingUp,
  Assignment,
} from '@mui/icons-material';

// Import modern components
import ModernStatsCard from './ModernStatsCard';
import ModernCard from '../common/ModernCard';
import ModernActivityFeedNew from './ModernActivityFeedNew';

const ModernDashboardOverview = ({ data, onRefresh, loading = false }) => {
  // Mock data for development - replace with real data
  const stats = data || {
    totalCustomers: 156,
    activeCustomers: 134,
    totalModules: 12,
    activeModules: 10,
    recentActivity: [],
    systemHealth: 'excellent',
  };

  const statsCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers || 0,
      change: 12,
      trend: 'up',
      icon: People,
      color: '#3B82F6',
    },
    {
      title: 'Active Customers',
      value: stats.activeCustomers || 0,
      change: 8,
      trend: 'up',
      icon: Business,
      color: '#10B981',
    },
    {
      title: 'Available Modules',
      value: stats.totalModules || 0,
      change: 2,
      trend: 'up',
      icon: Assignment,
      color: '#F59E0B',
    },
    {
      title: 'System Health',
      value: '98.5%',
      change: 0.3,
      trend: 'up',
      icon: Security,
      color: '#8B5CF6',
    },
  ];

  const quickActions = [
    {
      title: 'Register New Customer',
      description: 'Add a new customer to the system',
      color: '#3B82F6',
      icon: People,
    },
    {
      title: 'Module Assignment',
      description: 'Manage customer module access',
      color: '#10B981',
      icon: Assignment,
    },
    {
      title: 'System Analytics',
      description: 'View performance metrics',
      color: '#F59E0B',
      icon: Analytics,
    },
  ];

  return (
    <Box sx={{ p: 0 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1F2937',
            mb: 0.5,
          }}
        >
          Dashboard Overview
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontSize: '0.875rem',
            color: '#6B7280',
          }}
        >
          Monitor system performance and manage customer access
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <ModernStatsCard
              title={stat.title}
              value={stat.value}
              change={stat.change}
              trend={stat.trend}
              icon={stat.icon}
              color={stat.color}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} lg={8}>
          <ModernCard
            title="Recent Activity"
            subtitle="Latest system events and user actions"
          >
            <ModernActivityFeedNew
              activities={stats.recentActivity || []}
              maxItems={6}
            />
          </ModernCard>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} lg={4}>
          <ModernCard
            title="Quick Actions"
            subtitle="Common administrative tasks"
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {quickActions.map((action, index) => (
                <Paper
                  key={index}
                  sx={{
                    p: 2,
                    border: '1px solid #F3F4F6',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: action.color,
                      backgroundColor: alpha(action.color, 0.05),
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        backgroundColor: alpha(action.color, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <action.icon sx={{ fontSize: 20, color: action.color }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#1F2937',
                          mb: 0.25,
                        }}
                      >
                        {action.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.75rem',
                          color: '#6B7280',
                        }}
                      >
                        {action.description}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </ModernCard>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} lg={6}>
          <ModernCard
            title="System Status"
            subtitle="Current system performance metrics"
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  Server Uptime
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#10B981' }}>
                  99.8%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  Database Status
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#10B981' }}>
                  Healthy
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  API Response Time
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#10B981' }}>
                  125ms
                </Typography>
              </Box>
            </Box>
          </ModernCard>
        </Grid>

        {/* Recent Changes */}
        <Grid item xs={12} lg={6}>
          <ModernCard
            title="Recent Changes"
            subtitle="Latest configuration updates"
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                  Module Access Updated
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  2 customers received new module permissions
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                  2 hours ago
                </Typography>
              </Box>
              <Box>
                <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                  Security Policy Updated
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  Password requirements strengthened
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                  1 day ago
                </Typography>
              </Box>
            </Box>
          </ModernCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ModernDashboardOverview;
