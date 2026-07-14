import { BadRequestException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class GeolocationService {
  // Boîte englobante de la Tunisie
  private readonly TUNISIA_BOUNDS = {
    minLat: 30.2,
    maxLat: 37.5,
    minLng: 7.5,
    maxLng: 11.6,
  };

  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}

  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
    estEnLigne?: boolean,
  ) {
    return this.usersService.updateLocation(
      userId,
      latitude,
      longitude,
      estEnLigne,
    );
  }

  async geocode(address: string) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=tn&q=${encodeURIComponent(address)}`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'DeliverEase/1.0 contact@deliverease.tn',
            Accept: 'application/json',
          },
        },
      );

      clearTimeout(timeout);

      if (response.ok) {
        const results = (await response.json()) as Array<{
          lat: string;
          lon: string;
          display_name: string;
        }>;
        if (results.length) {
          return results.map((item) => ({
            address: item.display_name,
            latitude: Number(item.lat),
            longitude: Number(item.lon),
          }));
        }
      }
    } catch {
      // fallback
    }

    // Fallback coordonnées Tunis centre
    return [
      {
        address: address,
        latitude: 36.8065,
        longitude: 10.1815,
      },
    ];
  }

  async reverseGeocode(lat: number, lng: number) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fr`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'DeliverEase/1.0 contact@deliverease.tn',
            Accept: 'application/json',
          },
        },
      );

      clearTimeout(timeout);

      if (response.ok) {
        const result = (await response.json()) as {
          display_name?: string;
          address?: {
            road?: string;
            city?: string;
            town?: string;
            village?: string;
            state?: string;
          };
        };

        if (result.display_name) {
          const addr = result.address;
          const city =
            addr?.city || addr?.town || addr?.village || addr?.state || '';
          const road = addr?.road || '';

          return {
            address: result.display_name,
            rue: road,
            ville: city,
            latitude: lat,
            longitude: lng,
          };
        }
      }
    } catch {
      // fallback
    }

    return {
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      rue: '',
      ville: 'Tunisie',
      latitude: lat,
      longitude: lng,
    };
  }

 /*  async route(input: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
  }) {
    const start = this.normalizePoint(input.start, 'départ');
    const end = this.normalizePoint(input.end, 'arrivée');

    // Essayer OSRM avec timeout
    try {
      const polyline = await this.fetchOsrmRoute(start, end);
      if (polyline) return polyline;
    } catch {
      // OSRM indisponible → fallback
    }

    // Fallback : distance haversine avec coefficient routier tunisien
    return this.fallbackRoute(start, end);
  } */


    async route(input: {
  start?: { lat: number; lng: number };
  end?: { lat: number; lng: number };
  // Accepter aussi les anciens noms par compatibilité
  depart?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
}) {
  // Accepter start/end OU depart/destination
  const startPoint = input.start ?? input.depart;
  const endPoint = input.end ?? input.destination;

  if (!startPoint || !endPoint) {
    throw new BadRequestException('Points de départ et d\'arrivée requis');
  }

  const start = this.normalizePoint(startPoint, 'départ');
  const end = this.normalizePoint(endPoint, 'arrivée');

  console.log(`🗺️ Route: [${start.lat},${start.lng}] → [${end.lat},${end.lng}]`);

  try {
    const result = await this.fetchOsrmRoute(start, end);
    if (result) {
      console.log(`✅ OSRM: ${result.distanceKm} km, ${result.durationMinutes} min`);
      return result;
    }
  } catch (err) {
    console.error('❌ OSRM error:', err);
  }

  console.warn('⚠️ Fallback haversine utilisé');
  return this.fallbackRoute(start, end);
}
 /*  private async fetchOsrmRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      // OSRM public - supporte la Tunisie
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${start.lng},${start.lat};${end.lng},${end.lat}` +
        `?overview=full&geometries=geojson&steps=false`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'DeliverEase/1.0' },
      });

      clearTimeout(timeout);

      if (!response.ok) return null;

      const payload = (await response.json()) as {
        code?: string;
        routes?: Array<{
          distance?: number;
          duration?: number;
          geometry?: {
            coordinates?: Array<[number, number]>;
          };
        }>;
      };

      if (payload.code !== 'Ok' || !payload.routes?.length) return null;

      const route = payload.routes[0];

      if (!route.distance || !route.duration) return null;

      // Convertir GeoJSON [lng, lat] → [lat, lng] pour Leaflet
      const polyline: [number, number][] =
        route.geometry?.coordinates?.map(
          ([lng, lat]) => [lat, lng] as [number, number],
        ) ?? [[start.lat, start.lng], [end.lat, end.lng]];

      return {
        distanceKm: Number((route.distance / 1000).toFixed(2)),
        durationMinutes: Math.max(1, Math.round(route.duration / 60)),
        polyline,
        source: 'osrm',
      };
    } finally {
      clearTimeout(timeout);
    }
  } */


    private async fetchOsrmRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
) {
  const osrmUrls = [
    // Instance principale OSRM - profile voiture optimisé
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}` +
    `?overview=full&geometries=geojson&steps=false&annotations=false`,

    // Instance alternative OpenStreetMap DE
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}` +
    `?overview=full&geometries=geojson&steps=false`,
  ];

  for (const url of osrmUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'DeliverEase/1.0' },
      });

      clearTimeout(timeout);
      if (!response.ok) continue;

      const payload = (await response.json()) as {
        code?: string;
        routes?: Array<{
          distance?: number;
          duration?: number;
          geometry?: { coordinates?: Array<[number, number]> };
        }>;
      };

      if (payload.code !== 'Ok' || !payload.routes?.length) continue;

      const route = payload.routes[0];
      if (!route.distance || !route.duration) continue;

      const polyline: [number, number][] =
        route.geometry?.coordinates?.map(
          ([lng, lat]) => [lat, lng] as [number, number],
        ) ?? [[start.lat, start.lng], [end.lat, end.lng]];

      return {
        distanceKm: Number((route.distance / 1000).toFixed(2)),
        durationMinutes: Math.max(1, Math.round(route.duration / 60)),
        polyline,
        source: 'osrm',
      };
    } catch {
      continue;
    }
  }

  return null;
}

  private fallbackRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
  ) {
    const distanceVol = this.haversineDistance(
      start.lat,
      start.lng,
      end.lat,
      end.lng,
    );

    // Coefficient routier tunisien :
    // Les routes en Tunisie sont sinueuses → multiplier par 1.35
    // Vitesse moyenne : 60 km/h en ville, 90 km/h sur autoroute
    const distanceKm = Number((distanceVol * 1.35).toFixed(2));

    // Estimation vitesse : 50 km/h moyenne (mélange ville/route)
    const durationMinutes = Math.max(
      5,
      Math.round((distanceKm / 50) * 60),
    );

    return {
      distanceKm,
      durationMinutes,
      polyline: [
        [start.lat, start.lng] as [number, number],
        [end.lat, end.lng] as [number, number],
      ],
      source: 'fallback',
    };
  }

  private normalizePoint(
    point: { lat: number; lng: number },
    label: string,
  ) {
    const lat = Number(point?.lat);
    const lng = Number(point?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException(
        `Les coordonnées du point de ${label} sont invalides`,
      );
    }

    // Vérification optionnelle : coordonnées dans la Tunisie
    const { minLat, maxLat, minLng, maxLng } = this.TUNISIA_BOUNDS;
    if (
      lat < minLat || lat > maxLat ||
      lng < minLng || lng > maxLng
    ) {
      // Avertissement seulement, pas d'erreur bloquante
      console.warn(
        `⚠️ Coordonnées hors Tunisie : lat=${lat}, lng=${lng}`,
      );
    }

    return { lat, lng };
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
  }
}