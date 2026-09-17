// PARADOX Post-Processing Pipeline
// Scene -> RenderPass -> Controlled Effects (Chromatic Aberration, Film Grain, Vignette) -> SMAA -> Screen

import { type QualityTier } from './PerformanceGovernor.ts';

// Custom Post-Processing Composite Shader
const CompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.0015 },
    uGrain: { value: 0.02 },
    uVignette: { value: 0.85 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uGrain;
    uniform float uVignette;
    varying vec2 vUv;

    // Pseudo-random noise for subtle film grain
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      // 1. Subtle chromatic aberration
      vec2 distFromCenter = vUv - 0.5;
      float distSq = dot(distFromCenter, distFromCenter);
      vec2 offset = distFromCenter * distSq * uAberration;

      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      vec3 color = vec3(r, g, b);

      // 2. Subtle obsidian film grain
      float noise = (rand(vUv * 2.0 + fract(uTime)) - 0.5) * uGrain;
      color += noise;

      // 3. Cinematic vignette
      float vig = 1.0 - smoothstep(0.4, uVignette, length(distFromCenter));
      color *= vig;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export class PostProcessing {
  private THREE: any;
  private renderer: any;
  private scene: any;
  private camera: any;
  private composer: any = null;
  private compositePass: any = null;
  private isAvailable: boolean = false;

  constructor(threeInstance: any, renderer: any, scene: any, camera: any) {
    this.THREE = threeInstance;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.initComposer();
  }

  private initComposer() {
    try {
      const { EffectComposer, RenderPass, ShaderPass, SMAAPass } = (window as any).THREE || this.THREE;

      if (EffectComposer && RenderPass) {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        if (ShaderPass) {
          this.compositePass = new ShaderPass(CompositeShader);
          this.composer.addPass(this.compositePass);
        }

        if (SMAAPass) {
          const pixelRatio = this.renderer.getPixelRatio();
          const smaaPass = new SMAAPass(
            window.innerWidth * pixelRatio,
            window.innerHeight * pixelRatio
          );
          this.composer.addPass(smaaPass);
        }

        this.isAvailable = true;
      }
    } catch {
      this.isAvailable = false;
    }
  }

  public setSize(width: number, height: number) {
    if (this.composer && this.isAvailable) {
      this.composer.setSize(width, height);
    }
  }

  /**
   * Master render call - adheres strictly to the performance tier.
   */
  public render(delta: number, tier: QualityTier) {
    if (this.isAvailable && this.composer && tier !== 'LOW') {
      if (this.compositePass && this.compositePass.uniforms.uTime) {
        this.compositePass.uniforms.uTime.value += delta;
      }
      this.composer.render(delta);
    } else {
      // Fallback: Direct scene rendering
      this.renderer.render(this.scene, this.camera);
    }
  }

  public dispose() {
    if (this.composer) {
      // Clean up composer passes
    }
  }
}
