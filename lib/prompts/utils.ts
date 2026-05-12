import type { HistoricalDataPoint } from '../types/indicators';

/**
 * 기간별 변화율 포맷팅 (일별/월별 데이터 통합)
 * @param indicator - 지표 데이터
 * @param isMonthly - 월별 데이터 여부 (true: 1M/2M/3M, false: 1D/7D/30D)
 */
export function formatPeriodChanges(
  indicator: { changePercent: number; changePercent7d?: number; changePercent30d?: number },
  isMonthly: boolean = false
): string {
  const labels = isMonthly
    ? ['1M', '2M', '3M']
    : ['1D', '7D', '30D'];

  const formatChange = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const changes = [`${labels[0]}: ${formatChange(indicator.changePercent)}`];

  if (indicator.changePercent7d !== undefined) {
    changes.push(`${labels[1]}: ${formatChange(indicator.changePercent7d)}`);
  }
  if (indicator.changePercent30d !== undefined) {
    changes.push(`${labels[2]}: ${formatChange(indicator.changePercent30d)}`);
  }

  return changes.join(', ');
}

/**
 * 현재 값이 history 분포 내 어느 백분위에 위치하는지 계산 (0-100)
 * 절대 임계값 대신 레짐 상대적 위치를 표현하기 위해 사용.
 * 예: VIX 18이 6개월 백분위 75%면 "최근 분포의 상위" → 부담스러운 수준
 */
export function calculatePercentile(value: number, history: HistoricalDataPoint[]): number | null {
  if (!history || history.length < 5) return null;
  const values = history.map(h => h.value).filter(v => Number.isFinite(v));
  if (values.length === 0) return null;
  const below = values.filter(v => v < value).length;
  return Math.round((below / values.length) * 100);
}

/**
 * 백분위를 자연어 라벨로 변환
 */
export function percentileLabel(percentile: number | null): string {
  if (percentile === null) return 'n/a';
  if (percentile <= 10) return `${percentile}p (최근 6개월 최저권)`;
  if (percentile <= 30) return `${percentile}p (낮은 편)`;
  if (percentile <= 70) return `${percentile}p (중간 영역)`;
  if (percentile <= 90) return `${percentile}p (높은 편)`;
  return `${percentile}p (최근 6개월 최고권)`;
}

/**
 * 최근 N개 데이터의 연속 상승/하락 길이 계산
 * (마지막 데이터 기준 역방향, 부호가 바뀌는 시점에서 멈춤)
 */
export function calculateStreak(history: HistoricalDataPoint[] | undefined, lookback = 10): {
  direction: 'up' | 'down' | 'flat';
  length: number;
} {
  if (!history || history.length < 2) return { direction: 'flat', length: 0 };
  const recent = history.slice(-lookback - 1);
  if (recent.length < 2) return { direction: 'flat', length: 0 };

  const diffs: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    diffs.push(recent[i].value - recent[i - 1].value);
  }

  const last = diffs[diffs.length - 1];
  if (last === 0) return { direction: 'flat', length: 0 };
  const sign = Math.sign(last);

  let length = 0;
  for (let i = diffs.length - 1; i >= 0; i--) {
    if (Math.sign(diffs[i]) === sign) length++;
    else break;
  }

  return { direction: sign > 0 ? 'up' : 'down', length };
}

/**
 * 추세 요약 문자열 (예: "3주 연속 상승", "2일 연속 하락", "추세 없음")
 */
export function formatStreak(history: HistoricalDataPoint[] | undefined, unit: 'day' | 'month' = 'day'): string {
  const streak = calculateStreak(history);
  if (streak.length < 2) return '추세 없음';
  const dir = streak.direction === 'up' ? '상승' : '하락';
  const unitKo = unit === 'month' ? '개월' : '일';
  return `${streak.length}${unitKo} 연속 ${dir}`;
}

/**
 * 검색용 날짜 범위 한정자 (Google Search "after:YYYY-MM-DD")
 * 최근 N일로 검색 결과를 한정해 묵은 기사를 배제
 */
export function recentDateQualifier(daysBack: number = 14): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `after:${yyyy}-${mm}-${dd}`;
}

/**
 * Hard Tripwire 평가 결과
 * 결정론적으로 계산된 위험 신호. 발동 시 LLM의 해석과 무관하게 risk-off bias 강제.
 *
 * 구 프롬프트가 절대 임계로 잘 잡았던 단일-날 충격을, 새 프롬프트의 백분위/클러스터
 * 합치 요구가 흡수해버리는 회귀를 방지하기 위함.
 */
export interface TripwireResult {
  engaged: boolean;
  triggers: string[]; // 발동된 조건 한국어 설명 (LLM에 그대로 주입)
}

interface TripwireInputs {
  vixValue: number;            // VIX 절대 레벨 (e.g., 18.5)
  vix1dChangePct: number;      // VIX 1D % 변화 (e.g., +20 means +20%)
  hys1dChangeRaw: number;      // HYS 1D 절대 변화 (percentage points; 0.20 = 20bps)
}

/**
 * 다음 중 하나라도 해당 시 Hard Tripwire 발동:
 * - VIX 절대 레벨 ≥ 22  (시장 부담 영역)
 * - VIX 1일 변화 ≥ +15% (스파이크)
 * - HYS 1일 확대 ≥ 0.20pp (=20bps, 신용 스트레스)
 *
 * S&P 500 1일 -1.5% 이하 조건은 데이터에 SPX가 없으므로 LLM이 검색으로 보완하도록
 * 프롬프트에서 별도 안내한다 (이 함수에는 포함 안 됨).
 */
export function evaluateHardTripwire(inputs: TripwireInputs): TripwireResult {
  const triggers: string[] = [];

  if (inputs.vixValue >= 22) {
    triggers.push(`VIX 절대 레벨 ${inputs.vixValue.toFixed(2)} ≥ 22 (부담 영역)`);
  }
  if (inputs.vix1dChangePct >= 15) {
    triggers.push(`VIX 1일 +${inputs.vix1dChangePct.toFixed(2)}% ≥ +15% (스파이크)`);
  }
  if (inputs.hys1dChangeRaw >= 0.20) {
    const bps = Math.round(inputs.hys1dChangeRaw * 100);
    triggers.push(`HYS 1일 확대 +${bps}bps ≥ +20bps (신용 스트레스)`);
  }

  return { engaged: triggers.length > 0, triggers };
}

