precision mediump float;

uniform sampler2D u_terrainTexture;
uniform vec2 u_mapSize;
uniform float u_textureSize;
uniform float u_zoom;
uniform float u_time;
uniform int u_renderMode; 
varying vec2 v_texCoord;
uniform vec2 u_resolution;


uniform vec3 u_plainsColor1;
uniform vec3 u_plainsColor2;
uniform vec3 u_highlandColor1;
uniform vec3 u_highlandColor2;
uniform vec3 u_mountainColor1;
uniform vec3 u_mountainColor2;
uniform vec3 u_oceanColor1;
uniform vec3 u_oceanColor2;
uniform vec3 u_shoreColor;

bool isShorePixel(vec2 coord);
bool isWithinBounds(vec2 coord);
bool isWithinMapBounds(vec2 coord, float textureSize);
float generateWaveHeight(vec2 pixelCoord, vec2 shoreDirection, float shoreDist);
float getShoreDistance();
float getWaveIntensity(vec2 coord, vec2 shoreDirection, float shoreDist);
vec2 pixelate(vec2 coord);
vec2 texelate(vec2 coord);
float pixelatedNoise(vec2 coord);
vec3 applyWaveColorEffects(vec3 baseColor, vec2 pixelCoord, vec2 shoreDirection, float shoreDist, float intensity);
vec3 calculateWaveNormal(vec2 pixelCoord, vec2 shoreDirection, float shoreDist);
vec3 getTerrainColor(float terrainValue);
vec3 waves(vec3 baseColor, vec2 coord, vec4 terrainInfo);
vec4 calculateShoreField(vec2 coord, sampler2D terrainTexture);
vec4 getTerrainInfo(float terrainValue);
float hash(vec2 p);

void main() {
  float terrainValue = texture2D(u_terrainTexture, v_texCoord).r;
  vec4 terrainInfo = getTerrainInfo(terrainValue);
  vec3 color = getTerrainColor(terrainValue);
  color = waves(color, v_texCoord, terrainInfo);
  gl_FragColor = vec4(color, 1.0);
}

vec4 getTerrainInfo(float terrainValue) {
  
  float terrain = terrainValue * 255.0;
  float landBit = floor(terrain / 128.0);
  float shoreBit = floor(mod(terrain, 128.0) / 64.0);
  float oceanBit = floor(mod(terrain, 64.0) / 32.0);
  float magnitude = mod(terrain, 32.0);
  
  bool isLand = landBit >= 1.0;
  bool isShore = shoreBit >= 1.0;
  bool isOcean = oceanBit >= 1.0;
  
  if (isLand) {
    if (magnitude < 10.0) return vec4(0.0, 0.0, magnitude, 0.1); 
    if (magnitude < 20.0) return vec4(0.0, 1.0, magnitude, 0.3); 
    return vec4(0.0, 2.0, magnitude, 0.6);                       
  }
  
  vec2 pixelCoord = pixelate(v_texCoord);
  if (isShorePixel(pixelCoord)) {
    return vec4(1.0, 5.0, magnitude, 0.0);                       
  }
  
  if (isOcean) return vec4(1.0, 3.0, magnitude, -0.2);           
  return vec4(1.0, 4.0, magnitude, -0.1);                        
}

vec3 waves(vec3 baseColor, vec2 coord, vec4 terrainInfo) {
  vec2 pixelCoord = pixelate(v_texCoord);

  if (u_renderMode == 0 || terrainInfo.x <= 0.5) return baseColor;
  
  if (isShorePixel(pixelCoord)) {
    baseColor = mix(baseColor, vec3(0.4, 0.5, 0.6), 0.3);
  }
  
  vec4 shoreField = calculateShoreField(pixelCoord, u_terrainTexture);
  if (shoreField.w < 0.5) return baseColor;
  
  float shoreDist = shoreField.x;
  vec2 shoreDirection = vec2(shoreField.y, shoreField.z);
  float intensity = getWaveIntensity(pixelCoord, shoreDirection, shoreDist);
  
  if (intensity <= 0.0) return baseColor;

  vec3 waveNormal = calculateWaveNormal(pixelCoord, shoreDirection, shoreDist);
  vec3 lightDir = normalize(vec3(0.6, 0.3, 0.8));
  float diffuse = 0.8 + 0.3 * max(dot(waveNormal, lightDir), 0.0);

  vec3 foamColor = mix(baseColor, vec3(0.85, 0.92, 0.98), intensity * 0.4);
  foamColor *= diffuse;

  vec3 reflectDir = reflect(-lightDir, waveNormal);
  float spec = pow(max(dot(vec3(0.0, 0.0, 1.0), reflectDir), 0.0), 32.0);
  foamColor += vec3(spec * 0.15);
  
  float pixelColor = pixelatedNoise(pixelCoord);
  return mix(baseColor, foamColor, intensity * pixelColor);}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 pixelate(vec2 coord) {
  vec2 texScale = u_mapSize / u_textureSize;
  vec2 adjustedCoord = coord / texScale;
  vec2 pixelCoord = floor(adjustedCoord * u_mapSize) / u_mapSize;
  return pixelCoord;
}

