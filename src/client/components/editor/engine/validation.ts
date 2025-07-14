import type { TerrainThresholds, ValidationResult } from '../types'

export function validateMapDimensions(width: number, height: number): ValidationResult {
  if (width < 200 || width > 8192 || height < 200 || height > 8192) {
    return {
      isValid: false,
      message: 'Width and height must be between 200 and 8192',
    }
  }
  return { isValid: true }
}

export function validateNationData(name: string, strength: number): ValidationResult {
  if (!name.trim()) {
    return {
      isValid: false,
      message: 'Please enter a nation name',
    }
  }

  if (strength < 1 || strength > 100) {
    return {
      isValid: false,
      message: 'Strength must be between 1 and 100',
    }
  }

  return { isValid: true }
}

export function validateMapName(name: string): ValidationResult {
  if (!name.trim()) {
    return {
      isValid: false,
      message: 'Please enter a map name',
    }
  }
  return { isValid: true }
}

export function validateImageFile(file: File): ValidationResult {
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      message: 'Please select a valid image file',
    }
  }
  return { isValid: true }
}

export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function sanitizeMapName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_')
}

export function formatMapName(name: string): string {
  return sanitizeMapName(name)
}

export function validateThresholdOrder(
  thresholds: TerrainThresholds,
  changedThreshold: string,
  newValue: number,
): TerrainThresholds {
  const updated = { ...thresholds, [changedThreshold]: newValue }

  const keys = ['ocean', 'shore', 'plains', 'highland', 'mountain'] as const
  const values = keys.map((key) => updated[key])

  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] >= values[i + 1]) values[i + 1] = values[i] + 0.01
  }

  return {
    ocean: values[0],
    plains: values[1],
    highland: values[2],
    mountain: values[3],
  }
}
