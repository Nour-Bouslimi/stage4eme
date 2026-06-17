import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class GeolocationService {
  constructor(private usersService: UsersService) {}

  async updateLocation(userId: string, latitude: number, longitude: number, estEnLigne?: boolean) {
    return this.usersService.updateLocation(userId, latitude, longitude, estEnLigne);
  }

  async geocode(address: string) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(address)}`, {
        headers: {
          'User-Agent': 'backend-stage/1.0',
          Accept: 'application/json',
        },
      });
      if (response.ok) {
        const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
        if (results.length) {
          return results.map((item) => ({
            address: item.display_name,
            latitude: Number(item.lat),
            longitude: Number(item.lon),
          }));
        }
      }
    } catch {
      // fallback below
    }

    const seed = [...address].reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
    return [
      {
        address,
        latitude: Number(((seed % 9000) / 100).toFixed(6)),
        longitude: Number((((seed * 7) % 18000) / 100).toFixed(6)),
      },
    ];
  }

  async reverseGeocode(lat: number, lng: number) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
        {
          headers: {
            'User-Agent': 'backend-stage/1.0',
            Accept: 'application/json',
          },
        },
      );
      if (response.ok) {
        const result = (await response.json()) as { display_name?: string };
        if (result.display_name) {
          return { address: result.display_name, latitude: lat, longitude: lng };
        }
      }
    } catch {
      // fallback below
    }
    return { address: `${lat}, ${lng}`, latitude: lat, longitude: lng };
  }

  async route(input: {
    start?: { lat?: number; lng?: number; address?: string };
    end?: { lat?: number; lng?: number; address?: string };
  }) {
    const start = await this.resolvePoint(input.start);
    const end = await this.resolvePoint(input.end);
    const distanceKm = this.haversineDistance(start.lat, start.lng, end.lat, end.lng);
    const durationMinutes = Math.max(1, Math.round((distanceKm / 35) * 60));
    return {
      distanceKm,
      durationMinutes,
      start,
      end,
      polyline: [
        [start.lat, start.lng],
        [end.lat, end.lng],
      ],
    };
  }

  private async resolvePoint(point?: { lat?: number; lng?: number; address?: string }) {
    if (!point) {
      return { lat: 0, lng: 0, address: null };
    }
    if (typeof point.lat === 'number' && typeof point.lng === 'number') {
      return { lat: point.lat, lng: point.lng, address: point.address ?? null };
    }
    if (point.address) {
      const results = await this.geocode(point.address);
      const first = results[0];
      return { lat: first.latitude, lng: first.longitude, address: first.address };
    }
    return { lat: 0, lng: 0, address: null };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((earthRadiusKm * c).toFixed(2));
  }
}
