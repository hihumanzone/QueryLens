
import { GoogleGenAI } from "@google/genai";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface DOMElements {
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
}

class GeminiService {
    private ai: GoogleGenAI;

    constructor() {
        if (!process.env.API_KEY) {
            throw new Error("API key is not configured.");
        }
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        this.elements.transcribedTextArea.value = '';
        this.elements.transcriptionContainer.classList.add('hidden');
        this.elements.resultImagePreview.classList.add('hidden');
        this.elements.resultImagePreview.src = '';
        this.elements.initialActionButtons.classList.add('hidden');
        this.elements.transcribedActionButtons.classList.add('hidden');
        this.elements.modelSelector.classList.add('hidden');
        this.elements.startOverBtn.classList.add('hidden');
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
        this.elements.transcribedTextArea.value = text;
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
        return this.elements.transcribedTextArea.value;
    }

    displayError(message: string) {
        this.showView('result-view');
        this.resetResultView();
        this.elements.startOverBtn.classList.remove('hidden');
        this.displayAnswer(message, 'error');
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
        this.copyTextToClipboard(transcribedTextArea.value, copyTranscriptionBtn);
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
    private gemini: GeminiService;
    private cropper: CropManager;
    private selectedModel: 'gemini-2.5-flash' | 'gemini-2.5-pro' = 'gemini-2.5-flash';

    constructor(private elements: DOMElements) {
        this.ui = new UIManager(elements);
        this.camera = new CameraManager(elements.videoElement, elements.canvasElement, elements.flashBtn);
        this.gemini = new GeminiService();
        this.cropper = new CropManager(elements.cropBox, elements.canvasElement);
        this.attachEventListeners(elements);
    }

    async start() {
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
        elements.copyBtn.addEventListener('click', () => this.ui.copyAnswerToClipboard());
        elements.copyTranscriptionBtn.addEventListener('click', () => this.ui.copyTranscriptionToClipboard());
        
        elements.askImageBtn.addEventListener('click', () => this.solveFromImage());
        elements.transcribeBtn.addEventListener('click', () => this.transcribeImage());
        elements.askTextBtn.addEventListener('click', () => this.solveFromText());
        
        elements.modelFlashBtn.addEventListener('click', () => this.selectModel('gemini-2.5-flash'));
        elements.modelProBtn.addEventListener('click', () => this.selectModel('gemini-2.5-pro'));
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
    
    private async handleGeminiRequest<T>(request: () => Promise<T>, onResult: (result: T) => void) {
        this.ui.showLoader(true);
        this.ui.hideActionButtons();
        try {
            const result = await request();
            onResult(result);
        } catch (error) {
            console.error("Gemini API Error:", error);
            this.ui.displayAnswer("Sorry, an error occurred. Please try again.", 'error');
        } finally {
            this.ui.showLoader(false);
        }
    }
    
    private solveFromImage() {
        this.handleGeminiRequest(
            () => this.gemini.getAnswerFromImage(this.camera.getCanvas(), this.selectedModel),
            (text) => this.ui.displayAnswer(text, 'answer')
        );
    }
    
    private transcribeImage() {
        this.handleGeminiRequest(
            () => this.gemini.transcribeImage(this.camera.getCanvas()),
            (text) => this.ui.displayTranscriptionResult(text)
        );
    }
    
    private solveFromText() {
        const question = this.ui.getTranscribedText();
        if (!question.trim()) return;

        this.handleGeminiRequest(
            () => this.gemini.getAnswerFromText(question, this.selectedModel),
            (text) => this.ui.displayAnswer(text, 'answer')
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
            flashBtn: document.getElementById('flash-btn') as HTMLButtonElement,
            captureBtn: document.getElementById('capture-btn') as HTMLButtonElement,
            retakeBtn: document.getElementById('retake-btn') as HTMLButtonElement,
            rotateBtn: document.getElementById('rotate-btn') as HTMLButtonElement,
            confirmBtn: document.getElementById('confirm-btn') as HTMLButtonElement,
            loader: document.getElementById('loader')!,
            startOverBtn: document.getElementById('start-over-btn') as HTMLButtonElement,
            actionButtonsContainer: document.getElementById('action-buttons')!,
            initialActionButtons: document.getElementById('initial-action-buttons')!,
            transcribedActionButtons: document.getElementById('transcribed-action-buttons')!,
            askImageBtn: document.getElementById('ask-image-btn') as HTMLButtonElement,
            transcribeBtn: document.getElementById('transcribe-btn') as HTMLButtonElement,
            askTextBtn: document.getElementById('ask-text-btn') as HTMLButtonElement,
            responseContainer: document.getElementById('response-container')!,
            transcriptionContainer: document.getElementById('transcription-container')!,
            transcribedTextArea: document.getElementById('transcribed-text') as HTMLTextAreaElement,
            answerSection: document.getElementById('answer-section')!,
            answerContainer: document.getElementById('answer-container')!,
            copyBtn: document.getElementById('copy-btn') as HTMLButtonElement,
            copyTranscriptionBtn: document.getElementById('copy-transcription-btn') as HTMLButtonElement,
            resultImagePreview: document.getElementById('result-image-preview') as HTMLImageElement,
            cropBox: document.getElementById('crop-box')!,
            modelSelector: document.getElementById('model-selector')!,
            modelFlashBtn: document.getElementById('model-flash-btn') as HTMLButtonElement,
            modelProBtn: document.getElementById('model-pro-btn') as HTMLButtonElement,
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
