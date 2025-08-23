
import { GoogleGenAI } from "@google/genai";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Import Material Web components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/fab/fab.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/dialog/dialog.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/radio/radio.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/iconbutton/filled-icon-button.js';
import '@material/web/progress/circular-progress.js';

interface DOMElements {
    cameraView: HTMLElement;
    previewView: HTMLElement;
    resultView: HTMLElement;
    videoElement: HTMLVideoElement;
    canvasElement: HTMLCanvasElement;
    flashBtn: HTMLElement; // md-filled-icon-button
    captureBtn: HTMLElement; // md-fab
    retakeBtn: HTMLElement; // md-outlined-button
    rotateBtn: HTMLElement; // md-outlined-button
    confirmBtn: HTMLElement; // md-filled-button
    loader: HTMLElement;
    startOverBtn: HTMLElement; // md-outlined-button
    retryBtn: HTMLElement; // md-outlined-button
    actionButtonsContainer: HTMLElement;
    initialActionButtons: HTMLElement;
    transcribedActionButtons: HTMLElement;
    askImageBtn: HTMLElement; // md-filled-button
    transcribeBtn: HTMLElement; // md-outlined-button
    askTextBtn: HTMLElement; // md-filled-button
    responseContainer: HTMLElement;
    transcriptionContainer: HTMLElement;
    transcribedTextArea: HTMLElement; // md-outlined-text-field
    answerSection: HTMLElement;
    answerContainer: HTMLElement;
    copyBtn: HTMLElement; // md-filled-icon-button
    copyTranscriptionBtn: HTMLElement; // md-filled-icon-button
    resultImagePreview: HTMLImageElement;
    cropBox: HTMLElement;
    modelSelector: HTMLElement;
    modelFlashBtn: HTMLElement; // md-filled-button
    modelProBtn: HTMLElement; // md-outlined-button
    apiKeyModal: HTMLElement; // md-dialog
    apiKeyForm: HTMLFormElement;
    apiKeyInput: HTMLElement; // md-outlined-text-field
    toggleApiKeyVisibilityBtn: HTMLElement; // md-icon-button
    saveApiKeyBtn: HTMLElement; // md-filled-button
    apiKeyError: HTMLElement;
}

class GeminiService {
    private ai: GoogleGenAI;

    constructor(apiKey?: string) {
        const key = apiKey || this.getStoredApiKey() || process.env.API_KEY;
        if (!key) {
            throw new Error("API key is not configured.");
        }
        this.ai = new GoogleGenAI({ apiKey: key });
    }

    private getStoredApiKey(): string | null {
        try {
            return localStorage.getItem('gemini-api-key');
        } catch (error) {
            console.warn('Could not access localStorage:', error);
            return null;
        }
    }

    static saveApiKey(apiKey: string): void {
        try {
            localStorage.setItem('gemini-api-key', apiKey);
        } catch (error) {
            console.error('Could not save API key to localStorage:', error);
            throw new Error('Failed to save API key');
        }
    }

    static hasStoredApiKey(): boolean {
        try {
            return !!localStorage.getItem('gemini-api-key');
        } catch (error) {
            return false;
        }
    }

    static clearStoredApiKey(): void {
        try {
            localStorage.removeItem('gemini-api-key');
        } catch (error) {
            console.error('Could not clear API key from localStorage:', error);
        }
    }

    private imagePartFromCanvas(canvas: HTMLCanvasElement) {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        return {
            inlineData: {
                mimeType: "image/jpeg",
                data: dataUrl.split(",")[1],
            },
        };
    }

    async getAnswerFromImage(canvas: HTMLCanvasElement, model: string): Promise<string> {
        const response = await this.ai.models.generateContent({
            model: model,
            contents: { parts: [this.imagePartFromCanvas(canvas)] },
        });
        return response.text;
    }

    async transcribeImage(canvas: HTMLCanvasElement): Promise<string> {
        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [this.imagePartFromCanvas(canvas)] },
            config: {
                systemInstruction: "Transcribe the question from the image, and format any equations using LaTeX (e.g., $a + b = 5$). Please respond with only the final, full question with its corresponding options, if present."
            }
        });
        return response.text;
    }

    async getAnswerFromText(question: string, model: string): Promise<string> {
        const response = await this.ai.models.generateContent({
            model: model,
            contents: question
        });
        return response.text;
    }
}

