// PARADOX GLSL Shader Index
// Production-ready shader strings for Three.js ShaderMaterial instantiation

export const CommonGLSL = `
#define PI 3.14159265358979323846
#define TWO_PI 6.28318530717958647692

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

vec3 saturate(vec3 x) {
  return clamp(x, vec3(0.0), vec3(1.0));
}

float fresnel(vec3 eyeDir, vec3 normal, float power) {
  return pow(1.0 - max(dot(eyeDir, normal), 0.0), power);
}
`;

export const NoiseGLSL = `
vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export const FbmGLSL = `
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
`;

export const CoreVert = `
uniform float uTime;
uniform float uAudio;
uniform float uDisplacement;
uniform vec3 uMouse;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uHealth;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying float vDistortion;

${NoiseGLSL}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  
  vec3 pos = position;
  float noiseVal = snoise(pos * 1.8 + vec3(uTime * 0.35));
  float highFreq = snoise(pos * 4.5 - vec3(uTime * 0.7)) * 0.3;
  float totalNoise = noiseVal + highFreq;
  
  float audioBoost = uAudio * 0.45;
  float disp = (totalNoise * uDisplacement * (0.8 + audioBoost));
  
  float healthJitter = (1.0 - clamp(uHealth, 0.0, 1.0)) * 0.15 * snoise(pos * 10.0 + vec3(uTime * 2.0));
  disp += healthJitter;
  
  pos += normal * disp;
  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  
  float distToMouse = length(worldPos.xyz - uMouse);
  if (distToMouse < uMouseRadius) {
    float influence = 1.0 - smoothstep(0.0, uMouseRadius, distToMouse);
    vec3 pushDir = normalize(worldPos.xyz - uMouse);
    worldPos.xyz += pushDir * influence * uMouseStrength;
  }
  
  vDistortion = disp;
  vWorldPosition = worldPos.xyz;
  
  vec4 mvPosition = viewMatrix * worldPos;
  vViewPosition = -mvPosition.xyz;
  vPosition = pos;
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const CoreFrag = `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uRimColor;
uniform vec3 uHealthColor;
uniform float uHealth;
uniform float uAudio;
uniform float uRoughness;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying float vDistortion;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  float NdotV = max(dot(viewDir, normal), 0.0);
  float fresnelVal = pow(1.0 - NdotV, 3.5);
  
  vec3 baseColor = uColor * (0.6 + 0.4 * normal.y);
  vec3 dynamicRim = mix(uRimColor, uHealthColor, clamp(1.0 - uHealth, 0.0, 1.0));
  
  float audioGlow = uAudio * 0.8;
  dynamicRim += uRimColor * audioGlow;
  
  float gridLine = abs(fract(vPosition.y * 8.0 - uTime * 0.2) - 0.5);
  float pulseLine = smoothstep(0.48, 0.5, gridLine) * 0.15;
  
  vec3 finalColor = baseColor + (dynamicRim * (fresnelVal * 1.5 + pulseLine));
  float grazingHighlight = pow(1.0 - NdotV, 6.0) * 0.5;
  finalColor += vec3(grazingHighlight);
  
  float alpha = clamp(0.75 + fresnelVal * 0.25, 0.0, 1.0);
  gl_FragColor = vec4(finalColor, alpha);
}
`;

export const NetworkVert = `
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
  
  vec3 pos = position;
  pos.y += sin(pos.x * 4.0 + uTime * 2.0) * (uAudio * 0.08);
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const NetworkFrag = `
uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uPulseColor;
uniform float uPulseWidth;
uniform float uAudio;

varying vec2 vUv;
varying float vProgress;
varying vec3 vColor;
varying vec3 vViewPosition;

