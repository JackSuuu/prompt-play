/**
 * Unit tests for utility functions
 */
import { describe, it, expect } from 'vitest'
import { cn } from '../src/lib/utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('class1', 'class2')
    expect(result).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'active', false && 'disabled')
    expect(result).toBe('base active')
  })

  it('should merge Tailwind classes and remove conflicts', () => {
    // When two Tailwind classes conflict, twMerge should keep only the last one
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('should handle objects with boolean values', () => {
    const result = cn({
      'class1': true,
      'class2': false,
      'class3': true
    })
    expect(result).toBe('class1 class3')
  })

  it('should handle undefined and null values', () => {
    const result = cn('class1', undefined, null, 'class2')
    expect(result).toBe('class1 class2')
  })

  it('should handle empty strings', () => {
    const result = cn('class1', '', 'class2')
    expect(result).toBe('class1 class2')
  })

  it('should merge complex Tailwind classes', () => {
    const result = cn('bg-red-500 text-white', 'bg-blue-500')
    expect(result).toBe('text-white bg-blue-500')
  })

  it('should handle no arguments', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should preserve non-conflicting classes', () => {
    const result = cn('px-4 py-2', 'hover:bg-blue-500')
    expect(result).toBe('px-4 py-2 hover:bg-blue-500')
  })
})
