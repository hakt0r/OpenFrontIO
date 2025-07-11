precision mediump float;

uniform sampler2D u_terrainTexture;
uniform mediump vec2 u_mapSize;
uniform mediump vec2 u_textureSize;
uniform float u_brushType; 
uniform float u_falloffType; 
uniform float u_brushMagnitude; 

varying vec2 v_position;
varying vec2 v_brushCenter;
varying float v_brushSize;
varying float v_brushValue;


const float LAND_BIT = 128.0;
const float SHORE_BIT = 64.0;
const float OCEAN_BIT = 32.0;


float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}


float calculateBrushInfluence(float distance, float brushSize, float falloffType) {
    float radius = brushSize * 0.5; 
    if (distance > radius) return 0.0;
    
    if (falloffType < 0.5) {
        
        return 1.0;
    } else if (falloffType < 1.5) {
        
        float normalizedDistance = distance / radius;
        return 1.0 - smoothstep(0.0, 1.0, normalizedDistance);
    } else {
        
        float normalizedDistance = distance / radius;
        float falloffStrength = max(0.0, (radius - distance + 0.5) / 1.0);
        float randomValue = hash(v_position);
        return step(1.0 - falloffStrength, randomValue);
    }
}


bool isLand(float terrainValue) {
    return floor(terrainValue / 128.0) >= 1.0;
}




float getBlendedMagnitude(vec2 pos, float brushInfluence) {
    float totalMagnitude = 0.0;
    float totalWeight = 0.0;
    
    
    for (int dy = -2; dy <= 2; dy++) {
        for (int dx = -2; dx <= 2; dx++) {
            vec2 neighborPos = pos + vec2(float(dx), float(dy));
            if (neighborPos.x >= 0.0 && neighborPos.x < u_mapSize.x && 
                neighborPos.y >= 0.0 && neighborPos.y < u_mapSize.y) {
                
                vec2 neighborTexCoord = neighborPos / u_textureSize;
                float neighborTerrain = texture2D(u_terrainTexture, neighborTexCoord).r * 255.0;
                float neighborMagnitude = mod(neighborTerrain, 32.0);
                
                
                float distance = length(vec2(float(dx), float(dy)));
                float weight = 1.0 / (1.0 + distance * 0.5);
                
                totalMagnitude += neighborMagnitude * weight;
                totalWeight += weight;
            }
        }
    }
    
    
    float avgMagnitude = totalWeight > 0.0 ? totalMagnitude / totalWeight : u_brushMagnitude;
    return mix(avgMagnitude, u_brushMagnitude, brushInfluence * 0.7);
}


float getGaussianWeight(int dx, int dy) {
    
    if (dy == -2) {
        if (dx == -2) return 0.003765;
        if (dx == -1) return 0.015019;
        if (dx == 0) return 0.023792;
        if (dx == 1) return 0.015019;
        if (dx == 2) return 0.003765;
    } else if (dy == -1) {
        if (dx == -2) return 0.015019;
        if (dx == -1) return 0.059912;
        if (dx == 0) return 0.094907;
        if (dx == 1) return 0.059912;
        if (dx == 2) return 0.015019;
    } else if (dy == 0) {
        if (dx == -2) return 0.023792;
        if (dx == -1) return 0.094907;
        if (dx == 0) return 0.150342;
        if (dx == 1) return 0.094907;
        if (dx == 2) return 0.023792;
    } else if (dy == 1) {
        if (dx == -2) return 0.015019;
        if (dx == -1) return 0.059912;
        if (dx == 0) return 0.094907;
        if (dx == 1) return 0.059912;
        if (dx == 2) return 0.015019;
    } else if (dy == 2) {
        if (dx == -2) return 0.003765;
        if (dx == -1) return 0.015019;
        if (dx == 0) return 0.023792;
        if (dx == 1) return 0.015019;
        if (dx == 2) return 0.003765;
    }
    return 0.0;
}


