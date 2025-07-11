import { html, type TemplateResult, css } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { BaseModal } from "./Base";
import { getAllLocalMapNames, deleteLocalMap } from "../Editor/persistence";
import type { MapEditor } from "../Editor";

@customElement("load-map-modal")
export class LoadMapModalElement extends BaseModal {
	@property({ type: Object }) editor!: MapEditor;
	@state() private selectedMap: string | null = null;
	@state() private isOpen = false;
	@state() private serverMaps: string[] = [
		"africa",
		"asia",
		"australia",
		"baikal",
		"betweentwoseas",
		"blacksea",
		"britannia",
		"deglaciatedantarctica",
		"eastasia",
		"europe",
		"europeclassic",
		"falklandislands",
		"faroeislands",
		"gatewaytotheatlantic",
		"giantworldmap",
		"halkidiki",
		"iceland",
		"italia",
		"mars",
		"mena",
		"northamerica",
		"oceania",
		"pangaea",
		"southamerica",
		"straitofgibraltar",
		"world",
	];
	@state() private localMaps: string[] = [];
	@state() private isLoadingLocalMaps = false;
	@state() private deletingMapId: string | null = null;

	static styles = [
		BaseModal.styles,
		css`
      .map-section {
        margin-bottom: 24px;
      }

      .section-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 12px;
        color: var(--primaryColor);
        padding-bottom: 8px;
        border-bottom: 1px solid #333;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .loading-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid #333;
        border-top: 2px solid var(--primaryColor);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .map-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 8px;
      }

      .map-item {
        padding: 12px;
        border: 1px solid #333;
        border-radius: 6px;
        cursor: pointer;
        transition: var(--transition);
        background: #2a2a2a;
        position: relative;
      }

      .map-item:hover {
        border-color: var(--primaryColor);
        background: #333;
      }

      .map-item.selected {
        border-color: var(--primaryColor);
        background: var(--primaryColor);
        color: white;
      }

      .map-name {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .map-info {
        font-size: 12px;
        opacity: 0.7;
      }

      .map-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 8px;
      }

      .delete-button {
        background: #dc2626;
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: var(--transition);
        opacity: 0.7;
      }

      .delete-button:hover {
        background: #b91c1c;
        opacity: 1;
      }

      .delete-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .empty-state {
        text-align: center;
        color: #888;
        font-style: italic;
        padding: 20px;
      }

      .refresh-button {
        background: none;
        border: none;
        color: var(--primaryColor);
        cursor: pointer;
        font-size: 14px;
        padding: 4px 8px;
        border-radius: 4px;
        transition: var(--transition);
      }

      .refresh-button:hover {
        background: rgba(37, 99, 235, 0.1);
      }
    `,
	];

	connectedCallback(): void {
		super.connectedCallback();
		this.loadLocalMaps();
	}

	public show(): void {
		this.isOpen = true;
		this.refreshLocalMaps();
	}

	public hide(): void {
		this.isOpen = false;
		this.clearError();
		this.selectedMap = null;
	}

	private async loadLocalMaps(): Promise<void> {
		this.isLoadingLocalMaps = true;
		try {
			this.localMaps = await getAllLocalMapNames();
		} catch (error) {
			console.error("Failed to load local maps:", error);
			this.localMaps = [];
		} finally {
			this.isLoadingLocalMaps = false;
		}
	}

	private async refreshLocalMaps(): Promise<void> {
		await this.loadLocalMaps();
	}

	private async handleDeleteMap(mapId: string, event: Event): Promise<void> {
		event.stopPropagation();

		if (
			!confirm(
				`Are you sure you want to delete "${mapId}"? This action cannot be undone.`,
			)
		) {
			return;
		}

		this.deletingMapId = mapId;
		try {
			await deleteLocalMap(mapId);
			await this.loadLocalMaps();

			if (this.selectedMap === `local:${mapId}`) {
				this.selectedMap = null;
			}
		} catch (error) {
			console.error("Failed to delete map:", error);
			this.dispatchError(`Failed to delete map: ${error}`);
		} finally {
			this.deletingMapId = null;
		}
	}

	protected getModalClasses(): string {
		return "modal-content large";
	}

	protected getBodyClasses(): string {
		return "modal-body scrollable";
	}

	protected getTitle(): string {
		return "📂 Load Map";
	}

	protected getContent(): TemplateResult {
		return html`
      <div class="map-section">
        <div class="section-title">🌍 Server Maps</div>
        <div class="map-grid">
          ${this.serverMaps.map(
						(map) => html`
            <div 
              class="map-item ${this.selectedMap === map ? "selected" : ""}"
              @click=${() => this.selectMap(map, false)}
            >
              <div class="map-name">${map}</div>
              <div class="map-info">Official server map</div>
            </div>
          `,
					)}
        </div>
      </div>

      <div class="map-section">
        <div class="section-title">
          💾 Local Maps
          ${
						this.isLoadingLocalMaps
							? html`<div class="loading-spinner"></div>`
							: html`
            <button 
              class="refresh-button" 
              @click=${this.refreshLocalMaps}
              title="Refresh local maps"
            >
              🔄
            </button>
          `
					}
        </div>
        ${
					this.localMaps.length > 0
						? html`
          <div class="map-grid">
            ${this.localMaps.map((key) => {
							const mapName = key.replace(/^mapeditor_/, "");
							const isSelected = this.selectedMap === `local:${key}`;
							const isDeleting = this.deletingMapId === key;
							return html`
                <div 
                  class="map-item ${isSelected ? "selected" : ""}"
                  @click=${() => this.selectMap(key, true)}
                >
                  <div class="map-name">${mapName}</div>
                  <div class="map-info">Saved locally</div>
                  <div class="map-actions">
                    <span></span>
                    <button 
                      class="delete-button"
                      @click=${(e: Event) => this.handleDeleteMap(key, e)}
                      ?disabled=${isDeleting}
                      title="Delete this map"
                    >
                      ${isDeleting ? "..." : "🗑️"}
                    </button>
                  </div>
                </div>
              `;
						})}
          </div>
        `
						: html`
          <div class="empty-state">
            ${this.isLoadingLocalMaps ? "Loading local maps..." : "No local maps found. Create and save a map to see it here."}
          </div>
        `
				}
      </div>
    `;
	}

	protected getActions(): TemplateResult {
		return html`
      <button class="modal-button secondary" @click=${this.close}>Cancel</button>
      <button 
        class="modal-button" 
        ?disabled=${!this.selectedMap}
        @click=${this.handleLoad}
      >
        Load Map
      </button>
    `;
	}

	private selectMap(mapName: string, isLocal: boolean): void {
		this.selectedMap = isLocal ? `local:${mapName}` : mapName;
		this.clearError();
	}

	private async handleLoad(): Promise<void> {
		if (!this.selectedMap) return;

		const loadData = { mapName: this.selectedMap };
		this.loadMap(new CustomEvent("submit", { detail: loadData }));
		this.close();
	}

	private async loadMap(event: CustomEvent): Promise<void> {
		const { loadMap } = await import("../Editor/loader");
		console.log("LoadMapModal about to call loadMap with event:", event.detail);
		await loadMap(
			event,
			(mapState) => {
				console.log(
					"LoadMapModal success callback - mapState nations:",
					mapState.nations.length,
				);
				this.editor.updateMapState(mapState);
			},
			(error) => {
				console.log("LoadMapModal error callback:", error);
				this.editor.setError(error);
			},
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
