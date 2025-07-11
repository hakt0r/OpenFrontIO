precision mediump float;

uniform sampler2D u_texture;
uniform bool u_useTexture;

varying vec2 v_texCoord;
varying vec4 v_color;

void main() {
    vec4 color = v_color;
    
    if (u_useTexture) {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        color = color * texColor;
    }
    
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(v_texCoord, center);
    
    if (dist > 0.5) {
        discard;
    }
    
    
    float bevelSize = 0.15;
    float highlightIntensity = 0.3;
    float shadowIntensity = 0.2;
    
    
    float bevelEffect = 1.0 - smoothstep(0.0, bevelSize, dist);
    
    
    vec2 lightDir = normalize(vec2(-1.0, 1.0));
    vec2 normalizedTexCoord = (v_texCoord - center) * 2.0;
    float lightAlignment = dot(normalize(normalizedTexCoord), lightDir);
    
    
    vec3 bevelColor = color.rgb;
    if (lightAlignment > 0.0) {
        
        bevelColor += vec3(highlightIntensity) * bevelEffect * lightAlignment;
    } else {
        
        bevelColor -= vec3(shadowIntensity) * bevelEffect * abs(lightAlignment);
    }
    
    color.rgb = bevelColor;
    
    
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
    color.a *= alpha;
    
    gl_FragColor = color;
} 