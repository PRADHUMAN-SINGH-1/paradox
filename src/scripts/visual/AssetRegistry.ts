// PARADOX Visual Engine — Asset & Procedural Geometry Registry
// Provides custom BufferGeometries, canvas media textures, and instance templates beyond primitive shapes.
// Enforces Lusion-class bespoke procedural sculptures, full-viewport topology universes, and dual comparison organisms.

export class AssetRegistry {
  private THREE: any;
  private canvasTextureCache: Map<string, any> = new Map();

  constructor(threeInstance: any) {
    this.THREE = threeInstance;
  }

  /**
   * Scene 01 & 02: Bespoke Procedural Repository Sculpture
   * Layered architectural crystalline geometry with faceted vertex displacement,
   * chamfered facets, and inner AST structural lattice.
   * NOT a plain primitive IcosahedronGeometry.
   */
  public createCoreGeometry(): any {
    const base = new this.THREE.IcosahedronGeometry(22, 6);
    const pos = base.attributes.position;
    const vertex = new this.THREE.Vector3();
    const count = pos.count;

    // Procedural crystalline faceted carving
    for (let i = 0; i < count; i++) {
      vertex.fromBufferAttribute(pos, i);

      // Spherical coordinates
      const r = vertex.length();
      const theta = Math.atan2(vertex.y, vertex.x);
      const phi = Math.acos(vertex.z / r);

      // Multi-frequency harmonic crystal displacement
      const d1 = Math.sin(theta * 5.0) * Math.cos(phi * 4.0) * 2.8;
      const d2 = Math.sin(phi * 11.0 + theta * 3.0) * 1.4;
      const d3 = Math.cos((vertex.x + vertex.y) * 0.22) * 1.8;

      // Faceted planar quantization (carves razor sharp crystalline planes)
      const facetNoise = Math.floor((d1 + d2 + d3) * 1.8) / 1.8;
      const newRadius = r + facetNoise;

      vertex.normalize().multiplyScalar(newRadius);
      pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    base.computeVertexNormals();
    return base;
  }

  /**
   * Scene 01 & 02: Inner structural AST nucleus cage
   */
  public createCoreInnerNucleus(): any {
    const base = new this.THREE.OctahedronGeometry(11, 2);
    base.computeVertexNormals();
    return base;
  }

  /**
   * Scene 02: Architectural meridian datum ring (fine razor-edge precision)
   */
  public createMeridianRingGeometry(): any {
    const segments = 128;
    const points: any[] = [];
    const radius = 32;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new this.THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
    }
    return new this.THREE.BufferGeometry().setFromPoints(points);
  }