class UIManager {
    constructor(private elements: DOMElements) {}

    showView(viewId: 'camera-view' | 'preview-view' | 'result-view') {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        this.elements[viewId === 'camera-view' ? 'cameraView' : viewId === 'preview-view' ? 'previewView' : 'resultView'].classList.remove('hidden');
    }

    showLoader(show: boolean) {
        this.elements.loader.classList.toggle('hidden', !show);
    }
    
    hideActionButtons() {
        this.elements.initialActionButtons.classList.add('hidden');
        this.elements.transcribedActionButtons.classList.add('hidden');
        this.elements.modelSelector.classList.add('hidden');
    }
    
    resetResultView() {
        this.showLoader(false);
        this.elements.answerContainer.innerHTML = '';
        this.elements.answerSection.classList.add('hidden');
        (this.elements.transcribedTextArea as any).value = '';
        this.elements.transcriptionContainer.classList.add('hidden');
        this.elements.resultImagePreview.classList.add('hidden');
        this.elements.resultImagePreview.src = '';
        this.elements.initialActionButtons.classList.add('hidden');
        this.elements.transcribedActionButtons.classList.add('hidden');
        this.elements.modelSelector.classList.add('hidden');
        this.elements.startOverBtn.classList.add('hidden');
        this.elements.retryBtn.classList.add('hidden');
    }
    
    prepareResultView(imageDataUrl: string) {
        this.showView('result-view');
        this.resetResultView();
        this.elements.resultImagePreview.src = imageDataUrl;
        this.elements.resultImagePreview.classList.remove('hidden');
        this.elements.initialActionButtons.classList.remove('hidden');
        this.elements.modelSelector.classList.remove('hidden');
        this.elements.startOverBtn.classList.remove('hidden');
    }
    
    displayTranscriptionResult(text: string) {
        (this.elements.transcribedTextArea as any).value = text;
        this.elements.transcriptionContainer.classList.remove('hidden');
        this.elements.initialActionButtons.classList.add('hidden');
        this.elements.transcribedActionButtons.classList.remove('hidden');
        this.elements.modelSelector.classList.remove('hidden');
    }

    displayAnswer(text: string, type: 'answer' | 'error') {
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

    getTranscribedText(): string {
        return (this.elements.transcribedTextArea as any).value;
    }

    displayError(message: string) {
        this.showView('result-view');
        this.resetResultView();
        this.elements.startOverBtn.classList.remove('hidden');
        this.displayAnswer(message, 'error');
    }

    displayErrorWithRetry(message: string) {
        this.showView('result-view');
        this.resetResultView();
        this.elements.startOverBtn.classList.remove('hidden');
        this.elements.retryBtn.classList.remove('hidden');
        this.displayAnswer(message, 'error');
    }

    hideRetryButton() {
        this.elements.retryBtn.classList.add('hidden');
    }
    
    updateModelSelection(model: 'gemini-2.5-flash' | 'gemini-2.5-pro') {
        const isFlash = model === 'gemini-2.5-flash';
        this.elements.modelFlashBtn.classList.toggle('active', isFlash);
        this.elements.modelFlashBtn.setAttribute('aria-checked', String(isFlash));
        this.elements.modelProBtn.classList.toggle('active', !isFlash);
        this.elements.modelProBtn.setAttribute('aria-checked', String(!isFlash));
    }
    
    private copyTextToClipboard(text: string, button: HTMLButtonElement) {
        if (text && navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                const buttonTextSpan = button.querySelector('span');
                if (buttonTextSpan) {
                    const originalText = buttonTextSpan.textContent;
                    button.disabled = true;
                    buttonTextSpan.textContent = 'Copied!';
                    setTimeout(() => {
                        buttonTextSpan.textContent = originalText;
                        button.disabled = false;
                    }, 2000);
                }
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Failed to copy text.');
            });
        }
    }

    copyAnswerToClipboard() {
        const { answerContainer, copyBtn } = this.elements;
        this.copyTextToClipboard(answerContainer.innerText, copyBtn);
    }
    
    copyTranscriptionToClipboard() {
        const { transcribedTextArea, copyTranscriptionBtn } = this.elements;
        this.copyTextToClipboard((transcribedTextArea as any).value, copyTranscriptionBtn);
    }

    showApiKeyModal() {
        (this.elements.apiKeyModal as any).show();
        (this.elements.apiKeyInput as any).focus();
    }

    hideApiKeyModal() {
        (this.elements.apiKeyModal as any).close();
        this.clearApiKeyError();
        (this.elements.apiKeyInput as any).value = '';
    }

    showApiKeyError(message: string) {
        this.elements.apiKeyError.textContent = message;
        this.elements.apiKeyError.classList.remove('hidden');
    }

    clearApiKeyError() {
        this.elements.apiKeyError.classList.add('hidden');
        this.elements.apiKeyError.textContent = '';
    }

    toggleApiKeyVisibility() {
        const input = this.elements.apiKeyInput as any;
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

class CameraManager {
    private stream: MediaStream | null = null;
    private videoTrack: MediaStreamTrack | null = null;
    private isFlashOn = false;

    constructor(
        private videoElement: HTMLVideoElement,
        private canvasElement: HTMLCanvasElement,
        private flashBtn: HTMLButtonElement
    ) {}

    async start() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();
            
            this.videoTrack = this.stream.getVideoTracks()[0];
            const capabilities = this.videoTrack.getCapabilities() as any;
            this.flashBtn.disabled = !capabilities.torch;
            this.isFlashOn = false;
            this.flashBtn.classList.remove('on');
        } catch(err) {
            console.error("Error accessing camera:", err);
            throw new Error("Could not access camera. Please enable permissions and try again.");
        }
    }
    
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.videoTrack = null;
        }
    }
    
    async toggleFlash() {
        if (!this.videoTrack || !(this.videoTrack.getCapabilities() as any).torch) return;
        try {
            this.isFlashOn = !this.isFlashOn;
            await this.videoTrack.applyConstraints({ advanced: [{ torch: this.isFlashOn } as any] });
            this.flashBtn.classList.toggle('on', this.isFlashOn);
        } catch (err) {
            console.error("Error toggling flash:", err);
        }
    }

    capturePhoto() {
        const ctx = this.canvasElement.getContext('2d');
        if (!ctx) return;
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
    }
    
    getCanvas(): HTMLCanvasElement {
        return this.canvasElement;
    }
}

