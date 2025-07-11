import { TerrainType } from "../../../../core/game/Game";
import * as ChunkUtils from "./TextureManager";
import type { GameMapImpl } from "../../../../core/game/GameMap";
import type { MapEditorState, EditorTransform } from "../types/MapEditorTypes";
import type { ShaderManager } from "./ShaderManager";
import type { TextureManager, ChunkCoordinates } from "./TextureManager";
import type { Theme } from "../../../../core/configuration/Config";

export interface ViewportInfo {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ChunkRenderInfo {
	chunkX: number;
	chunkY: number;
	worldX: number;
	worldY: number;
	texture: WebGLTexture;
}

export function calculateViewportBounds(
	transform: EditorTransform,
	canvasWidth: number,
	canvasHeight: number,
): ViewportInfo {
	const invZoom = 1 / transform.zoom;
	return {
		x: -transform.panX * invZoom,
		y: -transform.panY * invZoom,
		width: canvasWidth * invZoom,
		height: canvasHeight * invZoom,
	};
}

export function getVisibleChunks(
	viewport: ViewportInfo,
	gridWidth: number,
	gridHeight: number,
): ChunkCoordinates[] {
	const startChunk = ChunkUtils.worldToChunk(viewport.x, viewport.y);
	const endChunk = ChunkUtils.worldToChunk(
		viewport.x + viewport.width,
		viewport.y + viewport.height,
	);

	const chunks: ChunkCoordinates[] = [];
	const minX = Math.max(0, startChunk.chunkX);
	const maxX = Math.min(gridWidth - 1, endChunk.chunkX);
	const minY = Math.max(0, startChunk.chunkY);
	const maxY = Math.min(gridHeight - 1, endChunk.chunkY);

	for (let chunkX = minX; chunkX <= maxX; chunkX++) {
		for (let chunkY = minY; chunkY <= maxY; chunkY++) {
			chunks.push({ chunkX, chunkY, localX: 0, localY: 0 });
		}
	}

	return chunks;
}

export class Renderer {
	private gl: WebGLRenderingContext;
	private canvas: HTMLCanvasElement;
	private shaderManager: ShaderManager;
	private chunkManager: TextureManager;
	private quadBuffer: WebGLBuffer | null = null;
	private renderMode = 0;
	private startTime: number = Date.now();
	private theme: Theme | null = null;
	private dummyGameMap: GameMapImpl | null = null;

	constructor(
		gl: WebGLRenderingContext,
		canvas: HTMLCanvasElement,
		shaderManager: ShaderManager,
		chunkManager: TextureManager,
		theme?: Theme | null,
	) {
		this.gl = gl;
		this.canvas = canvas;
		this.shaderManager = shaderManager;
		this.chunkManager = chunkManager;
		this.theme = theme || null;

		this.createDummyGameMap();
	}

	private createDummyGameMap(): void {
		this.dummyGameMap = {
			width: () => 1,
			height: () => 1,
			magnitude: (_tile: number) => 15,
			isShore: (_tile: number) => false,
			terrainType: (_tile: number) => TerrainType.Plains,
			isShoreline: (_tile: number) => false,
			isWater: (_tile: number) => false,
		} as GameMapImpl;
	}

	public updateTheme(theme: Theme): void {
		this.theme = theme;
	}

	public async initialize(): Promise<void> {
		await this.createBuffers();
	}

	private async createBuffers(): Promise<void> {
		this.quadBuffer = this.gl.createBuffer();
		if (!this.quadBuffer) {
			throw new Error("Failed to create quad buffer");
		}
	}

	public async renderChunks(
		_mapState: MapEditorState,
		transform: EditorTransform,
	): Promise<void> {
		if (!this.shaderManager.terrainProgram || !this.quadBuffer) {
			console.error("Shader programs not initialized");
			return;
		}

		this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		const viewport = calculateViewportBounds(
			transform,
			this.canvas.width,
			this.canvas.height,
		);
		const { width: gridWidth, height: gridHeight } =
			this.chunkManager.activeGridInfo;
		const visibleChunks = getVisibleChunks(viewport, gridWidth, gridHeight);

		this.shaderManager.terrainProgram?.use();
		this.setupShaderUniforms(transform);

		for (const chunk of visibleChunks) {
			await this.renderChunk(chunk, transform);
		}
	}

