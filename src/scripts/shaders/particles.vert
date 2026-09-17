// PARADOX Particle Field Vertex Shader
// Attenuated points, simplex drift, shockwave and audio reactivity

uniform float uTime;
uniform float uAudio;
uniform float uBaseSize;
uniform vec3 uShockwaveOrigin;
uniform float uShockwaveProgress; // 0.0 to 1.0

attribute float aScale;
attribute vec3 aVelocity;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  
  vec3 pos = position;
  
  // Drift over time based on velocity
  pos += aVelocity * uTime * 0.2;
  
  // Audio jitter
  pos += sin(pos * 5.0 + uTime * 3.0) * (uAudio * 0.1);
  
  // Shockwave expansion
  if (uShockwaveProgress > 0.0 && uShockwaveProgress < 1.0) {
    float distToOrigin = length(pos - uShockwaveOrigin);
    float waveRadius = uShockwaveProgress * 25.0;
    float waveDist = abs(distToOrigin - waveRadius);
    if (waveDist < 3.0) {
      float force = (1.0 - waveDist / 3.0) * (1.0 - uShockwaveProgress);
      pos += normalize(pos - uShockwaveOrigin) * force * 2.0;
    }
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  // Attenuate point size by distance
  float size = uBaseSize * aScale * (1.0 + uAudio * 0.5);
  gl_PointSize = size * (250.0 / -mvPosition.z);
  
  // Fade out distant particles
  vAlpha = clamp(1.0 - (-mvPosition.z - 5.0) / 45.0, 0.1, 1.0);
  
  gl_Position = projectionMatrix * mvPosition;
}
