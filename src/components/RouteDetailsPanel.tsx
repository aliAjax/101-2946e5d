import { useState, useEffect, useMemo } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { TransportMode, TimeOfDay, transportModeColors, transportModeLabels, timeOfDayColors, timeOfDayLabels } from '../types/commute';
import { MapPin, Clock, DollarSign, Users, Calendar, X, Trophy, Zap, Award, Star, Pencil, Check, Sun, Sunset, Cloud, HelpCircle } from 'lucide-react';

export function RouteDetailsPanel() {
  const { getFilteredRoutes, selectedRouteId, selectRoute, statistics, deleteRoute, isFavorite, toggleFavorite, updateRoute, locations } = useCommuteStore();
  const filteredRoutes = getFilteredRoutes();
  const selectedRoute = filteredRoutes.find(r => r.id === selectedRouteId);
  const isCurrentFavorite = selectedRoute ? isFavorite(selectedRoute) : false;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    origin: '',
    destination: '',
    transportMode: 'subway' as TransportMode,
    duration: 30,
    cost: 5,
    crowdLevel: 3,
    date: '',
    timeOfDay: 'off_peak' as TimeOfDay,
  });

  const locationOptions = useMemo(() =>
    locations.map(loc => loc.name),
    [locations]
  );

  const timeOfDayOptions: { value: TimeOfDay; label: string; icon: React.ReactNode }[] = [
    { value: 'morning_peak', label: '早高峰', icon: <Sun className="w-3 h-3" /> },
    { value: 'evening_peak', label: '晚高峰', icon: <Sunset className="w-3 h-3" /> },
    { value: 'off_peak', label: '平峰', icon: <Cloud className="w-3 h-3" /> },
    { value: 'unknown', label: '未知', icon: <HelpCircle className="w-3 h-3" /> },
  ];

  useEffect(() => {
    setIsEditing(false);
  }, [selectedRouteId]);

  const startEditing = () => {
    if (!selectedRoute) return;
    setEditForm({
      origin: selectedRoute.origin,
      destination: selectedRoute.destination,
      transportMode: selectedRoute.transportMode,
      duration: selectedRoute.duration,
      cost: selectedRoute.cost,
      crowdLevel: selectedRoute.crowdLevel,
      date: selectedRoute.date,
      timeOfDay: selectedRoute.timeOfDay || 'unknown',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEditing = () => {
    if (!selectedRoute) return;
    updateRoute(selectedRoute.id, {
      origin: editForm.origin,
      destination: editForm.destination,
      transportMode: editForm.transportMode,
      duration: editForm.duration,
      cost: editForm.cost,
      crowdLevel: editForm.crowdLevel,
      date: editForm.date,
      timeOfDay: editForm.timeOfDay,
      name: `${editForm.origin} → ${editForm.destination}`,
    });
    setIsEditing(false);
  };

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
          <div className="flex items-center gap-1">
            {!isEditing && (
              <button
                onClick={startEditing}
                className="p-1 hover:bg-blue-50 rounded-full transition-colors"
                title="编辑"
              >
                <Pencil className="w-4 h-4 text-blue-500" />
              </button>
            )}
            <button
              onClick={() => { selectRoute(null); setIsEditing(false); }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {selectedRoute ? (
        isEditing ? (
          <div className="flex-1 overflow-auto">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">出发地</label>
                <select
                  value={editForm.origin}
                  onChange={(e) => setEditForm({ ...editForm, origin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {locationOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">目的地</label>
                <select
                  value={editForm.destination}
                  onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {locationOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">交通方式</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(transportModeLabels).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, transportMode: mode as TransportMode })}
                      className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        editForm.transportMode === mode
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={editForm.transportMode === mode ? { backgroundColor: transportModeColors[mode as keyof typeof transportModeColors] } : {}}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: editForm.transportMode === mode ? 'white' : transportModeColors[mode as keyof typeof transportModeColors] }}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Clock className="w-3 h-3" />
                    耗时 (分钟)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.duration}
                    onChange={(e) => setEditForm({ ...editForm, duration: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <DollarSign className="w-3 h-3" />
                    费用 (元)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editForm.cost}
                    onChange={(e) => setEditForm({ ...editForm, cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                  <Users className="w-3 h-3" />
                  拥挤程度
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, crowdLevel: level })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        editForm.crowdLevel >= level
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 text-center">1=非常宽松 5=非常拥挤</div>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Calendar className="w-3 h-3" />
                  日期
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">时间段</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {timeOfDayOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, timeOfDay: option.value })}
                      className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        editForm.timeOfDay === option.value
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={editForm.timeOfDay === option.value ? { backgroundColor: timeOfDayColors[option.value] } : {}}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={cancelEditing}
                  className="flex-1 py-2 text-sm bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={saveEditing}
                  className="flex-1 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  保存
                </button>
              </div>
            </div>
          </div>
        ) : (
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
              onClick={startEditing}
              className="w-full mt-2 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              编辑此记录
            </button>

            <button
              onClick={() => deleteRoute(selectedRoute.id)}
              className="w-full mt-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              删除此记录
            </button>
          </div>
        )
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
