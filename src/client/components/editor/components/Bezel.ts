import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { TailwindElement } from './TailwindElement'
import type { EditorStoreKey } from '../context'

export const styles = {
  background: 'backdrop-blur-sm bg-white/80',
  border: 'border border-editor-border rounded-lg shadow-lg',
  layout: 'flex flex-col gap-3 p-3 overflow-y-auto'
}

@customElement('bezel-panel')
export class Bezel extends TailwindElement {
  protected props: Array<EditorStoreKey> = []
  @property({ type: String }) class = ''
  @property({ type: String }) styles = styles

  render() {
    const classes = [this.styles.background, this.styles.border, this.styles.layout, this.class].join(' ')
    return html`
      <div class=${classes}>
        <slot></slot>
      </div>
      `
  }
}
