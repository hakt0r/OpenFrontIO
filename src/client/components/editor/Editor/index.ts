import type { LoadMapModalElement } from "../Modal/LoadMap";
import type { Nation } from "../../../../core/game/TerrainMapLoader";
import type { NationModalElement } from "../Nations/Modal";
import type { NewMapModalElement } from "../Modal/NewMap";
import type { SaveMapModalElement } from "../Modal/SaveMap";
import type { WebGLRenderer } from "../webgl/WebGLRenderer";
import { InputManager } from "../utils/InputManager";
import { NationDragHandler } from "../utils/NationDragHandler";
import type { WebGLCanvas } from "../components/WebGLCanvas";

import type {
	MapEditorState,
	EditorTool,
	EditorTransform,
	TerrainThresholds,
	BrushType,
} from "../types/MapEditorTypes";

import "../components/WebGLCanvas";
import "../Heightmap";
import "../HeightmapPanel";
import "../Modal/LoadMap";
import "../Nations/Modal";
import "../Modal/NewMap";
import "../Modal/SaveMap";
import "../Nations/Panel";
import "../Overlay";
import "../TerrainPanel";
import "../Toolbar";
import { buttonStyles } from "../styles/buttons.styles";
import { customElement, query, state } from "lit/decorators.js";
import { initializeMap } from "./actions";
import { layoutStyles } from "../styles/layout.styles";
import { LitElement, css, html } from "lit";
import { sidebarStyles } from "../TerrainPanel/styles";
import { stopRenderLoop } from "../webgl/WebGLRenderer.actions";
import { terrainSliderStyles } from "../Heightmap/styles";
import { TerrainType } from "../../../../core/game/Game";
import { toolbarStyles } from "../Toolbar/styles";
import { PastelTheme } from "../../../../core/configuration/PastelTheme";
import { PastelThemeDark } from "../../../../core/configuration/PastelThemeDark";
import type { Theme } from "../../../../core/configuration/Config";

import {
	EditorTool as EditorToolEnum,
	BrushType as BrushTypeEnum,
} from "../types/MapEditorTypes";
import type { HeightmapToolbarElement } from "../Heightmap";
import type { TerrainPanel } from "../TerrainPanel";
import type { HeightmapPanel } from "../HeightmapPanel";
import type { NationsPanel } from "../Nations/Panel";

const mapEditorStyles = css`
  ${layoutStyles}
  ${toolbarStyles}
  ${buttonStyles}
  ${sidebarStyles}
  ${terrainSliderStyles}
`;

const defaultTerrainThresholds: TerrainThresholds = {
	ocean: 0.2,
	plains: 0.45,
	hills: 0.7,
	mountain: 1,
};

@customElement("map-editor")
export class MapEditor extends LitElement {
	@state() isOpen = false;
	@query("webgl-canvas") webglCanvas!: WebGLCanvas;
	@query("new-map-modal") newMapModal!: NewMapModalElement;
	@query("load-map-modal") loadMapModal!: LoadMapModalElement;
	@query("save-map-modal") saveMapModal!: SaveMapModalElement;
	@query("nation-modal") nationModal!: NationModalElement;
	@query("heightmap-toolbar") heightmapToolbar!: HeightmapToolbarElement;
	@query("terrain-panel") terrainPanel!: TerrainPanel;
	@query("heightmap-panel") heightmapPanel!: HeightmapPanel;
	@query("nations-panel") nationsPanel!: NationsPanel;
	@state() mapState: MapEditorState = initializeMap();
	@state() currentTool: EditorTool = EditorToolEnum.Paint;
	@state() currentBrush: BrushType = BrushTypeEnum.Plains;
	@state() currentTerrain: TerrainType = TerrainType.Plains;
	@state() brushSize = 5;
	@state() brushMagnitude = 15;
	@state() renderMode = 0;
	@state() terrainThresholds: TerrainThresholds = defaultTerrainThresholds;
	@state() heightmapMaxSize = 4096;
	@state() heightmapClampMin = 0;
	@state() heightmapClampMax = 1.0;
	@state() currentHeightmapImage: HTMLImageElement | null = null;
	@state() transform: EditorTransform = { zoom: 1, panX: 0, panY: 0 };
	@state() isDrawing = false;
	@state() isDragging = false;
	@state() lastMousePos = { x: 0, y: 0 };
	@state() isEditingNation = false;
	@state() editingNation: Nation | null = null;
	@state() pendingNationCoords: [number, number] | null = null;
	@state() errorMessage = "";
	@state() hoverCoords: { x: number; y: number } | null = null;
	@state() hoverTerrainInfo: {
		type: string;
		emoji: string;
		magnitude: number;
	} | null = null;
	@state() isDraggingNation = false;
	@state() draggedNation: Nation | null = null;
	@state() dragStartPos: { x: number; y: number } | null = null;
	@state() isDarkMode = false;

