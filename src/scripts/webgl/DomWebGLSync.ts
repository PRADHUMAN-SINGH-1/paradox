// PARADOX DOM-WebGL Synchronizer
// Computes unprojected 3D coordinate anchors matching real DOM element bounding boxes.

export class DomWebGLSync {
  private THREE: any;
  private camera: any;

  constructor(threeInstance: any, camera: any) {
    this.THREE = threeInstance;
    this.camera = camera;
  }

  /**
   * Projects an HTML element's bounding rect into 3D world coordinates at a given Z plane.
   */
  public getElementWorldCoordinates(
    element: HTMLElement | null,
    targetZ: number = 0
  ): { x: number; y: number; width: number; height: number } | null {
    if (!element || typeof window === 'undefined') return null;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Normalized Device Coordinates (-1 to +1)
    const ndcX = (centerX / window.innerWidth) * 2 - 1;
    const ndcY = -(centerY / window.innerHeight) * 2 + 1;

    // Unproject using camera projection and target Z depth
    const vec = new this.THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(this.camera);

    const dir = vec.sub(this.camera.position).normalize();
    const distance = (targetZ - this.camera.position.z) / dir.z;
    const worldPos = this.camera.position.clone().add(dir.multiplyScalar(distance));

    // Also compute scale in world units
    const cornerNdcX = ((rect.left + rect.width) / window.innerWidth) * 2 - 1;
    const cornerVec = new this.THREE.Vector3(cornerNdcX, ndcY, 0.5);
    cornerVec.unproject(this.camera);
    const cornerDir = cornerVec.sub(this.camera.position).normalize();
    const cornerDist = (targetZ - this.camera.position.z) / cornerDir.z;
    const cornerWorld = this.camera.position.clone().add(cornerDir.multiplyScalar(cornerDist));
    const worldWidth = Math.abs(cornerWorld.x - worldPos.x) * 2;

    return {
      x: worldPos.x,
      y: worldPos.y,
      width: worldWidth,
      height: (worldWidth / rect.width) * rect.height
    };
  }
}
