import { Box, Container, Typography, Button, Grid, Card, CardContent, Paper, Link } from '@mui/material'
import StorefrontIcon from '@mui/icons-material/Storefront'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import SaveIcon from '@mui/icons-material/Save'
import SpeedIcon from '@mui/icons-material/Speed'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import DashboardIcon from '@mui/icons-material/Dashboard'
import MailIcon from '@mui/icons-material/Mail'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

type Props = {
  onTrialClick: () => void
  onLoginClick: () => void
  onStartClick: () => void
}

const PROVIDERS = [
  { name: 'Dimeiggs', color: '#FF6B35', description: 'Papelería y útiles escolares' },
  { name: 'Librería Nacional', color: '#004E89', description: 'Libros y artículos escolares' },
  { name: 'Jamila', color: '#F77F00', description: 'Útiles y artículos de oficina' },
  { name: 'Coloranimal', color: '#06A77D', description: 'Útiles escolares y artísticos' },
  { name: 'Pronobel', color: '#D62828', description: 'Papelería y librería' },
  { name: 'Prisa', color: '#6A4C93', description: 'Útiles escolares y oficina' },
  { name: 'La Secretaria', color: '#1982C4', description: 'Artículos de oficina y escolares' },
]

const FEATURES = [
  {
    icon: <AutoAwesomeIcon sx={{ fontSize: 40 }} />,
    title: 'Análisis con IA',
    description: 'Extracción inteligente de útiles desde PDF, DOCX, Excel con tecnología de IA',
  },
  {
    icon: <CompareArrowsIcon sx={{ fontSize: 40 }} />,
    title: 'Comparación Múltiple',
    description: 'Cotiza en 7 tiendas simultáneamente y encuentra los mejores precios',
  },
  {
    icon: <SpeedIcon sx={{ fontSize: 40 }} />,
    title: 'Rápido y Eficiente',
    description: 'Resultados en minutos. Ahorra tiempo y dinero en tus compras escolares',
  },
  {
    icon: <SaveIcon sx={{ fontSize: 40 }} />,
    title: 'Ahorra Dinero',
    description: 'Compara precios y selecciona los productos más convenientes para tu presupuesto',
  },
]

export function HomePage({ onTrialClick, onLoginClick, onStartClick }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h2" fontWeight={700} gutterBottom>
              Cotizador de Útiles Escolares
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, opacity: 0.95 }}>
              Compara precios en las principales tiendas de Chile y ahorra en útiles escolares
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {user ? (
                <>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={onStartClick}
                    startIcon={<RocketLaunchIcon />}
                    sx={{
                      bgcolor: 'white',
                      color: 'primary.main',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: 'grey.100',
                      },
                    }}
                  >
                    Comenzar a Cotizar
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/dashboard')}
                    startIcon={<DashboardIcon />}
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: 'grey.100',
                        bgcolor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    Mi Cuenta
                  </Button>
                </>
              ) : (
                // Usuario no logueado - mostrar opciones de trial y login
                <>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={onTrialClick}
                    sx={{
                      bgcolor: 'white',
                      color: 'primary.main',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: 'grey.100',
                      },
                    }}
                  >
                    Probar Gratis
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={onLoginClick}
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    Iniciar Sesión / Registrarse
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" fontWeight={600} align="center" gutterBottom>
          ¿Cómo funciona?
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 6 }}>
          Simple, rápido y efectivo
        </Typography>

        <Grid container spacing={4}>
          {FEATURES.map((feature, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  p: 2,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Providers Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight={600} align="center" gutterBottom>
            Tiendas Participantes
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Cotizamos en las mejores tiendas de útiles escolares de Chile
          </Typography>

          <Paper sx={{ p: 4 }}>
            <Grid container spacing={3} justifyContent="center" alignItems="stretch">
              {PROVIDERS.map((provider) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={provider.name}>
                  <Card
                    sx={{
                      height: '100%',
                      bgcolor: provider.color,
                      color: 'white',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                      },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <StorefrontIcon />
                        <Typography variant="h6" fontWeight={600}>
                          {provider.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {provider.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              onClick={onTrialClick}
              sx={{ px: 4, py: 1.5, fontSize: '1.1rem', fontWeight: 600, mr: 2 }}
            >
              Probar Gratis
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={onLoginClick}
              sx={{ px: 4, py: 1.5, fontSize: '1.1rem', fontWeight: 600 }}
            >
              Registrarse
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Steps Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" fontWeight={600} align="center" gutterBottom>
          Proceso Simple en 4 Pasos
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 6 }}>
          Desde subir tu lista hasta obtener los mejores precios
        </Typography>

        <Grid container spacing={4}>
          {[
            {
              step: '1',
              title: 'Elige las tiendas',
              description: 'Selecciona en qué tiendas quieres cotizar tus útiles',
            },
            {
              step: '2',
              title: 'Sube tu lista',
              description: 'Carga tu archivo PDF, DOCX o Excel con la lista de útiles',
            },
            {
              step: '3',
              title: 'Revisa y ajusta',
              description: 'Verifica los productos detectados y ajusta cantidades',
            },
            {
              step: '4',
              title: 'Obtén resultados',
              description: 'Compara precios y enlaces directos a cada producto',
            },
          ].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.step}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    fontWeight: 700,
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {item.step}
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer CTA */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 6,
          backgroundImage: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              ¿Listo para ahorrar en útiles escolares?
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.95 }}>
              Empieza ahora y encuentra los mejores precios en minutos
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={onTrialClick}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                mr: 2,
                '&:hover': {
                  bgcolor: 'grey.100',
                },
              }}
            >
              Probar Gratis
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={onLoginClick}
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              Registrarse
            </Button>
          </Box>
        </Container>
      </Box>

      {/* FOOTER */}
      <Box
        sx={{
          bgcolor: 'grey.900',
          color: 'white',
          py: 4,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="body2" sx={{ mb: 2 }}>
            © 2025 Cotizador de Útiles Escolares. Todos los derechos reservados.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              component="button"
              onClick={() => navigate('/contact')}
              sx={{ color: 'inherit', textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Contacto
            </Link>
            <Typography variant="body2">•</Typography>
            <Link
              href="https://github.com"
              target="_blank"
              sx={{ color: 'inherit', textDecoration: 'none', fontSize: '0.9rem' }}
            >
              GitHub
            </Link>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
