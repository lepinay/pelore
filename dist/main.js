import TunnelEffect from './components/TunnelEffect.js';
import CRTEffect from './components/CRTEffect.js';
import AudioSystem from './components/AudioSystem.js';
import Visualizer from './components/Visualizer.js';
import SplashScreen from './components/SplashScreen.js';
import FontFaceObserver from 'https://cdn.jsdelivr.net/npm/fontfaceobserver@2.3.0/+esm';
import TransportControls from './components/TransportControls.js';
import TrackNotification from './components/TrackNotification.js';
class DemoApp {
    constructor() {
        this.urlSongParam = null;
        this.isFirefox = false;
        this.initDOM();
        this.initComponents();
        this.checkUrlForSong();
        this.detectBrowser();
        this.initFontLoading();
    }
    initDOM() {
        // Main visualization canvas
        this.mainCanvas = document.createElement('canvas');
        this.mainCanvas.id = 'demoCanvas';
        // Append both to body
        document.body.appendChild(this.mainCanvas);
    }
    initComponents() {
        // Initialize components
        this.audioSystem = new AudioSystem();
        this.trackNotification = new TrackNotification({
            theme: 'retro',
            position: 'top-middle',
            duration: 5000
        });
    }
    checkUrlForSong() {
        const urlParams = new URLSearchParams(window.location.search);
        this.urlSongParam = urlParams.get('song');
    }
    updateUrlWithSong(songUrl) {
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
    async initFontLoading() {
        try {
            const font = new FontFaceObserver('Press Start 2P');
            await font.load();
            await this.start();
        }
        catch (error) {
            console.warn('Font loading error:', error);
            this.start();
        }
    }
    detectBrowser() {
        this.isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    }
    async start() {
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
        }
        catch (error) {
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
            this.audioSystem.setTrackByURL(selectedTrack);
            this.audioSystem.play();
            // URL update is now handled by the track change event
        }
        else {
            this.updateUrlWithSong(null);
        }
        // Visual setup
        this.visualizer.start();
        this.startMainLoop();
    }
    startMainLoop() {
        const update = (currentTime) => {
            if (!this.visualizer.isRendering)
                return;
            // Get audio data for effects
            const audioData = this.audioSystem.getAudioData();
            // Update effects
            this.crtEffect.updateWithAudioData(audioData);
            this.crtEffect.apply(currentTime);
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }
    initEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
        window.addEventListener('keydown', (e) => {
            if (e.key === 'c' || e.key === 'C') {
                // Only allow toggling if not Firefox
                if (!this.isFirefox) {
                    this.crtEffect.toggleEffect();
                }
                else {
                    console.log('CRT effect is disabled in Firefox for performance reasons');
                }
            }
        });
    }
    handleResize() {
        // Coordinate all resize handlers
        this.tunnelEffect.handleResize();
        this.visualizer.resize();
        this.crtEffect.handleResize();
    }
    cleanup() {
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
    window.demoApp = app;
});
window.addEventListener('beforeunload', () => {
    const app = window.demoApp;
    app.cleanup();
});
export default DemoApp;
//# sourceMappingURL=main.js.map