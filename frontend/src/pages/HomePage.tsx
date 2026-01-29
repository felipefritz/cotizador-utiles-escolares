import { Box, Container, Typography, Button, Grid, Card, CardContent, Paper, useTheme, useMediaQuery } from '@mui/material'
import StorefrontIcon from '@mui/icons-material/Storefront'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import SaveIcon from '@mui/icons-material/Save'
import SpeedIcon from '@mui/icons-material/Speed'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import DashboardIcon from '@mui/icons-material/Dashboard'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api'

type Props = {
  onTrialClick: () => void
  onLoginClick: () => void
  onStartClick: () => void
  onSuggestProvider?: () => void
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
  {
    icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
    title: 'Análisis Inteligente',
    description: 'Recomendaciones personalizadas basadas en tus búsquedas anteriores',
  },
  {
    icon: <RocketLaunchIcon sx={{ fontSize: 40 }} />,
    title: 'Fácil de Usar',
    description: 'Interfaz intuitiva que funciona en cualquier dispositivo',
  },
]

export function HomePage({ onTrialClick, onLoginClick, onStartClick, onSuggestProvider }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [plans, setPlans] = useState<any[]>([])
  const [currentUserPlan, setCurrentUserPlan] = useState<string | null>(null)
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null)
  
  useEffect(() => {
    loadPlans()
    if (user) {
      loadUserCurrentPlan()
    } else {
      setCurrentUserPlan(null)
      setCurrentPlanId(null)
    }
  }, [user])
  
  const loadUserCurrentPlan = async () => {
    try {
      const res = await api.get('/user/subscription')
      const planName = res.data.plan_name?.toLowerCase() || 'free'
      const planId = res.data.plan_id || null
      
      console.log('[HomePage] Plan actual del usuario:', planName, 'ID:', planId)
      console.log('[HomePage] Respuesta completa:', res.data)
      
      setCurrentUserPlan(planName)
      setCurrentPlanId(planId)
    } catch (error) {
      console.error('Error loading user plan:', error)
      setCurrentUserPlan('free')
      setCurrentPlanId(null)
    }
  }
  
  const loadPlans = async () => {
    try {
      const res = await api.get('/plans')
      console.log('[HomePage] Planes disponibles:', res.data)
      setPlans(res.data)
    } catch (error) {
      console.error('Error loading plans:', error)
    }
  }

  const handlePlanSelect = (planName: string) => {
    if (planName === 'free') {
      if (user) {
        onStartClick()
      } else {
        onTrialClick()
      }
    } else {
      if (user) {
        navigate(`/dashboard?selectPlan=${planName}`)
      } else {
        navigate(`/login?redirect=dashboard&selectPlan=${planName}`)
      }
    }
  }
  
  const isCurrentPlan = (plan: any) => {
    if (!user) return false
    
    // Comparar por ID primero (más confiable)
    if (currentPlanId && plan.id === currentPlanId) {
      console.log(`[HomePage] Plan ${plan.name} es el actual (por ID)`)
      return true
    }
    
    // Fallback: comparar por nombre
    const planNameLower = plan.name.toLowerCase()
    const isMatch = currentUserPlan === planNameLower
    console.log(`[HomePage] Comparando ${planNameLower} con ${currentUserPlan}: ${isMatch}`)
    return isMatch
  }
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section - Mejorado */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: { xs: 6, sm: 8, md: 10 },
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            background: 'radial-gradient(circle at top right, rgba(255,255,255,0.1), transparent)',
            pointerEvents: 'none',
          }
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h2" 
                fontWeight={800} 
                gutterBottom
                sx={{ 
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  lineHeight: { xs: 1.2, md: 1.3 }
                }}
              >
                Cotiza Útiles Escolares
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 4, 
                  opacity: 0.95,
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  fontWeight: 500
                }}
              >
                Compara precios en 7 tiendas simultáneamente y ahorra dinero en útiles escolares
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                        px: { xs: 2, sm: 4 },
                        py: 1.5,
                        fontSize: { xs: '0.9rem', sm: '1.1rem' },
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: 'grey.100',
                        },
                      }}
                    >
                      Cotizar Ahora
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => navigate('/dashboard')}
                      startIcon={<DashboardIcon />}
                      sx={{
                        borderColor: 'white',
                        color: 'white',
                        px: { xs: 2, sm: 4 },
                        py: 1.5,
                        fontSize: { xs: '0.9rem', sm: '1.1rem' },
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
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={onTrialClick}
                      sx={{
                        bgcolor: 'white',
                        color: 'primary.main',
                        px: { xs: 2, sm: 4 },
                        py: 1.5,
                        fontSize: { xs: '0.9rem', sm: '1.1rem' },
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
                        px: { xs: 2, sm: 4 },
                        py: 1.5,
                        fontSize: { xs: '0.9rem', sm: '1.1rem' },
                        fontWeight: 600,
                        '&:hover': {
                          borderColor: 'white',
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                        },
                      }}
                    >
                      Registrarse
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box
                sx={{
                  fontSize: '5rem',
                  textAlign: 'center',
                  animation: 'float 3s ease-in-out infinite',
                  '@keyframes float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                  }
                }}
              >
                📊
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section - Mejorado */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            gutterBottom
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            ¿Por qué Cotizador de Útiles?
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}
          >
            Características que te ayudan a ahorrar tiempo y dinero
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {FEATURES.map((feature, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  p: 3,
                  transition: 'all 0.3s ease',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 4,
                    borderColor: 'primary.main',
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 2, display: 'flex', justifyContent: 'center' }}>
                    {feature.icon}
                  </Box>
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

      {/* Providers Section - Mejorado */}
      <Box sx={{ bgcolor: 'grey.50', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography 
              variant="h4" 
              fontWeight={700} 
              gutterBottom
              sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              Tiendas Participantes
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' }, mb: 3 }}
            >
              Comparamos en los mejores sitios de útiles de Chile
            </Typography>
          </Box>

          <Paper sx={{ p: { xs: 2, sm: 4 }, mb: 4 }}>
            <Grid container spacing={2}>
              {PROVIDERS.map((provider) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={provider.name}>
                  <Card
                    sx={{
                      height: '100%',
                      bgcolor: provider.color,
                      color: 'white',
                      transition: 'all 0.3s',
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

          <Box sx={{ textAlign: 'center', display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={onTrialClick}
              sx={{ px: { xs: 2, sm: 4 }, py: 1.5, fontWeight: 600 }}
            >
              Probar Gratis
            </Button>
            {user && (
              <Button
                variant="outlined"
                size="large"
                startIcon={<LightbulbIcon />}
                onClick={onSuggestProvider}
                sx={{ px: { xs: 2, sm: 4 }, py: 1.5, fontWeight: 600 }}
              >
                Sugerir Tienda
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      {/* Plans Section - Mejorado */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography 
              variant="h4" 
              fontWeight={700} 
              gutterBottom
              sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              Planes que se adaptan a ti
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}
            >
              Elige el plan que mejor se adapte a tus necesidades
            </Typography>
          </Box>

          <Grid container spacing={3} justifyContent="center">
            {plans.map((plan) => (
              <Grid item xs={12} sm={6} md={4} key={plan.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderRadius: 3,
                    boxShadow: plan.name === 'pro' ? 4 : 1,
                    border: plan.name === 'pro' ? 3 : 1,
                    borderColor: plan.name === 'pro' ? 'primary.main' : 'divider',
                    position: 'relative',
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-4px)'
                    }
                  }}
                >
                  {plan.name === 'pro' && (
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: -15, 
                        left: '50%', 
                        transform: 'translateX(-50%)',
                        bgcolor: 'primary.main',
                        color: 'white',
                        px: 2.5,
                        py: 0.75,
                        borderRadius: 2,
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        zIndex: 1
                      }}
                    >
                      ⭐ MÁS POPULAR
                    </Box>
                  )}
                  <CardContent sx={{ flexGrow: 1, pt: plan.name === 'pro' ? 5 : 3 }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ textTransform: 'uppercase', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {plan.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                      <Typography variant="h3" color="primary" fontWeight={700} sx={{ fontSize: { xs: '2rem', sm: '2.5rem' } }}>
                        {plan.price === 0 ? 'Gratis' : `$${(plan.price / 1000).toFixed(0)}K`}
                      </Typography>
                      {plan.price > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          {plan.billing_cycle === 'monthly' ? '/mes' : ''}
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ mt: 3, mb: 3 }}>
                      {[
                        {
                          label: plan.max_items ? `Hasta ${plan.max_items} items` : 'Items ilimitados',
                        },
                        {
                          label: plan.max_providers ? `${plan.max_providers} proveedores` : 'Proveedores ilimitados',
                        },
                        {
                          label: plan.monthly_limit ? `${plan.monthly_limit} cotizaciones/mes` : 'Cotizaciones ilimitadas',
                        },
                      ].map((feature, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <Box 
                            sx={{ 
                              width: 24, 
                              height: 24, 
                              borderRadius: '50%', 
                              bgcolor: 'success.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mr: 1.5,
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              flexShrink: 0
                            }}
                          >
                            ✓
                          </Box>
                          <Typography variant="body2" fontWeight={500}>
                            {feature.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                  <Box sx={{ p: 2, pt: 0 }}>
                    {(() => {
                      const isPlanCurrent = isCurrentPlan(plan)
                      console.log(`[HomePage RENDER] Plan: ${plan.name}, isCurrentPlan: ${isPlanCurrent}, user: ${!!user}`)
                      return (
                        <>
                          {isPlanCurrent && (
                            <Box sx={{ mb: 1, textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                                ✓ Tu plan actual
                              </Typography>
                            </Box>
                          )}
                          <Button
                            fullWidth
                            variant={plan.name === 'pro' ? 'contained' : 'outlined'}
                            size="large"
                            onClick={() => handlePlanSelect(plan.name)}
                            disabled={isPlanCurrent}
                            sx={{ 
                              py: 1.5, 
                              fontWeight: 600,
                              textTransform: 'none',
                              fontSize: { xs: '0.9rem', sm: '1rem' }
                            }}
                          >
                            {isPlanCurrent
                              ? 'Plan Actual' 
                              : plan.name === 'free' 
                              ? 'Comenzar Gratis' 
                              : 'Contratar'}
                          </Button>
                        </>
                      )
                    })()}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Steps Section - Mejorado */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            gutterBottom
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            Cotiza en 4 Pasos Simples
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}
          >
            Desde subir tu lista hasta obtener los mejores precios
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {[
            {
              step: '1',
              title: 'Elige las tiendas',
              description: 'Selecciona en qué tiendas quieres cotizar',
            },
            {
              step: '2',
              title: 'Sube tu lista',
              description: 'PDF, DOCX o Excel con tus útiles',
            },
            {
              step: '3',
              title: 'Revisa y ajusta',
              description: 'Verifica productos y cantidades',
            },
            {
              step: '4',
              title: 'Obtén resultados',
              description: 'Compara precios y ahorra dinero',
            },
          ].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.step}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 700,
                    mx: 'auto',
                    mb: 2,
                    boxShadow: 3
                  }}
                >
                  {item.step}
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
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

      {/* Footer CTA - Mejorado */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: { xs: 6, md: 8 },
          backgroundImage: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography 
            variant="h4" 
            fontWeight={700} 
            gutterBottom
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            ¿Listo para ahorrar?
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ mb: 4, opacity: 0.95, fontSize: { xs: '1rem', sm: '1.1rem' } }}
          >
            Empieza ahora y encuentra los mejores precios en minutos
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={onTrialClick}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                px: { xs: 2, sm: 4 },
                py: 1.5,
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
                px: { xs: 2, sm: 4 },
                py: 1.5,
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
    </Box>
  )
}
