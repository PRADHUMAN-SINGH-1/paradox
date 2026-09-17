// PARADOX Environment Pipeline
// ACESFilmic Tone Mapping, sRGB color space, synthetic PMREM reflection environment, and surgical lighting.

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
   * Initializes color management, tone mapping, and synthetic studio lighting.
   */
  public setup() {
    // 1. ACESFilmic Tone Mapping & Color Encoding
    if (this.THREE.ACESFilmicToneMapping) {
      this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
    }

    if (this.THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = this.THREE.SRGBColorSpace;
    }

    // 2. Scene Void Background (#050505)
    this.scene.background = new this.THREE.Color(0x050505);

    // 3. Surgical Lighting Grid
    // Key directional light: cool white
    const keyLight = new this.THREE.DirectionalLight(0xF5F7FA, 1.2);
    keyLight.position.set(30, 45, 40);
    this.scene.add(keyLight);

    // Rim light: electric brand / cyan
    const rimLight = new this.THREE.DirectionalLight(0x00E5FF, 1.8);
    rimLight.position.set(-35, -20, -30);
    this.scene.add(rimLight);

    // Accent light: emerald verification glow
    const accentLight = new this.THREE.PointLight(0x59FF9A, 1.0, 100);
    accentLight.position.set(0, -25, 20);
    this.scene.add(accentLight);

    // Soft obsidian ambient
    const ambientLight = new this.THREE.AmbientLight(0x080B10, 0.6);
    this.scene.add(ambientLight);

    // 4. Generate Synthetic HDR Studio Map via PMREMGenerator
    this.generateSyntheticEnvironment();
  }

  /**
   * Generates a procedural gradient cubemap processed by PMREMGenerator
   * for realistic obsidian reflections without 10MB HDR downloads.
   */
  private generateSyntheticEnvironment() {
    try {
      this.pmremGenerator = new this.THREE.PMREMGenerator(this.renderer);
      this.pmremGenerator.compileEquirectangularShader();

      // Create synthetic high-contrast studio canvas
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Deep obsidian base
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0.0, '#05070a');
        grad.addColorStop(0.4, '#0d1117');
        grad.addColorStop(0.7, '#161b22');
        grad.addColorStop(1.0, '#030406');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 256);

        // Studio softbox highlights (emulating Lusion lighting rig)
        ctx.fillStyle = 'rgba(109, 92, 255, 0.4)'; // Brand purple glow
        ctx.beginPath();
        ctx.arc(140, 70, 60, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 229, 255, 0.45)'; // Cyan key light
        ctx.beginPath();
        ctx.arc(380, 80, 50, 0, Math.PI * 2);
        ctx.fill();

        const texture = new this.THREE.CanvasTexture(canvas);
        texture.mapping = this.THREE.EquirectangularReflectionMapping;

        const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
        this.scene.environment = envMap;
        texture.dispose();
      }
    } catch {
      // Fallback gracefully if PMREM is unsupported
    }
  }

  public dispose() {
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
    }
  }
}
