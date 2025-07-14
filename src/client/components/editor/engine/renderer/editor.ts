import { BaseRenderer, type BaseRendererOptions } from '.'
import { BrushType } from '../types'
import { ChunkManager } from '../renderer/chunk'
import { GameMapImpl } from '../../../../../core/game/GameMap'
import { getAffectedChunks, CHUNK_SIZE } from '../renderer/chunk'
import { OffscreenRenderer } from './offscreen'
import * as THREE from 'three'
import type { EditorEngine } from '..'
import type { EditorTransform, MapEditorState, TerrainThresholds } from '../../types'
import type { RenderMode, TerrainColors } from '../types'

export class EditorRenderer extends BaseRenderer {
  public chunkManager: ChunkManager
  private transform: EditorTransform = { zoom: 1, panX: 0, panY: 0 }
  private renderMode: RenderMode = 0
  public needsRerender = false
  private brushCenter: { x: number; y: number } = { x: -1000, y: -1000 }
  private brushRadius = 5
  private brushType: BrushType = BrushType.Paint
  private brushMagnitude = 15

  constructor(
    private engine: EditorEngine,
    options: BaseRendererOptions = {},
  ) {
    super(engine.canvas, options)
    this.chunkManager = new ChunkManager(this)
  }

  async initialize(): Promise<void> {
    await super.initialize()
    this.material && this.chunkManager.setMaterial(this.material)
  }

  async loadServerMap(terrainData: Uint8Array, width: number, height: number): Promise<void> {
    if (!this.isInitialized) throw new Error('Engine not initialized')

    this.chunkManager.loadFromBaseMap(terrainData, width, height)

    this.needsRerender = true
    this.centerAndFitMap(width, height)
  }

  async loadHeightmapImage(image: HTMLImageElement, maxSize = 4096): Promise<{ width: number; height: number }> {
    if (!this.isInitialized) throw new Error('Engine not initialized')

    const { width, height } = this.chunkManager.loadHeightmapImage(image, maxSize)

    this.needsRerender = true
    this.centerAndFitMap(width, height)

    return { width, height }
  }

  setTerrainThresholds(terrainThresholds: TerrainThresholds, clampMin = 0, clampMax = 1): void {
    if (!this.material) return

    this.material.uniforms.u_terrainThresholds.value.set(
      terrainThresholds.ocean,
      terrainThresholds.plains,
      terrainThresholds.highland,
      terrainThresholds.mountain,
    )

    this.material.uniforms.u_clampMin.value = clampMin
    this.material.uniforms.u_clampMax.value = clampMax
    this.renderMode = 0
    this.needsRerender = true
  }

  updateTerrainColors(colors: TerrainColors): void {
    super.updateTerrainColors(colors)
    this.needsRerender = true
  }

  async extractTerrainData(): Promise<Uint8Array | null> {
    if (!this.isInitialized) throw new Error('Engine not initialized')
    return this.chunkManager.extractTerrainData()
  }

  async createMapState(mapName = 'Heightmap'): Promise<MapEditorState | null> {
    const terrainData = await this.extractTerrainData()
    if (!terrainData) return null

    const mapDimensions = this.chunkManager.mapDimensions
    let landTiles = 0
    for (let i = 0; i < terrainData.length; i++) {
      if (terrainData[i] & (1 << 7)) landTiles++
    }

    const gameMap = new GameMapImpl(mapDimensions.width, mapDimensions.height, terrainData, landTiles)
    return {
      gameMap,
      nations: [],
      mapName: `${mapName} (${mapDimensions.width}x${mapDimensions.height})`,
      sourceType: 'heightmap',
      originalSize: { width: mapDimensions.width, height: mapDimensions.height },
    }
  }

