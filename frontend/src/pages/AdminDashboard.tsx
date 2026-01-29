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
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
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
}

interface Analytics {
  total_users: number
  total_visits: number
  active_subscriptions: number
  total_revenue: number
}

export const AdminDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  // Plans state
  const [plans, setPlans] = useState<Plan[]>([])
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  
  // Users state
  const [users, setUsers] = useState<User[]>([])
  
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
        const res = await api.get('/admin/plans')
        setPlans(res.data)
      } else if (tabValue === 1) {
        // Load users
        const res = await api.get('/admin/users')
        setUsers(res.data)
      } else if (tabValue === 2) {
        // Load analytics
        const res = await api.get('/admin/analytics')
        setAnalytics(res.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar datos')
    } finally {
      setLoading(false)
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

  if (loading && !plans.length && !users.length && !analytics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        🔐 Admin Dashboard
      </Typography>

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

      <Paper elevation={2} sx={{ borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
          }}
        >
          <Tab label="Planes" sx={{ fontWeight: 600 }} />
          <Tab label="Usuarios" sx={{ fontWeight: 600 }} />
          <Tab label="Analítica" sx={{ fontWeight: 600 }} />
        </Tabs>

        {/* Tab 1: Plans Management */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {plans.map((plan) => (
              <Grid item xs={12} sm={6} md={4} key={plan.id}>
                <Card>
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

        {/* Tab 2: Users Management */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'background.paper' : 'grey.100' }}>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Nombre</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Proveedor</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Admin</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Activo</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Fecha Registro</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell sx={{ color: 'text.primary' }}>{user.email}</TableCell>
                    <TableCell sx={{ color: 'text.primary' }}>{user.name || '—'}</TableCell>
                    <TableCell sx={{ color: 'text.primary' }}>{user.provider}</TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <Chip label="Admin" size="small" color="primary" variant="filled" />
                      ) : (
                        <Chip label="Usuario" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Chip label="Activo" size="small" color="success" variant="filled" />
                      ) : (
                        <Chip label="Inactivo" size="small" color="error" variant="filled" />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary' }}>
                      {new Date(user.created_at).toLocaleDateString('es-CL')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 3: Analytics */}
        <TabPanel value={tabValue} index={2}>
          {analytics && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
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
    </Container>
  )
}
