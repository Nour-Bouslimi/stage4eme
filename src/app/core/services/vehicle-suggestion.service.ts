// src/app/services/vehicle-suggestion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VehicleSuggestion {
  typeVehicule: string;
  poidsMinKg: number;
  volumeMinM3: number;
  raison: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable({ providedIn: 'root' })
export class VehicleSuggestionService {
  constructor(private http: HttpClient) {}

  suggest(description: string): Observable<VehicleSuggestion> {
    return this.http.post<VehicleSuggestion>(
      `${environment.apiUrl}/vehicle-suggestion`,
      { description }
    );
  }
}
