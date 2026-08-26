import { describe, expect, it } from 'vitest'
import { formatCLP, matchesSearch, normalizeForSearch } from './format'

describe('formatCLP', () => {
  it('formats CLP currency without decimals', () => {
    expect(formatCLP(1234)).toBe('$1.234')
  })

  it('returns dash for invalid values', () => {
    expect(formatCLP(null)).toBe('—')
    expect(formatCLP(undefined)).toBe('—')
    expect(formatCLP(Number.NaN)).toBe('—')
  })
})

describe('normalizeForSearch', () => {
  it('strips accents and casing', () => {
    expect(normalizeForSearch('Antártica')).toBe('antartica')
    expect(normalizeForSearch('  TecnoÚtiles ')).toBe('tecnoutiles')
  })
})

describe('matchesSearch', () => {
  it('matches ignoring accents across fields', () => {
    expect(matchesSearch('antartica', 'Antártica', 'Libros y lectura escolar')).toBe(true)
    expect(matchesSearch('LECTURA', 'Antártica', 'Libros y lectura escolar')).toBe(true)
  })

  it('returns false when no field matches', () => {
    expect(matchesSearch('taladro', 'Antártica', 'Libros y lectura escolar')).toBe(false)
  })

  it('treats an empty term as no filter', () => {
    expect(matchesSearch('   ', 'Antártica')).toBe(true)
  })

  it('ignores undefined fields', () => {
    expect(matchesSearch('dibu', undefined, 'Dibu')).toBe(true)
  })
})
