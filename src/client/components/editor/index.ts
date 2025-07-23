import './components/Button'
import './components/Canvas'
import './components/Heightmap'
import './components/LoadMap'
import './components/NationModal'
import './components/NationPanel'
import './components/NewMap'
import './components/Overlay'
import './components/SaveMap'
import './components/SectionHeader'
import './components/TerrainPanel'
import './components/Toolbar'
import './components/Toolkit'

import { customElement, query, state } from 'lit/decorators.js'
import { EditorTool as EditorTool, BrushType as BrushTypeEnum, defaultTerrainThresholds, BrushCursor } from './types'
import { initializeMap, paintAtPosition } from './engine/actions'
import { html } from 'lit'
import { handleMouseDown, handleLeftClick, handleDrag, handleDrawing, handleZoom } from './engine/input'
import { PastelTheme } from './../../../core/configuration/PastelTheme'
import { PastelThemeDark } from './../../../core/configuration/PastelThemeDark'
import { UserSettings } from '../../../core/game/UserSettings'

import type { Canvas } from './components/Canvas'
import type { EditorEngine } from './engine'
import type { HeightmapToolbarElement } from './components/Heightmap'
import type { LoadMapModalElement } from './components/LoadMap'
import type { MapEditorState, EditorTransform, Nation } from './types'
import type { NationModalElement } from './components/NationModal'
import type { NationsPanel } from './components/NationPanel'
import type { NewMapModalElement } from './components/NewMap'
import type { SaveMapModalElement } from './components/SaveMap'
import type { TerrainPanel } from './components/TerrainPanel'
import type { Theme } from './../../../core/configuration/Config'
import { TailwindElement } from './components/TailwindElement'
import { editorContext, editorStore, type EditorStore } from './editor-store'
import { provide } from '@lit/context'

@customElement('map-editor')
export class MapEditor extends TailwindElement {
  private resizeObserver: ResizeObserver | null = null
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null

  @provide({ context: editorContext })
  context: EditorStore = editorStore

  @query('webgl-canvas') webglCanvas!: Canvas
  @query('new-map-modal') newMapModal!: NewMapModalElement
  @query('load-map-modal') loadMapModal!: LoadMapModalElement
  @query('save-map-modal') saveMapModal!: SaveMapModalElement
  @query('nation-modal') nationModal!: NationModalElement
  @query('heightmap-toolbar') heightmapToolbar!: HeightmapToolbarElement
  @query('terrain-panel') terrainPanel!: TerrainPanel
  @query('nations-panel') nationsPanel!: NationsPanel

  renderer: EditorEngine | null = null
  private userSettings = new UserSettings()

  get theme(): Theme {
    return this.context.isDarkMode.value ? new PastelThemeDark() : new PastelTheme()
  }

  get currentHeightmapImage(): HTMLImageElement | null {
    return this.renderer?.heightmapImage || null
  }

  set currentHeightmapImage(image: HTMLImageElement | null) {
    if (!this.renderer) throw new Error('Renderer is not initialized')

    if (image === null) {
      this.renderer.clearHeightmapImage()
      this.requestUpdate()
    } else {
      this.renderer
        .loadHeightmapImage(image, this.context.heightmapMaxSize.value)
        .then(() => this.requestUpdate())
        .catch((error) => {
          console.error('Failed to load heightmap image:', error)
          this.setError('Failed to load heightmap image')
        })
    }
  }

  get dataSourceInfo() {
    return (
      this.renderer?.dataSourceInfo || {
        hasBaseMap: false,
        hasHeightmapImage: false,
        hasHeightmapTexture: false,
        sourceType: 'none',
      }
    )
  }

