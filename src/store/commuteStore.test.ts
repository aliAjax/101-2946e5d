import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCommuteStore, migrateLegacyAnomalyId } from './commuteStore';
import type { CommuteRoute, Location, FavoriteRoute } from '../types/commute';

const mockLocation1: Location = { id: 'loc-1', name: '中关村', lat: 39.98, lng: 116.31 };
const mockLocation2: Location = { id: 'loc-2', name: '望京', lat: 39.99, lng: 116.47 };
const mockLocation3: Location = { id: 'loc-3', name: '国贸', lat: 39.91, lng: 116.46 };

const createMockRoute = (overrides: Partial<CommuteRoute> = {}): CommuteRoute => ({
  id: `route-${Date.now()}-${Math.random()}`,
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

const baseInitialState = useCommuteStore.getInitialState();
const emptyInitialState = {
  ...baseInitialState,
  routes: [],
  locations: [],
  favorites: [],
  snapshots: [],
  filterPresets: [],
};

describe('commuteStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    useCommuteStore.setState(emptyInitialState, true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('地点重命名联动', () => {
    it('重命名地点应更新所有相关路线的起点和终点', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: 'r1', origin: '中关村', destination: '望京' }),
        createMockRoute({ id: 'r2', origin: '望京', destination: '中关村' }),
        createMockRoute({ id: 'r3', origin: '国贸', destination: '望京' }),
      ];

      useCommuteStore.setState({
        locations: [mockLocation1, mockLocation2, mockLocation3],
        routes,
      });

      useCommuteStore.getState().renameLocation('loc-1', '中关村软件园');

      const state = useCommuteStore.getState();
      const updatedRoutes = state.routes;

      expect(updatedRoutes.find(r => r.id === 'r1')?.origin).toBe('中关村软件园');
      expect(updatedRoutes.find(r => r.id === 'r1')?.name).toBe('中关村软件园 → 望京');
      expect(updatedRoutes.find(r => r.id === 'r2')?.destination).toBe('中关村软件园');
      expect(updatedRoutes.find(r => r.id === 'r2')?.name).toBe('望京 → 中关村软件园');
      expect(updatedRoutes.find(r => r.id === 'r3')?.origin).toBe('国贸');
    });

    it('重命名地点应更新收藏的路线', () => {
      const route = createMockRoute({ id: 'r1', origin: '中关村', destination: '望京' });
      const favorite: FavoriteRoute = {
        id: 'fav-1',
        name: '中关村 → 望京',
        origin: '中关村',
        destination: '望京',
        transportMode: 'subway',
        createdAt: new Date().toISOString(),
        note: 'test',
      };

      useCommuteStore.setState({
        locations: [mockLocation1, mockLocation2],
        routes: [route],
        favorites: [favorite],
      });

      useCommuteStore.getState().renameLocation('loc-1', '中关村软件园');

      const state = useCommuteStore.getState();
      expect(state.favorites[0].origin).toBe('中关村软件园');
      expect(state.favorites[0].name).toBe('中关村软件园 → 望京');
    });

    it('重命名地点应更新筛选条件中的地点', () => {
      useCommuteStore.setState({
        locations: [mockLocation1, mockLocation2],
        filters: {
          ...baseInitialState.filters,
          origin: '中关村',
          destination: '望京',
        },
      });

      useCommuteStore.getState().renameLocation('loc-1', '中关村软件园');

      const state = useCommuteStore.getState();
      expect(state.filters.origin).toBe('中关村软件园');
      expect(state.filters.destination).toBe('望京');
    });

    it('重命名地点应清除选中的路线如果涉及该地点', () => {
      const route = createMockRoute({ id: 'r1', origin: '中关村', destination: '望京' });
      useCommuteStore.setState({
        locations: [mockLocation1, mockLocation2],
        routes: [route],
        selectedRouteId: 'r1',
      });

      useCommuteStore.getState().renameLocation('loc-1', '中关村软件园');

      const state = useCommuteStore.getState();
      expect(state.selectedRouteId).toBeNull();
    });

    it('重命名相同名称不应触发任何更改', () => {
      const route = createMockRoute({ id: 'r1' });
      useCommuteStore.setState({
        locations: [mockLocation1],
        routes: [route],
      });

      const stateBefore = useCommuteStore.getState();
      useCommuteStore.getState().renameLocation('loc-1', '中关村');
      const stateAfter = useCommuteStore.getState();

      expect(stateAfter.routes).toBe(stateBefore.routes);
    });
  });

  describe('地点删除联动', () => {
    it('删除地点并删除路线应移除所有相关路线', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: 'r1', origin: '中关村', destination: '望京' }),
        createMockRoute({ id: 'r2', origin: '望京', destination: '国贸' }),
        createMockRoute({ id: 'r3', origin: '国贸', destination: '望京' }),
      ];

      useCommuteStore.setState({
        locations: [mockLocation1, mockLocation2, mockLocation3],
        routes,
      });

      useCommuteStore.getState().deleteLocationWithOptions('loc-2', { keepRoutes: false });

      const state = useCommuteStore.getState();
      expect(state.routes).toHaveLength(0);
      expect(state.locations.find(l => l.id === 'loc-2')).toBeUndefined();
    });

    it('删除地点并保留路线应标记为缺失并移除收藏', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: 'r1', origin: '中关村', destination: '望京' }),
      ];
      const favorite: FavoriteRoute = {
        id: 'fav-1',
        name: '中关村 → 望京',
        origin: '中关村',
        destination: '望京',
        transportMode: 'subway',
        createdAt: new Date().toISOString(),
        note: '',
      };

      useCommuteStore.setState({
        locations: [mockLocation1, mockLocation2],
        routes,
        favorites: [favorite],
      });

      useCommuteStore.getState().deleteLocationWithOptions('loc-2', { keepRoutes: true, markAsMissing: true });

      const state = useCommuteStore.getState();
      expect(state.routes[0].destination).toContain('[已删除]');
      expect(state.favorites).toHaveLength(0);
    });

    it('删除地点应清除筛选条件中的对应地点', () => {
      useCommuteStore.setState({
        locations: [mockLocation1, mockLocation2],
        filters: {
          ...baseInitialState.filters,
          origin: '中关村',
          destination: '望京',
        },
      });

      useCommuteStore.getState().deleteLocationWithOptions('loc-1', { keepRoutes: false });

      const state = useCommuteStore.getState();
      expect(state.filters.origin).toBeNull();
      expect(state.filters.destination).toBe('望京');
    });

    it('删除地点后仅收藏筛选应只保留仍有效的收藏路线', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: 'r1', origin: '中关村', destination: '望京', transportMode: 'subway' }),
        createMockRoute({ id: 'r2', origin: '国贸', destination: '望京', transportMode: 'bus' }),
      ];
      const favorites: FavoriteRoute[] = [
        {
          id: 'fav-1',
          name: '中关村 → 望京',
          origin: '中关村',
          destination: '望京',
          transportMode: 'subway',
          createdAt: new Date().toISOString(),
          note: '',
        },
        {
          id: 'fav-2',
          name: '国贸 → 望京',
          origin: '国贸',
          destination: '望京',
          transportMode: 'bus',
          createdAt: new Date().toISOString(),
          note: '',
        },
      ];

      useCommuteStore.setState({
        locations: [mockLocation1, mockLocation2, mockLocation3],
        routes,
        favorites,
        filters: { ...baseInitialState.filters, onlyFavorites: true },
      });

      useCommuteStore.getState().deleteLocationWithOptions('loc-1', { keepRoutes: false });

      const state = useCommuteStore.getState();
      expect(state.favorites.map(f => f.id)).toEqual(['fav-2']);
      expect(state.getFilteredRoutes().map(r => r.id)).toEqual(['r2']);
    });
  });

  describe('收藏筛选联动', () => {
    it('仅显示收藏筛选应正确过滤路线', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: 'r1', origin: 'A', destination: 'B', transportMode: 'subway' }),
        createMockRoute({ id: 'r2', origin: 'C', destination: 'D', transportMode: 'bus' }),
      ];
      const favorite: FavoriteRoute = {
        id: 'fav-1',
        name: 'A → B',
        origin: 'A',
        destination: 'B',
        transportMode: 'subway',
        createdAt: new Date().toISOString(),
        note: '',
      };

      useCommuteStore.setState({
        routes,
        favorites: [favorite],
        filters: { ...baseInitialState.filters, onlyFavorites: true },
      });

      const filtered = useCommuteStore.getState().getFilteredRoutes();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('r1');
    });

    it('isFavorite 应正确判断路线是否被收藏', () => {
      const route = createMockRoute({ id: 'r1', origin: 'A', destination: 'B', transportMode: 'subway' });
      const favorite: FavoriteRoute = {
        id: 'fav-1',
        name: 'A → B',
        origin: 'A',
        destination: 'B',
        transportMode: 'subway',
        createdAt: new Date().toISOString(),
        note: '',
      };

      useCommuteStore.setState({
        routes: [route],
        favorites: [favorite],
      });

      expect(useCommuteStore.getState().isFavorite(route)).toBe(true);

      const otherRoute = createMockRoute({ origin: 'C', destination: 'D' });
      expect(useCommuteStore.getState().isFavorite(otherRoute)).toBe(false);
    });
  });

  describe('路线评分样本不足提示', () => {
    it('样本不足2次时应显示样本不足警告', () => {
      const route = createMockRoute({ id: 'r1', origin: 'A', destination: 'B', transportMode: 'subway' });
      useCommuteStore.setState({
        routes: [route],
        locations: [mockLocation1, mockLocation2],
      });

      useCommuteStore.getState().calculateRouteScores();
      vi.runAllTimers();

      const state = useCommuteStore.getState();
      expect(state.routeScores).toHaveLength(1);
      expect(state.routeScores[0].sampleCount).toBe(1);

      const explanation = state.getScoreExplanation(state.routeScores[0].key);
      expect(explanation).not.toBeNull();
      expect(explanation?.sampleWarning).not.toBeNull();
      expect(explanation?.sampleWarning).toContain('1次通勤记录');

      const stabilityDim = explanation?.dimensions.find(d => d.dimension === 'stability');
      expect(stabilityDim?.sampleWarning).not.toBeNull();
      expect(stabilityDim?.sampleWarning).toContain('无法评估稳定性');
    });

    it('样本数2-4次时应显示样本偏少警告', () => {
      const routes: CommuteRoute[] = [
        createMockRoute({ id: 'r1', origin: 'A', destination: 'B', transportMode: 'subway', duration: 30 }),
        createMockRoute({ id: 'r2', origin: 'A', destination: 'B', transportMode: 'subway', duration: 32 }),
        createMockRoute({ id: 'r3', origin: 'A', destination: 'B', transportMode: 'subway', duration: 28 }),
      ];

      useCommuteStore.setState({
        routes,
        locations: [mockLocation1, mockLocation2],
      });

      useCommuteStore.getState().calculateRouteScores();
      vi.runAllTimers();

      const state = useCommuteStore.getState();
      const scoreKey = state.routeScores[0]?.key;
      const explanation = scoreKey ? state.getScoreExplanation(scoreKey) : null;

      expect(explanation?.sampleWarning).not.toBeNull();
      expect(explanation?.sampleWarning).toContain('3次记录');
    });

    it('样本数>=5时不应显示总体样本警告', () => {
      const routes: CommuteRoute[] = [];
      for (let i = 0; i < 5; i++) {
        routes.push(createMockRoute({
          id: `r${i}`,
          origin: 'A',
          destination: 'B',
          transportMode: 'subway',
          duration: 30 + i,
        }));
      }

      useCommuteStore.setState({
        routes,
        locations: [mockLocation1, mockLocation2],
      });

      useCommuteStore.getState().calculateRouteScores();
      vi.runAllTimers();

      const state = useCommuteStore.getState();
      const scoreKey = state.routeScores[0]?.key;
      const explanation = scoreKey ? state.getScoreExplanation(scoreKey) : null;

      expect(explanation?.sampleWarning).toBeNull();
    });
  });

  describe('快照创建和恢复', () => {
    it('创建快照应保存当前状态', () => {
      const routes = [createMockRoute({ id: 'r1' })];
      const favorite: FavoriteRoute = {
        id: 'fav-1',
        name: 'test',
        origin: '中关村',
        destination: '望京',
        transportMode: 'subway',
        createdAt: new Date().toISOString(),
        note: '',
      };

      useCommuteStore.setState({
        routes,
        favorites: [favorite],
        locations: [mockLocation1, mockLocation2],
        filters: { ...baseInitialState.filters, transportModes: ['subway'] },
      });

      useCommuteStore.getState().createSnapshot('测试快照', '测试描述');

      const state = useCommuteStore.getState();
      expect(state.snapshots).toHaveLength(1);
      expect(state.snapshots[0].name).toBe('测试快照');
      expect(state.snapshots[0].description).toBe('测试描述');
      expect(state.snapshots[0].data.routes).toHaveLength(1);
      expect(state.snapshots[0].data.favorites).toHaveLength(1);
      expect(state.snapshots[0].summary.routeCount).toBe(1);
    });

    it('恢复快照应还原到快照时的状态', () => {
      const routes1 = [createMockRoute({ id: 'r1', origin: 'A', destination: 'B' })];
      useCommuteStore.setState({
        routes: routes1,
        locations: [mockLocation1, mockLocation2],
        favorites: [],
      });

      useCommuteStore.getState().createSnapshot('快照1');
      const snapshotId = useCommuteStore.getState().snapshots[0].id;

      const routes2 = [createMockRoute({ id: 'r2', origin: 'C', destination: 'D' })];
      useCommuteStore.setState({
        routes: routes2,
        favorites: [{
          id: 'fav-1',
          name: 'test',
          origin: 'C',
          destination: 'D',
          transportMode: 'subway',
          createdAt: new Date().toISOString(),
          note: '',
        }],
      });

      useCommuteStore.getState().restoreSnapshot(snapshotId);
      vi.runAllTimers();

      const state = useCommuteStore.getState();
      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].id).toBe('r1');
      expect(state.favorites).toHaveLength(0);
    });

    it('删除快照应移除指定快照', () => {
      useCommuteStore.setState({ routes: [], locations: [mockLocation1] });
      useCommuteStore.getState().createSnapshot('快照1');
      vi.advanceTimersByTime(1000);
      useCommuteStore.getState().createSnapshot('快照2');

      const snapshotId = useCommuteStore.getState().snapshots[0].id;
      useCommuteStore.getState().deleteSnapshot(snapshotId);

      const state = useCommuteStore.getState();
      expect(state.snapshots).toHaveLength(1);
      expect(state.snapshots[0].name).toBe('快照2');
    });
  });

  describe('异常忽略key迁移', () => {
    it('migrateLegacyAnomalyId 应正确转换旧格式ID', () => {
      expect(migrateLegacyAnomalyId('anomaly-route1-negative_cost')).toBe('route1-negative_cost');
      expect(migrateLegacyAnomalyId('route1-negative_cost-12345')).toBe('route1-negative_cost');
      expect(migrateLegacyAnomalyId('route1')).toBe('route1');
    });

    it('从本地存储加载时应迁移旧的ignoredAnomalyIds并保留现有key', async () => {
      window.localStorage.setItem('commute-data', JSON.stringify({
        routes: [],
        selectedRouteId: null,
        filters: baseInitialState.filters,
        favorites: [],
        locations: [mockLocation1],
        ignoredAnomalyKeys: ['r3-negative_cost'],
        ignoredAnomalyIds: [
          'anomaly-r1-negative_cost',
          'r2-invalid_duration-12345',
          'r3-negative_cost',
        ],
      }));

      vi.resetModules();
      const { useCommuteStore: freshStore } = await import('./commuteStore');
      const keys = freshStore.getState().ignoredAnomalyKeys;

      expect(keys).toEqual(expect.arrayContaining([
        'r1-negative_cost',
        'r2-invalid_duration',
        'r3-negative_cost',
      ]));
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('更新路线应清除相关的异常忽略key', () => {
      const route = createMockRoute({ id: 'r1' });
      useCommuteStore.setState({
        routes: [route],
        ignoredAnomalyKeys: ['r1-negative_cost', 'r1-invalid_duration', 'r2-negative_cost'],
      });

      useCommuteStore.getState().updateRoute('r1', { duration: 35 });

      const state = useCommuteStore.getState();
      expect(state.ignoredAnomalyKeys).not.toContain('r1-negative_cost');
      expect(state.ignoredAnomalyKeys).not.toContain('r1-invalid_duration');
      expect(state.ignoredAnomalyKeys).toContain('r2-negative_cost');
    });

    it('删除路线应清除相关的异常忽略key', () => {
      const route = createMockRoute({ id: 'r1' });
      useCommuteStore.setState({
        routes: [route],
        ignoredAnomalyKeys: ['r1-negative_cost', 'r2-negative_cost'],
      });

      useCommuteStore.getState().deleteRouteAndAnomalies('r1');

      const state = useCommuteStore.getState();
      expect(state.ignoredAnomalyKeys).not.toContain('r1-negative_cost');
      expect(state.ignoredAnomalyKeys).toContain('r2-negative_cost');
    });
  });

  describe('路线更新联动', () => {
    it('更新路线起终点应同步更新对应收藏', () => {
      const route = createMockRoute({ id: 'r1', origin: 'A', destination: 'B', transportMode: 'subway' });
      const favorite: FavoriteRoute = {
        id: 'fav-1',
        name: 'A → B',
        origin: 'A',
        destination: 'B',
        transportMode: 'subway',
        createdAt: new Date().toISOString(),
        note: 'test',
      };

      useCommuteStore.setState({
        routes: [route],
        favorites: [favorite],
        locations: [mockLocation1, mockLocation2],
      });

      useCommuteStore.getState().updateRoute('r1', { origin: 'C', destination: 'D' });

      const state = useCommuteStore.getState();
      expect(state.favorites[0].origin).toBe('C');
      expect(state.favorites[0].destination).toBe('D');
      expect(state.favorites[0].name).toBe('C → D');
    });

    it('更新路线交通方式应同步更新对应收藏', () => {
      const route = createMockRoute({ id: 'r1', origin: 'A', destination: 'B', transportMode: 'subway' });
      const favorite: FavoriteRoute = {
        id: 'fav-1',
        name: 'A → B',
        origin: 'A',
        destination: 'B',
        transportMode: 'subway',
        createdAt: new Date().toISOString(),
        note: 'test',
      };

      useCommuteStore.setState({
        routes: [route],
        favorites: [favorite],
      });

      useCommuteStore.getState().updateRoute('r1', { transportMode: 'bus' });

      const state = useCommuteStore.getState();
      expect(state.favorites[0].transportMode).toBe('bus');
    });

    it('更新路线应清除相关异常记录并重新检测', () => {
      const route1 = createMockRoute({ id: 'r1', cost: -10 });
      const route2 = createMockRoute({ id: 'r2', cost: -20 });
      useCommuteStore.setState({
        routes: [route1, route2],
        locations: [mockLocation1, mockLocation2],
        ignoredAnomalyKeys: ['r1-negative_cost', 'r2-negative_cost'],
      });

      useCommuteStore.getState().detectAnomalies();

      useCommuteStore.getState().updateRoute('r1', { cost: 10 });
      vi.runAllTimers();

      const state = useCommuteStore.getState();
      expect(state.ignoredAnomalyKeys.filter(k => k.startsWith('r1-'))).toHaveLength(0);
      expect(state.ignoredAnomalyKeys.filter(k => k.startsWith('r2-')).length).toBeGreaterThan(0);
    });
  });

  describe('异常忽略流程联动', () => {
    it('忽略异常应添加到忽略列表并从异常列表移除', () => {
      const route = createMockRoute({ id: 'r1', cost: -10 });
      useCommuteStore.setState({
        routes: [route],
        locations: [mockLocation1, mockLocation2],
      });
      useCommuteStore.getState().detectAnomalies();

      const anomalyId = useCommuteStore.getState().anomalies[0]?.id;
      expect(anomalyId).toBeDefined();

      useCommuteStore.getState().ignoreAnomaly(anomalyId!);

      const state = useCommuteStore.getState();
      expect(state.ignoredAnomalyKeys.length).toBeGreaterThan(0);
      expect(state.anomalies.filter(a => a.id === anomalyId)).toHaveLength(0);
    });

    it('取消忽略异常后重新检测应重新出现异常', () => {
      const route = createMockRoute({ id: 'r1', cost: -10 });
      useCommuteStore.setState({
        routes: [route],
        locations: [mockLocation1, mockLocation2],
      });
      useCommuteStore.getState().detectAnomalies();

      const anomaly = useCommuteStore.getState().anomalies[0];
      expect(anomaly).toBeDefined();
      const ignoreKey = `${anomaly.routeId}-${anomaly.type}`;

      useCommuteStore.getState().ignoreAnomaly(anomaly.id);
      expect(useCommuteStore.getState().ignoredAnomalyKeys).toContain(ignoreKey);

      useCommuteStore.setState({
        ignoredAnomalyKeys: [],
      });
      useCommuteStore.getState().detectAnomalies();
      vi.runAllTimers();

      const state = useCommuteStore.getState();
      expect(state.ignoredAnomalyKeys).toHaveLength(0);
      expect(state.anomalies.length).toBeGreaterThan(0);
    });

    it('清除所有忽略应清空忽略列表', () => {
      useCommuteStore.setState({
        routes: [],
        ignoredAnomalyKeys: ['r1-negative_cost', 'r2-invalid_duration'],
      });

      useCommuteStore.getState().clearIgnoredAnomalies();
      vi.runAllTimers();

      const state = useCommuteStore.getState();
      expect(state.ignoredAnomalyKeys).toHaveLength(0);
    });
  });

  describe('地点重命名异常联动', () => {
    it('重命名地点应同步更新异常记录中的路线信息', () => {
      const route = createMockRoute({ id: 'r1', origin: '中关村', destination: '望京', cost: -10 });
      useCommuteStore.setState({
        locations: [mockLocation1, mockLocation2],
        routes: [route],
      });
      useCommuteStore.getState().detectAnomalies();

      const anomaliesBefore = useCommuteStore.getState().anomalies;
      expect(anomaliesBefore.length).toBeGreaterThan(0);
      expect(anomaliesBefore[0].route.origin).toBe('中关村');

      useCommuteStore.getState().renameLocation('loc-1', '中关村软件园');

      const state = useCommuteStore.getState();
      expect(state.routes[0].origin).toBe('中关村软件园');
    });
  });

  describe('地点影响分析 getLocationImpact', () => {
    it('应正确计算地点对各数据的影响', () => {
      const route1 = createMockRoute({ id: 'r1', origin: '中关村', destination: '望京' });
      const route2 = createMockRoute({ id: 'r2', origin: '国贸', destination: '中关村' });
      const route3 = createMockRoute({ id: 'r3', origin: '国贸', destination: '望京' });

      const favorite: FavoriteRoute = {
        id: 'fav-1',
        name: '中关村 → 望京',
        origin: '中关村',
        destination: '望京',
        transportMode: 'subway',
        createdAt: new Date().toISOString(),
        note: '',
      };

      useCommuteStore.setState({
        locations: [mockLocation1, mockLocation2, mockLocation3],
        routes: [route1, route2, route3],
        favorites: [favorite],
        filters: {
          ...baseInitialState.filters,
          origin: '中关村',
          destination: '望京',
        },
      });

      const impact = useCommuteStore.getState().getLocationImpact('loc-1');

      expect(impact.affectedRoutes).toHaveLength(2);
      expect(impact.affectedFavorites).toHaveLength(1);
      expect(impact.affectedFilters.origin).toBe(true);
      expect(impact.affectedFilters.destination).toBe(false);
      expect(impact.totalAffected).toBeGreaterThan(0);
    });

    it('不存在的地点应返回零影响', () => {
      useCommuteStore.setState({
        locations: [mockLocation1],
        routes: [],
        favorites: [],
      });

      const impact = useCommuteStore.getState().getLocationImpact('non-existent');
      expect(impact.totalAffected).toBe(0);
      expect(impact.affectedRoutes).toHaveLength(0);
    });
  });

  describe('快照更新功能', () => {
    it('更新快照应修改名称和描述', () => {
      useCommuteStore.setState({ routes: [], locations: [mockLocation1] });
      useCommuteStore.getState().createSnapshot('原名称', '原描述');

      const snapshotId = useCommuteStore.getState().snapshots[0].id;
      useCommuteStore.getState().updateSnapshot(snapshotId, { name: '新名称', description: '新描述' });

      const state = useCommuteStore.getState();
      expect(state.snapshots[0].name).toBe('新名称');
      expect(state.snapshots[0].description).toBe('新描述');
    });
  });

  describe('评分权重变更联动', () => {
    it('设置权重应触发路线评分重算', () => {
      const routes: CommuteRoute[] = [];
      for (let i = 0; i < 5; i++) {
        routes.push(createMockRoute({
          id: `r${i}`,
          origin: 'A',
          destination: 'B',
          transportMode: 'subway',
          duration: 30 + i,
        }));
      }

      useCommuteStore.setState({
        routes,
        locations: [mockLocation1, mockLocation2],
      });

      useCommuteStore.getState().calculateRouteScores();

      useCommuteStore.getState().setScoringWeights({ time: 50, cost: 10, comfort: 20, stability: 20 });

      const state = useCommuteStore.getState();
      expect(state.routeScores.length).toBeGreaterThan(0);
      expect(state.currentWeightPreset).toBe('custom');
    });

    it('应用权重预设应正确设置权重', () => {
      useCommuteStore.setState({
        routes: [],
        locations: [],
      });

      useCommuteStore.getState().applyWeightPreset('save_money');

      const state = useCommuteStore.getState();
      expect(state.currentWeightPreset).toBe('save_money');
      expect(state.scoringWeights.cost).toBe(40);
    });
  });

  describe('基本操作', () => {
    it('添加路线应成功', () => {
      const route = createMockRoute({ id: 'r1' });
      useCommuteStore.getState().addRoute(route);

      const state = useCommuteStore.getState();
      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].id).toBe('r1');
    });

    it('删除路线应成功', () => {
      const route = createMockRoute({ id: 'r1' });
      useCommuteStore.setState({ routes: [route] });

      useCommuteStore.getState().deleteRoute('r1');

      const state = useCommuteStore.getState();
      expect(state.routes).toHaveLength(0);
    });

    it('添加收藏应成功且不重复', () => {
      const route = createMockRoute({ id: 'r1', origin: 'A', destination: 'B', transportMode: 'subway' });
      useCommuteStore.setState({ routes: [route] });

      useCommuteStore.getState().addFavorite(route, '备注');
      useCommuteStore.getState().addFavorite(route, '备注2');

      const state = useCommuteStore.getState();
      expect(state.favorites).toHaveLength(1);
      expect(state.favorites[0].note).toBe('备注');
    });

    it('切换收藏状态应正常工作', () => {
      const route = createMockRoute({ id: 'r1', origin: 'A', destination: 'B', transportMode: 'subway' });
      useCommuteStore.setState({ routes: [route] });

      useCommuteStore.getState().toggleFavorite(route);
      expect(useCommuteStore.getState().favorites).toHaveLength(1);

      useCommuteStore.getState().toggleFavorite(route);
      expect(useCommuteStore.getState().favorites).toHaveLength(0);
    });
  });

  describe('筛选预设管理', () => {
    describe('保存筛选预设', () => {
      it('保存预设应基于当前筛选条件创建新预设', () => {
        const testFilters = {
          ...baseInitialState.filters,
          transportModes: ['subway', 'bus'],
          isWeekday: true,
          isWeekend: null,
          onlyFavorites: true,
          timeOfDay: ['morning_peak'],
          dateRange: { start: '2024-03-01', end: '2024-06-30' },
        };

        useCommuteStore.setState({
          filters: testFilters,
        });

        expect(useCommuteStore.getState().filters.transportModes).toEqual(['subway', 'bus']);

        useCommuteStore.getState().saveFilterPreset('工作日早高峰地铁');

        const state = useCommuteStore.getState();
        expect(state.filterPresets).toHaveLength(1);
        expect(state.filterPresets[0].name).toBe('工作日早高峰地铁');
        expect(state.filterPresets[0].transportModes).toEqual(['subway', 'bus']);
        expect(state.filterPresets[0].isWeekday).toBe(true);
        expect(state.filterPresets[0].onlyFavorites).toBe(true);
        expect(state.filterPresets[0].timeOfDay).toEqual(['morning_peak']);
        expect(state.filterPresets[0].dateRange).toEqual({ start: '2024-03-01', end: '2024-06-30' });
        expect(state.filterPresets[0].createdAt).toBeDefined();
      });

      it('保存多个预设应按顺序排列', () => {
        useCommuteStore.setState({
          filters: { ...baseInitialState.filters, transportModes: ['subway'] },
        });

        useCommuteStore.getState().saveFilterPreset('预设1');
        vi.advanceTimersByTime(1000);
        useCommuteStore.getState().saveFilterPreset('预设2');

        const state = useCommuteStore.getState();
        expect(state.filterPresets).toHaveLength(2);
        expect(state.filterPresets[0].name).toBe('预设1');
        expect(state.filterPresets[1].name).toBe('预设2');
      });

      it('保存预设应生成唯一ID', () => {
        useCommuteStore.setState({
          filters: { ...baseInitialState.filters },
        });

        useCommuteStore.getState().saveFilterPreset('预设A');
        vi.advanceTimersByTime(1);
        useCommuteStore.getState().saveFilterPreset('预设B');

        const state = useCommuteStore.getState();
        expect(state.filterPresets[0].id).not.toBe(state.filterPresets[1].id);
        expect(state.filterPresets[0].id).toMatch(/^preset-/);
      });

      it('保存预设应深拷贝筛选条件，后续筛选变化不影响预设', () => {
        const initialFilters = {
          ...baseInitialState.filters,
          transportModes: ['subway'],
        };

        useCommuteStore.setState({ filters: initialFilters });
        useCommuteStore.getState().saveFilterPreset('初始预设');

        useCommuteStore.setState({
          filters: { ...baseInitialState.filters, transportModes: ['car'] },
        });

        const state = useCommuteStore.getState();
        expect(state.filterPresets[0].transportModes).toEqual(['subway']);
      });
    });

    describe('应用筛选预设', () => {
      it('应用预设应将筛选条件恢复为预设保存时的状态', () => {
        const presetFilters = {
          ...baseInitialState.filters,
          transportModes: ['subway', 'bus'],
          isWeekday: true,
          isWeekend: false,
          onlyFavorites: true,
          timeOfDay: ['evening_peak'],
          dateRange: { start: '2024-01-01', end: '2024-12-31' },
        };

        useCommuteStore.setState({
          filters: presetFilters,
        });
        useCommuteStore.getState().saveFilterPreset('测试预设');
        const presetId = useCommuteStore.getState().filterPresets[0].id;

        useCommuteStore.setState({
          filters: { ...baseInitialState.filters, transportModes: ['car'] },
        });

        useCommuteStore.getState().applyFilterPreset(presetId);
        vi.runAllTimers();

        const state = useCommuteStore.getState();
        expect(state.filters.transportModes).toEqual(['subway', 'bus']);
        expect(state.filters.isWeekday).toBe(true);
        expect(state.filters.isWeekend).toBe(false);
        expect(state.filters.onlyFavorites).toBe(true);
        expect(state.filters.timeOfDay).toEqual(['evening_peak']);
        expect(state.filters.dateRange).toEqual({ start: '2024-01-01', end: '2024-12-31' });
      });

      it('应用不存在的预设ID应无任何操作', () => {
        const originalFilters = { ...baseInitialState.filters, transportModes: ['bike'] };
        useCommuteStore.setState({ filters: originalFilters });

        useCommuteStore.getState().applyFilterPreset('non-existent-id');
        vi.runAllTimers();

        const state = useCommuteStore.getState();
        expect(state.filters).toEqual(originalFilters);
      });

      it('预设按设计不保存origin和destination字段（仅保存通用筛选条件）', () => {
        useCommuteStore.setState({
          filters: {
            ...baseInitialState.filters,
            origin: '国贸',
            destination: '西单',
            transportModes: ['subway'],
          },
        });
        useCommuteStore.getState().saveFilterPreset('测试预设');

        const preset = useCommuteStore.getState().filterPresets[0];
        expect(preset.transportModes).toEqual(['subway']);
        expect('origin' in preset).toBe(false);
        expect('destination' in preset).toBe(false);
      });

      it('应用预设后应触发统计数据重算', () => {
        const routes = [
          createMockRoute({ id: 'r1', transportMode: 'subway', date: '2024-06-01' }),
          createMockRoute({ id: 'r2', transportMode: 'bus', date: '2024-06-02' }),
        ];

        useCommuteStore.setState({
          routes,
          filters: { ...baseInitialState.filters, transportModes: [] },
        });
        useCommuteStore.getState().calculateStatistics();

        useCommuteStore.setState({
          filters: { ...baseInitialState.filters, transportModes: ['subway'] },
        });
        useCommuteStore.getState().saveFilterPreset('仅地铁');
        const presetId = useCommuteStore.getState().filterPresets[0].id;

        useCommuteStore.setState({
          filters: { ...baseInitialState.filters, transportModes: [] },
          statistics: { ...baseInitialState.statistics, totalRoutes: 2 },
        });

        useCommuteStore.getState().applyFilterPreset(presetId);
        vi.runAllTimers();

        const state = useCommuteStore.getState();
        expect(state.statistics.totalRoutes).toBe(1);
      });
    });

    describe('删除筛选预设', () => {
      it('删除预设应从列表中移除指定预设', () => {
        useCommuteStore.setState({ filters: { ...baseInitialState.filters } });
        useCommuteStore.getState().saveFilterPreset('预设1');
        vi.advanceTimersByTime(10);
        useCommuteStore.getState().saveFilterPreset('预设2');
        vi.advanceTimersByTime(10);
        useCommuteStore.getState().saveFilterPreset('预设3');

        const stateBefore = useCommuteStore.getState();
        expect(stateBefore.filterPresets).toHaveLength(3);
        const toDeleteId = stateBefore.filterPresets[1].id;

        useCommuteStore.getState().deleteFilterPreset(toDeleteId);

        const stateAfter = useCommuteStore.getState();
        expect(stateAfter.filterPresets).toHaveLength(2);
        expect(stateAfter.filterPresets.map(p => p.name)).toEqual(['预设1', '预设3']);
        expect(stateAfter.filterPresets.find(p => p.id === toDeleteId)).toBeUndefined();
      });

      it('删除第一个预设应正常工作', () => {
        useCommuteStore.setState({ filters: { ...baseInitialState.filters } });
        useCommuteStore.getState().saveFilterPreset('预设1');
        vi.advanceTimersByTime(10);
        useCommuteStore.getState().saveFilterPreset('预设2');

        const firstId = useCommuteStore.getState().filterPresets[0].id;
        useCommuteStore.getState().deleteFilterPreset(firstId);

        const state = useCommuteStore.getState();
        expect(state.filterPresets).toHaveLength(1);
        expect(state.filterPresets[0].name).toBe('预设2');
      });

      it('删除最后一个预设应正常工作', () => {
        useCommuteStore.setState({ filters: { ...baseInitialState.filters } });
        useCommuteStore.getState().saveFilterPreset('唯一预设');
        const onlyId = useCommuteStore.getState().filterPresets[0].id;

        useCommuteStore.getState().deleteFilterPreset(onlyId);

        const state = useCommuteStore.getState();
        expect(state.filterPresets).toHaveLength(0);
      });

      it('删除不存在的预设ID应无任何操作', () => {
        useCommuteStore.setState({ filters: { ...baseInitialState.filters } });
        useCommuteStore.getState().saveFilterPreset('预设A');

        const stateBefore = useCommuteStore.getState();
        useCommuteStore.getState().deleteFilterPreset('non-existent-id');
        const stateAfter = useCommuteStore.getState();

        expect(stateAfter.filterPresets).toEqual(stateBefore.filterPresets);
      });
    });

    describe('筛选预设持久化', () => {
      it('保存预设应同步写入localStorage', () => {
        useCommuteStore.setState({
          filters: { ...baseInitialState.filters, transportModes: ['subway'] },
        });

        useCommuteStore.getState().saveFilterPreset('持久化测试');

        const stored = localStorage.getItem('commute-filter-presets');
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored!);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].name).toBe('持久化测试');
        expect(parsed[0].transportModes).toEqual(['subway']);
      });

      it('删除预设应同步更新localStorage', () => {
        useCommuteStore.setState({ filters: { ...baseInitialState.filters } });
        useCommuteStore.getState().saveFilterPreset('预设1');
        vi.advanceTimersByTime(10);
        useCommuteStore.getState().saveFilterPreset('预设2');

        const toDeleteId = useCommuteStore.getState().filterPresets[0].id;
        useCommuteStore.getState().deleteFilterPreset(toDeleteId);

        const stored = JSON.parse(localStorage.getItem('commute-filter-presets')!);
        expect(stored).toHaveLength(1);
        expect(stored[0].name).toBe('预设2');
      });

      it('页面刷新后应从localStorage加载预设', async () => {
        useCommuteStore.setState({
          filters: { ...baseInitialState.filters, transportModes: ['car', 'bike'] },
        });
        useCommuteStore.getState().saveFilterPreset('刷新测试预设');

        vi.resetModules();
        const { useCommuteStore: freshStore } = await import('./commuteStore');

        expect(freshStore.getState().filterPresets).toHaveLength(1);
        expect(freshStore.getState().filterPresets[0].name).toBe('刷新测试预设');
        expect(freshStore.getState().filterPresets[0].transportModes).toEqual(['car', 'bike']);
      });

      it('localStorage数据损坏时应返回空数组而不崩溃', () => {
        localStorage.setItem('commute-filter-presets', 'invalid-json-{broken}');

        useCommuteStore.setState({ filterPresets: [] }, true);

        vi.resetModules();
        return import('./commuteStore').then(({ useCommuteStore: freshStore }) => {
          expect(freshStore.getState().filterPresets).toEqual([]);
        });
      });

      it('localStorage不存在预设数据时应返回空数组', () => {
        localStorage.removeItem('commute-filter-presets');

        vi.resetModules();
        return import('./commuteStore').then(({ useCommuteStore: freshStore }) => {
          expect(freshStore.getState().filterPresets).toEqual([]);
        });
      });
    });

    describe('筛选预设与其他状态联动', () => {
      it('应用预设后保存的新预设应基于当前筛选条件', () => {
        useCommuteStore.setState({
          filters: { ...baseInitialState.filters, transportModes: ['subway'] },
        });
        useCommuteStore.getState().saveFilterPreset('地铁预设');

        useCommuteStore.setState({
          filters: { ...baseInitialState.filters, transportModes: ['bus'] },
        });
        useCommuteStore.getState().saveFilterPreset('公交预设');

        expect(useCommuteStore.getState().filterPresets).toHaveLength(2);
        expect(useCommuteStore.getState().filterPresets[0].transportModes).toEqual(['subway']);
        expect(useCommuteStore.getState().filterPresets[1].transportModes).toEqual(['bus']);
      });

      it('重命名地点后应用旧预设不应对预设本身产生影响', () => {
        useCommuteStore.setState({
          locations: [mockLocation1, mockLocation2],
          filters: {
            ...baseInitialState.filters,
            origin: '中关村',
            destination: '望京',
          },
        });
        useCommuteStore.getState().saveFilterPreset('中关村到望京');
        const presetId = useCommuteStore.getState().filterPresets[0].id;

        useCommuteStore.getState().renameLocation('loc-1', '中关村软件园');

        const presetAfter = useCommuteStore.getState().filterPresets.find(p => p.id === presetId);
        expect(presetAfter?.name).toBe('中关村到望京');
      });
    });
  });
});
