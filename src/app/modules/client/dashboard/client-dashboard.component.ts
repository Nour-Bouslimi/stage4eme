import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { MissionService } from '../../../core/services/mission.service';
import { UserService } from '../../../core/services/user.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-client-dashboard',
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.css']
})
export class ClientDashboardComponent implements OnInit {
  userName = '';
  currentDate = '';
  missions: Mission[] = [];
  availableDrivers: User[] = [];
  stats = {
    active: 0,
    completed: 0,
    pending: 0,
    total: 0
  };
  loading = true;

  constructor(
    private authService: AuthService,
    private missionService: MissionService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user.prenom;
    }

    this.currentDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    this.missionService.getMissions().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.calculateStats(missions);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

    this.userService.getLivreursDisponibles().subscribe({
      next: (drivers) => {
        this.availableDrivers = drivers.slice(0, 5);
      }
    });
  }

  calculateStats(missions: Mission[]): void {
    this.stats.active = missions.filter(m => 
      m.statut === MissionStatus.ACCEPTEE || 
      m.statut === MissionStatus.EN_ROUTE ||
      m.statut === MissionStatus.EN_LIVRAISON
    ).length;
    this.stats.completed = missions.filter(m => 
      m.statut === MissionStatus.TERMINEE
    ).length;
    this.stats.pending = missions.filter(m => 
      m.statut === MissionStatus.EN_ATTENTE
    ).length;
    this.stats.total = missions.length;
  }

  createMission(type: string): void {
    // Navigation vers create-mission avec le type pré-sélectionné
    console.log('Créer mission:', type);
  }

  viewMission(missionId: string): void {
    console.log('Voir mission:', missionId);
  }

  contactDriver(driverId: string): void {
    console.log('Contacter livreur:', driverId);
  }

  getStatusLabel(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'En attente';
      case MissionStatus.ACCEPTEE:
        return 'Acceptée';
      case MissionStatus.EN_ROUTE:
        return 'En route';
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
}
