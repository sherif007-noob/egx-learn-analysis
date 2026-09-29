export type ScannerRow = {
  symbol: string;
  ticker: string;
  name: string;
  close: number | null;
  changePct: number | null;
  volume: number | null;
  avgVol10: number | null;
  rvol10: number | null;
  high: number | null;
  low: number | null;
  turnover: number | null;
  closeLocation: number | null;
  sector: string;
};

export type MinimalSnapshot = {
  close: number;
  volume: number;
  high: number;
  turnover: number;
  changePct: number;
  rvol10: number;
  closeLocation: number;
};

export type HistoryPoint = MinimalSnapshot & {
  at: number;
};

export type MarketRegime = 'RISK_ON' | 'MIXED' | 'RISK_OFF';

export type MarketContext = {
  advancers: number;
  decliners: number;
  unchanged: number;
  breadthRatio: number;
  medianChangePct: number;
  regime: MarketRegime;
};

export type DeepMetrics = {
  velocity1mPct: number;
  velocity3mPct: number;
  relativeStrengthPct: number;
  positiveIntervals5: number;
  higherLow: boolean;
  compressionPct: number;
};

export type SignalStage = 'WATCH' | 'TRIGGERING' | 'BREAKOUT';

export type RegimePhase = 'NORMAL' | 'ABNORMAL' | 'ACCELERATING' | 'SELF_REINFORCING';
export type RegimeConfidence = 'BOOTSTRAP' | 'PARTIAL' | 'MATURE';

export type RegimeDailyPoint = {
  date: string;
  close: number;
  high: number;
  low: number;
  volume: number;
  changePct: number;
  rvol10: number;
};

export type RegimeMetrics = {
  phase: RegimePhase;
  score: number;
  confidence: RegimeConfidence;
  priorSessions: number;
  return3dPct: number | null;
  return5dPct: number | null;
  return10dPct: number | null;
  priceMultiple10d: number | null;
  explosiveDays5: number;
  limitUpLikeDays5: number;
  strongDays10: number;
  consecutiveStrongDays: number;
  consecutiveLimitUpLikeDays: number;
  fresh10dHigh: boolean;
  reasons: string[];
};

export type LiveSignal = {
  ticker: string;
  name: string;
  sector: string;
  stage: SignalStage;
  score: number;
  close: number;
  changePct: number;
  intervalSeconds: number;
  priceDeltaPct: number;
  volumeDelta: number;
  intervalTurnover: number;
  volumePace: number;
  rvol10: number;
  closeLocation: number;
  hodDistancePct: number;
  newHod: boolean;
  velocity1mPct: number;
  velocity3mPct: number;
  relativeStrengthPct: number;
  positiveIntervals5: number;
  higherLow: boolean;
  compressionPct: number;
  marketBreadthRatio: number;
  marketMedianChangePct: number;
  marketRegime: MarketRegime;
  reasons: string[];
  regimePhase?: RegimePhase;
  regimeScore?: number;
  regimeConfidence?: RegimeConfidence;
  regimePriorSessions?: number;
  regimeReturn3dPct?: number | null;
  regimeReturn5dPct?: number | null;
  regimeReturn10dPct?: number | null;
  regimePriceMultiple10d?: number | null;
  regimeExplosiveDays5?: number;
  regimeLimitUpLikeDays5?: number;
  regimeStrongDays10?: number;
  regimeConsecutiveStrongDays?: number;
  regimeConsecutiveLimitUpLikeDays?: number;
  regimeFresh10dHigh?: boolean;
  regimeReasons?: string[];
};

export type AlertState = {
  stage: SignalStage;
  lastAt: number;
  lastScore: number;
  regimePhase?: RegimePhase;
};

export type PendingAlertEvaluation = {
  eventId: string;
  ticker: string;
  createdAt: number;
  entryPrice: number;
  stage: SignalStage;
  score: number;
  maxPrice: number;
  minPrice: number;
  remainingHorizons: number[];
};

export type AlertOutcome = {
  eventId: string;
  horizonMinutes: number;
  evaluatedAt: string;
  price: number;
  forwardReturnPct: number;
  maxPrice: number;
  minPrice: number;
  mfePct: number;
  maePct: number;
  hit05Pct: boolean;
  hit1Pct: boolean;
  hit2Pct: boolean;
  drawdown05Pct: boolean;
  drawdown1Pct: boolean;
};

export type RadarState = {
  updatedAt: string;
  sessionDate: string;
  lastRunAt: number;
  previous: Record<string, MinimalSnapshot>;
  history: Record<string, HistoryPoint[]>;
  regimeHistory: Record<string, RegimeDailyPoint[]>;
  alerts: Record<string, AlertState>;
  pendingEvaluations: PendingAlertEvaluation[];
  latestSignals: LiveSignal[];
  market: MarketContext;
  lastUniverseCount: number;
};

export type RadarConfig = {
  enabled: boolean;
  timeZone: string;
  sessionStart: string;
  sessionEnd: string;
  pollSeconds: number;
  minScore: number;
  triggerScore: number;
  cooldownMinutes: number;
  maxCandidates: number;
  minDailyTurnover: number;
  minMinuteTurnover: number;
  minVolumeShares: number;
  historyMinutes: number;
};

export type DurableStubLike = {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
};

export type DurableNamespaceLike = {
  getByName(name: string): DurableStubLike;
};

export type RadarEnv = {
  RADAR_COORDINATOR: DurableNamespaceLike;
  RADAR_ENABLED?: string;
  CAIRO_TZ?: string;
  SESSION_START?: string;
  SESSION_END?: string;
  POLL_SECONDS?: string;
  MIN_SCORE?: string;
  TRIGGER_SCORE?: string;
  ALERT_COOLDOWN_MINUTES?: string;
  MAX_CANDIDATES?: string;
  MIN_DAILY_TURNOVER_EGP?: string;
  MIN_MINUTE_TURNOVER_EGP?: string;
  MIN_VOLUME_SHARES?: string;
  HISTORY_MINUTES?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  ADMIN_TOKEN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};
