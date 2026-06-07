import { describe, it, expect } from 'vitest';
import { parseCSV } from './csvParser';
import type { CommuteRoute } from '../types/commute';

const mockLocationLookup = {
  '中关村': { lat: 39.98, lng: 116.31 },
  '望京': { lat: 39.99, lng: 116.47 },
  '国贸': { lat: 39.91, lng: 116.46 },
};

describe('csvParser', () => {
  describe('表头别名支持', () => {
    it('应支持英文表头', () => {
      const csv = `origin,destination,transportMode,duration,cost,crowdLevel,date
中关村,望京,subway,30,5,3,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.missingFields).toHaveLength(0);
      expect(result.validRoutes).toHaveLength(1);
      expect(result.validRoutes[0].origin).toBe('中关村');
      expect(result.validRoutes[0].transportMode).toBe('subway');
    });

    it('应支持中文表头', () => {
      const csv = `出发地,目的地,交通方式,耗时(分钟),费用(元),拥挤程度,日期
中关村,望京,地铁,30,5,3,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.missingFields).toHaveLength(0);
      expect(result.validRoutes).toHaveLength(1);
      expect(result.validRoutes[0].origin).toBe('中关村');
      expect(result.validRoutes[0].transportMode).toBe('subway');
    });

    it('应支持混合中英文表头别名', () => {
      const csv = `origin,目的地,交通方式,耗时,费用,拥挤程度,date
中关村,望京,subway,30,5,3,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.missingFields).toHaveLength(0);
      expect(result.validRoutes).toHaveLength(1);
    });

    it('应支持不区分大小写的英文表头', () => {
      const csv = `ORIGIN,DESTINATION,TRANSPORTMODE,DURATION,COST,CROWDLEVEL,DATE
中关村,望京,subway,30,5,3,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.missingFields).toHaveLength(0);
      expect(result.validRoutes).toHaveLength(1);
    });

    it('应支持时间段可选字段的别名', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期,时段
中关村,望京,地铁,30,5,3,2024-01-01,早高峰`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.validRoutes).toHaveLength(1);
      expect(result.validRoutes[0].timeOfDay).toBe('morning_peak');
    });
  });

  describe('未知地点处理', () => {
    it('应识别未知出发地', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期
未知地点,望京,地铁,30,5,3,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.validRoutes).toHaveLength(0);
      expect(result.unknownLocationRows).toHaveLength(1);
      expect(result.unknownLocationRows[0].unknownOrigins).toContain('未知地点');
      expect(result.unknownLocations).toContain('未知地点');
    });

    it('应识别未知目的地', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期
中关村,未知地点,地铁,30,5,3,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.validRoutes).toHaveLength(0);
      expect(result.unknownLocationRows).toHaveLength(1);
      expect(result.unknownLocationRows[0].unknownDestinations).toContain('未知地点');
      expect(result.unknownLocations).toContain('未知地点');
    });

    it('应同时识别未知出发地和目的地', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期
未知A,未知B,地铁,30,5,3,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.unknownLocationRows).toHaveLength(1);
      expect(result.unknownLocationRows[0].unknownOrigins).toContain('未知A');
      expect(result.unknownLocationRows[0].unknownDestinations).toContain('未知B');
      expect(result.unknownLocations).toHaveLength(2);
    });
  });

  describe('重复路线检测', () => {
    const existingRoutes: CommuteRoute[] = [
      {
        id: 'existing-1',
        name: '中关村 → 望京',
        origin: '中关村',
        destination: '望京',
        transportMode: 'subway',
        duration: 30,
        cost: 5,
        crowdLevel: 3,
        date: '2024-01-01',
        timeOfDay: 'morning_peak',
      },
    ];

    it('应检测完全相同的重复路线', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期
中关村,望京,地铁,30,5,3,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup, existingRoutes);

      expect(result.duplicateRows).toHaveLength(1);
      expect(result.duplicateRows[0].duplicateType).toBe('exact');
      expect(result.duplicateRows[0].existingRouteId).toBe('existing-1');
    });

    it('应检测同起终点同交通方式同日期的路线（属性可能不同）', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期
中关村,望京,地铁,45,8,4,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup, existingRoutes);

      expect(result.duplicateRows).toHaveLength(1);
      expect(result.duplicateRows[0].duplicateType).toBe('same_od_mode_date');
    });

    it('不同日期不应视为重复', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期
中关村,望京,地铁,30,5,3,2024-01-02`;

      const result = parseCSV(csv, mockLocationLookup, existingRoutes);

      expect(result.duplicateRows).toHaveLength(0);
    });
  });

  describe('字段验证', () => {
    it('应报告缺失的必填字段', () => {
      const csv = `出发地,目的地,交通方式
中关村,望京,地铁`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.missingFields).toContain('duration');
      expect(result.missingFields).toContain('cost');
      expect(result.missingFields).toContain('crowdLevel');
      expect(result.missingFields).toContain('date');
    });

    it('应验证日期格式', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期
中关村,望京,地铁,30,5,3,2024/01/01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('日期');
      expect(result.errors[0].message).toContain('格式无效');
    });

    it('应验证拥挤程度为1-5整数', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期
中关村,望京,地铁,30,5,6,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('拥挤程度');
    });

    it('应验证耗时为正数', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期
中关村,望京,地铁,-5,5,3,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('耗时');
    });
  });

  describe('边界情况', () => {
    it('CSV数据不足时应返回错误', () => {
      const csv = `出发地,目的地`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('数据不足');
    });

    it('应跳过空行', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期

中关村,望京,地铁,30,5,3,2024-01-01

`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.validRoutes).toHaveLength(1);
      expect(result.totalRows).toBe(1);
    });

    it('应支持带引号的CSV字段', () => {
      const csv = `出发地,目的地,交通方式,耗时,费用,拥挤程度,日期
"中关村,科技园",望京,地铁,30,5,3,2024-01-01`;

      const result = parseCSV(csv, mockLocationLookup);

      expect(result.errors).toHaveLength(0);
      expect(result.unknownLocationRows).toHaveLength(1);
      expect(result.unknownLocationRows[0].route.origin).toBe('中关村,科技园');
    });
  });
});
