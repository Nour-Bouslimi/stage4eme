import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MissionService } from '../../../core/services/mission.service';
import { UserService } from '../../../core/services/user.service';
import { SocketService } from '../../../core/services/socket.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-livreur-dashboard',
  templateUrl: './livreur-dashboard.component.html',
  styleUrls: ['./livreur-dashboard.component.css']
})
export class LivreurDashboardComponent implements OnInit {
  userName = '';
  user: User | null = null;
  available = true;
  missions: Mission[] = [];
  activeMission: Mission | null = null;
  stats = {
    today: 0,
    completed: 0,
    total: 0,
    revenue: 0
  };
  loading = true;
  showMissionModal = false;
  newMission: Mission | null = null;
  countdown = 30;
  protected MissionStatus = MissionStatus;

  constructor(
    private authService: AuthService,
    private missionService: MissionService,
    private userService: UserService,
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userName = currentUser.prenom;
    }

    this.loadUserData();
    this.loadMissions();
    this.setupSocket();
  }

  loadUserData(): void {
    const cachedUser = this.authService.getCurrentUser();
    if (cachedUser) {
      this.user = cachedUser;
      this.available = cachedUser.disponible || false;
      this.userName = cachedUser.prenom;
    }
  }

  loadMissions(): void {
    this.missions = [];
    this.activeMission = null;
    this.calculateStats([]);
    this.loading = false;
  }

  setupSocket(): void {
    this.socketService.connect();

    this.socketService.onNouvelleMission().subscribe((mission: Mission) => {
      this.newMission = mission;
      this.showMissionModal = true;
      this.startCountdown();
    });
  }

  toggleAvailability(): void {
    this.available = !this.available;

    this.userService.updateDisponibilite(this.available).subscribe({
      next: () => {
        const status = this.available ? 'disponible' : 'indisponible';
        // this.toastService.success(`Vous êtes maintenant ${status}`);
      }
    });
  }

  acceptMission(): void {
    if (this.newMission) {
      this.missionService.accepterMission(this.newMission.id).subscribe({
        next: () => {
          this.showMissionModal = false;
          this.newMission = null;
          this.loadMissions();
          // this.toastService.success('Mission acceptée');
        }
      });
    }
  }

  rejectMission(): void {
    if (this.newMission) {
      this.missionService.refuserMission(this.newMission.id).subscribe({
        next: () => {
          this.showMissionModal = false;
          this.newMission = null;
          // this.toastService.info('Mission refusée');
        }
      });
    }
  }

  startCountdown(): void {
    this.countdown = 30;
    const interval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(interval);
        this.rejectMission();
      }
    }, 1000);
  }

  calculateStats(missions: Mission[]): void {
    const today = new Date().toDateString();
    this.stats.today = missions.filter(m => 
      new Date(m.createdAt).toDateString() === today
    ).length;
    this.stats.completed = missions.filter(m => 
      m.statut === MissionStatus.TERMINEE
    ).length;
    this.stats.total = missions.length;
    this.stats.revenue = missions
      .filter(m => m.statut === MissionStatus.TERMINEE)
      .reduce((sum, m) => sum + (m.prix || 0), 0);
  }

  goToActiveMission(): void {
    if (this.activeMission) {
      this.router.navigate(['/livreur/active', this.activeMission.id]);
      return;
    }

    this.router.navigate(['/livreur/missions']);
  }

  getActiveMissionStatusLabel(): string {
    return this.getStatusLabel(this.activeMission?.statut ?? MissionStatus.EN_ATTENTE);
  }

  getStatusLabel(status: MissionStatus | undefined): string {
    if (!status) return 'Inconnu';
    switch (status) {
      case MissionStatus.ACCEPTEE:
        return 'Acceptée';
      case MissionStatus.EN_ROUTE:
        return 'En route';
      case MissionStatus.EN_LIVRAISON:
        return 'En livraison';
      case MissionStatus.TERMINEE:
        return 'Terminée';
      default:
        return status;
    }
  }
}
