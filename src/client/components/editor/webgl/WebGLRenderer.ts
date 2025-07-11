import type {
	GameMapWithTerrain,
	MapEditorState,
	EditorTransform,
} from "../types/MapEditorTypes";
import type { TerrainThresholds } from "../types/MapEditorTypes";
import type { EditorPosition } from "../utils/coordinates";
import type { Nation } from "../../../../core/game/TerrainMapLoader";
import {
	canvasToMapCoordinates,
	mapToCanvasCoordinates,
} from "../utils/coordinates";
import type { GameMapImpl } from "../../../../core/game/GameMap";
import { ShaderManager } from "./ShaderManager";
import { TextureManager } from "./TextureManager";
import {
	calculateViewportBounds,
	Renderer,
	getVisibleChunks,
} from "./Renderer";
import { HeightmapProcessor } from "./HeightmapProcessor";
import * as ChunkUtils from "./TextureManager";
import type { Theme } from "../../../../core/configuration/Config";

export class WebGLRenderer {
	readonly canvas: HTMLCanvasElement;
	private gl: WebGLRenderingContext;
	private shaderManager: ShaderManager;
	private textureManager: TextureManager;
	private renderer: Renderer;
	private heightmapProcessor: HeightmapProcessor;
	private theme: Theme | null = null;

	private transform: EditorTransform = { zoom: 1, panX: 0, panY: 0 };
	private renderMode = 0;
	private isInitialized = false;
	private needsRerender = false;

	constructor(canvas: HTMLCanvasElement, theme?: Theme) {
		this.canvas = canvas;
		const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
		if (!gl) throw new Error("WebGL not supported");
		this.gl = gl;
		this.theme = theme || null;

		this.shaderManager = new ShaderManager(gl);
		this.textureManager = new TextureManager(gl);
		this.renderer = new Renderer(
			gl,
			canvas,
			this.shaderManager,
			this.textureManager,
			this.theme,
		);
		this.heightmapProcessor = new HeightmapProcessor(
			gl,
			this.shaderManager,
			this.textureManager,
		);
	}

	public updateTheme(theme: Theme): void {
		this.theme = theme;
		if (this.renderer) {
			this.renderer.updateTheme(theme);
		}
		this.needsRerender = true;
	}

	public async initialize(): Promise<void> {
		if (this.isInitialized) return;

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

		try {
			await Promise.all([
				this.shaderManager.initializeShaders(),
				this.renderer.initialize(),
				this.heightmapProcessor.initialize(),
			]);

			this.isInitialized = true;
		} catch (error) {
			console.error("Failed to initialize WebGLRenderer:", error);
			throw error;
		}
	}

	public setTransform(zoom: number, panX: number, panY: number): void {
		this.transform = { zoom, panX, panY };
	}

	public canvasToMapCoordinates(
		canvasX: number,
		canvasY: number,
	): EditorPosition | null {
		return canvasToMapCoordinates(canvasX, canvasY, this.transform);
	}

	public mapToCanvasCoordinates(mapX: number, mapY: number): EditorPosition {
		return mapToCanvasCoordinates(mapX, mapY, this.transform);
	}

	public hitTestNation(
		canvasX: number,
		canvasY: number,
		nations: Nation[],
	): Nation | null {
		const dotSize = 10;
		const halfSize = dotSize / 2;

		for (const nation of nations) {
			const [worldX, worldY] = nation.coordinates;
			const screenPos = this.mapToCanvasCoordinates(worldX, worldY);

			if (
				canvasX >= screenPos.x - halfSize &&
				canvasX <= screenPos.x + halfSize &&
				canvasY >= screenPos.y - halfSize &&
				canvasY <= screenPos.y + halfSize
			)
				return nation;
		}

		return null;
	}

	public async render(mapState: MapEditorState): Promise<void> {
		if (!this.isInitialized) {
			console.error("WebGLRenderer not initialized");
			return;
		}

		this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		await this.renderer.renderChunks(mapState, this.transform);

		await this.renderAllOverlays(mapState);

		this.needsRerender = false;
	}

	private async renderAllOverlays(mapState: MapEditorState): Promise<void> {
		if (!this.shaderManager.overlayProgram) return;

		const hasNations = mapState.nations.length > 0;

		if (!hasNations) return;

		this.shaderManager.overlayProgram?.use();

		const transformMatrix = new Float32Array([
			this.transform.zoom,
			0,
			0,
			0,
			this.transform.zoom,
			0,
			this.transform.panX,
			this.transform.panY,
			1,
		]);

		this.shaderManager.overlayProgram?.setUniforms({
			u_transform: { type: "matrix3fv", value: transformMatrix },
			u_resolution: {
				type: "2f",
				value: [this.canvas.width, this.canvas.height],
			},
			u_useTexture: { type: "1i", value: 0 },
		});

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

		if (hasNations) {
			this.shaderManager.overlayProgram?.setUniform("u_useScreenCoords", {
				type: "1i",
				value: 1,
			});
			for (const nation of mapState.nations) {
				await this.renderNationDot(nation);
			}
		}

		this.gl.disable(this.gl.BLEND);
	}

