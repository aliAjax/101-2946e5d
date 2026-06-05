import { useMemo, useState, useEffect } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { CalendarDays, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react';

interface DayStats {
  count: number;
  avgDuration: number;
  avgCost: number;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export function CommuteCalendar() {
  const { routes, selectedDate, setSelectedDate, calculateStatistics, monthFilterActive, setMonthFilter } = useCommuteStore();

  const routesByDate = useMemo(() => {
    const map = new Map<string, DayStats>();
    const groups = new Map<string, { duration: number; cost: number; count: number }>();
    routes.forEach(route => {
      if (!groups.has(route.date)) {
        groups.set(route.date, { duration: 0, cost: 0, count: 0 });
      }
      const g = groups.get(route.date)!;
      g.duration += route.duration;
      g.cost += route.cost;
      g.count += 1;
    });
    groups.forEach((v, date) => {
      map.set(date, {
        count: v.count,
        avgDuration: Math.round(v.duration / v.count),
        avgCost: Math.round((v.cost / v.count) * 100) / 100,
      });
    });
    return map;
  }, [routes]);

  const initDate = useMemo(() => {
    if (routesByDate.size === 0) return new Date();
    const dates = Array.from(routesByDate.keys()).sort();
    const firstDate = new Date(dates[0]);
    return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  }, [routesByDate]);

  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [firstDay, daysInMonth]);

  const handleDayClick = (day: number) => {
    const dateStr = formatDate(viewYear, viewMonth, day);
    const newDate = selectedDate === dateStr ? null : dateStr;
    setSelectedDate(newDate);
    setTimeout(calculateStatistics, 0);
  };

  const handlePrevMonth = () => {
    let newYear = viewYear;
    let newMonth: number;
    if (viewMonth === 0) {
      newMonth = 11;
      newYear = viewYear - 1;
    } else {
      newMonth = viewMonth - 1;
    }
    setViewYear(newYear);
    setViewMonth(newMonth);
    if (monthFilterActive) {
      setMonthFilter(true, newYear, newMonth);
    }
  };

  const handleNextMonth = () => {
    let newYear = viewYear;
    let newMonth: number;
    if (viewMonth === 11) {
      newMonth = 0;
      newYear = viewYear + 1;
    } else {
      newMonth = viewMonth + 1;
    }
    setViewYear(newYear);
    setViewMonth(newMonth);
    if (monthFilterActive) {
      setMonthFilter(true, newYear, newMonth);
    }
  };

  const handleGoToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    if (monthFilterActive) {
      setMonthFilter(true, t.getFullYear(), t.getMonth());
    }
  };

  const handleMonthTitleClick = () => {
    if (monthFilterActive) {
      setMonthFilter(false);
    } else {
      setMonthFilter(true, viewYear, viewMonth);
    }
  };

  const countColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 text-gray-400';
    if (count <= 2) return 'bg-blue-50 text-blue-700';
    if (count <= 4) return 'bg-indigo-100 text-indigo-700';
    return 'bg-indigo-200 text-indigo-900';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-800">通勤日历</h2>
          {selectedDate && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">
              已选: {selectedDate}
              <button
                onClick={() => { setSelectedDate(null); setTimeout(calculateStatistics, 0); }}
                className="hover:text-indigo-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {monthFilterActive && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
              <Filter className="w-3 h-3" />
              按月筛选
              <button
                onClick={() => setMonthFilter(false)}
                className="hover:text-green-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGoToday}
            className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
          >
            今天
          </button>
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleMonthTitleClick}
            className={`text-sm font-medium min-w-[5.5rem] text-center px-2 py-0.5 rounded-md transition-all ${
              monthFilterActive
                ? 'bg-green-100 text-green-700 ring-1 ring-green-300 hover:bg-green-200'
                : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
            title={monthFilterActive ? '点击恢复原日期范围' : '点击按当月筛选'}
          >
            {viewYear}年{viewMonth + 1}月
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map(label => (
          <div
            key={label}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {label}
          </div>
        ))}

        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const dateStr = formatDate(viewYear, viewMonth, day);
          const stats = routesByDate.get(dateStr);
          const isSelected = selectedDate === dateStr;
          const hasData = stats && stats.count > 0;

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(day)}
              className={`
                min-h-[5rem] rounded-lg p-1 flex flex-col items-center justify-start text-center
                transition-all cursor-pointer border-2 relative
                ${isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-md ring-1 ring-indigo-300'
                  : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <span className={`text-xs font-medium leading-none ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                {day}
              </span>

              {hasData ? (
                <>
                  <span className={`mt-1 text-[10px] leading-none font-semibold rounded px-1 ${countColor(stats.count)}`}>
                    {stats.count} 次
                  </span>
                  <div className="mt-1 flex flex-col items-center gap-0.5 text-[9px] leading-none text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-green-400" />
                      {stats.avgDuration}分
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                      ¥{stats.avgCost}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-[9px] leading-none text-gray-300 mt-3">-</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-100" /> 无记录
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-50" /> 1-2次
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-100" /> 3-4次
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-200" /> 5次+
        </div>
        <span>点击日期筛选 · 点击月份标题按月筛选</span>
      </div>
    </div>
  );
}
