import { useMemo } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeColors, transportModeLabels } from '../types/commute';
import { List, Clock, DollarSign, Users, MapPin } from 'lucide-react';

export function RouteList() {
  const { getFilteredRoutes, selectedRouteId, selectRoute } = useCommuteStore();
  const filteredRoutes = getFilteredRoutes();

  const displayedRoutes = useMemo(() => {
    return filteredRoutes.slice(0, 50);
  }, [filteredRoutes]);

  const isRouteHighlighted = (route: typeof filteredRoutes[0]) => {
    if (!selectedRouteId) return true;
    const selectedRoute = filteredRoutes.find(r => r.id === selectedRouteId);
    if (!selectedRoute) return true;
    return route.transportMode === selectedRoute.transportMode &&
           route.origin === selectedRoute.origin &&
           route.destination === selectedRoute.destination;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-gray-800">路线列表</h2>
        </div>
        <span className="text-xs text-gray-500">
          显示 {displayedRoutes.length} / {filteredRoutes.length} 条
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-auto pr-2">
        {displayedRoutes.map((route) => {
          const isSelected = route.id === selectedRouteId;
          const isHighlighted = isRouteHighlighted(route);
          
          return (
            <div
              key={route.id}
              onClick={() => selectRoute(isSelected ? null : route.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isHighlighted
                    ? 'border-transparent bg-gray-50 hover:bg-gray-100'
                    : 'border-transparent bg-gray-50 opacity-40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: transportModeColors[route.transportMode] }}
                  />
                  <span className="text-xs font-medium text-gray-600">
                    {transportModeLabels[route.transportMode]}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{route.date}</span>
              </div>
              
              <div className="flex items-center gap-1 text-sm font-medium text-gray-800 mb-2">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span>{route.name}</span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{route.duration}分钟</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>¥{route.cost}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{'●'.repeat(route.crowdLevel)}{'○'.repeat(5 - route.crowdLevel)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
