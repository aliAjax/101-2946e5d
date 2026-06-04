import { CommuteRoute, TransportMode, TimeOfDay } from '../types/commute';

export const CSV_REQUIRED_FIELDS = ['origin', 'destination', 'transportMode', 'duration', 'cost', 'crowdLevel', 'date'] as const;
export const CSV_OPTIONAL_FIELDS = ['timeOfDay'] as const;
export type CSVField = (typeof CSV_REQUIRED_FIELDS)[number] | (typeof CSV_OPTIONAL_FIELDS)[number];

export const CSV_FIELD_LABELS: Record<CSVField, string> = {
  origin: '出发地',
  destination: '目的地',
  transportMode: '交通方式',
  duration: '耗时(分钟)',
  cost: '费用(元)',
  crowdLevel: '拥挤程度',
  date: '日期',
  timeOfDay: '时间段',
};

const CSV_FIELD_ALIASES: Record<string, CSVField> = {
  origin: 'origin',
  destination: 'destination',
  transportmode: 'transportMode',
  duration: 'duration',
  cost: 'cost',
  crowdlevel: 'crowdLevel',
  date: 'date',
  timeofday: 'timeOfDay',
  'time of day': 'timeOfDay',
  出发地: 'origin',
  目的地: 'destination',
  交通方式: 'transportMode',
  耗时: 'duration',
  '耗时(分钟)': 'duration',
  费用: 'cost',
  '费用(元)': 'cost',
  拥挤程度: 'crowdLevel',
  日期: 'date',
  时间段: 'timeOfDay',
  时段: 'timeOfDay',
};

export interface CSVRowError {
  row: number;
  message: string;
}

export interface CSVUnknownLocationRow {
  route: CommuteRoute;
  row: number;
  unknownOrigins: string[];
  unknownDestinations: string[];
}

export interface CSVParseResult {
  validRoutes: CommuteRoute[];
  errors: CSVRowError[];
  missingFields: string[];
  unknownLocationRows: CSVUnknownLocationRow[];
  unknownLocations: string[];
  totalRows: number;
}

const TRANSPORT_MODE_ALIASES: Record<string, TransportMode> = {
  subway: 'subway',
  bus: 'bus',
  car: 'car',
  bike: 'bike',
  walk: 'walk',
  地铁: 'subway',
  公交: 'bus',
  自驾: 'car',
  骑行: 'bike',
  步行: 'walk',
};

const TIME_OF_DAY_ALIASES: Record<string, TimeOfDay> = {
  morning_peak: 'morning_peak',
  evening_peak: 'evening_peak',
  off_peak: 'off_peak',
  unknown: 'unknown',
  早高峰: 'morning_peak',
  晚高峰: 'evening_peak',
  平峰: 'off_peak',
  未知: 'unknown',
};

interface LocationLookup {
  [name: string]: { lat: number; lng: number };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(csvText: string, locationLookup: LocationLookup): CSVParseResult {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { validRoutes: [], errors: [{ row: 0, message: 'CSV数据不足，至少需要表头行和一行数据' }], missingFields: [], unknownLocationRows: [], unknownLocations: [], totalRows: 0 };
  }

  const headerRow = parseCSVLine(lines[0]);
  const headers = headerRow.map((h) => h.trim());
  const headerToField: Record<number, CSVField> = {};
  const foundFields = new Set<CSVField>();

  headers.forEach((h, idx) => {
    const normalized = h.toLowerCase();
    const field = CSV_FIELD_ALIASES[h] || CSV_FIELD_ALIASES[normalized];
    if (field) {
      headerToField[idx] = field;
      foundFields.add(field);
    }
  });

  const missingFields = CSV_REQUIRED_FIELDS.filter((f) => !foundFields.has(f));

  const fieldIndex: Partial<Record<CSVField, number>> = {};
  Object.entries(headerToField).forEach(([idxStr, field]) => {
    fieldIndex[field] = Number(idxStr);
  });

