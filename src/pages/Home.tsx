import { useState, useEffect } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { FilterPanel } from '../components/FilterPanel';
import { MapView } from '../components/MapView';
import { TimeTrendChart } from '../components/TimeTrendChart';
import { TransportComparison } from '../components/TransportComparison';
import { RouteDetailsPanel } from '../components/RouteDetailsPanel';
import { AddRouteModal } from '../components/AddRouteModal';
import { StatisticsCards } from '../components/StatisticsCards';
import { Map, Plus, BarChart3 } from 'lucide-react';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const calculateStatistics = useCommuteStore((state) => state.calculateStatistics);

  useEffect(() => {
    calculateStatistics();
  }, [calculateStatistics]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Map className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">城市通勤数据可视化</h1>
                <p className="text-sm text-gray-500">分析通勤路线，找到最佳出行方案</p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
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
          <div className="col-span-3">
            <div className="space-y-6">
              <FilterPanel />
            </div>
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

      <AddRouteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
