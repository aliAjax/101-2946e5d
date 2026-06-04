import { useState, useEffect } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { FilterPanel } from '../components/FilterPanel';
import { DataExportPanel } from '../components/DataExportPanel';
import { MapView } from '../components/MapView';
import { TimeTrendChart } from '../components/TimeTrendChart';
import { TransportComparison } from '../components/TransportComparison';
import { PeakHourComparison } from '../components/PeakHourComparison';
import { RouteDetailsPanel } from '../components/RouteDetailsPanel';
import { AddRouteModal } from '../components/AddRouteModal';
import { SettingsModal } from '../components/SettingsModal';
import { LocationManager } from '../components/LocationManager';
import { StatisticsCards } from '../components/StatisticsCards';
import { RouteList } from '../components/RouteList';
import { CommuteCalendar } from '../components/CommuteCalendar';
import { FavoritesPanel } from '../components/FavoritesPanel';
import { RouteScoringPanel } from '../components/RouteScoringPanel';
import { ScoreExplanationPanel } from '../components/ScoreExplanationPanel';
import { AnomalyDetectionPanel, AnomalyNotificationBadge, AnomalySlidePanel } from '../components/AnomalyDetectionPanel';
import { Map, Plus, Settings, Navigation } from 'lucide-react';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);
  const calculateStatistics = useCommuteStore((state) => state.calculateStatistics);
  const selectedDate = useCommuteStore((state) => state.selectedDate);

  useEffect(() => {
    calculateStatistics();
  }, [calculateStatistics, selectedDate]);

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
            <div className="flex items-center gap-2">
              <AnomalyNotificationBadge />
              <button
                onClick={() => setIsLocationManagerOpen(true)}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                title="地点管理"
              >
                <Navigation className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                title="设置"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                添加路线
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <StatisticsCards />
        </div>

        <div className="mb-6">
          <CommuteCalendar />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <FilterPanel />
            <AnomalyDetectionPanel />
            <DataExportPanel />
            <FavoritesPanel />
            <RouteList />
          </div>

          <div className="col-span-6 space-y-6">
            <MapView />
            <div className="grid grid-cols-2 gap-6">
              <TimeTrendChart />
              <TransportComparison />
            </div>
            <PeakHourComparison />
          </div>

          <div className="col-span-3 space-y-6">
            <RouteScoringPanel />
            <ScoreExplanationPanel />
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

      <AddRouteModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onOpenLocationManager={() => {
          setIsModalOpen(false);
          setIsLocationManagerOpen(true);
        }}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <LocationManager 
        isOpen={isLocationManagerOpen} 
        onClose={() => setIsLocationManagerOpen(false)} 
      />
      <AnomalySlidePanel />
    </div>
  );
}