  constructor() {
    super()
    this.context.isDarkMode.value = this.userSettings.darkMode()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('action', this.handleComponentAction)
    this.removeEventListener('error', this.handleComponentError)
    this.removeEventListener('change', this.handleComponentChange)
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.context.editor.value = this
    this.context.isDarkMode.value = document.documentElement.classList.contains('dark')
    this.context.terrainThresholds.value = defaultTerrainThresholds
    this.context.transform.value = { zoom: 1, panX: 0, panY: 0 }
    this.context.mapState.value = initializeMap()

    Object.values(this.context).forEach((signal) => {
      signal.subscribe(() => this.requestUpdate())
    })

    // Listen for component events
    this.addEventListener('action', this.handleComponentAction)
    this.addEventListener('error', this.handleComponentError)
    this.addEventListener('change', this.handleComponentChange)
  }

  async firstUpdated(): Promise<void> {
    await this.connectInputToCanvas()
    await this.updateComplete
    
    // Wait for canvas to initialize engine
    await this.webglCanvas?.updateComplete
    this.renderer = this.context.engine.value
    
    if (this.context.isTerrainVisible.value) this.terrainPanel?.show()
    else this.terrainPanel?.hide()
    if (this.context.isNationsVisible.value) this.nationsPanel?.show()
    else this.nationsPanel?.hide()
    if (this.context.isHeightmapVisible.value) this.heightmapToolbar?.show()
    else this.heightmapToolbar?.hide()
    // Modal visibility is now handled by context subscription
    this.updateTheme()
    this.setupResizeObserver()
  }

