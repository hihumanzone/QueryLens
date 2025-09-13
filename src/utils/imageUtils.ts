import { CONFIG } from '../config/constants.js';

/**
 * Utility functions for image processing
 */
export class ImageUtils {
  /**
   * Resizes a canvas to fit within max dimension while maintaining aspect ratio
   */
  static async resizeCanvas(canvas: HTMLCanvasElement, maxDimension: number = CONFIG.IMAGE.MAX_DIMENSION): Promise<HTMLCanvasElement> {
    const { width, height } = canvas;

    if (width <= maxDimension && height <= maxDimension) {
      return canvas;
    }

    let newWidth: number;
    let newHeight: number;

    if (width > height) {
      newWidth = maxDimension;
      newHeight = (height * maxDimension) / width;
    } else {
      newHeight = maxDimension;
      newWidth = (width * maxDimension) / height;
    }

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = newWidth;
    offscreenCanvas.height = newHeight;

    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) throw new Error("Could not create 2D context for resizing");
    
    const imageBitmap = await createImageBitmap(canvas, 0, 0, width, height, {
      resizeWidth: newWidth,
      resizeHeight: newHeight,
      resizeQuality: 'high',
    });

    ctx.drawImage(imageBitmap, 0, 0);
    imageBitmap.close(); 

    return offscreenCanvas;
  }

  /**
   * Converts canvas to base64 image part for AI processing
   */
  static canvasToImagePart(canvas: HTMLCanvasElement) {
    const dataUrl = canvas.toDataURL("image/jpeg", CONFIG.IMAGE.JPEG_QUALITY);
    return {
      inlineData: {
        mimeType: "image/jpeg",
        data: dataUrl.split(",")[1],
      },
    };
  }

  /**
   * Rotates canvas content by 90 degrees counter-clockwise
   */
  static rotateCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);

    canvas.width = tempCanvas.height;
    canvas.height = tempCanvas.width;
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-90 * Math.PI / 180);
    ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
    ctx.restore();
  }
}