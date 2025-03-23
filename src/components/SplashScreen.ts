interface TrackInfo {
  url: string;
  name: string;
}

interface AudioSystem {
  getTracks(): TrackInfo[];
}

class SplashScreen {
  public element: HTMLDivElement;
  private isVisible: boolean;
  private musicSelect: HTMLSelectElement | null;
  private selectedTrackURL: string;
  private audioSystem: AudioSystem;
  private musicSelector: HTMLDivElement | null;
  private startCallback: ((selectedTrack: string) => void) | null;
  private tracks: TrackInfo[];

  constructor(audioSystem: AudioSystem) {
    this.element = document.createElement('div');
    this.isVisible = true;
    this.musicSelect = null;
    this.selectedTrackURL = 'none';
    this.audioSystem = audioSystem;
    this.musicSelector = null;
    this.startCallback = null;
    this.tracks = [];
    this.initDOM();
    this.initMusicSelector();
  }

  private initDOM(): void {
    this.element.id = 'splash-screen';
    this.element.innerHTML = `
      <div class="splash-content">
        <h1>SYSTEM 1.0.5 INITIALISED.</h1>
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
    Object.assign((this.element.querySelector('.splash-content') as HTMLElement).style, {
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

    this.element.querySelector('.crt-text')!.after(startButton);

    // Add this to the initDOM method after creating the musicSelect element
    const musicSelector = this.element.querySelector('.music-selector') as HTMLDivElement;
    const musicSelect = this.element.querySelector('#music-select') as HTMLSelectElement;
    const musicSelectionText = this.element.querySelector('.music-selection-text') as HTMLDivElement;

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
      textAlign: 'center',
      // Add these properties for Firefox
      scrollbarWidth: 'thin',
      scrollbarColor: '#0ff #001a1a'
    });

    // Add hover effects
    musicSelect.addEventListener('mouseover', () => {
      musicSelect.style.backgroundColor = '#003333';
    });

    musicSelect.addEventListener('mouseout', () => {
      musicSelect.style.backgroundColor = '#000';
    });

    // Create a more comprehensive stylesheet for all scrollbars in the application
    const scrollbarStyles = document.createElement('style');
    scrollbarStyles.textContent = `
      /* Target the music select dropdown */
      #music-select::-webkit-scrollbar {
        width: 8px;
        background: #001a1a;
      }
      #music-select::-webkit-scrollbar-thumb {
        background: #0ff;
        border-radius: 4px;
        box-shadow: 0 0 5px #0ff;
      }
      #music-select::-webkit-scrollbar-thumb:hover {
        background: #00ffff99;
        box-shadow: 0 0 8px #0ff;
      }
      #music-select::-webkit-scrollbar-track {
        background: #001a1a;
        border-radius: 4px;
        box-shadow: inset 0 0 5px rgba(0, 255, 255, 0.2);
      }
      
      /* Target the dropdown list for the select element */
      select.music-select option {
        background-color: #000;
        color: #0ff;
        font-family: 'Press Start 2P', cursive;
      }
      
      /* For Webkit browsers - target dropdown scrollbar */
      select::-webkit-scrollbar {
        width: 8px;
        background: #001a1a;
      }
      select::-webkit-scrollbar-thumb {
        background: #0ff;
        border-radius: 4px;
        box-shadow: 0 0 5px #0ff;
      }
      select::-webkit-scrollbar-thumb:hover {
        background: #00ffff99;
        box-shadow: 0 0 8px #0ff;
      }
      select::-webkit-scrollbar-track {
        background: #001a1a;
        border-radius: 4px;
        box-shadow: inset 0 0 5px rgba(0, 255, 255, 0.2);
      }
    `;

    // Insert scrollbar styles into the document
    document.head.appendChild(scrollbarStyles);
  }

  private initMusicSelector(): void {
    this.musicSelect = this.element.querySelector('#music-select');
    this.tracks = this.audioSystem.getTracks();
    this.populateMusicSelect();
  }

  private populateMusicSelect(): void {
    if (!this.musicSelect) return;
    
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
      this.musicSelect!.appendChild(option);
    });

    // Load saved selection
    const savedSelection = localStorage.getItem('selectedMusic');
    if (savedSelection) {
      this.musicSelect.value = savedSelection;
      this.selectedTrackURL = savedSelection;
    }

    // Add event listeners
    this.musicSelect.addEventListener('change', (e) => {
      this.selectedTrackURL = (e.target as HTMLSelectElement).value;
      localStorage.setItem('selectedMusic', this.selectedTrackURL);
    });

    this.musicSelect.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  public show(): void {
    document.body.appendChild(this.element);
    this.isVisible = true;
  }

  public hide(): void {
    this.element.style.opacity = '0';
    setTimeout(() => {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.isVisible = false;
    }, 800);
  }

  public onStart(callback: (selectedTrack: string) => void): void {
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element || 
          (e.target as HTMLElement).classList.contains('crt-text') ||
          (e.target as HTMLElement).tagName === 'BUTTON') {
        callback(this.selectedTrackURL);
      }
    });
  }

  public addScanlineAnimation(): void {
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

  public createMusicSelector(): HTMLDivElement {
    this.musicSelector = document.createElement('div');
    this.musicSelector.className = 'music-selector';
    // ... existing code for music selector ...
    
    return this.musicSelector;
  }
  
  public getMusicSelector(): HTMLDivElement | null {
    return this.musicSelector;
  }
}

export default SplashScreen;
