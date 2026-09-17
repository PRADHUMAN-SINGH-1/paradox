// PARADOX Media Subsystem — Media Transition Controller
// Manages smooth crossfades, scroll-driven playback, and shader displacement transitions between WebGL and media textures.

export class MediaTransition {
  private blendFactor: number = 0;
  private isMediaActive: boolean = false;

  public setProgress(scrollProgress: number, start: number, end: number) {
    if (scrollProgress < start || scrollProgress > end) {
      this.blendFactor = 0;
      this.isMediaActive = false;
      return;
    }

    const span = end - start;
    const norm = (scrollProgress - start) / span;
    // Smooth cosine wave in and out
    this.blendFactor = Math.sin(norm * Math.PI);
    this.isMediaActive = this.blendFactor > 0.05;
  }

  public getBlend(): number {
    return this.blendFactor;
  }

  public getActive(): boolean {
    return this.isMediaActive;
  }
}
