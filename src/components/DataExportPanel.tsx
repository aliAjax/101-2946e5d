import { useCommuteStore } from '../store/commuteStore';
import { transportModeLabels, timeOfDayLabels, CommuteRoute } from '../types/commute';
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';

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

export function DataExportPanel() {
  const { getFilteredRoutes } = useCommuteStore();

  const filteredRoutes = getFilteredRoutes();
  const hasData = filteredRoutes.length > 0;
  const timestamp = new Date().toISOString().slice(0, 10);

  const handleExportJSON = () => {
    if (!hasData) return;
    const json = JSON.stringify(filteredRoutes, null, 2);
    downloadFile(json, `通勤数据_${timestamp}.json`, 'application/json;charset=utf-8');
  };

  const handleExportCSV = () => {
    if (!hasData) return;
    const csv = '\uFEFF' + routesToCSV(filteredRoutes);
    downloadFile(csv, `通勤数据_${timestamp}.csv`, 'text/csv;charset=utf-8');
  };

  const handleExportSummary = () => {
    if (!hasData) return;
    const summary = generateSummary(filteredRoutes);
    downloadFile(summary, `通勤摘要_${timestamp}.txt`, 'text/plain;charset=utf-8');
  };

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
          onClick={handleExportJSON}
          disabled={!hasData}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-md"
        >
          <FileJson className="w-4 h-4" />
          导出 JSON
        </button>

        <button
          onClick={handleExportCSV}
          disabled={!hasData}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-600 disabled:hover:shadow-md"
        >
          <FileSpreadsheet className="w-4 h-4" />
          导出 CSV
        </button>

        <button
          onClick={handleExportSummary}
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
    </div>
  );
}
