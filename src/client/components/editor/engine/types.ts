export interface TerrainColors {
  oceanColor1: { r: number; g: number; b: number }
  oceanColor2: { r: number; g: number; b: number }
  plainsColor1: { r: number; g: number; b: number }
  plainsColor2: { r: number; g: number; b: number }
  highlandColor1: { r: number; g: number; b: number }
  highlandColor2: { r: number; g: number; b: number }
  mountainColor1: { r: number; g: number; b: number }
  mountainColor2: { r: number; g: number; b: number }
  shoreColor: { r: number; g: number; b: number }
}

export interface EditorEngineOptions {
  preserveDrawingBuffer?: boolean
  terrainColors?: TerrainColors
}

export enum RenderMode {
  Terrain = 0,
  Heightmap = 1,
  Game = 2,
  Grayscale = 3,
  Debug = 4,
}

export enum BrushType {
  Paint = 0,
  Erase = 1,
  Smooth = 2,
  Raise = 3,
  Lower = 4,
}

export interface BrushPatch {
  worldX: number
  worldY: number
  radius: number
  brushType: BrushType
  brushValue: number
  magnitude: number
  timestamp: number
}
