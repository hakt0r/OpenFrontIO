import { LitElement, html, css } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import type { MapEditor } from "../Editor";
import { WebGLRenderer } from "../webgl/WebGLRenderer";
import {
	resizeCanvas,
	startRenderLoop,
	stopRenderLoop,
} from "../webgl/WebGLRenderer.actions";
import {
	handleMouseDown,
	handleLeftClick,
	handleDrag,
	handleDrawing,
	handleZoom,
} from "../Editor/input";
import { getCursorForTool } from "../TerrainPanel/handlers";
import { paint } from "../Editor/actions";
import { EditorTool as EditorToolEnum } from "../types/MapEditorTypes";
import "../Overlay";
import type { GameMapImpl } from "../../../../core/game/GameMap";
import type { InputHandler } from "../utils/InputManager";

type GameMapImplWithTerrain = Omit<GameMapImpl, "terrain"> & {
	terrain: Uint8Array;
};

const RESIZE_DEBOUNCE_MS = 16;
const CANVAS_PRIORITY = 50;

@customElement("webgl-canvas")
export class WebGLCanvas extends LitElement {
	@property({ type: Object }) editor!: MapEditor;
	@query("#map-canvas") private canvas!: HTMLCanvasElement;

	private renderer: WebGLRenderer | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
	private inputHandler: InputHandler | null = null;

	static styles = css`
    :host {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    .canvas-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #1a1a1a;
      border: 1px solid #333;
    }

    #map-canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: crosshair;
    }

    canvas-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    }
  `;

	async firstUpdated(): Promise<void> {
		await this.initializeRenderer();
		this.setupResizeObserver();
		this.registerInputHandler();
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		stopRenderLoop();
		this.renderer?.dispose();
		this.resizeObserver?.disconnect();
		if (this.resizeTimeout) {
			clearTimeout(this.resizeTimeout);
		}
		window.removeEventListener("resize", this.handleWindowResize);
		this.unregisterInputHandler();
	}

	updated(changedProperties: Map<string | number | symbol, unknown>) {
		super.updated(changedProperties);
		if (changedProperties.has("editor")) {
			this.registerInputHandler();
		}
	}

	private async initializeRenderer(): Promise<void> {
		if (!this.canvas) return;

		this.renderer = new WebGLRenderer(this.canvas, this.editor.theme);
		await this.renderer.initialize();
		resizeCanvas(this.canvas, this.renderer);
		startRenderLoop(
			this.renderer,
			() => this.editor.mapState,
			() => {},
		);

		this.editor.renderer = this.renderer;

		await this.renderer.updateTerrainData(this.editor.mapState);
		this.centerAndFit();
		this.renderer.render(this.editor.mapState);
	}

	private handleWindowResize = (): void => {
		if (this.resizeTimeout) {
			clearTimeout(this.resizeTimeout);
		}
		this.resizeTimeout = setTimeout(() => {
			const resizeOccurred = resizeCanvas(this.canvas, this.renderer);
			if (resizeOccurred && this.renderer) {
				this.renderer.render(this.editor.mapState);
			}
		}, RESIZE_DEBOUNCE_MS);
	};

	private setupResizeObserver(): void {
		if (!this.canvas) return;

		window.addEventListener("resize", this.handleWindowResize);

		this.resizeObserver = new ResizeObserver((entries) => {
			for (const _entry of entries) {
				if (this.resizeTimeout) {
					clearTimeout(this.resizeTimeout);
				}
				this.resizeTimeout = setTimeout(() => {
					const resizeOccurred = resizeCanvas(this.canvas, this.renderer);
					if (resizeOccurred && this.renderer) {
						this.renderer.render(this.editor.mapState);
					}
				}, RESIZE_DEBOUNCE_MS);
			}
		});

		const container = this.canvas.parentElement;
		if (container) {
			this.resizeObserver.observe(container);
		}
	}

	private registerInputHandler(): void {
		if (!this.editor.inputManager) return;

		this.unregisterInputHandler();

		this.inputHandler = {
			id: "webgl-canvas",
			priority: CANVAS_PRIORITY,
			handleWheel: this.onWheel,
			handleMousedown: this.onMouseDown,
			handleMousemove: this.onMouseMove,
			handleMouseup: this.onMouseUp,
			handleContextmenu: (e: MouseEvent) => {
				e.preventDefault();
				return true;
			},
		};

		this.editor.inputManager.registerHandler(this.inputHandler);
	}

	private unregisterInputHandler(): void {
		if (this.editor.inputManager && this.inputHandler) {
			this.editor.inputManager.unregisterHandler(this.inputHandler.id);
			this.inputHandler = null;
		}
	}

	private onMouseDown = (e: MouseEvent): boolean => {
		handleMouseDown(
			e,
			this.canvas,
			(x, y) => this.onLeftClick(x, y),
			(x, y) => this.onRightDrag(x, y),
		);
		return true;
	};

