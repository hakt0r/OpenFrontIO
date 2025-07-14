import { GameMapImpl } from '../../../../core/game/GameMap'
import {
  DEFAULT_MAP_WIDTH,
  DEFAULT_MAP_HEIGHT,
  INITIAL_MAP_CENTER_RADIUS,
  LAND_BIT,
  DEFAULT_PLAINS_MAGNITUDE,
  INITIAL_MAP_NAME,
  OCEAN_VALUE,
} from './constants'
import type { EditorEngine } from '../engine'
import {
  BrushType,
  EditorTool,
  type EditorTransform,
  type MapCreationData,
  type MapEditorState,
  type TerrainThresholds,
  type EditorPosition,
  type NationData,
  createGPUTerrainValue,
  getEngineBrushValues,
} from '../types'
import { calculateFitZoom, isPositionInBounds } from './coordinates'
import { exportMapAsFile, saveToLocalStorage } from './io'
import { TerrainType } from '../../../../core/game/Game'
import type { Nation } from '../../../../core/game/TerrainMapLoader'
import { EditorStore } from '../editor-store'

export function calculateZoomTransform(
  currentTransform: EditorTransform,
  mouseX: number,
  mouseY: number,
  zoomDirection: number,
  mapWidth: number,
  mapHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): EditorTransform {
  const zoomFactor = zoomDirection > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.1, Math.min(10, currentTransform.zoom * zoomFactor))

  const screenX = mouseX - canvasWidth / 2
  const screenY = -(mouseY - canvasHeight / 2)

  const oldZoom = currentTransform.zoom
  const oldPanX = currentTransform.panX
  const oldPanY = -currentTransform.panY

  const worldX = (screenX - oldPanX) / oldZoom + mapWidth / 2
  const worldY = (screenY - oldPanY) / oldZoom + mapHeight / 2

  const newPanX = screenX - (worldX - mapWidth / 2) * newZoom
  const newPanY = screenY - (worldY - mapHeight / 2) * newZoom

  return {
    zoom: newZoom,
    panX: newPanX,
    panY: -newPanY,
  }
}

export function calculatePanTransform(
  currentTransform: EditorTransform,
  deltaX: number,
  deltaY: number,
): EditorTransform {
  return {
    zoom: currentTransform.zoom,
    panX: currentTransform.panX + deltaX,
    panY: currentTransform.panY + deltaY,
  }
}

export function updateTerrainThreshold(
  thresholds: TerrainThresholds,
  thresholdName: string,
  value: number,
): TerrainThresholds {
  return { ...thresholds, [thresholdName]: value }
}

export function initializeMap(): MapEditorState {
  const width = DEFAULT_MAP_WIDTH
  const height = DEFAULT_MAP_HEIGHT
  const terrainData = new Uint8Array(width * height)

  let landTiles = 0
  const centerX = Math.floor(width / 2)
  const centerY = Math.floor(height / 2)

  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      if (distance <= INITIAL_MAP_CENTER_RADIUS) {
        terrainData[index] = LAND_BIT | DEFAULT_PLAINS_MAGNITUDE
        landTiles++
      } else terrainData[index] = 3 << 5
    }

  const gameMap = new GameMapImpl(width, height, terrainData, landTiles)

  return {
    gameMap,
    nations: [],
    mapName: INITIAL_MAP_NAME,
    sourceType: 'new',
    originalSize: { width, height },
  }
}

export function centerAndFitMap(mapState: MapEditorState, canvas: HTMLCanvasElement): EditorTransform {
  const mapWidth = mapState.gameMap.width()
  const mapHeight = mapState.gameMap.height()
  return calculateFitZoom(mapWidth, mapHeight, canvas.width, canvas.height)
}

export function createNewMap(width: number, height: number, name: string): MapEditorState {
  const terrainData = new Uint8Array(width * height)
  terrainData.fill(OCEAN_VALUE)

  const gameMap = new GameMapImpl(width, height, terrainData, 0)

  return {
    gameMap: gameMap,
    nations: [],
    mapName: name,
    sourceType: 'new',
    originalSize: { width, height },
  }
}

