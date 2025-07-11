import terrainVert from "./shaders/terrain.vert";
import terrainFrag from "./shaders/terrain.frag";
import {
	ShaderProgram,
	type ShaderUniforms,
	type ShaderAttributes,
} from "./toolkit";

export class ShaderManager {
	private gl: WebGLRenderingContext;

	public terrainProgram: ShaderProgram | null = null;
	public overlayProgram: ShaderProgram | null = null;
	public brushProgram: ShaderProgram | null = null;
	public heightmapProgram: ShaderProgram | null = null;

	public terrainUniforms: ShaderUniforms = {};
	public overlayUniforms: ShaderUniforms = {};
	public brushUniforms: ShaderUniforms = {};
	public heightmapUniforms: ShaderUniforms = {};

	public terrainAttributes: ShaderAttributes = {};
	public overlayAttributes: ShaderAttributes = {};
	public brushAttributes: ShaderAttributes = {};
	public heightmapAttributes: ShaderAttributes = {};

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl;
	}

	public async initializeShaders(): Promise<void> {
		await Promise.all([
			this.createTerrainProgram(),
			this.createOverlayProgram(),
			this.createBrushProgram(),
			this.createHeightmapProgram(),
		]);
	}

	private async createTerrainProgram(): Promise<void> {
		this.terrainProgram = new ShaderProgram(this.gl, {
			vertex: terrainVert,
			fragment: terrainFrag,
		});

		this.terrainUniforms = this.terrainProgram.uniformLocations;
		this.terrainAttributes = this.terrainProgram.attributeLocations;
	}

	private async createOverlayProgram(): Promise<void> {
		const [vertexSource, fragmentSource] = await Promise.all([
			import("./shaders/overlay.vert").then((m) => m.default),
			import("./shaders/overlay.frag").then((m) => m.default),
		]);

		this.overlayProgram = new ShaderProgram(this.gl, {
			vertex: vertexSource,
			fragment: fragmentSource,
		});

		this.overlayUniforms = this.overlayProgram.uniformLocations;
		this.overlayAttributes = this.overlayProgram.attributeLocations;
	}

	private async createBrushProgram(): Promise<void> {
		const [vertexSource, fragmentSource] = await Promise.all([
			import("./shaders/brush.vert").then((m) => m.default),
			import("./shaders/brush.frag").then((m) => m.default),
		]);

		this.brushProgram = new ShaderProgram(this.gl, {
			vertex: vertexSource,
			fragment: fragmentSource,
		});

		this.brushUniforms = this.brushProgram.uniformLocations;
		this.brushAttributes = this.brushProgram.attributeLocations;
	}

	private async createHeightmapProgram(): Promise<void> {
		const [vertexSource, fragmentSource] = await Promise.all([
			import("./shaders/heightmap.vert").then((m) => m.default),
			import("./shaders/heightmap.frag").then((m) => m.default),
		]);

		this.heightmapProgram = new ShaderProgram(this.gl, {
			vertex: vertexSource,
			fragment: fragmentSource,
		});

		this.heightmapUniforms = this.heightmapProgram.uniformLocations;
		this.heightmapAttributes = this.heightmapProgram.attributeLocations;
	}

	public dispose(): void {
		this.terrainProgram?.dispose();
		this.overlayProgram?.dispose();
		this.brushProgram?.dispose();
		this.heightmapProgram?.dispose();
	}
}
