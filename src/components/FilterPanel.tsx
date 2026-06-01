import { useCommuteStore } from '../store/commuteStore';
import { transportModeLabels, transportModeColors, TransportMode } from '../types/commute';
import { Filter, Calendar, Sun, Moon, RefreshCw, Star } from 'lucide-react';

export function FilterPanel() {
  const { filters, setFilters, calculateStatistics } = useCommuteStore();

  const handleTransportModeToggle = (mode: TransportMode) => {
    const currentModes = filters.transportModes;
    const newModes = currentModes.includes(mode)
      ? currentModes.filter(m => m !== mode)
      : [...currentModes, mode];
    setFilters({ transportModes: newModes });
    setTimeout(calculateStatistics, 0);
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setFilters({
      dateRange: {
        ...filters.dateRange,
        [type]: value,
      },
    });
    setTimeout(calculateStatistics, 0);
  };

  const handleWeekdayToggle = () => {
    const newValue = filters.isWeekday === true ? null : true;
    setFilters({ isWeekday: newValue, isWeekend: newValue ? null : filters.isWeekend });
    setTimeout(calculateStatistics, 0);
  };

  const handleWeekendToggle = () => {
    const newValue = filters.isWeekend === true ? null : true;
    setFilters({ isWeekend: newValue, isWeekday: newValue ? null : filters.isWeekday });
    setTimeout(calculateStatistics, 0);
  };

  const handleFavoritesToggle = () => {
    setFilters({ onlyFavorites: !filters.onlyFavorites });
    setTimeout(calculateStatistics, 0);
  };

  const resetFilters = () => {
    setFilters({
      isWeekday: null,
      isWeekend: null,
      transportModes: [],
      dateRange: { start: '2024-01-01', end: '2024-12-31' },
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
          <Filter className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-800">筛选条件</h2>
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          重置
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            日期范围
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">开始日期</label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">结束日期</label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">星期类型</div>
          <div className="flex gap-3">
            <button
              onClick={handleWeekdayToggle}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filters.isWeekday === true
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Sun className="w-4 h-4" />
              工作日
            </button>
            <button
              onClick={handleWeekendToggle}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filters.isWeekend === true
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Moon className="w-4 h-4" />
              周末
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">交通方式</div>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(transportModeLabels).map(([mode, label]) => {
              const isSelected = filters.transportModes.includes(mode as TransportMode);
              const color = transportModeColors[mode as keyof typeof transportModeColors];
              
              return (
                <button
                  key={mode}
                  onClick={() => handleTransportModeToggle(mode as TransportMode)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={isSelected ? { backgroundColor: color, color: 'white' } : {}}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: isSelected ? 'white' : color }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">收藏筛选</div>
          <button
            onClick={handleFavoritesToggle}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              filters.onlyFavorites
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Star className={`w-4 h-4 ${filters.onlyFavorites ? 'fill-white' : ''}`} />
            {filters.onlyFavorites ? '显示全部路线' : '只显示收藏路线'}
          </button>
        </div>
      </div>
    </div>
  );
}
