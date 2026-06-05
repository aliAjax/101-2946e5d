import { useState, useMemo, useCallback } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeLabels, transportModeColors, timeOfDayLabels, anomalyTypeLabels, anomalySeverityLabels, CommuteRoute, RouteScore, AnomalyRecord, TransportMode, FavoriteRoute } from '../types/commute';
import { Download, FileJson, FileSpreadsheet, FileText, X, Eye, Clock, DollarSign, BarChart3, AlertTriangle, Star } from 'lucide-react';

type ExportFormat = 'json' | 'csv' | 'summary';

interface ExportOptions {
  includeScores: boolean;
  includeAnomalies: boolean;
  includeFavorites: boolean;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSVField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function routesToCSV(routes: CommuteRoute[]): string {
  const headers = ['路线名称', '出发地', '目的地', '交通方式', '耗时(分钟)', '费用(元)', '拥挤程度', '时间段', '日期'];
  const rows = routes.map(r => [
    r.name,
    r.origin,
    r.destination,
    transportModeLabels[r.transportMode],
    r.duration,
    r.cost,
    r.crowdLevel,
    timeOfDayLabels[r.timeOfDay || 'unknown'],
    r.date,
  ].map(escapeCSVField).join(','));
  return [headers.join(','), ...rows].join('\n');
}

function scoresToCSVSection(routeScores: RouteScore[]): string {
  const lines: string[] = [
    '',
    '',
    '=== 评分结果 ===',
    '',
  ];
  lines.push(['排名', '路线名称', '交通方式', '综合评分', '时间评分', '费用评分', '舒适评分', '稳定评分', '平均耗时', '平均费用', '样本数'].map(escapeCSVField).join(','));
  routeScores.forEach((s, i) => {
    lines.push([
      i + 1,
      s.name,
      transportModeLabels[s.transportMode],
      s.totalScore,
      s.timeScore,
      s.costScore,
      s.comfortScore,
      s.stabilityScore,
      s.avgDuration,
      s.avgCost,
      s.sampleCount,
    ].map(escapeCSVField).join(','));
  });
  return lines.join('\n');
}

function anomaliesToCSVSection(anomalies: AnomalyRecord[]): string {
  const lines: string[] = [
    '',
    '',
    '=== 异常摘要 ===',
    '',
  ];
  lines.push(['异常类型', '严重程度', '路线名称', '异常信息', '建议'].map(escapeCSVField).join(','));
  anomalies.forEach(a => {
    lines.push([
      anomalyTypeLabels[a.type],
      anomalySeverityLabels[a.severity],
      a.route.name,
      a.message,
      a.suggestion,
    ].map(escapeCSVField).join(','));
  });
  return lines.join('\n');
}

function generateSummary(routes: CommuteRoute[]): string {
  const totalRoutes = routes.length;
  const avgDuration = Math.round(routes.reduce((sum, r) => sum + r.duration, 0) / totalRoutes);
  const avgCost = Math.round(routes.reduce((sum, r) => sum + r.cost, 0) / totalRoutes * 100) / 100;
  const fastest = routes.reduce((min, r) => r.duration < min.duration ? r : min, routes[0]);
  const cheapest = routes.reduce((min, r) => r.cost < min.cost ? r : min, routes[0]);

  const lines: string[] = [
    '=== 通勤数据统计摘要 ===',
    '',
    `总记录数：${totalRoutes} 条`,
    `平均耗时：${avgDuration} 分钟/次`,
    `平均费用：¥${avgCost} 元/次`,
    '',
    '--- 最快路线 ---',
    `路线：${fastest.name}`,
    `交通方式：${transportModeLabels[fastest.transportMode]}`,
    `耗时：${fastest.duration} 分钟`,
    `费用：¥${fastest.cost}`,
    `日期：${fastest.date}`,
    '',
    '--- 最省钱路线 ---',
    `路线：${cheapest.name}`,
    `交通方式：${transportModeLabels[cheapest.transportMode]}`,
    `耗时：${cheapest.duration} 分钟`,
    `费用：¥${cheapest.cost}`,
    `日期：${cheapest.date}`,
    '',
    `导出时间：${new Date().toLocaleString('zh-CN')}`,
  ];
  return lines.join('\n');
}

function generateScoresSection(routeScores: RouteScore[]): string {
  if (routeScores.length === 0) return '';
  const lines: string[] = [
    '',
    '',
    '=== 通勤方案评分 ===',
    '',
  ];
  routeScores.forEach((s, i) => {
    lines.push(`#${i + 1}  ${s.name}（${transportModeLabels[s.transportMode]}）`);
    lines.push(`  综合评分：${s.totalScore}  时间：${s.timeScore}  费用：${s.costScore}  舒适：${s.comfortScore}  稳定：${s.stabilityScore}`);
    lines.push(`  平均耗时：${s.avgDuration}分钟  平均费用：¥${s.avgCost}  样本数：${s.sampleCount}`);
    lines.push('');
  });
  return lines.join('\n');
}

function generateAnomaliesSection(anomalies: AnomalyRecord[]): string {
  if (anomalies.length === 0) return '';
  const lines: string[] = [
    '',
    '',
    '=== 异常数据摘要 ===',
    '',
    `共检测到 ${anomalies.length} 条异常`,
    '',
  ];
  anomalies.forEach(a => {
    lines.push(`[${anomalySeverityLabels[a.severity]}] ${anomalyTypeLabels[a.type]}`);
    lines.push(`  路线：${a.route.name}`);
    lines.push(`  信息：${a.message}`);
    lines.push(`  建议：${a.suggestion}`);
    lines.push('');
  });
  return lines.join('\n');
}

function favoritesToCSVSection(favorites: FavoriteRoute[]): string {
  const lines: string[] = [
    '',
    '',
    '=== 收藏路线 ===',
    '',
  ];
  lines.push(['路线名称', '出发地', '目的地', '交通方式', '收藏时间', '备注'].map(escapeCSVField).join(','));
  favorites.forEach(f => {
    lines.push([
      f.name,
      f.origin,
      f.destination,
      transportModeLabels[f.transportMode],
      f.createdAt,
      f.note || '',
    ].map(escapeCSVField).join(','));
  });
  return lines.join('\n');
}

function generateFavoritesSection(favorites: FavoriteRoute[]): string {
  if (favorites.length === 0) return '';
  const lines: string[] = [
    '',
    '',
    '=== 收藏路线 ===',
    '',
    `共收藏 ${favorites.length} 条路线`,
    '',
  ];
  favorites.forEach(f => {
    lines.push(`${f.name}（${transportModeLabels[f.transportMode]}）`);
    lines.push(`  出发地：${f.origin}  目的地：${f.destination}`);
    lines.push(`  收藏时间：${new Date(f.createdAt).toLocaleString('zh-CN')}`);
    if (f.note) {
      lines.push(`  备注：${f.note}`);
    }
    lines.push('');
  });
  return lines.join('\n');
}

function TransportDistribution({ routes }: { routes: CommuteRoute[] }) {
  const distribution = useMemo(() => {
    const counts: Partial<Record<TransportMode, number>> = {};
    routes.forEach(r => {
      counts[r.transportMode] = (counts[r.transportMode] || 0) + 1;
    });
    const total = routes.length;
    const entries = (Object.entries(counts) as [TransportMode, number][])
      .sort((a, b) => b[1] - a[1]);
    return { entries, total };
  }, [routes]);

  return (
    <div className="space-y-2">
      {distribution.entries.map(([mode, count]) => {
        const percent = Math.round((count / distribution.total) * 100);
        return (
          <div key={mode} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-10 text-right">{transportModeLabels[mode]}</span>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${percent}%`,
                  backgroundColor: transportModeColors[mode],
                }}
              />
            </div>
            <span className="text-xs text-gray-500 w-16">{count}条 ({percent}%)</span>
          </div>
        );
      })}
    </div>
  );
}

