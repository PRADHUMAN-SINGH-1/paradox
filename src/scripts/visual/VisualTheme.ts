// PARADOX Visual Engine — Scene-Specific Visual Themes & Lighting Profiles
// Enforces distinct scene identities: Editorial Light, Deep Obsidian, Calibrated Cobalt, Clinical Silver, Warp Corridor.

import type { SceneDefinition } from './SceneState.ts';

export class VisualTheme {
  public static readonly SCENES: SceneDefinition[] = [
    {
      id: 'ORIGIN',
      index: 0,
      label: '01 // ORIGIN — Editorial Light Gallery',
      progressStart: 0.0,
      progressEnd: 0.08,
      cameraPosition: [0, 0, 180],
      cameraTarget: [0, 0, 0],
      cameraFov: 48,
      transitionType: 'LIGHT_CROSSFADE',
      backgroundColor: 0xEEF0F4,
      isLightTone: true,
      lighting: {
        keyColor: 0x1A1E24,
        keyIntensity: 0.9,
        rimColor: 0xFFFFFF,
        rimIntensity: 1.2,
        ambientColor: 0xD0D5DD,
        ambientIntensity: 0.8,
        exposure: 1.0
      },
      material: {
        baseColor: 0x181C24,
        rimColor: 0xFFFFFF,
        accentColor: 0x3B5BDB,
        roughness: 0.25,
        metalness: 0.8,
        displacement: 0.12
      }
    },
    {
      id: 'CORE',
      index: 1,
      label: '02 // CORE — Repository DNA Sculpture',
      progressStart: 0.08,
      progressEnd: 0.18,
      cameraPosition: [0, 6, 95],
      cameraTarget: [0, 0, 0],
      cameraFov: 50,
      transitionType: 'MORPH',
      backgroundColor: 0x050608,
      isLightTone: false,
      lighting: {
        keyColor: 0xF2F4F7,
        keyIntensity: 1.2,
        rimColor: 0xCFD5E1,
        rimIntensity: 0.9,
        ambientColor: 0x0A0D12,
        ambientIntensity: 0.6,
        exposure: 1.05
      },
      material: {
        baseColor: 0x0A0D12,
        rimColor: 0xCFD5E1,
        accentColor: 0x38D9A9,
        roughness: 0.2,
        metalness: 0.85,
        displacement: 0.16
      }
    },
    {
      id: 'TOPOLOGY',
      index: 2,
      label: '03 // TOPOLOGY — Dependency Ecosystem Matrix',
      progressStart: 0.18,
      progressEnd: 0.28,
      cameraPosition: [26, 12, 85],
      cameraTarget: [0, 2, 0],
      cameraFov: 52,
      transitionType: 'CAMERA_TRAVEL',
      backgroundColor: 0x040507,
      isLightTone: false,
      lighting: {
        keyColor: 0x3B5BDB,
        keyIntensity: 1.0,
        rimColor: 0xCFD5E1,
        rimIntensity: 0.8,
        ambientColor: 0x080A0E,
        ambientIntensity: 0.5,
        exposure: 1.0
      },
      material: {
        baseColor: 0x06080B,
        rimColor: 0x3B5BDB,
        accentColor: 0x64748B,
        roughness: 0.3,
        metalness: 0.7,
        displacement: 0.08
      }
    },
    {
      id: 'EVIDENCE',
      index: 3,
      label: '04 // EVIDENCE — Manifest Shard Field',
      progressStart: 0.28,
      progressEnd: 0.40,
      cameraPosition: [-30, -5, 75],
      cameraTarget: [-10, 0, 0],
      cameraFov: 50,
      transitionType: 'MATERIAL_TRANSITION',
      backgroundColor: 0x050608,
      isLightTone: false,
      lighting: {
        keyColor: 0xF2F4F7,
        keyIntensity: 1.1,
        rimColor: 0x94A3B8,
        rimIntensity: 0.7,
        ambientColor: 0x0A0D12,
        ambientIntensity: 0.6,
        exposure: 1.0
      },
      material: {
        baseColor: 0x080A0E,
        rimColor: 0xE2E8F0,
        accentColor: 0x38D9A9,
        roughness: 0.15,
        metalness: 0.9,
        displacement: 0.05
      }
    },
    {
      id: 'VERIFY',
      index: 4,
      label: '05 // VERIFY — Precision Mathematical Coordinate Planes',
      progressStart: 0.40,
      progressEnd: 0.52,
      cameraPosition: [0, 22, 65],
      cameraTarget: [0, 0, -10],
      cameraFov: 54,
      transitionType: 'MORPH',
      backgroundColor: 0x040506,
      isLightTone: false,
      lighting: {
        keyColor: 0xF2F4F7,
        keyIntensity: 1.4,
        rimColor: 0x38D9A9,
        rimIntensity: 0.8,
        ambientColor: 0x080A0E,
        ambientIntensity: 0.5,
        exposure: 1.1
      },
      material: {
        baseColor: 0x050709,
        rimColor: 0xF2F4F7,
        accentColor: 0x38D9A9,
        roughness: 0.1,
        metalness: 0.95,
        displacement: 0.02
      }
    },
    {
      id: 'ATLAS',
      index: 5,
      label: '06 // ATLAS — Repository Cosmos Constellation',
      progressStart: 0.52,
      progressEnd: 0.62,
      cameraPosition: [40, -15, 100],
      cameraTarget: [10, 0, 0],
      cameraFov: 52,
      transitionType: 'CAMERA_TRAVEL',
      backgroundColor: 0x030406,
      isLightTone: false,
      lighting: {
        keyColor: 0xCFD5E1,
        keyIntensity: 1.0,
        rimColor: 0x3B5BDB,
        rimIntensity: 0.7,
        ambientColor: 0x060709,
        ambientIntensity: 0.5,
        exposure: 1.0
      },
      material: {
        baseColor: 0x030406,
        rimColor: 0xCFD5E1,
        accentColor: 0x3B5BDB,
        roughness: 0.4,
        metalness: 0.6,
        displacement: 0.0
      }
    },
    {
      id: 'COMPARE',
      index: 6,
      label: '07 // COMPARE — Dual Interacting Geometric Systems',
      progressStart: 0.62,
      progressEnd: 0.70,
      cameraPosition: [0, 0, 80],
      cameraTarget: [0, 0, 0],
      cameraFov: 48,
      transitionType: 'PARTICLE_DISSOLVE',
      backgroundColor: 0x050608,
      isLightTone: false,
      lighting: {
        keyColor: 0xDDE2EC,
        keyIntensity: 1.1,
        rimColor: 0x3B5BDB,
        rimIntensity: 0.9,
        ambientColor: 0x090B0E,
        ambientIntensity: 0.6,
        exposure: 1.0
      },
      material: {
        baseColor: 0x0A0D12,
        rimColor: 0xDDE2EC,
        accentColor: 0x3B5BDB,
        roughness: 0.2,
        metalness: 0.8,
        displacement: 0.06
      }
    },
    {
      id: 'STUDIO',
      index: 7,
      label: '08 // STUDIO — Live AST Code Media Canvas',
      progressStart: 0.70,
      progressEnd: 0.78,
      cameraPosition: [-22, 14, 70],
      cameraTarget: [0, 0, 0],
      cameraFov: 50,
      transitionType: 'MATERIAL_TRANSITION',
      backgroundColor: 0x06080B,
      isLightTone: false,
      lighting: {
        keyColor: 0xF2F4F7,
        keyIntensity: 1.2,
        rimColor: 0x38D9A9,
        rimIntensity: 0.6,
        ambientColor: 0x0A0D12,
        ambientIntensity: 0.6,
        exposure: 1.05
      },
      material: {
        baseColor: 0x090B0E,
        rimColor: 0xF2F4F7,
        accentColor: 0x38D9A9,
        roughness: 0.3,
        metalness: 0.5,
        displacement: 0.04
      }
    },
    {
      id: 'SIGNALS',
      index: 8,
      label: '09 // SIGNALS — Audio-Reactive Mathematical Wavefield',
      progressStart: 0.78,
      progressEnd: 0.86,
      cameraPosition: [12, 32, 85],
      cameraTarget: [0, 5, 0],
      cameraFov: 52,
      transitionType: 'MORPH',
      backgroundColor: 0x040507,
      isLightTone: false,
      lighting: {
        keyColor: 0xCFD5E1,
        keyIntensity: 1.1,
        rimColor: 0x00E5FF,
        rimIntensity: 0.8,
        ambientColor: 0x080A0E,
        ambientIntensity: 0.5,
        exposure: 1.0
      },
      material: {
        baseColor: 0x05070A,
        rimColor: 0xCFD5E1,
        accentColor: 0x00E5FF,
        roughness: 0.2,
        metalness: 0.8,
        displacement: 0.22
      }
    },
    {
      id: 'TUNNEL',
      index: 9,
      label: '10 // TUNNEL — High-Speed Vector Warp Corridor',
      progressStart: 0.86,
      progressEnd: 0.95,
      cameraPosition: [0, 0, 25],
      cameraTarget: [0, 0, -60],
      cameraFov: 65,
      transitionType: 'CAMERA_TRAVEL',
      backgroundColor: 0x020304,
      isLightTone: false,
      lighting: {
        keyColor: 0xF2F4F7,
        keyIntensity: 1.4,
        rimColor: 0xCFD5E1,
        rimIntensity: 1.0,
        ambientColor: 0x050608,
        ambientIntensity: 0.4,
        exposure: 1.15
      },
      material: {
        baseColor: 0x020304,
        rimColor: 0xF2F4F7,
        accentColor: 0x3B5BDB,
        roughness: 0.1,
        metalness: 0.9,
        displacement: 0.0
      }
    },
    {
      id: 'VOID',
      index: 10,
      label: '11 // VOID — Meditative Resting Anchor',
      progressStart: 0.95,
      progressEnd: 1.0,
      cameraPosition: [0, 0, 50],
      cameraTarget: [0, 0, 0],
      cameraFov: 50,
      transitionType: 'LIGHT_CROSSFADE',
      backgroundColor: 0x020203,
      isLightTone: false,
      lighting: {
        keyColor: 0xF2F4F7,
        keyIntensity: 0.9,
        rimColor: 0x64748B,
        rimIntensity: 0.5,
        ambientColor: 0x040405,
        ambientIntensity: 0.5,
        exposure: 0.95
      },
      material: {
        baseColor: 0x020203,
        rimColor: 0xF2F4F7,
        accentColor: 0x64748B,
        roughness: 0.5,
        metalness: 0.5,
        displacement: 0.0
      }
    }
  ];

  public static getSceneById(id: string): SceneDefinition {
    return this.SCENES.find((s) => s.id === id) || this.SCENES[0];
  }
}
