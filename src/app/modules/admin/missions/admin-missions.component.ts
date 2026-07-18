import { Component, OnInit } from '@angular/core';
import { MissionService } from '../../../core/services/mission.service';
import { Mission, MissionCategory, MissionStatus } from '../../../core/models/mission.model';

type MissionSortOption = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc';

@Component({
  selector: 'app-admin-missions',
  templateUrl: './admin-missions.component.html',
  styleUrls: ['./admin-missions.component.css']
})
export class AdminMissionsComponent implements OnInit {
  missions: Mission[] = [];
  filteredMissions: Mission[] = [];
  paginatedMissions: Mission[] = [];
  loading = true;
  searchQuery = '';
  statusFilter: MissionStatus | 'all' = 'all';
  categoryFilter: MissionCategory | 'all' = 'all';
  sortOption: MissionSortOption = 'date-desc';
  currentPage = 1;
  pageSize = 8;
  selectedMission: Mission | null = null;
  detailModalOpen = false;

  statuses: { value: MissionStatus; label: string }[] = [
    { value: MissionStatus.EN_ATTENTE, label: 'En attente' },
    { value: MissionStatus.ACCEPTEE, label: 'Acceptee' },
    { value: MissionStatus.EN_ROUTE, label: 'En route' },
    { value: MissionStatus.ARRIVEE, label: 'Arrivee' },
    { value: MissionStatus.EN_LIVRAISON, label: 'En livraison' },
    { value: MissionStatus.LIVREE, label: 'Livree' },
    { value: MissionStatus.TERMINEE, label: 'Terminee' },
    { value: MissionStatus.ANNULEE, label: 'Annulee' }
  ];

  categories: { value: MissionCategory; label: string }[] = [
    { value: MissionCategory.COLIS, label: 'Livraison colis' },
    { value: MissionCategory.MEUBLES, label: 'Demenagement meubles' },
    { value: MissionCategory.DEMENAGEMENT, label: 'Demenagement complet' },
    { value: MissionCategory.COURSES, label: 'Livraison courses' },
    { value: MissionCategory.MATERIAUX, label: 'Materiaux construction' },
    { value: MissionCategory.PERSONNALISE, label: 'Personnalise' }
  ];

  constructor(private missionService: MissionService) {}

  ngOnInit(): void {
    this.loadMissions();
  }

