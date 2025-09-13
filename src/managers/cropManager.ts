import { CropRect, PointerPosition, CropHandle } from '../types/index.js';
import { CONFIG } from '../config/constants.js';

/**
 * Manages image cropping functionality with drag-and-drop interface
 */
export class CropManager {
  private cropRect: CropRect = { x: 0, y: 0, width: 0, height: 0 };
  private activeHandle: CropHandle | null = null;
  private isManipulating = false;
  private isDrawing = false;
  private isCropDefined = false;

  private startPointer: PointerPosition = { x: 0, y: 0 };
  private startCropRect: CropRect = { ...this.cropRect };

  constructor(private cropBoxEl: HTMLElement, private canvasEl: HTMLCanvasElement) {
    this.bindMethods();
  }

  /**
   * Bind methods to maintain proper 'this' context
   */
  private bindMethods(): void {
    this.onDrawStart = this.onDrawStart.bind(this);
    this.onDrawOrManipulateMove = this.onDrawOrManipulateMove.bind(this);
    this.onDrawOrManipulateEnd = this.onDrawOrManipulateEnd.bind(this);
    this.onManipulateStart = this.onManipulateStart.bind(this);
  }

  /**
   * Activate cropping mode
   */
  public activate(): void {
    this.clear();
    this.canvasEl.parentElement!.addEventListener('pointerdown', this.onDrawStart);
  }

  /**
   * Deactivate cropping mode
   */
  public deactivate(): void {
    this.clear();
    this.removeEventListeners();
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    this.canvasEl.parentElement!.removeEventListener('pointerdown', this.onDrawStart);
    window.removeEventListener('pointermove', this.onDrawOrManipulateMove);
    window.removeEventListener('pointerup', this.onDrawOrManipulateEnd);
    window.removeEventListener('pointercancel', this.onDrawOrManipulateEnd);
  }
  
  /**
   * Clear crop selection
   */
  public clear(): void {
    this.isCropDefined = false;
    this.isDrawing = false;
    this.isManipulating = false;
    this.activeHandle = null;
    this.cropBoxEl.classList.add('hidden');
    this.cropBoxEl.removeEventListener('pointerdown', this.onManipulateStart);
  }

  /**
   * Check if crop is defined
   */
  public isCropped(): boolean {
    return this.isCropDefined;
  }

  /**
   * Apply crop to canvas
   */
  public applyCropToCanvas(): void {
    if (!this.isCropped()) return;

    const croppedCanvas = this.createCroppedCanvas();
    this.replaceCanvasContent(croppedCanvas);
  }

  /**
   * Create cropped canvas from current selection
   */
  private createCroppedCanvas(): HTMLCanvasElement {
    const croppedCanvas = document.createElement('canvas');
    const ctx = croppedCanvas.getContext('2d')!;
    
    croppedCanvas.width = this.cropRect.width;
    croppedCanvas.height = this.cropRect.height;
    
    ctx.drawImage(
      this.canvasEl,
      this.cropRect.x, this.cropRect.y, this.cropRect.width, this.cropRect.height,
      0, 0, this.cropRect.width, this.cropRect.height
    );
    
    return croppedCanvas;
  }

  /**
   * Replace canvas content with cropped version
   */
  private replaceCanvasContent(croppedCanvas: HTMLCanvasElement): void {
    this.canvasEl.width = croppedCanvas.width;
    this.canvasEl.height = croppedCanvas.height;
    this.canvasEl.getContext('2d')!.drawImage(croppedCanvas, 0, 0);
  }

  /**
   * Get pointer position relative to canvas in native coordinates
   */
  private getNativePointerPosition(e: PointerEvent): PointerPosition {
    const canvasRect = this.canvasEl.getBoundingClientRect();
    const scale = this.canvasEl.width / canvasRect.width;
    const x = (e.clientX - canvasRect.left) * scale;
    const y = (e.clientY - canvasRect.top) * scale;
    return {
      x: Math.max(0, Math.min(x, this.canvasEl.width)),
      y: Math.max(0, Math.min(y, this.canvasEl.height)),
    };
  }

  /**
   * Handle start of crop drawing
   */
  private onDrawStart(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('#crop-box')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    this.clear();
    this.isDrawing = true;
    this.startPointer = this.getNativePointerPosition(e);
    this.cropRect = { x: this.startPointer.x, y: this.startPointer.y, width: 0, height: 0 };
    
    this.addGlobalEventListeners();
  }
  
  /**
   * Handle start of crop manipulation
   */
  private onManipulateStart(e: PointerEvent): void {
    e.preventDefault();
    e.stopPropagation();

    this.isManipulating = true;
    this.startPointer = this.getNativePointerPosition(e);
    this.startCropRect = { ...this.cropRect };
    
    const target = e.target as HTMLElement;
    this.activeHandle = target.classList.contains('crop-handle') ? 
      target.dataset.handle as CropHandle : 'move';

    this.addGlobalEventListeners();
  }

  /**
   * Add global event listeners for pointer events
   */
  private addGlobalEventListeners(): void {
    window.addEventListener('pointermove', this.onDrawOrManipulateMove);
    window.addEventListener('pointerup', this.onDrawOrManipulateEnd);
    window.addEventListener('pointercancel', this.onDrawOrManipulateEnd);
  }

