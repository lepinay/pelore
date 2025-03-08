document.addEventListener("DOMContentLoaded", function () {
    const displayCanvas = document.getElementById('demoCanvas');
    const displayCtx = displayCanvas.getContext('2d');

    // Create splash screen
    const splashScreen = document.createElement('div');
    splashScreen.id = 'splash-screen';
    splashScreen.innerHTML = `
        <div class="splash-content">
            <h1>SYSTEM 1.3 INITIALISED.</h1>
            <div class="crt-text">Click to start</div>
            <div class="scanline"></div>
        </div>
    `;
    document.body.appendChild(splashScreen);
    
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
    splashTitle.style.marginBottom = '40px';
    splashTitle.style.color = '#0ff';
    splashTitle.style.textShadow = '0 0 10px #0ff, 0 0 20px #0ff';
    
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
    let isDemoStarted = false;

    // Starfield settings
    const starCount = 300;
    const stars = [];

    // CRT effect settings
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

    // Initialize audio system
    function initAudio() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 256;
        audioData = new Uint8Array(audioAnalyser.frequencyBinCount);
        
        audioElement = new Audio('music.mp3');
        audioElement.loop = true;
        
        // Set up audio source immediately
        audioSource = audioContext.createMediaElementSource(audioElement);
        audioSource.connect(audioAnalyser);
        audioAnalyser.connect(audioContext.destination);
        
        // Do not autoplay - wait for splash screen click
        console.log("Audio ready, waiting for user interaction");
    }

    function startDemo() {
        if (isDemoStarted) return;
        isDemoStarted = true;
        
        // Fade out and remove splash screen
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(splashScreen);
        }, 800);
        
        // Start audio
        if (audioContext && audioElement) {
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
        }
        
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

    splashScreen.addEventListener('click', startDemo);

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
        drawScrollingText();
        drawInstructions();

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
                handleInteraction(cx, 1);
                break;
            case 'ArrowDown':
                handleInteraction(cx, displayCanvas.height - 1);
                break;
            default:
                return;
        }
    });

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