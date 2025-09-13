import { CONFIG } from '../config/constants.js';

/**
 * Manages camera operations and flash functionality
 */
export class CameraManager {
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private isFlashOn = false;

  constructor(
    private videoElement: HTMLVideoElement,
    private canvasElement: HTMLCanvasElement,
    private flashBtn: HTMLButtonElement
  ) {}

  /**
   * Start camera stream
   */
  async start(): Promise<void> {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: CONFIG.CAMERA.FACING_MODE,
          width: { ideal: CONFIG.CAMERA.IDEAL_WIDTH },
          height: { ideal: CONFIG.CAMERA.IDEAL_HEIGHT }
        }
      });
      
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();
      
      this.setupFlash();
    } catch(err) {
      console.error("Error accessing camera:", err);
      throw new Error("Could not access camera. Please enable permissions and try again.");
    }
  }

  /**
   * Setup flash/torch functionality
   */
  private setupFlash(): void {
    this.videoTrack = this.stream!.getVideoTracks()[0];
    const capabilities = this.videoTrack.getCapabilities() as any;
    this.flashBtn.disabled = !capabilities.torch;
    this.isFlashOn = false;
    this.flashBtn.classList.remove('on');
  }
  
  /**
   * Stop camera stream
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.videoTrack = null;
    }
  }
  
  /**
   * Toggle flash/torch
   */
  async toggleFlash(): Promise<void> {
    if (!this.videoTrack || !(this.videoTrack.getCapabilities() as any).torch) return;
    
    try {
      this.isFlashOn = !this.isFlashOn;
      await this.videoTrack.applyConstraints({ 
        advanced: [{ torch: this.isFlashOn } as any] 
      });
      this.flashBtn.classList.toggle('on', this.isFlashOn);
    } catch (err) {
      console.error("Error toggling flash:", err);
    }
  }

  /**
   * Capture photo from video stream
   */
  capturePhoto(): void {
    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;
    
    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;
    ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
  }
  
  /**
   * Get canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvasElement;
  }
}