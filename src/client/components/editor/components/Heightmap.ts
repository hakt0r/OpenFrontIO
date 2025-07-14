import { customElement, state } from 'lit/decorators.js'
import { html, nothing } from 'lit'
import type { TerrainThresholds } from '../types'
import { TailwindElement } from './TailwindElement'

export const styles = {
  container: 'h-8 w-full relative bg-editor-component-background cursor-pointer select-none px-4 py-4',
  bar: 'absolute top-0 left-0 flex w-full rounded overflow-hidden h-4 translate-y-1/2',
  subBar:
    'flex h-full w-full overflow-hidden items-center justify-center text-[10px] font-bold text-white text-shadow-sm transition-all duration-200 ease-in-out',
  ocean: 'bg-blue-700',
  plains: 'bg-green-600',
  highland: 'bg-yellow-600',
  mountain: 'bg-orange-700',
  knobs: 'absolute top-0 left-0 w-full h-full pointer-events-none',
  knobGroup:
    'absolute top-0 transform -translate-x-1/2 h-full w-4 border-2 border-white rounded cursor-grab pointer-events-auto flex items-center justify-center shadow-md transition-all duration-200 ease-in-out z-10 hover:scale-110 hover:shadow-lg active:cursor-grabbing active:scale-105',
  baseKnob:
    'absolute -top-6 left-1/2 transform -translate-x-1/2 bg-editor-component-background bg-opacity-90 text-editor-text px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap pointer-events-none opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100',
  oceanKnob: 'bg-blue-700',
  plainsKnob: 'bg-green-600',
  highlandKnob: 'bg-yellow-600',
  mountainKnob: 'bg-orange-700',
  knowInfo:
    'absolute -top-6 left-1/2 transform -translate-x-1/2 bg-editor-component-background bg-opacity-90 text-editor-text px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap pointer-events-none opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100',
}

@customElement('heightmap-toolbar')
export class HeightmapToolbarElement extends TailwindElement {
  private isDraggingTerrain = false
  private draggedThreshold: string | null = null
  private _lastTerrainThresholds: TerrainThresholds | null = null

  willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    super.willUpdate(changedProperties)

