import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useCommuteStore } from '../store/commuteStore';
import { 
  transportModeColors, 
  transportModeLabels, 
  TransportMode, 
  TimeOfDay,
  timeOfDayColors,
  timeOfDayLabels 
} from '../types/commute';
import { BarChart3, Clock, DollarSign, Users } from 'lucide-react';

interface PeakTooltipPayload {
  payload: {
    name: string;
    avgDuration: number;
    avgCost: number;
    avgCrowd: number;
    count: number;
  };
}

interface PeakTooltipProps {
  active?: boolean;
  payload?: PeakTooltipPayload[];
}

export function PeakHourComparison() {
  const { getFilteredRoutes, selectedRouteId } = useCommuteStore();
  const filteredRoutes = getFilteredRoutes();

  const selectedRoute = useMemo(() => 
    filteredRoutes.find(r => r.id === selectedRouteId),
    [filteredRoutes, selectedRouteId]
  );
  const selectedMode = selectedRoute?.transportMode;

  const comparisonData = useMemo(() => {
    const timeGroups = new Map<TimeOfDay, {
      duration: number[];
      cost: number[];
      crowd: number[];
      count: number;
      byMode: Record<TransportMode, { duration: number; cost: number; crowd: number; count: number }>;
    }>();

    const initByMode = () => ({
      subway: { duration: 0, cost: 0, crowd: 0, count: 0 },
      bus: { duration: 0, cost: 0, crowd: 0, count: 0 },
      car: { duration: 0, cost: 0, crowd: 0, count: 0 },
      bike: { duration: 0, cost: 0, crowd: 0, count: 0 },
      walk: { duration: 0, cost: 0, crowd: 0, count: 0 },
    });

    const timeOrder: TimeOfDay[] = ['morning_peak', 'evening_peak', 'off_peak', 'unknown'];

    timeOrder.forEach(time => {
      timeGroups.set(time, {
        duration: [],
        cost: [],
        crowd: [],
        count: 0,
        byMode: initByMode(),
      });
    });

    filteredRoutes.forEach(route => {
      const timeOfDay = route.timeOfDay || 'unknown';
      const group = timeGroups.get(timeOfDay)!;
      
      group.duration.push(route.duration);
      group.cost.push(route.cost);
      group.crowd.push(route.crowdLevel);
      group.count += 1;
      
      const modeData = group.byMode[route.transportMode];
      modeData.duration += route.duration;
      modeData.cost += route.cost;
      modeData.crowd += route.crowdLevel;
      modeData.count += 1;
    });

    return Array.from(timeGroups.entries())
      .filter(([, data]) => data.count > 0)
      .map(([time, data]) => ({
        time,
        name: timeOfDayLabels[time],
        color: timeOfDayColors[time],
        avgDuration: Math.round(data.duration.reduce((a, b) => a + b, 0) / data.count),
        avgCost: Math.round((data.cost.reduce((a, b) => a + b, 0) / data.count) * 100) / 100,
        avgCrowd: Math.round((data.crowd.reduce((a, b) => a + b, 0) / data.count) * 10) / 10,
        count: data.count,
        byMode: Object.fromEntries(
          Object.entries(data.byMode)
            .filter(([, modeData]) => modeData.count > 0)
            .map(([mode, modeData]) => [
              mode,
              {
                avgDuration: Math.round(modeData.duration / modeData.count),
                avgCost: Math.round((modeData.cost / modeData.count) * 100) / 100,
                avgCrowd: Math.round((modeData.crowd / modeData.count) * 10) / 10,
                count: modeData.count,
              },
            ])
        ) as Record<TransportMode, { avgDuration: number; avgCost: number; avgCrowd: number; count: number }>,
      }));
  }, [filteredRoutes]);

  const isHighlighted = (mode: TransportMode) => {
    if (!selectedMode) return true;
    return mode === selectedMode;
  };

  const CustomTooltip = ({ active, payload }: PeakTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-800 mb-2">{data.name}</p>
          <p className="text-xs text-gray-600">平均耗时: <span className="font-medium">{data.avgDuration} 分钟</span></p>
          <p className="text-xs text-gray-600">平均费用: <span className="font-medium">¥{data.avgCost}</span></p>
          <p className="text-xs text-gray-600">平均拥挤: <span className="font-medium">{data.avgCrowd} / 5</span></p>
          <p className="text-xs text-gray-500 mt-1">样本数: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-rose-600" />
          <h2 className="text-lg font-semibold text-gray-800">早晚高峰对比</h2>
        </div>
        {selectedRoute && (
          <span 
            className="text-xs px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: transportModeColors[selectedRoute.transportMode] }}
          >
            {transportModeLabels[selectedRoute.transportMode]}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <Clock className="w-3.5 h-3.5" />
            平均耗时 (分钟)
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgDuration" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <DollarSign className="w-3.5 h-3.5" />
            平均费用 (元)
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgCost" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <Users className="w-3.5 h-3.5" />
            平均拥挤程度
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 5]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgCrowd" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t pt-4">
        <div className="text-sm font-medium text-gray-700 mb-3">各交通方式分时段详细对比</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 text-gray-600 font-medium">交通方式</th>
                {comparisonData.map(d => (
                  <th key={d.time} className="text-center px-3 py-2 font-medium" style={{ color: d.color }}>
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(transportModeLabels) as TransportMode[]).map(mode => {
                const hasData = comparisonData.some(d => d.byMode[mode]);
                if (!hasData) return null;
                
                return (
                  <tr 
                    key={mode} 
                    className="border-t border-gray-100"
                    style={{ opacity: isHighlighted(mode) ? 1 : 0.3 }}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: transportModeColors[mode] }}
                        />
                        <span className="text-gray-700">{transportModeLabels[mode]}</span>
                      </div>
                    </td>
                    {comparisonData.map(d => {
                      const modeData = d.byMode[mode];
                      if (!modeData) {
                        return (
                          <td key={d.time} className="text-center px-3 py-2 text-gray-300">
                            -
                          </td>
                        );
                      }
                      return (
                        <td key={d.time} className="text-center px-3 py-2">
                          <div className="text-gray-700 font-medium">
                            {modeData.avgDuration}分
                          </div>
                          <div className="text-gray-400">
                            ¥{modeData.avgCost} · {modeData.avgCrowd}挤
                          </div>
                          <div className="text-gray-400 text-[10px]">
                            n={modeData.count}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {comparisonData.map(d => (
          <div
            key={d.time}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
            style={{ 
              backgroundColor: `${d.color}15`, 
              color: d.color,
            }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name}: {d.count}次
          </div>
        ))}
      </div>
    </div>
  );
}
