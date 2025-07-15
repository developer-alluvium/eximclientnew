import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import { AdminPanelSettings, Security } from '@mui/icons-material';

const LoadingScreen = ({ message = "Loading SuperAdmin Dashboard..." }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.common.white, 0.1)} 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, ${alpha(theme.palette.common.white, 0.1)} 0%, transparent 50%),
                      radial-gradient(circle at 40% 40%, ${alpha(theme.palette.common.white, 0.05)} 0%, transparent 50%)`,
        }}
      />

      {/* Loading Card */}
      <Card
        sx={{
          maxWidth: 400,
          width: '90%',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 4,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {/* Icon */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 3,
              position: 'relative',
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              }}
            >
              <AdminPanelSettings sx={{ fontSize: 40, color: 'white' }} />
              <Box
                sx={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: theme.palette.success.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                <Security sx={{ fontSize: 14, color: 'white' }} />
              </Box>
            </Box>
          </Box>

          {/* Title */}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 1,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            SuperAdmin Portal
          </Typography>

          {/* Subtitle */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {message}
          </Typography>

          {/* Loading Spinner */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <CircularProgress
              size={40}
              thickness={4}
              sx={{
                color: theme.palette.primary.main,
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }}
            />
          </Box>

          {/* Security Notice */}
          <Box
            sx={{
              p: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              🔒 Secure connection established
              <br />
              Verifying administrator credentials...
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Version Info */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          EXIM Management System v{process.env.REACT_APP_VERSION || '1.0.0'}
        </Typography>
      </Box>
    </Box>
  );
};

export default LoadingScreen;
