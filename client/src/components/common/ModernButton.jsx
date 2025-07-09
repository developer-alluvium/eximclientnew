import React from 'react';
import {
  Button,
  CircularProgress,
  alpha,
} from '@mui/material';

const ModernButton = ({ 
  children,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  onClick,
  ...props 
}) => {
  const getColorStyles = () => {
    const colors = {
      primary: '#3B82F6',
      secondary: '#64748B',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    };

    const selectedColor = colors[color] || colors.primary;

    switch (variant) {
      case 'contained':
        return {
          backgroundColor: selectedColor,
          color: '#FFFFFF',
          border: `1px solid ${selectedColor}`,
          '&:hover': {
            backgroundColor: alpha(selectedColor, 0.9),
            boxShadow: `0 4px 6px -1px ${alpha(selectedColor, 0.3)}`,
          },
          '&:active': {
            backgroundColor: alpha(selectedColor, 0.8),
          },
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          color: selectedColor,
          border: `1px solid ${selectedColor}`,
          '&:hover': {
            backgroundColor: alpha(selectedColor, 0.1),
            borderColor: alpha(selectedColor, 0.8),
          },
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          color: selectedColor,
          border: '1px solid transparent',
          '&:hover': {
            backgroundColor: alpha(selectedColor, 0.1),
          },
        };
      case 'ghost':
        return {
          backgroundColor: alpha(selectedColor, 0.1),
          color: selectedColor,
          border: '1px solid transparent',
          '&:hover': {
            backgroundColor: alpha(selectedColor, 0.2),
          },
        };
      default:
        return {};
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: '0.75rem',
          padding: '6px 12px',
          height: 32,
        };
      case 'large':
        return {
          fontSize: '0.9375rem',
          padding: '12px 24px',
          height: 48,
        };
      default: // medium
        return {
          fontSize: '0.8125rem',
          padding: '8px 16px',
          height: 40,
        };
    }
  };

  return (
    <Button
      variant="text" // Override MUI variant to use custom styles
      disabled={disabled || loading}
      fullWidth={fullWidth}
      onClick={onClick}
      startIcon={loading ? <CircularProgress size={16} /> : startIcon}
      endIcon={!loading ? endIcon : null}
      sx={{
        borderRadius: 1.5,
        fontWeight: 500,
        textTransform: 'none',
        boxShadow: 'none',
        transition: 'all 0.2s ease',
        ...getSizeStyles(),
        ...getColorStyles(),
        ...(disabled && {
          opacity: 0.6,
          cursor: 'not-allowed',
        }),
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ModernButton;
