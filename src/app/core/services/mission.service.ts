import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
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

  getMissionsForLivreur(statut?: string): Observable<Mission[]> {
    const url = statut ? `${this.apiUrl}/missions?statut=${encodeURIComponent(statut)}` : `${this.apiUrl}/missions`;

    return this.http.get<Mission[]>(url).pipe(
      map((missions) => missions.map((mission) => normalizeMission(mission)))
    );
  }

  getMyLivreurMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/missions/livreur/me`).pipe(
      map((missions) => missions.map((mission) => normalizeMission(mission))),
      catchError((error) => {
        console.warn('Unable to load missions for current livreur, falling back to empty list', error);
        return of([]);
      })
    );
  }

  getMyActiveLivreurMission(): Observable<Mission | null> {
    return this.http.get<Mission[] | Mission | null>(`${this.apiUrl}/missions/livreur/me/active`).pipe(
      map((response) => {
        if (!response) {
          return null;
        }

        if (Array.isArray(response)) {
          return response.length > 0 ? normalizeMission(response[0]) : null;
        }

        return normalizeMission(response);
      }),
      catchError((error) => {
        console.warn('Unable to load active mission for current livreur, falling back to null', error);
        return of(null);
      })
    );
  }

  getMissionById(id: string): Observable<Mission> {
    return this.http.get<Mission>(`${this.apiUrl}/missions/${id}`).pipe(
      map((mission) => normalizeMission(mission))
    );
  }

  rateMission(id: string, payload: { note: number; tags?: string[]; commentaire?: string | null }): Observable<Mission> {
    const notationPayload: Record<string, unknown> = {
      note: payload.note,
      tags: payload.tags?.length ? payload.tags : undefined
    };

    if (payload.commentaire !== undefined) {
      notationPayload['commentaire'] = payload.commentaire;
    }

    return this.updateMission(id, {
      notation: notationPayload
    });
  }

  accepterMission(id: string): Observable<Mission> {
    return this.http.patch<Mission>(`${this.apiUrl}/missions/${id}/accept`, {}).pipe(
      map((mission) => normalizeMission(mission))
    );
  }

  updateMission(id: string, data: Partial<Mission>): Observable<Mission> {
    const payload: Record<string, unknown> = { ...data };

    if (typeof payload['typeVehiculeRequis'] === 'string') {
      payload['typeVehiculeRequis'] = this.mapVehicleToApi(payload['typeVehiculeRequis'] as string);
    }

    if (typeof payload['vehiculeRequis'] === 'string') {
      payload['vehiculeRequis'] = this.mapVehicleToApi(payload['vehiculeRequis'] as string);
    }

    return this.http.patch<Mission>(`${this.apiUrl}/missions/${id}`, payload).pipe(
      map((mission) => normalizeMission(mission))
    );
  }

  refuserMission(id: string, raisonAnnulation?: string): Observable<Mission> {
    return this.updateStatut(id, MissionStatus.ANNULEE, raisonAnnulation);
  }

  updateStatut(id: string, statut: MissionStatus, raisonAnnulation?: string): Observable<Mission> {
    return this.http.patch<Mission>(`${this.apiUrl}/missions/${id}/status`, {
      statut,
      raisonAnnulation
    }).pipe(
      map((mission) => normalizeMission(mission))
    );
  }

  getLivreursCompatibles(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/missions/${id}/livreurs-compatibles`);
  }

  annulerMission(id: string, raisonAnnulation?: string): Observable<Mission> {
    return this.updateStatut(id, MissionStatus.ANNULEE, raisonAnnulation);
  }

  remettreMissionEnCours(id: string): Observable<Mission> {
    return this.updateStatut(id, MissionStatus.EN_ATTENTE);
  }

  annulerAcceptation(id: string): Observable<Mission> {
    return this.remettreMissionEnCours(id);
  }

  private mapVehicleToApi(value: string): string {
    const mapping: Record<string, string> = {
      Bicyclette: 'BICYCLETTE',
      Moto: 'MOTO',
      Scooter: 'SCOOTER',
      Voiture: 'VOITURE',
      Pickup: 'PICKUP',
      Camionnette: 'FOURGONNETTE',
      'Petit camion': 'PETIT_CAMION',
      'Gros camion': 'GROS_CAMION'
    };

    return mapping[value] ?? value;
  }
}
