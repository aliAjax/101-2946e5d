import { useCommuteStore } from '../store/commuteStore';
import { BarChart3, Clock, DollarSign, Route } from 'lucide-react';

export function StatisticsCards() {
  const { statistics } = useCommuteStore();

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-2 text-blue-600 mb-2">
          <Route className="w-5 h-5" />
          <span className="text-sm font-medium">总路线数</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          {statistics.totalRoutes}
        </div>
        <div className="text-xs text-gray-500 mt-1">条通勤记录</div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-2 text-green-600 mb-2">
          <Clock className="w-5 h-5" />
          <span className="text-sm font-medium">平均耗时</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          {statistics.avgDuration}
        </div>
        <div className="text-xs text-gray-500 mt-1">分钟/次</div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-2 text-amber-600 mb-2">
          <DollarSign className="w-5 h-5" />
          <span className="text-sm font-medium">平均费用</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          ¥{statistics.avgCost}
        </div>
        <div className="text-xs text-gray-500 mt-1">元/次</div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-2 text-purple-600 mb-2">
          <BarChart3 className="w-5 h-5" />
          <span className="text-sm font-medium">筛选状态</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          {statistics.totalRoutes > 0 ? '已应用' : '无数据'}
        </div>
        <div className="text-xs text-gray-500 mt-1">点击地图选择路线</div>
      </div>
    </div>
  );
}
