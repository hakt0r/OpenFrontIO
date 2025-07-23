import './Overlay'
import { customElement, property, query } from 'lit/decorators.js'
import { DEBUG_RENDER_MODE } from '../engine/debug'
import { EditorEngine } from '../engine'
import { extractTerrainColorsFromTheme } from '../engine/theme'
import { html } from 'lit'
import type { EditorEngineOptions } from '../engine/types'
import { TailwindElement } from './TailwindElement'

@customElement('webgl-canvas')
export class Canvas extends TailwindElement {
  protected props = ['mapState', 'transform', 'hoverCoords', 'hoverTerrainInfo', 'isDarkMode']
  @query('#map-canvas') public canvas!: HTMLCanvasElement

  private renderLoop: number | null = null

  async firstUpdated(): Promise<void> {
    await this.initializeEngine()
    this.setupMouseLeaveHandler()
    this.startRenderLoop()
    await this.updateComplete
    this.resizeCanvas()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.stopRenderLoop()
    this.engine?.dispose()
    if (this.canvas) this.canvas.removeEventListener('mouseleave', this.onMouseLeave)
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties)
    if (!changedProperties.has('editor')) return
    this.updateTerrainColorsFromTheme()
  }

  private updateTerrainColorsFromTheme(): void {
    if (!this.engine || !this.editor) return
    const terrainColors = extractTerrainColorsFromTheme(this.editor.theme)
    this.engine.updateTerrainColors(terrainColors)
  }

  private async initializeEngine(): Promise<void> {
    if (!this.canvas || !this.editor) return
    const terrainColors = extractTerrainColorsFromTheme(this.editor.theme)
    const options: EditorEngineOptions = { preserveDrawingBuffer: true, terrainColors }
    this.context.engine.value = new EditorEngine(this.canvas, options)
    await this.context.engine.value.initialize()
    this.resizeCanvas()
    // Remove duplicate assignment - context.engine.value already set above
    if (this.context.mapState.value.gameMap) await this.updateTerrainData()
    this.centerAndFit()
  }

  private __render = () => {
    if (this.engine) this.engine.render(this.context.mapState.value)
    this.renderLoop = requestAnimationFrame(this.__render)
  }

  private startRenderLoop(): void {
    this.renderLoop = requestAnimationFrame(this.__render)
  }

  private stopRenderLoop(): void {
    if (this.renderLoop == null) return
    cancelAnimationFrame(this.renderLoop)
    this.renderLoop = null
  }

  resizeCanvas(): void {
    if (!this.canvas || !this.engine) return

    const container = this.canvas.parentElement
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const pixelRatio = window.devicePixelRatio || 1
    this.canvas.width = containerRect.width * pixelRatio
    this.canvas.height = containerRect.height * pixelRatio
    this.engine.resize()
  }

  private setupMouseLeaveHandler(): void {
    if (!this.canvas) return

    this.canvas.addEventListener('mouseleave', this.onMouseLeave)
  }

  private onMouseLeave = (): void => {
    if (!this.engine) return
    this.engine.setBrushCenter(-1000, -1000)
    this.context.hoverCoords.value = null
    this.context.hoverTerrainInfo.value = null
    this.emitAction('canvas-mouse-leave')
    this.requestUpdate()
  }

  private canvasToMapCoordinates(canvasX: number, canvasY: number): { x: number; y: number } | null {
    if (!this.engine) return null

    return this.engine.canvasToMapCoordinates(canvasX, canvasY)
  }

  private getTerrainInfo(_x: number, _y: number): { type: string; emoji: string; magnitude: number } | null {
    return { type: 'Plains', emoji: '🌾', magnitude: 15 }
  }

  public get webglCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  public centerAndFit = (): void => {
    if (!this.engine || !this.canvas) return

    const mapDimensions = this.engine.chunkManager.mapDimensions

    if (mapDimensions.width === 0 || mapDimensions.height === 0) {
      return
    }

    const canvasRect = this.canvas.getBoundingClientRect()
    const canvasWidth = canvasRect.width
    const canvasHeight = canvasRect.height

    const scaleX = canvasWidth / mapDimensions.width
    const scaleY = canvasHeight / mapDimensions.height
    const zoom = Math.min(scaleX, scaleY) * 0.9

    const transform = {
      zoom,
      panX: 0,
      panY: 0,
    }

    this.context.transform.value = transform
    this.engine.setTransform(transform)
  }

  public updateTerrainData = async (): Promise<void> => {
    if (!this.engine || !this.context.mapState.value.gameMap) return

    const gameMap = this.context.mapState.value.gameMap
    const width = gameMap.width()
    const height = gameMap.height()
    const gameMapWithTerrain = gameMap as any
    const terrainData = gameMapWithTerrain.terrain as Uint8Array

    await this.engine.loadServerMap(terrainData, width, height)

    if (DEBUG_RENDER_MODE) setInterval(() => this.engine?.debugRenderSample(), 2000)
  }

  render() {
    return html`
      <div class="flex flex-row h-full relative overflow-hidden">
        <canvas
          id="map-canvas"
          class="flex-grow w-full h-full cursor-crosshair"
        />
        <canvas-overlay 
          .mapState=${this.context.mapState.value}
          .transform=${this.context.transform.value}
          .renderer=${this.engine ? 'EditorEngine' : 'None'}
          .hoverCoords=${this.context.hoverCoords.value}
          .hoverTerrainInfo=${this.context.hoverTerrainInfo.value}
          .heightmapImage=${this.editor?.currentHeightmapImage}
        ></canvas-overlay>
      </div>
    `
  }
}

export type TerrainInfo = ReturnType<Canvas['getTerrainInfo']>
