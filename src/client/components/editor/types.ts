import type { Nation as NationLoaderData } from '../../../core/game/TerrainMapLoader'
export type Nation = NationLoaderData
import type { GameMapImpl } from '../../../core/game/GameMap'
import { TerrainType } from '../../../core/game/Game'
import { BrushType as EngineBrushType } from './engine/types'
import type { EditorStore } from './context'

export interface MapEditorState {
  gameMap: GameMapImpl
  nations: Nation[]
  mapName: string
  sourceType?: 'server' | 'local' | 'new' | 'heightmap'
  originalSize?: { width: number; height: number }
}

export const EditorTool = ['paint', 'erase', 'nation'] as const
export type EditorTool = (typeof EditorTool)[number]

export const BrushType = [
  'ocean',
  'lake',
  'plains',
  'highland',
  'mountain',
  'gaussianblur',
  'raiseterrain',
  'lowerterrain'
] as const
export type BrushType = (typeof BrushType)[number]

export function getEngineBrushValues(context: EditorStore): [EngineBrushType, number] {
  const tool = context.currentTool.value
  const brush = context.currentBrush.value
  const magnitude = context.brushMagnitude.value

  switch (tool) {
    case 'paint':
      switch (brush) {
        case 'ocean':
        case 'lake':
        case 'plains':
        case 'highland':
        case 'mountain':
          return [EngineBrushType.Paint, magnitude]
        case 'gaussianblur':
          return [EngineBrushType.Smooth, magnitude]
        case 'raiseterrain':
          return [EngineBrushType.Raise, magnitude]
        case 'lowerterrain':
          return [EngineBrushType.Lower, magnitude]
        default:
          throw new Error(`Unknown brush: ${brush}`)
      }
    case 'erase':
      return [EngineBrushType.Erase, magnitude]
    case 'nation':
      return [EngineBrushType.Paint, magnitude]
    default:
      throw new Error(`Unknown tool: ${tool}`)
  }
}

export const BrushEmoji: Record<EditorTool | BrushType, string> = {
  paint: '🎨',
  erase: '🧹',
  nation: '👑',
  ocean: '🌊',
  lake: '💧',
  plains: '🌾',
  highland: '🏕️',
  mountain: '⛰️',
  gaussianblur: '🌪️',
  raiseterrain: '📈',
  lowerterrain: '📉'
}

export const BrushName: Record<BrushType, string> = {
  ocean: 'Ocean',
  lake: 'Lake',
  plains: 'Plains',
  highland: 'Highland',
  mountain: 'Mountain',
  gaussianblur: 'Gaussian Blur',
  raiseterrain: 'Raise Terrain',
  lowerterrain: 'Lower Terrain'
}

export const BrushCursor: Record<EditorTool, string> = {
  paint: 'crosshair',
  erase: 'crosshair',
  nation: 'crosshair'
}

export interface EditorPosition {
  x: number
  y: number
}

export interface EditorBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface TerrainThresholds {
  ocean: number
  plains: number
  highland: number
  mountain: number
}

export interface EditorTransform {
  zoom: number
  panX: number
  panY: number
}

export interface NationData {
  name: string
  flag: string
  strength: number
}

export interface MapCreationData {
  width: number
  height: number
  name: string
}

export interface MapSaveData {
  mapName: string
  saveType: 'local' | 'export'
}

export interface ModalEventDetail<T> {
  detail: T
}

export interface ErrorEvent {
  message: string
}

export interface NationModalData {
  name: string
  flag: string
  strength: number
}

export interface ValidationResult {
  isValid: boolean
  message?: string
}
export interface GameMapWithTerrain extends Omit<GameMapImpl, 'terrain'> {
  terrain: Uint8Array
}

export interface SidebarTool {
  id: string
  name: string
  emoji: string
  title: string
}

export interface SidebarBrush {
  id: string
  name: string
  emoji: string
  title: string
}

export interface SidebarControl {
  id: string
  name: string
  type: 'range' | 'number' | 'select'
  value: number | string
  min?: number
  max?: number
  step?: number
  options?: { value: string | number; label: string }[]
  helpText?: string
}

export interface SidebarConfig {
  tools: SidebarTool[]
  brushes: SidebarBrush[]
  controls: SidebarControl[]
}

export const defaultTerrainThresholds: TerrainThresholds = {
  ocean: 0.2,
  plains: 0.45,
  highland: 0.7,
  mountain: 1
}

export function createGPUTerrainValue(terrain: TerrainType): number {
  switch (terrain) {
    case TerrainType.Plains:
      return 1 * 32 + 15 + 128
    case TerrainType.Highland:
      return 2 * 32 + 15 + 128
    case TerrainType.Mountain:
      return 3 * 32 + 15 + 128
    case TerrainType.Ocean:
      return 0 * 32 + 15 + 0
    case TerrainType.Lake:
      return 0 * 32 + 5 + 0
    default:
      return 0 * 32 + 15 + 0
  }
}
export const renderModeName = ['Edit', 'Satellite', 'Heightmap', 'Offscreen', 'Debug'] as const
export const renderModeIcon = ['🎨', '🛰️', '🗻', '🔍', '🐞'] as const
export type RenderMode = (typeof renderModeName)[number]
export type RenderModeIcon = (typeof renderModeIcon)[number]
export type StyleMap = {
  [key: string]: string | StyleMap | null
}
