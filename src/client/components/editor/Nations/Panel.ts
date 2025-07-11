import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Nation } from "../../../../core/game/TerrainMapLoader";
import type { MapEditor } from "../Editor";
import { nationsPanelStyles } from "./styles";

@customElement("nations-panel")
export class NationsPanel extends LitElement {
	@property({ type: Object }) editor!: MapEditor;
	@property({ type: Array }) nations: Nation[] = [];
	@state() isOpen = true;

	static styles = nationsPanelStyles;

	show() {
		this.isOpen = true;
	}
	hide() {
		this.isOpen = false;
	}

	render() {
		if (!this.isOpen) return html``;

		return html`
      <div class="nations-panel">
        <div class="nations-panel-header">
          <div class="nations-panel-title">Nations (${this.nations.length})</div>
        </div>
        
        <div class="nations-list">
          ${
						this.nations.length === 0
							? html`
              <div class="empty-state">
                <div class="empty-icon">🏛️</div>
                <div class="empty-text">No nations yet</div>
                <div class="empty-subtext">Select the nation tool and click on the map to place nations</div>
              </div>
            `
							: this.nations.map(
									(nation, _index) => html`
              <div class="nation-item">
                <div class="nation-info">
                  <div class="nation-name">${nation.name}</div>
                  <div class="nation-details">
                    <span class="nation-flag">🏴 ${nation.flag}</span>
                    <span class="nation-strength">💪 ${nation.strength}</span>
                  </div>
                  <div class="nation-coords">
                    📍 ${nation.coordinates[0]}, ${nation.coordinates[1]}
                  </div>
                </div>
                <div class="nation-actions">
                  <button 
                    class="nation-action-btn zoom-btn"
                    @click=${() => this.zoomToNation(nation)}
                    title="Zoom to nation"
                  >🔍</button>
                  <button 
                    class="nation-action-btn edit-btn"
                    @click=${() => this.editNation(nation)}
                    title="Edit nation"
                  >✏️</button>
                  <button 
                    class="nation-action-btn delete-btn"
                    @click=${() => this.deleteNation(nation)}
                    title="Delete nation"
                  >🗑️</button>
                </div>
              </div>
            `,
								)
					}
        </div>
      </div>
    `;
	}

	private zoomToNation(nation: Nation): void {
		const x = nation.coordinates[0];
		const y = nation.coordinates[1];

		const canvas = this.editor.webglCanvas?.shadowRoot?.querySelector(
			"#map-canvas",
		) as HTMLCanvasElement;
		if (!canvas) return;

		const transform = {
			zoom: 4.0,
			panX: x * -4.0 + canvas.width / 2,
			panY: y * -4.0 + canvas.height / 2,
		};

		this.editor.updateTransform(transform);
	}

	private editNation(nation: Nation): void {
		this.editor.editingNation = nation;
		this.editor.isEditingNation = true;
		this.editor.pendingNationCoords = null;
		this.editor.nationModal?.show();
	}

	private deleteNation(nation: Nation): void {
		if (confirm(`Are you sure you want to delete "${nation.name}"?`)) {
			const index = this.editor.mapState.nations.indexOf(nation);
			if (index > -1) {
				this.editor.mapState.nations = this.editor.mapState.nations.filter(
					(n) => n !== nation,
				);
				this.nations = [...this.editor.mapState.nations];
				this.editor.requestUpdate();

				this.editor.renderer?.render(this.editor.mapState);
			}
		}
	}
}
