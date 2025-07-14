import type { GameMapWithTerrain, MapEditorState } from '../types'
import type { EditorEngine } from '../engine'
import { GameMapImpl } from '../../../../core/game/GameMap'
import { type MapMetadata, type MapManifest, genTerrainFromBin } from '../../../../core/game/TerrainMapLoader'
import { formatErrorMessage, formatMapName } from './validation'
import { MapStorage } from './storage'
import { generateShoresForExport, removeShoresForImport } from './terrain'
import { GameMapType } from '../../../../core/game/Game'
import { terrainMapFileLoader } from '../../../../core/game/TerrainMapFileLoader'
import { MAP_NAME_MAPPING } from './constants'
import {
  imageToHeightmap,
  type HeightmapThresholds,
  DEFAULT_HEIGHTMAP_THRESHOLDS,
  terrainToHeightmap,
  heightmapToTerrain,
} from './heightmap'

const LOCAL_PREFIX = 'local:'
const SAVE_DATA_VERSION = '1.0'
const MINIMAP_SCALE_FACTOR = 2
const MINIMAP_LAND_REDUCTION = 4
const mapStorage = new MapStorage()

export async function loadMap(mapName: string): Promise<MapEditorState | null> {
  if (mapName.startsWith(LOCAL_PREFIX)) {
    const key = mapName.replace(LOCAL_PREFIX, '')
    return loadMapFromLocalStorage(key)
  }
  return loadExistingMap(mapName)
}

export function extractTerrainData(gameMap: GameMapImpl, length: number): Uint8Array {
  const terrainData = new Uint8Array(length)
  const gameMapWithTerrain = gameMap as unknown as GameMapWithTerrain

  for (let i = 0; i < length; i++) terrainData[i] = gameMapWithTerrain.terrain[i]

  return terrainData
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}

export async function saveMapToLocalStorage(
  mapState: MapEditorState,
  mapName: string,
  engine?: EditorEngine | null,
): Promise<void> {
  const gameMap = mapState.gameMap
  const width = gameMap.width()
  const height = gameMap.height()

  let terrainData: Uint8Array
  let landTiles: number

  if (engine) {
    const gpuTerrainData = await engine.extractTerrainData()
    if (gpuTerrainData) {
      terrainData = gpuTerrainData

      landTiles = 0
      for (let i = 0; i < terrainData.length; i++) {
        if (terrainData[i] & (1 << 7)) landTiles++
      }
    } else {
      terrainData = extractTerrainData(gameMap, width * height)
      landTiles = gameMap.numLandTiles()
    }
  } else {
    terrainData = extractTerrainData(gameMap, width * height)
    landTiles = gameMap.numLandTiles()
  }

  const mapMetadata: MapMetadata = {
    width: width,
    height: height,
    num_land_tiles: landTiles,
  }

  const manifest: MapManifest = {
    name: mapName,
    map: mapMetadata,
    mini_map: {
      width: Math.floor(width / MINIMAP_SCALE_FACTOR),
      height: Math.floor(height / MINIMAP_SCALE_FACTOR),
      num_land_tiles: Math.floor(landTiles / MINIMAP_LAND_REDUCTION),
    },
    nations: mapState.nations,
  }

  const terrainDataWithShores = generateShoresForExport(terrainData, width, height)

  await mapStorage.saveMap(mapName, {
    version: SAVE_DATA_VERSION,
    manifest,
    terrain: Array.from(terrainDataWithShores),
    saveDate: new Date().toISOString(),
  })
}

export async function loadMapFromLocalStorage(key: string): Promise<MapEditorState | null> {
  try {
    const data = await mapStorage.loadMap(key)
    if (!data) return null

    const manifest = data.manifest
    const terrainDataRaw = new Uint8Array(data.terrain)

    const terrainData = removeShoresForImport(terrainDataRaw)

    const gameMap = new GameMapImpl(manifest.map.width, manifest.map.height, terrainData, manifest.map.num_land_tiles)

    return {
      gameMap: gameMap,
      mapName: manifest.name,
      nations: manifest.nations || [],
      sourceType: 'local',
      originalSize: { width: manifest.map.width, height: manifest.map.height },
    }
  } catch (error) {
    console.error(`Failed to load map from storage: ${formatErrorMessage(error)}`)
    return null
  }
}

