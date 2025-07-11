import type { InputHandler } from "./InputManager";
import type { MapEditor } from "../Editor/index";
import { EditorTool } from "../types/MapEditorTypes";

export class NationDragHandler implements InputHandler {
	public readonly id = "nation-drag";
	public readonly priority = 100;

	private editor: MapEditor;
	private canvas: HTMLCanvasElement;

	constructor(editor: MapEditor, canvas: HTMLCanvasElement) {
		this.editor = editor;
		this.canvas = canvas;
	}

	public resetCursor(): void {
		this.canvas.style.cursor = "default";
	}

	public handleMousedown = (e: MouseEvent): boolean => {
		if (this.editor.currentTool !== EditorTool.Nation) {
			this.canvas.style.cursor = "default";
			return false;
		}

		const rect = this.canvas.getBoundingClientRect();
		const canvasX = e.clientX - rect.left;
		const canvasY = e.clientY - rect.top;

		const hitNation = this.editor.renderer?.hitTestNation(
			canvasX,
			canvasY,
			this.editor.mapState.nations,
		);

		if (hitNation) {
			this.editor.isDraggingNation = true;
			this.editor.draggedNation = hitNation;
			this.editor.dragStartPos = { x: canvasX, y: canvasY };
			this.canvas.style.cursor = "grabbing";
			this.editor.requestUpdate();
			return true;
		}

		return false;
	};

	public handleMousemove = (e: MouseEvent): boolean => {
		if (this.editor.currentTool !== EditorTool.Nation) {
			this.canvas.style.cursor = "default";
			return false;
		}

		const rect = this.canvas.getBoundingClientRect();
		const canvasX = e.clientX - rect.left;
		const canvasY = e.clientY - rect.top;

		if (this.editor.isDraggingNation && this.editor.draggedNation) {
			this.canvas.style.cursor = "move";

			const worldPos = this.editor.renderer?.canvasToMapCoordinates(
				canvasX,
				canvasY,
			);
			if (!worldPos) return false;

			this.editor.draggedNation.coordinates = [worldPos.x, worldPos.y];

			this.editor.mapState = { ...this.editor.mapState };
			this.editor.requestUpdate();

			this.editor.renderer?.render(this.editor.mapState);

			return true;
		}

		const hitNation = this.editor.renderer?.hitTestNation(
			canvasX,
			canvasY,
			this.editor.mapState.nations,
		);

		if (hitNation) {
			this.canvas.style.cursor = "pointer";
		} else {
			this.canvas.style.cursor = "default";
		}

		return false;
	};

	public handleMouseup = (e: MouseEvent): boolean => {
		if (!this.editor.isDraggingNation) return false;

		this.editor.isDraggingNation = false;
		this.editor.draggedNation = null;
		this.editor.dragStartPos = null;

		const rect = this.canvas.getBoundingClientRect();
		const canvasX = e.clientX - rect.left;
		const canvasY = e.clientY - rect.top;

		const hitNation = this.editor.renderer?.hitTestNation(
			canvasX,
			canvasY,
			this.editor.mapState.nations,
		);

		this.canvas.style.cursor = hitNation ? "pointer" : "default";
		this.editor.requestUpdate();

		return true;
	};
}
