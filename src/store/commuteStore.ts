import { create } from 'zustand';
import { CommuteRoute, FilterOptions, CommuteStatistics, FavoriteRoute, ScoringWeights, RouteScore, Location, AnomalyRecord, AnomalyType, ScoreExplanation, DimensionExplanation, DimensionComparison, FilterPreset, WeightPresetType, WEIGHT_PRESETS, LocationImpact, Snapshot, SnapshotData } from '../types/commute';
import { mockRoutes, defaultLocations } from '../data/mockData';
import { detectAllAnomalies, getAnomalyIgnoreKey } from '../lib/anomalyDetector';

const STORAGE_KEY = 'commute-data';
const PRESET_STORAGE_KEY = 'commute-filter-presets';
const WEIGHT_STORAGE_KEY = 'commute-weight-preset';
const SNAPSHOT_STORAGE_KEY = 'commute-snapshots';

interface PersistedData {
  routes: CommuteRoute[];
  selectedRouteId: string | null;
  filters: FilterOptions;
  favorites: FavoriteRoute[];
  locations: Location[];
  ignoredAnomalyKeys: string[];
}

type SaveInput = PersistedData & { selectedDate?: string | null };

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

function sanitizeRoute(route: CommuteRoute): CommuteRoute {
  return {
    ...route,
    transportMode: VALID_TRANSPORT_MODES.includes(route.transportMode) ? route.transportMode : 'subway',
    timeOfDay: VALID_TIME_OF_DAY.includes(route.timeOfDay) ? route.timeOfDay : 'unknown',
  };
}

