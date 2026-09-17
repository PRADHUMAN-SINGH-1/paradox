// PARADOX Media Subsystem — Image Controller
// Manages image texture caching, aspect ratio preservation, and canvas preparation.

export class ImageController {
  private cache: Map<string, HTMLImageElement> = new Map();

  public async load(url: string): Promise<HTMLImageElement | null> {
    if (this.cache.has(url)) return this.cache.get(url)!;
    if (typeof window === 'undefined') return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.cache.set(url, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  public get(url: string): HTMLImageElement | undefined {
    return this.cache.get(url);
  }

  public clear() {
    this.cache.clear();
  }
}
