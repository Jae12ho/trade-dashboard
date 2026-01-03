/**
 * Gemini model configuration
 * Single source of truth for available Gemini models
 */

export const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
] as const;

// Extract model names as a type
export type GeminiModelName = typeof GEMINI_MODELS[number]['value'];

// Default model
export const DEFAULT_GEMINI_MODEL: GeminiModelName = 'gemini-2.5-flash';

// Helper to get all valid model names
export const VALID_MODEL_NAMES = GEMINI_MODELS.map(m => m.value);