  async paintBrush(
    mapX: number,
    mapY: number,
    brushSize: number,
    brushType?: BrushType,
    brushValue?: number,
    brushMagnitude?: number,
  ): Promise<void> {
    if (!this.isInitialized || !this.material) throw new Error('Engine not initialized')

    const actualBrushType = brushType ?? this.brushType
    const actualBrushMagnitude = brushMagnitude ?? this.brushMagnitude

    const currentStrokeCount = this.material.uniforms.u_strokeCount.value
    const strokeIndexForThisPaint = currentStrokeCount

    if (currentStrokeCount < 256) {
      const strokeCenters = this.material.uniforms.u_strokeCenters.value
      strokeCenters[currentStrokeCount * 2] = mapX
      strokeCenters[currentStrokeCount * 2 + 1] = mapY
      this.material.uniforms.u_strokeCount.value = currentStrokeCount + 1
    }

    const affectedChunks = getAffectedChunks(mapX, mapY, brushSize)
    const terrainTexture = this.chunkManager.terrainTexture
    if (!terrainTexture) return

    const mapDims = this.chunkManager.mapDimensions

    for (const chunkCoord of affectedChunks) {
      const result = await OffscreenRenderer.render({
        material: this.material,
        chunkX: chunkCoord.chunkX,
        chunkY: chunkCoord.chunkY,
        brushX: mapX,
        brushY: mapY,
        brushRadius: brushSize,
        brushType: actualBrushType,
        brushValue: brushValue ?? 0,
        brushMagnitude: actualBrushMagnitude,
        terrainTexture,
        mapWidth: mapDims.width,
        mapHeight: mapDims.height,
      })

      if (result) {
        this.updateChunkInTexture(chunkCoord.chunkX, chunkCoord.chunkY, result)
      }
    }

    this.removeProcessedStrokes(strokeIndexForThisPaint + 1)

    this.needsRerender = true
  }

  async render(mapState?: MapEditorState): Promise<void> {
    if (!this.isInitialized || !this.material) return

    const mapDims = this.chunkManager.mapDimensions
    this.updateTransformMatrix(mapDims)
    this.updateMaterialUniforms()
    this.updateCameraForTransform()

    if (mapState && this.material) {
      const nations = mapState.nations || []
      this.material.uniforms.u_nationCount.value = Math.min(nations.length, 64)

      const positions = new Float32Array(128)
      for (let i = 0; i < Math.min(nations.length, 64); i++) {
        const nation = nations[i]
        positions[i * 2] = nation.coordinates[0]
        positions[i * 2 + 1] = nation.coordinates[1]
      }
      this.material.uniforms.u_nationPositions.value = positions
    }

    this.renderer.render(this.scene, this.camera)
    this.needsRerender = false
  }

  setBrushPreview(x: number, y: number, radius: number): void {
    this.brushCenter = { x, y }
    this.brushRadius = radius
    this.needsRerender = true
  }

  clearBrushPreview(): void {
    this.brushCenter = { x: -1000, y: -1000 }
    this.needsRerender = true
  }

  setTransform(transform: EditorTransform): void {
    this.transform = transform
    this.needsRerender = true
  }

  setRenderMode(mode: RenderMode): void {
    this.renderMode = mode
    this.needsRerender = true
  }

  setBrushType(brushType: BrushType): void {
    this.brushType = brushType

    if (this.material) {
      this.material.uniforms.u_brushType.value = brushType
    }
  }

  setBrushMagnitude(magnitude: number): void {
    this.brushMagnitude = magnitude
  }

  clearStrokes(): void {
    if (!this.material) return
    this.material.uniforms.u_strokeCount.value = 0

    const strokeCenters = this.material.uniforms.u_strokeCenters.value
    strokeCenters.fill(0)
  }

  removeProcessedStrokes(processedCount: number): void {
    if (!this.material) return

    const currentStrokeCount = this.material.uniforms.u_strokeCount.value
    const remainingStrokeCount = Math.max(0, currentStrokeCount - processedCount)

    if (remainingStrokeCount === 0) {
      this.clearStrokes()
      return
    }

    const strokeCenters = this.material.uniforms.u_strokeCenters.value
    for (let i = 0; i < remainingStrokeCount; i++) {
      strokeCenters[i * 2] = strokeCenters[(processedCount + i) * 2]
      strokeCenters[i * 2 + 1] = strokeCenters[(processedCount + i) * 2 + 1]
    }

    for (let i = remainingStrokeCount * 2; i < strokeCenters.length; i++) {
      strokeCenters[i] = 0
    }

    this.material.uniforms.u_strokeCount.value = remainingStrokeCount
  }

  async debugRenderSample(): Promise<void> {
    const terrainData = await this.extractTerrainData()
    if (terrainData) {
      console.log('Debug terrain sample:', terrainData.slice(0, 10))
    }
  }

  protected updateCamera(): void {
    this.updateCameraForTransform()
  }

  resize(): void {
    if (!this.isInitialized) return

    const canvas = this.canvas as HTMLCanvasElement
    super.resize(canvas.width, canvas.height)
    this.needsRerender = true
  }

