import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563EB',
      light: '#60A5FA',
      dark: '#1D4ED8',
    },
    secondary: {
      main: '#0F766E',
      light: '#14B8A6',
      dark: '#115E59',
    },
    background: {
      default: '#F6F8FB',
      paper: '#FFFFFF',
    },
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    text: {
      primary: '#111827',
      secondary: '#5B6472',
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "DM Sans", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 800 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 700 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 8,
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: { padding: '24px 0' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 800,
          backgroundColor: '#F3F6FA',
        },
      },
    },
  },
})
