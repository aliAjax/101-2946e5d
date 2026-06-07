import { CommuteRoute, FilterOptions, FavoriteRoute, Location, FilterPreset, WeightPresetType, ScoringWeights, Snapshot, AnomalyType } from '../types/commute';
import { defaultLocations } from '../data/mockData';

const STORAGE_KEY = 'commute-data';
const PRESET_STORAGE_KEY = 'commute-filter-presets';
const WEIGHT_STORAGE_KEY = 'commute-weight-preset';
const SNAPSHOT_STORAGE_KEY = 'commute-snapshots';

const VALID_TRANSPORT_MODES: string[] = ['subway', 'bus', 'car', 'bike', 'walk'];
const VALID_TIME_OF_DAY: string[] = ['morning_peak', 'evening_peak', 'off_peak', 'unknown'];
const ANOMALY_TYPES: AnomalyType[] = [
  'negative_cost',
  'invalid_crowd_level',
  'same_origin_destination',
  'date_out_of_range',
  'duration_outlier',
  'invalid_transport_mode',
  'invalid_duration',
];

export interface PersistedData {
  routes: CommuteRoute[];
  selectedRouteId: string | null;
  filters: FilterOptions;
  favorites: FavoriteRoute[];
  locations: Location[];
  ignoredAnomalyKeys: string[];
}

export type SaveInput = PersistedData & { selectedDate?: string | null };

export function sanitizeRoute(route: CommuteRoute): CommuteRoute {
  return {
    ...route,
    transportMode: VALID_TRANSPORT_MODES.includes(route.transportMode) ? route.transportMode : 'subway',
    timeOfDay: VALID_TIME_OF_DAY.includes(route.timeOfDay) ? route.timeOfDay : 'unknown',
  };
}

export function migrateLegacyAnomalyId(id: string): string {
  const normalizedId = id.startsWith('anomaly-') ? id.slice('anomaly-'.length) : id;
  const matchedType = ANOMALY_TYPES.find(type => {
    const stableSuffix = `-${type}`;
    return normalizedId.endsWith(stableSuffix) || new RegExp(`${stableSuffix}-\\d+$`).test(normalizedId);
  });

  if (!matchedType) return normalizedId;

  const typeMarker = `-${matchedType}`;
  const typeStart = normalizedId.lastIndexOf(typeMarker);
  return `${normalizedId.slice(0, typeStart)}-${matchedType}`;
}

export function loadPresetsFromStorage(): FilterPreset[] {
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as FilterPreset[];
    }
  } catch (e) {
    console.error('Failed to load presets from localStorage:', e);
  }
  return [];
}

export function savePresetsToStorage(presets: FilterPreset[]): void {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets to localStorage:', e);
  }
}

export function loadWeightPresetFromStorage(): { presetType: WeightPresetType; weights: ScoringWeights } | null {
  try {
    const stored = localStorage.getItem(WEIGHT_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load weight preset from localStorage:', e);
  }
  return null;
}

export function saveWeightPresetToStorage(presetType: WeightPresetType, weights: ScoringWeights): void {
  try {
    localStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify({ presetType, weights }));
  } catch (e) {
    console.error('Failed to save weight preset to localStorage:', e);
  }
}

export function loadSnapshotsFromStorage(): Snapshot[] {
  try {
    const stored = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Snapshot[];
    }
  } catch (e) {
    console.error('Failed to load snapshots from localStorage:', e);
  }
  return [];
}

export function saveSnapshotsToStorage(snapshots: Snapshot[]): void {
  try {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
  } catch (e) {
    console.error('Failed to save snapshots to localStorage:', e);
  }
}

export function loadFromStorage(): PersistedData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as PersistedData;
      data.routes = data.routes.map(route => sanitizeRoute({
        ...route,
        timeOfDay: route.timeOfDay || 'unknown',
      }));
      if (!data.filters.timeOfDay) {
        data.filters.timeOfDay = [];
      }
      if (!data.locations || data.locations.length === 0) {
        data.locations = defaultLocations;
      }

      if (!data.ignoredAnomalyKeys) {
        data.ignoredAnomalyKeys = [];
      }

      data.favorites = data.favorites.map(fav => ({
        ...fav,
        note: fav.note || '',
      }));

      const legacyData = data as PersistedData & { ignoredAnomalyIds?: string[] };
      if (legacyData.ignoredAnomalyIds && legacyData.ignoredAnomalyIds.length > 0) {
        const migratedKeys = legacyData.ignoredAnomalyIds.map(migrateLegacyAnomalyId);
        data.ignoredAnomalyKeys = [...new Set([...data.ignoredAnomalyKeys, ...migratedKeys])];
        delete legacyData.ignoredAnomalyIds;
      }

      return data;
    }
  } catch (e) {
    console.error('Failed to load data from localStorage:', e);
  }
  return null;
}

export function saveToStorage(data: SaveInput): void {
  try {
    const toSave: PersistedData = {
      routes: data.routes,
      selectedRouteId: data.selectedRouteId,
      filters: data.filters,
      favorites: data.favorites,
      locations: data.locations,
      ignoredAnomalyKeys: data.ignoredAnomalyKeys,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save data to localStorage:', e);
  }
}
