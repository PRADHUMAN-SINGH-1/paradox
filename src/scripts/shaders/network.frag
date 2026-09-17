// PARADOX Network Topology Fragment Shader
// Packet flow pulse along dependency connections with depth attenuation

uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uPulseColor;
uniform float uPulseWidth;
uniform float uAudio;
uniform float uProgress;
uniform vec2 uResolution;
uniform float uScroll;

varying vec2 vUv;
varying float vProgress;
varying vec3 vColor;
varying vec3 vViewPosition;

void main() {
  // Moving signal packet along the line
  float pulsePos = fract(uTime * 0.4);
  float distToPulse = abs(vUv.x - pulsePos);
  
  // Wrap-around handling
  distToPulse = min(distToPulse, 1.0 - distToPulse);
  
  float packet = smoothstep(uPulseWidth + (uAudio * 0.05), 0.0, distToPulse);
  
  // Base connection line color
  vec3 lineColor = mix(uBaseColor, vColor, 0.5);
  vec3 finalColor = mix(lineColor, uPulseColor, packet);
  
  // Edge soft fade
  float edgeFade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
  
  // Distance depth fading
  float depth = length(vViewPosition);
  float depthFade = clamp(1.0 - (depth - 10.0) / 40.0, 0.1, 1.0);
  
  float alpha = (0.25 + packet * 0.75) * edgeFade * depthFade;
  
  gl_FragColor = vec4(finalColor, alpha);
}
