import { useState } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { Settings, X, Database, RotateCcw, Info, HardDrive, Camera } from 'lucide-react';
import { SnapshotPanel } from './SnapshotPanel';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { routes, resetToMockData, calculateStatistics, filters, selectedRouteId } = useCommuteStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    resetToMockData();
    calculateStatistics();
    setShowResetConfirm(false);
    onClose();
  };

  const localStorageSize = (() => {
    try {
      const data = localStorage.getItem('commute-data');
      if (data) {
        return (new Blob([data]).size / 1024).toFixed(2);
      }
      return '0';
    } catch {
      return '0';
    }
  })();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">设置</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <Database className="w-4 h-4" />
              本地数据管理
            </h3>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">路线数据</span>
                <span className="text-sm font-semibold text-gray-800">{routes.length} 条</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">选中路线</span>
                <span className="text-sm font-semibold text-gray-800">
                  {selectedRouteId ? '已选择' : '未选择'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">筛选条件</span>
                <span className="text-sm font-semibold text-gray-800">
                  {filters.transportModes.length > 0 || filters.isWeekday !== null || filters.isWeekend !== null
                    ? '已设置'
                    : '默认'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  存储大小
                </span>
                <span className="text-sm font-semibold text-gray-800">{localStorageSize} KB</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                恢复初始数据
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">确认恢复？</p>
                      <p className="text-xs text-red-600 mt-1">
                        此操作将清除所有本地数据，恢复到初始 mock 数据状态。筛选条件和选中路线也将重置。
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                  >
                    确认恢复
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <Camera className="w-4 h-4" />
              数据快照
            </h3>
            <SnapshotPanel />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2 text-xs text-gray-400">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <p>数据自动保存到浏览器本地存储（localStorage），刷新页面后数据不会丢失。清除浏览器缓存会删除数据。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
