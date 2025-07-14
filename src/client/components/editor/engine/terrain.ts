import { TerrainType } from '../../../../core/game/Game'
import { GameMapImpl } from '../../../../core/game/GameMap'
import { LAND_BIT, OCEAN_BIT } from './constants'
import type { GameMapWithTerrain, MapEditorState, TerrainThresholds } from '../types'

export function createTerrainValue(terrainType: TerrainType): number {
  switch (terrainType) {
    case TerrainType.Plains:
      return (1 << LAND_BIT) | 5
    case TerrainType.Highland:
      return (1 << LAND_BIT) | 15
    case TerrainType.Mountain:
      return (1 << LAND_BIT) | 25
    case TerrainType.Ocean:
      return (1 << OCEAN_BIT) | 15
    case TerrainType.Lake:
      return 5
    default:
      return (1 << OCEAN_BIT) | 15
  }
}

export function paintTerrain(
  mapState: MapEditorState,
  x: number,
  y: number,
  terrain: TerrainType,
  brushSize: number,
  isErase = false
): void {
  const gameMap = mapState.gameMap
  const targetTerrain = isErase ? TerrainType.Ocean : terrain
  const targetValue = createTerrainValue(targetTerrain)

  const width = gameMap.width()
  const height = gameMap.height()
  const currentTerrain = extractTerrainData(gameMap as unknown as GameMapWithTerrain, width * height)

  applyBrushToTerrain(currentTerrain, x, y, brushSize, targetValue, width, height)

  const landTiles = calculateLandTiles(currentTerrain)
  mapState.gameMap = new GameMapImpl(width, height, currentTerrain, landTiles)
}

export function loadHeightmapFromImage(
  image: HTMLImageElement,
  terrainThresholds: TerrainThresholds,
  maxSize = 4096,
  mapName = 'Heightmap',
  clampMin = 0,
  clampMax = 1
): MapEditorState {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Unable to get 2D context from canvas')
  }

  let width = image.width
  let height = image.height

  if (width > maxSize || height > maxSize) {
    const scale = Math.min(maxSize / width, maxSize / height)
    width = Math.floor(width * scale)
    height = Math.floor(height * scale)
  }

  canvas.width = width
  canvas.height = height

  ctx.drawImage(image, 0, 0, width, height)

  const imageData = ctx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  const terrainData = new Uint8Array(width * height)
  let landTiles = 0

  for (let i = 0; i < width * height; i++) {
    const pixelIndex = i * 4

    const r = pixels[pixelIndex]
    const g = pixels[pixelIndex + 1]
    const b = pixels[pixelIndex + 2]
    const grayscale = Math.floor((r + g + b) / 3)

    const normalizedHeight = grayscale / 255

    const clampedHeight = clampMin + normalizedHeight * (clampMax - clampMin)

    const terrainByte = heightToTerrain(clampedHeight, terrainThresholds)
    terrainData[i] = terrainByte

    if (terrainByte & (1 << LAND_BIT)) {
      landTiles++
    }
  }

  const gameMap = new GameMapImpl(width, height, terrainData, landTiles)

  return {
    gameMap: gameMap,
    nations: [],
    mapName: `${mapName} (${width}x${height})`
  }
}

function applyBrushToTerrain(
  terrainData: Uint8Array,
  x: number,
  y: number,
  brushSize: number,
  targetValue: number,
  width: number,
  height: number
): void {
  const radius = brushSize / 2
  const minX = Math.max(0, Math.floor(x - radius))
  const maxX = Math.min(width - 1, Math.ceil(x + radius))
  const minY = Math.max(0, Math.floor(y - radius))
  const maxY = Math.min(height - 1, Math.ceil(y + radius))

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const dx = px - x
      const dy = py - y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= radius) {
        const index = py * width + px
        terrainData[index] = targetValue
      }
    }
  }
}

function heightToTerrain(normalizedHeight: number, thresholds: TerrainThresholds): number {
  if (normalizedHeight <= thresholds.ocean) {
    const magnitude = Math.floor((normalizedHeight / thresholds.ocean) * 30) + 1
    return (1 << OCEAN_BIT) | magnitude
  }
  if (normalizedHeight <= thresholds.plains) {
    const magnitude =
      Math.floor(((normalizedHeight - thresholds.ocean) / (thresholds.plains - thresholds.ocean)) * 9) + 1
    return (1 << LAND_BIT) | magnitude
  }
  if (normalizedHeight <= thresholds.highland) {
    const magnitude =
      Math.floor(((normalizedHeight - thresholds.plains) / (thresholds.highland - thresholds.plains)) * 10) + 10
    return (1 << LAND_BIT) | magnitude
  }

  const magnitude =
    Math.floor(((normalizedHeight - thresholds.highland) / (thresholds.mountain - thresholds.highland)) * 12) + 20
  return (1 << LAND_BIT) | Math.min(31, magnitude)
}

function calculateLandTiles(terrainData: Uint8Array): number {
  let landTiles = 0
  for (let i = 0; i < terrainData.length; i++) {
    if (terrainData[i] & (1 << LAND_BIT)) {
      landTiles++
    }
  }
  return landTiles
}

function extractTerrainData(gameMap: GameMapWithTerrain, totalTiles: number): Uint8Array {
  const terrainData = new Uint8Array(totalTiles)
  const mapTerrain = gameMap.terrain
  if (mapTerrain) {
    for (let i = 0; i < totalTiles; i++) {
      terrainData[i] = mapTerrain[i]
    }
  }
  return terrainData
}

export function generateShoresForExport(terrainData: Uint8Array, width: number, height: number): Uint8Array {
  const LAND_BIT = 1 << 7
  const SHORE_BIT = 1 << 6
  const result = new Uint8Array(terrainData)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const terrainValue = terrainData[index]

      if (!(terrainValue & LAND_BIT)) {
        let bordersLand = false

        const neighbors = [
          { x: x - 1, y: y },
          { x: x + 1, y: y },
          { x: x, y: y - 1 },
          { x: x, y: y + 1 }
        ]

        for (const neighbor of neighbors) {
          if (neighbor.x >= 0 && neighbor.x < width && neighbor.y >= 0 && neighbor.y < height) {
            const neighborIndex = neighbor.y * width + neighbor.x
            const neighborTerrain = terrainData[neighborIndex]

            if (neighborTerrain & LAND_BIT) {
              bordersLand = true
              break
            }
          }
        }

        if (bordersLand) {
          const magnitude = terrainValue & 0x1f
          result[index] = SHORE_BIT | Math.max(1, magnitude)
        }
      }
    }
  }
  return result
}

export function removeShoresForImport(terrainData: Uint8Array): Uint8Array {
  const SHORE_BIT = 1 << 6
  const OCEAN_BIT = 1 << 5
  const result = new Uint8Array(terrainData)

  for (let i = 0; i < terrainData.length; i++) {
    const terrainValue = terrainData[i]

    if (terrainValue & SHORE_BIT) {
      const magnitude = terrainValue & 0x1f
      result[i] = OCEAN_BIT | magnitude
    }
  }
  return result
}
