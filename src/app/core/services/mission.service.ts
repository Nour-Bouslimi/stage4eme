import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationType } from '../models/notification.model';
import {
  Mission,
  CreateMissionRequest,
  UpdateStatusRequest,
  MissionStatus,
  normalizeMission,
  toMissionApiRequest
} from '../models/mission.model';
import { UserRole } from '../models/user.model';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class MissionService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  creerMission(data: CreateMissionRequest): Observable<Mission> {
    return this.http.post<Mission>(`${this.apiUrl}/missions`, toMissionApiRequest(data)).pipe(
      map((mission) => this.withVisibleNotifications(normalizeMission(mission))),
      tap((mission) => {
        this.notifyMissionEvent(
          mission,
          NotificationType.NOUVELLE_MISSION,
          'Nouvelle mission créée',
          'Votre mission a bien été enregistrée et est maintenant en attente d’un livreur.',
          ['self', 'admin']
        );
      })
    );
  }

  getMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/missions/client/me`).pipe(
      map((missions) => missions.map((mission) => this.withVisibleNotifications(normalizeMission(mission))))
    );
  }

  getAllMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/missions`).pipe(
      map((missions) => missions.map((mission) => this.withVisibleNotifications(normalizeMission(mission))))
    );
  }

  getMissionsForLivreur(statut?: string): Observable<Mission[]> {
    const url = statut ? `${this.apiUrl}/missions?statut=${encodeURIComponent(statut)}` : `${this.apiUrl}/missions`;

    return this.http.get<Mission[]>(url).pipe(
      map((missions) => missions.map((mission) => this.withVisibleNotifications(normalizeMission(mission))))
    );
  }

  getMyLivreurMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/missions/livreur/me`).pipe(
      map((missions) => missions.map((mission) => this.withVisibleNotifications(normalizeMission(mission)))),
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
          return response.length > 0 ? this.withVisibleNotifications(normalizeMission(response[0])) : null;
        }

        return this.withVisibleNotifications(normalizeMission(response));
      }),
      catchError((error) => {
        console.warn('Unable to load active mission for current livreur, falling back to null', error);
        return of(null);
      })
    );
  }

  getMissionById(id: string): Observable<Mission> {
    return this.http.get<Mission>(`${this.apiUrl}/missions/${id}`).pipe(
      map((mission) => this.withVisibleNotifications(normalizeMission(mission)))
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
      map((mission) => this.withVisibleNotifications(normalizeMission(mission))),
      tap((mission) => {
        this.notifyMissionEvent(
          mission,
          NotificationType.MISSION_ACCEPTEE,
          'Mission acceptée',
          'Votre mission a été acceptée et le client en a été informé.',
          ['client', 'admin']
        );
      })
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
      map((mission) => this.withVisibleNotifications(normalizeMission(mission)))
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
      map((mission) => this.withVisibleNotifications(normalizeMission(mission))),
      tap((mission) => {
        const config = this.getStatusNotificationConfig(statut);
        if (config) {
          const recipients = this.buildStatusRecipients(statut);
          this.notifyMissionEvent(mission, config.type, config.title, config.message, recipients);
        }
      })
    );
  }

  getLivreursCompatibles(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/missions/${id}/livreurs-compatibles`);
  }

  assignerLivreur(missionId: string, livreurId: string): Observable<Mission> {
    return this.http.patch<Mission>(`${this.apiUrl}/missions/${missionId}/assign`, { livreurId }).pipe(
      map((mission) => this.withVisibleNotifications(normalizeMission(mission)))
    );
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

  private notifyMissionEvent(
    mission: Mission,
    type: NotificationType,
    title: string,
    message: string,
    recipients: Array<'self' | 'client' | 'livreur' | 'admin'>
  ): void {
    const targets = new Set<string>();
    const currentUserId = this.authService.getUserId();

    if (recipients.includes('self') && currentUserId) {
      targets.add(currentUserId);
    }

    if (recipients.includes('client')) {
      const clientId = mission.clientId ?? mission.client?.id;
      if (clientId) {
        targets.add(clientId);
      }
    }

    if (recipients.includes('livreur')) {
      const livreurId = mission.livreurId ?? mission.livreur?.id;
      if (livreurId) {
        targets.add(livreurId);
      }
    }

    if (recipients.includes('admin')) {
      targets.add('role:ADMIN');
    }

    targets.forEach((targetId) => {
      const targetType = targetId.startsWith('role:') ? 'ROLE' : 'USER';
      this.notificationService.addNotification({
        cibleType: targetType as 'USER' | 'ROLE',
        cibleRole: targetType === 'ROLE' ? UserRole.ADMIN : undefined,
        cibleUserId: targetType === 'USER' ? targetId : undefined,
        userId: targetType === 'USER' ? targetId : undefined,
        type,
        titre: title,
        message,
        missionId: mission.id
      });
    });
  }

  private buildStatusRecipients(statut: MissionStatus): Array<'client' | 'livreur' | 'admin'> {
    switch (statut) {
      case MissionStatus.ACCEPTEE:
      case MissionStatus.EN_ROUTE:
      case MissionStatus.ARRIVEE:
      case MissionStatus.EN_LIVRAISON:
      case MissionStatus.TERMINEE:
        return ['client', 'admin'];
      case MissionStatus.ANNULEE:
        return ['client', 'livreur', 'admin'];
      default:
        return ['admin'];
    }
  }

  private getStatusNotificationConfig(statut: MissionStatus): { type: NotificationType; title: string; message: string } | null {
    switch (statut) {
      case MissionStatus.ACCEPTEE:
        return {
          type: NotificationType.MISSION_ACCEPTEE,
          title: 'Mission acceptée',
          message: 'La mission a été acceptée par un livreur et est maintenant en cours de traitement.'
        };
      case MissionStatus.EN_ROUTE:
        return {
          type: NotificationType.STATUT_CHANGE,
          title: 'Mission en route',
          message: 'Le livreur a commencé le trajet vers le point de livraison.'
        };
      case MissionStatus.ARRIVEE:
        return {
          type: NotificationType.LIVREUR_ARRIVE,
          title: 'Livreur arrivé',
          message: 'Le livreur est arrivé à destination. La remise du colis peut commencer.'
        };
      case MissionStatus.EN_LIVRAISON:
        return {
          type: NotificationType.STATUT_CHANGE,
          title: 'Livraison en cours',
          message: 'Le livreur a débuté la livraison.'
        };
      case MissionStatus.TERMINEE:
        return {
          type: NotificationType.MISSION_TERMINEE,
          title: 'Mission terminée',
          message: 'La mission est maintenant terminée. N’hésitez pas à laisser votre avis.'
        };
      case MissionStatus.ANNULEE:
        return {
          type: NotificationType.MISSION_ANNULEE,
          title: 'Mission annulée',
          message: 'La mission a été annulée. Une nouvelle proposition pourra être faite si besoin.'
        };
      default:
        return null;
    }
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

  private withVisibleNotifications(mission: Mission): Mission {
    return {
      ...mission,
      notifications: this.notificationService.filterVisibleNotifications(mission.notifications)
    };
  }
}
