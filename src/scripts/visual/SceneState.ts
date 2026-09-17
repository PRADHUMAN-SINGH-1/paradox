// PARADOX Visual Engine — Scene State Definitions
// Typed contracts for the 11 visual scenes, camera paths, lighting, and transition modes.

export type SceneId = 
  | 'ORIGIN'
  | 'CORE'
  | 'TOPOLOGY'
  | 'EVIDENCE'
  | 'VERIFY'
  | 'ATLAS'
  | 'COMPARE'
  | 'STUDIO'
  | 'SIGNALS'
  | 'TUNNEL'
  | 'VOID';

export type TransitionType = 
  | 'MORPH'
  | 'CAMERA_TRAVEL'
  | 'MATERIAL_TRANSITION'
  | 'PARTICLE_DISSOLVE'
  | 'LIGHT_CROSSFADE';

export interface LightingPreset {
  keyColor: number;
  keyIntensity: number;
  rimColor: number;
  rimIntensity: number;
  ambientColor: number;
  ambientIntensity: number;
  exposure: number;
}

export interface MaterialPreset {
  baseColor: number;
  rimColor: number;
  accentColor: number;
  roughness: number;
  metalness: number;
  displacement: number;
}

export interface SceneDefinition {
  id: SceneId;
  index: number;
  label: string;
  progressStart: number;
  progressEnd: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraFov: number;
  transitionType: TransitionType;
  backgroundColor: number;
  isLightTone: boolean;
  lighting: LightingPreset;
  material: MaterialPreset;
}

export interface ActiveTransitionState {
  currentScene: SceneDefinition;
  nextScene: SceneDefinition;
  blendFactor: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraFov: number;
  currentBgColor: number;
}
