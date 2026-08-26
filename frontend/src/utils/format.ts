export function formatCLP(value: number | null | undefined): string {
  if (value == null || typeof value !== 'number' || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/** Normaliza texto para comparar búsquedas: sin acentos, minúsculas y sin espacios sobrantes. */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** `true` si el término de búsqueda aparece en alguno de los campos, ignorando acentos. */
export function matchesSearch(term: string, ...fields: (string | undefined)[]): boolean {
  const needle = normalizeForSearch(term)
  if (!needle) return true
  return fields.some((field) => field && normalizeForSearch(field).includes(needle))
}
