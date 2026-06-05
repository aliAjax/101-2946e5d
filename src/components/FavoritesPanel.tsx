import { useState, useMemo } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeColors, transportModeLabels, TransportMode } from '../types/commute';
import { Star, MapPin, X, Filter, ArrowUpDown, Search, Pencil, Check, Clock } from 'lucide-react';

type SortField = 'createdAt' | 'transportMode' | 'origin' | 'destination';
type SortOrder = 'asc' | 'desc';

export function FavoritesPanel() {
  const { favorites, removeFavorite, updateFavoriteNote, setFilters, filters, calculateStatistics } = useCommuteStore();

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterTransport, setFilterTransport] = useState<TransportMode | ''>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  const sortedAndFiltered = useMemo(() => {
    let result = [...favorites];

    if (filterTransport) {
      result = result.filter(f => f.transportMode === filterTransport);
    }

    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      result = result.filter(f =>
        f.note.toLowerCase().includes(kw) ||
        f.origin.toLowerCase().includes(kw) ||
        f.destination.toLowerCase().includes(kw) ||
        f.name.toLowerCase().includes(kw)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'transportMode':
          cmp = a.transportMode.localeCompare(b.transportMode);
          break;
        case 'origin':
          cmp = a.origin.localeCompare(b.origin, 'zh');
          break;
        case 'destination':
          cmp = a.destination.localeCompare(b.destination, 'zh');
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [favorites, sortField, sortOrder, filterTransport, searchKeyword]);

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

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const startEditNote = (id: string, currentNote: string) => {
    setEditingNoteId(id);
    setEditingNoteText(currentNote);
  };

  const saveEditNote = () => {
    if (editingNoteId) {
      updateFavoriteNote(editingNoteId, editingNoteText);
      setEditingNoteId(null);
      setEditingNoteText('');
    }
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
        <>
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder="搜索备注、起终点…"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as SortField)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
              >
                <option value="createdAt">按收藏时间</option>
                <option value="transportMode">按交通方式</option>
                <option value="origin">按出发地</option>
                <option value="destination">按目的地</option>
              </select>
              <button
                onClick={toggleSortOrder}
                className="flex items-center gap-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`} />
                {sortOrder === 'asc' ? '升序' : '降序'}
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterTransport('')}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  filterTransport === '' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
              {(Object.keys(transportModeLabels) as TransportMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setFilterTransport(filterTransport === mode ? '' : mode)}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${
                    filterTransport === mode ? 'text-white' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  style={filterTransport === mode ? { backgroundColor: transportModeColors[mode] } : { backgroundColor: '#f3f4f6' }}
                >
                  {transportModeLabels[mode]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {sortedAndFiltered.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-xs">无匹配的收藏路线</div>
            ) : (
              sortedAndFiltered.map((favorite) => {
                const color = transportModeColors[favorite.transportMode];
                const isEditingThis = editingNoteId === favorite.id;

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
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(favorite.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-800 mb-1 truncate">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{favorite.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditNote(favorite.id, favorite.note);
                          }}
                          className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-500 transition-colors"
                          title="编辑备注"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavorite(favorite.id);
                          }}
                          className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                          title="取消收藏"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isEditingThis ? (
                      <div className="mt-2" onClick={e => e.stopPropagation()}>
                        <textarea
                          value={editingNoteText}
                          onChange={e => setEditingNoteText(e.target.value)}
                          maxLength={100}
                          rows={2}
                          className="w-full px-2 py-1.5 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                          autoFocus
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-gray-400">{editingNoteText.length}/100</span>
                          <div className="flex gap-1">
                            <button
                              onClick={cancelEditNote}
                              className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              取消
                            </button>
                            <button
                              onClick={saveEditNote}
                              className="text-xs px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-0.5"
                            >
                              <Check className="w-2.5 h-2.5" />
                              保存
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      favorite.note && (
                        <div
                          className="mt-1.5 text-xs text-gray-500 bg-amber-50 px-2 py-1 rounded truncate"
                          onClick={e => e.stopPropagation()}
                          title={favorite.note}
                        >
                          {favorite.note}
                        </div>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {favorites.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            共收藏 {favorites.length} 条路线 · 点击可快速筛选
            {sortedAndFiltered.length !== favorites.length && (
              <span className="text-amber-500"> · 显示 {sortedAndFiltered.length} 条</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
