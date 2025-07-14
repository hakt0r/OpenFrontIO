import * as THREE from 'three'
import { BaseRenderer } from '.'
import { CHUNK_SIZE, createChunkGeometry } from './chunk'
import type { BrushType } from '../types'

interface RenderOpts {
  material: THREE.ShaderMaterial
  chunkX: number
  chunkY: number
  brushX: number
  brushY: number
  brushRadius: number
  brushType: BrushType
  brushValue: number
  brushMagnitude: number
  terrainTexture: THREE.DataTexture
  mapWidth: number
  mapHeight: number
}

export class OffscreenRenderer extends BaseRenderer {
  private renderTarget: THREE.WebGLRenderTarget
  private chunkMesh: THREE.Mesh | null = null
  private chunkGeometry: THREE.BufferGeometry
  private lastMaterialUuid: string | null = null
  private ttl = 0

  constructor() {
    const canvas = new OffscreenCanvas(CHUNK_SIZE, CHUNK_SIZE)
    super(canvas, {
      antialias: false,
      alpha: true,
      preserveDrawingBuffer: false
    })

    this.renderer.setPixelRatio(1)
    this.chunkGeometry = createChunkGeometry()
    this.renderTarget = this.createRenderTarget()
    this.setupCamera()
  }

  protected updateCamera(): void {
    this.camera.updateProjectionMatrix()
  }

  async render(opts: RenderOpts): Promise<Uint8Array> {
    this.ttl = Date.now() + 1000

    if (!opts.material) throw new Error('Material is required')

    if (this.lastMaterialUuid !== opts.material.uuid) {
      this.setMaterial(opts.material)
      this.lastMaterialUuid = opts.material.uuid
    }

    if (!this.material || !this.chunkMesh) throw new Error('Material or mesh not set')

    this.setupChunkRender(opts)
    this.updateUniforms(opts)

    const result = this.renderToBuffer()
    return result
  }

  static idle: OffscreenRenderer[] = []

  static async render(opts: RenderOpts): Promise<Uint8Array | null> {
    const instance = OffscreenRenderer.idle.pop() || new OffscreenRenderer()
    try {
      const result = await instance.render(opts)
      instance.ttl = Date.now() + 1000
      OffscreenRenderer.idle.push(instance)
      return result
    } catch (error) {
      instance.dispose()
      throw error
    }
  }

  static garbageCollect(): void {
    const now = Date.now()
    OffscreenRenderer.idle = OffscreenRenderer.idle.filter((renderer) => {
      if (renderer.ttl > now) return true
      renderer.dispose()
      return false
    })
  }

  private createRenderTarget(): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(CHUNK_SIZE, CHUNK_SIZE, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false
    })
  }

  private setupCamera(): void {
    this.camera.near = 0.1
    this.camera.far = 1000
    this.camera.position.set(0, 0, 1)
    this.camera.lookAt(0, 0, 0)
  }

  private setMaterial(material: THREE.ShaderMaterial): void {
    if (this.chunkMesh) this.scene.remove(this.chunkMesh)
    this.material?.dispose()
    this.material = this.cloneMaterial(material)
    this.chunkMesh = new THREE.Mesh(this.chunkGeometry, this.material)
    this.scene.add(this.chunkMesh)
  }

  private setupChunkRender(opts: RenderOpts): void {
    if (!this.chunkMesh) return
    const worldX = opts.chunkX * CHUNK_SIZE
    const worldY = opts.chunkY * CHUNK_SIZE
    this.chunkMesh.position.set(worldX + CHUNK_SIZE / 2, worldY + CHUNK_SIZE / 2, 0)
    this.chunkMesh.updateMatrixWorld(true)
    this.camera.left = worldX
    this.camera.right = worldX + CHUNK_SIZE
    this.camera.top = worldY + CHUNK_SIZE
    this.camera.bottom = worldY
    this.camera.updateProjectionMatrix()
  }

  private updateUniforms(opts: RenderOpts): void {
    if (!this.material) return

    Object.keys(opts.material.uniforms).forEach((key) => {
      if (this.material?.uniforms[key]) {
        const sourceValue = opts.material.uniforms[key].value
        if (sourceValue?.copy) this.material?.uniforms[key].value.copy(sourceValue)
        else this.material.uniforms[key].value = sourceValue
      }
    })

    this.material.uniforms.u_heightmapTexture.value = opts.terrainTexture
    this.material.uniforms.u_mapSize.value.set(opts.mapWidth, opts.mapHeight)

    opts.terrainTexture.needsUpdate = true

    this.material.uniforms.u_renderMode.value = 3
    this.material.uniforms.u_brushCenter.value.set(opts.brushX, opts.brushY)
    this.material.uniforms.u_brushRadius.value = opts.brushRadius
    this.material.uniforms.u_brushType.value = opts.brushType
    this.material.uniforms.u_brushValue.value = opts.brushValue
    this.material.uniforms.u_brushMagnitude.value = opts.brushMagnitude

    this.material.needsUpdate = true

    if (this.material.uniforms.u_textureSize)
      this.material.uniforms.u_textureSize.value = Math.max(opts.mapWidth, opts.mapHeight)

    if (this.material.uniforms.u_transform) this.material.uniforms.u_transform.value.identity()

    if (this.material.uniforms.u_resolution) this.material.uniforms.u_resolution.value.set(CHUNK_SIZE, CHUNK_SIZE)
  }

  private renderToBuffer(): Uint8Array {
    const buffer = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * 4)

    this.renderer.setRenderTarget(this.renderTarget)
    this.renderer.clear(true, true, false)
    this.renderer.render(this.scene, this.camera)
    this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, CHUNK_SIZE, CHUNK_SIZE, buffer)
    this.renderer.setRenderTarget(null)

    return buffer
  }

  private disposeChunkMesh(): void {
    if (!this.chunkMesh) return
    this.scene.remove(this.chunkMesh)
    this.chunkMesh = null
  }

  dispose(): void {
    this.renderTarget?.dispose()
    this.disposeChunkMesh()
    this.chunkGeometry?.dispose()
    super.dispose()
  }
}
