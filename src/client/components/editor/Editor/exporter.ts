import type { GameMapImpl } from "../../../../core/game/GameMap";
import type { MapManifest } from "../../../../core/game/TerrainMapLoader";
import { MINIMAP_SCALE_FACTOR, } from "../constants";
import { formatErrorMessage } from "../utils/validation";
import * as MapIOService from "./io";
import type { WebGLRenderer } from "../webgl/WebGLRenderer";
import { generateShoresForExport } from "../utils/terrain";

import type {
	GameMapWithTerrain,
	MapEditorState,
	MapSaveData,
} from "../types/MapEditorTypes";

function generateMinimapData(
	terrainData: Uint8Array,
	width: number,
	height: number,
): { minimapData: Uint8Array; landTiles: number } {
	const miniWidth = Math.floor(width / MINIMAP_SCALE_FACTOR);
	const miniHeight = Math.floor(height / MINIMAP_SCALE_FACTOR);
	const minimapData = new Uint8Array(miniWidth * miniHeight);
	let landTiles = 0;

	for (let y = 0; y < miniHeight; y++) {
		for (let x = 0; x < miniWidth; x++) {
			const sourceX = Math.min(x * MINIMAP_SCALE_FACTOR, width - 1);
			const sourceY = Math.min(y * MINIMAP_SCALE_FACTOR, height - 1);
			const sourceIndex = sourceY * width + sourceX;
			const miniIndex = y * miniWidth + x;

			minimapData[miniIndex] = terrainData[sourceIndex];

			if (terrainData[sourceIndex] & (1 << 7)) {
				landTiles++;
			}
		}
	}

	return { minimapData, landTiles };
}

async function renderMapThumbnail(
	mapState: MapEditorState,
	renderer: WebGLRenderer | null,
	targetWidth = 512,
): Promise<Blob> {
	if (!renderer)
		throw new Error("WebGL renderer not available for thumbnail generation");

	const webglCanvas = renderer.canvas as HTMLCanvasElement;
	if (!webglCanvas) throw new Error("WebGL canvas not available");

	const currentTransform = renderer.transformValue;
	const mapWidth = mapState.gameMap.width();
	const mapHeight = mapState.gameMap.height();
	const canvasWidth = webglCanvas.width;
	const canvasHeight = webglCanvas.height;
	const scaleX = canvasWidth / mapWidth;
	const scaleY = canvasHeight / mapHeight;
	const fitZoom = Math.min(scaleX, scaleY) * 0.9;

	renderer.setTransform(fitZoom, 0, 0);
	await renderer.render(mapState);
	await new Promise((resolve) => requestAnimationFrame(resolve));
	const aspectRatio = mapHeight / mapWidth;
	const targetHeight = Math.round(targetWidth * aspectRatio);
	const thumbnailCanvas = document.createElement("canvas");
	thumbnailCanvas.width = targetWidth;
	thumbnailCanvas.height = targetHeight;
	const ctx = thumbnailCanvas.getContext("2d");

	if (!ctx) throw new Error("Failed to get context");

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";

	ctx.drawImage(
		webglCanvas,
		0,
		0,
		canvasWidth,
		canvasHeight,
		0,
		0,
		targetWidth,
		targetHeight,
	);

	return new Promise((resolve) =>
		thumbnailCanvas.toBlob(
			(blob) => {
				renderer.setTransform(
					currentTransform.zoom,
					currentTransform.panX,
					currentTransform.panY,
				);
				if (blob) resolve(blob);
				else throw new Error("Failed to create WebP blob");
			},
			"image/webp",
			0.9,
		),
	);
}

function downloadFile(
	content: string,
	filename: string,
	mimeType: string,
): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export async function exportMap(
	mapState: MapEditorState,
	renderer?: WebGLRenderer | null,
): Promise<void> {
	const gameMap = mapState.gameMap;
	const width = gameMap.width();
	const height = gameMap.height();

	let terrainData: Uint8Array;
	let _landTiles: number;

	if (renderer) {
		const gpuTerrainData = await renderer.extractTerrainDataFromGPU();
		if (gpuTerrainData) {
			terrainData = gpuTerrainData;

			_landTiles = 0;
			for (let i = 0; i < terrainData.length; i++) {
				if (terrainData[i] & (1 << 7)) _landTiles++;
			}
		} else {
			terrainData = extractTerrainData(gameMap, width * height);
			_landTiles = gameMap.numLandTiles();
		}
	} else {
		terrainData = extractTerrainData(gameMap, width * height);
		_landTiles = gameMap.numLandTiles();
	}

	const { minimapData, landTiles: minimapLandTiles } = generateMinimapData(
		terrainData,
		width,
		height,
	);

	const manifest: MapManifest = {
		name: mapState.mapName || "Untitled Map",
		map: {
			width,
			height,
			num_land_tiles: mapState.gameMap.numLandTiles(),
		},
		mini_map: {
			width: Math.floor(width / MINIMAP_SCALE_FACTOR),
			height: Math.floor(height / MINIMAP_SCALE_FACTOR),
			num_land_tiles: minimapLandTiles,
		},
		nations: mapState.nations || [],
	};

	const terrainDataWithShores = generateShoresForExport(
		terrainData,
		width,
		height,
	);
	const minimapDataWithShores = generateShoresForExport(
		minimapData,
		Math.floor(width / MINIMAP_SCALE_FACTOR),
		Math.floor(height / MINIMAP_SCALE_FACTOR),
	);
	const binaryString = Array.from(terrainDataWithShores)
		.map((byte) => String.fromCharCode(byte))
		.join("");
	const minimapBinaryString = Array.from(minimapDataWithShores)
		.map((byte) => String.fromCharCode(byte))
		.join("");
	const thumbnailBlob = await renderMapThumbnail(
		mapState,
		renderer || null,
		512,
	);
	const manifestString = JSON.stringify(manifest, null, 2);
	downloadBlob(thumbnailBlob, "thumbnail.webp");
	downloadFile(manifestString, "manifest.json", "application/json");
	downloadFile(binaryString, "map.bin", "application/octet-stream");
	downloadFile(minimapBinaryString, "mini_map.bin", "application/octet-stream");
}

function extractTerrainData(gameMap: GameMapImpl, length: number): Uint8Array {
	const terrainData = new Uint8Array(length);
	const gameMapWithTerrain = gameMap as unknown as GameMapWithTerrain;

	for (let i = 0; i < length; i++) {
		terrainData[i] = gameMapWithTerrain.terrain[i];
	}

	return terrainData;
}

export async function handleSaveMapSubmit(
	event: CustomEvent,
	mapState: MapEditorState,
	onSuccess: () => void,
	onError: (message: string) => void,
	renderer?: WebGLRenderer | null,
): Promise<void> {
	const { mapName, saveType } = event.detail as MapSaveData;
	try {
		if (saveType === "local") {
			await MapIOService.saveMapToLocalStorage(mapState, mapName, renderer);
		} else {
			await exportMap({ ...mapState, mapName }, renderer);
		}
		onSuccess();
	} catch (error) {
		onError(`Error saving map: ${formatErrorMessage(error)}`);
	}
}