  const validRoutes: CommuteRoute[] = [];
  const errors: CSVRowError[] = [];
  const unknownLocationRows: CSVUnknownLocationRow[] = [];
  let totalRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.every((v) => v === '')) continue;
    totalRows++;

    const rowErrors: string[] = [];

    const getVal = (field: CSVField): string => {
      const idx = fieldIndex[field];
      return idx !== undefined && idx < values.length ? values[idx] : '';
    };

    const origin = getVal('origin');
    const destination = getVal('destination');
    const transportModeRaw = getVal('transportMode');
    const transportMode = TRANSPORT_MODE_ALIASES[transportModeRaw] || TRANSPORT_MODE_ALIASES[transportModeRaw.toLowerCase()];
    const durationStr = getVal('duration');
    const costStr = getVal('cost');
    const crowdLevelStr = getVal('crowdLevel');
    const date = getVal('date');
    const timeOfDayRaw = getVal('timeOfDay');
    const timeOfDay = timeOfDayRaw 
      ? (TIME_OF_DAY_ALIASES[timeOfDayRaw] || TIME_OF_DAY_ALIASES[timeOfDayRaw.toLowerCase()] || 'unknown')
      : 'unknown';

    if (!origin) rowErrors.push('出发地为空');
    if (!destination) rowErrors.push('目的地为空');
    if (!transportModeRaw) rowErrors.push('交通方式为空');
    else if (!transportMode)
      rowErrors.push(`交通方式"${transportModeRaw}"无效，应为: 地铁/公交/自驾/骑行/步行 或 subway/bus/car/bike/walk`);
    if (!durationStr) rowErrors.push('耗时为空');
    else if (isNaN(Number(durationStr)) || Number(durationStr) <= 0) rowErrors.push(`耗时"${durationStr}"无效`);
    if (!costStr) rowErrors.push('费用为空');
    else if (isNaN(Number(costStr)) || Number(costStr) < 0) rowErrors.push(`费用"${costStr}"无效`);
    if (!crowdLevelStr) rowErrors.push('拥挤程度为空');
    else {
      const cl = Number(crowdLevelStr);
      if (isNaN(cl) || cl < 1 || cl > 5 || !Number.isInteger(cl)) rowErrors.push(`拥挤程度"${crowdLevelStr}"无效，应为1-5整数`);
    }
    if (!date) rowErrors.push('日期为空');
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) rowErrors.push(`日期"${date}"格式无效，应为YYYY-MM-DD`);

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, message: rowErrors.join('；') });
      continue;
    }

    const originCoords = locationLookup[origin];
    const destCoords = locationLookup[destination];

    const unknownOrigins: string[] = [];
    const unknownDestinations: string[] = [];
    if (!originCoords) unknownOrigins.push(origin);
    if (!destCoords) unknownDestinations.push(destination);

    if (unknownOrigins.length > 0 || unknownDestinations.length > 0) {
      unknownLocationRows.push({
        route: {
          id: `csv-${Date.now()}-${i}`,
          name: `${origin} → ${destination}`,
          origin,
          destination,
          transportMode: transportMode as TransportMode,
          duration: Number(durationStr),
          cost: Number(costStr),
          crowdLevel: Number(crowdLevelStr),
          date,
          timeOfDay,
        },
        row: i + 1,
        unknownOrigins,
        unknownDestinations,
      });
      continue;
    }

    validRoutes.push({
      id: `csv-${Date.now()}-${i}`,
      name: `${origin} → ${destination}`,
      origin,
      destination,
      transportMode: transportMode as TransportMode,
      duration: Number(durationStr),
      cost: Number(costStr),
      crowdLevel: Number(crowdLevelStr),
      date,
      timeOfDay,
    });
  }

  const unknownLocationsSet = new Set<string>();
  unknownLocationRows.forEach((r) => {
    r.unknownOrigins.forEach((n) => unknownLocationsSet.add(n));
    r.unknownDestinations.forEach((n) => unknownLocationsSet.add(n));
  });

  return { validRoutes, errors, missingFields, unknownLocationRows, unknownLocations: Array.from(unknownLocationsSet), totalRows };
}