  async updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties)

    if (changedProperties.has('isOpen') && this.context.isOpen.value) {
      await this.updateComplete
      await this.connectInputToCanvas()
      // Ensure renderer is set after canvas updates
      this.renderer = this.context.engine.value
    }

    if (changedProperties.has('isDarkMode')) {
      this.setAttribute('theme', this.context.isDarkMode.value ? 'dark' : 'light')
      this.updateTheme()
    }
    if (changedProperties.has('currentTool') || changedProperties.has('brushSize')) this.updateCursor()
    if (changedProperties.has('currentBrush')) {
      this.context.currentTool.value = 'paint'
    }
  }

  private updateCursor(): void {
    const canvas = this.canvas
    if (canvas) canvas.style.cursor = BrushCursor[this.context.currentTool.value]
  }

  private async connectInputToCanvas(): Promise<void> {
    if (!this.webglCanvas) return

    await this.webglCanvas.updateComplete
    this.setupEventListeners()
  }

  private updateTheme(): void {
    const theme = this.theme
    for (const [key, color] of Object.entries(theme.editor)) {
      const cssVarName = `--editor-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      this.style.setProperty(cssVarName, color.toRgbString())
    }
  }

  private setupEventListeners(): void {
    const canvas = this.webglCanvas?.webglCanvas
    if (!canvas) {
      console.warn('Canvas not available for event listeners')
      return
    }

    // Remove existing listeners first
    canvas.removeEventListener('mousedown', this.onMouseDown)
    canvas.removeEventListener('mousemove', this.onMouseMove)
    canvas.removeEventListener('mouseup', this.onMouseUp)
    canvas.removeEventListener('wheel', this.onWheel)
    canvas.removeEventListener('dblclick', this.onDoubleClick)
    canvas.removeEventListener('contextmenu', this.onContextMenu)

    // Add event listeners
    canvas.addEventListener('mousedown', this.onMouseDown)
    canvas.addEventListener('mousemove', this.onMouseMove)
    canvas.addEventListener('mouseup', this.onMouseUp)
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
    canvas.addEventListener('dblclick', this.onDoubleClick)
    canvas.addEventListener('contextmenu', this.onContextMenu)
    
    console.log('Canvas event listeners set up successfully', canvas)
  }

  private onMouseDown = (e: MouseEvent): void => {
    const canvas = this.canvas
    if (!canvas) return
    
    handleMouseDown(
      e,
      canvas,
      (x, y) => this.onLeftClick(x, y),
      (x, y) => this.onRightDrag(x, y),
    )
  }

  private onMouseMove = (e: MouseEvent): void => {
    const canvas = this.canvas
    if (!canvas) {
      console.log('onMouseMove: canvas not available')
      return
    }
    
    const rect = canvas.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top

    if (this.renderer) {
      const coords = this.renderer.canvasToMapCoordinates(canvasX, canvasY)
      if (
        coords &&
        this.context.mapState.value.gameMap &&
        coords.x >= 0 &&
        coords.x < this.context.mapState.value.gameMap.width() &&
        coords.y >= 0 &&
        coords.y < this.context.mapState.value.gameMap.height()
      ) {
        this.context.hoverCoords.value = {
          x: Math.floor(coords.x),
          y: Math.floor(coords.y),
        }
        // this.context.hoverTerrainInfo.value = this.getTerrainInfo(Math.floor(coords.x), Math.floor(coords.y))
        this.renderer.setBrushCenter(coords.x, coords.y)
        this.renderer.setBrushRadius(this.context.brushSize.value)
        this.requestUpdate()
      } else {
        this.context.hoverCoords.value = null
        this.context.hoverTerrainInfo.value = null
        this.renderer.setBrushCenter(-1000, -1000)
        this.requestUpdate()
      }
    }

    if (this.context.isDragging.value) this.onDrag(canvasX, canvasY)
    else if (this.context.isDrawing.value)
      handleDrawing(canvasX, canvasY, this.renderer, this.context.mapState.value, (x, y) => this.paint(x, y))
  }

  private onMouseUp = (): void => {
    this.context.isDrawing.value = false
    this.context.isDragging.value = false
    const canvas = this.canvas
    if (canvas) canvas.style.cursor = BrushCursor[this.context.currentTool.value]
  }

  private onDoubleClick = (e: MouseEvent): void => {
    if (this.renderer) {
      const canvas = this.canvas
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const canvasY = e.clientY - rect.top

      const hitNation = this.renderer.hitTestNation(canvasX, canvasY, this.context.mapState.value.nations)

      if (hitNation) {
        this.context.editingNation.value = hitNation as Nation
        this.context.isEditingNation.value = true
        this.context.pendingNationCoords.value = null
        this.context.isNationVisible.value = true
        e.preventDefault()
      }
    }
  }

  private onWheel = (e: WheelEvent): void => {
    if (e.ctrlKey || e.metaKey) {
      this.zoom(e)
      e.preventDefault()
    } else if (e.shiftKey) {
      // Brush size adjustment with Shift + wheel
      const delta = e.deltaY > 0 ? -1 : 1
      const newSize = Math.max(1, Math.min(50, this.context.brushSize.value + delta))
      this.context.brushSize.value = newSize
      e.preventDefault()
    } else {
      // Tool/brush switching with plain wheel
      const delta = e.deltaY > 0 ? 1 : -1
      if (this.context.currentTool.value === 'paint') {
        const brushes = ['ocean', 'plains', 'highland', 'mountain', 'gaussianblur', 'raiseterrain', 'lowerterrain']
        const currentIndex = brushes.indexOf(this.context.currentBrush.value)
        const newIndex = (currentIndex + delta + brushes.length) % brushes.length
        this.context.currentBrush.value = brushes[newIndex] as any
      } else {
        const tools = ['paint', 'erase', 'nation']
        const currentIndex = tools.indexOf(this.context.currentTool.value)
        const newIndex = (currentIndex + delta + tools.length) % tools.length
        this.context.currentTool.value = tools[newIndex] as any
      }
      e.preventDefault()
    }
  }

  private onContextMenu = (e: MouseEvent): void => {
    if (this.context.currentTool.value === 'nation' && this.renderer) {
      const canvas = this.canvas
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const canvasY = e.clientY - rect.top

      const hitNation = this.renderer.hitTestNation(canvasX, canvasY, this.context.mapState.value.nations)

      if (hitNation) {
        this.context.editingNation.value = hitNation as Nation
        this.context.isEditingNation.value = true
        this.context.pendingNationCoords.value = null
        this.context.isNationVisible.value = true
        e.preventDefault()
      }
    }
    e.preventDefault()
  }

  private onLeftClick = (canvasX: number, canvasY: number): void => {
    this.context.lastMousePos.value = { x: canvasX, y: canvasY }
    handleLeftClick(
      canvasX,
      canvasY,
      this.renderer,
      this.context.mapState.value,
      this.context.currentTool.value,
      () => {
        this.context.isDrawing.value = true
      },
      (x, y) => this.paint(x, y),
    )
  }

  private onRightDrag = (canvasX: number, canvasY: number): void => {
    this.context.lastMousePos.value = { x: canvasX, y: canvasY }
    this.context.isDragging.value = true
  }

  private onDrag = (canvasX: number, canvasY: number): void => {
    this.context.lastMousePos.value = handleDrag(
      canvasX,
      canvasY,
      this.context.lastMousePos.value,
      this.context.transform.value,
      this.renderer,
      (transform) => {
        this.context.transform.value = transform
      },
      this.context.mapState.value,
    )
  }

  private paint = (x: number, y: number): void => {
    if (this.context.currentTool.value === 'nation') {
      this.context.pendingNationCoords.value = [x, y]
      this.context.isEditingNation.value = false
      this.context.editingNation.value = null
      this.context.isNationVisible.value = true
      return
    }
    if (!this.renderer) return

    paintAtPosition(this.context, x, y)
  }

  private zoom = (e: WheelEvent): void => {
    const canvas = this.canvas
    if (!canvas) return
    
    handleZoom(
      e,
      canvas,
      this.context.transform.value,
      this.renderer,
      (transform) => {
        this.context.transform.value = transform
      },
      this.context.mapState.value,
    )
  }

  private setupResizeObserver(): void {
    if (!this.webglCanvas) return
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeTimeout) clearTimeout(this.resizeTimeout)

      this.resizeTimeout = setTimeout(() => {
        this.webglCanvas?.resizeCanvas()
        this.renderer?.renderer.forceRerender()
      }, 16)
    })

    this.resizeObserver.observe(this.webglCanvas)
  }

  render() {
    if (!this.context.isOpen.value) return html``
    return html`
      <div class="fixed top-0 left-0 w-screen h-screen z-[9999] bg-editor-background text-editor-text flex items-stretch justify-stretch">
        <div class="flex flex-col h-screen w-screen bg-editor-background text-editor-text overflow-hidden flex-1">
          <map-editor-toolbar></map-editor-toolbar>
            <div class="flex-1 relative h-full overflow-hidden">
              <webgl-canvas class="flex-grow h-full"></webgl-canvas>
              <div class="absolute top-0 left-0 h-full p-4 pointer-events-none flex items-start">
                <terrain-panel class="pointer-events-auto"></terrain-panel>
              </div>
              <div class="absolute top-0 right-0 h-full p-4 pointer-events-none flex flex-row items-start">
                <canvas-overlay
                  .mapState=${this.context.mapState.value}
                  .transform=${this.context.transform.value}
                  .hoverCoords=${this.context.hoverCoords.value}
                  .hoverTerrainInfo=${this.context.hoverTerrainInfo.value}
                  .dataSourceInfo=${this.dataSourceInfo}
                  .heightmapImage=${this.currentHeightmapImage}
                ></canvas-overlay>
                <nations-panel .nations=${this.context.mapState.value.nations} class="pointer-events-auto"></nations-panel>
              </div>
            </div>
          <heightmap-toolbar></heightmap-toolbar>
        </div>
      </div>
              <new-map-modal name="NewMap"></new-map-modal>
        <load-map-modal name="LoadMap"></load-map-modal>
        <save-map-modal name="SaveMap"></save-map-modal>
        <nation-modal name="Nation"></nation-modal>
    `
  }

  updateMapState(newState: MapEditorState): void {
    this.context.mapState.value = newState
    this.webglCanvas?.updateTerrainData()
    this.centerAndFit()
    this.requestUpdate()

    this.updateComplete.then(() => {
      if (!this.renderer) return
      this.renderer.render(this.context.mapState.value)
    })
  }

  centerAndFit(): void {
    this.webglCanvas?.centerAndFit()
  }

  switchMode(newRenderMode: number): void {
    this.context.renderMode.value = newRenderMode
    this.renderer?.setRenderMode(newRenderMode)
  }

  updateTransform(transform: EditorTransform): void {
    this.context.transform.value = transform
    if (this.renderer) {
      this.renderer.setTransform(transform)
      this.renderer.renderer.forceRerender()
    }
  }

  public get canvas(): HTMLCanvasElement | null {
    return this.webglCanvas?.webglCanvas || null
  }

  public async open(): Promise<void> {
    this.context.isOpen.value = true
    this.requestUpdate()
    await this.updateComplete
    await this.connectInputToCanvas()
  }

  public close(): void {
    this.context.isOpen.value = false
  }

  public setError(message: string): void {
    this.context.errorMessage.value = message
    this.requestUpdate()
  }

  public clearError(): void {
    this.context.errorMessage.value = ''
    this.requestUpdate()
  }

  public toggleTheme(): void {
    this.userSettings.toggleDarkMode()
    this.context.isDarkMode.value = this.userSettings.darkMode()
  }

  public toggleNationsPanel(): void {
    this.context.isNationsVisible.value = !this.context.isNationsVisible.value
    if (this.context.isNationsVisible.value) {
      this.nationsPanel.show()
    } else {
      this.nationsPanel.hide()
    }
    this.requestUpdate()
  }

  public toggleTerrainPanel(): void {
    this.context.isTerrainVisible.value = !this.context.isTerrainVisible.value
    if (this.context.isTerrainVisible.value) {
      this.terrainPanel.show()
    } else {
      this.terrainPanel.hide()
    }
    this.requestUpdate()
  }

  public toggleHeightmapToolbar(): void {
    this.context.isHeightmapVisible.value = !this.context.isHeightmapVisible.value
    if (this.context.isHeightmapVisible.value) {
      this.heightmapToolbar.show()
    } else {
      this.heightmapToolbar.hide()
    }
    this.requestUpdate()
  }

  // Component event handlers
  private handleComponentAction = (event: CustomEvent) => {
    const { action, data } = event.detail
    console.log(`Editor received action: ${action}`, data)
    
    switch (action) {
      case 'tool-select':
        console.log(`Tool selected: ${data.tool}, Brush: ${data.brush}`)
        break
      case 'panel-show':
      case 'panel-hide':
        console.log(`Panel ${data.panel} ${action.split('-')[1]}`)
        break
      case 'canvas-mouse-leave':
        console.log('Mouse left canvas')
        break
    }
  }

  private handleComponentError = (event: CustomEvent) => {
    const { message } = event.detail
    this.setError(message)
  }

  private handleComponentChange = (event: CustomEvent) => {
    const { value, controlId } = event.detail
    console.log(`Component change: ${controlId}`, value)
    
    // Update the context based on the control that changed
    if (controlId === 'brushSize') {
      this.context.brushSize.value = Number(value)
    } else if (controlId === 'brushMagnitude') {
      this.context.brushMagnitude.value = Number(value)
    } else if (controlId === 'heightmapClampMin') {
      this.context.heightmapClampMin.value = Number(value)
    } else if (controlId === 'heightmapClampMax') {
      this.context.heightmapClampMax.value = Number(value)
    } else if (controlId === 'heightmapMaxSize') {
      this.context.heightmapMaxSize.value = Number(value)
    }
  }
}
