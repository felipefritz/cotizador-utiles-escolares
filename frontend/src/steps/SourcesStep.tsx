import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Typography,
  alpha,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { SOURCES, type SourceId } from '../types'

type Props = {
  selected: SourceId[]
  onSelectionChange: (ids: SourceId[]) => void
  onNext: () => void
  onBack?: () => void
  hideBack?: boolean
}

export function SourcesStep({ selected, onSelectionChange, onNext, onBack, hideBack }: Props) {
  const toggle = (id: SourceId) => {
    const s = SOURCES.find((x) => x.id === id)
    if (!s?.available) return
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id]
    onSelectionChange(next)
  }

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
        Elige las tiendas donde quieres cotizar
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {SOURCES.map((src) => {
          const active = selected.includes(src.id)
          return (
            <Card
              key={src.id}
              variant="outlined"
              sx={{
                width: 160,
                opacity: src.available ? 1 : 0.6,
                border: '2px solid',
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: active ? (t) => alpha(t.palette.primary.main, 0.06) : 'background.paper',
              }}
            >
              <CardActionArea
                onClick={() => toggle(src.id)}
                disabled={!src.available}
                sx={{ height: '100%', display: 'block' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3, position: 'relative' }}>
                  {active && (
                    <CheckCircleIcon color="primary" sx={{ position: 'absolute', top: 8, right: 8, fontSize: 20 }} />
                  )}
                  <Typography variant="subtitle1" fontWeight={600}>
                    {src.name}
                  </Typography>
                  {!src.available && (
                    <Chip label="Próximamente" size="small" sx={{ mt: 1 }} color="default" variant="outlined" />
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          )
        })}
      </Box>
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        {!hideBack && (
          <Button variant="outlined" onClick={onBack}>
            Atrás
          </Button>
        )}
        <Box sx={{ ml: 'auto' }}>
          <Button variant="contained" onClick={onNext} disabled={selected.length === 0}>
            Siguiente
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
