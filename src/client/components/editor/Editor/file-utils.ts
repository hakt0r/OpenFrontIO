import type { GameMapImpl } from "../../../../core/game/GameMap";
import type { GameMapWithTerrain } from "../types/MapEditorTypes";

export function extractTerrainData(
	gameMap: GameMapImpl,
	length: number,
): Uint8Array {
	const typedGameMap = gameMap as unknown as GameMapWithTerrain;
	return typedGameMap.terrain
		? typedGameMap.terrain.slice(0, length)
		: new Uint8Array(length);
}

export function downloadFile(
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

export async function migrateLegacyLocalStorage(): Promise<void> {
	const keys = Object.keys(localStorage);
	const mapKeys = keys.filter((key) => key.startsWith("map_"));

	if (mapKeys.length === 0) return;

	for (const key of mapKeys) {
		try {
			const data = localStorage.getItem(key);
			if (!data) continue;

			const _mapData = JSON.parse(data);
			const _newKey = key.replace("map_", "");

			localStorage.removeItem(key);
		} catch (error) {
			console.error(`Failed to migrate map ${key}:`, error);
		}
	}
}
