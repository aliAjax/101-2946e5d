export type TransportMode = 'subway' | 'bus' | 'car' | 'bike' | 'walk';
export type TimeOfDay = 'morning_peak' | 'evening_peak' | 'off_peak' | 'unknown';

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface CommuteRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  transportMode: TransportMode;
  duration: number;
  cost: number;
  crowdLevel: number;
  date: string;
  timeOfDay: TimeOfDay;
}

export interface FilterPreset {
  id: string;
  name: string;
  dateRange: { start: string; end: string };
  isWeekday: boolean | null;
  isWeekend: boolean | null;
  transportModes: TransportMode[];
  timeOfDay: TimeOfDay[];
  onlyFavorites: boolean;
  createdAt: string;
}

export interface FilterOptions {
  isWeekday: boolean | null;
  isWeekend: boolean | null;
  transportModes: TransportMode[];
  dateRange: { start: string; end: string };
  onlyFavorites: boolean;
  origin: string | null;
  destination: string | null;
  timeOfDay: TimeOfDay[];
}

export interface FavoriteRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  transportMode: TransportMode;
  createdAt: string;
}

export interface CommuteStatistics {
  mostStable: CommuteRoute | null;
  cheapest: CommuteRoute | null;
  fastest: CommuteRoute | null;
  avgDuration: number;
  avgCost: number;
  totalRoutes: number;
}

export interface ScoringWeights {
  time: number;
  cost: number;
  comfort: number;
  stability: number;
}

export interface RouteScore {
  key: string;
  name: string;
  origin: string;
  destination: string;
  transportMode: TransportMode;
  avgDuration: number;
  avgCost: number;
  avgCrowd: number;
  stabilityScore: number;
  sampleCount: number;
  totalScore: number;
  timeScore: number;
  costScore: number;
  comfortScore: number;
}

export interface DimensionComparison {
  transportMode: TransportMode;
  label: string;
  score: number;
  rawValue: number;
  diff: number;
}

export interface DimensionExplanation {
  dimension: 'time' | 'cost' | 'comfort' | 'stability';
  score: number;
  formula: string;
  rawValue: number;
  rawUnit: string;
  comparisons: DimensionComparison[];
  sampleCount: number;
  sampleWarning: string | null;
}

export interface ScoreExplanation {
  scoreKey: string;
  name: string;
  origin: string;
  destination: string;
  transportMode: TransportMode;
  totalScore: number;
  dimensions: DimensionExplanation[];
  sameODScores: RouteScore[];
  sampleWarning: string | null;
}

export const transportModeLabels: Record<TransportMode, string> = {
  subway: '地铁',
  bus: '公交',
  car: '自驾',
  bike: '骑行',
  walk: '步行',
};

export const transportModeColors: Record<TransportMode, string> = {
  subway: '#3B82F6',
  bus: '#10B981',
  car: '#F59E0B',
  bike: '#8B5CF6',
  walk: '#EC4899',
};

export const timeOfDayLabels: Record<TimeOfDay, string> = {
  morning_peak: '早高峰',
  evening_peak: '晚高峰',
  off_peak: '平峰',
  unknown: '未知',
};

export const timeOfDayColors: Record<TimeOfDay, string> = {
  morning_peak: '#EF4444',
  evening_peak: '#8B5CF6',
  off_peak: '#22C55E',
  unknown: '#9CA3AF',
};

export type AnomalyType = 
  | 'negative_cost'
  | 'invalid_crowd_level'
  | 'same_origin_destination'
  | 'date_out_of_range'
  | 'duration_outlier'
  | 'invalid_transport_mode'
  | 'invalid_duration';

export interface AnomalyRecord {
  id: string;
  routeId: string;
  route: CommuteRoute;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion: string;
  detectedAt: string;
  ignored: boolean;
}

export const anomalyTypeLabels: Record<AnomalyType, string> = {
  negative_cost: '费用异常',
  invalid_crowd_level: '拥挤度异常',
  same_origin_destination: '起终点相同',
  date_out_of_range: '日期超出范围',
  duration_outlier: '耗时异常',
  invalid_transport_mode: '交通方式异常',
  invalid_duration: '时长异常',
};

export const anomalySeverityColors: Record<AnomalyRecord['severity'], string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#7C2D12',
};

export const anomalySeverityLabels: Record<AnomalyRecord['severity'], string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};
