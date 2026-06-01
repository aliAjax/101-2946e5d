import { create } from 'zustand';
import { CommuteRoute, FilterOptions, TransportMode, CommuteStatistics } from '../types/commute';
import { mockRoutes } from '../data/mockData';

interface CommuteState {
  routes: CommuteRoute[];
  selectedRouteId: string | null;
  filters: FilterOptions;
  statistics: CommuteStatistics;
  setRoutes: (routes: CommuteRoute[]) => void;
  addRoute: (route: CommuteRoute) => void;
  deleteRoute: (id: string) => void;
  selectRoute: (id: string | null) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  getFilteredRoutes: () => CommuteRoute[];
  calculateStatistics: () => void;
  importRoutes: (routes: CommuteRoute[]) => void;
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

export const useCommuteStore = create<CommuteState>((set, get) => ({
  routes: mockRoutes,
  selectedRouteId: null,
  filters: {
    isWeekday: null,
    isWeekend: null,
    transportModes: [],
    dateRange: { start: '2024-01-01', end: '2024-12-31' },
  },
  statistics: {
    mostStable: null,
    cheapest: null,
    fastest: null,
    avgDuration: 0,
    avgCost: 0,
    totalRoutes: 0,
  },

  setRoutes: (routes) => set({ routes }),

  addRoute: (route) => set((state) => ({
    routes: [...state.routes, route],
  })),

  deleteRoute: (id) => set((state) => ({
    routes: state.routes.filter(r => r.id !== id),
    selectedRouteId: state.selectedRouteId === id ? null : state.selectedRouteId,
  })),

  selectRoute: (id) => set({ selectedRouteId: id }),

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters },
  })),

  getFilteredRoutes: () => {
    const { routes, filters } = get();
    return routes.filter(route => {
      if (filters.isWeekday !== null && isWeekday(route.date) !== filters.isWeekday) return false;
      if (filters.isWeekend !== null && (!isWeekday(route.date)) !== filters.isWeekend) return false;
      if (filters.transportModes.length > 0 && !filters.transportModes.includes(route.transportMode)) return false;
      if (route.date < filters.dateRange.start || route.date > filters.dateRange.end) return false;
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

  importRoutes: (newRoutes) => set((state) => ({
    routes: [...state.routes, ...newRoutes],
  })),
}));