	private async renderNationDot(nation: Nation): Promise<void> {
		if (!this.shaderManager.overlayProgram) return;

		const [worldX, worldY] = nation.coordinates;

		const screenPos = this.mapToCanvasCoordinates(worldX, worldY);
		const dotSize = 10;
		const halfSize = dotSize / 2;

		const vertices = new Float32Array([
			screenPos.x - halfSize,
			screenPos.y - halfSize,
			0.0,
			0.0,
			1.0,
			0.0,
			0.0,
			0.5,
			screenPos.x + halfSize,
			screenPos.y - halfSize,
			1.0,
			0.0,
			1.0,
			0.0,
			0.0,
			0.5,
			screenPos.x - halfSize,
			screenPos.y + halfSize,
			0.0,
			1.0,
			1.0,
			0.0,
			0.0,
			0.5,
			screenPos.x + halfSize,
			screenPos.y + halfSize,
			1.0,
			1.0,
			1.0,
			0.0,
			0.0,
			0.5,
		]);

		const buffer = this.gl.createBuffer();
		if (!buffer) return;

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);

		const stride = 8 * 4;

		this.gl.enableVertexAttribArray(
			this.shaderManager.overlayAttributes.a_position,
		);
		this.gl.vertexAttribPointer(
			this.shaderManager.overlayAttributes.a_position,
			2,
			this.gl.FLOAT,
			false,
			stride,
			0,
		);

		this.gl.enableVertexAttribArray(
			this.shaderManager.overlayAttributes.a_texCoord,
		);
		this.gl.vertexAttribPointer(
			this.shaderManager.overlayAttributes.a_texCoord,
			2,
			this.gl.FLOAT,
			false,
			stride,
			8,
		);

		this.gl.enableVertexAttribArray(
			this.shaderManager.overlayAttributes.a_color,
		);
		this.gl.vertexAttribPointer(
			this.shaderManager.overlayAttributes.a_color,
			4,
			this.gl.FLOAT,
			false,
			stride,
			16,
		);

		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

