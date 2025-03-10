document.addEventListener("DOMContentLoaded", function () {
    const displayCanvas = document.getElementById('demoCanvas');
    const displayCtx = displayCanvas.getContext('2d');

    // Create splash screen with tunnel canvas
    const splashScreen = document.createElement('div');
    splashScreen.id = 'splash-screen';
    splashScreen.innerHTML = `
        <canvas id="tunnel-canvas"></canvas>
        <div class="splash-content">
            <h1>SYSTEM 1.3 INITIALISED.</h1>
            <div class="music-selector">
                <div class="music-selection-text">SELECT TUNE:</div>
                <select id="music-select" class="music-select">
                    <option value="loading">Loading tracks...</option>
                </select>
            </div>
            <div class="crt-text">Click to start</div>
            <div class="scanline"></div>
        </div>
    `;
    document.body.appendChild(splashScreen);
    
    // Initialize WebGL tunnel effect
    const tunnelCanvas = document.getElementById('tunnel-canvas');
    let gl = tunnelCanvas.getContext('webgl') || tunnelCanvas.getContext('experimental-webgl');
    
    if (!gl) {
        console.warn("WebGL not supported. Falling back to canvas rendering.");
        gl = null;
    }
    
    // Style the tunnel canvas to cover the full screen
    tunnelCanvas.style.position = 'absolute';
    tunnelCanvas.style.top = '0';
    tunnelCanvas.style.left = '0';
    tunnelCanvas.style.width = '100%';
    tunnelCanvas.style.height = '100%';
    tunnelCanvas.style.zIndex = '-1';
    
    // Tunnel effect parameters
    const tunnelEffect = {
        animationId: null,
        time: 0,
        speed: 0.03,
        running: false,
        // Shader parameters
        program: null,
        buffer: null,
        uniforms: {},
        // Tunnel appearance
        colorSpeed: 0.3,
        zoomSpeed: 0.5,
        tunnelRadius: 0.5
    };
    
    // Set canvas dimensions
    function resizeTunnelCanvas() {
        tunnelCanvas.width = window.innerWidth;
        tunnelCanvas.height = window.innerHeight;
        
        if (gl) {
            gl.viewport(0, 0, tunnelCanvas.width, tunnelCanvas.height);
        }
    }
    
    window.addEventListener('resize', resizeTunnelCanvas);
    resizeTunnelCanvas();
    
    // Initialize WebGL shader program for the tunnel effect
    function initTunnelShader() {
        if (!gl) return false;
        
        // Vertex shader source
        const vertexShaderSource = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        
        // Fragment shader source - this is where the tunnel magic happens
        const fragmentShaderSource = `
            precision mediump float;
            
            uniform float time;
            uniform vec2 resolution;
            uniform float tunnelRadius;
            uniform float colorSpeed;
            uniform float zoomSpeed;
            
            #define PI 3.14159265358979323846
            #define TWO_PI 6.28318530718
            
            // Helper function to create seamless patterns
            vec3 seamlessPattern(float angle, float depth) {
                // Normalize angle to 0-1 range for perfect wrapping
                angle = fract(angle / TWO_PI);
                
                // Create seamless color gradients with careful phase adjustments
                float r = sin(angle * TWO_PI * 3.0 + time * colorSpeed) * 0.5 + 0.5;
                float g = sin(depth * 5.0 + time * colorSpeed * 0.7) * 0.5 + 0.5;
                float b = sin((angle * 4.0 + depth * 3.0) * TWO_PI + time * colorSpeed * 1.3) * 0.5 + 0.5;
                
                // Add subtle waves that are also seamless
                r += sin(depth * 8.0) * 0.1;
                g += sin(angle * TWO_PI * 6.0) * 0.1;
                b += sin(depth * 10.0 + angle * TWO_PI * 4.0) * 0.1;
                
                return vec3(r, g, b);
            }
            
            void main() {
                // Normalized coordinates (centered, -1 to 1)
                vec2 uv = (gl_FragCoord.xy / resolution.xy) * 2.0 - 1.0;
                
                // Correct for aspect ratio
                uv.x *= resolution.x / resolution.y;
                
                // Calculate polar coordinates for tunnel effect
                float radius = length(uv);
                float angle = atan(uv.y, uv.x); // Range: -PI to PI
                
                // Ensure angle is in 0-2PI range for seamless wrapping
                if (angle < 0.0) angle += TWO_PI;
                
                // Create tunnel depth illusion with inverse radius
                float depth = tunnelRadius / max(0.01, radius);
                
                // Animate movement along the tunnel with perfect looping
                depth = fract(depth + time * zoomSpeed);
                
                // Animate rotation of the tunnel
                float rotationAngle = angle + time * 0.2;
                
                // Generate seamless colors
                vec3 color = seamlessPattern(rotationAngle, depth);
                
                // Make edge of tunnel darker for a vignette effect
                float edge = 1.0 - smoothstep(0.5, 1.5, radius);
                
                // Final color with edge darkening
                gl_FragColor = vec4(color * edge, 1.0);
            }
        `;
        
        // Create and compile shaders
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader compile error:', gl.getShaderInfoLog(vertexShader));
            return false;
        }
        
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader compile error:', gl.getShaderInfoLog(fragmentShader));
            return false;
        }
        
        // Create shader program
        tunnelEffect.program = gl.createProgram();
        gl.attachShader(tunnelEffect.program, vertexShader);
        gl.attachShader(tunnelEffect.program, fragmentShader);
        gl.linkProgram(tunnelEffect.program);
        
        if (!gl.getProgramParameter(tunnelEffect.program, gl.LINK_STATUS)) {
            console.error('Shader program link error:', gl.getProgramInfoLog(tunnelEffect.program));
            return false;
        }
        
        // Create fullscreen quad
        const vertices = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0
        ]);
        
        tunnelEffect.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tunnelEffect.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // Store uniform locations
        tunnelEffect.uniforms = {
            time: gl.getUniformLocation(tunnelEffect.program, 'time'),
            resolution: gl.getUniformLocation(tunnelEffect.program, 'resolution'),
            tunnelRadius: gl.getUniformLocation(tunnelEffect.program, 'tunnelRadius'),
            colorSpeed: gl.getUniformLocation(tunnelEffect.program, 'colorSpeed'),
            zoomSpeed: gl.getUniformLocation(tunnelEffect.program, 'zoomSpeed')
        };
        
        return true;
    }
    
    // Render the tunnel effect using WebGL shaders
    function renderTunnelShader() {
        if (!gl || !tunnelEffect.program) return;
        
        gl.useProgram(tunnelEffect.program);
        
        // Update uniforms
        gl.uniform1f(tunnelEffect.uniforms.time, tunnelEffect.time);
        gl.uniform2f(tunnelEffect.uniforms.resolution, tunnelCanvas.width, tunnelCanvas.height);
        gl.uniform1f(tunnelEffect.uniforms.tunnelRadius, tunnelEffect.tunnelRadius);
        gl.uniform1f(tunnelEffect.uniforms.colorSpeed, tunnelEffect.colorSpeed);
        gl.uniform1f(tunnelEffect.uniforms.zoomSpeed, tunnelEffect.zoomSpeed);
        
        // Set up position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, tunnelEffect.buffer);
        const positionLocation = gl.getAttribLocation(tunnelEffect.program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Draw fullscreen quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    // Start tunnel effect
    function startTunnelEffect() {
        if (tunnelEffect.running) return;
        
        // Initialize shader if we have WebGL
        let useShader = false;
        if (gl) {
            useShader = initTunnelShader();
        }
        
        tunnelEffect.running = true;
        tunnelEffect.time = 0;
        
        // Animation loop
        function animate() {
            if (!tunnelEffect.running) return;
            
            // Update time
            tunnelEffect.time += tunnelEffect.speed;
            
            // Render using WebGL shader
            if (useShader) {
                renderTunnelShader();
            }
            
            tunnelEffect.animationId = requestAnimationFrame(animate);
        }
        
        animate();
    }
    
    // Stop tunnel effect - improved version
    function stopTunnelEffect() {
        if (!tunnelEffect.running) return;
        
        tunnelEffect.running = false;
        
        // Cancel animation frame to stop rendering
        if (tunnelEffect.animationId) {
            cancelAnimationFrame(tunnelEffect.animationId);
            tunnelEffect.animationId = null;
        }
        
        // Clean up WebGL resources
        if (gl && tunnelEffect.program) {
            // Delete buffers
            if (tunnelEffect.buffer) {
                gl.deleteBuffer(tunnelEffect.buffer);
                tunnelEffect.buffer = null;
            }
            
            // Delete shaders and program
            const shaders = gl.getAttachedShaders(tunnelEffect.program);
            if (shaders) {
                shaders.forEach(shader => gl.deleteShader(shader));
            }
            gl.deleteProgram(tunnelEffect.program);
            tunnelEffect.program = null;
            
            // Reset uniforms
            tunnelEffect.uniforms = {};
        }
    }
    
    // Start tunnel effect when page loads
    startTunnelEffect();
    
    // Style the splash screen
    splashScreen.style.position = 'fixed';
    splashScreen.style.top = '0';
    splashScreen.style.left = '0';
    splashScreen.style.width = '100%';
    splashScreen.style.height = '100%';
    splashScreen.style.backgroundColor = '#000';
    splashScreen.style.display = 'flex';
    splashScreen.style.justifyContent = 'center';
    splashScreen.style.alignItems = 'center';
    splashScreen.style.zIndex = '1000';
    splashScreen.style.cursor = 'pointer';
    splashScreen.style.fontFamily = "'Press Start 2P', cursive";
    splashScreen.style.color = '#fff';
    splashScreen.style.textAlign = 'center';
    
    const splashContent = splashScreen.querySelector('.splash-content');
    splashContent.style.position = 'relative';
    splashContent.style.padding = '20px';
    
    const splashTitle = splashScreen.querySelector('h1');
    splashTitle.style.fontSize = '32px';
    splashTitle.style.marginBottom = '20px'; // Reduced from 40px to make space for music selector
    splashTitle.style.color = '#0ff';
    splashTitle.style.textShadow = '0 0 10px #0ff, 0 0 20px #0ff';
    
    // Style music selector
    const musicSelector = splashScreen.querySelector('.music-selector');
    musicSelector.style.marginBottom = '30px';
    musicSelector.style.fontFamily = "'Press Start 2P', cursive";
    musicSelector.style.color = '#0ff';
    
    // IMPORTANT: Stop click events on the music selector from propagating to the splash screen
    musicSelector.addEventListener('click', function(event) {
        event.stopPropagation();
    });
    
    const musicSelectionText = splashScreen.querySelector('.music-selection-text');
    musicSelectionText.style.fontSize = '14px';
    musicSelectionText.style.marginBottom = '10px';
    musicSelectionText.style.textShadow = '0 0 5px #0ff';
    
    const musicSelect = splashScreen.querySelector('#music-select');
    musicSelect.style.fontFamily = "'Press Start 2P', cursive";
    musicSelect.style.fontSize = '12px';
    musicSelect.style.backgroundColor = '#000';
    musicSelect.style.color = '#0ff';
    musicSelect.style.border = '2px solid #0ff';
    musicSelect.style.padding = '8px';
    musicSelect.style.borderRadius = '4px';
    musicSelect.style.outline = 'none';
    musicSelect.style.boxShadow = '0 0 10px #0ff';
    musicSelect.style.width = '300px';
    musicSelect.style.cursor = 'pointer';
    musicSelect.style.textAlign = 'center';
    
    // Add hover effect
    musicSelect.addEventListener('mouseover', () => {
        musicSelect.style.backgroundColor = '#003333';
    });
    
    musicSelect.addEventListener('mouseout', () => {
        musicSelect.style.backgroundColor = '#000';
    });
    
    const clickText = splashScreen.querySelector('.crt-text');
    clickText.style.fontSize = '20px';
    clickText.style.animation = 'pulse 1.5s infinite';
    
    // Add blinking animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        
        @keyframes scanline {
            0% { transform: translateY(0); }
            100% { transform: translateY(100%); }
        }
        
        .scanline {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background-color: rgba(255, 255, 255, 0.1);
            animation: scanline 2s linear infinite;
            pointer-events: none;
        }
        
        #splash-screen {
            transition: opacity 0.8s;
        }
    `;
    document.head.appendChild(style);

    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCanvas.width = 800; // Fixed dimension
    offscreenCanvas.height = 600; // Fixed dimension

    // Audio context and analyzer setup
    let audioContext;
    let audioAnalyser;
    let audioSource;
    let audioData;
    let isAudioPlaying = false;
    let audioElement;
    let selectedMusicURL = 'tracks/default.mp3'; // Default fallback
    let isDemoStarted = false;
    const musicFilesCache = {}; // Cache for music file listings
    
    // Track control variables
    let volume = 0.7; // Default volume (0-1)
    let currentTrackIndex = 0;
    let musicFiles = []; // Will hold the list of available tracks
    let trackProgressInterval = null; // For updating the progress bar

    // Load music files from the local JSON file
    async function fetchMusicFiles() {
        try {
            // Try to fetch the tracks.json file
            const response = await fetch('tracks.json');
            
            if (!response.ok) {
                throw new Error(`Failed to fetch tracks.json: ${response.status} ${response.statusText}`);
            }
            
            const tracksList = await response.json();
            
            // Format the tracks into the needed structure
            const musicFiles = tracksList.map(track => {
                return {
                    url: `${track.url}`,
                    name: track.name
                };
            });
            
            // Cache this list for future use
            try {
                localStorage.setItem('localMusicFiles', JSON.stringify(musicFiles));
            } catch (err) {
                console.warn('Failed to cache music files:', err);
            }
            
            populateMusicSelect(musicFiles);
            
        } catch (error) {
            console.error('Error loading tracks from JSON:', error);
            
            // Try fallback to localStorage if available
            if (localStorage.getItem('localMusicFiles')) {
                console.log('Using cached track list from localStorage');
                const cachedData = JSON.parse(localStorage.getItem('localMusicFiles'));
                populateMusicSelect(cachedData);
                return;
            }
            
            // Last resort fallback
            console.log('Using hardcoded fallback track list');
            const fallbackFiles = [
                { url: 'tracks/Syndicate_Intro.mp3', name: 'Syndicate Intro' },
                { url: 'tracks/Xenon_2_Megablast.mp3', name: 'Xenon 2 Megablast' },
                { url: 'tracks/Zool_2.mp3', name: 'Zool 2' }
            ];
            populateMusicSelect(fallbackFiles);
        }
    }

    // Populate the music selection dropdown
    function populateMusicSelect(files) {
        // Store music files globally for track controls
        musicFiles = files;
        
        const select = document.getElementById('music-select');
        if (!select) return; // In case the splash screen is already removed
        
        select.innerHTML = ''; // Clear loading option
        
        // Add a special "No Music" option
        const noMusicOption = document.createElement('option');
        noMusicOption.value = 'none';
        noMusicOption.textContent = '-- No Music --';
        select.appendChild(noMusicOption);
        
        // Sort music files alphabetically
        musicFiles.sort((a, b) => a.name.localeCompare(b.name));
        
        // Add each music file as an option
        musicFiles.forEach((file, index) => {
            const option = document.createElement('option');
            option.value = file.url;
            option.textContent = file.name;
            
            // If we have a previously saved selection, select it
            try {
                const savedMusic = localStorage.getItem('selectedMusic');
                if (savedMusic && savedMusic === file.url) {
                    option.selected = true;
                    selectedMusicURL = file.url;
                } 
                // Otherwise, select a random track as default (but only if there was no saved selection)
                else if (!savedMusic && index === Math.floor(Math.random() * musicFiles.length)) {
                    option.selected = true;
                    selectedMusicURL = file.url;
                }
            } catch (e) {
                // If random track is selected, update selectedMusicURL
                if (index === Math.floor(Math.random() * musicFiles.length)) {
                    option.selected = true;
                    selectedMusicURL = file.url;
                }
            }
            
            select.appendChild(option);
        });
        
        // Update selected music URL when dropdown changes
        select.addEventListener('change', function(event) {
            // Stop propagation to prevent triggering splash screen click
            event.stopPropagation();
            
            selectedMusicURL = this.value;
            
            // Save selection to localStorage
            try {
                localStorage.setItem('selectedMusic', selectedMusicURL);
            } catch (e) {
                console.warn('Could not save music selection to localStorage:', e);
            }
        });
        
        // Prevent dropdown clicks from propagating to splash screen
        select.addEventListener('click', function(event) {
            event.stopPropagation();
        });
        
        // Try to load the saved volume from localStorage
        try {
            const savedVolume = localStorage.getItem('musicVolume');
            if (savedVolume !== null) {
                volume = parseFloat(savedVolume);
                // Ensure volume is within valid range
                volume = Math.max(0, Math.min(1, volume));
            }
        } catch (e) {
            console.warn("Could not load saved volume", e);
        }
    }
    
    // Start loading music list as soon as possible
    fetchMusicFiles();

    // Initialize audio system
    function initAudio() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 256;
        audioData = new Uint8Array(audioAnalyser.frequencyBinCount);
        
        // Create audio element but don't set src yet
        audioElement = new Audio();
        audioElement.loop = true;
        audioElement.volume = volume; // Set initial volume
        
        // Add timeupdate event handler to update progress bar
        audioElement.addEventListener('timeupdate', updateTrackProgress);
        
        // Set up audio source immediately
        audioSource = audioContext.createMediaElementSource(audioElement);
        audioSource.connect(audioAnalyser);
        audioAnalyser.connect(audioContext.destination);
        
        // Do not autoplay - wait for splash screen click
        console.log("Audio ready, waiting for user interaction");
    }
    
    // Function to update the progress bar during playback
    function updateTrackProgress() {
        if (!audioElement || !isAudioPlaying) return;
        
        const progressBar = document.getElementById('track-progress-bar');
        if (!progressBar) return;
        
        // Calculate progress percentage
        const progress = (audioElement.currentTime / audioElement.duration) * 100 || 0;
        progressBar.style.width = `${progress}%`;
        
        // Update time display if available
        const timeDisplay = document.getElementById('track-time-display');
        if (timeDisplay) {
            const currentTime = formatTime(audioElement.currentTime);
            const totalTime = formatTime(audioElement.duration);
            timeDisplay.textContent = `${currentTime} / ${totalTime}`;
        }
    }
    
    // Helper function to format time as MM:SS
    function formatTime(timeInSeconds) {
        if (isNaN(timeInSeconds)) return '00:00';
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Function to change tracks
    function changeTrack(direction) {
        if (!audioElement || musicFiles.length === 0) return;
        
        // Find the current index
        let currentIndex = musicFiles.findIndex(file => file.url === selectedMusicURL);
        if (currentIndex === -1) currentIndex = 0;
        
        // Calculate new index
        let newIndex;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % musicFiles.length;
        } else if (direction === 'prev') {
            newIndex = (currentIndex - 1 + musicFiles.length) % musicFiles.length;
        } else {
            return;
        }
        
        // Update selected track
        selectedMusicURL = musicFiles[newIndex].url;
        
        // Save selection to localStorage
        try {
            localStorage.setItem('selectedMusic', selectedMusicURL);
        } catch (e) {
            console.warn('Could not save music selection to localStorage:', e);
        }
        
        // Update audio if playing
        if (audioElement) {
            const wasPlaying = !audioElement.paused;
            audioElement.src = selectedMusicURL;
            audioElement.crossOrigin = 'anonymous';
            
            if (wasPlaying) {
                audioElement.play()
                    .then(() => {
                        isAudioPlaying = true;
                        showTrackNotification(musicFiles[newIndex].name);
                        // Reset progress bar
                        updateTrackProgress();
                    })
                    .catch(error => {
                        console.error("Error changing track:", error);
                    });
            } else {
                showTrackNotification(musicFiles[newIndex].name);
                // Reset progress bar even when not playing
                updateTrackProgress();
            }
        }
    }
    
    // Function to adjust volume
    function adjustVolume(change) {
        if (!audioElement) return;
        
        // Update volume (ensure it stays between 0-1)
        volume = Math.max(0, Math.min(1, volume + change));
        audioElement.volume = volume;
        
        // Save volume to localStorage
        try {
            localStorage.setItem('musicVolume', volume.toString());
        } catch (e) {
            console.warn('Could not save volume to localStorage:', e);
        }
        
        // Show volume indicator
        showVolumeIndicator();
    }
    
    // Function to display volume indicator
    function showVolumeIndicator() {
        // Remove existing indicator if present
        const existingIndicator = document.getElementById('volume-indicator');
        if (existingIndicator) {
            document.body.removeChild(existingIndicator);
        }
        
        const indicator = document.createElement('div');
        indicator.id = 'volume-indicator';
        
        // Create visual volume bar
        const volumeBarContainer = document.createElement('div');
        volumeBarContainer.style.width = '150px';
        volumeBarContainer.style.height = '15px';
        volumeBarContainer.style.border = '2px solid #0ff';
        volumeBarContainer.style.position = 'relative';
        volumeBarContainer.style.marginTop = '10px';
        
        const volumeBar = document.createElement('div');
        volumeBar.style.width = `${volume * 100}%`;
        volumeBar.style.height = '100%';
        volumeBar.style.backgroundColor = '#0ff';
        volumeBar.style.position = 'absolute';
        volumeBar.style.top = '0';
        volumeBar.style.left = '0';
        volumeBar.style.transition = 'width 0.2s';
        
        volumeBarContainer.appendChild(volumeBar);
        
        // Main container
        indicator.innerHTML = `<div>Volume: ${Math.round(volume * 100)}%</div>`;
        indicator.appendChild(volumeBarContainer);
        
        Object.assign(indicator.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#0ff',
            padding: '15px',
            borderRadius: '8px',
            fontFamily: "'Press Start 2P', cursive",
            fontSize: '12px',
            textAlign: 'center',
            zIndex: '1000',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
            border: '1px solid #0ff'
        });
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                // Fade out animation
                indicator.style.transition = 'opacity 0.5s';
                indicator.style.opacity = '0';
                setTimeout(() => {
                    if (indicator.parentNode) {
                        document.body.removeChild(indicator);
                    }
                }, 500);
            }
        }, 1500);
    }
    
    // Function to display track change notification
    function showTrackNotification(trackName) {
        const existingNotif = document.getElementById('track-notification');
        if (existingNotif) {
            document.body.removeChild(existingNotif);
        }
        
        const notification = document.createElement('div');
        notification.id = 'track-notification';
        notification.innerHTML = `
            <div>Now Playing:</div>
            <div style="margin-top: 8px; font-size: 14px; color: #0ff;">${trackName}</div>
        `;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px', // Position below volume indicator
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '15px',
            borderRadius: '8px',
            fontFamily: "'Press Start 2P', cursive",
            fontSize: '12px',
            textAlign: 'center',
            zIndex: '1000',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
            border: '1px solid #0ff'
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transition = 'opacity 0.5s';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }
        }, 2500);
    }

    function startDemo() {
        if (isDemoStarted) return;
        isDemoStarted = true;
        window.isDemoStarted = true; // Make it available to window
        
        // Stop tunnel effect BEFORE fading out splash screen
        stopTunnelEffect();
        
        // Fade out and remove splash screen
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            // Make sure WebGL context is released before removing the canvas
            if (gl) {
                gl.getExtension('WEBGL_lose_context')?.loseContext();
                gl = null;
            }
            
            document.body.removeChild(splashScreen);
        }, 800);
        
        // Start audio if a track is selected and it's not "none"
        if (audioContext && audioElement && selectedMusicURL !== 'none') {
            // Set the audio source now
            audioElement.src = selectedMusicURL;
            audioElement.crossOrigin = 'anonymous';
            
            // Set volume from the stored value
            audioElement.volume = volume;
            
            audioContext.resume().then(() => {
                audioElement.play()
                    .then(() => {
                        isAudioPlaying = true;
                        console.log("Audio started successfully");
                    })
                    .catch(error => {
                        console.error("Error starting audio:", error);
                        showAudioErrorMessage();
                    });
            });
        } else {
            console.log("No music selected or music disabled");
        }
        
        // Add transport controls overlay
        createTransportControls();
        
        // Make sure canvas is properly sized
        resizeDisplayCanvas();
        
        // Start rendering
        if (!isRendering) {
            isRendering = true;
            render();
        }
    }
    
    function showAudioErrorMessage() {
        const message = document.createElement('div');
        message.textContent = "Unable to play audio. Demo will continue without sound.";
        message.style.position = "absolute";
        message.style.top = "10px";
        message.style.left = "50%";
        message.style.transform = "translateX(-50%)";
        message.style.color = "white";
        message.style.fontFamily = "'Press Start 2P', cursive";
        message.style.fontSize = "12px";
        message.style.background = "rgba(0, 0, 0, 0.7)";
        message.style.padding = "10px";
        message.style.borderRadius = "5px";
        message.style.zIndex = "100";
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);
    }

    // Modify the splashScreen click handler to avoid starting when clicking on music selector
    splashScreen.addEventListener('click', function(event) {
        // Check if the click was directly on the splash screen and not on its children
        if (event.target === splashScreen || event.target.classList.contains('crt-text') ||
            event.target.classList.contains('splash-content')) {
            startDemo();
        }
    });
    
    // Add a clear "Start" button to make it obvious how to start the demo
    const startButton = document.createElement('button');
    startButton.textContent = 'START DEMO';
    startButton.style.marginTop = '20px';
    startButton.style.padding = '10px 20px';
    startButton.style.backgroundColor = '#0ff';
    startButton.style.color = 'black';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '4px';
    startButton.style.fontFamily = "'Press Start 2P', cursive";
    startButton.style.fontSize = '16px';
    startButton.style.cursor = 'pointer';
    startButton.style.boxShadow = '0 0 10px #0ff';
    
    startButton.addEventListener('mouseover', () => {
        startButton.style.backgroundColor = '#00cccc';
    });
    
    startButton.addEventListener('mouseout', () => {
        startButton.style.backgroundColor = '#0ff';
    });
    
    startButton.addEventListener('click', startDemo);
    
    // Insert after the CRT text
    splashScreen.querySelector('.crt-text').after(startButton);

    function resizeDisplayCanvas() {
        displayCanvas.width = window.innerWidth;
        displayCanvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeDisplayCanvas);
    resizeDisplayCanvas(); // Initialize canvas size on start

    const Directions = {
        NONE: 0,
        TOP: 1,
        BOTTOM: 2,
        LEFT: 3,
        RIGHT: 4
    };

    let text = "Happy birthday...";
    let instructions = "...Roi Pelore !";
    let time = 0;
    let scrollerSpeed = 60.0;
    let copperSpeed = 2.0;
    let flashOpacity = 0;
    let activeDirection = Directions.NONE;
    
    // New variable for number of bars with default value
    let numCopperBars = 40;
    
    // Load preferred bar count from localStorage if available
    try {
        const savedBars = localStorage.getItem('copperBarsCount');
        if (savedBars) {
            numCopperBars = parseInt(savedBars, 10);
            // Ensure it's within valid range
            numCopperBars = Math.min(120, Math.max(4, numCopperBars));
        }
    } catch (e) {
        console.warn("Could not access localStorage:", e);
    }

    let font_width, font_height, baseline_offset;
    const fontSize = 48; // Consistent font size
    const letter_spacing = 4; // Configurable spacing between characters

    const frequency = 0.05;
    const amplitude = 50;

    // Define starfield variables
    const starCount = 300; // Number of stars to create
    const stars = []; // Array to hold star objects
    
    // Define CRT effect object with default values
    const crtEffect = {
        enabled: true,
        scanlineOpacity: 0.1,
        scanlineSpacing: 4,
        curvature: 0.08,
        vignette: 0.3,
        noise: 0.03,
        scanlineSpeed: 0.5,
        scanlineOffset: 0,
        // Audio reactivity parameters
        bassCurvatureImpact: 0.05,
        midRangeScanlineImpact: 0.15,
        highFreqNoiseImpact: 0.1,
        overallReactivity: 1.0,
        // Smoothing parameters for transitions
        lastBassImpact: 0.0,
        lastMidImpact: 0.0,
        lastHighImpact: 0.0
    };

    let y_offset;
    let characterBitmap = {}; // Define the characterBitmap object here

    function x_to_index(x) {
        const total_width = offscreenCanvas.width + 2 * font_width;
        let index = Math.round(((x % total_width) + total_width) % total_width);
        return index;
    }

    function recalculateYOffset() {
        y_offset = new Array(offscreenCanvas.width + 2 * font_width); // Initialize y_offset array here

        for (let x = -font_width; x < offscreenCanvas.width + font_width; x++) {
            const index = x_to_index(x);
            y_offset[index] = Math.sin(x * frequency * (scrollerSpeed / 100)) * amplitude;
        }
    }

    function calculateFontDimensions() {
        let unionTop = 0;
        let unionBottom = 0;
        let unionRight = 0;

        const uniqueChars = [...new Set(text.split(''))];
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `${fontSize}px 'Press Start 2P'`;

        uniqueChars.forEach(char => {
            const metrics = tempCtx.measureText(char);

            const boundingBox = {
                top: -metrics.actualBoundingBoxAscent,
                bottom: metrics.actualBoundingBoxDescent,
                right: Math.ceil(metrics.width)
            };

            unionTop = Math.max(unionTop, Math.abs(boundingBox.top));
            unionBottom = Math.max(unionBottom, boundingBox.bottom);
            unionRight = Math.max(unionRight, boundingBox.right);
        });

        font_width = unionRight + letter_spacing;
        font_height = unionTop + unionBottom;
        baseline_offset = unionTop;
    }

    function initializeCharacterBitmaps() {
        const uniqueChars = [...new Set(text.split(''))];
        uniqueChars.forEach(char => {
            const charCanvas = document.createElement('canvas');
            charCanvas.width = font_width;
            charCanvas.height = font_height;
            const charCtx = charCanvas.getContext('2d');
            charCtx.font = `${fontSize}px 'Press Start 2P'`;
            charCtx.fillStyle = "white";
            const textWidth = charCtx.measureText(char).width;
            const centeredX = (font_width - textWidth) / 2;
            charCtx.fillText(char, centeredX, baseline_offset);
            characterBitmap[char] = charCanvas;
        });
    }

    function initStarfield() {
        // Clear stars array in case this is called multiple times
        stars.length = 0;
        
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * offscreenCanvas.width,
                y: Math.random() * offscreenCanvas.height,
                z: Math.random() * 3 + 0.5, // Depth (0.5-3.5)
                size: Math.random() * 2 + 0.5, // Size (0.5-2.5)
                brightness: Math.random() * 0.5 + 0.5 // Brightness (0.5-1.0)
            });
        }
    }

    function restartDemo() {
        calculateFontDimensions();
        initializeCharacterBitmaps();
        recalculateYOffset();
        initStarfield(); // Initialize the starfield
        initCRTEffect(); // Initialize the optimized CRT effect
    }

    let isRendering = false;

    function update() {
        time += 0.05;
        if (flashOpacity > 0) {
            flashOpacity -= 0.01;
        } else {
            activeDirection = Directions.NONE;
        }

        // Update CRT scanline offset for subtle movement
        crtEffect.scanlineOffset = (crtEffect.scanlineOffset + crtEffect.scanlineSpeed) % crtEffect.scanlineSpacing;

        // Update audio data if playing
        if (isAudioPlaying && audioAnalyser) {
            audioAnalyser.getByteFrequencyData(audioData);
            
            // Enhanced audio reactivity for CRT effects
            if (audioData && crtEffect.enabled) {
                // Get frequency bands for different effects
                const bassRange = getFrequencyRange(audioData, 0, 10);  // Bass (0-10)
                const midRange = getFrequencyRange(audioData, 10, 30);  // Mids (10-30)
                const highRange = getFrequencyRange(audioData, 30, 60); // Highs (30-60)
                const fullRange = getFrequencyRange(audioData, 0, audioData.length / 2); // Full range
                
                // Apply smoothing to transitions (lerp towards target values)
                crtEffect.lastBassImpact = lerp(crtEffect.lastBassImpact, bassRange, 0.1);
                crtEffect.lastMidImpact = lerp(crtEffect.lastMidImpact, midRange, 0.1);
                crtEffect.lastHighImpact = lerp(crtEffect.lastHighImpact, highRange, 0.15);
                
                // Use different frequency bands to control different aspects of CRT effect
                
                // Bass impacts curvature - more bass = more curve
                crtEffect.curvature = 0.08 + (crtEffect.lastBassImpact * crtEffect.bassCurvatureImpact);
                
                // Mid frequencies impact scanline opacity and spacing
                crtEffect.scanlineOpacity = 0.07 + (crtEffect.lastMidImpact * crtEffect.midRangeScanlineImpact);
                crtEffect.scanlineSpacing = 4 - (crtEffect.lastMidImpact * 2); // Between 2-4px spacing
                crtEffect.scanlineSpacing = Math.max(2, Math.min(6, crtEffect.scanlineSpacing)); // Clamp values
                
                // High frequencies impact noise amount
                crtEffect.noise = 0.02 + (crtEffect.lastHighImpact * crtEffect.highFreqNoiseImpact);
                
                // Overall volume affects vignette
                crtEffect.vignette = 0.25 + (fullRange * 0.15);
                
                // Strong beats increase scanline speed temporarily
                if (detectBeat(audioData, 0, 5, 0.6)) {
                    crtEffect.scanlineSpeed = 1.5;
                    setTimeout(() => { crtEffect.scanlineSpeed = 0.5; }, 100);
                }
                
                // Apply overall reactivity scaling
                const reactivityMultiplier = crtEffect.overallReactivity;
                crtEffect.curvature *= reactivityMultiplier;
                crtEffect.scanlineOpacity *= reactivityMultiplier;
                crtEffect.noise *= reactivityMultiplier;
                crtEffect.vignette *= reactivityMultiplier;
            }
        }
    }
    
    // Helper function to calculate average frequency intensity in a range
    function getFrequencyRange(audioData, startBin, endBin) {
        let sum = 0;
        for (let i = startBin; i < endBin && i < audioData.length; i++) {
            sum += audioData[i];
        }
        return sum / (endBin - startBin) / 255; // Normalize to 0-1
    }
    
    // Linear interpolation helper to smooth transitions
    function lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }
    
    // Simple beat detection helper
    function detectBeat(audioData, startBin, endBin, threshold) {
        let sum = 0;
        for (let i = startBin; i < endBin && i < audioData.length; i++) {
            sum += audioData[i];
        }
        const average = sum / (endBin - startBin) / 255;
        return average > threshold;
    }

    function render() {
        update();
        offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        
        drawStarfield(); // Draw starfield first (background)
        drawCopperBars();
        // drawScrollingText();
        // drawInstructions();

        displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        displayCtx.drawImage(offscreenCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
        
        // Apply CRT effect before drawing the triangle
        if (crtEffect.enabled) {
            applyCRTEffect();
        }
        
        drawActiveTriangle();

        requestAnimationFrame(render);
    }

    function applyCRTEffect() {
        const width = displayCanvas.width;
        const height = displayCanvas.height;
        
        // Store current canvas content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(displayCanvas, 0, 0);
        
        // 1. Apply scanlines (much more efficient than pixel-by-pixel)
        displayCtx.clearRect(0, 0, width, height);
        displayCtx.drawImage(tempCanvas, 0, 0);
        
        // Apply scanlines using composite operations
        displayCtx.fillStyle = `rgba(0, 0, 0, ${crtEffect.scanlineOpacity})`;
        for (let y = Math.floor(crtEffect.scanlineOffset) % crtEffect.scanlineSpacing; 
             y < height; 
             y += crtEffect.scanlineSpacing) {
            displayCtx.fillRect(0, y, width, 1);
        }
        
        // 2. Apply vignette effect (darker corners)
        const gradient = displayCtx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 1.5
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${crtEffect.vignette})`);
        
        displayCtx.fillStyle = gradient;
        displayCtx.fillRect(0, 0, width, height);
        
        // 3. RGB split effect using composite operations
        // Create a temporary canvas for red channel
        const redCanvas = document.createElement('canvas');
        redCanvas.width = width;
        redCanvas.height = height;
        const redCtx = redCanvas.getContext('2d');
        
        // Create a temporary canvas for blue channel
        const blueCanvas = document.createElement('canvas');
        blueCanvas.width = width;
        blueCanvas.height = height;
        const blueCtx = blueCanvas.getContext('2d');
        
        // Extract red channel
        redCtx.drawImage(tempCanvas, 0, 0);
        redCtx.globalCompositeOperation = 'multiply';
        redCtx.fillStyle = 'rgb(255,0,0)';
        redCtx.fillRect(0, 0, width, height);
        
        // Extract blue channel
        blueCtx.drawImage(tempCanvas, 0, 0);
        blueCtx.globalCompositeOperation = 'multiply';
        blueCtx.fillStyle = 'rgb(0,0,255)';
        blueCtx.fillRect(0, 0, width, height);
        
        // Apply RGB split with slight offsets
        displayCtx.globalCompositeOperation = 'screen';
        displayCtx.drawImage(redCanvas, -1, 0); // Red channel offset
        displayCtx.drawImage(blueCanvas, 1, 0);  // Blue channel offset
        displayCtx.globalCompositeOperation = 'source-over';
        
        // 4. Apply curvature through CSS transforms instead of pixel manipulation
        // This is done by applying a CSS transform to the canvas element
        if (crtEffect.curvature > 0) {
            // Apply a subtle bulge distortion using scale transform
            // Remove rotateX which might be causing the flip
            displayCanvas.style.transform = `perspective(${Math.max(width, height)}px) scale(0.95, 0.95)`;
            // Add a subtle border to hide edge artifacts from the transform
            displayCanvas.style.borderRadius = '1%';
        } else {
            displayCanvas.style.transform = 'none';
            displayCanvas.style.borderRadius = '0';
        }
        
        // 5. Add subtle noise occasionally (more efficiently)
        if (Math.random() < 0.2) { // Only occasionally add noise
            displayCtx.fillStyle = `rgba(255,255,255,${crtEffect.noise})`;
            for (let i = 0; i < 10; i++) {
                const noiseX = Math.random() * width;
                const noiseY = Math.random() * height;
                const noiseSize = Math.random() * 3 + 2;
                displayCtx.fillRect(noiseX, noiseY, noiseSize, noiseSize);
            }
        }
    }

    // Add a more performant alternative CRT effect if browsers support WebGL
    function initCRTEffect() {
        // Check if we should use the optimized WebGL version or fallback to Canvas
        if (window.WebGLRenderingContext) {
            try {
                // Create an offscreen WebGL context to check support
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                
                if (gl) {
                    console.log("WebGL supported! Using optimized CRT effect.");
                    // Use the more efficient WebGL-based CRT effect
                    applyCRTEffect = applyWebGLCRTEffect;
                    initWebGLCRT();
                }
            } catch (e) {
                console.warn("WebGL detected but encountered error:", e);
            }
        }
    }

    // WebGL version of the CRT effect (much more performant)
    function initWebGLCRT() {
        const canvas = document.createElement('canvas');
        canvas.width = displayCanvas.width;
        canvas.height = displayCanvas.height;
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) return;
        
        // Store WebGL context and canvas for later use
        window.crtGL = gl;
        window.crtGLCanvas = canvas;
        
        // Create vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, `
            attribute vec2 position;
            varying vec2 texCoord;
            void main() {
                // Standard mapping without flipping
                texCoord = position * 0.5 + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `);
        gl.compileShader(vertexShader);
        
        // Check for shader compilation errors
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error("Vertex shader compilation error:", gl.getShaderInfoLog(vertexShader));
            return;
        }
        
        // Create fragment shader with CRT effects
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, `
            precision mediump float;
            uniform sampler2D textureSampler;
            uniform float time;
            uniform vec2 resolution;
            uniform float curvature;
            uniform float scanlineOpacity;
            uniform float scanlineSpacing;
            uniform float vignette;
            uniform float noise;
            varying vec2 texCoord;
            
            // Pseudo-random function for noise
            float rand(vec2 co) {
                return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            void main() {
                // Aspect-ratio correction
                vec2 aspect = resolution / min(resolution.x, resolution.y);
                vec2 uv = texCoord * aspect;
                vec2 texUV = texCoord;
                
                // Apply barrel distortion (more intense when music is louder)
                float dist = distance(uv, aspect * 0.5);
                float barrelFactor = 1.0 - curvature * dist * dist;
                texUV = (texUV - 0.5) * barrelFactor + 0.5;
                
                // Check if pixel is within bounds after distortion
                if (texUV.x < 0.0 || texUV.x > 1.0 || texUV.y < 0.0 || texUV.y > 1.0) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }
                
                // Apply scanlines with variable spacing based on audio
                float scanLineWidth = 1.0 / scanlineSpacing;
                float scanline = abs(sin(texUV.y * resolution.y * scanLineWidth + time * 0.5));
                scanline = pow(scanline, 1.5) * scanlineOpacity;
                
                // Get texture color
                vec4 color = texture2D(textureSampler, texUV);
                
                // Apply vignette (stronger when music is louder)
                float vignetteAmount = 1.0 - dist * vignette;
                color.rgb *= vignetteAmount;
                
                // Apply scanline
                color.rgb = color.rgb - scanline;
                
                // Add noise based on audio intensity
                float noiseValue = rand(texUV + vec2(time * 0.01, 0.0));
                if (noiseValue < noise) {
                    color.rgb += vec3(0.1, 0.1, 0.1);
                }
                
                // RGB split (chromatic aberration) - varies with music intensity
                float rgbSplit = 0.001 + curvature * 0.01;
                vec4 colorR = texture2D(textureSampler, vec2(texUV.x + rgbSplit, texUV.y));
                vec4 colorB = texture2D(textureSampler, vec2(texUV.x - rgbSplit, texUV.y));
                
                color.r = color.r * 0.3 + colorR.r * 0.7;
                color.b = color.b * 0.3 + colorB.b * 0.7;
                
                gl_FragColor = color;
            }
        `);
        gl.compileShader(fragmentShader);
        
        // Check for fragment shader compilation errors
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error("Fragment shader compilation error:", gl.getShaderInfoLog(fragmentShader));
            return;
        }
        
        // Create shader program
        crtProgram = gl.createProgram();
        gl.attachShader(crtProgram, vertexShader);
        gl.attachShader(crtProgram, fragmentShader);
        gl.linkProgram(crtProgram);
        
        // Check for program linking errors
        if (!gl.getProgramParameter(crtProgram, gl.LINK_STATUS)) {
            console.error("Program linking error:", gl.getProgramInfoLog(crtProgram));
            return;
        }
        
        // Define vertices for a screen-covering quad
        // Use counter-clockwise winding (standard for WebGL front-faces)
        crtBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, crtBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0,   // bottom left
             1.0, -1.0,   // bottom right
            -1.0,  1.0,   // top left
             1.0,  1.0    // top right
        ]), gl.STATIC_DRAW);
        
        // Create texture
        crtTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, crtTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        // Set up uniforms
        gl.useProgram(crtProgram);
        gl.uniform1i(gl.getUniformLocation(crtProgram, "textureSampler"), 0);
    }

    // WebGL version of applying CRT effect
    function applyWebGLCRTEffect() {
        const gl = window.crtGL;
        const glCanvas = window.crtGLCanvas;
        
        if (!gl) {
            // Fall back to canvas-based effect
            return applyCRTEffectCanvas();
        }
        
        // Resize WebGL canvas if needed
        if (glCanvas.width !== displayCanvas.width || glCanvas.height !== displayCanvas.height) {
            glCanvas.width = displayCanvas.width;
            glCanvas.height = displayCanvas.height;
            gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        }
        
        // Update texture with current display canvas content
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, crtTexture);
        
        // WebGL's default assumes texture origin is bottom-left, but canvas is top-left
        // To fix upside-down issue, set UNPACK_FLIP_Y_WEBGL to true
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, displayCanvas);
        
        // Set viewport and clear
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Draw with shader
        gl.useProgram(crtProgram);
        
        // Update uniforms with audio-reactive values
        gl.uniform1f(gl.getUniformLocation(crtProgram, "time"), time);
        gl.uniform2f(gl.getUniformLocation(crtProgram, "resolution"), glCanvas.width, glCanvas.height);
        gl.uniform1f(gl.getUniformLocation(crtProgram, "curvature"), crtEffect.curvature);
        gl.uniform1f(gl.getUniformLocation(crtProgram, "scanlineOpacity"), crtEffect.scanlineOpacity);
        gl.uniform1f(gl.getUniformLocation(crtProgram, "scanlineSpacing"), crtEffect.scanlineSpacing);
        gl.uniform1f(gl.getUniformLocation(crtProgram, "vignette"), crtEffect.vignette);
        gl.uniform1f(gl.getUniformLocation(crtProgram, "noise"), crtEffect.noise);
        
        // Bind quad buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, crtBuffer);
        
        // Set up attribute pointers
        const positionLocation = gl.getAttribLocation(crtProgram, "position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Draw as triangle strip
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        // Draw the result back to the display canvas
        displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        displayCtx.drawImage(glCanvas, 0, 0);
        
        // Add random noise occasionally (directly on canvas) - more frequent with music intensity
        if (Math.random() < (0.05 + crtEffect.noise * 2)) {
            displayCtx.fillStyle = `rgba(255,255,255,${crtEffect.noise * 1.5})`;
            for (let i = 0; i < 3 + Math.floor(crtEffect.noise * 20); i++) {
                const noiseX = Math.random() * displayCanvas.width;
                const noiseY = Math.random() * displayCanvas.height;
                const noiseSize = Math.random() * 3 + (crtEffect.noise * 5);
                displayCtx.fillRect(noiseX, noiseY, noiseSize, noiseSize);
            }
        }
    }

    // Canvas-based fallback (optimized version of original)
    function applyCRTEffectCanvas() {
        const width = displayCanvas.width;
        const height = displayCanvas.height;
        
        // Store original image
        const originalCanvas = document.createElement('canvas');
        originalCanvas.width = width;
        originalCanvas.height = height;
        const originalCtx = originalCanvas.getContext('2d');
        originalCtx.drawImage(displayCanvas, 0, 0);
        
        // Clear for redrawing
        displayCtx.clearRect(0, 0, width, height);
        displayCtx.drawImage(originalCanvas, 0, 0);
        
        // 1. Apply scanlines (much more efficient than pixel manipulation)
        const scanlineCanvas = document.createElement('canvas');
        scanlineCanvas.width = width;
        scanlineCanvas.height = height;
        const scanlineCtx = scanlineCanvas.getContext('2d');
        
        // Create scanline pattern once - spacing varies with audio
        scanlineCtx.fillStyle = `rgba(0,0,0,${crtEffect.scanlineOpacity})`;
        const spacing = Math.max(2, Math.min(6, crtEffect.scanlineSpacing));
        for (let y = Math.floor(crtEffect.scanlineOffset) % spacing; y < height; y += spacing) {
            scanlineCtx.fillRect(0, y, width, 1);
        }
        
        // 2. Apply vignette effect
        const vignetteCanvas = document.createElement('canvas');
        vignetteCanvas.width = width;
        vignetteCanvas.height = height;
        const vignetteCtx = vignetteCanvas.getContext('2d');
        
        const gradient = vignetteCtx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 1.5
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${crtEffect.vignette})`);
        
        vignetteCtx.fillStyle = gradient;
        vignetteCtx.fillRect(0, 0, width, height);
        
        // Apply effects to display canvas
        displayCtx.drawImage(scanlineCanvas, 0, 0);
        displayCtx.drawImage(vignetteCanvas, 0, 0);
        
        // RGB split - ensure we're drawing the original image, not a flipped version
        displayCtx.globalCompositeOperation = 'screen';
        displayCtx.drawImage(originalCanvas, -1, 0); // Offset red
        displayCtx.globalAlpha = 0.2;
        displayCtx.drawImage(originalCanvas, 1, 0);  // Offset blue
        displayCtx.globalAlpha = 1.0;
        displayCtx.globalCompositeOperation = 'source-over';
        
        // Add noise occasionally - frequency and intensity increase with music
        const noiseThreshold = Math.max(0.05, Math.min(0.4, 0.1 + crtEffect.noise * 2));
        if (Math.random() < noiseThreshold) {
            displayCtx.fillStyle = `rgba(255,255,255,${crtEffect.noise})`;
            const noiseCount = Math.floor(5 + crtEffect.noise * 25);
            for (let i = 0; i < noiseCount; i++) {
                displayCtx.fillRect(
                    Math.random() * width,
                    Math.random() * height,
                    Math.random() * 3 + (crtEffect.noise * 5),
                    Math.random() * 3 + (crtEffect.noise * 5)
                );
            }
        }
    }

    function drawStarfield() {
        offscreenCtx.fillStyle = "#000000"; // Clear with black background
        offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        
        let speedMultiplier = 1;
        let sizeMultiplier = 1;
        
        // Audio reactivity for stars
        if (isAudioPlaying && audioData) {
            // Get average of low frequencies
            let bassSum = 0;
            for (let i = 0; i < 10; i++) {
                bassSum += audioData[i];
            }
            const bassAvg = bassSum / 10;
            
            // Speed up stars with bass
            speedMultiplier = 1 + (bassAvg / 255) * 2;
            
            // Increase star brightness with high frequencies
            let trebleSum = 0;
            for (let i = audioAnalyser.frequencyBinCount - 20; i < audioAnalyser.frequencyBinCount; i++) {
                trebleSum += audioData[i];
            }
            const trebleAvg = trebleSum / 20;
            sizeMultiplier = 1 + (trebleAvg / 255);
        }
        
        // Update and draw stars
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            
            // Move stars based on depth (parallax)
            star.x -= star.z * speedMultiplier;
            
            // Reset stars that move off-screen
            if (star.x < 0) {
                star.x = offscreenCanvas.width;
                star.y = Math.random() * offscreenCanvas.height;
            }
            
            // Calculate size based on depth and audio
            const displaySize = star.size * sizeMultiplier;
            
            // Calculate alpha based on brightness and depth
            const alpha = star.brightness * (1 - (star.z - 0.5) / 3);
            
            // Draw star with glow effect
            const gradient = offscreenCtx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, displaySize * 2
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(200, 220, 255, ${alpha * 0.4})`);
            gradient.addColorStop(1, "rgba(200, 220, 255, 0)");
            
            offscreenCtx.fillStyle = gradient;
            offscreenCtx.beginPath();
            offscreenCtx.arc(star.x, star.y, displaySize * 2, 0, Math.PI * 2);
            offscreenCtx.fill();
            
            // Draw star core
            offscreenCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            offscreenCtx.beginPath();
            offscreenCtx.arc(star.x, star.y, displaySize, 0, Math.PI * 2);
            offscreenCtx.fill();
        }
    }

    function drawScrollingText() {
        let baseX = offscreenCanvas.width - ((time * scrollerSpeed) % (text.length * (font_width + letter_spacing) + offscreenCanvas.width));

        for (let i = 0; i < text.length; i++) {
            let x = baseX + i * (font_width + letter_spacing);
            drawCharacterWithSineWave(x, text[i]);
        }
    }

    function drawCharacterWithSineWave(x, character) {
        for (let p = 0; p < font_width; p++) {
            let index = x_to_index(x + p);
            let yOffset = y_offset[index];

            offscreenCtx.drawImage(
                characterBitmap[character],
                p, 0, 1, font_height,
                x + p, (offscreenCanvas.height / 2) + yOffset - baseline_offset,
                1, font_height
            );
        }
    }

    function drawInstructions() {
        offscreenCtx.font = "16px 'Press Start 2P'";
        offscreenCtx.fillStyle = "white";
        let amplitude = (offscreenCanvas.width - offscreenCtx.measureText(instructions).width) / 2;
        let instructionX = (offscreenCanvas.width / 2) + Math.sin(time * 0.5) * amplitude;
        offscreenCtx.fillText(instructions, instructionX - offscreenCtx.measureText(instructions).width / 2, offscreenCanvas.height - 30);
    }

    // Helper function to adjust and save copper bar count
    function adjustCopperBarCount(increase) {
        if (increase) {
            numCopperBars = Math.min(120, numCopperBars + 10);
        } else {
            numCopperBars = Math.max(4, numCopperBars - 10);
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('copperBarsCount', numCopperBars.toString());
        } catch (e) {
            console.warn("Could not save to localStorage:", e);
        }
        
        // Show feedback message with current bar count
        showBarCountMessage();
    }
    
    // Function to display current bar count as feedback
    function showBarCountMessage() {
        const message = document.createElement('div');
        message.textContent = `Copper Bars: ${numCopperBars}`;
        message.style.position = "absolute";
        message.style.top = "50px";
        message.style.left = "50%";
        message.style.transform = "translateX(-50%)";
        message.style.color = "#0ff";
        message.style.fontFamily = "'Press Start 2P', cursive";
        message.style.fontSize = "14px";
        message.style.background = "rgba(0, 0, 0, 0.7)";
        message.style.padding = "10px";
        message.style.borderRadius = "5px";
        message.style.zIndex = "100";
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 1500);
    }

    function drawCopperBars() {
        // Calculate bar height based on the number of bars to fit in the same space
        const totalAvailableSpace = offscreenCanvas.height * 0.7; // Use 70% of screen height
        const barSpacing = 1;
        const totalBarSpace = totalAvailableSpace - (numCopperBars * barSpacing);
        const barHeight = Math.max(1, Math.floor(totalBarSpace / numCopperBars));
        
        let centerY = offscreenCanvas.height / 2 - (numCopperBars * (barHeight + barSpacing) / 2);
        let defaultBarWidth = offscreenCanvas.width; // Default full width
        
        // Calculate color distribution to maintain consistent gradient across different bar counts
        // This ensures we get a full color spectrum regardless of the number of bars
        const colorStep = 360 / numCopperBars;
        const colorOffset = time * 10 % 360; // Time-based offset for animation
        
        for (let i = 0; i < numCopperBars; i++) {
            // Remove the sine wave movement (vertical bouncing)
            let yOffset = 0;
            let barWidth = defaultBarWidth;
            
            // Apply audio reactivity if audio is playing
            if (isAudioPlaying && audioData) {
                // Map the bar index to a frequency bin with better distribution across frequency spectrum
                const binIndex = Math.floor((i / numCopperBars) * (audioAnalyser.frequencyBinCount / 2));
                
                // Only add audio-based amplitude (no sine wave)
                const audioAmplitude = audioData[binIndex] / 255 * 10; // Scale to reasonable value
                yOffset = audioAmplitude;
                
                // Adjust bar width based on frequency amplitude like a spectrometer
                const widthScale = audioData[binIndex] / 255; // 0-1 scale based on audio amplitude
                barWidth = defaultBarWidth * (0.3 + 0.7 * widthScale); // Limit minimum width to 30%
            }
            
            let yPosition = centerY + i * (barHeight + barSpacing);
            
            // Calculate hue based on position in the spectrum and time
            // Use a consistent gradient distribution regardless of bar count
            let hue = (colorOffset + i * colorStep) % 360;
            
            // Make colors more vibrant with audio
            let saturation = 100;
            let lightness = 50;
            
            if (isAudioPlaying && audioData) {
                const binIndex = Math.floor((i / numCopperBars) * (audioAnalyser.frequencyBinCount / 2));
                // Adjust saturation based on audio intensity
                saturation = 80 + (audioData[binIndex] / 255) * 20;
                // Adjust lightness based on audio intensity
                lightness = 40 + (audioData[binIndex] / 255) * 30;
            }
            
            // Calculate x-position to center the bar
            let xPosition = 0;
            if (isAudioPlaying && audioData) {
                const binIndex = Math.floor((i / numCopperBars) * (audioAnalyser.frequencyBinCount / 2));
                const widthScale = audioData[binIndex] / 255;
                barWidth = defaultBarWidth * (0.3 + 0.7 * widthScale);
                xPosition = (offscreenCanvas.width - barWidth) / 2;
            }
            
            // Use a consistent approach for gradients regardless of bar height
            
            // Vertical gradient (top to bottom)
            let gradient = offscreenCtx.createLinearGradient(
                xPosition + barWidth/2, yPosition,       // Top center
                xPosition + barWidth/2, yPosition + barHeight  // Bottom center
            );
            
            // Create more pronounced gradient edges for smaller bars
            const edgeDarkening = Math.min(30, 15 + (15 / Math.min(barHeight, 10))); // Adjust darkness based on bar height
            
            // Brighter in center, darker on edges
            gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${Math.max(10, lightness - edgeDarkening)}%)`);  // Darker top
            gradient.addColorStop(0.5, `hsl(${hue}, ${saturation}%, ${lightness}%)`);                              // Bright middle
            gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${Math.max(10, lightness - edgeDarkening)}%)`);  // Darker bottom
            
            offscreenCtx.fillStyle = gradient;
            offscreenCtx.fillRect(xPosition, yPosition, barWidth, barHeight);
            
            // Horizontal gradient overlay (left to right)
            // Only apply this for bars that are tall enough to show the effect
            if (barHeight >= 2) {
                let horizontalGradient = offscreenCtx.createLinearGradient(
                    xPosition, yPosition + barHeight/2,              // Left middle
                    xPosition + barWidth/2, yPosition + barHeight/2, // Center middle
                    xPosition + barWidth, yPosition + barHeight/2    // Right middle
                );
                
                // Adjust horizontal gradient opacity based on bar height
                const horizontalOpacity = Math.min(0.7, 0.4 + (barHeight / 20));
                
                // Brighter in center, darker on edges
                horizontalGradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${Math.max(10, lightness - edgeDarkening)}%, ${horizontalOpacity})`);  // Darker left
                horizontalGradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, ${horizontalOpacity})`);                              // Bright center
                horizontalGradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${Math.max(10, lightness - edgeDarkening)}%, ${horizontalOpacity})`);  // Darker right
                
                // Apply the horizontal gradient as an overlay
                offscreenCtx.fillStyle = horizontalGradient;
                offscreenCtx.fillRect(xPosition, yPosition, barWidth, barHeight);
            }
        }
    }

    function drawActiveTriangle() {
        if (flashOpacity > 0 && activeDirection !== Directions.NONE) {
            const cx = displayCanvas.width / 2;
            const cy = displayCanvas.height / 2;
            displayCtx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
            displayCtx.beginPath();
            switch (activeDirection) {
                case Directions.TOP:
                    displayCtx.moveTo(cx, cy);
                    displayCtx.lineTo(0, 0);
                    displayCtx.lineTo(displayCanvas.width, 0);
                    break;
                case Directions.BOTTOM:
                    displayCtx.moveTo(cx, cy);
                    displayCtx.lineTo(0, displayCanvas.height);
                    displayCtx.lineTo(displayCanvas.width, displayCanvas.height);
                    break;
                case Directions.LEFT:
                    displayCtx.moveTo(cx, cy);
                    displayCtx.lineTo(0, 0);
                    displayCtx.lineTo(0, displayCanvas.height);
                    break;
                case Directions.RIGHT:
                    displayCtx.moveTo(cx, cy);
                    displayCtx.lineTo(displayCanvas.width, 0);
                    displayCtx.lineTo(displayCanvas.width, displayCanvas.height);
                    break;
                default:
                    break;
            }
            displayCtx.closePath();
            displayCtx.fill();
        }
    }

    function handleInteraction(x, y) {
        const cx = displayCanvas.width / 2;
        const cy = displayCanvas.height / 2;

        // Toggle CRT effect when clicking in the center
        const centerRadius = Math.min(displayCanvas.width, displayCanvas.height) * 0.1;
        if (Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2)) < centerRadius) {
            crtEffect.enabled = !crtEffect.enabled;
            
            // If enabling, also randomize reactivity a bit for variety
            if (crtEffect.enabled) {
                crtEffect.overallReactivity = 0.7 + Math.random() * 0.6; // Between 0.7 and 1.3
                crtEffect.bassCurvatureImpact = 0.03 + Math.random() * 0.04;
                crtEffect.midRangeScanlineImpact = 0.1 + Math.random() * 0.1;
                crtEffect.highFreqNoiseImpact = 0.05 + Math.random() * 0.1;
            }
            
            activeDirection = Directions.NONE;
            flashOpacity = 0.5;
            return;
        }

        if (isPointInTriangle(x, y, cx, cy, 0, 0, displayCanvas.width, 0)) {
            activeDirection = Directions.TOP;
            // Increase number of copper bars instead of copper speed
            adjustCopperBarCount(true);
        } else if (isPointInTriangle(x, y, cx, cy, 0, displayCanvas.height, displayCanvas.width, displayCanvas.height)) {
            activeDirection = Directions.BOTTOM;
            // Decrease number of copper bars instead of copper speed
            adjustCopperBarCount(false);
        } else if (isPointInTriangle(x, y, cx, cy, 0, 0, 0, displayCanvas.height)) {
            activeDirection = Directions.LEFT;
            scrollerSpeed = Math.max(10, scrollerSpeed + 10);
            recalculateYOffset();
        } else if (isPointInTriangle(x, y, cx, cy, displayCanvas.width, 0, displayCanvas.width, displayCanvas.height)) {
            activeDirection = Directions.RIGHT;
            scrollerSpeed = Math.max(10, scrollerSpeed - 10);
            recalculateYOffset();
        } else {
            activeDirection = Directions.NONE;
        }
        flashOpacity = 0.5;
    }

    displayCanvas.addEventListener('click', function (event) {
        const rect = displayCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        handleInteraction(x, y);
    });

    window.addEventListener('keydown', function (event) {
        const cx = displayCanvas.width / 2;
        const cy = displayCanvas.height / 2;
        switch (event.key) {
            case 'ArrowLeft':
                handleInteraction(1, cy);
                break;
            case 'ArrowRight':
                handleInteraction(displayCanvas.width - 1, cy);
                break;
            case 'ArrowUp':
                // If pressing Shift+ArrowUp, increase volume instead
                if (event.shiftKey) {
                    adjustVolume(0.05); // Increase volume by 5%
                    event.preventDefault();
                } else {
                    handleInteraction(cx, 1);
                }
                break;
            case 'ArrowDown':
                // If pressing Shift+ArrowDown, decrease volume instead
                if (event.shiftKey) {
                    adjustVolume(-0.05); // Decrease volume by 5%
                    event.preventDefault();
                } else {
                    handleInteraction(cx, displayCanvas.height - 1);
                }
                break;
            case 'm':
            case 'M':
                if (isDemoStarted && audioElement) {
                    toggleMusicSelector();
                }
                break;
            // Add next track shortcut
            case 'n':
            case 'N':
                if (isDemoStarted && audioElement) {
                    changeTrack('next');
                }
                break;
            // Add previous track shortcut
            case 'p':
            case 'P':
                if (isDemoStarted && audioElement) {
                    changeTrack('prev');
                }
                break;
            default:
                return;
        }
    });

    // Create and show a floating music selector during the demo
    function toggleMusicSelector() {
        // Remove existing selector if it's already open
        const existingSelector = document.getElementById('floating-music-selector');
        if (existingSelector) {
            document.body.removeChild(existingSelector);
            return;
        }
        
        // Create a new floating music selector
        const floatingSelector = document.createElement('div');
        floatingSelector.id = 'floating-music-selector';
        floatingSelector.innerHTML = `
            <div class="selector-header">SELECT MUSIC (ESC TO CLOSE)</div>
            <select id="floating-music-select" class="music-select"></select>
        `;
        
        // Style the floating selector
        Object.assign(floatingSelector.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0,0,0,0.9)',
            border: '2px solid #0ff',
            padding: '20px',
            zIndex: '1000',
            boxShadow: '0 0 20px #0ff',
            borderRadius: '8px',
            fontFamily: "'Press Start 2P', cursive",
            color: '#0ff',
            textAlign: 'center'
        });
        
        document.body.appendChild(floatingSelector);
        
        // Style the header and select
        const header = floatingSelector.querySelector('.selector-header');
        Object.assign(header.style, {
            marginBottom: '15px',
            fontSize: '14px',
            textShadow: '0 0 5px #0ff'
        });
        
        const select = floatingSelector.querySelector('#floating-music-select');
        Object.assign(select.style, {
            fontFamily: "'Press Start 2P', cursive",
            fontSize: '12px',
            backgroundColor: '#000',
            color: '#0ff',
            border: '2px solid #0ff',
            padding: '8px',
            borderRadius: '4px',
            outline: 'none',
            boxShadow: '0 0 10px #0ff',
            width: '300px',
            cursor: 'pointer'
        });
        
        // Populate the floating music selector
        try {
            // Try to fetch the tracks.json file on-demand for the latest tracks
            fetch('tracks.json')
                .then(response => {
                    if (!response.ok) throw new Error('Failed to fetch tracks');
                    return response.json();
                })
                .then(tracksList => {
                    const musicFiles = tracksList.map(track => {
                        return {
                            url: `tracks/${track.file}`,
                            name: track.name
                        };
                    });
                    populateFloatingSelect(select, musicFiles);
                })
                .catch(err => {
                    // If fetch fails, try using cached data
                    console.error('Error fetching tracks.json for music selector:', err);
                    if (localStorage.getItem('localMusicFiles')) {
                        const cachedData = JSON.parse(localStorage.getItem('localMusicFiles'));
                        populateFloatingSelect(select, cachedData);
                    } else {
                        // Last resort fallback
                        const fallbackFiles = [
                            { url: 'tracks/Syndicate_Intro.mp3', name: 'Syndicate Intro' },
                            { url: 'tracks/Xenon_2_Megablast.mp3', name: 'Xenon 2 Megablast' },
                            { url: 'tracks/Zool_2.mp3', name: 'Zool 2' }
                        ];
                        populateFloatingSelect(select, fallbackFiles);
                    }
                });
        } catch (e) {
            console.error('Error setting up music selector:', e);
            const option = document.createElement('option');
            option.textContent = 'No music options available';
            select.appendChild(option);
        }
        
        // Add change handler
        select.addEventListener('change', function() {
            const newMusicURL = this.value;
            if (newMusicURL === 'none') {
                // Stop current music
                if (audioElement) {
                    audioElement.pause();
                    isAudioPlaying = false;
                }
            } else if (audioElement) {
                // Change to new music
                const wasPlaying = !audioElement.paused;
                audioElement.src = newMusicURL;
                audioElement.crossOrigin = 'anonymous';
                selectedMusicURL = newMusicURL;
                
                if (wasPlaying) {
                    audioElement.play()
                        .then(() => {
                            isAudioPlaying = true;
                        })
                        .catch(error => {
                            console.error("Error changing music:", error);
                        });
                }
            }
            
            // Save selection to localStorage
            try {
                localStorage.setItem('selectedMusic', newMusicURL);
            } catch (e) {
                console.warn('Could not save music selection to localStorage:', e);
            }
        });
        
        // Add stopPropagation to the click handler to ensure clicks on the select don't bleed through
        select.addEventListener('click', function(event) {
            event.stopPropagation();
        });
        
        // Close on ESC key
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                if (floatingSelector.parentNode) {
                    document.body.removeChild(floatingSelector);
                }
                window.removeEventListener('keydown', escHandler);
            }
        };
        
        window.addEventListener('keydown', escHandler);
        
        // Add transport controls to music selector
        const transportControls = document.createElement('div');
        transportControls.className = 'selector-transport';
        transportControls.innerHTML = `
            <div style="margin-bottom: 10px; margin-top: 15px;">Volume Control:</div>
            <div class="volume-controls">
                <button class="transport-btn" id="volume-down">🔉</button>
                <div class="volume-bar-container">
                    <div class="volume-bar" id="volume-level"></div>
                </div>
                <button class="transport-btn" id="volume-up">🔊</button>
            </div>
            <div style="margin: 15px 0 5px;">Track Progress:</div>
            <div class="selector-progress-container">
                <div class="selector-progress-bar" id="selector-progress"></div>
            </div>
            <div class="selector-time" id="selector-time">00:00 / 00:00</div>
            <div style="margin: 15px 0 10px;">Track Navigation:</div>
            <div class="track-controls">
                <button class="transport-btn" id="prev-track">◀◀</button>
                <button class="transport-btn" id="next-track">▶▶</button>
            </div>
        `;
        
        // Add the controls after the select element
        select.insertAdjacentElement('afterend', transportControls);
        
        // Style the new controls
        const style = document.createElement('style');
        style.textContent = `
            .volume-controls, .track-controls {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }
            .volume-bar-container {
                width: 200px;
                height: 10px;
                background-color: #003;
                border: 1px solid #0ff;
                position: relative;
            }
            .volume-bar {
                height: 100%;
                background-color: #0ff;
                width: ${volume * 100}%;
            }
            .selector-progress-container {
                width: 100%;
                height: 10px;
                background-color: #003;
                border-radius: 4px;
                margin: 5px 0;
                position: relative;
                overflow: hidden;
                border: 1px solid rgba(0, 255, 255, 0.5);
            }
            .selector-progress-bar {
                height: 100%;
                background-color: #0ff;
                width: 0%;
                position: absolute;
                left: 0;
                top: 0;
                transition: width 0.3s;
            }
            .selector-time {
                font-family: 'Press Start 2P', cursive;
                font-size: 10px;
                color: #0ff;
                margin-bottom: 10px;
                text-align: center;
            }
            .transport-btn {
                background-color: #003;
                color: #0ff;
                border: 2px solid #0ff;
                border-radius: 5px;
                padding: 5px 10px;
                font-size: 16px;
                cursor: pointer;
                box-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
                font-family: 'Press Start 2P', cursive;
                min-width: 40px;
                min-height: 40px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .transport-btn:hover {
                background-color: #004444;
            }
        `;
        floatingSelector.appendChild(style);
        
        // Set up event handlers
        const volumeDown = floatingSelector.querySelector('#volume-down');
        const volumeUp = floatingSelector.querySelector('#volume-up');
        const prevTrack = floatingSelector.querySelector('#prev-track');
        const nextTrack = floatingSelector.querySelector('#next-track');
        const volumeBar = floatingSelector.querySelector('#volume-level');
        
        // Setup progress bar functionality
        const progressContainer = floatingSelector.querySelector('.selector-progress-container');
        const progressBar = floatingSelector.querySelector('#selector-progress');
        const timeDisplay = floatingSelector.querySelector('#selector-time');
        
        // Make progress bar interactive for seeking
        progressContainer.addEventListener('click', function(e) {
            if (!audioElement || !isAudioPlaying) return;
            
            const rect = this.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            
            // Seek to the clicked position
            if (audioElement.duration) {
                audioElement.currentTime = audioElement.duration * percentage;
                updateSelectorProgress();
            }
        });
        
        // Function to update the selector's progress bar
        function updateSelectorProgress() {
            if (!audioElement) return;
            
            // Update progress bar width
            const progress = (audioElement.currentTime / audioElement.duration) * 100 || 0;
            progressBar.style.width = `${progress}%`;
            
            // Update time display
            const currentTime = formatTime(audioElement.currentTime);
            const totalTime = formatTime(audioElement.duration);
            timeDisplay.textContent = `${currentTime} / ${totalTime}`;
        }
        
        // Update progress at regular intervals while the selector is open
        const progressInterval = setInterval(updateSelectorProgress, 1000);
        
        // Initial progress update
        updateSelectorProgress();
        
        volumeDown.addEventListener('click', function() {
            adjustVolume(-0.05);
            volumeBar.style.width = `${volume * 100}%`;
        });
        
        volumeUp.addEventListener('click', function() {
            adjustVolume(0.05);
            volumeBar.style.width = `${volume * 100}%`;
        });
        
        prevTrack.addEventListener('click', function() {
            changeTrack('prev');
            updateSelectedOption();
            updateSelectorProgress();
        });
        
        nextTrack.addEventListener('click', function() {
            changeTrack('next');
            updateSelectedOption();
            updateSelectorProgress();
        });
        
        // Update the selected option in the dropdown when changing tracks
        function updateSelectedOption() {
            const options = select.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === selectedMusicURL) {
                    select.selectedIndex = i;
                    break;
                }
            }
        }
       

    }

    // Create floating transport controls for volume and track navigation
    function createTransportControls() {
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
            if (!audioElement || !isAudioPlaying) return;
            
            const rect = this.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            
            // Seek to the clicked position
            if (audioElement.duration) {
                audioElement.currentTime = audioElement.duration * percentage;
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
        updateTrackProgress();
    }

    // Use FontFaceObserver to ensure the font is fully loaded
    const fontObserver = new FontFaceObserver('Press Start 2P');

    fontObserver.load().then(function () {
        initAudio(); // Initialize audio system
        restartDemo(); // Ensure the demo only starts after the font is loaded
        // Don't automatically start rendering - wait for splash screen click
    }).catch(function (error) {
        console.error('Font failed to load:', error);
        // If font fails to load, start anyway with default font
        initAudio();
        restartDemo(); 
    });
});

