class TransportControls {
    constructor(audioSystem) {
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
        // Create the UI elements
        this.createTransportControls();
    }
    createTransportControls() {
        const controls = document.createElement('div');
        controls.id = 'transport-controls';
        controls.innerHTML = `
        <div class="transport-button prev-track" title="Previous Track (P key)">◀◀</div>
        <div class="transport-button play-pause" title="Play/Pause (Space key)">▶/⏸</div>
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
        progressContainer.addEventListener('click', (e) => {
            if (!this.audioElement || !this.audioIsPlaying)
                return;
            const rect = progressContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            // Seek to the clicked position
            if (this.audioElement.duration) {
                this.audioElement.currentTime = this.audioElement.duration * percentage;
                this.updateTrackProgress();
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
        controls.querySelector('.prev-track')?.addEventListener('click', () => this.changeTrack('prev'));
        controls.querySelector('.play-pause')?.addEventListener('click', () => this.togglePlayPause());
        controls.querySelector('.next-track')?.addEventListener('click', () => this.changeTrack('next'));
        controls.querySelector('.volume-up')?.addEventListener('click', () => this.audioSystem.adjustVolume(0.05));
        controls.querySelector('.volume-down')?.addEventListener('click', () => this.audioSystem.adjustVolume(-0.05));
        document.body.appendChild(controls);
        // Initial update of the progress bar
        this.updateTrackProgress();
        // Update the play/pause button to reflect initial state
        this.updatePlayPauseButton();
    }
    updateTrackProgress() {
        const progressBar = document.getElementById('track-progress-bar');
        if (!progressBar)
            return;
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
    formatTime(seconds) {
        if (!seconds || isNaN(seconds))
            return "00:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(remainingSeconds).padStart(2, '0');
        return `${formattedMinutes}:${formattedSeconds}`;
    }
    changeTrack(direction) {
        if (!this.audioElement || this.audioSystem.getTracks().length === 0)
            return;
        // Find the current index
        let currentIndex = this.audioSystem.getTracks().findIndex(file => file.url === this.audioSystem.selectedTrackURL);
        if (currentIndex === -1)
            currentIndex = 0;
        // Calculate new index
        if (direction === 'next') {
            this.audioSystem.playNext();
        }
        else if (direction === 'prev') {
            this.audioSystem.playPrevious();
        }
    }
    // Add the showTrackNotification method that was being called but wasn't defined
    showTrackNotification(trackName) {
        // Simple notification implementation
        console.log(`Now playing: ${trackName}`);
        // You could implement a proper visual notification here
    }
    togglePlayPause() {
        if (!this.audioElement)
            return;
        if (this.audioElement.paused) {
            this.audioElement.play();
            this.audioIsPlaying = true;
        }
        else {
            this.audioElement.pause();
            this.audioIsPlaying = false;
        }
    }
    updatePlayPauseButton() {
        const playPauseButton = document.querySelector('.play-pause');
        if (playPauseButton) {
            if (this.audioElement.paused) {
                playPauseButton.textContent = '▶';
                playPauseButton.title = 'Play (Space key)';
            }
            else {
                playPauseButton.textContent = '⏸';
                playPauseButton.title = 'Pause (Space key)';
            }
        }
    }
}
export default TransportControls;
//# sourceMappingURL=TransportControls.js.map