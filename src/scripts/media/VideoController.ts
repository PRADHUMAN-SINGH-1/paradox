// PARADOX Video Controller
// Manages power-efficient inline video playback via IntersectionObserver.

export class VideoController {
  private videoElements: Set<HTMLVideoElement> = new Set();
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.initObserver();
  }

  private initObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Gracefully ignore autoplay restrictions
            });
          } else {
            video.pause();
          }
        });
      },
      {
        rootMargin: '100px 0px',
        threshold: 0.1
      }
    );
  }

  public register(video: HTMLVideoElement) {
    if (!video) return;
    video.muted = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('preload', 'metadata');
    this.videoElements.add(video);

    if (this.observer) {
      this.observer.observe(video);
    }
  }

  public unregister(video: HTMLVideoElement) {
    this.videoElements.delete(video);
    if (this.observer) {
      this.observer.unobserve(video);
    }
  }

  public pauseAll() {
    this.videoElements.forEach((v) => v.pause());
  }

  public dispose() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.videoElements.clear();
  }
}
