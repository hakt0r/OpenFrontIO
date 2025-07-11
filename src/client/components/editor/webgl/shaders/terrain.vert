precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform mat3 u_transform;
uniform vec2 u_resolution;

varying vec2 v_texCoord;

void main() {
    
    vec2 transformed = (u_transform * vec3(a_position, 1.0)).xy;
    
    
    vec2 clipSpace = ((transformed / u_resolution) * 2.0) - 1.0;
    
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_texCoord = a_texCoord;
} 