	renderer: WebGLRenderer | null = null;
	inputManager: InputManager | null = null;
	nationDragHandler: NationDragHandler | null = null;

	private _theme: Theme = new PastelTheme();

	get theme(): Theme {
		return this.isDarkMode ? new PastelThemeDark() : new PastelTheme();
	}

	allBrushTypes = [
		BrushTypeEnum.Ocean,
		BrushTypeEnum.Lake,
		BrushTypeEnum.Plains,
		BrushTypeEnum.Highland,
		BrushTypeEnum.Mountain,
		BrushTypeEnum.GaussianBlur,
		BrushTypeEnum.RaiseTerrain,
		BrushTypeEnum.LowerTerrain,
	];

	allTools = [
		EditorToolEnum.Paint,
		EditorToolEnum.Erase,
		EditorToolEnum.Nation,
		EditorToolEnum.Heightmap,
	];

	static styles = mapEditorStyles;

	async firstUpdated(): Promise<void> {}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		stopRenderLoop();
		this.inputManager?.dispose();
		this.inputManager = null;
		this.nationDragHandler = null;
	}

	public async open(): Promise<void> {
		this.isOpen = true;
		this.inputManager = new InputManager();
		this.requestUpdate();
		await this.updateComplete;
		await this.connectInputToCanvas();
	}

	public close(): void {
		this.isOpen = false;
		stopRenderLoop();
		this.inputManager?.dispose();
		this.inputManager = null;
		this.nationDragHandler = null;
	}

	private async connectInputToCanvas(): Promise<void> {
		if (!this.webglCanvas || !this.inputManager) return;

		await this.webglCanvas.updateComplete;

		const canvas = this.webglCanvas.shadowRoot?.querySelector(
			"#map-canvas",
		) as HTMLCanvasElement;
		if (canvas) {
			this.inputManager.setElement(canvas);

			this.nationDragHandler = new NationDragHandler(this, canvas);
			this.inputManager.registerHandler(this.nationDragHandler);
		}
	}

	render() {
		if (!this.isOpen) return html``;
		return html`
      <div class="map-editor-fullscreen-modal">
        <div class="map-editor-container">
          <map-editor-toolbar .editor=${this}></map-editor-toolbar>
          <div class="canvas-area">
						<terrain-panel .editor=${this}></terrain-panel>
						<heightmap-panel .editor=${this}></heightmap-panel>
            <webgl-canvas .editor=${this}></webgl-canvas>
						<nations-panel .editor=${this} .nations=${this.mapState.nations}></nations-panel>
          </div>
          <heightmap-toolbar .editor=${this}></heightmap-toolbar>
        </div>
      </div>
			<new-map-modal .editor=${this}></new-map-modal>
			<load-map-modal .editor=${this}></load-map-modal>
			<save-map-modal .editor=${this}></save-map-modal>
			<nation-modal .editor=${this}></nation-modal>
    `;
	}

	centerAndFit(): void {
		this.webglCanvas?.centerAndFit();
	}

	updateMapState(newState: MapEditorState): void {
		this.mapState = newState;
		this.webglCanvas?.updateTerrainData();
		this.centerAndFit();
		this.requestUpdate();

		this.updateComplete.then(() => {
			this.renderer?.render(this.mapState);
		});
	}

	setError(message: string): void {
		this.errorMessage = message;
		this.requestUpdate();
	}

	clearError(): void {
		this.errorMessage = "";
		this.requestUpdate();
	}

	updateTransform(transform: EditorTransform): void {
		this.transform = transform;
		if (this.renderer) {
			this.renderer.setTransform(
				transform.zoom,
				transform.panX,
				transform.panY,
			);
			this.renderer.render(this.mapState);
		}
	}

	toggleTheme(): void {
		this.isDarkMode = !this.isDarkMode;
		if (this.renderer) {
			this.renderer.updateTheme(this.theme);
		}
		this.requestUpdate();
	}
}