  /**
   * Handle pointer move during drawing or manipulation
   */
  private onDrawOrManipulateMove(e: PointerEvent): void {
    e.preventDefault();
    const currentPointer = this.getNativePointerPosition(e);

    if (this.isDrawing) {
      this.handleDrawing(currentPointer);
    } else if (this.isManipulating) {
      this.handleManipulation(currentPointer);
    }
    
    if (this.isCropDefined) {
      this.constrainCropBox();
      this.updateStyle();
    }
  }

  /**
   * Handle drawing mode pointer movement
   */
  private handleDrawing(currentPointer: PointerPosition): void {
    const deltaX = currentPointer.x - this.startPointer.x;
    const deltaY = currentPointer.y - this.startPointer.y;
    
    if (!this.isCropDefined && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      this.isCropDefined = true;
      this.cropBoxEl.classList.remove('hidden');
      this.cropBoxEl.addEventListener('pointerdown', this.onManipulateStart);
    }

    if (this.isCropDefined) {
      this.cropRect.x = deltaX > 0 ? this.startPointer.x : currentPointer.x;
      this.cropRect.y = deltaY > 0 ? this.startPointer.y : currentPointer.y;
      this.cropRect.width = Math.abs(deltaX);
      this.cropRect.height = Math.abs(deltaY);
    }
  }

  /**
   * Handle manipulation mode pointer movement
   */
  private handleManipulation(currentPointer: PointerPosition): void {
    const nativeDx = currentPointer.x - this.startPointer.x;
    const nativeDy = currentPointer.y - this.startPointer.y;
    
    if (this.activeHandle === 'move') {
      this.handleMove(nativeDx, nativeDy);
    } else if (this.activeHandle) {
      this.handleResize(nativeDx, nativeDy);
    }
  }

  /**
   * Handle move operation
   */
  private handleMove(dx: number, dy: number): void {
    const newX = this.startCropRect.x + dx;
    const newY = this.startCropRect.y + dy;
    this.cropRect.x = Math.max(0, Math.min(newX, this.canvasEl.width - this.cropRect.width));
    this.cropRect.y = Math.max(0, Math.min(newY, this.canvasEl.height - this.cropRect.height));
  }

  /**
   * Handle resize operation
   */
  private handleResize(dx: number, dy: number): void {
    if (this.activeHandle!.includes('e')) this.cropRect.width = this.startCropRect.width + dx;
    if (this.activeHandle!.includes('w')) {
      this.cropRect.width = this.startCropRect.width - dx;
      this.cropRect.x = this.startCropRect.x + dx;
    }
    if (this.activeHandle!.includes('s')) this.cropRect.height = this.startCropRect.height + dy;
    if (this.activeHandle!.includes('n')) {
      this.cropRect.height = this.startCropRect.height - dy;
      this.cropRect.y = this.startCropRect.y + dy;
    }
  }

  /**
   * Handle end of drawing or manipulation
   */
  private onDrawOrManipulateEnd(e: PointerEvent): void {
    e.preventDefault();
    
    if (this.isDrawing && !this.isCropDefined) {
      this.clear();
    }

    this.isDrawing = false;
    this.isManipulating = false;
    this.activeHandle = null;

    window.removeEventListener('pointermove', this.onDrawOrManipulateMove);
    window.removeEventListener('pointerup', this.onDrawOrManipulateEnd);
    window.removeEventListener('pointercancel', this.onDrawOrManipulateEnd);
  }

  /**
   * Constrain crop box to canvas boundaries
   */
  private constrainCropBox(): void {
    const { width: canvasWidth, height: canvasHeight } = this.canvasEl;

    // Constrain position
    if (this.cropRect.x < 0) {
      this.cropRect.width += this.cropRect.x;
      this.cropRect.x = 0;
    }
    if (this.cropRect.y < 0) {
      this.cropRect.height += this.cropRect.y;
      this.cropRect.y = 0;
    }

    // Constrain size
    if (this.cropRect.x + this.cropRect.width > canvasWidth) {
      this.cropRect.width = canvasWidth - this.cropRect.x;
    }
    if (this.cropRect.y + this.cropRect.height > canvasHeight) {
      this.cropRect.height = canvasHeight - this.cropRect.y;
    }

    // Enforce minimum size
    this.cropRect.width = Math.max(this.cropRect.width, CONFIG.IMAGE.MIN_CROP_SIZE);
    this.cropRect.height = Math.max(this.cropRect.height, CONFIG.IMAGE.MIN_CROP_SIZE);
  }

  /**
   * Update crop box visual style
   */
  private updateStyle(): void {
    const canvasRect = this.canvasEl.getBoundingClientRect();
    const containerRect = this.canvasEl.parentElement!.getBoundingClientRect();
    
    const canvasOffsetX = canvasRect.left - containerRect.left;
    const canvasOffsetY = canvasRect.top - containerRect.top;

    const scale = canvasRect.width / this.canvasEl.width;

    const displayX = canvasOffsetX + (this.cropRect.x * scale);
    const displayY = canvasOffsetY + (this.cropRect.y * scale);

    this.cropBoxEl.style.transform = `translate(${displayX}px, ${displayY}px)`;
    this.cropBoxEl.style.width = `${this.cropRect.width * scale}px`;
    this.cropBoxEl.style.height = `${this.cropRect.height * scale}px`;
  }
}