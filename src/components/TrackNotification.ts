interface TrackNotificationOptions {
  container?: HTMLElement;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  duration?: number;
  showAnimation?: boolean;
  theme?: 'dark' | 'light' | 'retro';
  fontSize?: string;
  onHide?: () => void;
}

/**
 * A reusable component for displaying track notifications
 * Allows showing temporary notifications when tracks change
 */
class TrackNotification {
  private element: HTMLDivElement;
  private timeoutId: number | null = null;
  private isVisible: boolean = false;
  private options: Required<TrackNotificationOptions>;
  
  constructor(options: TrackNotificationOptions = {}) {
    // Default options
    this.options = {
      container: document.body,
      position: 'bottom-right',
      duration: 5000,
      showAnimation: true,
      theme: 'retro',
      fontSize: '16px',
      onHide: () => {},
      ...options
    };
    
    this.element = document.createElement('div');
    this.initializeElement();
  }
  
  private initializeElement(): void {
    this.element.className = 'track-notification';
    this.element.style.visibility = 'hidden';
    this.element.style.opacity = '0';
    this.element.style.position = 'fixed';
    this.element.style.zIndex = '1000';
    this.element.style.padding = '12px 20px';
    this.element.style.borderRadius = '4px';
    this.element.style.transition = 'opacity 0.4s ease-in-out';
    this.element.style.fontSize = this.options.fontSize;
    
    // Position based on the option
    switch(this.options.position) {
      case 'top-left':
        this.element.style.top = '20px';
        this.element.style.left = '20px';
        break;
      case 'top-right':
        this.element.style.top = '20px';
        this.element.style.right = '20px';
        break;
      case 'bottom-left':
        this.element.style.bottom = '20px';
        this.element.style.left = '20px';
        break;
      case 'bottom-right':
      default:
        this.element.style.bottom = '20px';
        this.element.style.right = '20px';
        break;
    }
    
    // Apply theme
    this.applyTheme();
    
    // Add to container
    this.options.container.appendChild(this.element);
  }
  
  private applyTheme(): void {
    switch(this.options.theme) {
      case 'light':
        this.element.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        this.element.style.color = '#333';
        this.element.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        break;
      case 'retro':
        this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.element.style.color = '#0ff';
        this.element.style.boxShadow = '0 0 10px #0ff';
        this.element.style.border = '1px solid #0ff';
        this.element.style.fontFamily = "'Press Start 2P', monospace, sans-serif";
        break;
      case 'dark':
      default:
        this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.element.style.color = '#fff';
        this.element.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
        break;
    }
  }
  
  /**
   * Show a notification with the current track name
   * @param trackName The name of the track to display
   */
  public showTrackNotification(trackName: string): void {
    // Clear any existing timeout
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // Update content
    this.element.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">🎵</div>
        <div class="notification-text">
          <div class="notification-title">Now Playing</div>
          <div class="notification-track">${trackName}</div>
        </div>
      </div>
    `;
    
    // Style content elements
    const iconElement = this.element.querySelector('.notification-icon') as HTMLElement;
    if (iconElement) {
      iconElement.style.marginRight = '10px';
      iconElement.style.fontSize = '1.2em';
    }
    
    const titleElement = this.element.querySelector('.notification-title') as HTMLElement;
    if (titleElement) {
      titleElement.style.fontWeight = 'bold';
      titleElement.style.marginBottom = '4px';
      titleElement.style.fontSize = '0.85em';
    }
    
    const contentElement = this.element.querySelector('.notification-content') as HTMLElement;
    if (contentElement) {
      contentElement.style.display = 'flex';
      contentElement.style.alignItems = 'center';
    }
    
    // Show the notification
    this.element.style.visibility = 'visible';
    
    // Use a small delay to ensure the transition works
    setTimeout(() => {
      this.element.style.opacity = '1';
    }, 10);
    
    this.isVisible = true;
    
    // Hide after the specified duration
    this.timeoutId = window.setTimeout(() => this.hide(), this.options.duration);
  }
  
  /**
   * Hide the track notification
   */
  public hide(): void {
    if (!this.isVisible) return;
    
    this.element.style.opacity = '0';
    
    setTimeout(() => {
      this.element.style.visibility = 'hidden';
      this.isVisible = false;
      if (this.options.onHide) {
        this.options.onHide();
      }
    }, 400); // Match the transition duration
  }
  
  /**
   * Immediately remove the notification element from the DOM
   */
  public destroy(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
    }
    
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
  
  /**
   * Update notification options
   * @param options New options to apply
   */
  public updateOptions(options: Partial<TrackNotificationOptions>): void {
    this.options = { ...this.options, ...options };
    this.initializeElement(); // Reinitialize with new options
  }
}

export default TrackNotification;
