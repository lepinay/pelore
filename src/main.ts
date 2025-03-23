import TunnelEffect from './components/TunnelEffect.js';
import CRTEffect from './components/CRTEffect.js';
import AudioSystem from './components/AudioSystem.js';
import Visualizer from './components/Visualizer.js';
import SplashScreen from './components/SplashScreen.js';
import FontFaceObserver from 'https://cdn.jsdelivr.net/npm/fontfaceobserver@2.3.0/+esm';
import TransportControls from './components/TransportControls.js';
import TrackNotification from './components/TrackNotification.js';

class DemoApp {
  private mainCanvas: HTMLCanvasElement;
  private audioSystem: AudioSystem;
  private visualizer: Visualizer;
  private crtEffect: CRTEffect;
  private splashScreen: SplashScreen;
  private transportControls: TransportControls;
  private tunnelEffect: TunnelEffect;
  private trackNotification: TrackNotification;
  private urlSongParam: string | null = null;
  private isFirefox: boolean = false;

  constructor() {
    this.initDOM();
    this.initComponents();
    this.checkUrlForSong();
    this.detectBrowser();
    this.initFontLoading();
  }

  private initDOM(): void {
    // Main visualization canvas
    this.mainCanvas = document.createElement('canvas');
    this.mainCanvas.id = 'demoCanvas';
    
    // Append both to body
    document.body.appendChild(this.mainCanvas);
  }

  private initComponents(): void {
    // Initialize components
    this.audioSystem = new AudioSystem();
    this.trackNotification = new TrackNotification({
      theme: 'retro',
      position: 'top-middle',
      duration: 5000
    });
  }

  private checkUrlForSong(): void {
    const urlParams = new URLSearchParams(window.location.search);
    this.urlSongParam = urlParams.get('song');
  }

  private updateUrlWithSong(songUrl: string | null): void {
    if (!songUrl || songUrl === 'none') {
      // Clear the song parameter if no song is playing
      history.replaceState(null, '', window.location.pathname);
      return;
    }
    
    // Extract just the filename from the URL to make the share link cleaner
    const songName = songUrl;
    const url = new URL(window.location.href);
    url.searchParams.set('song', songName || '');
    history.replaceState(null, '', url);
  }

  private async initFontLoading(): Promise<void> {
    try {
      const font = new FontFaceObserver('Press Start 2P');
      await font.load();
      await this.start();
    } catch (error) {
      console.warn('Font loading error:', error);
      this.start();
    }
  }

  private detectBrowser(): void {
    this.isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
  }

  private async start(): Promise<void> {
    try {
      await this.audioSystem.loadMusicTracks();
      this.visualizer = new Visualizer(this.mainCanvas, this.audioSystem);
      this.crtEffect = new CRTEffect(this.mainCanvas);
      
      // Disable CRT effect on Firefox as it's too slow
      if (this.isFirefox) {
        this.crtEffect.toggleEffect(); // Disable it initially
        console.log('CRT effect disabled for Firefox browser');
      }
      
      this.splashScreen = new SplashScreen(this.audioSystem);
      // Initial setup
      this.splashScreen.addScanlineAnimation();
      
      this.transportControls = new TransportControls(this.audioSystem);
      this.tunnelEffect = new TunnelEffect(this.splashScreen.element);
      this.tunnelEffect.start();
      this.setupSplashScreenHandlers();

      // Subscribe to track change events
      this.audioSystem.onTrackChange((trackUrl) => {
        this.updateUrlWithSong(trackUrl);

        let track = this.audioSystem.findTrackByURL(trackUrl);
        this.trackNotification.showTrackNotification(track.name);

      });


      this.initEventListeners();
      
      // If there's a song in the URL, start playing it immediately
      if (this.urlSongParam) {
        const songTrack = this.audioSystem.findTrackByName(this.urlSongParam);
        if (songTrack) {
          this.startDemo(songTrack);
          return;
        }
      }
      
      // Otherwise show the splash screen
      this.splashScreen.show();

    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }

  private setupSplashScreenHandlers(): void {
    this.splashScreen.onStart((selectedTrack: string) => {
      this.startDemo(selectedTrack);
    });
  }

  private startDemo(selectedTrack: string): void {
    // Transition sequence
    this.tunnelEffect.stop();
    this.splashScreen.hide();
    
    // Audio setup
    if (selectedTrack !== 'none') {
      this.audioSystem.setTrackByURL(selectedTrack);
      this.audioSystem.play();
      // URL update is now handled by the track change event
    } else {
      this.updateUrlWithSong(null);
    }

    // Visual setup
    this.visualizer.start();
    this.startMainLoop();
  }

  private startMainLoop(): void {
    const update = (currentTime: number): void => {
      if (!this.visualizer.isRendering) return;

      // Get audio data for effects
      const audioData = this.audioSystem.getAudioData();
      
      // Update effects
      this.crtEffect.updateWithAudioData(audioData);
      this.crtEffect.apply(currentTime);

      requestAnimationFrame(update);
    };
    
    requestAnimationFrame(update);
  }

  private initEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
    window.addEventListener('keydown', (e) => {
      if (e.key === 'c' || e.key === 'C') {
        // Only allow toggling if not Firefox
        if (!this.isFirefox) {
          this.crtEffect.toggleEffect();
        } else {
          console.log('CRT effect is disabled in Firefox for performance reasons');
        }
      }
    });
  }

  private handleResize(): void {
    // Coordinate all resize handlers
    this.tunnelEffect.handleResize();
    this.visualizer.resize();
    this.crtEffect.handleResize();
  }

  public cleanup(): void {
    // Proper cleanup when needed
    this.visualizer.stop();
    this.audioSystem.pause();
    this.trackNotification.destroy();
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new DemoApp();
  
  // Expose for debugging
  (window as any).demoApp = app;
});

window.addEventListener('beforeunload', () => {
  const app = (window as any).demoApp as DemoApp;
  app.cleanup();
});

export default DemoApp;