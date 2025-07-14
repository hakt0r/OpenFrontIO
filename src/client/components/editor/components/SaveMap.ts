import { html, nothing, type TemplateResult } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { Modal } from './Modal'
import { validateMapName } from '../engine/validation'
import type { MapSaveData } from '../types'
import { handleSaveMapSubmit } from '../engine/actions'

@customElement('save-map-modal')
export class SaveMapModalElement extends Modal {
  @state() private mapName = ''
  @state() private saveType: 'local' | 'export' = 'local'

  connectedCallback(): void {
    super.connectedCallback()
    if (this.context.mapState.value) {
      this.mapName = this.context.mapState.value.mapName || 'Untitled Map'
    }
  }

  public show = (): void => {
    Modal.prototype.show.call(this)
    if (this.context.mapState.value) this.mapName = this.context.mapState.value.mapName || 'Untitled Map'
  }

  private handleSave(): void {
    const validation = validateMapName(this.mapName)
    if (!validation.isValid) {
      this.dispatchError(validation.message || '')
      return
    }

    const saveData: MapSaveData = {
      mapName: this.mapName.trim(),
      saveType: this.saveType,
    }

    this.saveMap(new CustomEvent('submit', { detail: saveData }))
    this.hide()
  }

  private async saveMap(event: CustomEvent): Promise<void> {
    await handleSaveMapSubmit(
      event,
      this.context.mapState.value,
      () => {},
      (error) => {
        this.context.editor.value?.setError(String(error))
      },
      this.context.engine.value,
    )
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
      <span slot="title">💾 Save Map</span>
      <div slot="actions">
        <e-button variant="secondary" .icon=${'❌'} @click=${this.hide} />
        <e-button variant="primary" .icon=${this.saveType === 'local' ? '💾' : '📥'} @click=${this.handleSave} />
      </div>
      
      <div class="mb-4">
        <label for="mapName" class="block mb-1 font-medium text-editor-text text-sm">Map Name:</label>
        <input 
          id="mapName"
          type="text" 
          .value=${this.mapName}
          @input=${(e: Event) => {
            this.mapName = (e.target as HTMLInputElement).value
            this.clearError()
          }}
          placeholder="Enter map name"
          class="w-full px-3 py-2 border border-editor-border rounded text-sm box-border bg-editor-input-background text-editor-input-text"
        />
      </div>

      <div class="space-y-2">
        <div 
          class="p-3 border rounded cursor-pointer transition-colors ${this.saveType === 'local' ? 'border-editor-primary bg-editor-primary bg-opacity-10' : 'border-editor-border hover:border-editor-primary'}"
          @click=${() => {
            this.saveType = 'local'
          }}
        >
          <div class="font-medium text-editor-text">💾 Save Locally</div>
          <div class="text-sm text-editor-secondary">Save to browser storage</div>
        </div>
        <div 
          class="p-3 border rounded cursor-pointer transition-colors ${this.saveType === 'export' ? 'border-editor-primary bg-editor-primary bg-opacity-10' : 'border-editor-border hover:border-editor-primary'}"
          @click=${() => {
            this.saveType = 'export'
          }}
        >
          <div class="font-medium text-editor-text">📥 Export File</div>
          <div class="text-sm text-editor-secondary">Download as JSON file</div>
        </div>
      </div>
    </modal-base>
    `
  }
}
