import { CommuteRoute, RouteScore, ScoringWeights, ScoreExplanation, DimensionExplanation, DimensionComparison } from '../types/commute';
import { calculateStandardDeviation } from './statistics';

export function calculateRouteScores(filteredRoutes: CommuteRoute[], scoringWeights: ScoringWeights): RouteScore[] {
  if (filteredRoutes.length === 0) {
    return [];
  }

  const routeGroups = new Map<string, CommuteRoute[]>();
  filteredRoutes.forEach(route => {
    const key = `${route.origin}-${route.destination}-${route.transportMode}`;
    if (!routeGroups.has(key)) {
      routeGroups.set(key, []);
    }
    routeGroups.get(key)!.push(route);
  });

  let maxDuration = 0;
  let maxCost = 0;

  routeGroups.forEach((routes) => {
    const avgDuration = routes.reduce((sum, r) => sum + r.duration, 0) / routes.length;
    const avgCost = routes.reduce((sum, r) => sum + r.cost, 0) / routes.length;
    maxDuration = Math.max(maxDuration, avgDuration);
    maxCost = Math.max(maxCost, avgCost);
  });

  const totalWeight = scoringWeights.time + scoringWeights.cost + scoringWeights.comfort + scoringWeights.stability;

  const scores: RouteScore[] = Array.from(routeGroups.entries()).map(([key, routes]) => {
    const sampleCount = routes.length;
    const avgDuration = routes.reduce((sum, r) => sum + r.duration, 0) / sampleCount;
    const avgCost = routes.reduce((sum, r) => sum + r.cost, 0) / sampleCount;
    const avgCrowd = routes.reduce((sum, r) => sum + r.crowdLevel, 0) / sampleCount;

    const durations = routes.map(r => r.duration);
    const stdDev = calculateStandardDeviation(durations);

    const timeScore = maxDuration > 0 ? Math.max(0, 100 - (avgDuration / maxDuration) * 100) : 50;
    const costScore = maxCost > 0 ? Math.max(0, 100 - (avgCost / maxCost) * 100) : 50;
    const comfortScore = Math.max(0, 100 - (avgCrowd / 5) * 100);

    let stabilityScore: number;
    if (sampleCount < 2) {
      stabilityScore = 50;
    } else {
      const meanDuration = avgDuration;
      const cv = meanDuration > 0 ? (stdDev / meanDuration) * 100 : 0;
      stabilityScore = Math.max(0, 100 - cv * 2);
    }

    const totalScore = totalWeight > 0
      ? (
          (timeScore * scoringWeights.time) +
          (costScore * scoringWeights.cost) +
          (comfortScore * scoringWeights.comfort) +
          (stabilityScore * scoringWeights.stability)
        ) / totalWeight
      : 0;

    return {
      key,
      name: routes[0].name,
      origin: routes[0].origin,
      destination: routes[0].destination,
      transportMode: routes[0].transportMode,
      avgDuration: Math.round(avgDuration),
      avgCost: Math.round(avgCost * 100) / 100,
      avgCrowd: Math.round(avgCrowd * 10) / 10,
      stabilityScore: Math.round(stabilityScore),
      sampleCount,
      totalScore: Math.round(totalScore),
      timeScore: Math.round(timeScore),
      costScore: Math.round(costScore),
      comfortScore: Math.round(comfortScore),
    };
  });

  scores.sort((a, b) => b.totalScore - a.totalScore);

  return scores;
}

