import { type WebGLResource, type BufferAttribute, WebGLError } from "./WebGLCore";

export interface BufferLayout {
	attributes: BufferAttribute[];
	stride: number;
}

export class VertexBuffer implements WebGLResource {
	private gl: WebGLRenderingContext;
	private buffer: WebGLBuffer;
	private usage: number;

	constructor(
		gl: WebGLRenderingContext,
		data?: ArrayBufferView,
		usage?: number,
	) {
		this.gl = gl;
		this.usage = usage || gl.STATIC_DRAW;

		const buffer = gl.createBuffer();
		if (!buffer) throw new WebGLError("Failed to create buffer");
		this.buffer = buffer;

		if (data) {
			this.setData(data);
		}
	}

	public static createQuad(gl: WebGLRenderingContext): VertexBuffer {
		const vertices = new Float32Array([
			-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1,
		]);
		return new VertexBuffer(gl, vertices);
	}

	public static createChunkQuad(
		gl: WebGLRenderingContext,
		worldX: number,
		worldY: number,
		chunkSize: number,
	): VertexBuffer {
		const vertices = new Float32Array([
			worldX,
			worldY,
			0,
			0,
			worldX + chunkSize,
			worldY,
			1,
			0,
			worldX,
			worldY + chunkSize,
			0,
			1,
			worldX + chunkSize,
			worldY + chunkSize,
			1,
			1,
		]);
		return new VertexBuffer(gl, vertices, gl.DYNAMIC_DRAW as number);
	}

	public bind(): void {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
	}

	public unbind(): void {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
	}

	public setData(data: ArrayBufferView): void {
		this.bind();
		this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.usage);
	}

	public updateData(data: ArrayBufferView, offset = 0): void {
		this.bind();
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset, data);
	}

	get webGLBuffer(): WebGLBuffer {
		return this.buffer;
	}

	public dispose(): void {
		this.gl.deleteBuffer(this.buffer);
	}
}

export class BufferManager {
	private gl: WebGLRenderingContext;
	private commonBuffers: Map<string, VertexBuffer> = new Map();

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl;
		this.initializeCommonBuffers();
	}

	private initializeCommonBuffers(): void {
		this.commonBuffers.set("quad", VertexBuffer.createQuad(this.gl));
	}

	public createBuffer(data?: ArrayBufferView, usage?: number): VertexBuffer {
		return new VertexBuffer(this.gl, data, usage);
	}

	public getCommonBuffer(name: string): VertexBuffer | null {
		return this.commonBuffers.get(name) || null;
	}

	public bindVertexArray(buffer: VertexBuffer, layout: BufferLayout): void {
		buffer.bind();

		const maxAttribs = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
		for (let i = 0; i < maxAttribs; i++) {
			this.gl.disableVertexAttribArray(i);
		}

		for (const attr of layout.attributes) {
			if (attr.location !== -1) {
				this.gl.enableVertexAttribArray(attr.location);
				this.gl.vertexAttribPointer(
					attr.location,
					attr.size,
					attr.type,
					attr.normalized,
					attr.stride,
					attr.offset,
				);
			}
		}
	}

	public setupAttributePointers(
		attributes: Record<string, BufferAttribute>,
	): void {
		for (const [_name, attr] of Object.entries(attributes)) {
			if (attr.location !== -1) {
				this.gl.enableVertexAttribArray(attr.location);
				this.gl.vertexAttribPointer(
					attr.location,
					attr.size,
					attr.type,
					attr.normalized,
					attr.stride,
					attr.offset,
				);
			}
		}
	}

	public drawBuffer(
		buffer: VertexBuffer,
		layout: BufferLayout,
		mode?: number,
		count = 4,
	): void {
		this.bindVertexArray(buffer, layout);
		this.gl.drawArrays(mode || this.gl.TRIANGLE_STRIP, 0, count);
	}

	public drawQuad(buffer?: VertexBuffer): void {
		const quadBuffer = buffer || this.getCommonBuffer("quad");
		if (!quadBuffer) {
			throw new WebGLError("No quad buffer available");
		}

		const layout: BufferLayout = {
			attributes: [
				{
					location: 0,
					size: 2,
					type: this.gl.FLOAT,
					normalized: false,
					stride: 16,
					offset: 0,
				},
				{
					location: 1,
					size: 2,
					type: this.gl.FLOAT,
					normalized: false,
					stride: 16,
					offset: 8,
				},
			],
			stride: 16,
		};

		this.drawBuffer(quadBuffer, layout);
	}

	public createDynamicBuffer(): VertexBuffer {
		return new VertexBuffer(this.gl, undefined, this.gl.DYNAMIC_DRAW as number);
	}

	public createChunkVertices(
		worldX: number,
		worldY: number,
		chunkSize: number,
	): Float32Array {
		return new Float32Array([
			worldX,
			worldY,
			0,
			0,
			worldX + chunkSize,
			worldY,
			1,
			0,
			worldX,
			worldY + chunkSize,
			0,
			1,
			worldX + chunkSize,
			worldY + chunkSize,
			1,
			1,
		]);
	}

	public createBrushVertices(
		localX: number,
		localY: number,
		radius: number,
		brushValue: number,
	): Float32Array {
		const size = radius * 2;
		return new Float32Array([
			localX - size,
			localY - size,
			localX,
			localY,
			radius,
			brushValue,
			localX + size,
			localY - size,
			localX,
			localY,
			radius,
			brushValue,
			localX - size,
			localY + size,
			localX,
			localY,
			radius,
			brushValue,
			localX + size,
			localY + size,
			localX,
			localY,
			radius,
			brushValue,
		]);
	}

	public dispose(): void {
		for (const buffer of this.commonBuffers.values()) {
			buffer.dispose();
		}
		this.commonBuffers.clear();
	}
}
