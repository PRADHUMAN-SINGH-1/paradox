// PARADOX Product Visual Mapper
// Maps normalized repository metrics to Three.js color values, scales, and shader uniforms.
// Editorial standard: deep carbon obsidian, off-white, pale lavender-grey, and calibrated data cobalt.

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
  // Editorial palette constants (linear RGB)
  public static readonly COLOR_VOID = [0.02, 0.024, 0.03] as const;          // #050608
  public static readonly COLOR_SURFACE = [0.039, 0.047, 0.063] as const;     // #0A0C10
  public static readonly COLOR_OFFWHITE = [0.95, 0.96, 0.97] as const;        // #F2F4F7
  public static readonly COLOR_LAVENDER = [0.65, 0.67, 0.73] as const;        // #A6ACB9
  public static readonly COLOR_COBALT_DATA = [0.23, 0.36, 0.86] as const;     // #3B5BDB
  public static readonly COLOR_SUCCESS = [0.22, 0.85, 0.66] as const;         // #38D9A9
  public static readonly COLOR_DANGER = [1.0, 0.42, 0.42] as const;           // #FF6B6B

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
      rimColor = [...this.COLOR_COBALT_DATA];
    } else {
      rimColor = [...this.COLOR_OFFWHITE];
    }

    // 2. Primary body: Deep carbon obsidian with subtle status tinting
    const primaryColor: [number, number, number] = [
      this.COLOR_SURFACE[0] + rimColor[0] * 0.03,
      this.COLOR_SURFACE[1] + rimColor[1] * 0.03,
      this.COLOR_SURFACE[2] + rimColor[2] * 0.03
    ];

    // 3. Physical scale: based on dependency density & MCP tools
    const scale = 0.85 + metrics.dependencyDensity * 0.35 + metrics.mcpFactor * 0.25;

    // 4. Vertex displacement: high risk causes turbulent displacement; high health creates serene ripples
    const displacementFactor = 0.12 + metrics.riskFactor * 0.4 - metrics.healthRatio * 0.04;

    // 5. Pulse frequency: commit velocity drives activity rhythm
    const pulseRate = 0.5 + metrics.velocityPulse * 1.2;

    // 6. Specular hardness
    const specularPower = 20.0 + metrics.freshness * 28.0;

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
