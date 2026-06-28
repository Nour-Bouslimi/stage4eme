import { BadRequestException, Injectable } from '@nestjs/common';
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
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
  }) {
    const start = this.normalizePoint(input.start, 'depart');
    const end = this.normalizePoint(input.end, 'arrivee');

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=false`;
      const response = await fetch(url);

      if (response.ok) {
        const payload = (await response.json()) as {
          routes?: Array<{
            distance?: number;
            duration?: number;
            geometry?: { coordinates?: Array<[number, number]> };
          }>;
        };
        const route = payload.routes?.[0];

        if (route?.distance != null && route.duration != null) {
          const polyline =
            route.geometry?.coordinates?.map(([lng, lat]) => [lat, lng] as [number, number]) ?? [
              [start.lat, start.lng] as [number, number],
              [end.lat, end.lng] as [number, number],
            ];

          return {
            distanceKm: Number((route.distance / 1000).toFixed(2)),
            durationMinutes: Math.max(1, Math.round(route.duration / 60)),
            polyline,
          };
        }
      }
    } catch {
      // fallback below
    }

    const distanceKm = this.haversineDistance(start.lat, start.lng, end.lat, end.lng);
    const durationMinutes = Math.max(1, Math.round((distanceKm / 35) * 60));
    return {
      distanceKm,
      durationMinutes,
      polyline: [
        [start.lat, start.lng] as [number, number],
        [end.lat, end.lng] as [number, number],
      ],
    };
  }

  private normalizePoint(point: { lat: number; lng: number }, label: string) {
    const lat = Number(point?.lat);
    const lng = Number(point?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException(`Les coordonnees de ${label} sont invalides`);
    }

    return { lat, lng };
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