function migrateLegacyAnomalyId(id: string): string {
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

function loadPresetsFromStorage(): FilterPreset[] {
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

function savePresetsToStorage(presets: FilterPreset[]): void {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets to localStorage:', e);
  }
}

function loadWeightPresetFromStorage(): { presetType: WeightPresetType; weights: ScoringWeights } | null {
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

function saveWeightPresetToStorage(presetType: WeightPresetType, weights: ScoringWeights): void {
  try {
    localStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify({ presetType, weights }));
  } catch (e) {
    console.error('Failed to save weight preset to localStorage:', e);
  }
}

function loadSnapshotsFromStorage(): Snapshot[] {
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

function saveSnapshotsToStorage(snapshots: Snapshot[]): void {
  try {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
  } catch (e) {
    console.error('Failed to save snapshots to localStorage:', e);
  }
}

function loadFromStorage(): PersistedData | null {
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

function saveToStorage(data: SaveInput): void {
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

const defaultFilters: FilterOptions = {
  isWeekday: null,
  isWeekend: null,
  transportModes: [],
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
  onlyFavorites: false,
  origin: null,
  destination: null,
  timeOfDay: [],
};

const persistedData = loadFromStorage();

interface CommuteState {
  routes: CommuteRoute[];
  selectedRouteId: string | null;
  filters: FilterOptions;
  selectedDate: string | null;
  statistics: CommuteStatistics;
  favorites: FavoriteRoute[];
  scoringWeights: ScoringWeights;
  currentWeightPreset: WeightPresetType;
  routeScores: RouteScore[];
  locations: Location[];
  anomalies: AnomalyRecord[];
  ignoredAnomalyKeys: string[];
  isAnomalyPanelOpen: boolean;
  selectedScoreKey: string | null;
  filterPresets: FilterPreset[];
  monthFilterActive: boolean;
  previousDateRange: { start: string; end: string } | null;
  setRoutes: (routes: CommuteRoute[]) => void;
  addRoute: (route: CommuteRoute) => void;
  updateRoute: (id: string, updates: Partial<Omit<CommuteRoute, 'id'>>) => void;
  deleteRoute: (id: string) => void;
  selectRoute: (id: string | null) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  setSelectedDate: (date: string | null) => void;
  setMonthFilter: (active: boolean, year?: number, month?: number) => void;
  getFilteredRoutes: () => CommuteRoute[];
  calculateStatistics: () => void;
  importRoutes: (routes: CommuteRoute[]) => void;
  resetToMockData: () => void;
  addFavorite: (route: CommuteRoute, note?: string) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (route: CommuteRoute) => boolean;
  toggleFavorite: (route: CommuteRoute, note?: string) => void;
  updateFavoriteNote: (id: string, note: string) => void;
  setScoringWeights: (weights: Partial<ScoringWeights>) => void;
  applyWeightPreset: (presetType: WeightPresetType) => void;
  calculateRouteScores: () => void;
  addLocation: (location: Omit<Location, 'id'>) => void;
  updateLocation: (id: string, location: Partial<Omit<Location, 'id'>>) => void;
  deleteLocation: (id: string) => void;
  getLocationById: (id: string) => Location | undefined;
  getLocationByName: (name: string) => Location | undefined;
  getLocationRouteCount: (locationId: string) => number;
  getLocationImpact: (locationId: string) => LocationImpact;
  renameLocation: (id: string, newName: string) => void;
  deleteLocationWithOptions: (id: string, options: { keepRoutes: boolean; markAsMissing?: boolean }) => void;
  resetLocationsToDefault: () => void;
  detectAnomalies: () => void;
  ignoreAnomaly: (anomalyId: string) => void;
  unignoreAnomaly: (anomalyId: string) => void;
  clearIgnoredAnomalies: () => void;
  deleteRouteAndAnomalies: (routeId: string) => void;
  setAnomalyPanelOpen: (open: boolean) => void;
  focusRoute: (routeId: string) => void;
  setSelectedScoreKey: (key: string | null) => void;
  getScoreExplanation: (key: string) => ScoreExplanation | null;
  saveFilterPreset: (name: string) => void;
  deleteFilterPreset: (id: string) => void;
  applyFilterPreset: (id: string) => void;
  snapshots: Snapshot[];
  createSnapshot: (name: string, description?: string) => void;
  deleteSnapshot: (id: string) => void;
  restoreSnapshot: (id: string) => void;
  updateSnapshot: (id: string, updates: Partial<Pick<Snapshot, 'name' | 'description'>>) => void;
}

function isWeekday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

const defaultScoringWeights: ScoringWeights = {
  time: 25,
  cost: 25,
  comfort: 25,
  stability: 25,
};

const persistedWeightData = loadWeightPresetFromStorage();

export const useCommuteStore = create<CommuteState>((set, get) => ({
  routes: persistedData?.routes || mockRoutes,
  selectedRouteId: persistedData?.selectedRouteId || null,
  filters: persistedData?.filters || defaultFilters,
  selectedDate: null,
  statistics: {
    mostStable: null,
    cheapest: null,
    fastest: null,
    avgDuration: 0,
    avgCost: 0,
    totalRoutes: 0,
  },
  favorites: persistedData?.favorites || [],
  scoringWeights: persistedWeightData?.weights || defaultScoringWeights,
  currentWeightPreset: persistedWeightData?.presetType || 'custom',
  routeScores: [],
  locations: persistedData?.locations || defaultLocations,
  anomalies: [],
  ignoredAnomalyKeys: persistedData?.ignoredAnomalyKeys || [],
  isAnomalyPanelOpen: false,
  selectedScoreKey: null,
  filterPresets: loadPresetsFromStorage(),
  monthFilterActive: false,
  previousDateRange: null,
  snapshots: loadSnapshotsFromStorage(),

  setRoutes: (routes) => {
    const sanitizedRoutes = routes.map(sanitizeRoute);
    set({ routes: sanitizedRoutes });
    saveToStorage({ routes: sanitizedRoutes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  addRoute: (route) => {
    set((state) => ({
      routes: [...state.routes, sanitizeRoute(route)],
    }));
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  updateRoute: (id, updates) => {
    set((state) => {
      const routeIndex = state.routes.findIndex(r => r.id === id);
      if (routeIndex === -1) return state;
      const oldRoute = state.routes[routeIndex];
      const updatedRoute = sanitizeRoute({ ...oldRoute, ...updates });
      const newRoutes = [...state.routes];
      newRoutes[routeIndex] = updatedRoute;
      let newFavorites = state.favorites;
      const originChanged = updates.origin !== undefined && updates.origin !== oldRoute.origin;
      const destChanged = updates.destination !== undefined && updates.destination !== oldRoute.destination;
      const modeChanged = updates.transportMode !== undefined && updates.transportMode !== oldRoute.transportMode;
      if (originChanged || destChanged) {
        const newName = `${updates.origin ?? oldRoute.origin} → ${updates.destination ?? oldRoute.destination}`;
        updatedRoute.name = newName;
        newFavorites = state.favorites.map(fav => {
          if (fav.origin === oldRoute.origin && fav.destination === oldRoute.destination && fav.transportMode === oldRoute.transportMode) {
            return {
              ...fav,
              name: `${updates.origin ?? oldRoute.origin} → ${updates.destination ?? oldRoute.destination}`,
              origin: updates.origin ?? oldRoute.origin,
              destination: updates.destination ?? oldRoute.destination,
              transportMode: updates.transportMode ?? oldRoute.transportMode,
            };
          }
          return fav;
        });
      } else if (modeChanged) {
        newFavorites = state.favorites.map(fav => {
          if (fav.origin === oldRoute.origin && fav.destination === oldRoute.destination && fav.transportMode === oldRoute.transportMode) {
            return { ...fav, transportMode: updates.transportMode! };
          }
          return fav;
        });
      }
      const newAnomalies = state.anomalies.filter(a => a.routeId !== id);
      const newIgnoredKeys = state.ignoredAnomalyKeys.filter(key => !key.startsWith(`${id}-`));
      return { routes: newRoutes, favorites: newFavorites, anomalies: newAnomalies, ignoredAnomalyKeys: newIgnoredKeys };
    });
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
    get().calculateStatistics();
    get().calculateRouteScores();
    get().detectAnomalies();
  },

  deleteRoute: (id) => {
    set((state) => ({
      routes: state.routes.filter(r => r.id !== id),
      selectedRouteId: state.selectedRouteId === id ? null : state.selectedRouteId,
    }));
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  selectRoute: (id) => {
    set({ selectedRouteId: id });
    saveToStorage({ routes: get().routes, selectedRouteId: id, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },

  setMonthFilter: (active, year, month) => {
    if (active) {
      if (year !== undefined && month !== undefined) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        const currentRange = get().filters.dateRange;
        set((state) => ({
          monthFilterActive: true,
          previousDateRange: state.previousDateRange || { ...currentRange },
          selectedDate: null,
          filters: { ...state.filters, dateRange: { start, end } },
        }));
      }
    } else {
      const prev = get().previousDateRange;
      set((state) => ({
        monthFilterActive: false,
        previousDateRange: null,
        filters: { ...state.filters, dateRange: prev || state.filters.dateRange },
      }));
    }
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
    setTimeout(() => get().calculateStatistics(), 0);
  },

  addLocation: (location) => {
    const newLocation: Location = {
      ...location,
      id: `loc-${Date.now()}`,
    };
    set((state) => ({
      locations: [...state.locations, newLocation],
    }));
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  updateLocation: (id, location) => {
    set((state) => {
      const oldLocation = state.locations.find((loc) => loc.id === id);
      const oldName = oldLocation?.name;
      const newName = location.name;

      let newRoutes = state.routes;
      let newFavorites = state.favorites;

      if (oldName && newName && oldName !== newName) {
        newRoutes = state.routes.map((route) => {
          const updated = { ...route };
          if (route.origin === oldName) {
            updated.origin = newName;
            updated.name = `${newName} → ${route.destination}`;
          }
          if (route.destination === oldName) {
            updated.destination = newName;
            if (route.origin !== oldName) {
              updated.name = `${route.origin} → ${newName}`;
            } else {
              updated.name = `${newName} → ${newName}`;
            }
          }
          return updated;
        });

        newFavorites = state.favorites.map((fav) => {
          const updated = { ...fav };
          if (fav.origin === oldName) {
            updated.origin = newName;
            updated.name = `${newName} → ${fav.destination}`;
          }
          if (fav.destination === oldName) {
            updated.destination = newName;
            if (fav.origin !== oldName) {
              updated.name = `${fav.origin} → ${newName}`;
            } else {
              updated.name = `${newName} → ${newName}`;
            }
          }
          return updated;
        });
      }

      return {
        locations: state.locations.map((loc) =>
          loc.id === id ? { ...loc, ...location } : loc
        ),
        routes: newRoutes,
        favorites: newFavorites,
      };
    });
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  deleteLocation: (id) => {
    set((state) => ({
      locations: state.locations.filter((loc) => loc.id !== id),
    }));
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  getLocationById: (id) => {
    return get().locations.find((loc) => loc.id === id);
  },

  getLocationByName: (name) => {
    return get().locations.find((loc) => loc.name === name);
  },

  getLocationRouteCount: (locationId) => {
    const location = get().getLocationById(locationId);
    if (!location) return 0;
    return get().routes.filter(
      (route) => route.origin === location.name || route.destination === location.name
    ).length;
  },

  getLocationImpact: (locationId) => {
    const location = get().getLocationById(locationId);
    if (!location) {
      return {
        affectedRoutes: [],
        affectedFavorites: [],
        affectedFilters: { origin: false, destination: false },
        affectedAnomalies: [],
        affectedAnomalyIgnoreKeys: [],
        affectedFilterPresets: [],
        affectedRouteScores: [],
        selectedScoreKeyAffected: false,
        totalAffected: 0,
      };
    }

    const locationName = location.name;
    const { routes, favorites, filters, anomalies, ignoredAnomalyKeys, filterPresets, routeScores, selectedScoreKey } = get();

    const affectedRoutes = routes.filter(
      (r) => r.origin === locationName || r.destination === locationName
    );

    const affectedFavorites = favorites.filter(
      (f) => f.origin === locationName || f.destination === locationName
    );

    const affectedFilters = {
      origin: filters.origin === locationName,
      destination: filters.destination === locationName,
    };

    const affectedAnomalies = anomalies.filter(
      (a) => a.route.origin === locationName || a.route.destination === locationName
    );

    const affectedRouteIds = new Set(affectedRoutes.map((r) => r.id));
    const affectedAnomalyIgnoreKeys = ignoredAnomalyKeys.filter((key) => {
      const routeId = key.split('-').slice(0, -1).join('-');
      return affectedRouteIds.has(routeId);
    });

    const affectedFilterPresets = filterPresets.filter((preset) => {
      for (const route of affectedRoutes) {
        if (
          preset.transportModes.includes(route.transportMode) ||
          (preset.isWeekday && isWeekday(route.date)) ||
          (preset.isWeekend && !isWeekday(route.date))
        ) {
          return true;
        }
      }
      return false;
    });

    const affectedRouteScores = routeScores.filter(
      (s) => s.origin === locationName || s.destination === locationName
    );

    let selectedScoreKeyAffected = false;
    if (selectedScoreKey) {
      const [scoreOrigin, scoreDest] = selectedScoreKey.split('-');
      selectedScoreKeyAffected = scoreOrigin === locationName || scoreDest === locationName;
    }

    const totalAffected =
      affectedRoutes.length +
      affectedFavorites.length +
      (affectedFilters.origin ? 1 : 0) +
      (affectedFilters.destination ? 1 : 0) +
      affectedAnomalies.length +
      affectedAnomalyIgnoreKeys.length +
      affectedFilterPresets.length +
      affectedRouteScores.length +
      (selectedScoreKeyAffected ? 1 : 0);

    return {
      affectedRoutes,
      affectedFavorites,
      affectedFilters,
      affectedAnomalies,
      affectedAnomalyIgnoreKeys,
      affectedFilterPresets,
      affectedRouteScores,
      selectedScoreKeyAffected,
      totalAffected,
    };
  },

  renameLocation: (id, newName) => {
    set((state) => {
      const oldLocation = state.locations.find((loc) => loc.id === id);
      const oldName = oldLocation?.name;

      if (!oldName || !newName || oldName === newName) {
        return state;
      }

      const newRoutes = state.routes.map((route) => {
        const updated = { ...route };
        let changed = false;
        if (route.origin === oldName) {
          updated.origin = newName;
          changed = true;
        }
        if (route.destination === oldName) {
          updated.destination = newName;
          changed = true;
        }
        if (changed) {
          updated.name = `${updated.origin} → ${updated.destination}`;
        }
        return updated;
      });

      const newFavorites = state.favorites.map((fav) => {
        const updated = { ...fav };
        let changed = false;
        if (fav.origin === oldName) {
          updated.origin = newName;
          changed = true;
        }
        if (fav.destination === oldName) {
          updated.destination = newName;
          changed = true;
        }
        if (changed) {
          updated.name = `${updated.origin} → ${updated.destination}`;
        }
        return updated;
      });

      const newFilters = { ...state.filters };
      if (state.filters.origin === oldName) {
        newFilters.origin = newName;
      }
      if (state.filters.destination === oldName) {
        newFilters.destination = newName;
      }

      let newSelectedRouteId = state.selectedRouteId;
      if (state.selectedRouteId) {
        const selectedRoute = state.routes.find((r) => r.id === state.selectedRouteId);
        if (selectedRoute && (selectedRoute.origin === oldName || selectedRoute.destination === oldName)) {
          newSelectedRouteId = null;
        }
      }

      const newAnomalies = state.anomalies.map((anomaly) => {
        const updatedRoute = { ...anomaly.route };
        let changed = false;
        if (updatedRoute.origin === oldName) {
          updatedRoute.origin = newName;
          changed = true;
        }
        if (updatedRoute.destination === oldName) {
          updatedRoute.destination = newName;
          changed = true;
        }
        if (changed) {
          updatedRoute.name = `${updatedRoute.origin} → ${updatedRoute.destination}`;
          return { ...anomaly, route: updatedRoute };
        }
        return anomaly;
      });

      return {
        locations: state.locations.map((loc) =>
          loc.id === id ? { ...loc, name: newName } : loc
        ),
        routes: newRoutes,
        favorites: newFavorites,
        filters: newFilters,
        selectedRouteId: newSelectedRouteId,
        anomalies: newAnomalies,
      };
    });
    saveToStorage({
      routes: get().routes,
      selectedRouteId: get().selectedRouteId,
      filters: get().filters,
      favorites: get().favorites,
      locations: get().locations,
      ignoredAnomalyKeys: get().ignoredAnomalyKeys,
    });
    get().calculateStatistics();
    get().calculateRouteScores();
    get().detectAnomalies();
  },

  deleteLocationWithOptions: (id, options) => {
    set((state) => {
      const location = state.locations.find((loc) => loc.id === id);
      if (!location) return state;

      const locationName = location.name;
      let newRoutes = state.routes;
      let newFavorites = state.favorites;
      let newAnomalies = state.anomalies;
      let newIgnoredKeys = state.ignoredAnomalyKeys;
      let newSelectedRouteId = state.selectedRouteId;
      let newSelectedScoreKey = state.selectedScoreKey;

      if (!options.keepRoutes) {
        const affectedRouteIds = new Set(
          state.routes
            .filter((r) => r.origin === locationName || r.destination === locationName)
            .map((r) => r.id)
        );

        newRoutes = state.routes.filter((r) => !affectedRouteIds.has(r.id));
        newFavorites = state.favorites.filter(
          (f) => f.origin !== locationName && f.destination !== locationName
        );
        newAnomalies = state.anomalies.filter((a) => !affectedRouteIds.has(a.routeId));
        newIgnoredKeys = state.ignoredAnomalyKeys.filter((key) => {
          const routeId = key.split('-').slice(0, -1).join('-');
          return !affectedRouteIds.has(routeId);
        });

        if (state.selectedRouteId && affectedRouteIds.has(state.selectedRouteId)) {
          newSelectedRouteId = null;
        }

        if (state.selectedScoreKey) {
          const [origin, dest] = state.selectedScoreKey.split('-');
          if (origin === locationName || dest === locationName) {
            newSelectedScoreKey = null;
          }
        }
      } else if (options.markAsMissing) {
        const missingMarker = `[已删除] ${locationName}`;
        newRoutes = state.routes.map((route) => {
          const updated = { ...route };
          let changed = false;
          if (route.origin === locationName) {
            updated.origin = missingMarker;
            changed = true;
          }
          if (route.destination === locationName) {
            updated.destination = missingMarker;
            changed = true;
          }
          if (changed) {
            updated.name = `${updated.origin} → ${updated.destination}`;
          }
          return updated;
        });

        newFavorites = state.favorites.filter(
          (fav) => fav.origin !== locationName && fav.destination !== locationName
        );

        newAnomalies = state.anomalies.map((anomaly) => {
          const updatedRoute = { ...anomaly.route };
          let changed = false;
          if (updatedRoute.origin === locationName) {
            updatedRoute.origin = missingMarker;
            changed = true;
          }
          if (updatedRoute.destination === locationName) {
            updatedRoute.destination = missingMarker;
            changed = true;
          }
          if (changed) {
            updatedRoute.name = `${updatedRoute.origin} → ${updatedRoute.destination}`;
            return { ...anomaly, route: updatedRoute };
          }
          return anomaly;
        });

        newSelectedRouteId = null;
        newSelectedScoreKey = null;
      }

      const newFilters = { ...state.filters };
      if (state.filters.origin === locationName) {
        newFilters.origin = null;
      }
      if (state.filters.destination === locationName) {
        newFilters.destination = null;
      }

      return {
        locations: state.locations.filter((loc) => loc.id !== id),
        routes: newRoutes,
        favorites: newFavorites,
        anomalies: newAnomalies,
        ignoredAnomalyKeys: newIgnoredKeys,
        filters: newFilters,
        selectedRouteId: newSelectedRouteId,
        selectedScoreKey: newSelectedScoreKey,
      };
    });
    saveToStorage({
      routes: get().routes,
      selectedRouteId: get().selectedRouteId,
      filters: get().filters,
      favorites: get().favorites,
      locations: get().locations,
      ignoredAnomalyKeys: get().ignoredAnomalyKeys,
    });
    get().calculateStatistics();
    get().calculateRouteScores();
    get().detectAnomalies();
  },

  resetLocationsToDefault: () => {
    set({ locations: defaultLocations });
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: defaultLocations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  getFilteredRoutes: () => {
    const { routes, filters, selectedDate, favorites } = get();
    return routes.filter(route => {
      if (selectedDate && route.date !== selectedDate) return false;
      if (filters.isWeekday !== null && isWeekday(route.date) !== filters.isWeekday) return false;
      if (filters.isWeekend !== null && (!isWeekday(route.date)) !== filters.isWeekend) return false;
      if (filters.transportModes.length > 0 && !filters.transportModes.includes(route.transportMode)) return false;
      if (route.date < filters.dateRange.start || route.date > filters.dateRange.end) return false;
      if (filters.origin && route.origin !== filters.origin) return false;
      if (filters.destination && route.destination !== filters.destination) return false;
      if (filters.timeOfDay.length > 0) {
        const routeTimeOfDay = route.timeOfDay || 'unknown';
        if (!filters.timeOfDay.includes(routeTimeOfDay)) return false;
      }
      if (filters.onlyFavorites) {
        const isFav = favorites.some(f => 
          f.origin === route.origin && 
          f.destination === route.destination && 
          f.transportMode === route.transportMode
        );
        if (!isFav) return false;
      }
      return true;
    });
  },

  calculateStatistics: () => {
    const filteredRoutes = get().getFilteredRoutes();
    if (filteredRoutes.length === 0) {
      set({
        statistics: {
          mostStable: null,
          cheapest: null,
          fastest: null,
          avgDuration: 0,
          avgCost: 0,
          totalRoutes: 0,
        },
      });
      return;
    }

    const routeGroups = new Map<string, CommuteRoute[]>();
    filteredRoutes.forEach(route => {
      const key = `${route.origin}-${route.destination}-${route.transportMode}`;
      if (!routeGroups.has(key)) routeGroups.set(key, []);
      routeGroups.get(key)!.push(route);
    });

    let mostStable: CommuteRoute | null = null;
    let minStdDev = Infinity;
    
    routeGroups.forEach((routes) => {
      const durations = routes.map(r => r.duration);
      const stdDev = calculateStandardDeviation(durations);
      if (stdDev < minStdDev) {
        minStdDev = stdDev;
        mostStable = routes[0];
      }
    });

    const cheapest = filteredRoutes.reduce((min, route) => route.cost < min.cost ? route : min, filteredRoutes[0]);
    const fastest = filteredRoutes.reduce((min, route) => route.duration < min.duration ? route : min, filteredRoutes[0]);
    const avgDuration = filteredRoutes.reduce((sum, r) => sum + r.duration, 0) / filteredRoutes.length;
    const avgCost = filteredRoutes.reduce((sum, r) => sum + r.cost, 0) / filteredRoutes.length;

    set({
      statistics: {
        mostStable,
        cheapest,
        fastest,
        avgDuration: Math.round(avgDuration),
        avgCost: Math.round(avgCost * 100) / 100,
        totalRoutes: filteredRoutes.length,
      },
    });
  },

  importRoutes: (newRoutes) => {
    set((state) => ({
      routes: [...state.routes, ...newRoutes.map(sanitizeRoute)],
    }));
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  resetToMockData: () => {
    set({
      routes: mockRoutes,
      selectedRouteId: null,
      filters: defaultFilters,
      locations: defaultLocations,
      monthFilterActive: false,
      previousDateRange: null,
    });
    saveToStorage({ routes: mockRoutes, selectedRouteId: null, filters: defaultFilters, favorites: get().favorites, locations: defaultLocations, ignoredAnomalyKeys: [] });
  },

  addFavorite: (route, note) => {
    const { favorites } = get();
    const exists = favorites.some(f => 
      f.origin === route.origin && 
      f.destination === route.destination && 
      f.transportMode === route.transportMode
    );
    if (exists) return;
    const newFavorite: FavoriteRoute = {
      id: `fav-${Date.now()}`,
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      transportMode: route.transportMode,
      createdAt: new Date().toISOString(),
      note: note || '',
    };
    set((state) => ({
      favorites: [...state.favorites, newFavorite],
    }));
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  removeFavorite: (id) => {
    set((state) => ({
      favorites: state.favorites.filter(f => f.id !== id),
    }));
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  isFavorite: (route) => {
    const { favorites } = get();
    return favorites.some(f => 
      f.origin === route.origin && 
      f.destination === route.destination && 
      f.transportMode === route.transportMode
    );
  },

  toggleFavorite: (route, note) => {
    const { addFavorite, removeFavorite } = get();
    const existing = get().favorites.find(f => 
      f.origin === route.origin && 
      f.destination === route.destination && 
      f.transportMode === route.transportMode
    );
    if (existing) {
      removeFavorite(existing.id);
    } else {
      addFavorite(route, note);
    }
  },

  updateFavoriteNote: (id, note) => {
    set((state) => ({
      favorites: state.favorites.map(f =>
        f.id === id ? { ...f, note } : f
      ),
    }));
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
  },

  setScoringWeights: (weights) => {
    set((state) => ({
      scoringWeights: { ...state.scoringWeights, ...weights },
      currentWeightPreset: 'custom',
    }));
    const newWeights = { ...get().scoringWeights, ...weights };
    saveWeightPresetToStorage('custom', newWeights);
    get().calculateRouteScores();
  },

  applyWeightPreset: (presetType) => {
    const preset = WEIGHT_PRESETS.find(p => p.type === presetType);
    if (!preset) return;
    set({
      scoringWeights: { ...preset.weights },
      currentWeightPreset: presetType,
    });
    saveWeightPresetToStorage(presetType, preset.weights);
    get().calculateRouteScores();
  },

  calculateRouteScores: () => {
    const filteredRoutes = get().getFilteredRoutes();
    const { scoringWeights } = get();

    if (filteredRoutes.length === 0) {
      set({ routeScores: [] });
      return;
    }

    const routeGroups = new Map<string, CommuteRoute[]>();
    filteredRoutes.forEach(route => {
      const key = `${route.origin}-${route.destination}-${route.transportMode}`;
      if (!routeGroups.has(key)) {
        routeGroups.set(key, []);
      }
      routeGroups.get(key)!.push(route);
    });

    let maxDuration = 0;
    let maxCost = 0;
    
    routeGroups.forEach((routes) => {
      const avgDuration = routes.reduce((sum, r) => sum + r.duration, 0) / routes.length;
      const avgCost = routes.reduce((sum, r) => sum + r.cost, 0) / routes.length;
      maxDuration = Math.max(maxDuration, avgDuration);
      maxCost = Math.max(maxCost, avgCost);
    });

    const totalWeight = scoringWeights.time + scoringWeights.cost + scoringWeights.comfort + scoringWeights.stability;

    const scores: RouteScore[] = Array.from(routeGroups.entries()).map(([key, routes]) => {
      const sampleCount = routes.length;
      const avgDuration = routes.reduce((sum, r) => sum + r.duration, 0) / sampleCount;
      const avgCost = routes.reduce((sum, r) => sum + r.cost, 0) / sampleCount;
      const avgCrowd = routes.reduce((sum, r) => sum + r.crowdLevel, 0) / sampleCount;

      const durations = routes.map(r => r.duration);
      const stdDev = calculateStandardDeviation(durations);

      const timeScore = maxDuration > 0 ? Math.max(0, 100 - (avgDuration / maxDuration) * 100) : 50;
      const costScore = maxCost > 0 ? Math.max(0, 100 - (avgCost / maxCost) * 100) : 50;
      const comfortScore = Math.max(0, 100 - (avgCrowd / 5) * 100);
      
      let stabilityScore: number;
      if (sampleCount < 2) {
        stabilityScore = 50;
      } else {
        const meanDuration = avgDuration;
        const cv = meanDuration > 0 ? (stdDev / meanDuration) * 100 : 0;
        stabilityScore = Math.max(0, 100 - cv * 2);
      }

      const totalScore = totalWeight > 0
        ? (
            (timeScore * scoringWeights.time) +
            (costScore * scoringWeights.cost) +
            (comfortScore * scoringWeights.comfort) +
            (stabilityScore * scoringWeights.stability)
          ) / totalWeight
        : 0;

      return {
        key,
        name: routes[0].name,
        origin: routes[0].origin,
        destination: routes[0].destination,
        transportMode: routes[0].transportMode,
        avgDuration: Math.round(avgDuration),
        avgCost: Math.round(avgCost * 100) / 100,
        avgCrowd: Math.round(avgCrowd * 10) / 10,
        stabilityScore: Math.round(stabilityScore),
        sampleCount,
        totalScore: Math.round(totalScore),
        timeScore: Math.round(timeScore),
        costScore: Math.round(costScore),
        comfortScore: Math.round(comfortScore),
      };
    });

    scores.sort((a, b) => b.totalScore - a.totalScore);

    set({ routeScores: scores });
  },

  detectAnomalies: () => {
    const { routes, filters, ignoredAnomalyKeys } = get();
    const anomalies = detectAllAnomalies(routes, filters, ignoredAnomalyKeys);
    set({ anomalies });
  },

  ignoreAnomaly: (anomalyId) => {
    const anomaly = get().anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return;

    const ignoreKey = getAnomalyIgnoreKey(anomaly.routeId, anomaly.type);
    set((state) => ({
      ignoredAnomalyKeys: [...state.ignoredAnomalyKeys, ignoreKey],
      anomalies: state.anomalies.filter(a => a.id !== anomalyId),
    }));
    saveToStorage({
      routes: get().routes,
      selectedRouteId: get().selectedRouteId,
      filters: get().filters,
      favorites: get().favorites,
      locations: get().locations,
      ignoredAnomalyKeys: get().ignoredAnomalyKeys,
    });
  },

  unignoreAnomaly: (anomalyId) => {
    const anomaly = get().anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return;

    const ignoreKey = getAnomalyIgnoreKey(anomaly.routeId, anomaly.type);
    set((state) => ({
      ignoredAnomalyKeys: state.ignoredAnomalyKeys.filter(key => key !== ignoreKey),
    }));
    saveToStorage({
      routes: get().routes,
      selectedRouteId: get().selectedRouteId,
      filters: get().filters,
      favorites: get().favorites,
      locations: get().locations,
      ignoredAnomalyKeys: get().ignoredAnomalyKeys,
    });
    get().detectAnomalies();
  },

  clearIgnoredAnomalies: () => {
    set({ ignoredAnomalyKeys: [] });
    saveToStorage({
      routes: get().routes,
      selectedRouteId: get().selectedRouteId,
      filters: get().filters,
      favorites: get().favorites,
      locations: get().locations,
      ignoredAnomalyKeys: [],
    });
    get().detectAnomalies();
  },

  deleteRouteAndAnomalies: (routeId) => {
    set((state) => ({
      routes: state.routes.filter(r => r.id !== routeId),
      selectedRouteId: state.selectedRouteId === routeId ? null : state.selectedRouteId,
      anomalies: state.anomalies.filter(a => a.routeId !== routeId),
      ignoredAnomalyKeys: state.ignoredAnomalyKeys.filter(key => !key.startsWith(`${routeId}-`)),
    }));
    saveToStorage({
      routes: get().routes,
      selectedRouteId: get().selectedRouteId,
      filters: get().filters,
      favorites: get().favorites,
      locations: get().locations,
      ignoredAnomalyKeys: get().ignoredAnomalyKeys,
    });
  },

  setAnomalyPanelOpen: (open) => {
    set({ isAnomalyPanelOpen: open });
  },

  focusRoute: (routeId) => {
    const route = get().routes.find(r => r.id === routeId);
    if (route) {
      const currentFilters = get().filters;
      const newDateRange = {
        start: route.date < currentFilters.dateRange.start ? route.date : currentFilters.dateRange.start,
        end: route.date > currentFilters.dateRange.end ? route.date : currentFilters.dateRange.end,
      };

      set({
        selectedRouteId: routeId,
        selectedDate: route.date,
        filters: {
          ...currentFilters,
          origin: route.origin,
          destination: route.destination,
          transportModes: [route.transportMode],
          dateRange: newDateRange,
        },
      });
      saveToStorage({
        routes: get().routes,
        selectedRouteId: get().selectedRouteId,
        filters: get().filters,
        favorites: get().favorites,
        locations: get().locations,
        ignoredAnomalyKeys: get().ignoredAnomalyKeys,
      });
    }
  },

  setSelectedScoreKey: (key) => {
    set({ selectedScoreKey: key });
  },

  getScoreExplanation: (key) => {
    const { routeScores } = get();
    const targetScore = routeScores.find(s => s.key === key);
    if (!targetScore) return null;

    const sameODScores = routeScores.filter(
      s => s.origin === targetScore.origin && s.destination === targetScore.destination
    );

    const filteredRoutes = get().getFilteredRoutes();
    const routeGroups = new Map<string, CommuteRoute[]>();
    filteredRoutes.forEach(route => {
      const groupKey = `${route.origin}-${route.destination}-${route.transportMode}`;
      if (!routeGroups.has(groupKey)) routeGroups.set(groupKey, []);
      routeGroups.get(groupKey)!.push(route);
    });

    const targetRoutes = routeGroups.get(key) || [];
    const sampleCount = targetRoutes.length;

    const durations = targetRoutes.map(r => r.duration);
    const stdDev = calculateStandardDeviation(durations);
    const meanDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    let maxDuration = 0;
    let maxCost = 0;
    routeGroups.forEach((routes) => {
      const avgDur = routes.reduce((sum, r) => sum + r.duration, 0) / routes.length;
      const avgC = routes.reduce((sum, r) => sum + r.cost, 0) / routes.length;
      maxDuration = Math.max(maxDuration, avgDur);
      maxCost = Math.max(maxCost, avgC);
    });

    const buildComparisons = (
      dimension: 'time' | 'cost' | 'comfort' | 'stability'
    ): DimensionComparison[] => {
      return sameODScores.map(s => {
        let rawValue = 0;
        let score = 0;
        if (dimension === 'time') {
          rawValue = s.avgDuration;
          score = s.timeScore;
        } else if (dimension === 'cost') {
          rawValue = s.avgCost;
          score = s.costScore;
        } else if (dimension === 'comfort') {
          rawValue = s.avgCrowd;
          score = s.comfortScore;
        } else {
          rawValue = s.stabilityScore;
          score = s.stabilityScore;
        }
        const targetRaw = dimension === 'time' ? targetScore.avgDuration
          : dimension === 'cost' ? targetScore.avgCost
          : dimension === 'comfort' ? targetScore.avgCrowd
          : targetScore.stabilityScore;
        return {
          transportMode: s.transportMode,
          label: s.transportMode === targetScore.transportMode ? '当前方案' : '',
          score,
          rawValue,
          diff: dimension === 'comfort' || dimension === 'stability'
            ? rawValue - targetRaw
            : targetRaw - rawValue,
        };
      }).sort((a, b) => b.score - a.score);
    };

    const timeExplanation: DimensionExplanation = {
      dimension: 'time',
      score: targetScore.timeScore,
      formula: maxDuration > 0
        ? `100 - (${targetScore.avgDuration} ÷ ${Math.round(maxDuration)}) × 100 = ${targetScore.timeScore}`
        : '数据不足，默认50分',
      rawValue: targetScore.avgDuration,
      rawUnit: '分钟',
      comparisons: buildComparisons('time'),
      sampleCount,
      sampleWarning: sampleCount < 3 ? `仅${sampleCount}次记录，时间均值可能不稳定` : null,
    };

    const costExplanation: DimensionExplanation = {
      dimension: 'cost',
      score: targetScore.costScore,
      formula: maxCost > 0
        ? `100 - (${targetScore.avgCost} ÷ ${Math.round(maxCost * 100) / 100}) × 100 = ${targetScore.costScore}`
        : '数据不足，默认50分',
      rawValue: targetScore.avgCost,
      rawUnit: '元',
      comparisons: buildComparisons('cost'),
      sampleCount,
      sampleWarning: sampleCount < 3 ? `仅${sampleCount}次记录，费用均值可能不稳定` : null,
    };

    const comfortExplanation: DimensionExplanation = {
      dimension: 'comfort',
      score: targetScore.comfortScore,
      formula: `100 - (${targetScore.avgCrowd} ÷ 5) × 100 = ${targetScore.comfortScore}`,
      rawValue: targetScore.avgCrowd,
      rawUnit: '/5',
      comparisons: buildComparisons('comfort'),
      sampleCount,
      sampleWarning: sampleCount < 3 ? `仅${sampleCount}次记录，拥挤度均值可能不稳定` : null,
    };

    const cv = meanDuration > 0 ? (stdDev / meanDuration) * 100 : 0;
    const stabilityExplanation: DimensionExplanation = {
      dimension: 'stability',
      score: targetScore.stabilityScore,
      formula: sampleCount < 2
        ? '样本不足2次，默认50分（无法计算变异系数）'
        : `变异系数 ${cv.toFixed(1)}% → 100 - ${cv.toFixed(1)} × 2 = ${targetScore.stabilityScore}`,
      rawValue: sampleCount < 2 ? 0 : Math.round(stdDev),
      rawUnit: sampleCount < 2 ? '' : '分钟标准差',
      comparisons: buildComparisons('stability'),
      sampleCount,
      sampleWarning: sampleCount < 2
        ? '仅1次记录，无法评估稳定性，默认50分不具备参考意义'
        : sampleCount < 5
        ? `仅${sampleCount}次记录，稳定性评估可能不够可靠`
        : null,
    };

    const overallWarning = sampleCount < 2
      ? '仅有1次通勤记录，所有评分均基于单次数据，不具备统计意义，请勿将其作为稳定结论'
      : sampleCount < 5
      ? `共${sampleCount}次记录，评分有一定参考价值但样本偏少，结论可能随新数据变化`
      : null;

    return {
      scoreKey: key,
      name: targetScore.name,
      origin: targetScore.origin,
      destination: targetScore.destination,
      transportMode: targetScore.transportMode,
      totalScore: targetScore.totalScore,
      dimensions: [timeExplanation, costExplanation, comfortExplanation, stabilityExplanation],
      sameODScores,
      sampleWarning: overallWarning,
    };
  },

  saveFilterPreset: (name) => {
    const { filters } = get();
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name,
      dateRange: { ...filters.dateRange },
      isWeekday: filters.isWeekday,
      isWeekend: filters.isWeekend,
      transportModes: [...filters.transportModes],
      timeOfDay: [...filters.timeOfDay],
      onlyFavorites: filters.onlyFavorites,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      filterPresets: [...state.filterPresets, newPreset],
    }));
    savePresetsToStorage(get().filterPresets);
  },

  deleteFilterPreset: (id) => {
    set((state) => ({
      filterPresets: state.filterPresets.filter(p => p.id !== id),
    }));
    savePresetsToStorage(get().filterPresets);
  },

  applyFilterPreset: (id) => {
    const preset = get().filterPresets.find(p => p.id === id);
    if (!preset) return;
    set((state) => ({
      filters: {
        ...state.filters,
        dateRange: { ...preset.dateRange },
        isWeekday: preset.isWeekday,
        isWeekend: preset.isWeekend,
        transportModes: [...preset.transportModes],
        timeOfDay: [...preset.timeOfDay],
        onlyFavorites: preset.onlyFavorites,
      },
    }));
    saveToStorage({ routes: get().routes, selectedRouteId: get().selectedRouteId, filters: get().filters, favorites: get().favorites, locations: get().locations, ignoredAnomalyKeys: get().ignoredAnomalyKeys });
    setTimeout(() => get().calculateStatistics(), 0);
  },

  createSnapshot: (name, description = '') => {
    const { routes, favorites, locations, filters, ignoredAnomalyKeys, scoringWeights, snapshots } = get();
    
    const sortedDates = routes.map(r => r.date).sort();
    const dateRange = sortedDates.length > 0 
      ? { start: sortedDates[0], end: sortedDates[sortedDates.length - 1] }
      : null;

    const newSnapshot: Snapshot = {
      id: `snap-${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      data: {
        routes: JSON.parse(JSON.stringify(routes)),
        favorites: JSON.parse(JSON.stringify(favorites)),
        locations: JSON.parse(JSON.stringify(locations)),
        filters: JSON.parse(JSON.stringify(filters)),
        ignoredAnomalyKeys: JSON.parse(JSON.stringify(ignoredAnomalyKeys)),
        scoringWeights: JSON.parse(JSON.stringify(scoringWeights)),
      },
      summary: {
        routeCount: routes.length,
        favoriteCount: favorites.length,
        locationCount: locations.length,
        dateRange,
      },
    };

    const newSnapshots = [...snapshots, newSnapshot];
    set({ snapshots: newSnapshots });
    saveSnapshotsToStorage(newSnapshots);
  },

  deleteSnapshot: (id) => {
    const newSnapshots = get().snapshots.filter(s => s.id !== id);
    set({ snapshots: newSnapshots });
    saveSnapshotsToStorage(newSnapshots);
  },

  restoreSnapshot: (id) => {
    const snapshot = get().snapshots.find(s => s.id === id);
    if (!snapshot) return;

    const { data } = snapshot;
    const sanitizedRoutes = data.routes.map(sanitizeRoute);

    set({
      routes: sanitizedRoutes,
      favorites: data.favorites,
      locations: data.locations,
      filters: data.filters,
      ignoredAnomalyKeys: data.ignoredAnomalyKeys,
      scoringWeights: data.scoringWeights,
      selectedRouteId: null,
      selectedDate: null,
      selectedScoreKey: null,
      monthFilterActive: false,
      previousDateRange: null,
      anomalies: [],
      routeScores: [],
    });

    saveToStorage({
      routes: sanitizedRoutes,
      selectedRouteId: null,
      filters: data.filters,
      favorites: data.favorites,
      locations: data.locations,
      ignoredAnomalyKeys: data.ignoredAnomalyKeys,
    });
    saveWeightPresetToStorage('custom', data.scoringWeights);

    setTimeout(() => {
      get().calculateStatistics();
      get().calculateRouteScores();
      get().detectAnomalies();
    }, 0);
  },

  updateSnapshot: (id, updates) => {
    const newSnapshots = get().snapshots.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    set({ snapshots: newSnapshots });
    saveSnapshotsToStorage(newSnapshots);
  },
}));
