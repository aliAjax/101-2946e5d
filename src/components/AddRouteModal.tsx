import { useState } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { CommuteRoute, TransportMode, transportModeLabels, transportModeColors } from '../types/commute';
import { Plus, X, Upload, MapPin, Clock, DollarSign, Users, Calendar } from 'lucide-react';

const locationOptions = [
  { name: '中关村', coords: { lat: 39.98, lng: 116.31 } },
  { name: '望京', coords: { lat: 39.99, lng: 116.47 } },
  { name: '国贸', coords: { lat: 39.91, lng: 116.46 } },
  { name: '西单', coords: { lat: 39.91, lng: 116.37 } },
  { name: '三里屯', coords: { lat: 39.93, lng: 116.45 } },
  { name: '西二旗', coords: { lat: 40.05, lng: 116.30 } },
  { name: '五道口', coords: { lat: 39.99, lng: 116.34 } },
  { name: '东直门', coords: { lat: 39.94, lng: 116.43 } },
];

export function AddRouteModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { addRoute, importRoutes, calculateStatistics } = useCommuteStore();

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    transportMode: 'subway' as TransportMode,
    duration: 30,
    cost: 5,
    crowdLevel: 3,
    date: new Date().toISOString().split('T')[0],
  });

  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const originLoc = locationOptions.find(l => l.name === formData.origin);
    const destLoc = locationOptions.find(l => l.name === formData.destination);
    
    if (!originLoc || !destLoc) return;

    const newRoute: CommuteRoute = {
      id: `route-${Date.now()}`,
      name: `${formData.origin} → ${formData.destination}`,
      origin: formData.origin,
      destination: formData.destination,
      transportMode: formData.transportMode,
      duration: formData.duration,
      cost: formData.cost,
      crowdLevel: formData.crowdLevel,
      date: formData.date,
      originCoords: originLoc.coords,
      destCoords: destLoc.coords,
    };

    addRoute(newRoute);
    calculateStatistics();
    onClose();
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      const routes = Array.isArray(data) ? data : [data];
      
      const validRoutes = routes.map((r, index) => {
        const originLoc = locationOptions.find(l => l.name === r.origin) || locationOptions[0];
        const destLoc = locationOptions.find(l => l.name === r.destination) || locationOptions[1];
        
        return {
          id: `imported-${Date.now()}-${index}`,
          name: `${r.origin} → ${r.destination}`,
          origin: r.origin,
          destination: r.destination,
          transportMode: r.transportMode,
          duration: Number(r.duration),
          cost: Number(r.cost),
          crowdLevel: Number(r.crowdLevel),
          date: r.date,
          originCoords: originLoc.coords,
          destCoords: destLoc.coords,
        };
      });

      importRoutes(validRoutes);
      calculateStatistics();
      setImportText('');
      onClose();
    } catch {
      alert('导入失败，请检查JSON格式');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">添加通勤路线</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              手动录入
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'import'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-1" />
              批量导入
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'manual' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4" />
                    出发地
                  </label>
                  <select
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">请选择</option>
                    {locationOptions.map((loc) => (
                      <option key={loc.name} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4" />
                    目的地
                  </label>
                  <select
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">请选择</option>
                    {locationOptions.map((loc) => (
                      <option key={loc.name} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">交通方式</label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(transportModeLabels).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormData({ ...formData, transportMode: mode as TransportMode })}
                      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                        formData.transportMode === mode
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={formData.transportMode === mode ? { backgroundColor: transportModeColors[mode as keyof typeof transportModeColors] } : {}}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: formData.transportMode === mode ? 'white' : transportModeColors[mode as keyof typeof transportModeColors] }}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4" />
                    耗时 (分钟)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                    <DollarSign className="w-4 h-4" />
                    费用 (元)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4" />
                  拥挤程度
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, crowdLevel: level })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.crowdLevel >= level
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  1=非常宽松 5=非常拥挤
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4" />
                  日期
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                添加路线
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  粘贴 JSON 数据
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`[\n  {\n    "origin": "中关村",\n    "destination": "国贸",\n    "transportMode": "subway",\n    "duration": 45,\n    "cost": 5,\n    "crowdLevel": 4,\n    "date": "2024-01-15"\n  }\n]`}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <button
                onClick={handleImport}
                className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                导入数据
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
