import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  MissionEstimateRequest,
  MissionPricingBreakdown
} from '../models/mission.model';

export interface MissionEstimation {
  distanceKm: number | null;
  dureeEstimee: number | null;
  prixEstime: number | null;
  pricing: MissionPricingBreakdown | null;
  start: unknown;
  end: unknown;
  route: unknown;
  raw: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class MissionEstimationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  estimate(request: MissionEstimateRequest): Observable<MissionEstimation> {
    return this.http.post<unknown>(`${this.apiUrl}/missions/estimate`, request).pipe(
      map((response) => this.normalizeEstimateResponse(response))
    );
  }

  private normalizeEstimateResponse(response: unknown): MissionEstimation {
    const payload = this.unwrapPayload(response);

    return {
      distanceKm: this.readNumber(payload, ['distanceKm', 'distance', 'distance_km']),
      dureeEstimee: this.readNumber(payload, ['dureeEstimee', 'duree_estimee', 'duration', 'durationMinutes', 'durationMin', 'minutes']),
      prixEstime: this.readNumber(payload, ['prixEstime', 'prix_estime', 'estimatedPrice', 'estimated_price', 'price', 'total']),
      pricing: this.readPricing(payload),
      start: this.readValue(payload, ['start']),
      end: this.readValue(payload, ['end']),
      route: this.readValue(payload, ['route']),
      raw: payload
    };
  }

  private unwrapPayload(response: unknown): Record<string, unknown> {
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      return {};
    }

    const payload = response as Record<string, unknown>;
    const data = payload['data'];

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }

    return payload;
  }

  private readPricing(payload: Record<string, unknown>): MissionPricingBreakdown | null {
    const pricingObject = this.readObject(payload, ['pricing', 'pricingDetails', 'breakdown', 'tarification']);
    const source = pricingObject ?? payload;

    const pricing: MissionPricingBreakdown = {
      baseFare: this.readNumber(source, ['baseFare', 'base_fare', 'tarifBase', 'base']),
      distanceFare: this.readNumber(source, ['distanceFare', 'distance_fare', 'costDistance', 'distanceCost']),
      timeFare: this.readNumber(source, ['timeFare', 'time_fare', 'durationFare', 'durationCost']),
      weightFare: this.readNumber(source, ['weightFare', 'weight_fare', 'supplementPoids', 'weightCost']),
      volumeFare: this.readNumber(source, ['volumeFare', 'volume_fare', 'supplementVolume', 'volumeCost']),
      vehicleFare: this.readNumber(source, ['vehicleFare', 'vehicle_fare', 'supplementVehicle', 'vehicleCost']),
      serviceFee: this.readNumber(source, ['serviceFee', 'service_fee', 'fraisService', 'fee']),
      total: this.readNumber(source, ['total', 'totalFare', 'total_fare', 'prixEstime', 'estimatedPrice', 'estimated_price'])
    };

    const hasValue = Object.values(pricing).some((value) => value != null);
    return hasValue ? pricing : null;
  }

  private readObject(source: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
    for (const key of keys) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }

    return null;
  }

  private readValue(source: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      if (key in source) {
        return source[key];
      }
    }

    return undefined;
  }

  private readNumber(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.replace(',', '.'));
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }
}