  loadMissions(): void {
    this.loading = true;

    this.missionService.getAllMissions().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.missions = [];
        this.filteredMissions = [];
        this.paginatedMissions = [];
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onCategoryFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.updatePagination();
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    let filtered = [...this.missions];

    if (query) {
      filtered = filtered.filter((mission) => {
        const searchableText = [
          this.getRouteLabel(mission),
          this.getCategoryLabel(mission.categorie),
          this.getStatusLabel(mission.statut),
          this.getAddressLabel(mission.adresseRamassage, mission.depart),
          this.getAddressLabel(mission.adresseLivraison, mission.destination),
          mission.client?.prenom,
          mission.client?.nom,
          mission.livreur?.prenom,
          mission.livreur?.nom
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((mission) => mission.statut === this.statusFilter);
    }

    if (this.categoryFilter !== 'all') {
      filtered = filtered.filter((mission) => mission.categorie === this.categoryFilter);
    }

    filtered.sort((a, b) => this.compareMissions(a, b, this.sortOption));

    this.filteredMissions = filtered;
    this.updatePagination();
  }

  viewMission(mission: Mission): void {
    this.selectedMission = mission;
    this.detailModalOpen = true;
  }

  closeDetailModal(): void {
    this.detailModalOpen = false;
    this.selectedMission = null;
  }

  getRouteLabel(mission: Mission): string {
    const pickup = this.getAddressLabel(mission.adresseRamassage, mission.depart);
    const delivery = this.getAddressLabel(mission.adresseLivraison, mission.destination);
    return `${pickup} -> ${delivery}`;
  }

  getAddressLabel(
    addressValue: string | null | undefined,
    fallback?: { rue?: string | null; ville?: string | null; codePostal?: string | null; pays?: string | null } | null
  ): string {
    const parsed = this.parseAddressParts(addressValue);
    if (parsed.length > 0) {
      return parsed.join(', ');
    }

    const fallbackParts = [
      fallback?.rue,
      fallback?.ville,
      fallback?.codePostal,
      fallback?.pays
    ]
      .map((part) => String(part || '').trim())
      .filter((part) => part.length > 0);

    return fallbackParts.length > 0 ? fallbackParts.join(', ') : 'Adresse non renseignee';
  }

  getStatusLabel(status: MissionStatus): string {
    return this.statuses.find((s) => s.value === status)?.label || status;
  }

  getStatusColor(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'amber';
      case MissionStatus.ACCEPTEE:
        return 'blue';
      case MissionStatus.EN_ROUTE:
      case MissionStatus.ARRIVEE:
        return 'purple';
      case MissionStatus.EN_LIVRAISON:
        return 'orange';
      case MissionStatus.LIVREE:
      case MissionStatus.TERMINEE:
        return 'green';
      case MissionStatus.ANNULEE:
        return 'red';
      default:
        return 'gray';
    }
  }

  getCategoryLabel(category: MissionCategory): string {
    return this.categories.find((c) => c.value === category)?.label || category;
  }

  getFormattedWeight(mission: Mission): string {
    const weight = mission.poidsEstime ?? mission.poids;
    return weight !== null && weight !== undefined ? `${weight} kg` : '—';
  }

  getFormattedPrice(mission: Mission): string {
    const price = mission.prix ?? mission.prixEstime;
    return price !== null && price !== undefined ? `${price} TND` : 'N/A';
  }

  getFormattedDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  getMissionDateValue(mission: Mission): number {
    const date = mission.createdAt instanceof Date ? mission.createdAt : new Date(mission.createdAt);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  getClientLabel(mission: Mission): string {
    const name = [mission.client?.prenom, mission.client?.nom].filter(Boolean).join(' ').trim();
    return name || 'Client inconnu';
  }

  getDriverLabel(mission: Mission): string {
    const name = [mission.livreur?.prenom, mission.livreur?.nom].filter(Boolean).join(' ').trim();
    return name || 'Non assigné';
  }

  getFormattedDistance(mission: Mission): string {
    const distance = mission.distanceKm ?? mission.distance;
    return typeof distance === 'number' ? `${distance.toFixed(1)} km` : '—';
  }

  private getShortAddressLabel(
    addressValue: string | null | undefined,
    fallback?: { rue?: string | null; ville?: string | null; codePostal?: string | null; pays?: string | null } | null
  ): string {
    const address = this.getAddressLabel(addressValue, fallback);
    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 2) {
      return address;
    }

    return [parts[0], parts[parts.length - 1]].filter(Boolean).join(', ');
  }

  getPaginationLabel(): string {
    if (this.filteredMissions.length === 0) {
      return '0 mission';
    }

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredMissions.length);
    return `${start}-${end} sur ${this.filteredMissions.length}`;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMissions.length / this.pageSize));
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const windowSize = 2;

    const start = Math.max(1, current - windowSize);
    const end = Math.min(total, current + windowSize);
    const pages: number[] = [];

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  }

  private updatePagination(): void {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedMissions = this.filteredMissions.slice(start, start + this.pageSize);
  }

  private compareMissions(a: Mission, b: Mission, sort: MissionSortOption): number {
    switch (sort) {
      case 'date-asc':
        return this.getMissionDateValue(a) - this.getMissionDateValue(b);
      case 'price-desc':
        return this.getMissionPriceValue(b) - this.getMissionPriceValue(a);
      case 'price-asc':
        return this.getMissionPriceValue(a) - this.getMissionPriceValue(b);
      case 'date-desc':
      default:
        return this.getMissionDateValue(b) - this.getMissionDateValue(a);
    }
  }

  private getMissionPriceValue(mission: Mission): number {
    const price = mission.prix ?? mission.prixEstime;
    return typeof price === 'number' ? price : 0;
  }

  private parseAddressParts(addressValue: string | null | undefined): string[] {
    if (!addressValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(addressValue) as Record<string, unknown>;
      const parts = [
        parsed['rue'],
        parsed['ville'],
        parsed['codePostal'],
        parsed['pays']
      ]
        .map((part) => String(part || '').trim())
        .filter((part) => part.length > 0);

      if (parts.length > 0) {
        return parts;
      }
    } catch {
      // Plain string address returned by the API.
    }

    return [addressValue.trim()].filter((part) => part.length > 0);
  }
}