export async function getAllLocalMapNames(): Promise<string[]> {
  try {
    return await mapStorage.getAllMapIds()
  } catch (error) {
    console.error('Failed to get local map names:', error)
    return []
  }
}

export async function deleteLocalMap(key: string): Promise<void> {
  await mapStorage.deleteMap(key)
}

export async function loadImageAsHeightmap(
  imageFile: File,
  targetWidth: number,
  targetHeight?: number,
): Promise<Float32Array> {
  const img = new Image()
  img.src = URL.createObjectURL(imageFile)
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const actualHeight = targetHeight ?? Math.round(img.height * (targetWidth / img.width))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = actualHeight
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(img, 0, 0, targetWidth, actualHeight)
  const imageData = ctx.getImageData(0, 0, targetWidth, actualHeight)

  URL.revokeObjectURL(img.src)
  return imageToHeightmap(imageData)
}

export async function loadMapAsHeightmap(
  mapName: string,
  thresholds: HeightmapThresholds = DEFAULT_HEIGHTMAP_THRESHOLDS,
): Promise<Float32Array> {
  const mapState = await loadMap(mapName)
  if (!mapState) throw new Error(`Failed to load map: ${mapName}`)

  const terrainData = (mapState.gameMap as any).terrain as Uint8Array
  return terrainToHeightmap(terrainData, thresholds)
}

export function heightmapToMapState(
  heightmapData: Float32Array,
  width: number,
  height: number,
  mapName: string,
  thresholds: HeightmapThresholds = DEFAULT_HEIGHTMAP_THRESHOLDS,
): MapEditorState {
  const { terrainData, landTiles } = heightmapToTerrain(heightmapData, thresholds)

  const gameMap = new GameMapImpl(width, height, terrainData, landTiles)

  return {
    gameMap,
    nations: [],
    mapName,
    sourceType: 'heightmap',
    originalSize: { width, height },
  }
}

export const getServerMapImage = (mapName: string): Promise<string> => {
  const mapType = MAP_NAME_MAPPING[mapName.toLowerCase()] as GameMapType;
  if (!mapType) throw new Error(`Map not found: ${mapName}`)
  const data = terrainMapFileLoader.getMapData(mapType);
  return data.webpPath().catch(() => '')
}

export async function getServerMapMetadata(mapName: string): Promise<MapManifest> {
  const enumKey = MAP_NAME_MAPPING[mapName.toLowerCase()]
  if (!enumKey) throw new Error(`Map not found: ${mapName}`)
  const mapType = GameMapType[enumKey]
  if (!mapType) throw new Error(`Map type not found for: ${enumKey.toString()}`)
  const mapFiles = terrainMapFileLoader.getMapData(mapType)
  const manifest = await mapFiles.manifest()
  return manifest
}

