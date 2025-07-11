precision mediump float;

attribute vec2 a_position;
attribute vec2 a_brushCenter;
attribute float a_brushSize;
attribute float a_brushValue;

uniform vec2 u_mapSize;
uniform mediump vec2 u_textureSize;

varying vec2 v_position;
varying vec2 v_brushCenter;
varying float v_brushSize;
varying float v_brushValue;

void main() {
    
    
    vec2 position = a_position;
    vec2 brushCenter = a_brushCenter;
    
    
    vec2 clipPosition = (position / u_textureSize) * 2.0 - 1.0;
    
    gl_Position = vec4(clipPosition, 0.0, 1.0);
    
    
    v_position = position;
    v_brushCenter = brushCenter;
    v_brushSize = a_brushSize; 
    v_brushValue = a_brushValue;
} 