// Fractional Brownian Motion (3 Octaves)
float fbm3(vec3 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p = p * 2.02;
  f += 0.2500 * snoise(p); p = p * 2.03;
  f += 0.1250 * snoise(p);
  return f;
}
