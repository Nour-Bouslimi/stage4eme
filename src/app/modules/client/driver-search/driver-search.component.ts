import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MissionService } from '../../../core/services/mission.service';
import { UserService } from '../../../core/services/user.service';
import { User, VehicleType } from '../../../core/models/user.model';
import { Mission, MissionCategory } from '../../../core/models/mission.model';

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
  loading = true;
  searchQuery = '';
  selectedFilter: 'all' | VehicleType = 'all';

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
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    this.missionService.getMissionById(this.missionId).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.loadDrivers();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadDrivers(): void {
    this.missionService.getLivreursCompatibles(this.missionId).subscribe({
      next: (drivers) => {
        this.drivers = drivers;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filterDrivers(filter: 'all' | VehicleType): void {
    this.selectedFilter = filter;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  contactDriver(driverId: string): void {
    this.router.navigate(['/client/chat', this.missionId], {
      queryParams: { driverId }
    });
  }

  viewDriverProfile(driverId: string): void {
    console.log('Voir profil livreur:', driverId);
  }

  modifyMission(): void {
    this.router.navigate(['/client/create-mission'], {
      queryParams: { missionId: this.missionId }
    });
  }

  getMissionNumber(): string {
    return this.mission?.id ? `#${this.mission.id.slice(0, 8).toUpperCase()}` : '';
  }

  getMissionRouteLabel(): string {
    if (!this.mission) {
      return '';
    }

    return `${this.mission.depart.ville || this.mission.depart.rue || 'Départ'} · ${this.mission.destination.ville || this.mission.destination.rue || 'Destination'}`;
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
        return 'local_shipping';
      case VehicleType.FOURGONNETTE:
        return 'local_shipping';
      case VehicleType.PETIT_CAMION:
        return 'airport_shuttle';
      case VehicleType.GROS_CAMION:
        return 'airport_shuttle';
      default:
        return 'local_shipping';
    }
  }

  getVehicleLabel(type: VehicleType): string {
    return this.vehicleTypes.find(v => v.value === type)?.label || type;
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
    const base = driver.vehicule?.type === VehicleType.BICYCLETTE ? 12 : driver.vehicule?.type === VehicleType.MOTO ? 18 : driver.vehicule?.type === VehicleType.SCOOTER ? 16 : driver.vehicule?.type === VehicleType.VOITURE ? 14 : 20;
    return base;
  }

  getDriverRating(driver: User): number {
    return Number((driver.note || this.hashToRange(driver.id + 'rating', 4.1, 4.9)).toFixed(1));
  }

  getDriverStatusLabel(driver: User): string {
    return driver.disponible ? 'Disponible' : 'Indisponible';
  }

  getDriverSubtitle(driver: User): string {
    const vehicleLabel = driver.vehicule?.type ? this.getVehicleLabel(driver.vehicule.type) : 'Livreur';
    return `${vehicleLabel} · ${this.getDriverDistance(driver)} km`;
  }

  goBack(): void {
    this.router.navigate(['/client/dashboard']);
  }

  private applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();

    this.filteredDrivers = this.drivers.filter((driver) => {
      const matchesFilter = this.selectedFilter === 'all' || driver.vehicule?.type === this.selectedFilter;
      const matchesQuery = !query || `${driver.prenom} ${driver.nom}`.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
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
