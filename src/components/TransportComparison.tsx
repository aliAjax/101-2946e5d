import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell } from 'recharts';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeColors, transportModeLabels, TransportMode } from '../types/commute';
import { GitCompare, Users } from 'lucide-react';

export function TransportComparison() {
  const { getFilteredRoutes, selectedRouteId } = useCommuteStore();
  const filteredRoutes = getFilteredRoutes();

  const comparisonData = useMemo(() => {
    const modeGroups = new Map<TransportMode, { duration: number[]; cost: number[]; crowd: number[]; count: number }>();
    
    filteredRoutes.forEach(route => {
      if (!modeGroups.has(route.transportMode)) {
        modeGroups.set(route.transportMode, { duration: [], cost: [], crowd: [], count: 0 });
      }
      const group = modeGroups.get(route.transportMode)!;
      group.duration.push(route.duration);
      group.cost.push(route.cost);
      group.crowd.push(route.crowdLevel);
      group.count += 1;
    });
    
    return Array.from(modeGroups.entries()).map(([mode, data]) => ({
      mode,
      name: transportModeLabels[mode],
      avgDuration: Math.round(data.duration.reduce((a, b) => a + b, 0) / data.count),
      avgCost: Math.round((data.cost.reduce((a, b) => a + b, 0) / data.count) * 100) / 100,
      avgCrowd: Math.round((data.crowd.reduce((a, b) => a + b, 0) / data.count) * 10) / 10,
      count: data.count,
    }));
  }, [filteredRoutes]);

  const radarData = useMemo(() => {
    if (comparisonData.length === 0) return [];
    
    const maxDuration = Math.max(...comparisonData.map(d => d.avgDuration));
    const maxCost = Math.max(...comparisonData.map(d => d.avgCost));
    
    return comparisonData.map(d => ({
      mode: d.name,
      speed: Math.round((1 - d.avgDuration / maxDuration) * 100),
      economy: Math.round((1 - d.avgCost / Math.max(maxCost, 1)) * 100),
      comfort: Math.round((1 - d.avgCrowd / 5) * 100),
      frequency: Math.min(Math.round((d.count / comparisonData[0]?.count || 1) * 100), 100),
    }));
  }, [comparisonData]);

  const selectedRoute = filteredRoutes.find(r => r.id === selectedRouteId);
  const selectedMode = selectedRoute?.transportMode;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-5 h-5 text-purple-600" />
        <h2 className="text-lg font-semibold text-gray-800">交通方式对比</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-xs text-gray-500 mb-2">平均耗时</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value} 分钟`, '平均耗时']}
                />
                <Bar dataKey="avgDuration" radius={[0, 4, 4, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={transportModeColors[entry.mode]}
                      opacity={selectedMode ? (entry.mode === selectedMode ? 1 : 0.3) : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-500 mb-2">平均费用</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value} 元`, '平均费用']}
                />
                <Bar dataKey="avgCost" radius={[0, 4, 4, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={transportModeColors[entry.mode]}
                      opacity={selectedMode ? (entry.mode === selectedMode ? 1 : 0.3) : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-medium text-gray-700">综合对比雷达图</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="mode" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#9ca3af' }} />
            {radarData.map((entry, index) => (
              <Radar
                key={entry.mode}
                name={entry.mode}
                dataKey={['speed', 'economy', 'comfort', 'frequency'][index % 4]}
                stroke={transportModeColors[comparisonData[index]?.mode || 'subway']}
                fill={transportModeColors[comparisonData[index]?.mode || 'subway']}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            ))}
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2">
        {comparisonData.map((d) => (
          <div
            key={d.mode}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
            style={{ backgroundColor: `${transportModeColors[d.mode]}20`, color: transportModeColors[d.mode] }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: transportModeColors[d.mode] }} />
            {d.name}: {d.count}次
          </div>
        ))}
      </div>
    </div>
  );
}
