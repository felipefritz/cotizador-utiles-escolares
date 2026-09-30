import { describe, expect, it } from 'vitest'
import type { SelectedItem } from '../types'
import { appendItem, countSelected, selectAllTarget, selectUpToLimit, trimToLimit } from './itemSelection'

function row(name: string, selected = true, tipo: 'producto' | 'lectura' = 'producto'): SelectedItem {
  return {
    item: { item_original: name, detalle: name, cantidad: 1, unidad: null, asignatura: null, tipo },
    selected,
    quantity: 1,
  } as SelectedItem
}

const names = (items: SelectedItem[]) => items.filter((r) => r.selected).map((r) => r.item.detalle)

describe('appendItem', () => {
  it('keeps every item selected when there is no limit', () => {
    // Caso real en preciofast.cl sin sesión: al agregar "goma eva" se
    // desmarcaba "estuches".
    let items = [row('estuches')]
    for (const name of ['goma eva', 'tijera punta roma', 'cuaderno']) {
      const result = appendItem(items, row(name), null)
      expect(result.deselected).toBe(false)
      items = result.items
    }
    expect(names(items)).toEqual(['estuches', 'goma eva', 'tijera punta roma', 'cuaderno'])
  })

  it('makes room for the new item when the plan is at its limit', () => {
    const result = appendItem([row('a'), row('b'), row('c', false)], row('d'), 2)
    expect(result.deselected).toBe(true)
    expect(names(result.items)).toEqual(['a', 'd'])
  })

  it('adds the item unselected when the plan allows zero items', () => {
    const result = appendItem([], row('a'), 0)
    expect(countSelected(result.items)).toBe(0)
  })
})

describe('select all', () => {
  it('counts the items that were already selected', () => {
    const items = [row('a'), row('b'), row('c', false), row('d', false), row('e', false)]
    expect(names(selectUpToLimit(items, 3))).toEqual(['a', 'b', 'c'])
  })

  it('selects everything but readings when unlimited', () => {
    const items = [row('a', false), row('libro', false, 'lectura'), row('b', false)]
    expect(names(selectUpToLimit(items, null))).toEqual(['a', 'b'])
    expect(selectAllTarget(items, null)).toBe(2)
  })

  it('targets the smaller of the limit and the selectable items', () => {
    expect(selectAllTarget([row('a'), row('b')], 5)).toBe(2)
    expect(selectAllTarget([row('a'), row('b'), row('c')], 2)).toBe(2)
  })
})

describe('trimToLimit', () => {
  it('keeps the first selected items', () => {
    expect(names(trimToLimit([row('a'), row('b'), row('c')], 2))).toEqual(['a', 'b'])
  })

  it('does nothing without a limit', () => {
    const items = [row('a'), row('b')]
    expect(trimToLimit(items, null)).toBe(items)
  })
})
