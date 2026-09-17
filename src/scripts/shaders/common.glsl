// PARADOX 2.0 Common GLSL Definitions
#define PI 3.14159265358979323846
#define TWO_PI 6.28318530717958647692

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

vec3 saturate(vec3 x) {
  return clamp(x, vec3(0.0), vec3(1.0));
}

// Fresnel approximation
float fresnel(vec3 eyeDir, vec3 normal, float power) {
  return pow(1.0 - max(dot(eyeDir, normal), 0.0), power);
}
