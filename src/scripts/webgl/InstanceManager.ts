// PARADOX Instance Manager
// Governs dynamic InstancedMesh creation, spatial layouts, and per-instance metrics.

import { ProductDataNormalizer, type NormalizedVisualMetrics } from './ProductDataNormalizer.ts';
import { ProductVisualMapper } from './ProductVisualMapper.ts';
import { EvidenceVert, EvidenceFrag } from '../shaders/shaderIndex.ts';

export class InstanceManager {
  private THREE: any;
  private instancedMesh: any = null;
  private count: number = 0;
  private dummyMatrix: any;
  private normalizedData: NormalizedVisualMetrics[] = [];

  constructor(threeInstance: any) {
    this.THREE = threeInstance;
    this.dummyMatrix = new this.THREE.Object3D();
  }

  /**
   * Builds an InstancedMesh based on real data and performance limits.
   */
  public createEvidenceGrid(maxAllowed: number = 100): any {
    const rawTargets = ProductDataNormalizer.getDefaultEvidenceManifest();
    this.normalizedData = ProductDataNormalizer.normalizeCollection(rawTargets);

    // Limit instance count to the budget
    const targetCount = Math.min(this.normalizedData.length * 8, maxAllowed);
    this.count = targetCount;

    // High-precision beveled box geometry for repository chips
    const geometry = new this.THREE.BoxGeometry(3.5, 2.2, 0.4);

    // Dynamic instanced attributes
    const instanceColors = new Float32Array(this.count * 3);
    const healthArray = new Float32Array(this.count);
    const riskArray = new Float32Array(this.count);
    const freshnessArray = new Float32Array(this.count);

    // Custom Shader Material using Paradox Evidence Shaders
    const material = new this.THREE.ShaderMaterial({
      vertexShader: EvidenceVert,
      fragmentShader: EvidenceFrag,
      uniforms: {
        uTime: { value: 0 },
        uAudio: { value: 0 },
        uVoidColor: { value: new this.THREE.Color(0x080A0D) },
        uHoveredId: { value: new this.THREE.Vector3(-1, -1, -1) },
        uProgress: { value: 0 },
        uHover: { value: 0 }
      },
      transparent: true,
      depthWrite: true,
      side: this.THREE.DoubleSide
    });

    this.instancedMesh = new this.THREE.InstancedMesh(geometry, material, this.count);

    // Arrange chips in a helical data cloud around origin
    const radiusBase = 22;
    for (let i = 0; i < this.count; i++) {
      const dataItem = this.normalizedData[i % this.normalizedData.length];
      const visual = ProductVisualMapper.mapToVisual(dataItem);

      const phi = (i / this.count) * Math.PI * 4;
      const theta = (i / this.count) * Math.PI * 2;
      const r = radiusBase + Math.sin(phi * 2) * 5;

      const x = Math.cos(theta) * r;
      const y = (i / this.count - 0.5) * 35;
      const z = Math.sin(theta) * r;

      this.dummyMatrix.position.set(x, y, z);
      this.dummyMatrix.scale.set(visual.scale, visual.scale, visual.scale);
      this.dummyMatrix.lookAt(0, y * 0.2, 0);
      this.dummyMatrix.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummyMatrix.matrix);

      // Set attribute values
      instanceColors[i * 3 + 0] = visual.rimColor[0];
      instanceColors[i * 3 + 1] = visual.rimColor[1];
      instanceColors[i * 3 + 2] = visual.rimColor[2];

      healthArray[i] = dataItem.healthRatio;
      riskArray[i] = dataItem.riskFactor;
      freshnessArray[i] = dataItem.freshness;
    }

    geometry.setAttribute('aInstanceColor', new this.THREE.InstancedBufferAttribute(instanceColors, 3));
    geometry.setAttribute('aHealth', new this.THREE.InstancedBufferAttribute(healthArray, 1));
    geometry.setAttribute('aRisk', new this.THREE.InstancedBufferAttribute(riskArray, 1));
    geometry.setAttribute('aFreshness', new this.THREE.InstancedBufferAttribute(freshnessArray, 1));

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    return this.instancedMesh;
  }

  /**
   * Updates shader uniforms per frame
   */
  public update(time: number, audio: number) {
    if (this.instancedMesh && this.instancedMesh.material.uniforms) {
      this.instancedMesh.material.uniforms.uTime.value = time;
      this.instancedMesh.material.uniforms.uAudio.value = audio;
      this.instancedMesh.rotation.y = time * 0.04;
    }
  }

  public getMesh(): any {
    return this.instancedMesh;
  }
}
