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
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { useNavigate, useLocation } from 'react-router-dom';
import { SavedQuotesManager } from './SavedQuotesManager';

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
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();
  }, []);

  // Detectar si volvemos de Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentParam = params.get('payment');
    
    if (paymentParam) {
      console.log('🔍 Detectado parámetro de pago:', paymentParam);
      setPaymentStatus(paymentParam);
      
      // Esperar un poco para que el webhook procese
      setTimeout(() => {
        console.log('🔄 Recargando datos después del pago...');
        loadData();
      }, 2000);
      
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  // Mostrar notificación de pago
  useEffect(() => {
    if (paymentStatus === 'success') {
      setMessage('✅ ¡Pago completado! Tu plan ha sido actualizado.');
      setMessageType('success');
      setTimeout(() => setPaymentStatus(null), 5000);
    } else if (paymentStatus === 'failure') {
      setMessage('❌ El pago fue rechazado. Por favor intenta de nuevo.');
      setMessageType('error');
    } else if (paymentStatus === 'pending') {
      setMessage('⏳ Pago pendiente. Mercado Pago está procesando tu transacción.');
      setMessageType('success');
    }
  }, [paymentStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
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
      
      let errorMessage = 'Error al iniciar pago';
      
      // Manejar errores de validación de FastAPI (422)
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Error de validación de pydantic
          errorMessage = detail.map((e: any) => e.msg || e).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setMessage(errorMessage);
      setMessageType('error');
    }
  };

  const handleNewQuote = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

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
          <Tab label="Cotizaciones Guardadas" sx={{ fontWeight: 600 }} />
          <Tab label="Planes" sx={{ fontWeight: 600 }} />
          <Tab label="Suscripción" sx={{ fontWeight: 600 }} />
        </Tabs>

        {/* TAB 1: Cotizaciones Guardadas */}
        <TabPanel value={tabValue} index={0}>
          <SavedQuotesManager />
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
                            label: plan.max_providers ? `${plan.max_providers} proveedores` : 'Proveedores ilimitados',
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
