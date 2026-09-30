import { describe, expect, it } from 'vitest'
import type { ItemQuote } from '../types'
import { chosenHit, summarize, withoutIndex, withoutItemKeys } from './quoteSelection'

function item(name: string, quantity: number, hits: Array<{ price: number | null; provider: string }>): ItemQuote {
  return {
    item: { item_original: name, detalle: name, cantidad: quantity, unidad: null, asignatura: null, tipo: 'producto' },
    quantity,
    multi: {
      query: name,
      status: hits.length ? 'ok' : 'no_results',
      providers_queried: [],
      providers_failed: [],
      hits: hits.map((hit, i) => ({ title: `${name} ${i}`, url: `u${i}`, available: true, relevance: 1, ...hit })),
      error: null,
    },
  } as ItemQuote
}

describe('chosenHit', () => {
  it('uses the option the user picked instead of the first result', () => {
    const r = item('cuaderno', 1, [{ price: 990, provider: 'a' }, { price: 1490, provider: 'b' }])
    expect(chosenHit(r)?.price).toBe(990)
    expect(chosenHit(r, 1)?.price).toBe(1490)
  })

  it('falls back to the first result when the selection no longer exists', () => {
    const r = item('cuaderno', 1, [{ price: 990, provider: 'a' }])
    expect(chosenHit(r, 5)?.price).toBe(990)
  })
})

describe('summarize', () => {
  it('adds the selected options, times quantity, to the subtotal', () => {
    const results = [
      item('cuaderno', 2, [{ price: 990, provider: 'a' }, { price: 1490, provider: 'b' }]),
      item('tijera', 1, [{ price: 790, provider: 'a' }]),
      item('compás', 1, []),
    ]
    const summary = summarize(results, new Map([[0, 1]]))
    expect(summary.subtotal).toBe(1490 * 2 + 790)
    expect(summary.withPrice).toBe(2)
    expect(summary.pending.map((r) => r.item.detalle)).toEqual(['compás'])
  })
})

describe('deleting an item', () => {
  it('shifts the selected options of the following items', () => {
    const next = withoutIndex(new Map([[0, 2], [1, 1], [3, 4]]), 1)
    expect([...next.entries()]).toEqual([[0, 2], [2, 4]])
  })

  it('shifts the purchased marks of the following items', () => {
    const next = withoutItemKeys(new Set(['0:0', '1:0', '2:0']), 1)
    expect([...next].sort()).toEqual(['0:0', '1:0'])
  })
})
