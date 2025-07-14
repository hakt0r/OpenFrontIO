import { html, nothing, TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { TailwindElement } from './TailwindElement'
import { BrushType, EditorTool, BrushEmoji, getEngineBrushValues, BrushName } from '../types'
import { EButton } from './Button'

const allTools = Object.fromEntries(Object.values(EditorTool).map((tool) => [tool, tool]))
const allBrushes = Object.fromEntries(Object.values(BrushType).map((brush) => [brush, brush]))

export const styles = {
  layout: 'flex items-center justify-center min-w-4 min-h-4',
  colors:
    'bg-editor-component-background border border-editor-border rounded cursor-pointer transition-all duration-150 ease-in-out text-lg p-1 w-full',
  hover: 'hover:border-editor-secondary-hover hover:bg-editor-secondary-hover',
  focus: 'focus:outline-none focus:ring-2 focus:ring-editor-primary',
  active: 'border-editor-primary bg-editor-button-active-background text-editor-button-active-text',
  disabled: 'opacity-50 cursor-not-allowed',
  icon: 'text-shadow-[0_0_2px_var(--editor-primary-hover)]',
}

@customElement('tool-button')
export class ToolButton extends EButton {
  protected props = ['currentTool', 'currentBrush']
  // @property({ type: String }) styles = styles
  @property({ type: String }) type = 'tool'
  @property({ type: String }) value = 'brush'

  @property({ type: Function }) onClick = (event: MouseEvent) => {
    const actionData = {
      type: this.type,
      value: this.value,
      tool: this.type === 'tool' ? allTools[this.value] : 'paint',
      brush: this.type === 'brush' ? allBrushes[this.value] : this.context.currentBrush.value,
    }
    
    // Emit the action event first
    this.emitAction('tool-select', actionData)
    
    // Then handle the state change
    const c = this.context
    c.currentTool.value = actionData.tool
    c.currentBrush.value = actionData.brush
    const [engineBrushType, brushMagnitude] = getEngineBrushValues(this.context)
    c.engine.value?.renderer.setBrushType(engineBrushType)
    c.engine.value?.renderer.setBrushMagnitude(brushMagnitude)
    
    event.stopPropagation()
    event.preventDefault()
  }

  constructor() {
    super()
    this.classes = 'w-full'
  }

  connectedCallback() {
    super.connectedCallback()
    // Subscribe to context changes to force re-render when tools/brushes change
    this.context.currentTool.subscribe(() => this.requestUpdate())
    this.context.currentBrush.subscribe(() => this.requestUpdate())
  }

  willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    super.willUpdate(changedProperties)
    ;[this.icon, this.title, this.active] =
      this.type === 'tool'
        ? [BrushEmoji[this.value], BrushName[this.value], this.context.currentTool.value === this.value]
        : [BrushEmoji[this.value], BrushName[this.value], this.context.currentBrush.value === this.value]
  }
}
