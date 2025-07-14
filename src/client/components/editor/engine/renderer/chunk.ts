import * as THREE from 'three'
import type { BaseRenderer } from '.'

export const CHUNK_SIZE = 64
export const MAX_ACTIVE_CHUNKS = 256

export interface ChunkCoordinates {
  chunkX: number
  chunkY: number
  localX: number
  localY: number
}

export class ChunkManager {
  public terrainTexture: THREE.DataTexture | null = null
  public chunks: Map<string, THREE.Mesh> = new Map()
  public mapWidth = 0
  public mapHeight = 0
  private baseMap: Uint8Array | null = null
  private heightmapImage: HTMLImageElement | null = null
  private heightmapTexture: Uint8Array | null = null
  private material: THREE.ShaderMaterial | null = null
  private rescaleAnimationFrame: number | null = null

  constructor(private renderer: BaseRenderer) {
    this.material = renderer.material
  }

  get mapDimensions() {
    return { width: this.mapWidth, height: this.mapHeight }
  }

  get dataSourceInfo() {
    return {
      hasBaseMap: this.baseMap !== null,
      hasHeightmapImage: this.heightmapImage !== null,
      hasHeightmapTexture: this.heightmapTexture !== null,
      sourceType: this.baseMap ? 'basemap' : this.heightmapImage ? 'image' : 'none'
    }
  }

  get originalHeightmapImage(): HTMLImageElement | null {
    return this.heightmapImage
  }

  clearHeightmapImage(): void {
    this.heightmapImage = null
  }

  setMaterial(material: THREE.ShaderMaterial): void {
    this.material = material
  }

  private resetAllData(): void {
    this.baseMap = null
    this.heightmapImage = null
    this.heightmapTexture = null
    this.cancelRescaleAnimation()
    this.dispose()
  }

  private cancelRescaleAnimation(): void {
    if (this.rescaleAnimationFrame !== null) {
      cancelAnimationFrame(this.rescaleAnimationFrame)
      this.rescaleAnimationFrame = null
    }
  }

  public rescaleHeightmapImage(maxSize = 4096): void {
    if (!this.heightmapImage) return

    this.cancelRescaleAnimation()

    this.rescaleAnimationFrame = requestAnimationFrame(() => {
      this.rescaleAnimationFrame = null
      const w = this.heightmapImage?.width || 1
      const h = this.heightmapImage?.height || 1
      const scale = Math.min(maxSize / w, maxSize / h, 1)
      this.mapWidth = Math.floor(w * scale)
      this.mapHeight = Math.floor(h * scale)
      this.deriveHeightmapFromImage()
      this.applyScalingAndChunk()
    })
  }

  loadFromBaseMap(terrainData: Uint8Array, width: number, height: number): void {
    this.resetAllData()
    this.baseMap = new Uint8Array(terrainData)
    this.mapWidth = width
    this.mapHeight = height
    this.deriveHeightmapFromBaseMap()
    this.applyScalingAndChunk()
  }

  loadHeightmapImage(image: HTMLImageElement, maxSize = 4096): { width: number; height: number } {
    this.resetAllData()
    this.heightmapImage = image

    const scale = Math.min(maxSize / image.width, maxSize / image.height, 1)
    this.mapWidth = Math.floor(image.width * scale)
    this.mapHeight = Math.floor(image.height * scale)

    this.deriveHeightmapFromImage()
    this.applyScalingAndChunk()
    return { width: this.mapWidth, height: this.mapHeight }
  }

