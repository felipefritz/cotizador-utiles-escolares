import { useCallback, useEffect, useMemo, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Box, Container, Paper, Stepper, Step, StepLabel, Typography, CircularProgress, Button, Avatar } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import HomeIcon from '@mui/icons-material/Home'
import DashboardIcon from '@mui/icons-material/Dashboard'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { ContactPage } from './pages/Contact'
import { DemoQuoteModal } from './components/DemoQuoteModal'
import { WhatsAppButton } from './components/WhatsAppButton'
import { ProviderSuggestionForm } from './components/ProviderSuggestionForm'
import { UploadStep } from './steps/UploadStep'
import { ItemsStep } from './steps/ItemsStep'
import { SourcesStep } from './steps/SourcesStep'
import { QuoteStep } from './steps/QuoteStep'
import { useAuth } from './contexts/AuthContext'
import type { ParsedItem } from './api'
import type { AreaId, ItemQuote, SelectedItem, SourceId } from './types'

const STEPS = ['Área y fuentes', 'Producto o lista', 'Seleccionar productos', 'Cotización']

function buildSelectedItems(items: ParsedItem[]): SelectedItem[] {
  return (items || []).map((item) => ({
    item,
    selected: item.tipo !== 'lectura' && !!item.detalle,
    quantity: Math.max(1, item.cantidad ?? 1),
  }))
}

function MainApp() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [showHome, setShowHome] = useState(() => new URLSearchParams(location.search).get('cotizar') !== '1')
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [showSuggestionForm, setShowSuggestionForm] = useState(false)
  const [step, setStep] = useState(0)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [area, setArea] = useState<AreaId>('general')
  const [sources, setSources] = useState<SourceId[]>(['dimeiggs'])

  // `?cotizar=1` puede llegar en cualquier navegación (por ejemplo desde "Nueva
  // Cotización" en el dashboard), no solo al montar. Leerlo únicamente en el
  // estado inicial dejaba el landing puesto cuando el componente ya estaba
  // montado o cuando la URL no cambiaba. Se depende de `location.key` para
  // reaccionar incluso al navegar a la misma URL.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('cotizar') !== '1') return
    setShowHome(false)
    // Se consume el parámetro: si queda pegado, la URL dice "cotizar" mientras
    // el usuario ya volvió al inicio, y ambos estados se desincronizan.
    navigate('/', { replace: true })
  }, [location.key, location.search, navigate])

  const onItemsParsed = useCallback((items: ParsedItem[]) => {
    setSelectedItems(buildSelectedItems(items))
    setStep(2)
  }, [])

  const resultsForQuoteStep: ItemQuote[] = useMemo(() => {
    return selectedItems
      .filter((i) => i.selected)
      .map((i) => ({
        item: i.item,
        quantity: i.quantity,
      }))
  }, [selectedItems])

  const goBack = useCallback(() => setStep((s) => Math.max(0, s - 1)), [])
  const goNext = useCallback(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), [])

  const onReset = useCallback(() => {
    setShowHome(true)
    setStep(0)
    setSelectedItems([])
    setArea('general')
    setSources(['dimeiggs'])
  }, [])

  const handleTrialClick = useCallback(() => {
    setShowDemoModal(true)
  }, [])

  const handleLoginClick = useCallback(() => {
    navigate('/login')
  }, [navigate])

  const handleUpgradeFromDemo = useCallback(() => {
    setShowDemoModal(false)
    navigate('/login')
  }, [navigate])

  const handleStartApp = useCallback(() => {
    setShowHome(false)
    setStep(0)
  }, [])

  if (showHome) {
    return (
      <>
        {user && (
          <Box
            sx={{
              position: 'fixed',
              top: 16,
              right: 16,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              bgcolor: 'background.paper',
              p: 1.5,
              borderRadius: 2,
              boxShadow: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar src={user?.avatar_url || undefined} sx={{ width: 32, height: 32 }}>
                {user?.name?.[0] || user?.email[0]}
              </Avatar>
              <Typography variant="body2">{user?.name || user?.email}</Typography>
            </Box>
            <Button
              size="small"
              startIcon={<LogoutIcon />}
              onClick={logout}
              variant="outlined"
            >
              Salir
            </Button>
          </Box>
        )}
        <HomePage 
          onTrialClick={handleTrialClick}
          onLoginClick={handleLoginClick}
          onStartClick={handleStartApp}
          onSuggestProvider={() => setShowSuggestionForm(true)}
        />
        <DemoQuoteModal
          open={showDemoModal}
          onClose={() => setShowDemoModal(false)}
          onUpgradeClick={handleUpgradeFromDemo}
        />
        <ProviderSuggestionForm
          open={showSuggestionForm}
          onClose={() => setShowSuggestionForm(false)}
          onSuccess={() => setShowSuggestionForm(false)}
        />
      </>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
            mb: 3,
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800} color="text.primary">
              Nueva cotización
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sube una lista o agrega productos manualmente, elige fuentes y compara precios.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Button
              size="small"
              startIcon={<HomeIcon />}
              onClick={() => setShowHome(true)}
              variant="outlined"
            >
              Inicio
            </Button>
            <Button
              size="small"
              startIcon={<DashboardIcon />}
              onClick={() => navigate('/dashboard')}
              variant="outlined"
            >
              Mi Cuenta
            </Button>
            <Avatar src={user?.avatar_url || undefined} sx={{ width: 32, height: 32 }}>
              {user?.name?.[0] || user?.email[0]}
            </Avatar>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>{user?.name || user?.email}</Typography>
            <Button
              size="small"
              startIcon={<LogoutIcon />}
              onClick={logout}
              variant="outlined"
            >
              Salir
            </Button>
          </Box>
        </Box>
        <Stepper activeStep={step} sx={{ mb: 3, px: { xs: 0, md: 2 } }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, md: 4 },
            minHeight: 420,
            borderRadius: 2,
            boxShadow: '0 18px 50px rgba(15, 23, 42, 0.06)',
          }}
        >
          {step === 0 && (
            <SourcesStep
              selected={sources}
              onSelectionChange={setSources}
              area={area}
              onAreaChange={setArea}
              onNext={goNext}
              hideBack
            />
          )}
          {step === 1 && <UploadStep onItemsParsed={onItemsParsed} sources={sources} onBack={goBack} />}
          {step === 2 && (
            <ItemsStep
              items={selectedItems}
              onItemsChange={setSelectedItems}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 3 && (
            <QuoteStep
              results={resultsForQuoteStep}
              onReset={onReset}
              sources={sources}
              area={area}
              onEditSelection={() => setStep(2)}
            />
          )}
        </Paper>
      </Container>
    </Box>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/*"
        element={
          <>
            <Navbar />
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/admin" element={user?.is_admin ? <AdminDashboard /> : <Navigate to="/" />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/" element={<MainApp />} />
            </Routes>
            <WhatsAppButton />
          </>
        }
      />
    </Routes>
  )
}
