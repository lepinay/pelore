interface EffectParams {
  enabled: boolean;
  scanlineOpacity: number;
  scanlineSpacing: number;
  curvature: number;
  vignette: number;
  noise: number;
  scanlineSpeed: number;
  scanlineOffset: number;
  // Audio reactivity
  bassCurvatureImpact: number;
  midRangeScanlineImpact: number;
  highFreqNoiseImpact: number;
  overallReactivity: number;
  // Smoothing
  lastBassImpact: number;
  lastMidImpact: number;
  lastHighImpact: number;
}

class CRTEffect {
  private demoCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gl: WebGLRenderingContext | null;
  private useWebGL: boolean;
  private program: WebGLProgram | null;
  private buffer: WebGLBuffer | null;
  private texture: WebGLTexture | null;
  
  // Effect parameters
  public params: EffectParams;

  constructor(demoCanvas: HTMLCanvasElement) {
    this.demoCanvas = demoCanvas;
    const context = demoCanvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = context;
    this.gl = null;
    this.useWebGL = false;
    this.program = null;
    this.buffer = null;
    this.texture = null;
    
    // Effect parameters
    this.params = {
      enabled: true,
      scanlineOpacity: 0.1,
      scanlineSpacing: 4,
      curvature: 0.08,
      vignette: 0.3,
      noise: 0.03,
      scanlineSpeed: 0.5,
      scanlineOffset: 0,
      // Audio reactivity
      bassCurvatureImpact: 0.05,
      midRangeScanlineImpact: 0.15,
      highFreqNoiseImpact: 0.1,
      overallReactivity: 1.0,
      // Smoothing
      lastBassImpact: 0,
      lastMidImpact: 0,
      lastHighImpact: 0
    };

    this.initWebGL();
  }

  private initWebGL(): void {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = this.demoCanvas.width;
      canvas.height = this.demoCanvas.height;
      this.gl = canvas.getContext('webgl');
      if (!this.gl) return;

      // Vertex shader
      const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
      if (!vertShader) return;
      
      this.gl.shaderSource(vertShader, `
        attribute vec2 position;
        varying vec2 texCoord;
        void main() {
            // Standard mapping without flipping
            texCoord = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0.0, 1.0);
        }
      `);
      this.gl.compileShader(vertShader);
      
      if (!this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS)) {
        console.error('Vertex shader compile error:', this.gl.getShaderInfoLog(vertShader));
        return;
      }

      // Fragment shader
      const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
      if (!fragShader) return;
      
