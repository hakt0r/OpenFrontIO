import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { MapEditor } from "../Editor";
import { createHeightmapSidebarConfig } from "../components/HeightmapSidebarConfig";
import { EditorTool, BrushType } from "../types/MapEditorTypes";
import {
	handleToolChange,
	handleBrushChange,
	handleBrushSizeChange,
	brushTypeToTerrainType,
	switchTool,
	switchBrushType,
	changeBrushSize,
} from "../TerrainPanel/handlers";

@customElement("heightmap-panel")
export class HeightmapPanel extends LitElement {
	@property({ type: Object }) editor!: MapEditor;
	@state() isOpen = false;

	private _isVisible = false;

	static styles = css`
		:host {
			display: block;
		}
	`;

	connectedCallback() {
		super.connectedCallback();
		document.addEventListener("keydown", this.onKey);
		document.addEventListener("wheel", this.onWheel, { passive: false });
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener("keydown", this.onKey);
		document.removeEventListener("wheel", this.onWheel);
	}

	private onWheel = (e: WheelEvent): boolean => {
		if (!this._isVisible) return false;

		const webglCanvas = this.editor.webglCanvas;
		if (!webglCanvas) return false;

		const canvasRect = webglCanvas.getBoundingClientRect();
		const isOverCanvas =
			e.clientX >= canvasRect.left &&
			e.clientX <= canvasRect.right &&
			e.clientY >= canvasRect.top &&
			e.clientY <= canvasRect.bottom;

		if (!isOverCanvas) return false;

		let handled = false;

		if (e.ctrlKey && e.altKey) {
			handled = true;
			const delta = e.deltaY > 0 ? -1 : 1;
			this.editor.brushMagnitude = Math.max(
				1,
				Math.min(31, this.editor.brushMagnitude + delta),
			);
		} else if (e.shiftKey) {
			handled = true;
			this.editor.currentTool = switchTool(
				this.editor.currentTool,
				[EditorTool.Paint, EditorTool.Erase],
				e.deltaY > 0 ? 1 : -1,
			);
		} else if (e.altKey) {
			handled = true;
			const heightmapBrushTypes = [
				BrushType.RaiseTerrain,
				BrushType.LowerTerrain,
				BrushType.GaussianBlur,
			];
			this.editor.currentBrush = switchBrushType(
				this.editor.currentBrush,
				heightmapBrushTypes,
				e.deltaY > 0 ? 1 : -1,
			);
			this.editor.currentTerrain = brushTypeToTerrainType(
				this.editor.currentBrush,
			);
		} else if (!e.ctrlKey && !e.metaKey) {
			handled = true;
			this.editor.brushSize = changeBrushSize(
				this.editor.brushSize,
				e.deltaY > 0 ? -1 : 1,
			);
		}

		if (handled) {
			e.preventDefault();
			this.editor.requestUpdate();
			this.requestUpdate();
			return true;
		}

		return false;
	};

	private onKey = (e: KeyboardEvent): boolean => {
		if (!this._isVisible) return false;

		if (e.target !== document.body) return false;

		switch (e.key) {
			case "q":
				this.editor.currentTool = EditorTool.Paint;
				this.requestUpdate();
				return true;
			case "e":
				this.editor.currentTool = EditorTool.Erase;
				this.requestUpdate();
				return true;
			case "r":
				this.editor.currentBrush = BrushType.RaiseTerrain;
				this.editor.currentTerrain = brushTypeToTerrainType(
					this.editor.currentBrush,
				);
				this.requestUpdate();
				return true;
			case "f":
				this.editor.currentBrush = BrushType.LowerTerrain;
				this.editor.currentTerrain = brushTypeToTerrainType(
					this.editor.currentBrush,
				);
				this.requestUpdate();
				return true;
			case "s":
				this.editor.currentBrush = BrushType.GaussianBlur;
				this.editor.currentTerrain = brushTypeToTerrainType(
					this.editor.currentBrush,
				);
				this.requestUpdate();
				return true;
			default:
				return false;
		}
	};

	private changeTool = (event: CustomEvent) => {
		const toolId = event.detail.toolId as EditorTool;
		handleToolChange(
			toolId,
			this.editor.currentBrush,
			this.editor.webglCanvas.webglCanvas,
			(tool) => {
				this.editor.currentTool = tool;
			},
			(terrain) => {
				this.editor.currentTerrain = terrain;
			},
		);
		this.requestUpdate();
	};

	private changeBrush = (event: CustomEvent) => {
		const brushType = event.detail.brushId as BrushType | string;

		if (brushType === "exit_heightmap") {
			this.editor.currentHeightmapImage = null;
			this.hide();
			this.editor.heightmapToolbar.hide();
			this.editor.nationsPanel.show();
			this.editor.terrainPanel.show();
			this.editor.requestUpdate();
			return;
		}

		handleBrushChange(
			brushType as BrushType,
			(brush) => {
				this.editor.currentBrush = brush;
			},
			(terrain) => {
				this.editor.currentTerrain = terrain;
			},
		);
		this.requestUpdate();
	};

	private changeControl = (event: CustomEvent) => {
		const { controlId, value } = event.detail;
		if (controlId === "brushSize") {
			handleBrushSizeChange(value, (size) => {
				this.editor.brushSize = size;
			});
		} else if (controlId === "brushMagnitude") {
			this.editor.brushMagnitude = value;
		} else if (controlId === "maxSize") {
			this.editor.heightmapMaxSize = value;
			if (this.editor.currentHeightmapImage) {
				this.editor.heightmapToolbar.debouncedProcessHeightmap();
			}
		} else if (controlId === "clampMin") {
			this.editor.heightmapClampMin = Math.min(
				value,
				this.editor.heightmapClampMax - 0.01,
			);
			if (this.editor.currentHeightmapImage) {
				this.editor.heightmapToolbar.debouncedProcessHeightmap();
			}
		} else if (controlId === "clampMax") {
			this.editor.heightmapClampMax = Math.max(
				value,
				this.editor.heightmapClampMin + 0.01,
			);
			if (this.editor.currentHeightmapImage) {
				this.editor.heightmapToolbar.debouncedProcessHeightmap();
			}
		}
		this.requestUpdate();
	};

	show = () => {
		this.isOpen = true;
		this._isVisible = true;
		this.requestUpdate();
	};

	hide = () => {
		this.isOpen = false;
		this._isVisible = false;
		this.requestUpdate();
	};

	render = () => {
		if (!this.isOpen) return html``;

		const config = createHeightmapSidebarConfig();
		const controlValues = {
			brushSize: this.editor.brushSize,
			brushMagnitude: this.editor.brushMagnitude,
			maxSize: this.editor.heightmapMaxSize,
			clampMin: this.editor.heightmapClampMin,
			clampMax: this.editor.heightmapClampMax,
		};

		return html`
			<abstract-sidebar
				.config=${config}
				.currentTool=${this.editor.currentTool}
				.currentBrush=${this.editor.currentBrush}
				.controlValues=${controlValues}
				@tool-change=${this.changeTool}
				@brush-change=${this.changeBrush}
				@control-change=${this.changeControl}
			></abstract-sidebar>
		`;
	};
}
