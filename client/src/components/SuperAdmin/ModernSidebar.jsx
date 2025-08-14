import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import {
  Dashboard,
  People,
  Extension,
  Analytics,
  Timeline,
  Security,
  Logout,
  AdminPanelSettings,
  ChevronRight,
} from '@mui/icons-material';

const DRAWER_WIDTH_EXPANDED = 240;
const DRAWER_WIDTH_COLLAPSED = 64;

const ModernSidebar = ({ 
  open, 
  collapsed, 
  onToggleCollapse,
  activeTab, 
  onTabChange, 
  tabs, 
  onLogout,
  mobileOpen,
  onMobileToggle
}) => {
  const [hoverExpanded, setHoverExpanded] = useState(false);

  const getIcon = (iconName) => {
    const iconMap = {
      dashboard: <Dashboard />,
      people: <People />,
      admin_panel_settings: <AdminPanelSettings />,
      settings: <Extension />,
      analytics: <Analytics />,
      timeline: <Timeline />,
      security: <Security />,
    };
    return iconMap[iconName] || <Dashboard />;
  };

  const isExpanded = !collapsed || hoverExpanded;

  // Drawer content component to avoid duplication
  const DrawerContent = () => (
    <>
      {/* Header */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'space-between' : 'center',
          px: isExpanded ? 2 : 1,
          borderBottom: '1px solid #1F1F1F',
        }}
      >
        {isExpanded && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AdminPanelSettings 
              sx={{ 
                color: '#FFFFFF', 
                fontSize: 20,
                mr: 1
              }} 
            />
            <Box>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                }}
              >
                SuperAdmin
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.6875rem',
                  color: '#A1A1AA',
                  lineHeight: 1,
                }}
              >
                EXIM Control
              </Typography>
            </Box>
          </Box>
        )}
        
        {!isExpanded && (
          <AdminPanelSettings 
            sx={{ 
              color: '#FFFFFF', 
              fontSize: 20,
            }} 
          />
        )}
      </Box>

      {/* Navigation */}
      <List sx={{ py: 2, px: 1 }}>
        {tabs.map((tab, index) => {
          const iconElement = getIcon(tab.icon || 'dashboard');
          const isActive = activeTab === index;

          return (
            <ListItem
              key={index}
              onClick={() => onTabChange(index)}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                cursor: 'pointer',
                backgroundColor: isActive ? '#2D2D2D' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive ? '#2D2D2D' : '#1F1F1F',
                },
                transition: 'background-color 0.2s ease',
                minHeight: 40,
                px: isExpanded ? 2 : 1.5,
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive ? '#FFFFFF' : '#A1A1AA',
                  minWidth: isExpanded ? 40 : 'auto',
                  mr: isExpanded ? 1 : 0,
                  transition: 'color 0.2s ease',
                }}
              >
                {React.cloneElement(iconElement, { fontSize: 'small' })}
              </ListItemIcon>
              {isExpanded && (
                <ListItemText
                  primary={tab.label}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '0.8125rem',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#FFFFFF' : '#A1A1AA',
                      transition: 'color 0.2s ease',
                    },
                  }}
                />
              )}
            </ListItem>
          );
        })}
      </List>

      {/* Bottom Section - Logout */}
      <Box sx={{ mt: 'auto', p: 1 }}>
        <Divider sx={{ borderColor: '#1F1F1F', mb: 1 }} />
        <ListItem
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: '#1F1F1F',
            },
            transition: 'background-color 0.2s ease',
            minHeight: 40,
            px: isExpanded ? 2 : 1.5,
          }}
        >
          <ListItemIcon
            sx={{
              color: '#A1A1AA',
              minWidth: isExpanded ? 40 : 'auto',
              mr: isExpanded ? 1 : 0,
            }}
          >
            <Logout fontSize="small" />
          </ListItemIcon>
          {isExpanded && (
            <ListItemText
              primary="Logout"
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: '0.8125rem',
                  fontWeight: 400,
                  color: '#A1A1AA',
                },
              }}
            />
          )}
        </ListItem>

        {/* Expand Button for Collapsed State */}
        {!isExpanded && (
          <ListItem
            onClick={onToggleCollapse}
            sx={{
              borderRadius: 2,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#1F1F1F',
              },
              transition: 'background-color 0.2s ease',
              minHeight: 40,
              px: 1.5,
              justifyContent: 'center',
              mt: 1,
            }}
          >
            <ListItemIcon
              sx={{
                color: '#A1A1AA',
                minWidth: 'auto',
                mr: 0,
                '&:hover': {
                  color: '#FFFFFF',
                },
              }}
            >
              <ChevronRight fontSize="small" />
            </ListItemIcon>
          </ListItem>
        )}
      </Box>
    </>
  );

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_user');
    if (typeof onLogout === 'function') {
      onLogout();
    }
  };

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH_EXPANDED,
            backgroundColor: '#000000',
            color: '#FFFFFF',
            borderRight: 'none',
          },
        }}
      >
        <DrawerContent />
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        open={open}
        onMouseEnter={() => collapsed && setHoverExpanded(true)}
        onMouseLeave={() => collapsed && setHoverExpanded(false)}
        sx={{
          width: isExpanded ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH_COLLAPSED,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: isExpanded ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH_COLLAPSED,
            backgroundColor: '#000000',
            color: '#FFFFFF',
            borderRight: 'none',
            transition: 'width 0.2s ease',
            overflow: 'hidden',
            zIndex: 1100,
          },
        }}
      >
        <DrawerContent />
      </Drawer>
    </>
  );
};

export default ModernSidebar;
