import './Bezel'
import './BrushSection'
import './RangeControl'
import { customElement } from 'lit/decorators.js'
import { html, nothing } from 'lit'
import { TailwindElement } from './TailwindElement'
import { switchTool, switchBrushType } from '../engine/actions'
import type { EditorTool } from '../types'
import type { EditorStoreKey } from '../context'

@customElement('terrain-panel')
export class TerrainPanel extends TailwindElement {
  protected props: Array<EditorStoreKey> = [
    'isTerrainVisible',
    'currentTool',
    'currentBrush',
    'brushSize',
    'brushMagnitude',
    'heightmapMaxSize',
    'heightmapClampMin',
    'heightmapClampMax'
  ]

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
    const canvas = this.editor.canvas
    const engine = this.engine
    const renderer = engine?.renderer
    if (!canvas || !engine || !renderer) return

    const canvasRect = canvas.getBoundingClientRect()
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
      const newMagnitude = Math.max(1, Math.min(31, context.brushMagnitude.value + delta))
      this.editor.setBrushMagnitude(newMagnitude)
      return
    }

    if (e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      const newTool = switchTool(context.currentTool.value, e.deltaY > 0 ? 1 : -1)
      this.editor.setTool(newTool)
      return
    }

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      e.stopPropagation()
      const newBrush = switchBrushType(context.currentBrush.value, e.deltaY > 0 ? 1 : -1)
      this.editor.setBrush(newBrush)
      return
    }

    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      e.stopPropagation()
      this.editor.adjustBrushSize(e.deltaY > 0 ? -1 : 1)
      return
    }
  }

  private onKey = (e: KeyboardEvent): void => {
    if (!this.context.isTerrainVisible.value || e.target !== document.body) return

    const toolMap: Record<string, EditorTool> = {
      q: 'paint',
      e: 'erase',
      r: 'nation'
    }

    const tool = toolMap[e.key]
    if (tool) {
      e.preventDefault()
      this.context.currentTool.value = tool
    }
  }

  show = () => {
    this.context.isTerrainVisible.value = true
  }

  hide = () => {
    this.context.isTerrainVisible.value = false
  }

  render() {
    if (!this.context.isTerrainVisible.value) return nothing
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
          <range-control id="brushSize" name="brushSize" type="range" min="1" max="20" step="1" helpText="Wheel"></range-control>
          <range-control id="brushMagnitude" name="brushMagnitude" type="range" min="1" max="31" step="1" helpText="Ctrl-Alt-Wheel"></range-control>
          <range-control id="maxSize" name="heightmapMaxSize" type="range" min="256" max="8192" step="256" helpText="Resolution"></range-control>
          <range-control id="clampMin" name="heightmapClampMin" type="range" min="0" max="1" step="0.01"></range-control>
          <range-control id="clampMax" name="heightmapClampMax" type="range" min="0" max="1" step="0.01"></range-control>
        </bezel-panel>
     </div>
    `
  }
}
