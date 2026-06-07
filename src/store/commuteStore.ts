import { create } from 'zustand';
import { CommuteRoute, FilterOptions, CommuteStatistics, FavoriteRoute, ScoringWeights, RouteScore, Location, AnomalyRecord, ScoreExplanation, FilterPreset, WeightPresetType, WEIGHT_PRESETS, LocationImpact, Snapshot } from '../types/commute';
import { mockRoutes, defaultLocations } from '../data/mockData';
import { detectAllAnomalies, getAnomalyIgnoreKey } from '../lib/anomalyDetector';
import {
  loadFromStorage,
  saveToStorage,
  loadPresetsFromStorage,
  savePresetsToStorage,
  loadWeightPresetFromStorage,
  saveWeightPresetToStorage,
  loadSnapshotsFromStorage,
  saveSnapshotsToStorage,
  sanitizeRoute,
} from './storage';
import {
  isWeekday,
  calculateStatistics,
} from './statistics';
import {
  calculateRouteScores,
  getScoreExplanation as computeScoreExplanation,
} from './scoring';
import {
  getLocationImpact as computeLocationImpact,
} from './locationImpact';
import {
  createSnapshotData,
} from './snapshots';

export { migrateLegacyAnomalyId } from './storage';

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

const defaultScoringWeights: ScoringWeights = {
  time: 25,
  cost: 25,
  comfort: 25,
  stability: 25,
};

const persistedWeightData = loadWeightPresetFromStorage();

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
    const { routes, favorites, filters, anomalies, ignoredAnomalyKeys, filterPresets, routeScores, selectedScoreKey } = get();
    return computeLocationImpact({
      location,
      routes,
      favorites,
      filters,
      anomalies,
      ignoredAnomalyKeys,
      filterPresets,
      routeScores,
      selectedScoreKey,
    });
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
    set({
      statistics: calculateStatistics(filteredRoutes),
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
    set({ routeScores: calculateRouteScores(filteredRoutes, scoringWeights) });
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
    const filteredRoutes = get().getFilteredRoutes();
    return computeScoreExplanation(key, routeScores, filteredRoutes);
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

    const newSnapshot = createSnapshotData({
      name,
      description,
      routes,
      favorites,
      locations,
      filters,
      ignoredAnomalyKeys,
      scoringWeights,
    });

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
