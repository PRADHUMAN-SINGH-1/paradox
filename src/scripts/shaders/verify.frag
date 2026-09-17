// PARADOX Verification Laser Scan Fragment Shader
// Holographic cryptographic grid with laser sweep line

uniform float uTime;
uniform float uScanProgress; // 0.0 to 1.0
uniform vec3 uScanColor;    // #00E5FF
uniform vec3 uVerifiedColor;// #59FF9A
uniform float uAudio;
uniform float uProgress;
uniform vec2 uResolution;
uniform float uVelocity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;

void main() {
  // Laser line position moving along Y or X
  float laserPos = uScanProgress + (uVelocity * 0.5);
  float distToLaser = abs(vUv.y - laserPos);
  
  // Razor-sharp laser line
  float laserLine = smoothstep(0.015, 0.0, distToLaser);
  float laserAura = smoothstep(0.08, 0.0, distToLaser) * 0.4;
  
  // Holographic grid
  vec2 gridCoord = fract(vUv * 30.0);
  float gridLines = step(0.96, gridCoord.x) + step(0.96, gridCoord.y);
  gridLines = clamp(gridLines, 0.0, 1.0) * 0.15;
  
  // Verification field: area behind laser is verified
  float isVerified = step(vUv.y, laserPos);
  vec3 fieldColor = mix(vec3(0.04, 0.06, 0.09), uVerifiedColor * 0.12, isVerified);
  
  // Combine laser, grid, and verification glow
  vec3 finalColor = fieldColor + vec3(gridLines);
  finalColor += uScanColor * (laserLine * 2.0 + laserAura + uAudio * 0.1);
  
  // Edge vignette fade
  float vignette = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x)
                 * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
                 
  float alpha = (0.15 + laserLine * 0.85 + laserAura * 0.5 + isVerified * 0.2) * vignette;
  
  gl_FragColor = vec4(finalColor, alpha);
}
