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
  loading = true;
  actionMissionId: string | null = null;
  selectedTab: MissionTab = 'all';
  searchQuery = '';
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

    this.missionService.getMissionsForLivreur().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectTab(tab: MissionTab): void {
    this.selectedTab = tab;
    this.applyFilters();
  }

  onSearchChange(): void {
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
    return `${distance != null ? `${distance} km` : '~-- km'} · ${this.getCategoryLabel(mission)} · ~${weight ?? '--'} kg`;
  }

  getCategoryLabel(mission: Mission): string {
    switch (mission.categorie) {
      case 'LIVRAISON_COLIS':
        return 'Colis Express';
      case 'DEMENAGEMENT_MEUBLES':
        return 'Demenagement meubles';
      case 'DEMENAGEMENT_COMPLET':
        return 'Demenagement complet';
      case 'LIVRAISON_COURSES':
        return 'Courses';
      case 'MATERIAUX_CONSTRUCTION':
        return 'Materiaux';
      default:
        return 'Mission personnalisee';
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

  private patchMission(missionId: string, patch: Partial<Mission>): void {
    this.missions = this.missions.map((mission) =>
      mission.id === missionId ? { ...mission, ...patch } : mission
    );
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
      const matchesQuery =
        !query ||
        routeLabel.includes(query) ||
        categoryLabel.includes(query) ||
        (mission.client ? `${mission.client.prenom} ${mission.client.nom}`.toLowerCase().includes(query) : false);

      return matchesTab && matchesQuery;
    });
  }

  private matchesTab(mission: Mission): boolean {
    if (this.selectedTab === 'all') {
      return mission.statut !== MissionStatus.TERMINEE && mission.statut !== MissionStatus.ANNULEE;
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

  private getHttpErrorMessage(error: HttpErrorResponse): string {
    const messageFromBody =
      typeof error.error === 'string'
        ? error.error
        : error.error?.message || error.error?.error || error.message;

    return messageFromBody || 'La mise à jour de la mission a échoué.';
  }
}
