import { marked } from "marked";
import DOMPurify from "dompurify";
import { DOMElements, ViewType, DisplayType } from '../types/index.js';
import { CONFIG, ModelType } from '../config/constants.js';
import { DOMUtils } from '../utils/domUtils.js';

/**
 * Manages UI state and interactions
 */
export class UIManager {
  constructor(private elements: DOMElements) {}

  /**
   * Show specific view and hide others
   */
  showView(viewId: ViewType): void {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const elementKey = this.getElementKey(viewId);
    this.elements[elementKey].classList.remove('hidden');
  }

  /**
   * Get element key from view ID
   */
  private getElementKey(viewId: ViewType): keyof Pick<DOMElements, 'cameraView' | 'previewView' | 'resultView'> {
    const mapping = {
      'camera-view': 'cameraView' as const,
      'preview-view': 'previewView' as const,
      'result-view': 'resultView' as const,
    };
    return mapping[viewId];
  }

  /**
   * Show or hide loader
   */
  showLoader(show: boolean): void {
    this.elements.loader.classList.toggle('hidden', !show);
  }
  
  /**
   * Hide all action buttons
   */
  hideActionButtons(): void {
    this.elements.initialActionButtons.classList.add('hidden');
    this.elements.transcribedActionButtons.classList.add('hidden');
    this.elements.modelSelector.classList.add('hidden');
  }
  
  /**
   * Reset result view to initial state
   */
  resetResultView(): void {
    this.showLoader(false);
    this.clearAnswer();
    this.clearTranscription();
    this.clearImagePreview();
    this.hideAllActionElements();
  }

  /**
   * Clear answer section
   */
  private clearAnswer(): void {
    this.elements.answerContainer.innerHTML = '';
    this.elements.answerSection.classList.add('hidden');
  }

  /**
   * Clear transcription section
   */
  private clearTranscription(): void {
    this.elements.transcribedTextArea.value = '';
    this.elements.transcriptionContainer.classList.add('hidden');
  }

  /**
   * Clear image preview
   */
  private clearImagePreview(): void {
    this.elements.resultImagePreview.classList.add('hidden');
    this.elements.resultImagePreview.src = '';
  }

  /**
   * Hide all action elements
   */
  private hideAllActionElements(): void {
    this.elements.initialActionButtons.classList.add('hidden');
    this.elements.transcribedActionButtons.classList.add('hidden');
    this.elements.modelSelector.classList.add('hidden');
    this.elements.startOverBtn.classList.add('hidden');
    this.elements.retryBtn.classList.add('hidden');
  }
  
  /**
   * Prepare result view with captured image
   */
  prepareResultView(imageDataUrl: string): void {
    this.showView('result-view');
    this.resetResultView();
    this.elements.resultImagePreview.src = imageDataUrl;
    this.elements.resultImagePreview.classList.remove('hidden');
    this.elements.initialActionButtons.classList.remove('hidden');
    this.elements.modelSelector.classList.remove('hidden');
    this.elements.startOverBtn.classList.remove('hidden');
  }
  
  /**
   * Display transcription result
   */
  displayTranscriptionResult(text: string): void {
    this.elements.transcribedTextArea.value = text;
    this.elements.transcriptionContainer.classList.remove('hidden');
    this.elements.initialActionButtons.classList.add('hidden');
    this.elements.transcribedActionButtons.classList.remove('hidden');
    this.elements.modelSelector.classList.remove('hidden');
  }

  /**
   * Display answer or error message
   */
  displayAnswer(text: string, type: DisplayType): void {
    this.elements.answerSection.classList.toggle('is-error', type === 'error');
    
    if (type === 'error') {
      this.elements.answerContainer.innerHTML = `<p>${text}</p>`;
    } else {
      const dirtyHtml = marked.parse(text) as string;
      const cleanHtml = DOMPurify.sanitize(dirtyHtml);
      this.elements.answerContainer.innerHTML = cleanHtml;
    }
    this.elements.answerSection.classList.remove('hidden');
  }

  /**
   * Get transcribed text from textarea
   */
  getTranscribedText(): string {
    return this.elements.transcribedTextArea.value;
  }

  /**
   * Display error message only
   */
  displayError(message: string): void {
    this.showView('result-view');
    this.resetResultView();
    this.elements.startOverBtn.classList.remove('hidden');
    this.displayAnswer(message, 'error');
  }

  /**
   * Display error message with retry option
   */
  displayErrorWithRetry(message: string): void {
    this.showView('result-view');
    this.resetResultView();
    this.elements.startOverBtn.classList.remove('hidden');
    this.elements.retryBtn.classList.remove('hidden');
    this.displayAnswer(message, 'error');
  }

  /**
   * Hide retry button
   */
  hideRetryButton(): void {
    this.elements.retryBtn.classList.add('hidden');
  }
  
  /**
   * Update model selection UI
   */
  updateModelSelection(model: ModelType): void {
    const isFlash = model === CONFIG.MODELS.FLASH;
    this.elements.modelFlashBtn.classList.toggle('active', isFlash);
    this.elements.modelFlashBtn.setAttribute('aria-checked', String(isFlash));
    this.elements.modelProBtn.classList.toggle('active', !isFlash);
    this.elements.modelProBtn.setAttribute('aria-checked', String(!isFlash));
  }

  /**
   * Copy answer to clipboard
   */
  async copyAnswerToClipboard(): Promise<void> {
    const text = this.elements.answerContainer.innerText;
    await DOMUtils.copyToClipboard(text, this.elements.copyBtn);
  }
  
  /**
   * Copy transcription to clipboard
   */
  async copyTranscriptionToClipboard(): Promise<void> {
    const text = this.elements.transcribedTextArea.value;
    await DOMUtils.copyToClipboard(text, this.elements.copyTranscriptionBtn);
  }

  // API Key Modal Methods
  
  /**
   * Show API key modal
   */
  showApiKeyModal(): void {
    this.elements.apiKeyModal.classList.remove('hidden');
    this.elements.apiKeyInput.focus();
  }

  /**
   * Hide API key modal
   */
  hideApiKeyModal(): void {
    this.elements.apiKeyModal.classList.add('hidden');
    this.clearApiKeyError();
    this.elements.apiKeyInput.value = '';
  }

  /**
   * Show API key error message
   */
  showApiKeyError(message: string): void {
    this.elements.apiKeyError.textContent = message;
    this.elements.apiKeyError.classList.remove('hidden');
  }

  /**
   * Clear API key error message
   */
  clearApiKeyError(): void {
    this.elements.apiKeyError.classList.add('hidden');
    this.elements.apiKeyError.textContent = '';
  }

  /**
   * Toggle API key input visibility
   */
  toggleApiKeyVisibility(): void {
    const input = this.elements.apiKeyInput;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    
    const svg = this.elements.toggleApiKeyVisibilityBtn.querySelector('svg path');
    if (svg) {
      svg.setAttribute('d', isPassword 
        ? "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
        : "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
      );
    }
  }
}