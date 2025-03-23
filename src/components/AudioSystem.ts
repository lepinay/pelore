interface Track {
  url: string;
  name: string;
}

interface AudioProgressDetail {
  currentTime: number;
  duration: number;
  progress: number;
}

class AudioSystem {
  private audioContext: AudioContext;
  public analyser: AnalyserNode | null;
  public audioElement: HTMLAudioElement;
  private tracks: Track[];
  private currentTrackIndex: number;
  private volume: number;
  public isPlaying: boolean;
  public selectedTrackURL: string;
  private audioData: Uint8Array | null;
  
  private trackChangeListeners: ((trackUrl: string | null) => void)[] = [];

  constructor() {
    this.audioContext = new (window.AudioContext)();
    this.analyser = null;
    this.audioElement = new Audio();
    this.tracks = [];
    this.currentTrackIndex = 0;
    this.volume = 0.7;
    this.isPlaying = false;
    this.selectedTrackURL = 'none';
    
    this.audioData = null;
    
    this.setupAudio();
    this.loadSavedPreferences();
  }

  private setupAudio(): void {
    // Set initial volume
    this.audioElement.volume = this.volume;
    
    // Create audio nodes
    const source = this.audioContext.createMediaElementSource(this.audioElement);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    // Connect nodes
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    // Create buffer for audio data
    this.audioData = new Uint8Array(this.analyser.frequencyBinCount);
    
    // Set up event listeners
    this.audioElement.addEventListener('ended', () => this.playNext());
  }

  public async loadMusicTracks(): Promise<void> {
    try {
      const response = await fetch('tracks.json?version=1.0.5');
      if (!response.ok) throw new Error('Failed to load tracks');
      const data: Track[] = await response.json();
      this.tracks = data.map(track => ({
        url: track.url,
        name: track.name
      }));
    } catch (error) {
      console.error('Error loading tracks:', error);
    }
  }

  public getTracks(): Track[] {
    return this.tracks;
  }

  public cacheTracks(): void {
    try {
      localStorage.setItem('localMusicFiles', JSON.stringify(this.tracks));
    } catch (error) {
      console.warn('Failed to cache tracks:', error);
    }
  }

  public loadCachedTracks(): boolean {
    try {
      const cached = localStorage.getItem('localMusicFiles');
      if (cached) {
        this.tracks = JSON.parse(cached);
        return true;
      }
    } catch (error) {
      console.warn('Failed to load cached tracks:', error);
    }
    return false;
  }

  public initEventListeners(): void {
    this.audioElement.addEventListener('timeupdate', () => this.updateTrackProgress());
    this.audioElement.addEventListener('ended', () => this.playNext());
  }

  private loadSavedPreferences(): void {
    try {
      const savedVolume = localStorage.getItem('musicVolume');
      if (savedVolume) this.volume = parseFloat(savedVolume);
      
      const savedTrack = localStorage.getItem('selectedMusic');
      if (savedTrack) this.selectedTrackURL = savedTrack;
    } catch (error) {
      console.warn('Error loading preferences:', error);
    }
  }

  public async play(url: string = this.selectedTrackURL): Promise<void> {
    if (url === 'none' || !url) return;
    
    try {
      this.audioElement.src = url;
      this.audioElement.volume = this.volume;
      this.audioElement.crossOrigin = 'anonymous';
      
      await this.audioContext.resume();
      await this.audioElement.play();
      this.isPlaying = true;
    } catch (error) {
      console.error('Playback error:', error);
      this.isPlaying = false;
    }
  }

  public pause(): void {
    this.audioElement.pause();
    this.isPlaying = false;
  }

  public togglePlay(): void {
    this.isPlaying ? this.pause() : this.play();
  }

  public playNext(): number {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.selectedTrackURL = this.tracks[this.currentTrackIndex].url;
    this.play();
    this.notifyTrackChangeListeners();
    return this.currentTrackIndex;
  }

  public playPrevious(): number {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.selectedTrackURL = this.tracks[this.currentTrackIndex].url;
    this.play();
    this.notifyTrackChangeListeners();
    return this.currentTrackIndex;
  }

  public setTrack(trackIndex: number): void {
    if (typeof trackIndex === 'number' && trackIndex >= 0 && trackIndex < this.tracks.length) {
      this.currentTrackIndex = trackIndex;
      this.selectedTrackURL = this.tracks[trackIndex].url;
      localStorage.setItem('selectedMusic', this.selectedTrackURL);
    }
  }

  public setTrackByURL(url: string): void {
    const index = this.tracks.findIndex(track => track.url === url);
    if (index !== -1) this.setTrack(index);

    // Update current track and notify listeners
    this.notifyTrackChangeListeners();
  }

  public onTrackChange(callback: (trackUrl: string | null) => void): void {
    this.trackChangeListeners.push(callback);
  }

  private notifyTrackChangeListeners(): void {
    for (const listener of this.trackChangeListeners) {
      listener(this.selectedTrackURL);
    }
  }

  public getCurrentTrack(): Track {
    return this.tracks[this.currentTrackIndex];
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(value: number): number {
    this.volume = Math.min(1, Math.max(0, value));
    this.audioElement.volume = this.volume;
    localStorage.setItem('musicVolume', this.volume.toString());
    return this.volume;
  }

  public adjustVolume(delta: number): number {
    return this.setVolume(this.volume + delta);
  }

  public updateTrackProgress(): void {
    const event = new CustomEvent<AudioProgressDetail>('audioprogress', {
      detail: {
        currentTime: this.audioElement.currentTime,
        duration: this.audioElement.duration,
        progress: this.audioElement.currentTime / this.audioElement.duration || 0
      }
    });
    document.dispatchEvent(event);
  }

  public getCurrentTime(): number {
    return this.audioElement.currentTime;
  }

  public getDuration(): number {
    return this.audioElement.duration;
  }

  public getAudioData(): Uint8Array | null {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.audioData!);
      return this.audioData;
    }
    return null;
  }

  public findTrackByName(trackName: string): string | null {
    // If tracks aren't loaded yet, return null
    if (!this.tracks || this.tracks.length === 0) {
      return null;
    }
    
    // Try to find the track that ends with the provided name
    for (const track of this.tracks) {
      if (track.url.endsWith(trackName)) {
        return track.url;
      }
    }
    
    return null;
  }

  public findTrackByURL(url: string): Track | null {
    // If tracks aren't loaded yet, return null
    if (!this.tracks || this.tracks.length === 0) {
      return null;
    }
    
    // Find the track with the exact URL
    const track = this.tracks.find(track => track.url === url);
    return track || null;
  }
}

export default AudioSystem;
