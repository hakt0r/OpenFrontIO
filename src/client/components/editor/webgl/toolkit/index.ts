export * from "./WebGLCore";

export * from "./Texture2D";
export * from "./Framebuffer";
export * from "./ShaderProgram";
export * from "./BufferManager";
export * from "./ResourcePool";

export type {
	WebGLResource,
	TextureOptions,
	BufferAttribute,
	ShaderSource,
	UniformValue,
} from "./WebGLCore";

export type {
	ShaderUniforms,
	ShaderAttributes,
} from "./ShaderProgram";

export type { BufferLayout } from "./BufferManager";

export type {
	PooledResource,
	ResourceFactory,
	ResourceValidator,
} from "./ResourcePool";
