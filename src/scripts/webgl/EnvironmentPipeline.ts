// PARADOX Environment Pipeline
// ACESFilmic Tone Mapping, sRGB color space, synthetic PMREM studio reflection, and neutral editorial lighting.

export class EnvironmentPipeline {
  private THREE: any;
  private renderer: any;
  private scene: any;
  private pmremGenerator: any = null;

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
    const keyLight = new this.THREE.DirectionalLight(0xF2F4F7, 1.1);
    keyLight.position.set(35, 45, 40);
    this.scene.add(keyLight);

    // Subtle cool rim light: pale lavender-slate
    const rimLight = new this.THREE.DirectionalLight(0xCFD5E1, 0.85);
    rimLight.position.set(-35, -20, -30);
    this.scene.add(rimLight);

    // Data accent light: calibrated cobalt (subtle)
    const accentLight = new this.THREE.PointLight(0x3B5BDB, 0.5, 120);
    accentLight.position.set(0, -25, 20);
    this.scene.add(accentLight);

    // Ambient deep charcoal fill
    const ambientLight = new this.THREE.AmbientLight(0x0A0D12, 0.7);
    this.scene.add(ambientLight);

    // 4. Generate Synthetic Neutral Studio Reflection Map via PMREMGenerator
    this.generateSyntheticEnvironment();
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
        grad.addColorStop(0.7, '#13171e');
        grad.addColorStop(1.0, '#020304');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 256);

        // Neutral monochrome studio softbox highlights
        ctx.fillStyle = 'rgba(242, 244, 247, 0.22)';
        ctx.beginPath();
        ctx.arc(140, 70, 65, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(207, 213, 225, 0.2)';
        ctx.beginPath();
        ctx.arc(380, 80, 55, 0, Math.PI * 2);
        ctx.fill();

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
