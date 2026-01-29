import { AppBar, Toolbar, Box, Button, Container, Avatar, Menu, MenuItem, Typography, IconButton } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import MailIcon from '@mui/icons-material/Mail'
import HomeIcon from '@mui/icons-material/Home'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useThemeMode } from '../contexts/ThemeContext'
import { useState } from 'react'

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { mode, toggleTheme } = useThemeMode()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleMenuClose()
    logout()
    navigate('/')
  }

  const isActive = (path: string) => location.pathname === path

  const navLinkStyle = (path: string) => ({
    textDecoration: 'none',
    color: isActive(path) ? 'primary.light' : 'inherit',
    fontWeight: isActive(path) ? 600 : 500,
    opacity: isActive(path) ? 1 : 0.8,
    '&:hover': {
      opacity: 1,
      color: 'primary.light',
    },
    transition: 'all 0.2s',
  })

  return (
    <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
      <Container maxWidth="lg">
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 0, sm: 2 } }}>
          {/* Logo/Nombre */}
          <Box
            component="button"
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'inherit',
              fontSize: '1.2rem',
              fontWeight: 700,
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.1rem',
              }}
            >
              C
            </Box>
            <Typography variant="h6" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 700 }}>
              Cotizador
            </Typography>
          </Box>

          {/* Links de Navegación */}
          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 3 }, alignItems: 'center' }}>
            {/* Home */}
            <Button
              component="button"
              onClick={() => navigate('/')}
              startIcon={<HomeIcon sx={{ fontSize: 18 }} />}
              sx={{
                ...navLinkStyle('/'),
                textTransform: 'none',
                fontSize: { xs: '0.85rem', sm: '1rem' },
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Inicio</Box>
            </Button>

            {/* Contact */}
            <Button
              component="button"
              onClick={() => navigate('/contact')}
              startIcon={<MailIcon sx={{ fontSize: 18 }} />}
              sx={{
                ...navLinkStyle('/contact'),
                textTransform: 'none',
                fontSize: { xs: '0.85rem', sm: '1rem' },
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Contacto</Box>
            </Button>

            {/* Theme Toggle */}
            <IconButton
              onClick={toggleTheme}
              title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}
              sx={{
                color: 'inherit',
                opacity: 0.8,
                '&:hover': { opacity: 1 },
              }}
            >
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>

            {/* Autenticación */}
            {user ? (
              <>
                {/* Dashboard */}
                <Button
                  component="button"
                  onClick={() => navigate('/dashboard')}
                  startIcon={<DashboardIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    ...navLinkStyle('/dashboard'),
                    textTransform: 'none',
                    fontSize: { xs: '0.85rem', sm: '1rem' },
                  }}
                >
                  <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Dashboard</Box>
                </Button>

                {/* Admin Panel - solo si es admin */}
                {user?.is_admin && (
                  <Button
                    component="button"
                    onClick={() => navigate('/admin')}
                    startIcon={<AdminPanelSettingsIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      ...navLinkStyle('/admin'),
                      textTransform: 'none',
                      fontSize: { xs: '0.85rem', sm: '1rem' },
                      color: 'warning.main',
                    }}
                  >
                    <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Admin</Box>
                  </Button>
                )}

                {/* Menu de Usuario */}
                <Avatar
                  onClick={handleMenuOpen}
                  sx={{
                    width: 36,
                    height: 36,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  sx={{ mt: 1 }}
                >
                  <MenuItem disabled>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.email}
                    </Typography>
                  </MenuItem>
                  <MenuItem divider />
                  <MenuItem onClick={handleLogout} sx={{ display: 'flex', gap: 1 }}>
                    <LogoutIcon sx={{ fontSize: 18 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                {/* Login - mostrar solo si no está en /login */}
                {location.pathname !== '/login' && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate('/login')}
                    sx={{
                      textTransform: 'none',
                      fontSize: { xs: '0.85rem', sm: '1rem' },
                    }}
                  >
                    Login
                  </Button>
                )}
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}