      this.gl.shaderSource(fragShader, `
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
        
        #define PI 3.14159265358979323846
        #define TWO_PI 6.28318530718
        
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
      this.gl.compileShader(fragShader);
      
      if (!this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS)) {
        console.error('Fragment shader compile error:', this.gl.getShaderInfoLog(fragShader));
        return;
      }

      // Create program
      this.program = this.gl.createProgram();
      if (!this.program) return;
      
      this.gl.attachShader(this.program, vertShader);
      this.gl.attachShader(this.program, fragShader);
      this.gl.linkProgram(this.program);
      
      if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
        console.error('Program linking error:', this.gl.getProgramInfoLog(this.program));
        return;
      }

      // Create buffer for fullscreen quad
      this.buffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,   // bottom left
         1.0, -1.0,   // bottom right
        -1.0,  1.0,   // top left
         1.0,  1.0    // top right
      ]), this.gl.STATIC_DRAW);

      // Create texture
      this.texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

      this.useWebGL = true;
    } catch (e) {
      console.warn("WebGL CRT effect failed, falling back to canvas", e);
      this.useWebGL = false;
    }
  }

  public apply(time: number): void {
    if (!this.params.enabled) return;

    if (this.useWebGL) {
      this.applyWebGL(time);
    } else {
      this.applyCanvas(time);
    }
  }

  private applyWebGL(time: number): void {
    if (!this.gl || !this.program || !this.texture || !this.buffer) return;

    const gl = this.gl;
    const width = this.demoCanvas.width;
    const height = this.demoCanvas.height;

    if (gl.canvas.width !== this.demoCanvas.width || gl.canvas.height !== this.demoCanvas.height) {
        gl.canvas.width = this.demoCanvas.width;
        gl.canvas.height = this.demoCanvas.height;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    // Update texture with current display canvas content
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    // WebGL's default assumes texture origin is bottom-left, but canvas is top-left
    // To fix upside-down issue, set UNPACK_FLIP_Y_WEBGL to true
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.demoCanvas);
    
    // Set viewport and clear
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Draw with shader
    gl.useProgram(this.program);
    
    // Update uniforms with audio-reactive values
    gl.uniform1f(gl.getUniformLocation(this.program, "time"), time);
    gl.uniform2f(gl.getUniformLocation(this.program, "resolution"), gl.canvas.width, gl.canvas.height);
    gl.uniform1f(gl.getUniformLocation(this.program, "curvature"), this.params.curvature);
    gl.uniform1f(gl.getUniformLocation(this.program, "scanlineOpacity"), this.params.scanlineOpacity);
    gl.uniform1f(gl.getUniformLocation(this.program, "scanlineSpacing"), this.params.scanlineSpacing);
    gl.uniform1f(gl.getUniformLocation(this.program, "vignette"), this.params.vignette);
    gl.uniform1f(gl.getUniformLocation(this.program, "noise"), this.params.noise);
    
    // Bind quad buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    
    // Set up attribute pointers
    const positionLocation = gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw as triangle strip
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Draw the result back to the display canvas
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(gl.canvas, 0, 0);
    
    // Add random noise occasionally (directly on canvas) - more frequent with music intensity
    if (Math.random() < (0.05 + this.params.noise * 2)) {
      this.ctx.fillStyle = `rgba(255,255,255,${this.params.noise * 1.5})`;
      for (let i = 0; i < 3 + Math.floor(this.params.noise * 20); i++) {
        const noiseX = Math.random() * width;
        const noiseY = Math.random() * height;
        const noiseSize = Math.random() * 3 + (this.params.noise * 5);
        this.ctx.fillRect(noiseX, noiseY, noiseSize, noiseSize);
      }
    }
  }

  private applyCanvas(time: number): void {
    const { width, height } = this.demoCanvas;
    
    // Store original image
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = width;
    originalCanvas.height = height;
    const originalCtx = originalCanvas.getContext('2d');
    if (!originalCtx) return;
    
    originalCtx.drawImage(this.demoCanvas, 0, 0);
    
    // Clear for redrawing
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(originalCanvas, 0, 0);
    
    // 1. Apply scanlines
    const scanlineCanvas = document.createElement('canvas');
    scanlineCanvas.width = width;
    scanlineCanvas.height = height;
    const scanlineCtx = scanlineCanvas.getContext('2d');
    if (!scanlineCtx) return;
    
    // Create scanline pattern - spacing varies with audio
    scanlineCtx.fillStyle = `rgba(0,0,0,${this.params.scanlineOpacity})`;
    const spacing = Math.max(2, Math.min(6, this.params.scanlineSpacing));
    for (let y = Math.floor(this.params.scanlineOffset) % spacing; y < height; y += spacing) {
      scanlineCtx.fillRect(0, y, width, 1);
    }
    
    // 2. Apply vignette effect
    const vignetteCanvas = document.createElement('canvas');
    vignetteCanvas.width = width;
    vignetteCanvas.height = height;
    const vignetteCtx = vignetteCanvas.getContext('2d');
    if (!vignetteCtx) return;
    
    const gradient = vignetteCtx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.5
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${this.params.vignette})`);
    
    vignetteCtx.fillStyle = gradient;
    vignetteCtx.fillRect(0, 0, width, height);
    
    // Apply effects to display canvas
    this.ctx.drawImage(scanlineCanvas, 0, 0);
    this.ctx.drawImage(vignetteCanvas, 0, 0);
    
    // RGB split - ensure we're drawing the original image, not a flipped version
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.drawImage(originalCanvas, -1, 0); // Offset red
    this.ctx.globalAlpha = 0.2;
    this.ctx.drawImage(originalCanvas, 1, 0);  // Offset blue
    this.ctx.globalAlpha = 1.0;
    this.ctx.globalCompositeOperation = 'source-over';
    
