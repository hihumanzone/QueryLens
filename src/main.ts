import { App } from './app.js';
import { DOMUtils } from './utils/domUtils.js';

/**
 * Initialize the QueryLens application
 */
function initializeApp(): void {
  try {
    const elements = DOMUtils.getRequiredElements();
    const app = new App(elements);
    app.start();
  } catch (error: any) {
    console.error("Failed to initialize app:", error);
    displayCriticalError(error.message);
  }
}

/**
 * Display critical error when app fails to initialize
 */
function displayCriticalError(message: string): void {
  const responseContainer = document.getElementById('response-container');
  if (responseContainer) {
    responseContainer.innerHTML = `<p style="color: #ff8a80;">Critical Error: ${message}</p>`;
    document.getElementById('result-view')?.classList.remove('hidden');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);