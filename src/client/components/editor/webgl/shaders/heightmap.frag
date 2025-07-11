precision mediump float;

uniform sampler2D u_heightmapTexture;
uniform vec2 u_mapSize;
uniform vec2 u_textureSize;


uniform float u_oceanThreshold;
uniform float u_plainsThreshold;
uniform float u_hillsThreshold;
uniform float u_mountainThreshold;


uniform float u_clampMin;
uniform float u_clampMax;

varying vec2 v_texCoord;


const float LAND_BIT = 128.0;
const float SHORE_BIT = 64.0;
const float OCEAN_BIT = 32.0;


float heightToTerrain(float normalizedHeight) {
    if (normalizedHeight <= u_oceanThreshold) {
        
        float magnitude = floor((normalizedHeight / u_oceanThreshold) * 30.0) + 1.0;
        return OCEAN_BIT + magnitude;
    }
    if (normalizedHeight <= u_plainsThreshold) {
        
        float magnitude = floor(
            ((normalizedHeight - u_oceanThreshold) /
             (u_plainsThreshold - u_oceanThreshold)) * 9.0
        ) + 1.0;
        return LAND_BIT + magnitude;
    }
    if (normalizedHeight <= u_hillsThreshold) {
        
        float magnitude = floor(
            ((normalizedHeight - u_plainsThreshold) /
             (u_hillsThreshold - u_plainsThreshold)) * 10.0
        ) + 10.0;
        return LAND_BIT + magnitude;
    }
    
    
    float magnitude = floor(
        ((normalizedHeight - u_hillsThreshold) /
         (u_mountainThreshold - u_hillsThreshold)) * 12.0
    ) + 20.0;
    return LAND_BIT + min(31.0, magnitude);
}

void main() {
    
    
    vec2 pixelCoord = v_texCoord * u_textureSize;
    
    
    if (pixelCoord.x >= u_mapSize.x || pixelCoord.y >= u_mapSize.y) {
        
        gl_FragColor = vec4((OCEAN_BIT + 15.0) / 255.0, 0.0, 0.0, 1.0);
        return;
    }
    
    
    
    vec4 heightmapSample = texture2D(u_heightmapTexture, v_texCoord);
    
    
    float grayscale = (heightmapSample.r + heightmapSample.g + heightmapSample.b) / 3.0;
    
    
    float clampedHeight = u_clampMin + grayscale * (u_clampMax - u_clampMin);
    
    
    float terrainValue = heightToTerrain(clampedHeight);
    
    
    gl_FragColor = vec4(terrainValue / 255.0, 0.0, 0.0, 1.0);
} 