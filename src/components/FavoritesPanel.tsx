import { useCommuteStore } from '../store/commuteStore';
import { transportModeColors, transportModeLabels } from '../types/commute';
import { Star, MapPin, X, Filter } from 'lucide-react';

export function FavoritesPanel() {
  const { favorites, removeFavorite, setFilters, filters, calculateStatistics } = useCommuteStore();

  const handleFilterByFavorite = (favorite: typeof favorites[0]) => {
    setFilters({
      transportModes: [favorite.transportMode],
      onlyFavorites: true,
      origin: favorite.origin,
      destination: favorite.destination,
    });
    setTimeout(calculateStatistics, 0);
  };

  const handleShowAllFavorites = () => {
    setFilters({
      onlyFavorites: true,
      transportModes: [],
      origin: null,
      destination: null,
    });
    setTimeout(calculateStatistics, 0);
  };

  const handleClearFilter = () => {
    setFilters({
      onlyFavorites: false,
      origin: null,
      destination: null,
    });
    setTimeout(calculateStatistics, 0);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <h2 className="text-lg font-semibold text-gray-800">路线收藏夹</h2>
        </div>
        {favorites.length > 0 && (
          <div className="flex items-center gap-2">
            {filters.onlyFavorites ? (
              <button
                onClick={handleClearFilter}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <X className="w-3 h-3" />
                取消筛选
              </button>
            ) : (
              <button
                onClick={handleShowAllFavorites}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
              >
                <Filter className="w-3 h-3" />
                只看收藏
              </button>
            )}
          </div>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">暂无收藏的路线</p>
          <p className="text-xs text-gray-400 mt-1">在路线详情中点击收藏按钮添加</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-auto pr-1">
          {favorites.map((favorite) => {
            const color = transportModeColors[favorite.transportMode];
            
            return (
              <div
                key={favorite.id}
                className="group p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div 
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => handleFilterByFavorite(favorite)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-medium" style={{ color }}>
                        {transportModeLabels[favorite.transportMode]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-800 mb-1 truncate">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{favorite.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {favorite.origin} → {favorite.destination}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(favorite.id);
                    }}
                    className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="取消收藏"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {favorites.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            共收藏 {favorites.length} 条路线 · 点击可快速筛选
          </p>
        </div>
      )}
    </div>
  );
}
