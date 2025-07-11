import type { MapEditorState } from "../types/MapEditorTypes";
import { loadExistingMap } from "./loader";
import { exportMap } from "./exporter";
import { createNewMap } from "./creator";
import {
	saveMapToLocalStorage as saveMapToLocalStorageCore,
	loadMapFromLocalStorage,
	getAllLocalMapNames,
	deleteLocalMap,
} from "./persistence";
import type { WebGLRenderer } from "../webgl/WebGLRenderer";

const LOCAL_PREFIX = "local:";

export async function handleMapLoad(
	mapName: string,
): Promise<MapEditorState | null> {
	if (mapName.startsWith(LOCAL_PREFIX)) {
		const key = mapName.replace(LOCAL_PREFIX, "");
		return loadMapFromLocalStorage(key);
	}
	return loadExistingMap(mapName);
}

export async function saveMapToLocalStorage(
	mapState: MapEditorState,
	mapName: string,
	renderer?: WebGLRenderer | null,
): Promise<void> {
	return saveMapToLocalStorageCore(mapState, mapName, renderer);
}

export {
	loadExistingMap,
	exportMap,
	createNewMap,
	loadMapFromLocalStorage,
	getAllLocalMapNames,
	deleteLocalMap,
};
