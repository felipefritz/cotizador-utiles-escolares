import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import MenuIcon from '@mui/icons-material/Menu'
import { api } from '../api'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 1, sm: 3 } }}>{children}</Box>}
    </div>
  )
}

interface Plan {
  id: number
  name: string
  price: number
  billing_cycle: string
  max_items: number
  max_providers: number
  monthly_limit: number | null
}

interface User {
  id: number
  email: string
  name: string | null
  provider: string
  is_admin: boolean
  created_at: string
  is_active: boolean
  current_plan?: string
}

interface ProviderSuggestion {
  id: number
  user_id: number
  provider_name: string
  description: string
  website_url: string | null
  email_contact: string | null
  status: string
  admin_notes: string | null
  created_at: string
  updated_at: string
}

interface Analytics {
  total_users: number
  total_visits: number
  active_subscriptions: number
  total_revenue: number
}

export const AdminDashboard: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [plansEnabled, setPlansEnabled] = useState(true)
  const [plansSettingsLoading, setPlansSettingsLoading] = useState(false)
  
  // Plans state
  const [plans, setPlans] = useState<Plan[]>([])
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  
  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserForPlan, setSelectedUserForPlan] = useState<User | null>(null)
  const [changePlanDialog, setChangePlanDialog] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<ProviderSuggestion[]>([])
  const [editingSuggestion, setEditingSuggestion] = useState<ProviderSuggestion | null>(null)
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false)
  const [suggestionStatus, setSuggestionStatus] = useState('')
  const [suggestionNotes, setSuggestionNotes] = useState('')
  
  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  useEffect(() => {
    loadData()
  }, [tabValue])

  const loadData = async () => {
    setLoading(true)
    setError('')
    
    try {
      if (tabValue === 0) {
        // Load plans
        setPlansSettingsLoading(true)
        const settingsRes = await api.get('/admin/settings/plans')
        setPlansEnabled(!!settingsRes.data?.plans_enabled)
        setPlansSettingsLoading(false)
        const res = await api.get('/admin/plans')
        setPlans(res.data)
      } else if (tabValue === 1) {
        // Load users
        const res = await api.get('/admin/users')
        setUsers(res.data)
      } else if (tabValue === 2) {
        // Load suggestions
        const res = await api.get('/suggestions/admin/all')
        setSuggestions(res.data)
      } else if (tabValue === 3) {
        // Load analytics
        const res = await api.get('/admin/analytics')
        setAnalytics(res.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar datos')
    } finally {
      setPlansSettingsLoading(false)
      setLoading(false)
    }
  }

  const handleTogglePlans = async (enabled: boolean) => {
    setPlansSettingsLoading(true)
    setError('')
    try {
      const res = await api.put('/admin/settings/plans', { plans_enabled: enabled })
      setPlansEnabled(!!res.data?.plans_enabled)
      setMessage(enabled ? 'Planes activados' : 'Planes desactivados')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al actualizar configuración')
    } finally {
      setPlansSettingsLoading(false)
    }
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan)
    setPlanDialogOpen(true)
  }

  const handleSavePlan = async () => {
    if (!editingPlan) return

    try {
      await api.put(`/admin/plans/${editingPlan.id}`, {
        price: editingPlan.price,
        max_items: editingPlan.max_items,
        max_providers: editingPlan.max_providers,
        monthly_limit: editingPlan.monthly_limit,
      })
      setMessage('Plan actualizado correctamente')
      setPlanDialogOpen(false)
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al actualizar plan')
    }
  }

  const handleChangeUserPlan = async () => {
    if (!selectedUserForPlan || !selectedPlanId) {
      setError('Por favor selecciona un plan')
      return
    }

    try {
      await api.put(`/admin/users/${selectedUserForPlan.id}/plan`, {
        plan_id: selectedPlanId,
      })
      setMessage(`Plan de ${selectedUserForPlan.email} actualizado exitosamente`)
      setChangePlanDialog(false)
      setSelectedUserForPlan(null)
      setSelectedPlanId(null)
      
      // Recargar datos con delay para asegurar que el backend procesó el cambio
      setTimeout(() => {
        loadData()
      }, 500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cambiar plan')
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('¿Eliminar este usuario?')) return

    try {
      await api.delete(`/admin/users/${userId}`)
      setMessage('Usuario eliminado')
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar usuario')
    }
  }

  const handleEditSuggestion = (suggestion: ProviderSuggestion) => {
    setEditingSuggestion(suggestion)
    setSuggestionStatus(suggestion.status)
    setSuggestionNotes(suggestion.admin_notes || '')
    setSuggestionDialogOpen(true)
  }

  const handleSaveSuggestion = async () => {
    if (!editingSuggestion) return

    try {
      await api.put(`/suggestions/${editingSuggestion.id}`, {
        status: suggestionStatus,
        admin_notes: suggestionNotes,
      })
      setMessage('Sugerencia actualizada correctamente')
      setSuggestionDialogOpen(false)
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al actualizar sugerencia')
    }
  }

  const tabsContent = (
    <>
      <Tabs
        value={tabValue}
        onChange={(_, v) => {
          setTabValue(v)
          if (isMobile) setDrawerOpen(false)
        }}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          px: { xs: 1, sm: 2 },
          overflowX: 'auto',
        }}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons={isMobile ? 'auto' : false}
      >
        <Tab label="Planes" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '1rem' } }} />
        <Tab label="Usuarios" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '1rem' } }} />
        <Tab label="Sugerencias" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '1rem' } }} />
        <Tab label="Analítica" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '1rem' } }} />
      </Tabs>

      {/* Tab 0: Plans Management */}
      <TabPanel value={tabValue} index={0}>
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Planes visibles
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Activa o desactiva todas las secciones de planes y limites.
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={plansEnabled}
                  onChange={(e) => handleTogglePlans(e.target.checked)}
                  disabled={plansSettingsLoading}
                />
              }
              label={plansEnabled ? 'Activado' : 'Desactivado'}
            />
          </Box>
        </Paper>
        <Grid container spacing={2}>
          {plans.map((plan) => (
            <Grid item xs={12} sm={6} lg={4} key={plan.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h5" fontWeight={700} gutterBottom>
                    {plan.name.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    ${plan.price.toLocaleString('es-CL')} {plan.billing_cycle}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Max Items: <strong>{plan.max_items}</strong>
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Max Providers: <strong>{plan.max_providers}</strong>
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Monthly Limit: <strong>{plan.monthly_limit || 'Ilimitado'}</strong>
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditPlan(plan)}
                    fullWidth
                  >
                    Editar
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Tab 1: Users Management */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ overflowX: 'auto' }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead>
                <TableRow sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'background.paper' : 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>Plan Actual</TableCell>
                  <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Admin</TableCell>
                  <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Activo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{user.name || '—'}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Chip 
                        label={user.current_plan ? user.current_plan.toUpperCase() : 'SIN PLAN'} 
                        size="small" 
                        color={user.current_plan === 'pro' ? 'primary' : user.current_plan === 'plus' ? 'secondary' : 'default'}
                        variant="filled" 
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {user.is_admin ? (
                        <Chip label="Sí" size="small" color="primary" variant="filled" />
                      ) : (
                        <Chip label="No" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {user.is_active ? (
                        <Chip label="Activo" size="small" color="success" variant="filled" />
                      ) : (
                        <Chip label="Inactivo" size="small" color="error" variant="filled" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedUserForPlan(user)
                            setSelectedPlanId(null)
                            setChangePlanDialog(true)
                          }}
                        >
                          Plan
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Eliminar
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </TabPanel>

      {/* Tab 2: Provider Suggestions */}
      <TabPanel value={tabValue} index={2}>
        {suggestions.length === 0 ? (
          <Alert severity="info">No hay sugerencias de proveedores</Alert>
        ) : (
          <Grid container spacing={2}>
            {suggestions.map((suggestion) => (
              <Grid item xs={12} md={6} key={suggestion.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {suggestion.provider_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Por: {suggestion.user_id}
                        </Typography>
                      </Box>
                      <Chip
                        label={suggestion.status}
                        color={
                          suggestion.status === 'completed'
                            ? 'success'
                            : suggestion.status === 'not_feasible'
                            ? 'error'
                            : 'warning'
                        }
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {suggestion.description}
                    </Typography>

                    {suggestion.website_url && (
                      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                        <strong>Sitio web:</strong> {suggestion.website_url}
                      </Typography>
                    )}

                    {suggestion.email_contact && (
                      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                        <strong>Email:</strong> {suggestion.email_contact}
                      </Typography>
                    )}

                    {suggestion.admin_notes && (
                      <Typography variant="caption" display="block" sx={{ mb: 1, color: 'primary.main' }}>
                        <strong>Notas admin:</strong> {suggestion.admin_notes}
                      </Typography>
                    )}

                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleEditSuggestion(suggestion)}
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      Gestionar
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 3: Analytics */}
      <TabPanel value={tabValue} index={3}>
        {analytics && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} lg={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="text.secondary" gutterBottom>
                    Total Usuarios
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {analytics.total_users}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="text.secondary" gutterBottom>
                    Suscripciones Activas
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 700 }}>
                    {analytics.active_subscriptions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="text.secondary" gutterBottom>
                    Total Visitas
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 700 }}>
                    {analytics.total_visits.toLocaleString('es-CL')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="text.secondary" gutterBottom>
                    Ingresos Totales
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 700 }}>
                    ${analytics.total_revenue.toLocaleString('es-CL')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>
    </>
  )

  if (loading && !plans.length && !users.length && !suggestions.length && !analytics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" fontWeight={600}>
          🔐 Admin Dashboard
        </Typography>
        {isMobile && (
          <IconButton onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {isMobile ? (
          <>
            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              <Box sx={{ width: 250, p: 2 }}>
                <Tabs
                  value={tabValue}
                  onChange={(_, v) => {
                    setTabValue(v)
                    setDrawerOpen(false)
                  }}
                  orientation="vertical"
                  variant="scrollable"
                  sx={{ borderRight: 1, borderColor: 'divider' }}
                >
                  <Tab label="Planes" sx={{ fontWeight: 600 }} />
                  <Tab label="Usuarios" sx={{ fontWeight: 600 }} />
                  <Tab label="Sugerencias" sx={{ fontWeight: 600 }} />
                  <Tab label="Analítica" sx={{ fontWeight: 600 }} />
                </Tabs>
              </Box>
            </Drawer>
            {tabsContent}
          </>
        ) : (
          tabsContent
        )}
      </Paper>

      {/* Edit Plan Dialog */}
      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Plan</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editingPlan && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {editingPlan.name.toUpperCase()}
              </Typography>
              <TextField
                label="Precio (CLP)"
                type="number"
                value={editingPlan.price}
                onChange={(e) =>
                  setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })
                }
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Max Items"
                type="number"
                value={editingPlan.max_items}
                onChange={(e) =>
                  setEditingPlan({ ...editingPlan, max_items: parseInt(e.target.value) })
                }
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Max Providers"
                type="number"
                value={editingPlan.max_providers}
                onChange={(e) =>
                  setEditingPlan({ ...editingPlan, max_providers: parseInt(e.target.value) })
                }
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Monthly Limit (dejar vacío para ilimitado)"
                type="number"
                value={editingPlan.monthly_limit || ''}
                onChange={(e) =>
                  setEditingPlan({
                    ...editingPlan,
                    monthly_limit: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                fullWidth
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSavePlan}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanDialog} onClose={() => setChangePlanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cambiar Plan de Usuario</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedUserForPlan && (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Usuario: <strong>{selectedUserForPlan.email}</strong>
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Selecciona un plan</InputLabel>
                <Select
                  value={selectedPlanId || ''}
                  onChange={(e: any) => setSelectedPlanId(parseInt(e.target.value))}
                  label="Selecciona un plan"
                >
                  {plans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price.toLocaleString('es-CL')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePlanDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleChangeUserPlan}
            disabled={!selectedPlanId}
          >
            Cambiar Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Suggestion Dialog */}
      <Dialog open={suggestionDialogOpen} onClose={() => setSuggestionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gestionar Sugerencia</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editingSuggestion && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <strong>Proveedor:</strong> {editingSuggestion.provider_name}
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={suggestionStatus}
                  onChange={(e) => setSuggestionStatus(e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="processing">Procesando</MenuItem>
                  <MenuItem value="completed">Completado</MenuItem>
                  <MenuItem value="not_feasible">No es factible</MenuItem>
                  <MenuItem value="rejected">Rechazado</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Notas (solo para admin)"
                value={suggestionNotes}
                onChange={(e) => setSuggestionNotes(e.target.value)}
                fullWidth
                multiline
                rows={4}
                placeholder="Agrega notas sobre esta sugerencia..."
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuggestionDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveSuggestion}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
