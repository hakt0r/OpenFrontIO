attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute vec4 a_color;

uniform mat3 u_transform;
uniform vec2 u_resolution;
uniform bool u_useScreenCoords; 

varying vec2 v_texCoord;
varying vec4 v_color;

void main() {
    vec2 transformed;
    
    if (u_useScreenCoords) {
        
        transformed = a_position;
    } else {
        
        transformed = (u_transform * vec3(a_position, 1.0)).xy;
    }
    
    vec2 clipSpace = ((transformed / u_resolution) * 2.0) - 1.0;
    
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_texCoord = a_texCoord;
    v_color = a_color;
} 