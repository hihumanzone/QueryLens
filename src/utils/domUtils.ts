import { CONFIG } from '../config/constants.js';

/**
 * Utility functions for DOM operations
 */
export class DOMUtils {
  /**
   * Gets all required DOM elements with proper error handling
   */
  static getRequiredElements() {
    const elements = {
      cameraView: document.getElementById('camera-view'),
      previewView: document.getElementById('preview-view'),
      resultView: document.getElementById('result-view'),
      videoElement: document.getElementById('camera-feed') as HTMLVideoElement,
      canvasElement: document.getElementById('preview-canvas') as HTMLCanvasElement,
      flashBtn: document.getElementById('flash-btn') as HTMLButtonElement,
      captureBtn: document.getElementById('capture-btn') as HTMLButtonElement,
      retakeBtn: document.getElementById('retake-btn') as HTMLButtonElement,
      rotateBtn: document.getElementById('rotate-btn') as HTMLButtonElement,
      confirmBtn: document.getElementById('confirm-btn') as HTMLButtonElement,
      loader: document.getElementById('loader'),
      startOverBtn: document.getElementById('start-over-btn') as HTMLButtonElement,
      retryBtn: document.getElementById('retry-btn') as HTMLButtonElement,
      actionButtonsContainer: document.getElementById('action-buttons'),
      initialActionButtons: document.getElementById('initial-action-buttons'),
      transcribedActionButtons: document.getElementById('transcribed-action-buttons'),
      askImageBtn: document.getElementById('ask-image-btn') as HTMLButtonElement,
      transcribeBtn: document.getElementById('transcribe-btn') as HTMLButtonElement,
      askTextBtn: document.getElementById('ask-text-btn') as HTMLButtonElement,
      responseContainer: document.getElementById('response-container'),
      transcriptionContainer: document.getElementById('transcription-container'),
      transcribedTextArea: document.getElementById('transcribed-text') as HTMLTextAreaElement,
      answerSection: document.getElementById('answer-section'),
      answerContainer: document.getElementById('answer-container'),
      copyBtn: document.getElementById('copy-btn') as HTMLButtonElement,
      copyTranscriptionBtn: document.getElementById('copy-transcription-btn') as HTMLButtonElement,
      resultImagePreview: document.getElementById('result-image-preview') as HTMLImageElement,
      cropBox: document.getElementById('crop-box'),
      modelSelector: document.getElementById('model-selector'),
      modelFlashBtn: document.getElementById('model-flash-btn') as HTMLButtonElement,
      modelProBtn: document.getElementById('model-pro-btn') as HTMLButtonElement,
      apiKeyModal: document.getElementById('api-key-modal'),
      apiKeyForm: document.getElementById('api-key-form') as HTMLFormElement,
      apiKeyInput: document.getElementById('api-key-input') as HTMLInputElement,
      toggleApiKeyVisibilityBtn: document.getElementById('toggle-api-key-visibility') as HTMLButtonElement,
      saveApiKeyBtn: document.getElementById('save-api-key-btn') as HTMLButtonElement,
      apiKeyError: document.getElementById('api-key-error'),
    };

    // Validate all elements exist
    for (const [key, element] of Object.entries(elements)) {
      if (!element) {
        throw new Error(`Required DOM element not found: ${key}`);
      }
    }

    return elements as Required<typeof elements>;
  }

  /**
   * Safely copy text to clipboard with user feedback
   */
  static async copyToClipboard(text: string, button: HTMLButtonElement): Promise<void> {
    if (!text || !navigator.clipboard) {
      throw new Error('Clipboard not available or no text to copy');
    }

    try {
      await navigator.clipboard.writeText(text);
      
      const buttonTextSpan = button.querySelector('span');
      if (buttonTextSpan) {
        const originalText = buttonTextSpan.textContent;
        button.disabled = true;
        buttonTextSpan.textContent = 'Copied!';
        
        setTimeout(() => {
          buttonTextSpan.textContent = originalText;
          button.disabled = false;
        }, CONFIG.UI.COPY_FEEDBACK_DURATION);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      throw new Error('Failed to copy text to clipboard');
    }
  }
}