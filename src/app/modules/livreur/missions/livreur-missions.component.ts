import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { MissionService } from '../../../core/services/mission.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';

type MissionTab = 'all' | 'available' | 'accepted' | 'completed';

@Component({
  selector: 'app-livreur-missions',
  templateUrl: './livreur-missions.component.html',
  styleUrls: ['./livreur-missions.component.css']
})
export class LivreurMissionsComponent implements OnInit {
  missions: Mission[] = [];
  filteredMissions: Mission[] = [];
  paginatedMissions: Mission[] = [];
  loading = true;
  loadError: string | null = null;
  actionMissionId: string | null = null;
  selectedTab: MissionTab = 'all';
  searchQuery = '';
  currentPage = 1;
  pageSize = 4;
  currentUserId: string | null = null;
  selectedMission: Mission | null = null;
  detailModalOpen = false;
  confirmModalOpen = false;
  confirmMission: Mission | null = null;
  acceptErrorMessage: string | null = null;
  cancelErrorMessage: string | null = null;
  private missionSnapshot: Mission | null = null;
  protected MissionStatus = MissionStatus;

  constructor(
    private missionService: MissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    this.loadMissions();
  }

  loadMissions(): void {
    this.loading = true;
    this.loadError = null;

    this.missionService.getMissionsForLivreur().subscribe({
      next: (missions) => {
        this.missions = [...missions].sort((a, b) => this.getMissionDateValue(b) - this.getMissionDateValue(a));
        this.applyFilters();
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.missions = [];
        this.filteredMissions = [];
        this.paginatedMissions = [];
        this.loadError = this.getHttpErrorMessage(error);
        this.loading = false;
      }
    });
  }

  selectTab(tab: MissionTab): void {
    this.selectedTab = tab;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  acceptMission(mission: Mission): void {
    this.acceptErrorMessage = null;
    this.confirmMission = mission;
    this.confirmModalOpen = true;
  }

  confirmAcceptMission(): void {
    if (!this.confirmMission) {
      return;
    }

    const mission = this.confirmMission;
    this.missionSnapshot = this.missions.find((item) => item.id === mission.id) ?? null;
    this.actionMissionId = mission.id;

    this.missionService.accepterMission(mission.id).subscribe({
      next: () => {
        this.actionMissionId = null;
        this.confirmMission = null;
        this.missionSnapshot = null;
        this.confirmModalOpen = false;
        this.detailModalOpen = false;
        this.acceptErrorMessage = null;
        this.loadMissions();
      },
      error: (error: HttpErrorResponse) => {
        this.actionMissionId = null;
        this.acceptErrorMessage = this.getHttpErrorMessage(error);
        if (this.missionSnapshot) {
          this.patchMission(this.missionSnapshot.id, {
            statut: this.missionSnapshot.statut,
            livreurId: this.missionSnapshot.livreurId
          });
          this.applyFilters();
        }
        this.missionSnapshot = null;
      }
    });
  }

  cancelAcceptance(mission: Mission): void {
    this.cancelErrorMessage = null;
    this.missionSnapshot = this.missions.find((item) => item.id === mission.id) ?? null;
    this.actionMissionId = mission.id;

    this.missionService.annulerAcceptation(mission.id).subscribe({
      next: () => {
        this.actionMissionId = null;
        this.missionSnapshot = null;
        this.cancelErrorMessage = null;
        this.loadMissions();
      },
      error: (error: HttpErrorResponse) => {
        this.actionMissionId = null;
        this.cancelErrorMessage = this.getHttpErrorMessage(error);
        if (this.missionSnapshot) {
          this.patchMission(this.missionSnapshot.id, {
            statut: this.missionSnapshot.statut,
            livreurId: this.missionSnapshot.livreurId
          });
          this.applyFilters();
        }
        this.missionSnapshot = null;
      }
    });
  }

  viewMission(missionId: string): void {
    const mission = this.missions.find((item) => item.id === missionId) ?? null;
    this.selectedMission = mission;
    this.detailModalOpen = !!mission;
  }

  closeDetailModal(): void {
    this.detailModalOpen = false;
    this.selectedMission = null;
  }

  closeConfirmModal(): void {
    this.confirmModalOpen = false;
    this.confirmMission = null;
    this.acceptErrorMessage = null;
  }

  getStatusLabel(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'Disponible';
      case MissionStatus.ACCEPTEE:
        return 'Acceptée';
      case MissionStatus.EN_ROUTE:
        return 'En route';
      case MissionStatus.ARRIVEE:
        return 'Arrivée';
      case MissionStatus.EN_LIVRAISON:
        return 'En livraison';
      case MissionStatus.LIVREE:
        return 'Livrée';
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
        return 'green';
      case MissionStatus.ACCEPTEE:
        return 'blue';
      case MissionStatus.EN_ROUTE:
        return 'purple';
      case MissionStatus.ARRIVEE:
        return 'indigo';
      case MissionStatus.EN_LIVRAISON:
        return 'orange';
      case MissionStatus.LIVREE:
      case MissionStatus.TERMINEE:
        return 'gray';
      case MissionStatus.ANNULEE:
        return 'red';
      default:
        return 'gray';
    }
  }

