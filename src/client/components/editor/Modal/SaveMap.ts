import { html, type TemplateResult, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { BaseModal } from "./Base";
import { validateMapName } from "../utils/validation";
import type { MapSaveData } from "../types/MapEditorTypes";
import type { MapEditor } from "../Editor";

@customElement("save-map-modal")
export class SaveMapModalElement extends BaseModal {
	@property({ type: Object }) editor!: MapEditor;
	@state() private mapName = "";
	@state() private saveType: "local" | "export" = "local";
	@state() private isOpen = false;

	static styles = [
		BaseModal.styles,
		css`
      .save-options {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }

      .save-option {
        flex: 1;
        padding: 12px;
        border: 1px solid #333;
        border-radius: 6px;
        cursor: pointer;
        text-align: center;
        transition: var(--transition);
        background: #2a2a2a;
      }

      .save-option:hover {
        border-color: var(--primaryColor);
        background: #333;
      }

      .save-option.selected {
        border-color: var(--primaryColor);
        background: var(--primaryColor);
        color: white;
      }

      .save-option-title {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .save-option-desc {
        font-size: 12px;
        opacity: 0.8;
      }
    `,
	];

	connectedCallback(): void {
		super.connectedCallback();
		if (this.editor.mapState) {
			this.mapName = this.editor.mapState.mapName || "Untitled Map";
		}
	}

	public show(): void {
		this.isOpen = true;
		if (this.editor.mapState) {
			this.mapName = this.editor.mapState.mapName || "Untitled Map";
		}
	}

	public hide(): void {
		this.isOpen = false;
		this.clearError();
	}

	protected getTitle(): string {
		return "💾 Save Map";
	}

	protected getContent(): TemplateResult {
		return html`
      <div class="form-group">
        <label for="mapName">Map Name:</label>
        <input 
          id="mapName"
          type="text" 
          .value=${this.mapName}
          @input=${(e: Event) => {
						this.mapName = (e.target as HTMLInputElement).value;
						this.clearError();
					}}
          placeholder="Enter map name"
        />
      </div>

      <div class="save-options">
        <div 
          class="save-option ${this.saveType === "local" ? "selected" : ""}"
          @click=${() => {
						this.saveType = "local";
					}}
        >
          <div class="save-option-title">💾 Save Locally</div>
          <div class="save-option-desc">Save to browser storage</div>
        </div>
        <div 
          class="save-option ${this.saveType === "export" ? "selected" : ""}"
          @click=${() => {
						this.saveType = "export";
					}}
        >
          <div class="save-option-title">📥 Export File</div>
          <div class="save-option-desc">Download as JSON file</div>
        </div>
      </div>
    `;
	}

	protected getActions(): TemplateResult {
		return html`
      <button class="modal-button secondary" @click=${this.close}>Cancel</button>
      <button class="modal-button" @click=${this.handleSave}>
        ${this.saveType === "local" ? "Save" : "Export"}
      </button>
    `;
	}

	private handleSave(): void {
		const validation = validateMapName(this.mapName);
		if (!validation.isValid) {
			this.dispatchError(validation.message || "");
			return;
		}

		const saveData: MapSaveData = {
			mapName: this.mapName.trim(),
			saveType: this.saveType,
		};

		this.saveMap(new CustomEvent("submit", { detail: saveData }));
		this.close();
	}

	private async saveMap(event: CustomEvent): Promise<void> {
		const { handleSaveMapSubmit } = await import("../Editor/exporter");
		await handleSaveMapSubmit(
			event,
			this.editor.mapState,
			() => {},
			(error) => {
				this.editor.setError(error);
			},
			this.editor.renderer,
		);
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
}
