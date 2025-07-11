import { centerAndFitMap } from "../Editor/actions";
import type { MapEditorState, EditorTransform } from "../types/MapEditorTypes";
import type { WebGLRenderer } from "../webgl/WebGLRenderer";

export function centerAndFit(
	mapState: MapEditorState,
	canvas: HTMLCanvasElement,
	renderer: WebGLRenderer | null,
	onTransformChange: (transform: EditorTransform) => void,
	isHeightmapMode = false,
): void {
	if (!canvas) return;
	const transform = centerAndFitMap(mapState, canvas);
	onTransformChange(transform);
	renderer?.setTransform(transform.zoom, transform.panX, transform.panY);

	if (isHeightmapMode && renderer) {
		renderer.render(mapState);
	}
}