// Add the isPointInTriangle function if it's not defined elsewhere
function isPointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
    const area = 0.5 * Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)));
    
    const a = 0.5 * Math.abs((px * (y1 - y2) + x1 * (y2 - py) + x2 * (py - y1)));
    const b = 0.5 * Math.abs((px * (y2 - y3) + x2 * (y3 - py) + x3 * (py - y2)));
    const c = 0.5 * Math.abs((px * (y3 - y1) + x3 * (y1 - py) + x1 * (py - y3)));
    
    return Math.abs(area - (a + b + c)) < 0.001;
}

/**
 * Copper.js - MP3 player module
 * Loads tracks from tracks.json and plays them using their S3 URLs
 */

class CopperPlayer {
    constructor() {
        this.tracks = [];
        this.currentTrackIndex = 0;
        this.audioPlayer = new Audio();
        this.isPlaying = false;
    }

    /**
     * Initialize the player by loading tracks from JSON
     */
    async init() {
        try {
            const response = await fetch('tracks.json');
            if (!response.ok) {
                throw new Error('Failed to load tracks.json');
            }
            this.tracks = await response.json();
            console.log(`Loaded ${this.tracks.length} tracks`);
            
            // Set up event listeners
            this.audioPlayer.addEventListener('ended', () => this.playNext());
            
            return true;
        } catch (error) {
            console.error('Error initializing player:', error);
            return false;
        }
    }

