import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { TailwindElement } from './TailwindElement'

@customElement('range-control')
export class SidebarRangeControl extends TailwindElement {
  @property({ type: String }) name!: string
  @property({ type: String }) helpText!: string
  @property({ type: Number }) min!: number
  @property({ type: Number }) max!: number
  @property({ type: Number }) step!: number

  constructor() {
    super()
  }

  private _dispatchControlChange(controlId: string, value: number | string) {
    this.emitChange({ controlId, value })
  }

  private getCurrentValue(): number {
    // Get the current value from the context based on the control name
    if (this.name === 'brushSize') {
      return this.context.brushSize.value
    } else if (this.name === 'brushMagnitude') {
      return this.context.brushMagnitude.value
    } else if (this.name === 'heightmapClampMin') {
      return this.context.heightmapClampMin.value
    } else if (this.name === 'heightmapClampMax') {
      return this.context.heightmapClampMax.value
    } else if (this.name === 'heightmapMaxSize') {
      return this.context.heightmapMaxSize.value
    }
    // Fallback for any other controls that might use a default value
    return 0
  }

  render() {
    const currentValue = this.getCurrentValue()
    const min = this.min || 0
    const max = this.max || 100
    const step = this.step || 1
    
    // Create display name from property name
    const displayName = this.name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()

    return html`
      <div class="flex items-center justify-between mb-2 text-editor-text">
        <div>
          <b class="text-sm">${displayName}</b>
          <div class="text-xs text-editor-secondary opacity-80">${this.helpText}</div>
        </div>
        <span class="bg-editor-component-background px-[6px] py-[3px] text-editor-primary font-semibold min-w-[24px] text-center text-[11px] rounded-[3px] border border-editor-border">${currentValue}</span>
      </div>
      <div class="flex items-center gap-2 text-editor-text opacity-80">
        <span class="px-[6px] py-[3px] font-semibold min-w-[24px] text-center text-[11px] rounded-[3px] border border-editor-border text-editor-secondary bg-editor-component-background select-none">${min}</span>
        <div class="relative flex-grow h-4 flex items-center">
            <div class="absolute w-full h-1.5 bg-editor-border rounded-full"></div>
            <input
            type="range"
            min="${min}"
            max="${max}"
            step="${step}"
            .value=${currentValue}
            @input=${(e: Event) => this._dispatchControlChange(this.name, Number((e.target as HTMLInputElement).value))}
            class="w-full appearance-none h-1 rounded bg-transparent outline-none opacity-70 transition-opacity duration-200 [&:hover]:opacity-100 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-editor-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.3)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:ease-in-out [&::-webkit-slider-thumb:hover]:scale-120 [&::-webkit-slider-thumb:hover]:shadow-[0_3px_6px_rgba(0,0,0,0.4)] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-editor-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.3)] relative"
            />
        </div>
        <span class="px-[6px] py-[3px] font-semibold min-w-[24px] text-center text-[11px] rounded-[3px] border border-editor-border text-editor-secondary bg-editor-component-background select-none">${max}</span>
      </div>
    `
  }
}
