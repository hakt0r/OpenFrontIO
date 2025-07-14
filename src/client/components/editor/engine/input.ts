import { calculatePanTransform, calculateZoomTransform } from './actions'
import type { EditorEngine } from '../engine'
import type { MapEditorState, EditorTool, EditorTransform } from '../types'

export function handleMouseDown(
  e: MouseEvent,
  canvas: HTMLCanvasElement,
  onLeftClick: (x: number, y: number) => void,
  onRightDrag: (x: number, y: number) => void,
): void {
  const rect = canvas.getBoundingClientRect()
  const canvasX = e.clientX - rect.left
  const canvasY = e.clientY - rect.top

  if (e.button === 2) onRightDrag(canvasX, canvasY)
  else if (e.button === 0) onLeftClick(canvasX, canvasY)
}

export function handleLeftClick(
  canvasX: number,
  canvasY: number,
  engine: EditorEngine | null,
  mapState: MapEditorState,
  currentTool: EditorTool,
  onStartDrawing: () => void,
  onPaint: (x: number, y: number) => void,
): void {
  const coords = canvasToMapCoordinates(engine, canvasX, canvasY, mapState)

  if (!coords) return

  const isInBounds =
    coords.x >= 0 && coords.x < mapState.gameMap.width() && coords.y >= 0 && coords.y < mapState.gameMap.height()

  if (!isInBounds) return

  if (currentTool === 'paint' || currentTool === 'erase') onStartDrawing()

  onPaint(coords.x, coords.y)
}

export function handleDrag(
  canvasX: number,
  canvasY: number,
  lastMousePos: { x: number; y: number },
  transform: EditorTransform,
  engine: EditorEngine | null,
  onTransformChange: (transform: EditorTransform) => void,
  mapState?: MapEditorState,
): { x: number; y: number } {
  const deltaX = canvasX - lastMousePos.x
  const deltaY = canvasY - lastMousePos.y
  const newTransform = calculatePanTransform(transform, deltaX, deltaY)

  onTransformChange(newTransform)
  engine?.setTransform(newTransform)
  mapState && engine?.render(mapState)

  return { x: canvasX, y: canvasY }
}

export function handleDrawing(
  canvasX: number,
  canvasY: number,
  engine: EditorEngine | null,
  mapState: MapEditorState,
  onPaint: (x: number, y: number) => void,
): void {
  const coords = canvasToMapCoordinates(engine, canvasX, canvasY, mapState)

  if (!coords) return

  const isInBounds =
    coords.x >= 0 && coords.x < mapState.gameMap.width() && coords.y >= 0 && coords.y < mapState.gameMap.height()

  if (isInBounds) onPaint(coords.x, coords.y)
}

export function handleZoom(
  e: WheelEvent,
  canvas: HTMLCanvasElement,
  transform: EditorTransform,
  engine: EditorEngine | null,
  onTransformChange: (transform: EditorTransform) => void,
  mapState?: MapEditorState,
): void {
  if (!engine) return

  const rect = canvas.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  const mapDims = engine.chunkManager.mapDimensions
  const newTransform = calculateZoomTransform(
    transform,
    mouseX,
    mouseY,
    e.deltaY,
    mapDims.width,
    mapDims.height,
    canvas.width,
    canvas.height,
  )

  onTransformChange(newTransform)
  engine.setTransform(newTransform)
  mapState && engine.render(mapState)
}

function canvasToMapCoordinates(
  engine: EditorEngine | null,
  canvasX: number,
  canvasY: number,
  _mapState: MapEditorState,
): { x: number; y: number } | null {
  if (!engine) return null

  const coords = engine.canvasToMapCoordinates(canvasX, canvasY)
  if (!coords) return null

  return { x: coords.x, y: coords.y }
}