class CropManager {
    private cropRect = { x: 0, y: 0, width: 0, height: 0 };
    private activeHandle: string | null = null;
    private isManipulating = false;
    private isDrawing = false;
    private isCropDefined = false;

    private startPointer = { x: 0, y: 0 };
    private startCropRect = { ...this.cropRect };

    constructor(private cropBoxEl: HTMLElement, private canvasEl: HTMLCanvasElement) {
        this.onDrawStart = this.onDrawStart.bind(this);
        this.onDrawOrManipulateMove = this.onDrawOrManipulateMove.bind(this);
        this.onDrawOrManipulateEnd = this.onDrawOrManipulateEnd.bind(this);
        this.onManipulateStart = this.onManipulateStart.bind(this);
    }

    public activate(): void {
        this.clear();
        this.canvasEl.parentElement!.addEventListener('pointerdown', this.onDrawStart);
    }

    public deactivate(): void {
        this.clear();
        this.canvasEl.parentElement!.removeEventListener('pointerdown', this.onDrawStart);
        window.removeEventListener('pointermove', this.onDrawOrManipulateMove);
        window.removeEventListener('pointerup', this.onDrawOrManipulateEnd);
        window.removeEventListener('pointercancel', this.onDrawOrManipulateEnd);
    }
    
    public clear(): void {
        this.isCropDefined = false;
        this.isDrawing = false;
        this.isManipulating = false;
        this.activeHandle = null;
        this.cropBoxEl.classList.add('hidden');
        this.cropBoxEl.removeEventListener('pointerdown', this.onManipulateStart);
    }

    public isCropped(): boolean {
        return this.isCropDefined;
    }

    public applyCropToCanvas(): void {
        if (!this.isCropped()) return;

        const croppedCanvas = document.createElement('canvas');
        const ctx = croppedCanvas.getContext('2d')!;
        
        croppedCanvas.width = this.cropRect.width;
        croppedCanvas.height = this.cropRect.height;
        
        ctx.drawImage(
            this.canvasEl,
            this.cropRect.x, this.cropRect.y, this.cropRect.width, this.cropRect.height,
            0, 0, this.cropRect.width, this.cropRect.height
        );
        
        this.canvasEl.width = croppedCanvas.width;
        this.canvasEl.height = croppedCanvas.height;
        this.canvasEl.getContext('2d')!.drawImage(croppedCanvas, 0, 0);
    }

