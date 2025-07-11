export interface InputHandler {
	id: string;
	priority: number;
	handleWheel?: (e: WheelEvent) => boolean;
	handleKeydown?: (e: KeyboardEvent) => boolean;
	handleMousedown?: (e: MouseEvent) => boolean;
	handleMousemove?: (e: MouseEvent) => boolean;
	handleMouseup?: (e: MouseEvent) => boolean;
	handleContextmenu?: (e: MouseEvent) => boolean;
}

export class InputManager {
	private handlers: Map<string, InputHandler> = new Map();
	private element: HTMLElement | null = null;
	private isListening = false;

	constructor(element?: HTMLElement) {
		if (element) {
			this.setElement(element);
		}
	}

	public setElement(element: HTMLElement): void {
		if (this.isListening) {
			this.stopListening();
		}
		this.element = element;
		this.startListening();
	}

	public registerHandler(handler: InputHandler): void {
		this.handlers.set(handler.id, handler);
	}

	public unregisterHandler(id: string): void {
		this.handlers.delete(id);
	}

	public getHandler(id: string): InputHandler | undefined {
		return this.handlers.get(id);
	}

	public startListening(): void {
		if (!this.element || this.isListening) return;

		this.element.addEventListener("wheel", this.onWheel, { passive: false });
		this.element.addEventListener("keydown", this.onKeydown);
		this.element.addEventListener("mousedown", this.onMousedown);
		this.element.addEventListener("mousemove", this.onMousemove);
		this.element.addEventListener("mouseup", this.onMouseup);
		this.element.addEventListener("contextmenu", this.onContextmenu);

		this.isListening = true;
	}

	public stopListening(): void {
		if (!this.element || !this.isListening) return;

		this.element.removeEventListener("wheel", this.onWheel);
		this.element.removeEventListener("keydown", this.onKeydown);
		this.element.removeEventListener("mousedown", this.onMousedown);
		this.element.removeEventListener("mousemove", this.onMousemove);
		this.element.removeEventListener("mouseup", this.onMouseup);
		this.element.removeEventListener("contextmenu", this.onContextmenu);

		this.isListening = false;
	}

	public dispose(): void {
		this.stopListening();
		this.handlers.clear();
		this.element = null;
	}

	private getSortedHandlers(): InputHandler[] {
		return Array.from(this.handlers.values()).sort(
			(a, b) => b.priority - a.priority,
		);
	}

	private onWheel = (e: WheelEvent): void => {
		const handlers = this.getSortedHandlers();
		for (const handler of handlers) {
			if (handler.handleWheel) {
				const shouldStop = handler.handleWheel(e);
				if (shouldStop) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return;
				}
			}
		}
	};

	private onKeydown = (e: KeyboardEvent): void => {
		const handlers = this.getSortedHandlers();
		for (const handler of handlers) {
			if (handler.handleKeydown) {
				const shouldStop = handler.handleKeydown(e);
				if (shouldStop) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return;
				}
			}
		}
	};

	private onMousedown = (e: MouseEvent): void => {
		const handlers = this.getSortedHandlers();
		for (const handler of handlers) {
			if (handler.handleMousedown) {
				const shouldStop = handler.handleMousedown(e);
				if (shouldStop) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return;
				}
			}
		}
	};

	private onMousemove = (e: MouseEvent): void => {
		const handlers = this.getSortedHandlers();
		for (const handler of handlers) {
			if (handler.handleMousemove) {
				const shouldStop = handler.handleMousemove(e);
				if (shouldStop) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return;
				}
			}
		}
	};

	private onMouseup = (e: MouseEvent): void => {
		const handlers = this.getSortedHandlers();
		for (const handler of handlers) {
			if (handler.handleMouseup) {
				const shouldStop = handler.handleMouseup(e);
				if (shouldStop) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return;
				}
			}
		}
	};

	private onContextmenu = (e: MouseEvent): void => {
		const handlers = this.getSortedHandlers();
		for (const handler of handlers) {
			if (handler.handleContextmenu) {
				const shouldStop = handler.handleContextmenu(e);
				if (shouldStop) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return;
				}
			}
		}
	};
}
