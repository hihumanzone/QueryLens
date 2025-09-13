export const CONFIG = {
  // AI Models
  MODELS: {
    FLASH: 'gemini-2.5-flash',
    PRO: 'gemini-2.5-pro',
  } as const,

  // Image Processing
  IMAGE: {
    MAX_DIMENSION: 1280,
    JPEG_QUALITY: 0.9,
    MIN_CROP_SIZE: 30,
  },

  // Camera Settings
  CAMERA: {
    FACING_MODE: 'environment',
    IDEAL_WIDTH: 1920,
    IDEAL_HEIGHT: 1080,
  },

  // UI Animations
  UI: {
    COPY_FEEDBACK_DURATION: 2000,
  },

  // Storage Keys
  STORAGE_KEYS: {
    API_KEY: 'gemini-api-key',
  },

  // API Configuration
  API: {
    SYSTEM_INSTRUCTION: "Transcribe the question from the image, and format any equations using LaTeX (e.g., $a + b = 5$). Please respond with only the final, full question with its corresponding options, if present.",
  },
} as const;

export type ModelType = typeof CONFIG.MODELS[keyof typeof CONFIG.MODELS];