import { html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { TailwindElement } from './TailwindElement'

@customElement('error-toast')
export class ErrorToast extends TailwindElement {
  protected props = ['errorMessage']
  @property({ type: String }) message = ''
  @property({ type: Boolean }) visible = false

  private hideTimeout: number | null = null

  willUpdate(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('visible') && this.visible) this.autoHide()
  }

  private autoHide(): void {
    if (this.hideTimeout) clearTimeout(this.hideTimeout)
    this.hideTimeout = window.setTimeout(() => this.hide(), 5000)
  }

  private hide(): void {
    this.visible = false
    this.emit('hide')
  }

  render() {
    if (!this.message) return nothing
    return html`
      <div
        class="fixed top-5 right-5 px-4 py-3 rounded-lg cursor-pointer z-[10001] max-w-[300px] break-words shadow-lg border transition-all duration-300 ease-out 
          bg-editor-error-background text-editor-error-text border-editor-border 
          ${this.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
          hover:bg-editor-error-background-hover"
        @click=${this.hide}
      >❌ ${this.message}</div>
    `
  }
}
