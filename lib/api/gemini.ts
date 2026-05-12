import { GoogleGenAI } from '@google/genai';
import { DashboardData, IndicatorData } from '../types/indicators';
import { GeminiModelName, DEFAULT_GEMINI_MODEL } from '../constants/gemini-models';
import { createQuotaError } from '../types/errors';
import { buildMarketPredictionPrompt } from '../prompts/market-prediction';
import { buildIndicatorCommentsPrompt } from '../prompts/indicator-comments';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/**
 * 단일 horizon (단기/중기/장기) 관점.
 * 동일 시장 상태도 horizon에 따라 sentiment가 다를 수 있음
 * (예: 단기 bearish, 중기 neutral, 장기 bullish).
 */
export interface HorizonView {
  horizon: string;                                       // "1-2주" | "1-3개월" | "6-12개월"
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;                                    // 0.40 ~ 0.90
  expectedSpxMove: string;                               // "+5~+10%" 등 한국어 range
  keyDrivers: string[];                                  // 3-5 bullets, 한국어
}

export interface MarketPrediction {
  // === 단기(1-2주) — top-level (백워드 호환) ===
  sentiment: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
  risks: string[];
  timestamp: string;
  isFallback?: boolean;
  fallbackMessage?: string;

  // 단기 calibrated forecast (옵셔널 — 이전 캐시는 누락 가능)
  confidence?: number;              // 0.40 ~ 0.90
  expectedSpxMove?: string;         // e.g. "+1~3%", "-2~-5%"
  counterNarrative?: string;        // 강한 반대 시나리오 (Korean)
  invalidationTriggers?: string[];  // 반증 조건 (Korean, falsifiable)

  // === 중기(1-3개월) / 장기(6-12개월) — 옵셔널 추가 horizon ===
  midTerm?: HorizonView;
  longTerm?: HorizonView;
}

/**
 * LLM 응답에서 단일 HorizonView를 안전하게 파싱.
 * 누락/잘못된 필드는 undefined 반환 (UI에서 graceful 처리).
 */
function parseHorizonView(raw: unknown, defaultHorizon: string): HorizonView | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;

  const sentiment = r.sentiment;
  if (sentiment !== 'bullish' && sentiment !== 'bearish' && sentiment !== 'neutral') return undefined;

  let confidence = 0.5;
  if (r.confidence !== undefined && r.confidence !== null) {
    const raw_c = typeof r.confidence === 'string' ? parseFloat(r.confidence) : Number(r.confidence);
    if (Number.isFinite(raw_c)) {
      confidence = Math.min(0.9, Math.max(0.4, raw_c));
    }
  }

  const expectedSpxMove = typeof r.expectedSpxMove === 'string' ? stripCitationMarkers(r.expectedSpxMove) : '';
  const horizonStr = typeof r.horizon === 'string' && r.horizon.trim() ? r.horizon.trim() : defaultHorizon;
  const keyDrivers = stripCitationsArray(r.keyDrivers);

  return {
    horizon: horizonStr,
    sentiment,
    confidence,
    expectedSpxMove,
    keyDrivers,
  };
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
 * Gemini의 Google Search grounding 기능이 자동 삽입하는 인용 마커를 제거.
 *
 * 패턴:
 * - "[provided data, cite: 32]", "[provided data, cite: 32, 33]"
 * - "[cite: 32]", "[cite:32]", "[cite: 32, 33]"
 * - "[source: 32]", "[source 32]"
 * - "[1]", "[12]", "[^1]" (단일 footnote 마커)
 *
 * 후속 정리:
 * - 마커 제거로 생긴 이중 공백 압축
 * - 구두점 앞 공백 제거 ("그렇다 ." → "그렇다.")
 * - 양끝 trim
 *
 * 안전성: 실제 컨텐츠 내 의미 있는 brackets는 위 패턴에 매칭되지 않음 (financial
 * analysis 텍스트에서 [숫자] 단독 출현은 사실상 모두 citation marker).
 */
function stripCitationMarkers(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/\[provided\s+data[,\s]*cite:\s*[\d,\s]+\]/gi, '')
    .replace(/\[cite:\s*[\d,\s]+\]/gi, '')
    .replace(/\[source:?\s*[\d,\s]+\]/gi, '')
    .replace(/\[\^?\d+(?:\s*,\s*\d+)*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?。、])/g, '$1')
    .trim();
}

/**
 * 문자열 배열의 각 항목에서 인용 마커 제거.
 * 빈 문자열이 된 항목은 제외.
 */
function stripCitationsArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((s): s is string => typeof s === 'string')
    .map(stripCitationMarkers)
    .filter(s => s.length > 0);
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
    const prediction = parseJsonFromResponse<{
      sentiment?: string;
      reasoning: string;
      risks?: string[];
      confidence?: number | string;
      expectedSpxMove?: string;
      counterNarrative?: string;
      invalidationTriggers?: string[];
      shortTerm?: unknown;
      midTerm?: unknown;
      longTerm?: unknown;
    }>(text);

    // 신규 응답 형식: shortTerm 객체 우선, 누락 시 top-level 필드로 폴백
    const shortTerm = parseHorizonView(prediction.shortTerm, '1-2주');
    const midTerm = parseHorizonView(prediction.midTerm, '1-3개월');
    const longTerm = parseHorizonView(prediction.longTerm, '6-12개월');

    // 단기 sentiment/confidence/expectedSpxMove는 shortTerm이 있으면 거기서, 없으면 top-level
    const topSentiment = (shortTerm?.sentiment || prediction.sentiment) as 'bullish' | 'bearish' | 'neutral';

    let topConfidence: number | undefined = shortTerm?.confidence;
    if (topConfidence === undefined && prediction.confidence !== undefined && prediction.confidence !== null) {
      const raw = typeof prediction.confidence === 'string'
        ? parseFloat(prediction.confidence)
        : prediction.confidence;
      if (Number.isFinite(raw)) {
        topConfidence = Math.min(0.9, Math.max(0.4, raw));
      }
    }

    const topExpectedMove = shortTerm?.expectedSpxMove || stripCitationMarkers(prediction.expectedSpxMove) || undefined;
    const cleanedCounterNarrative = stripCitationMarkers(prediction.counterNarrative);
    const cleanedInvalidationTriggers = stripCitationsArray(prediction.invalidationTriggers);
    const cleanedRisks = stripCitationsArray(prediction.risks);

    return {
      sentiment: topSentiment,
      reasoning: stripCitationMarkers(prediction.reasoning),
      risks: cleanedRisks,
      timestamp: new Date().toISOString(),
      confidence: topConfidence,
      expectedSpxMove: topExpectedMove,
      counterNarrative: cleanedCounterNarrative || undefined,
      invalidationTriggers: cleanedInvalidationTriggers.length > 0 ? cleanedInvalidationTriggers : undefined,
      midTerm,
      longTerm,
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
    const rawComments = parseJsonFromResponse<Record<string, string>>(text);

    // 인용 마커 제거 + 빈 문자열 누락 처리
    const comments: Record<string, string> = {};
    for (const [symbol, value] of Object.entries(rawComments)) {
      if (typeof value === 'string') {
        const cleaned = stripCitationMarkers(value);
        if (cleaned.length > 0) {
          comments[symbol] = cleaned;
        }
      }
    }

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
