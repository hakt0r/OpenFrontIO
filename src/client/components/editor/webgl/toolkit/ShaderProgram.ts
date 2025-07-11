import {
	type WebGLResource,
	type ShaderSource,
	type UniformValue,
	WebGLError,
} from "./WebGLCore";

export interface ShaderUniforms {
	[name: string]: WebGLUniformLocation | null;
}

export interface ShaderAttributes {
	[name: string]: number;
}

export class ShaderProgram implements WebGLResource {
	private gl: WebGLRenderingContext;
	private program: WebGLProgram;
	private uniforms: ShaderUniforms = {};
	private attributes: ShaderAttributes = {};

	constructor(gl: WebGLRenderingContext, source: ShaderSource) {
		this.gl = gl;
		this.program = this.createProgram(source);
		this.cacheUniformsAndAttributes();
	}

	private createShader(type: number, source: string): WebGLShader {
		const shader = this.gl.createShader(type);
		if (!shader) throw new WebGLError("Failed to create shader");

		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			const info = this.gl.getShaderInfoLog(shader);
			this.gl.deleteShader(shader);
			throw new WebGLError(`Shader compilation error: ${info}`);
		}

		return shader;
	}

	private createProgram(source: ShaderSource): WebGLProgram {
		const vertexShader = this.createShader(
			this.gl.VERTEX_SHADER,
			source.vertex,
		);
		const fragmentShader = this.createShader(
			this.gl.FRAGMENT_SHADER,
			source.fragment,
		);

		const program = this.gl.createProgram();
		if (!program) throw new WebGLError("Failed to create shader program");

		this.gl.attachShader(program, vertexShader);
		this.gl.attachShader(program, fragmentShader);
		this.gl.linkProgram(program);

		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			const info = this.gl.getProgramInfoLog(program);
			this.gl.deleteProgram(program);
			throw new WebGLError(`Shader program linking error: ${info}`);
		}

		this.gl.deleteShader(vertexShader);
		this.gl.deleteShader(fragmentShader);

		return program;
	}

	private cacheUniformsAndAttributes(): void {
		const uniformCount = this.gl.getProgramParameter(
			this.program,
			this.gl.ACTIVE_UNIFORMS,
		);
		for (let i = 0; i < uniformCount; i++) {
			const uniformInfo = this.gl.getActiveUniform(this.program, i);
			if (uniformInfo) {
				const location = this.gl.getUniformLocation(
					this.program,
					uniformInfo.name,
				);
				this.uniforms[uniformInfo.name] = location;
			}
		}

		const attributeCount = this.gl.getProgramParameter(
			this.program,
			this.gl.ACTIVE_ATTRIBUTES,
		);
		for (let i = 0; i < attributeCount; i++) {
			const attributeInfo = this.gl.getActiveAttrib(this.program, i);
			if (attributeInfo) {
				const location = this.gl.getAttribLocation(
					this.program,
					attributeInfo.name,
				);
				this.attributes[attributeInfo.name] = location;
			}
		}
	}

	public static async fromSources(
		gl: WebGLRenderingContext,
		vertexSource: string,
		fragmentSource: string,
	): Promise<ShaderProgram> {
		return new ShaderProgram(gl, {
			vertex: vertexSource,
			fragment: fragmentSource,
		});
	}

	public static async fromImports(
		gl: WebGLRenderingContext,
		vertexImport: Promise<string>,
		fragmentImport: Promise<string>,
	): Promise<ShaderProgram> {
		const [vertex, fragment] = await Promise.all([
			vertexImport,
			fragmentImport,
		]);
		return new ShaderProgram(gl, { vertex, fragment });
	}

	public use(): void {
		this.gl.useProgram(this.program);
	}

	public setUniform(name: string, value: UniformValue): void {
		const location = this.uniforms[name];
		if (location === null || location === undefined) {
			console.warn(`Uniform '${name}' not found in shader program`);
			return;
		}

		switch (value.type) {
			case "1f":
				this.gl.uniform1f(location, value.value as number);
				break;
			case "1i":
				this.gl.uniform1i(location, value.value as number);
				break;
			case "2f": {
				const v2 = value.value as number[];
				this.gl.uniform2f(location, v2[0], v2[1]);
				break;
			}
			case "2i": {
				const v2i = value.value as number[];
				this.gl.uniform2i(location, v2i[0], v2i[1]);
				break;
			}
			case "3f": {
				const v3 = value.value as number[];
				this.gl.uniform3f(location, v3[0], v3[1], v3[2]);
				break;
			}
			case "3i": {
				const v3i = value.value as number[];
				this.gl.uniform3i(location, v3i[0], v3i[1], v3i[2]);
				break;
			}
			case "4f": {
				const v4 = value.value as number[];
				this.gl.uniform4f(location, v4[0], v4[1], v4[2], v4[3]);
				break;
			}
			case "4i": {
				const v4i = value.value as number[];
				this.gl.uniform4i(location, v4i[0], v4i[1], v4i[2], v4i[3]);
				break;
			}
			case "matrix3fv":
				this.gl.uniformMatrix3fv(location, false, value.value as Float32Array);
				break;
			case "matrix4fv":
				this.gl.uniformMatrix4fv(location, false, value.value as Float32Array);
				break;
			default:
				console.warn(`Unsupported uniform type: ${value.type}`);
		}
	}

	public setUniforms(uniforms: Record<string, UniformValue>): void {
		this.use();
		for (const [name, value] of Object.entries(uniforms)) {
			this.setUniform(name, value);
		}
	}

	public getUniformLocation(name: string): WebGLUniformLocation | null {
		return this.uniforms[name] || null;
	}

	public getAttributeLocation(name: string): number {
		const location = this.attributes[name];
		return location !== undefined ? location : -1;
	}

	public enableAttribute(name: string): void {
		const location = this.getAttributeLocation(name);
		if (location !== -1) {
			this.gl.enableVertexAttribArray(location);
		}
	}

	public disableAttribute(name: string): void {
		const location = this.getAttributeLocation(name);
		if (location !== -1) {
			this.gl.disableVertexAttribArray(location);
		}
	}

	public setAttributePointer(
		name: string,
		size: number,
		type: number,
		normalized: boolean,
		stride: number,
		offset: number,
	): void {
		const location = this.getAttributeLocation(name);
		if (location !== -1) {
			this.gl.vertexAttribPointer(
				location,
				size,
				type,
				normalized,
				stride,
				offset,
			);
		}
	}

	get webGLProgram(): WebGLProgram {
		return this.program;
	}

	get uniformLocations(): ShaderUniforms {
		return { ...this.uniforms };
	}

	get attributeLocations(): ShaderAttributes {
		return { ...this.attributes };
	}

	public dispose(): void {
		this.gl.deleteProgram(this.program);
	}
}
