export function formatCLP(value: number | null | undefined): string {
  if (value == null || typeof value !== 'number' || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
