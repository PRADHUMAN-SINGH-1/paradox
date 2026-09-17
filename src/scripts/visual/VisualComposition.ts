// PARADOX Visual Engine — DOM ↔ WebGL Composition Layer
// Projects real DOM bounding client rects into 3D world space, manages depth layering and theme toggling.

export class VisualComposition {
  private THREE: any;
  private camera: any;
  private isLightActive: boolean = false;

  constructor(threeInstance: any, camera: any) {
    this.THREE = threeInstance;
    this.camera = camera;
  }

  /**
   * Projects a 2D screen coordinate (clientX, clientY) into 3D world space at target depth Z
   */
  public screenToWorld(clientX: number, clientY: number, targetZ = 0): any {
    if (typeof window === 'undefined') return new this.THREE.Vector3(0, 0, 0);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const ndcX = (clientX / w) * 2 - 1;
    const ndcY = -(clientY / h) * 2 + 1;

    const vec = new this.THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(this.camera);
    vec.sub(this.camera.position).normalize();

    const distance = (targetZ - this.camera.position.z) / vec.z;
    return new this.THREE.Vector3().copy(this.camera.position).add(vec.multiplyScalar(distance));
  }

  /**
   * Synchronizes page theme class (.theme-light) and dynamic CSS properties with WebGL tone
   */
  public updateTheme(isLightTone: boolean, currentBgHex: number) {
    if (typeof document === 'undefined') return;

    if (isLightTone !== this.isLightActive) {
      this.isLightActive = isLightTone;
      if (isLightTone) {
        document.body.classList.add('theme-light');
      } else {
        document.body.classList.remove('theme-light');
      }
    }

    const hexString = '#' + currentBgHex.toString(16).padStart(6, '0');
    document.documentElement.style.setProperty('--bg-dynamic', hexString);
  }
}
