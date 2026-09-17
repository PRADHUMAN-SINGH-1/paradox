// PARADOX Visual Engine — Scene Registry
// Constructs and manages the 11 distinct physical 3D scene worlds, materials, and runtime updates.
// Enforces full-viewport WebGL worlds, custom procedural sculptures, and spatial depth layering.

import { CoreVert, CoreFrag, VerifyVert, VerifyFrag } from '../shaders/shaderIndex.ts';
import { AssetRegistry } from './AssetRegistry.ts';
import { SceneTransition } from './SceneTransition.ts';
import { InstanceManager } from '../webgl/InstanceManager.ts';

export class SceneRegistry {
  private THREE: any;
  private rootScene: any;
  private assets: AssetRegistry;
  private instanceManager: InstanceManager | null = null;

  // 11 Scene Groups
  private groupOrigin: any = null;
  private groupCore: any = null;
  private groupTopology: any = null;
  private groupEvidence: any = null;
  private groupVerify: any = null;
  private groupAtlas: any = null;
  private groupCompare: any = null;
  private groupStudio: any = null;
  private groupSignals: any = null;
  private groupTunnel: any = null;
  private groupVoid: any = null;

  // Active Dynamic Objects & Materials
  private coreMaterial: any = null;
  private coreMesh: any = null;
  private coreInnerCage: any = null;
  private coreRing: any = null;
  private verifyMaterial: any = null;
  private signalsGeo: any = null;
  private signalsMesh: any = null;
  private tunnelLines: any = null;
  private compareSystemA: any = null;
  private compareSystemB: any = null;
  private topologyLines: any = null;
  private topologyNodes: any = null;

  constructor(threeInstance: any, rootScene: any, assets: AssetRegistry, budget: any) {
    this.THREE = threeInstance;
    this.rootScene = rootScene;
    this.assets = assets;

    this.buildAllScenes(budget);
  }

  public getCoreMaterial(): any {
    return this.coreMaterial;
  }

  public getInstanceManager(): InstanceManager | null {
    return this.instanceManager;
  }

  private buildAllScenes(budget: any) {
    this.buildScene01Origin();
    this.buildScene02Core();
    this.buildScene03Topology();
    this.buildScene04Evidence(budget);
    this.buildScene05Verify();
    this.buildScene06Atlas();
    this.buildScene07Compare();
    this.buildScene08Studio();
    this.buildScene09Signals();
    this.buildScene10Tunnel();
    this.buildScene11Void();
  }

