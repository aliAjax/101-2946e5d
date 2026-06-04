import { CommuteRoute, AnomalyRecord, AnomalyType, FilterOptions, TransportMode } from '../types/commute';

const VALID_TRANSPORT_MODES: TransportMode[] = ['subway', 'bus', 'car', 'bike', 'walk'];

interface RouteStats {
  mean: number;
  stdDev: number;
  median: number;
}

function calculateStats(values: number[]): RouteStats {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0, median: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  return { mean, stdDev, median };
}

function createAnomaly(
  route: CommuteRoute,
  type: AnomalyType,
  severity: AnomalyRecord['severity'],
  message: string,
  suggestion: string
): AnomalyRecord {
  return {
    id: `anomaly-${route.id}-${type}-${Date.now()}`,
    routeId: route.id,
    route,
    type,
    severity,
    message,
    suggestion,
    detectedAt: new Date().toISOString(),
    ignored: false,
  };
}

export function detectNegativeCost(route: CommuteRoute): AnomalyRecord | null {
  if (route.cost < 0) {
    return createAnomaly(
      route,
      'negative_cost',
      'high',
      `费用为负数：¥${route.cost}`,
      '建议删除此记录或修正费用值'
    );
  }
  return null;
}

export function detectInvalidCrowdLevel(route: CommuteRoute): AnomalyRecord | null {
  if (route.crowdLevel < 1 || route.crowdLevel > 5 || !Number.isInteger(route.crowdLevel)) {
    return createAnomaly(
      route,
      'invalid_crowd_level',
      'medium',
      `拥挤程度超出范围：${route.crowdLevel}（应为1-5的整数）`,
      '建议修正拥挤程度值或删除此记录'
    );
  }
  return null;
}

export function detectSameOriginDestination(route: CommuteRoute): AnomalyRecord | null {
  if (route.origin === route.destination) {
    return createAnomaly(
      route,
      'same_origin_destination',
      'high',
      `起点和终点相同：${route.origin}`,
      '建议检查起终点是否正确，或删除此记录'
    );
  }
  return null;
}

export function detectDateOutOfRange(route: CommuteRoute, filters: FilterOptions): AnomalyRecord | null {
  if (route.date < filters.dateRange.start || route.date > filters.dateRange.end) {
    return createAnomaly(
      route,
      'date_out_of_range',
      'low',
      `日期 ${route.date} 超出筛选范围 [${filters.dateRange.start}, ${filters.dateRange.end}]`,
      '建议删除此记录或调整筛选日期范围'
    );
  }
  return null;
}

export function detectInvalidTransportMode(route: CommuteRoute): AnomalyRecord | null {
  if (!VALID_TRANSPORT_MODES.includes(route.transportMode)) {
    return createAnomaly(
      route,
      'invalid_transport_mode',
      'medium',
      `无效的交通方式：${route.transportMode}`,
      '建议修正交通方式或删除此记录'
    );
  }
  return null;
}

export function detectInvalidDuration(route: CommuteRoute): AnomalyRecord | null {
  if (route.duration <= 0 || !Number.isFinite(route.duration)) {
    return createAnomaly(
      route,
      'invalid_duration',
      'critical',
      `无效的时长：${route.duration}分钟`,
      '建议检查时长数据或删除此记录'
    );
  }
  if (route.duration > 600) {
    return createAnomaly(
      route,
      'invalid_duration',
      'high',
      `时长久得可疑：${route.duration}分钟（超过10小时）`,
      '建议核实时长是否正确，或删除此记录'
    );
  }
  return null;
}

export function detectDurationOutliers(
  routes: CommuteRoute[],
  thresholdMultiplier: number = 3
): AnomalyRecord[] {
  const routeGroups = new Map<string, CommuteRoute[]>();
  routes.forEach(route => {
    const key = `${route.origin}-${route.destination}-${route.transportMode}`;
    if (!routeGroups.has(key)) {
      routeGroups.set(key, []);
    }
    routeGroups.get(key)!.push(route);
  });

  const anomalies: AnomalyRecord[] = [];

  routeGroups.forEach((groupRoutes, key) => {
    if (groupRoutes.length < 5) return;

    const durations = groupRoutes.map(r => r.duration);
    const stats = calculateStats(durations);

    if (stats.stdDev === 0) return;

    const upperBound = stats.mean + thresholdMultiplier * stats.stdDev;
    const lowerBound = Math.max(1, stats.mean - thresholdMultiplier * stats.stdDev);

    groupRoutes.forEach(route => {
      if (route.duration > upperBound || route.duration < lowerBound) {
        const severity: AnomalyRecord['severity'] = 
          route.duration > stats.mean * 5 || route.duration < stats.mean * 0.2 ? 'critical' :
          route.duration > stats.mean * 3 || route.duration < stats.mean * 0.3 ? 'high' : 'medium';
        
        anomalies.push(createAnomaly(
          route,
          'duration_outlier',
          severity,
          `耗时异常：${route.duration}分钟（同路线平均 ${Math.round(stats.mean)} 分钟）`,
          `建议核实该记录。同路线 ${key} 的正常范围约为 ${Math.round(lowerBound)}-${Math.round(upperBound)} 分钟`
        ));
      }
    });
  });

  return anomalies;
}

export function detectAllAnomalies(
  routes: CommuteRoute[],
  filters: FilterOptions,
  ignoredAnomalyIds: string[] = []
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const seenRouteAnomalies = new Set<string>();

  routes.forEach(route => {
    const checkAndAdd = (anomaly: AnomalyRecord | null) => {
      if (anomaly && !ignoredAnomalyIds.includes(anomaly.id)) {
        const key = `${route.id}-${anomaly.type}`;
        if (!seenRouteAnomalies.has(key)) {
          seenRouteAnomalies.add(key);
          anomalies.push(anomaly);
        }
      }
    };

    checkAndAdd(detectNegativeCost(route));
    checkAndAdd(detectInvalidCrowdLevel(route));
    checkAndAdd(detectSameOriginDestination(route));
    checkAndAdd(detectDateOutOfRange(route, filters));
    checkAndAdd(detectInvalidTransportMode(route));
    checkAndAdd(detectInvalidDuration(route));
  });

  const durationOutliers = detectDurationOutliers(routes);
  durationOutliers.forEach(anomaly => {
    if (!ignoredAnomalyIds.includes(anomaly.id)) {
      const key = `${anomaly.routeId}-${anomaly.type}`;
      if (!seenRouteAnomalies.has(key)) {
        seenRouteAnomalies.add(key);
        anomalies.push(anomaly);
      }
    }
  });

  anomalies.sort((a, b) => {
    const severityOrder: Record<AnomalyRecord['severity'], number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return anomalies;
}

export function getAnomalyCountByType(anomalies: AnomalyRecord[]): Record<AnomalyType, number> {
  const counts: Record<AnomalyType, number> = {
    negative_cost: 0,
    invalid_crowd_level: 0,
    same_origin_destination: 0,
    date_out_of_range: 0,
    duration_outlier: 0,
    invalid_transport_mode: 0,
    invalid_duration: 0,
  };
  
  anomalies.forEach(anomaly => {
    counts[anomaly.type]++;
  });
  
  return counts;
}

export function getAnomalyCountBySeverity(anomalies: AnomalyRecord[]): Record<AnomalyRecord['severity'], number> {
  const counts: Record<AnomalyRecord['severity'], number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  anomalies.forEach(anomaly => {
    counts[anomaly.severity]++;
  });
  
  return counts;
}
