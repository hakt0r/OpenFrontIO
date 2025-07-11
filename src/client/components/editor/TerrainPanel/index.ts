import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { EditorTool, type BrushType } from "../types/MapEditorTypes";
import {
	handleBrushChange,
	handleBrushSizeChange,
	switchTool,
	changeBrushSize,
	switchBrushType,
	brushTypeToTerrainType,
} from "./handlers";
import { sidebarStyles } from "./styles";
import { buttonStyles } from "../styles/buttons.styles";
import type { MapEditor } from "../Editor";
import { createTerrainSidebarConfig } from "../components/TerrainSidebarConfig";
import "../components/AbstractSidebar";
import type { InputHandler } from "../utils/InputManager";

@customElement("terrain-panel")
export class TerrainPanel extends LitElement {
	@property({ type: Object }) editor!: MapEditor;
	@state() isOpen = true;

	private _isVisible = false;
	private _lastBrushSize = 0;
	private _lastBrushMagnitude = 0;
	private _lastCurrentTool = "";
	private _lastCurrentBrush = "";
	private _inputHandler: InputHandler | null = null;

	static styles = css`
    ${sidebarStyles}
    ${buttonStyles}
  `;

	connectedCallback() {
		super.connectedCallback();
		this._registerInputHandler();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this._unregisterInputHandler();
	}

	updated(changedProperties: Map<string | number | symbol, unknown>) {
		super.updated(changedProperties);
		if (changedProperties.has("editor")) {
			this._registerInputHandler();
		}
		if (changedProperties.has("isOpen")) {
			this._updateInputHandler();
		}
	}

	willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
		super.willUpdate(changedProperties);

		if (this.editor) {
			const brushSizeChanged = this.editor.brushSize !== this._lastBrushSize;
			const brushMagnitudeChanged =
				this.editor.brushMagnitude !== this._lastBrushMagnitude;
			const currentToolChanged =
				this.editor.currentTool !== this._lastCurrentTool;
			const currentBrushChanged =
				this.editor.currentBrush !== this._lastCurrentBrush;

			if (
				brushSizeChanged ||
				brushMagnitudeChanged ||
				currentToolChanged ||
				currentBrushChanged
			) {
				this._lastBrushSize = this.editor.brushSize;
				this._lastBrushMagnitude = this.editor.brushMagnitude;
				this._lastCurrentTool = this.editor.currentTool;
				this._lastCurrentBrush = this.editor.currentBrush;
			}
		}
	}

	private _createInputHandler(): InputHandler {
		return {
			id: "terrain-panel",
			priority: 100,
			handleWheel: this.onWheel,
			handleKeydown: this.onKey,
		};
	}

	private _registerInputHandler() {
		if (!this.editor?.inputManager) return;

		this._unregisterInputHandler();

		this._inputHandler = this._createInputHandler();
		this.editor.inputManager.registerHandler(this._inputHandler);
		this._updateInputHandler();
	}

	private _unregisterInputHandler() {
		if (this.editor?.inputManager && this._inputHandler) {
			this.editor.inputManager.unregisterHandler(this._inputHandler.id);
			this._inputHandler = null;
		}
	}

	private _updateInputHandler() {
		if (!this.editor?.inputManager || !this._inputHandler) return;

		const shouldBeVisible = this.isOpen;

		if (shouldBeVisible && !this._isVisible) {
			this._isVisible = true;
		} else if (!shouldBeVisible && this._isVisible) {
			this._isVisible = false;
		}
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
				this.editor.allTools,
				e.deltaY > 0 ? 1 : -1,
			);
		} else if (e.altKey) {
			handled = true;
			this.editor.currentBrush = switchBrushType(
				this.editor.currentBrush,
				this.editor.allBrushTypes,
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
				this.editor.currentTool = EditorTool.Nation;
				this.requestUpdate();
				return true;
			default:
				return false;
		}
	};

	private changeTool(event: CustomEvent) {
		this.editor.currentTool = event.detail.toolId as EditorTool;
		this.requestUpdate();
	}

	private changeBrush = (event: CustomEvent) => {
		const brushType = event.detail.brushId as BrushType;
		handleBrushChange(
			brushType,
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
		}
		this.requestUpdate();
	};

	show = () => {
		this.isOpen = true;
		this.requestUpdate();
	};

	hide = () => {
		this.isOpen = false;
		this.requestUpdate();
	};

	render = () => {
		if (!this.isOpen) return html``;

		const config = createTerrainSidebarConfig(this.editor.allBrushTypes);
		const controlValues = {
			brushSize: this.editor.brushSize,
			brushMagnitude: this.editor.brushMagnitude,
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