  private deriveHeightmapFromBaseMap(): void {
    if (!this.baseMap) return

    this.heightmapTexture = new Uint8Array(this.mapWidth * this.mapHeight)

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const flippedY = this.mapHeight - 1 - y
        const srcIndex = y * this.mapWidth + x
        const destIndex = flippedY * this.mapWidth + x

        const terrainByte = this.baseMap[srcIndex]
        const isLand = !!(terrainByte & (1 << 7))
        const magnitude = terrainByte & 0x1f

        const heightValue = isLand ? 0.2 + (magnitude / 31) * 0.8 : (magnitude / 31) * 0.2
        this.heightmapTexture[destIndex] = Math.floor(heightValue * 255)
      }
    }
  }

  private deriveHeightmapFromImage(): void {
    if (!this.heightmapImage) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D context')

    canvas.width = this.mapWidth
    canvas.height = this.mapHeight

    ctx.clearRect(0, 0, this.mapWidth, this.mapHeight)
    ctx.drawImage(this.heightmapImage, 0, 0, this.mapWidth, this.mapHeight)

    const imageData = ctx.getImageData(0, 0, this.mapWidth, this.mapHeight)
    this.heightmapTexture = new Uint8Array(this.mapWidth * this.mapHeight)

    let minValue = 255
    let maxValue = 0

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const srcIndex = (y * this.mapWidth + x) * 4
        const pixelValue = imageData.data[srcIndex]
        minValue = Math.min(minValue, pixelValue)
        maxValue = Math.max(maxValue, pixelValue)
      }
    }

    const valueRange = maxValue - minValue
    const normalizeValue = valueRange > 0 ? valueRange : 1

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const srcIndex = (y * this.mapWidth + x) * 4
        const destIndex = y * this.mapWidth + x
        const pixelValue = imageData.data[srcIndex]
        const normalizedValue = (pixelValue - minValue) / normalizeValue
        this.heightmapTexture[destIndex] = Math.floor(normalizedValue * 255)
      }
    }
  }

  extractTerrainData(): Uint8Array | null {
    if (!this.terrainTexture) return null
    const data = this.terrainTexture.image.data as Uint8Array
    const terrainData = new Uint8Array(this.mapWidth * this.mapHeight)
    for (let i = 0; i < terrainData.length; i++) terrainData[i] = data[i]
    return terrainData
  }

  updateTerrainTexture(data: Uint8Array): void {
    if (!this.terrainTexture) return
    if (this.terrainTexture.image.data instanceof Uint8Array) this.terrainTexture.image.data.set(data)
    this.terrainTexture.needsUpdate = true
  }

  public applyScalingAndChunk(): void {
    if (!this.heightmapTexture || !this.material) return
    this.createTerrainTexture(this.heightmapTexture)
    this.createChunks()
  }

  private createTerrainTexture(data: Uint8Array): void {
    if (this.terrainTexture) this.terrainTexture.dispose()
    this.terrainTexture = new THREE.DataTexture(
      data,
      this.mapWidth,
      this.mapHeight,
      THREE.RedFormat,
      THREE.UnsignedByteType
    )
    this.terrainTexture.minFilter = THREE.NearestFilter
    this.terrainTexture.magFilter = THREE.NearestFilter
    this.terrainTexture.wrapS = THREE.ClampToEdgeWrapping
    this.terrainTexture.wrapT = THREE.ClampToEdgeWrapping
    this.terrainTexture.needsUpdate = true

    if (this.material) {
      this.material.uniforms.u_heightmapTexture.value = this.terrainTexture
      this.material.uniforms.u_mapSize.value.set(this.mapWidth, this.mapHeight)
      this.material.uniforms.u_textureSize.value = Math.max(this.mapWidth, this.mapHeight)
    }
  }

  private createChunks(): void {
    this.clearChunks()
    if (!this.material) throw new Error('No material available')

    const chunksX = Math.ceil(this.mapWidth / CHUNK_SIZE)
    const chunksY = Math.ceil(this.mapHeight / CHUNK_SIZE)

    for (let chunkY = 0; chunkY < chunksY; chunkY++)
      for (let chunkX = 0; chunkX < chunksX; chunkX++) {
        const chunkGeometry = createChunkGeometry()
        const worldX = chunkX * CHUNK_SIZE
        const worldY = chunkY * CHUNK_SIZE

        const chunkMesh = new THREE.Mesh(chunkGeometry, this.material)
        chunkMesh.frustumCulled = false
        chunkMesh.userData.chunkOffset = { x: worldX, y: worldY }
        chunkMesh.position.set(worldX + CHUNK_SIZE / 2, worldY + CHUNK_SIZE / 2, 0)

        this.renderer.scene.add(chunkMesh)
        this.chunks.set(`${chunkX}_${chunkY}`, chunkMesh)
      }
  }

  private clearChunks(): void {
    for (const chunk of this.chunks.values()) {
      this.renderer.scene.remove(chunk)
      chunk.geometry.dispose()
      if (chunk.material instanceof THREE.Material) chunk.material.dispose()
    }
    this.chunks.clear()
  }

  dispose(): void {
    this.clearChunks()
    this.terrainTexture?.dispose()
    this.terrainTexture = null
    this.baseMap = null
    this.heightmapImage = null
    this.heightmapTexture = null
    this.cancelRescaleAnimation()
  }
}

export function getAffectedChunks(centerX: number, centerY: number, radius: number): ChunkCoordinates[] {
  const chunks: ChunkCoordinates[] = []
  const minX = centerX - radius
  const maxX = centerX + radius
  const minY = centerY - radius
  const maxY = centerY + radius

  const startChunk = worldToChunk(minX, minY)
  const endChunk = worldToChunk(maxX, maxY)

  for (let chunkX = startChunk.chunkX; chunkX <= endChunk.chunkX; chunkX++)
    for (let chunkY = startChunk.chunkY; chunkY <= endChunk.chunkY; chunkY++)
      chunks.push({ chunkX, chunkY, localX: 0, localY: 0 })

  return chunks
}

export function worldToChunk(x: number, y: number): ChunkCoordinates {
  return {
    chunkX: Math.floor(x / CHUNK_SIZE),
    chunkY: Math.floor(y / CHUNK_SIZE),
    localX: x % CHUNK_SIZE,
    localY: y % CHUNK_SIZE
  }
}

export function createChunkGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const halfSize = CHUNK_SIZE / 2

  const vertices = new Float32Array([
    -halfSize,
    -halfSize,
    0,
    halfSize,
    -halfSize,
    0,
    halfSize,
    halfSize,
    0,
    -halfSize,
    halfSize,
    0
  ])

  const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])
  const indices = [0, 1, 2, 2, 3, 0]

  geometry.setIndex(indices)
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  return geometry
}
