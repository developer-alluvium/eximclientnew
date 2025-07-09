import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Button,
  alpha,
} from '@mui/material';
import {
  Person,
  Security,
  Assignment,
  Analytics,
  Settings,
  CheckCircle,
  Warning,
  Error,
  Info,
  FilterList,
} from '@mui/icons-material';

const ModernActivityFeed = ({ activities = [], maxItems = 8 }) => {
  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'login': return Person;
      case 'logout': return Security;
      case 'module_assignment': return Assignment;
      case 'password_change': return Security;
      case 'system_update': return Settings;
      case 'analytics_view': return Analytics;
      default: return Info;
    }
  };

  const getActivityColor = (activityType) => {
    switch (activityType) {
      case 'login': return '#10B981';
      case 'logout': return '#6B7280';
      case 'module_assignment': return '#3B82F6';
      case 'password_change': return '#F59E0B';
      case 'system_update': return '#8B5CF6';
      case 'analytics_view': return '#06B6D4';
      default: return '#6B7280';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // Mock activities if none provided
  const mockActivities = activities.length > 0 ? activities : [
    {
      id: 1,
      type: 'login',
      user: 'John Doe',
      action: 'logged into the system',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
    },
    {
      id: 2,
      type: 'module_assignment',
      user: 'Admin',
      action: 'assigned new modules to customer ABC123',
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
    },
    {
      id: 3,
      type: 'password_change',
      user: 'Jane Smith',
      action: 'changed password',
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
    },
    {
      id: 4,
      type: 'analytics_view',
      user: 'Admin',
      action: 'viewed system analytics',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    },
  ];

  const displayActivities = mockActivities.slice(0, maxItems);

  if (displayActivities.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
          No recent activity to display
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with filter */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2,
      }}>
        <Typography 
          variant="caption" 
          sx={{ 
            color: '#6B7280',
            fontSize: '0.75rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.025em',
          }}
        >
          Last 24 hours
        </Typography>
        <Button 
          size="small" 
          startIcon={<FilterList />}
          sx={{ 
            fontSize: '0.75rem',
            color: '#6B7280',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: alpha('#3B82F6', 0.1)
            }
          }}
        >
          Filter
        </Button>
      </Box>
      
      {/* Activity List */}
      <List sx={{ p: 0 }}>
        {displayActivities.map((activity, index) => {
          const IconComponent = getActivityIcon(activity.type);
          const color = getActivityColor(activity.type);
          
          return (
            <ListItem
              key={activity.id || index}
              sx={{
                px: 0,
                py: 1.5,
                borderBottom: index < displayActivities.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    backgroundColor: alpha(color, 0.1),
                  }}
                >
                  <IconComponent sx={{ fontSize: 16, color }} />
                </Avatar>
              </ListItemIcon>
              
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.8125rem',
                      color: '#1F2937',
                      lineHeight: 1.4,
                    }}
                  >
                    <strong>{activity.user || 'System'}</strong> {activity.action}
                  </Typography>
                }
                secondary={
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.6875rem',
                      color: '#9CA3AF',
                      mt: 0.25,
                    }}
                  >
                    {formatTime(activity.timestamp)}
                  </Typography>
                }
              />
            </ListItem>
          );
        })}
      </List>
      
      {/* View All Footer */}
      <Box sx={{ 
        pt: 2, 
        borderTop: '1px solid #F3F4F6',
        textAlign: 'center'
      }}>
        <Button 
          size="small" 
          sx={{ 
            fontSize: '0.75rem',
            color: '#6B7280',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: alpha('#3B82F6', 0.1),
              color: '#3B82F6',
            }
          }}
        >
          View All Activity
        </Button>
      </Box>
    </Box>
  );
};

export default ModernActivityFeed;