vec2 texelate(vec2 coord) {
  vec2 texScale = u_mapSize / u_textureSize;
  return coord * texScale;
}

float pixelatedNoise(vec2 coord) {
  vec2 adjustedCoord = pixelate(coord);
  return hash(adjustedCoord);
}

bool isWithinBounds(vec2 coord) {
  return coord.x >= 0.0 && coord.x <= 1.0 && coord.y >= 0.0 && coord.y <= 1.0;
}

bool isWithinMapBounds(vec2 coord) {
  if (!isWithinBounds(coord)) return false;
  vec2 mapCoord = coord * (u_mapSize / u_textureSize);
  return mapCoord.x >= 0.0 && mapCoord.x < 1.0 && mapCoord.y >= 0.0 && mapCoord.y < 1.0;
} 

vec4 calculateShoreField(vec2 coord, sampler2D terrainTexture) {
  vec2 texCoord = texelate(coord);
  vec2 texelSize = (u_mapSize / u_textureSize) / u_textureSize;
  
  if (!isWithinMapBounds(texCoord)) {
    return vec4(1000.0, 0.0, 0.0, 0.0); 
  }
  
  vec4 centerInfo = getTerrainInfo(texture2D(terrainTexture, texCoord).r);
  if (centerInfo.x <= 0.5) return vec4(1000.0, 0.0, 0.0, 0.0); 
  
  float minDist = 1000.0;
  vec2 shoreDirection = vec2(0.0);
  
  for (float radius = 1.0; radius <= 6.0; radius += 1.0) {
    for (float angle = 0.0; angle < 6.28; angle += 0.78) { 
      vec2 offset = vec2(cos(angle), sin(angle)) * radius;
      vec2 sampleCoord = texCoord + offset * texelSize;
      
      if (isWithinMapBounds(sampleCoord)) {
        float sample = texture2D(terrainTexture, sampleCoord).r;
        vec4 terrainInfo = getTerrainInfo(sample);
        
        
        if (terrainInfo.x <= 0.5) {
          float dist = length(offset) ;
          if (dist < minDist) {
            minDist = dist;
            shoreDirection = normalize(offset);
          }
        }
      }
    }
    if (minDist < radius + 0.5) break;
  }
  
  return minDist < 1000.0 ? vec4(minDist, shoreDirection.x, shoreDirection.y, 1.0) : vec4(1000.0, 0.0, 0.0, 0.0);
}

float getShoreDistance() {
  vec2 texelSize = (u_mapSize / u_textureSize) / u_textureSize;
  vec2 pixelCoord = pixelate(v_texCoord);
  vec2 texCoord = texelate(pixelCoord);
  
  for (float radius = 1.0; radius <= 6.0; radius += 1.0) {
    for (float angle = 0.0; angle < 6.28; angle += 1.57) {
      vec2 offset = vec2(cos(angle), sin(angle)) * radius;
      vec2 sampleCoord = texCoord + offset * texelSize;
      
      if (isWithinBounds(sampleCoord)) {
        float sample = texture2D(u_terrainTexture, sampleCoord).r;
        vec4 terrainInfo = getTerrainInfo(sample);
        
        if (terrainInfo.x <= 0.5) return radius; 
      }
    }
  }
  
  return 999.0;
}

