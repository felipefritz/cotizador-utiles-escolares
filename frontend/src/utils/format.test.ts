import { describe, expect, it } from 'vitest'
import { formatCLP } from './format'

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