    if (!this.context) return
    const terrainThresholdsChanged =
      JSON.stringify(this.context.terrainThresholds.value) !== JSON.stringify(this._lastTerrainThresholds)
    if (terrainThresholdsChanged) this._lastTerrainThresholds = { ...this.context.terrainThresholds.value }
  }

  show() {
    this.context.isHeightmapVisible.value = true
    this.requestUpdate()
  }

  hide() {
    this.context.isHeightmapVisible.value = false
    this.requestUpdate()
  }

  render = () =>
    !this.context.isHeightmapVisible.value
      ? nothing
      : html`
      <div class="${styles.container}">
        <div class="${styles.bar}">
          <div class="${styles.subBar} ${styles.ocean}" style="width: ${this.context.terrainThresholds.value.ocean * 100}%">Ocean</div>
          <div class="${styles.subBar} ${styles.plains}" style="width: ${(this.context.terrainThresholds.value.plains - this.context.terrainThresholds.value.ocean) * 100}%">Plains</div>
          <div class="${styles.subBar} ${styles.highland}" style="width: ${(this.context.terrainThresholds.value.highland - this.context.terrainThresholds.value.plains) * 100}%">Highland</div>
          <div class="${styles.subBar} ${styles.mountain}" style="width: ${(this.context.terrainThresholds.value.mountain - this.context.terrainThresholds.value.highland) * 100}%">Mountain</div>
        </div>
        <div class="${styles.knobs}">
          <div class="${styles.knobGroup} ${styles.oceanKnob}" style="left: ${this.context.terrainThresholds.value.ocean * 100}%" data-threshold="ocean" @mousedown=${this.onTerrainRangeMouseDown}>
            <div class="${styles.knowInfo}">Ocean: ${this.context.terrainThresholds.value.ocean.toFixed(2)}</div>
          </div>
          <div class="${styles.knobGroup} ${styles.plainsKnob}" style="left: ${this.context.terrainThresholds.value.plains * 100}%" data-threshold="plains" @mousedown=${this.onTerrainRangeMouseDown}>
            <div class="${styles.knowInfo}">Plains: ${this.context.terrainThresholds.value.plains.toFixed(2)}</div>
          </div>
          <div class="${styles.knobGroup} ${styles.highlandKnob}" style="left: ${this.context.terrainThresholds.value.highland * 100}%" data-threshold="highland" @mousedown=${this.onTerrainRangeMouseDown}>
            <div class="${styles.knowInfo}">Highland: ${this.context.terrainThresholds.value.highland.toFixed(2)}</div>
          </div>
        </div>
      </div>
    `

  private async updateMaterialAndMapState(): Promise<void> {
    if (!this.context.engine.value || !this.context.editor.value?.currentHeightmapImage) return

    if (!this.context.engine.value.chunkManager.terrainTexture)
      await this.context.engine.value.loadHeightmapImage(
        this.context.editor.value.currentHeightmapImage,
        this.context.heightmapMaxSize.value,
      )
    else this.context.engine.value.chunkManager.rescaleHeightmapImage(this.context.heightmapMaxSize.value)

    const material = this.context.engine.value.renderer.material
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
      uniforms.u_renderMode.value = 0
      material.needsUpdate = true
    }

    const mapState = await this.context.engine.value.createMapState()
    if (mapState) this.context.editor.value.updateMapState(mapState)
  }

  public debouncedUpdateHeightmap = (() => {
    let timeoutId: number | null = null
    return () => {
      if (timeoutId) clearTimeout(timeoutId)

      timeoutId = setTimeout(async () => {
        await this.updateMaterialAndMapState()
        timeoutId = null
      }, 150) as unknown as number
    }
  })()

  private updateTerrainThresholds(newThresholds: TerrainThresholds): void {
    this.context.terrainThresholds.value = newThresholds

    if (this.context.engine.value?.renderer.material) {
      this.context.engine.value.renderer.material.uniforms.u_terrainThresholds.value.set(
        newThresholds.ocean,
        newThresholds.plains,
        newThresholds.highland,
        newThresholds.mountain,
      )
      this.context.engine.value.renderer.needsRerender = true
    }
    if (this.context.editor.value?.currentHeightmapImage) this.debouncedUpdateHeightmap()
  }

  private onTerrainRangeMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const thresholdElem = target.closest('[data-threshold]') as HTMLElement | null
    if (thresholdElem) {
      this.isDraggingTerrain = true
      this.draggedThreshold = thresholdElem.dataset.threshold || null
      document.addEventListener('mousemove', this.onTerrainRangeMouseMove)
      document.addEventListener('mouseup', this.onTerrainRangeMouseUp)
      e.preventDefault()
    }
  }

  private onTerrainRangeMouseMove = (e: MouseEvent) => {
    if (!this.isDraggingTerrain || !this.draggedThreshold) return

    const rect = this.getBoundingClientRect()
    const padding = 8
    const x = e.clientX - rect.left - padding
    const percentage = Math.max(0, Math.min(1, x / (rect.width - padding * 2)))

    const newThresholds = { ...this.context.terrainThresholds.value }

    switch (this.draggedThreshold) {
      case 'ocean':
        newThresholds.ocean = Math.min(percentage, newThresholds.plains - 0.01)
        break
      case 'plains':
        newThresholds.plains = Math.max(newThresholds.ocean + 0.01, Math.min(percentage, newThresholds.highland - 0.01))
        break
      case 'highland':
        newThresholds.highland = Math.max(newThresholds.plains + 0.01, Math.min(percentage, 1))
        break
    }

    this.updateTerrainThresholds(newThresholds)
  }

  private onTerrainRangeMouseUp = () => {
    this.isDraggingTerrain = false
    this.draggedThreshold = null
    document.removeEventListener('mousemove', this.onTerrainRangeMouseMove)
    document.removeEventListener('mouseup', this.onTerrainRangeMouseUp)
  }
}
