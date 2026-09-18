/**
 * PARADOX 2.0 Master Multi-Chapter Visual Engine
 * Editorial Art Direction inspired by Lusion.co:
 *  - 11 genuinely distinct visual chapter worlds (procedural geometry, topology filaments,
 *    evidence manifests, verification planes, agent cosmos, dual comparison systems,
 *    media planes, audio wave ribbons, warp corridor, and meditative void)
 *  - Zero central sphere domination
 *  - Restrained editorial palette: carbon obsidian, off-white, pale lavender-grey, data cobalt
 *  - Explicit post-processing: Scene -> RenderPass -> Controlled Effects -> SMAA -> Screen
 *  - Real telemetry & frame budget governor (zero fabricated numbers)
 */

import { CoreVert, CoreFrag, VerifyVert, VerifyFrag } from './shaders/shaderIndex.ts';
import { PerformanceGovernor } from '../webgl/PerformanceGovernor.ts';
import { LoadingManager } from './webgl/LoadingManager.ts';
import { CameraTimeline } from './webgl/CameraTimeline.ts';
import { InstanceManager } from './webgl/InstanceManager.ts';
import { EnvironmentPipeline } from './webgl/EnvironmentPipeline.ts';
import { PostProcessing } from './webgl/PostProcessing.ts';
import { DomWebGLSync } from './webgl/DomWebGLSync.ts';
import { sound } from './sound-engine.ts';

declare global {
  interface Window {
    THREE?: any;
    lenisInstance?: any;
    paradoxWebGL?: any;
  }
}

export class ThreeWebGLScene {
  private canvas: HTMLCanvasElement;
  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private animId = 0;
  private isVisible = true;
  private isReducedMotion = false;
  private isMobile = false;

  // Subsystems
  private governor: PerformanceGovernor;
  private loadingManager: LoadingManager;
  private cameraTimeline: CameraTimeline;
  private envPipeline: EnvironmentPipeline | null = null;
  private postProcessing: PostProcessing | null = null;
  private domSync: DomWebGLSync | null = null;

  // 11 Distinct Chapter Scene Groups
  private groupBoot: any = null;      // 01: Micro-scale spatial dust
  private groupCore: any = null;      // 02: Procedural evolving geometry (repository DNA)
  private groupObserve: any = null;   // 03: Spatial dependency topology graph
  private groupEvidence: any = null;  // 04: Floating repository evidence manifest shards
  private groupVerify: any = null;    // 05: Mathematical verification coordinate planes
  private groupAtlas: any = null;     // 06: Volumetric agent repository cosmos
  private groupCompare: any = null;   // 07: Dual interacting visual systems
  private groupStudio: any = null;    // 08: Media planes & generative canvas textures
  private groupSignals: any = null;   // 09: Audio-reactive ribbon wave field
  private groupTunnel: any = null;    // 10: High-speed vector warp streaks
  private groupVoid: any = null;      // 11: Minimalist resting light anchor

  // Active Dynamic Objects
  private coreMaterial: any = null;
  private coreMesh: any = null;
  private coreRing: any = null;
  private instanceManager: InstanceManager | null = null;
  private verifyMaterial: any = null;
  private signalsRibbon: any = null;
  private signalsGeo: any = null;
  private tunnelLines: any = null;

  // Dynamic Background Atmosphere
  private lightBgColor: any = null;
  private darkBgColor: any = null;
  private currentBgColor: any = null;

  // Interaction State
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private angularVelocity = { x: 0, y: 0 };
  private manualRotation = { x: 0.1, y: 0.2 };
  private mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  private mouseWorld: any = null;

  // Scroll & Time Tracking
  private scrollProgress = 0;
  private clock: any = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.governor = new PerformanceGovernor();
    this.loadingManager = new LoadingManager();
    this.cameraTimeline = new CameraTimeline();

    if (typeof window === 'undefined' || !window.THREE) return;

    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