  // 01: ORIGIN — Editorial Light Gallery: bespoke visual sculpture & spatial dust
  private buildScene01Origin() {
    this.groupOrigin = new this.THREE.Group();

    // Ambient spatial dust
    const count = 160;
    const geo = new this.THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i + 0] = (Math.random() - 0.5) * 260;
      pos[i + 1] = (Math.random() - 0.5) * 160;
      pos[i + 2] = (Math.random() - 0.5) * 100;
    }
    geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
    const mat = new this.THREE.PointsMaterial({
      color: 0x64748B,
      size: 1.6,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    this.groupOrigin.add(new this.THREE.Points(geo, mat));

    this.rootScene.add(this.groupOrigin);
  }

  // 02: CORE — Bespoke Procedural Repository Sculpture (multi-layered BufferGeometry)
  private buildScene02Core() {
    this.groupCore = new this.THREE.Group();

    // 1. Procedural Crystalline Shell
    const geo = this.assets.createCoreGeometry();
    this.coreMaterial = new this.THREE.ShaderMaterial({
      vertexShader: CoreVert,
      fragmentShader: CoreFrag,
      uniforms: {
        uTime: { value: 0 },
        uAudio: { value: 0 },
        uDisplacement: { value: 0.16 },
        uMouse: { value: new this.THREE.Vector3(0, 0, 0) },
        uMouseRadius: { value: 28.0 },
        uMouseStrength: { value: 4.5 },
        uHealth: { value: 0.98 },
        uColor: { value: new this.THREE.Color(0x181C24) },       // Sculptural carbon graphite
        uRimColor: { value: new this.THREE.Color(0xFFFFFF) },    // Platinum specular highlight
        uHealthColor: { value: new this.THREE.Color(0x38D9A9) }, // Clinical mint
        uRoughness: { value: 0.25 }
      },
      transparent: true,
      side: this.THREE.DoubleSide
    });

    this.coreMesh = new this.THREE.Mesh(geo, this.coreMaterial);
    this.groupCore.add(this.coreMesh);

    // 2. Inner Structural AST Nucleus Cage
    const innerGeo = this.assets.createCoreInnerNucleus();
    const innerMat = new this.THREE.MeshBasicMaterial({
      color: 0x94A3B8,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    this.coreInnerCage = new this.THREE.Mesh(innerGeo, innerMat);
    this.groupCore.add(this.coreInnerCage);

    // 3. Architectural Meridian Datum Ring
    const ringGeo = this.assets.createMeridianRingGeometry();
    const ringMat = new this.THREE.LineBasicMaterial({
      color: 0x94A3B8,
      transparent: true,
      opacity: 0.3
    });
    this.coreRing = new this.THREE.LineLoop(ringGeo, ringMat);
    this.coreRing.rotation.x = Math.PI / 3;
    this.groupCore.add(this.coreRing);

    this.rootScene.add(this.groupCore);
  }

  // 03: TOPOLOGY — Full-viewport 3D dependency world
  private buildScene03Topology() {
    this.groupTopology = new this.THREE.Group();
    const { lineGeometry, nodeGeometry } = this.assets.createTopologyGeometry();

    const lineMat = new this.THREE.LineBasicMaterial({
      color: 0x3B5BDB,
      transparent: true,
      opacity: 0.42
    });
    this.topologyLines = new this.THREE.LineSegments(lineGeometry, lineMat);
    this.groupTopology.add(this.topologyLines);

    const nodeMat = new this.THREE.PointsMaterial({
      color: 0xF2F4F7,
      size: 2.8,
      transparent: true,
      opacity: 0.85
    });
    this.topologyNodes = new this.THREE.Points(nodeGeometry, nodeMat);
    this.groupTopology.add(this.topologyNodes);

    this.rootScene.add(this.groupTopology);
  }

  // 04: EVIDENCE — Instanced manifest shards
  private buildScene04Evidence(budget: any) {
    this.groupEvidence = new this.THREE.Group();
    this.instanceManager = new InstanceManager(this.THREE);
    const mesh = this.instanceManager.createEvidenceGrid(budget.maxInstances);
    this.groupEvidence.add(mesh);
    this.rootScene.add(this.groupEvidence);
  }

  // 05: VERIFY — Euclidean coordinate axes and laser scanning plane
  private buildScene05Verify() {
    this.groupVerify = new this.THREE.Group();
    const { laserPlane, axes } = this.assets.createVerifyGeometry();

    this.verifyMaterial = new this.THREE.ShaderMaterial({
      vertexShader: VerifyVert,
      fragmentShader: VerifyFrag,
      uniforms: {
        uTime: { value: 0 },
        uScanProgress: { value: 0.4 },
        uScanColor: { value: new this.THREE.Color(0xF2F4F7) },
        uVerifiedColor: { value: new this.THREE.Color(0x38D9A9) },
        uAudio: { value: 0 }
      },
      transparent: true,
      side: this.THREE.DoubleSide
    });

    const planeMesh = new this.THREE.Mesh(laserPlane, this.verifyMaterial);
    planeMesh.rotation.x = -Math.PI / 3;
    this.groupVerify.add(planeMesh);

    const axisMat = new this.THREE.LineBasicMaterial({ color: 0x4B5263, transparent: true, opacity: 0.45 });
    this.groupVerify.add(new this.THREE.LineSegments(axes, axisMat));

    this.rootScene.add(this.groupVerify);
  }

  // 06: ATLAS — Galactic repository cosmos
  private buildScene06Atlas() {
    this.groupAtlas = new this.THREE.Group();
    const geo = this.assets.createCosmosGeometry(520);
    const mat = new this.THREE.PointsMaterial({
      size: 2.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.72
    });
    this.groupAtlas.add(new this.THREE.Points(geo, mat));
    this.rootScene.add(this.groupAtlas);
  }

  // 07: COMPARE — Dual visual organisms
  private buildScene07Compare() {
    this.groupCompare = new this.THREE.Group();
    const { systemA, systemB, divider } = this.assets.createCompareGeometries();

    // Organism A: Structured Polyhedral System
    const matA = new this.THREE.MeshBasicMaterial({ color: 0xDDE2EC, wireframe: true, transparent: true, opacity: 0.55 });
    this.compareSystemA = new this.THREE.Mesh(systemA, matA);
    this.compareSystemA.position.set(-24, 0, 0);
    this.groupCompare.add(this.compareSystemA);

    // Organism B: Fractured Torus Knot System
    const matB = new this.THREE.MeshBasicMaterial({ color: 0x3B5BDB, wireframe: true, transparent: true, opacity: 0.6 });
    this.compareSystemB = new this.THREE.Mesh(systemB, matB);
    this.compareSystemB.position.set(24, 0, 0);
    this.groupCompare.add(this.compareSystemB);

    const divMat = new this.THREE.LineDashedMaterial({ color: 0x686E7C, dashSize: 1, gapSize: 1, transparent: true, opacity: 0.4 });
    this.groupCompare.add(new this.THREE.Line(divider, divMat));

    this.rootScene.add(this.groupCompare);
  }

  // 08: STUDIO — Live AST code media canvas plane
  private buildScene08Studio() {
    this.groupStudio = new this.THREE.Group();
    const texture = this.assets.createStudioMediaTexture();
    const planeGeo = new this.THREE.PlaneGeometry(42, 26);
    const planeMat = new this.THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.88,
      side: this.THREE.DoubleSide
    });
    const mediaMesh = new this.THREE.Mesh(planeGeo, planeMat);
    mediaMesh.rotation.y = -0.15;
    this.groupStudio.add(mediaMesh);
    this.rootScene.add(this.groupStudio);
  }

  // 09: SIGNALS — Audio reactive mathematical wave ribbons
  private buildScene09Signals() {
    this.groupSignals = new this.THREE.Group();
    this.signalsGeo = this.assets.createSignalsWaveGeometry(80);
    const mat = new this.THREE.MeshBasicMaterial({
      color: 0xCFD5E1,
      wireframe: true,
      transparent: true,
      opacity: 0.42
    });
    this.signalsMesh = new this.THREE.Mesh(this.signalsGeo, mat);
    this.signalsMesh.rotation.x = -Math.PI / 4;
    this.groupSignals.add(this.signalsMesh);
    this.rootScene.add(this.groupSignals);
  }

  // 10: TUNNEL — Warp velocity corridor
  private buildScene10Tunnel() {
    this.groupTunnel = new this.THREE.Group();
    const geo = this.assets.createWarpCorridorGeometry(140);
    const mat = new this.THREE.LineBasicMaterial({
      color: 0xF2F4F7,
      transparent: true,
      opacity: 0.55
    });
    this.tunnelLines = new this.THREE.LineSegments(geo, mat);
    this.groupTunnel.add(this.tunnelLines);
    this.rootScene.add(this.groupTunnel);
  }

  // 11: VOID — Solitary resting beacon
  private buildScene11Void() {
    this.groupVoid = new this.THREE.Group();
    const geo = this.assets.createVoidBeaconGeometry();
    const mat = new this.THREE.MeshBasicMaterial({
      color: 0xF2F4F7,
      transparent: true,
      opacity: 0.95
    });
    const beacon = new this.THREE.Mesh(geo, mat);
    beacon.position.set(0, 0, -25);
    this.groupVoid.add(beacon);
    this.rootScene.add(this.groupVoid);
  }

  /**
   * Per-frame update orchestrating dynamic geometry, uniforms, and visibility weights
   */
  public update(
    p: number,
    _delta: number,
    elapsed: number,
    audio: number,
    mouseWorld: any,
    manualRotation: { x: number; y: number },
    mouse: { x: number; y: number }
  ) {
    const calc = SceneTransition.calculateSceneWeight;

    // 01: ORIGIN (0.00 - 0.12)
    const wOrigin = calc(p, 0.00, 0.10);
    if (this.groupOrigin) {
      this.groupOrigin.visible = wOrigin > 0.01;
      if (this.groupOrigin.visible) {
        this.groupOrigin.rotation.y = elapsed * 0.02;
      }
    }

    // 02: CORE (Visible from 0.00 up to 0.22)
    // In Scene 01 (Editorial Gallery), the Core sculpture is already present at p = 0!
    const wCore = calc(p, 0.00, 0.20, 0.08);
    if (this.groupCore) {
      this.groupCore.visible = wCore > 0.01;
      if (this.groupCore.visible) {
        this.groupCore.scale.setScalar(Math.max(0.7, wCore));
        this.groupCore.rotation.x = manualRotation.x + mouse.y * 0.06;
        this.groupCore.rotation.y = manualRotation.y + mouse.x * 0.06 + elapsed * 0.05;

        if (this.coreInnerCage) {
          this.coreInnerCage.rotation.x = -elapsed * 0.12;
          this.coreInnerCage.rotation.y = elapsed * 0.18;
        }

        if (this.coreRing) {
          this.coreRing.rotation.z += 0.004;
        }

        if (this.coreMaterial && this.coreMaterial.uniforms) {
          this.coreMaterial.uniforms.uTime.value = elapsed;
          this.coreMaterial.uniforms.uAudio.value = audio;
          this.coreMaterial.uniforms.uMouse.value.copy(mouseWorld);
        }
      }
    }

    // 03: TOPOLOGY (0.16 - 0.32) — Full-viewport dependency world
    const wTopology = calc(p, 0.16, 0.30, 0.06);
    if (this.groupTopology) {
      this.groupTopology.visible = wTopology > 0.01;
      if (this.groupTopology.visible) {
        this.groupTopology.scale.setScalar(wTopology);
        this.groupTopology.rotation.y = elapsed * 0.06;
        if (this.topologyLines) {
          this.topologyLines.rotation.x = Math.sin(elapsed * 0.2) * 0.04;
        }
      }
    }

    // 04: EVIDENCE (0.28 - 0.44)
    const wEvidence = calc(p, 0.28, 0.42, 0.06);
    if (this.groupEvidence) {
      this.groupEvidence.visible = wEvidence > 0.01;
      if (this.groupEvidence.visible && this.instanceManager) {
        this.groupEvidence.scale.setScalar(wEvidence);
        this.instanceManager.update(elapsed, audio);
      }
    }

    // 05: VERIFY (0.40 - 0.54)
    const wVerify = calc(p, 0.40, 0.54, 0.06);
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

    // 06: ATLAS (0.52 - 0.65)
    const wAtlas = calc(p, 0.52, 0.64, 0.06);
    if (this.groupAtlas) {
      this.groupAtlas.visible = wAtlas > 0.01;
      if (this.groupAtlas.visible) {
        this.groupAtlas.scale.setScalar(wAtlas);
        this.groupAtlas.rotation.y = elapsed * 0.04;
      }
    }

    // 07: COMPARE (0.62 - 0.72) — Dual Organisms orbit and move together
    const wCompare = calc(p, 0.62, 0.72, 0.05);
    if (this.groupCompare) {
      this.groupCompare.visible = wCompare > 0.01;
      if (this.groupCompare.visible) {
        this.groupCompare.scale.setScalar(wCompare);
        // Normalized progress through comparison chapter
        const compareProg = Math.max(0, Math.min(1, (p - 0.62) / 0.10));
        const separation = 24 * (1 - compareProg * 0.65); // Move together

        if (this.compareSystemA) {
          this.compareSystemA.position.x = -separation;
          this.compareSystemA.rotation.y = elapsed * 0.4;
          this.compareSystemA.rotation.z = Math.sin(elapsed * 0.3) * 0.2;
        }
        if (this.compareSystemB) {
          this.compareSystemB.position.x = separation;
          this.compareSystemB.rotation.x = elapsed * 0.35;
          this.compareSystemB.rotation.y = elapsed * 0.25;
        }
      }
    }

    // 08: STUDIO (0.70 - 0.80)
    const wStudio = calc(p, 0.70, 0.80, 0.05);
    if (this.groupStudio) {
      this.groupStudio.visible = wStudio > 0.01;
      if (this.groupStudio.visible) {
        this.groupStudio.scale.setScalar(wStudio);
        this.groupStudio.position.y = Math.sin(elapsed * 0.8) * 1.5;
        this.groupStudio.rotation.y = -0.15 + Math.sin(elapsed * 0.4) * 0.05;
      }
    }

    // 09: SIGNALS (0.78 - 0.88)
    const wSignals = calc(p, 0.78, 0.88, 0.05);
    if (this.groupSignals) {
      this.groupSignals.visible = wSignals > 0.01;
      if (this.groupSignals.visible && this.signalsGeo) {
        this.groupSignals.scale.setScalar(wSignals);
        const pos = this.signalsGeo.attributes.position;
        const arr = pos.array;
        for (let i = 0; i < arr.length; i += 3) {
          const x = arr[i];
          const y = arr[i + 1];
          arr[i + 2] = Math.sin(x * 0.18 + elapsed * 3.2) * Math.cos(y * 0.15 + elapsed * 1.8) * (2.5 + audio * 7.0);
        }
        pos.needsUpdate = true;
      }
    }

    // 10: TUNNEL (0.86 - 0.96)
    const wTunnel = calc(p, 0.86, 0.96, 0.05);
    if (this.groupTunnel) {
      this.groupTunnel.visible = wTunnel > 0.01;
      if (this.groupTunnel.visible && this.tunnelLines) {
        this.groupTunnel.scale.setScalar(wTunnel);
        this.tunnelLines.position.z = (elapsed * 75) % 90;
      }
    }

    // 11: VOID (0.94 - 1.00)
    const wVoid = calc(p, 0.94, 1.00, 0.04);
    if (this.groupVoid) {
      this.groupVoid.visible = wVoid > 0.01;
      if (this.groupVoid.visible) {
        this.groupVoid.scale.setScalar(wVoid);
        this.groupVoid.rotation.y = elapsed * 0.1;
      }
    }
  }

  public dispose() {
    this.assets.dispose();
  }
}
