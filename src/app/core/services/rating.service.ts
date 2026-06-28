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
}
