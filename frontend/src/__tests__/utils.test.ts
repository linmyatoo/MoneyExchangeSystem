import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber } from '../lib/utils'

describe('Utils formatCurrency', () => {
  it('formats positive numbers as currency', () => {
    expect(formatCurrency(1000)).toBe('1,000.00')
    expect(formatCurrency(1234567.89)).toBe('1,234,567.89')
  })

  it('formats zero as currency', () => {
    expect(formatCurrency(0)).toBe('0.00')
  })

  it('handles negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-500.00')
  })
})

describe('Utils formatNumber', () => {
  it('formats numbers without decimals', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567)).toBe('1,234,567')
  })
})
