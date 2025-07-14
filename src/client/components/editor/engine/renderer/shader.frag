/*
  This file is part of OpenFrontIO.
  
  Copyright (C) 2020-2025 OpenFrontIO contributors.
  
  - 2025 Sebastian Glaser <anx@hktr.de>
  
  OpenFrontIO is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
*/

uniform float u_brushMagnitude;
uniform float u_brushRadius;
uniform float u_brushValue;
uniform float u_clampMax;
uniform float u_clampMin;
uniform float u_textureSize;
uniform float u_time;
uniform int u_brushType;
uniform int u_nationCount;
uniform int u_renderMode;
uniform int u_strokeCount;
uniform sampler2D u_heightmapTexture;
uniform vec2 u_brushCenter;
uniform vec2 u_mapSize;
uniform vec2 u_nationPositions[64];
uniform vec2 u_strokeCenters[256];
uniform vec3 u_highlandColor1;
uniform vec3 u_highlandColor2;
uniform vec3 u_mountainColor1;
uniform vec3 u_mountainColor2;
uniform vec3 u_oceanColor1;
uniform vec3 u_oceanColor2;
uniform vec3 u_plainsColor1;
uniform vec3 u_plainsColor2;
uniform vec3 u_shoreColor;
uniform vec4 u_terrainThresholds;
varying vec2 v_texCoord;
varying vec2 v_worldCoord;
varying vec2 v_pixelatedWorldCoord;
varying vec2 v_pixelatedTexCoord;

bool isBeach = false;
bool isCoast = false;
bool isCoastalBorder = false;
bool isShore = false;
bool isWater;
const float COAST_SAMPLE_OFFSET = 5.0;
float brushDist;
float distanceToCoast = 9999.0;
float distanceToWater = 9999.0;
float globalTime;
float landThreshold;
float magnitude;
float maxDistanceToLand;
float maxDistanceToWater;
float thisPixelNoise;
float value;
vec2 closestLandPixel;
vec2 closestWaterPixel;
vec2 coastalNormal;
vec2 costalVector;
vec2 offsets[8];
vec2 pixelatedBrushCenter;
vec2 thisPixelTexCoord;
vec2 thisPixelWorldCoord;
vec3 color;

vec3 red_color = vec3(1.0, 0.2, 0.2);
vec3 green_color = vec3(0.2, 1.0, 0.2);
vec3 blue_color = vec3(0.1, 0.2, 0.9);
vec3 foam_color = vec3(1.0, 1.0, 1.0);
vec3 beach_color = vec3(1.0, 0.85, 0.3);
vec3 brown_color = vec3(0.8, 0.75, 0.7);
vec3 deep_water_color = vec3(0.1, 0.2, 1.0);
vec3 shallow_water_color = vec3(0.4, 0.6, 1.0);

float PI = 3.14159265358979323846;

bool isBeachPixel();
bool isShorePixel();
bool isWithinBounds(vec2 coord);
bool isWithinMapBounds(vec2 coord, float textureSize);
float hash(vec2 p);
float lerp(float a, float b, float t);
float nestedNoise(vec2 p, float s);
float perlin(vec2 p);
float pixelatedNoise();
float quadlerp(float t);
float squaredlerp(float t);
float ss(float t);
vec2 getCoastlineNormal(vec2 pos);
vec2 pixelate(vec2 coord);
vec3 getTerrainColor();
vec3 lerpcolor(vec3 a, vec3 b, float t);
void accumulate_brush_effects();
void apply_blur();
void apply_brushes();
void apply_erase();
void apply_lower();
void apply_paint();
void apply_raise();
void debug_chunk();
void draw_cursor_glow();
void draw_nations();
void init_globals();
void init_offsets();
void satellite_mode();
void update_terrain_flags();
void land();
void waves();

/*
 ███╗   ███╗ █████╗ ██╗███╗   ██╗
 ████╗ ████║██╔══██╗██║████╗  ██║
 ██╔████╔██║███████║██║██╔██╗ ██║
 ██║╚██╔╝██║██╔══██║██║██║╚██╗██║
 ██║ ╚═╝ ██║██║  ██║██║██║ ╚████║
 ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
*/