export async function loadExistingMap(mapName: string): Promise<MapEditorState | null> {
  const enumKey = MAP_NAME_MAPPING[mapName.toLowerCase()]
  if (!enumKey) throw new Error(`Map not found: ${mapName}`)

  const mapType = GameMapType[enumKey]
  if (!mapType) throw new Error(`Map type not found for: ${enumKey.toString()}`)

  const mapFiles = terrainMapFileLoader.getMapData(mapType)
  const manifest = await mapFiles.manifest()
  const binaryData = await mapFiles.mapBin()

  const gameMap = await genTerrainFromBin(manifest.map, binaryData)

  const transformedNations = manifest.nations.map((nation) => ({
    ...nation,
    coordinates: [nation.coordinates[0], manifest.map.height - nation.coordinates[1]] as [number, number],
  }))

  return {
    gameMap: gameMap as unknown as GameMapImpl,
    mapName: manifest.name,
    nations: transformedNations,
    sourceType: 'server',
    originalSize: { width: manifest.map.width, height: manifest.map.height },
  }
}
export async function exportMapAsFile(
  mapState: MapEditorState,
  format: 'json' | 'bin',
  filename?: string,
): Promise<void> {
  const mapName = filename || mapState.mapName
  const sanitizedName = formatMapName(mapName)

  const gameMap = mapState.gameMap
  const width = gameMap.width()
  const height = gameMap.height()

  const terrainData = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const terrainType = gameMap.terrainType(gameMap.ref(x, y))
      const magnitude = 15

      terrainData[index] = (terrainType << 5) | magnitude
      if (terrainType !== 3) {
        terrainData[index] |= 1 << 7
      }
    }
  }

  const terrainDataWithShores = generateShoresForExport(terrainData, width, height)

  if (format === 'json') {
    await exportAsJSON(mapState, terrainDataWithShores, sanitizedName)
  } else {
    await exportAsBinary(mapState, terrainDataWithShores, sanitizedName)
  }
}

async function _renderMapThumbnail(
  mapState: MapEditorState,
  engine: EditorEngine | null,
  targetWidth = 512,
): Promise<Blob> {
  if (!engine) throw new Error('Editor engine not available for thumbnail generation')

  const canvas = engine.canvas
  if (!canvas) throw new Error('Canvas not available')

  const currentTransform = engine.transform
  const mapDimensions = engine.chunkManager.mapDimensions
  const canvasWidth = canvas.width
  const canvasHeight = canvas.height
  const scaleX = canvasWidth / mapDimensions.width
  const scaleY = canvasHeight / mapDimensions.height
  const fitZoom = Math.min(scaleX, scaleY) * 0.9

  engine.setTransform({ zoom: fitZoom, panX: 0, panY: 0 })
  await engine.render(mapState)
  await new Promise((resolve) => requestAnimationFrame(resolve))

  const aspectRatio = mapDimensions.height / mapDimensions.width
  const targetHeight = Math.round(targetWidth * aspectRatio)
  const thumbnailCanvas = document.createElement('canvas')
  thumbnailCanvas.width = targetWidth
  thumbnailCanvas.height = targetHeight
  const ctx = thumbnailCanvas.getContext('2d')

  if (!ctx) throw new Error('Failed to get context')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(canvas, 0, 0, canvasWidth, canvasHeight, 0, 0, targetWidth, targetHeight)

  return new Promise((resolve) =>
    thumbnailCanvas.toBlob(
      (blob) => {
        engine.setTransform(currentTransform)
        if (blob) resolve(blob)
        else throw new Error('Failed to create WebP blob')
      },
      'image/webp',
      0.9,
    ),
  )
}

export async function exportAsJSON(mapState: MapEditorState, terrainData: Uint8Array, filename: string): Promise<void> {
  const gameMap = mapState.gameMap
  const exportData = {
    format: 'ofm-map-json',
    version: '1.0',
    metadata: {
      name: mapState.mapName,
      width: gameMap.width(),
      height: gameMap.height(),
      landTiles: gameMap.numLandTiles(),
      exportDate: new Date().toISOString(),
    },
    terrain: Array.from(terrainData),
    nations: mapState.nations,
  }

  const jsonString = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  downloadBlob(blob, `${filename}.json`)
}

export async function exportAsBinary(
  _mapState: MapEditorState,
  terrainData: Uint8Array,
  filename: string,
): Promise<void> {
  const blob = new Blob([terrainData], { type: 'application/octet-stream' })
  downloadBlob(blob, `${filename}.bin`)
}
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function saveToLocalStorage(
  mapState: MapEditorState,
  mapName: string,
  engine?: EditorEngine | null,
): Promise<void> {
  await saveMapToLocalStorage(mapState, mapName, engine)
}

export async function exportMapWithThumbnail(
  mapState: MapEditorState,
  format: 'json' | 'bin',
  filename?: string,
  _engine?: EditorEngine | null,
): Promise<void> {
  return exportMapAsFile(mapState, format, filename)
}
