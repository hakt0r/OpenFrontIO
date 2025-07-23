import { customElement, state } from 'lit/decorators.js'
import { extractTerrainColorsFromTheme } from '../engine/theme'
import { html } from 'lit'
import { TailwindElement } from './TailwindElement'
import type { TerrainColors } from '../engine/types'

@customElement('terrain-color-panel')
export class TerrainColorPanel extends TailwindElement {
  @state() isOpen = false
  @state() customColors: TerrainColors = {
    oceanColor1: { r: 0.1, g: 0.3, b: 0.6 },
    oceanColor2: { r: 0.2, g: 0.4, b: 0.7 },
    plainsColor1: { r: 0.4, g: 0.6, b: 0.3 },
    plainsColor2: { r: 0.5, g: 0.7, b: 0.4 },
    highlandColor1: { r: 0.6, g: 0.5, b: 0.3 },
    highlandColor2: { r: 0.7, g: 0.6, b: 0.4 },
    mountainColor1: { r: 0.5, g: 0.5, b: 0.5 },
    mountainColor2: { r: 0.6, g: 0.6, b: 0.6 },
    shoreColor: { r: 0.8, g: 0.8, b: 0.6 },
  }

  connectedCallback() {
    super.connectedCallback()
    this.resetToTheme()
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16)
      return hex.length === 1 ? `0${hex}` : hex
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16) / 255,
          g: Number.parseInt(result[2], 16) / 255,
          b: Number.parseInt(result[3], 16) / 255,
        }
      : { r: 0, g: 0, b: 0 }
  }

  private updateColor(colorPath: string, event: Event) {
    const input = event.target as HTMLInputElement
    const color = this.hexToRgb(input.value)

    const pathParts = colorPath.split('.')
    const colorKey = pathParts[0] as keyof TerrainColors
    if (colorKey in this.customColors) this.customColors[colorKey] = color

    this.applyColors()
  }

  private applyColors() {
    if (!this.editor.renderer) return
    this.editor.renderer.updateTerrainColors(this.customColors)
  }

  private resetToTheme() {
    this.customColors = extractTerrainColorsFromTheme(this.editor.theme)
    this.applyColors()
    this.requestUpdate()
  }

  private togglePanel() {
    this.isOpen = !this.isOpen
  }

  render() {
    return html`
      <e-button
        .type=${'secondary'}
        .active=${this.isOpen}
        .icon=${'🏕️'}
        @click=${this.togglePanel}
      />
      <div
        class="fixed top-16 right-5 w-[250px] bg-editor-componentBackground border border-editor-border rounded-lg p-4 shadow-lg z-[1000] text-editor-text font-sans ${this.isOpen ? '' : 'hidden'}"
      >
        <div>
          <section-header title="🌊 Ocean"></section-header>
          <div class="flex items-center gap-2 mb-1">
            <span class="flex-1 text-xs text-editor-inputText text-left">Deep</span>
            <input
              type="color"
              class="w-[30px] h-5 rounded cursor-pointer border-none"
              .value=${this.rgbToHex(this.customColors.oceanColor1.r, this.customColors.oceanColor1.g, this.customColors.oceanColor1.b)}
              @change=${(e: Event) => this.updateColor('oceanColor1', e)}
            />
          </div>
          <div class="flex items-center gap-2 mb-1">
            <span class="flex-1 text-xs text-editor-inputText text-left">Shallow</span>
            <input
              type="color"
              class="w-[30px] h-5 rounded cursor-pointer border-none"
              .value=${this.rgbToHex(this.customColors.oceanColor2.r, this.customColors.oceanColor2.g, this.customColors.oceanColor2.b)}
              @change=${(e: Event) => this.updateColor('oceanColor2', e)}
            />
          </div>
        </div>
        <div>
          <section-header title="🌾 Plains"></section-header>
          <div class="flex items-center gap-2 mb-1">
            <span class="flex-1 text-xs text-editor-inputText text-left">Base</span>
            <input
              type="color"
              class="w-[30px] h-5 rounded cursor-pointer border-none"
              .value=${this.rgbToHex(this.customColors.plainsColor1.r, this.customColors.plainsColor1.g, this.customColors.plainsColor1.b)}
              @change=${(e: Event) => this.updateColor('plainsColor1', e)}
            />
          </div>
          <div class="flex items-center gap-2 mb-1">
            <span class="flex-1 text-xs text-editor-inputText text-left">Highlight</span>
            <input
              type="color"
              class="w-[30px] h-5 rounded cursor-pointer border-none"
              .value=${this.rgbToHex(this.customColors.plainsColor2.r, this.customColors.plainsColor2.g, this.customColors.plainsColor2.b)}
              @change=${(e: Event) => this.updateColor('plainsColor2', e)}
            />
          </div>
        </div>
        <div>
          <section-header title="🏕️ Highlands"></section-header>
          <div class="flex items-center gap-2 mb-1">
            <span class="flex-1 text-xs text-editor-inputText text-left">Base</span>
            <input
              type="color"
              class="w-[30px] h-5 rounded cursor-pointer border-none"
              .value=${this.rgbToHex(this.customColors.highlandColor1.r, this.customColors.highlandColor1.g, this.customColors.highlandColor1.b)}
              @change=${(e: Event) => this.updateColor('highlandColor1', e)}
            />
          </div>
          <div class="flex items-center gap-2 mb-1">
            <span class="flex-1 text-xs text-editor-inputText text-left">Highlight</span>
            <input
              type="color"
              class="w-[30px] h-5 rounded cursor-pointer border-none"
              .value=${this.rgbToHex(this.customColors.highlandColor2.r, this.customColors.highlandColor2.g, this.customColors.highlandColor2.b)}
              @change=${(e: Event) => this.updateColor('highlandColor2', e)}
            />
          </div>
        </div>
        <div>
          <section-header title="🏔️ Mountain"></section-header>
          <div class="flex items-center gap-2 mb-1">
            <span class="flex-1 text-xs text-editor-inputText text-left">Base</span>
            <input
              type="color"
              class="w-[30px] h-5 rounded cursor-pointer border-none"
              .value=${this.rgbToHex(this.customColors.mountainColor1.r, this.customColors.mountainColor1.g, this.customColors.mountainColor1.b)}
              @change=${(e: Event) => this.updateColor('mountainColor1', e)}
            />
          </div>
          <div class="flex items-center gap-2 mb-1">
            <span class="flex-1 text-xs text-editor-inputText text-left">Highlight</span>
            <input
              type="color"
              class="w-[30px] h-5 rounded cursor-pointer border-none"
              .value=${this.rgbToHex(this.customColors.mountainColor2.r, this.customColors.mountainColor2.g, this.customColors.mountainColor2.b)}
              @change=${(e: Event) => this.updateColor('mountainColor2', e)}
            />
          </div>
        </div>
        <div>
          <section-header title="🏖️ Shore"></section-header>
          <div class="flex items-center gap-2 mb-1">
            <span class="flex-1 text-xs text-editor-inputText text-left">Shore</span>
            <input
              type="color"
              class="w-[30px] h-5 rounded cursor-pointer border-none"
              .value=${this.rgbToHex(this.customColors.shoreColor.r, this.customColors.shoreColor.g, this.customColors.shoreColor.b)}
              @change=${(e: Event) => this.updateColor('shoreColor', e)}
            />
          </div>
        </div>
        <div class="flex gap-2 mt-4 pt-3 border-t border-editor-border items-center justify-between">
          <e-button
            .type=${'secondary'}
            .icon=${'🔄'}
            @click=${this.resetToTheme}
          />
          <e-button
            .type=${'primary'}
            .icon=${'💾'}
            @click=${this.applyColors}
          />
        </div>
      </div>
    `
  }
}
