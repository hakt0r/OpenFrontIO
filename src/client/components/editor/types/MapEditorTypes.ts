import type { Nation } from "../../../../core/game/TerrainMapLoader";
import type { GameMapImpl } from "../../../../core/game/GameMap";

export interface MapEditorState {
	gameMap: GameMapImpl;
	nations: Nation[];
	mapName: string;
}

export enum EditorTool {
	Paint = "paint",
	Erase = "erase",
	Nation = "nation",
	Heightmap = "heightmap",
}

export enum BrushType {
	Ocean = "ocean",
	Lake = "lake",
	Plains = "plains",
	Highland = "highland",
	Mountain = "mountain",
	GaussianBlur = "gaussianblur",
	RaiseTerrain = "raiseterrain",
	LowerTerrain = "lowerterrain",
}

export interface EditorPosition {
	x: number;
	y: number;
}

export interface EditorBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface TerrainThresholds {
	ocean: number;
	plains: number;
	hills: number;
	mountain: number;
}

export interface EditorTransform {
	zoom: number;
	panX: number;
	panY: number;
}

export interface NationData {
	name: string;
	flag: string;
	strength: number;
}

export interface MapCreationData {
	width: number;
	height: number;
	name: string;
}

export interface MapSaveData {
	mapName: string;
	saveType: "local" | "export";
}

export interface ModalEventDetail<T> {
	detail: T;
}

export interface ErrorEvent {
	message: string;
}

export interface NationModalData {
	name: string;
	flag: string;
	strength: number;
}

export interface ValidationResult {
	isValid: boolean;
	message?: string;
}
export interface GameMapWithTerrain extends Omit<GameMapImpl, "terrain"> {
	terrain: Uint8Array;
}
