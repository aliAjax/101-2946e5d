import { create } from 'zustand';
import { CommuteRoute, FilterOptions, CommuteStatistics, FavoriteRoute, ScoringWeights, RouteScore, Location, AnomalyRecord } from '../types/commute';
import { mockRoutes, defaultLocations } from '../data/mockData';
import { detectAllAnomalies, getAnomalyIgnoreKey } from '../lib/anomalyDetector';

const STORAGE_KEY = 'commute-data';

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

function sanitizeRoute(route: CommuteRoute): CommuteRoute {
  return {
    ...route,
    transportMode: VALID_TRANSPORT_MODES.includes(route.transportMode) ? route.transportMode : 'subway',
    timeOfDay: VALID_TIME_OF_DAY.includes(route.timeOfDay) ? route.timeOfDay : 'unknown',
  };
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
      
      const legacyData = data as PersistedData & { ignoredAnomalyIds?: string[] };
      if (legacyData.ignoredAnomalyIds && legacyData.ignoredAnomalyIds.length > 0) {
        const migratedKeys = legacyData.ignoredAnomalyIds.map(id => {
          const match = id.match(/^anomaly-(.+)-([^-]+)(?:-\d+)?$/);
          if (match) {
            return `${match[1]}-${match[2]}`;
          }
          return id;
        });
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
  routeScores: RouteScore[];
  locations: Location[];
  anomalies: AnomalyRecord[];
  ignoredAnomalyKeys: string[];
  isAnomalyPanelOpen: boolean;
  setRoutes: (routes: CommuteRoute[]) => void;
  addRoute: (route: CommuteRoute) => void;
  deleteRoute: (id: string) => void;
  selectRoute: (id: string | null) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  setSelectedDate: (date: string | null) => void;
  getFilteredRoutes: () => CommuteRoute[];
  calculateStatistics: () => void;
  importRoutes: (routes: CommuteRoute[]) => void;
  resetToMockData: () => void;
  addFavorite: (route: CommuteRoute) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (route: CommuteRoute) => boolean;
  toggleFavorite: (route: CommuteRoute) => void;
  setScoringWeights: (weights: Partial<ScoringWeights>) => void;
  calculateRouteScores: () => void;
  addLocation: (location: Omit<Location, 'id'>) => void;
  updateLocation: (id: string, location: Partial<Omit<Location, 'id'>>) => void;
  deleteLocation: (id: string) => void;
  getLocationById: (id: string) => Location | undefined;
  getLocationByName: (name: string) => Location | undefined;
  getLocationRouteCount: (locationId: string) => number;
  resetLocationsToDefault: () => void;
  detectAnomalies: () => void;
  ignoreAnomaly: (anomalyId: string) => void;
  unignoreAnomaly: (anomalyId: string) => void;
  clearIgnoredAnomalies: () => void;
  deleteRouteAndAnomalies: (routeId: string) => void;
  setAnomalyPanelOpen: (open: boolean) => void;
  focusRoute: (routeId: string) => void;
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
  scoringWeights: defaultScoringWeights,
  routeScores: [],
  locations: persistedData?.locations || defaultLocations,
  anomalies: [],
  ignoredAnomalyKeys: persistedData?.ignoredAnomalyKeys || [],
  isAnomalyPanelOpen: false,

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
          let updated = { ...route };
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
          let updated = { ...fav };
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
    });
    saveToStorage({ routes: mockRoutes, selectedRouteId: null, filters: defaultFilters, favorites: get().favorites, locations: defaultLocations, ignoredAnomalyKeys: [] });
  },

  addFavorite: (route) => {
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

  toggleFavorite: (route) => {
    const { addFavorite, removeFavorite } = get();
    const existing = get().favorites.find(f => 
      f.origin === route.origin && 
      f.destination === route.destination && 
      f.transportMode === route.transportMode
    );
    if (existing) {
      removeFavorite(existing.id);
    } else {
      addFavorite(route);
    }
  },

  setScoringWeights: (weights) => {
    set((state) => ({
      scoringWeights: { ...state.scoringWeights, ...weights },
    }));
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
      let newDateRange = { ...currentFilters.dateRange };
      
      if (route.date < currentFilters.dateRange.start) {
        newDateRange.start = route.date;
      }
      if (route.date > currentFilters.dateRange.end) {
        newDateRange.end = route.date;
      }
      
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
}));
