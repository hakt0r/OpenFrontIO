import { type WebGLResource, WebGLError } from "./WebGLCore";
import { Texture2D } from "./Texture2D";

export class Framebuffer implements WebGLResource {
	private gl: WebGLRenderingContext;
	private framebuffer: WebGLFramebuffer;
	private colorTexture: Texture2D | null = null;
	private depthTexture: Texture2D | null = null;
	private _width: number;
	private _height: number;

	constructor(gl: WebGLRenderingContext, width: number, height: number) {
		this.gl = gl;
		this._width = width;
		this._height = height;

		const framebuffer = gl.createFramebuffer();
		if (!framebuffer) throw new WebGLError("Failed to create framebuffer");
		this.framebuffer = framebuffer;
	}

	public static createWithColorTexture(
		gl: WebGLRenderingContext,
		width: number,
		height: number,
		colorTexture?: Texture2D,
	): Framebuffer {
		const fb = new Framebuffer(gl, width, height);

		if (colorTexture) {
			fb.attachColorTexture(colorTexture);
		} else {
			const texture = Texture2D.createEmpty(gl, width, height);
			fb.attachColorTexture(texture);
		}

		return fb;
	}

	public static createRenderTargetPair(
		gl: WebGLRenderingContext,
		width: number,
		height: number,
	): { read: Framebuffer; write: Framebuffer } {
		const readTexture = Texture2D.createEmpty(gl, width, height);
		const writeTexture = Texture2D.createEmpty(gl, width, height);

		const readFB = new Framebuffer(gl, width, height);
		const writeFB = new Framebuffer(gl, width, height);

		readFB.attachColorTexture(readTexture);
		writeFB.attachColorTexture(writeTexture);

		return { read: readFB, write: writeFB };
	}

	public attachColorTexture(texture: Texture2D): void {
		this.colorTexture = texture;
		this.bind();

		this.gl.framebufferTexture2D(
			this.gl.FRAMEBUFFER,
			this.gl.COLOR_ATTACHMENT0,
			this.gl.TEXTURE_2D,
			texture.webGLTexture,
			0,
		);

		this.checkComplete();
		this.unbind();
	}

	public attachDepthTexture(texture: Texture2D): void {
		this.depthTexture = texture;
		this.bind();

		this.gl.framebufferTexture2D(
			this.gl.FRAMEBUFFER,
			this.gl.DEPTH_ATTACHMENT,
			this.gl.TEXTURE_2D,
			texture.webGLTexture,
			0,
		);

		this.checkComplete();
		this.unbind();
	}

	private checkComplete(): void {
		const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
		if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
			let errorMessage = "Framebuffer not complete: ";
			switch (status) {
				case this.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
					errorMessage += "INCOMPLETE_ATTACHMENT";
					break;
				case this.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
					errorMessage += "INCOMPLETE_MISSING_ATTACHMENT";
					break;
				case this.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
					errorMessage += "INCOMPLETE_DIMENSIONS";
					break;
				case this.gl.FRAMEBUFFER_UNSUPPORTED:
					errorMessage += "UNSUPPORTED";
					break;
				default:
					errorMessage += `Unknown status: ${status}`;
			}
			throw new WebGLError(errorMessage);
		}
	}

	public bind(): void {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
	}

	public unbind(): void {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
	}

	public setViewport(): void {
		this.gl.viewport(0, 0, this._width, this._height);
	}

	public clear(r = 0, g = 0, b = 0, a = 1): void {
		this.bind();
		this.gl.clearColor(r, g, b, a);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}

	public readPixels(x = 0, y = 0, width?: number, height?: number): Uint8Array {
		const w = width || this._width;
		const h = height || this._height;
		const pixels = new Uint8Array(w * h * 4);

		this.bind();
		this.gl.readPixels(x, y, w, h, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
		this.unbind();

		return pixels;
	}

	public copyToTexture(targetTexture: Texture2D): void {
		if (!this.colorTexture)
			throw new WebGLError("No color texture attached to copy from");

		const pixels = this.readPixels();
		targetTexture.setData(pixels, this._width, this._height);
	}

	public resize(width: number, height: number): void {
		this._width = width;
		this._height = height;

		if (this.colorTexture) {
			this.colorTexture.resize(width, height);
		}
		if (this.depthTexture) {
			this.depthTexture.resize(width, height);
		}
	}

	get webGLFramebuffer(): WebGLFramebuffer {
		return this.framebuffer;
	}

	get colorAttachment(): Texture2D | null {
		return this.colorTexture;
	}

	get depthAttachment(): Texture2D | null {
		return this.depthTexture;
	}

	get width(): number {
		return this._width;
	}

	get height(): number {
		return this._height;
	}

	public dispose(): void {
		this.gl.deleteFramebuffer(this.framebuffer);
		this.colorTexture?.dispose();
		this.depthTexture?.dispose();
	}
}