  /**
   * Scene 03: FULL-VIEWPORT TOPOLOGY WORLD
   * Generates a massive spatial 3D dependency universe with 120+ nodes
   * spanning from z = -140 to z = +80, grouped into dependency clusters.
   */
  public createTopologyGeometry(): { lineGeometry: any; nodeGeometry: any; nodeCoords: any[] } {
    const nodeCount = 140;
    const positions: number[] = [];
    const nodeCoords: any[] = [];

    // 5 Major Architectural Dependency Clusters (Core, Framework, Tools, MCP, Runtime)
    const clusterCenters = [
      new this.THREE.Vector3(0, 0, 0),         // Root Engine
      new this.THREE.Vector3(-45, 20, -40),    // AST Parser & Lexer
      new this.THREE.Vector3(45, -18, -30),    // Manifest & Lockfile Proofs
      new this.THREE.Vector3(-30, -32, 20),    // MCP Capability Interfaces
      new this.THREE.Vector3(35, 28, 30)       // Static Sandbox Boundary
    ];

    for (let i = 0; i < nodeCount; i++) {
      const cluster = clusterCenters[i % clusterCenters.length];
      const spread = 22 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      const x = cluster.x + spread * Math.sin(phi) * Math.cos(theta);
      const y = cluster.y + spread * Math.sin(phi) * Math.sin(theta);
      const z = cluster.z + spread * Math.cos(phi);

      nodeCoords.push(new this.THREE.Vector3(x, y, z));
    }

    // Connect nodes within clusters and bridge inter-cluster dependencies
    for (let i = 0; i < nodeCount; i++) {
      // Connect to nearest neighbor within cluster
      let nearestDist = Infinity;
      let nearestIdx = -1;

      for (let j = 0; j < nodeCount; j++) {
        if (i === j) continue;
        const d = nodeCoords[i].distanceTo(nodeCoords[j]);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = j;
        }
        // Additional secondary edge for complex graph density
        if (d < 16 && Math.random() > 0.65) {
          positions.push(nodeCoords[i].x, nodeCoords[i].y, nodeCoords[i].z);
          positions.push(nodeCoords[j].x, nodeCoords[j].y, nodeCoords[j].z);
        }
      }

      if (nearestIdx !== -1) {
        positions.push(nodeCoords[i].x, nodeCoords[i].y, nodeCoords[i].z);
        positions.push(nodeCoords[nearestIdx].x, nodeCoords[nearestIdx].y, nodeCoords[nearestIdx].z);
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
    const laserPlane = new this.THREE.PlaneGeometry(80, 50, 48, 48);
    const axes = new this.THREE.BufferGeometry().setFromPoints([
      new this.THREE.Vector3(-45, 0, 0), new this.THREE.Vector3(45, 0, 0),
      new this.THREE.Vector3(0, -32, 0), new this.THREE.Vector3(0, 32, 0),
      new this.THREE.Vector3(0, 0, -32), new this.THREE.Vector3(0, 0, 32)
    ]);
    return { laserPlane, axes };
  }

  /**
   * Scene 06: Volumetric galactic agent cosmos
   */
  public createCosmosGeometry(count = 520): any {
    const geo = new this.THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const clusterCenters = [
      new this.THREE.Vector3(-35, 14, -15),
      new this.THREE.Vector3(35, 16, 10),
      new this.THREE.Vector3(-22, -22, 22),
      new this.THREE.Vector3(26, -18, -26)
    ];

    for (let i = 0; i < count; i++) {
      const center = clusterCenters[i % clusterCenters.length];
      const radius = 16 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      pos[i * 3 + 0] = center.x + radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = center.y + radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = center.z + radius * Math.cos(phi);

      const isData = Math.random() > 0.82;
      colors[i * 3 + 0] = isData ? 0.23 : 0.95;
      colors[i * 3 + 1] = isData ? 0.36 : 0.96;
      colors[i * 3 + 2] = isData ? 0.86 : 0.97;
    }

    geo.setAttribute('position', new this.THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
    return geo;
  }

  /**
   * Scene 07: Dual Comparison Geometries (Two distinct visual organisms)
   * System A: Pristine, dense, highly structured crystalline organism (High Health / Maintained)
   * System B: Fragmented, erratic, asymmetrical organism (High Risk / Drift)
   */
  public createCompareGeometries(): { systemA: any; systemB: any; divider: any } {
    // Organism A: Crystalline Polyhedron (Solid, structured)
    const systemA = new this.THREE.IcosahedronGeometry(13, 2);

    // Organism B: Fragmented Toroidal Lattice (Erratic, unmaintained)
    const systemB = new this.THREE.TorusKnotGeometry(9, 2.4, 64, 16, 2, 5);

    const dividerPoints = [
      new this.THREE.Vector3(0, -35, 0),
      new this.THREE.Vector3(0, 35, 0)
    ];
    const divider = new this.THREE.BufferGeometry().setFromPoints(dividerPoints);

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
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#06080B';
      ctx.fillRect(0, 0, 1024, 640);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, 992, 608);

      ctx.fillStyle = '#F2F4F7';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('PARADOX // AST_EXTRACTOR // DETERMINISTIC_EVIDENCE', 48, 72);

      ctx.fillStyle = '#64748B';
      ctx.font = '16px monospace';
      ctx.fillText('----------------------------------------------------------------------', 48, 110);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '20px monospace';
      ctx.fillText('async function verifyManifestProof(ast, tree) {', 48, 160);
      ctx.fillText('  const tools = extractModelContextProtocol(ast);', 48, 205);
      ctx.fillText('  const lockParity = sha256Integrity(tree.lockfile);', 48, 250);
      ctx.fillText('  const riskVectors = scanAstForShellExecution(ast);', 48, 295);
      ctx.fillText('  return { status: "VERIFIED", exploits: 0, lockParity };', 48, 340);
      ctx.fillText('}', 48, 385);

      ctx.fillStyle = '#38D9A9';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('✓ SHA256 integrity validated [OK]', 48, 460);
      ctx.fillText('✓ 0 dynamic shell execution vectors detected', 48, 505);
      ctx.fillText('✓ Static sandbox boundary confirmed immutable', 48, 550);
    }

    const texture = new this.THREE.CanvasTexture(canvas);
    this.canvasTextureCache.set('studio_media', texture);
    return texture;
  }

  /**
   * Scene 09: Audio reactive ribbon geometry
   */
  public createSignalsWaveGeometry(segments = 80): any {
    return new this.THREE.PlaneGeometry(64, 24, segments, 16);
  }

  /**
   * Scene 10: Warp velocity corridor streaks
   */
  public createWarpCorridorGeometry(streakCount = 140): any {
    const points: number[] = [];
    for (let i = 0; i < streakCount; i++) {
      const x = (Math.random() - 0.5) * 110;
      const y = (Math.random() - 0.5) * 110;
      const z = (Math.random() - 0.5) * 160;
      const len = 20 + Math.random() * 35;
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
    return new this.THREE.OctahedronGeometry(2.2, 0);
  }

  public dispose() {
    this.canvasTextureCache.forEach((tex) => tex.dispose());
    this.canvasTextureCache.clear();
  }
}
