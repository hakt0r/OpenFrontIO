import './Bezel'
import { customElement, property } from 'lit/decorators.js'
import { html, nothing } from 'lit'
import type { TerrainInfo } from './Canvas'
import type { MapEditorState, EditorTransform } from '../types'
import { TailwindElement } from './TailwindElement'

@customElement('canvas-overlay')
export class CanvasOverlay extends TailwindElement {
  @property({ type: Object }) heightmapImage?: HTMLImageElement
  @property({ type: Object }) hoverCoords?: { x: number; y: number }
  @property({ type: Object }) hoverTerrainInfo?: TerrainInfo
  @property({ type: Object }) mapState!: MapEditorState
  @property({ type: Object }) transform!: EditorTransform
  @property({ type: Object }) dataSourceInfo?: { sourceType: string }

  public getSourceIcon = (sourceType?: string) => {
    switch (sourceType) {
      case 'server':
        return '🌐'
      case 'local':
        return '💾'
      case 'heightmap':
        return '🗻'
      case 'new':
        return '✨'
      default:
        return '❓'
    }
  }

  public getSourceLabel = (sourceType?: string) => {
    switch (sourceType) {
      case 'server':
        return 'Server'
      case 'local':
        return 'Local'
      case 'heightmap':
        return 'Heightmap'
      case 'new':
        return 'New'
      default:
        return 'Unknown'
    }
  }

  classNames = {
    bezel: 'pointer-events-none mr-2',
  }

  render() {
    if (!this.mapState || !this.transform) return nothing
    return html`
      <bezel-panel class=${this.classNames.bezel}>
        <overlay-row label="🎨" .value=${'WebGL'}></overlay-row>
        <only-show .if=${this.dataSourceInfo?.sourceType}>
          <overlay-row .label=${this.getSourceIcon(this.dataSourceInfo?.sourceType)} .value=${this.getSourceLabel(this.dataSourceInfo?.sourceType)}></overlay-row>
        </only>
        <overlay-row label="📍" .value=${`${this.transform.panX.toFixed(0)}x${this.transform.panY.toFixed(0)}`}></overlay-row>
        <overlay-row label="🔍" .value=${`${(this.transform.zoom * 100).toFixed(0)}%`}></overlay-row>
        ${
          this.mapState.gameMap
            ? html`
              <overlay-row
                label="📏"
                .value=${`${this.mapState.gameMap.width()}×${this.mapState.gameMap.height()}`}
              ></overlay-row>
              ${
                this.mapState.originalSize &&
                (
                  this.mapState.originalSize.width !== this.mapState.gameMap.width() ||
                    this.mapState.originalSize.height !== this.mapState.gameMap.height()
                )
                  ? html`<overlay-row
                    label="🔧"
                    .value=${`${this.mapState.originalSize.width}×${this.mapState.originalSize.height}`}
                  ></overlay-row>`
                  : ''
              }
              <overlay-row label="🌾" .value=${this.mapState.gameMap.numLandTiles()}></overlay-row>
            `
            : ''
        }
        <overlay-row label="🏛️" .value=${this.mapState.nations.length}></overlay-row>
        ${this.heightmapImage ? html`<overlay-divider></overlay-divider><heightmap-minimap .src=${this.heightmapImage.src}></heightmap-minimap>` : ''}
        ${
          this.hoverCoords && this.hoverTerrainInfo
            ? html`
              <overlay-divider></overlay-divider>
              <overlay-row label="🎯" .value=${`${this.hoverCoords.x}, ${this.hoverCoords.y}`}></overlay-row>
              <overlay-row .label=${this.hoverTerrainInfo.emoji} .value=${`${this.hoverTerrainInfo.type} (${this.hoverTerrainInfo.magnitude})`}></overlay-row>
            `
            : ''
        }
      </bezel-panel>
    `
  }
}

@customElement('overlay-row')
export class OverlayRow extends TailwindElement {
  @property({ type: String }) label = ''
  @property({ type: String }) value = ''

  render() {
    return html`
      <div class="flex items-center mb-1">
        <span class="mr-2 min-w-[16px]">${this.label}</span>
        <span class="font-bold text-editor-primary">${this.value}</span>
      </div>
    `
  }
}

@customElement('overlay-divider')
export class OverlayDivider extends TailwindElement {
  render() {
    return html`<div class="h-[1px] bg-editor-border my-2"></div>`
  }
}

@customElement('heightmap-minimap')
export class HeightmapMinimap extends TailwindElement {
  @property({ type: String }) src = ''

  render() {
    return html`
      <div class="mt-2">
        <div class="text-[11px] text-editor-input-text mb-1 text-center">🗻 Heightmap</div>
        <div class="relative w-[120px] h-[120px] border-2 border-editor-border rounded-md overflow-hidden bg-editor-background shadow-inner">
          <img
            src="${this.src}"
            alt="Heightmap"
            class="w-full h-full object-cover [image-rendering:pixelated] [filter:contrast(1.2)_saturate(0.8)_brightness(1.1)_sepia(0.1)_hue-rotate(15deg)] [mix-blend-mode:multiply]"
          />
          <div class="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_30%_30%,rgba(139,69,19,0.3)_0%,transparent_50%),radial-gradient(circle_at_70%_60%,rgba(34,139,34,0.2)_0%,transparent_40%),radial-gradient(circle_at_50%_80%,rgba(65,105,225,0.2)_0%,transparent_30%)] [mix-blend-mode:overlay]"></div>
          <div class="pointer-events-none absolute inset-0 z-[1] [background:linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%),repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_4px)]"></div>
        </div>
      </div>
    `
  }
}
