import type { TerrainThresholds } from "../types/MapEditorTypes";
import type { ShaderManager } from "./ShaderManager";
import type { TextureManager } from "./TextureManager";
import * as ChunkUtils from "./TextureManager";

export interface HeightmapChunkData {
	chunkX: number;
	chunkY: number;
	heightmapTexture: WebGLTexture;
	bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export function createHeightmapChunks(
	image: HTMLImageElement,
	_mapWidth: number,
	_mapHeight: number,
	maxSize: number,
): { chunks: HeightmapChunkData[]; scaledWidth: number; scaledHeight: number } {
	let scaledWidth = image.width;
	let scaledHeight = image.height;

	if (scaledWidth > maxSize || scaledHeight > maxSize) {
		const scale = Math.min(maxSize / scaledWidth, maxSize / scaledHeight);
		scaledWidth = Math.floor(scaledWidth * scale);
		scaledHeight = Math.floor(scaledHeight * scale);
	}

	const gridWidth = Math.ceil(scaledWidth / ChunkUtils.CHUNK_SIZE);
	const gridHeight = Math.ceil(scaledHeight / ChunkUtils.CHUNK_SIZE);
	const chunks: HeightmapChunkData[] = [];

	for (let chunkY = 0; chunkY < gridHeight; chunkY++) {
		for (let chunkX = 0; chunkX < gridWidth; chunkX++) {
			const minX = chunkX * ChunkUtils.CHUNK_SIZE;
			const maxX = Math.min((chunkX + 1) * ChunkUtils.CHUNK_SIZE, scaledWidth);
			const minY = chunkY * ChunkUtils.CHUNK_SIZE;
			const maxY = Math.min((chunkY + 1) * ChunkUtils.CHUNK_SIZE, scaledHeight);

			chunks.push({
				chunkX,
				chunkY,
				heightmapTexture: null as unknown as WebGLTexture,
				bounds: { minX, maxX, minY, maxY },
			});
		}
	}

	return { chunks, scaledWidth, scaledHeight };
}

export class HeightmapProcessor {
	private gl: WebGLRenderingContext;
	private shaderManager: ShaderManager;
	private chunkManager: TextureManager;
	private quadBuffer: WebGLBuffer | null = null;
	private heightmapChunks: Map<string, WebGLTexture> = new Map();

	constructor(
		gl: WebGLRenderingContext,
		shaderManager: ShaderManager,
		chunkManager: TextureManager,
	) {
		this.gl = gl;
		this.shaderManager = shaderManager;
		this.chunkManager = chunkManager;
	}

	public async initialize(): Promise<void> {
		this.quadBuffer = this.gl.createBuffer();
		if (!this.quadBuffer) {
			throw new Error("Failed to create quad buffer for heightmap processor");
		}
	}

	public async uploadHeightmapImage(
		image: HTMLImageElement,
		maxSize: number,
	): Promise<{ width: number; height: number }> {
		await this.clearHeightmapChunks();

		const { chunks, scaledWidth, scaledHeight } = createHeightmapChunks(
			image,
			image.width,
			image.height,
			maxSize,
		);

		await this.chunkManager.initializeGrid(
			scaledWidth,
			scaledHeight,
			"heightmap",
		);

		for (const chunkData of chunks) {
			const heightmapTexture = await this.createHeightmapChunk(
				image,
				chunkData,
				scaledWidth,
				scaledHeight,
			);

			if (heightmapTexture) {
				const key = ChunkUtils.getChunkKey(chunkData.chunkX, chunkData.chunkY);
				this.heightmapChunks.set(key, heightmapTexture);
			}
		}

		return { width: scaledWidth, height: scaledHeight };
	}

	private async createHeightmapChunk(
		image: HTMLImageElement,
		chunkData: HeightmapChunkData,
		scaledWidth: number,
		scaledHeight: number,
	): Promise<WebGLTexture | null> {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;

		canvas.width = ChunkUtils.CHUNK_SIZE;
		canvas.height = ChunkUtils.CHUNK_SIZE;

		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, ChunkUtils.CHUNK_SIZE, ChunkUtils.CHUNK_SIZE);

