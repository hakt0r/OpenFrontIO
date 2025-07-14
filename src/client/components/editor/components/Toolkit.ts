import { nothing, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { TailwindElement } from './TailwindElement'

@customElement('only-show')
export class OnlyShow extends TailwindElement {
  @property({ type: Boolean }) if: boolean
  @property({ type: String }) class = ''
  render() {
    if (!this.if) return nothing
    return html`<slot class="${this.class}"></slot>`
  }
}