  getMissionRouteLabel(mission: Mission): string {
    return `${this.getAddressLabel(mission.adresseRamassage)} · ${this.getAddressLabel(mission.adresseLivraison)}`;
  }

  getMissionMeta(mission: Mission): string {
    const distance = mission.distanceKm ?? mission.distance;
    const weight = mission.poidsEstime ?? mission.poids;
    return `${distance != null ? `${distance} km` : '-- km'} · ${this.getCategoryLabel(mission)} · ~${weight ?? '--'} kg`;
  }

  getCategoryLabel(mission: Mission): string {
    switch (mission.categorie) {
      case 'LIVRAISON_COLIS':
        return 'Colis Express';
      case 'DEMENAGEMENT_MEUBLES':
        return 'Déménagement meubles';
      case 'DEMENAGEMENT_COMPLET':
        return 'Déménagement complet';
      case 'LIVRAISON_COURSES':
        return 'Courses';
      case 'MATERIAUX_CONSTRUCTION':
        return 'Matériaux';
      default:
        return 'Mission personnalisée';
    }
  }

  getAddressLabel(addressValue: string | null | undefined): string {
    if (!addressValue) {
      return '';
    }

    try {
      const parsed = JSON.parse(addressValue) as { rue?: string; ville?: string; codePostal?: string };
      const parts = [parsed.rue, parsed.ville, parsed.codePostal].filter((part) => !!part && String(part).trim().length > 0);

      if (parts.length > 0) {
        return parts.join(', ');
      }
    } catch {
      // Keep plain text values.
    }

    return addressValue;
  }

  getRouteCityLabel(addressValue: string | null | undefined): string {
    if (!addressValue) {
      return 'Adresse non définie';
    }

    try {
      const parsed = JSON.parse(addressValue) as { ville?: string; rue?: string; codePostal?: string };
      return parsed.ville || parsed.rue || parsed.codePostal || 'Adresse non définie';
    } catch {
      return addressValue;
    }
  }

  canAcceptMission(mission: Mission): boolean {
    return mission.statut === MissionStatus.EN_ATTENTE;
  }

  canCancelAcceptance(mission: Mission): boolean {
    const isAcceptedOrActive =
      mission.statut === MissionStatus.ACCEPTEE ||
      mission.statut === MissionStatus.EN_ROUTE ||
      mission.statut === MissionStatus.EN_LIVRAISON;

    return isAcceptedOrActive;
  }

  isAcceptedByCurrentUser(mission: Mission): boolean {
    return !!this.currentUserId && (mission.livreurId === this.currentUserId || mission.livreur?.id === this.currentUserId);
  }

  isActionPending(mission: Mission): boolean {
    return this.actionMissionId === mission.id;
  }

  canShowActionButtons(mission: Mission): boolean {
    return this.canAcceptMission(mission) || this.canCancelAcceptance(mission);
  }

