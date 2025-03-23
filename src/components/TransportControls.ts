import AudioSystem from "./AudioSystem";
import TrackListPopup from "./TrackListPopup.js";

class TransportControls {
  private audioSystem: AudioSystem;
  private audioIsPlaying: boolean;
  private audioElement: HTMLAudioElement;
  private trackListPopup: TrackListPopup;

  constructor(audioSystem: AudioSystem) {
    this.audioSystem = audioSystem;
    this.audioIsPlaying = !audioSystem.audioElement.paused;
    this.audioElement = audioSystem.audioElement;
    
    // Properly bind the method
    this.updateTrackProgress = this.updateTrackProgress.bind(this);
    this.updatePlayPauseButton = this.updatePlayPauseButton.bind(this);
    
    // Make sure we're adding the event listener to the correct element
    this.audioElement.addEventListener('timeupdate', () => this.updateTrackProgress());
    this.audioElement.addEventListener('play', () => this.updatePlayPauseButton());
    this.audioElement.addEventListener('pause', () => this.updatePlayPauseButton());
    
    this.trackListPopup = new TrackListPopup(audioSystem);
    
    // Create the UI elements
    this.createTransportControls();
  }

  createTransportControls(): void {
    const controls = document.createElement('div');
    controls.id = 'transport-controls';
    controls.innerHTML = `
        <div class="transport-button prev-track" title="Previous Track (P key)">⏮</div>
        <div class="transport-button play-pause" title="Play/Pause (Space key)">⏯</div>
        <div class="transport-button volume-down" title="Volume Down (Shift+Down key)">🔉</div>
        <div class="transport-button volume-up" title="Volume Up (Shift+Up key)">🔊</div>
        <div class="transport-button next-track" title="Next Track (N key)">⏭</div>
        <div class="transport-button track-list" title="Show Track List">⏏</div>
        <div class="track-progress-container">
            <div id="track-progress-bar"></div>
        </div>
        <div id="track-time-display">00:00 / 00:00</div>
    `;
    
    // Style the controls
    Object.assign(controls.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '15px',
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '10px',
        border: '1px solid #0ff',
        boxShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
        zIndex: '100',
        opacity: '0.2', // Start mostly transparent
        transition: 'opacity 0.3s',
        flexWrap: 'wrap', // Allow wrapping on small screens
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '90%'
    });
    
    // Style the buttons
    const buttons = controls.querySelectorAll('.transport-button');
    buttons.forEach(button => {
        Object.assign((button as HTMLElement).style, {
            width: '40px',
            height: '40px',
            backgroundColor: 'rgba(0, 40, 40, 0.8)',
            color: '#0ff',
            borderRadius: '8px',
            border: '2px solid #0ff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '18px',
            cursor: 'pointer',
            boxShadow: '0 0 5px #0ff',
            userSelect: 'none'
        });
    });
    
    // Style the progress bar container
    const progressContainer = controls.querySelector('.track-progress-container') as HTMLDivElement;
    Object.assign(progressContainer.style, {
        width: '100%',
        height: '8px',
        backgroundColor: 'rgba(0, 30, 30, 0.8)',
        borderRadius: '4px',
        margin: '10px 0 5px 0',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        cursor: 'pointer' // Add cursor pointer to indicate clickable
    });
    
    // Style the progress bar
    const progressBar = controls.querySelector('#track-progress-bar') as HTMLDivElement;
    Object.assign(progressBar.style, {
        width: '0%',
        height: '100%',
        backgroundColor: '#0ff',
        position: 'absolute',
        left: '0',
        top: '0',
        transition: 'width 0.1s' // Faster transition for more responsive seeking
    });
    
    // Add a seek preview indicator
    const seekPreview = document.createElement('div');
    seekPreview.id = 'seek-preview';
    Object.assign(seekPreview.style, {
        position: 'absolute',
        height: '100%',
        backgroundColor: 'rgba(0, 255, 255, 0.3)',
        width: '0',
        left: '0',
        top: '0',
        pointerEvents: 'none',
        display: 'none'
    });
    progressContainer.appendChild(seekPreview);
    
    // Make progress bar interactive - seek functionality
    progressContainer.addEventListener('click', (e: MouseEvent) => {
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        
        if (this.audioElement.duration) {
            // Seek to the clicked position
            this.audioElement.currentTime = this.audioElement.duration * percentage;
            this.updateTrackProgress();
        }
    });
    
