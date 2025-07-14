export const DEBUG_RENDER_MODE = false

export interface DebugInfo {
  chunkPosition: { x: number; y: number }
  worldCoords: { x: number; y: number }
  textureCoords: { u: number; v: number }
  sampledValue: number
  heightValue: number
  terrainInfo: {
    isLand: boolean
    magnitude: number
    terrainType: string
  }
  shaderUniforms: Record<string, any>
}