    /**
     * Play a track by index
     * @param {number} index - Track index to play
     */
    play(index = null) {
        if (index !== null && index >= 0 && index < this.tracks.length) {
            this.currentTrackIndex = index;
        }
        
        const track = this.tracks[this.currentTrackIndex];
        if (!track) return;
        
        // Use the S3 URL for playing the track
        this.audioPlayer.src = track.url;
        this.audioPlayer.crossOrigin = 'anonymous';
        this.audioPlayer.play()
            .then(() => {
                this.isPlaying = true;
                this.triggerEvent('trackchange', track);
            })
            .catch(error => {
                console.error('Error playing track:', error);
            });
    }

    /**
     * Pause the current playback
     */
    pause() {
        this.audioPlayer.pause();
        this.isPlaying = false;
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Play next track
     */
    playNext() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.play();
    }

    /**
     * Play previous track
     */
    playPrevious() {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        this.play();
    }

    /**
     * Get all tracks
     * @returns {Array} List of tracks
     */
    getTracks() {
        return this.tracks;
    }

    /**
     * Get current track info
     * @returns {Object} Current track data
     */
    getCurrentTrack() {
        return this.tracks[this.currentTrackIndex];
    }

    /**
     * Helper to trigger custom events
     */
    triggerEvent(name, data) {
        document.dispatchEvent(new CustomEvent('copper:' + name, { detail: data }));
    }
}

// Export as global or module
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = CopperPlayer;
} else {
    window.CopperPlayer = CopperPlayer;
}

// Initialize player automatically when included in browser
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.copper = new CopperPlayer();
        window.copper.init();
    });
}