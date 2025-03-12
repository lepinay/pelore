import TunnelEffect from './components/TunnelEffect.js';
import CRTEffect from './components/CRTEffect.js';
import AudioSystem from './components/AudioSystem.js';
import Visualizer from './components/Visualizer.js';
import SplashScreen from './components/SplashScreen.js';
import TransportControls from './components/TransportControls.js';
import FontFaceObserver from 'https://cdn.jsdelivr.net/npm/fontfaceobserver@2.3.0/+esm';

class DemoApp {
  constructor() {
    this.initDOM();
    this.initComponents();
    this.initFontLoading();
  }

  initDOM() {
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

  initComponents() {
    // Initialize components
    this.audioSystem = new AudioSystem();
    
  }

  async initFontLoading() {
    try {
      const font = new FontFaceObserver('Press Start 2P');
      await font.load();
      await this.start();
    } catch (error) {
      console.warn('Font loading error:', error);
      this.start();
    }
  }

  async start() {
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

  setupSplashScreenHandlers() {
    this.splashScreen.onStart((selectedTrack) => {
      this.startDemo(selectedTrack);
    });
  }

  startDemo(selectedTrack) {
    // Transition sequence
    this.tunnelEffect.stop();
    this.splashScreen.hide();
    
    // Audio setup
    if (selectedTrack !== 'none') {
      this.audioSystem.setTrack(selectedTrack);
      this.audioSystem.play();
    }

    // Visual setup
    this.visualizer.start();
    this.startMainLoop();
  }

  startMainLoop() {
    const update = () => {
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

  initEventListeners() {
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  handleResize() {
    // Coordinate all resize handlers
    this.tunnelEffect.handleResize();
    this.visualizer.resize();
    // this.crtEffect.handleResize();
  }

  cleanup() {
    // Proper cleanup when needed
    this.visualizer.stop();
    this.audioSystem.pause();
    this.crtEffect.disable();
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new DemoApp();
  
  // Expose for debugging
  window.demoApp = app;
});

export default DemoApp; 