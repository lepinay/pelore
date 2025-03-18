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
          texCoord = position * 0.5 + 0.5;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `);
      this.gl.compileShader(vertShader);

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

        float rand(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 aspect = resolution / min(resolution.x, resolution.y);
          vec2 uv = texCoord * aspect;
          vec2 texUV = texCoord;
          
          float dist = distance(uv, aspect * 0.5);
          float barrelFactor = 1.0 - curvature * dist * dist;
          texUV = (texUV - 0.5) * barrelFactor + 0.5;
          
          if (texUV.x < 0.0 || texUV.x > 1.0 || texUV.y < 0.0 || texUV.y > 1.0) {
            gl_FragColor = vec4(0.0);
            return;
          }
          
          float scanLineWidth = 1.0 / scanlineSpacing;
          float scanline = abs(sin(texUV.y * resolution.y * scanLineWidth + time * 0.5));
          scanline = pow(scanline, 1.5) * scanlineOpacity;
          
          vec4 color = texture2D(textureSampler, texUV);
          float vignetteAmount = 1.0 - dist * vignette;
          color.rgb *= vignetteAmount;
          color.rgb -= scanline;
          
          float noiseValue = rand(texUV + vec2(time * 0.01, 0.0));
          if (noiseValue < noise) {
            color.rgb += vec3(0.1);
          }
          
          float rgbSplit = 0.001 + curvature * 0.01;
          vec4 colorR = texture2D(textureSampler, vec2(texUV.x + rgbSplit, texUV.y));
          vec4 colorB = texture2D(textureSampler, vec2(texUV.x - rgbSplit, texUV.y));
          
          color.r = color.r * 0.3 + colorR.r * 0.7;
          color.b = color.b * 0.3 + colorB.b * 0.7;
          
          gl_FragColor = color;
        }
      `);
      this.gl.compileShader(fragShader);

      // Create program
      this.program = this.gl.createProgram();
      if (!this.program) return;
      
      this.gl.attachShader(this.program, vertShader);
      this.gl.attachShader(this.program, fragShader);
      this.gl.linkProgram(this.program);

      // Create buffer
      this.buffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
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
      console.warn("WebGL CRT effect failed, falling back to canvas");
      this.useWebGL = false;
    }
  }

  public apply(): void {
    if (!this.params.enabled) return;

    if (this.useWebGL) {
      this.applyWebGL();
    } else {
      this.applyCanvas();
    }
  }

  private applyWebGL(): void {
    if (!this.gl || !this.program) return;

    const gl = this.gl;
    const width = this.demoCanvas.width;
    const height = this.demoCanvas.height;

    if (gl.canvas.width !== this.demoCanvas.width || gl.canvas.height !== this.demoCanvas.height) {
        gl.canvas.width = this.demoCanvas.width;
        gl.canvas.height = this.demoCanvas.height;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    // Update texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.demoCanvas);

    // Clear and draw
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.uniform1f(gl.getUniformLocation(this.program, "time"), performance.now() / 1000);
    gl.uniform2f(gl.getUniformLocation(this.program, "resolution"), width, height);
    gl.uniform1f(gl.getUniformLocation(this.program, "curvature"), this.params.curvature);
    gl.uniform1f(gl.getUniformLocation(this.program, "scanlineOpacity"), this.params.scanlineOpacity);
    gl.uniform1f(gl.getUniformLocation(this.program, "scanlineSpacing"), this.params.scanlineSpacing);
    gl.uniform1f(gl.getUniformLocation(this.program, "vignette"), this.params.vignette);
    gl.uniform1f(gl.getUniformLocation(this.program, "noise"), this.params.noise);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const positionLoc = gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Draw the WebGL canvas onto the main canvas
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(this.gl.canvas, 0, 0, width, height);
  }

  private applyCanvas(): void {
    const { width, height } = this.demoCanvas;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCtx.drawImage(this.demoCanvas, 0, 0);

    // Scanlines
    this.ctx.fillStyle = `rgba(0,0,0,${this.params.scanlineOpacity})`;
    for (let y = this.params.scanlineOffset % this.params.scanlineSpacing; y < height; y += this.params.scanlineSpacing) {
      this.ctx.fillRect(0, y, width, 1);
    }

    // Vignette
    const gradient = this.ctx.createRadialGradient(
      width/2, height/2, 0,
      width/2, height/2, Math.max(width, height)/1.5
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${this.params.vignette})`);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // RGB split
    const redCanvas = document.createElement('canvas');
    redCanvas.width = width;
    redCanvas.height = height;
    const redCtx = redCanvas.getContext('2d');
    if (!redCtx) return;
    
    redCtx.drawImage(tempCanvas, -1, 0);
    redCtx.globalCompositeOperation = 'multiply';
    redCtx.fillStyle = 'rgb(255,0,0)';
    redCtx.fillRect(0, 0, width, height);

    const blueCanvas = document.createElement('canvas');
    blueCanvas.width = width;
    blueCanvas.height = height;
    const blueCtx = blueCanvas.getContext('2d');
    if (!blueCtx) return;
    
    blueCtx.drawImage(tempCanvas, 1, 0);
    blueCtx.globalCompositeOperation = 'multiply';
    blueCtx.fillStyle = 'rgb(0,0,255)';
    blueCtx.fillRect(0, 0, width, height);

    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.drawImage(redCanvas, 0, 0);
    this.ctx.globalAlpha = 0.2;
    this.ctx.drawImage(blueCanvas, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';

    // Noise
    if (Math.random() < this.params.noise) {
      this.ctx.fillStyle = `rgba(255,255,255,${this.params.noise})`;
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        this.ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  public updateWithAudioData(audioData: Uint8Array | null): void {
    if (!audioData) return;

    // Calculate frequency bands
    const bass = this.getFrequencyRange(audioData, 0, 10);
    const mid = this.getFrequencyRange(audioData, 10, 30);
    const high = this.getFrequencyRange(audioData, 30, 60);
    const full = this.getFrequencyRange(audioData, 0, audioData.length/2);

    // Smooth values
    this.params.lastBassImpact = this.lerp(this.params.lastBassImpact, bass, 0.1);
    this.params.lastMidImpact = this.lerp(this.params.lastMidImpact, mid, 0.1);
    this.params.lastHighImpact = this.lerp(this.params.lastHighImpact, high, 0.15);

    // Update parameters
    this.params.curvature = 0.08 + (this.params.lastBassImpact * this.params.bassCurvatureImpact);
    this.params.scanlineOpacity = 0.07 + (this.params.lastMidImpact * this.params.midRangeScanlineImpact);
    this.params.scanlineSpacing = 4 - (this.params.lastMidImpact * 2);
    this.params.noise = 0.02 + (this.params.lastHighImpact * this.params.highFreqNoiseImpact);
    this.params.vignette = 0.25 + (full * 0.15);
  }

  private getFrequencyRange(data: Uint8Array, start: number, end: number): number {
    let sum = 0;
    for (let i = start; i < end && i < data.length; i++) {
      sum += data[i];
    }
    return sum / (end - start) / 255;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  // public handleResize(): void {
  //   if (this.gl) {
  //     this.gl.viewport(0, 0, this.demoCanvas.width, this.demoCanvas.height);
  //   }
  // }
}

export default CRTEffect;