function ExportPreviewModal({
  format,
  routes,
  routeScores,
  anomalies,
  favorites,
  onConfirm,
  onCancel,
}: {
  format: ExportFormat;
  routes: CommuteRoute[];
  routeScores: RouteScore[];
  anomalies: AnomalyRecord[];
  favorites: FavoriteRoute[];
  onConfirm: (options: ExportOptions) => void;
  onCancel: () => void;
}) {
  const [includeScores, setIncludeScores] = useState(true);
  const [includeAnomalies, setIncludeAnomalies] = useState(true);
  const [includeFavorites, setIncludeFavorites] = useState(true);

  const stats = useMemo(() => {
    const total = routes.length;
    const avgDuration = Math.round(routes.reduce((s, r) => s + r.duration, 0) / total);
    const avgCost = Math.round(routes.reduce((s, r) => s + r.cost, 0) / total * 100) / 100;
    const dates = routes.map(r => r.date).sort();
    const dateStart = dates[0];
    const dateEnd = dates[dates.length - 1];
    return { total, avgDuration, avgCost, dateStart, dateEnd };
  }, [routes]);

  const formatLabel = format === 'json' ? 'JSON' : format === 'csv' ? 'CSV' : '统计摘要';

  const handleConfirm = useCallback(() => {
    onConfirm({ includeScores, includeAnomalies, includeFavorites });
  }, [onConfirm, includeScores, includeAnomalies, includeFavorites]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-gray-800">导出预览</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
            <span className="text-xs text-indigo-600 font-medium">导出格式</span>
            <span className="text-sm font-semibold text-indigo-700">{formatLabel}</span>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">数据概览</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="text-xs text-gray-400 mb-0.5">记录数</div>
                <div className="text-lg font-bold text-gray-800">{stats.total} <span className="text-xs font-normal text-gray-400">条</span></div>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="text-xs text-gray-400 mb-0.5">日期范围</div>
                <div className="text-sm font-semibold text-gray-800">{stats.dateStart}</div>
                <div className="text-sm font-semibold text-gray-800">{stats.dateEnd}</div>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">平均耗时</div>
                  <div className="text-sm font-semibold text-gray-800">{stats.avgDuration} 分钟</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">平均费用</div>
                  <div className="text-sm font-semibold text-gray-800">¥{stats.avgCost}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">交通方式分布</h4>
            <TransportDistribution routes={routes} />
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">导出选项</h4>
            <div className="space-y-2.5">
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={includeScores}
                  onChange={e => setIncludeScores(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm font-medium text-gray-700">包含评分结果</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    导出各路线综合评分及分维度评分数据
                    {routeScores.length === 0 && (
                      <span className="text-amber-500 ml-1">（暂无评分数据）</span>
                    )}
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={includeAnomalies}
                  onChange={e => setIncludeAnomalies(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-sm font-medium text-gray-700">包含异常摘要</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    导出检测到的异常记录及处理建议
                    {anomalies.length === 0 && (
                      <span className="text-green-500 ml-1">（暂无异常）</span>
                    )}
                    {anomalies.length > 0 && (
                      <span className="text-red-500 ml-1">（共{anomalies.length}条异常）</span>
                    )}
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={includeFavorites}
                  onChange={e => setIncludeFavorites(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm font-medium text-gray-700">包含收藏信息</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    导出收藏路线及其备注信息
                    {favorites.length === 0 && (
                      <span className="text-gray-400 ml-1">（暂无收藏）</span>
                    )}
                    {favorites.length > 0 && (
                      <span className="text-amber-500 ml-1">（共{favorites.length}条收藏）</span>
                    )}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
          >
            确认导出
          </button>
        </div>
      </div>
    </div>
  );
}

export function DataExportPanel() {
  const { getFilteredRoutes, routeScores, anomalies, favorites } = useCommuteStore();
  const [previewFormat, setPreviewFormat] = useState<ExportFormat | null>(null);

  const filteredRoutes = getFilteredRoutes();
  const hasData = filteredRoutes.length > 0;
  const timestamp = new Date().toISOString().slice(0, 10);

  const handleOpenPreview = useCallback((format: ExportFormat) => {
    if (!hasData) return;
    setPreviewFormat(format);
  }, [hasData]);

  const handleConfirmExport = useCallback((format: ExportFormat, options: ExportOptions) => {
    if (format === 'json') {
      const data: Record<string, unknown> = { routes: filteredRoutes };
      if (options.includeScores) data.scores = routeScores;
      if (options.includeAnomalies) data.anomalies = anomalies;
      if (options.includeFavorites) data.favorites = favorites;
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, `通勤数据_${timestamp}.json`, 'application/json;charset=utf-8');
    } else if (format === 'csv') {
      let csv = routesToCSV(filteredRoutes);
      if (options.includeScores) csv += scoresToCSVSection(routeScores);
      if (options.includeAnomalies) csv += anomaliesToCSVSection(anomalies);
      if (options.includeFavorites) csv += favoritesToCSVSection(favorites);
      downloadFile('\uFEFF' + csv, `通勤数据_${timestamp}.csv`, 'text/csv;charset=utf-8');
    } else {
      let summary = generateSummary(filteredRoutes);
      if (options.includeScores) summary += generateScoresSection(routeScores);
      if (options.includeAnomalies) summary += generateAnomaliesSection(anomalies);
      if (options.includeFavorites) summary += generateFavoritesSection(favorites);
      downloadFile(summary, `通勤摘要_${timestamp}.txt`, 'text/plain;charset=utf-8');
    }
    setPreviewFormat(null);
  }, [filteredRoutes, routeScores, anomalies, favorites, timestamp]);

  const handleClosePreview = useCallback(() => {
    setPreviewFormat(null);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Download className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-800">数据导出</h2>
      </div>

      {!hasData && (
        <p className="text-sm text-gray-400 mb-4">当前筛选条件下无数据可导出</p>
      )}

      <div className="space-y-3">
        <button
          onClick={() => handleOpenPreview('json')}
          disabled={!hasData}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-md"
        >
          <FileJson className="w-4 h-4" />
          导出 JSON
        </button>

        <button
          onClick={() => handleOpenPreview('csv')}
          disabled={!hasData}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-600 disabled:hover:shadow-md"
        >
          <FileSpreadsheet className="w-4 h-4" />
          导出 CSV
        </button>

        <button
          onClick={() => handleOpenPreview('summary')}
          disabled={!hasData}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-purple-600 disabled:hover:shadow-md"
        >
          <FileText className="w-4 h-4" />
          导出统计摘要
        </button>
      </div>

      {hasData && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          当前筛选结果：{filteredRoutes.length} 条记录
        </p>
      )}

      {previewFormat && hasData && (
        <ExportPreviewModal
          format={previewFormat}
          routes={filteredRoutes}
          routeScores={routeScores}
          anomalies={anomalies}
          favorites={favorites}
          onConfirm={(options) => handleConfirmExport(previewFormat, options)}
          onCancel={handleClosePreview}
        />
      )}
    </div>
  );
}
