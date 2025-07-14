import type { GameMapType } from '../../../../core/game/Game'

export const DEFAULT_MAP_WIDTH = 512
export const DEFAULT_MAP_HEIGHT = 512
export const MIN_HEIGHTMAP_SIZE = 512
export const MAX_HEIGHTMAP_SIZE = 8192
export const HEIGHTMAP_SIZE_STEP = 512
export const DEFAULT_HEIGHTMAP_MAX_SIZE = 4096

export const DEFAULT_TERRAIN_THRESHOLDS = {
  ocean: 0.2,
  plains: 0.45,
  highland: 0.7,
  mountain: 1.0,
} as const

export const MIN_HEIGHTMAP_CLAMP = 0.0
export const MAX_HEIGHTMAP_CLAMP = 1.0
export const HEIGHTMAP_CLAMP_STEP = 0.01
export const HEIGHTMAP_PROCESS_DEBOUNCE_MS = 150

export const MIN_BRUSH_SIZE = 1
export const MAX_BRUSH_SIZE = 20
export const DEFAULT_BRUSH_SIZE = 5

export const PIXEL_RENDER_MODE = 0
export const SATELLITE_RENDER_MODE = 1

export const DEFAULT_ZOOM_LEVEL = 1.0
export const MIN_ZOOM_LEVEL = 0.1
export const MAX_ZOOM_LEVEL = 10.0

export const OCEAN_BIT = 1 << 5
export const LAND_BIT = 1 << 7
export const SHORE_BIT = 1 << 6
export const DEFAULT_OCEAN_MAGNITUDE = 15
export const DEFAULT_PLAINS_MAGNITUDE = 5

export const INITIAL_MAP_CENTER_RADIUS = 50
export const INITIAL_MAP_NAME = 'Untitled Map'

export const TRANSITION_DURATION_MS = 200
export const DEBOUNCE_DELAY_MS = 150
export const ANIMATION_FRAME_MS = 16

export const LEFT_MOUSE_BUTTON = 0
export const RIGHT_MOUSE_BUTTON = 2
export const MIDDLE_MOUSE_BUTTON = 1

export const MAX_MAP_NAME_LENGTH = 50
export const MIN_MAP_NAME_LENGTH = 1
export const SAVE_DATA_VERSION = '1.0'

export const MINIMAP_SCALE_FACTOR = 2
export const MINIMAP_LAND_REDUCTION = 4
export const MAP_NAME_MAPPING: Record<string, keyof typeof GameMapType> = {
  africa: 'Africa',
  asia: 'Asia',
  australia: 'Australia',
  baikal: 'Baikal',
  betweentwoseas: 'BetweenTwoSeas',
  blacksea: 'BlackSea',
  britannia: 'Britannia',
  deglaciatedantarctica: 'DeglaciatedAntarctica',
  eastasia: 'EastAsia',
  europe: 'Europe',
  europeclassic: 'EuropeClassic',
  falklandislands: 'FalklandIslands',
  faroeislands: 'FaroeIslands',
  gatewaytotheatlantic: 'GatewayToTheAtlantic',
  giantworldmap: 'GiantWorldMap',
  halkidiki: 'Halkidiki',
  iceland: 'Iceland',
  italia: 'Italia',
  mars: 'Mars',
  mena: 'Mena',
  northamerica: 'NorthAmerica',
  oceania: 'Oceania',
  pangaea: 'Pangaea',
  southamerica: 'SouthAmerica',
  straitofgibraltar: 'StraitOfGibraltar',
  world: 'World',
}

export const OCEAN_VALUE = (1 << 5) | 15
export const LAND_VALUE = (1 << 7) | 5
export const SHORELINE_BIT = 6
export const MAGNITUDE_MASK = 0x1f
