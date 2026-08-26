import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Link,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import StorefrontIcon from '@mui/icons-material/Storefront'
import LockIcon from '@mui/icons-material/Lock'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type { PurchasePlan, PurchasePlanResponse } from '../api'
import { getSourceColor, getSourceName, getSourceUrl } from '../types'
import { formatCLP } from '../utils/format'

type Props = {
  plan: PurchasePlanResponse | null
  loading: boolean
  error: string | null
  shippingCost: number
  onShippingCostChange: (value: number) => void
  onUpgradeClick?: () => void
}

/** Opciones de despacho estimado. No hay dato real por tienda, así que se elige. */
const SHIPPING_OPTIONS = [0, 2990, 3990, 4990, 6990]

const storeLabel = (plan: PurchasePlan): string[] =>
  Array.from(new Set([...plan.stores, ...plan.extra_stores]))

export function PurchasePlanCard({
  plan,
  loading,
  error,
  shippingCost,
  onShippingCostChange,
  onUpgradeClick,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)

  const linesByStore = useMemo(() => {
    if (!plan?.recommended) return []
    const groups = new Map<string, typeof plan.recommended.lines>()
    for (const line of plan.recommended.lines) {
      const current = groups.get(line.provider) ?? []
      current.push(line)
      groups.set(line.provider, current)
    }
    return Array.from(groups.entries())
  }, [plan])

  if (loading) {
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Calculando dónde conviene comprar todo...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        No se pudo calcular el plan de compra: {error}
      </Alert>
    )
  }

  if (!plan || plan.status !== 'ok' || !plan.baseline) return null

  const savings = plan.savings ?? 0
  const hasSavings = savings > 0

  // Versión bloqueada: se muestra el ahorro posible, no cómo conseguirlo.
  if (plan.locked) {
    return (
      <Card
        variant="outlined"
        sx={{
          mb: 3,
          borderColor: 'primary.main',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <LockIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1" fontWeight={800}>
              Plan de compra optimizado
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Comprar cada ítem donde está más barato reparte tu lista en{' '}
            <strong>{plan.baseline.store_count} tiendas</strong>, con un despacho por cada una.
          </Typography>
          {hasSavings ? (
            <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ mb: 2 }}>
              Agrupando la compra ahorras {formatCLP(savings)}
              {plan.stores_saved > 0 && ` y ${plan.stores_saved} despachos`}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Te mostramos en qué tiendas conviene agrupar la compra.
            </Typography>
          )}
          <Button variant="contained" onClick={onUpgradeClick}>
            Desbloquear plan de compra
          </Button>
        </CardContent>
      </Card>
    )
  }

  const recommended = plan.recommended
  if (!recommended) return null

  const stores = storeLabel(recommended)
  const unpriced = recommended.missing.filter((m) => m.reason === 'sin_precio')

  return (
    <Card variant="outlined" sx={{ mb: 3, borderColor: 'primary.main', borderWidth: 2 }}>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <StorefrontIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={800}>
              Dónde comprar todo
            </Typography>
          </Stack>
          <TextField
            select
            size="small"
            label="Despacho por tienda"
            value={shippingCost}
            onChange={(event) => onShippingCostChange(Number(event.target.value))}
            sx={{ minWidth: 180 }}
            helperText="Estimado, ajústalo"
          >
            {SHIPPING_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>
                {value === 0 ? 'Sin despacho / retiro' : formatCLP(value)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {hasSavings && (
          <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ mb: 2 }}>
            Ahorras {formatCLP(savings)}
            {plan.stores_saved > 0 && ` y ${plan.stores_saved} despachos`}
          </Typography>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ p: 2, borderRadius: 1, bgcolor: (t) => alpha(t.palette.text.primary, 0.04) }}>
            <Typography variant="caption" color="text.secondary">
              Cada ítem al más barato
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {formatCLP(plan.baseline.total)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {plan.baseline.store_count} tiendas · {formatCLP(plan.baseline.subtotal ?? 0)} + despacho{' '}
              {formatCLP(plan.baseline.shipping ?? 0)}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
              border: '1px solid',
              borderColor: 'primary.main',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Plan recomendado
            </Typography>
            <Typography variant="h6" fontWeight={800} color="primary.main">
              {formatCLP(recommended.total)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {recommended.store_count} {recommended.store_count === 1 ? 'tienda' : 'tiendas'} ·{' '}
              {formatCLP(recommended.subtotal)} + despacho {formatCLP(recommended.shipping)}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {stores.map((store) => (
            <Chip
              key={store}
              size="small"
              label={getSourceName(store)}
              component="a"
              href={getSourceUrl(store)}
              target="_blank"
              rel="noopener noreferrer"
              clickable
              sx={{ bgcolor: alpha(getSourceColor(store), 0.15), fontWeight: 600 }}
            />
          ))}
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Cubre {recommended.items_in_plan} de {recommended.items_total} ítems.
          {unpriced.length > 0 && ` ${unpriced.length} sin precio en ninguna fuente.`}
        </Typography>

        <Button
          size="small"
          onClick={() => setExpanded((value) => !value)}
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        >
          {expanded ? 'Ocultar detalle' : 'Ver qué comprar en cada tienda'}
        </Button>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            {linesByStore.map(([store, lines]) => (
              <Box key={store} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getSourceColor(store) }} />
                  <Typography variant="subtitle2" fontWeight={700}>
                    {getSourceName(store)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatCLP(lines.reduce((sum, line) => sum + line.line_total, 0))}
                  </Typography>
                  {!recommended.stores.includes(store) && (
                    <Tooltip title="Este ítem no está en las tiendas del plan, se compra aparte">
                      <Chip size="small" variant="outlined" label="aparte" sx={{ height: 18, fontSize: 10 }} />
                    </Tooltip>
                  )}
                </Stack>
                {lines.map((line, index) => (
                  <Stack
                    key={`${store}-${index}`}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ pl: 2, py: 0.25 }}
                  >
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {line.cantidad} × {line.detalle}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCLP(line.line_total)}
                    </Typography>
                    {line.url && (
                      <Link href={line.url} target="_blank" rel="noopener noreferrer" sx={{ display: 'flex' }}>
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </Link>
                    )}
                  </Stack>
                ))}
              </Box>
            ))}

            {unpriced.length > 0 && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Sin precio en ninguna fuente: {unpriced.map((m) => m.detalle).join(', ')}
              </Alert>
            )}
          </Box>
        </Collapse>

        {plan.plans.length > 1 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Button
              size="small"
              onClick={() => setShowAlternatives((value) => !value)}
              endIcon={showAlternatives ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              Otras combinaciones ({plan.plans.length - 1})
            </Button>
            <Collapse in={showAlternatives}>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {plan.plans.slice(1).map((alternative, index) => (
                  <Stack
                    key={index}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {storeLabel(alternative).map((store) => (
                        <Chip key={store} size="small" variant="outlined" label={getSourceName(store)} />
                      ))}
                    </Stack>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCLP(alternative.total)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Collapse>
          </>
        )}

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 2 }}>
          <LocalShippingIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Despacho estimado en {formatCLP(plan.shipping_cost_per_store)} por tienda. No es el costo real
            de cada tienda: ajústalo arriba para comparar.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