  getTabCount(tab: MissionTab): number {
    if (tab === 'all') {
      return this.missions.length;
    }

    if (tab === 'available') {
      return this.missions.filter((mission) => mission.statut === MissionStatus.EN_ATTENTE).length;
    }

    if (tab === 'accepted') {
      return this.missions.filter(
        (mission) =>
          mission.statut === MissionStatus.ACCEPTEE ||
          mission.statut === MissionStatus.EN_ROUTE ||
          mission.statut === MissionStatus.EN_LIVRAISON
      ).length;
    }

    if (tab === 'completed') {
      return this.missions.filter((mission) => mission.statut === MissionStatus.TERMINEE).length;
    }

    return 0;
  }

  getFilteredCountLabel(): string {
    return `${this.filteredMissions.length} mission${this.filteredMissions.length > 1 ? 's' : ''} trouvée${this.filteredMissions.length > 1 ? 's' : ''}`;
  }

  getPaginationLabel(): string {
    if (this.filteredMissions.length === 0) {
      return 'Aucune mission affichée';
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

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.updatePagination();
  }

  getMissionDateLabel(mission: Mission): string {
    const source = mission.dateDemandee ?? mission.createdAt;
    const date = source ? new Date(source) : null;

    if (!date || Number.isNaN(date.getTime())) {
      return 'Date non définie';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatDistance(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '--';
    }

    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatMoney(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '--';
    }

    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatDateTime(value: Date | string | null | undefined): string {
    if (!value) {
      return '--';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }

    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();

    this.filteredMissions = this.missions.filter((mission) => {
      const matchesTab = this.matchesTab(mission);
      const routeLabel = this.getMissionRouteLabel(mission).toLowerCase();
      const categoryLabel = this.getCategoryLabel(mission).toLowerCase();
      const statusLabel = this.getStatusLabel(mission.statut).toLowerCase();
      const missionId = mission.id?.toLowerCase() ?? '';
      const clientLabel = mission.client ? `${mission.client.prenom} ${mission.client.nom}`.toLowerCase() : '';
      const description = `${mission.description ?? ''} ${mission.instructionsSpeciales ?? ''}`.toLowerCase();
      const matchesQuery =
        !query ||
        missionId.includes(query) ||
        routeLabel.includes(query) ||
        categoryLabel.includes(query) ||
        statusLabel.includes(query) ||
        clientLabel.includes(query) ||
        description.includes(query) ||
        this.getAddressLabel(mission.adresseRamassage).toLowerCase().includes(query) ||
        this.getAddressLabel(mission.adresseLivraison).toLowerCase().includes(query);

      return matchesTab && matchesQuery;
    });

    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.updatePagination();
  }

  private matchesTab(mission: Mission): boolean {
    if (this.selectedTab === 'all') {
      return true;
    }

    if (this.selectedTab === 'available') {
      return mission.statut === MissionStatus.EN_ATTENTE;
    }

    if (this.selectedTab === 'accepted') {
      return (
        mission.statut === MissionStatus.ACCEPTEE ||
        mission.statut === MissionStatus.EN_ROUTE ||
        mission.statut === MissionStatus.EN_LIVRAISON
      );
    }

    if (this.selectedTab === 'completed') {
      return mission.statut === MissionStatus.TERMINEE;
    }

    return true;
  }

  private patchMission(missionId: string, patch: Partial<Mission>): void {
    this.missions = this.missions.map((mission) =>
      mission.id === missionId ? { ...mission, ...patch } : mission
    );
  }

  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedMissions = this.filteredMissions.slice(start, start + this.pageSize);
  }

  private getMissionDateValue(mission: Mission): number {
    const source = mission.dateDemandee ?? mission.createdAt;
    const date = source ? new Date(source) : new Date(0);
    const value = date.getTime();
    return Number.isNaN(value) ? 0 : value;
  }

  private getHttpErrorMessage(error: HttpErrorResponse): string {
    const messageFromBody =
      typeof error.error === 'string'
        ? error.error
        : error.error?.message || error.error?.error || error.message;

    return messageFromBody || 'La mise à jour de la mission a échoué.';
  }
}
