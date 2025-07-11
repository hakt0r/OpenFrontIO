import { TerrainType } from "../../../../core/game/Game";
import { BrushType, EditorTool } from "../types/MapEditorTypes";

export function createGPUTerrainValue(terrain: TerrainType): number {
	switch (terrain) {
		case TerrainType.Plains:
			return (1 << 7) | 5;
		case TerrainType.Highland:
			return (1 << 7) | 15;
		case TerrainType.Mountain:
			return (1 << 7) | 25;
		case TerrainType.Ocean:
			return (1 << 5) | 15;
		case TerrainType.Lake:
			return 5;
		default:
			return (1 << 5) | 15;
	}
}

export function brushTypeToTerrainType(brushType: BrushType): TerrainType {
	switch (brushType) {
		case BrushType.Plains:
			return TerrainType.Plains;
		case BrushType.Highland:
			return TerrainType.Highland;
		case BrushType.Mountain:
			return TerrainType.Mountain;
		case BrushType.Ocean:
			return TerrainType.Ocean;
		case BrushType.Lake:
			return TerrainType.Lake;
		case BrushType.GaussianBlur:
			return TerrainType.Plains;
		case BrushType.RaiseTerrain:
			return TerrainType.Plains;
		case BrushType.LowerTerrain:
			return TerrainType.Plains;
		default:
			return TerrainType.Plains;
	}
}

export function getBrushEmoji(brushType: BrushType): string {
	switch (brushType) {
		case BrushType.Ocean:
			return "🌊";
		case BrushType.Lake:
			return "💧";
		case BrushType.Plains:
			return "🌾";
		case BrushType.Highland:
			return "🏕️";
		case BrushType.Mountain:
			return "⛰️";
		case BrushType.GaussianBlur:
			return "🌪️";
		case BrushType.RaiseTerrain:
			return "📈";
		case BrushType.LowerTerrain:
			return "📉";
		default:
			return "🌾";
	}
}

export function getBrushName(brushType: BrushType): string {
	switch (brushType) {
		case BrushType.Ocean:
			return "Ocean";
		case BrushType.Lake:
			return "Lake";
		case BrushType.Plains:
			return "Plains";
		case BrushType.Highland:
			return "Highland";
		case BrushType.Mountain:
			return "Mountain";
		case BrushType.GaussianBlur:
			return "Gaussian Blur";
		case BrushType.RaiseTerrain:
			return "Raise Terrain";
		case BrushType.LowerTerrain:
			return "Lower Terrain";
		default:
			return "Plains";
	}
}

export function paintAtPosition(
	renderer: {
		paintBrush: (
			x: number,
			y: number,
			brushSize: number,
			brushType: number,
			brushValue: number,
			brushMagnitude: number,
		) => Promise<void>;
	} | null,
	x: number,
	y: number,
	currentTool: EditorTool,
	currentBrush: BrushType,
	currentTerrain: TerrainType,
	brushSize: number,
	brushMagnitude: number,
): void {
	if (!renderer) return;

	let brushType = 0;
	let brushValue = 0;

	if (currentTool === EditorTool.Erase) {
		brushType = 1;
		brushValue = createGPUTerrainValue(TerrainType.Ocean);
	} else if (currentBrush === BrushType.GaussianBlur) {
		brushType = 2;
		brushValue = 0;
	} else if (currentBrush === BrushType.RaiseTerrain) {
		brushType = 3;
		brushValue = 0;
	} else if (currentBrush === BrushType.LowerTerrain) {
		brushType = 4;
		brushValue = 0;
	} else {
		brushType = 0;
		brushValue = createGPUTerrainValue(currentTerrain);
	}

	renderer.paintBrush(x, y, brushSize, brushType, brushValue, brushMagnitude);
}

export function handleToolChange(
	tool: EditorTool,
	currentBrush: BrushType,
	canvas: HTMLCanvasElement,
	onToolChange: (tool: EditorTool) => void,
	onTerrainChange: (terrain: TerrainType) => void,
): void {
	onToolChange(tool);
	onTerrainChange(brushTypeToTerrainType(currentBrush));
	canvas.style.cursor = getCursorForTool(tool);
}

export function handleBrushChange(
	brush: BrushType,
	onBrushChange: (brush: BrushType) => void,
	onTerrainChange: (terrain: TerrainType) => void,
): void {
	onBrushChange(brush);
	onTerrainChange(brushTypeToTerrainType(brush));
}

export function handleBrushSizeChange(
	size: number,
	onSizeChange: (size: number) => void,
): void {
	onSizeChange(size);
}

export function getCursorForTool(tool: EditorTool): string {
	switch (tool) {
		case EditorTool.Paint:
			return "crosshair";
		case EditorTool.Erase:
			return "crosshair";
		case EditorTool.Nation:
			return "crosshair";
		default:
			return "default";
	}
}

export function switchTool(
	currentTool: EditorTool,
	allTools: EditorTool[],
	direction: number,
): EditorTool {
	const currentIndex = allTools.indexOf(currentTool);
	const newIndex =
		(currentIndex + direction + allTools.length) % allTools.length;
	return allTools[newIndex];
}

export function changeBrushSize(
	currentSize: number,
	direction: number,
): number {
	return Math.max(1, Math.min(20, currentSize + direction));
}

export function switchBrushType(
	currentBrush: BrushType,
	allBrushTypes: BrushType[],
	direction: number,
): BrushType {
	const currentIndex = allBrushTypes.indexOf(currentBrush);
	const newIndex =
		(currentIndex + direction + allBrushTypes.length) % allBrushTypes.length;
	return allBrushTypes[newIndex];
}
