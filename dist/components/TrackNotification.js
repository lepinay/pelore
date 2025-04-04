/**
 * A reusable component for displaying track notifications
 * Allows showing temporary notifications when tracks change
 */
class TrackNotification {
    constructor(options = {}) {
        this.timeoutId = null;
        this.isVisible = false;
        // Default options
        this.options = {
            container: document.body,
            position: 'top-middle',
            duration: 5000,
            showAnimation: true,
            theme: 'retro',
            fontSize: '16px',
            onHide: () => { },
            ...options
        };
        this.element = document.createElement('div');
        this.initializeElement();
    }
    initializeElement() {
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
        switch (this.options.position) {
            case 'top-middle':
                this.element.style.top = '20px';
                this.element.style.left = '50%';
                this.element.style.transform = 'translateX(-50%)';
                break;
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
    applyTheme() {
        switch (this.options.theme) {
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
    showTrackNotification(trackName) {
        // Change the page title
        document.title = `${trackName}`;
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
        const iconElement = this.element.querySelector('.notification-icon');
        if (iconElement) {
            iconElement.style.marginRight = '10px';
            iconElement.style.fontSize = '1.2em';
        }
        const titleElement = this.element.querySelector('.notification-title');
        if (titleElement) {
            titleElement.style.textAlign = 'center';
            titleElement.style.fontWeight = 'bold';
            titleElement.style.marginBottom = '4px';
            titleElement.style.fontSize = '0.85em';
            titleElement.style.color = '#fff';
        }
        const contentElement = this.element.querySelector('.notification-content');
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
    hide() {
        if (!this.isVisible)
            return;
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
    destroy() {
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
    updateOptions(options) {
        this.options = { ...this.options, ...options };
        this.initializeElement(); // Reinitialize with new options
    }
}
export default TrackNotification;
//# sourceMappingURL=TrackNotification.js.map