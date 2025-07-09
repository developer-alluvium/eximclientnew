import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  useTheme,
  alpha,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Dashboard,
  People,
  Analytics,
  Timeline,
  Logout,
  AdminPanelSettings,
  Security,
  Settings,
  Visibility,
} from '@mui/icons-material';

const DRAWER_WIDTH = 280;

const DashboardSidebar = ({ open, onClose, activeTab, onTabChange, tabs, onLogout }) => {
  const theme = useTheme();

  const getIcon = (iconName) => {
    const iconMap = {
      dashboard: Dashboard,
      people: People,
      settings: Settings,
      visibility: Visibility,
      analytics: Analytics,
      timeline: Timeline,
      security: Security,
    };
    const IconComponent = iconMap[iconName] || Dashboard;
    return <IconComponent />;
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: `linear-gradient(180deg, ${theme.palette.common.white} 0%, ${theme.palette.grey[50]} 100%)`,
          color: 'white',
          borderRight: 'none',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette.common.white, 0.2),
              mr: 2,
              width: 48,
              height: 48,
            }}
          >
            <AdminPanelSettings />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              SuperAdmin
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              EXIM Management
            </Typography>
          </Box>
        </Box>
        
        <Chip
          icon={<Security />}
          label="Administrator"
          size="small"
          sx={{
            bgcolor: alpha(theme.palette.success.main, 0.2),
            color: 'white',
            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
          }}
        />
      </Box>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, py: 2 }}>
        <Typography
          variant="caption"
          sx={{
            px: 3,
            py: 1,
            display: 'block',
            color: alpha(theme.palette.common.black, 0.7),
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Navigation
        </Typography>
        
        <List sx={{ px: 1 }}>
  {tabs.map((tab, index) => (
    <ListItem
      key={index}
      button
      onClick={() => onTabChange(index)}
      sx={{
        mb: 0.5,
        mx: 1,
        borderRadius: 2,
        bgcolor: activeTab === index ? alpha(theme.palette.primary.main, 0.3) : 'transparent',
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.2),
        },
        '&.Mui-selected': {
          bgcolor: alpha(theme.palette.primary.main, 0.3),
        },
        transition: 'all 0.2s ease',
      }}
      selected={activeTab === index}
    >
      <ListItemIcon
        sx={{
          color: activeTab === index ? theme.palette.common.black : alpha(theme.palette.common.black, 0.7),
          minWidth: 40,
        }}
      >
        {getIcon(tab.icon)}
      </ListItemIcon>
      <ListItemText
        primary={tab.label}
        sx={{
          '& .MuiListItemText-primary': {
            fontWeight: activeTab === index ? 600 : 400,
            fontSize: '0.9rem',
            color: theme.palette.common.black,
          },
        }}
      />
      {activeTab === index && (
        <Box
          sx={{
            width: 4,
            height: 20,
            bgcolor: theme.palette.primary.light,
            borderRadius: 2,
          }}
        />
      )}
    </ListItem>
  ))}
</List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2, borderColor: alpha(theme.palette.common.black, 0.1) }} />
        
        <ListItem
          button
          onClick={onLogout}
          sx={{
            borderRadius: 2,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.2),
            },
          }}
        >
          <ListItemIcon sx={{ color: theme.palette.error.light, minWidth: 40 }}>
            <Logout />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: 600,
                fontSize: '0.9rem',
                color: theme.palette.error.light,
              },
            }}
          />
        </ListItem>

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 2,
            opacity: 0.6,
            fontSize: '0.7rem',
          }}
        >
          EXIM v{process.env.REACT_APP_VERSION || '1.0.0'}
        </Typography>
      </Box>
    </Drawer>
  );
};

export default DashboardSidebar;
