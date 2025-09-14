import { DOMElements } from './types/index.js';
import { CONFIG, ModelType } from './config/constants.js';
import { UIManager } from './managers/uiManager.js';
import { CameraManager } from './managers/cameraManager.js';
import { CropManager } from './managers/cropManager.js';
import { GeminiService } from './services/geminiService.js';
import { ImageUtils } from './utils/imageUtils.js';

/**
 * Main application controller
 */
export class App {
  private ui: UIManager;
  private camera: CameraManager;
  private gemini: GeminiService | null = null;
  private cropper: CropManager;
  private selectedModel: ModelType = CONFIG.MODELS.FLASH;
  private lastFailedRequest: (() => void) | null = null;

  constructor(private elements: DOMElements) {
    this.ui = new UIManager(elements);
    this.camera = new CameraManager(elements.videoElement, elements.canvasElement, elements.flashBtn);
    this.cropper = new CropManager(elements.cropBox, elements.canvasElement);
    this.attachEventListeners();
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    // Check if we need to show API key modal
    if (!this.gemini && !GeminiService.hasStoredApiKey() && !process.env.API_KEY) {
      this.ui.showApiKeyModal();
      return;
    }

    // Initialize GeminiService if not already done
    if (!this.gemini) {
      try {
        this.gemini = new GeminiService();
      } catch (error) {
        this.ui.showApiKeyModal();
        this.ui.showApiKeyError("Failed to initialize with provided API key. Please check your key and try again.");
        return;
      }
    }

    await this.initializeCamera();
  }

  /**
   * Initialize camera and show camera view
   */
  private async initializeCamera(): Promise<void> {
    this.ui.resetResultView();
    this.cropper.deactivate();
    
    try {
      await this.camera.start();
      this.ui.showView('camera-view');
    } catch (error: any) {
      this.ui.displayError(error.message);
    }
  }
  
  /**
   * Attach all event listeners
   */
  private attachEventListeners(): void {
    // Camera controls
    this.elements.flashBtn.addEventListener('click', () => this.camera.toggleFlash());
    this.elements.captureBtn.addEventListener('click', () => this.capturePhoto());
    
    // Preview controls
    this.elements.retakeBtn.addEventListener('click', () => this.start());
    this.elements.rotateBtn.addEventListener('click', () => this.rotatePreviewImage());
    this.elements.confirmBtn.addEventListener('click', () => this.confirmPhoto());
    
    // Action buttons
    this.elements.startOverBtn.addEventListener('click', () => this.start());
    this.elements.retryBtn.addEventListener('click', () => this.retryLastRequest());
    this.elements.askImageBtn.addEventListener('click', () => this.solveFromImage());
    this.elements.transcribeBtn.addEventListener('click', () => this.transcribeImage());
    this.elements.askTextBtn.addEventListener('click', () => this.solveFromText());
    
    // Copy buttons
    this.elements.copyBtn.addEventListener('click', () => this.handleCopyAnswer());
    this.elements.copyTranscriptionBtn.addEventListener('click', () => this.handleCopyTranscription());
    
    // Model selection
    this.elements.modelFlashBtn.addEventListener('click', () => this.selectModel(CONFIG.MODELS.FLASH));
    this.elements.modelProBtn.addEventListener('click', () => this.selectModel(CONFIG.MODELS.PRO));

    // API Key modal
    this.elements.apiKeyForm.addEventListener('submit', (e) => this.handleApiKeySubmit(e));
    this.elements.toggleApiKeyVisibilityBtn.addEventListener('click', () => this.ui.toggleApiKeyVisibility());
    
    // Keyboard shortcuts
    this.attachKeyboardListeners();
  }