export async function handleNewMapSubmit(
  event: CustomEvent,
  onSuccess: (mapState: MapEditorState) => void,
): Promise<void> {
  const { width, height, name } = event.detail as MapCreationData
  const mapState = createNewMap(width, height, name)
  onSuccess(mapState)
}

export async function handleSaveMapSubmit(
  event: CustomEvent,
  mapState: MapEditorState,
  onProgress: () => void,
  onError: (error: unknown) => void,
  engine?: EditorEngine | null,
): Promise<void> {
  const { mapName, saveType, format } = event.detail

  try {
    onProgress()
    if (saveType === 'local') await saveToLocalStorage(mapState, mapName, engine)
    else await exportMapAsFile(mapState, format || 'json', mapName)
  } catch (error) {
    onError(error)
  }
}
export function centerAndFit(
  mapState: MapEditorState,
  canvas: HTMLCanvasElement,
  engine: EditorEngine | null,
  onTransformChange: (transform: EditorTransform) => void,
): void {
  if (!engine || !canvas) return

  const mapDimensions = engine.chunkManager.mapDimensions
  if (mapDimensions.width === 0 || mapDimensions.height === 0) return

  const rect = canvas.getBoundingClientRect()
  const scaleX = rect.width / mapDimensions.width
  const scaleY = rect.height / mapDimensions.height
  const zoom = Math.min(scaleX, scaleY) * 0.9

  const transform: EditorTransform = {
    zoom,
    panX: 0,
    panY: 0,
  }

  onTransformChange(transform)
  engine.setTransform(transform)
  engine.render(mapState)
}
export function handleHeightmapFileUpload(event: Event, onImageLoaded: (image: HTMLImageElement) => void): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      onImageLoaded(img)
    }
    img.src = e.target?.result as string
  }
  reader.readAsDataURL(file)

  input.value = ''
}

export function exitHeightmapMode(
  _engine: EditorEngine | null,
  _getCurrentMapState: () => MapEditorState,
  onExit: () => void,
): void {
  onExit()
}

export async function updateMaterialAndMapState(
  engine: EditorEngine,
  heightmapImage: HTMLImageElement,
  heightmapMaxSize: number,
  terrainThresholds: TerrainThresholds,
  heightmapClampMin: number,
  heightmapClampMax: number,
): Promise<MapEditorState | null> {
  try {
    if (!engine.chunkManager.terrainTexture) {
      await engine.loadHeightmapImage(heightmapImage, heightmapMaxSize)
    }

    engine.chunkManager.applyScalingAndChunk()

    engine.setTerrainThresholds(terrainThresholds, heightmapClampMin, heightmapClampMax)

    const mapState = await engine.createMapState()
    return mapState
  } catch (error) {
    console.error('Failed to process heightmap:', error)
    return null
  }
}

export function createDebouncedHeightmapProcessor(processFunction: () => Promise<void>): () => void {
  let timeoutId: number

  return () => {
    clearTimeout(timeoutId)
    timeoutId = window.setTimeout(async () => {
      await processFunction()
    }, 300)
  }
}

export function updateTerrainThresholds(
  newThresholds: TerrainThresholds,
  onThresholdsChange: (thresholds: TerrainThresholds) => void,
  onProcessHeightmap?: () => void,
): void {
  onThresholdsChange(newThresholds)
  onProcessHeightmap?.()
}

export function paintAtPosition(context: EditorStore, x: number, y: number): void {
  if (!context.engine.value) return

  let [engineBrushType, brushMagnitude] = getEngineBrushValues(context)

  if (context.currentTool.value === 'erase') {
    brushMagnitude = createGPUTerrainValue(TerrainType.Ocean)
  } else if (
    context.currentBrush.value === 'gaussianblur' ||
    context.currentBrush.value === 'raiseterrain' ||
    context.currentBrush.value === 'lowerterrain'
  )
    brushMagnitude = context.brushMagnitude.value
  else brushMagnitude = createGPUTerrainValue(context.currentTerrain.value)

  context.engine.value.paintBrush(
    x,
    y,
    context.brushSize.value,
    engineBrushType,
    brushMagnitude,
    context.brushMagnitude.value,
  )
}

export function switchTool(currentTool: EditorTool, direction: number): EditorTool {
  const currentIndex = EditorTool.indexOf(currentTool)
  const newIndex = (currentIndex + direction + EditorTool.length) % EditorTool.length
  return EditorTool[newIndex]
}

