import { Snapshot, SnapshotData, CommuteRoute, FavoriteRoute, Location, FilterOptions, ScoringWeights } from '../types/commute';

export interface CreateSnapshotParams {
  name: string;
  description?: string;
  routes: CommuteRoute[];
  favorites: FavoriteRoute[];
  locations: Location[];
  filters: FilterOptions;
  ignoredAnomalyKeys: string[];
  scoringWeights: ScoringWeights;
}

export function createSnapshotData(params: CreateSnapshotParams): Snapshot {
  const { name, description = '', routes, favorites, locations, filters, ignoredAnomalyKeys, scoringWeights } = params;

  const sortedDates = routes.map(r => r.date).sort();
  const dateRange = sortedDates.length > 0
    ? { start: sortedDates[0], end: sortedDates[sortedDates.length - 1] }
    : null;

  const data: SnapshotData = {
    routes: JSON.parse(JSON.stringify(routes)),
    favorites: JSON.parse(JSON.stringify(favorites)),
    locations: JSON.parse(JSON.stringify(locations)),
    filters: JSON.parse(JSON.stringify(filters)),
    ignoredAnomalyKeys: JSON.parse(JSON.stringify(ignoredAnomalyKeys)),
    scoringWeights: JSON.parse(JSON.stringify(scoringWeights)),
  };

  return {
    id: `snap-${Date.now()}`,
    name,
    description,
    createdAt: new Date().toISOString(),
    data,
    summary: {
      routeCount: routes.length,
      favoriteCount: favorites.length,
      locationCount: locations.length,
      dateRange,
    },
  };
}
