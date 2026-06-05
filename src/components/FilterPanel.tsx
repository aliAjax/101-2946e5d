import { useState } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeLabels, transportModeColors, TransportMode, TimeOfDay, timeOfDayLabels, timeOfDayColors } from '../types/commute';
import { Filter, Calendar, Sun, Moon, RefreshCw, Star, Clock, Bookmark, BookmarkCheck, X, Save, Trash2 } from 'lucide-react';

export function FilterPanel() {
  const { filters, setFilters, calculateStatistics, filterPresets, saveFilterPreset, deleteFilterPreset, applyFilterPreset } = useCommuteStore();
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleTimeOfDayToggle = (time: TimeOfDay) => {
    const currentTimes = filters.timeOfDay || [];
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter(t => t !== time)
      : [...currentTimes, time];
    setFilters({ timeOfDay: newTimes });
    setTimeout(calculateStatistics, 0);
  };

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
    if (filters.onlyFavorites) {
      setFilters({ onlyFavorites: false, origin: null, destination: null, transportModes: [] });
    } else {
      setFilters({ onlyFavorites: true });
    }
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
      timeOfDay: [],
    });
    setTimeout(calculateStatistics, 0);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    saveFilterPreset(presetName.trim());
    setPresetName('');
    setIsSavingPreset(false);
  };

  const handlePresetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSavePreset();
    } else if (e.key === 'Escape') {
      setIsSavingPreset(false);
      setPresetName('');
    }
  };

  const getPresetSummary = (preset: typeof filterPresets[0]) => {
    const parts: string[] = [];
    if (preset.isWeekday) parts.push('工作日');
    if (preset.isWeekend) parts.push('周末');
    if (preset.transportModes.length > 0) {
      const labels = preset.transportModes.map(m => transportModeLabels[m]).join('、');
      parts.push(labels);
    }
    if (preset.timeOfDay.length > 0) {
      const labels = preset.timeOfDay.map(t => timeOfDayLabels[t]).join('、');
      parts.push(labels);
    }
    if (preset.onlyFavorites) parts.push('收藏');
    return parts.length > 0 ? parts.join(' · ') : '无筛选';
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">常用筛选方案</span>
            </div>
            {!isSavingPreset && (
              <button
                onClick={() => setIsSavingPreset(true)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                保存当前方案
              </button>
            )}
          </div>

          {isSavingPreset && (
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={handlePresetKeyDown}
                placeholder="输入方案名称"
                autoFocus
                className="flex-1 px-3 py-1.5 text-sm border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                保存
              </button>
              <button
                onClick={() => { setIsSavingPreset(false); setPresetName(''); }}
                className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {filterPresets.length > 0 ? (
            <div className="space-y-1.5">
              {filterPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="group flex items-center gap-1.5 p-2 rounded-lg bg-gray-50 hover:bg-indigo-50 transition-all cursor-pointer border border-transparent hover:border-indigo-200"
                  onClick={() => applyFilterPreset(preset.id)}
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{preset.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{getPresetSummary(preset)}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFilterPreset(preset.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 text-center py-2">
              暂无保存的方案
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

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
          <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            时间段
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['morning_peak', 'evening_peak', 'off_peak', 'unknown'] as TimeOfDay[]).map((time) => {
              const isSelected = (filters.timeOfDay || []).includes(time);
              const color = timeOfDayColors[time];
              
              return (
                <button
                  key={time}
                  onClick={() => handleTimeOfDayToggle(time)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'shadow-md text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={isSelected ? { backgroundColor: color } : {}}
                >
                  {timeOfDayLabels[time]}
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
