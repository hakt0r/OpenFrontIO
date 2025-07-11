import type { WebGLResource } from "./WebGLCore";

export interface PooledResource<T> {
	resource: T;
	inUse: boolean;
	lastUsed: number;
}

export type ResourceFactory<T> = () => T;
export type ResourceValidator<T> = (resource: T) => boolean;

export class ResourcePool<T extends WebGLResource> {
	private pool: PooledResource<T>[] = [];
	private factory: ResourceFactory<T>;
	private validator?: ResourceValidator<T>;
	private maxSize: number;
	private maxIdleTime: number;

	constructor(
		factory: ResourceFactory<T>,
		maxSize = 64,
		maxIdleTime = 30000,
		validator?: ResourceValidator<T>,
	) {
		this.factory = factory;
		this.maxSize = maxSize;
		this.maxIdleTime = maxIdleTime;
		this.validator = validator;
	}

	public acquire(): T {
		this.cleanupExpiredResources();

		for (const pooled of this.pool) {
			if (
				!pooled.inUse &&
				(!this.validator || this.validator(pooled.resource))
			) {
				pooled.inUse = true;
				pooled.lastUsed = Date.now();
				return pooled.resource;
			}
		}

		if (this.pool.length < this.maxSize) {
			const resource = this.factory();
			const pooled: PooledResource<T> = {
				resource,
				inUse: true,
				lastUsed: Date.now(),
			};
			this.pool.push(pooled);
			return resource;
		}

		console.warn("Resource pool exhausted, creating new resource outside pool");
		return this.factory();
	}

	public release(resource: T): void {
		const pooled = this.pool.find((p) => p.resource === resource);
		if (pooled) {
			pooled.inUse = false;
			pooled.lastUsed = Date.now();
		}
	}

	public preWarm(count: number): void {
		while (this.pool.length < Math.min(count, this.maxSize)) {
			const resource = this.factory();
			this.pool.push({
				resource,
				inUse: false,
				lastUsed: Date.now(),
			});
		}
	}

	private cleanupExpiredResources(): void {
		const now = Date.now();
		const expiredResources = this.pool.filter(
			(p) => !p.inUse && now - p.lastUsed > this.maxIdleTime,
		);

		for (const expired of expiredResources) {
			expired.resource.dispose();
			const index = this.pool.indexOf(expired);
			if (index !== -1) {
				this.pool.splice(index, 1);
			}
		}
	}

	public get activeCount(): number {
		return this.pool.filter((p) => p.inUse).length;
	}

	public get availableCount(): number {
		return this.pool.filter((p) => !p.inUse).length;
	}

	public get totalCount(): number {
		return this.pool.length;
	}

	public dispose(): void {
		for (const pooled of this.pool) {
			pooled.resource.dispose();
		}
		this.pool.length = 0;
	}
}

export class TexturePool extends ResourcePool<any> {
	constructor(
		gl: WebGLRenderingContext,
		textureFactory: () => any,
		maxSize = 64,
	) {
		super(textureFactory, maxSize, 30000, (texture) => {
			return gl.isTexture(texture.webGLTexture || texture);
		});
	}
}

export class FramebufferPool extends ResourcePool<any> {
	constructor(
		gl: WebGLRenderingContext,
		framebufferFactory: () => any,
		maxSize = 32,
	) {
		super(framebufferFactory, maxSize, 30000, (framebuffer) => {
			return gl.isFramebuffer(framebuffer.webGLFramebuffer || framebuffer);
		});
	}
}
