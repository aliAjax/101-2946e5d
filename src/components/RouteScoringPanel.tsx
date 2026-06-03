import { useEffect, useMemo } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeLabels, transportModeColors, RouteScore } from '../types/commute';
import { Award, Clock, DollarSign, Heart, RefreshCw, Star, TrendingUp } from 'lucide-react';

function ScoreBar({ value, color, label, icon: Icon }: { value: number; color: string; label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <span className="text-xs text-gray-500 w-12">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

function WeightSlider({ 
  label, 
  value, 
  normalizedPercent,
  onChange, 
  color, 
  icon: Icon 
}: { 
  label: string; 
  value: number; 
  normalizedPercent: number;
  onChange: (v: number) => void; 
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-xs font-bold" style={{ color }}>{normalizedPercent}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`,
        }}
      />
    </div>
  );
}

function RouteScoreCard({ score, rank, isFirst }: { score: RouteScore; rank: number; isFirst: boolean }) {
  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      isFirst 
        ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-md' 
        : 'border-gray-100 bg-white hover:border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
            rank === 1 ? 'bg-amber-500' : rank === 2 ? 'bg-gray-400' : rank === 3 ? 'bg-amber-700' : 'bg-gray-300'
          }`}>
            {rank}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">{score.name}</h4>
            <p className="text-xs text-gray-500">{score.origin} → {score.destination}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            {isFirst && <Award className="w-4 h-4 text-amber-500" />}
            <span className={`text-lg font-bold ${
              isFirst ? 'text-amber-600' : 'text-gray-700'
            }`}>{score.totalScore}</span>
          </div>
          <span 
            className="text-xs px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: transportModeColors[score.transportMode] }}
          >
            {transportModeLabels[score.transportMode]}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <ScoreBar value={score.timeScore} color="#3B82F6" label="时间" icon={Clock} />
        <ScoreBar value={score.costScore} color="#10B981" label="费用" icon={DollarSign} />
        <ScoreBar value={score.comfortScore} color="#8B5CF6" label="舒适" icon={Heart} />
        <ScoreBar value={score.stabilityScore} color="#F59E0B" label="稳定" icon={RefreshCw} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>{score.avgDuration}分钟 · ¥{score.avgCost}</span>
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3" />
          {score.sampleCount}次记录
          {score.sampleCount < 2 && <span className="text-amber-500">· 样本不足</span>}
        </span>
      </div>
    </div>
  );
}

export function RouteScoringPanel() {
  const { 
    getFilteredRoutes, 
    scoringWeights, 
    routeScores, 
    setScoringWeights, 
    calculateRouteScores 
  } = useCommuteStore();
  
  const filters = useCommuteStore((s) => s.filters);
  const routes = useCommuteStore((s) => s.routes);
  const selectedDate = useCommuteStore((s) => s.selectedDate);

  const filteredRoutes = getFilteredRoutes();
  const hasData = filteredRoutes.length > 0;
  const hasScores = routeScores.length > 0;

  useEffect(() => {
    calculateRouteScores();
  }, [calculateRouteScores, filters, routes, selectedDate]);

  const handleWeightChange = (key: keyof typeof scoringWeights, value: number) => {
    setScoringWeights({ [key]: value });
  };

  const resetWeights = () => {
    setScoringWeights({ time: 25, cost: 25, comfort: 25, stability: 25 });
  };

  const topRoutes = useMemo(() => routeScores.slice(0, 5), [routeScores]);

  const totalWeight = scoringWeights.time + scoringWeights.cost + scoringWeights.comfort + scoringWeights.stability;

  const normalizePercent = (w: number) => totalWeight > 0 ? Math.round((w / totalWeight) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-800">通勤方案评分</h2>
        </div>
        <button
          onClick={resetWeights}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          重置权重
        </button>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
          调整偏好权重
        </h3>
        <div className="space-y-3">
          <WeightSlider
            label="更省时间"
            value={scoringWeights.time}
            normalizedPercent={normalizePercent(scoringWeights.time)}
            onChange={(v) => handleWeightChange('time', v)}
            color="#3B82F6"
            icon={Clock}
          />
          <WeightSlider
            label="更省钱"
            value={scoringWeights.cost}
            normalizedPercent={normalizePercent(scoringWeights.cost)}
            onChange={(v) => handleWeightChange('cost', v)}
            color="#10B981"
            icon={DollarSign}
          />
          <WeightSlider
            label="更舒适"
            value={scoringWeights.comfort}
            normalizedPercent={normalizePercent(scoringWeights.comfort)}
            onChange={(v) => handleWeightChange('comfort', v)}
            color="#8B5CF6"
            icon={Heart}
          />
          <WeightSlider
            label="更稳定"
            value={scoringWeights.stability}
            normalizedPercent={normalizePercent(scoringWeights.stability)}
            onChange={(v) => handleWeightChange('stability', v)}
            color="#F59E0B"
            icon={RefreshCw}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          最佳路线推荐
          {hasScores && <span className="text-xs text-gray-400 ml-1">({routeScores.length}个方案)</span>}
        </h3>
        
        {!hasData && (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">当前筛选条件下无数据</p>
            <p className="text-xs text-gray-300 mt-1">请调整筛选条件或添加路线</p>
          </div>
        )}

        {hasData && !hasScores && (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">正在计算评分...</p>
          </div>
        )}

        {hasScores && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {topRoutes.map((score, index) => (
              <RouteScoreCard
                key={score.key}
                score={score}
                rank={index + 1}
                isFirst={index === 0}
              />
            ))}
          </div>
        )}

        {hasScores && routeScores.length > 5 && (
          <p className="text-xs text-gray-400 text-center mt-3">
            仅显示前 5 个最佳方案
          </p>
        )}
      </div>
    </div>
  );
}
