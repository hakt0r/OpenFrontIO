import type { EditorPosition, EditorTransform } from "../types/MapEditorTypes";

export type { EditorPosition, EditorTransform };

export function canvasToMapCoordinates(
	canvasX: number,
	canvasY: number,
	transform: EditorTransform,
): EditorPosition {
	return {
		x: (canvasX - transform.panX) / transform.zoom,
		y: (canvasY - transform.panY) / transform.zoom,
	};
}

export function mapToCanvasCoordinates(
	mapX: number,
	mapY: number,
	transform: EditorTransform,
): EditorPosition {
	return {
		x: mapX * transform.zoom + transform.panX,
		y: mapY * transform.zoom + transform.panY,
	};
}

export function calculateFitZoom(
	mapWidth: number,
	mapHeight: number,
	canvasWidth: number,
	canvasHeight: number,
	padding = 50,
): EditorTransform {
	const canvasAspect = canvasWidth / canvasHeight;
	const mapAspect = mapWidth / mapHeight;

	let zoom: number;
	if (mapAspect > canvasAspect) {
		zoom = (canvasWidth - padding * 2) / mapWidth;
	} else {
		zoom = (canvasHeight - padding * 2) / mapHeight;
	}

	const panX = (canvasWidth - mapWidth * zoom) / 2;
	const panY = (canvasHeight - mapHeight * zoom) / 2;

	return { zoom, panX, panY };
}

export function constrainCoordinates(
	position: EditorPosition,
	bounds: { width: number; height: number },
): EditorPosition {
	return {
		x: Math.max(0, Math.min(bounds.width - 1, position.x)),
		y: Math.max(0, Math.min(bounds.height - 1, position.y)),
	};
}

export function isPositionInBounds(
	position: EditorPosition,
	bounds: { width: number; height: number },
): boolean {
	return (
		position.x >= 0 &&
		position.x < bounds.width &&
		position.y >= 0 &&
		position.y < bounds.height
	);
}

export function calculateDistance(
	pos1: EditorPosition,
	pos2: EditorPosition,
): number {
	const dx = pos2.x - pos1.x;
	const dy = pos2.y - pos1.y;
	return Math.sqrt(dx * dx + dy * dy);
}
