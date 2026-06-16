import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MissionService } from '../../../core/services/mission.service';
import { SocketService } from '../../../core/services/socket.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.css']
})
export class TrackingComponent implements OnInit, OnDestroy {
  missionId = '';
  mission: Mission | null = null;
  loading = true;
  driverLocation: { lat: number; lng: number } | null = null;
  eta = 0;
  mapMarkers: Array<{ lat: number; lng: number; popup?: string; icon?: string }> = [];
  timelineSteps: Array<{ status: MissionStatus; label: string; time: string; detail: string }> = [];
  protected MissionStatus = MissionStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';
    this.loadMission();
    this.setupSocket();
  }

  ngOnDestroy(): void {
    this.socketService.leaveRoom(this.missionId);
  }

  loadMission(): void {
    this.loading = true;

    this.missionService.getMissionById(this.missionId).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.eta = this.computeEta(mission);
        this.timelineSteps = this.buildTimelineSteps(mission);
        this.mapMarkers = this.buildMapMarkers(mission);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  setupSocket(): void {
    this.socketService.connect();
    this.socketService.joinRoom(this.missionId);

    this.socketService.onLocationUpdate().subscribe((location: any) => {
      this.driverLocation = { lat: location.lat, lng: location.lng };
      this.mapMarkers = this.buildMapMarkers();
    });
  }

  contactDriver(): void {
    this.router.navigate(['/client/chat', this.missionId]);
  }

  getStatusLabel(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'En attente';
      case MissionStatus.ACCEPTEE:
        return 'Acceptée';
      case MissionStatus.EN_ROUTE:
        return 'En route';
      case MissionStatus.ARRIVEE:
        return 'Arrivé';
      case MissionStatus.EN_LIVRAISON:
        return 'En livraison';
      case MissionStatus.TERMINEE:
        return 'Terminée';
      case MissionStatus.ANNULEE:
        return 'Annulée';
      default:
        return status;
    }
  }

  getStatusColor(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'amber';
      case MissionStatus.ACCEPTEE:
        return 'blue';
      case MissionStatus.EN_ROUTE:
        return 'purple';
      case MissionStatus.ARRIVEE:
        return 'indigo';
      case MissionStatus.EN_LIVRAISON:
        return 'orange';
      case MissionStatus.TERMINEE:
        return 'green';
      case MissionStatus.ANNULEE:
        return 'red';
      default:
        return 'gray';
    }
  }

  isTimelineStepActive(stepStatus: MissionStatus): boolean {
    if (!this.mission) {
      return false;
    }

    const order: Record<MissionStatus, number> = {
      [MissionStatus.EN_ATTENTE]: 0,
      [MissionStatus.ACCEPTEE]: 1,
      [MissionStatus.EN_ROUTE]: 2,
      [MissionStatus.ARRIVEE]: 3,
      [MissionStatus.EN_LIVRAISON]: 4,
      [MissionStatus.TERMINEE]: 5,
      [MissionStatus.ANNULEE]: -1,
      [MissionStatus.LIVREE]: 5
    };

    return order[this.mission.statut] >= order[stepStatus] && this.mission.statut !== MissionStatus.ANNULEE;
  }

  getMissionNumber(): string {
    if (!this.mission?.id) {
      return '';
    }

    return `#${this.mission.id.slice(0, 8).toUpperCase()}`;
  }

  getMissionTitle(): string {
    if (!this.mission) {
      return '';
    }

    return this.getCategoryLabel(this.mission.categorie);
  }

  getStatusMessage(): string {
    if (!this.mission) {
      return '';
    }

    switch (this.mission.statut) {
      case MissionStatus.ACCEPTEE:
        return 'Acceptée';
      case MissionStatus.EN_ROUTE:
        return 'En route vers vous';
      case MissionStatus.ARRIVEE:
        return 'Arrivé au point de départ';
      case MissionStatus.EN_LIVRAISON:
        return 'En livraison';
      case MissionStatus.TERMINEE:
        return 'Livraison terminée';
      case MissionStatus.ANNULEE:
        return 'Mission annulée';
      default:
        return 'En attente';
    }
  }

  getStatusBadgeLabel(): string {
    if (!this.mission) {
      return '';
    }

    switch (this.mission.statut) {
      case MissionStatus.EN_ATTENTE:
        return 'En attente';
      case MissionStatus.TERMINEE:
        return 'Terminée';
      case MissionStatus.ANNULEE:
        return 'Annulée';
      default:
        return 'En cours';
    }
  }

  getStatusSubtext(): string {
    if (!this.mission) {
      return '';
    }

    switch (this.mission.statut) {
      case MissionStatus.EN_ROUTE:
        return 'Le livreur est en déplacement';
      case MissionStatus.ARRIVEE:
        return 'Le livreur est arrivé au point de départ';
      case MissionStatus.EN_LIVRAISON:
        return 'La livraison est en cours';
      case MissionStatus.TERMINEE:
        return 'La mission a été finalisée';
      default:
        return 'Suivi en temps réel';
    }
  }

  getJourneyLabel(): string {
    if (!this.mission) {
      return '';
    }

    return `${this.mission.depart.ville || 'Départ'} → ${this.mission.destination.ville || 'Destination'}`;
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      COLIS: 'Colis Express',
      MEUBLES: 'Déménagement meubles',
      DEMENAGEMENT: 'Déménagement complet',
      COURSES: 'Courses',
      MATERIAUX: 'Matériaux de construction',
      PERSONNALISE: 'Mission personnalisée'
    };

    return labels[category] ?? category;
  }

  getRouteDescription(): string {
    if (!this.mission) {
      return '';
    }

    const depart = [this.mission.depart.rue, this.mission.depart.ville].filter(Boolean).join(', ');
    const destination = [this.mission.destination.rue, this.mission.destination.ville].filter(Boolean).join(', ');
    return `${depart || 'Départ'} - ${destination || 'Destination'}`;
  }

  getWeightLabel(): string {
    if (!this.mission) {
      return '';
    }

    const weight = this.mission.poidsEstime ?? this.mission.poids;
    if (!weight) {
      return '—';
    }

    return `${weight} kg`;
  }

  getDateLabel(): string {
    if (!this.mission?.createdAt) {
      return '—';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(this.mission.createdAt));
  }

  getVisibleDriverName(): string {
    if (!this.mission?.livreur) {
      return 'Livreur';
    }

    const firstName = this.mission.livreur.prenom?.trim() || 'Livreur';
    const lastName = this.mission.livreur.nom?.trim();
    return lastName ? `${firstName} ${lastName}` : firstName;
  }

  private buildTimelineSteps(mission?: Mission | null): Array<{ status: MissionStatus; label: string; time: string; detail: string }> {
    if (!mission) {
      return [];
    }

    return [
      { status: MissionStatus.ACCEPTEE, label: 'Acceptée', time: this.formatMissionDate(mission.accepteeLe), detail: 'Livreur assigné' },
      { status: MissionStatus.EN_ROUTE, label: 'En route', time: this.formatMissionDate(mission.commenceeLe), detail: 'Livreur en déplacement' },
      { status: MissionStatus.ARRIVEE, label: 'Arrivé', time: this.formatMissionDate(mission.commenceeLe), detail: 'Arrivé au point de départ' },
      { status: MissionStatus.EN_LIVRAISON, label: 'En livraison', time: this.formatMissionDate(mission.commenceeLe), detail: 'Livraison en cours' },
      { status: MissionStatus.TERMINEE, label: 'Livraison terminée', time: this.formatMissionDate(mission.termineeLe), detail: 'Mission finalisée' }
    ];
  }

  private buildMapMarkers(mission?: Mission | null): Array<{ lat: number; lng: number; popup?: string; icon?: string }> {
    const currentMission = mission ?? this.mission;
    if (!currentMission) {
      return [];
    }

    const markers: Array<{ lat: number; lng: number; popup?: string; icon?: string }> = [];

    if (currentMission.latitudeRamassage != null && currentMission.longitudeRamassage != null) {
      markers.push({
        lat: currentMission.latitudeRamassage,
        lng: currentMission.longitudeRamassage,
        popup: 'Départ',
        icon: '<div class="default-marker" style="background:#ff6b2c"></div>'
      });
    }

    if (currentMission.latitudeLivraison != null && currentMission.longitudeLivraison != null) {
      markers.push({
        lat: currentMission.latitudeLivraison,
        lng: currentMission.longitudeLivraison,
        popup: 'Destination',
        icon: '<div class="default-marker" style="background:#1a3c6e"></div>'
      });
    }

    if (this.driverLocation) {
      markers.push({
        lat: this.driverLocation.lat,
        lng: this.driverLocation.lng,
        popup: 'Livreur',
        icon: '<div class="default-marker" style="background:#22c55e"></div>'
      });
    }

    return markers;
  }

  private computeEta(mission: Mission): number {
    if (mission.dureeEstimee) {
      return Math.max(1, Math.round(mission.dureeEstimee));
    }

    if (mission.distanceKm) {
      return Math.max(5, Math.round(mission.distanceKm * 2));
    }

    return 12;
  }

  private formatMissionDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  goBack(): void {
    this.router.navigate(['/client/dashboard']);
  }
}
