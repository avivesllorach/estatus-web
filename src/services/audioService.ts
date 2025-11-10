export class AudioService {
  private onlineAudio: HTMLAudioElement | null = null;
  private offlineAudio: HTMLAudioElement | null = null;
  private isEnabled: boolean = true;

  constructor() {
    this.loadAudioFiles();
  }

  private loadAudioFiles(): void {
    try {
      // Load audio files - you'll place these in the public/sounds directory
      this.onlineAudio = new Audio('/sounds/server-online.mp3');
      this.offlineAudio = new Audio('/sounds/server-offline.mp3');

      // Preload the audio files
      this.onlineAudio.preload = 'auto';
      this.offlineAudio.preload = 'auto';

      // Set volume to a reasonable level
      this.onlineAudio.volume = 0.7;
      this.offlineAudio.volume = 0.7;
    } catch (error) {
      console.error('Error loading audio files:', error);
    }
  }

  async playOnlineSound(): Promise<void> {
    if (!this.isEnabled || !this.onlineAudio) return;

    try {
      // Reset audio to beginning and play
      this.onlineAudio.currentTime = 0;
      await this.onlineAudio.play();
    } catch (error) {
      console.error('Error playing online sound:', error);
    }
  }

  async playOfflineSound(): Promise<void> {
    if (!this.isEnabled || !this.offlineAudio) return;

    try {
      // Reset audio to beginning and play
      this.offlineAudio.currentTime = 0;
      await this.offlineAudio.play();
    } catch (error) {
      console.error('Error playing offline sound:', error);
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  // Test method to check if audio files are loaded correctly
  async testSounds(): Promise<void> {
    console.log('Testing server online sound...');
    await this.playOnlineSound();
    
    setTimeout(async () => {
      console.log('Testing server offline sound...');
      await this.playOfflineSound();
    }, 1500);
  }
}

// Export singleton instance
export const audioService = new AudioService();