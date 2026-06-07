import { Location, LocationImpact, CommuteRoute, FavoriteRoute, FilterOptions, AnomalyRecord, FilterPreset, RouteScore } from '../types/commute';
import { isWeekday } from './statistics';

interface GetLocationImpactParams {
  location: Location | undefined;
  routes: CommuteRoute[];
  favorites: FavoriteRoute[];
  filters: FilterOptions;
  anomalies: AnomalyRecord[];
  ignoredAnomalyKeys: string[];
  filterPresets: FilterPreset[];
  routeScores: RouteScore[];
  selectedScoreKey: string | null;
}

export function getLocationImpact(params: GetLocationImpactParams): LocationImpact {
  const { location, routes, favorites, filters, anomalies, ignoredAnomalyKeys, filterPresets, routeScores, selectedScoreKey } = params;

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
}
