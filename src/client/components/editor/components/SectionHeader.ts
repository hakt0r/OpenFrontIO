import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { TailwindElement } from './TailwindElement'

@customElement('section-header')
export class SectionHeader extends TailwindElement {
  @property({ type: String })
  title = ''

  render() {
    return html`<h4 class="text-md font-semibold text-[--editor-text]">${this.title}</h4>`
  }
}

import { css } from 'lit'

export const sectionHeaderStyles = css`
  h4 {
    font-size: 11px;
    font-weight: 600;
    color: var(--editor-text);
    margin: 16px 0 8px 0;
    letter-spacing: 0.5px;
    margin: 4px 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
`
