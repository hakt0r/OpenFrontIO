import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { MapEditorState, EditorTransform } from "../types/MapEditorTypes";
import { canvasOverlayStyles } from "./styles.js";

@customElement("canvas-overlay")
export class CanvasOverlay extends LitElement {
	@property({ type: Object }) mapState!: MapEditorState;
	@property({ type: Object }) transform!: EditorTransform;
	@property({ type: String }) renderer = "Canvas";
	@property({ type: Object }) hoverCoords: { x: number; y: number } | null =
		null;
	@property({ type: Object }) hoverTerrainInfo: {
		type: string;
		emoji: string;
		magnitude: number;
	} | null = null;

	static styles = canvasOverlayStyles;

	render() {
		if (!this.mapState || !this.transform) return html``;

		return html`
      <div class="canvas-overlay">
        <div class="overlay-row">
          <span class="overlay-label">🎨</span>
          <span class="overlay-value">${this.renderer}</span>
        </div>
        <div class="overlay-row">
          <span class="overlay-label">📍</span>
          <span class="overlay-value">${this.transform.panX.toFixed(0)}x${this.transform.panY.toFixed(0)}</span>
        </div>
        <div class="overlay-row">
          <span class="overlay-label">🔍</span>
          <span class="overlay-value">${(this.transform.zoom * 100).toFixed(0)}%</span>
        </div>
        <div class="overlay-row">
          <span class="overlay-label">📏</span>
          <span class="overlay-value">${this.mapState.gameMap.width()}×${this.mapState.gameMap.height()}</span>
        </div>
        <div class="overlay-row">
          <span class="overlay-label">🌾</span>
          <span class="overlay-value">${this.mapState.gameMap.numLandTiles()}</span>
        </div>
        <div class="overlay-row">
          <span class="overlay-label">🏛️</span>
          <span class="overlay-value">${this.mapState.nations.length}</span>
        </div>
        ${
					this.hoverCoords && this.hoverTerrainInfo
						? html`
          <div class="overlay-divider"></div>
          <div class="overlay-row">
            <span class="overlay-label">🎯</span>
            <span class="overlay-value">${this.hoverCoords.x}, ${this.hoverCoords.y}</span>
          </div>
          <div class="overlay-row">
            <span class="overlay-label">${this.hoverTerrainInfo.emoji}</span>
            <span class="overlay-value">${this.hoverTerrainInfo.type} (${this.hoverTerrainInfo.magnitude})</span>
          </div>
        `
						: ""
				}
      </div>
    `;
	}
}
