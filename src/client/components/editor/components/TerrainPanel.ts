import './Bezel'
import './BrushSection'
import './RangeControl'
import { customElement, property } from 'lit/decorators.js'
import { html } from 'lit'
import { TailwindElement } from './TailwindElement'
import { switchTool, changeBrushSize, switchBrushType } from '../engine/actions'

import { EditorTool, getEngineBrushValues, type SidebarConfig } from '../types'

@customElement('terrain-panel')
export class TerrainPanel extends TailwindElement {

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('wheel', this.onWheel, { passive: false })
    document.addEventListener('keydown', this.onKey)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('wheel', this.onWheel)
    document.removeEventListener('keydown', this.onKey)
  }

  private onWheel = (e: WheelEvent): void => {
    const context = this.context
    if (!context) return
    const webglCanvas = context.editor.value?.webglCanvas?.webglCanvas
    const engine = context.engine.value
    const renderer = engine?.renderer
    if (!webglCanvas || !engine || !renderer) return

    const canvasRect = webglCanvas.getBoundingClientRect()
    const isOverCanvas =
      e.clientX >= canvasRect.left &&
      e.clientX <= canvasRect.right &&
      e.clientY >= canvasRect.top &&
      e.clientY <= canvasRect.bottom

    if (!isOverCanvas) return

    if (e.ctrlKey && e.altKey) {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY > 0 ? -1 : 1
      context.brushMagnitude.value = Math.max(1, Math.min(31, context.brushMagnitude.value + delta))
      engine.setBrushMagnitude(context.brushMagnitude.value)
      return
    }

    if (e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      context.currentTool.value = switchTool(context.currentTool.value, e.deltaY > 0 ? 1 : -1)
      const [engineBrushType, brushMagnitude] = getEngineBrushValues(context)
      engine.setBrushType(engineBrushType)
      engine.setBrushMagnitude(brushMagnitude)
      return
    }

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      e.stopPropagation()
      context.currentBrush.value = switchBrushType(context.currentBrush.value, e.deltaY > 0 ? 1 : -1)
      const [engineBrushType, brushMagnitude] = getEngineBrushValues(context)
      engine.setBrushType(engineBrushType)
      engine.setBrushMagnitude(brushMagnitude)
      return
    }

    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      e.stopPropagation()
      context.brushSize.value = changeBrushSize(context.brushSize.value, e.deltaY > 0 ? -1 : 1)
      engine?.setBrushRadius(context.brushSize.value)
      return
    }
  }

  private onKey = (e: KeyboardEvent): void => {
    if (!this.context.isTerrainVisible.value || e.target !== document.body) return

    const toolMap: Record<string, EditorTool> = {
      q: 'paint',
      e: 'erase',
      r: 'nation',
    }

    const tool = toolMap[e.key]
    if (tool) {
      e.preventDefault()
      this.context.currentTool.value = tool
    }
  }

  private changeControl = (event: CustomEvent) => {
    const { controlId, value } = event.detail.value || event.detail
    const engine = this.context.engine.value
    if (!engine) return

    const controlHandlers: Record<string, (v: any) => void> = {
      brushSize: (v) => {
        this.context.brushSize.value = v
        engine.setBrushRadius(v)
      },
      brushMagnitude: (v) => {
        this.context.brushMagnitude.value = v
        engine.setBrushMagnitude(v)
      },
      heightmapMaxSize: (v) => {
        this.context.heightmapMaxSize.value = v
        if (this.editor?.currentHeightmapImage)
          this.editor.heightmapToolbar?.debouncedUpdateHeightmap()
      },
      heightmapClampMin: (v) => {
        this.context.heightmapClampMin.value = Math.min(v, this.context.heightmapClampMax.value - 0.01)
        if (this.editor?.currentHeightmapImage)
          this.editor.heightmapToolbar?.debouncedUpdateHeightmap()
      },
      heightmapClampMax: (v) => {
        this.context.heightmapClampMax.value = Math.max(v, this.context.heightmapClampMin.value + 0.01)
        if (this.editor?.currentHeightmapImage)
          this.editor.heightmapToolbar?.debouncedUpdateHeightmap()
      },
    }

    controlHandlers[controlId]?.(value)
  }

  show = () => {
    this.context.isTerrainVisible.value = true
    this.emitAction('panel-show', { panel: 'terrain' })
  }

  hide = () => {
    this.context.isTerrainVisible.value = false
    this.emitAction('panel-hide', { panel: 'terrain' })
  }

  render() {
    if (!this.context.isTerrainVisible.value) return html``
    return html`
      <div id="terrain-panel" class="w-[240px] flex flex-col gap-3 text-editor-text">
        <sidebar-brush-section title="Tools">
          <tool-button type="tool" value="paint"></tool-button>
          <tool-button type="tool" value="erase"></tool-button>
          <tool-button type="tool" value="nation"></tool-button>
        </sidebar-brush-section>
        <sidebar-brush-section title="Brushes">
          <tool-button type="brush" value="ocean"></tool-button>
          <tool-button type="brush" value="lake"></tool-button>
          <tool-button type="brush" value="plains"></tool-button>
          <tool-button type="brush" value="highland"></tool-button>
          <tool-button type="brush" value="mountain"></tool-button>
          <tool-button type="brush" value="raiseterrain"></tool-button>
          <tool-button type="brush" value="lowerterrain"></tool-button>
          <tool-button type="brush" value="gaussianblur"></tool-button>
        </sidebar-brush-section>
        <bezel-panel>
          <section-header title="Controls"></section-header>
          <range-control id="brushSize" name="brushSize" type="range" min="1" max="20" step="1" helpText="Wheel" @change=${this.changeControl}></range-control>
          <range-control id="brushMagnitude" name="brushMagnitude" type="range" min="1" max="31" step="1" helpText="Ctrl-Alt-Wheel" @change=${this.changeControl}></range-control>
          <range-control id="maxSize" name="heightmapMaxSize" type="range" min="256" max="8192" step="256" helpText="Resolution" @change=${this.changeControl}></range-control>
          <range-control id="clampMin" name="heightmapClampMin" type="range" min="0" max="1" step="0.01" @change=${this.changeControl}></range-control>
          <range-control id="clampMax" name="heightmapClampMax" type="range" min="0" max="1" step="0.01" @change=${this.changeControl}></range-control>
        </bezel-panel>
     </div>
    `
  }
}
