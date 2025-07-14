export interface HeightmapThresholds {
  oceanThreshold: number
  plainsThreshold: number
  highlandThreshold: number
  mountainThreshold: number
}

export const DEFAULT_HEIGHTMAP_THRESHOLDS: HeightmapThresholds = {
  oceanThreshold: 0.2,
  plainsThreshold: 0.45,
  highlandThreshold: 0.7,
  mountainThreshold: 1.0,
}

export function heightmapToTerrain(
  heightmapData: Float32Array,
  thresholds: HeightmapThresholds,
): { terrainData: Uint8Array; landTiles: number } {
  const terrainData = new Uint8Array(heightmapData.length)
  let landTiles = 0

  for (let i = 0; i < heightmapData.length; i++) {
    const height = heightmapData[i]
    let terrainByte = 0

    if (height <= thresholds.oceanThreshold) {
      const magnitude = Math.floor((height / thresholds.oceanThreshold) * 30) + 1
      terrainByte = (1 << 5) | Math.min(magnitude, 30)
    } else if (height <= thresholds.plainsThreshold) {
      const normalized = (height - thresholds.oceanThreshold) / (thresholds.plainsThreshold - thresholds.oceanThreshold)
      const magnitude = Math.floor(normalized * 9) + 1
      terrainByte = (1 << 7) | Math.min(magnitude, 9)
      landTiles++
    } else if (height <= thresholds.highlandThreshold) {
      const normalized =
        (height - thresholds.plainsThreshold) / (thresholds.highlandThreshold - thresholds.plainsThreshold)
      const magnitude = Math.floor(normalized * 10) + 10
      terrainByte = (1 << 7) | Math.min(magnitude, 19)
      landTiles++
    } else {
      const normalized =
        (height - thresholds.highlandThreshold) / (thresholds.mountainThreshold - thresholds.highlandThreshold)
      const magnitude = Math.floor(normalized * 11) + 20
      terrainByte = (1 << 7) | Math.min(magnitude, 30)
      landTiles++
    }

    terrainData[i] = terrainByte
  }

  return { terrainData, landTiles }
}

export function terrainToHeightmap(terrainData: Uint8Array, thresholds: HeightmapThresholds): Float32Array {
  const heightmapData = new Float32Array(terrainData.length)

  for (let i = 0; i < terrainData.length; i++) {
    const terrainByte = terrainData[i]
    const magnitude = terrainByte & 0x1f
    const isLand = !!(terrainByte & (1 << 7))
    const isOcean = !!(terrainByte & (1 << 5))

    if (isOcean && !isLand) {
      const normalized = (magnitude - 1) / 30
      heightmapData[i] = normalized * thresholds.oceanThreshold
    } else if (isLand) {
      if (magnitude < 10) {
        const normalized = (magnitude - 1) / 9
        heightmapData[i] =
          thresholds.oceanThreshold + normalized * (thresholds.plainsThreshold - thresholds.oceanThreshold)
      } else if (magnitude < 20) {
        const normalized = (magnitude - 10) / 10
        heightmapData[i] =
          thresholds.plainsThreshold + normalized * (thresholds.highlandThreshold - thresholds.plainsThreshold)
      } else {
        const normalized = (magnitude - 20) / 11
        heightmapData[i] =
          thresholds.highlandThreshold + normalized * (thresholds.mountainThreshold - thresholds.highlandThreshold)
      }
    } else {
      heightmapData[i] = 0
    }
  }

  return heightmapData
}

export function imageToHeightmap(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData
  const heightmapData = new Float32Array(width * height)

  for (let i = 0; i < width * height; i++) {
    const pixelIndex = i * 4
    const gray = data[pixelIndex] / 255
    heightmapData[i] = gray
  }

  return heightmapData
}
