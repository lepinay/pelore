export class TrackListPopup {
    constructor(audioSystem) {
        this.isVisible = false;
        this.handleOutsideClick = (e) => {
            const trackListButton = document.querySelector('.track-list');
            if (this.popupElement &&
                !this.popupElement.contains(e.target) &&
                trackListButton &&
                !trackListButton.contains(e.target)) {
                this.hide();
            }
        };
        this.audioSystem = audioSystem;
        this.audioElement = audioSystem.audioElement;
        this.createPopup();
    }
    createPopup() {
        // Create popup container
        this.popupElement = document.createElement('div');
        this.popupElement.id = 'track-list-popup';
        // Style the popup - updated to match SplashScreen styling
        Object.assign(this.popupElement.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#000',
            borderRadius: '10px',
            border: '2px solid #0ff',
            boxShadow: '0 0 20px #0ff',
            padding: '20px',
            zIndex: '200',
            maxWidth: '80%',
            maxHeight: '80vh',
            overflowY: 'auto',
            display: 'none', // Initially hidden
            color: '#0ff',
            fontFamily: "'Press Start 2P', cursive"
        });
        // Add header
        const header = document.createElement('div');
        header.innerHTML = `
      <h2 style="margin-top: 0; text-align: center; color: #0ff; margin-bottom: 15px; font-size: 16px; text-shadow: 0 0 5px #0ff;">TRACK LIST</h2>
      <div id="close-track-list" style="position: absolute; top: 10px; right: 15px; cursor: pointer; font-size: 20px;">×</div>
    `;
        this.popupElement.appendChild(header);
        // Create track list container
        const trackListContainer = document.createElement('div');
        trackListContainer.id = 'track-list-container';
        // Style the track list
        Object.assign(trackListContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        });
        this.popupElement.appendChild(trackListContainer);
        document.body.appendChild(this.popupElement);
        // Add close handler
        document.getElementById('close-track-list')?.addEventListener('click', () => this.hide());
    }
    updateTrackList() {
        const container = document.getElementById('track-list-container');
        if (!container)
            return;
        // Clear existing list
        container.innerHTML = '';
        // Get current track for highlighting
        const currentTrackURL = this.audioSystem.selectedTrackURL;
        // Add each track to the list
        this.audioSystem.getTracks().forEach((track, index) => {
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item';
            trackItem.setAttribute('data-url', track.url);
            // Highlight current track
            const isCurrentTrack = track.url === currentTrackURL;
            // Style track item - updated to match SplashScreen styling
            Object.assign(trackItem.style, {
                padding: '10px 15px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: isCurrentTrack ? '#003333' : '#000',
                border: '2px solid #0ff',
                boxShadow: isCurrentTrack ? '0 0 10px #0ff' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '12px',
                marginBottom: '8px'
            });
            // Add track name
            const trackName = document.createElement('div');
            trackName.textContent = track.name || `Track ${index + 1}`;
            trackName.style.textShadow = isCurrentTrack ? '0 0 5px #0ff' : 'none';
            trackItem.appendChild(trackName);
            // Add currently playing indicator if applicable
            if (isCurrentTrack) {
                const indicator = document.createElement('div');
                indicator.textContent = '▶ NOW PLAYING';
                indicator.style.fontSize = '10px';
                indicator.style.opacity = '0.8';
                indicator.style.textShadow = '0 0 5px #0ff';
                trackItem.appendChild(indicator);
            }
            // Add click handler to play the track
            trackItem.addEventListener('click', () => {
                // Call the callback to handle track selection in the parent component
                this.audioSystem.setTrackByURL(track.url);
                this.audioSystem.play();
                this.hide();
            });
            // Add hover effect - updated to match SplashScreen hover effects
            trackItem.addEventListener('mouseenter', () => {
                trackItem.style.backgroundColor = '#003333';
                trackItem.style.boxShadow = '0 0 10px #0ff';
            });
            trackItem.addEventListener('mouseleave', () => {
                if (!isCurrentTrack) {
                    trackItem.style.backgroundColor = '#000';
                    trackItem.style.boxShadow = 'none';
                }
                else {
                    trackItem.style.backgroundColor = '#003333';
                    trackItem.style.boxShadow = '0 0 10px #0ff';
                }
            });
            container.appendChild(trackItem);
        });
        // Add empty state if no tracks
        if (this.audioSystem.getTracks().length === 0) {
            const emptyState = document.createElement('div');
            emptyState.textContent = 'NO TRACKS AVAILABLE';
            emptyState.style.textAlign = 'center';
            emptyState.style.padding = '20px';
            emptyState.style.opacity = '0.7';
            emptyState.style.fontFamily = "'Press Start 2P', cursive";
            emptyState.style.fontSize = '12px';
            emptyState.style.color = '#0ff';
            container.appendChild(emptyState);
        }
    }
    toggle() {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    }
    show() {
        if (!this.popupElement)
            return;
        // Update the track list before showing
        this.updateTrackList();
        this.popupElement.style.display = 'block';
        this.isVisible = true;
        // Add click outside to close
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick);
        }, 10);
    }
    hide() {
        if (!this.popupElement)
            return;
        this.popupElement.style.display = 'none';
        this.isVisible = false;
        // Remove click outside handler
        document.removeEventListener('click', this.handleOutsideClick);
    }
    get visible() {
        return this.isVisible;
    }
}
export default TrackListPopup;
//# sourceMappingURL=TrackListPopup.js.map