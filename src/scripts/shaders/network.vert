// PARADOX Network Topology Vertex Shader
// Visualizes dependency linkages, agent graphs, and data propagation

uniform float uTime;
uniform float uAudio;
uniform float uPulseSpeed;

attribute float aLineProgress;
attribute vec3 aInstanceStart;
attribute vec3 aInstanceEnd;
attribute vec3 aInstanceColor;

varying vec2 vUv;
varying float vProgress;
varying vec3 vColor;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vProgress = aLineProgress;
  vColor = aInstanceColor;
  
  // Standard or instanced position interpolation
  vec3 pos = position;
  
  // Subtle audio wave perturbation
  pos.y += sin(pos.x * 4.0 + uTime * 2.0) * (uAudio * 0.08);
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  
  gl_Position = projectionMatrix * mvPosition;
}
