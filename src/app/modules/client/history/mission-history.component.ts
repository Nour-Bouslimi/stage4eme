import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MissionService } from '../../../core/services/mission.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Mission, MissionCategory, MissionStatus } from '../../../core/models/mission.model';

interface MissionEditForm {
  adresseRamassage: string;
  adresseLivraison: string;
  categorie: MissionCategory;
  poidsEstime: number | null;
  volumeEstime: number | null;
  typeVehiculeRequis: string;
  dateDemandee: string;
  heureDemandee: string;
  description: string;
  instructionsSpeciales: string;
}

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
  protected MissionCategory = MissionCategory;
  categoryOptions = [
    { value: MissionCategory.COLIS, label: 'Colis' },
    { value: MissionCategory.MEUBLES, label: 'Meubles' },
    { value: MissionCategory.DEMENAGEMENT, label: 'Déménagement' },
    { value: MissionCategory.COURSES, label: 'Courses' },
    { value: MissionCategory.MATERIAUX, label: 'Matériaux' },
    { value: MissionCategory.PERSONNALISE, label: 'Personnalisée' }
  ];
  vehicleOptions = [
    'Bicyclette',
    'Moto',
    'Scooter',
    'Voiture',
    'Pickup',
    'Camionnette',
    'Petit camion',
    'Gros camion'
  ];
  isEditModalOpen = false;
  editingMission: Mission | null = null;
  editForm: MissionEditForm = this.getEmptyEditForm();
  savingMission = false;
  actionMission: Mission | null = null;
  actionMode: 'cancel' | 'restore' | null = null;
  submittingAction = false;

  constructor(
    private missionService: MissionService,
    private router: Router,
    private toastService: ToastService
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
        this.toastService.error('Erreur lors du chargement des missions');
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

    if (this.selectedTab === 'active') {
      filtered = filtered.filter((mission) => mission.statut === MissionStatus.EN_ATTENTE);
    } else if (this.selectedTab === 'completed') {
      filtered = filtered.filter((mission) => mission.statut === MissionStatus.TERMINEE);
    } else if (this.selectedTab === 'cancelled') {
      filtered = filtered.filter((mission) => mission.statut === MissionStatus.ANNULEE);
    }

    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((mission) =>
        this.getAddressLabel(mission.adresseRamassage).toLowerCase().includes(query) ||
        this.getAddressLabel(mission.adresseLivraison).toLowerCase().includes(query)
      );
    }

    if (this.dateRange.start) {
      const startDate = new Date(this.dateRange.start);
      filtered = filtered.filter((mission) => this.getMissionDate(mission) >= startDate);
    }

    if (this.dateRange.end) {
      const endDate = new Date(this.dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((mission) => this.getMissionDate(mission) <= endDate);
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

  openEditModal(mission: Mission): void {
    this.editingMission = mission;
    this.editForm = {
      adresseRamassage: mission.adresseRamassage || '',
      adresseLivraison: mission.adresseLivraison || '',
      categorie: mission.categorie,
      poidsEstime: mission.poidsEstime ?? mission.poids ?? null,
      volumeEstime: mission.volumeEstime ?? mission.volume ?? null,
      typeVehiculeRequis: mission.typeVehiculeRequis || '',
      dateDemandee: this.getEditDateValue(mission),
      heureDemandee: this.getEditTimeValue(mission),
      description: mission.description || '',
      instructionsSpeciales: mission.instructionsSpeciales || ''
    };
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingMission = null;
    this.editForm = this.getEmptyEditForm();
    this.savingMission = false;
  }

  saveMissionEdits(): void {
    if (!this.editingMission) {
      return;
    }

    this.savingMission = true;

    const payload = {
      adresseRamassage: this.editForm.adresseRamassage.trim(),
      adresseLivraison: this.editForm.adresseLivraison.trim(),
      categorie: this.editForm.categorie,
      poidsEstime: this.editForm.poidsEstime ?? undefined,
      volumeEstime: this.editForm.volumeEstime ?? undefined,
      typeVehiculeRequis: this.editForm.typeVehiculeRequis,
      dateDemandee: this.editForm.dateDemandee,
      heureDemandee: this.editForm.heureDemandee,
      description: this.editForm.description.trim(),
      instructionsSpeciales: this.editForm.instructionsSpeciales.trim()
    };

    this.missionService.updateMission(this.editingMission.id, payload).subscribe({
      next: () => {
        this.savingMission = false;
        this.closeEditModal();
        this.loadMissions();
        this.toastService.success('Mission mise à jour avec succès');
      },
      error: () => {
        this.savingMission = false;
        this.toastService.error('Erreur lors de la mise à jour de la mission');
      }
    });
  }

  askCancelMission(mission: Mission): void {
    this.actionMission = mission;
    this.actionMode = 'cancel';
  }

  askRestoreMission(mission: Mission): void {
    this.actionMission = mission;
    this.actionMode = 'restore';
  }

  closeActionModal(): void {
    this.actionMission = null;
    this.actionMode = null;
    this.submittingAction = false;
  }

  confirmAction(): void {
    if (!this.actionMission || !this.actionMode) {
      return;
    }

    this.submittingAction = true;
    const mission = this.actionMission;
    const action = this.actionMode;

    const request$ = action === 'cancel'
      ? this.missionService.annulerMission(mission.id)
      : this.missionService.remettreMissionEnCours(mission.id);

    request$.subscribe({
      next: () => {
        this.submittingAction = false;
        this.closeActionModal();
        this.loadMissions();
        this.toastService.success(action === 'cancel'
          ? 'Mission annulée avec succès'
          : 'Mission remise en cours avec succès'
        );
      },
      error: () => {
        this.submittingAction = false;
        this.toastService.error('Impossible de modifier le statut de la mission');
      }
    });
  }

  canModifyMission(mission: Mission): boolean {
    return mission.statut !== MissionStatus.ANNULEE && mission.statut !== MissionStatus.TERMINEE;
  }

  canCancelMission(mission: Mission): boolean {
    return mission.statut !== MissionStatus.ANNULEE && mission.statut !== MissionStatus.TERMINEE;
  }

  canRestoreMission(mission: Mission): boolean {
    return mission.statut === MissionStatus.ANNULEE;
  }

  getActionLabel(mission: Mission): string {
    return mission.statut === MissionStatus.ANNULEE ? 'Remettre en cours' : 'Annuler';
  }

  getActionIcon(mission: Mission): string {
    return mission.statut === MissionStatus.ANNULEE ? 'play_arrow' : 'cancel';
  }

  getActionMode(mission: Mission): 'cancel' | 'restore' {
    return mission.statut === MissionStatus.ANNULEE ? 'restore' : 'cancel';
  }

  getActionConfirmTitle(): string {
    return this.actionMode === 'restore' ? 'Remettre la mission en cours ?' : 'Annuler la mission ?';
  }

  getActionConfirmMessage(): string {
    return this.actionMode === 'restore'
      ? 'La mission sera replacée en statut En cours.'
      : 'La mission sera annulée. Tu pourras ensuite la remettre en cours.';
  }

  getAddressLabel(addressValue: string | null | undefined): string {
    if (!addressValue) {
      return '';
    }

    try {
      const parsed = JSON.parse(addressValue) as { rue?: string; ville?: string; codePostal?: string; pays?: string };
      const parts = [parsed.rue, parsed.ville, parsed.codePostal, parsed.pays].filter((part) => !!part && part.trim().length > 0);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    } catch {
      // Plain text address.
    }

    return addressValue;
  }

  getMissionDate(mission: Mission): Date {
    const source = mission.dateDemandee ?? mission.createdAt;
    const date = source ? new Date(source) : new Date(0);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
  }

  getMissionDateLabel(mission: Mission): string {
    const date = this.getMissionDate(mission);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getCategoryLabel(category: MissionCategory | string): string {
    switch (category) {
      case MissionCategory.COLIS:
        return 'Colis';
      case MissionCategory.MEUBLES:
        return 'Meubles';
      case MissionCategory.DEMENAGEMENT:
        return 'Déménagement';
      case MissionCategory.COURSES:
        return 'Courses';
      case MissionCategory.MATERIAUX:
        return 'Matériaux';
      case MissionCategory.PERSONNALISE:
        return 'Personnalisée';
      default:
        return category;
    }
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

  getStatusLabel(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'En cours';
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

  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedMissions = this.filteredMissions.slice(start, start + this.pageSize);
  }

  private getEmptyEditForm(): MissionEditForm {
    return {
      adresseRamassage: '',
      adresseLivraison: '',
      categorie: MissionCategory.COLIS,
      poidsEstime: null,
      volumeEstime: null,
      typeVehiculeRequis: '',
      dateDemandee: '',
      heureDemandee: '',
      description: '',
      instructionsSpeciales: ''
    };
  }

  private getEditDateValue(mission: Mission): string {
    if (mission.dateDemandee) {
      return typeof mission.dateDemandee === 'string' ? mission.dateDemandee.slice(0, 10) : new Date(mission.dateDemandee).toISOString().slice(0, 10);
    }

    const source = mission.dateLivraison;
    if (!source) {
      return '';
    }

    return typeof source === 'string' ? source.slice(0, 10) : source.toISOString().slice(0, 10);
  }

  private getEditTimeValue(mission: Mission): string {
    if (mission.heureDemandee) {
      return mission.heureDemandee.slice(0, 5);
    }

    const source = mission.dateLivraison;
    if (source instanceof Date && !Number.isNaN(source.getTime())) {
      return source.toISOString().slice(11, 16);
    }

    return '';
  }
}
