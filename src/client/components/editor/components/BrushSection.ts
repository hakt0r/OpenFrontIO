import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import './ToolButton'
import './SectionHeader'
import { TailwindElement } from './TailwindElement'

export const styles = {
  containerLayout: 'flex flex-col gap-1.5',
  layout: 'grid grid-cols-3 gap-1 w-full'
}

@customElement('sidebar-brush-section')
export class SidebarBrushSection extends TailwindElement {
  @property({ type: String }) title = 'Brushes'
  @property({ type: Object }) styles = styles

  render() {
    return html`
    <bezel-panel class=${this.styles.containerLayout}>
      <section-header title=${this.title}></section-header>
       <div class=${this.styles.layout}>
        <slot></slot>
      </div>
    </bezel-panel>
    `
  }
}
