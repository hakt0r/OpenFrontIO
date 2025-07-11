import { GameMapImpl } from "../../../../core/game/GameMap";
import { OCEAN_VALUE } from "../constants";
import type { MapCreationData, MapEditorState } from "../types/MapEditorTypes";
import * as MapIOService from "./io";

export function createNewMap(
	width: number,
	height: number,
	name: string,
): MapEditorState {
	const terrainData = new Uint8Array(width * height);
	terrainData.fill(OCEAN_VALUE);

	const gameMap = new GameMapImpl(width, height, terrainData, 0);

	return {
		gameMap: gameMap,
		nations: [],
		mapName: name,
	};
}

export async function handleNewMapSubmit(
	event: CustomEvent,
	onSuccess: (mapState: MapEditorState) => void,
): Promise<void> {
	const { width, height, name } = event.detail as MapCreationData;
	const mapState = MapIOService.createNewMap(width, height, name);
	onSuccess(mapState);
}