  /**
   * Attach keyboard event listeners
   */
  private attachKeyboardListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.elements.apiKeyModal.classList.contains('hidden')) {
        e.preventDefault();
        // Only allow closing if we have a working API key
        if (GeminiService.hasStoredApiKey() || process.env.API_KEY) {
          this.ui.hideApiKeyModal();
        }
      }
    });
  }

  /**
   * Handle API key form submission
   */
  private async handleApiKeySubmit(e: Event): Promise<void> {
    e.preventDefault();
    const apiKey = this.elements.apiKeyInput.value.trim();
    
    if (!apiKey) {
      this.ui.showApiKeyError('Please enter an API key');
      return;
    }

    try {
      this.ui.clearApiKeyError();
      const testService = new GeminiService(apiKey);
      
      // Save the API key and initialize the service
      GeminiService.saveApiKey(apiKey);
      this.gemini = testService;
      
      this.ui.hideApiKeyModal();
      this.start(); // Restart the app with the new API key
    } catch (error) {
      console.error('API Key validation error:', error);
      this.ui.showApiKeyError('Invalid API key. Please check your key and try again.');
    }
  }

  /**
   * Select AI model for processing
   */
  private selectModel(model: ModelType): void {
    this.selectedModel = model;
    this.ui.updateModelSelection(model);
  }

  /**
   * Rotate preview image by 90 degrees
   */
  private rotatePreviewImage(): void {
    // Transform crop coordinates before rotating the canvas
    this.cropper.transformCropForRotation();
    ImageUtils.rotateCanvas(this.elements.canvasElement);
  }

  /**
   * Capture photo from camera
   */
  private capturePhoto(): void {
    this.camera.capturePhoto();
    this.camera.stop();
    this.ui.showView('preview-view');
    this.cropper.activate();
  }

  /**
   * Confirm captured photo and process it
   */
  private async confirmPhoto(): Promise<void> {
    if (this.cropper.isCropped()) {
      this.cropper.applyCropToCanvas();
    }
    this.cropper.deactivate();

    const previewContainer = this.elements.previewView.querySelector('.canvas-container');
    if (!previewContainer) return;

    const loader = this.createProcessingLoader();
    previewContainer.appendChild(loader);

    try {
      await this.processAndPrepareImage();
    } catch (error) {
      console.error("Error processing image:", error);
      this.ui.displayError("Sorry, there was a problem processing the image. Please try again.");
    } finally {
      if (previewContainer.contains(loader)) {
        previewContainer.removeChild(loader);
      }
    }
  }

  /**
   * Create processing loader element
   */
  private createProcessingLoader(): HTMLDivElement {
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.style.position = 'absolute';
    loader.style.zIndex = '20';
    return loader;
  }

  /**
   * Process image and prepare result view
   */
  private async processAndPrepareImage(): Promise<void> {
    const canvasToProcess = this.camera.getCanvas();
    const resizedCanvas = await ImageUtils.resizeCanvas(canvasToProcess);

    if (resizedCanvas !== canvasToProcess) {
      this.replaceCanvasWithResized(resizedCanvas);
    }

    const imageDataUrl = this.elements.canvasElement.toDataURL('image/jpeg', CONFIG.IMAGE.JPEG_QUALITY);
    this.ui.prepareResultView(imageDataUrl);
  }

  /**
   * Replace main canvas with resized version
   */
  private replaceCanvasWithResized(resizedCanvas: HTMLCanvasElement): void {
    const mainCanvas = this.elements.canvasElement;
    mainCanvas.width = resizedCanvas.width;
    mainCanvas.height = resizedCanvas.height;
    mainCanvas.getContext('2d')!.drawImage(resizedCanvas, 0, 0);
  }
  
  /**
   * Handle Gemini API requests with error handling
   */
  private async handleGeminiRequest<T>(
    request: () => Promise<T>, 
    onResult: (result: T) => void, 
    retryAction?: () => void
  ): Promise<void> {
    if (!this.gemini) {
      this.ui.displayAnswer("API key not configured. Please configure your API key first.", 'error');
      return;
    }

    this.ui.showLoader(true);
    this.ui.hideActionButtons();
    this.ui.hideRetryButton();
    
    try {
      const result = await request();
      onResult(result);
      this.lastFailedRequest = null; // Clear any previous failed request on success
    } catch (error) {
      console.error("Gemini API Error:", error);
      
      // Store the retry action for later use
      if (retryAction) {
        this.lastFailedRequest = retryAction;
      }
      
      const errorMessage = this.getErrorMessage(error);
      this.ui.displayErrorWithRetry(errorMessage);
    } finally {
      this.ui.showLoader(false);
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: unknown): string {
    let errorMessage = "Sorry, an error occurred. Please try again.";
    
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        errorMessage = "API quota exceeded or rate limit reached. Please wait and try again.";
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        errorMessage = "Authentication error. Please check your API key.";
      }
    }
    
    return errorMessage;
  }
  
  /**
   * Retry last failed request
   */
  private retryLastRequest(): void {
    if (this.lastFailedRequest) {
      this.lastFailedRequest();
    }
  }
  
  /**
   * Solve problem from image
   */
  private solveFromImage(): void {
    this.handleGeminiRequest(
      () => this.gemini!.getAnswerFromImage(this.camera.getCanvas(), this.selectedModel),
      (text) => this.ui.displayAnswer(text, 'answer'),
      () => this.solveFromImage()
    );
  }
  
  /**
   * Transcribe text from image
   */
  private transcribeImage(): void {
    this.handleGeminiRequest(
      () => this.gemini!.transcribeImage(this.camera.getCanvas()),
      (text) => this.ui.displayTranscriptionResult(text),
      () => this.transcribeImage()
    );
  }
  
  /**
   * Solve problem from transcribed text
   */
  private solveFromText(): void {
    const question = this.ui.getTranscribedText();
    if (!question.trim()) return;

    this.handleGeminiRequest(
      () => this.gemini!.getAnswerFromText(question, this.selectedModel),
      (text) => this.ui.displayAnswer(text, 'answer'),
      () => this.solveFromText()
    );
  }

  /**
   * Handle copy answer with error handling
   */
  private async handleCopyAnswer(): Promise<void> {
    try {
      await this.ui.copyAnswerToClipboard();
    } catch (error) {
      console.error('Copy error:', error);
      alert('Failed to copy text.');
    }
  }

  /**
   * Handle copy transcription with error handling
   */
  private async handleCopyTranscription(): Promise<void> {
    try {
      await this.ui.copyTranscriptionToClipboard();
    } catch (error) {
      console.error('Copy error:', error);
      alert('Failed to copy text.');
    }
  }
}