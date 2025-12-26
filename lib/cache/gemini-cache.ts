import { DashboardData } from '../types/indicators';
import { MarketPrediction } from '../api/gemini';

interface CachedPrediction {
  prediction: MarketPrediction;
  timestamp: number;
  dataHash: string;
}

/**
 * Gemini API 응답을 인메모리 캐싱하는 클래스
 * - TTL: 30분 (1800초)
 * - 지표 데이터 해시 기반 캐시 키 생성
 * - 자동 만료 캐시 정리
 */
class GeminiCache {
  private cache: Map<string, CachedPrediction> = new Map();
  private ttl: number = 30 * 60 * 1000; // 30분 (밀리초)

  /**
   * 캐시에서 예측 가져오기
   * @param dashboardData 지표 데이터
   * @returns 캐시된 예측 또는 null
   */
  getPrediction(dashboardData: DashboardData): MarketPrediction | null {
    const hash = this.hashData(dashboardData);
    const cached = this.cache.get(hash);

    if (!cached) {
      console.log('[GeminiCache] Cache miss:', hash);
      return null;
    }

    // TTL 확인
    if (Date.now() - cached.timestamp > this.ttl) {
      console.log('[GeminiCache] Cache expired:', hash);
      this.cache.delete(hash);
      return null;
    }

    console.log('[GeminiCache] Cache hit:', hash, `(age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
    return cached.prediction;
  }

  /**
   * 예측을 캐시에 저장
   * @param dashboardData 지표 데이터
   * @param prediction 예측 결과
   */
  setPrediction(
    dashboardData: DashboardData,
    prediction: MarketPrediction
  ): void {
    const hash = this.hashData(dashboardData);

    this.cache.set(hash, {
      prediction,
      timestamp: Date.now(),
      dataHash: hash,
    });

    console.log('[GeminiCache] Cached prediction:', hash, `(cache size: ${this.cache.size})`);

    // 오래된 캐시 정리
    this.cleanup();
  }

  /**
   * 지표 데이터를 해시로 변환
   * 유사한 값들은 동일한 해시를 생성하여 캐시 효율성 높임
   * @param data 지표 데이터
   * @returns 해시 문자열
   */
  private hashData(data: DashboardData): string {
    // 지표 값들을 반올림하여 유사한 데이터는 동일 해시 생성
    const rounded = {
      us10y: data.indicators.us10yYield.value.toFixed(2),
      dxy: data.indicators.dxy.value.toFixed(1),
      spread: data.indicators.highYieldSpread.value.toFixed(1),
      m2: data.indicators.m2MoneySupply.value.toFixed(0),
      oil: data.indicators.crudeOil.value.toFixed(1),
      ratio: data.indicators.copperGoldRatio.value.toFixed(2),
      pmi: data.indicators.pmi.value.toFixed(1),
      vix: data.indicators.putCallRatio.value.toFixed(1),
      btc: data.indicators.bitcoin.value.toFixed(0),
    };

    return JSON.stringify(rounded);
  }

  /**
   * 만료된 캐시 항목 정리
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [hash, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.ttl) {
        this.cache.delete(hash);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[GeminiCache] Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.ttl,
    };
  }

  /**
   * 가장 최근의 유효한 예측 가져오기 (fallback용)
   * API 에러 발생 시 사용
   * @returns 가장 최근 유효한 예측 또는 null
   */
  getLatestValidPrediction(): MarketPrediction | null {
    const now = Date.now();
    let latestPrediction: CachedPrediction | null = null;
    let latestTimestamp = 0;

    for (const [_hash, cached] of this.cache.entries()) {
      // TTL 이내의 유효한 캐시만 확인
      if (now - cached.timestamp <= this.ttl) {
        if (cached.timestamp > latestTimestamp) {
          latestTimestamp = cached.timestamp;
          latestPrediction = cached;
        }
      }
    }

    if (latestPrediction) {
      const ageSeconds = Math.round((now - latestPrediction.timestamp) / 1000);
      console.log(
        `[GeminiCache] Fallback prediction found: ${latestPrediction.dataHash} (age: ${ageSeconds}s)`
      );
      return latestPrediction.prediction;
    }

    console.log('[GeminiCache] No valid fallback prediction available');
    return null;
  }

  /**
   * 캐시 전체 삭제
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[GeminiCache] Cleared ${size} cache entries`);
  }
}

// 싱글톤 인스턴스 export
export const geminiCache = new GeminiCache();
