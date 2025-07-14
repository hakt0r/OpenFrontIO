import type { Theme } from '../../../../core/configuration/Config'
import type { TerrainColors } from './types'

export function extractTerrainColorsFromTheme(theme: Theme): TerrainColors {
  const oceanColor = theme.getWaterColor().rgba
  const shoreColor = theme.getShoreColor().rgba
  const plainsColor = theme.getPlainsBaseColor().rgba
  const highlandColor = theme.getHighlandBaseColor().rgba
  const mountainColor = theme.getMountainBaseColor().rgba

  return {
    oceanColor1: {
      r: oceanColor.r / 255,
      g: oceanColor.g / 255,
      b: oceanColor.b / 255,
    },
    oceanColor2: {
      r: Math.min(oceanColor.r + 30, 255) / 255,
      g: Math.min(oceanColor.g + 30, 255) / 255,
      b: Math.min(oceanColor.b + 30, 255) / 255,
    },
    plainsColor1: {
      r: plainsColor.r / 255,
      g: plainsColor.g / 255,
      b: plainsColor.b / 255,
    },
    plainsColor2: {
      r: Math.min(plainsColor.r + 20, 255) / 255,
      g: Math.min(plainsColor.g + 20, 255) / 255,
      b: Math.min(plainsColor.b + 20, 255) / 255,
    },
    highlandColor1: {
      r: highlandColor.r / 255,
      g: highlandColor.g / 255,
      b: highlandColor.b / 255,
    },
    highlandColor2: {
      r: Math.min(highlandColor.r + 25, 255) / 255,
      g: Math.min(highlandColor.g + 25, 255) / 255,
      b: Math.min(highlandColor.b + 25, 255) / 255,
    },
    mountainColor1: {
      r: mountainColor.r / 255,
      g: mountainColor.g / 255,
      b: mountainColor.b / 255,
    },
    mountainColor2: {
      r: Math.min(mountainColor.r + 15, 255) / 255,
      g: Math.min(mountainColor.g + 15, 255) / 255,
      b: Math.min(mountainColor.b + 15, 255) / 255,
    },
    shoreColor: {
      r: shoreColor.r / 255,
      g: shoreColor.g / 255,
      b: shoreColor.b / 255,
    },
  }
}