float getGaussianBlurredMagnitude(vec2 pos, float brushInfluence) {
    float totalMagnitude = 0.0;
    float totalWeight = 0.0;
    
    
    for (int dy = -2; dy <= 2; dy++) {
        for (int dx = -2; dx <= 2; dx++) {
            vec2 neighborPos = pos + vec2(float(dx), float(dy));
            if (neighborPos.x >= 0.0 && neighborPos.x < u_mapSize.x && 
                neighborPos.y >= 0.0 && neighborPos.y < u_mapSize.y) {
                
                vec2 neighborTexCoord = neighborPos / u_textureSize;
                float neighborTerrain = texture2D(u_terrainTexture, neighborTexCoord).r * 255.0;
                float neighborMagnitude = mod(neighborTerrain, 32.0);
                
                float weight = getGaussianWeight(dx, dy);
                totalMagnitude += neighborMagnitude * weight;
                totalWeight += weight;
            }
        }
    }
    
    
    float currentMagnitude = mod(texture2D(u_terrainTexture, pos / u_textureSize).r * 255.0, 32.0);
    float blurredMagnitude = totalWeight > 0.0 ? totalMagnitude / totalWeight : currentMagnitude;
    return mix(currentMagnitude, blurredMagnitude, brushInfluence);
}


float createTerrainValue(float terrainType, float magnitude) {
    if (terrainType < 0.5) {
        
        return LAND_BIT + magnitude;
    } else if (terrainType < 1.5) {
        
        return LAND_BIT + magnitude;
    } else if (terrainType < 2.5) {
        
        return LAND_BIT + magnitude;
    } else if (terrainType < 3.5) {
        
        return OCEAN_BIT + magnitude;
    } else {
        
        return magnitude;
    }
}

void main() {
    
    if (v_position.x >= u_mapSize.x || v_position.y >= u_mapSize.y || v_position.x < 0.0 || v_position.y < 0.0) {
        discard; 
    }
    
    
    
    vec2 texCoord = v_position / u_textureSize;
    float currentTerrain = texture2D(u_terrainTexture, texCoord).r * 255.0;
    
    
    float distance = length(v_position - v_brushCenter);
    
    
    float influence = calculateBrushInfluence(distance, v_brushSize, u_falloffType);
    
    float newTerrain = currentTerrain;
    
    if (influence > 0.0) {
        if (u_brushType < 0.5) {
            
            float targetValue = v_brushValue;
            float blendedMagnitude = getBlendedMagnitude(v_position, influence);
            float currentMagnitude = mod(currentTerrain, 32.0);
            float finalMagnitude = mix(currentMagnitude, blendedMagnitude, influence);
            
            
            float targetTerrainBits = floor(targetValue / 32.0) * 32.0;
            float targetWithBlendedMagnitude = targetTerrainBits + finalMagnitude;
            newTerrain = mix(currentTerrain, targetWithBlendedMagnitude, influence);
        } else if (u_brushType < 1.5) {
            
            float blendedMagnitude = getBlendedMagnitude(v_position, influence);
            float oceanValue = createTerrainValue(3.0, blendedMagnitude);
            newTerrain = mix(currentTerrain, oceanValue, influence);
        } else if (u_brushType < 2.5) {
            
            float blurredMagnitude = getGaussianBlurredMagnitude(v_position, influence);
            
            
            float terrainBits = floor(currentTerrain / 32.0) * 32.0;
            newTerrain = terrainBits + blurredMagnitude;
        } else if (u_brushType < 3.5) {
            
            float currentMagnitude = mod(currentTerrain, 32.0);
            float terrainBits = floor(currentTerrain / 32.0) * 32.0;
            float raiseAmount = u_brushMagnitude * influence * 0.3; 
            float newMagnitude = min(31.0, currentMagnitude + raiseAmount);
            newTerrain = terrainBits + newMagnitude;
        } else if (u_brushType < 4.5) {
            
            float currentMagnitude = mod(currentTerrain, 32.0);
            float terrainBits = floor(currentTerrain / 32.0) * 32.0;
            float lowerAmount = u_brushMagnitude * influence * 0.3; 
            float newMagnitude = max(1.0, currentMagnitude - lowerAmount);
            newTerrain = terrainBits + newMagnitude;
        }
    }
    
    
    gl_FragColor = vec4(newTerrain / 255.0, 0.0, 0.0, 1.0);
} 