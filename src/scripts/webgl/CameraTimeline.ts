// PARADOX Camera Timeline
// Continuous 11-chapter scroll trajectory with cubic damping and zero teleportation.

export interface CameraWaypoint {
  chapter: string;
  progressStart: number;
  progressEnd: number;
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

export class CameraTimeline {
  private readonly waypoints: CameraWaypoint[] = [
    {
      chapter: 'BOOT',
      progressStart: 0.0,
      progressEnd: 0.05,
      position: [0, 0, 180],
      target: [0, 0, 0],
      fov: 50
    },
    {
      chapter: 'CORE',
      progressStart: 0.05,
      progressEnd: 0.15,
      position: [0, 5, 95],
      target: [0, 0, 0],
      fov: 52
    },
    {
      chapter: 'OBSERVE',
      progressStart: 0.15,
      progressEnd: 0.25,
      position: [25, 10, 85],
      target: [0, 2, 0],
      fov: 52
    },
    {
      chapter: 'EVIDENCE',
      progressStart: 0.25,
      progressEnd: 0.40,
      position: [-30, -5, 75],
      target: [-10, 0, 0],
      fov: 50
    },
    {
      chapter: 'VERIFY',
      progressStart: 0.40,
      progressEnd: 0.52,
      position: [0, 22, 65],
      target: [0, 0, -10],
      fov: 54
    },
    {
      chapter: 'ATLAS',
      progressStart: 0.52,
      progressEnd: 0.62,
      position: [40, -15, 100],
      target: [10, 0, 0],
      fov: 52
    },
    {
      chapter: 'COMPARE',
      progressStart: 0.62,
      progressEnd: 0.70,
      position: [0, 0, 80],
      target: [0, 0, 0],
      fov: 48
    },
    {
      chapter: 'STUDIO',
      progressStart: 0.70,
      progressEnd: 0.77,
      position: [-22, 14, 70],
      target: [0, 0, 0],
      fov: 50
    },
    {
      chapter: 'SIGNALS',
      progressStart: 0.77,
      progressEnd: 0.84,
      position: [12, 32, 85],
      target: [0, 5, 0],
      fov: 52
    },
    {
      chapter: 'TUNNEL',
      progressStart: 0.84,
      progressEnd: 0.96,
      position: [0, 0, 25],
      target: [0, 0, -50],
      fov: 65
    },
    {
      chapter: 'VOID',
      progressStart: 0.96,
      progressEnd: 1.0,
      position: [0, 0, 50],
      target: [0, 0, 0],
      fov: 50
    }
  ];

  // Current interpolated state
  public currentPosition: [number, number, number] = [0, 0, 180];
  public currentTarget: [number, number, number] = [0, 0, 0];
  public currentFov: number = 50;

  // Parallax offsets
  private mouseOffsetX: number = 0;
  private mouseOffsetY: number = 0;

  public setParallax(x: number, y: number) {
    this.mouseOffsetX = x * 8.0;
    this.mouseOffsetY = y * 8.0;
  }

  /**
   * Evaluates camera position and target based on normalized scroll progress [0..1]
   */
  public evaluate(scrollProgress: number): {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
    activeChapter: string;
  } {
    const p = Math.max(0, Math.min(1, scrollProgress));

    // Find active interval
    let idx = 0;
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      if (p >= this.waypoints[i].progressStart && p <= this.waypoints[i + 1].progressStart) {
        idx = i;
        break;
      }
      if (i === this.waypoints.length - 2) {
        idx = i;
      }
    }

    const w0 = this.waypoints[idx];
    const w1 = this.waypoints[idx + 1] || w0;

    const span = Math.max(0.0001, w1.progressStart - w0.progressStart);
    const localT = Math.max(0, Math.min(1, (p - w0.progressStart) / span));

    // Cubic Hermite smoothstep for acceleration/deceleration without jerk
    const smoothT = localT * localT * (3 - 2 * localT);

    // Interpolate position
    const posX = w0.position[0] + (w1.position[0] - w0.position[0]) * smoothT + this.mouseOffsetX;
    const posY = w0.position[1] + (w1.position[1] - w0.position[1]) * smoothT + this.mouseOffsetY;
    const posZ = w0.position[2] + (w1.position[2] - w0.position[2]) * smoothT;

    // Interpolate target
    const tgtX = w0.target[0] + (w1.target[0] - w0.target[0]) * smoothT;
    const tgtY = w0.target[1] + (w1.target[1] - w0.target[1]) * smoothT;
    const tgtZ = w0.target[2] + (w1.target[2] - w0.target[2]) * smoothT;

    // Interpolate FOV
    const fov0 = w0.fov ?? 50;
    const fov1 = w1.fov ?? 50;
    const fov = fov0 + (fov1 - fov0) * smoothT;

    this.currentPosition = [posX, posY, posZ];
    this.currentTarget = [tgtX, tgtY, tgtZ];
    this.currentFov = fov;

    return {
      position: this.currentPosition,
      target: this.currentTarget,
      fov: this.currentFov,
      activeChapter: localT < 0.5 ? w0.chapter : w1.chapter
    };
  }
}
