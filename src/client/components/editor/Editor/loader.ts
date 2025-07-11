import { GameMapType } from "../../../../core/game/Game";
import type { GameMapImpl } from "../../../../core/game/GameMap";
import { genTerrainFromBin } from "../../../../core/game/TerrainMapLoader";
import { terrainMapFileLoader } from "../../../../core/game/TerrainMapFileLoader";
import type { MapEditorState } from "../types/MapEditorTypes";
import { MAP_NAME_MAPPING } from "../constants";
import { formatErrorMessage } from "../utils/validation";
import * as MapIOService from "./io";

export async function loadExistingMap(
	mapName: string,
): Promise<MapEditorState | null> {
	try {
		const enumKey = MAP_NAME_MAPPING[mapName.toLowerCase()];
		if (!enumKey) throw new Error(`Map not found: ${mapName}`);

		const mapType = GameMapType[enumKey];
		if (!mapType) throw new Error(`Map type not found for: ${enumKey}`);

		const mapFiles = terrainMapFileLoader.getMapData(mapType);
		const manifest = await mapFiles.manifest();
		const binaryData = await mapFiles.mapBin();

		const gameMap = await genTerrainFromBin(manifest.map, binaryData);

		return {
			gameMap: gameMap as unknown as GameMapImpl,
			mapName: manifest.name,
			nations: manifest.nations,
		};
	} catch (error) {
		console.error("Failed to load map:", error);
		return null;
	}
}

export async function loadMap(
	event: CustomEvent,
	onSuccess: (mapState: MapEditorState) => void,
	onError: (message: string) => void,
): Promise<void> {
	const { mapName } = event.detail;
	try {
		const loadedMap = await MapIOService.handleMapLoad(mapName);
		if (!loadedMap) {
			onError(`Failed to load map: ${mapName}`);
			return;
		}
		onSuccess(loadedMap);
	} catch (error) {
		onError(`Error loading map: ${formatErrorMessage(error)}`);
	}
}
