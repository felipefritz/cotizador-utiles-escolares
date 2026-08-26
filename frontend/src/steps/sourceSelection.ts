import type { AreaId, Source, SourceId } from '../types'
import { matchesSearch } from '../utils/format'

/**
 * Lógica de selección de fuentes, aparte del componente para poder probarla.
 *
 * Con más de cincuenta fuentes publicadas, lo delicado ya no es pintar la
 * grilla sino respetar el tope del plan al seleccionar en bloque y al cambiar
 * de área.
 */

/** Marca como disponible solo lo que el backend publica en `/settings/public`. */
export function withAvailability(sources: Source[], availableIds: string[]): Source[] {
  return sources.map((source) => ({ ...source, available: availableIds.includes(source.id) }))
}

export function sourcesForArea(sources: Source[], area: AreaId): Source[] {
  return sources.filter((source) => source.areas.includes(area))
}

export function filterSources(sources: Source[], search: string): Source[] {
  return sources.filter((source) => matchesSearch(search, source.name, source.description))
}

export function countAvailableByArea(sources: Source[], areas: AreaId[]): Record<AreaId, number> {
  const counts = {} as Record<AreaId, number>
  for (const area of areas) {
    counts[area] = sources.filter((source) => source.available && source.areas.includes(area)).length
  }
  return counts
}

/** Agrega candidatos a la selección sin pasarse del tope del plan (`null` = sin tope). */
export function addWithinLimit(
  selected: SourceId[],
  candidates: Source[],
  maxProviders: number | null,
): SourceId[] {
  const next = [...selected]
  for (const source of candidates) {
    if (!source.available || next.includes(source.id)) continue
    if (maxProviders !== null && next.length >= maxProviders) break
    next.push(source.id)
  }
  return next
}

/** Alterna una fuente respetando el tope; deseleccionar siempre está permitido. */
export function toggleSource(
  selected: SourceId[],
  source: Source | undefined,
  maxProviders: number | null,
): SourceId[] {
  if (!source?.available) return selected
  if (selected.includes(source.id)) return selected.filter((id) => id !== source.id)
  if (maxProviders !== null && selected.length >= maxProviders) return selected
  return [...selected, source.id]
}

/**
 * Selección al cambiar de área: conserva lo que sigue sirviendo y antepone la
 * fuente recomendada, porque el área nueva puede no compartir ninguna tienda.
 */
export function selectionForArea(
  sources: Source[],
  selected: SourceId[],
  nextArea: AreaId,
  recommended: SourceId,
  maxProviders: number | null,
): SourceId[] {
  const relatedIds = new Set(
    sourcesForArea(sources, nextArea).filter((source) => source.available).map((source) => source.id)
  )
  const retained = selected.filter((id) => relatedIds.has(id))
  const next = relatedIds.has(recommended)
    ? [recommended, ...retained.filter((id) => id !== recommended)]
    : retained
  return maxProviders === null ? next : next.slice(0, maxProviders)
}
