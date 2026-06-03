export type TransportMode = 'subway' | 'bus' | 'car' | 'bike' | 'walk';
export type TimeOfDay = 'morning_peak' | 'evening_peak' | 'off_peak' | 'unknown';

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
  originCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
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