    private getNativePointerPosition(e: PointerEvent): { x: number; y: number } {
        const canvasRect = this.canvasEl.getBoundingClientRect();
        const scale = this.canvasEl.width / canvasRect.width;
        const x = (e.clientX - canvasRect.left) * scale;
        const y = (e.clientY - canvasRect.top) * scale;
        return {
            x: Math.max(0, Math.min(x, this.canvasEl.width)),
            y: Math.max(0, Math.min(y, this.canvasEl.height)),
        };
    }

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
        
        window.addEventListener('pointermove', this.onDrawOrManipulateMove);
        window.addEventListener('pointerup', this.onDrawOrManipulateEnd);
        window.addEventListener('pointercancel', this.onDrawOrManipulateEnd);
    }
    
    private onManipulateStart(e: PointerEvent): void {
        e.preventDefault();
        e.stopPropagation();

        this.isManipulating = true;
        this.startPointer = this.getNativePointerPosition(e);
        this.startCropRect = { ...this.cropRect };
        
        const target = e.target as HTMLElement;
        this.activeHandle = target.classList.contains('crop-handle') ? target.dataset.handle! : 'move';

        window.addEventListener('pointermove', this.onDrawOrManipulateMove);
        window.addEventListener('pointerup', this.onDrawOrManipulateEnd);
        window.addEventListener('pointercancel', this.onDrawOrManipulateEnd);
    }

    private onDrawOrManipulateMove(e: PointerEvent): void {
        e.preventDefault();
        const currentPointer = this.getNativePointerPosition(e);

        if (this.isDrawing) {
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
        } else if (this.isManipulating) {
            const nativeDx = currentPointer.x - this.startPointer.x;
            const nativeDy = currentPointer.y - this.startPointer.y;
            
            if (this.activeHandle === 'move') {
                const newX = this.startCropRect.x + nativeDx;
                const newY = this.startCropRect.y + nativeDy;
                this.cropRect.x = Math.max(0, Math.min(newX, this.canvasEl.width - this.cropRect.width));
                this.cropRect.y = Math.max(0, Math.min(newY, this.canvasEl.height - this.cropRect.height));
            } else if (this.activeHandle) {
                if (this.activeHandle.includes('e')) this.cropRect.width = this.startCropRect.width + nativeDx;
                if (this.activeHandle.includes('w')) {
                    this.cropRect.width = this.startCropRect.width - nativeDx;
                    this.cropRect.x = this.startCropRect.x + nativeDx;
                }
                if (this.activeHandle.includes('s')) this.cropRect.height = this.startCropRect.height + nativeDy;
                if (this.activeHandle.includes('n')) {
                    this.cropRect.height = this.startCropRect.height - nativeDy;
                    this.cropRect.y = this.startCropRect.y + nativeDy;
                }
            }
        }
        
        if (this.isCropDefined) {
            this.constrainCropBox();
            this.updateStyle();
        }
    }

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

    private constrainCropBox(): void {
        const minSize = 30;
        const { width: canvasWidth, height: canvasHeight } = this.canvasEl;

        if (this.cropRect.x < 0) {
            this.cropRect.width += this.cropRect.x;
            this.cropRect.x = 0;
        }
        if (this.cropRect.y < 0) {
            this.cropRect.height += this.cropRect.y;
            this.cropRect.y = 0;
        }

        if (this.cropRect.x + this.cropRect.width > canvasWidth) {
            this.cropRect.width = canvasWidth - this.cropRect.x;
        }
        if (this.cropRect.y + this.cropRect.height > canvasHeight) {
            this.cropRect.height = canvasHeight - this.cropRect.y;
        }

        this.cropRect.width = Math.max(this.cropRect.width, minSize);
        this.cropRect.height = Math.max(this.cropRect.height, minSize);
    }

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


class App {
    private ui: UIManager;
    private camera: CameraManager;
    private gemini: GeminiService | null = null;
    private cropper: CropManager;
    private selectedModel: 'gemini-2.5-flash' | 'gemini-2.5-pro' = 'gemini-2.5-flash';
    private lastFailedRequest: (() => void) | null = null;

    constructor(private elements: DOMElements) {
        this.ui = new UIManager(elements);
        this.camera = new CameraManager(elements.videoElement, elements.canvasElement, elements.flashBtn);
        this.cropper = new CropManager(elements.cropBox, elements.canvasElement);
        this.attachEventListeners(elements);
    }

