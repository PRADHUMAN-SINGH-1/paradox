/**
 * PARADOX Cybernetic Sound Engine — Inspired by lusion.co
 * Real-time synthesized audio cues using Web Audio API (0 KB audio assets).
 * Provides micro-ticks on hover, tactile sub-pops on click, and live audio toggle.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private freqData: Uint8Array | null = null;
  private isEnabled = false;

  constructor() {
    if (typeof window === 'undefined') return;
    this.isEnabled = localStorage.getItem('px_sound') === 'true';
  }

  private ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getAudioEnergy(): number {
    if (!this.analyser || !this.freqData || !this.isEnabled) return 0;
    (this.analyser as any).getByteFrequencyData(this.freqData);
    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) {
      sum += this.freqData[i];
    }
    const avg = sum / this.freqData.length;
    return Math.min(1.0, avg / 128.0);
  }

  public toggle(): boolean {
    this.ensureContext();
    this.isEnabled = !this.isEnabled;
    localStorage.setItem('px_sound', String(this.isEnabled));
    if (this.isEnabled) {
      this.playClick();
    }
    return this.isEnabled;
  }

  public getState(): boolean {
    return this.isEnabled;
  }

  public playHover() {
    if (!this.isEnabled || !this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.02);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // AudioContext error boundary
    }
  }

  public playClick() {
    this.ensureContext();
    if (!this.isEnabled || !this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // AudioContext error boundary
    }
  }

  public playLaserSweep() {
    if (!this.isEnabled || !this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(3200, now + 0.12);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // AudioContext error boundary
    }
  }
}

export const sound = new SoundEngine();

export function initSoundInteractions() {
  if (typeof window === 'undefined') return;

  // Sound toggle button in header
  const soundBtn = document.querySelector<HTMLButtonElement>('#sound-toggle-btn');
  const soundLabel = document.querySelector<HTMLElement>('#sound-toggle-label');
  const soundWave = document.querySelector<HTMLCanvasElement>('#sound-toggle-wave');

  const updateSoundUI = () => {
    const on = sound.getState();
    if (soundBtn) {
      soundBtn.classList.toggle('is-active', on);
      soundBtn.setAttribute('aria-pressed', String(on));
    }
    if (soundLabel) {
      soundLabel.textContent = on ? 'SOUND [ON]' : 'SOUND [OFF]';
    }
    if (soundWave) {
      soundWave.style.opacity = on ? '1' : '0.25';
    }
  };

  soundBtn?.addEventListener('click', () => {
    sound.toggle();
    updateSoundUI();
  });

  updateSoundUI();

  // Mini waveform animation
  if (soundWave) {
    const ctx = soundWave.getContext('2d');
    let phase = 0;
    const renderMiniWave = () => {
      if (ctx) {
        ctx.clearRect(0, 0, soundWave.width, soundWave.height);
        if (sound.getState()) {
          ctx.beginPath();
          const mid = soundWave.height / 2;
          for (let x = 0; x < soundWave.width; x += 2) {
            const amp = Math.sin(x * 0.3 + phase) * (soundWave.height * 0.35);
            ctx.lineTo(x, mid + amp);
          }
          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          phase += 0.18;
        } else {
          ctx.beginPath();
          ctx.moveTo(0, soundWave.height / 2);
          ctx.lineTo(soundWave.width, soundWave.height / 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      requestAnimationFrame(renderMiniWave);
    };
    renderMiniWave();
  }

  // Delegated sound cues
  document.addEventListener('mouseover', (e) => {
    const target = (e.target as HTMLElement)?.closest('a, button, [data-cursor], .spotlight-card, .tool-brutalist-card');
    if (target) {
      sound.playHover();
    }
  });

  document.addEventListener('pointerdown', (e) => {
    const target = (e.target as HTMLElement)?.closest('a, button, [data-cursor]');
    if (target) {
      sound.playClick();
    }
  });
}
