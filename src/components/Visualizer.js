class Visualizer {
  constructor(canvas, audioSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audioSystem = audioSystem;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    
    // Visualization parameters
    this.params = {
      numCopperBars: 40,
      starCount: 300,
      baseAmplitude: 50,
      frequency: 0.05,
      copperBarSpacing: 1,
      maxCopperBars: 120
    };

    // State
    this.stars = [];
    this.isRendering = false;
    this.time = 0;
    
    this.init();
  }

  init() {
    this.setupCanvases();
    this.initStarfield();
    this.setupEventListeners();
  }

  setupCanvases() {
    this.offscreenCanvas.width = 800;
    this.offscreenCanvas.height = 600;
    this.resize();
  }

  initStarfield() {
    this.stars = Array.from({ length: this.params.starCount }, () => ({
      x: Math.random() * this.offscreenCanvas.width,
      y: Math.random() * this.offscreenCanvas.height,
      z: Math.random() * 3 + 0.5,
      size: Math.random() * 2 + 0.5,
      brightness: Math.random() * 0.5 + 0.5
    }));
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
  }

  start() {
    if (!this.isRendering) {
      this.isRendering = true;
      this.render();
    }
  }

  stop() {
    this.isRendering = false;
  }

  render() {
    if (!this.isRendering) return;

    this.update();
    this.draw();
    requestAnimationFrame(() => this.render());
  }

  update() {
    this.time += 0.05;
  }

  draw() {
    this.clearCanvases();
    this.drawStarfield();
    this.drawCopperBars(this.audioSystem.getAudioData());
    this.copyToDisplay();
  }

  clearCanvases() {
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawStarfield() {
    const audioData = this.audioSystem.getAudioData();
    
    this.stars.forEach(star => {
      const bass = this.getFrequencyRange(audioData, 0, 10);
      const treble = this.getFrequencyRange(audioData, 30, 60);
      
      star.x -= star.z * (1 + bass * 2);
      if (star.x < 0) this.resetStar(star);

      const size = star.size * (1 + treble);
      const alpha = star.brightness * (1 - (star.z - 0.5) / 3);

      // Draw star glow
      const gradient = this.offscreenCtx.createRadialGradient(
        star.x, star.y, 0, star.x, star.y, size * 2
      );
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(1, 'rgba(200,220,255,0)');
      
      this.offscreenCtx.fillStyle = gradient;
      this.offscreenCtx.fillRect(star.x - size*2, star.y - size*2, size*4, size*4);

      // Draw star core
      this.offscreenCtx.fillStyle = `rgba(255,255,255,${alpha})`;
      this.offscreenCtx.fillRect(star.x - size/2, star.y - size/2, size, size);
    });
  }

  drawCopperBars(audioData) {
    const { width, height } = this.offscreenCanvas;
    const barHeight = this.calculateBarHeight();
    
    for (let i = 0; i < this.params.numCopperBars; i++) {
      const freqIndex = Math.floor((i / this.params.numCopperBars) * (audioData.length / 2));
      const amplitude = audioData[freqIndex] / 255;
      
      this.drawSingleBar(i, barHeight, amplitude);
    }
  }

  calculateBarHeight() {
    const totalHeight = this.offscreenCanvas.height * 0.7;
    return Math.max(1, 
      (totalHeight - (this.params.numCopperBars * this.params.copperBarSpacing)) 
      / this.params.numCopperBars
    );
  }

  drawSingleBar(index, barHeight, amplitude) {
    const y = this.offscreenCanvas.height/2 - 
      (this.params.numCopperBars * (barHeight + this.params.copperBarSpacing)) / 2 +
      index * (barHeight + this.params.copperBarSpacing);
    
    const hue = (this.time * 10 + index * 360/this.params.numCopperBars) % 360;
    const width = this.offscreenCanvas.width * (0.3 + 0.7 * amplitude);
    const x = (this.offscreenCanvas.width - width) / 2;

    // Vertical gradient
    const gradient = this.offscreenCtx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, `hsl(${hue}, 80%, 30%)`);
    gradient.addColorStop(0.5, `hsl(${hue}, 100%, 50%)`);
    gradient.addColorStop(1, `hsl(${hue}, 80%, 30%)`);
    
    this.offscreenCtx.fillStyle = gradient;
    this.offscreenCtx.fillRect(x, y, width, barHeight);
  }

  copyToDisplay() {
    this.ctx.drawImage(
      this.offscreenCanvas, 
      0, 0, 
      this.canvas.width, 
      this.canvas.height
    );
  }

  getFrequencyRange(data, start, end) {
    let sum = 0;
    for (let i = start; i < end && i < data.length; i++) {
      sum += data[i];
    }
    return sum / (end - start) / 255;
  }

  resetStar(star) {
    star.x = this.offscreenCanvas.width;
    star.y = Math.random() * this.offscreenCanvas.height;
  }

  adjustCopperBars(delta) {
    this.params.numCopperBars = Math.max(4,
      Math.min(this.params.maxCopperBars, this.params.numCopperBars + delta)
    );
    localStorage.setItem('copperBarsCount', this.params.numCopperBars);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resize());
  }
}

export default Visualizer; 