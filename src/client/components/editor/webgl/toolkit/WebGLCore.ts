export interface WebGLResource {
	dispose(): void;
}

export interface TextureOptions {
	width?: number;
	height?: number;
	format?: number;
	type?: number;
	internalFormat?: number;
	minFilter?: number;
	magFilter?: number;
	wrapS?: number;
	wrapT?: number;
	data?: ArrayBufferView | null;
	flipY?: boolean;
}

export interface BufferAttribute {
	location: number;
	size: number;
	type: number;
	normalized: boolean;
	stride: number;
	offset: number;
}

export interface ShaderSource {
	vertex: string;
	fragment: string;
}

export interface UniformValue {
	type:
		| "1f"
		| "1i"
		| "2f"
		| "2i"
		| "3f"
		| "3i"
		| "4f"
		| "4i"
		| "matrix3fv"
		| "matrix4fv";
	value: number | number[] | Float32Array;
}

export class WebGLError extends Error {
	constructor(
		message: string,
		public readonly context?: string,
	) {
		super(message);
		this.name = "WebGLError";
	}
}

export class WebGLContext {
	private gl: WebGLRenderingContext;

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl;
	}

	get context(): WebGLRenderingContext {
		return this.gl;
	}

	checkError(operation?: string): void {
		const error = this.gl.getError();
		if (error !== this.gl.NO_ERROR) {
			let errorName = "UNKNOWN_ERROR";
			switch (error) {
				case this.gl.INVALID_ENUM:
					errorName = "INVALID_ENUM";
					break;
				case this.gl.INVALID_VALUE:
					errorName = "INVALID_VALUE";
					break;
				case this.gl.INVALID_OPERATION:
					errorName = "INVALID_OPERATION";
					break;
				case this.gl.OUT_OF_MEMORY:
					errorName = "OUT_OF_MEMORY";
					break;
				case this.gl.CONTEXT_LOST_WEBGL:
					errorName = "CONTEXT_LOST_WEBGL";
					break;
			}
			const message = operation ? `${operation}: ${errorName}` : errorName;
			throw new WebGLError(message, operation);
		}
	}

	enableDebugMode(): void {
		const originalMethods = [
			"bindBuffer",
			"bindTexture",
			"bindFramebuffer",
			"useProgram",
			"drawArrays",
			"drawElements",
			"uniform1f",
			"uniform1i",
			"uniformMatrix3fv",
			"uniformMatrix4fv",
		];

		originalMethods.forEach((method) => {
			const original = (this.gl as any)[method];
			if (typeof original === "function") {
				(this.gl as any)[method] = (...args: any[]) => {
					const result = original.apply(this.gl, args);
					this.checkError(method);
					return result;
				};
			}
		});
	}
}

export function createWebGLContext(
	canvas: HTMLCanvasElement,
	options?: WebGLContextAttributes,
): WebGLContext {
	const gl = canvas.getContext("webgl", options);
	if (!gl) throw new WebGLError("WebGL not supported");
	return new WebGLContext(gl);
}
