// PARADOX Product Visual Mapper
// Maps normalized repository metrics to Three.js color values, scales, and shader uniforms.

import { type NormalizedVisualMetrics } from './ProductDataNormalizer.ts';

export interface VisualRepresentation {
  primaryColor: [number, number, number]; // RGB 0..1
  rimColor: [number, number, number];
  scale: number;
  displacementFactor: number;
  pulseRate: number;
  specularPower: number;
}

export class ProductVisualMapper {
  // Brand color constants (linear RGB)
  public static readonly COLOR_VOID = [0.02, 0.02, 0.02] as const;      // #050505
  public static readonly COLOR_SURFACE = [0.043, 0.055, 0.067] as const; // #0B0E11
  public static readonly COLOR_ELECTRIC = [0.427, 0.361, 1.0] as const; // #6D5CFF
  public static readonly COLOR_CYAN = [0.0, 0.898, 1.0] as const;       // #00E5FF
  public static readonly COLOR_SUCCESS = [0.349, 1.0, 0.604] as const;  // #59FF9A
  public static readonly COLOR_DANGER = [1.0, 0.302, 0.31] as const;    // #FF4D4F

  /**
   * Maps normalized metrics to shader uniform values and attributes.
   */
  public static mapToVisual(metrics: NormalizedVisualMetrics): VisualRepresentation {
    // 1. Determine rim/glow color according to health and risk
    let rimColor: [number, number, number];
    if (metrics.riskFactor > 0.6) {
      rimColor = [...this.COLOR_DANGER];
    } else if (metrics.healthRatio > 0.9) {
      rimColor = [...this.COLOR_SUCCESS];
    } else if (metrics.isVerified) {
      rimColor = [...this.COLOR_CYAN];
    } else {
      rimColor = [...this.COLOR_ELECTRIC];
    }

    // 2. Primary body: Deep obsidian with slight status tinting
    const primaryColor: [number, number, number] = [
      this.COLOR_SURFACE[0] + rimColor[0] * 0.05,
      this.COLOR_SURFACE[1] + rimColor[1] * 0.05,
      this.COLOR_SURFACE[2] + rimColor[2] * 0.05
    ];

    // 3. Physical scale: based on dependency density & MCP tools
    const scale = 0.8 + metrics.dependencyDensity * 0.4 + metrics.mcpFactor * 0.3;

    // 4. Vertex displacement: high risk causes turbulent displacement; high health creates serene ripples
    const displacementFactor = 0.15 + metrics.riskFactor * 0.5 - metrics.healthRatio * 0.05;

    // 5. Pulse frequency: commit velocity drives activity rhythm
    const pulseRate = 0.6 + metrics.velocityPulse * 1.4;

    // 6. Specular hardness
    const specularPower = 16.0 + metrics.freshness * 32.0;

    return {
      primaryColor,
      rimColor,
      scale,
      displacementFactor,
      pulseRate,
      specularPower
    };
  }
}
