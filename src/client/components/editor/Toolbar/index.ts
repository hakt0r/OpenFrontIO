import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { toolbarStyles } from "./styles";
import { buttonStyles } from "../styles/buttons.styles";
import { toggleRenderMode } from "../webgl/WebGLRenderer.actions";
import { GameMapImpl } from "../../../../core/game/GameMap";
import type { MapEditor } from "../Editor";

const FILE_INPUT_HIDDEN_POSITION = -9999;
const SCREENSHOT_SUCCESS_MESSAGE = "Screenshot copied to clipboard! 📋";
const SCREENSHOT_SUCCESS_TIMEOUT = 2000;

const styles = css`
	${toolbarStyles}
	${buttonStyles}

	.file-input-button {
		position: relative;
		overflow: hidden;
		display: inline-block;
	}

	.file-input-button input[type=file] {
		position: absolute;
		left: ${FILE_INPUT_HIDDEN_POSITION}px;
		top: ${FILE_INPUT_HIDDEN_POSITION}px;
		visibility: hidden;
	}

	.file-input-button .map-editor-button {
		cursor: pointer;
	}`;

@customElement("map-editor-toolbar")
export class MapEditorToolbar extends LitElement {
	@property({ type: Object }) editor!: MapEditor;
	static styles = styles;

	private _lastZoom = 0;
	private _lastRenderMode = 0;

	willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
		super.willUpdate(changedProperties);

