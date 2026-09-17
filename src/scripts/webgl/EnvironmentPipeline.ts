// PARADOX Environment Pipeline
// ACESFilmic Tone Mapping, sRGB color space, synthetic PMREM studio reflection, and neutral editorial lighting.

export class EnvironmentPipeline {
  private THREE: any;
  private renderer: any;
  private scene: any;
  private pmremGenerator: any = null;

  private keyLight: any = null;
  private rimLight: any = null;
  private accentLight: any = null;

  constructor(threeInstance: any, renderer: any, scene: any) {
    this.THREE = threeInstance;
    this.renderer = renderer;
    this.scene = scene;
  }

  /**
   * Initializes color management, tone mapping, and neutral architectural studio lighting.
   */
  public setup() {
    // 1. ACESFilmic Tone Mapping & Color Encoding
    if (this.THREE.ACESFilmicToneMapping) {
      this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
    }

    if (this.THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = this.THREE.SRGBColorSpace;
    }

    // 2. Scene Carbon Obsidian Background (#050608)
    this.scene.background = new this.THREE.Color(0x050608);

    // 3. Editorial Architectural Lighting (Neutral Restraint)
    // Key directional light: crisp architectural white
    this.keyLight = new this.THREE.DirectionalLight(0xF2F4F7, 1.1);
    this.keyLight.position.set(35, 45, 40);
    this.scene.add(this.keyLight);

    // Subtle cool rim light: pale lavender-slate
    this.rimLight = new this.THREE.DirectionalLight(0xCFD5E1, 0.85);
    this.rimLight.position.set(-35, -20, -30);
    this.scene.add(this.rimLight);

    // Data accent light: calibrated cobalt (subtle)
    this.accentLight = new this.THREE.PointLight(0x3B5BDB, 0.5, 120);
    this.accentLight.position.set(0, -25, 20);
    this.scene.add(this.accentLight);

    // Ambient deep charcoal fill
    const ambientLight = new this.THREE.AmbientLight(0x0A0D12, 0.7);
    this.scene.add(ambientLight);

    // 4. Generate Synthetic Neutral Studio Reflection Map via PMREMGenerator
    this.generateSyntheticEnvironment();
  }

  public updateExposure(exposure: number) {
    if (this.renderer) {
      this.renderer.toneMappingExposure = exposure;
    }
  }

  public updateLightingIntensity(key: number, rim: number, accent: number) {
    if (this.keyLight) this.keyLight.intensity = key;
    if (this.rimLight) this.rimLight.intensity = rim;
    if (this.accentLight) this.accentLight.intensity = accent;
  }

  /**
   * Generates a neutral grayscale studio map for realistic specular highlights
   * on metallic and crystalline obsidian surfaces without colorful tinting.
   */
  private generateSyntheticEnvironment() {
    try {
      this.pmremGenerator = new this.THREE.PMREMGenerator(this.renderer);
      this.pmremGenerator.compileEquirectangularShader();

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Deep obsidian gradient base
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0.0, '#040507');
        grad.addColorStop(0.4, '#0a0d11');
        grad.addColorStop(0.5, '#181b22'); // horizon
        grad.addColorStop(0.6, '#0f1217'); // ground reflection
        grad.addColorStop(1.0, '#020304');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 256);

        // Multiple softbox positions
        ctx.fillStyle = 'rgba(242, 244, 247, 0.22)';
        ctx.beginPath();
        ctx.arc(140, 70, 65, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(207, 213, 225, 0.2)';
        ctx.beginPath();
        ctx.arc(380, 80, 55, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(256, 40, 40, 0, Math.PI * 2);
        ctx.fill();

        // Rim light strip
        const rimGrad = ctx.createLinearGradient(0, 220, 512, 220);
        rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        rimGrad.addColorStop(0.2, 'rgba(200, 210, 230, 0.2)');
        rimGrad.addColorStop(0.8, 'rgba(200, 210, 230, 0.2)');
        rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = rimGrad;
        ctx.fillRect(0, 210, 512, 20);

        const texture = new this.THREE.CanvasTexture(canvas);
        texture.mapping = this.THREE.EquirectangularReflectionMapping;

        const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
        this.scene.environment = envMap;
        texture.dispose();
      }
    } catch {
      // Fallback gracefully
    }
  }

  public dispose() {
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
    }
  }
}