export function changeBrushSize(currentSize: number, direction: number): number {
  return Math.max(1, Math.min(20, currentSize + direction))
}

export function switchBrushType(currentBrush: BrushType, direction: number): BrushType {
  const currentIndex = BrushType.indexOf(currentBrush)
  const newIndex = (currentIndex + direction + BrushType.length) % BrushType.length
  return BrushType[newIndex]
}

export function placeNation(mapState: MapEditorState, position: EditorPosition, nationData: NationData): boolean {
  const gameMap = mapState.gameMap
  const mapX = Math.floor(position.x)
  const mapY = Math.floor(position.y)

  if (!gameMap || !isPositionInBounds({ x: mapX, y: mapY }, { width: gameMap.width(), height: gameMap.height() }))
    return false

  const nation: Nation = {
    coordinates: [mapX, mapY],
    flag: nationData.flag,
    name: nationData.name,
    strength: nationData.strength,
  }

  mapState.nations = [...mapState.nations, nation]
  return true
}

export function removeNation(mapState: MapEditorState, nation: Nation): boolean {
  const index = mapState.nations.indexOf(nation)
  if (index > -1) {
    mapState.nations = mapState.nations.filter((n) => n !== nation)
    return true
  }
  return false
}

export function editNation(nation: Nation, nationData: NationData): void {
  nation.name = nationData.name
  nation.flag = nationData.flag
  nation.strength = nationData.strength
}

export function findNationAt(mapState: MapEditorState, position: EditorPosition, tolerance = 10): Nation | null {
  const mapX = Math.floor(position.x)
  const mapY = Math.floor(position.y)

  for (const nation of mapState.nations) {
    const dx = nation.coordinates[0] - mapX
    const dy = nation.coordinates[1] - mapY
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance <= tolerance) return nation
  }

  return null
}

export function validateNationPosition(
  mapState: MapEditorState,
  position: EditorPosition,
  excludeNation?: Nation,
): boolean {
  const gameMap = mapState.gameMap
  const mapX = Math.floor(position.x)
  const mapY = Math.floor(position.y)

  if (!gameMap || !isPositionInBounds({ x: mapX, y: mapY }, { width: gameMap.width(), height: gameMap.height() }))
    return false

  for (const nation of mapState.nations) {
    if (excludeNation && nation === excludeNation) continue

    const dx = nation.coordinates[0] - mapX
    const dy = nation.coordinates[1] - mapY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < 20) return false
  }

  return true
}

export function moveNation(mapState: MapEditorState, nation: Nation, newPosition: EditorPosition): boolean {
  if (!validateNationPosition(mapState, newPosition, nation)) return false

  nation.coordinates = [Math.floor(newPosition.x), Math.floor(newPosition.y)]
  return true
}

export function getNationsSummary(mapState: MapEditorState): {
  totalNations: number
  averageStrength: number
  strongestNation: Nation | null
  weakestNation: Nation | null
} {
  const nations = mapState.nations

  if (nations.length === 0)
    return {
      totalNations: 0,
      averageStrength: 0,
      strongestNation: null,
      weakestNation: null,
    }

  const totalStrength = nations.reduce((sum, nation) => sum + nation.strength, 0)
  const averageStrength = totalStrength / nations.length

  const strongestNation = nations.reduce((strongest, nation) =>
    nation.strength > strongest.strength ? nation : strongest,
  )

  const weakestNation = nations.reduce((weakest, nation) => (nation.strength < weakest.strength ? nation : weakest))

  return {
    totalNations: nations.length,
    averageStrength: Math.round(averageStrength),
    strongestNation,
    weakestNation,
  }
}

export function handleNationSubmit(
  event: CustomEvent,
  mapState: MapEditorState,
  editingNation: Nation | null,
  isEditingNation: boolean,
  pendingNationCoords: [number, number] | null,
  onSuccess: () => void,
): void {
  const nationData = event.detail as NationData

  if (isEditingNation && editingNation) editNation(editingNation, nationData)
  else if (pendingNationCoords) {
    const [x, y] = pendingNationCoords
    placeNation(mapState, { x, y }, nationData)
  }

  onSuccess()
}