	private setupShaderUniforms(transform: EditorTransform): void {
		if (!this.shaderManager.terrainProgram) return;

		const transformMatrix = new Float32Array([
			transform.zoom,
			0,
			0,
			0,
			transform.zoom,
			0,
			transform.panX,
			transform.panY,
			1,
		]);

		this.shaderManager.terrainProgram.setUniforms({
			u_transform: { type: "matrix3fv", value: transformMatrix },
			u_resolution: {
				type: "2f",
				value: [this.canvas.width, this.canvas.height],
			},
			u_mapSize: {
				type: "2f",
				value: [ChunkUtils.CHUNK_SIZE, ChunkUtils.CHUNK_SIZE],
			},
			u_textureSize: { type: "1f", value: ChunkUtils.CHUNK_SIZE },
			u_terrainTexture: { type: "1i", value: 0 },
			u_renderMode: { type: "1i", value: this.renderMode },
			u_time: { type: "1f", value: (Date.now() - this.startTime) / 1000.0 },
			u_zoom: { type: "1f", value: transform.zoom },
		});

		if (this.theme && this.dummyGameMap) {
			this.setupTerrainColors();
		}
	}

	private setupTerrainColors(): void {
		if (!this.theme || !this.dummyGameMap || !this.shaderManager.terrainProgram)
			return;

		const _plainsColor = this.theme.terrainColor(this.dummyGameMap, 0);
		const _shoreColor = this.theme.terrainColor(this.dummyGameMap, 0);
		const _waterColor = this.theme.terrainColor(this.dummyGameMap, 0);
		const _backgroundColor = this.theme.backgroundColor();

		const plainsMap = {
			...this.dummyGameMap,
			terrainType: () => TerrainType.Plains,
			magnitude: () => 5,
		};
		const highlandMap = {
			...this.dummyGameMap,
			terrainType: () => TerrainType.Highland,
			magnitude: () => 15,
		};
		const mountainMap = {
			...this.dummyGameMap,
			terrainType: () => TerrainType.Mountain,
			magnitude: () => 25,
		};
		const oceanMap = {
			...this.dummyGameMap,
			terrainType: () => TerrainType.Ocean,
			magnitude: () => 15,
		};
		const shoreMap = { ...this.dummyGameMap, isShore: () => true };

		const plains1 = this.theme.terrainColor(
			plainsMap as unknown as GameMapImpl,
			0,
		);
		const plains2 = this.theme.terrainColor(
			{ ...plainsMap, magnitude: () => 8 } as unknown as GameMapImpl,
			0,
		);

		const highland1 = this.theme.terrainColor(
			highlandMap as unknown as GameMapImpl,
			0,
		);
		const highland2 = this.theme.terrainColor(
			{ ...highlandMap, magnitude: () => 19 } as unknown as GameMapImpl,
			0,
		);

		const mountain1 = this.theme.terrainColor(
			mountainMap as unknown as GameMapImpl,
			0,
		);
		const mountain2 = this.theme.terrainColor(
			{ ...mountainMap, magnitude: () => 31 } as unknown as GameMapImpl,
			0,
		);

		const ocean1 = this.theme.terrainColor(
			oceanMap as unknown as GameMapImpl,
			0,
		);
		const ocean2 = this.theme.terrainColor(
			{ ...oceanMap, magnitude: () => 31 } as unknown as GameMapImpl,
			0,
		);

		const shore = this.theme.terrainColor(
			shoreMap as unknown as GameMapImpl,
			0,
		);

		this.shaderManager.terrainProgram.setUniforms({
			u_plainsColor1: {
				type: "3f",
				value: [
					plains1.rgba.r / 255,
					plains1.rgba.g / 255,
					plains1.rgba.b / 255,
				],
			},
			u_plainsColor2: {
				type: "3f",
				value: [
					plains2.rgba.r / 255,
					plains2.rgba.g / 255,
					plains2.rgba.b / 255,
				],
			},
			u_highlandColor1: {
				type: "3f",
				value: [
					highland1.rgba.r / 255,
					highland1.rgba.g / 255,
					highland1.rgba.b / 255,
				],
			},
			u_highlandColor2: {
				type: "3f",
				value: [
					highland2.rgba.r / 255,
					highland2.rgba.g / 255,
					highland2.rgba.b / 255,
				],
			},
			u_mountainColor1: {
				type: "3f",
				value: [
					mountain1.rgba.r / 255,
					mountain1.rgba.g / 255,
					mountain1.rgba.b / 255,
				],
			},
			u_mountainColor2: {
				type: "3f",
				value: [
					mountain2.rgba.r / 255,
					mountain2.rgba.g / 255,
					mountain2.rgba.b / 255,
				],
			},
			u_oceanColor1: {
				type: "3f",
				value: [ocean1.rgba.r / 255, ocean1.rgba.g / 255, ocean1.rgba.b / 255],
			},
			u_oceanColor2: {
				type: "3f",
				value: [ocean2.rgba.r / 255, ocean2.rgba.g / 255, ocean2.rgba.b / 255],
			},
			u_shoreColor: {
				type: "3f",
				value: [shore.rgba.r / 255, shore.rgba.g / 255, shore.rgba.b / 255],
			},
		});
	}