	private onMouseMove = (e: MouseEvent): boolean => {
		const rect = this.canvas.getBoundingClientRect();
		const canvasX = e.clientX - rect.left;
		const canvasY = e.clientY - rect.top;

		if (this.renderer) {
			const coords = this.renderer.canvasToMapCoordinates(canvasX, canvasY);
			if (
				coords &&
				coords.x >= 0 &&
				coords.x < this.editor.mapState.gameMap.width() &&
				coords.y >= 0 &&
				coords.y < this.editor.mapState.gameMap.height()
			) {
				this.editor.hoverCoords = {
					x: Math.floor(coords.x),
					y: Math.floor(coords.y),
				};
				this.editor.hoverTerrainInfo = this.getTerrainInfo(
					Math.floor(coords.x),
					Math.floor(coords.y),
				);
				this.editor.requestUpdate();
				this.requestUpdate();
			} else {
				this.editor.hoverCoords = null;
				this.editor.hoverTerrainInfo = null;
				this.requestUpdate();
			}
		}

		if (this.editor.isDragging) this.onDrag(canvasX, canvasY);
		else if (this.editor.isDrawing)
			handleDrawing(
				canvasX,
				canvasY,
				this.renderer,
				this.editor.mapState,
				(x, y) => this.paint(x, y),
			);

		return false;
	};

	private onMouseUp = (): boolean => {
		this.editor.isDrawing = false;
		this.editor.isDragging = false;
		this.canvas.style.cursor = getCursorForTool(this.editor.currentTool);
		return true;
	};

	private onWheel = (e: WheelEvent): boolean => {
		if (e.ctrlKey || e.metaKey) {
			this.zoom(e);
			return true;
		}
		return false;
	};

	private onLeftClick = (canvasX: number, canvasY: number): void => {
		this.editor.lastMousePos = { x: canvasX, y: canvasY };
		handleLeftClick(
			canvasX,
			canvasY,
			this.renderer,
			this.editor.mapState,
			this.editor.currentTool,
			() => {
				this.editor.isDrawing = true;
			},
			(x, y) => this.paint(x, y),
		);
	};

	private onRightDrag = (canvasX: number, canvasY: number): void => {
		this.editor.lastMousePos = { x: canvasX, y: canvasY };
		this.editor.isDragging = true;
	};

	private onDrag = (canvasX: number, canvasY: number): void => {
		this.editor.lastMousePos = handleDrag(
			canvasX,
			canvasY,
			this.editor.lastMousePos,
			this.editor.transform,
			this.renderer,
			(transform) => {
				this.editor.transform = transform;
			},
			!!this.editor.currentHeightmapImage,
			this.editor.mapState,
		);
	};

	private paint = (x: number, y: number): void => {
		if (this.editor.currentTool === EditorToolEnum.Nation) {
			this.editor.pendingNationCoords = [x, y];
			this.editor.isEditingNation = false;
			this.editor.editingNation = null;
			this.editor.nationModal?.show();
			return;
		}
		paint(
			x,
			y,
			this.renderer,
			this.editor.currentTool,
			this.editor.currentBrush,
			this.editor.brushSize,
			this.editor.brushMagnitude,
		);
	};

	private zoom = (e: WheelEvent): void => {
		handleZoom(
			e,
			this.canvas,
			this.editor.transform,
			this.renderer,
			(transform) => {
				this.editor.transform = transform;
			},
			!!this.editor.currentHeightmapImage,
			this.editor.mapState,
		);
	};

	private getTerrainInfo(
		x: number,
		y: number,
	): { type: string; emoji: string; magnitude: number } | null {
		if (!this.editor.mapState.gameMap) return null;

		const gameMap = this.editor.mapState
			.gameMap as unknown as GameMapImplWithTerrain;
		const width = gameMap.width();
		const height = gameMap.height();

		if (x < 0 || x >= width || y < 0 || y >= height) return null;

		const index = y * width + x;
		const terrainByte = gameMap.terrain[index];

		const isLand = (terrainByte & (1 << 7)) !== 0;
		const isLake = (terrainByte & (1 << 6)) !== 0;
		const isShore = (terrainByte & (1 << 5)) !== 0;
		const magnitude = terrainByte & 0x1f;

		let type: string;
		let emoji: string;

		if (isLand) {
			if (magnitude <= 8) {
				type = "Plains";
				emoji = "🌾";
			} else if (magnitude <= 16) {
				type = "Hills";
				emoji = "🏔️";
			} else {
				type = "Mountains";
				emoji = "⛰️";
			}
		} else if (isLake) {
			type = "Lake";
			emoji = "💧";
		} else if (isShore) {
			type = "Shore";
			emoji = "🏖️";
		} else {
			type = "Ocean";
			emoji = "🌊";
		}

		return { type, emoji, magnitude };
	}

	public get webglCanvas(): HTMLCanvasElement {
		return this.canvas;
	}

	public centerAndFit = (): void => {
		if (!this.renderer || !this.canvas) return;

		import("../Toolbar/actions").then(({ centerAndFit }) => {
			centerAndFit(
				this.editor.mapState,
				this.canvas,
				this.renderer,
				(transform) => {
					this.editor.transform = transform;
				},
				!!this.editor.currentHeightmapImage,
			);
		});
	};

	public updateTerrainData = async (): Promise<void> => {
		if (this.renderer) {
			await this.renderer.updateTerrainData(this.editor.mapState);
		}
	};

	public render = () => {
		return html`
      <div class="canvas-container">
        <canvas id="map-canvas"></canvas>
        <canvas-overlay 
          .mapState=${this.editor.mapState} 
          .transform=${this.editor.transform} 
          .renderer=${this.renderer ? "WebGL" : "Canvas"}
          .hoverCoords=${this.editor.hoverCoords}
          .hoverTerrainInfo=${this.editor.hoverTerrainInfo}
        ></canvas-overlay>
      </div>
    `;
	};
}