		if (this.editor) {
			const zoomChanged = this.editor.transform.zoom !== this._lastZoom;
			const renderModeChanged = this.editor.renderMode !== this._lastRenderMode;

			if (zoomChanged || renderModeChanged) {
				this._lastZoom = this.editor.transform.zoom;
				this._lastRenderMode = this.editor.renderMode;
			}
		}
	}

	private _handleNewMap() {
		this.editor.newMapModal?.show();
	}

	private _handleLoadMap() {
		this.editor.loadMapModal?.show();
	}

	private _handleLoadHeightmap = (event: Event) => {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = async () => {
				this.editor.currentHeightmapImage = img;
				this.editor.terrainPanel.hide();
				this.editor.heightmapPanel.show();
				this.editor.heightmapToolbar.show();
				this.editor.nationsPanel.hide();
				await this.editor.requestUpdate();
				await this.processHeightmapOnGPU();
			};
			img.src = e.target?.result as string;
		};
		reader.readAsDataURL(file);

		input.value = "";
	};

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

	private _handleSaveMap() {
		this.editor.saveMapModal?.show();
	}

	private _handleClose() {
		this.editor.close();
	}

	private _handleFitToScreen() {
		this.editor.centerAndFit();
		this.requestUpdate();
	}

	private _handleToggleRenderMode() {
		toggleRenderMode(this.editor.renderMode, this.editor.renderer, (mode) => {
			this.editor.renderMode = mode;
		});
		this.requestUpdate();
	}

	private _handleToggleTheme() {
		this.editor.toggleTheme();
		this.requestUpdate();
	}

	private async _handleScreenshot(event: MouseEvent) {
		try {
			const canvas = this.editor.webglCanvas?.webglCanvas;
			if (!canvas) {
				this.editor.setError("Canvas not available for screenshot");
				return;
			}

			const screenshotCanvas = document.createElement("canvas");
			screenshotCanvas.width = canvas.width;
			screenshotCanvas.height = canvas.height;
			const ctx = screenshotCanvas.getContext("2d");

			if (!ctx) {
				this.editor.setError("Failed to create screenshot context");
				return;
			}

			ctx.drawImage(canvas, 0, 0);

			if (event.altKey) {
				this._downloadCanvasAsPNG(screenshotCanvas);
			} else {
				await this._copyCanvasToClipboard(screenshotCanvas);
			}
		} catch (error) {
			console.error("Screenshot failed:", error);
			this.editor.setError("Failed to take screenshot");
		}
	}

	private _downloadCanvasAsPNG(canvas: HTMLCanvasElement) {
		canvas.toBlob((blob) => {
			if (!blob) {
				this.editor.setError("Failed to create image data");
				return;
			}

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${this.editor.mapState.mapName || "map"}_screenshot_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		}, "image/png");
	}

	private async _copyCanvasToClipboard(canvas: HTMLCanvasElement) {
		if (!navigator.clipboard || !navigator.clipboard.write) {
			this.editor.setError("Clipboard API not supported in this browser");
			return;
		}

		try {
			const blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob((blob) => {
					if (blob) resolve(blob);
					else reject(new Error("Failed to create blob"));
				}, "image/png");
			});

			await navigator.clipboard.write([
				new ClipboardItem({
					"image/png": blob,
				}),
			]);

			const originalErrorMessage = this.editor.errorMessage;
			this.editor.errorMessage = SCREENSHOT_SUCCESS_MESSAGE;
			setTimeout(() => {
				if (this.editor.errorMessage === SCREENSHOT_SUCCESS_MESSAGE) {
					this.editor.errorMessage = originalErrorMessage;
				}
			}, SCREENSHOT_SUCCESS_TIMEOUT);
		} catch (error) {
			console.error("Failed to copy to clipboard:", error);
			this.editor.setError("Failed to copy screenshot to clipboard");
		}
	}

	render() {
		return html`
      <div class="map-editor-toolbar">
        <div class="toolbar-group">
          <button
            class="map-editor-button"
            @click=${this._handleNewMap}
            title="New Map"
          >
            📄
          </button>
          <button
            class="map-editor-button"
            @click=${this._handleLoadMap}
            title="Load Map"
          >
            📂
          </button>
          <button
            class="map-editor-button file-input-button"
            @click=${() => this.shadowRoot?.querySelector("input")?.click()}
            title="Load Heightmap"
          >
            <input type="file" accept="image/*" @change=${this._handleLoadHeightmap} />
            🗺️
          </button>
          <button
            class="map-editor-button"
            style="position: relative; overflow: hidden; display: inline-block;"
            @click=${this._handleSaveMap}
            title="Save Map"
          >
            💾
          </button>
          <button
            class="map-editor-button"
            @click=${this._handleScreenshot}
            title="Screenshot (Alt+click to download PNG)"
          >
            📸
          </button>
        </div>

        <div class="vertical-separator"></div>

        <div class="toolbar-group">
          <span class="control-display"
            >${Math.round(this.editor.transform.zoom * 100)}%</span
          >
          <button
            class="map-editor-button"
            @click=${this._handleFitToScreen}
            title="Fit to Screen"
          >
            🔍
          </button>
        </div>

        <div class="flex-spacer"></div>

        <div class="toolbar-group">
          <button
            class="map-editor-button ${this.editor.renderMode === 1 ? "active" : ""}"
            @click=${this._handleToggleRenderMode}
            title="${
							this.editor.renderMode === 0
								? "Switch to Satellite View"
								: "Switch to Pixel Editing"
						}"
          >
            ${this.editor.renderMode === 0 ? "🎨" : "🛰️"}
          </button>
          <span class="control-display"
            >${this.editor.renderMode === 0 ? "Edit" : "Satellite"}</span
          >
        </div>

        <div class="vertical-separator"></div>

        <div class="toolbar-group">
          <button
            class="map-editor-button ${this.editor.isDarkMode ? "active" : ""}"
            @click=${this._handleToggleTheme}
            title="${this.editor.isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}"
          >
            ${this.editor.isDarkMode ? "☀️" : "🌙"}
          </button>
          <span class="control-display"
            >${this.editor.isDarkMode ? "Dark" : "Light"}</span
          >
        </div>

        <div class="vertical-separator"></div>

        <div class="toolbar-group">
          <button
            class="map-editor-button"
            @click=${this._handleClose}
            title="Close Editor"
          >
            ❌
          </button>
        </div>
      </div>
    `;
	}
}
