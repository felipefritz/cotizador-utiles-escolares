import React, { createContext, useContext, useState, useEffect } from 'react'
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  mode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useThemeMode = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider')
  }
  return context
}

const getLightTheme = () =>
  createTheme({
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
      text: {
        primary: '#111827',
        secondary: '#5B6472',
      },
      success: { main: '#10B981' },
      warning: { main: '#F59E0B' },
      error: { main: '#EF4444' },
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
    components: getComponentOverrides(),
  })

const getDarkTheme = () =>
  createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#60A5FA',
        light: '#93C5FD',
        dark: '#2563EB',
      },
      secondary: {
        main: '#2DD4BF',
        light: '#5EEAD4',
        dark: '#0F766E',
      },
      background: {
        default: '#0f172a',
        paper: '#1e293b',
      },
      text: {
        primary: '#f1f5f9',
        secondary: '#cbd5e1',
      },
      success: { main: '#10B981' },
      warning: { main: '#F59E0B' },
      error: { main: '#EF4444' },
      divider: '#334155',
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
    components: getComponentOverrides(),
  })

const getComponentOverrides = () => ({
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
  MuiTableCell: {
    styleOverrides: {
      head: {
        fontWeight: 800,
      },
    },
  },
})

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    // Cargar preferencia del usuario desde localStorage
    const savedMode = localStorage.getItem('themeMode') as ThemeMode | null
    if (savedMode) {
      setMode(savedMode)
    }
  }, [])

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light'
      localStorage.setItem('themeMode', newMode)
      return newMode
    })
  }

  const theme = mode === 'light' ? getLightTheme() : getDarkTheme()

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
