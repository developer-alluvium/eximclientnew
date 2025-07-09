import { createTheme } from '@mui/material/styles';

// Modern minimal theme with clean design
export const modernTheme = createTheme({
  // Clean color palette
  palette: {
    mode: 'light',
    primary: {
      main: '#3B82F6', // Soft blue accent
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#64748B', // Muted gray
      light: '#94A3B8',
      dark: '#475569',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#10B981', // Subtle green
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B', // Soft amber
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444', // Clean red
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
    },
    background: {
      default: '#FFFFFF', // Pure white
      paper: '#FFFFFF',
      surface: '#F8FAFC', // Very light gray
    },
    text: {
      primary: '#1F2937', // Dark gray for main text
      secondary: '#6B7280', // Medium gray for secondary text
      disabled: '#9CA3AF',
    },
    divider: '#F3F4F6', // Very light divider
    sidebar: {
      background: '#000000', // Pure black sidebar
      text: '#FFFFFF',
      textSecondary: '#A1A1AA',
      hover: '#1F1F1F',
      active: '#2D2D2D',
    }
  },

  // Clean typography
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    
    // Small, clean font sizes
    h1: {
      fontSize: '1.75rem', // 28px
      fontWeight: 600,
      lineHeight: 1.2,
      color: '#1F2937',
    },
    h2: {
      fontSize: '1.5rem', // 24px
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#1F2937',
    },
    h3: {
      fontSize: '1.25rem', // 20px
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1F2937',
    },
    h4: {
      fontSize: '1.125rem', // 18px
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1F2937',
    },
    h5: {
      fontSize: '1rem', // 16px
      fontWeight: 600,
      lineHeight: 1.5,
      color: '#1F2937',
    },
    h6: {
      fontSize: '0.875rem', // 14px
      fontWeight: 600,
      lineHeight: 1.5,
      color: '#1F2937',
    },
    body1: {
      fontSize: '0.8125rem', // 13px - Small clean text
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#1F2937',
    },
    body2: {
      fontSize: '0.75rem', // 12px - Even smaller text
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#6B7280',
    },
    caption: {
      fontSize: '0.6875rem', // 11px - Very small text
      fontWeight: 400,
      lineHeight: 1.4,
      color: '#9CA3AF',
    },
    button: {
      fontSize: '0.75rem', // 12px buttons
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.025em',
    },
  },

  // Clean spacing
  spacing: 8,

  // Minimal shadows
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // Very subtle
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    // Add more shadows as needed...
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  ],

  // Clean shape
  shape: {
    borderRadius: 6, // Subtle rounded corners
  },

  // Custom transitions
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },

  // Component overrides for clean look
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '6px 16px',
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          borderRadius: 8,
          border: '1px solid #F3F4F6',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.6875rem',
          height: '20px',
          borderRadius: 4,
        },
        filled: {
          '&.MuiChip-colorSuccess': {
            backgroundColor: '#ECFDF5',
            color: '#059669',
          },
          '&.MuiChip-colorWarning': {
            backgroundColor: '#FFFBEB',
            color: '#D97706',
          },
          '&.MuiChip-colorError': {
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
          },
          '&.MuiChip-colorInfo': {
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #F3F4F6',
          fontSize: '0.75rem',
          padding: '8px 16px',
        },
        head: {
          backgroundColor: '#F8FAFC',
          fontWeight: 600,
          color: '#1F2937',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontSize: '0.8125rem',
            '& fieldset': {
              borderColor: '#E5E7EB',
            },
            '&:hover fieldset': {
              borderColor: '#D1D5DB',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3B82F6',
              borderWidth: '1px',
            },
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          fontWeight: 500,
        },
      },
    },
  },
});

export default modernTheme;
