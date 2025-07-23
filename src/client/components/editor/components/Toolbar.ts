import './TerrainColorPanel'
import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { TailwindElement } from './TailwindElement'
import { renderModeIcon, renderMode } from '../types'
import { EditorStoreKey } from '../editor-store'

const SCREENSHOT_SUCCESS_MESSAGE = 'Screenshot copied to clipboard! 📋'
const SCREENSHOT_SUCCESS_TIMEOUT = 2000

@customElement('map-editor-toolbar')
export class MapEditorToolbar extends TailwindElement {
  private _lastZoom = 0
  private _lastRenderMode = 0

  willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    super.willUpdate(changedProperties)

    if (!this.context) return
    const zoomChanged = this.context.transform.value.zoom !== this._lastZoom
    const renderModeChanged = this.context.renderMode.value !== this._lastRenderMode

    if (!zoomChanged && !renderModeChanged) return
    this._lastZoom = this.context.transform.value.zoom
    this._lastRenderMode = this.context.renderMode.value
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

  private _handleToggleRenderMode() {
    const newMode = (this.context.renderMode.value + 1) % 5
    this.context.renderMode.value = newMode
    if (this.editor) this.editor.switchMode(newMode)
  }

  private _handleToggleTheme() {
    this.editor.toggleTheme()
  }

  private _handleToggleTerrain = () => {
    this.context.isTerrainVisible.value = !this.context.isTerrainVisible.value
    if (this.context.isTerrainVisible.value) {
      this.editor.terrainPanel?.show()
    } else {
      this.editor.terrainPanel?.hide()
    }
  }

  private _handleToggleNations = () => {
    this.context.isNationsVisible.value = !this.context.isNationsVisible.value
    if (this.context.isNationsVisible.value) {
      this.editor.nationsPanel?.show()
    } else {
      this.editor.nationsPanel?.hide()
    }
  }

  private _handleToggleHeightmap = () => {
    this.context.isHeightmapVisible.value = !this.context.isHeightmapVisible.value
    if (this.context.isHeightmapVisible.value) {
      this.editor.heightmapToolbar?.show()
    } else {
      this.editor.heightmapToolbar?.hide()
    }
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
          <e-button icon="🎨" ?active=${this.context.isTerrainVisible.value} @click=${this._handleToggleTerrain} title=${this.context.isTerrainVisible.value ? 'Hide Terrain Panel' : 'Show Terrain Panel'}></e-button>
          <e-button icon="🏛️" ?active=${this.context.isNationsVisible.value} @click=${this._handleToggleNations} title=${this.context.isNationsVisible.value ? 'Hide Nations Panel' : 'Show Nations Panel'}></e-button>
          <e-button icon="🗻" ?active=${this.context.isHeightmapVisible.value} @click=${this._handleToggleHeightmap} title=${this.context.isHeightmapVisible.value ? 'Hide Heightmap Toolbar' : 'Show Heightmap Toolbar'}></e-button>
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
          <e-button .icon=${renderModeIcon[this.context.renderMode.value]} ?active=${
            this.context.renderMode.value !== 0
          } @click=${this._handleToggleRenderMode} title="${`Switch to ${
            renderMode[(this.context.renderMode.value + 1) % 5]
          } Mode`}"></e-button>
          <span class="min-w-[32px] text-center font-semibold text-editor-primary bg-editor-secondary-background px-2 py-1 rounded border border-editor-border text-xs">${
            renderMode[this.context.renderMode.value]
          } [${this.context.renderMode.value}]</span>
        </div>
        <div class="h-6 w-px bg-editor-border mx-1"></div>
        <div class="flex items-center gap-1">
          <e-button .icon=${
            this.context.isDarkMode.value ? '☀️' : '🌙'
          } ?active=${this.context.isDarkMode.value} @click=${this._handleToggleTheme} title="${
            this.context.isDarkMode.value ? 'Switch to Light Theme' : 'Switch to Dark Theme'
          }"></e-button>
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
