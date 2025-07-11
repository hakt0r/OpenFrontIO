import { GameMapImpl } from "../../../../core/game/GameMap";
import {
	DEFAULT_MAP_WIDTH,
	DEFAULT_MAP_HEIGHT,
	INITIAL_MAP_CENTER_RADIUS,
	LAND_BIT,
	DEFAULT_PLAINS_MAGNITUDE,
	INITIAL_MAP_NAME,
} from "../constants";
import {
	brushTypeToTerrainType,
	paintAtPosition,
} from "../TerrainPanel/handlers";
import type {
	BrushType,
	EditorTool,
	EditorTransform,
	MapEditorState,
	TerrainThresholds,
} from "../types/MapEditorTypes";
import { calculateFitZoom } from "../utils/coordinates";
import type { WebGLRenderer } from "../webgl/WebGLRenderer";

export function calculateZoomTransform(
	currentTransform: EditorTransform,
	mouseX: number,
	mouseY: number,
	zoomDirection: number,
): EditorTransform {
	const zoomFactor = zoomDirection > 0 ? 0.9 : 1.1;
	const newZoom = Math.max(
		0.1,
		Math.min(10, currentTransform.zoom * zoomFactor),
	);

	return {
		zoom: newZoom,
		panX:
			mouseX -
			(mouseX - currentTransform.panX) * (newZoom / currentTransform.zoom),
		panY:
			mouseY -
			(mouseY - currentTransform.panY) * (newZoom / currentTransform.zoom),
	};
}

export function calculatePanTransform(
	currentTransform: EditorTransform,
	deltaX: number,
	deltaY: number,
): EditorTransform {
	return {
		...currentTransform,
		panX: currentTransform.panX + deltaX,
		panY: currentTransform.panY + deltaY,
	};
}

export function updateTerrainThreshold(
	thresholds: TerrainThresholds,
	thresholdName: string,
	value: number,
): TerrainThresholds {
	const constrainedValue = Math.max(0, Math.min(1, value));
	return { ...thresholds, [thresholdName]: constrainedValue };
}
export function initializeMap(): MapEditorState {
	const terrainData = new Uint8Array(DEFAULT_MAP_WIDTH * DEFAULT_MAP_HEIGHT);
	const oceanValue = (1 << 5) | 15;
	terrainData.fill(oceanValue);

	const centerX = Math.floor(DEFAULT_MAP_WIDTH / 2);
	const centerY = Math.floor(DEFAULT_MAP_HEIGHT / 2);
	let landTiles = 0;

	for (
		let y = centerY - INITIAL_MAP_CENTER_RADIUS;
		y < centerY + INITIAL_MAP_CENTER_RADIUS;
		y++
	) {
		for (
			let x = centerX - INITIAL_MAP_CENTER_RADIUS;
			x < centerX + INITIAL_MAP_CENTER_RADIUS;
			x++
		) {
			const isInBounds =
				x >= 0 && x < DEFAULT_MAP_WIDTH && y >= 0 && y < DEFAULT_MAP_HEIGHT;
			if (!isInBounds) continue;

			const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
			if (distance >= INITIAL_MAP_CENTER_RADIUS) continue;

			const index = y * DEFAULT_MAP_WIDTH + x;
			terrainData[index] = LAND_BIT | DEFAULT_PLAINS_MAGNITUDE;
			landTiles++;
		}
	}

	return {
		gameMap: new GameMapImpl(
			DEFAULT_MAP_WIDTH,
			DEFAULT_MAP_HEIGHT,
			terrainData,
			landTiles,
		),
		nations: [],
		mapName: INITIAL_MAP_NAME,
	};
}

export function centerAndFitMap(
	mapState: MapEditorState,
	canvas: HTMLCanvasElement,
): EditorTransform {
	return calculateFitZoom(
		mapState.gameMap.width(),
		mapState.gameMap.height(),
		canvas.width,
		canvas.height,
	);
}
export function paint(
	x: number,
	y: number,
	renderer: WebGLRenderer | null,
	currentTool: EditorTool,
	currentBrush: BrushType,
	brushSize: number,
	brushMagnitude: number,
): void {
	if (!renderer) return;

	const currentTerrain = brushTypeToTerrainType(currentBrush);
	paintAtPosition(
		renderer,
		x,
		y,
		currentTool,
		currentBrush,
		currentTerrain,
		brushSize,
		brushMagnitude,
	);
}
