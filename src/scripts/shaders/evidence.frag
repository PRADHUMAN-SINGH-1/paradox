// PARADOX Evidence Mesh Fragment Shader
// Precision faceted card with status rim, health indicator, and specular gloss

uniform float uTime;
uniform vec3 uVoidColor;
uniform float uAudio;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vColor;
varying float vHealth;
varying float vRisk;
varying float vFreshness;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // Outer border calculation
  vec2 borderDist = min(vUv, 1.0 - vUv);
  float borderFactor = min(borderDist.x, borderDist.y);
  float borderEdge = smoothstep(0.04, 0.0, borderFactor);
  
  // Fresnel edge
  float NdotV = max(dot(viewDir, normal), 0.0);
  float fresnel = pow(1.0 - NdotV, 3.0);
  
  // Base slab color: obsidian
  vec3 baseColor = uVoidColor;
  
  // Status rim based on risk & health
  vec3 statusColor = vColor;
  if (vRisk > 0.6) {
    statusColor = mix(statusColor, vec3(1.0, 0.3, 0.31), (vRisk - 0.6) * 2.5); // Alert crimson
  }
  
  // Specular sheen
  vec3 halfDir = normalize(viewDir + vec3(0.0, 1.0, 0.5));
  float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.4;
  
  // Combine core surface, illuminated border, and status glow
  vec3 finalColor = baseColor;
  finalColor = mix(finalColor, statusColor, borderEdge * 0.85);
  finalColor += statusColor * (fresnel * 0.6 + uAudio * 0.2);
  finalColor += vec3(spec);
  
  // Subtle data scanline pattern
  float scanline = sin(vUv.y * 80.0 + uTime * 2.0) * 0.03;
  finalColor += scanline;
  
  gl_FragColor = vec4(finalColor, 0.92);
}
