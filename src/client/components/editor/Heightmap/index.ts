import { buttonStyles } from "../styles/buttons.styles";
import { customElement, property, state } from "lit/decorators.js";
import { GameMapImpl } from "../../../../core/game/GameMap";
import { LitElement, html, css } from "lit";
import { sidebarStyles } from "../TerrainPanel/styles";
import { terrainSliderStyles } from "./styles";
import { toolbarStyles } from "../Toolbar/styles";
import type { MapEditor } from "../Editor";
import type { TerrainThresholds } from "../types/MapEditorTypes";

@customElement("heightmap-toolbar")
export class HeightmapToolbarElement extends LitElement {
	@property({ type: Object }) editor!: MapEditor;
	@state() isOpen = false;

	static styles = css`
    ${toolbarStyles}
    ${buttonStyles}
    ${sidebarStyles}
    ${terrainSliderStyles}
  `;

	private isDraggingTerrain = false;
	private draggedThreshold: string | null = null;
	private _lastTerrainThresholds: TerrainThresholds | null = null;

	willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
		super.willUpdate(changedProperties);

		if (this.editor) {
			const terrainThresholdsChanged =
				JSON.stringify(this.editor.terrainThresholds) !==
				JSON.stringify(this._lastTerrainThresholds);

			if (terrainThresholdsChanged) {
				this._lastTerrainThresholds = { ...this.editor.terrainThresholds };
			}
		}
	}

	show() {
		this.isOpen = true;
		this.requestUpdate();
	}

	hide() {
		this.isOpen = false;
		this.requestUpdate();
	}

	render = () =>
		!this.isOpen
			? html``
			: html`
      <div class="heightmap-toolbar">        
        <div class="terrain-slider-row">
          <div class="terrain-range-slider" @mousedown=${this.onTerrainRangeMouseDown}>
            <div class="range-bar">
              <div class="range-section ocean" style="width: ${this.editor.terrainThresholds.ocean * 100}%">Ocean</div>
              <div class="range-section plains" style="width: ${(this.editor.terrainThresholds.plains - this.editor.terrainThresholds.ocean) * 100}%">Plains</div>
              <div class="range-section hills" style="width: ${(this.editor.terrainThresholds.hills - this.editor.terrainThresholds.plains) * 100}%">Hills</div>
              <div class="range-section mountain" style="width: ${(this.editor.terrainThresholds.mountain - this.editor.terrainThresholds.hills) * 100}%">Mountain</div>
            </div>
            
            <div class="range-handles">
              <div class="range-handle ocean" style="left: ${this.editor.terrainThresholds.ocean * 100}%" data-threshold="ocean">
                <div class="handle-label">Ocean: ${this.editor.terrainThresholds.ocean.toFixed(2)}</div>
              </div>
              <div class="range-handle plains" style="left: ${this.editor.terrainThresholds.plains * 100}%" data-threshold="plains">
                <div class="handle-label">Plains: ${this.editor.terrainThresholds.plains.toFixed(2)}</div>
              </div>
              <div class="range-handle hills" style="left: ${this.editor.terrainThresholds.hills * 100}%" data-threshold="hills">
                <div class="handle-label">Hills: ${this.editor.terrainThresholds.hills.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

	private async processHeightmapOnGPU(): Promise<void> {
		if (!this.editor.renderer || !this.editor.currentHeightmapImage) return;

		try {
			const { width, height } = await this.editor.renderer.uploadHeightmapToGPU(
				this.editor.currentHeightmapImage,
				this.editor.heightmapMaxSize,
			);

			await this.editor.renderer.processHeightmapToTerrain(
				width,
				height,
				this.editor.terrainThresholds,
				this.editor.heightmapClampMin,
				this.editor.heightmapClampMax,
			);

			const terrainData =
				await this.editor.renderer.extractTerrainDataFromGPU();
			if (terrainData) {
				let landTiles = 0;
				for (let i = 0; i < terrainData.length; i++)
					if (terrainData[i] & (1 << 7)) landTiles++;

				const gameMap = new GameMapImpl(width, height, terrainData, landTiles);

				const mapState = {
					gameMap,
					nations: [],
					mapName: `Heightmap (${width}x${height})`,
				};

				this.editor.updateMapState(mapState);
			}
		} catch (_error) {
			this.editor.setError("Failed to process heightmap on GPU");
		}
	}

	public debouncedProcessHeightmap = (() => {
		let timeoutId: number | null = null;
		return () => {
			if (timeoutId) clearTimeout(timeoutId);

			timeoutId = setTimeout(async () => {
				await this.processHeightmapOnGPU();
				timeoutId = null;
			}, 150) as unknown as number;
		};
	})();

	private updateTerrainThresholds(newThresholds: TerrainThresholds): void {
		this.editor.terrainThresholds = newThresholds;
		if (this.editor.currentHeightmapImage) this.debouncedProcessHeightmap();
		this.requestUpdate();
	}

	private onTerrainRangeMouseDown = (e: MouseEvent) => {
		const target = e.target as HTMLElement;
		if (target.classList.contains("range-handle")) {
			this.isDraggingTerrain = true;
			this.draggedThreshold = target.dataset.threshold || null;
			document.addEventListener("mousemove", this.onTerrainRangeMouseMove);
			document.addEventListener("mouseup", this.onTerrainRangeMouseUp);
			e.preventDefault();
		}
	};

	private onTerrainRangeMouseMove = (e: MouseEvent) => {
		if (!this.isDraggingTerrain || !this.draggedThreshold) return;

		const slider = this.shadowRoot?.querySelector(
			".terrain-range-slider",
		) as HTMLElement;
		if (!slider) return;

		const rect = slider.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));

		const newThresholds = { ...this.editor.terrainThresholds };

		switch (this.draggedThreshold) {
			case "ocean":
				newThresholds.ocean = Math.min(percentage, newThresholds.plains - 0.01);
				break;
			case "plains":
				newThresholds.plains = Math.max(
					newThresholds.ocean + 0.01,
					Math.min(percentage, newThresholds.hills - 0.01),
				);
				break;
			case "hills":
				newThresholds.hills = Math.max(
					newThresholds.plains + 0.01,
					Math.min(percentage, 1),
				);
				break;
		}

		this.updateTerrainThresholds(newThresholds);
	};

	private onTerrainRangeMouseUp = () => {
		this.isDraggingTerrain = false;
		this.draggedThreshold = null;
		document.removeEventListener("mousemove", this.onTerrainRangeMouseMove);
		document.removeEventListener("mouseup", this.onTerrainRangeMouseUp);
	};
}
