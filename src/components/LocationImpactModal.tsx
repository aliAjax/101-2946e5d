import { useState } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { Location, LocationImpact } from '../types/commute';
import {
  AlertTriangle,
  MapPin,
  Route,
  Star,
  Filter,
  AlertCircle,
  EyeOff,
  Bookmark,
  X,
  Check,
  Trash2,
  Edit3,
  TrendingUp,
  MousePointerClick,
} from 'lucide-react';

type OperationType = 'rename' | 'delete';

interface LocationImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location;
  operationType: OperationType;
  newName?: string;
  onConfirm: (options?: { keepRoutes: boolean; markAsMissing?: boolean }) => void;
}

export function LocationImpactModal({
  isOpen,
  onClose,
  location,
  operationType,
  newName,
  onConfirm,
}: LocationImpactModalProps) {
  const { getLocationImpact } = useCommuteStore();
  const [deleteOption, setDeleteOption] = useState<'keep' | 'delete'>('keep');

  if (!isOpen) return null;

  const impact: LocationImpact = getLocationImpact(location.id);
  const hasImpact = impact.totalAffected > 0;

  const handleConfirm = () => {
    if (operationType === 'delete') {
      if (deleteOption === 'keep') {
        onConfirm({ keepRoutes: true, markAsMissing: true });
      } else {
        onConfirm({ keepRoutes: false });
      }
    } else {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  operationType === 'delete' ? 'bg-red-100' : 'bg-amber-100'
                }`}
              >
                {operationType === 'delete' ? (
                  <Trash2 className="w-6 h-6 text-red-600" />
                ) : (
                  <Edit3 className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {operationType === 'delete' ? '确认删除地点' : '确认重命名地点'}
                </h3>
                <p className="text-sm text-gray-500">
                  {location.name}
                  {operationType === 'rename' && newName && (
                    <span className="ml-2">
                      → <span className="font-medium text-amber-600">{newName}</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {operationType === 'rename' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">此操作将自动同步更新</p>
                  <p className="text-xs text-amber-600 mt-1">
                    系统会自动更新所有引用此地点的数据，确保数据一致性。
                  </p>
                </div>
              </div>
            </div>
          )}

          {operationType === 'delete' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">请选择删除方式</p>
                  <p className="text-xs text-red-600 mt-1">
                    删除地点后，关联数据需要进行处理，请选择您希望的处理方式。
                  </p>
                </div>
              </div>
            </div>
          )}

          {operationType === 'delete' && (
            <div className="space-y-3 mb-6">
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  deleteOption === 'keep'
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setDeleteOption('keep')}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    deleteOption === 'keep' ? 'border-blue-500' : 'border-gray-300'
                  }`}
                >
                  {deleteOption === 'keep' && (
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">保留历史数据</p>
                  <p className="text-xs text-gray-500 mt-1">
                    路线和收藏数据将被保留，但起终点会被标记为「[已删除] {location.name}」。
                    评分方案将重新计算，选中状态会被清除。适合需要保留历史记录的场景。
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  deleteOption === 'delete'
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setDeleteOption('delete')}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    deleteOption === 'delete' ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {deleteOption === 'delete' && (
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">彻底删除所有关联数据</p>
                  <p className="text-xs text-gray-500 mt-1">
                    所有包含此地点的路线、收藏、异常记录、评分方案都将被彻底删除。
                    相关的筛选条件和选中状态会被自动清理。此操作不可撤销。
                  </p>
                </div>
              </label>
            </div>
          )}

          {hasImpact && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                影响范围预览
              </h4>
              <div className="space-y-2">
                {impact.affectedRoutes.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Route className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">历史路线</p>
                      <p className="text-xs text-gray-500">
                        {impact.affectedRoutes.length} 条路线将受影响
                      </p>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      {impact.affectedRoutes.length}
                    </span>
                  </div>
                )}

                {impact.affectedFavorites.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Star className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">收藏路线</p>
                      <p className="text-xs text-gray-500">
                        {impact.affectedFavorites.length} 条收藏将受影响
                      </p>
                    </div>
                    <span className="text-sm font-bold text-amber-600">
                      {impact.affectedFavorites.length}
                    </span>
                  </div>
                )}

                {(impact.affectedFilters.origin || impact.affectedFilters.destination) && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Filter className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">当前筛选条件</p>
                      <p className="text-xs text-gray-500">
                        {impact.affectedFilters.origin && '出发地筛选 '}
                        {impact.affectedFilters.destination && '目的地筛选'}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">
                      {(impact.affectedFilters.origin ? 1 : 0) +
                        (impact.affectedFilters.destination ? 1 : 0)}
                    </span>
                  </div>
                )}

                {impact.affectedAnomalies.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">异常记录</p>
                      <p className="text-xs text-gray-500">
                        {impact.affectedAnomalies.length} 条异常记录将受影响
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-600">
                      {impact.affectedAnomalies.length}
                    </span>
                  </div>
                )}

                {impact.affectedAnomalyIgnoreKeys.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                      <EyeOff className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">异常忽略记录</p>
                      <p className="text-xs text-gray-500">
                        {impact.affectedAnomalyIgnoreKeys.length} 条忽略设置将受影响
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gray-600">
                      {impact.affectedAnomalyIgnoreKeys.length}
                    </span>
                  </div>
                )}

                {impact.affectedFilterPresets.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Bookmark className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">筛选方案</p>
                      <p className="text-xs text-gray-500">
                        {impact.affectedFilterPresets.length} 个筛选方案可能受影响
                      </p>
                    </div>
                    <span className="text-sm font-bold text-purple-600">
                      {impact.affectedFilterPresets.length}
                    </span>
                  </div>
                )}

                {impact.affectedRouteScores.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">评分方案</p>
                      <p className="text-xs text-gray-500">
                        {impact.affectedRouteScores.length} 个评分方案将重新计算
                      </p>
                    </div>
                    <span className="text-sm font-bold text-teal-600">
                      {impact.affectedRouteScores.length}
                    </span>
                  </div>
                )}

                {impact.selectedScoreKeyAffected && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <MousePointerClick className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">选中的评分方案</p>
                      <p className="text-xs text-gray-500">
                        当前选中的评分方案将被清除
                      </p>
                    </div>
                    <span className="text-sm font-bold text-orange-600">
                      1
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasImpact && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-800">暂无关联数据</p>
              <p className="text-xs text-gray-500 mt-1">
                此地点没有关联的路线、收藏或其他数据，操作不会影响其他内容。
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-2.5 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                operationType === 'delete'
                  ? deleteOption === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              <Check className="w-4 h-4" />
              {operationType === 'delete'
                ? deleteOption === 'delete'
                  ? '确认删除'
                  : '确认保留'
                : '确认重命名'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
