export interface DOMElements {
  cameraView: HTMLElement;
  previewView: HTMLElement;
  resultView: HTMLElement;
  videoElement: HTMLVideoElement;
  canvasElement: HTMLCanvasElement;
  flashBtn: HTMLButtonElement;
  captureBtn: HTMLButtonElement;
  retakeBtn: HTMLButtonElement;
  rotateBtn: HTMLButtonElement;
  confirmBtn: HTMLButtonElement;
  loader: HTMLElement;
  startOverBtn: HTMLButtonElement;
  retryBtn: HTMLButtonElement;
  actionButtonsContainer: HTMLElement;
  initialActionButtons: HTMLElement;
  transcribedActionButtons: HTMLElement;
  askImageBtn: HTMLButtonElement;
  transcribeBtn: HTMLButtonElement;
  askTextBtn: HTMLButtonElement;
  responseContainer: HTMLElement;
  transcriptionContainer: HTMLElement;
  transcribedTextArea: HTMLTextAreaElement;
  answerSection: HTMLElement;
  answerContainer: HTMLElement;
  copyBtn: HTMLButtonElement;
  copyTranscriptionBtn: HTMLButtonElement;
  resultImagePreview: HTMLImageElement;
  cropBox: HTMLElement;
  modelSelector: HTMLElement;
  modelFlashBtn: HTMLButtonElement;
  modelProBtn: HTMLButtonElement;
  apiKeyModal: HTMLElement;
  apiKeyForm: HTMLFormElement;
  apiKeyInput: HTMLInputElement;
  toggleApiKeyVisibilityBtn: HTMLButtonElement;
  saveApiKeyBtn: HTMLButtonElement;
  apiKeyError: HTMLElement;
}

export type ViewType = 'camera-view' | 'preview-view' | 'result-view';
export type DisplayType = 'answer' | 'error';
export type CropHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | 'move';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PointerPosition {
  x: number;
  y: number;
}

export interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}