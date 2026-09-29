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

export type SignalStage = 'WATCH' | 'TRIGGERING' | 'BREAKOUT';

export type LiveSignal = {
  ticker: string;
  name: string;
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
  reasons: string[];
};

export type AlertState = {
  stage: SignalStage;
  lastAt: number;
  lastScore: number;
};

export type RadarState = {
  updatedAt: string;
  sessionDate: string;
  lastRunAt: number;
  previous: Record<string, MinimalSnapshot>;
  alerts: Record<string, AlertState>;
  latestSignals: LiveSignal[];
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
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  ADMIN_TOKEN?: string;
};
