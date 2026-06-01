import { useState, useEffect } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { FilterPanel } from '../components/FilterPanel';
import { MapView } from '../components/MapView';
import { TimeTrendChart } from '../components/TimeTrendChart';
import { TransportComparison } from '../components/TransportComparison';
import { RouteDetailsPanel } from '../components/RouteDetailsPanel';
import { AddRouteModal } from '../components/AddRouteModal';
import { StatisticsCards } from '../components/StatisticsCards';
import { RouteList } from '../components/RouteList';
import { Map, Plus } from 'lucide-react';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const calculateStatistics = useCommuteStore((state) => state.calculateStatistics);

  useEffect(() => {
    calculateStatistics();
  }, [calculateStatistics]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
                <Map className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  城市通勤数据可视化
                </h1>
                <p className="text-sm text-gray-500">分析通勤路线，找到最佳出行方案</p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              添加路线
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <StatisticsCards />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <FilterPanel />
            <RouteList />
          </div>

          <div className="col-span-6 space-y-6">
            <MapView />
            <div className="grid grid-cols-2 gap-6">
              <TimeTrendChart />
              <TransportComparison />
            </div>
          </div>

          <div className="col-span-3">
            <RouteDetailsPanel />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            💡 点击地图上的路线或列表中的路线条目，所有图表将同步高亮相关数据
          </p>
        </div>
      </footer>

      <AddRouteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
