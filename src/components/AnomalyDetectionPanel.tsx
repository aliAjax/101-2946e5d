import { useState, useEffect, useMemo } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { 
  AnomalyType, 
  AnomalyRecord,
  anomalyTypeLabels, 
  anomalySeverityColors, 
  anomalySeverityLabels 
} from '../types/commute';
import { getAnomalyCountByType, getAnomalyCountBySeverity } from '../lib/anomalyDetector';
import { 
  AlertTriangle, 
  Trash2, 
  EyeOff, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users,
  X,
  CheckCircle,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  AlertCircle,
  Info
} from 'lucide-react';

type FilterSeverity = 'all' | AnomalyRecord['severity'];
type FilterType = 'all' | AnomalyType;

export function AnomalyDetectionPanel() {
  const { 
    anomalies, 
    ignoredAnomalyKeys,
    detectAnomalies, 
    ignoreAnomaly, 
    deleteRouteAndAnomalies, 
    focusRoute,
    clearIgnoredAnomalies,
    routes,
    filters
  } = useCommuteStore();

  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    detectAnomalies();
  }, [detectAnomalies, routes.length, filters.dateRange]);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      detectAnomalies();
      setIsScanning(false);
    }, 500);
  };

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(anomaly => {
      if (severityFilter !== 'all' && anomaly.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && anomaly.type !== typeFilter) return false;
      return true;
    });
  }, [anomalies, severityFilter, typeFilter]);

  const countByType = useMemo(() => getAnomalyCountByType(anomalies), [anomalies]);
  const countBySeverity = useMemo(() => getAnomalyCountBySeverity(anomalies), [anomalies]);

  const getSeverityIcon = (severity: AnomalyRecord['severity']) => {
    switch (severity) {
      case 'critical': return <AlertOctagon className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertCircle className="w-4 h-4" />;
      case 'low': return <Info className="w-4 h-4" />;
    }
  };

  const handleFocusRoute = (routeId: string) => {
    focusRoute(routeId);
  };

  const handleDeleteRoute = (routeId: string, anomalyId: string) => {
    if (confirm('确定要删除这条通勤记录吗？此操作不可撤销。')) {
      deleteRouteAndAnomalies(routeId);
      if (expandedAnomaly === anomalyId) {
        setExpandedAnomaly(null);
      }
    }
  };

  const handleIgnoreAnomaly = (anomalyId: string) => {
    ignoreAnomaly(anomalyId);
    if (expandedAnomaly === anomalyId) {
      setExpandedAnomaly(null);
    }
  };

  const anomalyTypes: AnomalyType[] = [
    'negative_cost',
    'invalid_crowd_level',
    'same_origin_destination',
    'date_out_of_range',
    'duration_outlier',
    'invalid_transport_mode',
    'invalid_duration',
  ];

  const severityLevels: AnomalyRecord['severity'][] = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">异常通勤检测</h2>
            <p className="text-xs text-gray-500">自动检测并清理异常数据</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
            title="重新扫描"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-all ${
              showFilters || severityFilter !== 'all' || typeFilter !== 'all'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="筛选"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {severityLevels.map(severity => (
            <div
              key={severity}
              className="text-center p-2 rounded-lg bg-gray-50"
            >
              <div 
                className="text-lg font-bold"
                style={{ color: anomalySeverityColors[severity] }}
              >
                {countBySeverity[severity]}
              </div>
              <div className="text-xs text-gray-500">
                {anomalySeverityLabels[severity]}
              </div>
            </div>
          ))}
        </div>
      )}

      {showFilters && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">按严重程度</label>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSeverityFilter('all')}
                className={`text-xs px-2 py-1 rounded transition-all ${
                  severityFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                全部
              </button>
              {severityLevels.map(severity => (
                <button
                  key={severity}
                  onClick={() => setSeverityFilter(severity)}
                  className={`text-xs px-2 py-1 rounded transition-all ${
                    severityFilter === severity
                      ? 'text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                  style={severityFilter === severity ? { backgroundColor: anomalySeverityColors[severity] } : {}}
                >
                  {anomalySeverityLabels[severity]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">按异常类型</label>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setTypeFilter('all')}
                className={`text-xs px-2 py-1 rounded transition-all ${
                  typeFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                全部
              </button>
              {anomalyTypes.map(type => (
                countByType[type] > 0 && (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`text-xs px-2 py-1 rounded transition-all ${
                      typeFilter === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {anomalyTypeLabels[type]} ({countByType[type]})
                  </button>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-auto pr-1">
        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-8">
            {anomalies.length === 0 ? (
              <>
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="text-sm text-gray-500">太棒了！未检测到异常数据</p>
                <p className="text-xs text-gray-400 mt-1">所有通勤记录都在正常范围内</p>
              </>
            ) : (
              <>
                <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">当前筛选条件下无异常记录</p>
                <button
                  onClick={() => { setSeverityFilter('all'); setTypeFilter('all'); }}
                  className="text-xs text-blue-600 hover:underline mt-2"
                >
                  清除筛选条件
                </button>
              </>
            )}
          </div>
        ) : (
          filteredAnomalies.map((anomaly) => {
            const isExpanded = expandedAnomaly === anomaly.id;
            return (
              <div
                key={anomaly.id}
                className="border rounded-lg overflow-hidden transition-all hover:shadow-md"
                style={{ borderColor: anomalySeverityColors[anomaly.severity] + '40' }}
              >
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => setExpandedAnomaly(isExpanded ? null : anomaly.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="p-1.5 rounded-lg flex-shrink-0"
                      style={{ 
                        backgroundColor: anomalySeverityColors[anomaly.severity] + '15',
                        color: anomalySeverityColors[anomaly.severity]
                      }}
                    >
                      {getSeverityIcon(anomaly.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: anomalySeverityColors[anomaly.severity] + '15',
                            color: anomalySeverityColors[anomaly.severity]
                          }}
                        >
                          {anomalySeverityLabels[anomaly.severity]}
                        </span>
                        <span className="text-xs font-medium text-gray-600">
                          {anomalyTypeLabels[anomaly.type]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 line-clamp-2">{anomaly.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {anomaly.route.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {anomaly.route.date}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-100">
                    <div className="pt-3 space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500">耗时</span>
                            <div className="flex items-center gap-1 font-medium text-gray-800 mt-0.5">
                              <Clock className="w-3 h-3 text-blue-500" />
                              {anomaly.route.duration}分钟
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">费用</span>
                            <div className="flex items-center gap-1 font-medium text-gray-800 mt-0.5">
                              <DollarSign className="w-3 h-3 text-green-500" />
                              ¥{anomaly.route.cost}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">拥挤度</span>
                            <div className="flex items-center gap-1 font-medium text-gray-800 mt-0.5">
                              <Users className="w-3 h-3 text-orange-500" />
                              {anomaly.route.crowdLevel}/5
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-amber-800 mb-1">💡 处理建议</p>
                        <p className="text-xs text-amber-700">{anomaly.suggestion}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFocusRoute(anomaly.routeId);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          定位路线
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIgnoreAnomaly(anomaly.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          忽略
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoute(anomaly.routeId, anomaly.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {ignoredAnomalyKeys.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              已忽略 <span className="font-medium">{ignoredAnomalyKeys.length}</span> 条异常
            </p>
            <button
              onClick={() => {
                if (confirm('确定要恢复所有已忽略的异常吗？')) {
                  clearIgnoredAnomalies();
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              恢复已忽略
            </button>
          </div>
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              显示 {filteredAnomalies.length} / {anomalies.length} 条异常
            </span>
            <span>
              共 {routes.length} 条记录
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AnomalyNotificationBadge() {
  const { anomalies, setAnomalyPanelOpen, isAnomalyPanelOpen } = useCommuteStore();
  const criticalCount = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length;

  if (anomalies.length === 0) return null;

  return (
    <button
      onClick={() => setAnomalyPanelOpen(!isAnomalyPanelOpen)}
      className="relative p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
      title="异常通勤检测"
    >
      <AlertTriangle className="w-5 h-5" />
      {criticalCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {criticalCount > 9 ? '9+' : criticalCount}
        </span>
      )}
    </button>
  );
}

export function AnomalySlidePanel() {
  const { isAnomalyPanelOpen, setAnomalyPanelOpen } = useCommuteStore();

  if (!isAnomalyPanelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setAnomalyPanelOpen(false)}
      />
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-auto animate-slide-in">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-800">异常通勤检测</h2>
          <button
            onClick={() => setAnomalyPanelOpen(false)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          <AnomalyDetectionPanel />
        </div>
      </div>
    </div>
  );
}
