import { html, type TemplateResult } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { BaseModal } from "./Base";
import { validateMapDimensions } from "../utils/validation";
import type { MapCreationData } from "../types/MapEditorTypes";
import type { MapEditor } from "../Editor";
import { handleNewMapSubmit } from "../Editor/creator";

@customElement("new-map-modal")
export class NewMapModalElement extends BaseModal {
	@property({ type: Object }) editor!: MapEditor;
	@state() private width = "800";
	@state() private height = "600";
	@state() private name = "New Map";
	@state() private isOpen = false;

	public show(): void {
		this.isOpen = true;
		this.width = "800";
		this.height = "600";
		this.name = "New Map";
		this.clearError();
	}

	public hide(): void {
		this.isOpen = false;
		this.clearError();
	}

	protected close(): void {
		this.hide();
	}

	protected getTitle(): string {
		return "🆕 Create New Map";
	}

	protected getContent(): TemplateResult {
		return html`
      <div class="form-group">
        <label for="width">Width (200-5000):</label>
        <input 
          id="width"
          type="number" 
          min="200" 
          max="5000" 
          .value=${this.width}
          @input=${(e: Event) => {
						this.width = (e.target as HTMLInputElement).value;
						this.clearError();
					}}
        />
      </div>
      
      <div class="form-group">
        <label for="height">Height (200-5000):</label>
        <input 
          id="height"
          type="number" 
          min="200" 
          max="5000" 
          .value=${this.height}
          @input=${(e: Event) => {
						this.height = (e.target as HTMLInputElement).value;
						this.clearError();
					}}
        />
      </div>
      
      <div class="form-group">
        <label for="name">Map Name:</label>
        <input 
          id="name"
          type="text" 
          .value=${this.name}
          @input=${(e: Event) => {
						this.name = (e.target as HTMLInputElement).value;
						this.clearError();
					}}
        />
      </div>
    `;
	}

	protected getActions(): TemplateResult {
		return html`
      <button class="modal-button secondary" @click=${this.close}>Cancel</button>
      <button class="modal-button" @click=${this.handleSubmit}>Create</button>
    `;
	}

	private handleSubmit(): void {
		const width = Number.parseInt(this.width);
		const height = Number.parseInt(this.height);

		const validation = validateMapDimensions(width, height);
		if (!validation.isValid) {
			this.dispatchError(validation.message || "");
			return;
		}

		const mapData: MapCreationData = {
			width,
			height,
			name: this.name || "New Map",
		};

		this.newMap(new CustomEvent("submit", { detail: mapData }));
		this.close();
	}

	private async newMap(event: CustomEvent): Promise<void> {
		await handleNewMapSubmit(event, (mapState) => {
			this.editor.updateMapState(mapState);
		});
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
}
