import { useMemo, useState } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeColors, transportModeLabels } from '../types/commute';
import { List, Clock, DollarSign, Users, MapPin, Star, X } from 'lucide-react';

export function RouteList() {
  const { getFilteredRoutes, selectedRouteId, selectRoute, isFavorite, toggleFavorite } = useCommuteStore();
  const filteredRoutes = getFilteredRoutes();
  const [noteRouteId, setNoteRouteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

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
          const isFav = isFavorite(route);
          
          return (
            <div
              key={route.id}
              onClick={() => selectRoute(isSelected ? null : route.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all border-2 group ${
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFav) {
                        toggleFavorite(route);
                      } else {
                        setNoteRouteId(route.id);
                        setNoteText('');
                      }
                    }}
                    className={`transition-colors ${
                      isFav ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                    }`}
                    title={isFav ? '取消收藏' : '收藏此路线'}
                  >
                    <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
                  </button>
                  <span className="text-xs text-gray-400">{route.date}</span>
                </div>
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

      {noteRouteId && (() => {
        const target = displayedRoutes.find(r => r.id === noteRouteId);
        if (!target) { setNoteRouteId(null); return null; }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setNoteRouteId(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="text-base font-semibold text-gray-800">收藏路线</h3>
                </div>
                <button
                  onClick={() => setNoteRouteId(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  {target.origin} → {target.destination}（{transportModeLabels[target.transportMode]}）
                </div>
                <label className="block text-xs text-gray-500 mb-1">添加备注（可选）</label>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="例如：早高峰首选、雨天备选…"
                  maxLength={100}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm resize-none"
                  autoFocus
                />
                <div className="text-right text-xs text-gray-400 mt-1">{noteText.length}/100</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setNoteRouteId(null)}
                  className="flex-1 py-2 text-sm bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    toggleFavorite(target, noteText);
                    setNoteRouteId(null);
                  }}
                  className="flex-1 py-2 text-sm bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-1"
                >
                  <Star className="w-4 h-4" />
                  收藏
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
