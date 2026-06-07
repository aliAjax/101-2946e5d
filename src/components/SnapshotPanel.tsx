import { useState } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { Camera, Clock, MapPin, Star, Calendar, Trash2, RotateCcw, Plus, Edit2, Check, X, Info } from 'lucide-react';

export function SnapshotPanel() {
  const { snapshots, createSnapshot, deleteSnapshot, restoreSnapshot, updateSnapshot } = useCommuteStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createSnapshot(newName.trim(), newDescription.trim());
    setNewName('');
    setNewDescription('');
    setIsCreating(false);
  };

  const handleStartEdit = (id: string, name: string, description: string) => {
    setEditingId(id);
    setEditName(name);
    setEditDescription(description);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateSnapshot(id, { name: editName.trim(), description: editDescription.trim() });
    setEditingId(null);
  };

  const handleRestore = (id: string) => {
    restoreSnapshot(id);
    setRestoreConfirmId(null);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateRange = (dateRange: { start: string; end: string } | null) => {
    if (!dateRange) return '无数据';
    if (dateRange.start === dateRange.end) return dateRange.start;
    return `${dateRange.start} ~ ${dateRange.end}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-800">数据快照</h3>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {isCreating && (
          <div className="bg-purple-50 rounded-xl p-4 space-y-3 border border-purple-100">
            <div className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="快照名称"
                className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="描述（可选）"
                rows={2}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                创建
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewName('');
                  setNewDescription('');
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {snapshots.length === 0 && !isCreating && (
          <div className="text-center py-8">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">暂无快照</p>
            <p className="text-gray-400 text-xs mt-1">点击"新建"保存当前数据状态</p>
          </div>
        )}

        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="bg-gray-50 rounded-xl p-4 space-y-3 hover:bg-gray-100 transition-colors"
          >
            {editingId === snapshot.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(snapshot.id)}
                    disabled={!editName.trim()}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 text-sm truncate">{snapshot.name}</h4>
                    {snapshot.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{snapshot.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleStartEdit(snapshot.id, snapshot.name, snapshot.description)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors ml-2 flex-shrink-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{snapshot.summary.routeCount} 条路线</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Star className="w-3.5 h-3.5 text-gray-400" />
                    <span>{snapshot.summary.favoriteCount} 条收藏</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{snapshot.summary.locationCount} 个地点</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{formatDateRange(snapshot.summary.dateRange)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(snapshot.createdAt)}</span>
                </div>

                {restoreConfirmId === snapshot.id ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-amber-800">确认恢复？</p>
                        <p className="text-xs text-amber-600 mt-0.5">恢复后当前数据将被快照数据覆盖，此操作不可撤销。</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestore(snapshot.id)}
                        className="flex-1 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        确认恢复
                      </button>
                      <button
                        onClick={() => setRestoreConfirmId(null)}
                        className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : deleteConfirmId === snapshot.id ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-red-800">确认删除？</p>
                        <p className="text-xs text-red-600 mt-0.5">删除后快照将无法恢复。</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          deleteSnapshot(snapshot.id);
                          setDeleteConfirmId(null);
                        }}
                        className="flex-1 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors"
                      >
                        确认删除
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRestoreConfirmId(snapshot.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      恢复
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(snapshot.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
