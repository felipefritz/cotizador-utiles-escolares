import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  Button,
  Dialog,
  TextField,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface Quote {
  id: number;
  title: string;
  raw_text: string;
  items_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

interface QuoteDetail extends Quote {
  items: any[];
  results: any;
  notes: string;
}

interface Subscription {
  plan_name: string;
  status: string;
  expires_at?: string;
  max_items: number;
  max_providers: number;
  monthly_limit?: number | null;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  billing_cycle: string;
  max_items: number;
  max_providers: number;
  monthly_limit: number | null;
}

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteDetail | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar cotizaciones
      const quotesRes = await api.get('/user/quotes');
      setQuotes(quotesRes.data);

      // Cargar suscripción
      const subRes = await api.get('/user/subscription');
      setSubscription(subRes.data);

      // Cargar planes
      const plansRes = await api.get('/plans');
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuote = async (quoteId: number) => {
    try {
      const res = await api.get(`/user/quotes/${quoteId}`);
      setSelectedQuote(res.data);
    } catch (error) {
      setMessage('Error al cargar la cotización');
      setMessageType('error');
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuoteId(quote.id);
    setEditTitle(quote.title);
    setEditNotes('');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingQuoteId) return;

    try {
      await api.put(`/user/quotes/${editingQuoteId}`, {
        title: editTitle,
        notes: editNotes,
      });
      setMessage('Cotización actualizada');
      setMessageType('success');
      setEditDialogOpen(false);
      loadData();
    } catch (error) {
      setMessage('Error al actualizar');
      setMessageType('error');
    }
  };

  const handleDeleteQuote = async (quoteId: number) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return;

    try {
      await api.delete(`/user/quotes/${quoteId}`);
      setMessage('Cotización eliminada');
      setMessageType('success');
      loadData();
    } catch (error) {
      setMessage('Error al eliminar');
      setMessageType('error');
    }
  };

  const handleToggleFavorite = async (quoteId: number, currentFav: boolean) => {
    try {
      await api.put(`/user/quotes/${quoteId}`, {
        is_favorite: !currentFav,
      });
      loadData();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleCheckout = async (planId: number) => {
    try {
      setMessage('');
      setMessageType('success');
      
      const res = await api.post('/payment/checkout', { plan_id: planId });
      
      if (!res.data || !res.data.checkout_url) {
        throw new Error('URL de pago no disponible');
      }
      
      // Redirigir a Mercado Pago
      window.location.href = res.data.checkout_url;
    } catch (error: any) {
      console.error('Error de checkout:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Error al iniciar pago';
      setMessage(errorMessage);
      setMessageType('error');
    }
  };

  const handleDownloadQuote = (quote: Quote) => {
    const content = JSON.stringify(quote, null, 2);
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
    );
    element.setAttribute('download', `${quote.title}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Mi Cuenta
        </Typography>
        {tabValue === 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="large"
            onClick={() => navigate('/')}
            sx={{ 
              px: 3,
              boxShadow: 2,
              '&:hover': { boxShadow: 4 }
            }}
          >
            Nueva Cotización
          </Button>
        )}
      </Box>

      {message && (
        <Alert severity={messageType} sx={{ mb: 3 }} onClose={() => setMessage('')}>
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
            px: 2
          }}
        >
          <Tab label="Mis Cotizaciones" sx={{ fontWeight: 600 }} />
          <Tab label="Planes" sx={{ fontWeight: 600 }} />
          <Tab label="Suscripción" sx={{ fontWeight: 600 }} />
        </Tabs>

        {/* TAB 1: Cotizaciones */}
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress size={50} />
            </Box>
          ) : quotes.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No tienes cotizaciones guardadas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                ¡Crea tu primera cotización para comparar precios!
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="large"
                onClick={() => navigate('/')}
              >
                Nueva Cotización
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell width="40px"></TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Título</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Items</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow 
                      key={quote.id}
                      sx={{ 
                        '&:hover': { bgcolor: 'grey.50' },
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleFavorite(quote.id, quote.is_favorite)}
                        >
                          {quote.is_favorite ? (
                            <StarIcon sx={{ color: 'warning.main' }} />
                          ) : (
                            <StarBorderIcon sx={{ color: 'grey.400' }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight={500}>
                          {quote.title}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={quote.items_count} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(quote.created_at).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            onClick={() => handleViewQuote(quote.id)}
                            title="Ver detalle"
                            color="primary"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEditQuote(quote)}
                            title="Editar"
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadQuote(quote)}
                            title="Descargar"
                            color="primary"
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteQuote(quote.id)}
                            title="Eliminar"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Dialog para editar */}
          <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Editar Cotización
              </Typography>
              <TextField
                fullWidth
                label="Título"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Notas"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                multiline
                rows={4}
                margin="normal"
              />
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={handleSaveEdit}>
                  Guardar
                </Button>
                <Button onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
              </Box>
            </Box>
          </Dialog>

          {/* Modal para ver detalle */}
          <Dialog open={!!selectedQuote} onClose={() => setSelectedQuote(null)} maxWidth="md" fullWidth>
            {selectedQuote && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">{selectedQuote.title}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ my: 1 }}>
                  {selectedQuote.items_count} items • Creada: {new Date(selectedQuote.created_at).toLocaleDateString()}
                </Typography>
                <Box sx={{ maxHeight: '400px', overflowY: 'auto', mt: 2 }}>
                  <Typography variant="subtitle2">Notas:</Typography>
                  <Typography variant="body2">{selectedQuote.notes || 'Sin notas'}</Typography>
                  
                  {selectedQuote.results && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Resultados:</Typography>
                      <pre style={{ overflow: 'auto', maxHeight: '300px' }}>
                        {JSON.stringify(selectedQuote.results, null, 2)}
                      </pre>
                    </Box>
                  )}
                </Box>
                <Button onClick={() => setSelectedQuote(null)} sx={{ mt: 2 }}>
                  Cerrar
                </Button>
              </Box>
            )}
          </Dialog>
        </TabPanel>

        {/* TAB 2: Planes */}
        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress size={50} />
            </Box>
          ) : (
            <Grid container spacing={4}>
              {plans.map((plan) => (
                <Grid item xs={12} sm={6} md={4} key={plan.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      borderRadius: 3,
                      boxShadow: plan.name === 'pro' ? 4 : 2,
                      border: plan.name === 'pro' ? 2 : 0,
                      borderColor: plan.name === 'pro' ? 'primary.main' : 'transparent',
                      position: 'relative',
                      transition: 'all 0.3s',
                      '&:hover': {
                        boxShadow: 6,
                        transform: 'translateY(-4px)'
                      }
                    }}
                  >
                    {plan.name === 'pro' && (
                      <Chip 
                        label="RECOMENDADO" 
                        color="primary" 
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: 16, 
                          right: 16,
                          fontWeight: 600
                        }}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ textTransform: 'uppercase' }}>
                        {plan.name?.toUpperCase() || 'PLAN'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                        <Typography variant="h3" color="primary" fontWeight={700}>
                          ${(plan.price / 1000).toFixed(0)}K
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ ml: 1 }}>
                          /{plan.billing_cycle === 'monthly' ? 'mes' : plan.billing_cycle}
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 3 }}>
                        {[
                          { 
                            label: plan.max_items ? `Hasta ${plan.max_items} items` : 'Items ilimitados',
                            available: true
                          },
                          { 
                            label: `${plan.max_providers} proveedores`,
                            available: true
                          },
                          { 
                            label: plan.monthly_limit ? `${plan.monthly_limit} cotizaciones/mes` : 'Cotizaciones ilimitadas',
                            available: true
                          }
                        ].map((feature, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                            <Box 
                              sx={{ 
                                width: 20, 
                                height: 20, 
                                borderRadius: '50%', 
                                bgcolor: 'success.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 1.5
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'white' }}>✓</Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={500}>
                              {feature.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                    <CardActions sx={{ p: 3, pt: 0 }}>
                      {plan.name === 'free' ? (
                        <Button
                          fullWidth
                          variant="outlined"
                          size="large"
                          disabled
                          sx={{ py: 1.5, fontWeight: 600 }}
                        >
                          Plan Actual
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          variant={plan.name === 'pro' ? 'contained' : 'outlined'}
                          size="large"
                          onClick={() => handleCheckout(plan.id)}
                          sx={{ 
                            py: 1.5, 
                            fontWeight: 600,
                            boxShadow: plan.name === 'pro' ? 2 : 0
                          }}
                        >
                          Contratar Ahora
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* TAB 3: Suscripción */}
        <TabPanel value={tabValue} index={2}>
          {subscription ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Plan Actual: <Chip label={subscription.plan_name?.toUpperCase() || 'FREE'} color="primary" />
                </Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Estado: {subscription.status}
                </Typography>
                {subscription.expires_at && (
                  <Typography variant="body1">
                    Expira: {new Date(subscription.expires_at).toLocaleDateString()}
                  </Typography>
                )}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2">Límites:</Typography>
                  <Typography variant="body2">
                    • Máx {subscription.max_items || '∞'} items por cotización
                  </Typography>
                  <Typography variant="body2">
                    • {subscription.max_providers} proveedores
                  </Typography>
                  <Typography variant="body2">
                    • {subscription.monthly_limit ? `${subscription.monthly_limit} cotizaciones/mes` : 'Ilimitadas cotizaciones'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info">
              No tienes suscripción activa. ¡Elige un plan para desbloquear funcionalidades!
            </Alert>
          )}
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default UserDashboard;
