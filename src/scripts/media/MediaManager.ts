// PARADOX Media Manager
// Handles asset prefetching, video controller binding, and canvas video textures.

import { VideoController } from './VideoController.ts';

export class MediaManager {
  private static instance: MediaManager | null = null;
  private videoController: VideoController;
  private preloadedUrls: Set<string> = new Set();

  private constructor() {
    this.videoController = new VideoController();
  }

  public static getInstance(): MediaManager {
    if (!MediaManager.instance) {
      MediaManager.instance = new MediaManager();
    }
    return MediaManager.instance;
  }

  public getVideoController(): VideoController {
    return this.videoController;
  }

  /**
   * Preloads an image or poster without blocking the main rendering loop.
   */
  public preloadImage(url: string): Promise<boolean> {
    if (this.preloadedUrls.has(url)) return Promise.resolve(true);

    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      const img = new Image();
      img.onload = () => {
        this.preloadedUrls.add(url);
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  /**
   * Automatically discovers and binds all inline demo videos in the DOM.
   */
  public bindPageVideos() {
    if (typeof document === 'undefined') return;
    const videos = document.querySelectorAll<HTMLVideoElement>('video[data-paradox-video]');
    videos.forEach((video) => {
      this.videoController.register(video);
    });
  }
}
