import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MissionService } from '../../../core/services/mission.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';

@Component({
  selector: 'app-mission-history',
  templateUrl: './mission-history.component.html',
  styleUrls: ['./mission-history.component.css']
})
export class MissionHistoryComponent implements OnInit {
  missions: Mission[] = [];
  filteredMissions: Mission[] = [];
  paginatedMissions: Mission[] = [];
  loading = true;
  selectedTab: 'all' | 'active' | 'completed' | 'cancelled' = 'all';
  searchQuery = '';
  dateRange = { start: '', end: '' };
  currentPage = 1;
  pageSize = 5;
  protected MissionStatus = MissionStatus;

  constructor(
    private missionService: MissionService,
    private router: Router
  ) {}

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

  selectTab(tab: 'all' | 'active' | 'completed' | 'cancelled'): void {
    this.selectedTab = tab;
    this.currentPage = 1;
    this.filterMissions();
  }

  filterMissions(): void {
    let filtered = [...this.missions];

    // Filtrer par onglet
    if (this.selectedTab === 'active') {
      filtered = filtered.filter(m => 
        m.statut === MissionStatus.ACCEPTEE || 
        m.statut === MissionStatus.EN_ROUTE ||
        m.statut === MissionStatus.EN_LIVRAISON
      );
    } else if (this.selectedTab === 'completed') {
      filtered = filtered.filter(m => m.statut === MissionStatus.TERMINEE);
    } else if (this.selectedTab === 'cancelled') {
      filtered = filtered.filter(m => m.statut === MissionStatus.ANNULEE);
    }

    // Filtrer par recherche
    if (this.searchQuery) {
      filtered = filtered.filter(m =>
        m.id.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        m.depart.ville.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        m.destination.ville.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    // Filtrer par date
    if (this.dateRange.start) {
      filtered = filtered.filter(m => new Date(m.createdAt) >= new Date(this.dateRange.start));
    }
    if (this.dateRange.end) {
      filtered = filtered.filter(m => new Date(m.createdAt) <= new Date(this.dateRange.end));
    }

    this.filteredMissions = filtered;
    this.updatePagination();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.filterMissions();
  }

  onDateChange(): void {
    this.currentPage = 1;
    this.filterMissions();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.updatePagination();
  }

  viewMission(missionId: string): void {
    this.router.navigate(['/client/tracking', missionId]);
  }

  contactDriver(missionId: string): void {
    console.log('Contacter livreur pour mission:', missionId);
  }

  rateMission(missionId: string): void {
    this.router.navigate(['/client/rating', missionId]);
  }

  getDriverLabel(mission: Mission): string {
    if (!mission.livreur) {
      return 'Non assigné';
    }

    const firstName = mission.livreur.prenom?.trim() || 'Livreur';
    const lastNameInitial = mission.livreur.nom?.trim() ? `${mission.livreur.nom.trim().charAt(0)}.` : '';
    return `${firstName} ${lastNameInitial}`.trim();
  }

  get totalMissionsLabel(): string {
    return `${this.filteredMissions.length} mission${this.filteredMissions.length > 1 ? 's' : ''} au total`;
  }

  get showingLabel(): string {
    if (!this.filteredMissions.length) {
      return 'Affichage 0 mission';
    }

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredMissions.length);
    return `Affichage ${start} à ${end} sur ${this.filteredMissions.length} missions`;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMissions.length / this.pageSize));
  }

  get visiblePages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedMissions = this.filteredMissions.slice(start, start + this.pageSize);
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
