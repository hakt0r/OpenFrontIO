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

  @property({ type: String }) type = 'tool'
  @property({ type: String }) value = 'brush'
  @property({ type: Function }) onclick = (event: MouseEvent) => {
    // Direct signal updates - no event emission needed
    const newTool = this.type === 'tool' ? allTools[this.value] : 'paint'
    const newBrush = this.type === 'brush' ? allBrushes[this.value] : this.context.currentBrush.value
    
    this.context.currentTool.value = newTool
    this.context.currentBrush.value = newBrush
    
    // Update engine directly through context
    const [engineBrushType, brushMagnitude] = getEngineBrushValues(this.context)
    this.context.engine.value?.renderer.setBrushType(engineBrushType)
    this.context.engine.value?.renderer.setBrushMagnitude(brushMagnitude)
    
    event.stopPropagation()
    event.preventDefault()
  }

  constructor() {
    super()
    this.classes = 'w-full'
  }

  willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    super.willUpdate(changedProperties)
    ;[this.icon, this.title, this.active] =
      this.type === 'tool'
        ? [BrushEmoji[this.value], BrushName[this.value], this.context.currentTool.value === this.value]
        : [BrushEmoji[this.value], BrushName[this.value], this.context.currentBrush.value === this.value]
  }
}
