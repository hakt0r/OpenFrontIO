import { html, type TemplateResult } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { validateNationData } from '../engine/validation'
import type { NationData } from '../types'
import { handleNationSubmit } from '../engine/actions'
import { Modal } from './Modal'

@customElement('nation-modal')
export class NationModalElement extends Modal {
  @state() private nation = ''
  @state() private flag = 'custom'
  @state() private strength = '50'

  connectedCallback(): void {
    super.connectedCallback()
    this.updateFormFields()
  }

  public show = () => {
    this.updateFormFields()
    Modal.prototype.show.call(this)
  }

  public hide = () => {
    this.context.isNationVisible.value = false
    this.nation = ''
    this.flag = 'custom'
    this.strength = '50'
    Modal.prototype.hide.call(this)
  }

  willUpdate(changedProperties: Map<string, unknown>): void {
    super.willUpdate(changedProperties)
    if (!changedProperties.has('editor')) return
    this.updateFormFields()
  }

  private updateFormFields(): void {
    if (this.context.isEditingNation.value && this.context.editingNation.value) {
      this.nation = this.context.editingNation.value.name || ''
      this.flag = this.context.editingNation.value.flag || 'custom'
      this.strength = this.context.editingNation.value.strength?.toString() || '50'
    } else {
      this.nation = ''
      this.flag = 'custom'
      this.strength = '50'
    }
  }

  protected getTitle(): string {
    return this.context.isEditingNation.value ? '✏️ Edit Nation' : '🏛️ Add Nation'
  }

  protected getContent(): TemplateResult {
    return html`
      <div class="mb-4">
        <label for="name" class="block mb-1 font-medium text-editor-text text-sm">Nation Name:</label>
        <input 
          id="name"
          type="text" 
          .value=${this.nation}
          @input=${(e: Event) => {
            this.nation = (e.target as HTMLInputElement).value
            this.clearError()
          }}
          placeholder="Enter nation name"
          class="w-full px-3 py-2 border border-editor-border rounded text-sm box-border bg-editor-input-background text-editor-input-text"
        />
      </div>
      
      <div class="mb-4">
        <label for="flag" class="block mb-1 font-medium text-editor-text text-sm">Flag:</label>
        <input 
          id="flag"
          type="text" 
          .value=${this.flag}
          @input=${(e: Event) => {
            this.flag = (e.target as HTMLInputElement).value
            this.clearError()
          }}
          placeholder="e.g., usa, uk, custom"
          class="w-full px-3 py-2 border border-editor-border rounded text-sm box-border bg-editor-input-background text-editor-input-text"
        />
      </div>
      
      <div class="mb-4">
        <label for="strength" class="block mb-1 font-medium text-editor-text text-sm">Strength (1-100):</label>
        <input 
          id="strength"
          type="number" 
          min="1" 
          max="100" 
          .value=${this.strength}
          @input=${(e: Event) => {
            this.strength = (e.target as HTMLInputElement).value
            this.clearError()
          }}
          class="w-full px-3 py-2 border border-editor-border rounded text-sm box-border bg-editor-input-background text-editor-input-text"
        />
      </div>
    `
  }

  protected getActions(): TemplateResult {
    return html`
      <e-button
        .type=${'secondary'}
        .icon=${'❌'}
        @click=${this.close}
      />
      <e-button
        .type=${'primary'}
        .icon=${this.context.isEditingNation.value ? '💾' : '🆕'}
        @click=${this.handleSubmit}
      />
    `
  }

  protected close(): void {
    this.hide()
  }

  private handleSubmit(): void {
    const strength = Number.parseInt(this.strength)

    const validation = validateNationData(this.nation, strength)
    if (!validation.isValid) {
      this.dispatchError(validation.message || '')
      return
    }

    const nationData: NationData = {
      name: this.nation.trim(),
      flag: this.flag || 'custom',
      strength: strength,
    }

    this.submitNation(new CustomEvent('submit', { detail: nationData }))
    this.close()
  }

  private submitNation(event: CustomEvent): void {
    handleNationSubmit(
      event,
      this.context.mapState.value,
      this.context.editingNation.value,
      this.context.isEditingNation.value,
      this.context.pendingNationCoords.value,
      () => {
        this.context.editingNation.value = null
        this.context.isEditingNation.value = false
        this.context.pendingNationCoords.value = null

        this.editor?.requestUpdate()

        if (this.context.mapState.value) {
          this.engine?.render(this.context.mapState.value)
        }
      },
    )
  }
}
