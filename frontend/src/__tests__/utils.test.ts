import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, formatThousands, parseThousands } from '../lib/utils'

describe('Utils formatCurrency', () => {
  it('formats positive numbers as currency with 2 decimals and thousands separator', () => {
    expect(formatCurrency(1000)).toBe('1,000.00')
    expect(formatCurrency(1234567.89)).toBe('1,234,567.89')
  })

  it('formats zero as currency', () => {
    expect(formatCurrency(0)).toBe('0.00')
  })

  it('handles negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-500.00')
    expect(formatCurrency(-1500000)).toBe('-1,500,000.00')
  })

  it('handles empty or null values', () => {
    expect(formatCurrency(null)).toBe('0.00')
    expect(formatCurrency(undefined)).toBe('0.00')
  })
})

describe('Utils formatNumber', () => {
  it('formats numbers with thousands separators', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567)).toBe('1,234,567')
    expect(formatNumber(1234567.89)).toBe('1,234,567.89')
  })

  it('formats numbers with custom fraction digits', () => {
    expect(formatNumber(1234567.8912, 2)).toBe('1,234,567.89')
    expect(formatNumber(1234567.8912, { minimumFractionDigits: 2, maximumFractionDigits: 4 })).toBe('1,234,567.8912')
  })

  it('formats 0 properly', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('Utils formatThousands', () => {
  it('formats numeric string with commas', () => {
    expect(formatThousands('1000')).toBe('1,000')
    expect(formatThousands('1000000')).toBe('1,000,000')
    expect(formatThousands('1234567.89')).toBe('1,234,567.89')
  })

  it('preserves trailing dot for in-progress typing', () => {
    expect(formatThousands('1000.')).toBe('1,000.')
    expect(formatThousands('1000.0')).toBe('1,000.0')
    expect(formatThousands('1000.05')).toBe('1,000.05')
  })

  it('handles existing commas and cleans them correctly', () => {
    expect(formatThousands('1,000,000')).toBe('1,000,000')
    expect(formatThousands('1,0000')).toBe('10,000')
  })

  it('handles empty/null/negative inputs', () => {
    expect(formatThousands('')).toBe('')
    expect(formatThousands(null)).toBe('')
    expect(formatThousands('-1500')).toBe('-1,500')
  })
})

describe('Utils parseThousands', () => {
  it('parses formatted strings to number', () => {
    expect(parseThousands('1,000')).toBe(1000)
    expect(parseThousands('1,234,567.89')).toBe(1234567.89)
  })

  it('handles empty or incomplete inputs', () => {
    expect(parseThousands('')).toBeUndefined()
    expect(parseThousands(null)).toBeUndefined()
    expect(parseThousands('-')).toBeUndefined()
  })
})
