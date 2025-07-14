uniform mat3 u_transform;
uniform vec2 u_brushCenter;
uniform float u_brushRadius;
uniform int u_strokeCount;
uniform vec2 u_strokeCenters[256];
uniform vec2 u_mapSize;
uniform float u_textureSize;

varying vec2 v_texCoord;
varying vec2 v_worldCoord;
varying vec2 v_chunkCoord;
varying float v_isAffectedByBrush;
varying vec2 v_pixelatedWorldCoord;
varying vec2 v_pixelatedTexCoord;

void main() {
  vec2 chunkOffset = vec2(modelMatrix[3][0] - 32.0, modelMatrix[3][1] - 32.0);
  vec2 worldPosition = position.xy + chunkOffset + vec2(32.0, 32.0);
  vec3 transformedPos = u_transform * vec3(worldPosition, 1.0);

  gl_Position = projectionMatrix * viewMatrix * vec4(transformedPos.xy, position.z, 1.0);
  v_texCoord = worldPosition / u_mapSize;
  v_worldCoord = worldPosition;
  v_chunkCoord = mod(worldPosition, 64.0);
  v_pixelatedWorldCoord = floor(worldPosition);
  v_pixelatedTexCoord = floor(v_texCoord * u_textureSize);
  v_isAffectedByBrush = 0.0;

  if(distance(worldPosition, u_brushCenter) < u_brushRadius) {
    v_isAffectedByBrush = 1.0;
    return;
  }

  for(int i = 0; i < 256; i++) {
    if(i >= u_strokeCount)
      break;

    if(distance(worldPosition, u_strokeCenters[i]) < u_brushRadius) {
      v_isAffectedByBrush = 1.0;
      break;
    }
  }
}