// src/app/core/services/driver-recommendation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DriverRecommendation } from '../models/driver-recommendation.model';

@Injectable({ providedIn: 'root' })
export class DriverRecommendationService {
  constructor(private http: HttpClient) {}

  recommend(missionId: string): Observable<DriverRecommendation[]> {
    return this.http.get<DriverRecommendation[]>(
      `${environment.apiUrl}/driver-recommendation/${missionId}`
    );
  }
}
