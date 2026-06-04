import { useMemo } from 'react';
import { useCommuteStore } from '../store/commuteStore';
import { transportModeLabels, transportModeColors, DimensionExplanation, DimensionComparison } from '../types/commute';
import { X, Clock, DollarSign, Heart, RefreshCw, AlertTriangle, Info } from 'lucide-react';

const dimensionConfig: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string; diffLabel: string }> = {
  time: { label: '时间', icon: Clock, color: '#3B82F6', bgColor: 'bg-blue-50', diffLabel: '快' },
  cost: { label: '费用', icon: DollarSign, color: '#10B981', bgColor: 'bg-green-50', diffLabel: '省' },
  comfort: { label: '舒适度', icon: Heart, color: '#8B5CF6', bgColor: 'bg-purple-50', diffLabel: '优' },
  stability: { label: '稳定性', icon: RefreshCw, color: '#F59E0B', bgColor: 'bg-amber-50', diffLabel: '稳' },
};

function ComparisonRow({ comp, isCurrent, dimension }: { comp: DimensionComparison; isCurrent: boolean; dimension: string }) {
  const config = dimensionConfig[dimension];
  const isLowerBetter = dimension === 'comfort';

  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs ${isCurrent ? `${config.bgColor} font-semibold` : 'hover:bg-gray-50'}`}>
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: transportModeColors[comp.transportMode] }}
      />
      <span className={`flex-1 ${isCurrent ? 'text-gray-800' : 'text-gray-600'}`}>
        {transportModeLabels[comp.transportMode]}
        {isCurrent && <span className="ml-1 text-gray-400 font-normal">(当前)</span>}
      </span>
      <span className="text-gray-500 w-16 text-right">
        {dimension === 'time' ? `${comp.rawValue}分钟` : dimension === 'cost' ? `¥${comp.rawValue}` : dimension === 'comfort' ? `${comp.rawValue}/5` : `${comp.rawValue}分`}
      </span>
      <span className="w-8 text-right font-medium" style={{ color: config.color }}>
        {comp.score}
      </span>
      {!isCurrent && comp.diff !== 0 && (
        <span className={`w-14 text-right ${isLowerBetter ? (comp.diff < 0 ? 'text-green-600' : 'text-red-500') : (comp.diff > 0 ? 'text-green-600' : 'text-red-500')}`}>
          {isLowerBetter
            ? (comp.diff < 0 ? `比当前${config.diffLabel}${Math.abs(comp.diff)}` : comp.diff > 0 ? `比当前差${comp.diff}` : '相同')
            : (comp.diff > 0 ? `比当前${config.diffLabel}${comp.diff}` : comp.diff < 0 ? `比当前差${Math.abs(comp.diff)}` : '相同')
          }
        </span>
      )}
      {isCurrent && <span className="w-14" />}
    </div>
  );
}

function DimensionCard({ explanation, scoringWeights }: { explanation: DimensionExplanation; scoringWeights: { time: number; cost: number; comfort: number; stability: number } }) {
  const config = dimensionConfig[explanation.dimension];
  const Icon = config.icon;
  const weight = scoringWeights[explanation.dimension];
  const totalWeight = scoringWeights.time + scoringWeights.cost + scoringWeights.comfort + scoringWeights.stability;
  const weightPercent = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;

  return (
    <div className="border border-gray-100 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-800">{config.label}评分</span>
            <span className="text-xs text-gray-400 ml-1.5">权重 {weightPercent}%</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold" style={{ color: config.color }}>{explanation.score}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-600 leading-relaxed">
        <span className="font-medium text-gray-700">计算方式：</span>{explanation.formula}
      </div>

      <div className="text-xs text-gray-500">
        原始值：<span className="font-medium text-gray-700">{explanation.rawValue}{explanation.rawUnit}</span>
        <span className="mx-2 text-gray-300">|</span>
        样本数：<span className="font-medium text-gray-700">{explanation.sampleCount}次</span>
      </div>

      {explanation.sampleWarning && (
        <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-100">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-amber-700 leading-relaxed">{explanation.sampleWarning}</span>
        </div>
      )}

      {explanation.comparisons.length > 1 && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">同起终点其他交通方式对比</div>
          <div className="space-y-0.5">
            {explanation.comparisons.map((comp) => (
              <ComparisonRow
                key={comp.transportMode}
                comp={comp}
                isCurrent={comp.transportMode === explanation.comparisons.find(c => c.label === '当前方案')?.transportMode}
                dimension={explanation.dimension}
              />
            ))}
          </div>
        </div>
      )}

      {explanation.comparisons.length <= 1 && (
        <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-gray-50 text-xs text-gray-400">
          <Info className="w-3 h-3" />
          同起终点无其他交通方式可对比
        </div>
      )}
    </div>
  );
}

export function ScoreExplanationPanel() {
  const { selectedScoreKey, setSelectedScoreKey, getScoreExplanation, scoringWeights } = useCommuteStore();

  const explanation = useMemo(() => {
    if (!selectedScoreKey) return null;
    return getScoreExplanation(selectedScoreKey);
  }, [selectedScoreKey, getScoreExplanation]);

  if (!selectedScoreKey || !explanation) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${transportModeColors[explanation.transportMode]}15` }}>
            <Info className="w-4 h-4" style={{ color: transportModeColors[explanation.transportMode] }} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">评分解释</h2>
            <p className="text-xs text-gray-400">{explanation.origin} → {explanation.destination}</p>
          </div>
        </div>
        <button
          onClick={() => setSelectedScoreKey(null)}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 p-3 rounded-xl border-2" style={{ borderColor: transportModeColors[explanation.transportMode], backgroundColor: `${transportModeColors[explanation.transportMode]}08` }}>
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: transportModeColors[explanation.transportMode] }}
          >
            {transportModeLabels[explanation.transportMode]}
          </span>
          <span className="text-sm font-medium text-gray-700">{explanation.name}</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800">{explanation.totalScore}</div>
          <div className="text-xs text-gray-400">综合评分</div>
        </div>
      </div>

      {explanation.sampleWarning && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-red-700 leading-relaxed font-medium">{explanation.sampleWarning}</span>
        </div>
      )}

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {explanation.dimensions.map((dim) => (
          <DimensionCard key={dim.dimension} explanation={dim} scoringWeights={scoringWeights} />
        ))}
      </div>

      {explanation.sameODScores.length > 1 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">同起终点方案综合排名</div>
          <div className="space-y-1.5">
            {explanation.sameODScores
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((s, i) => (
                <div
                  key={s.key}
                  className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    s.key === explanation.scoreKey ? 'bg-amber-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedScoreKey(s.key)}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    i === 0 ? 'bg-amber-500' : 'bg-gray-300'
                  }`}>{i + 1}</span>
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: transportModeColors[s.transportMode] }}
                  />
                  <span className={`flex-1 ${s.key === explanation.scoreKey ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                    {transportModeLabels[s.transportMode]}
                  </span>
                  <span className="font-bold text-gray-700">{s.totalScore}分</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
