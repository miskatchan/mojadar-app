/**
 * Audio Feedback System for HisabGuru
 * Provides haptic-like audio feedback for user interactions
 */

type FeedbackType = 'tap' | 'type' | 'success' | 'error' | 'delete' | 'swipe';

class AudioFeedbackManager {
  private enabled: boolean = true;
  private volume: number = 0.3; // 30% volume by default
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Load preference from localStorage
      const saved = localStorage.getItem('hisabguru_audio_enabled');
      this.enabled = saved !== null ? saved === 'true' : true;
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext && typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext!;
  }

  /**
   * iOS-style tap feedback (subtle click)
   */
  private playTap() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Crisp, short click sound
    oscillator.frequency.value = 800; // Higher frequency for crisp sound
    gainNode.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.03);
  }

  /**
   * Mechanical keyboard typing sound
   */
  private playType() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Lower, softer typing sound
    oscillator.frequency.value = 300 + Math.random() * 200; // Varied frequency
    oscillator.type = 'triangle';
    gainNode.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }

  /**
   * Success feedback (pleasant chime)
   */
  private playSuccess() {
    const ctx = this.getAudioContext();
    
    // Two-tone success sound
    [600, 800].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = ctx.currentTime + (i * 0.08);
      gainNode.gain.setValueAtTime(this.volume * 0.6, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    });
  }

  /**
   * Error feedback (subtle buzz)
   */
  private playError() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  /**
   * Delete feedback (soft pop)
   */
  private playDelete() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 400;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  }

  /**
   * Swipe feedback (whoosh)
   */
  private playSwipe() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  /**
   * Play feedback sound
   */
  play(type: FeedbackType) {
    if (!this.enabled) return;

    try {
      switch (type) {
        case 'tap':
          this.playTap();
          break;
        case 'type':
          this.playType();
          break;
        case 'success':
          this.playSuccess();
          break;
        case 'error':
          this.playError();
          break;
        case 'delete':
          this.playDelete();
          break;
        case 'swipe':
          this.playSwipe();
          break;
      }
    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  }

  /**
   * Toggle audio feedback on/off
   */
  toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hisabguru_audio_enabled', this.enabled.toString());
    }
    return this.enabled;
  }

  /**
   * Check if audio is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }
}

// Singleton instance
const audioFeedback = new AudioFeedbackManager();

export default audioFeedback;