bool isShorePixel(vec2 coord) {
  vec2 texCoord = texelate(coord);
  vec2 texelSize = (u_mapSize / u_textureSize) / u_textureSize;
  
  
  float centerTerrain = texture2D(u_terrainTexture, texCoord).r * 255.0;
  float centerLandBit = floor(centerTerrain / 128.0);
  if (centerLandBit >= 1.0) return false; 
  
  vec2 directions[4];

  directions[0] = vec2(-1.0, 0.0);
  directions[1] = vec2(1.0, 0.0);
  directions[2] = vec2(0.0, -1.0);
  directions[3] = vec2(0.0, 1.0);
  
  for (int i = 0; i < 4; i++) {
    vec2 sampleCoord = texCoord + directions[i] * texelSize;
    if (isWithinBounds(sampleCoord)) {
      float neighborTerrain = texture2D(u_terrainTexture, sampleCoord).r * 255.0;
      float neighborLandBit = floor(neighborTerrain / 128.0);
      if (neighborLandBit >= 1.0) return true; 
    }
  }
  
  return false;
} 

float generateWaveHeight(vec2 pixelCoord, vec2 shoreDirection, float shoreDist) {
  float time = u_time / 8.0;
  if (shoreDist > 5.0) return 0.0;
  
  vec2 mapCoord = texelate(pixelCoord);
  float wavePhase = dot(mapCoord * 0.02, shoreDirection) - time * 3.0;
  
  float wave = sin(wavePhase) * 0.4 + 
               sin(wavePhase * 1.7 + time * 1.2) * 0.3 + 
               sin(wavePhase * 0.6 + time * 1.9) * 0.2;
  
  float shoreEffect = 1.0 - clamp(shoreDist / 4.0, 0.0, 1.0);
  return wave * smoothstep(0.0, 1.0, shoreEffect);
}

vec3 calculateWaveNormal(vec2 pixelCoord, vec2 shoreDirection, float shoreDist) {
  float epsilon = 0.5 / max(u_mapSize.x, u_mapSize.y);
  float h0 = generateWaveHeight(pixelCoord, shoreDirection, shoreDist);
  float hX = generateWaveHeight(pixelCoord + vec2(epsilon, 0.0), shoreDirection, shoreDist);
  float hY = generateWaveHeight(pixelCoord + vec2(0.0, epsilon), shoreDirection, shoreDist);
  
  return normalize(vec3(-(hX - h0) / epsilon, -(hY - h0) / epsilon, 1.0));
}

float getWaveIntensity(vec2 coord, vec2 shoreDirection, float shoreDist) {
  vec2 pixelCoord = pixelate(coord);
  float waveHeight = generateWaveHeight(pixelCoord, shoreDirection, shoreDist);
  
  const float waveThreshold = 0.1;
  if (abs(waveHeight) <= waveThreshold) return 0.0;
  
  return smoothstep(waveThreshold, waveThreshold + 0.2, abs(waveHeight));
}

vec3 getTerrainColor(float terrainValue) {
  vec4 terrainInfo = getTerrainInfo(terrainValue);
  vec3 baseColor;
  
  if (terrainInfo.x > 0.5) { 
    if (terrainInfo.y == 5.0) {
      
      baseColor = u_shoreColor;
    } else if (terrainInfo.y == 3.0) {
      
      float depthFactor = terrainInfo.z / 31.0;
      baseColor = mix(u_oceanColor1, u_oceanColor2, depthFactor);
    } else {
      
      float depthFactor = terrainInfo.z / 31.0;
      baseColor = mix(u_oceanColor1, u_oceanColor2, depthFactor);
    }
  } else { 
    if (terrainInfo.y == 0.0) {
      
      float heightFactor = terrainInfo.z / 9.0;
      baseColor = mix(u_plainsColor1, u_plainsColor2, heightFactor);
    } else if (terrainInfo.y == 1.0) {
      
      float heightFactor = (terrainInfo.z - 10.0) / 9.0;
      baseColor = mix(u_highlandColor1, u_highlandColor2, heightFactor);
    } else {
      
      float heightFactor = (terrainInfo.z - 20.0) / 11.0;
      baseColor = mix(u_mountainColor1, u_mountainColor2, heightFactor);
    }
  }
  
  if (u_renderMode == 1) {
    float noise = pixelatedNoise(v_texCoord);
    baseColor += (noise - 0.5) * (terrainInfo.x > 0.5 ? 0.03 : 0.05);
  }
  
  return baseColor;
}