export function getScoreExplanation(
  key: string,
  routeScores: RouteScore[],
  filteredRoutes: CommuteRoute[]
): ScoreExplanation | null {
  const targetScore = routeScores.find(s => s.key === key);
  if (!targetScore) return null;

  const sameODScores = routeScores.filter(
    s => s.origin === targetScore.origin && s.destination === targetScore.destination
  );

  const routeGroups = new Map<string, CommuteRoute[]>();
  filteredRoutes.forEach(route => {
    const groupKey = `${route.origin}-${route.destination}-${route.transportMode}`;
    if (!routeGroups.has(groupKey)) routeGroups.set(groupKey, []);
    routeGroups.get(groupKey)!.push(route);
  });

  const targetRoutes = routeGroups.get(key) || [];
  const sampleCount = targetRoutes.length;

  const durations = targetRoutes.map(r => r.duration);
  const stdDev = calculateStandardDeviation(durations);
  const meanDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  let maxDuration = 0;
  let maxCost = 0;
  routeGroups.forEach((routes) => {
    const avgDur = routes.reduce((sum, r) => sum + r.duration, 0) / routes.length;
    const avgC = routes.reduce((sum, r) => sum + r.cost, 0) / routes.length;
    maxDuration = Math.max(maxDuration, avgDur);
    maxCost = Math.max(maxCost, avgC);
  });

  const buildComparisons = (
    dimension: 'time' | 'cost' | 'comfort' | 'stability'
  ): DimensionComparison[] => {
    return sameODScores.map(s => {
      let rawValue = 0;
      let score = 0;
      if (dimension === 'time') {
        rawValue = s.avgDuration;
        score = s.timeScore;
      } else if (dimension === 'cost') {
        rawValue = s.avgCost;
        score = s.costScore;
      } else if (dimension === 'comfort') {
        rawValue = s.avgCrowd;
        score = s.comfortScore;
      } else {
        rawValue = s.stabilityScore;
        score = s.stabilityScore;
      }
      const targetRaw = dimension === 'time' ? targetScore.avgDuration
        : dimension === 'cost' ? targetScore.avgCost
        : dimension === 'comfort' ? targetScore.avgCrowd
        : targetScore.stabilityScore;
      return {
        transportMode: s.transportMode,
        label: s.transportMode === targetScore.transportMode ? '当前方案' : '',
        score,
        rawValue,
        diff: dimension === 'comfort' || dimension === 'stability'
          ? rawValue - targetRaw
          : targetRaw - rawValue,
      };
    }).sort((a, b) => b.score - a.score);
  };

  const timeExplanation: DimensionExplanation = {
    dimension: 'time',
    score: targetScore.timeScore,
    formula: maxDuration > 0
      ? `100 - (${targetScore.avgDuration} ÷ ${Math.round(maxDuration)}) × 100 = ${targetScore.timeScore}`
      : '数据不足，默认50分',
    rawValue: targetScore.avgDuration,
    rawUnit: '分钟',
    comparisons: buildComparisons('time'),
    sampleCount,
    sampleWarning: sampleCount < 3 ? `仅${sampleCount}次记录，时间均值可能不稳定` : null,
  };

  const costExplanation: DimensionExplanation = {
    dimension: 'cost',
    score: targetScore.costScore,
    formula: maxCost > 0
      ? `100 - (${targetScore.avgCost} ÷ ${Math.round(maxCost * 100) / 100}) × 100 = ${targetScore.costScore}`
      : '数据不足，默认50分',
    rawValue: targetScore.avgCost,
    rawUnit: '元',
    comparisons: buildComparisons('cost'),
    sampleCount,
    sampleWarning: sampleCount < 3 ? `仅${sampleCount}次记录，费用均值可能不稳定` : null,
  };

  const comfortExplanation: DimensionExplanation = {
    dimension: 'comfort',
    score: targetScore.comfortScore,
    formula: `100 - (${targetScore.avgCrowd} ÷ 5) × 100 = ${targetScore.comfortScore}`,
    rawValue: targetScore.avgCrowd,
    rawUnit: '/5',
    comparisons: buildComparisons('comfort'),
    sampleCount,
    sampleWarning: sampleCount < 3 ? `仅${sampleCount}次记录，拥挤度均值可能不稳定` : null,
  };

  const cv = meanDuration > 0 ? (stdDev / meanDuration) * 100 : 0;
  const stabilityExplanation: DimensionExplanation = {
    dimension: 'stability',
    score: targetScore.stabilityScore,
    formula: sampleCount < 2
      ? '样本不足2次，默认50分（无法计算变异系数）'
      : `变异系数 ${cv.toFixed(1)}% → 100 - ${cv.toFixed(1)} × 2 = ${targetScore.stabilityScore}`,
    rawValue: sampleCount < 2 ? 0 : Math.round(stdDev),
    rawUnit: sampleCount < 2 ? '' : '分钟标准差',
    comparisons: buildComparisons('stability'),
    sampleCount,
    sampleWarning: sampleCount < 2
      ? '仅1次记录，无法评估稳定性，默认50分不具备参考意义'
      : sampleCount < 5
      ? `仅${sampleCount}次记录，稳定性评估可能不够可靠`
      : null,
  };

  const overallWarning = sampleCount < 2
    ? '仅有1次通勤记录，所有评分均基于单次数据，不具备统计意义，请勿将其作为稳定结论'
    : sampleCount < 5
    ? `共${sampleCount}次记录，评分有一定参考价值但样本偏少，结论可能随新数据变化`
    : null;

  return {
    scoreKey: key,
    name: targetScore.name,
    origin: targetScore.origin,
    destination: targetScore.destination,
    transportMode: targetScore.transportMode,
    totalScore: targetScore.totalScore,
    dimensions: [timeExplanation, costExplanation, comfortExplanation, stabilityExplanation],
    sameODScores,
    sampleWarning: overallWarning,
  };
}
