import { CommuteRoute, CommuteStatistics } from '../types/commute';

export function isWeekday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

export function calculateStatistics(filteredRoutes: CommuteRoute[]): CommuteStatistics {
  if (filteredRoutes.length === 0) {
    return {
      mostStable: null,
      cheapest: null,
      fastest: null,
      avgDuration: 0,
      avgCost: 0,
      totalRoutes: 0,
    };
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

  return {
    mostStable,
    cheapest,
    fastest,
    avgDuration: Math.round(avgDuration),
    avgCost: Math.round(avgCost * 100) / 100,
    totalRoutes: filteredRoutes.length,
  };
}
