class SplashScreen {
  constructor(audioSystem) {
    this.element = document.createElement('div');
    this.isVisible = true;
    this.musicSelect = null;
    this.selectedTrackURL = 'none';
    this.audioSystem = audioSystem;
    this.musicSelector = null;
    this.startCallback = null;
    this.initDOM();
    this.initMusicSelector();
  }

  initDOM() {
    this.element.id = 'splash-screen';
    this.element.innerHTML = `
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

    // Style the splash screen
    Object.assign(this.element.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '1000',
      cursor: 'pointer',
      fontFamily: "'Press Start 2P', cursive",
      color: '#fff',
      textAlign: 'center',
      transition: 'opacity 0.8s'
    });

    // Style the splash content
    Object.assign(this.element.querySelector('.splash-content').style, {
      position: 'relative',
      padding: '20px',
      zIndex: '1001'
    });
    
    

    // Add start button
    const startButton = document.createElement('button');
    startButton.textContent = 'START DEMO';
    Object.assign(startButton.style, {
      marginTop: '20px',
      padding: '10px 20px',
      backgroundColor: '#0ff',
      color: 'black',
      border: 'none',
      borderRadius: '4px',
      fontFamily: "'Press Start 2P', cursive",
      fontSize: '16px',
      cursor: 'pointer',
      boxShadow: '0 0 10px #0ff'
    });

    startButton.addEventListener('mouseover', () => {
      startButton.style.backgroundColor = '#00cccc';
    });

    startButton.addEventListener('mouseout', () => {
      startButton.style.backgroundColor = '#0ff';
    });

    this.element.querySelector('.crt-text').after(startButton);

    // Add this to the initDOM method after creating the musicSelect element
    const musicSelector = this.element.querySelector('.music-selector');
    const musicSelect = this.element.querySelector('#music-select');
    const musicSelectionText = this.element.querySelector('.music-selection-text');

    // Style music selector container
    Object.assign(musicSelector.style, {
      marginBottom: '30px',
      fontFamily: "'Press Start 2P', cursive",
      color: '#0ff'
    });

    // Style selection text
    Object.assign(musicSelectionText.style, {
      fontSize: '14px',
      marginBottom: '10px',
      textShadow: '0 0 5px #0ff'
    });

    // Style select element
    Object.assign(musicSelect.style, {
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
      cursor: 'pointer',
      textAlign: 'center'
    });

    // Add hover effects
    musicSelect.addEventListener('mouseover', () => {
      musicSelect.style.backgroundColor = '#003333';
    });

    musicSelect.addEventListener('mouseout', () => {
      musicSelect.style.backgroundColor = '#000';
    });
  }

  initMusicSelector() {
    this.musicSelect = this.element.querySelector('#music-select');
    this.tracks = this.audioSystem.getTracks();
    this.populateMusicSelect();
  }

  populateMusicSelect() {
    this.musicSelect.innerHTML = '';
    
    // Add "No Music" option
    const noMusicOption = document.createElement('option');
    noMusicOption.value = 'none';
    noMusicOption.textContent = '-- No Music --';
    this.musicSelect.appendChild(noMusicOption);

    // Add track options
    this.tracks.forEach(track => {
      const option = document.createElement('option');
      option.value = track.url;
      option.textContent = track.name;
      this.musicSelect.appendChild(option);
    });

    // Load saved selection
    const savedSelection = localStorage.getItem('selectedMusic');
    if (savedSelection) {
      this.musicSelect.value = savedSelection;
      this.selectedTrackURL = savedSelection;
    }

    // Add event listeners
    this.musicSelect.addEventListener('change', (e) => {
      this.selectedTrackURL = e.target.value;
      localStorage.setItem('selectedMusic', this.selectedTrackURL);
    });

    this.musicSelect.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  show() {
    document.body.appendChild(this.element);
    this.isVisible = true;
  }

  hide() {
    this.element.style.opacity = '0';
    setTimeout(() => {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.isVisible = false;
    }, 800);
  }

  onStart(callback) {
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element || 
          e.target.classList.contains('crt-text') ||
          e.target.tagName === 'BUTTON') {
        callback(this.selectedTrackURL);
      }
    });
  }

  addScanlineAnimation() {
    const style = document.createElement('style');
    style.textContent = `
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
    `;
    document.head.appendChild(style);
  }

  createMusicSelector() {
    this.musicSelector = document.createElement('div');
    this.musicSelector.className = 'music-selector';
    // ... existing code for music selector ...
    
    return this.musicSelector;
  }
  
  // Add this new method to get the music selector element
  getMusicSelector() {
    return this.musicSelector;
  }
}

export default SplashScreen; 