    try {
      this.init();
    } catch (e) {
      console.warn('Paradox Multi-Chapter WebGL Scene initialization error:', e);
    }
  }

  public getDomSync(): DomWebGLSync | null {
    return this.domSync;
  }

  private init() {
    const THREE = window.THREE;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.clock = new THREE.Clock();
    this.mouseWorld = new THREE.Vector3(0, 0, 0);

    const budget = this.governor.getBudget();

    // 1. WebGL Renderer with sRGB & ACESFilmic Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: budget.tier === 'HIGH' && !this.isMobile,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isMobile ? Math.min(budget.targetDpr, 1.25) : budget.targetDpr);

    // 2. Camera System
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, w / h, 1, 1500);
    this.camera.position.set(0, 0, 180);

    // 3. Setup Environment & Architectural Lighting
    this.envPipeline = new EnvironmentPipeline(THREE, this.renderer, this.scene);
    this.envPipeline.setup();

    // Initialize Dynamic Atmosphere Colors (World A: Light Gallery #EEF0F4)
    this.lightBgColor = new THREE.Color(0xEEF0F4);
    this.darkBgColor = new THREE.Color(0x050608);
    this.currentBgColor = new THREE.Color(0xEEF0F4);
    this.scene.background = this.currentBgColor;

    // 4. Setup Explicit Post-Processing Pipeline
    this.postProcessing = new PostProcessing(THREE, this.renderer, this.scene, this.camera);
    this.postProcessing.setSize(w, h);

    // 5. DOM-WebGL Synchronization
    this.domSync = new DomWebGLSync(THREE, this.camera);

    // 6. Build All 11 Distinct Chapter Scene Compositions
    this.buildChapter01Boot(THREE);
    this.buildChapter02Core(THREE);
    this.buildChapter03Observe(THREE);
    this.buildChapter04Evidence(THREE, budget);
    this.buildChapter05Verify(THREE);
    this.buildChapter06Atlas(THREE);
    this.buildChapter07Compare(THREE);
    this.buildChapter08Studio(THREE);
    this.buildChapter09Signals(THREE);
    this.buildChapter10Tunnel(THREE);
    this.buildChapter11Void(THREE);

    // 7. Notify Loading Readiness (P0 Hero)
    this.loadingManager.notifyRendererReady();
    this.loadingManager.notifyHeroShadersReady();
    this.loadingManager.onHeroReady(() => {
      window.dispatchEvent(new CustomEvent('paradox:hero_ready'));
    });

    // 8. Register Global API (Zero fake telemetry)
    this.registerGlobalAPI();

    // 9. Bind Listeners & Start RAF Loop
    this.bind();
    this.animate();
  }

  /* ==========================================================================
     CHAPTER 01: BOOT — Micro-scale spatial dust in vast obsidian void
     ========================================================================== */
  private buildChapter01Boot(THREE: any) {
    this.groupBoot = new THREE.Group();
    const count = 180;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 220;
      pos[i + 1] = (Math.random() - 0.5) * 140;
      pos[i + 2] = (Math.random() - 0.5) * 80;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xA6ACB9,
      size: 1.4,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    this.groupBoot.add(new THREE.Points(geo, mat));
    this.scene.add(this.groupBoot);
  }

  /* ==========================================================================
     CHAPTER 02: CORE — Evolving procedural geometry representing repository DNA
     ========================================================================== */
  private buildChapter02Core(THREE: any) {
    this.groupCore = new THREE.Group();

    // Procedural crystalline polyhedron with Simplex noise vertex displacement
    const geo = new THREE.IcosahedronGeometry(20, 5);
    this.coreMaterial = new THREE.ShaderMaterial({
      vertexShader: CoreVert,
      fragmentShader: CoreFrag,
      uniforms: {
        uTime: { value: 0 },
        uAudio: { value: 0 },
        uDisplacement: { value: 0.16 },
        uMouse: { value: new THREE.Vector3(0, 0, 0) },
        uMouseRadius: { value: 24.0 },
        uMouseStrength: { value: 4.0 },
        uHealth: { value: 0.98 },
        uColor: { value: new THREE.Color(0x181C24) },       // Sculptural carbon graphite
        uRimColor: { value: new THREE.Color(0xFFFFFF) },    // Platinum specular highlight
        uHealthColor: { value: new THREE.Color(0x38D9A9) }, // Muted clinical mint
        uRoughness: { value: 0.25 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });

    this.coreMesh = new THREE.Mesh(geo, this.coreMaterial);
    this.groupCore.add(this.coreMesh);

    // Architectural satellite meridian ring (representing deterministic AST boundary)
    const ringGeo = new THREE.TorusGeometry(28, 0.12, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x64748B,
      transparent: true,
      opacity: 0.35
    });
    this.coreRing = new THREE.Mesh(ringGeo, ringMat);
    this.coreRing.rotation.x = Math.PI / 3;
    this.groupCore.add(this.coreRing);

    this.scene.add(this.groupCore);
  }

  /* ==========================================================================
     CHAPTER 03: OBSERVE — Spatial topology network of dependencies
     ========================================================================== */
  private buildChapter03Observe(THREE: any) {
    this.groupObserve = new THREE.Group();

    const nodeCount = 42;
    const positions: number[] = [];
    const nodeCoords: any[] = [];

    // Generate cluster nodes representing dependencies
    for (let i = 0; i < nodeCount; i++) {
      const theta = (i / nodeCount) * Math.PI * 2;
      const radius = 18 + Math.sin(i * 3) * 12;
      const x = Math.cos(theta) * radius + (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 26;
      const z = Math.sin(theta) * radius + (Math.random() - 0.5) * 8;
      nodeCoords.push(new THREE.Vector3(x, y, z));
    }

    // Connect nodes with hairline filament branches
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (nodeCoords[i].distanceTo(nodeCoords[j]) < 18) {
          positions.push(nodeCoords[i].x, nodeCoords[i].y, nodeCoords[i].z);
          positions.push(nodeCoords[j].x, nodeCoords[j].y, nodeCoords[j].z);
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x686E7C,
      transparent: true,
      opacity: 0.35
    });
    this.groupObserve.add(new THREE.LineSegments(lineGeo, lineMat));

    // Node markers (monochrome dots)
    const nodeGeo = new THREE.BufferGeometry();
    const nodePos = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      nodePos[i * 3] = nodeCoords[i].x;
      nodePos[i * 3 + 1] = nodeCoords[i].y;
      nodePos[i * 3 + 2] = nodeCoords[i].z;
    }
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
    const nodeMat = new THREE.PointsMaterial({
      color: 0xF2F4F7,
      size: 2.2,
      transparent: true,
      opacity: 0.8
    });
    this.groupObserve.add(new THREE.Points(nodeGeo, nodeMat));

    this.scene.add(this.groupObserve);
  }

  /* ==========================================================================
     CHAPTER 04: EVIDENCE — Instanced repository manifest shards
     ========================================================================== */
  private buildChapter04Evidence(THREE: any, budget: any) {
    this.groupEvidence = new THREE.Group();
    this.instanceManager = new InstanceManager(THREE);
    const mesh = this.instanceManager.createEvidenceGrid(budget.maxInstances);
    this.groupEvidence.add(mesh);
    this.scene.add(this.groupEvidence);
  }

  /* ==========================================================================
     CHAPTER 05: VERIFY — Precision mathematical coordinate planes & laser grid
     ========================================================================== */
  private buildChapter05Verify(THREE: any) {
    this.groupVerify = new THREE.Group();

    // Verification scanning laser plane
    const planeGeo = new THREE.PlaneGeometry(60, 40, 32, 32);
    this.verifyMaterial = new THREE.ShaderMaterial({
      vertexShader: VerifyVert,
      fragmentShader: VerifyFrag,
      uniforms: {
        uTime: { value: 0 },
        uScanProgress: { value: 0.4 },
        uScanColor: { value: new THREE.Color(0xF2F4F7) },       // Pure off-white razor beam
        uVerifiedColor: { value: new THREE.Color(0x38D9A9) },   // Clinical status mint
        uAudio: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });

    const scanPlane = new THREE.Mesh(planeGeo, this.verifyMaterial);
    scanPlane.rotation.x = -Math.PI / 3;
    this.groupVerify.add(scanPlane);

    // Precision orthogonal Euclidean coordinate axes
    const axisMat = new THREE.LineBasicMaterial({ color: 0x4B5263, transparent: true, opacity: 0.4 });
    const axisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-35, 0, 0), new THREE.Vector3(35, 0, 0),
      new THREE.Vector3(0, -25, 0), new THREE.Vector3(0, 25, 0),
      new THREE.Vector3(0, 0, -25), new THREE.Vector3(0, 0, 25)
    ]);
    this.groupVerify.add(new THREE.LineSegments(axisGeo, axisMat));

    this.scene.add(this.groupVerify);
  }

  /* ==========================================================================
     CHAPTER 06: ATLAS — Large-scale spatial repository cosmos
     ========================================================================== */
  private buildChapter06Atlas(THREE: any) {
    this.groupAtlas = new THREE.Group();

    const clusterCount = 380;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(clusterCount * 3);
    const colors = new Float32Array(clusterCount * 3);

    // 4 galactic clusters (Coding, Research, Browser, Multi-Agent)
    const clusterCenters = [
      new THREE.Vector3(-25, 10, -10),
      new THREE.Vector3(25, 12, 5),
      new THREE.Vector3(-15, -15, 15),
      new THREE.Vector3(20, -12, -20)
    ];

    for (let i = 0; i < clusterCount; i++) {
      const center = clusterCenters[i % clusterCenters.length];
      const radius = 12 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      pos[i * 3 + 0] = center.x + radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = center.y + radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = center.z + radius * Math.cos(phi);

      // Subtle architectural monochrome with occasional data cobalt dot
      const isData = Math.random() > 0.85;
      colors[i * 3 + 0] = isData ? 0.23 : 0.95;
      colors[i * 3 + 1] = isData ? 0.36 : 0.96;
      colors[i * 3 + 2] = isData ? 0.86 : 0.97;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.65
    });

    this.groupAtlas.add(new THREE.Points(geo, mat));
    this.scene.add(this.groupAtlas);
  }

  /* ==========================================================================
     CHAPTER 07: COMPARE — Two distinct interacting geometric systems
     ========================================================================== */
  private buildChapter07Compare(THREE: any) {
    this.groupCompare = new THREE.Group();

    // System A: Faceted crystalline matrix (left)
    const sysAGeo = new THREE.OctahedronGeometry(12, 1);
    const sysAMat = new THREE.MeshBasicMaterial({
      color: 0xDDE2EC,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const sysAMesh = new THREE.Mesh(sysAGeo, sysAMat);
    sysAMesh.position.set(-18, 0, 0);
    this.groupCompare.add(sysAMesh);

    // System B: Organic filament ring cluster (right)
    const sysBGeo = new THREE.TorusGeometry(12, 0.2, 8, 48);
    const sysBMat = new THREE.MeshBasicMaterial({
      color: 0x3B5BDB, // Calibrated data cobalt
      transparent: true,
      opacity: 0.5
    });
    const sysBMesh = new THREE.Mesh(sysBGeo, sysBMat);
    sysBMesh.position.set(18, 0, 0);
    sysBMesh.rotation.x = Math.PI / 4;
    this.groupCompare.add(sysBMesh);

    // Spatial divider plane
    const divGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -22, 0), new THREE.Vector3(0, 22, 0)
    ]);
    const divMat = new THREE.LineDashedMaterial({
      color: 0x686E7C,
      dashSize: 1,
      gapSize: 1,
      transparent: true,
      opacity: 0.4
    });
    this.groupCompare.add(new THREE.Line(divGeo, divMat));

    this.scene.add(this.groupCompare);
  }

  /* ==========================================================================
     CHAPTER 08: STUDIO — Media planes & generative canvas textures
     ========================================================================== */
  private buildChapter08Studio(THREE: any) {
    this.groupStudio = new THREE.Group();

    // Procedural floating media plane with synthetic high-resolution code facet
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#090B0E';
      ctx.fillRect(0, 0, 512, 320);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeRect(8, 8, 496, 304);

      ctx.fillStyle = '#F2F4F7';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('PARADOX // AST_EXTRACTOR', 28, 48);

      ctx.fillStyle = '#A6ACB9';
      ctx.font = '13px monospace';
      ctx.fillText('function verifyManifest(repo, tree) {', 28, 90);
      ctx.fillText('  const ast = parseDeterministic(tree);', 28, 120);
      ctx.fillText('  const mcp = extractModelContextTools(ast);', 28, 150);
      ctx.fillText('  return { status: "VERIFIED", mcpCount: mcp.length };', 28, 180);
      ctx.fillText('}', 28, 210);

      ctx.fillStyle = '#38D9A9';
      ctx.fillText('// 0 exploits detected · Zero code executed', 28, 260);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const planeGeo = new THREE.PlaneGeometry(36, 22.5);
    const planeMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide
    });

    const mediaMesh = new THREE.Mesh(planeGeo, planeMat);
    mediaMesh.rotation.y = -0.2;
    this.groupStudio.add(mediaMesh);
    this.scene.add(this.groupStudio);
  }

  /* ==========================================================================
     CHAPTER 09: SIGNALS — Audio/data reactive mathematical ribbon field
     ========================================================================== */
  private buildChapter09Signals(THREE: any) {
    this.groupSignals = new THREE.Group();

    const segments = 60;
    this.signalsGeo = new THREE.PlaneGeometry(50, 18, segments, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xCFD5E1,
      wireframe: true,
      transparent: true,
      opacity: 0.38
    });

    this.signalsRibbon = new THREE.Mesh(this.signalsGeo, mat);
    this.signalsRibbon.rotation.x = -Math.PI / 4;
    this.groupSignals.add(this.signalsRibbon);
    this.scene.add(this.groupSignals);
  }

  /* ==========================================================================
     CHAPTER 10: TUNNEL — High-speed vector warp streaks
     ========================================================================== */
  private buildChapter10Tunnel(THREE: any) {
    this.groupTunnel = new THREE.Group();

    const streakCount = 90;
    const points: number[] = [];
    for (let i = 0; i < streakCount; i++) {
      const x = (Math.random() - 0.5) * 80;
      const y = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 120;
      const len = 12 + Math.random() * 20;

      points.push(x, y, z);
      points.push(x, y, z - len);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xF2F4F7,
      transparent: true,
      opacity: 0.5
    });

    this.tunnelLines = new THREE.LineSegments(geo, mat);
    this.groupTunnel.add(this.tunnelLines);
    this.scene.add(this.groupTunnel);
  }

  /* ==========================================================================
     CHAPTER 11: VOID — Minimalist resting light anchor
     ========================================================================== */
  private buildChapter11Void(THREE: any) {
    this.groupVoid = new THREE.Group();

    const beaconGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xF2F4F7,
      transparent: true,
      opacity: 0.9
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0, -20);
    this.groupVoid.add(beacon);

    this.scene.add(this.groupVoid);
  }

  private registerGlobalAPI() {
    window.paradoxWebGL = {
      isReady: true,
      setMode: (_mode: string) => {
        // Mode change hook
      },
      triggerImpulse: () => {
        // Impulse hook
      },
      getTelemetry: () => {
        const budget = this.governor.getBudget();
        return {
          rx: (this.manualRotation.x * (180 / Math.PI)).toFixed(1),
          ry: (this.manualRotation.y * (180 / Math.PI)).toFixed(1),
          fps: budget.fps,
          tier: budget.tier,
          dpr: budget.targetDpr.toFixed(2),
          mode: 'editorial'
        };
      }
    };
  }

  private bind() {
    window.addEventListener('resize', this.onResize, { passive: true });

    window.addEventListener('pointermove', (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.mouse.targetX = (e.clientX / w) * 2 - 1;
      this.mouse.targetY = -(e.clientY / h) * 2 + 1;

      if (this.mouseWorld) {
        this.mouseWorld.set(this.mouse.targetX * 30, this.mouse.targetY * 18, 0);
      }

      if (this.isDragging) {
        const deltaX = e.clientX - this.lastPointerX;
        const deltaY = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;

        this.angularVelocity.y = deltaX * 0.008;
        this.angularVelocity.x = deltaY * 0.008;

        this.manualRotation.y += this.angularVelocity.y;
        this.manualRotation.x += this.angularVelocity.x;
      }
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }, { passive: true });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      this.scrollProgress = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
    }, { passive: true });

    if (window.lenisInstance) {
      window.lenisInstance.on('scroll', ({ progress }: { progress: number }) => {
        this.scrollProgress = progress;
      });
    }

    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      if (this.isVisible && !this.animId) this.animate();
    });
  }

  private onResize = () => {
    if (!this.renderer || !this.camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.postProcessing) {
      this.postProcessing.setSize(w, h);
    }
  };

  /**
   * World A (Hero): Editorial Light Gallery (#EEF0F4)
   * Smoothly crossfades on scroll into World B (Deep Obsidian #050608)
   */
  private updateAtmosphere(p: number) {
    if (!this.scene || !this.currentBgColor) return;

    if (this.coreRing) {
      this.coreRing.rotation.z += 0.003;
    }

    if (p <= 0.05) {
      this.currentBgColor.copy(this.lightBgColor);
      this.scene.background.copy(this.currentBgColor);
      if (typeof document !== 'undefined' && !document.body.classList.contains('theme-light')) {
        document.body.classList.add('theme-light');
      }
      if (this.coreMaterial && this.coreMaterial.uniforms) {
        this.coreMaterial.uniforms.uColor.value.setHex(0x181C24);
        this.coreMaterial.uniforms.uRimColor.value.setHex(0xFFFFFF);
      }
    } else if (p < 0.16) {
      const t = (p - 0.05) / 0.11;
      const smoothT = t * t * (3 - 2 * t);
      this.currentBgColor.copy(this.lightBgColor).lerp(this.darkBgColor, smoothT);
      this.scene.background.copy(this.currentBgColor);

      if (typeof document !== 'undefined') {
        if (smoothT > 0.45 && document.body.classList.contains('theme-light')) {
          document.body.classList.remove('theme-light');
        } else if (smoothT <= 0.45 && !document.body.classList.contains('theme-light')) {
          document.body.classList.add('theme-light');
        }
      }

      if (this.coreMaterial && this.coreMaterial.uniforms) {
        this.coreMaterial.uniforms.uColor.value.setHex(smoothT > 0.5 ? 0x0A0D12 : 0x181C24);
        this.coreMaterial.uniforms.uRimColor.value.setHex(smoothT > 0.5 ? 0xCFD5E1 : 0xFFFFFF);
      }
    } else {
      this.currentBgColor.copy(this.darkBgColor);
      this.scene.background.copy(this.currentBgColor);
      if (typeof document !== 'undefined' && document.body.classList.contains('theme-light')) {
        document.body.classList.remove('theme-light');
      }
      if (this.coreMaterial && this.coreMaterial.uniforms) {
        this.coreMaterial.uniforms.uColor.value.setHex(0x0A0D12);
        this.coreMaterial.uniforms.uRimColor.value.setHex(0xCFD5E1);
      }
    }
  }

  /**
   * Evaluates visibility and opacity weight for each chapter based on scroll position.
   */
  private updateChapterWeights(p: number, _delta: number, elapsed: number, audio: number) {
    // Helper: smooth pulse weight in range [start, end]
    const calcWeight = (start: number, end: number, fadeDist = 0.04) => {
      if (p < start - fadeDist || p > end + fadeDist) return 0;
      if (p < start) return (p - (start - fadeDist)) / fadeDist;
      if (p > end) return ((end + fadeDist) - p) / fadeDist;
      return 1;
    };

    // 01: BOOT (0.00 - 0.08)
    const wBoot = calcWeight(0.00, 0.08);
    if (this.groupBoot) {
      this.groupBoot.visible = wBoot > 0.01;
      if (this.groupBoot.visible) {
        this.groupBoot.rotation.y = elapsed * 0.02;
      }
    }

    // 02: CORE (0.07 - 0.18)
    const wCore = calcWeight(0.07, 0.18);
    if (this.groupCore) {
      this.groupCore.visible = wCore > 0.01;
      if (this.groupCore.visible) {
        this.groupCore.scale.setScalar(wCore);
        this.groupCore.rotation.x = this.manualRotation.x + this.mouse.y * 0.05;
        this.groupCore.rotation.y = this.manualRotation.y + this.mouse.x * 0.05;
        if (this.coreMaterial && this.coreMaterial.uniforms) {
          this.coreMaterial.uniforms.uTime.value = elapsed;
          this.coreMaterial.uniforms.uAudio.value = audio;
          this.coreMaterial.uniforms.uMouse.value.copy(this.mouseWorld);
        }
      }
    }

    // 03: OBSERVE (0.16 - 0.28)
    const wObserve = calcWeight(0.16, 0.28);
    if (this.groupObserve) {
      this.groupObserve.visible = wObserve > 0.01;
      if (this.groupObserve.visible) {
        this.groupObserve.scale.setScalar(wObserve);
        this.groupObserve.rotation.y = elapsed * 0.08;
      }
    }

    // 04: EVIDENCE (0.26 - 0.42)
    const wEvidence = calcWeight(0.26, 0.42);
    if (this.groupEvidence) {
      this.groupEvidence.visible = wEvidence > 0.01;
      if (this.groupEvidence.visible && this.instanceManager) {
        this.groupEvidence.scale.setScalar(wEvidence);
        this.instanceManager.update(elapsed, audio);
      }
    }

    // 05: VERIFY (0.40 - 0.54)
    const wVerify = calcWeight(0.40, 0.54);
    if (this.groupVerify) {
      this.groupVerify.visible = wVerify > 0.01;
      if (this.groupVerify.visible) {
        this.groupVerify.scale.setScalar(wVerify);
        if (this.verifyMaterial && this.verifyMaterial.uniforms) {
          this.verifyMaterial.uniforms.uTime.value = elapsed;
          this.verifyMaterial.uniforms.uAudio.value = audio;
          this.verifyMaterial.uniforms.uScanProgress.value = (Math.sin(elapsed * 1.5) + 1.0) / 2.0;
        }
      }
    }

    // 06: ATLAS (0.52 - 0.64)
    const wAtlas = calcWeight(0.52, 0.64);
    if (this.groupAtlas) {
      this.groupAtlas.visible = wAtlas > 0.01;
      if (this.groupAtlas.visible) {
        this.groupAtlas.scale.setScalar(wAtlas);
        this.groupAtlas.rotation.y = elapsed * 0.04;
      }
    }

    // 07: COMPARE (0.62 - 0.72)
    const wCompare = calcWeight(0.62, 0.72);
    if (this.groupCompare) {
      this.groupCompare.visible = wCompare > 0.01;
      if (this.groupCompare.visible) {
        this.groupCompare.scale.setScalar(wCompare);
        this.groupCompare.children[0].rotation.y = elapsed * 0.4;
        this.groupCompare.children[1].rotation.x = elapsed * 0.3;
      }
    }

    // 08: STUDIO (0.70 - 0.80)
    const wStudio = calcWeight(0.70, 0.80);
    if (this.groupStudio) {
      this.groupStudio.visible = wStudio > 0.01;
      if (this.groupStudio.visible) {
        this.groupStudio.scale.setScalar(wStudio);
        this.groupStudio.position.y = Math.sin(elapsed * 0.8) * 2;
      }
    }

    // 09: SIGNALS (0.78 - 0.86)
    const wSignals = calcWeight(0.78, 0.86);
    if (this.groupSignals) {
      this.groupSignals.visible = wSignals > 0.01;
      if (this.groupSignals.visible && this.signalsGeo) {
        this.groupSignals.scale.setScalar(wSignals);
        // Deform ribbon mesh with live audio energy
        const pos = this.signalsGeo.attributes.position;
        const arr = pos.array;
        for (let i = 0; i < arr.length; i += 3) {
          const x = arr[i];
          arr[i + 2] = Math.sin(x * 0.2 + elapsed * 3.0) * (2.0 + audio * 6.0);
        }
        pos.needsUpdate = true;
      }
    }

    // 10: TUNNEL (0.84 - 0.96)
    const wTunnel = calcWeight(0.84, 0.96);
    if (this.groupTunnel) {
      this.groupTunnel.visible = wTunnel > 0.01;
      if (this.groupTunnel.visible && this.tunnelLines) {
        this.groupTunnel.scale.setScalar(wTunnel);
        this.tunnelLines.position.z = (elapsed * 60) % 80;
      }
    }

    // 11: VOID (0.94 - 1.00)
    const wVoid = calcWeight(0.94, 1.00);
    if (this.groupVoid) {
      this.groupVoid.visible = wVoid > 0.01;
      if (this.groupVoid.visible) {
        this.groupVoid.scale.setScalar(wVoid);
      }
    }
  }

  private animate = () => {
    if (!this.isVisible) {
      this.animId = 0;
      return;
    }

    const delta = this.clock ? this.clock.getDelta() : 0.016;
    const elapsed = this.clock ? this.clock.getElapsedTime() : 0;

    // 1. Frame budget & performance check
    const budget = this.governor.tick();
    const audioEnergy = sound.getAudioEnergy();

    // 2. Smooth pointer & camera parallax
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;
    this.cameraTimeline.setParallax(this.mouse.x, this.mouse.y);

    // 3. Inertia damping
    if (!this.isDragging) {
      this.angularVelocity.x *= 0.94;
      this.angularVelocity.y *= 0.94;
      this.manualRotation.x += this.angularVelocity.x;
      this.manualRotation.y += this.angularVelocity.y;
      if (!this.isReducedMotion) {
        this.manualRotation.y += 0.002;
      }
    }

    // 4. Evaluate Camera Timeline
    const camState = this.cameraTimeline.evaluate(this.scrollProgress);
    this.camera.position.set(camState.position[0], camState.position[1], camState.position[2]);
    this.camera.lookAt(camState.target[0], camState.target[1], camState.target[2]);
    if (this.camera.fov !== camState.fov) {
      this.camera.fov = camState.fov;
      this.camera.updateProjectionMatrix();
    }

    // 5. Update Atmosphere Tone & Dynamic Light/Dark Crossfade
    this.updateAtmosphere(this.scrollProgress);

    // 6. Update Chapter Scene Visibility & Distinct Geometry States
    this.updateChapterWeights(this.scrollProgress, delta, elapsed, audioEnergy);

    // 6. Master Post-Processing Pipeline Render
    if (this.postProcessing) {
      this.postProcessing.render(delta, budget.tier);
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animId = requestAnimationFrame(this.animate);
  };

  public destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
    this.envPipeline?.dispose();
    this.postProcessing?.dispose();
    this.renderer?.dispose();
    delete window.paradoxWebGL;
  }
}
