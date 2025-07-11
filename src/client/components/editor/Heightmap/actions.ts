import { GameMapImpl } from "../../../../core/game/GameMap";
import { startRenderLoop } from "../webgl/WebGLRenderer.actions";
import type { WebGLRenderer } from "../webgl/WebGLRenderer";
import type {
	MapEditorState,
	TerrainThresholds,
} from "../types/MapEditorTypes";

export function handleHeightmapFileUpload(
	event: Event,
	onImageLoaded: (image: HTMLImageElement) => void,
): void {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = (e) => {
		const img = new Image();
		img.onload = () => {
			onImageLoaded(img);
		};
		img.src = e.target?.result as string;
	};
	reader.readAsDataURL(file);

	input.value = "";
}

export function exitHeightmapMode(
	renderer: WebGLRenderer | null,
	getCurrentMapState: () => MapEditorState,
	onExit: () => void,
): void {
	if (renderer) {
		startRenderLoop(renderer, getCurrentMapState, () => {});
	}
	onExit();
}

export async function processHeightmapOnGPU(
	renderer: WebGLRenderer,
	heightmapImage: HTMLImageElement,
	heightmapMaxSize: number,
	terrainThresholds: TerrainThresholds,
	heightmapClampMin: number,
	heightmapClampMax: number,
): Promise<MapEditorState | null> {
	try {
		const { width, height } = await renderer.uploadHeightmapToGPU(
			heightmapImage,
			heightmapMaxSize,
		);

		await renderer.processHeightmapToTerrain(
			width,
			height,
			terrainThresholds,
			heightmapClampMin,
			heightmapClampMax,
		);

		const terrainData = await renderer.extractTerrainDataFromGPU();
		if (!terrainData) return null;

		return createMapStateFromTerrainData(terrainData, width, height);
	} catch (error) {
		console.error("Failed to process heightmap on GPU:", error);
		return null;
	}
}

function createMapStateFromTerrainData(
	terrainData: Uint8Array,
	width: number,
	height: number,
): MapEditorState {
	let landTiles = 0;
	for (let i = 0; i < terrainData.length; i++) {
		if (terrainData[i] & (1 << 7)) {
			landTiles++;
		}
	}

	const gameMap = new GameMapImpl(width, height, terrainData, landTiles);
	return {
		gameMap,
		nations: [],
		mapName: `Heightmap (${width}x${height})`,
	};
}

export function createDebouncedHeightmapProcessor(
	processFunction: () => Promise<void>,
): () => void {
	let timeoutId: number | null = null;
	return () => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(async () => {
			await processFunction();
			timeoutId = null;
		}, 150) as unknown as number;
	};
}

export function updateTerrainThresholds(
	newThresholds: TerrainThresholds,
	onThresholdsChange: (thresholds: TerrainThresholds) => void,
	onProcessHeightmap?: () => void,
): void {
	onThresholdsChange(newThresholds);
	if (onProcessHeightmap) onProcessHeightmap();
}