void main() {
  init_offsets();
  init_globals();
  if(!isWithinBounds(v_pixelatedWorldCoord))
    discard;
  if(!isWithinMapBounds(v_pixelatedTexCoord, u_textureSize))
    discard;
  accumulate_brush_effects();
  if(u_renderMode < 2 || magnitude > 0.0)
    apply_brushes();
  update_terrain_flags();
  if(u_renderMode == 2 || u_renderMode == 3)
    gl_FragColor = vec4(value, value, value, 1.0);
  if(u_renderMode == 4)
    debug_chunk();
  if(u_renderMode > 1)
    return;
  color = getTerrainColor();
  if(u_renderMode == 1)
    satellite_mode();
  draw_cursor_glow();
  draw_nations();
  gl_FragColor = vec4(color, 1.0);
}

/*
 ██╗███╗   ██╗██╗████████╗██╗ █████╗ ██╗     ██╗███████╗███████╗██████╗ ███████╗
 ██║████╗  ██║██║╚══██╔══╝██║██╔══██╗██║     ██║╚══███╔╝██╔════╝██╔══██╗██╔════╝
 ██║██╔██╗ ██║██║   ██║   ██║███████║██║     ██║  ███╔╝ █████╗  ██████╔╝███████╗
 ██║██║╚██╗██║██║   ██║   ██║██╔══██║██║     ██║ ███╔╝  ██╔══╝  ██╔══██╗╚════██║
 ██║██║ ╚████║██║   ██║   ██║██║  ██║███████╗██║███████╗███████╗██║  ██║███████║
 ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝
*/

void init_offsets() {
  offsets[0] = vec2(-1.0, -1.0);
  offsets[1] = vec2(0.0, -1.0);
  offsets[2] = vec2(1.0, -1.0);
  offsets[3] = vec2(-1.0, 0.0);
  offsets[4] = vec2(1.0, 0.0);
  offsets[5] = vec2(-1.0, 1.0);
  offsets[6] = vec2(0.0, 1.0);
  offsets[7] = vec2(1.0, 1.0);
}

void init_globals() {
  pixelatedBrushCenter = pixelate(u_brushCenter);
  value = texture2D(u_heightmapTexture, v_texCoord).r;
  magnitude = u_renderMode < 2 ? 32.0 / u_brushMagnitude : 0.0;
  landThreshold = u_terrainThresholds.x;
  brushDist = distance(v_pixelatedWorldCoord, pixelatedBrushCenter);
  globalTime = sin(u_time * PI * 2.0) * 0.5 + 0.5;
  thisPixelWorldCoord = pixelate(v_worldCoord);
  thisPixelTexCoord = pixelate(v_texCoord);
  thisPixelNoise = pixelatedNoise();
  closestLandPixel = thisPixelWorldCoord;
  closestWaterPixel = thisPixelWorldCoord;
}

bool isLand(vec2 coord) {
  return texture2D(u_heightmapTexture, coord / u_textureSize).r >= landThreshold;
}

void update_terrain_flags() {
  isWater = value < landThreshold;
  isShore = false;
  isBeach = false;
  isCoast = false;
  isCoastalBorder = false;

  if(!isWater) {
    isBeach = isBeachPixel();
    return;
  }

  if(u_renderMode != 1)
    return;

  maxDistanceToLand = 13.5;
  float radius = floor(5.5 + thisPixelNoise * 8.0);

  for(int a = 0; a < 8; a++) {
    float angle = float(a) * 6.2831853 / 8.0;
    vec2 coord = thisPixelWorldCoord + vec2(cos(angle), sin(angle)) * radius;
    if (!isLand(coord)) continue;
    closestLandPixel = coord;
    distanceToCoast = radius;
    if (radius == 1.0) break;
    radius = max(1.0, radius - 1.0);
    a = 0;
  }

  isShore = radius == 1.0;
  isCoast = distanceToCoast != 9999.0;

  coastalNormal = getCoastlineNormal(closestLandPixel);
  costalVector = normalize(thisPixelWorldCoord - closestLandPixel) * distanceToCoast;
}


/*
 ████████╗ ██████╗  ██████╗ ██╗     ███████╗
 ╚══██╔══╝██╔═══██╗██╔═══██╗██║     ██╔════╝
    ██║   ██║   ██║██║   ██║██║     ███████╗
    ██║   ██║   ██║██║   ██║██║     ╚════██║
    ██║   ╚██████╔╝╚██████╔╝███████╗███████║
    ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝╚══════╝
*/

