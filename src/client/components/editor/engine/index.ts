import type { EditorTransform, MapEditorState, TerrainThresholds } from '../types'
import type { Nation } from '../../../../core/game/TerrainMapLoader'
import type { RenderMode, EditorEngineOptions, BrushType, TerrainColors } from './types'
import { EditorRenderer } from './renderer/editor'
import type { ChunkManager } from './renderer/chunk'
import { Matrix3, Vector2 } from 'three'

export class EditorEngine {
  readonly canvas: HTMLCanvasElement
  readonly renderer: EditorRenderer
  readonly chunkManager: ChunkManager

  transform: EditorTransform = { zoom: 1, panX: 0, panY: 0 }

  constructor(canvas: HTMLCanvasElement, options: EditorEngineOptions = {}) {
    this.canvas = canvas
    this.renderer = new EditorRenderer(this, options)
    this.chunkManager = this.renderer.chunkManager
  }

  async initialize(): Promise<void> {
    await this.renderer.initialize()
  }

  async loadServerMap(terrainData: Uint8Array, width: number, height: number): Promise<void> {
    await this.renderer.loadServerMap(terrainData, width, height)
  }

  async loadHeightmapImage(image: HTMLImageElement, maxSize = 4096): Promise<{ width: number; height: number }> {
    return this.renderer.loadHeightmapImage(image, maxSize)
  }

  updateTerrainColors(colors: TerrainColors): void {
    this.renderer.updateTerrainColors(colors)
  }

  async extractTerrainData(): Promise<Uint8Array | null> {
    return this.renderer.extractTerrainData()
  }

  async createMapState(mapName = 'Heightmap'): Promise<MapEditorState | null> {
    return this.renderer.createMapState(mapName)
  }

  async paintBrush(
    mapX: number,
    mapY: number,
    brushSize: number,
    brushType?: BrushType,
    brushValue?: number,
    brushMagnitude = 15,
  ): Promise<void> {
    await this.renderer.paintBrush(mapX, mapY, brushSize, brushType, brushValue, brushMagnitude)
  }

  async render(mapState?: MapEditorState): Promise<void> {
    await this.renderer.render(mapState)
  }

  setUniform<T>(uniform: keyof typeof this.renderer.material.uniforms, value: T): void {
    const material = this.renderer.material
    const uniforms = material?.uniforms
    if (!uniforms) return
    uniforms[uniform as keyof typeof uniforms].value = value as (typeof uniforms)[keyof typeof uniforms]
    material.needsUpdate = true
  }

  setUniforms<T>(values: Record<keyof typeof this.renderer.material.uniforms, T>): void {
    const material = this.renderer.material
    const uniforms = material?.uniforms
    if (!uniforms) return
    Object.entries(values).forEach(([key, value]) => {
      uniforms[key as keyof typeof uniforms].value = value as (typeof uniforms)[keyof typeof uniforms]
    })
    material.needsUpdate = true
  }

  setTransform(transform: EditorTransform): void {
    this.setUniforms({
      u_transform: new Matrix3(transform.zoom, 0, transform.panX, 0, transform.zoom, transform.panY, 0, 0, 1),
      u_resolution: new Vector2(this.canvas.width, this.canvas.height),
    })
  }

  setBrushCenter(x: number, y: number): void {
    this.setUniform('u_brushCenter', new Vector2(x, y))
  }

  setBrushRadius(radius: number): void {
    this.setUniform('u_brushRadius', radius)
  }

  setBrushType(brushType: BrushType): void {
    this.setUniform('u_brushType', brushType)
  }

  setBrushMagnitude(magnitude: number): void {
    this.setUniform('u_brushMagnitude', magnitude)
  }

  setBrushValue(value: number): void {
    this.setUniform('u_brushValue', value)
  }

  setRenderMode(mode: RenderMode): void {
    this.setUniform('u_renderMode', mode)
  }

  setTerrainThresholds(terrainThresholds: TerrainThresholds, clampMin = 0, clampMax = 1): void {
    this.renderer.setTerrainThresholds(terrainThresholds, clampMin, clampMax)
  }

  resize(): void {
    this.renderer.resize()
  }

  async debugRenderSample(): Promise<void> {
    await this.renderer.debugRenderSample()
  }

  get heightmapImage(): HTMLImageElement | null {
    return this.chunkManager.originalHeightmapImage
  }

  /**
   * Clear the heightmap image (used when exiting heightmap mode)
   */
  clearHeightmapImage(): void {
    this.chunkManager.clearHeightmapImage()
  }

  get dataSourceInfo() {
    return this.chunkManager.dataSourceInfo
  }

  hitTestNation(x: number, y: number, nations?: Nation[]): unknown {
    if (nations && nations.length > 0) {
      const mockHit = nations.find((nation) => {
        if (!nation.coordinates) return false
        const dist = Math.sqrt((nation.coordinates[0] - x) ** 2 + (nation.coordinates[1] - y) ** 2)
        return dist < 50
      })
      return mockHit ?? null
    }
    return null
  }

  canvasToMapCoordinates(canvasX: number, canvasY: number): { x: number; y: number } {
    return this.renderer.canvasToMapCoordinates(canvasX, canvasY)
  }

  dispose(): void {
    this.renderer.dispose()
  }
}
