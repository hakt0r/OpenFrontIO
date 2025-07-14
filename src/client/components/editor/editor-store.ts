import { Signal } from './engine/signals'
import type { Nation } from '../../../core/game/TerrainMapLoader'
import { TerrainType } from './../../../core/game/Game'
import { BrushType, EditorTool, type EditorTransform, type MapEditorState, type TerrainThresholds } from './types'
import type { MapEditor } from './index'
import type { EditorEngine } from './engine'
import { GameMapImpl } from '../../../core/game/GameMap'
import { createContext } from '@lit/context'

export const editorStore = {
  brushMagnitude: new Signal(15),
  brushSize: new Signal(5),
  currentBrush: new Signal<BrushType>('plains'),
  currentTerrain: new Signal<TerrainType>(TerrainType.Ocean),
  currentTool: new Signal<EditorTool>('paint'),
  draggedNation: new Signal<Nation | null>(null),
  dragStartPos: new Signal<{ x: number; y: number } | null>(null),
  editingNation: new Signal<Nation | null>(null),
  editor: new Signal<MapEditor>(null as unknown as MapEditor),
  engine: new Signal<EditorEngine | null>(null),
  errorMessage: new Signal(''),
  heightmapClampMax: new Signal(100),
  heightmapClampMin: new Signal(0),
  heightmapMaxSize: new Signal(2048),
  hoverCoords: new Signal<{ x: number; y: number } | null>(null),
  isDarkMode: new Signal(false),
  isDragging: new Signal(false),
  isDraggingNation: new Signal(false),
  isDrawing: new Signal(false),
  isEditingNation: new Signal(false),
  isHeightmapVisible: new Signal(false),
  isNationsVisible: new Signal(false),
  isOpen: new Signal(false),
  isSaveMapVisible: new Signal(false),
  isTerrainVisible: new Signal(true),
  lastMousePos: new Signal({ x: 0, y: 0 }),
  pendingNationCoords: new Signal<[number, number] | null>(null),
  renderMode: new Signal(0),
  hoverTerrainInfo: new Signal<{
    type: string
    emoji: string
    magnitude: number
  } | null>(null),
  mapState: new Signal<MapEditorState>({
    gameMap: null as unknown as GameMapImpl,
    nations: [],
    mapName: '',
    sourceType: 'new',
  }),
  terrainThresholds: new Signal<TerrainThresholds>({
    ocean: 0.4,
    plains: 0.5,
    highland: 0.7,
    mountain: 0.8,
  }),
  transform: new Signal<EditorTransform>({
    zoom: 1,
    panX: 0,
    panY: 0,
  }),
}

export type EditorStore = typeof editorStore
export type EditorStoreKey = keyof EditorStore
export const editorContext = createContext<EditorStore>(Symbol('EditorStoreContext'))
