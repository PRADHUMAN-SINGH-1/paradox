// PARADOX Post-Processing Pipeline
// Scene -> RT1 -> CompositeShader -> RT2 -> FXAA -> Screen

import { type QualityTier } from './PerformanceGovernor.ts';

export type { QualityTier };

const COMPOSITE_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const COMPOSITE_FRAG = `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uAberration;
  uniform float uGrain;
  uniform float uVignette;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 distFromCenter = vUv - 0.5;
    float distSq = dot(distFromCenter, distFromCenter);
    vec2 offset = distFromCenter * distSq * uAberration;

    // Chromatic Aberration
    float r = texture2D(tDiffuse, vUv + offset).r;
    float g = texture2D(tDiffuse, vUv).g;
    float b = texture2D(tDiffuse, vUv - offset).b;
    vec3 color = vec3(r, g, b);

    // Bloom Approximation (Bright Pixel Glow)
    vec3 blur = vec3(0.0);
    float weight = 0.0;
    vec2 texelSize = 1.0 / uResolution;
    for(int x = -2; x <= 2; x++) {
      for(int y = -2; y <= 2; y++) {
        vec3 sampleColor = texture2D(tDiffuse, vUv + vec2(float(x), float(y)) * texelSize * 2.0).rgb;
        float brightness = dot(sampleColor, vec3(0.2126, 0.7152, 0.0722));
        if (brightness > 0.8) {
          blur += sampleColor;
          weight += 1.0;
        }
      }
    }
    if (weight > 0.0) {
      color += (blur / weight) * 0.15;
    }

    // Film Grain
    float noise = (rand(vUv * 2.0 + fract(uTime)) - 0.5) * uGrain;
    color += noise;

    // Vignette
    float vig = 1.0 - smoothstep(0.4, uVignette, length(distFromCenter));
    color *= vig;

    // Color Grading (Warm shadows, cool highlights, contrast curve)
    color = smoothstep(0.0, 1.0, color);
    vec3 shadows = vec3(0.02, 0.01, 0.0);
    vec3 highlights = vec3(0.9, 0.95, 1.0);
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color + shadows, color * highlights, luma);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const FXAA_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FXAA_FRAG = `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  varying vec2 vUv;

  #define FXAA_REDUCE_MIN   (1.0/128.0)
  #define FXAA_REDUCE_MUL   (1.0/8.0)
  #define FXAA_SPAN_MAX     8.0

  void main() {
    vec3 rgbNW = texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * uResolution).xyz;
    vec3 rgbNE = texture2D(tDiffuse, vUv + vec2(1.0, -1.0) * uResolution).xyz;
    vec3 rgbSW = texture2D(tDiffuse, vUv + vec2(-1.0, 1.0) * uResolution).xyz;
    vec3 rgbSE = texture2D(tDiffuse, vUv + vec2(1.0, 1.0) * uResolution).xyz;
    vec3 rgbM  = texture2D(tDiffuse, vUv).xyz;

    vec3 luma = vec3(0.299, 0.587, 0.114);
    float lumaNW = dot(rgbNW, luma);
    float lumaNE = dot(rgbNE, luma);
    float lumaSW = dot(rgbSW, luma);
    float lumaSE = dot(rgbSE, luma);
    float lumaM  = dot(rgbM,  luma);

    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);

    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
          max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * uResolution;

    vec3 rgbA = (1.0/2.0) * (
        texture2D(tDiffuse, vUv + dir * (1.0/3.0 - 0.5)).xyz +
        texture2D(tDiffuse, vUv + dir * (2.0/3.0 - 0.5)).xyz);
    vec3 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (
        texture2D(tDiffuse, vUv + dir * (0.0/3.0 - 0.5)).xyz +
        texture2D(tDiffuse, vUv + dir * (3.0/3.0 - 0.5)).xyz);

    float lumaB = dot(rgbB, luma);
    if((lumaB < lumaMin) || (lumaB > lumaMax)) {
        gl_FragColor = vec4(rgbA, 1.0);
    } else {
        gl_FragColor = vec4(rgbB, 1.0);
    }
  }
