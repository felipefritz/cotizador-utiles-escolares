import { Box, Button, Card, CardContent, Chip, Container, Divider, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import ConstructionIcon from '@mui/icons-material/Construction'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DevicesOtherIcon from '@mui/icons-material/DevicesOther'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import SaveIcon from '@mui/icons-material/Save'
import SearchIcon from '@mui/icons-material/Search'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import SpeedIcon from '@mui/icons-material/Speed'
import StorefrontIcon from '@mui/icons-material/Storefront'
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

const SOURCES = [
  { name: 'MercadoLibre', group: 'Marketplace', status: 'Activo' },
  { name: 'SoloTodo', group: 'Comparador tech', status: 'Web' },
  { name: 'Sodimac', group: 'Construcción', status: 'Web' },
  { name: 'Falabella', group: 'Retail', status: 'Web' },
  { name: 'Ripley', group: 'Retail', status: 'Web' },
  { name: 'PC Factory', group: 'Tecnología', status: 'Web' },
  { name: 'Paris', group: 'Retail', status: 'Web' },
  { name: 'Lider', group: 'Supermercado', status: 'Web' },
  { name: 'Jumbo', group: 'Supermercado', status: 'Web' },
  { name: 'Dimeiggs', group: 'Papelería', status: 'Activo' },
  { name: 'Librería Nacional', group: 'Educación', status: 'Activo' },
  { name: 'Jamila', group: 'Oficina', status: 'Activo' },
  { name: 'Búsqueda web', group: 'General', status: 'API' },
]

const USE_CASES = [
  {
    icon: <BusinessCenterIcon />,
    title: 'Oficinas y pymes',
    description: 'Papelería, aseo, tecnología, cafetería e insumos recurrentes.',
  },
  {
    icon: <ConstructionIcon />,
    title: 'Construcción y hogar',
    description: 'Herramientas, materiales, fijaciones, pintura y proyectos menores.',
  },
  {
    icon: <DevicesOtherIcon />,
    title: 'Tecnología',
    description: 'Periféricos, notebooks, cables, repuestos y accesorios.',
  },
  {
    icon: <Inventory2Icon />,
    title: 'Listas masivas',
    description: 'Carga archivos, corrige cantidades y compara por fuente.',
  },
]

const FEATURES = [
  {
    icon: <AutoAwesomeIcon />,
    title: 'Extracción con IA',
    description: 'Lee PDFs, Excel, Word, imágenes o texto manual y convierte todo en items cotizables.',
  },
  {
    icon: <CompareArrowsIcon />,
    title: 'Multi-fuente',
    description: 'Mezcla APIs, scrapers propios y búsqueda web para cubrir más rubros sin bloquear el flujo.',
  },
  {
    icon: <TrendingUpIcon />,
    title: 'Decisión comercial',
    description: 'Muestra coincidencia, precio, fuente, pendientes y total estimado por proveedor.',
  },
  {
    icon: <SaveIcon />,
    title: 'Historial y recompra',
    description: 'Guarda cotizaciones y prepara compras recurrentes para usuarios individuales o empresas.',
  },
]

const PREVIEW_ITEMS = [
  { name: 'Taladro percutor 13mm', source: 'Sodimac', price: '$39.990', match: 86 },
  { name: 'Resma carta 500 hojas', source: 'Dimeiggs', price: '$4.290', match: 94 },
  { name: 'Monitor 27 pulgadas IPS', source: 'SoloTodo', price: '$129.990', match: 88 },
]

export function HomePage({ onTrialClick, onLoginClick, onStartClick, onSuggestProvider }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<any[]>([])
  const [currentUserPlan, setCurrentUserPlan] = useState<string | null>(null)
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null)
  const [plansEnabled, setPlansEnabled] = useState(true)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/settings/public')
        setPlansEnabled(!!res.data?.plans_enabled)
      } catch (error) {
        console.error('Error loading public settings:', error)
        setPlansEnabled(true)
      } finally {
        setSettingsLoaded(true)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (!settingsLoaded) return

    if (plansEnabled) {
      loadPlans()
      if (user) {
        loadUserCurrentPlan()
      } else {
        setCurrentUserPlan(null)
        setCurrentPlanId(null)
      }
    } else {
      setPlans([])
      setCurrentUserPlan(null)
      setCurrentPlanId(null)
    }
  }, [user, plansEnabled, settingsLoaded])

  const loadUserCurrentPlan = async () => {
    try {
      const res = await api.get('/user/subscription')
      setCurrentUserPlan(res.data.plan_name?.toLowerCase() || 'free')
      setCurrentPlanId(res.data.plan_id || null)
    } catch (error) {
      console.error('Error loading user plan:', error)
      setCurrentUserPlan('free')
      setCurrentPlanId(null)
    }
  }

  const loadPlans = async () => {
    if (!plansEnabled) return
    try {
      const res = await api.get('/plans')
      setPlans(res.data)
    } catch (error) {
      console.error('Error loading plans:', error)
    }
  }

  const handlePlanSelect = (planName: string) => {
    if (!plansEnabled) {
      onStartClick()
      return
    }
    if (planName === 'free') {
      if (user) onStartClick()
      else onTrialClick()
    } else if (user) {
      navigate(`/dashboard?selectPlan=${planName}`)
    } else {
      navigate(`/login?redirect=dashboard&selectPlan=${planName}`)
    }
  }

  const isCurrentPlan = (plan: any) => {
    if (!user) return false
    if (currentPlanId && plan.id === currentPlanId) return true
    return currentUserPlan === plan.name.toLowerCase()
  }

  const primaryCtaLabel = 'Cotizar ahora'

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F6F8FB' }}>
      <Box sx={{ bgcolor: '#0B1220', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <Grid container spacing={5} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="PrecioFast" sx={{ bgcolor: 'rgba(45, 212, 191, 0.14)', color: '#5EEAD4', fontWeight: 700 }} />
                  <Chip label="Para listas y productos sueltos" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
                </Stack>

                <Box>
                  <Typography
                    variant="h1"
                    fontWeight={800}
                    sx={{
                      fontSize: { xs: '2.5rem', md: '4.35rem' },
                      lineHeight: 1.02,
                      mb: 2,
                    }}
                  >
                    Cotiza cualquier compra en minutos
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'rgba(255,255,255,0.76)',
                      lineHeight: 1.65,
                      maxWidth: 620,
                      fontWeight: 400,
                    }}
                  >
                    Sube una lista, fotografía un pedido o escribe un producto. PrecioFast extrae los items, compara fuentes y te muestra dónde conviene comprar.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={onStartClick}
                    startIcon={<RocketLaunchIcon />}
                    sx={{
                      bgcolor: '#14B8A6',
                      color: '#031617',
                      py: 1.45,
                      px: 3,
                      '&:hover': { bgcolor: '#2DD4BF' },
                    }}
                  >
                    {primaryCtaLabel}
                  </Button>
                  {user ? (
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => navigate('/dashboard')}
                      startIcon={<DashboardIcon />}
                      sx={{ borderColor: 'rgba(255,255,255,0.28)', color: 'white', py: 1.45, px: 3 }}
                    >
                      Mi cuenta
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={onLoginClick}
                      sx={{ borderColor: 'rgba(255,255,255,0.28)', color: 'white', py: 1.45, px: 3 }}
                    >
                      Crear cuenta
                    </Button>
                  )}
                </Stack>

                <Grid container spacing={2} sx={{ pt: 1 }}>
                  {[
                    ['12+', 'fuentes listas'],
                    ['4', 'rubros base'],
                    ['IA', 'extracción asistida'],
                  ].map(([value, label]) => (
                    <Grid item xs={4} key={label}>
                      <Typography variant="h5" fontWeight={800}>{value}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.62)' }}>{label}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.96)',
                  borderColor: 'rgba(255,255,255,0.16)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: '0 24px 70px rgba(0,0,0,0.30)',
                }}
              >
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Cotización en curso</Typography>
                    <Typography variant="h6" color="text.primary" fontWeight={800}>Compra oficina y mantención</Typography>
                  </Box>
                  <Chip label="3 fuentes" color="success" variant="outlined" />
                </Box>

                <Box sx={{ p: 2.5 }}>
                  <Stack spacing={1.5}>
                    {PREVIEW_ITEMS.map((item) => (
                      <Box
                        key={item.name}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 1.5,
                          bgcolor: '#fff',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary">{item.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.source}</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={800} color="primary.main">{item.price}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={item.match}
                            sx={{ flex: 1, height: 6, borderRadius: 1, bgcolor: '#E5E7EB', '& .MuiLinearProgress-bar': { bgcolor: '#14B8A6' } }}
                          />
                          <Typography variant="caption" color="text.secondary">{item.match}%</Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>

                  <Divider sx={{ my: 2.5 }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Subtotal estimado</Typography>
                    <Typography variant="h5" fontWeight={800} color="text.primary">$53.270</Typography>
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ bgcolor: '#FFFFFF', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>Rubros:</Typography>
            {['Oficina', 'Ferretería', 'Tecnología', 'Aseo', 'Supermercado', 'Educación', 'Hogar', 'Mascotas'].map((label) => (
              <Chip key={label} label={label} variant="outlined" size="small" />
            ))}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Grid container spacing={2.5}>
          {USE_CASES.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.title}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 1, boxShadow: 'none' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ color: '#0F766E', mb: 1.5 }}>{item.icon}</Box>
                  <Typography variant="h6" fontWeight={800} gutterBottom>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ bgcolor: '#EEF2F6', py: { xs: 6, md: 9 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={5} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography variant="overline" color="primary" fontWeight={800}>Fuentes conectables</Typography>
              <Typography variant="h3" fontWeight={850} sx={{ mt: 1, mb: 2, fontSize: { xs: '2rem', md: '2.7rem' } }}>
                Marketplace, comparadores, retail, construcción, tecnología y búsqueda web
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                MercadoLibre queda activo como marketplace general. SoloTodo funciona como referencia tipo comparador para productos individuales de tecnología. Sodimac, Falabella, Ripley, PC Factory, Paris, Lider y Jumbo se habilitan mediante SerpAPI para evitar scrapers frágiles cuando no hay API oficial estable.
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
                <Chip icon={<CheckCircleOutlineIcon />} label="MercadoLibre activo" color="success" variant="outlined" />
                <Chip icon={<SearchIcon />} label="SoloTodo para producto individual" variant="outlined" />
                <Chip icon={<SearchIcon />} label="Retail web con SerpAPI" variant="outlined" />
              </Stack>
            </Grid>

            <Grid item xs={12} md={7}>
              <Grid container spacing={1.5}>
                {SOURCES.map((source) => (
                  <Grid item xs={6} sm={4} key={source.name}>
                    <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1, height: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <StorefrontIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography variant="subtitle2" fontWeight={800} noWrap>{source.name}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{source.group}</Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip label={source.status} size="small" sx={{ height: 22 }} />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Stack spacing={1} sx={{ mb: 4 }}>
          <Typography variant="overline" color="primary" fontWeight={800}>Sistema completo</Typography>
          <Typography variant="h3" fontWeight={850} sx={{ fontSize: { xs: '2rem', md: '2.7rem' } }}>
            Diseñado para vender cotizaciones, no solo mostrar resultados
          </Typography>
        </Stack>
        <Grid container spacing={2.5}>
          {FEATURES.map((feature) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 1, boxShadow: 'none' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ color: '#0F766E', mb: 1.5 }}>{feature.icon}</Box>
                  <Typography variant="h6" fontWeight={800} gutterBottom>{feature.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{feature.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ bgcolor: '#FFFFFF', borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <Grid container spacing={4}>
            {[
              { icon: <ReceiptLongIcon />, title: '1. Sube o escribe', text: 'Archivo, foto, Excel o producto individual.' },
              { icon: <AutoAwesomeIcon />, title: '2. IA ordena', text: 'Detecta cantidades, detalles y posibles categorías.' },
              { icon: <ShoppingCartIcon />, title: '3. Cotiza fuentes', text: 'Consulta APIs, tiendas propias y búsqueda web.' },
              { icon: <LocalShippingIcon />, title: '4. Decide compra', text: 'Compara total, pendientes y mejor coincidencia.' },
            ].map((step) => (
              <Grid item xs={12} sm={6} md={3} key={step.title}>
                <Stack spacing={1.25}>
                  <Box sx={{ color: 'primary.main' }}>{step.icon}</Box>
                  <Typography variant="h6" fontWeight={800}>{step.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{step.text}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {plansEnabled && (
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography variant="overline" color="primary" fontWeight={800}>Planes</Typography>
            <Typography variant="h3" fontWeight={850} sx={{ fontSize: { xs: '2rem', md: '2.7rem' } }}>
              Monetiza por volumen y fuentes
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Ideal para usuarios puntuales, pymes y equipos con compras recurrentes.
            </Typography>
          </Box>

          <Grid container spacing={2.5} justifyContent="center">
            {plans.map((plan) => {
              const current = isCurrentPlan(plan)
              const highlighted = plan.name === 'pro'
              return (
                <Grid item xs={12} sm={6} md={4} key={plan.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      borderRadius: 1,
                      borderColor: highlighted ? 'primary.main' : 'divider',
                      boxShadow: highlighted ? '0 18px 45px rgba(37, 99, 235, 0.16)' : 'none',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight={850} sx={{ textTransform: 'uppercase' }}>{plan.name}</Typography>
                        {highlighted && <Chip label="Popular" color="primary" size="small" />}
                      </Stack>
                      <Typography variant="h3" color="primary" fontWeight={850} sx={{ mb: 2 }}>
                        {plan.price === 0 ? 'Gratis' : `$${(plan.price / 1000).toFixed(0)}K`}
                      </Typography>
                      <Stack spacing={1.2} sx={{ mb: 3 }}>
                        {[
                          plan.max_items ? `Hasta ${plan.max_items} items` : 'Items ilimitados',
                          plan.max_providers ? `${plan.max_providers} fuentes` : 'Fuentes ilimitadas',
                          plan.monthly_limit ? `${plan.monthly_limit} cotizaciones/mes` : 'Cotizaciones ilimitadas',
                        ].map((label) => (
                          <Stack direction="row" spacing={1} alignItems="center" key={label}>
                            <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                            <Typography variant="body2">{label}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                      <Button
                        fullWidth
                        variant={highlighted ? 'contained' : 'outlined'}
                        size="large"
                        onClick={() => handlePlanSelect(plan.name)}
                        disabled={current}
                      >
                        {current ? 'Plan actual' : plan.name === 'free' ? 'Comenzar gratis' : 'Contratar'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Container>
      )}

      <Box sx={{ bgcolor: '#0B1220', color: 'white' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h3" fontWeight={850} sx={{ fontSize: { xs: '2rem', md: '2.6rem' } }}>
                Empieza con una lista real y descubre qué rubro conviene atacar primero.
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', mt: 1.5 }}>
                El sistema ya está preparado para crecer por fuentes, categorías y planes.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1.5}>
                <Button variant="contained" size="large" onClick={onStartClick} startIcon={<SpeedIcon />}>
                  Cotizar ahora
                </Button>
                {user && (
                  <Button variant="outlined" size="large" startIcon={<LightbulbIcon />} onClick={onSuggestProvider} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.28)' }}>
                    Sugerir fuente
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  )
}
