import { BaseComponent } from './BaseComponent.js';

export class WebcamMonitor extends BaseComponent {
  constructor(containerId, options = {}) {
    super(containerId);
    this.stream = null;
    this.video = null;
    this.onSnapshotCapture = options.onSnapshotCapture || (() => {});
    this.snapshotInterval = options.snapshotInterval || 30000; // 30 seconds
    this.intervalId = null;
  }

  async init() {
    try {
      await this.setupWebcam();
      this.render();
      this.startSnapshotCapture();
    } catch (error) {
      console.error('Error initializing webcam:', error);
      this.renderError('Webcam access is required for the exam.');
    }
  }

  async setupWebcam() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
    } catch (error) {
      throw new Error('Unable to access webcam. Please ensure camera permissions are granted.');
    }
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="webcam-container">
        <video id="webcam-video" autoplay muted playsinline class="webcam-video"></video>
        <div class="webcam-status">
          <span class="badge bg-success">Webcam Active</span>
        </div>
      </div>
    `;

    this.video = this.container.querySelector('#webcam-video');
    if (this.video && this.stream) {
      this.video.srcObject = this.stream;
    }
  }

  renderError(message) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="webcam-container webcam-error">
        <div class="alert alert-danger m-0">
          <i class="bi bi-exclamation-triangle"></i>
          <small>${message}</small>
        </div>
      </div>
    `;
  }

  startSnapshotCapture() {
    // Initial capture
    this.captureSnapshot();
    
    // Set up interval for periodic captures
    this.intervalId = setInterval(() => {
      this.captureSnapshot();
    }, this.snapshotInterval);
  }

  captureSnapshot() {
    if (!this.video || this.video.readyState !== 4) {
      console.warn('Video not ready for snapshot');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = this.video.videoWidth;
      canvas.height = this.video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
      
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      this.onSnapshotCapture(base64Image);
    } catch (error) {
      console.error('Error capturing snapshot:', error);
    }
  }

  cleanup() {
    // Stop snapshot capture
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Stop video stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    super.cleanup();
  }
}