import { useMemo } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeColors, transportModeLabels } from '../types/commute';
import { getRouteCoords } from '../lib/utils';
import { MapPin, AlertTriangle } from 'lucide-react';

export function MapView() {
  const { getFilteredRoutes, selectedRouteId, selectRoute, locations } = useCommuteStore();
  const filteredRoutes = getFilteredRoutes();

  const selectedRoute = useMemo(() => 
    filteredRoutes.find(r => r.id === selectedRouteId),
    [filteredRoutes, selectedRouteId]
  );

  const allLocations = useMemo(() => {
    const locs = new Map<string, { lat: number; lng: number }>();
    filteredRoutes.forEach(route => {
      const coords = getRouteCoords(route, locations);
      if (coords) {
        locs.set(route.origin, coords.originCoords);
        locs.set(route.destination, coords.destCoords);
      }
    });
    return locs;
  }, [filteredRoutes, locations]);

  const { minLat, maxLat, minLng, maxLng } = useMemo(() => {
    const latValues = Array.from(allLocations.values()).map(l => l.lat);
    const lngValues = Array.from(allLocations.values()).map(l => l.lng);
    return {
      minLat: Math.min(...latValues) - 0.02,
      maxLat: Math.max(...latValues) + 0.02,
      minLng: Math.min(...lngValues) - 0.02,
      maxLng: Math.max(...lngValues) + 0.02,
    };
  }, [allLocations]);

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;

  function toScreenCoords(lat: number, lng: number, width: number, height: number) {
    const x = ((lng - minLng) / lngRange) * (width - 80) + 40;
    const y = ((maxLat - lat) / latRange) * (height - 80) + 40;
    return { x, y };
  }

  const uniqueRoutes = useMemo(() => {
    const unique = new Map<string, { route: typeof filteredRoutes[0]; count: number; coords: ReturnType<typeof getRouteCoords> }>();
    filteredRoutes.forEach(route => {
      const key = `${route.origin}-${route.destination}-${route.transportMode}`;
      if (!unique.has(key)) {
        const coords = getRouteCoords(route, locations);
        unique.set(key, { route, count: 0, coords });
      }
      unique.get(key)!.count += 1;
    });
    return unique;
  }, [filteredRoutes, locations]);

  const isRouteHighlighted = (route: typeof filteredRoutes[0]) => {
    if (!selectedRoute) return true;
    return route.transportMode === selectedRoute.transportMode &&
           route.origin === selectedRoute.origin &&
           route.destination === selectedRoute.destination;
  };

  const invalidRouteCount = useMemo(() => {
    return filteredRoutes.filter(route => !getRouteCoords(route, locations)).length;
  }, [filteredRoutes, locations]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-800">路线地图</h2>
        {selectedRoute && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            已选中: {selectedRoute.name}
          </span>
        )}
      </div>
      
      {invalidRouteCount > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-medium">有 {invalidRouteCount} 条路线的地点不在地点库中</p>
            <p className="text-amber-600 mt-0.5">这些路线不会在地图上显示，请在地点管理中添加对应地点</p>
          </div>
        </div>
      )}
      
      <div className="relative w-full h-80 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden border border-gray-200">
        <svg className="w-full h-full" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {Array.from(uniqueRoutes.values()).map(({ route, count, coords }) => {
            if (!coords) return null;
            const origin = toScreenCoords(coords.originCoords.lat, coords.originCoords.lng, 400, 320);
            const dest = toScreenCoords(coords.destCoords.lat, coords.destCoords.lng, 400, 320);
            const highlighted = isRouteHighlighted(route);
            const color = transportModeColors[route.transportMode];
            const strokeWidth = highlighted ? Math.min(2 + count * 0.5, 6) : 2;
            
            return (
              <g 
                key={`${route.origin}-${route.destination}-${route.transportMode}`} 
                onClick={() => selectRoute(highlighted && selectedRoute ? null : route.id)} 
                className="cursor-pointer transition-all"
              >
                <line
                  x1={origin.x}
                  y1={origin.y}
                  x2={dest.x}
                  y2={dest.y}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={highlighted ? 1 : 0.2}
                  strokeDasharray={route.transportMode === 'walk' ? '5,5' : 'none'}
                  className="transition-all duration-300"
                />
                <polygon
                  points={`${dest.x},${dest.y} ${dest.x - 6},${dest.y - 12} ${dest.x + 6},${dest.y - 12}`}
                  fill={color}
                  opacity={highlighted ? 1 : 0.3}
                  transform={`rotate(${Math.atan2(dest.y - origin.y, dest.x - origin.x) * 180 / Math.PI + 90}, ${dest.x}, ${dest.y})`}
                  className="transition-all duration-300"
                />
                {highlighted && count > 1 && (
                  <text
                    x={(origin.x + dest.x) / 2}
                    y={(origin.y + dest.y) / 2 - 8}
                    textAnchor="middle"
                    className="text-xs fill-gray-700 font-bold"
                  >
                    {count}次
                  </text>
                )}
              </g>
            );
          })}
          
          {Array.from(allLocations.entries()).map(([name, coords]) => {
            const pos = toScreenCoords(coords.lat, coords.lng, 400, 320);
            return (
              <g key={name}>
                <circle cx={pos.x} cy={pos.y} r="8" fill="#3B82F6" stroke="white" strokeWidth="2" />
                <text
                  x={pos.x}
                  y={pos.y + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 font-medium"
                >
                  {name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(transportModeLabels).map(([mode, label]) => (
          <div key={mode} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: transportModeColors[mode as keyof typeof transportModeColors] }}
            />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
