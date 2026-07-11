import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateRatingRequest {
  missionId: string;
  etoiles: number;
  commentaire?: string;
  appreciations?: string[];
  tags?: string[];
}

export interface UpdateRatingRequest {
  etoiles?: number;
  commentaire?: string;
  appreciations?: string[];
  tags?: string[];
}

export interface RatingResponse {
  id: string;
  etoiles: number;
  commentaire?: string;
  tags?: string[];
  mission: { id: string };
  livreur?: unknown;
  client?: unknown;
}

export interface RatingSummaryResponse {
  average?: number;
  noteMoyenne?: number;
  note?: number;
  totalCount?: number;
  count?: number;
  totalNotes?: number;
  reviews?: RatingResponse[];
  ratings?: RatingResponse[];
}

export interface RatingCountResponse {
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createRating(payload: CreateRatingRequest): Observable<RatingResponse> {
    return this.http.post<RatingResponse>(`${this.apiUrl}/ratings`, payload);
  }

  updateRating(ratingId: string, payload: UpdateRatingRequest): Observable<RatingResponse> {
    return this.http.patch<RatingResponse>(`${this.apiUrl}/ratings/${ratingId}`, payload);
  }

  deleteRating(ratingId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/ratings/${ratingId}`);
  }

  getRatingSummary(livreurId: string): Observable<RatingSummaryResponse> {
    return this.http.get<RatingSummaryResponse>(`${this.apiUrl}/ratings/${livreurId}/summary`);
  }

  getTotalRatingsCount(livreurId: string): Observable<RatingCountResponse> {
    return this.http.get<RatingCountResponse>(`${this.apiUrl}/ratings/${livreurId}/count`);
  }
}
