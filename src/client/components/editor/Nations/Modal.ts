import { html, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { BaseModal } from "../Modal/Base";
import { validateNationData } from "../utils/validation";
import type { NationData } from "../types/MapEditorTypes";
import type { MapEditor } from "../Editor";

@customElement("nation-modal")
export class NationModalElement extends BaseModal {
	@property({ type: Object }) editor!: MapEditor;
	@state() private name = "";
	@state() private flag = "custom";
	@state() private strength = "50";
	@state() private isOpen = false;

	connectedCallback(): void {
		super.connectedCallback();
		this.updateFormFields();
	}

	public show(): void {
		this.isOpen = true;
		this.updateFormFields();
	}

	public hide(): void {
		this.isOpen = false;
		this.clearError();
		this.name = "";
		this.flag = "custom";
		this.strength = "50";
	}

	updated(changedProperties: Map<string, unknown>): void {
		if (changedProperties.has("editor")) {
			this.updateFormFields();
		}
	}

	private updateFormFields(): void {
		if (this.editor.isEditingNation && this.editor.editingNation) {
			this.name = this.editor.editingNation.name || "";
			this.flag = this.editor.editingNation.flag || "custom";
			this.strength = this.editor.editingNation.strength?.toString() || "50";
		} else {
			this.name = "";
			this.flag = "custom";
			this.strength = "50";
		}
	}

	protected getTitle(): string {
		return this.editor.isEditingNation ? "✏️ Edit Nation" : "🏛️ Add Nation";
	}

	protected getContent(): TemplateResult {
		return html`
      <div class="form-group">
        <label for="name">Nation Name:</label>
        <input 
          id="name"
          type="text" 
          .value=${this.name}
          @input=${(e: Event) => {
						this.name = (e.target as HTMLInputElement).value;
						this.clearError();
					}}
          placeholder="Enter nation name"
        />
      </div>
      
      <div class="form-group">
        <label for="flag">Flag:</label>
        <input 
          id="flag"
          type="text" 
          .value=${this.flag}
          @input=${(e: Event) => {
						this.flag = (e.target as HTMLInputElement).value;
						this.clearError();
					}}
          placeholder="e.g., usa, uk, custom"
        />
      </div>
      
      <div class="form-group">
        <label for="strength">Strength (1-100):</label>
        <input 
          id="strength"
          type="number" 
          min="1" 
          max="100" 
          .value=${this.strength}
          @input=${(e: Event) => {
						this.strength = (e.target as HTMLInputElement).value;
						this.clearError();
					}}
        />
      </div>
    `;
	}

	protected getActions(): TemplateResult {
		return html`
      <button class="modal-button secondary" @click=${this.close}>Cancel</button>
      <button class="modal-button" @click=${this.handleSubmit}>
        ${this.editor.isEditingNation ? "Update" : "Add"} Nation
      </button>
    `;
	}

	protected close(): void {
		this.hide();
	}

	render() {
		if (!this.isOpen) return html``;

		return html`
      <div class="modal-overlay" @click=${this.close}>
        <div class="${this.getModalClasses()}" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">${this.getTitle()}</div>
          
          <div class="${this.getBodyClasses()}">
            ${this.getContent()}
            
            ${
							this.errorMessage
								? html`
              <div class="error-message">${this.errorMessage}</div>
            `
								: ""
						}
            
            <div class="modal-actions">
              ${this.getActions()}
            </div>
          </div>
        </div>
      </div>
    `;
	}

	private handleSubmit(): void {
		const strength = Number.parseInt(this.strength);

		const validation = validateNationData(this.name, strength);
		if (!validation.isValid) {
			this.dispatchError(validation.message || "");
			return;
		}

		const nationData: NationData = {
			name: this.name.trim(),
			flag: this.flag || "custom",
			strength: strength,
		};

		this.submitNation(new CustomEvent("submit", { detail: nationData }));
		this.close();
	}

	private submitNation(event: CustomEvent): void {
		const { handleNationSubmit } = require("./Nation.actions");
		handleNationSubmit(
			event,
			this.editor.mapState,
			this.editor.editingNation,
			this.editor.isEditingNation,
			this.editor.pendingNationCoords,
			() => {
				this.editor.editingNation = null;
				this.editor.isEditingNation = false;
				this.editor.pendingNationCoords = null;

				this.editor.requestUpdate();

				this.editor.renderer?.render(this.editor.mapState);
			},
		);
	}
}
