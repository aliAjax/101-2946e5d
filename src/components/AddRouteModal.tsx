import { useState, useRef, useMemo } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { CommuteRoute, TransportMode, TimeOfDay, transportModeLabels, transportModeColors, timeOfDayLabels, timeOfDayColors } from '../types/commute';
import { parseCSV, CSVParseResult, CSV_FIELD_LABELS } from '../lib/csvParser';
import { Plus, X, Upload, MapPin, Clock, DollarSign, Users, Calendar, FileText, AlertTriangle, CheckCircle, FileUp, Sun, Sunset, Cloud, HelpCircle, Navigation } from 'lucide-react';

type ImportFormat = 'json' | 'csv';
type CSVStep = 'input' | 'preview';

export function AddRouteModal({ 
  isOpen, 
  onClose, 
  onOpenLocationManager 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onOpenLocationManager?: () => void;
}) {
  const { addRoute, importRoutes, calculateStatistics, locations, getLocationByName } = useCommuteStore();

  const locationOptions = useMemo(() => 
    locations.map(loc => ({
      name: loc.name,
      coords: { lat: loc.lat, lng: loc.lng }
    })),
    [locations]
  );

  const locationLookup = useMemo(() => {
    const lookup: Record<string, { lat: number; lng: number }> = {};
    locations.forEach((loc) => {
      lookup[loc.name] = { lat: loc.lat, lng: loc.lng };
    });
    return lookup;
  }, [locations]);

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    transportMode: 'subway' as TransportMode,
    duration: 30,
    cost: 5,
    crowdLevel: 3,
    date: new Date().toISOString().split('T')[0],
    timeOfDay: 'off_peak' as TimeOfDay,
  });

  const timeOfDayOptions: { value: TimeOfDay; label: string; icon: React.ReactNode }[] = [
    { value: 'morning_peak', label: '早高峰', icon: <Sun className="w-3 h-3" /> },
    { value: 'evening_peak', label: '晚高峰', icon: <Sunset className="w-3 h-3" /> },
    { value: 'off_peak', label: '平峰', icon: <Cloud className="w-3 h-3" /> },
    { value: 'unknown', label: '未知', icon: <HelpCircle className="w-3 h-3" /> },
  ];

  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [importFormat, setImportFormat] = useState<ImportFormat>('json');

  const [csvText, setCsvText] = useState('');
  const [csvResult, setCsvResult] = useState<CSVParseResult | null>(null);
  const [csvStep, setCsvStep] = useState<CSVStep>('input');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetImportState = () => {
    setImportText('');
    setCsvText('');
    setCsvResult(null);
    setCsvStep('input');
  };

  const handleClose = () => {
    resetImportState();
    setActiveTab('manual');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const originLoc = getLocationByName(formData.origin);
    const destLoc = getLocationByName(formData.destination);

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
      timeOfDay: formData.timeOfDay,
      originCoords: { lat: originLoc.lat, lng: originLoc.lng },
      destCoords: { lat: destLoc.lat, lng: destLoc.lng },
    };

    addRoute(newRoute);
    calculateStatistics();
    handleClose();
  };

  const handleJSONImport = () => {
    try {
      const data = JSON.parse(importText);
      const routes = Array.isArray(data) ? data : [data];

      const validRoutes = routes.map((r: Record<string, unknown>, index: number) => {
        const originLoc = getLocationByName(r.origin as string) || locations[0];
        const destLoc = getLocationByName(r.destination as string) || locations[1];

        return {
          id: `imported-${Date.now()}-${index}`,
          name: `${r.origin} → ${r.destination}`,
          origin: r.origin as string,
          destination: r.destination as string,
          transportMode: r.transportMode as TransportMode,
          duration: Number(r.duration),
          cost: Number(r.cost),
          crowdLevel: Number(r.crowdLevel),
          date: r.date as string,
          timeOfDay: (r.timeOfDay as TimeOfDay) || 'unknown',
          originCoords: { lat: originLoc.lat, lng: originLoc.lng },
          destCoords: { lat: destLoc.lat, lng: destLoc.lng },
        };
      });

      importRoutes(validRoutes);
      calculateStatistics();
      handleClose();
    } catch {
      alert('导入失败，请检查JSON格式');
    }
  };

  const handleCSVParse = () => {
    const result = parseCSV(csvText, locationLookup);
    setCsvResult(result);
    setCsvStep('preview');
  };

  const handleCSVFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCSVConfirmImport = () => {
    if (!csvResult || csvResult.validRoutes.length === 0) return;
    importRoutes(csvResult.validRoutes);
    calculateStatistics();
    handleClose();
  };

  const handleCSVBack = () => {
    setCsvStep('input');
    setCsvResult(null);
  };

  if (!isOpen) return null;

  const csvSampleHeader = Object.values(CSV_FIELD_LABELS).join(',');
  const csvSampleRow = '中关村,国贸,subway,45,5,4,2024-01-15,morning_peak';

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
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setActiveTab('manual'); resetImportState(); }}
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
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
                  <MapPin className="w-4 h-4" />
                  地点选择
                </label>
                {onOpenLocationManager && (
                  <button
                    type="button"
                    onClick={onOpenLocationManager}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    管理地点
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">出发地</label>
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
                  <label className="text-xs text-gray-500 mb-1 block">目的地</label>
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

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">时间段</label>
                <div className="grid grid-cols-4 gap-2">
                  {timeOfDayOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, timeOfDay: option.value })}
                      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                        formData.timeOfDay === option.value
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={formData.timeOfDay === option.value ? { backgroundColor: timeOfDayColors[option.value] } : {}}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
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
              <div className="flex gap-2">
                <button
                  onClick={() => { setImportFormat('json'); resetImportState(); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    importFormat === 'json'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-1" />
                  JSON
                </button>
                <button
                  onClick={() => { setImportFormat('csv'); resetImportState(); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    importFormat === 'csv'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FileUp className="w-4 h-4 inline mr-1" />
                  CSV
                </button>
              </div>

              {importFormat === 'json' ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      粘贴 JSON 数据
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={`[\n  {\n    "origin": "中关村",\n    "destination": "国贸",\n    "transportMode": "subway",\n    "duration": 45,\n    "cost": 5,\n    "crowdLevel": 4,\n    "date": "2024-01-15",\n    "timeOfDay": "morning_peak"\n  }\n]`}
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                  <button
                    onClick={handleJSONImport}
                    className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    导入数据
                  </button>
                </>
              ) : csvStep === 'input' ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        粘贴或上传 CSV 数据
                      </label>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        上传文件
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleCSVFileUpload}
                        className="hidden"
                      />
                    </div>
                    <textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder={`${csvSampleHeader}\n${csvSampleRow}`}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-800 mb-1">CSV 格式说明</p>
                    <p className="text-xs text-blue-700 mb-1">
                      表头字段：origin, destination, transportMode, duration, cost, crowdLevel, date
                    </p>
                    <p className="text-xs text-blue-600">
                      transportMode 可选值：subway / bus / car / bike / walk
                    </p>
                    <p className="text-xs text-blue-600 mb-1">
                      地点名称需匹配：{locationOptions.map((l) => l.name).join('、')}
                    </p>
                    {onOpenLocationManager && (
                      <button
                        type="button"
                        onClick={onOpenLocationManager}
                        className="text-xs text-blue-700 hover:text-blue-900 underline font-medium"
                      >
                        管理地点列表 →
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleCSVParse}
                    disabled={!csvText.trim()}
                    className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    解析预览
                  </button>
                </>
              ) : (
                <>
                  {csvResult && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-green-800">
                            有效路线：<strong>{csvResult.validRoutes.length}</strong> 条
                          </span>
                        </div>

                        {csvResult.errors.length > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span className="text-sm text-red-800">
                              错误行：<strong>{csvResult.errors.length}</strong> 行
                            </span>
                          </div>
                        )}

                        {csvResult.missingFields.length > 0 && (
                          <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                              <span className="font-medium">缺失字段：</span>
                              {csvResult.missingFields.map((f) => CSV_FIELD_LABELS[f as keyof typeof CSV_FIELD_LABELS] || f).join('、')}
                            </div>
                          </div>
                        )}
                      </div>

                      {csvResult.validRoutes.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">路线预览</h3>
                          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">路线</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">方式</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">耗时</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">费用</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">拥挤</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">时段</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">日期</th>
                                </tr>
                              </thead>
                              <tbody>
                                {csvResult.validRoutes.map((route) => (
                                  <tr key={route.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-2 py-1.5 text-gray-800">
                                      {route.origin} → {route.destination}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <span
                                        className="inline-block px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                                        style={{ backgroundColor: transportModeColors[route.transportMode] }}
                                      >
                                        {transportModeLabels[route.transportMode]}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1.5 text-gray-700">{route.duration}分</td>
                                    <td className="px-2 py-1.5 text-gray-700">¥{route.cost}</td>
                                    <td className="px-2 py-1.5 text-gray-700">{route.crowdLevel}</td>
                                    <td className="px-2 py-1.5">
                                      <span
                                        className="inline-block px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                                        style={{ backgroundColor: timeOfDayColors[route.timeOfDay || 'unknown'] }}
                                      >
                                        {timeOfDayLabels[route.timeOfDay || 'unknown']}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1.5 text-gray-600">{route.date}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {csvResult.errors.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-red-700 mb-2">错误详情</h3>
                          <div className="border border-red-200 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-red-50 sticky top-0">
                                <tr>
                                  <th className="text-left px-2 py-1.5 text-red-600 font-medium">行号</th>
                                  <th className="text-left px-2 py-1.5 text-red-600 font-medium">错误信息</th>
                                </tr>
                              </thead>
                              <tbody>
                                {csvResult.errors.map((err, idx) => (
                                  <tr key={idx} className="border-t border-red-100">
                                    <td className="px-2 py-1.5 text-red-700 font-mono">第{err.row}行</td>
                                    <td className="px-2 py-1.5 text-red-600">{err.message}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={handleCSVBack}
                          className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          返回修改
                        </button>
                        <button
                          onClick={handleCSVConfirmImport}
                          disabled={csvResult.validRoutes.length === 0}
                          className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          确认导入 ({csvResult.validRoutes.length} 条)
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
