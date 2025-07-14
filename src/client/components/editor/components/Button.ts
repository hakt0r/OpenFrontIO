import { html, nothing, TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { TailwindElement } from './TailwindElement'

export const styles = {
  button: 'flex items-center justify-center rounded cursor-pointer transition-all duration-150 ease-in-out text-lg p-1 overflow-hidden',
  colors: 'bg-editor-component-background border border-editor-border hover:border-editor-secondary-hover hover:bg-editor-secondary-hover',
  primary: 'bg-editor-primary border-editor-primary text-editor-text-against-color hover:bg-editor-primary-hover hover:border-editor-primary-hover',
  secondary: 'bg-editor-secondary border-editor-secondary text-editor-text hover:bg-editor-secondary-hover hover:border-editor-secondary-hover',
  danger: 'bg-editor-error-background text-editor-text-against-color hover:bg-editor-error-background-hover hover:border-editor-error-background-hover',
  active: 'border-editor-primary bg-editor-button-active-background text-editor-button-active-text shadow-lg',
  icon: 'text-shadow-[0_0_2px_var(--editor-primary-hover)]',
  focus: 'focus:outline-none focus:ring-2 focus:ring-editor-primary',
  disabled: 'opacity-50 cursor-not-allowed',
}

@customElement('e-button')
export class EButton extends TailwindElement {
  @property({ type: Boolean }) active = false
  @property({ type: Boolean }) disabled = false
  @property({ type: Function }) onClick: (event: MouseEvent) => void = () => {}
  @property({ type: Object }) styles = styles as Record<string, string>
  @property({ type: String }) classes = ''
  @property({ type: String }) icon = ''
  @property({ type: String }) title = ''
  @property({ type: String }) variant: 'primary' | 'secondary' | 'danger' | null = null

  private _handleClick = (event: MouseEvent) => {
    if (this.disabled || !this.onClick) return
    this.onClick(event)
  }

  render(): TemplateResult | typeof nothing {
    const classes = [
      this.classes,
      this.styles.button,
      this.variant ? this.styles[this.variant] : this.styles.colors,
      this.active ? this.styles.active : '',
      this.disabled ? this.styles.disabled : '',
    ]
      .filter(Boolean)
      .join(' ')

    return html`<button
      title="${this.title}"
      class="${classes}"
      ?disabled=${this.disabled}
      @click=${this._handleClick}
    >
      ${this.icon ? html`<span>${this.icon}</span>` : html`<span class="button-text">${this.title}</span>`}
      <slot></slot>
    </button>`
  }
}
