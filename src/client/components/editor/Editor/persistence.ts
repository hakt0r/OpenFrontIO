import { GameMapImpl } from "../../../../core/game/GameMap";
import type {
	MapManifest,
	MapMetadata,
} from "../../../../core/game/TerrainMapLoader";
import type {
	GameMapWithTerrain,
	MapEditorState,
} from "../types/MapEditorTypes";
import { formatErrorMessage, sanitizeMapName } from "../utils/validation";
import { MapStorage } from "./storage";
import type { WebGLRenderer } from "../webgl/WebGLRenderer";

const SAVE_DATA_VERSION = "1.0";
const MINIMAP_SCALE_FACTOR = 2;
const MINIMAP_LAND_REDUCTION = 4;

const mapStorage = new MapStorage();

export async function saveMapToLocalStorage(
	mapState: MapEditorState,
	mapName: string,
	renderer?: WebGLRenderer | null,
): Promise<void> {
	try {
		const gameMap = mapState.gameMap;
		const width = gameMap.width();
		const height = gameMap.height();

		let terrainData: Uint8Array;
		let landTiles: number;

		if (renderer) {
			const gpuTerrainData = await renderer.extractTerrainDataFromGPU();
			if (gpuTerrainData) {
				terrainData = gpuTerrainData;

				landTiles = 0;
				for (let i = 0; i < terrainData.length; i++) {
					if (terrainData[i] & (1 << 7)) landTiles++;
				}
			} else {
				terrainData = extractTerrainData(gameMap, width * height);
				landTiles = gameMap.numLandTiles();
			}
		} else {
			terrainData = extractTerrainData(gameMap, width * height);
			landTiles = gameMap.numLandTiles();
		}

		const mapMetadata: MapMetadata = {
			width: width,
			height: height,
			num_land_tiles: landTiles,
		};

		const manifest: MapManifest = {
			name: mapName,
			map: mapMetadata,
			mini_map: {
				width: Math.floor(width / MINIMAP_SCALE_FACTOR),
				height: Math.floor(height / MINIMAP_SCALE_FACTOR),
				num_land_tiles: Math.floor(landTiles / MINIMAP_LAND_REDUCTION),
			},
			nations: mapState.nations,
		};

		const { generateShoresForExport } = await import("../utils/terrain");
		const terrainDataWithShores = generateShoresForExport(
			terrainData,
			width,
			height,
		);
		const terrainDataArray = Array.from(terrainDataWithShores);

		const saveData = {
			version: SAVE_DATA_VERSION,
			manifest: manifest,
			terrainData: terrainDataArray,
			saveDate: new Date().toISOString(),
		};

		const key = sanitizeMapName(mapName);
		await mapStorage.saveMap(key, saveData);
	} catch (error) {
		console.error("Failed to save map:", error);
		throw new Error(`Failed to save map: ${formatErrorMessage(error)}`);
	}
}

export async function loadMapFromLocalStorage(
	key: string,
): Promise<MapEditorState | null> {
	try {
		const data = await mapStorage.loadMap(key);
		if (!data) return null;

		const manifest = data.manifest;
		const terrainDataRaw = new Uint8Array(data.terrainData);

		const { removeShoresForImport } = await import("../utils/terrain");
		const terrainData = removeShoresForImport(terrainDataRaw);

		const gameMap = new GameMapImpl(
			manifest.map.width,
			manifest.map.height,
			terrainData,
			manifest.map.num_land_tiles,
		);

		return {
			gameMap: gameMap,
			mapName: manifest.name,
			nations: manifest.nations || [],
		};
	} catch (error) {
		console.error(
			`Failed to load map from storage: ${formatErrorMessage(error)}`,
		);
		return null;
	}
}

export async function getAllLocalMapNames(): Promise<string[]> {
	try {
		return await mapStorage.getAllMapIds();
	} catch (error) {
		console.error("Failed to get local map names:", error);
		return [];
	}
}

export async function deleteLocalMap(key: string): Promise<void> {
	try {
		await mapStorage.deleteMap(key);
	} catch (error) {
		console.error("Failed to delete map:", error);
		throw new Error(`Failed to delete map: ${formatErrorMessage(error)}`);
	}
}

function extractTerrainData(gameMap: GameMapImpl, length: number): Uint8Array {
	const terrainData = new Uint8Array(length);
	const gameMapWithTerrain = gameMap as unknown as GameMapWithTerrain;

	for (let i = 0; i < length; i++) {
		terrainData[i] = gameMapWithTerrain.terrain[i];
	}

	return terrainData;
}
