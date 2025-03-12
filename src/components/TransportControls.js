class TransportControls {
  constructor(audioSystem) {
    this.audioSystem = audioSystem;
    this.audioIsPlaying = false;
    this.audioElement = audioSystem.audioElement;
    
    // Create the UI elements
    this.createTransportControls();
  }

  createTransportControls() {
    const controls = document.createElement('div');
    controls.id = 'transport-controls';
    controls.innerHTML = `
        <div class="transport-button prev-track" title="Previous Track (P key)">◀◀</div>
        <div class="transport-button volume-down" title="Volume Down (Shift+Down key)">🔉</div>
        <div class="transport-button volume-up" title="Volume Up (Shift+Up key)">🔊</div>
        <div class="transport-button next-track" title="Next Track (N key)">▶▶</div>
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
        Object.assign(button.style, {
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
    const progressContainer = controls.querySelector('.track-progress-container');
    Object.assign(progressContainer.style, {
        width: '100%',
        height: '8px',
        backgroundColor: 'rgba(0, 30, 30, 0.8)',
        borderRadius: '4px',
        margin: '10px 0 5px 0',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(0, 255, 255, 0.3)'
    });
    
    // Style the progress bar
    const progressBar = controls.querySelector('#track-progress-bar');
    Object.assign(progressBar.style, {
        width: '0%',
        height: '100%',
        backgroundColor: '#0ff',
        position: 'absolute',
        left: '0',
        top: '0',
        transition: 'width 0.3s'
    });
    
    // Style the time display
    const timeDisplay = controls.querySelector('#track-time-display');
    Object.assign(timeDisplay.style, {
        fontFamily: "'Press Start 2P', cursive",
        fontSize: '10px',
        color: '#0ff',
        textAlign: 'center',
        width: '100%',
        marginTop: '3px'
    });
    
    // Make progress bar interactive - seek functionality
    progressContainer.addEventListener('click', function(e) {
        if (!this.audioElement || !this.isAudioPlaying) return;
        
        const rect = this.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        
        // Seek to the clicked position
        if (this.audioElement.duration) {
            this.audioElement.currentTime = this.audioElement.duration * percentage;
            updateTrackProgress();
        }
    });
    
    // Add hover effects to transport controls
    controls.addEventListener('mouseenter', () => {
        controls.style.opacity = '1';
    });
    
    controls.addEventListener('mouseleave', () => {
        controls.style.opacity = '0.2';
    });
    
    // Add click handlers
    controls.querySelector('.prev-track').addEventListener('click', () => changeTrack('prev'));
    controls.querySelector('.next-track').addEventListener('click', () => changeTrack('next'));
    controls.querySelector('.volume-up').addEventListener('click', () => adjustVolume(0.05));
    controls.querySelector('.volume-down').addEventListener('click', () => adjustVolume(-0.05));
    
    document.body.appendChild(controls);
    
    // Initial update of the progress bar
    this.updateTrackProgress();    
  }

  updateTrackProgress() {
    if (!this.audioElement || !this.isAudioPlaying) return;
    
    const progressBar = document.getElementById('track-progress-bar');
    if (!progressBar) return;
    
    // Calculate progress percentage
    const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100 || 0;
    progressBar.style.width = `${progress}%`;
    
    // Update time display if available
    const timeDisplay = document.getElementById('track-time-display');
    if (timeDisplay) {
        const currentTime = formatTime(this.audioElement.currentTime);
        const totalTime = formatTime(this.audioElement.duration);
        timeDisplay.textContent = `${currentTime} / ${totalTime}`;
    }
  }
  

}

export default TransportControls; 