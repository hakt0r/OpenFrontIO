import { calculatePanTransform, calculateZoomTransform } from "./actions";
import type { WebGLRenderer } from "../webgl/WebGLRenderer";
import type {
	MapEditorState,
	EditorTool,
	EditorTransform,
} from "../types/MapEditorTypes";
import { EditorTool as EditorToolEnum } from "../types/MapEditorTypes";

export function handleMouseDown(
	e: MouseEvent,
	canvas: HTMLCanvasElement,
	onLeftClick: (x: number, y: number) => void,
	onRightDrag: (x: number, y: number) => void,
): void {
	const rect = canvas.getBoundingClientRect();
	const canvasX = e.clientX - rect.left;
	const canvasY = e.clientY - rect.top;

	if (e.button === 2) onRightDrag(canvasX, canvasY);
	else if (e.button === 0) onLeftClick(canvasX, canvasY);
}

export function handleLeftClick(
	canvasX: number,
	canvasY: number,
	renderer: WebGLRenderer | null,
	mapState: MapEditorState,
	currentTool: EditorTool,
	onStartDrawing: () => void,
	onPaint: (x: number, y: number) => void,
): void {
	const coords = renderer?.canvasToMapCoordinates(canvasX, canvasY);

	if (!coords) return;

	const isInBounds =
		coords.x >= 0 &&
		coords.x < mapState.gameMap.width() &&
		coords.y >= 0 &&
		coords.y < mapState.gameMap.height();

	if (!isInBounds) return;

	if (
		currentTool === EditorToolEnum.Paint ||
		currentTool === EditorToolEnum.Erase
	)
		onStartDrawing();

	onPaint(coords.x, coords.y);
}

export function handleDrag(
	canvasX: number,
	canvasY: number,
	lastMousePos: { x: number; y: number },
	transform: EditorTransform,
	renderer: WebGLRenderer | null,
	onTransformChange: (transform: EditorTransform) => void,
	isHeightmapMode = false,
	mapState?: MapEditorState,
): { x: number; y: number } {
	const deltaX = canvasX - lastMousePos.x;
	const deltaY = canvasY - lastMousePos.y;
	const newTransform = calculatePanTransform(transform, deltaX, deltaY);

	onTransformChange(newTransform);
	renderer?.setTransform(
		newTransform.zoom,
		newTransform.panX,
		newTransform.panY,
	);

	if (isHeightmapMode && renderer && mapState) renderer.render(mapState);

	return { x: canvasX, y: canvasY };
}

export function handleDrawing(
	canvasX: number,
	canvasY: number,
	renderer: WebGLRenderer | null,
	mapState: MapEditorState,
	onPaint: (x: number, y: number) => void,
): void {
	const coords = renderer?.canvasToMapCoordinates(canvasX, canvasY);

	if (!coords) return;

	const isInBounds =
		coords.x >= 0 &&
		coords.x < mapState.gameMap.width() &&
		coords.y >= 0 &&
		coords.y < mapState.gameMap.height();

	if (isInBounds) onPaint(coords.x, coords.y);
}

export function handleZoom(
	e: WheelEvent,
	canvas: HTMLCanvasElement,
	transform: EditorTransform,
	renderer: WebGLRenderer | null,
	onTransformChange: (transform: EditorTransform) => void,
	isHeightmapMode = false,
	mapState?: MapEditorState,
): void {
	const rect = canvas.getBoundingClientRect();
	const mouseX = e.clientX - rect.left;
	const mouseY = e.clientY - rect.top;
	const newTransform = calculateZoomTransform(
		transform,
		mouseX,
		mouseY,
		e.deltaY,
	);

	onTransformChange(newTransform);
	renderer?.setTransform(
		newTransform.zoom,
		newTransform.panX,
		newTransform.panY,
	);

	if (isHeightmapMode && renderer && mapState) renderer.render(mapState);
}
