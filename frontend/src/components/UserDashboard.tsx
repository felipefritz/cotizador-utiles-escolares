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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  CardActions,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { api } from '../api';

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
      const res = await api.post('/payment/checkout', planId);
      // Redirigir a Mercado Pago
      window.location.href = res.data.checkout_url;
    } catch (error) {
      setMessage('Error al iniciar pago');
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Mi Cuenta
      </Typography>

      {message && (
        <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <Paper>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Mis Cotizaciones" />
          <Tab label="Planes" />
          <Tab label="Suscripción" />
        </Tabs>

        {/* TAB 1: Cotizaciones */}
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : quotes.length === 0 ? (
            <Alert severity="info">
              No tienes cotizaciones guardadas. ¡Crea una nueva!
            </Alert>
          ) : (
            <List>
              {quotes.map((quote) => (
                <ListItem key={quote.id} sx={{ mb: 1, border: '1px solid #eee', borderRadius: 1 }}>
                  <ListItemText
                    primary={quote.title}
                    secondary={`${quote.items_count} items • ${new Date(quote.created_at).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleToggleFavorite(quote.id, quote.is_favorite)}
                      sx={{ mr: 1 }}
                    >
                      {quote.is_favorite ? <StarIcon color="warning" /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleViewQuote(quote.id)}
                      title="Ver detalle"
                      sx={{ mr: 1 }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleEditQuote(quote)}
                      title="Editar"
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDownloadQuote(quote)}
                      title="Descargar"
                      sx={{ mr: 1 }}
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteQuote(quote.id)}
                      title="Eliminar"
                    >
                      <DeleteIcon color="error" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
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
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {plans.map((plan) => (
                <Grid item xs={12} sm={6} md={4} key={plan.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {plan.name?.toUpperCase() || 'PLAN'}
                      </Typography>
                      <Typography variant="h4" color="primary" gutterBottom>
                        ${plan.price.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        /{plan.billing_cycle}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          ✓ Máx {plan.max_items || '∞'} items
                        </Typography>
                        <Typography variant="body2">
                          ✓ {plan.max_providers} proveedores
                        </Typography>
                        <Typography variant="body2">
                          ✓ {plan.monthly_limit ? `${plan.monthly_limit} cotizaciones/mes` : 'Ilimitado'}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      {plan.name === 'free' ? (
                        <Chip label="Plan Actual" color="primary" />
                      ) : (
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => handleCheckout(plan.id)}
                        >
                          Contratar
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
