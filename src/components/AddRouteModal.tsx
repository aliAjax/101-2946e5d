import { useState, useRef, useMemo } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { CommuteRoute, TransportMode, TimeOfDay, transportModeLabels, transportModeColors, timeOfDayLabels, timeOfDayColors } from '../types/commute';
import { parseCSV, CSVParseResult, CSV_FIELD_LABELS } from '../lib/csvParser';
import { Plus, X, Upload, MapPin, Clock, DollarSign, Users, Calendar, FileText, AlertTriangle, CheckCircle, FileUp, Sun, Sunset, Cloud, HelpCircle, Navigation, EyeOff, Eye } from 'lucide-react';

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
  const { addRoute, importRoutes, calculateStatistics, detectAnomalies, addLocation, locations, getLocationByName } = useCommuteStore();

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
  const [selectedValidIds, setSelectedValidIds] = useState<Set<string>>(new Set());
  const [unknownLocationCoords, setUnknownLocationCoords] = useState<Record<string, { lat: string; lng: string }>>({});
  const [skippedUnknownLocations, setSkippedUnknownLocations] = useState<Set<string>>(new Set());
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetImportState = () => {
    setImportText('');
    setCsvText('');
    setCsvResult(null);
    setCsvStep('input');
    setSelectedValidIds(new Set());
    setUnknownLocationCoords({});
    setSkippedUnknownLocations(new Set());
    setShowErrorDetails(false);
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
    };

    addRoute(newRoute);
    calculateStatistics();
    detectAnomalies();
    handleClose();
  };

  const handleJSONImport = () => {
    try {
      const data = JSON.parse(importText);
      const routes = Array.isArray(data) ? data : [data];

      const validTransportModes: TransportMode[] = ['subway', 'bus', 'car', 'bike', 'walk'];
      const validTimeOfDays: TimeOfDay[] = ['morning_peak', 'evening_peak', 'off_peak', 'unknown'];

      const errors: string[] = [];
      const validRoutes: CommuteRoute[] = [];

      routes.forEach((r: Record<string, unknown>, index: number) => {
        const origin = String(r.origin ?? '');
        const destination = String(r.destination ?? '');
        const transportModeRaw = String(r.transportMode ?? '');
        const duration = Number(r.duration);
        const cost = Number(r.cost);
        const crowdLevel = Number(r.crowdLevel);
        const date = String(r.date ?? '');
        const timeOfDayRaw = String(r.timeOfDay ?? 'unknown');

        const rowErrors: string[] = [];

        if (!origin) rowErrors.push('出发地为空');
        if (!destination) rowErrors.push('目的地为空');
        if (!transportModeRaw) rowErrors.push('交通方式为空');
        else if (!validTransportModes.includes(transportModeRaw as TransportMode))
          rowErrors.push(`交通方式"${transportModeRaw}"无效，应为: subway/bus/car/bike/walk`);
        if (isNaN(duration) || duration <= 0) rowErrors.push(`耗时"${r.duration}"无效`);
        if (isNaN(cost) || cost < 0) rowErrors.push(`费用"${r.cost}"无效`);
        if (isNaN(crowdLevel) || crowdLevel < 1 || crowdLevel > 5 || !Number.isInteger(crowdLevel))
          rowErrors.push(`拥挤程度"${r.crowdLevel}"无效，应为1-5整数`);
        if (!date) rowErrors.push('日期为空');
        else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) rowErrors.push(`日期"${date}"格式无效，应为YYYY-MM-DD`);
        if (!validTimeOfDays.includes(timeOfDayRaw as TimeOfDay))
          rowErrors.push(`时间段"${timeOfDayRaw}"无效，应为: morning_peak/evening_peak/off_peak/unknown`);

        const originLoc = getLocationByName(origin);
        const destLoc = getLocationByName(destination);
        if (!originLoc) rowErrors.push(`出发地"${origin}"不在地点库中`);
        if (!destLoc) rowErrors.push(`目的地"${destination}"不在地点库中`);

        if (rowErrors.length > 0) {
          errors.push(`第${index + 1}条: ${rowErrors.join('；')}`);
          return;
        }

        validRoutes.push({
          id: `imported-${Date.now()}-${index}`,
          name: `${origin} → ${destination}`,
          origin,
          destination,
          transportMode: transportModeRaw as TransportMode,
          duration,
          cost,
          crowdLevel,
          date,
          timeOfDay: timeOfDayRaw as TimeOfDay,
        });
      });

      if (errors.length > 0) {
        alert(`导入失败，存在以下错误：\n\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n...还有 ${errors.length - 10} 条错误` : ''}`);
        return;
      }

      if (validRoutes.length === 0) {
        alert('没有有效的路线数据');
        return;
      }

      importRoutes(validRoutes);
      calculateStatistics();
      detectAnomalies();
      handleClose();
    } catch {
      alert('导入失败，请检查JSON格式');
    }
  };

  const showCSVPreview = (text: string) => {
    const result = parseCSV(text, locationLookup);
    setCsvResult(result);
    setCsvStep('preview');
    setSelectedValidIds(new Set(result.validRoutes.map(r => r.id)));
    const coords: Record<string, { lat: string; lng: string }> = {};
    result.unknownLocations.forEach(name => {
      coords[name] = { lat: '', lng: '' };
    });
    setUnknownLocationCoords(coords);
    setSkippedUnknownLocations(new Set());
    setShowErrorDetails(false);
  };

  const handleCSVParse = () => {
    showCSVPreview(csvText);
  };

  const handleCSVFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      showCSVPreview(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCSVBack = () => {
    setCsvStep('input');
    setCsvResult(null);
    setSelectedValidIds(new Set());
    setUnknownLocationCoords({});
    setSkippedUnknownLocations(new Set());
  };

  const toggleSelectAllValid = () => {
    if (!csvResult) return;
    if (selectedValidIds.size === csvResult.validRoutes.length) {
      setSelectedValidIds(new Set());
    } else {
      setSelectedValidIds(new Set(csvResult.validRoutes.map(r => r.id)));
    }
  };

  const toggleValidRoute = (id: string) => {
    setSelectedValidIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSkipLocation = (name: string) => {
    setSkippedUnknownLocations(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const updateUnknownCoord = (name: string, field: 'lat' | 'lng', value: string) => {
    setUnknownLocationCoords(prev => ({
      ...prev,
      [name]: { ...prev[name], [field]: value }
    }));
  };

  const isLocationResolved = (name: string): boolean => {
    if (skippedUnknownLocations.has(name)) return false;
    const c = unknownLocationCoords[name];
    if (!c) return false;
    const lat = Number(c.lat);
    const lng = Number(c.lng);
    return c.lat !== '' && c.lng !== '' && !isNaN(lat) && !isNaN(lng);
  };

  const isLocationSkipped = (name: string): boolean => {
    return skippedUnknownLocations.has(name);
  };

  const getUnknownRowStatus = (row: { unknownOrigins: string[]; unknownDestinations: string[] }): 'resolved' | 'skipped' | 'pending' => {
    const allNames = [...row.unknownOrigins, ...row.unknownDestinations];
    if (allNames.some(n => isLocationSkipped(n))) return 'skipped';
    if (allNames.every(n => isLocationResolved(n))) return 'resolved';
    return 'pending';
  };

  const getResolvedLocationNames = (): Set<string> => {
    const resolved = new Set<string>();
    csvResult?.unknownLocations.forEach(name => {
      if (isLocationResolved(name)) resolved.add(name);
    });
    return resolved;
  };

  const handleCSVConfirmImport = () => {
    if (!csvResult) return;

    const routesToImport: CommuteRoute[] = [];

    csvResult.validRoutes.forEach(route => {
      if (selectedValidIds.has(route.id)) {
        routesToImport.push(route);
      }
    });

    const resolvedLocations = getResolvedLocationNames();

    const newLocations: { name: string; lat: number; lng: number }[] = [];
    resolvedLocations.forEach(name => {
      const c = unknownLocationCoords[name];
      if (c) {
        newLocations.push({ name, lat: Number(c.lat), lng: Number(c.lng) });
      }
    });

    newLocations.forEach(loc => {
      addLocation(loc);
    });

    csvResult.unknownLocationRows.forEach(row => {
      const status = getUnknownRowStatus(row);
      if (status === 'resolved') {
        routesToImport.push(row.route);
      }
    });

    if (routesToImport.length === 0) return;

    importRoutes(routesToImport);
    calculateStatistics();
    detectAnomalies();
    handleClose();
  };

  const getImportCount = (): number => {
    if (!csvResult) return 0;
    let count = 0;
    count += selectedValidIds.size;
    csvResult.unknownLocationRows.forEach(row => {
      if (getUnknownRowStatus(row) === 'resolved') count++;
    });
    return count;
  };

  if (!isOpen) return null;

  const csvSampleHeader = Object.values(CSV_FIELD_LABELS).join(',');
  const csvSampleRow = '中关村,国贸,subway,45,5,4,2024-01-15,morning_peak';

  const allValidSelected = csvResult ? selectedValidIds.size === csvResult.validRoutes.length && csvResult.validRoutes.length > 0 : false;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-auto ${csvStep === 'preview' ? 'max-w-2xl' : 'max-w-lg'}`}>
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
                    <p className="text-xs text-blue-500">
                      不在列表中的地点可在预览后补坐标或跳过
                    </p>
                    {onOpenLocationManager && (
                      <button
                        type="button"
                        onClick={onOpenLocationManager}
                        className="text-xs text-blue-700 hover:text-blue-900 underline font-medium mt-1"
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
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-green-800">
                            有效：<strong>{csvResult.validRoutes.length}</strong> 条
                          </span>
                        </div>

                        {csvResult.unknownLocations.length > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                            <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
                            <span className="text-sm text-orange-800">
                              未知地点：<strong>{csvResult.unknownLocations.length}</strong> 个
                            </span>
                          </div>
                        )}

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
                              <span className="font-medium">缺失：</span>
                              {csvResult.missingFields.map((f) => CSV_FIELD_LABELS[f as keyof typeof CSV_FIELD_LABELS] || f).join('、')}
                            </div>
                          </div>
                        )}
                      </div>

                      {csvResult.validRoutes.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-700">有效记录</h3>
                            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allValidSelected}
                                onChange={toggleSelectAllValid}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              全选导入
                            </label>
                          </div>
                          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-2 py-1.5 text-gray-600 font-medium w-8"></th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">路线</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">方式</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">耗时</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">费用</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">拥挤</th>
                                  <th className="text-left px-2 py-1.5 text-gray-600 font-medium">日期</th>
                                </tr>
                              </thead>
                              <tbody>
                                {csvResult.validRoutes.map((route) => (
                                  <tr key={route.id} className={`border-t border-gray-100 ${selectedValidIds.has(route.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-2 py-1.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={selectedValidIds.has(route.id)}
                                        onChange={() => toggleValidRoute(route.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                    </td>
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
                                    <td className="px-2 py-1.5 text-gray-600">{route.date}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            已选 {selectedValidIds.size} / {csvResult.validRoutes.length} 条
                          </p>
                        </div>
                      )}

                      {csvResult.unknownLocations.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <MapPin className="w-4 h-4 text-orange-600" />
                            <h3 className="text-sm font-medium text-gray-700">未知地点处理</h3>
                          </div>
                          <div className="space-y-2">
                            {csvResult.unknownLocations.map((name) => {
                              const resolved = isLocationResolved(name);
                              const skipped = isLocationSkipped(name);
                              return (
                                <div
                                  key={name}
                                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                                    skipped
                                      ? 'bg-gray-50 border-gray-200 opacity-60'
                                      : resolved
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-orange-50 border-orange-200'
                                  }`}
                                >
                                  <span className="text-sm font-medium text-gray-800 min-w-[5rem]">{name}</span>
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <input
                                      type="number"
                                      step="any"
                                      placeholder="纬度"
                                      value={unknownLocationCoords[name]?.lat ?? ''}
                                      onChange={(e) => updateUnknownCoord(name, 'lat', e.target.value)}
                                      disabled={skipped}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                    <input
                                      type="number"
                                      step="any"
                                      placeholder="经度"
                                      value={unknownLocationCoords[name]?.lng ?? ''}
                                      onChange={(e) => updateUnknownCoord(name, 'lng', e.target.value)}
                                      disabled={skipped}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                    {resolved && (
                                      <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                    )}
                                  </div>
                                  <button
                                    onClick={() => toggleSkipLocation(name)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      skipped
                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {skipped ? (
                                      <>
                                        <Eye className="w-3 h-3" />
                                        恢复
                                      </>
                                    ) : (
                                      <>
                                        <EyeOff className="w-3 h-3" />
                                        跳过
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {csvResult.unknownLocationRows.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-xs font-medium text-gray-600 mb-1.5">
                                含未知地点的记录（{csvResult.unknownLocationRows.length} 条）
                              </h4>
                              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                      <th className="text-left px-2 py-1.5 text-gray-600 font-medium">路线</th>
                                      <th className="text-left px-2 py-1.5 text-gray-600 font-medium">未知地点</th>
                                      <th className="text-left px-2 py-1.5 text-gray-600 font-medium">状态</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {csvResult.unknownLocationRows.map((row) => {
                                      const status = getUnknownRowStatus(row);
                                      const allUnknown = [...row.unknownOrigins, ...row.unknownDestinations];
                                      return (
                                        <tr key={row.route.id} className={`border-t border-gray-100 ${
                                          status === 'resolved' ? 'bg-green-50' :
                                          status === 'skipped' ? 'bg-gray-50 opacity-60' :
                                          'bg-orange-50'
                                        }`}>
                                          <td className="px-2 py-1.5 text-gray-800">
                                            {row.route.origin} → {row.route.destination}
                                          </td>
                                          <td className="px-2 py-1.5 text-gray-600">
                                            {allUnknown.join('、')}
                                          </td>
                                          <td className="px-2 py-1.5">
                                            {status === 'resolved' && (
                                              <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                                                <CheckCircle className="w-3 h-3" />
                                                已补坐标
                                              </span>
                                            )}
                                            {status === 'skipped' && (
                                              <span className="inline-flex items-center gap-1 text-gray-500 font-medium">
                                                <EyeOff className="w-3 h-3" />
                                                已跳过
                                              </span>
                                            )}
                                            {status === 'pending' && (
                                              <span className="inline-flex items-center gap-1 text-orange-600 font-medium">
                                                <AlertTriangle className="w-3 h-3" />
                                                待处理
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {csvResult.errors.length > 0 && (
                        <div>
                          <button
                            onClick={() => setShowErrorDetails(!showErrorDetails)}
                            className="flex items-center gap-1.5 text-sm font-medium text-red-700 mb-2 hover:text-red-900 transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            错误详情（{csvResult.errors.length} 行）
                            <span className="text-xs text-gray-400 ml-1">
                              {showErrorDetails ? '收起' : '展开'}
                            </span>
                          </button>
                          {showErrorDetails && (
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
                          )}
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
                          disabled={getImportCount() === 0}
                          className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          确认导入 ({getImportCount()} 条)
                        </button>
                      </div>
                    </div>
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
