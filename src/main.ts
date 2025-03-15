import TunnelEffect from './components/TunnelEffect.js';
import CRTEffect from './components/CRTEffect.js';
import AudioSystem from './components/AudioSystem.js';
import Visualizer from './components/Visualizer.js';
import SplashScreen from './components/SplashScreen.js';
import FontFaceObserver from 'https://cdn.jsdelivr.net/npm/fontfaceobserver@2.3.0/+esm';
import TransportControls from './components/TransportControls.js';

class DemoApp {
  private mainCanvas: HTMLCanvasElement;
  private audioSystem: AudioSystem;
  private visualizer: Visualizer;
  private crtEffect: CRTEffect;
  private splashScreen: SplashScreen;
  private transportControls: TransportControls;
  private tunnelEffect: TunnelEffect;

  constructor() {
    this.initDOM();
    this.initComponents();
    this.initFontLoading();
  }

  private initDOM(): void {
    // Main visualization canvas
    this.mainCanvas = document.createElement('canvas');
    this.mainCanvas.id = 'demoCanvas';
    
    // Tunnel effect canvas
    // this.tunnelCanvas = document.createElement('canvas');
    // this.tunnelCanvas.id = 'tunnel-canvas';
    // this.tunnelCanvas = document.getElementById('tunnel-canvas');
    
    // Append both to body
    // document.body.appendChild(this.tunnelCanvas);
    document.body.appendChild(this.mainCanvas);
    
    // Style the tunnel canvas
    // this.tunnelCanvas.style.position = 'absolute';
    // this.tunnelCanvas.style.zIndex = '-1';
  }

  private initComponents(): void {
    // Initialize components
    this.audioSystem = new AudioSystem();
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

  private async start(): Promise<void> {
    try {
      await this.audioSystem.loadMusicTracks();
      this.visualizer = new Visualizer(this.mainCanvas, this.audioSystem);
      this.crtEffect = new CRTEffect(this.mainCanvas);
      this.splashScreen = new SplashScreen(this.audioSystem);
      // Initial setup
      this.splashScreen.addScanlineAnimation();
      this.splashScreen.show();

      this.transportControls = new TransportControls(this.audioSystem);
      this.tunnelEffect = new TunnelEffect(this.splashScreen.element);
      this.tunnelEffect.start();
      this.setupSplashScreenHandlers();

      this.initEventListeners();

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
    }

    // Visual setup
    this.visualizer.start();
    this.startMainLoop();
  }

  private startMainLoop(): void {
    const update = (): void => {
      if (!this.visualizer.isRendering) return;

      // Get audio data for effects
      const audioData = this.audioSystem.getAudioData();
      
      // Update effects
      this.crtEffect.updateWithAudioData(audioData);
      
      // Apply CRT effect after visualizer renders
      //this.crtEffect.apply();

      requestAnimationFrame(update);
    };
    
    update();
  }

  private initEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private handleResize(): void {
    // Coordinate all resize handlers
    this.tunnelEffect.handleResize();
    this.visualizer.resize();
    // this.crtEffect.handleResize();
  }

  public cleanup(): void {
    // Proper cleanup when needed
    this.visualizer.stop();
    this.audioSystem.pause();
    // this.crtEffect.disable();
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new DemoApp();
  
  // Expose for debugging
  (window as any).demoApp = app;
});

export default DemoApp; 