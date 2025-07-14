import * as THREE from 'three'
import type { TerrainColors, BrushType, RenderMode } from '../types'
import vertexShaderSource from './shader.vert'
import fragmentShaderSource from './shader.frag'

export interface BaseRendererOptions {
  preserveDrawingBuffer?: boolean
  antialias?: boolean
  alpha?: boolean
  terrainColors?: TerrainColors
}

export abstract class BaseRenderer {
  protected renderer: THREE.WebGLRenderer
  public scene: THREE.Scene
  public material: THREE.ShaderMaterial = null as unknown as THREE.ShaderMaterial
  protected camera: THREE.OrthographicCamera
  protected terrainColors: TerrainColors = null as unknown as TerrainColors
  protected isInitialized = false

  constructor(
    protected canvas: HTMLCanvasElement | OffscreenCanvas,
    options: BaseRendererOptions = {}
  ) {
    if (!canvas) throw new Error('Canvas is required for Renderer')
    this.terrainColors = options.terrainColors ?? (null as unknown as TerrainColors)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: (canvas.getContext('webgl2') as WebGLRenderingContext) ?? undefined,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? true,
      antialias: options.antialias ?? false,
      alpha: options.alpha ?? false
    })

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    this.camera.position.set(0, 0, 1)
    this.camera.lookAt(0, 0, 0)

    this.renderer.setPixelRatio(window.devicePixelRatio || 1)
  }

  protected createShaderMaterial(): THREE.ShaderMaterial {
    const defaultColors: TerrainColors = {
      oceanColor1: { r: 0.1, g: 0.3, b: 0.6 },
      oceanColor2: { r: 0.2, g: 0.4, b: 0.7 },
      plainsColor1: { r: 0.4, g: 0.6, b: 0.3 },
      plainsColor2: { r: 0.5, g: 0.7, b: 0.4 },
      highlandColor1: { r: 0.6, g: 0.5, b: 0.3 },
      highlandColor2: { r: 0.7, g: 0.6, b: 0.4 },
      mountainColor1: { r: 0.5, g: 0.5, b: 0.5 },
      mountainColor2: { r: 0.6, g: 0.6, b: 0.6 },
      shoreColor: { r: 0.8, g: 0.8, b: 0.6 }
    }

    const colors = this.terrainColors ?? defaultColors

    const uniforms = this.createUniforms(colors)

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertexShaderSource,
      fragmentShader: fragmentShaderSource,
      transparent: false
    })
  }

  protected createUniforms(colors: TerrainColors): Record<string, { value: any }> {
    const canvasWidth = 'width' in this.canvas ? this.canvas.width : 512
    const canvasHeight = 'height' in this.canvas ? this.canvas.height : 512

    return {
      u_heightmapTexture: { value: null },
      u_mapSize: { value: new THREE.Vector2(0, 0) },
      u_textureSize: { value: 0 },
      u_time: { value: 0 },
      u_renderMode: { value: 0 },
      u_brushCenter: { value: new THREE.Vector2(-1000, -1000) },
      u_brushRadius: { value: 5 },
      u_brushValue: { value: 0 },
      u_brushMagnitude: { value: 15 },
      u_brushType: { value: 0 },
      u_strokeCount: { value: 0 },
      u_strokeCenters: { value: new Float32Array(512) },
      u_transform: { value: new THREE.Matrix3() },
      u_resolution: { value: new THREE.Vector2(canvasWidth, canvasHeight) },
      u_terrainThresholds: { value: new THREE.Vector4(0.2, 0.45, 0.7, 1.0) },
      u_clampMin: { value: 0.0 },
      u_clampMax: { value: 1.0 },
      u_nationCount: { value: 0 },
      u_nationPositions: { value: new Float32Array(128) },
      u_plainsColor1: { value: new THREE.Vector3(colors.plainsColor1.r, colors.plainsColor1.g, colors.plainsColor1.b) },
      u_plainsColor2: { value: new THREE.Vector3(colors.plainsColor2.r, colors.plainsColor2.g, colors.plainsColor2.b) },
      u_highlandColor1: {
        value: new THREE.Vector3(colors.highlandColor1.r, colors.highlandColor1.g, colors.highlandColor1.b)
      },
      u_highlandColor2: {
        value: new THREE.Vector3(colors.highlandColor2.r, colors.highlandColor2.g, colors.highlandColor2.b)
      },
      u_mountainColor1: {
        value: new THREE.Vector3(colors.mountainColor1.r, colors.mountainColor1.g, colors.mountainColor1.b)
      },
      u_mountainColor2: {
        value: new THREE.Vector3(colors.mountainColor2.r, colors.mountainColor2.g, colors.mountainColor2.b)
      },
      u_oceanColor1: { value: new THREE.Vector3(colors.oceanColor1.r, colors.oceanColor1.g, colors.oceanColor1.b) },
      u_oceanColor2: { value: new THREE.Vector3(colors.oceanColor2.r, colors.oceanColor2.g, colors.oceanColor2.b) },
      u_shoreColor: { value: new THREE.Vector3(colors.shoreColor.r, colors.shoreColor.g, colors.shoreColor.b) }
    }
  }

  async initialize(): Promise<void> {
    this.material = this.createShaderMaterial()
    this.isInitialized = true
  }

  updateTerrainColors(colors: TerrainColors): void {
    if (!this.material) return

    this.terrainColors = colors

    this.material.uniforms.u_plainsColor1.value.set(colors.plainsColor1.r, colors.plainsColor1.g, colors.plainsColor1.b)
    this.material.uniforms.u_plainsColor2.value.set(colors.plainsColor2.r, colors.plainsColor2.g, colors.plainsColor2.b)
    this.material.uniforms.u_highlandColor1.value.set(
      colors.highlandColor1.r,
      colors.highlandColor1.g,
      colors.highlandColor1.b
    )
    this.material.uniforms.u_highlandColor2.value.set(
      colors.highlandColor2.r,
      colors.highlandColor2.g,
      colors.highlandColor2.b
    )
    this.material.uniforms.u_mountainColor1.value.set(
      colors.mountainColor1.r,
      colors.mountainColor1.g,
      colors.mountainColor1.b
    )
    this.material.uniforms.u_mountainColor2.value.set(
      colors.mountainColor2.r,
      colors.mountainColor2.g,
      colors.mountainColor2.b
    )
    this.material.uniforms.u_oceanColor1.value.set(colors.oceanColor1.r, colors.oceanColor1.g, colors.oceanColor1.b)
    this.material.uniforms.u_oceanColor2.value.set(colors.oceanColor2.r, colors.oceanColor2.g, colors.oceanColor2.b)
    this.material.uniforms.u_shoreColor.value.set(colors.shoreColor.r, colors.shoreColor.g, colors.shoreColor.b)
  }

  setBrushUniforms(
    brushCenter: { x: number; y: number },
    brushRadius: number,
    brushType: BrushType,
    brushValue: number,
    brushMagnitude: number
  ): void {
    if (!this.material) return

    this.material.uniforms.u_brushCenter.value.set(brushCenter.x, brushCenter.y)
    this.material.uniforms.u_brushRadius.value = brushRadius
    this.material.uniforms.u_brushType.value = brushType
    this.material.uniforms.u_brushValue.value = brushValue
    this.material.uniforms.u_brushMagnitude.value = brushMagnitude
  }

  setRenderMode(mode: RenderMode): void {
    if (!this.material) return
    this.material.uniforms.u_renderMode.value = mode
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height)
    if (this.material) {
      this.material.uniforms.u_resolution.value.set(width, height)
    }
    this.updateCamera()
  }

  protected abstract updateCamera(): void

  getMaterial(): THREE.ShaderMaterial | null {
    return this.material
  }

  protected cloneMaterial(material: THREE.ShaderMaterial): THREE.ShaderMaterial {
    const cloned = material.clone()

    Object.keys(material.uniforms).forEach((key) => {
      const originalValue = material.uniforms[key].value
      if (originalValue !== null && originalValue !== undefined) {
        if (originalValue.clone) {
          cloned.uniforms[key].value = originalValue.clone()
        } else if (originalValue instanceof Float32Array) {
          cloned.uniforms[key].value = new Float32Array(originalValue)
        } else if (Array.isArray(originalValue)) {
          cloned.uniforms[key].value = [...originalValue]
        } else {
          cloned.uniforms[key].value = originalValue
        }
      }
    })

    return cloned
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer
  }

  getScene(): THREE.Scene {
    return this.scene
  }

  getCamera(): THREE.OrthographicCamera {
    return this.camera
  }

  dispose(): void {
    this.material?.dispose()
    this.renderer.dispose()
    this.isInitialized = false
  }
}
