import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeColors, transportModeLabels, TransportMode } from '../types/commute';
import { TrendingUp, Clock } from 'lucide-react';

export function TimeTrendChart() {
  const { getFilteredRoutes, selectedRouteId } = useCommuteStore();
  const filteredRoutes = getFilteredRoutes();

  const selectedRoute = useMemo(() => 
    filteredRoutes.find(r => r.id === selectedRouteId),
    [filteredRoutes, selectedRouteId]
  );

  const chartData = useMemo(() => {
    const dateGroups = new Map<string, {
      date: string;
      totalDuration: number;
      totalCost: number;
      count: number;
      byMode: Record<TransportMode, { duration: number; count: number }>;
      hasSelectedRoute: boolean;
    }>();
    
    const initByMode = () => ({
      subway: { duration: 0, count: 0 },
      bus: { duration: 0, count: 0 },
      car: { duration: 0, count: 0 },
      bike: { duration: 0, count: 0 },
      walk: { duration: 0, count: 0 },
    });

    filteredRoutes.forEach(route => {
      if (!dateGroups.has(route.date)) {
        dateGroups.set(route.date, {
          date: route.date,
          totalDuration: 0,
          totalCost: 0,
          count: 0,
          byMode: initByMode(),
          hasSelectedRoute: false,
        });
      }
      const group = dateGroups.get(route.date)!;
      group.totalDuration += route.duration;
      group.totalCost += route.cost;
      group.count += 1;
      group.byMode[route.transportMode].duration += route.duration;
      group.byMode[route.transportMode].count += 1;
      
      if (selectedRoute && 
          route.origin === selectedRoute.origin && 
          route.destination === selectedRoute.destination &&
          route.transportMode === selectedRoute.transportMode) {
        group.hasSelectedRoute = true;
      }
    });
    
    return Array.from(dateGroups.values())
      .map(g => ({
        date: g.date.slice(5),
        avgDuration: Math.round(g.totalDuration / g.count),
        avgCost: Math.round((g.totalCost / g.count) * 100) / 100,
        count: g.count,
        subway: g.byMode.subway.count > 0 ? Math.round(g.byMode.subway.duration / g.byMode.subway.count) : null,
        bus: g.byMode.bus.count > 0 ? Math.round(g.byMode.bus.duration / g.byMode.bus.count) : null,
        car: g.byMode.car.count > 0 ? Math.round(g.byMode.car.duration / g.byMode.car.count) : null,
        bike: g.byMode.bike.count > 0 ? Math.round(g.byMode.bike.duration / g.byMode.bike.count) : null,
        walk: g.byMode.walk.count > 0 ? Math.round(g.byMode.walk.duration / g.byMode.walk.count) : null,
        hasSelectedRoute: g.hasSelectedRoute,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRoutes, selectedRoute]);

  const isModeHighlighted = (mode: TransportMode) => {
    if (!selectedRoute) return true;
    return mode === selectedRoute.transportMode;
  };

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      name: string;
      value: number;
      color: string;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-800 mb-2">日期: {label}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">
                {transportModeLabels[entry.dataKey as TransportMode] || entry.name}
              </span>
              <span className="font-medium text-gray-800">
                {entry.value} 分钟
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <h2 className="text-lg font-semibold text-gray-800">时间趋势</h2>
        {selectedRoute && (
          <span 
            className="text-xs px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: transportModeColors[selectedRoute.transportMode] }}
          >
            {transportModeLabels[selectedRoute.transportMode]}
          </span>
        )}
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              label={{ value: '分钟', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            {(Object.keys(transportModeLabels) as TransportMode[]).map((mode) => (
              <Line
                key={mode}
                type="monotone"
                dataKey={mode}
                name={transportModeLabels[mode]}
                stroke={transportModeColors[mode]}
                strokeWidth={isModeHighlighted(mode) ? 3 : 1.5}
                dot={{ 
                  fill: transportModeColors[mode], 
                  r: isModeHighlighted(mode) ? 4 : 2,
                  opacity: isModeHighlighted(mode) ? 1 : 0.3
                }}
                activeDot={{ r: 6 }}
                opacity={isModeHighlighted(mode) ? 1 : 0.2}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-gray-700">每日通勤次数</span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: number) => [`${value} 次`, '通勤次数']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={selectedRoute ? (entry.hasSelectedRoute ? '#F59E0B' : '#FCD34D') : '#F59E0B'}
                    opacity={selectedRoute ? (entry.hasSelectedRoute ? 1 : 0.3) : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
