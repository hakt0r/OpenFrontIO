import { html, nothing, type TemplateResult } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { validateMapDimensions } from '../engine/validation'
import type { MapCreationData } from '../types'
import { handleNewMapSubmit } from '../engine/actions'
import { Modal } from './Modal'

@customElement('new-map-modal')
export class NewMapModalElement extends Modal {
  protected props = ['isNewMapVisible']
  @state() private width = '800'
  @state() private height = '600'
  @state() private mapName = 'New Map'

  public show = (): void => {
    this.width = '800'
    this.height = '600'
    this.mapName = 'New Map'
    Modal.prototype.show.call(this)
  }

  public hide = (): void => {
    Modal.prototype.hide.call(this)
  }

  private handleSubmit(): void {
    const width = Number.parseInt(this.width)
    const height = Number.parseInt(this.height)

    const validation = validateMapDimensions(width, height)
    if (!validation.isValid) {
      this.dispatchError(validation.message || '')
      return
    }

    const mapData: MapCreationData = {
      width,
      height,
      name: this.mapName || 'New Map',
    }

    this.newMap(new CustomEvent('submit', { detail: mapData }))
    this.hide()
  }

  private async newMap(event: CustomEvent): Promise<void> {
    await handleNewMapSubmit(event, (mapState) => {
      this.editor.updateMapState(mapState)
    })
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
        <span slot="title">🆕 Create New Map</span>

        <div slot="actions">
          <e-button variant="secondary" .icon=${'❌'} @click=${this.hide} />
          <e-button variant="primary" .icon=${'🆕'} @click=${this.handleSubmit} />
        </div>

        <div class="mb-4">
          <label for="width" class="block mb-1 font-medium text-editor-text text-sm">Width (200-5000):</label>
          <input 
            id="width"
            type="number" 
            min="200" 
            max="5000" 
            .value=${this.width}
            @input=${(e: Event) => {
              this.width = (e.target as HTMLInputElement).value
              this.clearError()
            }}
            class="w-full px-3 py-2 border border-editor-border rounded text-sm box-border bg-editor-input-background text-editor-input-text"
          />
        </div>
          
        <div class="mb-4">
          <label for="height" class="block mb-1 font-medium text-editor-text text-sm">Height (200-5000):</label>
          <input 
            id="height"
            type="number" 
            min="200" 
            max="5000" 
            .value=${this.height}
            @input=${(e: Event) => {
              this.height = (e.target as HTMLInputElement).value
              this.clearError()
            }}
            class="w-full px-3 py-2 border border-editor-border rounded text-sm box-border bg-editor-input-background text-editor-input-text"
          />
        </div>
        
        <div class="mb-4">
          <label for="name" class="block mb-1 font-medium text-editor-text text-sm">Map Name:</label>
          <input 
            id="name"
            type="text" 
            .value=${this.mapName}
            @input=${(e: Event) => {
              this.mapName = (e.target as HTMLInputElement).value
              this.clearError()
            }}
            class="w-full px-3 py-2 border border-editor-border rounded text-sm box-border bg-editor-input-background text-editor-input-text"
          />
        </div>
      </modal-base>`
  }
}
