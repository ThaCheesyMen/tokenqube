// Discord-like sound effects using Web Audio API
// These are simulated sounds - in production, you'd use actual audio files

class DiscordSounds {
  private audioContext: AudioContext | null = null;

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, volume: number = 0.3) {
    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.warn('Could not play sound:', error);
    }
  }

  // Join voice channel sound
  async playJoin() {
    this.playTone(800, 0.1, 0.2);
    setTimeout(() => this.playTone(1000, 0.1, 0.2), 100);
  }

  // Leave voice channel sound
  async playLeave() {
    this.playTone(1000, 0.1, 0.2);
    setTimeout(() => this.playTone(800, 0.1, 0.2), 100);
  }

  // Incoming call ringing
  async playCallRinging() {
    const ring = () => {
      this.playTone(800, 0.3, 0.3);
      setTimeout(() => this.playTone(1000, 0.3, 0.3), 300);
    };
    
    ring();
    return new Promise<void>((resolve) => {
      const interval = setInterval(ring, 2000);
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, 6000);
    });
  }

  // Message sent
  async playMessageSent() {
    this.playTone(600, 0.05, 0.1);
  }

  // Notification
  async playNotification() {
    this.playTone(800, 0.1, 0.2);
    setTimeout(() => this.playTone(1200, 0.15, 0.2), 80);
  }

  // User join
  async playUserJoin() {
    this.playTone(600, 0.08, 0.15);
    setTimeout(() => this.playTone(900, 0.12, 0.15), 60);
  }

  // User leave
  async playUserLeave() {
    this.playTone(900, 0.08, 0.15);
    setTimeout(() => this.playTone(600, 0.12, 0.15), 60);
  }

  // Mute/unmute
  async playMuteToggle() {
    this.playTone(700, 0.05, 0.15);
  }

  // Deafen/undeafen
  async playDeafenToggle() {
    this.playTone(500, 0.05, 0.15);
    setTimeout(() => this.playTone(500, 0.05, 0.15), 50);
  }

  // Error/disconnect
  async playError() {
    this.playTone(400, 0.2, 0.25);
    setTimeout(() => this.playTone(300, 0.3, 0.25), 150);
  }

  // Success
  async playSuccess() {
    this.playTone(800, 0.08, 0.15);
    setTimeout(() => this.playTone(1000, 0.08, 0.15), 70);
    setTimeout(() => this.playTone(1200, 0.12, 0.15), 140);
  }

  // Incoming call (continuous ringing)
  private ringtoneInterval: number | null = null;

  async playIncomingCall() {
    this.stopIncomingCall(); // Stop any existing ringtone
    
    const ring = () => {
      this.playTone(800, 0.4, 0.25);
      setTimeout(() => this.playTone(1000, 0.4, 0.25), 400);
    };
    
    ring(); // Play immediately
    this.ringtoneInterval = window.setInterval(ring, 2000);
  }

  stopIncomingCall() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  // Call connected
  async playCallConnected() {
    this.playTone(600, 0.08, 0.2);
    setTimeout(() => this.playTone(800, 0.08, 0.2), 60);
    setTimeout(() => this.playTone(1000, 0.12, 0.2), 120);
  }

  // Call disconnect
  async playCallDisconnect() {
    this.playTone(1000, 0.1, 0.2);
    setTimeout(() => this.playTone(800, 0.1, 0.2), 100);
    setTimeout(() => this.playTone(600, 0.2, 0.2), 200);
  }

  // Outgoing call (dialing)
  async playOutgoingCall() {
    this.playTone(900, 0.6, 0.2);
  }
}

export const discordSounds = new DiscordSounds();
