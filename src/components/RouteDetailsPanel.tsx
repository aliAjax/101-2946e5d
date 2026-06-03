import { useCommuteStore } from '../store/commuteStore';
import { transportModeColors, transportModeLabels, timeOfDayColors, timeOfDayLabels } from '../types/commute';
import { MapPin, Clock, DollarSign, Users, Calendar, X, Trophy, Zap, Award, Star } from 'lucide-react';

export function RouteDetailsPanel() {
  const { getFilteredRoutes, selectedRouteId, selectRoute, statistics, deleteRoute, isFavorite, toggleFavorite } = useCommuteStore();
  const filteredRoutes = getFilteredRoutes();
  const selectedRoute = filteredRoutes.find(r => r.id === selectedRouteId);
  const isCurrentFavorite = selectedRoute ? isFavorite(selectedRoute) : false;

  const crowdLevelText = (level: number) => {
    const texts = ['', '非常宽松', '宽松', '适中', '拥挤', '非常拥挤'];
    return texts[level] || '未知';
  };

  const crowdLevelColor = (level: number) => {
    const colors = ['', 'text-green-600', 'text-green-500', 'text-yellow-600', 'text-orange-600', 'text-red-600'];
    return colors[level] || 'text-gray-600';
  };

  const isWeekend = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-800">路线详情</h2>
        </div>
        {selectedRoute && (
          <button
            onClick={() => selectRoute(null)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {selectedRoute ? (
        <div className="flex-1 overflow-auto">
          <div
            className="p-4 rounded-lg mb-4 border-2"
            style={{
              backgroundColor: `${transportModeColors[selectedRoute.transportMode]}10`,
              borderColor: transportModeColors[selectedRoute.transportMode],
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: transportModeColors[selectedRoute.transportMode] }}
              >
                {transportModeLabels[selectedRoute.transportMode]}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: timeOfDayColors[selectedRoute.timeOfDay || 'unknown'] }}
                >
                  {timeOfDayLabels[selectedRoute.timeOfDay || 'unknown']}
                </span>
                <span className="text-xs text-gray-500">
                  {isWeekend(selectedRoute.date) ? '周末' : '工作日'}
                </span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedRoute.name}</h3>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {selectedRoute.date}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">耗时</span>
              </div>
              <div className="text-xl font-bold text-blue-700">{selectedRoute.duration} 分钟</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium">费用</span>
              </div>
              <div className="text-xl font-bold text-green-700">¥{selectedRoute.cost}</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg col-span-2">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">拥挤程度</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-6 h-2 rounded-full transition-colors ${
                        level <= selectedRoute.crowdLevel
                          ? 'bg-amber-500'
                          : 'bg-amber-200'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-sm font-medium ${crowdLevelColor(selectedRoute.crowdLevel)}`}>
                  {crowdLevelText(selectedRoute.crowdLevel)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">路线信息</div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>出发地</span>
                <span className="font-medium text-gray-800">{selectedRoute.origin}</span>
              </div>
              <div className="flex justify-between">
                <span>目的地</span>
                <span className="font-medium text-gray-800">{selectedRoute.destination}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => selectedRoute && toggleFavorite(selectedRoute)}
            className={`w-full mt-4 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
              isCurrentFavorite
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Star className={`w-4 h-4 ${isCurrentFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
            {isCurrentFavorite ? '取消收藏' : '收藏此路线'}
          </button>

          <button
            onClick={() => deleteRoute(selectedRoute.id)}
            className="w-full mt-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            删除此记录
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">点击地图或选择路线查看详情</p>
          </div>

          <div className="border-t pt-4 mt-auto">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-800">最佳路线推荐</h3>
            </div>

            <div className="space-y-3">
              {statistics.mostStable && (
                <div
                  className="p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => selectRoute(statistics.mostStable!.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">最稳定</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800">{statistics.mostStable.name}</div>
                  <div className="text-xs text-gray-500">
                    {transportModeLabels[statistics.mostStable.transportMode]} · {statistics.mostStable.duration}分钟
                  </div>
                </div>
              )}

              {statistics.cheapest && (
                <div
                  className="p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => selectRoute(statistics.cheapest!.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">最省钱</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800">{statistics.cheapest.name}</div>
                  <div className="text-xs text-gray-500">
                    {transportModeLabels[statistics.cheapest.transportMode]} · ¥{statistics.cheapest.cost}
                  </div>
                </div>
              )}

              {statistics.fastest && (
                <div
                  className="p-3 bg-amber-50 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => selectRoute(statistics.fastest!.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">最省时间</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800">{statistics.fastest.name}</div>
                  <div className="text-xs text-gray-500">
                    {transportModeLabels[statistics.fastest.transportMode]} · {statistics.fastest.duration}分钟
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