  forceRerender(): void {
    this.needsRerender = true
  }

  canvasToMapCoordinates(canvasX: number, canvasY: number): { x: number; y: number } {
    const canvas = this.canvas as HTMLCanvasElement
    const mapDims = this.chunkManager.mapDimensions
    if (mapDims.width === 0 || mapDims.height === 0) {
      return { x: 0, y: 0 }
    }

    const screenX = canvasX - canvas.width / 2
    const screenY = -(canvasY - canvas.height / 2)

    const zoom = this.transform.zoom
    const panX = this.transform.panX
    const panY = -this.transform.panY

    const worldX = (screenX - panX) / zoom + mapDims.width / 2
    const worldY = (screenY - panY) / zoom + mapDims.height / 2

    return { x: worldX, y: worldY }
  }

  private centerAndFitMap(width: number, height: number): void {
    const baseSize = 600
    const mapSize = Math.max(width, height)
    const zoom = Math.min(1.0, (baseSize / mapSize) * 0.9)

    this.setTransform({ zoom, panX: 0, panY: 0 })
  }

  private updateTransformMatrix(mapDims: { width: number; height: number }): void {
    if (!this.material) return

    const zoom = this.transform.zoom
    const panX = this.transform.panX
    const panY = -this.transform.panY

    const centerOffsetX = -mapDims.width / 2
    const centerOffsetY = -mapDims.height / 2

    const transformMatrix = new THREE.Matrix3()
    transformMatrix.set(zoom, 0, centerOffsetX * zoom + panX, 0, zoom, centerOffsetY * zoom + panY, 0, 0, 1)

    this.material.uniforms.u_transform.value = transformMatrix
  }

  private updateMaterialUniforms(): void {
    if (!this.material) return

    this.material.uniforms.u_time.value = (Date.now() % 100000) / 10000
    this.material.uniforms.u_renderMode.value = this.renderMode
    this.material.uniforms.u_brushCenter.value.set(this.brushCenter.x, this.brushCenter.y)
    this.material.uniforms.u_brushRadius.value = this.brushRadius
    this.material.uniforms.u_brushType.value = this.brushType

    const canvas = this.canvas as HTMLCanvasElement
    this.material.uniforms.u_resolution.value.set(canvas.width, canvas.height)
  }

  private updateCameraForTransform(): void {
    const canvas = this.canvas as HTMLCanvasElement
    const halfWidth = canvas.width / 2
    const halfHeight = canvas.height / 2

    this.camera.left = -halfWidth
    this.camera.right = halfWidth
    this.camera.top = halfHeight
    this.camera.bottom = -halfHeight
    this.camera.position.set(0, 0, 1)
    this.camera.updateProjectionMatrix()
  }

  private updateChunkInTexture(chunkX: number, chunkY: number, chunkData: Uint8Array): void {
    const terrainTexture = this.chunkManager.terrainTexture
    if (!terrainTexture) return

    const mapDims = this.chunkManager.mapDimensions
    const startX = chunkX * CHUNK_SIZE
    const startY = chunkY * CHUNK_SIZE
    const endX = Math.min(startX + CHUNK_SIZE, mapDims.width)
    const endY = Math.min(startY + CHUNK_SIZE, mapDims.height)

    const currentData = terrainTexture.source.data.data ?? terrainTexture.image.data
    const fullData = new Uint8Array(currentData)

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const chunkLocalX = x - startX
        const chunkLocalY = y - startY

        const chunkIndex = chunkLocalY * CHUNK_SIZE + chunkLocalX
        const fullIndex = y * mapDims.width + x

        if (chunkIndex < chunkData.length && fullIndex < fullData.length) {
          fullData[fullIndex] = chunkData[chunkIndex * 4]
        }
      }
    }

    this.chunkManager.updateTerrainTexture(fullData)
  }

  async rescaleHeightmapImage(maxSize = 4096): Promise<void> {
    if (!this.isInitialized) throw new Error('Engine not initialized')

    this.chunkManager.rescaleHeightmapImage(maxSize)
    this.centerAndFitMap(this.chunkManager.mapWidth, this.chunkManager.mapHeight)
    this.needsRerender = true
  }

  dispose(): void {
    this.chunkManager.dispose()
    OffscreenRenderer.garbageCollect()
    super.dispose()
  }
}
