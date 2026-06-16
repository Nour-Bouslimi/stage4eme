import { Component, OnInit } from '@angular/core';
import { MissionService } from '../../../core/services/mission.service';
import { Mission, MissionStatus, MissionCategory } from '../../../core/models/mission.model';

@Component({
  selector: 'app-admin-missions',
  templateUrl: './admin-missions.component.html',
  styleUrls: ['./admin-missions.component.css']
})
export class AdminMissionsComponent implements OnInit {
  missions: Mission[] = [];
  filteredMissions: Mission[] = [];
  loading = true;
  searchQuery = '';
  statusFilter: MissionStatus | 'all' = 'all';
  categoryFilter: MissionCategory | 'all' = 'all';

  statuses: { value: MissionStatus; label: string }[] = [
    { value: MissionStatus.EN_ATTENTE, label: 'En attente' },
    { value: MissionStatus.ACCEPTEE, label: 'Acceptée' },
    { value: MissionStatus.EN_ROUTE, label: 'En route' },
    { value: MissionStatus.EN_LIVRAISON, label: 'En livraison' },
    { value: MissionStatus.TERMINEE, label: 'Terminée' },
    { value: MissionStatus.ANNULEE, label: 'Annulée' }
  ];

  categories: { value: MissionCategory; label: string }[] = [
    { value: MissionCategory.COLIS, label: 'Livraison colis' },
    { value: MissionCategory.MEUBLES, label: 'Déménagement meubles' },
    { value: MissionCategory.DEMENAGEMENT, label: 'Déménagement complet' },
    { value: MissionCategory.COURSES, label: 'Livraison courses' },
    { value: MissionCategory.MATERIAUX, label: 'Matériaux construction' },
    { value: MissionCategory.PERSONNALISE, label: 'Personnalisé' }
  ];

  constructor(private missionService: MissionService) {}

  ngOnInit(): void {
    this.loadMissions();
  }

  loadMissions(): void {
    this.loading = true;

    this.missionService.getMissions().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.filteredMissions = missions;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.filterMissions();
  }

  onStatusFilterChange(): void {
    this.filterMissions();
  }

  onCategoryFilterChange(): void {
    this.filterMissions();
  }

  filterMissions(): void {
    let filtered = [...this.missions];

    // Filtre par recherche
    if (this.searchQuery) {
      filtered = filtered.filter(mission =>
        mission.id.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        mission.depart.ville.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        mission.destination.ville.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    // Filtre par statut
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(mission => mission.statut === this.statusFilter);
    }

    // Filtre par catégorie
    if (this.categoryFilter !== 'all') {
      filtered = filtered.filter(mission => mission.categorie === this.categoryFilter);
    }

    this.filteredMissions = filtered;
  }

  viewMission(missionId: string): void {
    console.log('Voir mission:', missionId);
  }

  getStatusLabel(status: MissionStatus): string {
    return this.statuses.find(s => s.value === status)?.label || status;
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

  getCategoryLabel(category: MissionCategory): string {
    return this.categories.find(c => c.value === category)?.label || category;
  }
}
