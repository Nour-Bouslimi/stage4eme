import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private apiUrl = environment.apiUrl;
  private readonly tunisiaFallbacks: Array<{ match: string[]; lat: number; lng: number }> = [
    { match: ['tunis'], lat: 36.8065, lng: 10.1815 },
    { match: ['ariana'], lat: 36.8625, lng: 10.1956 },
{ match: ['ben arous'], lat: 36.7531, lng: 10.2222 },
{ match: ['manouba '], lat: 36.8078, lng: 10.0867 },
{ match: ['zaghouan '], lat: 36.4024, lng: 10.1429 },
{ match: ['le kef'], lat: 36.1738, lng: 8.7048 },
{ match: ['siliana'], lat: 36.0841, lng: 9.3708 },

    { match: ['sfax'], lat: 34.7397, lng: 10.7603 },
    { match: ['sousse'], lat: 35.8256, lng: 10.6406 },
    { match: ['monastir'], lat: 35.7770, lng: 10.8262 },
    { match: ['mahdia'], lat: 35.5047, lng: 11.0622 },
    { match: ['jendouba'], lat: 36.5011, lng: 8.7802 },
    { match: ['bizerte'], lat: 37.2767, lng: 9.8739 },
    { match: ['gabes', 'gabès'], lat: 33.8815, lng: 10.0982 },
    { match: ['medenine', 'médenine'], lat: 33.3549, lng: 10.5055 },
    { match: ['kairouan'], lat: 35.6781, lng: 10.0963 },
    { match: ['nabeul'], lat: 36.4515, lng: 10.7353 },
    { match: ['tataouine'], lat: 32.9297, lng: 10.4518 },
    { match: ['beja', 'béja'], lat: 36.7256, lng: 9.1817 },
    { match: ['kasserine'], lat: 35.1676, lng: 8.8365 },
    { match: ['sidi bouzid'], lat: 35.0382, lng: 9.4849 },
    { match: ['gafsa'], lat: 34.4250, lng: 8.7842 },
    { match: ['tozeur'], lat: 33.9197, lng: 8.1336 },
{ match: ['kébili', 'kebili'], lat: 33.7044, lng: 8.9690 }
  ];

  constructor(private http: HttpClient) {}

  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La géolocalisation n\'est pas supportée par ce navigateur'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /* geocode(address: string): Observable<Array<{ address: string; latitude: number; longitude: number }>> {
    const cleanAddress = address.trim();

    if (!cleanAddress) {
      return of([]);
    }

    const params = new HttpParams().set('address', cleanAddress);

    return this.http.get<unknown>(`${this.apiUrl}/geocode`, { params }).pipe(
      map((response) => this.normalizeGeocodeResponse(response, cleanAddress)),
      catchError(() => of(this.normalizeGeocodeResponse(this.getFallbackCoordinates(cleanAddress), cleanAddress)))
    );
  } */


geocode(address: string): Observable<Array<{ address: string; latitude: number; longitude: number }>> {
  const cleanAddress = address.trim();
  if (!cleanAddress) return of([]);


  const searchQuery = cleanAddress.toLowerCase().includes('tunisie')
    ? cleanAddress
    : `${cleanAddress}, Tunisie`;

  const params = new HttpParams().set('address', searchQuery);

  return this.http.get<unknown>(`${this.apiUrl}/geocode`, { params }).pipe(
    map((response) => {
      const results = this.normalizeGeocodeResponse(response, cleanAddress);
      // Filtrer uniquement les coordonnées en Tunisie
      return results.filter(r =>
        r.latitude >= 30.2 && r.latitude <= 37.5 &&
        r.longitude >= 7.5 && r.longitude <= 11.6
      );
    }),
    catchError(() => of(this.normalizeGeocodeResponse(
      this.getFallbackCoordinates(cleanAddress), cleanAddress
    )))
  );
}

  geocodeAddress(address: string): Observable<any> {
    return this.geocode(address).pipe(
      map((results) => (results.length > 0 ? { lat: results[0].latitude.toString(), lon: results[0].longitude.toString(), display_name: results[0].address } : null))
    );
  }

 /*  getRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }): Observable<{
    distanceKm: number;
    durationMinutes: number;
    polyline: [number, number][];
  }> {
    return this.http.post<unknown>(`${this.apiUrl}/route`, { depart: start, destination: end }).pipe(
      map((response) => this.normalizeRouteResponse(response, start, end)),
      catchError(() => of(this.buildFallbackRoute(start, end)))
    );
  } */

getRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }): Observable<{
  distanceKm: number;
  durationMinutes: number;
  polyline: [number, number][];
}> {
  return this.http.post<unknown>(
    `${this.apiUrl}/route`,
    { depart: start, destination: end }
  ).pipe(
    map((response) => this.normalizeRouteResponse(response, start, end)),
    catchError(() => of(this.buildFallbackRoute(start, end)))
  );
}

  calculateRoute(depart: { lat: number; lng: number }, destination: { lat: number; lng: number }): Observable<any> {
    return this.getRoute(depart, destination);
  }

  reverseGeocode(lat: number, lng: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/reverse-geocode`, {
      params: { lat: lat.toString(), lng: lng.toString() }
    });
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getFallbackCoordinates(address: string): any {
    const normalized = this.normalize(address);
    const fallback = this.tunisiaFallbacks.find((candidate) =>
      candidate.match.some((entry) => normalized.includes(this.normalize(entry)))
    );

    if (!fallback) {
      return null;
    }

    return {
      lat: fallback.lat.toString(),
      lon: fallback.lng.toString(),
      display_name: address
    };
  }

  private normalizeGeocodeResponse(response: unknown, address: string): Array<{ address: string; latitude: number; longitude: number }> {
    const asArray = Array.isArray(response) ? response : this.extractGeocodeArray(response);

    if (asArray.length > 0) {
      return asArray
        .map((item) => this.toGeocodeResult(item))
        .filter((item): item is { address: string; latitude: number; longitude: number } => !!item);
    }

    const fallback = this.getFallbackCoordinates(address);
    const geocodeFallback = this.toGeocodeResult(fallback);
    return geocodeFallback ? [geocodeFallback] : [];
  }

  private extractGeocodeArray(response: unknown): unknown[] {
    if (!response || typeof response !== 'object') {
      return [];
    }

    const payload = response as Record<string, unknown>;
    const candidates = [payload['data'], payload['results'], payload['items'], payload['geocodes']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private toGeocodeResult(value: unknown): { address: string; latitude: number; longitude: number } | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const payload = value as Record<string, unknown>;
    const address = this.readString(payload, ['address', 'display_name', 'label', 'formattedAddress']) || '';
    const latitude = this.readNumber(payload, ['latitude', 'lat']);
    const longitude = this.readNumber(payload, ['longitude', 'lng', 'lon']);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      address: address || 'Adresse',
      latitude,
      longitude
    };
  }

  private normalizeRouteResponse(response: unknown, start: { lat: number; lng: number }, end: { lat: number; lng: number }): {
    distanceKm: number;
    durationMinutes: number;
    polyline: [number, number][];
  } {
    if (response && typeof response === 'object') {
      const payload = response as Record<string, unknown>;
      const distanceKm = this.readNumber(payload, ['distanceKm', 'distance']);
      const durationMinutes = this.readNumber(payload, ['durationMinutes', 'duration', 'durationMin']);
      const polyline = this.extractPolyline(payload, start, end);

      if (Number.isFinite(distanceKm) && Number.isFinite(durationMinutes) && polyline.length > 0) {
        return {
          distanceKm,
          durationMinutes,
          polyline
        };
      }
    }

    return this.buildFallbackRoute(start, end);
  }

  private extractPolyline(payload: Record<string, unknown>, start: { lat: number; lng: number }, end: { lat: number; lng: number }): [number, number][] {
    const candidates = [
      payload['polyline'],
      payload['route'],
      payload['coordinates'],
      payload['path'],
      this.findNestedCoordinates(payload)
    ];

    for (const candidate of candidates) {
      const parsed = this.parsePolylineCandidate(candidate, start, end);
      if (parsed.length > 0) {
        return parsed;
      }
    }

    return [];
  }

  private parsePolylineCandidate(candidate: unknown, start: { lat: number; lng: number }, end: { lat: number; lng: number }): [number, number][] {
    if (!Array.isArray(candidate)) {
      return [];
    }

    const rawPoints = candidate
      .map((item) => this.parseRawPoint(item))
      .filter((point): point is [number, number] => !!point);

    if (rawPoints.length === 0) {
      return [];
    }

    const oriented = this.normalizePolylineOrientation(rawPoints, start, end);
    return oriented;
  }

  private parseRawPoint(value: unknown): [number, number] | null {
    if (Array.isArray(value) && value.length >= 2) {
      const first = Number(value[0]);
      const second = Number(value[1]);
      if (!Number.isFinite(first) || !Number.isFinite(second)) {
        return null;
      }
      return [first, second];
    }

    if (value && typeof value === 'object') {
      const payload = value as Record<string, unknown>;
      const lat = this.readNumber(payload, ['lat', 'latitude']);
      const lng = this.readNumber(payload, ['lng', 'lon', 'longitude']);
      return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
    }

    return null;
  }

  private normalizePolylineOrientation(points: [number, number][], start: { lat: number; lng: number }, end: { lat: number; lng: number }): [number, number][] {
    const candidates = [
      { points, orientation: 'latlng' as const },
      { points: points.map(([a, b]) => [b, a] as [number, number]), orientation: 'lnglat' as const }
    ];

    const scored = candidates.map((candidate) => {
      const first = candidate.points[0];
      const last = candidate.points[candidate.points.length - 1];
      const normalCost = this.calculateDistance(first[0], first[1], start.lat, start.lng) + this.calculateDistance(last[0], last[1], end.lat, end.lng);
      const reversedCost = this.calculateDistance(first[0], first[1], end.lat, end.lng) + this.calculateDistance(last[0], last[1], start.lat, start.lng);
      if (normalCost <= reversedCost) {
        return { points: candidate.points, score: normalCost };
      }
      return { points: [...candidate.points].reverse(), score: reversedCost };
    });

    scored.sort((a, b) => a.score - b.score);
    const best = scored[0];

    if (best.points.some(([lat, lng]) => !this.isLatLng(lat, lng))) {
      return [];
    }

    return best.points;
  }

  private findNestedCoordinates(payload: Record<string, unknown>): unknown {
    for (const value of Object.values(payload)) {
      if (Array.isArray(value) && value.length > 0) {
        if (value.every((item) => Array.isArray(item) && item.length >= 2)) {
          return value;
        }
      }

      if (value && typeof value === 'object') {
        const nested = this.findNestedCoordinates(value as Record<string, unknown>);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  private isLatLng(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  private buildFallbackRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }): {
    distanceKm: number;
    durationMinutes: number;
    polyline: [number, number][];
  } {
    const distanceKm = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const durationMinutes = Math.max(1, Math.round(distanceKm * 2));

    return {
      distanceKm,
      durationMinutes,
      polyline: [
        [start.lat, start.lng],
        [end.lat, end.lng]
      ]
    };
  }

  private readNumber(payload: Record<string, unknown>, keys: string[]): number {
    for (const key of keys) {
      const value = payload[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return NaN;
  }

  private readString(payload: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

}
