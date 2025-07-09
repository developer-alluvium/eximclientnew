import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';

const ModernStatsCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  color = '#3B82F6',
  loading = false 
}) => {
  if (loading) {
    return (
      <Card
        sx={{
          height: '100%',
          border: '1px solid #F3F4F6',
          borderRadius: 2,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                backgroundColor: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
            <Box
              sx={{
                width: 60,
                height: 16,
                borderRadius: 1,
                backgroundColor: '#F3F4F6',
              }}
            />
          </Box>
          
          <Box
            sx={{
              width: 80,
              height: 24,
              borderRadius: 1,
              backgroundColor: '#F3F4F6',
              mb: 1,
            }}
          />
          
          <Box
            sx={{
              width: 120,
              height: 14,
              borderRadius: 1,
              backgroundColor: '#F9FAFB',
            }}
          />
        </CardContent>
      </Card>
    );
  }

  const isPositiveTrend = trend === 'up';
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown;
  const trendColor = isPositiveTrend ? '#10B981' : '#EF4444';

  return (
    <Card
      sx={{
        height: '100%',
        border: '1px solid #F3F4F6',
        borderRadius: 2,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          borderColor: '#E5E7EB',
        },
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header with icon and trend */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              backgroundColor: alpha(color, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {Icon && (
              <Icon 
                sx={{ 
                  fontSize: 20, 
                  color: color,
                }} 
              />
            )}
          </Box>
          
          {change && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: alpha(trendColor, 0.1),
              }}
            >
              <TrendIcon 
                sx={{ 
                  fontSize: 12, 
                  color: trendColor,
                }} 
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: trendColor,
                }}
              >
                {Math.abs(change)}%
              </Typography>
            </Box>
          )}
        </Box>
        
        {/* Value */}
        <Typography
          variant="h4"
          sx={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1F2937',
            lineHeight: 1,
            mb: 1,
          }}
        >
          {value}
        </Typography>
        
        {/* Title */}
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: '#6B7280',
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ModernStatsCard;
