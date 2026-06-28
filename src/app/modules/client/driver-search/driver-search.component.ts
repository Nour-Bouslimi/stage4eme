import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MissionService } from '../../../core/services/mission.service';
import { UserService } from '../../../core/services/user.service';
import { User, VehicleType } from '../../../core/models/user.model';
import { Mission, MissionCategory } from '../../../core/models/mission.model';

type DriverSearchMode = 'mission' | 'all';

@Component({
  selector: 'app-driver-search',
  templateUrl: './driver-search.component.html',
  styleUrls: ['./driver-search.component.css']
})
export class DriverSearchComponent implements OnInit {
  missionId = '';
  mission: Mission | null = null;
  drivers: User[] = [];
  filteredDrivers: User[] = [];
  paginatedDrivers: User[] = [];
  totalDrivers = 0;
  availableDriversCount = 0;
  loading = true;
  searchQuery = '';
  selectedFilter: 'all' | VehicleType = 'all';
  mode: DriverSearchMode = 'all';
  currentPage = 1;
  pageSize = 4;
  selectedDriver: User | null = null;
  detailModalOpen = false;

  vehicleTypes: { value: VehicleType; label: string }[] = [
    { value: VehicleType.BICYCLETTE, label: 'Bicyclette' },
    { value: VehicleType.MOTO, label: 'Moto' },
    { value: VehicleType.SCOOTER, label: 'Scooter' },
    { value: VehicleType.VOITURE, label: 'Voiture' },
    { value: VehicleType.PICKUP, label: 'Pickup' },
    { value: VehicleType.FOURGONNETTE, label: 'Camionnette' },
    { value: VehicleType.PETIT_CAMION, label: 'Petit camion' },
    { value: VehicleType.GROS_CAMION, label: 'Gros camion' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';
    this.mode = this.missionId ? 'mission' : 'all';

    if (this.mode === 'mission') {
      this.loadMissionData();
      return;
    }

    this.loadAllDrivers();
  }

  loadMissionData(): void {
    this.loading = true;

    this.missionService.getMissionById(this.missionId).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.loadAllDrivers();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadAllDrivers(): void {
    this.loading = true;

    const availableDrivers$ = this.userService.getLivreursDisponibles().pipe(
      catchError(() => of([] as User[]))
    );

    const totalDrivers$ = this.userService.getLivreurs().pipe(
      catchError(() => of([] as User[]))
    );

    forkJoin({
      availableDrivers: availableDrivers$,
      totalDrivers: totalDrivers$
    }).subscribe({
      next: ({ availableDrivers, totalDrivers }) => {
        this.drivers = availableDrivers;
        this.availableDriversCount = availableDrivers.length;
        this.totalDrivers = totalDrivers.length || availableDrivers.length;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.drivers = [];
        this.filteredDrivers = [];
        this.availableDriversCount = 0;
        this.totalDrivers = 0;
        this.loading = false;
      }
    });
  }

  filterDrivers(filter: 'all' | VehicleType): void {
    this.selectedFilter = filter;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  contactDriver(driverId: string): void {
    if (this.mode === 'mission' && this.missionId) {
      this.router.navigate(['/client/chat', this.missionId], {
        queryParams: { driverId }
      });
      return;
    }

    console.log('Contacter livreur:', driverId);
  }

  viewDriverProfile(driverId: string): void {
    this.selectedDriver = this.drivers.find((driver) => driver.id === driverId) ?? null;
    this.detailModalOpen = !!this.selectedDriver;
  }

  closeDriverDetail(): void {
    this.detailModalOpen = false;
    this.selectedDriver = null;
  }

  modifyMission(): void {
    this.router.navigate(['/client/create-mission'], {
      queryParams: { missionId: this.missionId }
    });
  }

  getPageTitle(): string {
    return this.mode === 'mission' ? 'Recherche de livreurs' : 'Livreurs disponibles';
  }

  getAvailabilitySummary(): string {
    return `${this.availableDriversCount} disponibles sur ${this.totalDrivers} livreurs`;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDrivers.length / this.pageSize));
  }

  get visiblePages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  getPaginationLabel(): string {
    if (this.filteredDrivers.length === 0) {
      return 'Aucun livreur affiché';
    }

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredDrivers.length);
    return `Affichage ${start} à ${end} sur ${this.filteredDrivers.length} livreurs`;
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.updatePagination();
  }

  getMissionNumber(): string {
    return this.mission?.id ? `#${this.mission.id.slice(0, 8).toUpperCase()}` : '';
  }

  getAddressLabel(addressValue: string | null | undefined): string {
    if (!addressValue) {
      return '';
    }

    try {
      const parsed = JSON.parse(addressValue) as { rue?: string; ville?: string };
      const parts = [parsed.rue, parsed.ville].filter((part) => !!part && part.trim().length > 0);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    } catch {
      // Keep plain text values as-is.
    }

    return addressValue;
  }

  getMissionRouteLabel(): string {
    if (!this.mission) {
      return '';
    }

    const depart = this.getAddressLabel(this.mission.adresseRamassage) || 'Départ';
    const destination = this.getAddressLabel(this.mission.adresseLivraison) || 'Destination';
    return `${depart} · ${destination}`;
  }

  getMissionSummaryLabel(): string {
    if (!this.mission) {
      return '';
    }

    const distance = this.mission.distanceKm ?? this.mission.distance ?? 0;
    const weight = this.mission.poidsEstime ?? this.mission.poids ?? 0;
    return `${distance ? `${distance} km` : '~8.4 km'} · ${this.getCategoryLabel(this.mission)} · ~${weight || 20} kg`;
  }