bool isShorePixel() {
  for(int i = 0; i < 8; i++) {
    vec2 neighborPixelated = pixelate(v_pixelatedTexCoord + offsets[i]);
    float neighborValue = texture2D(u_heightmapTexture, neighborPixelated / u_textureSize).r;
    if(neighborValue >= landThreshold)
      return true;
  }
  return false;
}

bool isBeachPixel() {
  maxDistanceToWater = 4.0;
  float radius = 1.5 + round(thisPixelNoise * 2.5);
  for(int i = 0; i < 8; i++) {
    float angle = float(i) * 6.2831853 / 8.0;
    vec2 coord = vec2(cos(angle), sin(angle)) * radius;
    if(isLand(thisPixelWorldCoord + coord)) continue;
    closestLandPixel = thisPixelWorldCoord + coord;
    if(radius == 1.0) return true;
    radius = max(1.0, radius - 1.0);
    i = 0;
  }
  distanceToWater = distance(thisPixelWorldCoord, closestLandPixel);
  return closestLandPixel != thisPixelWorldCoord;
}

bool isWithinBounds(vec2 coord) {
  return coord.x >= 0.0 && coord.y >= 0.0 && coord.x < u_mapSize.x && coord.y < u_mapSize.y;
}

bool isWithinMapBounds(vec2 coord, float textureSize) {
  return coord.x >= 0.0 && coord.y >= 0.0 && coord.x < textureSize && coord.y < textureSize;
}

vec2 pixelate(vec2 coord) {
  return floor(coord);
}

vec3 getTerrainColor() {
  float plains = u_terrainThresholds.y;
  float highland = u_terrainThresholds.z;
  float mountain = u_terrainThresholds.w;
  float clamped = clamp(value, u_clampMin, u_clampMax);
  if(clamped < landThreshold)
    return mix(u_oceanColor1, u_oceanColor2, clamped / landThreshold);
  else if(clamped < highland)
    return mix(u_plainsColor1, u_plainsColor2, (clamped - landThreshold) / (plains - landThreshold));
  else if(clamped < mountain)
    return mix(u_highlandColor1, u_highlandColor2, (clamped - plains) / (highland - plains));
  else
    return mix(u_mountainColor1, u_mountainColor2, (clamped - highland) / (mountain - highland));
}

/*
 ███████╗ █████╗ ████████╗███████╗██╗     ██╗     ██╗████████╗███████╗
 ██╔════╝██╔══██╗╚══██╔══╝██╔════╝██║     ██║     ██║╚══██╔══╝██╔════╝
 ███████╗███████║   ██║   █████╗  ██║     ██║     ██║   ██║   █████╗
 ╚════██║██╔══██║   ██║   ██╔══╝  ██║     ██║     ██║   ██║   ██╔══╝
 ███████║██║  ██║   ██║   ███████╗███████╗███████╗██║   ██║   ███████╗
 ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝   ╚═╝   ╚══════╝
*/

void satellite_mode() {
  land();
  waves();
  
  
}

void land() {
  if(isWater)
    return;
  color = mix(getTerrainColor(), vec3(0.0, 0.0, 0.0), thisPixelNoise * 0.1);
}

void waves() {
  if(!isWater && !isBeach)
    return;

  float waterNoise = nestedNoise(thisPixelWorldCoord, 0.05);
  float noiseBreakup = nestedNoise(thisPixelWorldCoord, 0.1);
  color = mix(deep_water_color, shallow_water_color, waterNoise);

  if(!isBeach && !isCoast)
    return;

  float distance = min(distanceToCoast, maxDistanceToLand);
  float wavePattern = sin(distance * 0.8 - globalTime * 3.0);
  float secondaryWave = sin(distance * 1.2 - globalTime * 2.0) * 0.5;
  float combinedWave = wavePattern + secondaryWave;
  float breakupWave = sin(distance * 0.5 + globalTime * 1.5) * 0.3;
  combinedWave *= (0.7 + 0.3 * breakupWave + noiseBreakup * 0.2);
  float waveIntensity = 0.6 + 0.4 * combinedWave;
  float blendFactor = 0.7;
  if(distance > 2.0)
    blendFactor = 0.2 + 1.0 - smoothstep(2.0, 4.0, distance / maxDistanceToLand);

  if(isBeach)
    color = mix(beach_color, brown_color, pixelatedNoise() * .5);
  if(isShore)
    color = u_shoreColor;
  vec3 shoreWave = mix(blue_color, foam_color, waveIntensity * 0.5);
  color = mix(color, shoreWave, blendFactor * waterNoise);
}

