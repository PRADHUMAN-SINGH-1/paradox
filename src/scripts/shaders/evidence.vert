// PARADOX Evidence Mesh Vertex Shader
// Per-instance attributes for repositories, health, risk, and freshness

uniform float uTime;
uniform float uAudio;
uniform vec3 uHoveredId;

attribute vec3 aInstanceColor;
attribute float aHealth;
attribute float aRisk;
attribute float aFreshness;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vColor;
varying float vHealth;
varying float vRisk;
varying float vFreshness;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vColor = aInstanceColor;
  vHealth = aHealth;
  vRisk = aRisk;
  vFreshness = aFreshness;
  
  // Instance transform matrix is automatically provided by THREE.InstancedMesh
  vec4 localPos = vec4(position, 1.0);
  
  // Subtle breathing oscillation per instance based on freshness
  float breath = sin(uTime * 1.5 + float(gl_InstanceID) * 0.4) * 0.04 * aFreshness;
  localPos.xyz += normal * breath;
  
  // Audio reactivity
  localPos.xyz += normal * (uAudio * 0.06 * aHealth);
  
  #ifdef USE_INSTANCING
    vec4 mvPosition = modelViewMatrix * instanceMatrix * localPos;
  #else
    vec4 mvPosition = modelViewMatrix * localPos;
  #endif
  
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
