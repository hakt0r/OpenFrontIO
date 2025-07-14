import { type CSSResultOrNative, LitElement, html, type TemplateResult, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { ErrorEvent } from '../types'
import { TailwindElement } from './TailwindElement'
import { styles as bezelStyles } from './Bezel'

export const styles = {
  container: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]',
  colors: `${bezelStyles.background} ${bezelStyles.border}`,
  modal:
    'backdrop-blur-md rounded-lg p-0 max-w-[90%] w-auto max-h-[90vh] h-auto overflow-y-auto shadow-lg overflow-hidden',
  title:
    'block text-lg font-bold bg-editor-secondary-background text-center text-editor-text p-4 m-0 border-b border-editor-border text-center p-4',
  body: 'text-editor-text p-6',
  error: 'text-red-400 text-sm mt-2 p-2 bg-red-400 bg-opacity-10 rounded border border-red-400',
  actions: 'flex gap-2 justify-end mt-5',
}

export abstract class Modal extends TailwindElement {
  @property({ type: String }) name: string
  @property({ type: String }) styles = styles
  @state() open = false
  @state() errorMessage = ''

  protected dispatchError = (message: string): void => {
    this.errorMessage = message
    this.emitError(message)
  }

  clearError = (): void => {
    this.errorMessage = ''
  }

  public show = (): void => {
    this.name ? (this.context[`is${this.name}Visible`].value = true) : (this.open = true)
  }

  public hide = (): void => {
    this.name ? (this.context[`is${this.name}Visible`].value = false) : (this.open = false)
    this.clearError()
    this.emit('close')
  }

  render = () => {
    if (this.name ? !this.context[`is${this.name}Visible`].value : !this.open) return nothing
    return html`
      <modal-base
        .name=${this.name}
        .open=${this.open}
        .errorMessage=${this.errorMessage}
        .closeHandler=${this.hide}
        .styles=${this.styles}
      >
        <slot name="title"></slot>
        <slot name="actions"></slot>
        <slot></slot>
      </modal-base>
    `
  }
}

@customElement('modal-base')
export abstract class ModalBase extends TailwindElement {
  @property({ type: String }) name: string
  @property({ type: String }) styles = styles
  @property({ type: Boolean }) open = false
  @property({ type: String }) errorMessage = ''
  @property({ type: Function }) closeHandler: (e: Event) => void = () => {}

  render() {
    if (this.name ? !this.context[`is${this.name}Visible`].value : !this.open) return nothing
    return html`
      <div class="${this.styles.container}" @click=${this.closeHandler}>
        <div class="${this.styles.modal} ${this.styles.colors}" @click=${(e: Event) => e.stopPropagation()}>
          <slot name="title" class="${this.styles.title}"></slot>
          <div class="${this.styles.body}">
            <slot></slot>
            <error-message .message=${this.errorMessage}></error-message>
            <slot name="actions" class="${this.styles.actions}"></slot>
          </div>
        </div>
      </div>
    `
  }
}

@customElement('error-message')
export class ErrorMessage extends TailwindElement {
  @property({ type: String }) message = ''
  render() {
    return this.message ? html`<div class="${styles.error}">${this.message}</div>` : nothing
  }
}
