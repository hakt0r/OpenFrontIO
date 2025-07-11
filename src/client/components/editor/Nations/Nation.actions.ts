import type { Nation } from "../../../../core/game/TerrainMapLoader";
import type {
	MapEditorState,
	NationData,
	EditorPosition,
} from "../types/MapEditorTypes";
import { isPositionInBounds } from "../utils/coordinates";

export function placeNation(
	mapState: MapEditorState,
	position: EditorPosition,
	nationData: NationData,
): boolean {
	const gameMap = mapState.gameMap;
	const mapX = Math.floor(position.x);
	const mapY = Math.floor(position.y);

	if (
		!isPositionInBounds(
			{ x: mapX, y: mapY },
			{ width: gameMap.width(), height: gameMap.height() },
		)
	) {
		return false;
	}

	const nation: Nation = {
		coordinates: [mapX, mapY],
		flag: nationData.flag,
		name: nationData.name,
		strength: nationData.strength,
	};

	mapState.nations = [...mapState.nations, nation];
	return true;
}

export function removeNation(
	mapState: MapEditorState,
	nation: Nation,
): boolean {
	const index = mapState.nations.indexOf(nation);
	if (index > -1) {
		mapState.nations = mapState.nations.filter((n) => n !== nation);
		return true;
	}
	return false;
}

export function editNation(nation: Nation, nationData: NationData): void {
	nation.name = nationData.name;
	nation.flag = nationData.flag;
	nation.strength = nationData.strength;
}

export function findNationAt(
	mapState: MapEditorState,
	position: EditorPosition,
	tolerance = 10,
): Nation | null {
	const mapX = Math.floor(position.x);
	const mapY = Math.floor(position.y);

	for (const nation of mapState.nations) {
		const dx = nation.coordinates[0] - mapX;
		const dy = nation.coordinates[1] - mapY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance <= tolerance) {
			return nation;
		}
	}

	return null;
}

export function validateNationPosition(
	mapState: MapEditorState,
	position: EditorPosition,
	excludeNation?: Nation,
): boolean {
	const gameMap = mapState.gameMap;
	const mapX = Math.floor(position.x);
	const mapY = Math.floor(position.y);

	if (
		!isPositionInBounds(
			{ x: mapX, y: mapY },
			{ width: gameMap.width(), height: gameMap.height() },
		)
	) {
		return false;
	}

	for (const nation of mapState.nations) {
		if (excludeNation && nation === excludeNation) {
			continue;
		}

		const dx = nation.coordinates[0] - mapX;
		const dy = nation.coordinates[1] - mapY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance < 20) {
			return false;
		}
	}

	return true;
}

export function moveNation(
	mapState: MapEditorState,
	nation: Nation,
	newPosition: EditorPosition,
): boolean {
	if (!validateNationPosition(mapState, newPosition, nation)) {
		return false;
	}

	nation.coordinates = [Math.floor(newPosition.x), Math.floor(newPosition.y)];
	return true;
}

export function getNationsSummary(mapState: MapEditorState): {
	totalNations: number;
	averageStrength: number;
	strongestNation: Nation | null;
	weakestNation: Nation | null;
} {
	const nations = mapState.nations;

	if (nations.length === 0) {
		return {
			totalNations: 0,
			averageStrength: 0,
			strongestNation: null,
			weakestNation: null,
		};
	}

	const totalStrength = nations.reduce(
		(sum, nation) => sum + nation.strength,
		0,
	);
	const averageStrength = totalStrength / nations.length;

	const strongestNation = nations.reduce((strongest, nation) =>
		nation.strength > strongest.strength ? nation : strongest,
	);

	const weakestNation = nations.reduce((weakest, nation) =>
		nation.strength < weakest.strength ? nation : weakest,
	);

	return {
		totalNations: nations.length,
		averageStrength: Math.round(averageStrength),
		strongestNation,
		weakestNation,
	};
}

export function handleNationSubmit(
	event: CustomEvent,
	mapState: MapEditorState,
	editingNation: Nation | null,
	isEditingNation: boolean,
	pendingNationCoords: [number, number] | null,
	onSuccess: () => void,
): void {
	const nationData = event.detail as NationData;

	if (isEditingNation && editingNation) {
		editNation(editingNation, nationData);
	} else if (pendingNationCoords) {
		const [x, y] = pendingNationCoords;
		placeNation(mapState, { x, y }, nationData);
	}

	onSuccess();
}
