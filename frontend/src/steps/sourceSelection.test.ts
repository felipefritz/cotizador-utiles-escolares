import { describe, expect, it } from 'vitest'
import {
  addWithinLimit,
  countAvailableByArea,
  filterSources,
  selectionForArea,
  sourcesForArea,
  toggleSource,
  withAvailability,
} from './sourceSelection'
import type { Source } from '../types'

const source = (id: string, name: string, areas: string[], description = ''): Source =>
  ({ id, name, description, areas, available: true, color: '#000', url: 'https://x.cl/' } as Source)

const CATALOG: Source[] = [
  source('siemprelistos', 'Siempre Listos', ['oficina', 'educacion'], 'Oficina, papelería y útiles'),
  source('antartica', 'Antártica', ['educacion'], 'Libros y lectura escolar'),
  source('dibu', 'Dibu', ['educacion', 'oficina'], 'Materiales de arte y dibujo'),
  source('construfer', 'Construfer', ['construccion'], 'Ferretería y materiales'),
]

describe('withAvailability', () => {
  it('marca como disponible solo lo que publica el backend', () => {
    const result = withAvailability(CATALOG, ['siemprelistos', 'construfer'])
    expect(result.map((s) => [s.id, s.available])).toEqual([
      ['siemprelistos', true],
      ['antartica', false],
      ['dibu', false],
      ['construfer', true],
    ])
  })
})

describe('sourcesForArea', () => {
  it('filtra por área', () => {
    expect(sourcesForArea(CATALOG, 'educacion' as never).map((s) => s.id)).toEqual([
      'siemprelistos',
      'antartica',
      'dibu',
    ])
  })
})

describe('filterSources', () => {
  it('busca por nombre ignorando acentos', () => {
    expect(filterSources(CATALOG, 'antartica').map((s) => s.id)).toEqual(['antartica'])
  })

  it('busca también en la descripción', () => {
    expect(filterSources(CATALOG, 'ferretería').map((s) => s.id)).toEqual(['construfer'])
  })

  it('sin término devuelve todo', () => {
    expect(filterSources(CATALOG, '  ')).toHaveLength(CATALOG.length)
  })
})

describe('countAvailableByArea', () => {
  it('cuenta solo las fuentes disponibles', () => {
    const catalog = withAvailability(CATALOG, ['siemprelistos', 'antartica'])
    expect(countAvailableByArea(catalog, ['educacion', 'construccion'] as never[])).toEqual({
      educacion: 2,
      construccion: 0,
    })
  })
})

describe('addWithinLimit', () => {
  it('agrega todas las candidatas cuando el plan no tiene tope', () => {
    expect(addWithinLimit([], CATALOG, null)).toEqual([
      'siemprelistos',
      'antartica',
      'dibu',
      'construfer',
    ])
  })

  it('se detiene al llegar al tope del plan', () => {
    expect(addWithinLimit([], CATALOG, 2)).toEqual(['siemprelistos', 'antartica'])
  })

  it('cuenta lo ya seleccionado contra el tope y no duplica', () => {
    expect(addWithinLimit(['dibu'], CATALOG, 2)).toEqual(['dibu', 'siemprelistos'])
  })

  it('ignora las fuentes no disponibles', () => {
    const catalog = withAvailability(CATALOG, ['construfer'])
    expect(addWithinLimit([], catalog, null)).toEqual(['construfer'])
  })
})

describe('toggleSource', () => {
  const find = (id: string) => CATALOG.find((s) => s.id === id)

  it('agrega si hay cupo', () => {
    expect(toggleSource([], find('dibu'), 2)).toEqual(['dibu'])
  })

  it('no agrega al estar en el tope', () => {
    expect(toggleSource(['siemprelistos', 'antartica'], find('dibu'), 2)).toEqual([
      'siemprelistos',
      'antartica',
    ])
  })

  it('siempre permite deseleccionar, incluso en el tope', () => {
    expect(toggleSource(['siemprelistos', 'antartica'], find('antartica'), 2)).toEqual(['siemprelistos'])
  })

  it('ignora fuentes no disponibles o desconocidas', () => {
    const unavailable = { ...source('x', 'X', ['educacion']), available: false }
    expect(toggleSource([], unavailable, null)).toEqual([])
    expect(toggleSource([], undefined, null)).toEqual([])
  })
})

describe('selectionForArea', () => {
  it('conserva lo que sirve en el área nueva y antepone la recomendada', () => {
    const result = selectionForArea(CATALOG, ['dibu', 'construfer'], 'educacion' as never, 'siemprelistos' as never, null)
    expect(result).toEqual(['siemprelistos', 'dibu'])
  })

  it('descarta todo si el área nueva no comparte fuentes', () => {
    const result = selectionForArea(CATALOG, ['antartica'], 'construccion' as never, 'construfer' as never, null)
    expect(result).toEqual(['construfer'])
  })

  it('no duplica la recomendada si ya estaba seleccionada', () => {
    const result = selectionForArea(CATALOG, ['siemprelistos'], 'educacion' as never, 'siemprelistos' as never, null)
    expect(result).toEqual(['siemprelistos'])
  })

  it('recorta al tope del plan', () => {
    const result = selectionForArea(CATALOG, ['dibu', 'antartica'], 'educacion' as never, 'siemprelistos' as never, 2)
    expect(result).toEqual(['siemprelistos', 'dibu'])
  })
})
