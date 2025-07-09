import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  alpha,
} from '@mui/material';

const ModernCard = ({ 
  children,
  title,
  subtitle,
  action,
  padding = 3,
  hoverable = false,
  variant = 'default',
  ...props 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          border: '2px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
        };
      case 'surface':
        return {
          backgroundColor: '#F8FAFC',
          border: '1px solid #F3F4F6',
        };
      case 'gradient':
        return {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#FFFFFF',
        };
      default:
        return {
          backgroundColor: '#FFFFFF',
          border: '1px solid #F3F4F6',
        };
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        boxShadow: 'none',
        ...getVariantStyles(),
        ...(hoverable && {
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }),
        ...props.sx,
      }}
      {...props}
    >
      {(title || action) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            p: padding,
            pb: title && !subtitle ? padding : 1,
            ...(subtitle && { pb: 0 }),
          }}
        >
          <Box>
            {title && (
              <Typography
                variant="h6"
                sx={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: variant === 'gradient' ? '#FFFFFF' : '#1F2937',
                  lineHeight: 1.25,
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.875rem',
                  color: variant === 'gradient' 
                    ? alpha('#FFFFFF', 0.8) 
                    : '#6B7280',
                  mt: 0.5,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && (
            <Box sx={{ ml: 2 }}>
              {action}
            </Box>
          )}
        </Box>
      )}
      
      <CardContent
        sx={{
          p: padding,
          ...(title && { pt: subtitle ? padding : 0 }),
          '&:last-child': {
            pb: padding,
          },
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
};

export default ModernCard;
