// PARADOX Core Fragment Shader
// Fresnel edge highlighting, metallic obsidian body, and audio glow

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uRimColor;
uniform vec3 uHealthColor;
uniform float uHealth;
uniform float uAudio;
uniform float uRoughness;
uniform float uProgress;
uniform vec2 uResolution;
uniform float uScroll;
uniform float uVelocity;
uniform float uHover;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying float vDistortion;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // Fresnel calculation for edge glow
  float NdotV = max(dot(viewDir, normal), 0.0);
  float fresnelVal = pow(1.0 - NdotV, 3.5);
  
  // Base body: Deep obsidian with slight surface curvature gradient
  vec3 baseColor = uColor * (0.6 + 0.4 * normal.y);
  
  // Blend health status color into the rim
  vec3 dynamicRim = mix(uRimColor, uHealthColor, clamp(1.0 - uHealth, 0.0, 1.0));
  
  // Audio expansion boosts rim brilliance
  float audioGlow = uAudio * 0.8;
  dynamicRim += uRimColor * audioGlow;
  
  // Micro-contour grid / wireframe pulse
  float gridLine = abs(fract(vPosition.y * 8.0 - uTime * 0.2) - 0.5);
  float pulseLine = smoothstep(0.48, 0.5, gridLine) * 0.15;
  
  // Combine base, fresnel rim, and subtle energy pulses
  vec3 finalColor = baseColor + (dynamicRim * (fresnelVal * 1.5 + pulseLine));
  
  // Soft rim highlight on extreme grazing angles
  float grazingHighlight = pow(1.0 - NdotV, 6.0) * 0.5;
  finalColor += vec3(grazingHighlight);

  float hoverGlow = uHover * 0.4;
  finalColor += uRimColor * hoverGlow * fresnelVal;
  
  // Opacity: high density center, translucent edge
  float alpha = clamp(0.75 + fresnelVal * 0.25, 0.0, 1.0);
  
  gl_FragColor = vec4(finalColor, alpha);
}