	private async renderChunk(
		chunk: ChunkCoordinates,
		_transform: EditorTransform,
	): Promise<void> {
		const texture = await this.chunkManager.getChunkTexture(
			chunk.chunkX,
			chunk.chunkY,
		);
		if (!texture) {
			console.warn("No texture found for chunk:", chunk.chunkX, chunk.chunkY);
			return;
		}

		if (!this.quadBuffer) {
			console.error("Quad buffer not initialized");
			return;
		}

		const worldPos = ChunkUtils.chunkToWorld(chunk.chunkX, chunk.chunkY);
		const chunkSize = ChunkUtils.CHUNK_SIZE;

		const vertices = new Float32Array([
			worldPos.x,
			worldPos.y,
			0,
			0,
			worldPos.x + chunkSize,
			worldPos.y,
			1,
			0,
			worldPos.x,
			worldPos.y + chunkSize,
			0,
			1,
			worldPos.x + chunkSize,
			worldPos.y + chunkSize,
			1,
			1,
		]);

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);

		const positionLoc = this.shaderManager.terrainAttributes.a_position;
		const texCoordLoc = this.shaderManager.terrainAttributes.a_texCoord;

		if (positionLoc === -1 || texCoordLoc === -1) {
			console.error("Invalid attribute locations:", {
				positionLoc,
				texCoordLoc,
			});
			return;
		}

		const maxAttribs = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
		for (let i = 0; i < maxAttribs; i++) {
			this.gl.disableVertexAttribArray(i);
		}

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);

