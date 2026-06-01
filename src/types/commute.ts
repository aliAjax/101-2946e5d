export type TransportMode = 'subway' | 'bus' | 'car' | 'bike' | 'walk';

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
  originCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
}

export interface FilterOptions {
  isWeekday: boolean | null;
  isWeekend: boolean | null;
  transportModes: TransportMode[];
  dateRange: { start: string; end: string };
  onlyFavorites: boolean;
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
