import { describe, it, expect } from 'vitest';
import {
  detectAllAnomalies,
  detectNegativeCost,
  detectInvalidCrowdLevel,
  detectSameOriginDestination,
  detectInvalidTransportMode,
  detectInvalidDuration,
  detectDurationOutliers,
  getAnomalyIgnoreKey,
  getAnomalyCountByType,
  getAnomalyCountBySeverity,
} from './anomalyDetector';
import type { CommuteRoute, FilterOptions } from '../types/commute';

const createMockRoute = (overrides: Partial<CommuteRoute> = {}): CommuteRoute => ({
  id: 'route-1',
  name: '中关村 → 望京',
  origin: '中关村',
  destination: '望京',
  transportMode: 'subway',
  duration: 30,
  cost: 5,
  crowdLevel: 3,
  date: '2024-01-01',
  timeOfDay: 'morning_peak',
  ...overrides,
});

const defaultFilters: FilterOptions = {
  isWeekday: null,
  isWeekend: null,
  transportModes: [],
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
  onlyFavorites: false,
  origin: null,
  destination: null,
  timeOfDay: [],
};

describe('anomalyDetector', () => {
  describe('getAnomalyIgnoreKey', () => {
    it('应生成正确的忽略key格式', () => {
      const key = getAnomalyIgnoreKey('route-123', 'negative_cost');
      expect(key).toBe('route-123-negative_cost');
    });
  });

  describe('单个异常检测函数', () => {
    it('detectNegativeCost - 应检测负费用', () => {
      const route = createMockRoute({ cost: -10 });
      const anomaly = detectNegativeCost(route);
      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe('negative_cost');
      expect(anomaly?.severity).toBe('high');
    });

    it('detectNegativeCost - 正费用不应检测为异常', () => {
      const route = createMockRoute({ cost: 10 });
      const anomaly = detectNegativeCost(route);
      expect(anomaly).toBeNull();
    });

    it('detectInvalidCrowdLevel - 应检测超出范围的拥挤度', () => {
      const route = createMockRoute({ crowdLevel: 6 });
      const anomaly = detectInvalidCrowdLevel(route);
      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe('invalid_crowd_level');
    });

    it('detectInvalidCrowdLevel - 非整数拥挤度应检测为异常', () => {
      const route = createMockRoute({ crowdLevel: 3.5 });
      const anomaly = detectInvalidCrowdLevel(route);
      expect(anomaly).not.toBeNull();
    });

    it('detectInvalidCrowdLevel - 1-5整数应正常', () => {
      const route = createMockRoute({ crowdLevel: 3 });
      const anomaly = detectInvalidCrowdLevel(route);
      expect(anomaly).toBeNull();
    });

    it('detectSameOriginDestination - 应检测起终点相同', () => {
      const route = createMockRoute({ origin: '中关村', destination: '中关村' });
      const anomaly = detectSameOriginDestination(route);
      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe('same_origin_destination');
    });

    it('detectSameOriginDestination - 起终点不同应正常', () => {
      const route = createMockRoute();
      const anomaly = detectSameOriginDestination(route);
      expect(anomaly).toBeNull();
    });

    it('detectInvalidTransportMode - 应检测无效交通方式', () => {
      const route = createMockRoute({ transportMode: 'airplane' as CommuteRoute['transportMode'] });
      const anomaly = detectInvalidTransportMode(route);
      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe('invalid_transport_mode');
    });

    it('detectInvalidTransportMode - 有效交通方式应正常', () => {
      const route = createMockRoute({ transportMode: 'subway' });
      const anomaly = detectInvalidTransportMode(route);
      expect(anomaly).toBeNull();
    });

    it('detectInvalidDuration - 应检测无效时长（负数）', () => {
      const route = createMockRoute({ duration: -5 });
      const anomaly = detectInvalidDuration(route);
      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe('invalid_duration');
      expect(anomaly?.severity).toBe('critical');
    });

    it('detectInvalidDuration - 应检测超长时长', () => {
      const route = createMockRoute({ duration: 700 });
      const anomaly = detectInvalidDuration(route);
      expect(anomaly).not.toBeNull();
      expect(anomaly?.severity).toBe('high');
    });

    it('detectInvalidDuration - 正常时长应正常', () => {
      const route = createMockRoute({ duration: 30 });
      const anomaly = detectInvalidDuration(route);
      expect(anomaly).toBeNull();
    });
  });

  describe('detectDurationOutliers - 耗时异常值检测', () => {
    it('样本数少于5时不应检测异常值', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: '1', duration: 30 }),
        createMockRoute({ id: '2', duration: 32 }),
        createMockRoute({ id: '3', duration: 28 }),
        createMockRoute({ id: '4', duration: 31 }),
      ];
      const anomalies = detectDurationOutliers(routes);
      expect(anomalies).toHaveLength(0);
    });

    it('应检测明显的耗时异常值', () => {
      const baseRoute = {
        origin: '中关村',
        destination: '望京',
        transportMode: 'subway' as const,
      };
      const routes: CommuteRoute[] = [];
      for (let i = 0; i < 19; i++) {
        routes.push(createMockRoute({ ...baseRoute, id: `${i}`, duration: 30 }));
      }
      routes.push(createMockRoute({ ...baseRoute, id: '99', duration: 500 }));
      
      const anomalies = detectDurationOutliers(routes);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('duration_outlier');
    });

    it('不同路线组应独立计算', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ origin: 'A', destination: 'B', id: '1', duration: 30 }),
        createMockRoute({ origin: 'A', destination: 'B', id: '2', duration: 32 }),
        createMockRoute({ origin: 'A', destination: 'B', id: '3', duration: 28 }),
        createMockRoute({ origin: 'A', destination: 'B', id: '4', duration: 31 }),
        createMockRoute({ origin: 'A', destination: 'B', id: '5', duration: 29 }),
        createMockRoute({ origin: 'C', destination: 'D', id: '6', duration: 60 }),
        createMockRoute({ origin: 'C', destination: 'D', id: '7', duration: 62 }),
        createMockRoute({ origin: 'C', destination: 'D', id: '8', duration: 58 }),
        createMockRoute({ origin: 'C', destination: 'D', id: '9', duration: 61 }),
        createMockRoute({ origin: 'C', destination: 'D', id: '10', duration: 59 }),
      ];
      const anomalies = detectDurationOutliers(routes);
      expect(anomalies).toHaveLength(0);
    });
  });

  describe('detectAllAnomalies - 综合异常检测', () => {
    it('应检测所有类型的异常', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: 'r1', cost: -10 }),
        createMockRoute({ id: 'r2', crowdLevel: 6 }),
        createMockRoute({ id: 'r3', origin: '中关村', destination: '中关村' }),
      ];
      const anomalies = detectAllAnomalies(routes, defaultFilters);
      expect(anomalies.length).toBeGreaterThanOrEqual(3);
    });

    it('应按严重程度排序（critical > high > medium > low）', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: 'r1', duration: -5 }),
        createMockRoute({ id: 'r2', cost: -10 }),
        createMockRoute({ id: 'r3', date: '2025-01-01' }),
      ];
      const filters = { ...defaultFilters, dateRange: { start: '2024-01-01', end: '2024-12-31' } };
      const anomalies = detectAllAnomalies(routes, filters);
      
      const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 0; i < anomalies.length - 1; i++) {
        expect(severityOrder[anomalies[i].severity]).toBeLessThanOrEqual(severityOrder[anomalies[i + 1].severity]);
      }
    });

    it('应忽略已被标记为忽略的异常', () => {
      const route = createMockRoute({ id: 'r1', cost: -10 });
      const ignoreKey = getAnomalyIgnoreKey('r1', 'negative_cost');
      const anomalies = detectAllAnomalies([route], defaultFilters, [ignoreKey]);
      expect(anomalies.filter(a => a.type === 'negative_cost')).toHaveLength(0);
    });

    it('应避免重复添加同一类型的异常', () => {
      const route = createMockRoute({ id: 'r1', cost: -10 });
      const anomalies = detectAllAnomalies([route, route], defaultFilters);
      const negativeCostAnomalies = anomalies.filter(a => a.type === 'negative_cost');
      expect(negativeCostAnomalies.length).toBeLessThanOrEqual(1);
    });
  });

  describe('异常统计函数', () => {
    it('getAnomalyCountByType 应按类型统计', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: 'r1', cost: -10 }),
        createMockRoute({ id: 'r2', cost: -5 }),
        createMockRoute({ id: 'r3', crowdLevel: 6 }),
      ];
      const anomalies = detectAllAnomalies(routes, defaultFilters);
      const counts = getAnomalyCountByType(anomalies);
      expect(counts.negative_cost).toBeGreaterThanOrEqual(1);
      expect(counts.invalid_crowd_level).toBeGreaterThanOrEqual(1);
    });

    it('getAnomalyCountBySeverity 应按严重程度统计', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: 'r1', duration: -5 }),
        createMockRoute({ id: 'r2', cost: -10 }),
      ];
      const anomalies = detectAllAnomalies(routes, defaultFilters);
      const counts = getAnomalyCountBySeverity(anomalies);
      expect(counts.critical).toBeGreaterThanOrEqual(1);
      expect(counts.high).toBeGreaterThanOrEqual(1);
    });
  });
});
