import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeColors, transportModeLabels } from '../types/commute';
import { TrendingUp, Clock } from 'lucide-react';

export function TimeTrendChart() {
  const { getFilteredRoutes, selectedRouteId, selectRoute } = useCommuteStore();
  const filteredRoutes = getFilteredRoutes();

  const chartData = useMemo(() => {
    const dateGroups = new Map<string, { date: string; avgDuration: number; avgCost: number; count: number; routeIds: string[] }>();
    
    filteredRoutes.forEach(route => {
      if (!dateGroups.has(route.date)) {
        dateGroups.set(route.date, {
          date: route.date,
          avgDuration: 0,
          avgCost: 0,
          count: 0,
          routeIds: [],
        });
      }
      const group = dateGroups.get(route.date)!;
      group.avgDuration += route.duration;
      group.avgCost += route.cost;
      group.count += 1;
      group.routeIds.push(route.id);
    });
    
    return Array.from(dateGroups.values())
      .map(g => ({
        date: g.date.slice(5),
        avgDuration: Math.round(g.avgDuration / g.count),
        avgCost: Math.round((g.avgCost / g.count) * 100) / 100,
        count: g.count,
        routeIds: g.routeIds,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRoutes]);

  const isAnySelected = selectedRouteId !== null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <h2 className="text-lg font-semibold text-gray-800">时间趋势</h2>
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
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number) => [`${value} 分钟`, '平均耗时']}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="avgDuration"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6, fill: '#2563EB' }}
              opacity={isAnySelected ? 0.3 : 1}
            />
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
              <Bar
                dataKey="count"
                fill="#F59E0B"
                radius={[4, 4, 0, 0]}
                opacity={isAnySelected ? 0.3 : 1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
