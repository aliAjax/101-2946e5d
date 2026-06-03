import { CommuteRoute, TransportMode, TimeOfDay, Location } from '../types/commute';

export const defaultLocations: Location[] = [
  { id: 'loc-1', name: '中关村', lat: 39.98, lng: 116.31 },
  { id: 'loc-2', name: '望京', lat: 39.99, lng: 116.47 },
  { id: 'loc-3', name: '国贸', lat: 39.91, lng: 116.46 },
  { id: 'loc-4', name: '西单', lat: 39.91, lng: 116.37 },
  { id: 'loc-5', name: '三里屯', lat: 39.93, lng: 116.45 },
  { id: 'loc-6', name: '西二旗', lat: 40.05, lng: 116.30 },
  { id: 'loc-7', name: '五道口', lat: 39.99, lng: 116.34 },
  { id: 'loc-8', name: '东直门', lat: 39.94, lng: 116.43 },
];

const locations = defaultLocations.map(loc => ({
  name: loc.name,
  coords: { lat: loc.lat, lng: loc.lng },
}));

const transportModes: TransportMode[] = ['subway', 'bus', 'car', 'bike', 'walk'];
const timeOfDayOptions: TimeOfDay[] = ['morning_peak', 'evening_peak', 'off_peak'];

function getTimeOfDayMultipliers(timeOfDay: TimeOfDay, isWeekend: boolean) {
  if (isWeekend) {
    return { duration: 0.9, crowd: 0.6 };
  }
  switch (timeOfDay) {
    case 'morning_peak':
      return { duration: 1.3, crowd: 1.3 };
    case 'evening_peak':
      return { duration: 1.25, crowd: 1.25 };
    case 'off_peak':
      return { duration: 0.9, crowd: 0.7 };
    default:
      return { duration: 1, crowd: 1 };
  }
}

function generateRoutes(): CommuteRoute[] {
  const routes: CommuteRoute[] = [];
  const startDate = new Date('2024-01-01');
  
  for (let day = 0; day < 60; day++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    for (let i = 0; i < 5; i++) {
      const origin = locations[Math.floor(Math.random() * locations.length)];
      let destination = locations[Math.floor(Math.random() * locations.length)];
      while (destination.name === origin.name) {
        destination = locations[Math.floor(Math.random() * locations.length)];
      }
      
      const mode = transportModes[Math.floor(Math.random() * transportModes.length)];
      const timeOfDay = timeOfDayOptions[Math.floor(Math.random() * timeOfDayOptions.length)];
      const multipliers = getTimeOfDayMultipliers(timeOfDay, isWeekend);
      
      let duration: number;
      let cost: number;
      let crowdLevel: number;
      
      const distance = Math.sqrt(
        Math.pow(origin.coords.lat - destination.coords.lat, 2) +
        Math.pow(origin.coords.lng - destination.coords.lng, 2)
      ) * 100;
      
      switch (mode) {
        case 'subway':
          duration = Math.round((distance * 3 + 15 + (Math.random() - 0.5) * 10) * multipliers.duration);
          cost = Math.round(distance * 0.5 + 3);
          crowdLevel = Math.round(5 * multipliers.crowd);
          break;
        case 'bus':
          duration = Math.round((distance * 5 + 20 + (Math.random() - 0.5) * 15) * multipliers.duration);
          cost = 2;
          crowdLevel = Math.round(4 * multipliers.crowd);
          break;
        case 'car':
          duration = Math.round((distance * 2 + 25 + (Math.random() - 0.5) * 20) * multipliers.duration);
          cost = Math.round(distance * 2 + 10);
          crowdLevel = Math.round(3 * multipliers.crowd);
          break;
        case 'bike':
          duration = Math.round(distance * 8 + 10 + (Math.random() - 0.5) * 5);
          cost = 1;
          crowdLevel = 1;
          break;
        case 'walk':
          duration = Math.round(distance * 20 + 30 + (Math.random() - 0.5) * 10);
          cost = 0;
          crowdLevel = 1;
          break;
        default:
          duration = 30;
          cost = 5;
          crowdLevel = 3;
      }
      
      routes.push({
        id: `route-${day}-${i}`,
        name: `${origin.name} → ${destination.name}`,
        origin: origin.name,
        destination: destination.name,
        transportMode: mode,
        duration: Math.max(5, duration),
        cost: Math.max(0, cost),
        crowdLevel: Math.max(1, Math.min(5, crowdLevel + Math.round((Math.random() - 0.5) * 2))),
        date: dateStr,
        timeOfDay,
      });
    }
  }
  
  return routes;
}

export const mockRoutes: CommuteRoute[] = generateRoutes();
