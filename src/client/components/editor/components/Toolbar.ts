import './TerrainColorPanel'
import { LitElement, html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { TailwindElement } from './TailwindElement'
import { renderModeIcon, renderModeName } from '../types'
import { EditorStoreKey } from '../editor-store'

const SCREENSHOT_SUCCESS_MESSAGE = 'Screenshot copied to clipboard! 📋'
const SCREENSHOT_SUCCESS_TIMEOUT = 2000

@customElement('map-editor-toolbar')
export class MapEditorToolbar extends TailwindElement {
  private _lastZoom = 0
  private _lastRenderMode = 0
  private unsubscribeCallbacks: Array<() => void> = []

  connectedCallback() {
    super.connectedCallback()
    
    // Subscribe to signals this component needs
    this.unsubscribeCallbacks.push(
      this.context.transform.subscribe(() => {
        if (this.context.transform.value.zoom !== this._lastZoom) {
          this._lastZoom = this.context.transform.value.zoom
          this.requestUpdate()
        }
      }),
      this.context.renderMode.subscribe(() => {
        if (this.context.renderMode.value !== this._lastRenderMode) {
          this._lastRenderMode = this.context.renderMode.value
          this.requestUpdate()
        }
      }),
      this.context.isDarkMode.subscribe(() => this.requestUpdate()),
      this.context.isTerrainVisible.subscribe(() => this.requestUpdate()),
      this.context.isNationsVisible.subscribe(() => this.requestUpdate()),
      this.context.isHeightmapVisible.subscribe(() => this.requestUpdate()),
      this.context.mapState.subscribe(() => this.requestUpdate())
    )
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    // Clean up subscriptions
    this.unsubscribeCallbacks.forEach(unsubscribe => unsubscribe())
    this.unsubscribeCallbacks = []
  }

  private _handleNewMap() {
    this.context.isNewMapVisible.value = true
  }

  private _handleLoadMap() {
    this.context.isLoadMapVisible.value = true
  }

  private _handleLoadHeightmap = (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = async () => {
        if (this.editor) {
          this.editor.currentHeightmapImage = img
          await this.editor.requestUpdate()
        }
        await this.updateMaterialAndMapState()
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)

    input.value = ''
  }

  private async updateMaterialAndMapState(): Promise<void> {
    if (!this.engine || !this.editor?.currentHeightmapImage) return
    if (!this.engine.chunkManager.terrainTexture)
      await this.engine.loadHeightmapImage(
        this.editor.currentHeightmapImage,
        this.context.heightmapMaxSize.value,
      )

    this.engine.chunkManager.applyScalingAndChunk()

    const material = this.engine.renderer.material
    const uniforms = material?.uniforms

    if (uniforms) {
      uniforms.u_terrainThresholds.value.set(
        this.context.terrainThresholds.value.ocean,
        this.context.terrainThresholds.value.plains,
        this.context.terrainThresholds.value.highland,
        this.context.terrainThresholds.value.mountain,
      )
      uniforms.u_clampMin.value = this.context.heightmapClampMin.value
      uniforms.u_clampMax.value = this.context.heightmapClampMax.value
      material.needsUpdate = true
    }

    const mapState = await this.engine.createMapState()
    if (mapState && this.editor) this.editor.updateMapState(mapState)
  }

  private _handleSaveMap() {
    this.context.isSaveMapVisible.value = true
  }

  private _handleClose() {
    this.editor.close()
  }

  private _handleFitToScreen() {
    this.editor.centerAndFit()
  }

  private async _handleScreenshot(event: MouseEvent) {
    const canvas = this.editor.webglCanvas?.webglCanvas
    if (!canvas) {
      this.editor.setError('Canvas not available for screenshot')
      return
    }

    const screenshotCanvas = document.createElement('canvas')
    screenshotCanvas.width = canvas.width
    screenshotCanvas.height = canvas.height
    const ctx = screenshotCanvas.getContext('2d')

    if (!ctx) {
      this.editor.setError('Failed to create screenshot context')
      return
    }

    ctx.drawImage(canvas, 0, 0)

    if (event.altKey) this._downloadCanvasAsPNG(screenshotCanvas)
    else await this._copyCanvasToClipboard(screenshotCanvas)
  }

  private _downloadCanvasAsPNG(canvas: HTMLCanvasElement) {
    canvas.toBlob((blob) => {
      if (!blob) {
        this.editor.setError('Failed to create image data')
        return
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${this.context.mapState.value.mapName || 'map'}_screenshot_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, '-')}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  private async _copyCanvasToClipboard(canvas: HTMLCanvasElement) {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      this.editor.setError('Clipboard API not supported in this browser')
      return
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      }, 'image/png')
    })

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ])

    const originalErrorMessage = this.context.errorMessage.value
    this.context.errorMessage.value = SCREENSHOT_SUCCESS_MESSAGE
    setTimeout(() => {
      if (this.context.errorMessage.value === SCREENSHOT_SUCCESS_MESSAGE) {
        this.context.errorMessage.value = originalErrorMessage
      }
    }, SCREENSHOT_SUCCESS_TIMEOUT)
  }

  render() {
    return html`
      <div class="flex flex-row gap-3 px-4 py-2 bg-editor-component-background border-b border-editor-border shadow-[0_2px_6px_rgba(0,0,0,0.4)] z-[15] items-center text-editor-text">
        <div class="flex flex-row items-center gap-1">
          <e-button icon="📄" @click=${this._handleNewMap} title="New Map"></e-button>
          <e-button icon="📂" @click=${this._handleLoadMap} title="Load Map"></e-button>
          <e-button icon="🗺️" @click=${() =>
            this.querySelector('input')?.click()} title="Load Heightmap">
            <input type="file" accept="image/*" @change=${this._handleLoadHeightmap} class="absolute left-[-9999px] top-[-9999px] invisible">
          </e-button>
          <e-button icon="💾" ?active=${this.context.mapState.value.gameMap !== null} @click=${this._handleSaveMap} title="Save Map"></e-button>
          <e-button icon="📸" @click=${this._handleScreenshot} title="Screenshot (Alt+click to download PNG)"></e-button>
        </div>
        <div class="h-6 w-px bg-editor-border mx-1"></div>
        <div class="flex flex-row items-center gap-1">
          <map-editor-toggle-button key="isTerrainVisible" .icons=${['🎨', '🎨']} .titles=${['Hide Terrain Panel', 'Show Terrain Panel']}></map-editor-toggle-button>
          <map-editor-toggle-button key="isNationsVisible" .icons=${['🏛️', '🏛️']} .titles=${['Hide Nations Panel', 'Show Nations Panel']}></map-editor-toggle-button>
          <map-editor-toggle-button key="isHeightmapVisible" .icons=${['🗻', '🗻']} .titles=${['Hide Heightmap Toolbar', 'Show Heightmap Toolbar']}></map-editor-toggle-button>
        </div>
        <div class="h-6 w-px bg-editor-border mx-1"></div>
        <div class="flex items-center gap-1">
          <span class="min-w-[32px] text-center font-semibold text-editor-primary bg-editor-secondary-background px-2 py-1 rounded border border-editor-border text-xs">${Math.round(
            this.context.transform.value.zoom * 100,
          )}%</span>
          <e-button icon="🔍" @click=${this._handleFitToScreen} title="Fit to Screen"></e-button>
        </div>
        <div class="flex-1"></div>
        <div class="flex items-center gap-1">
          <map-editor-toggle-button key="renderMode" .icons=${renderModeIcon} .titles=${renderModeName} on-update=${this.engine?.setRenderMode}></map-editor-toggle-button>
          <span class="min-w-[32px] text-center font-semibold text-editor-primary bg-editor-secondary-background px-2 py-1 rounded border border-editor-border text-xs">${
            renderModeName[this.context.renderMode.value]
          } [${this.context.renderMode.value}]</span>
        </div>
        <div class="h-6 w-px bg-editor-border mx-1"></div>
        <div class="flex items-center gap-1">
          <map-editor-toggle-button key="isDarkMode" .icons=${['🌙', '☀️']} .titles=${['Light', 'Dark']} on-update=${this.editor?.toggleTheme}></map-editor-toggle-button>
          <span class="min-w-[32px] text-center font-semibold text-editor-primary bg-editor-secondary-background px-2 py-1 rounded border border-editor-border text-xs">${
            this.context.isDarkMode.value ? 'Dark' : 'Light'
          }</span>
          <terrain-color-panel></terrain-color-panel>
        </div>
        <div class="h-6 w-px bg-editor-border mx-1"></div>
        <div class="flex items-center gap-1">
          <e-button icon="❌" @click=${this._handleClose} title="Close Editor"></e-button>
        </div>
      </div>
    `
  }
}

@customElement('map-editor-toggle-button')
export class MapEditorToggleButton extends TailwindElement {
  @property({ type: Array }) icons: string[] = ['', '']
  @property({ type: Array }) titles: string[] = ['Off', 'On']
  @property({ type: Array }) values: number[] = [0, 1]
  @property({ type: String }) key!: string
  @property({ type: Function }) onUpdate!: (value: number) => void

  connectedCallback() {
    super.connectedCallback()
    this.props = [this.key]
  }

  private _click_ = (event: MouseEvent) => {
    debugger

    const value = this.context?.[this.key]?.value || 0
    const nextValue = this.values[(value + 1) % this.values.length]
      this.context[this.key].value = nextValue
      this.onUpdate?.(nextValue)

    event.stopPropagation()
    event.preventDefault()
  }

  render() {
    if (!this.context || !this.icons || !this.titles || !this.values) return nothing
    const value = this.context?.[this.key]?.value || 0
    const icon = this.icons[value] || this.icons[0]
    const title = this.titles[value] || this.titles[0]
    const active = value !== 0
    return html`<e-button .icon=${icon} ?active=${active} @click=${this._click_} title=${title}></e-button>
    `
  }
}