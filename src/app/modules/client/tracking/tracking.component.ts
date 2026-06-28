import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MissionService } from '../../../core/services/mission.service';
import { SocketService } from '../../../core/services/socket.service';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';
import { VehicleType } from '../../../core/models/user.model';

type TrackingMarker = {
  lat: number;
  lng: number;
  popup?: string;
  icon?: string;
  kind?: 'departure' | 'destination' | 'driver';
};

type LocationUpdate = {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  missionId?: string;
  timestamp?: string;
};

type StatusChange = {
  missionId?: string;
  statut?: string;
  timestamp?: string;
};

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
  driverMarker: { lat: number; lng: number; popup?: string; icon?: string } | null = null;
  routePolyline: [number, number][] = [];
  eta = 0;
  mapCenter: [number, number] = [34.0, 9.0];
  mapZoom = 7;
  mapMarkers: TrackingMarker[] = [];
  timelineSteps: Array<{ status: MissionStatus; label: string; time: string; detail: string }> = [];
  protected MissionStatus = MissionStatus;

  get shouldFitToMarkers(): boolean {
    return !this.driverLocation || this.mission?.statut !== MissionStatus.EN_LIVRAISON;
  }

  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private socketService: SocketService,
    private geolocationService: GeolocationService
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';
    this.loadMission();
    this.setupSocket();
    this.startMissionRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.missionId) {
      this.socketService.leaveRoom(this.missionId);
    }

    this.socketService.disconnect();
  }

  loadMission(): void {
    if (!this.missionId) {
      this.loading = false;
      return;
    }

    this.loading = true;

    this.missionService.getMissionById(this.missionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (mission) => {
        this.applyMission(mission);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  setupSocket(): void {
    if (!this.missionId) {
      return;
    }

    this.socketService.connect();
    this.socketService.joinRoom(this.missionId);

    this.socketService
      .onLocationUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((location: LocationUpdate) => {
        const receivedMissionId = location?.missionId;
        if (receivedMissionId && receivedMissionId !== this.missionId) {
          return;
        }

        const lat = this.toNumber(location.lat ?? location.latitude);
        const lng = this.toNumber(location.lng ?? location.longitude);

        if (lat == null || lng == null) {
          return;
        }

        this.driverLocation = { lat, lng };
        this.driverMarker = {
          lat,
          lng,
          popup: 'Livreur',
          icon: '<div class="tracking-pin tracking-pin--driver"><span>🚚</span></div>'
        };
        this.mapCenter = [lat, lng];

        if (this.mission?.statut === MissionStatus.EN_LIVRAISON) {
          this.mapZoom = Math.max(11, this.mapZoom);
        }

        if (this.mission) {
          this.refreshDriverRoute(this.mission);
          this.mapMarkers = this.buildMapMarkers(this.mission);
          this.updateRouteMetrics();
        }
      });

    this.socketService
      .onStatusChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe((statusChange: StatusChange) => {
        if (statusChange?.missionId && statusChange.missionId !== this.missionId) {
          return;
        }

        this.loadMissionSilently();
      });

    this.socketService
      .onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification: any) => {
        if (notification?.missionId && notification.missionId !== this.missionId) {
          return;
        }

        this.loadMissionSilently();
      });
  }

  loadRoute(mission: Mission): void {
    const departure = this.getDeparturePoint(mission);
    const destination = this.getDestinationPoint(mission);

    if (!departure || !destination) {
      this.routePolyline = [];
      this.eta = this.computeEta(mission);
      return;
    }

    this.geolocationService.getRoute(departure, destination).pipe(takeUntil(this.destroy$)).subscribe({
      next: (route) => {
        this.routePolyline = route.polyline;
        this.eta = Math.max(1, Math.round(route.durationMinutes));
        this.updateRouteMetrics();
      },
      error: () => {
        this.routePolyline = [
          [departure.lat, departure.lng],
          [destination.lat, destination.lng]
        ];
        this.eta = this.computeEta(mission);
        this.updateRouteMetrics();
      }
    });
  }

  contactDriver(): void {
    if (!this.mission?.livreur?.id) {
      return;
    }

    this.router.navigate(['/client/chat', this.missionId], {
      queryParams: { driverId: this.mission.livreur.id }
    });
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

  isCurrentStep(stepStatus: MissionStatus): boolean {
    return !!this.mission && this.mission.statut === stepStatus;
  }

  getMissionTitle(): string {
    if (!this.mission) {
      return '';
    }

    return this.getCategoryLabel(this.mission.categorie);
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
      case MissionStatus.ACCEPTEE:
        return 'Le livreur a accepté votre mission';
      default:
        return 'Suivi en temps réel';
    }
  }

  getJourneyLabel(): string {
    if (!this.mission) {
      return '';
    }

    return `${this.getAddressShortLabel(this.mission.depart)} → ${this.getAddressShortLabel(this.mission.destination)}`;
  }

  getAddressLabel(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    try {
      const parsed = JSON.parse(value) as { rue?: string; ville?: string };
      const parts = [parsed.rue, parsed.ville].filter((part) => !!part && part.trim().length > 0);
      return parts.length > 0 ? parts.join(', ') : value;
    } catch {
      return value;
    }
  }

  getWeightLabel(): string {
    if (!this.mission) {
      return '—';
    }

    const weight = this.mission.poidsEstime ?? this.mission.poids;
    return weight ? `${weight} kg` : '—';
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

  getDriverPhoto(): string {
    return this.mission?.livreur?.photo?.trim() || this.mission?.livreur?.avatar?.trim() || '';
  }

  getDriverInitials(): string {
    const first = this.mission?.livreur?.prenom?.trim().charAt(0) || '';
    const last = this.mission?.livreur?.nom?.trim().charAt(0) || '';
    return `${first}${last}`.trim() || 'L';
  }

  getDriverRating(): number {
    const driver = this.mission?.livreur;
    if (!driver) {
      return 0;
    }

    return Number(((driver.noteMoyenne ?? driver.note ?? 0)).toFixed(1));
  }

  getDriverSubtitle(): string {
    const vehicleLabel = this.getDriverVehicleLabel();
    const phone = this.mission?.livreur?.telephone?.trim();
    return phone ? `${vehicleLabel} · ${phone}` : vehicleLabel;
  }

  getDriverVehicleLabel(): string {
    const vehicleType = this.mission?.livreur?.vehicule?.type ?? this.mission?.livreur?.typeVehicule;
    if (!vehicleType) {
      return 'Livreur';
    }

    const labels: Record<VehicleType, string> = {
      [VehicleType.BICYCLETTE]: 'Bicyclette',
      [VehicleType.MOTO]: 'Moto',
      [VehicleType.SCOOTER]: 'Scooter',
      [VehicleType.VOITURE]: 'Voiture',
      [VehicleType.PICKUP]: 'Pickup',
      [VehicleType.FOURGONNETTE]: 'Camionnette',
      [VehicleType.PETIT_CAMION]: 'Petit camion',
      [VehicleType.GROS_CAMION]: 'Gros camion'
    };

    return labels[vehicleType] ?? vehicleType;
  }

  isDriverOnline(): boolean {
    return !!this.mission?.livreur?.estEnLigne;
  }

  hasAssignedDriver(): boolean {
    return !!this.mission?.livreur;
  }

  getRemainingDistanceLabel(): string {
    const routeDistance = this.getRouteDistanceKm();
    if (routeDistance != null) {
      return `${routeDistance.toFixed(1)} km`;
    }

    if (this.driverLocation && this.mission) {
      const destination = this.getDestinationPoint(this.mission);
      if (destination) {
        return `${this.haversineDistance(this.driverLocation.lat, this.driverLocation.lng, destination.lat, destination.lng).toFixed(1)} km`;
      }
    }

    if (this.mission?.distanceKm != null) {
      return `${Number(this.mission.distanceKm).toFixed(1)} km`;
    }

    return '—';
  }

  private updateRouteMetrics(): void {
    const routeDistance = this.getRouteDistanceKm();
    if (routeDistance != null) {
      this.eta = Math.max(1, Math.round(routeDistance * 2));
      return;
    }

    if (this.driverLocation && this.mission) {
      const destination = this.getDestinationPoint(this.mission);
      if (destination) {
        const remainingDistance = this.haversineDistance(this.driverLocation.lat, this.driverLocation.lng, destination.lat, destination.lng);
        this.eta = Math.max(1, Math.round(remainingDistance * 2));
      }
    }
  }

  private getRouteDistanceKm(): number | null {
    if (!this.routePolyline || this.routePolyline.length < 2) {
      return null;
    }

    const distance = this.routePolyline.reduce((sum, point, index, points) => {
      if (index === 0) {
        return 0;
      }
      const prev = points[index - 1];
      return sum + this.haversineDistance(prev[0], prev[1], point[0], point[1]);
    }, 0);

    return Number.isFinite(distance) ? distance : null;
  }

  goBack(): void {
    this.router.navigate(['/client/dashboard']);
  }

  private applyMission(mission: Mission): void {
    this.mission = mission;
    this.timelineSteps = this.buildTimelineSteps(mission);
    this.mapMarkers = this.buildMapMarkers(mission);
    this.mapCenter = this.getMapCenter(mission);
    this.mapZoom = this.getMapZoom(mission);

    if (this.driverLocation) {
      this.refreshDriverRoute(mission);
    } else {
      this.loadRoute(mission);
    }
  }

  private buildTimelineSteps(mission?: Mission | null): Array<{ status: MissionStatus; label: string; time: string; detail: string }> {
    if (!mission) {
      return [];
    }

    return [
      { status: MissionStatus.ACCEPTEE, label: 'Mission acceptée', time: this.formatMissionDate(mission.accepteeLe), detail: 'Livreur assigné' },
      { status: MissionStatus.EN_ROUTE, label: 'En route vers vous', time: this.formatMissionDate(mission.commenceeLe), detail: 'Livraison en cours de déplacement' },
      { status: MissionStatus.ARRIVEE, label: 'Arrivé au point de départ', time: this.formatMissionDate(mission.commenceeLe), detail: 'Le livreur est arrivé' },
      { status: MissionStatus.EN_LIVRAISON, label: 'En livraison', time: this.formatMissionDate(mission.commenceeLe), detail: 'Colis en transit' },
      { status: MissionStatus.TERMINEE, label: 'Livraison terminée', time: this.formatMissionDate(mission.termineeLe), detail: 'Mission finalisée' }
    ];
  }

  private buildMapMarkers(mission?: Mission | null): TrackingMarker[] {
    const currentMission = mission ?? this.mission;
    if (!currentMission) {
      return [];
    }

    const markers: TrackingMarker[] = [];
    const departure = this.getDeparturePoint(currentMission);
    const destination = this.getDestinationPoint(currentMission);

    if (departure) {
      markers.push({
        lat: departure.lat,
        lng: departure.lng,
        popup: 'Départ',
        kind: 'departure'
      });
    }

    if (destination) {
      markers.push({
        lat: destination.lat,
        lng: destination.lng,
        popup: 'Destination',
        kind: 'destination'
      });
    }

    if (this.driverLocation) {
      markers.push({
        lat: this.driverLocation.lat,
        lng: this.driverLocation.lng,
        popup: 'Livreur',
        kind: 'driver'
      });
    }

    return markers;
  }

  private refreshDriverRoute(mission: Mission): void {
    const destination = this.getDestinationPoint(mission);

    if (!this.driverLocation || !destination) {
      this.loadRoute(mission);
      return;
    }

    this.geolocationService.getRoute(this.driverLocation, destination).pipe(takeUntil(this.destroy$)).subscribe({
      next: (route) => {
        this.routePolyline = route.polyline;
        this.eta = Math.max(1, Math.round(route.durationMinutes));
        this.updateRouteMetrics();
      },
      error: () => {
        this.routePolyline = [
          [this.driverLocation!.lat, this.driverLocation!.lng],
          [destination.lat, destination.lng]
        ];
        this.eta = this.computeEtaFromPoints(this.driverLocation!, destination);
        this.updateRouteMetrics();
      }
    });
  }

  private computeEtaFromPoints(start: { lat: number; lng: number }, end: { lat: number; lng: number }): number {
    const distance = this.haversineDistance(start.lat, start.lng, end.lat, end.lng);
    return Math.max(1, Math.round(distance * 2));
  }

  private getMapCenter(mission: Mission): [number, number] {
    const points = [this.getDeparturePoint(mission), this.getDestinationPoint(mission), this.driverLocation].filter(Boolean) as Array<{ lat: number; lng: number }>;

    if (points.length === 0) {
      return [34.0, 9.0];
    }

    const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const avgLng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
    return [avgLat, avgLng];
  }

  private getMapZoom(mission: Mission): number {
    return mission.latitudeRamassage != null && mission.longitudeRamassage != null && mission.latitudeLivraison != null && mission.longitudeLivraison != null ? 8 : 7;
  }

  private getDeparturePoint(mission: Mission): { lat: number; lng: number } | null {
    if (mission.latitudeRamassage == null || mission.longitudeRamassage == null) {
      return null;
    }

    return { lat: mission.latitudeRamassage, lng: mission.longitudeRamassage };
  }

  private getDestinationPoint(mission: Mission): { lat: number; lng: number } | null {
    if (mission.latitudeLivraison == null || mission.longitudeLivraison == null) {
      return null;
    }

    return { lat: mission.latitudeLivraison, lng: mission.longitudeLivraison };
  }

  private getAddressShortLabel(address: { rue?: string; ville?: string }): string {
    const parts = [address.rue, address.ville].filter((part) => !!part && String(part).trim().length > 0);
    return parts.length > 0 ? parts.join(', ') : 'Adresse';
  }

  private getCategoryLabel(category: string): string {
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

  private startMissionRefresh(): void {
    this.refreshTimer = setInterval(() => {
      if (!this.missionId) {
        return;
      }

      this.loadMissionSilently();
    }, 15000);
  }

  private loadMissionSilently(): void {
    if (!this.missionId) {
      return;
    }

    this.missionService.getMissionById(this.missionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (mission) => {
        this.applyMission(mission);
      }
    });
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }
}