		this.gl.deleteBuffer(buffer);
	}

	public setRenderMode(mode: number): void {
		this.renderMode = mode;
		this.renderer.setRenderMode(mode);
	}

	public async paintBrush(
		mapX: number,
		mapY: number,
		brushSize: number,
		brushType: number,
		brushValue: number,
		brushMagnitude: number,
	): Promise<void> {
		if (!this.isInitialized) {
			throw new Error("WebGLRenderer not initialized");
		}

		await this.renderer.paintToChunks(
			mapX,
			mapY,
			brushSize,
			brushType,
			brushValue,
			brushMagnitude,
		);
	}

	public async updateTerrainData(mapState: MapEditorState): Promise<void> {
		const gameMap = mapState.gameMap;
		const width = gameMap.width();
		const height = gameMap.height();

		this.textureManager.setActiveMode("terrain");
		await this.textureManager.initializeGrid(width, height, "terrain");

		const terrainData = this.extractTerrainData(gameMap, width * height);
		if (terrainData.length !== width * height) return;

		await this.populateChunksFromTerrainData(terrainData, width, height);
	}

	private extractTerrainData(
		gameMap: GameMapImpl,
		expectedLength: number,
	): Uint8Array {
		const gameMapWithTerrain = gameMap as unknown as GameMapWithTerrain;
		if (!gameMapWithTerrain.terrain) {
			return new Uint8Array(expectedLength);
		}
		return gameMapWithTerrain.terrain;
	}

	private async populateChunksFromTerrainData(
		terrainData: Uint8Array,
		mapWidth: number,
		mapHeight: number,
	): Promise<void> {
		const gridWidth = Math.ceil(mapWidth / ChunkUtils.CHUNK_SIZE);
		const gridHeight = Math.ceil(mapHeight / ChunkUtils.CHUNK_SIZE);

		for (let chunkY = 0; chunkY < gridHeight; chunkY++) {
			for (let chunkX = 0; chunkX < gridWidth; chunkX++) {
				await this.populateChunk(
					chunkX,
					chunkY,
					terrainData,
					mapWidth,
					mapHeight,
				);
			}
		}
	}

	private async populateChunk(
		chunkX: number,
		chunkY: number,
		terrainData: Uint8Array,
		mapWidth: number,
		mapHeight: number,
	): Promise<void> {
		const framebuffer = await this.textureManager.getChunkFramebuffer(
			chunkX,
			chunkY,
		);
		if (!framebuffer) return;

		const chunkData = new Uint8Array(
			ChunkUtils.CHUNK_SIZE * ChunkUtils.CHUNK_SIZE * 4,
		);
		const chunkBounds = ChunkUtils.getChunkBounds(chunkX, chunkY);
		const oceanValue = (1 << 5) | 15;

		for (let i = 0; i < ChunkUtils.CHUNK_SIZE * ChunkUtils.CHUNK_SIZE; i++) {
			const rgbaIndex = i * 4;
			chunkData[rgbaIndex] = oceanValue;
			chunkData[rgbaIndex + 1] = 0;
			chunkData[rgbaIndex + 2] = 0;
			chunkData[rgbaIndex + 3] = 255;
		}

		const actualWidth = Math.min(
			ChunkUtils.CHUNK_SIZE,
			mapWidth - chunkBounds.minX,
		);
		const actualHeight = Math.min(
			ChunkUtils.CHUNK_SIZE,
			mapHeight - chunkBounds.minY,
		);

		for (let y = 0; y < actualHeight; y++) {
			for (let x = 0; x < actualWidth; x++) {
				const terrainIndex =
					(chunkBounds.minY + y) * mapWidth + (chunkBounds.minX + x);
				const chunkIndex = (y * ChunkUtils.CHUNK_SIZE + x) * 4;
				chunkData[chunkIndex] = terrainData[terrainIndex];
			}
		}

		const readTexture = await this.textureManager.getChunkReadTexture(
			chunkX,
			chunkY,
		);
		const writeTexture = await this.textureManager.getChunkWriteTexture(
			chunkX,
			chunkY,
		);

		if (!readTexture || !writeTexture) return;

		this.gl.bindTexture(this.gl.TEXTURE_2D, readTexture);
		this.gl.texSubImage2D(
			this.gl.TEXTURE_2D,
			0,
			0,
			0,
			ChunkUtils.CHUNK_SIZE,
			ChunkUtils.CHUNK_SIZE,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			chunkData,
		);

		this.gl.bindTexture(this.gl.TEXTURE_2D, writeTexture);
		this.gl.texSubImage2D(
			this.gl.TEXTURE_2D,
			0,
			0,
			0,
			ChunkUtils.CHUNK_SIZE,
			ChunkUtils.CHUNK_SIZE,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			chunkData,
		);
	}

	public async uploadHeightmapToGPU(
		image: HTMLImageElement,
		maxSize: number,
	): Promise<{ width: number; height: number }> {
		if (!this.isInitialized) {
			throw new Error("WebGLRenderer not initialized");
		}

		return await this.heightmapProcessor.uploadHeightmapImage(image, maxSize);
	}

	public async processHeightmapToTerrain(
		mapWidth: number,
		mapHeight: number,
		terrainThresholds: TerrainThresholds,
		clampMin: number,
		clampMax: number,
	): Promise<void> {
		if (!this.isInitialized) {
			throw new Error("WebGLRenderer not initialized");
		}

		await this.heightmapProcessor.processHeightmapToTerrain(
			mapWidth,
			mapHeight,
			terrainThresholds,
			clampMin,
			clampMax,
		);
	}

	public async extractTerrainDataFromGPU(): Promise<Uint8Array | null> {
		if (!this.isInitialized) return null;

		const grid = this.textureManager.getActiveGrid();
		return await this.heightmapProcessor.extractTerrainData(
			grid.mapWidth,
			grid.mapHeight,
		);
	}

	public getChunkInfo(): {
		activeChunks: number;
		totalChunks: number;
		gridSize: { width: number; height: number };
		chunkSize: number;
	} {
		const grid = this.textureManager.getActiveGrid();
		return {
			activeChunks: grid.chunks.size,
			totalChunks: grid.gridWidth * grid.gridHeight,
			gridSize: { width: grid.gridWidth, height: grid.gridHeight },
			chunkSize: ChunkUtils.CHUNK_SIZE,
		};
	}

	public async forceLoadChunk(
		chunkX: number,
		chunkY: number,
	): Promise<boolean> {
		const texture = await this.textureManager.getChunkTexture(chunkX, chunkY);
		return texture !== null;
	}

	public getVisibleChunkCount(): number {
		const viewport = calculateViewportBounds(
			this.transform,
			this.canvas.width,
			this.canvas.height,
		);
		if (!viewport) return 0;

		const { width: gridWidth, height: gridHeight } =
			this.textureManager.activeGridInfo;
		const visibleChunks = getVisibleChunks(viewport, gridWidth, gridHeight);
		return visibleChunks?.length || 0;
	}

	public setActiveMode(mode: "terrain" | "heightmap"): void {
		this.textureManager.setActiveMode(mode);
	}

	public get renderModeValue(): number {
		return this.renderMode;
	}

	public get transformValue(): EditorTransform {
		return { ...this.transform };
	}

	public async dispose(): Promise<void> {
		await Promise.all([
			this.textureManager.dispose(),
			this.renderer.dispose(),
			this.heightmapProcessor.dispose(),
		]);
		this.isInitialized = false;
	}

	public resize(): void {
		const container = this.canvas.parentElement;
		if (container) {
			const rect = container.getBoundingClientRect();
			this.canvas.width = rect.width;
			this.canvas.height = rect.height;
			this.canvas.style.width = `${rect.width}px`;
			this.canvas.style.height = `${rect.height}px`;
			this.gl.viewport(0, 0, rect.width, rect.height);

			this.needsRerender = true;
		}
	}

	public clear(): void {
		this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}
}

export { ChunkUtils };

export type {
	ChunkCoordinates,
	ChunkBounds,
	ChunkGrid,
} from "./TextureManager";
