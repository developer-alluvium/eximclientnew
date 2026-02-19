import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Avatar,
  Divider,
} from '@mui/material';
import {
  People,
  Business,
  Assignment,
  AdminPanelSettings,
  VerifiedUser,
  PendingActions,
  Work,
  Group,
} from '@mui/icons-material';

// Import modern components
import ModernStatsCard from './ModernStatsCard';
import ModernCard from '../common/ModernCard';

const ModernDashboardOverview = ({ 
  data, 
  clientEngagement = [], 
  jobsBreakdown = [], 
  onRefresh, 
  loading = false 
}) => {
  
  // Stats Card Configuration
  const statsCards = [
    {
      title: 'Total Customers',
      value: data?.totalCustomers || 0,
      icon: Business,
      color: '#3B82F6', // Blue
    },
    {
      title: 'Active Customers',
      value: data?.activeCustomers || 0,
      icon: VerifiedUser,
      color: '#10B981', // Green
    },
    {
      title: 'Total Users',
      value: data?.totalUsers || 0,
      icon: Group,
      color: '#6366F1', // Indigo
    },
    {
      title: 'Active Users',
      value: data?.activeUsers || 0,
      icon: People,
      color: '#8B5CF6', // Violet
    },
    {
      title: 'KYC Approved',
      value: data?.kycApproved || 0,
      icon: VerifiedUser,
      color: '#059669', // Emerald
    },
    {
      title: 'KYC Pending',
      value: data?.kycPending || 0,
      icon: PendingActions,
      color: '#F59E0B', // Amber
    },
    {
      title: 'Total Admins',
      value: data?.totalAdmins || 0,
      icon: AdminPanelSettings,
      color: '#EF4444', // Red
    },
    {
      title: 'Total Jobs',
      value: data?.totalJobs || 0,
      icon: Work,
      color: '#EC4899', // Pink
    },
  ];

  // Helper to get status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'moderate': return 'warning';
      case 'inactive': return 'error';
      case 'never': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'moderate': return 'Moderate';
      case 'inactive': return 'Inactive';
      case 'never': return 'Never';
      default: return status;
    }
  };

  // KYC Pipeline Data Calculation
  const totalKyc = (data?.kycApproved || 0) + (data?.kycPending || 0) + (data?.kycDraft || 0);
  const kycStats = [
    { label: 'Approved', value: data?.kycApproved || 0, color: '#10B981' },
    { label: 'Pending', value: data?.kycPending || 0, color: '#F59E0B' },
    { label: 'Draft', value: data?.kycDraft || 0, color: '#6B7280' },
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
          Real-time insights and performance metrics
        </Typography>
      </Box>

      {/* Stats Cards Grid - 2 Rows of 4 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <ModernStatsCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              loading={loading}
              trend={null} // Removed trend as we don't have historical data for all
              change={null}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Client Engagement Table - Full Width */}
        <Grid item xs={12}>
          <ModernCard
            title="Client Engagement"
            subtitle="Clients sorted by inactivity (most dormant first)"
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Client Name</TableCell>
                    <TableCell>IE Code</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Days Inactive</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    // Loading skeleton could go here, but ModernCard usually handles content loading if we wanted
                    <TableRow>
                      <TableCell colSpan={5} align="center">Loading...</TableCell>
                    </TableRow>
                  ) : clientEngagement.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No client data available</TableCell>
                    </TableRow>
                  ) : (
                    clientEngagement.slice(0, 10).map((row, index) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                        <TableCell>{row.ie_code_no}</TableCell>
                        <TableCell>
                          {row.lastLogin ? new Date(row.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          {row.daysSinceLogin !== null ? `${row.daysSinceLogin} days` : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(row.status)}
                            color={getStatusColor(row.status)}
                            size="small"
                            variant={row.status === 'never' ? 'outlined' : 'filled'}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {clientEngagement.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                        Showing top 10 of {clientEngagement.length} clients
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </ModernCard>
        </Grid>

        {/* KYC Pipeline Breakdown - Half Width */}
        <Grid item xs={12} md={6}>
          <ModernCard
            title="KYC Pipeline"
            subtitle="Current status of KYC applications"
          >
            <Box sx={{ mt: 1 }}>
              {kycStats.map((item, index) => (
                <Box key={index} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {item.value} ({totalKyc > 0 ? Math.round((item.value / totalKyc) * 100) : 0}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={totalKyc > 0 ? (item.value / totalKyc) * 100 : 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: `${item.color}20`,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: item.color,
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              ))}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#10B981', fontWeight: 700 }}>
                    {data?.kycApproved || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Approved
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#F59E0B', fontWeight: 700 }}>
                    {data?.kycPending || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Pending
                  </Typography>
                </Box>
              </Box>
            </Box>
          </ModernCard>
        </Grid>

        {/* Top Clients by Job Volume - Half Width */}
        <Grid item xs={12} md={6}>
          <ModernCard
            title="Top Clients (25-26)"
            subtitle="Clients with highest job volume this year"
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Importer</TableCell>
                    <TableCell>IE Code</TableCell>
                    <TableCell align="right">Jobs</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">Loading...</TableCell>
                    </TableRow>
                  ) : jobsBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">No job data available</TableCell>
                    </TableRow>
                  ) : (
                    jobsBreakdown.map((client, index) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ color: 'text.secondary' }}>{index + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{client.importer || 'Unknown'}</TableCell>
                        <TableCell>{client.ie_code_no}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={client.jobCount} 
                            size="small" 
                            sx={{ 
                              bgcolor: 'primary.light', 
                              color: 'primary.dark',
                              fontWeight: 600,
                              minWidth: 40
                            }} 
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </ModernCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ModernDashboardOverview;