		const sourceX = (chunkData.bounds.minX / scaledWidth) * image.width;
		const sourceY = (chunkData.bounds.minY / scaledHeight) * image.height;
		const sourceWidth =
			((chunkData.bounds.maxX - chunkData.bounds.minX) / scaledWidth) *
			image.width;
		const sourceHeight =
			((chunkData.bounds.maxY - chunkData.bounds.minY) / scaledHeight) *
			image.height;

		const destWidth = chunkData.bounds.maxX - chunkData.bounds.minX;
		const destHeight = chunkData.bounds.maxY - chunkData.bounds.minY;

		ctx.drawImage(
			image,
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight,
			0,
			0,
			destWidth,
			destHeight,
		);

		const imageData = ctx.getImageData(
			0,
			0,
			ChunkUtils.CHUNK_SIZE,
			ChunkUtils.CHUNK_SIZE,
		);
		const texture = this.gl.createTexture();
		if (!texture) return null;

		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.RGBA,
			ChunkUtils.CHUNK_SIZE,
			ChunkUtils.CHUNK_SIZE,
			0,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			imageData.data,
		);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_MIN_FILTER,
			this.gl.NEAREST,
		);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_MAG_FILTER,
			this.gl.NEAREST,
		);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_WRAP_S,
			this.gl.CLAMP_TO_EDGE,
		);
		this.gl.texParameteri(
			this.gl.TEXTURE_2D,
			this.gl.TEXTURE_WRAP_T,
			this.gl.CLAMP_TO_EDGE,
		);

		return texture;
	}

	public async processHeightmapToTerrain(
		mapWidth: number,
		mapHeight: number,
		terrainThresholds: TerrainThresholds,
		clampMin: number,
		clampMax: number,
	): Promise<void> {
		if (!this.shaderManager.heightmapProgram || !this.quadBuffer) {
			throw new Error("Heightmap processor not properly initialized");
		}

		this.chunkManager.setActiveMode("terrain");
		await this.chunkManager.initializeGrid(mapWidth, mapHeight, "terrain");

		const gridWidth = Math.ceil(mapWidth / ChunkUtils.CHUNK_SIZE);
		const gridHeight = Math.ceil(mapHeight / ChunkUtils.CHUNK_SIZE);

		for (let chunkY = 0; chunkY < gridHeight; chunkY++) {
			for (let chunkX = 0; chunkX < gridWidth; chunkX++) {
				await this.processChunk(
					chunkX,
					chunkY,
					mapWidth,
					mapHeight,
					terrainThresholds,
					clampMin,
					clampMax,
				);
			}
		}
	}

	private async processChunk(
		chunkX: number,
		chunkY: number,
		mapWidth: number,
		mapHeight: number,
		terrainThresholds: TerrainThresholds,
		clampMin: number,
		clampMax: number,
	): Promise<void> {
		const heightmapKey = ChunkUtils.getChunkKey(chunkX, chunkY);
		const heightmapTexture = this.heightmapChunks.get(heightmapKey);

		if (!heightmapTexture) {
			await this.createDefaultOceanChunk(chunkX, chunkY);
			return;
		}

		const terrainFramebuffer = await this.chunkManager.getChunkFramebuffer(
			chunkX,
			chunkY,
		);
		if (!terrainFramebuffer) return;

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, terrainFramebuffer);
		this.gl.viewport(0, 0, ChunkUtils.CHUNK_SIZE, ChunkUtils.CHUNK_SIZE);

		this.shaderManager.heightmapProgram?.use();

		const chunkBounds = ChunkUtils.getChunkBounds(chunkX, chunkY);
		const actualWidth = Math.min(
			ChunkUtils.CHUNK_SIZE,
			mapWidth - chunkBounds.minX,
		);
		const actualHeight = Math.min(
			ChunkUtils.CHUNK_SIZE,
			mapHeight - chunkBounds.minY,
		);

		this.shaderManager.heightmapProgram?.setUniforms({
			u_heightmapTexture: { type: "1i", value: 0 },
			u_mapSize: { type: "2f", value: [actualWidth, actualHeight] },
			u_textureSize: {
				type: "2f",
				value: [ChunkUtils.CHUNK_SIZE, ChunkUtils.CHUNK_SIZE],
			},
			u_oceanThreshold: { type: "1f", value: terrainThresholds.ocean },
			u_plainsThreshold: { type: "1f", value: terrainThresholds.plains },
			u_hillsThreshold: { type: "1f", value: terrainThresholds.hills },
			u_mountainThreshold: { type: "1f", value: terrainThresholds.mountain },
			u_clampMin: { type: "1f", value: clampMin },
			u_clampMax: { type: "1f", value: clampMax },
		});

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, heightmapTexture);

		const quadVertices = new Float32Array([
			-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1,
		]);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			quadVertices,
			this.gl.DYNAMIC_DRAW,
		);

		this.gl.enableVertexAttribArray(
			this.shaderManager.heightmapAttributes.a_position,
		);
		this.gl.vertexAttribPointer(
			this.shaderManager.heightmapAttributes.a_position,
			2,
			this.gl.FLOAT,
			false,
			16,
			0,
		);
		this.gl.enableVertexAttribArray(
			this.shaderManager.heightmapAttributes.a_texCoord,
		);
		this.gl.vertexAttribPointer(
			this.shaderManager.heightmapAttributes.a_texCoord,
			2,
			this.gl.FLOAT,
			false,
			16,
			8,
		);

		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
	}

	private async createDefaultOceanChunk(
		chunkX: number,
		chunkY: number,
	): Promise<void> {
		const framebuffer = await this.chunkManager.getChunkFramebuffer(
			chunkX,
			chunkY,
		);
		if (!framebuffer) return;

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
		this.gl.viewport(0, 0, ChunkUtils.CHUNK_SIZE, ChunkUtils.CHUNK_SIZE);

		const oceanValue = (1 << 5) | 15;
		this.gl.clearColor(oceanValue / 255, 0, 0, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
	}

	public async extractTerrainData(
		mapWidth: number,
		mapHeight: number,
	): Promise<Uint8Array | null> {
		const terrainData = new Uint8Array(mapWidth * mapHeight);
		const gridWidth = Math.ceil(mapWidth / ChunkUtils.CHUNK_SIZE);
		const gridHeight = Math.ceil(mapHeight / ChunkUtils.CHUNK_SIZE);

		for (let chunkY = 0; chunkY < gridHeight; chunkY++) {
			for (let chunkX = 0; chunkX < gridWidth; chunkX++) {
				const chunkData = await this.chunkManager.extractChunkData(
					chunkX,
					chunkY,
				);
				if (!chunkData) continue;

				const chunkBounds = ChunkUtils.getChunkBounds(chunkX, chunkY);
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
						const chunkIndex = (y * ChunkUtils.CHUNK_SIZE + x) * 4;
						const terrainIndex =
							(chunkBounds.minY + y) * mapWidth + (chunkBounds.minX + x);
						terrainData[terrainIndex] = chunkData[chunkIndex];
					}
				}
			}
		}

		return terrainData;
	}

	private async clearHeightmapChunks(): Promise<void> {
		for (const texture of Array.from(this.heightmapChunks.values())) {
			this.gl.deleteTexture(texture);
		}
		this.heightmapChunks.clear();
	}

	public async dispose(): Promise<void> {
		if (this.quadBuffer) {
			this.gl.deleteBuffer(this.quadBuffer);
			this.quadBuffer = null;
		}
		await this.clearHeightmapChunks();
	}
}