    async start() {
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

        this.ui.resetResultView();
        this.cropper.deactivate();
        try {
            await this.camera.start();
            this.ui.showView('camera-view');
        } catch (error) {
            this.ui.displayError(error.message);
        }
    }
    
    private attachEventListeners(elements: DOMElements) {
        elements.flashBtn.addEventListener('click', () => this.camera.toggleFlash());
        elements.captureBtn.addEventListener('click', () => this.capturePhoto());
        elements.retakeBtn.addEventListener('click', () => this.start());
        elements.rotateBtn.addEventListener('click', () => this.rotatePreviewImage());
        elements.confirmBtn.addEventListener('click', () => this.confirmPhoto());
        elements.startOverBtn.addEventListener('click', () => this.start());
        elements.retryBtn.addEventListener('click', () => this.retryLastRequest());
        elements.copyBtn.addEventListener('click', () => this.ui.copyAnswerToClipboard());
        elements.copyTranscriptionBtn.addEventListener('click', () => this.ui.copyTranscriptionToClipboard());
        
        elements.askImageBtn.addEventListener('click', () => this.solveFromImage());
        elements.transcribeBtn.addEventListener('click', () => this.transcribeImage());
        elements.askTextBtn.addEventListener('click', () => this.solveFromText());
        
        elements.modelFlashBtn.addEventListener('click', () => this.selectModel('gemini-2.5-flash'));
        elements.modelProBtn.addEventListener('click', () => this.selectModel('gemini-2.5-pro'));

        // API Key modal event listeners
        elements.apiKeyForm.addEventListener('submit', (e) => this.handleApiKeySubmit(e));
        elements.toggleApiKeyVisibilityBtn.addEventListener('click', () => this.ui.toggleApiKeyVisibility());
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !elements.apiKeyModal.classList.contains('hidden')) {
                e.preventDefault();
                // Only allow closing if we have a working API key
                if (GeminiService.hasStoredApiKey() || process.env.API_KEY) {
                    this.ui.hideApiKeyModal();
                }
            }
        });
    }

    private async handleApiKeySubmit(e: Event) {
        e.preventDefault();
        const apiKey = (this.elements.apiKeyInput as any).value.trim();
        
        if (!apiKey) {
            this.ui.showApiKeyError('Please enter an API key');
            return;
        }

        // Validate the API key by trying to create a GeminiService instance
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

    private selectModel(model: 'gemini-2.5-flash' | 'gemini-2.5-pro') {
        this.selectedModel = model;
        this.ui.updateModelSelection(model);
    }

    private async resizeCanvas(canvas: HTMLCanvasElement, maxDimension: number): Promise<HTMLCanvasElement> {
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
    
    private rotatePreviewImage() {
        const canvas = this.elements.canvasElement;
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

        this.cropper.clear();
    }

    private capturePhoto() {
        this.camera.capturePhoto();
        this.camera.stop();
        this.ui.showView('preview-view');
        this.cropper.activate();
    }

    private async confirmPhoto() {
        if (this.cropper.isCropped()) {
            this.cropper.applyCropToCanvas();
        }
        this.cropper.deactivate();
    
        const previewContainer = this.elements.previewView.querySelector('.canvas-container');
        if (!previewContainer) return;
    
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.style.position = 'absolute';
        loader.style.zIndex = '20';
        previewContainer.appendChild(loader);
    
        try {
            const canvasToProcess = this.camera.getCanvas();
            const resizedCanvas = await this.resizeCanvas(canvasToProcess, 1280);
    
            if (resizedCanvas !== canvasToProcess) {
                const mainCanvas = this.elements.canvasElement;
                mainCanvas.width = resizedCanvas.width;
                mainCanvas.height = resizedCanvas.height;
                mainCanvas.getContext('2d')!.drawImage(resizedCanvas, 0, 0);
            }
    
            const imageDataUrl = this.elements.canvasElement.toDataURL('image/jpeg', 0.9);
            this.ui.prepareResultView(imageDataUrl);
    
        } catch (error) {
            console.error("Error processing image:", error);
            this.ui.displayError("Sorry, there was a problem processing the image. Please try again.");
        } finally {
            if (previewContainer.contains(loader)) {
                previewContainer.removeChild(loader);
            }
        }
    }
    
    private async handleGeminiRequest<T>(request: () => Promise<T>, onResult: (result: T) => void, retryAction?: () => void) {
        if (!this.gemini) {
            this.ui.displayAnswer("API key not configured. Please configure your API key first.", 'error');
            return;
        }

        this.ui.showLoader(true);
        this.ui.hideActionButtons();
        this.ui.hideRetryButton(); // Hide retry button during request
        
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
            
            // Provide more specific error message based on error type
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
            
            this.ui.displayErrorWithRetry(errorMessage);
        } finally {
            this.ui.showLoader(false);
        }
    }
    
    private retryLastRequest() {
        if (this.lastFailedRequest) {
            this.lastFailedRequest();
        }
    }
    
    private solveFromImage() {
        this.handleGeminiRequest(
            () => this.gemini!.getAnswerFromImage(this.camera.getCanvas(), this.selectedModel),
            (text) => this.ui.displayAnswer(text, 'answer'),
            () => this.solveFromImage()
        );
    }
    
    private transcribeImage() {
        this.handleGeminiRequest(
            () => this.gemini!.transcribeImage(this.camera.getCanvas()),
            (text) => this.ui.displayTranscriptionResult(text),
            () => this.transcribeImage()
        );
    }
    
    private solveFromText() {
        const question = this.ui.getTranscribedText();
        if (!question.trim()) return;

        this.handleGeminiRequest(
            () => this.gemini!.getAnswerFromText(question, this.selectedModel),
            (text) => this.ui.displayAnswer(text, 'answer'),
            () => this.solveFromText()
        );
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const elements: DOMElements = {
            cameraView: document.getElementById('camera-view')!,
            previewView: document.getElementById('preview-view')!,
            resultView: document.getElementById('result-view')!,
            videoElement: document.getElementById('camera-feed') as HTMLVideoElement,
            canvasElement: document.getElementById('preview-canvas') as HTMLCanvasElement,
            flashBtn: document.getElementById('flash-btn')!,
            captureBtn: document.getElementById('capture-btn')!,
            retakeBtn: document.getElementById('retake-btn')!,
            rotateBtn: document.getElementById('rotate-btn')!,
            confirmBtn: document.getElementById('confirm-btn')!,
            loader: document.getElementById('loader')!,
            startOverBtn: document.getElementById('start-over-btn')!,
            retryBtn: document.getElementById('retry-btn')!,
            actionButtonsContainer: document.getElementById('action-buttons')!,
            initialActionButtons: document.getElementById('initial-action-buttons')!,
            transcribedActionButtons: document.getElementById('transcribed-action-buttons')!,
            askImageBtn: document.getElementById('ask-image-btn')!,
            transcribeBtn: document.getElementById('transcribe-btn')!,
            askTextBtn: document.getElementById('ask-text-btn')!,
            responseContainer: document.getElementById('response-container')!,
            transcriptionContainer: document.getElementById('transcription-container')!,
            transcribedTextArea: document.getElementById('transcribed-text')!,
            answerSection: document.getElementById('answer-section')!,
            answerContainer: document.getElementById('answer-container')!,
            copyBtn: document.getElementById('copy-btn')!,
            copyTranscriptionBtn: document.getElementById('copy-transcription-btn')!,
            resultImagePreview: document.getElementById('result-image-preview') as HTMLImageElement,
            cropBox: document.getElementById('crop-box')!,
            modelSelector: document.getElementById('model-selector')!,
            modelFlashBtn: document.getElementById('model-flash-btn')!,
            modelProBtn: document.getElementById('model-pro-btn')!,
            apiKeyModal: document.getElementById('api-key-modal')!,
            apiKeyForm: document.getElementById('api-key-form') as HTMLFormElement,
            apiKeyInput: document.getElementById('api-key-input')!,
            toggleApiKeyVisibilityBtn: document.getElementById('toggle-api-key-visibility')!,
            saveApiKeyBtn: document.getElementById('save-api-key-btn')!,
            apiKeyError: document.getElementById('api-key-error')!,
        };
        const app = new App(elements);
        app.start();
    } catch (error) {
        console.error("Failed to initialize app:", error);
        const responseContainer = document.getElementById('response-container')!;
        if (responseContainer) {
            responseContainer.innerHTML = `<p style="color: #ff8a80;">Critical Error: ${error.message}</p>`;
            document.getElementById('result-view')?.classList.remove('hidden');
        }
    }
});
