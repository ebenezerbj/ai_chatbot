// Approximate branch coordinates and helpers for nearest-branch lookup.
// Note: Coordinates are approximate town-center points and can be refined later.

export type Branch = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  phone?: string;
};

export const BRANCHES: Branch[] = [
  { id: 'amantin', name: 'Amantin (Head Office)', region: 'Bono East', lat: 7.708, lng: -1.039, phone: '+233 20 205 5170' },
  { id: 'atebubu', name: 'Atebubu', region: 'Bono East', lat: 7.712, lng: -0.988, phone: '+233 20 205 5173' },
  { id: 'kajaji', name: 'Kajaji', region: 'Bono East', lat: 7.800, lng: -0.540, phone: '+233 24 052 6372' },
  { id: 'kwame_danso', name: 'Kwame Danso', region: 'Bono East', lat: 7.730, lng: -0.690, phone: '+233 20 205 5174' },
  { id: 'yeji', name: 'Yeji', region: 'Bono East', lat: 8.154, lng: -0.106, phone: '+233 20 205 5175' },
  { id: 'ahwiaa', name: 'Ahwiaa (Kumasi)', region: 'Ashanti', lat: 6.736, lng: -1.616, phone: '+233 20 209 9931' },
  { id: 'ejura', name: 'Ejura', region: 'Ashanti', lat: 7.383, lng: -1.364, phone: '+233 20 205 5172' },
  { id: 'kejetia', name: 'Kejetia (Behind K.O Methodist School - Kumasi )', region: 'Ashanti', lat: 6.6999130, lng: -1.6206450, phone: '0248698267' },
];

// Known GhanaPost Plus Codes mapped to approximate coordinates (when provided in KB)
const KNOWN_PLUSCODES: Record<string, { lat: number; lng: number; hint?: string }> = {
  'QQJG+P27': { lat: 7.800, lng: -0.540, hint: 'Kajaji East, Tatobatoi' },
  'P8JF+2C6': { lat: 7.730, lng: -0.690, hint: 'Kwame Danso' },
  '68GW+FHJ': { lat: 8.154, lng: -0.106, hint: 'Yeji' },
  'QC32+V79': { lat: 6.736, lng: -1.616, hint: 'Ahwiaa (Kumasi-Techiman Road)' },
};

export function resolvePlusCode(raw: string): { lat: number; lng: number } | null {
  if (!raw) return null;
  // Normalize: trim, uppercase, remove spaces
  const code = raw.trim().toUpperCase().replace(/\s+/g, '');
  return KNOWN_PLUSCODES[code] ?? null;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestBranch(lat: number, lng: number): { branch: Branch; distanceKm: number } {
  let best = BRANCHES[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const b of BRANCHES) {
    const d = haversineKm(lat, lng, b.lat, b.lng);
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return { branch: best, distanceKm: bestDist };
}

export function mapsUrlFromLatLng(lat: number, lng: number): string {
  const latStr = lat.toFixed(6);
  const lngStr = lng.toFixed(6);
  return `https://www.google.com/maps?q=${latStr},${lngStr}`;
}
