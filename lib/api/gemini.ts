import { GoogleGenAI } from '@google/genai';
import { DashboardData, IndicatorData } from '../types/indicators';
import { GeminiModelName, DEFAULT_GEMINI_MODEL } from '../constants/gemini-models';
import { createQuotaError } from '../types/errors';
import { buildMarketPredictionPrompt } from '../prompts/market-prediction';
import { buildIndicatorCommentsPrompt } from '../prompts/indicator-comments';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface MarketPrediction {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
  risks: string[];
  timestamp: string;
  isFallback?: boolean;
  fallbackMessage?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gemini API 응답에서 텍스트 추출
 */
function extractTextFromOutputs(outputs: Array<{ type?: string; text?: string }> | undefined): string {
  let text = '';
  for (const output of outputs || []) {
    if (output.type === 'text' && output.text) {
      text += output.text;
    }
  }
  return text;
}

/**
 * 응답 텍스트에서 JSON 추출 및 파싱
 * @throws Error if no text or invalid JSON format
 */
function parseJsonFromResponse<T>(text: string): T {
  if (!text) {
    throw new Error('No text output from Gemini API');
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Gemini API');
  }

  return JSON.parse(jsonMatch[0]) as T;
}

/**
 * Quota/Rate limit 에러 여부 확인
 */
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const errorMessage = error.message.toLowerCase();
  return errorMessage.includes('quota') ||
         errorMessage.includes('rate limit') ||
         errorMessage.includes('429') ||
         errorMessage.includes('resource exhausted');
}

/**
 * Quota 에러 처리 - quota 에러면 throw, 아니면 원본 에러 throw
 */
function handleApiError(error: unknown, quotaMessage: string): never {
  if (isQuotaError(error)) {
    throw createQuotaError(quotaMessage);
  }
  throw error;
}

// =============================================================================
// Main Functions
// =============================================================================

export async function generateMarketPrediction(
  dashboardData: DashboardData,
  modelName: GeminiModelName = DEFAULT_GEMINI_MODEL
): Promise<MarketPrediction> {
  const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const prompt = buildMarketPredictionPrompt(dashboardData, monthYear);

  try {
    const interaction = await genAI.interactions.create({
      model: modelName,
      input: prompt,
      tools: [{ type: 'google_search' }],
      response_modalities: ['text'],
    });

    const text = extractTextFromOutputs(interaction.outputs);
    const prediction = parseJsonFromResponse<{ sentiment: string; reasoning: string; risks?: string[] }>(text);

    return {
      sentiment: prediction.sentiment as 'bullish' | 'bearish' | 'neutral',
      reasoning: prediction.reasoning,
      risks: prediction.risks || [],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating market prediction:', error);
    handleApiError(error, 'API 사용 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.');
  }
}

/**
 * Generate AI comments for multiple indicators in a single API call (2-3 sentences each)
 *
 * Batch processing:
 * - Takes array of indicators with cache misses
 * - Sends all indicators in one prompt
 * - Returns JSON object with comments per symbol
 *
 * Explains for each indicator:
 * 1. Why the indicator moved (reason for change)
 * 2. Expected impact of this change
 */
export async function generateBatchComments(
  indicators: Array<{ symbol: string; data: IndicatorData }>
): Promise<Record<string, string>> {
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const prompt = buildIndicatorCommentsPrompt(indicators, dateStr);

  try {
    const response = await genAI.interactions.create({
      model: 'gemini-2.5-flash-lite',
      input: prompt,
      tools: [{ type: 'google_search' }],
      response_modalities: ['text'],
    });

    const text = extractTextFromOutputs(response.outputs);
    const comments = parseJsonFromResponse<Record<string, string>>(text);

    // Validate that all requested symbols have comments
    for (const { symbol } of indicators) {
      if (!comments[symbol]) {
        console.warn(`[generateBatchComments] Missing comment for ${symbol}`);
      }
    }

    return comments;
  } catch (error) {
    console.error('[generateBatchComments] Error:', error);
    handleApiError(error, 'API 사용 한도가 초과되었습니다.');
  }
}
