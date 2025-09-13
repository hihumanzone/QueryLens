import { GoogleGenAI } from "@google/genai";
import { CONFIG, ModelType } from '../config/constants.js';
import { ImageUtils } from '../utils/imageUtils.js';

/**
 * Service for interacting with Google's Gemini AI API
 */
export class GeminiService {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || this.getStoredApiKey() || process.env.API_KEY;
    if (!key) {
      throw new Error("API key is not configured.");
    }
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  /**
   * Get stored API key from localStorage
   */
  private getStoredApiKey(): string | null {
    try {
      return localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
    } catch (error) {
      console.warn('Could not access localStorage:', error);
      return null;
    }
  }

  /**
   * Save API key to localStorage
   */
  static saveApiKey(apiKey: string): void {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, apiKey);
    } catch (error) {
      console.error('Could not save API key to localStorage:', error);
      throw new Error('Failed to save API key');
    }
  }

  /**
   * Check if API key is stored in localStorage
   */
  static hasStoredApiKey(): boolean {
    try {
      return !!localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear stored API key from localStorage
   */
  static clearStoredApiKey(): void {
    try {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.API_KEY);
    } catch (error) {
      console.error('Could not clear API key from localStorage:', error);
    }
  }

  /**
   * Get answer from image using specified model
   */
  async getAnswerFromImage(canvas: HTMLCanvasElement, model: ModelType): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: model,
      contents: { parts: [ImageUtils.canvasToImagePart(canvas)] },
    });
    return response.text;
  }

  /**
   * Transcribe text from image
   */
  async transcribeImage(canvas: HTMLCanvasElement): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: CONFIG.MODELS.FLASH,
      contents: { parts: [ImageUtils.canvasToImagePart(canvas)] },
      config: {
        systemInstruction: CONFIG.API.SYSTEM_INSTRUCTION
      }
    });
    return response.text;
  }

  /**
   * Get answer from text using specified model
   */
  async getAnswerFromText(question: string, model: ModelType): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: model,
      contents: question
    });
    return response.text;
  }
}