import { useCallback, useMemo, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Box, Container, Paper, Stepper, Step, StepLabel, Typography, CircularProgress, Button, Avatar } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import HomeIcon from '@mui/icons-material/Home'
import DashboardIcon from '@mui/icons-material/Dashboard'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { DashboardPage } from './pages/DashboardPage'
import { ContactPage } from './pages/Contact'
import { DemoQuoteModal } from './components/DemoQuoteModal'
import { WhatsAppButton } from './components/WhatsAppButton'
import { UploadStep } from './steps/UploadStep'
import { ItemsStep } from './steps/ItemsStep'
import { SourcesStep } from './steps/SourcesStep'
import { QuoteStep } from './steps/QuoteStep'
import { useAuth } from './contexts/AuthContext'
import type { ParsedItem } from './api'
import type { ItemQuote, SelectedItem, SourceId } from './types'

const STEPS = ['Elegir tiendas', 'Subir lista', 'Seleccionar útiles', 'Cotización']

function buildSelectedItems(items: ParsedItem[]): SelectedItem[] {
  return (items || []).map((item) => ({
    item,
    selected: item.tipo !== 'lectura' && !!item.detalle,
    quantity: Math.max(1, item.cantidad ?? 1),
  }))
}

function MainApp() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showHome, setShowHome] = useState(true)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [step, setStep] = useState(0)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [sources, setSources] = useState<SourceId[]>([
    'dimeiggs',
    'libreria_nacional',
    'jamila',
    'coloranimal',
    'pronobel',
    'prisa',
    'lasecretaria',
  ])

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
    setSources([
      'dimeiggs',
      'libreria_nacional',
      'jamila',
      'coloranimal',
      'pronobel',
      'prisa',
      'lasecretaria',
    ])
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
        />
        <DemoQuoteModal
          open={showDemoModal}
          onClose={() => setShowDemoModal(false)}
          onUpgradeClick={handleUpgradeFromDemo}
        />
      </>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" fontWeight={700} color="primary">
            Cotizador de Útiles Escolares
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <Typography variant="body2">{user?.name || user?.email}</Typography>
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
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Sube tu lista, elige qué cotizar y en qué tiendas.
        </Typography>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper variant="outlined" sx={{ p: 4, minHeight: 360 }}>
          {step === 0 && (
            <SourcesStep
              selected={sources}
              onSelectionChange={setSources}
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
