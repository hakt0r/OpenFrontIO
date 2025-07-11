import {
	type WebGLResource,
	type TextureOptions,
	WebGLError,
} from "./WebGLCore";

export class Texture2D implements WebGLResource {
	private gl: WebGLRenderingContext;
	private texture: WebGLTexture;
	private _width: number;
	private _height: number;

	constructor(gl: WebGLRenderingContext, options: TextureOptions = {}) {
		this.gl = gl;
		this._width = options.width || 1;
		this._height = options.height || 1;

		const texture = gl.createTexture();
		if (!texture) throw new WebGLError("Failed to create texture");
		this.texture = texture;

		this.bind();
		this.configure(options);
		if (options.data !== undefined) {
			this.setData(options.data, options.width || 1, options.height || 1);
		}
		this.unbind();
	}

	private configure(options: TextureOptions): void {
		const gl = this.gl;

		gl.texParameteri(
			gl.TEXTURE_2D,
			gl.TEXTURE_MIN_FILTER,
			options.minFilter || gl.NEAREST,
		);
		gl.texParameteri(
			gl.TEXTURE_2D,
			gl.TEXTURE_MAG_FILTER,
			options.magFilter || gl.NEAREST,
		);
		gl.texParameteri(
			gl.TEXTURE_2D,
			gl.TEXTURE_WRAP_S,
			options.wrapS || gl.CLAMP_TO_EDGE,
		);
		gl.texParameteri(
			gl.TEXTURE_2D,
			gl.TEXTURE_WRAP_T,
			options.wrapT || gl.CLAMP_TO_EDGE,
		);

		if (options.flipY !== undefined) {
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, options.flipY);
		}
	}

	public static createEmpty(
		gl: WebGLRenderingContext,
		width: number,
		height: number,
		options: Partial<TextureOptions> = {},
	): Texture2D {
		return new Texture2D(gl, {
			width,
			height,
			format: gl.RGBA,
			type: gl.UNSIGNED_BYTE,
			internalFormat: gl.RGBA,
			data: null,
			...options,
		});
	}

	public static createFromData(
		gl: WebGLRenderingContext,
		data: ArrayBufferView,
		width: number,
		height: number,
		options: Partial<TextureOptions> = {},
	): Texture2D {
		return new Texture2D(gl, {
			width,
			height,
			format: gl.RGBA,
			type: gl.UNSIGNED_BYTE,
			internalFormat: gl.RGBA,
			data,
			...options,
		});
	}

	public static createChunkTexture(
		gl: WebGLRenderingContext,
		chunkSize: number,
		fillValue?: { r: number; g: number; b: number; a: number },
	): Texture2D {
		let data: Uint8Array | null = null;

		if (fillValue) {
			data = new Uint8Array(chunkSize * chunkSize * 4);
			for (let i = 0; i < chunkSize * chunkSize; i++) {
				const idx = i * 4;
				data[idx] = fillValue.r;
				data[idx + 1] = fillValue.g;
				data[idx + 2] = fillValue.b;
				data[idx + 3] = fillValue.a;
			}
		}

		return new Texture2D(gl, {
			width: chunkSize,
			height: chunkSize,
			format: gl.RGBA,
			type: gl.UNSIGNED_BYTE,
			internalFormat: gl.RGBA,
			minFilter: gl.NEAREST,
			magFilter: gl.NEAREST,
			wrapS: gl.CLAMP_TO_EDGE,
			wrapT: gl.CLAMP_TO_EDGE,
			data,
		});
	}

	public bind(unit?: number): void {
		if (unit !== undefined) {
			this.gl.activeTexture(this.gl.TEXTURE0 + unit);
		}
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
	}

	public unbind(): void {
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	}

	public setData(
		data: ArrayBufferView | null,
		width?: number,
		height?: number,
	): void {
		if (width) this._width = width;
		if (height) this._height = height;

		this.bind();
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.RGBA,
			this._width,
			this._height,
			0,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			data,
		);
	}

	public updateSubData(
		data: ArrayBufferView,
		x: number,
		y: number,
		width: number,
		height: number,
	): void {
		this.bind();
		this.gl.texSubImage2D(
			this.gl.TEXTURE_2D,
			0,
			x,
			y,
			width,
			height,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			data,
		);
	}

	public resize(width: number, height: number): void {
		this._width = width;
		this._height = height;
		this.setData(null, width, height);
	}

	get webGLTexture(): WebGLTexture {
		return this.texture;
	}

	get width(): number {
		return this._width;
	}

	get height(): number {
		return this._height;
	}

	public dispose(): void {
		this.gl.deleteTexture(this.texture);
	}
}
