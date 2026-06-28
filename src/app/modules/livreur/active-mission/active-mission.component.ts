import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MissionService } from '../../../core/services/mission.service';
import { SocketService } from '../../../core/services/socket.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';
import { AuthService } from '../../../core/services/auth.service';

type MapMarker = {
  lat: number;
  lng: number;
  popup?: string;
  kind?: 'departure' | 'destination' | 'driver';
};

@Component({
  selector: 'app-active-mission',
  templateUrl: './active-mission.component.html',
  styleUrls: ['./active-mission.component.css']
})
export class ActiveMissionComponent implements OnInit, OnDestroy {
  missionId = '';
  mission: Mission | null = null;
  loading = true;
  currentStatus: MissionStatus = MissionStatus.ACCEPTEE;
  locationInterval: ReturnType<typeof setInterval> | null = null;
  private locationWatchId: number | null = null;
  currentLocation: { lat: number; lng: number } | null = null;
  mapCenter: [number, number] = [34.0, 9.0];
  mapZoom = 7;
  mapMarkers: MapMarker[] = [];

  statusSteps = [
    { value: MissionStatus.EN_ROUTE, label: 'En route', icon: 'local_shipping' },
    { value: MissionStatus.ARRIVEE, label: 'Arrivé', icon: 'location_on' },
    { value: MissionStatus.EN_LIVRAISON, label: 'En livraison', icon: 'inventory_2' },
    { value: MissionStatus.TERMINEE, label: 'Terminé', icon: 'check_circle' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private socketService: SocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';
    this.loadMission();
    this.setupSocket();
    this.startLocationTracking();
  }

  ngOnDestroy(): void {
    this.stopLocationTracking();

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

    this.missionService.getMissionById(this.missionId).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.currentStatus = mission.statut;
        this.mapMarkers = this.buildMapMarkers(mission);
        this.mapCenter = this.getMapCenter(mission);
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
  }

  startLocationTracking(): void {
    this.stopLocationTracking();

    const sendCurrentPosition = (position: GeolocationPosition) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      this.currentLocation = { lat: latitude, lng: longitude };

      if (this.mission) {
        this.mapMarkers = this.buildMapMarkers(this.mission);
        this.mapCenter = [latitude, longitude];
      }

      this.socketService.sendLocation({
        userId: this.authService.getUserId() || '',
        missionId: this.missionId,
        latitude,
        longitude
      });
    };

    try {
      if (navigator.geolocation?.watchPosition) {
        this.locationWatchId = navigator.geolocation.watchPosition(
          sendCurrentPosition,
          (error) => {
            console.error('Erreur de géolocalisation:', error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
          }
        );

        return;
      }
    } catch (error) {
      console.error('Impossible de démarrer le suivi GPS:', error);
    }

    this.locationInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendCurrentPosition,
        (error) => {
          console.error('Erreur de géolocalisation:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      );
    }, 5000);
  }

  stopLocationTracking(): void {
    if (this.locationWatchId != null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }

    if (this.locationInterval) {
      clearInterval(this.locationInterval);
      this.locationInterval = null;
    }
  }

  updateMissionStatus(newStatut: string): void {
    if (!this.missionId || !newStatut) {
      return;
    }

    try {
      this.socketService.updateMissionStatus(this.missionId, newStatut);
    } catch (error) {
      console.error('Erreur Socket lors de la mise à jour du statut:', error);
    }

    this.missionService.updateStatut(this.missionId, newStatut as MissionStatus).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.currentStatus = mission.statut;
        this.mapMarkers = this.buildMapMarkers(mission);
        this.mapCenter = this.getMapCenter(mission);
      },
      error: () => {
        console.error('Impossible de mettre à jour le statut de la mission.');
      }
    });
  }

  contactClient(): void {
    this.router.navigate(['/livreur/chat', this.missionId]);
  }

  callClient(): void {
    console.log('Appeler le client');
  }

  getStatusLabel(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ROUTE:
        return 'En route';
      case MissionStatus.ARRIVEE:
        return 'Arrivé';
      case MissionStatus.EN_LIVRAISON:
        return 'En livraison';
      case MissionStatus.TERMINEE:
        return 'Terminé';
      default:
        return status;
    }
  }

  isStatusCompleted(status: string): boolean {
    const order = ['EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVEE', 'EN_LIVRAISON', 'TERMINEE'];
    const currentIndex = order.indexOf(this.mission?.statut as string);
    const stepIndex = order.indexOf(status);
    return stepIndex < currentIndex;
  }

  isStatusLocked(status: MissionStatus): boolean {
    if (!this.mission) {
      return false;
    }

    if (this.mission.statut === MissionStatus.ANNULEE || this.mission.statut === MissionStatus.TERMINEE) {
      return true;
    }

    const order: MissionStatus[] = [
      MissionStatus.EN_ROUTE,
      MissionStatus.ARRIVEE,
      MissionStatus.EN_LIVRAISON,
      MissionStatus.TERMINEE
    ];

    return order.indexOf(status) <= order.indexOf(this.mission.statut);
  }

  getNextStatus(): MissionStatus {
    const order: MissionStatus[] = [
      MissionStatus.ACCEPTEE,
      MissionStatus.EN_ROUTE,
      MissionStatus.ARRIVEE,
      MissionStatus.EN_LIVRAISON,
      MissionStatus.TERMINEE
    ];
    const currentIndex = order.indexOf(this.mission?.statut as MissionStatus);
    return order[currentIndex + 1] || MissionStatus.TERMINEE;
  }

  goBack(): void {
    this.router.navigate(['/livreur/dashboard']);
  }

  getClientName(): string {
    if (!this.mission?.client) {
      return 'Client';
    }

    const firstName = this.mission.client.prenom?.trim() || '';
    const lastName = this.mission.client.nom?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || this.mission.client.email?.trim() || 'Client';
  }

  getClientPhone(): string {
    return this.mission?.client?.telephone?.trim() || 'Numéro non disponible';
  }

  getClientInitials(): string {
    const first = this.mission?.client?.prenom?.trim().charAt(0) || '';
    const last = this.mission?.client?.nom?.trim().charAt(0) || '';
    return `${first}${last}`.trim() || 'C';
  }

  getDepartureLabel(): string {
    if (!this.mission) {
      return 'Départ non renseigné';
    }

    return this.getAddressLabel(this.mission.adresseRamassage) || 'Départ non renseigné';
  }

  getDestinationLabel(): string {
    if (!this.mission) {
      return 'Destination non renseignée';
    }

    return this.getAddressLabel(this.mission.adresseLivraison) || 'Destination non renseignée';
  }

  getRouteSummary(): string {
    if (!this.mission) {
      return '';
    }

    return `${this.getDepartureLabel()} → ${this.getDestinationLabel()}`;
  }

  private buildMapMarkers(mission: Mission): MapMarker[] {
    const markers: MapMarker[] = [];

    if (mission.latitudeRamassage != null && mission.longitudeRamassage != null) {
      markers.push({
        lat: mission.latitudeRamassage,
        lng: mission.longitudeRamassage,
        popup: 'Départ',
        kind: 'departure'
      });
    }

    if (mission.latitudeLivraison != null && mission.longitudeLivraison != null) {
      markers.push({
        lat: mission.latitudeLivraison,
        lng: mission.longitudeLivraison,
        popup: 'Destination',
        kind: 'destination'
      });
    }

    if (this.currentLocation) {
      markers.push({
        lat: this.currentLocation.lat,
        lng: this.currentLocation.lng,
        popup: 'Ma position',
        kind: 'driver'
      });
    }

    return markers;
  }

  private getMapCenter(mission: Mission): [number, number] {
    const points = [
      mission.latitudeRamassage != null && mission.longitudeRamassage != null
        ? { lat: mission.latitudeRamassage, lng: mission.longitudeRamassage }
        : null,
      mission.latitudeLivraison != null && mission.longitudeLivraison != null
        ? { lat: mission.latitudeLivraison, lng: mission.longitudeLivraison }
        : null,
      this.currentLocation
    ].filter(Boolean) as Array<{ lat: number; lng: number }>;

    if (points.length === 0) {
      return [34.0, 9.0];
    }

    const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const avgLng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
    return [avgLat, avgLng];
  }

  private getAddressLabel(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    try {
      const parsed = JSON.parse(value) as { rue?: string; ville?: string; codePostal?: string; pays?: string };
      const parts = [parsed.rue, parsed.ville, parsed.codePostal, parsed.pays]
        .filter((part) => !!part && String(part).trim().length > 0);
      return parts.length > 0 ? parts.join(', ') : value;
    } catch {
      return value;
    }
  }
}
