import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Chip,
  Breadcrumbs,
  Link,
  alpha,
} from '@mui/material';
import {
  Menu,
  Notifications,
  Settings,
  Person,
  Home,
  NavigateNext,
} from '@mui/icons-material';

const ModernHeader = ({ 
  onMenuClick, 
  activeTab, 
  user,
  onToggleSidebar
}) => {
  const DRAWER_WIDTH_EXPANDED = 240;
  const DRAWER_WIDTH_COLLAPSED = 64;

  const getBreadcrumbs = () => {
    const breadcrumbs = [
      {
        label: 'Dashboard',
        icon: <Home sx={{ fontSize: 14, mr: 0.5 }} />,
        href: '#',
      }
    ];

    if (activeTab && activeTab !== 'Overview') {
      breadcrumbs.push({
        label: activeTab,
        href: '#',
      });
    }

    return breadcrumbs;
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #F3F4F6',
        color: '#1F2937',
        left: { 
          xs: 0, 
          // md: sidebarCollapsed ? '64px' : '240px' 
        },
        width: { 
          xs: '100%',
          md: `calc(100% -  '240px'})`
          
        },
        transition: 'width 0.2s ease, left 0.2s ease',
        height: '64px',
      }}
    >
      <Toolbar
        sx={{
          minHeight: '64px !important',
          px: 3,
          py: 1,
        }}
      >
        {/* Mobile menu button */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={onToggleSidebar}
          sx={{
            mr: 2,
            display: { xs: 'block', md: 'none' },
            backgroundColor: '#F8FAFC',
            border: '1px solid #E5E7EB',
            '&:hover': {
              backgroundColor: '#F1F5F9',
              borderColor: '#D1D5DB',
            },
          }}
        >
          <Menu fontSize="small" sx={{ color: '#6B7280' }} />
        </IconButton>

        {/* Left side - Breadcrumbs */}
        <Box sx={{ flexGrow: 1 }}>
          {/* <Breadcrumbs
            separator={<NavigateNext fontSize="small" sx={{ color: '#D1D5DB' }} />}
            sx={{ mb: 0.5 }}
          >
            {getBreadcrumbs().map((crumb, index) => (
              <Link
                key={index}
                underline="hover"
                color={index === getBreadcrumbs().length - 1 ? '#1F2937' : '#6B7280'}
                href={crumb.href}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  fontWeight: index === getBreadcrumbs().length - 1 ? 600 : 400,
                  '&:hover': {
                    color: '#3B82F6',
                  },
                }}
              >
                {crumb.icon}
                {crumb.label}
              </Link>
            ))}
          </Breadcrumbs> */}
          
          {/* <Typography
            variant="h5"
            sx={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1F2937',
              lineHeight: 1,
            }}
          >
            {activeTab || 'Dashboard Overview'}
          </Typography> */}
        </Box>

        {/* Right side - Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <IconButton
            size="small"
            sx={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E5E7EB',
              '&:hover': {
                backgroundColor: '#F1F5F9',
                borderColor: '#D1D5DB',
              },
            }}
          >
            <Notifications fontSize="small" sx={{ color: '#6B7280' }} />
          </IconButton>

          {/* Settings */}
          <IconButton
            size="small"
            sx={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E5E7EB',
              '&:hover': {
                backgroundColor: '#F1F5F9',
                borderColor: '#D1D5DB',
              },
            }}
          >
            <Settings fontSize="small" sx={{ color: '#6B7280' }} />
          </IconButton>

          {/* User Info */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              ml: 1,
              px: 1.5,
              py: 0.5,
              backgroundColor: '#F8FAFC',
              borderRadius: 1,
              border: '1px solid #E5E7EB',
            }}
          >
            <Avatar
              sx={{
                width: 24,
                height: 24,
                backgroundColor: '#3B82F6',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {user?.username?.charAt(0)?.toUpperCase() || 'A'}
            </Avatar>
            
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#1F2937',
                  lineHeight: 1,
                }}
              >
                {user?.username || 'SuperAdmin'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.6875rem',
                  color: '#6B7280',
                  lineHeight: 1,
                }}
              >
                Administrator
              </Typography>
            </Box>

            <Chip
              size="small"
              label="Online"
              sx={{
                height: 16,
                fontSize: '0.6875rem',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                '& .MuiChip-label': {
                  px: 0.75,
                },
              }}
            />
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ModernHeader;
