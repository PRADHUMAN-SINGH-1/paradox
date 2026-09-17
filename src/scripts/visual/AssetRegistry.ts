// PARADOX Visual Engine — Asset & Procedural Geometry Registry
// Provides custom BufferGeometries, canvas media textures, and instance templates beyond primitive shapes.

export class AssetRegistry {
  private THREE: any;
  private canvasTextureCache: Map<string, any> = new Map();

  constructor(threeInstance: any) {
    this.THREE = threeInstance;
  }

  /**
   * Scene 01 & 02: Procedural crystalline core polyhedron
   */
  public createCoreGeometry(): any {
    return new this.THREE.IcosahedronGeometry(20, 5);
  }

  /**
   * Scene 02: Satellite meridian boundary ring
   */
  public createMeridianRingGeometry(): any {
    return new this.THREE.TorusGeometry(28, 0.12, 8, 64);
  }

  /**
   * Scene 03: Topology dependency network coordinates and line segments
   */
  public createTopologyGeometry(): { lineGeometry: any; nodeGeometry: any; nodeCoords: any[] } {
    const nodeCount = 48;
    const positions: number[] = [];
    const nodeCoords: any[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const theta = (i / nodeCount) * Math.PI * 2;
      const radius = 20 + Math.sin(i * 3) * 12;
      const x = Math.cos(theta) * radius + (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 28;
      const z = Math.sin(theta) * radius + (Math.random() - 0.5) * 8;
      nodeCoords.push(new this.THREE.Vector3(x, y, z));
    }

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (nodeCoords[i].distanceTo(nodeCoords[j]) < 19) {
          positions.push(nodeCoords[i].x, nodeCoords[i].y, nodeCoords[i].z);
          positions.push(nodeCoords[j].x, nodeCoords[j].y, nodeCoords[j].z);
        }
      }
    }

    const lineGeo = new this.THREE.BufferGeometry();
    lineGeo.setAttribute('position', new this.THREE.Float32BufferAttribute(positions, 3));

    const nodeGeo = new this.THREE.BufferGeometry();
    const nodePos = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      nodePos[i * 3 + 0] = nodeCoords[i].x;
      nodePos[i * 3 + 1] = nodeCoords[i].y;
      nodePos[i * 3 + 2] = nodeCoords[i].z;
    }
    nodeGeo.setAttribute('position', new this.THREE.BufferAttribute(nodePos, 3));

    return { lineGeometry: lineGeo, nodeGeometry: nodeGeo, nodeCoords };
  }

  /**
   * Scene 05: Mathematical verification coordinate axes and laser plane
   */
  public createVerifyGeometry(): { laserPlane: any; axes: any } {
    const laserPlane = new this.THREE.PlaneGeometry(60, 40, 32, 32);
    const axes = new this.THREE.BufferGeometry().setFromPoints([
      new this.THREE.Vector3(-35, 0, 0), new this.THREE.Vector3(35, 0, 0),
      new this.THREE.Vector3(0, -25, 0), new this.THREE.Vector3(0, 25, 0),
      new this.THREE.Vector3(0, 0, -25), new this.THREE.Vector3(0, 0, 25)
    ]);
    return { laserPlane, axes };
  }

  /**
   * Scene 06: Volumetric galactic agent cosmos
   */
  public createCosmosGeometry(count = 380): any {
    const geo = new this.THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const clusterCenters = [
      new this.THREE.Vector3(-25, 10, -10),
      new this.THREE.Vector3(25, 12, 5),
      new this.THREE.Vector3(-15, -15, 15),
      new this.THREE.Vector3(20, -12, -20)
    ];

    for (let i = 0; i < count; i++) {
      const center = clusterCenters[i % clusterCenters.length];
      const radius = 12 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      pos[i * 3 + 0] = center.x + radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = center.y + radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = center.z + radius * Math.cos(phi);

      const isData = Math.random() > 0.85;
      colors[i * 3 + 0] = isData ? 0.23 : 0.95;
      colors[i * 3 + 1] = isData ? 0.36 : 0.96;
      colors[i * 3 + 2] = isData ? 0.86 : 0.97;
    }

    geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
    return geo;
  }

  /**
   * Scene 07: Dual comparison geometry structures
   */
  public createCompareGeometries(): { systemA: any; systemB: any; divider: any } {
    const systemA = new this.THREE.OctahedronGeometry(12, 1);
    const systemB = new this.THREE.TorusGeometry(12, 0.2, 8, 48);
    const divider = new this.THREE.BufferGeometry().setFromPoints([
      new this.THREE.Vector3(0, -22, 0), new this.THREE.Vector3(0, 22, 0)
    ]);
    return { systemA, systemB, divider };
  }

  /**
   * Scene 08: Live AST code media texture
   */
  public createStudioMediaTexture(): any {
    if (this.canvasTextureCache.has('studio_media')) {
      return this.canvasTextureCache.get('studio_media');
    }

    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#080A0D';
      ctx.fillRect(0, 0, 512, 320);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, 496, 304);

      ctx.fillStyle = '#F2F4F7';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('PARADOX // AST_EXTRACTOR // DETERMINISTIC_EVIDENCE', 24, 44);

      ctx.fillStyle = '#64748B';
      ctx.font = '12px monospace';
      ctx.fillText('----------------------------------------------------', 24, 66);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '13px monospace';
      ctx.fillText('async function verifyManifestProof(ast, tree) {', 24, 96);
      ctx.fillText('  const tools = extractModelContextProtocol(ast);', 24, 126);
      ctx.fillText('  const lockParity = sha256Integrity(tree.lockfile);', 24, 156);
      ctx.fillText('  const riskVectors = scanAstForShellExecution(ast);', 24, 186);
      ctx.fillText('  return { status: "VERIFIED", exploits: 0 };', 24, 216);
      ctx.fillText('}', 24, 246);

      ctx.fillStyle = '#38D9A9';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('✓ 0 shell exploits · Lockfile SHA256 verified', 24, 286);
    }

    const texture = new this.THREE.CanvasTexture(canvas);
    this.canvasTextureCache.set('studio_media', texture);
    return texture;
  }

  /**
   * Scene 09: Audio reactive ribbon geometry
   */
  public createSignalsWaveGeometry(segments = 60): any {
    return new this.THREE.PlaneGeometry(50, 18, segments, 12);
  }

  /**
   * Scene 10: Warp velocity corridor streaks
   */
  public createWarpCorridorGeometry(streakCount = 90): any {
    const points: number[] = [];
    for (let i = 0; i < streakCount; i++) {
      const x = (Math.random() - 0.5) * 80;
      const y = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 120;
      const len = 14 + Math.random() * 22;
      points.push(x, y, z);
      points.push(x, y, z - len);
    }
    const geo = new this.THREE.BufferGeometry();
    geo.setAttribute('position', new this.THREE.Float32BufferAttribute(points, 3));
    return geo;
  }

  /**
   * Scene 11: Solitary resting beacon
   */
  public createVoidBeaconGeometry(): any {
    return new this.THREE.SphereGeometry(1.2, 16, 16);
  }

  public dispose() {
    this.canvasTextureCache.forEach((tex) => tex.dispose());
    this.canvasTextureCache.clear();
  }
}
