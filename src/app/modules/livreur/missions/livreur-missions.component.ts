import { Component, OnInit } from '@angular/core';
import { MissionService } from '../../../core/services/mission.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';

@Component({
  selector: 'app-livreur-missions',
  templateUrl: './livreur-missions.component.html',
  styleUrls: ['./livreur-missions.component.css']
})
export class LivreurMissionsComponent implements OnInit {
  missions: Mission[] = [];
  filteredMissions: Mission[] = [];
  loading = true;
  selectedTab: 'all' | 'available' | 'accepted' | 'completed' = 'all';
  protected MissionStatus = MissionStatus;

  constructor(private missionService: MissionService) {}

  ngOnInit(): void {
    this.loadMissions();
  }

  loadMissions(): void {
    this.loading = true;

    this.missionService.getMissions().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.filterMissions();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectTab(tab: 'all' | 'available' | 'accepted' | 'completed'): void {
    this.selectedTab = tab;
    this.filterMissions();
  }

  filterMissions(): void {
    if (this.selectedTab === 'all') {
      this.filteredMissions = this.missions;
    } else if (this.selectedTab === 'available') {
      this.filteredMissions = this.missions.filter(m => m.statut === MissionStatus.EN_ATTENTE);
    } else if (this.selectedTab === 'accepted') {
      this.filteredMissions = this.missions.filter(m => 
        m.statut === MissionStatus.ACCEPTEE || 
        m.statut === MissionStatus.EN_ROUTE ||
        m.statut === MissionStatus.EN_LIVRAISON
      );
    } else if (this.selectedTab === 'completed') {
      this.filteredMissions = this.missions.filter(m => m.statut === MissionStatus.TERMINEE);
    }
  }

  acceptMission(missionId: string): void {
    this.missionService.accepterMission(missionId).subscribe({
      next: () => {
        this.loadMissions();
      }
    });
  }

  viewMission(missionId: string): void {
    console.log('Voir mission:', missionId);
  }

  getStatusLabel(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'Disponible';
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

  getStatusColor(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'green';
      case MissionStatus.ACCEPTEE:
        return 'blue';
      case MissionStatus.EN_ROUTE:
        return 'purple';
      case MissionStatus.EN_LIVRAISON:
        return 'orange';
      case MissionStatus.TERMINEE:
        return 'gray';
      default:
        return 'gray';
    }
  }
}