void main() {
  float pulsePos = fract(uTime * 0.4);
  float distToPulse = abs(vUv.x - pulsePos);
  distToPulse = min(distToPulse, 1.0 - distToPulse);
  
  float packet = smoothstep(uPulseWidth + (uAudio * 0.05), 0.0, distToPulse);
  vec3 lineColor = mix(uBaseColor, vColor, 0.5);
  vec3 finalColor = mix(lineColor, uPulseColor, packet);
  
  float edgeFade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
  float depth = length(vViewPosition);
  float depthFade = clamp(1.0 - (depth - 10.0) / 40.0, 0.1, 1.0);
  
  float alpha = (0.25 + packet * 0.75) * edgeFade * depthFade;
  gl_FragColor = vec4(finalColor, alpha);
}
`;

export const EvidenceVert = `
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
  
  vec4 localPos = vec4(position, 1.0);
  float breath = sin(uTime * 1.5 + float(gl_InstanceID) * 0.4) * 0.04 * aFreshness;
  localPos.xyz += normal * breath;
  localPos.xyz += normal * (uAudio * 0.06 * aHealth);
  
  #ifdef USE_INSTANCING
    vec4 mvPosition = modelViewMatrix * instanceMatrix * localPos;
  #else
    vec4 mvPosition = modelViewMatrix * localPos;
  #endif
  
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const EvidenceFrag = `
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
  
  vec2 borderDist = min(vUv, 1.0 - vUv);
  float borderFactor = min(borderDist.x, borderDist.y);
  float borderEdge = smoothstep(0.04, 0.0, borderFactor);
  
  float NdotV = max(dot(viewDir, normal), 0.0);
  float fresnel = pow(1.0 - NdotV, 3.0);
  
  vec3 baseColor = uVoidColor;
  vec3 statusColor = vColor;
  if (vRisk > 0.6) {
    statusColor = mix(statusColor, vec3(1.0, 0.3, 0.31), (vRisk - 0.6) * 2.5);
  }
  
  vec3 halfDir = normalize(viewDir + vec3(0.0, 1.0, 0.5));
  float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.4;
  
  vec3 finalColor = baseColor;
  finalColor = mix(finalColor, statusColor, borderEdge * 0.85);
  finalColor += statusColor * (fresnel * 0.6 + uAudio * 0.2);
  finalColor += vec3(spec);
  
  float scanline = sin(vUv.y * 80.0 + uTime * 2.0) * 0.03;
  finalColor += scanline;
  
  gl_FragColor = vec4(finalColor, 0.92);
}
`;

export const VerifyVert = `
uniform float uTime;
uniform float uScanProgress;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const VerifyFrag = `
uniform float uTime;
uniform float uScanProgress;
uniform vec3 uScanColor;
uniform vec3 uVerifiedColor;
uniform float uAudio;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;

void main() {
  float laserPos = uScanProgress;
  float distToLaser = abs(vUv.y - laserPos);
  
  float laserLine = smoothstep(0.015, 0.0, distToLaser);
  float laserAura = smoothstep(0.08, 0.0, distToLaser) * 0.4;
  
  vec2 gridCoord = fract(vUv * 30.0);
  float gridLines = step(0.96, gridCoord.x) + step(0.96, gridCoord.y);
  gridLines = clamp(gridLines, 0.0, 1.0) * 0.15;
  
  float isVerified = step(vUv.y, laserPos);
  vec3 fieldColor = mix(vec3(0.04, 0.06, 0.09), uVerifiedColor * 0.12, isVerified);
  
  vec3 finalColor = fieldColor + vec3(gridLines);
  finalColor += uScanColor * (laserLine * 2.0 + laserAura + uAudio * 0.1);
  
  float vignette = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x)
                 * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
                 
  float alpha = (0.15 + laserLine * 0.85 + laserAura * 0.5 + isVerified * 0.2) * vignette;
  gl_FragColor = vec4(finalColor, alpha);
}
`;

export const ParticlesVert = `
uniform float uTime;
uniform float uAudio;
uniform float uBaseSize;
uniform vec3 uShockwaveOrigin;
uniform float uShockwaveProgress;

attribute float aScale;
attribute vec3 aVelocity;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vec3 pos = position;
  
  pos += aVelocity * uTime * 0.2;
  pos += sin(pos * 5.0 + uTime * 3.0) * (uAudio * 0.1);
  
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
  float size = uBaseSize * aScale * (1.0 + uAudio * 0.5);
  gl_PointSize = size * (250.0 / -mvPosition.z);
  
  vAlpha = clamp(1.0 - (-mvPosition.z - 5.0) / 45.0, 0.1, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const ParticlesFrag = `
uniform float uAudio;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  
  if (dist > 0.5) {
    discard;
  }
  
  float glow = smoothstep(0.5, 0.0, dist);
  float core = smoothstep(0.2, 0.0, dist);
  
  vec3 col = mix(vColor, vec3(1.0), core * 0.5);
  float alpha = (glow * 0.8 + core * 0.2) * vAlpha;
  
  gl_FragColor = vec4(col, alpha);
}
`;
