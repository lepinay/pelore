class AudioSystem {
    constructor() {
        this.trackChangeListeners = [];
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
    setupAudio() {
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
    async loadMusicTracks() {
        try {
            const response = await fetch('tracks.json');
            if (!response.ok)
                throw new Error('Failed to load tracks');
            const data = await response.json();
            this.tracks = data.map(track => ({
                url: track.url,
                name: track.name
            }));
        }
        catch (error) {
            console.error('Error loading tracks:', error);
        }
    }
    getTracks() {
        return this.tracks;
    }
    cacheTracks() {
        try {
            localStorage.setItem('localMusicFiles', JSON.stringify(this.tracks));
        }
        catch (error) {
            console.warn('Failed to cache tracks:', error);
        }
    }
    loadCachedTracks() {
        try {
            const cached = localStorage.getItem('localMusicFiles');
            if (cached) {
                this.tracks = JSON.parse(cached);
                return true;
            }
        }
        catch (error) {
            console.warn('Failed to load cached tracks:', error);
        }
        return false;
    }
    initEventListeners() {
        this.audioElement.addEventListener('timeupdate', () => this.updateTrackProgress());
        this.audioElement.addEventListener('ended', () => this.playNext());
    }
    loadSavedPreferences() {
        try {
            const savedVolume = localStorage.getItem('musicVolume');
            if (savedVolume)
                this.volume = parseFloat(savedVolume);
            const savedTrack = localStorage.getItem('selectedMusic');
            if (savedTrack)
                this.selectedTrackURL = savedTrack;
        }
        catch (error) {
            console.warn('Error loading preferences:', error);
        }
    }
    async play(url = this.selectedTrackURL) {
        if (url === 'none' || !url)
            return;
        try {
            this.audioElement.src = url;
            this.audioElement.volume = this.volume;
            this.audioElement.crossOrigin = 'anonymous';
            await this.audioContext.resume();
            await this.audioElement.play();
            this.isPlaying = true;
        }
        catch (error) {
            console.error('Playback error:', error);
            this.isPlaying = false;
        }
    }
    pause() {
        this.audioElement.pause();
        this.isPlaying = false;
    }
    togglePlay() {
        this.isPlaying ? this.pause() : this.play();
    }
    playNext() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.selectedTrackURL = this.tracks[this.currentTrackIndex].url;
        this.play();
        this.notifyTrackChangeListeners();
        return this.currentTrackIndex;
    }
    playPrevious() {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        this.selectedTrackURL = this.tracks[this.currentTrackIndex].url;
        this.play();
        this.notifyTrackChangeListeners();
        return this.currentTrackIndex;
    }
    setTrack(trackIndex) {
        if (typeof trackIndex === 'number' && trackIndex >= 0 && trackIndex < this.tracks.length) {
            this.currentTrackIndex = trackIndex;
            this.selectedTrackURL = this.tracks[trackIndex].url;
            localStorage.setItem('selectedMusic', this.selectedTrackURL);
        }
    }
    setTrackByURL(url) {
        const index = this.tracks.findIndex(track => track.url === url);
        if (index !== -1)
            this.setTrack(index);
        // Update current track and notify listeners
        this.notifyTrackChangeListeners();
    }
    onTrackChange(callback) {
        this.trackChangeListeners.push(callback);
    }
    notifyTrackChangeListeners() {
        for (const listener of this.trackChangeListeners) {
            listener(this.selectedTrackURL);
        }
    }
    getCurrentTrack() {
        return this.tracks[this.currentTrackIndex];
    }
    getVolume() {
        return this.volume;
    }
    setVolume(value) {
        this.volume = Math.min(1, Math.max(0, value));
        this.audioElement.volume = this.volume;
        localStorage.setItem('musicVolume', this.volume.toString());
        return this.volume;
    }
    adjustVolume(delta) {
        return this.setVolume(this.volume + delta);
    }
    updateTrackProgress() {
        const event = new CustomEvent('audioprogress', {
            detail: {
                currentTime: this.audioElement.currentTime,
                duration: this.audioElement.duration,
                progress: this.audioElement.currentTime / this.audioElement.duration || 0
            }
        });
        document.dispatchEvent(event);
    }
    getCurrentTime() {
        return this.audioElement.currentTime;
    }
    getDuration() {
        return this.audioElement.duration;
    }
    getAudioData() {
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.audioData);
            return this.audioData;
        }
        return null;
    }
    findTrackByName(trackName) {
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
    findTrackByURL(url) {
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
//# sourceMappingURL=AudioSystem.js.map