		this.gl.enableVertexAttribArray(positionLoc);
		this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 16, 0);

		this.gl.enableVertexAttribArray(texCoordLoc);
		this.gl.vertexAttribPointer(texCoordLoc, 2, this.gl.FLOAT, false, 16, 8);

		const boundBuffer = this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING);
		if (!boundBuffer) {
			console.error("No array buffer bound before drawArrays");
			return;
		}

		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
	}

	public async paintToChunks(
		centerX: number,
		centerY: number,
		radius: number,
		brushType: number,
		brushValue: number,
		brushMagnitude: number,
	): Promise<void> {
		const affectedChunks = ChunkUtils.getAffectedChunks(
			centerX,
			centerY,
			radius,
		);

		for (const { chunkX, chunkY } of affectedChunks) {
			const writeFramebuffer = await this.chunkManager.getChunkWriteFramebuffer(
				chunkX,
				chunkY,
			);
			const readTexture = await this.chunkManager.getChunkReadTexture(
				chunkX,
				chunkY,
			);

			if (!writeFramebuffer || !readTexture || !this.shaderManager.brushProgram)
				continue;

			const chunkBounds = ChunkUtils.getChunkBounds(chunkX, chunkY);
			const localCenterX = centerX - chunkBounds.minX;
			const localCenterY = centerY - chunkBounds.minY;

			if (
				localCenterX + radius < 0 ||
				localCenterX - radius >= ChunkUtils.CHUNK_SIZE ||
				localCenterY + radius < 0 ||
				localCenterY - radius >= ChunkUtils.CHUNK_SIZE
			) {
				continue;
			}

			await this.paintToChunk(
				writeFramebuffer,
				readTexture,
				localCenterX,
				localCenterY,
				radius,
				brushType,
				brushValue,
				brushMagnitude,
			);

			await this.chunkManager.swapChunkBuffers(chunkX, chunkY);
		}
	}

	private async paintToChunk(
		framebuffer: WebGLFramebuffer,
		readTexture: WebGLTexture,
		localX: number,
		localY: number,
		radius: number,
		brushType: number,
		brushValue: number,
		brushMagnitude: number,
	): Promise<void> {
		if (!this.shaderManager.brushProgram) return;

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
		this.gl.viewport(0, 0, ChunkUtils.CHUNK_SIZE, ChunkUtils.CHUNK_SIZE);

		this.shaderManager.brushProgram.setUniforms({
			u_terrainTexture: { type: "1i", value: 0 },
			u_mapSize: {
				type: "2f",
				value: [ChunkUtils.CHUNK_SIZE, ChunkUtils.CHUNK_SIZE],
			},
			u_textureSize: {
				type: "2f",
				value: [ChunkUtils.CHUNK_SIZE, ChunkUtils.CHUNK_SIZE],
			},
			u_brushType: { type: "1f", value: brushType },
			u_falloffType: { type: "1f", value: 2 },
			u_brushMagnitude: { type: "1f", value: brushMagnitude },
		});

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, readTexture);

		const size = radius * 2;
		const vertices = new Float32Array([
			localX - size,
			localY - size,
			localX,
			localY,
			radius,
			brushValue,
			localX + size,
			localY - size,
			localX,
			localY,
			radius,
			brushValue,
			localX - size,
			localY + size,
			localX,
			localY,
			radius,
			brushValue,
			localX + size,
			localY + size,
			localX,
			localY,
			radius,
			brushValue,
		]);

		const brushBuffer = this.gl.createBuffer();
		if (!brushBuffer) return;

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, brushBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);

		const stride = 6 * 4;
		this.gl.enableVertexAttribArray(
			this.shaderManager.brushAttributes.a_position,
		);
		this.gl.vertexAttribPointer(
			this.shaderManager.brushAttributes.a_position,
			2,
			this.gl.FLOAT,
			false,
			stride,
			0,
		);
		this.gl.enableVertexAttribArray(
			this.shaderManager.brushAttributes.a_brushCenter,
		);
		this.gl.vertexAttribPointer(
			this.shaderManager.brushAttributes.a_brushCenter,
			2,
			this.gl.FLOAT,
			false,
			stride,
			8,
		);
		this.gl.enableVertexAttribArray(
			this.shaderManager.brushAttributes.a_brushSize,
		);
		this.gl.vertexAttribPointer(
			this.shaderManager.brushAttributes.a_brushSize,
			1,
			this.gl.FLOAT,
			false,
			stride,
			16,
		);
		this.gl.enableVertexAttribArray(
			this.shaderManager.brushAttributes.a_brushValue,
		);
		this.gl.vertexAttribPointer(
			this.shaderManager.brushAttributes.a_brushValue,
			1,
			this.gl.FLOAT,
			false,
			stride,
			20,
		);

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

		this.gl.deleteBuffer(brushBuffer);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	}

	public setRenderMode(mode: number): void {
		this.renderMode = mode;
	}

	public async dispose(): Promise<void> {
		if (this.quadBuffer) {
			this.gl.deleteBuffer(this.quadBuffer);
			this.quadBuffer = null;
		}
	}
}