    // Add mousemove to show preview of where seeking would go
    progressContainer.addEventListener('mousemove', (e: MouseEvent) => {
        const seekPreview = document.getElementById('seek-preview');
        if (!seekPreview) return;
        
        const rect = progressContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
        
        seekPreview.style.width = `${percentage * 100}%`;
        seekPreview.style.display = 'block';
        
        // Show time tooltip
        if (this.audioElement.duration) {
            const seekTime = this.formatTime(this.audioElement.duration * percentage);
            progressContainer.title = `Seek to: ${seekTime}`;
        }
    });
    
    progressContainer.addEventListener('mouseenter', () => {
        const seekPreview = document.getElementById('seek-preview');
        if (seekPreview) seekPreview.style.display = 'block';
    });
    
    progressContainer.addEventListener('mouseleave', () => {
        const seekPreview = document.getElementById('seek-preview');
        if (seekPreview) seekPreview.style.display = 'none';
        progressContainer.title = '';
    });
    
    // Add hover effects to transport controls
    controls.addEventListener('mouseenter', () => {
        controls.style.opacity = '1';
    });
    
    controls.addEventListener('mouseleave', () => {
        controls.style.opacity = '0.2';
    });
    
    // Add click handlers
    controls.querySelector('.prev-track')?.addEventListener('click', () => this.changeTrack('prev'));
    controls.querySelector('.play-pause')?.addEventListener('click', () => this.togglePlayPause());
    controls.querySelector('.next-track')?.addEventListener('click', () => this.changeTrack('next'));
    controls.querySelector('.volume-up')?.addEventListener('click', () => this.audioSystem.adjustVolume(0.05));
    controls.querySelector('.volume-down')?.addEventListener('click', () => this.audioSystem.adjustVolume(-0.05));
    controls.querySelector('.track-list')?.addEventListener('click', () => this.toggleTrackList());
    
    document.body.appendChild(controls);
    
    // Initial update of the progress bar
    this.updateTrackProgress();
    
    // Update the play/pause button to reflect initial state
    this.updatePlayPauseButton();
  }

  toggleTrackList(): void {
    this.trackListPopup.toggle();
  }

  updateTrackProgress(): void {
    const progressBar = document.getElementById('track-progress-bar');
    if (!progressBar) return;
    
    // Calculate progress percentage
    const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100 || 0;
    progressBar.style.width = `${progress}%`;
    
    // Update time display if available
    const timeDisplay = document.getElementById('track-time-display');
    if (timeDisplay) {
        const currentTime = this.formatTime(this.audioElement.currentTime);
        const totalTime = this.formatTime(this.audioElement.duration);
        timeDisplay.textContent = `${currentTime} / ${totalTime}`;
    }
  }

  // Add the missing formatTime utility function
  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "00:00";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  changeTrack(direction: 'next' | 'prev'): void {
    if (!this.audioElement || this.audioSystem.getTracks().length === 0) return;
    
    // Find the current index
    let currentIndex = this.audioSystem.getTracks().findIndex(file => file.url === this.audioSystem.selectedTrackURL);
    if (currentIndex === -1) currentIndex = 0;
    
    // Calculate new index
    if (direction === 'next') {
        this.audioSystem.playNext();
    } else if (direction === 'prev') {
        this.audioSystem.playPrevious();
    }
    
    // Update track list if visible after track change
    if (this.trackListPopup.visible) {
      this.trackListPopup.updateTrackList();
    }
  }
  
  // Add the showTrackNotification method that was being called but wasn't defined
  showTrackNotification(trackName: string): void {
    // Simple notification implementation
    console.log(`Now playing: ${trackName}`);
    // You could implement a proper visual notification here
  }

  togglePlayPause(): void {
    if (!this.audioElement) return;
    
    if (this.audioElement.paused) {
      this.audioElement.play();
      this.audioIsPlaying = true;
    } else {
      this.audioElement.pause();
      this.audioIsPlaying = false;
    }
    
    // Update track list if visible after play/pause
    if (this.trackListPopup.visible) {
      this.trackListPopup.updateTrackList();
    }
  }
  
  updatePlayPauseButton(): void {
    const playPauseButton = document.querySelector('.play-pause') as HTMLElement;
    if (playPauseButton) {
      if (this.audioElement.paused) {
        playPauseButton.textContent = '⏵';
        playPauseButton.title = 'Play (Space key)';
      } else {
        playPauseButton.textContent = '⏸';
        playPauseButton.title = 'Pause (Space key)';
      }
    }
  }
}

export default TransportControls;