    // Add noise occasionally - frequency and intensity increase with music
    const noiseThreshold = Math.max(0.05, Math.min(0.4, 0.1 + this.params.noise * 2));
    if (Math.random() < noiseThreshold) {
      this.ctx.fillStyle = `rgba(255,255,255,${this.params.noise})`;
      const noiseCount = Math.floor(5 + this.params.noise * 25);
      for (let i = 0; i < noiseCount; i++) {
        this.ctx.fillRect(
          Math.random() * width,
          Math.random() * height,
          Math.random() * 3 + (this.params.noise * 5),
          Math.random() * 3 + (this.params.noise * 5)
        );
      }
    }
  }

  public updateWithAudioData(audioData: Uint8Array | null): void {
    if (!audioData) return;

    // Calculate frequency bands
    const bass = this.getFrequencyRange(audioData, 0, 10);  // Bass (0-10)
    const mid = this.getFrequencyRange(audioData, 10, 30);  // Mids (10-30)
    const high = this.getFrequencyRange(audioData, 30, 60); // Highs (30-60)
    const fullRange = this.getFrequencyRange(audioData, 0, audioData.length / 2); // Full range
    
    // Apply smoothing to transitions (lerp towards target values)
    this.params.lastBassImpact = this.lerp(this.params.lastBassImpact, bass, 0.1);
    this.params.lastMidImpact = this.lerp(this.params.lastMidImpact, mid, 0.1);
    this.params.lastHighImpact = this.lerp(this.params.lastHighImpact, high, 0.15);
    
    // Use different frequency bands to control different aspects of CRT effect
    
    // Bass impacts curvature - more bass = more curve
    this.params.curvature = 0.08 + (this.params.lastBassImpact * this.params.bassCurvatureImpact);
    
    // Mid frequencies impact scanline opacity and spacing
    this.params.scanlineOpacity = 0.07 + (this.params.lastMidImpact * this.params.midRangeScanlineImpact);
    this.params.scanlineSpacing = 4 - (this.params.lastMidImpact * 2); // Between 2-4px spacing
    this.params.scanlineSpacing = Math.max(2, Math.min(6, this.params.scanlineSpacing)); // Clamp values
    
    // High frequencies impact noise amount
    this.params.noise = 0.02 + (this.params.lastHighImpact * this.params.highFreqNoiseImpact);
    
    // Overall volume affects vignette
    this.params.vignette = 0.25 + (fullRange * 0.15);
    
    // Strong beats increase scanline speed temporarily
    if (this.detectBeat(audioData, 0, 5, 0.6)) {
      this.params.scanlineSpeed = 1.5;
      setTimeout(() => { this.params.scanlineSpeed = 0.5; }, 100);
    }
    
    // Apply overall reactivity scaling
    const reactivityMultiplier = this.params.overallReactivity;
    this.params.curvature *= reactivityMultiplier;
    this.params.scanlineOpacity *= reactivityMultiplier;
    this.params.noise *= reactivityMultiplier;
    this.params.vignette *= reactivityMultiplier;
    
    // Update scanline offset for subtle movement
    this.params.scanlineOffset = (this.params.scanlineOffset + this.params.scanlineSpeed) % this.params.scanlineSpacing;
  }

  private getFrequencyRange(data: Uint8Array, start: number, end: number): number {
    let sum = 0;
    for (let i = start; i < end && i < data.length; i++) {
      sum += data[i];
    }
    return sum / (end - start) / 255;
  }

  private lerp(start: number, end: number, amt: number): number {
    return (1 - amt) * start + amt * end;
  }
  
  private detectBeat(audioData: Uint8Array, startBin: number, endBin: number, threshold: number): boolean {
    let sum = 0;
    for (let i = startBin; i < endBin && i < audioData.length; i++) {
      sum += audioData[i];
    }
    const average = sum / (endBin - startBin) / 255;
    return average > threshold;
  }

  public handleResize(): void {
    if (this.gl) {
      this.gl.viewport(0, 0, this.demoCanvas.width, this.demoCanvas.height);
    }
  }
  
  public toggleEffect(): void {
    this.params.enabled = !this.params.enabled;
    
    // If enabling, randomize reactivity a bit for variety
    if (this.params.enabled) {
      this.params.overallReactivity = 0.7 + Math.random() * 0.6; // Between 0.7 and 1.3
      this.params.bassCurvatureImpact = 0.03 + Math.random() * 0.04;
      this.params.midRangeScanlineImpact = 0.1 + Math.random() * 0.1;
      this.params.highFreqNoiseImpact = 0.05 + Math.random() * 0.1;
    }
  }
}

export default CRTEffect;
