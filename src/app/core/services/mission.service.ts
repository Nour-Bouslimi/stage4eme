import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Mission,
  CreateMissionRequest,
  UpdateStatusRequest,
  MissionStatus,
  normalizeMission,
  toMissionApiRequest
} from '../models/mission.model';

@Injectable({
  providedIn: 'root'
})
export class MissionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  creerMission(data: CreateMissionRequest): Observable<Mission> {
    return this.http.post<Mission>(`${this.apiUrl}/missions`, toMissionApiRequest(data)).pipe(
      map((mission) => normalizeMission(mission))
    );
  }

  getMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/missions/client/me`).pipe(
      map((missions) => missions.map((mission) => normalizeMission(mission)))
    );
  }

  getMissionById(id: string): Observable<Mission> {
    return this.http.get<Mission>(`${this.apiUrl}/missions/${id}`).pipe(
      map((mission) => normalizeMission(mission))
    );
  }

  accepterMission(id: string): Observable<Mission> {
    return this.http.patch<Mission>(`${this.apiUrl}/missions/${id}/accept`, {}).pipe(
      map((mission) => normalizeMission(mission))
    );
  }

  refuserMission(id: string): Observable<Mission> {
    return this.updateStatut(id, MissionStatus.ANNULEE);
  }

  updateStatut(id: string, statut: MissionStatus): Observable<Mission> {
    return this.http.patch<Mission>(`${this.apiUrl}/missions/${id}/status`, { statut }).pipe(
      map((mission) => normalizeMission(mission))
    );
  }

  getLivreursCompatibles(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/missions/${id}/livreurs-compatibles`);
  }

  annulerMission(id: string): Observable<Mission> {
    return this.updateStatut(id, MissionStatus.ANNULEE);
  }
}
