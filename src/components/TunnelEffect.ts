interface EffectParams {
  time: number;
  speed: number;
  colorSpeed: number;
  zoomSpeed: number;
  tunnelRadius: number;
}

interface Uniforms {
  time: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  tunnelRadius: WebGLUniformLocation | null;
  colorSpeed: WebGLUniformLocation | null;
  zoomSpeed: WebGLUniformLocation | null;
}

class TunnelEffect {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null;
  private animationId: number | null;
  private isRunning: boolean;
  private params: EffectParams;
  private program: WebGLProgram | null;
  private buffer: WebGLBuffer | null;
  private uniforms: Uniforms;

  constructor(splashScreen: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'tunnel-canvas';

    splashScreen.insertBefore(this.canvas, splashScreen.firstChild);

    this.gl = this.canvas.getContext('webgl');
    this.animationId = null;
    this.isRunning = false;
    
    // Effect parameters
    this.params = {
      time: 0,
      speed: 0.03,
      colorSpeed: 0.3,
      zoomSpeed: 0.5,
      tunnelRadius: 0.5
    };

    // WebGL resources
    this.program = null;
    this.buffer = null;
    this.uniforms = {} as Uniforms;

    this.initWebGL();
    this.setupEventListeners();
  }

  private initWebGL(): boolean {
    if (!this.gl) {
      console.warn("WebGL not supported");
      return false;
    }

    // Vertex shader
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    if (!vertexShader) return false;
    this.gl.shaderSource(vertexShader, `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `);
    this.gl.compileShader(vertexShader);

    // Fragment shader
    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    if (!fragmentShader) return false;
    this.gl.shaderSource(fragmentShader, `
      precision mediump float;
      uniform float time;
      uniform vec2 resolution;
      uniform float tunnelRadius;
      uniform float colorSpeed;
      uniform float zoomSpeed;

      #define PI 3.14159265358979323846
      #define TWO_PI 6.28318530718

      // HSL to RGB conversion function
      vec3 hsl2rgb(float h, float s, float l) {
        // Ensure h is properly wrapped between 0 and 2PI
        h = mod(h, TWO_PI);
        
        float c = (1.0 - abs(2.0 * l - 1.0)) * s;
        float hp = h / (PI / 3.0);
        float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
        vec3 rgb;
        
        if (hp <= 1.0) rgb = vec3(c, x, 0.0);
        else if (hp <= 2.0) rgb = vec3(x, c, 0.0);
        else if (hp <= 3.0) rgb = vec3(0.0, c, x);
        else if (hp <= 4.0) rgb = vec3(0.0, x, c);
        else if (hp <= 5.0) rgb = vec3(x, 0.0, c);
        else rgb = vec3(c, 0.0, x);
        
        float m = l - c * 0.5;
        return rgb + m;
      }

      vec3 seamlessPattern(float angle, float depth) {
        // Scale angle to ensure seamless wrapping around the tunnel
        float scaledAngle = mod(angle, TWO_PI); 
        
        // For radial seamlessness, use a function that has continuous derivatives
        // We'll use sin and cos which are naturally periodic and smooth
        float pi2 = TWO_PI;
        
        // Calculate a continuous hue across depths using a smooth transition function
        float depthFactor = sin(depth * pi2 * 0.3) * 0.5 + 0.5; // Smoothly varies from 0 to 1 and back
        float hue = mod(scaledAngle / pi2 + depthFactor * 0.5 + time * colorSpeed * 0.1, 1.0) * pi2;
        
        // Use smooth periodic functions for saturation and lightness
        float saturation = 0.7 + 0.3 * cos(depth * pi2 * 0.3 + time * 0.3);
        float lightness = 0.5 + 0.2 * cos(scaledAngle * 2.0 + depth * pi2 * 0.3 + time * 0.5);
        
        // Apply rainbow color using HSL to RGB conversion
        vec3 rainbow = hsl2rgb(hue, saturation, lightness);
        
        // Add variations with smooth transitions
        float radialFactor = cos(depth * pi2 * 0.3);
        float angularFactor = cos(scaledAngle * 4.0);
        
        rainbow.r += 0.1 * radialFactor;
        rainbow.g += 0.1 * angularFactor;
        rainbow.b += 0.1 * cos(depth * pi2 * 0.3 + scaledAngle * 2.0);
        
        return clamp(rainbow, 0.0, 1.0);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy / resolution.xy) * 2.0 - 1.0;
        uv.x *= resolution.x / resolution.y;
        float radius = length(uv);
        float angle = atan(uv.y, uv.x);
        if (angle < 0.0) angle += TWO_PI;
        
        // Continuous depth calculation without hard mod operation
        // Use a formula that's continuous as radius approaches 0
        float depth = tunnelRadius / max(0.01, radius) + time * zoomSpeed;
        depth = depth * 0.5; // Scale down to make pattern less compressed
        
        // Instead of using mod which creates discontinuities, use sin or cos for periodicity
        // sin(depth) will smoothly vary between -1 and 1, which we can remap to 0-1
        float cyclicDepth = sin(depth) * 0.5 + 0.5; // Seamless cycle from 0 to 1 and back
        
        float rotationAngle = mod(angle + time * 0.2, TWO_PI);
        
        vec3 color = seamlessPattern(rotationAngle, depth);
        float edge = 1.0 - smoothstep(0.5, 1.5, radius);
        gl_FragColor = vec4(color * edge, 1.0);
      }
    `);
    this.gl.compileShader(fragmentShader);

    // Create program
    this.program = this.gl.createProgram();
    if (!this.program) return false;
    
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    // Create vertex buffer
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Get uniform locations
    this.uniforms = {
      time: this.gl.getUniformLocation(this.program, 'time'),
      resolution: this.gl.getUniformLocation(this.program, 'resolution'),
      tunnelRadius: this.gl.getUniformLocation(this.program, 'tunnelRadius'),
      colorSpeed: this.gl.getUniformLocation(this.program, 'colorSpeed'),
      zoomSpeed: this.gl.getUniformLocation(this.program, 'zoomSpeed')
    };

    return true;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.params.time = 0;
    this.animate();
  }

  private animate(): void {
    if (!this.isRunning) return;
    
    this.params.time += this.params.speed;
    this.render();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private render(): void {
    if (!this.gl || !this.program) return;

    this.gl.useProgram(this.program);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    
    // Set uniforms
    this.gl.uniform1f(this.uniforms.time, this.params.time);
    this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.uniforms.tunnelRadius, this.params.tunnelRadius);
    this.gl.uniform1f(this.uniforms.colorSpeed, this.params.colorSpeed);
    this.gl.uniform1f(this.uniforms.zoomSpeed, this.params.zoomSpeed);

    // Set position attribute
    const positionLocation = this.gl.getAttribLocation(this.program, 'position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Cleanup WebGL resources
    if (this.gl && this.program) {
      this.gl.deleteBuffer(this.buffer);
      const shaders = this.gl.getAttachedShaders(this.program);
      if (shaders) {
        shaders.forEach(shader => this.gl.deleteShader(shader));
      }
      this.gl.deleteProgram(this.program);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  public handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public setSpeed(speed: number): void {
    this.params.speed = speed;
  }

  public setColorSpeed(colorSpeed: number): void {
    this.params.colorSpeed = colorSpeed;
  }

  public setZoomSpeed(zoomSpeed: number): void {
    this.params.zoomSpeed = zoomSpeed;
  }
}

export default TunnelEffect;