float lerp(float a, float b, float t) {
  return a + (b - a) * t;
}

float squaredlerp(float t) {
  return t * t;
}

float quadlerp(float t) {
  return 1.0 - (1.0 - t) * (1.0 - t);
}

float ss(float t) {
  return lerp(quadlerp(t), squaredlerp(t), t);
}

vec3 lerpcolor(vec3 a, vec3 b, float t) {
  float abr = lerp(a.r, b.r, ss(t));
  float abg = lerp(a.g, b.g, ss(t));
  float abb = lerp(a.b, b.b, ss(t));
  return vec3(abr, abg, abb);
}

float pixelatedNoise() {
  return hash(thisPixelWorldCoord);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float movingNoise(vec2 p) {
  float x = perlin(p + globalTime - 0.5 * 2.0);
  float y = perlin(p - globalTime - 0.5 * 2.0);
  return perlin(p + vec2(x, y));
}

float nestedNoise(vec2 p, float s) {
  float x = movingNoise(p * s);
  float y = movingNoise(p * s + 100.0);
  return movingNoise(p * s + vec2(x, y));
}

float perlin(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for(int i = 0; i < 8; i++) {
    if(i >= octaves)
      break;
    value += amplitude * perlin(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

vec2 getCoastlineNormal(vec2 pos) {
  float eps = 2.0;
  float heightL = texture2D(u_heightmapTexture, (pos + vec2(-eps, 0.0)) / u_textureSize).r;
  float heightR = texture2D(u_heightmapTexture, (pos + vec2(eps, 0.0)) / u_textureSize).r;
  float heightD = texture2D(u_heightmapTexture, (pos + vec2(0.0, -eps)) / u_textureSize).r;
  float heightU = texture2D(u_heightmapTexture, (pos + vec2(0.0, eps)) / u_textureSize).r;
  vec2 gradient = vec2(heightR - heightL, heightU - heightD) / (2.0 * eps);
  return normalize(gradient + vec2(0.001));
}

/*
 ██████╗ ██████╗ ██╗   ██╗███████╗██╗  ██╗███████╗███████╗
 ██╔══██╗██╔══██╗██║   ██║██╔════╝██║  ██║██╔════╝██╔════╝
 ██████╔╝██████╔╝██║   ██║███████╗███████║█████╗  ███████╗
 ██╔══██╗██╔══██╗██║   ██║╚════██║██╔══██║██╔══╝  ╚════██║
 ██████╔╝██║  ██║╚██████╔╝███████║██║  ██║███████╗███████║
 ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝
*/

void draw_cursor_glow() {
  float glowRadius = u_brushRadius + 2.0;
  float dist = distance(pixelate(u_brushCenter), pixelate(v_pixelatedWorldCoord));
  if(dist >= glowRadius)
    return;

  float outerGlow = 0.0;
  if(dist > u_brushRadius)
    outerGlow = 1.0 - smoothstep(u_brushRadius, glowRadius, dist);
  if(dist < u_brushRadius)
    outerGlow = 32.0 / u_brushMagnitude;

  vec3 glowColor;
  if(u_brushType == 0)
    glowColor = vec3(1.0, 1.0, 1.0);
  else if(u_brushType == 1)
    glowColor = vec3(1.0, 0.2, 0.2);
  else if(u_brushType == 2)
    glowColor = vec3(0.2, 1.0, 0.2);
  else if(u_brushType == 3)
    glowColor = vec3(1.0, 1.0, 0.2);
  else if(u_brushType == 4)
    glowColor = vec3(1.0, 1.0, 0.2);
  else
    glowColor = vec3(1.0, 1.0, 1.0);
  color = mix(color, glowColor, outerGlow * 0.6);
}

void accumulate_brush_effects() {
  for(int i = 0; i < 256; i++) {
    if(i >= u_strokeCount)
      break;
    vec2 strokeCenter = pixelate(u_strokeCenters[i]);
    float brushDist = distance(v_pixelatedWorldCoord, strokeCenter);
    if(brushDist > u_brushRadius)
      continue;
    float a = 1.0 - smoothstep(0.0, u_brushRadius, brushDist);
    magnitude = min(1.0, magnitude + a);
    if(magnitude == 1.0)
      break;
  }
}

void apply_brushes() {
  if(brushDist >= u_brushRadius)
    return;
  if(u_brushType == 0)
    apply_paint();
  else if(u_brushType == 1)
    apply_erase();
  else if(u_brushType == 2)
    apply_blur();
  else if(u_brushType == 3)
    apply_raise();
  else if(u_brushType == 4)
    apply_lower();
}

void apply_paint() {
  value = mix(value, u_brushValue / 255.0, magnitude);
}

void apply_erase() {
  value = mix(value, 0.0, magnitude);
}

void apply_raise() {
  float raiseAmount = (u_brushMagnitude / 255.0) * magnitude;
  value = min(1.0, value + raiseAmount);
}

void apply_lower() {
  float lowerAmount = (u_brushMagnitude / 255.0) * magnitude;
  value = max(0.0, value - lowerAmount);
}

void apply_blur() {
  float blurRadius = u_brushRadius * 0.3;
  int kernelSize = int(min(blurRadius, 8.0));

  float smoothedValue = 0.0;
  float totalWeight = 0.0;

  for(int dx = -8; dx <= 8; dx++) {
    for(int dy = -8; dy <= 8; dy++) {
      if(dx < -kernelSize || dx > kernelSize || dy < -kernelSize || dy > kernelSize)
        continue;
      vec2 offsetPixels = vec2(float(dx), float(dy));
      vec2 samplePixelated = pixelate(v_pixelatedTexCoord + offsetPixels);
      vec2 sampleCoord = samplePixelated / u_textureSize;

      float d = length(offsetPixels);
      if(d > blurRadius)
        continue;

      float sigma = blurRadius / 3.0;
      float weight = exp(-(d * d) / (2.0 * sigma * sigma));

      if(sampleCoord.x >= 0.0 && sampleCoord.x <= 1.0 &&
        sampleCoord.y >= 0.0 && sampleCoord.y <= 1.0) {
        smoothedValue += texture2D(u_heightmapTexture, sampleCoord).r * weight;
        totalWeight += weight;
      }
    }
  }

  if(totalWeight == 0.0)
    return;
  smoothedValue /= totalWeight;
  value = mix(value, smoothedValue, magnitude);
}

/*
 ███╗   ██╗ █████╗ ████████╗██╗ ██████╗ ███╗   ██╗███████╗
 ████╗  ██║██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
 ██╔██╗ ██║███████║   ██║   ██║██║   ██║██╔██╗ ██║███████╗
 ██║╚██╗██║██╔══██║   ██║   ██║██║   ██║██║╚██╗██║╚════██║
 ██║ ╚████║██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║███████║
 ╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
*/

void draw_nations() {
  for(int i = 0; i < 64; i++) {
    if(i >= u_nationCount)
      break;

    vec2 nationPos = pixelate(u_nationPositions[i]);
    float distToNation = distance(pixelate(v_pixelatedWorldCoord), nationPos);
    float nationRadius = 15.0;

    if(distToNation > nationRadius)
      continue;
    color = mix(color, red_color, 0.3);
    if(nationRadius - distToNation < 3.0)
      color = mix(color, red_color, 0.7);
  }
}

/*
 ██████╗ ███████╗██████╗ ██╗   ██╗ ██████╗
 ██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝
 ██║  ██║█████╗  ██████╔╝██║   ██║██║  ███╗
 ██║  ██║██╔══╝  ██╔══██╗██║   ██║██║   ██║
 ██████╔╝███████╗██████╔╝╚██████╔╝╚██████╔╝
 ╚═════╝ ╚══════╝╚═════╝  ╚═════╝  ╚═════╝
*/

void debug_chunk() {
  float worldX_norm = v_worldCoord.x / u_mapSize.x;
  float worldY_norm = v_worldCoord.y / u_mapSize.y;
  float texCoord_x = v_texCoord.x;
  gl_FragColor = vec4(sin(u_time), sin(u_time), sin(u_time), texCoord_x);
}
