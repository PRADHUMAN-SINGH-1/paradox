// PARADOX Particle Field Fragment Shader
// Smooth circular point rendering with soft alpha glow

uniform float uAudio;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Distance from center of point coord [0, 1]
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  
  if (dist > 0.5) {
    discard;
  }
  
  // Soft radial falloff
  float glow = smoothstep(0.5, 0.0, dist);
  float core = smoothstep(0.2, 0.0, dist);
  
  vec3 col = mix(vColor, vec3(1.0), core * 0.5);
  float alpha = (glow * 0.8 + core * 0.2) * vAlpha;
  
  gl_FragColor = vec4(col, alpha);
}
