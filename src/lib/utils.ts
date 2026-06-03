import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { CommuteRoute, Location } from '../types/commute';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface RouteCoords {
  originCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
}

export function getRouteCoords(route: CommuteRoute, locations: Location[]): RouteCoords | null {
  const originLoc = locations.find(l => l.name === route.origin);
  const destLoc = locations.find(l => l.name === route.destination);
  
  if (!originLoc || !destLoc) {
    return null;
  }
  
  return {
    originCoords: { lat: originLoc.lat, lng: originLoc.lng },
    destCoords: { lat: destLoc.lat, lng: destLoc.lng },
  };
}

export function getLocationLookup(locations: Location[]): Record<string, { lat: number; lng: number }> {
  const lookup: Record<string, { lat: number; lng: number }> = {};
  locations.forEach(loc => {
    lookup[loc.name] = { lat: loc.lat, lng: loc.lng };
  });
  return lookup;
}

export function validateRouteLocations(route: { origin: string; destination: string }, locations: Location[]): {
  valid: boolean;
  missingOrigin: boolean;
  missingDestination: boolean;
} {
  const originExists = locations.some(l => l.name === route.origin);
  const destinationExists = locations.some(l => l.name === route.destination);
  
  return {
    valid: originExists && destinationExists,
    missingOrigin: !originExists,
    missingDestination: !destinationExists,
  };
}
