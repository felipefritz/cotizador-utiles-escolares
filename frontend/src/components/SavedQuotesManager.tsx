import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
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
  Paper,
  IconButton,
  Chip,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Stack,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
  StarOutline as StarBorderIcon,
  Close as CloseIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { api } from '../api';

interface SavedQuote {
  id: number;
  title: string;
  items: any[];
  results: any;
  notes: string;
  is_favorite: boolean;
  status: string;
  purchased_items?: Record<string, any>;
  selected_provider?: string;
  created_at: string;
  updated_at: string;
}

interface EditDialogState {
  open: boolean;
  quote: SavedQuote | null;
  title: string;
  notes: string;
  status: string;
}

export const SavedQuotesManager: React.FC = () => {
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState<EditDialogState>({
    open: false,
    quote: null,
    title: '',
    notes: '',
    status: 'draft',
  });
  const [viewDialog, setViewDialog] = useState<SavedQuote | null>(null);
  const [purchasedItemsDialog, setPurchasedItemsDialog] = useState<SavedQuote | null>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/quotes');
      setQuotes(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error cargando cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quoteId: number) => {
    if (window.confirm('¿Eliminar esta cotización?')) {
      try {
        await api.delete(`/user/quotes/${quoteId}`);
        setQuotes(quotes.filter(q => q.id !== quoteId));
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error eliminando cotización');
      }
    }
  };

  const handleToggleFavorite = async (quote: SavedQuote) => {
    try {
      await api.put(`/user/quotes/${quote.id}`, {
        is_favorite: !quote.is_favorite,
      });
      setQuotes(quotes.map(q =>
        q.id === quote.id ? { ...q, is_favorite: !q.is_favorite } : q
      ));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error actualizando favorito');
    }
  };

  const openEditDialog = (quote: SavedQuote) => {
    setEditDialog({
      open: true,
      quote,
      title: quote.title,
      notes: quote.notes || '',
      status: quote.status,
    });
  };

  const handleUpdateQuote = async () => {
    if (!editDialog.quote) return;

    try {
      await api.put(`/user/quotes/${editDialog.quote.id}`, {
        title: editDialog.title,
        notes: editDialog.notes,
        status: editDialog.status,
      });

      setQuotes(quotes.map(q =>
        q.id === editDialog.quote!.id
          ? { ...q, title: editDialog.title, notes: editDialog.notes, status: editDialog.status }
          : q
      ));

      setEditDialog({ open: false, quote: null, title: '', notes: '', status: 'draft' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error actualizando cotización');
    }
  };

  const handleMarkItemPurchased = async (
    quoteId: number,
    itemName: string,
    provider: string,
    price: number
  ) => {
    try {
      const response = await api.post(`/user/quotes/${quoteId}/mark-purchased`, {
        item_name: itemName,
        provider,
        price,
        quantity: 1,
      });

      // Actualizar la lista local
      setQuotes(quotes.map(q =>
        q.id === quoteId
          ? { ...q, purchased_items: response.data.purchased_items }
          : q
      ));

      if (purchasedItemsDialog?.id === quoteId) {
        setPurchasedItemsDialog({
          ...purchasedItemsDialog,
          purchased_items: response.data.purchased_items,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error marcando item como comprado');
    }
  };

  const handleUnmarkItemPurchased = async (quoteId: number, itemName: string) => {
    try {
      const response = await api.post(`/user/quotes/${quoteId}/unmark-purchased`, {
        item_name: itemName,
      });

      setQuotes(quotes.map(q =>
        q.id === quoteId
          ? { ...q, purchased_items: response.data.purchased_items }
          : q
      ));

      if (purchasedItemsDialog?.id === quoteId) {
        setPurchasedItemsDialog({
          ...purchasedItemsDialog,
          purchased_items: response.data.purchased_items,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error desmarcando item');
    }
  };

  const getStatusColor = (status: string): any => {
    const colors: Record<string, any> = {
      draft: 'default',
      pending: 'warning',
      completed: 'success',
      archived: 'info',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      draft: 'Borrador',
      pending: 'Pendiente',
      completed: 'Completada',
      archived: 'Archivada',
    };
    return labels[status] || status;
  };

  if (loading && quotes.length === 0) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ mt: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {quotes.length === 0 ? (
        <Alert severity="info">No tienes cotizaciones guardadas aún</Alert>
      ) : (
        <Grid container spacing={2}>
          {quotes.map((quote) => (
            <Grid item xs={12} sm={6} md={4} key={quote.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
                      {quote.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleFavorite(quote)}
                    >
                      {quote.is_favorite ? <StarIcon color="warning" /> : <StarBorderIcon />}
                    </IconButton>
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Chip
                      label={getStatusLabel(quote.status)}
                      color={getStatusColor(quote.status)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={`${quote.items?.length || 0} items`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  {quote.purchased_items && Object.keys(quote.purchased_items).length > 0 && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                      ✓ {Object.keys(quote.purchased_items).length} comprado(s)
                    </Typography>
                  )}

                  <Typography variant="caption" color="textSecondary">
                    {new Date(quote.created_at).toLocaleDateString('es-CL')}
                  </Typography>
                </CardContent>

                <CardActions sx={{ gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => openEditDialog(quote)}
                    title="Editar"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setViewDialog(quote)}
                    title="Ver detalles"
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setPurchasedItemsDialog(quote)}
                    title="Items comprados"
                  >
                    <ShoppingCartIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(quote.id)}
                    title="Eliminar"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ ...editDialog, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Editar cotización</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Nombre de la cotización"
            fullWidth
            value={editDialog.title}
            onChange={(e) => setEditDialog({ ...editDialog, title: e.target.value })}
            margin="dense"
            placeholder="Ej: Cotización Colegio 1"
          />
          <TextField
            label="Notas"
            fullWidth
            multiline
            rows={4}
            value={editDialog.notes}
            onChange={(e) => setEditDialog({ ...editDialog, notes: e.target.value })}
            margin="dense"
          />
          <TextField
            label="Estado"
            fullWidth
            select
            SelectProps={{
              native: true,
            }}
            value={editDialog.status}
            onChange={(e) => setEditDialog({ ...editDialog, status: e.target.value })}
            margin="dense"
          >
            <option value="draft">Borrador</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Completada</option>
            <option value="archived">Archivada</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ ...editDialog, open: false })}>Cancelar</Button>
          <Button onClick={handleUpdateQuote} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalles: {viewDialog?.title}
          <IconButton
            onClick={() => setViewDialog(null)}
            sx={{ float: 'right' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {viewDialog && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Items:</Typography>
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell align="center">Comprado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewDialog.items && Array.isArray(viewDialog.items) && viewDialog.items.length > 0 ? (
                        viewDialog.items.map((item: any, idx: number) => {
                          const itemName = typeof item === 'string' ? item : (item.detalle || item.name || JSON.stringify(item))
                          const quantity = item.cantidad || item.quantity || 1
                          const isPurchased = viewDialog.purchased_items && viewDialog.purchased_items[itemName]
                          return (
                            <TableRow key={idx} sx={{ backgroundColor: isPurchased ? 'success.light' : 'transparent' }}>
                              <TableCell>{itemName}</TableCell>
                              <TableCell align="right">{quantity}</TableCell>
                              <TableCell align="center">
                                {isPurchased ? (
                                  <Chip label="✓ Comprado" size="small" color="success" />
                                ) : (
                                  <Chip label="Pendiente" size="small" variant="outlined" />
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 2 }}>
                            No hay items registrados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {viewDialog.notes && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Notas:</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>{viewDialog.notes}</Typography>
                </>
              )}

              {viewDialog.results && Object.keys(viewDialog.results).length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Cotizaciones por proveedor:</Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>Proveedor</TableCell>
                          <TableCell align="right">Precio Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(viewDialog.results).map(([provider, data]: any, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{provider}</TableCell>
                            <TableCell align="right">${Number(data.total_price || 0).toLocaleString('es-CL')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Purchased Items Dialog */}
      <Dialog open={!!purchasedItemsDialog} onClose={() => setPurchasedItemsDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Rastreo de compras: {purchasedItemsDialog?.title}
          <IconButton
            onClick={() => setPurchasedItemsDialog(null)}
            sx={{ float: 'right' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {purchasedItemsDialog && (
            <Box>
              {/* Items Comprados */}
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>✓ Items Comprados</Typography>
              {!purchasedItemsDialog.purchased_items || Object.keys(purchasedItemsDialog.purchased_items).length === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>No hay items marcados como comprados aún</Alert>
              ) : (
                <TableContainer component={Paper} sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'success.light' }}>
                        <TableCell>Item</TableCell>
                        <TableCell>Proveedor</TableCell>
                        <TableCell align="right">Precio</TableCell>
                        <TableCell align="center">Cantidad</TableCell>
                        <TableCell align="center">Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(purchasedItemsDialog.purchased_items!).map(([itemName, data]: any, idx) => (
                        <TableRow key={idx} sx={{ backgroundColor: 'success.lighter' }}>
                          <TableCell><strong>{itemName}</strong></TableCell>
                          <TableCell>{data.provider}</TableCell>
                          <TableCell align="right">${Number(data.price).toLocaleString('es-CL')}</TableCell>
                          <TableCell align="center">{data.quantity}</TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleUnmarkItemPurchased(purchasedItemsDialog.id, itemName)}
                              color="error"
                              title="Desmarcar como comprado"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Items Disponibles para Marcar como Comprados */}
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>📋 Otros Items de la Cotización</Typography>
              {purchasedItemsDialog.items && Array.isArray(purchasedItemsDialog.items) && purchasedItemsDialog.items.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="center">Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchasedItemsDialog.items.map((item: any, itemIdx: number) => {
                        const itemName = typeof item === 'string' ? item : (item.detalle || item.name)
                        const quantity = item.cantidad || item.quantity || 1
                        const isPurchased = purchasedItemsDialog.purchased_items?.[itemName]
                        
                        return (
                          !isPurchased && (
                            <TableRow key={itemIdx}>
                              <TableCell>{itemName}</TableCell>
                              <TableCell align="right">{quantity}</TableCell>
                              <TableCell align="center">
                                <Chip label="Pendiente" size="small" variant="outlined" color="warning" />
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  onClick={() => handleMarkItemPurchased(
                                    purchasedItemsDialog.id,
                                    itemName,
                                    'Por definir',
                                    0
                                  )}
                                >
                                  Comprado
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="warning">No hay items registrados en esta cotización</Alert>
              )}
                                      data.item_prices?.[itemName] || 0
                                    )}
                                  >
                                    Marcar comprado
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
