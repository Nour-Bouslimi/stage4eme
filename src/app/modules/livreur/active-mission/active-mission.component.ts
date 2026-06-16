import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MissionService } from '../../../core/services/mission.service';
import { SocketService } from '../../../core/services/socket.service';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';

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
  locationInterval: any;

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
    private geolocationService: GeolocationService
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';
    this.loadMission();
    this.setupSocket();
    this.startLocationTracking();
  }

  ngOnDestroy(): void {
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
    }
    this.socketService.leaveRoom(this.missionId);
  }

  loadMission(): void {
    this.loading = true;

    this.missionService.getMissionById(this.missionId).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.currentStatus = mission.statut;
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
  }

  startLocationTracking(): void {
    this.locationInterval = setInterval(() => {
      this.geolocationService.getCurrentPosition().then(
        (position) => {
          this.socketService.sendLocation(
            this.missionId,
            position.coords.latitude,
            position.coords.longitude
          );
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
        }
      );
    }, 5000);
  }

  updateStatus(status: string): void {
    this.missionService.updateStatut(this.missionId, status as MissionStatus).subscribe({
      next: () => {
        this.currentStatus = status as MissionStatus;
        this.loadMission();
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
}