`;

export class PostProcessing {
  private THREE: any;
  private renderer: any;
  private scene: any;
  private camera: any;

  private isAvailable: boolean = false;

  private renderTarget1: any = null;
  private renderTarget2: any = null;

  private fsQuad: any = null;

  private compositeMaterial: any = null;
  private fxaaMaterial: any = null;

  constructor(threeInstance: any, renderer: any, scene: any, camera: any) {
    this.THREE = threeInstance;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.initPipeline();
  }

  private initPipeline() {
    try {
      const { WebGLRenderTarget, PlaneGeometry, OrthographicCamera, Mesh, ShaderMaterial, Vector2 } = this.THREE;

      // Create Render Targets
      const pixelRatio = this.renderer.getPixelRatio();
      const width = Math.floor(window.innerWidth * pixelRatio);
      const height = Math.floor(window.innerHeight * pixelRatio);

      const rtOptions1 = {
        minFilter: this.THREE.LinearFilter,
        magFilter: this.THREE.LinearFilter,
        format: this.THREE.RGBAFormat,
        type: this.THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: false
      };

      const rtOptions2 = {
        minFilter: this.THREE.LinearFilter,
        magFilter: this.THREE.LinearFilter,
        format: this.THREE.RGBAFormat,
        type: this.THREE.UnsignedByteType,
        depthBuffer: false,
        stencilBuffer: false
      };

      this.renderTarget1 = new WebGLRenderTarget(width, height, rtOptions1);
      this.renderTarget2 = new WebGLRenderTarget(width, height, rtOptions2);

      // Create Fullscreen Quad
      const geometry = new PlaneGeometry(2, 2);
      this.fsQuad = {
        camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
        geometry: geometry,
        mesh: new Mesh(geometry)
      };

      // Composite Shader
      this.compositeMaterial = new ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          uTime: { value: 0 },
          uAberration: { value: 0.0015 },
          uGrain: { value: 0.02 },
          uVignette: { value: 0.85 },
          uResolution: { value: new Vector2(width, height) }
        },
        vertexShader: COMPOSITE_VERT,
        fragmentShader: COMPOSITE_FRAG,
        depthWrite: false,
        depthTest: false
      });

      // FXAA Shader
      this.fxaaMaterial = new ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new Vector2(1.0 / width, 1.0 / height) }
        },
        vertexShader: FXAA_VERT,
        fragmentShader: FXAA_FRAG,
        depthWrite: false,
        depthTest: false
      });

      this.isAvailable = true;
    } catch (err) {
      console.warn('[Paradox] PostProcessing init fallback:', err);
      this.isAvailable = false;
    }
  }

  public setSize(width: number, height: number) {
    if (this.isAvailable && this.renderTarget1 && this.renderTarget2) {
      const pixelRatio = this.renderer.getPixelRatio();
      const w = Math.max(1, Math.floor(width * pixelRatio));
      const h = Math.max(1, Math.floor(height * pixelRatio));

      this.renderTarget1.setSize(w, h);
      this.renderTarget2.setSize(w, h);

      if (this.compositeMaterial && this.compositeMaterial.uniforms) {
        this.compositeMaterial.uniforms.uResolution.value.set(w, h);
      }
      if (this.fxaaMaterial && this.fxaaMaterial.uniforms) {
        this.fxaaMaterial.uniforms.uResolution.value.set(1.0 / w, 1.0 / h);
      }
    }
  }

  /**
   * Master render call - adheres strictly to the performance tier.
   */
  public render(delta: number, tier: QualityTier) {
    if (!this.isAvailable || tier === 'LOW') {
      // Direct render for LOW or fallback
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    try {
      // 1. Render Scene to RT1
      this.renderer.setRenderTarget(this.renderTarget1);
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);

      // 2. Composite Pass (RT1 -> RT2 for HIGH, RT1 -> Screen for MEDIUM)
      const isHigh = tier === 'HIGH';
      this.renderer.setRenderTarget(isHigh ? this.renderTarget2 : null);
      if (!isHigh) this.renderer.clear();

      this.compositeMaterial.uniforms.tDiffuse.value = this.renderTarget1.texture;
      this.compositeMaterial.uniforms.uTime.value += delta;
      this.fsQuad.mesh.material = this.compositeMaterial;
      this.renderer.render(this.fsQuad.mesh, this.fsQuad.camera);

      // 3. FXAA Pass (RT2 -> Screen for HIGH only)
      if (isHigh) {
        this.renderer.setRenderTarget(null);
        this.renderer.clear();
        this.fxaaMaterial.uniforms.tDiffuse.value = this.renderTarget2.texture;
        this.fsQuad.mesh.material = this.fxaaMaterial;
        this.renderer.render(this.fsQuad.mesh, this.fsQuad.camera);
      }
    } catch (err) {
      console.warn('[Paradox] Post-processing render error, falling back to direct render:', err);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    }
  }

  public dispose() {
    if (this.renderTarget1) this.renderTarget1.dispose();
    if (this.renderTarget2) this.renderTarget2.dispose();
    if (this.compositeMaterial) this.compositeMaterial.dispose();
    if (this.fxaaMaterial) this.fxaaMaterial.dispose();
    if (this.fsQuad && this.fsQuad.geometry) this.fsQuad.geometry.dispose();
  }
}
