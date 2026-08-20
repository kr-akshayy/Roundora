/**
 * Web Audio API Ringtone Engine
 * Synthesizes cross-browser, zero-dependency modern call ringtones and ringbacks.
 * Immune to missing audio asset files and handles browser autoplay policies cleanly.
 */

class RingtoneManager {
  private audioCtx: AudioContext | null = null;
  private incomingInterval: number | null = null;
  private outgoingInterval: number | null = null;
  private isPlaying = false;

  private getContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {
        // Ignored if user hasn't interacted yet
      });
    }
    return this.audioCtx;
  }

  /**
   * Modern melodic chime for incoming interview call (Instagram/modern style)
   */
  public playIncoming() {
    this.stop();
    this.isPlaying = true;

    const playChord = () => {
      if (!this.isPlaying) return;
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        // Modern 4-note melodic chime sequence: F5 (698.46Hz), A5 (880Hz), C6 (1046.5Hz), E6 (1318.5Hz)
        const notes = [
          { freq: 659.25, time: 0, dur: 0.18 }, // E5
          { freq: 880.0, time: 0.15, dur: 0.22 }, // A5
          { freq: 1046.5, time: 0.32, dur: 0.25 }, // C6
          { freq: 1318.51, time: 0.52, dur: 0.45 }, // E6
        ];

        notes.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          // Smooth envelope
          gain.gain.setValueAtTime(0.001, now + time);
          gain.gain.exponentialRampToValueAtTime(0.28, now + time + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + dur + 0.05);
        });
      } catch (err) {
        console.warn('Ringtone playback error:', err);
      }
    };

    playChord();
    this.incomingInterval = window.setInterval(playChord, 2200);
  }

  /**
   * Standard outgoing ringback tone for caller (440Hz + 480Hz dual tone)
   */
  public playOutgoing() {
    this.stop();
    this.isPlaying = true;

    const playPulse = () => {
      if (!this.isPlaying) return;
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain.gain.setValueAtTime(0.12, now + 1.4);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.55);
        osc2.stop(now + 1.55);
      } catch (err) {
        console.warn('Outgoing ring tone error:', err);
      }
    };

    playPulse();
    this.outgoingInterval = window.setInterval(playPulse, 4000);
  }

  /**
   * Call ended / disconnect sound effect
   */
  public playCallEnd() {
    this.stop();
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // ignore
    }
  }

  /**
   * Stop all active tones
   */
  public stop() {
    this.isPlaying = false;
    if (this.incomingInterval !== null) {
      clearInterval(this.incomingInterval);
      this.incomingInterval = null;
    }
    if (this.outgoingInterval !== null) {
      clearInterval(this.outgoingInterval);
      this.outgoingInterval = null;
    }
  }
}

export const ringtone = new RingtoneManager();
