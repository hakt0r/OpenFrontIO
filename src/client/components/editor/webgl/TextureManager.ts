import type { EditorPosition } from "../types/MapEditorTypes";
import {
	Texture2D,
	Framebuffer,
	TexturePool,
	FramebufferPool,
} from "./toolkit";

export const CHUNK_SIZE = 512;
export const CHUNK_OVERLAP = 2;
export const MAX_ACTIVE_CHUNKS = 256;

export interface ChunkCoordinates {
	chunkX: number;
	chunkY: number;
	localX: number;
	localY: number;
}

export interface ChunkBounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

export interface ChunkData {
	readTexture: Texture2D;
	writeTexture: Texture2D;
	readFramebuffer: Framebuffer;
	writeFramebuffer: Framebuffer;
	isDirty: boolean;
	lastAccess: number;
	data: Uint8Array | null;
}

export interface ChunkGrid {
	chunks: Map<string, ChunkData>;
	gridWidth: number;
	gridHeight: number;
	mapWidth: number;
	mapHeight: number;
}

export function worldToChunk(x: number, y: number): ChunkCoordinates {
	return {
		chunkX: Math.floor(x / CHUNK_SIZE),
		chunkY: Math.floor(y / CHUNK_SIZE),
		localX: x % CHUNK_SIZE,
		localY: y % CHUNK_SIZE,
	};
}

export function chunkToWorld(chunkX: number, chunkY: number): EditorPosition {
	return {
		x: chunkX * CHUNK_SIZE,
		y: chunkY * CHUNK_SIZE,
	};
}

export function getChunkKey(chunkX: number, chunkY: number): string {
	return `${chunkX}_${chunkY}`;
}

export function getChunkBounds(chunkX: number, chunkY: number): ChunkBounds {
	return {
		minX: chunkX * CHUNK_SIZE,
		maxX: (chunkX + 1) * CHUNK_SIZE - 1,
		minY: chunkY * CHUNK_SIZE,
		maxY: (chunkY + 1) * CHUNK_SIZE - 1,
	};
}

export function getAffectedChunks(
	centerX: number,
	centerY: number,
	radius: number,
): ChunkCoordinates[] {
	const chunks: ChunkCoordinates[] = [];
	const minX = centerX - radius;
	const maxX = centerX + radius;
	const minY = centerY - radius;
	const maxY = centerY + radius;

	const startChunk = worldToChunk(minX, minY);
	const endChunk = worldToChunk(maxX, maxY);

	for (let chunkX = startChunk.chunkX; chunkX <= endChunk.chunkX; chunkX++) {
		for (let chunkY = startChunk.chunkY; chunkY <= endChunk.chunkY; chunkY++) {
			chunks.push({ chunkX, chunkY, localX: 0, localY: 0 });
		}
	}

	return chunks;
}

export class TextureManager {
	private gl: WebGLRenderingContext;
	private terrainGrid: ChunkGrid;
	private heightmapGrid: ChunkGrid;
	private activeMode: "terrain" | "heightmap" = "terrain";
	private texturePool: TexturePool;
	private framebufferPool: FramebufferPool;

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl;
		this.terrainGrid = this.createEmptyGrid();
		this.heightmapGrid = this.createEmptyGrid();

		this.texturePool = new TexturePool(
			gl,
			() => this.createChunkTexture(),
			MAX_ACTIVE_CHUNKS,
		);

