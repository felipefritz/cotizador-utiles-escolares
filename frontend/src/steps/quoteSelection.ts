import type { ItemQuote } from '../types'

/**
 * Qué producto representa a cada ítem cotizado.
 *
 * La tabla ya respetaba la opción que el usuario elige en "Ver opciones",
 * pero el total y la cotización guardada seguían usando el primer resultado:
 * el usuario veía un precio en la fila y otro en el total y en su historial.
 * Todo lo que muestra o persiste un precio pasa por acá.
 */

export type ChosenHit = {
  title?: string | null
  url?: string | null
  price?: number | null
  provider?: string
  image_url?: string | null
  relevance?: number
  available?: boolean
}

type AnyQuote = {
  hits?: ChosenHit[]
  best_hit?: ChosenHit
  unit_price?: number | null
  provider?: string
  url?: string | null
  title?: string | null
  image_url?: string | null
}

function quoteOf(result: ItemQuote): AnyQuote | undefined {
  return (result.multi || result.dimeiggs) as AnyQuote | undefined
}

export function chosenHit(result: ItemQuote, selectedIndex?: number): ChosenHit | null {
  const quote = quoteOf(result)
  if (!quote) return null
  const hits = quote.hits ?? []
  if (selectedIndex != null && hits[selectedIndex]) return hits[selectedIndex]
  if (quote.best_hit) return quote.best_hit
  if (hits.length > 0) return hits[0]
  if (quote.unit_price != null) {
    return {
      price: quote.unit_price,
      provider: quote.provider,
      url: quote.url ?? null,
      title: quote.title ?? null,
      image_url: quote.image_url ?? null,
    }
  }
  return null
}

export function unitPrice(result: ItemQuote, selectedIndex?: number): number | null {
  const hit = chosenHit(result, selectedIndex)
  return hit && typeof hit.price === 'number' && hit.price > 0 ? hit.price : null
}

export function summarize(results: ItemQuote[], selected: Map<number, number>) {
  let subtotal = 0
  let withPrice = 0
  const pending: ItemQuote[] = []
  results.forEach((result, index) => {
    const unit = unitPrice(result, selected.get(index))
    if (unit != null) {
      subtotal += unit * result.quantity
      withPrice += 1
    } else {
      pending.push(result)
    }
  })
  return { subtotal, withPrice, pending }
}

/** Mapa `índice de ítem -> valor` tras eliminar el ítem `removed`. */
export function withoutIndex<T>(map: Map<number, T>, removed: number): Map<number, T> {
  const next = new Map<number, T>()
  map.forEach((value, index) => {
    if (index < removed) next.set(index, value)
    else if (index > removed) next.set(index - 1, value)
  })
  return next
}

/** Claves `"ítem:hit"` tras eliminar el ítem `removed`. */
export function withoutItemKeys(keys: Set<string>, removed: number): Set<string> {
  const next = new Set<string>()
  keys.forEach((key) => {
    const [item, hit] = key.split(':').map(Number)
    if (item < removed) next.add(key)
    else if (item > removed) next.add(`${item - 1}:${hit}`)
  })
  return next
}

type RankedHit = { price?: number | null; relevance?: number; available?: boolean }

/**
 * La mejor oferta de una tienda con el mismo orden que usa el backend para la
 * tabla: con stock primero, luego más relevante y, a igual relevancia, más
 * barata. Se usa en el resumen por fuente para que su total cuadre con la
 * tabla.
 */
export function bestProviderHit<T extends RankedHit>(hits: T[]): T | null {
  let best: T | null = null
  for (const hit of hits) {
    const price = Number(hit.price)
    if (!Number.isFinite(price) || price <= 0) continue
    if (!best) {
      best = hit
      continue
    }
    const key = (h: T) => [h.available === false ? 1 : 0, -(h.relevance ?? 0), Number(h.price)]
    const [a, b] = [key(hit), key(best)]
    if (a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])))) best = hit
  }
  return best
}