  getCategoryLabel(mission: Mission): string {
    const label = mission.categorie;
    if (label === MissionCategory.COLIS) {
      return 'Colis Express';
    }
    if (label === MissionCategory.MEUBLES) {
      return 'Déménagement meubles';
    }
    if (label === MissionCategory.DEMENAGEMENT) {
      return 'Déménagement complet';
    }
    if (label === MissionCategory.COURSES) {
      return 'Courses';
    }
    if (label === MissionCategory.MATERIAUX) {
      return 'Matériaux';
    }
    return 'Mission personnalisée';
  }

  getMapCenter(): [number, number] {
    if (this.mission?.latitudeRamassage != null && this.mission?.longitudeRamassage != null) {
      return [this.mission.latitudeRamassage, this.mission.longitudeRamassage];
    }

    return [48.8566, 2.3522];
  }

  getMapMarkers(): Array<{ lat: number; lng: number; popup?: string; icon?: string }> {
    if (!this.mission) {
      return [];
    }

    const markers: Array<{ lat: number; lng: number; popup?: string; icon?: string }> = [];

    if (this.mission.latitudeRamassage != null && this.mission.longitudeRamassage != null) {
      markers.push({
        lat: this.mission.latitudeRamassage,
        lng: this.mission.longitudeRamassage,
        popup: 'Départ',
        icon: '<div class="default-marker" style="background:#ff6b2c"></div>'
      });
    }

    if (this.mission.latitudeLivraison != null && this.mission.longitudeLivraison != null) {
      markers.push({
        lat: this.mission.latitudeLivraison,
        lng: this.mission.longitudeLivraison,
        popup: 'Destination',
        icon: '<div class="default-marker" style="background:#1a3c6e"></div>'
      });
    }

    return markers;
  }

  getVehicleIcon(type: VehicleType): string {
    switch (type) {
      case VehicleType.MOTO:
        return 'two_wheeler';
      case VehicleType.BICYCLETTE:
        return 'pedal_bike';
      case VehicleType.SCOOTER:
        return 'electric_scooter';
      case VehicleType.VOITURE:
        return 'directions_car';
      case VehicleType.PICKUP:
      case VehicleType.FOURGONNETTE:
        return 'local_shipping';
      case VehicleType.PETIT_CAMION:
      case VehicleType.GROS_CAMION:
        return 'airport_shuttle';
      default:
        return 'local_shipping';
    }
  }

  getVehicleLabel(type: VehicleType): string {
    return this.vehicleTypes.find((v) => v.value === type)?.label || type;
  }

  getDriverDistance(driver: User): number {
    const distance = this.hashToRange(driver.id, 0.8, 6.4);
    return Number(distance.toFixed(1));
  }

  getDriverTime(driver: User): number {
    return Math.round(this.hashToRange(driver.id + 'eta', 6, 24));
  }

  getDriverMissions(driver: User): number {
    return Math.round(this.hashToRange(driver.id + 'missions', 45, 380));
  }

  getDriverRate(driver: User): number {
    const base =
      driver.vehicule?.type === VehicleType.BICYCLETTE ? 12 :
      driver.vehicule?.type === VehicleType.MOTO ? 18 :
      driver.vehicule?.type === VehicleType.SCOOTER ? 16 :
      driver.vehicule?.type === VehicleType.VOITURE ? 14 : 20;
    return base;
  }

  getDriverRating(driver: User): number {
    return Number((driver.noteMoyenne ?? driver.note ?? this.hashToRange(driver.id + 'rating', 4.1, 4.9)).toFixed(1));
  }

  getDriverStatusLabel(driver: User): string {
    return driver.disponible ? 'Disponible' : 'Indisponible';
  }

  getDriverSubtitle(driver: User): string {
    const vehicleLabel = this.getDriverVehicleLabel(driver);
    return `${vehicleLabel} · ${this.getDriverDistance(driver)} km`;
  }

  getDriverVehicleLabel(driver: User): string {
    const vehicleType = driver.vehicule?.type ?? driver.typeVehicule;
    return vehicleType ? this.getVehicleLabel(vehicleType as VehicleType) : 'Livreur';
  }

  getDriverDetails(driver: User): Array<{ label: string; value: string }> {
    return [
      { label: 'Nom', value: `${driver.prenom || ''} ${driver.nom || ''}`.trim() || 'N/A' },
      { label: 'Email', value: driver.email || 'N/A' },
      { label: 'Téléphone', value: driver.telephone || 'N/A' },
      { label: 'Véhicule', value: driver.vehicule?.type ? this.getVehicleLabel(driver.vehicule.type) : 'N/A' },
      { label: 'Distance', value: `${this.getDriverDistance(driver)} km` },
      { label: 'Missions', value: `${this.getDriverMissions(driver)} missions` },
      { label: 'Tarif', value: `${this.getDriverRate(driver)} €/h` },
      { label: 'Note', value: `${this.getDriverRating(driver)}` },
      { label: 'Statut', value: this.getDriverStatusLabel(driver) }
    ];
  }

  goBack(): void {
    this.router.navigate(['/client/dashboard']);
  }

  private applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();

    this.filteredDrivers = this.drivers.filter((driver) => {
      const matchesFilter = this.selectedFilter === 'all' || driver.vehicule?.type === this.selectedFilter;
      const fullName = `${driver.prenom} ${driver.nom}`.toLowerCase();
      const matchesQuery =
        !query ||
        fullName.includes(query) ||
        (driver.vehicule?.type ? this.getVehicleLabel(driver.vehicule.type).toLowerCase().includes(query) : false);

      return matchesFilter && matchesQuery;
    });

    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.updatePagination();
  }

  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedDrivers = this.filteredDrivers.slice(start, start + this.pageSize);
  }

  private hashToRange(seed: string, min: number, max: number): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    const normalized = Math.abs(hash) / 2147483647;
    return min + (max - min) * normalized;
  }
}