		this.framebufferPool = new FramebufferPool(
			gl,
			() => Framebuffer.createWithColorTexture(gl, CHUNK_SIZE, CHUNK_SIZE),
			MAX_ACTIVE_CHUNKS,
		);
	}

	private createEmptyGrid(): ChunkGrid {
		return {
			chunks: new Map(),
			gridWidth: 0,
			gridHeight: 0,
			mapWidth: 0,
			mapHeight: 0,
		};
	}

	public async initializeGrid(
		mapWidth: number,
		mapHeight: number,
		mode: "terrain" | "heightmap" = "terrain",
	): Promise<void> {
		const grid = mode === "terrain" ? this.terrainGrid : this.heightmapGrid;

		grid.mapWidth = mapWidth;
		grid.mapHeight = mapHeight;
		grid.gridWidth = Math.ceil(mapWidth / CHUNK_SIZE);
		grid.gridHeight = Math.ceil(mapHeight / CHUNK_SIZE);

		await this.clearGrid(grid);
		await this.ensureResourcePools();
	}

	private async ensureResourcePools(): Promise<void> {
		const targetSize = Math.min(MAX_ACTIVE_CHUNKS, 64);
		this.texturePool.preWarm(targetSize);
		this.framebufferPool.preWarm(targetSize / 2);
	}

	private createChunkTexture(): Texture2D {
		const oceanValue = (1 << 5) | 15;
		return Texture2D.createChunkTexture(this.gl, CHUNK_SIZE, {
			r: oceanValue,
			g: 0,
			b: 0,
			a: 255,
		});
	}

	private async getOrCreateChunk(
		chunkX: number,
		chunkY: number,
	): Promise<ChunkData | null> {
		const grid =
			this.activeMode === "terrain" ? this.terrainGrid : this.heightmapGrid;
		const key = getChunkKey(chunkX, chunkY);

		let chunk = grid.chunks.get(key) || null;
		if (chunk) {
			chunk.lastAccess = Date.now();
			return chunk;
		}

		if (
			chunkX >= 0 &&
			chunkX < grid.gridWidth &&
			chunkY >= 0 &&
			chunkY < grid.gridHeight
		) {
			chunk = await this.createChunk();
			if (chunk) {
				grid.chunks.set(key, chunk);
				await this.evictLeastRecentlyUsedChunks(grid);
			}
		}

		return chunk || null;
	}

	private async createChunk(): Promise<ChunkData | null> {
		try {
			const readTexture = this.texturePool.acquire();
			const writeTexture = this.texturePool.acquire();
			const readFramebuffer = this.framebufferPool.acquire();
			const writeFramebuffer = this.framebufferPool.acquire();

			readFramebuffer.attachColorTexture(readTexture);
			writeFramebuffer.attachColorTexture(writeTexture);

			return {
				readTexture,
				writeTexture,
				readFramebuffer,
				writeFramebuffer,
				isDirty: false,
				lastAccess: Date.now(),
				data: null,
			};
		} catch (error) {
			console.error("Failed to create chunk:", error);
			return null;
		}
	}

	private async evictLeastRecentlyUsedChunks(grid: ChunkGrid): Promise<void> {
		if (grid.chunks.size <= MAX_ACTIVE_CHUNKS) return;

		const chunks = Array.from(grid.chunks.entries());
		chunks.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

		const toEvict = chunks.slice(0, chunks.length - MAX_ACTIVE_CHUNKS);
		for (const [key, chunk] of toEvict) {
			await this.releaseChunk(chunk);
			grid.chunks.delete(key);
		}
	}

	private async releaseChunk(chunk: ChunkData): Promise<void> {
		this.texturePool.release(chunk.readTexture);
		this.texturePool.release(chunk.writeTexture);
		this.framebufferPool.release(chunk.readFramebuffer);
		this.framebufferPool.release(chunk.writeFramebuffer);
	}

	public async paintToChunks(
		centerX: number,
		centerY: number,
		radius: number,
		_paintData: Uint8Array,
	): Promise<boolean> {
		const affectedChunks = getAffectedChunks(centerX, centerY, radius);
		let success = true;

		for (const { chunkX, chunkY } of affectedChunks) {
			const chunk = await this.getOrCreateChunk(chunkX, chunkY);
			if (!chunk) {
				success = false;
				continue;
			}

			chunk.isDirty = true;
		}

		return success;
	}

	public async getChunkTexture(
		chunkX: number,
		chunkY: number,
	): Promise<WebGLTexture | null> {
		const chunk = await this.getOrCreateChunk(chunkX, chunkY);
		return chunk?.readTexture.webGLTexture || null;
	}

	public async getChunkReadTexture(
		chunkX: number,
		chunkY: number,
	): Promise<WebGLTexture | null> {
		const chunk = await this.getOrCreateChunk(chunkX, chunkY);
		return chunk?.readTexture.webGLTexture || null;
	}

	public async getChunkWriteTexture(
		chunkX: number,
		chunkY: number,
	): Promise<WebGLTexture | null> {
		const chunk = await this.getOrCreateChunk(chunkX, chunkY);
		return chunk?.writeTexture.webGLTexture || null;
	}

	public async getChunkFramebuffer(
		chunkX: number,
		chunkY: number,
	): Promise<WebGLFramebuffer | null> {
		const chunk = await this.getOrCreateChunk(chunkX, chunkY);
		return chunk?.readFramebuffer.webGLFramebuffer || null;
	}

	public async getChunkWriteFramebuffer(
		chunkX: number,
		chunkY: number,
	): Promise<WebGLFramebuffer | null> {
		const chunk = await this.getOrCreateChunk(chunkX, chunkY);
		return chunk?.writeFramebuffer.webGLFramebuffer || null;
	}

	public setActiveMode(mode: "terrain" | "heightmap"): void {
		this.activeMode = mode;
	}

	public getActiveGrid(): ChunkGrid {
		return this.activeMode === "terrain"
			? this.terrainGrid
			: this.heightmapGrid;
	}

	public async extractChunkData(
		chunkX: number,
		chunkY: number,
	): Promise<Uint8Array | null> {
		const chunk = await this.getOrCreateChunk(chunkX, chunkY);
		if (!chunk) return null;

		return chunk.readFramebuffer.readPixels();
	}

	public async swapChunkBuffers(chunkX: number, chunkY: number): Promise<void> {
		const chunk = await this.getOrCreateChunk(chunkX, chunkY);
		if (!chunk) return;

		const tempTexture = chunk.readTexture;
		const tempFramebuffer = chunk.readFramebuffer;

		chunk.readTexture = chunk.writeTexture;
		chunk.readFramebuffer = chunk.writeFramebuffer;

		chunk.writeTexture = tempTexture;
		chunk.writeFramebuffer = tempFramebuffer;
	}

	public async syncChunkBuffers(chunkX: number, chunkY: number): Promise<void> {
		const chunk = await this.getOrCreateChunk(chunkX, chunkY);
		if (!chunk) return;

		chunk.writeFramebuffer.copyToTexture(chunk.readTexture);
	}

	private async clearGrid(grid: ChunkGrid): Promise<void> {
		for (const chunk of Array.from(grid.chunks.values())) {
			await this.releaseChunk(chunk);
		}
		grid.chunks.clear();
	}

	public async dispose(): Promise<void> {
		await this.clearGrid(this.terrainGrid);
		await this.clearGrid(this.heightmapGrid);

		this.texturePool.dispose();
		this.framebufferPool.dispose();
	}

	public get chunkSize(): number {
		return CHUNK_SIZE;
	}

	public get activeGridInfo(): { width: number; height: number } {
		const grid = this.getActiveGrid();
		return { width: grid.gridWidth, height: grid.gridHeight };
	}
}
