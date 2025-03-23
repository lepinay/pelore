import AudioSystem from "./AudioSystem";

interface VisualizerParams {
  numCopperBars: number;
  starCount: number;
  baseAmplitude: number;
  frequency: number;
  copperBarSpacing: number;
  maxCopperBars: number;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
}

class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioSystem: AudioSystem;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private params: VisualizerParams;
  private stars: Star[];
  public isRendering: boolean;
  private time: number;

  constructor(canvas: HTMLCanvasElement, audioSystem: AudioSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.audioSystem = audioSystem;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    
    const savedCopperBars = localStorage.getItem('copperBarsCount');
    
    this.params = {
      numCopperBars: savedCopperBars ? parseInt(savedCopperBars, 10) : 40,
      starCount: 300,
      baseAmplitude: 50,
      frequency: 0.05,
      copperBarSpacing: 4,
      maxCopperBars: 120
    };

    this.stars = [];
    this.isRendering = false;
    this.time = 0;
    
    this.init();
  }

  private init(): void {
    this.setupCanvases();
    this.initStarfield();
    this.setupEventListeners();
  }

  private setupCanvases(): void {
    this.offscreenCanvas.width = 800;
    this.offscreenCanvas.height = 600;
    this.resize();
  }

  private initStarfield(): void {
    this.stars = Array.from({ length: this.params.starCount }, () => ({
      x: Math.random() * this.offscreenCanvas.width,
      y: Math.random() * this.offscreenCanvas.height,
      z: Math.random() * 3 + 0.5,
      size: Math.random() * 2 + 0.5,
      brightness: Math.random() * 0.5 + 0.5
    }));
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
  }

  public start(): void {
    if (!this.isRendering) {
      this.isRendering = true;
      this.render();
    }
  }

  public stop(): void {
    this.isRendering = false;
  }

  private render(): void {
    if (!this.isRendering) return;

    this.update();
    this.draw();
    requestAnimationFrame(() => this.render());
  }

  private update(): void {
    this.time += 0.05;
  }

  private draw(): void {
    this.clearCanvases();
    this.drawStarfield();
    this.drawCopperBars(this.audioSystem.getAudioData());
    this.copyToDisplay();
  }

  private clearCanvases(): void {
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawStarfield(): void {
    const audioData = this.audioSystem.getAudioData();
    
    this.stars.forEach(star => {
      const bass = this.getFrequencyRange(audioData, 0, 10);
      const treble = this.getFrequencyRange(audioData, 30, 60);
      
      star.x -= star.z * (1 + bass * 2);
      if (star.x < 0) this.resetStar(star);

      const size = star.size * (1 + treble);
      const alpha = star.brightness * (1 - (star.z - 0.5) / 3);

      const gradient = this.offscreenCtx.createRadialGradient(
        star.x, star.y, 0, star.x, star.y, size * 2
      );
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(1, 'rgba(200,220,255,0)');
      
      this.offscreenCtx.fillStyle = gradient;
      this.offscreenCtx.fillRect(star.x - size*2, star.y - size*2, size*4, size*4);

      this.offscreenCtx.fillStyle = `rgba(255,255,255,${alpha})`;
      this.offscreenCtx.fillRect(star.x - size/2, star.y - size/2, size, size);
    });
  }

  private drawCopperBars(audioData: Uint8Array): void {
    const { width, height } = this.offscreenCanvas;
    const barHeight = this.calculateBarHeight();
    
    for (let i = 0; i < this.params.numCopperBars; i++) {
      const freqIndex = Math.floor((i / this.params.numCopperBars) * (audioData.length / 2));
      const amplitude = audioData[freqIndex] / 255;
      
      this.drawSingleBar(i, barHeight, amplitude);
    }
  }

  private calculateBarHeight(): number {
    const totalHeight = this.offscreenCanvas.height * 0.7;
    return Math.max(1, 
      (totalHeight - (this.params.numCopperBars * this.params.copperBarSpacing)) 
      / this.params.numCopperBars
    );
  }

  private drawSingleBar(index: number, barHeight: number, amplitude: number): void {
    const y = this.offscreenCanvas.height/2 - 
      (this.params.numCopperBars * (barHeight + this.params.copperBarSpacing)) / 2 +
      index * (barHeight + this.params.copperBarSpacing);
    
    const hue = (this.time * 10 + index * 360/this.params.numCopperBars) % 360;
    const width = this.offscreenCanvas.width * (0.3 + 0.7 * amplitude);
    const x = (this.offscreenCanvas.width - width) / 2;

    let saturation = 100;
    let lightness = 50;
    let audioData = this.audioSystem.getAudioData();
    let isAudioPlaying = this.audioSystem.isPlaying;

    if (isAudioPlaying && audioData && this.audioSystem.analyser && this.audioSystem.analyser.frequencyBinCount) {
      const binIndex = Math.floor((index / this.params.numCopperBars) * (this.audioSystem.analyser.frequencyBinCount / 2));
      saturation = 80 + (audioData[binIndex] / 255) * 20;
      lightness = 40 + (audioData[binIndex] / 255) * 30;
  }

    const gradient = this.offscreenCtx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
    gradient.addColorStop(0.5, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
    gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
    
    this.offscreenCtx.fillStyle = gradient;
    this.offscreenCtx.fillRect(x, y, width, barHeight);
  }

  private copyToDisplay(): void {
    this.ctx.drawImage(
      this.offscreenCanvas, 
      0, 0, 
      this.canvas.width, 
      this.canvas.height
    );
  }

  private getFrequencyRange(data: Uint8Array, start: number, end: number): number {
    let sum = 0;
    for (let i = start; i < end && i < data.length; i++) {
      sum += data[i];
    }
    return sum / (end - start) / 255;
  }

  private resetStar(star: Star): void {
    star.x = this.offscreenCanvas.width;
    star.y = Math.random() * this.offscreenCanvas.height;
  }

  public adjustCopperBars(delta: number): void {
    this.params.numCopperBars = Math.max(4,
      Math.min(this.params.maxCopperBars, this.params.numCopperBars + delta)
    );
    localStorage.setItem('copperBarsCount', this.params.numCopperBars.toString());
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());
    
    // Add keyboard event listener for arrows
    window.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowUp':
          this.adjustCopperBars(1);
          break;
        case 'ArrowDown':
          this.adjustCopperBars(-1);
          break;
      }
    });
  }
}

export default Visualizer;