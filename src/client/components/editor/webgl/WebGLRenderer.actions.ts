import type { MapEditorState } from "../types/MapEditorTypes";
import { WebGLRenderer } from "./WebGLRenderer";

export function initializeWebGL(
	canvas: HTMLCanvasElement,
	onError: (message: string) => void,
): WebGLRenderer | null {
	if (!canvas) {
		console.error("Canvas not found during WebGL initialization");
		return null;
	}

	try {
		const renderer = new WebGLRenderer(canvas);
		renderer.initialize();
		renderer.resize();
		return renderer;
	} catch (error) {
		console.error("Failed to initialize WebGL renderer:", error);
		onError(
			"WebGL not supported or failed to initialize. Please use a modern browser.",
		);
		return null;
	}
}
let currentAnimationId: number | null = null;
let isRunning = false;

export function startRenderLoop(
	renderer: WebGLRenderer,
	getCurrentMapState: () => MapEditorState,
	onRender: () => void,
): void {
	if (isRunning) return;

	isRunning = true;
	const render = () => {
		if (!isRunning) return;
		renderer.render(getCurrentMapState());
		onRender();
		currentAnimationId = requestAnimationFrame(render);
	};

	currentAnimationId = requestAnimationFrame(render);
}

export function stopRenderLoop(): void {
	isRunning = false;
	if (currentAnimationId) {
		cancelAnimationFrame(currentAnimationId);
		currentAnimationId = null;
	}
}

export function resizeCanvas(
	canvas: HTMLCanvasElement,
	renderer: WebGLRenderer | null,
): boolean {
	if (!renderer) return false;

	const rect = canvas.getBoundingClientRect();
	const displayWidth = rect.width;
	const displayHeight = rect.height;

	const needsResize =
		canvas.width !== displayWidth || canvas.height !== displayHeight;
	if (!needsResize) return false;

	canvas.width = displayWidth;
	canvas.height = displayHeight;
	renderer.resize();

	return true;
}

export function toggleRenderMode(
	currentMode: number,
	renderer: WebGLRenderer | null,
	onModeChange: (mode: number) => void,
): void {
	const newMode = currentMode === 0 ? 1 : 0;
	onModeChange(newMode);
	renderer?.setRenderMode(newMode);
}
