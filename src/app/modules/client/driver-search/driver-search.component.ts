import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MissionService } from '../../../core/services/mission.service';
import { UserService } from '../../../core/services/user.service';
import { DriverRecommendationService } from '../../../core/services/driver-recommendation.service';
import { DriverRecommendation } from '../../../core/models/driver-recommendation.model';
import { User, VehicleType } from '../../../core/models/user.model';
import { Mission, MissionCategory } from '../../../core/models/mission.model';

type DriverSearchMode = 'mission' | 'all';

// Union type pour gérer les deux modes
type DriverItem = (User & { _score?: number; _distanceKm?: number; _scoreDetails?: any }) | any;

type MapMarker = { lat: number; lng: number; popup?: string; icon?: string };

@Component({
  selector: 'app-driver-search',
  templateUrl: './driver-search.component.html',
  styleUrls: ['./driver-search.component.css']
})
export class DriverSearchComponent implements OnInit {
  missionId = '';
  mission: Mission | null = null;
  drivers: DriverItem[] = [];
  filteredDrivers: DriverItem[] = [];
  paginatedDrivers: DriverItem[] = [];
  recommendations: DriverRecommendation[] = []; // ← nouveau
  totalDrivers = 0;
  availableDriversCount = 0;
  loading = true;
  assigning = false; // ← nouveau
  searchQuery = '';
  selectedFilter: 'all' | VehicleType = 'all';
  mode: DriverSearchMode = 'all';
  currentPage = 1;
  pageSize = 4;
  selectedDriver: DriverItem | null = null;
  detailModalOpen = false;

  // Carte ← nouveau
  mapCenter: [number, number] = [36.8065, 10.1815];
  mapZoom = 10;
  mapMarkers: MapMarker[] = [];
  mapPolyline: [number, number][] = [];

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
    private userService: UserService,
    private recommendationService: DriverRecommendationService // ← nouveau
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
        this.buildMissionMarkers(mission); // ← nouveau
        this.loadRecommendedDrivers();     // ← remplace loadAllDrivers()
      },
      error: () => { this.loading = false; }
    });
  }

  // ← nouveau : charge les livreurs recommandés + classés par score
  loadRecommendedDrivers(): void {
    this.loading = true;
    this.recommendationService.recommend(this.missionId).pipe(
      catchError(() => of([] as DriverRecommendation[]))
    ).subscribe({
      next: (recommendations) => {
        this.recommendations = recommendations;
        // Adapter au format attendu par le template existant
        this.drivers = recommendations.map((r) => ({
          id: r.id,
          prenom: r.prenom,
          nom: r.nom,
          photo: r.photo,
          avatar: r.photo,
          email: '',
          telephone: r.telephone,
          noteMoyenne: r.noteMoyenne,
          note: r.noteMoyenne,
          disponible: true,
          estEnLigne: r.estEnLigne,
          typeVehicule: r.typeVehicule,
          vehicule: { type: r.typeVehicule as VehicleType },
          totalMissions: r.totalMissions,
          latitudeActuelle: r.latitudeActuelle,
          longitudeActuelle: r.longitudeActuelle,
          // Champs IA
          _score: r.score,
          _distanceKm: r.distanceKm,
          _rank: r.rank,
          _scoreDetails: r.scoreDetails,
        }));
        this.availableDriversCount = this.drivers.length;
        this.totalDrivers = this.drivers.length;
        this.buildDriverMarkers(recommendations); // ← nouveau
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.drivers = [];
        this.filteredDrivers = [];
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

    forkJoin({ availableDrivers: availableDrivers$, totalDrivers: totalDrivers$ }).subscribe({
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

  // ← nouveau : assigner le livreur sélectionné à la mission
  assignDriver(driver: DriverItem): void {
    if (!this.missionId || this.assigning) return;
    this.assigning = true;
    this.missionService.assignerLivreur(this.missionId, driver.id).subscribe({
      next: () => {
        this.assigning = false;
        this.router.navigate(['/client/tracking', this.missionId]);
      },
      error: () => { this.assigning = false; }
    });
  }

  // ← nouveau : centrer la carte sur le livreur survolé
  highlightDriverOnMap(driver: DriverItem): void {
    if (!driver.latitudeActuelle || !driver.longitudeActuelle) return;
    this.mapCenter = [driver.latitudeActuelle, driver.longitudeActuelle];
    this.mapZoom = 12;
  }

  resetMapView(): void {
    if (this.mission && this.mission.latitudeRamassage != null && this.mission.longitudeRamassage != null) {
      this.mapCenter = [this.mission.latitudeRamassage, this.mission.longitudeRamassage];
    } else {
      this.mapCenter = [36.8065, 10.1815];
    }
    this.mapZoom = 10;
  }

  // ← nouveau
  getScoreColor(score: number): string {
    if (score >= 0.75) return '#10b981';
    if (score >= 0.50) return '#f59e0b';
    return '#ef4444';
  }

  getScorePercent(score: number): number {
    return Math.round(score * 100);
  }

  hasScore(driver: DriverItem): boolean {
    return driver._score !== undefined;
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
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getPaginationLabel(): string {
    if (!this.filteredDrivers.length) return 'Aucun livreur affiché';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredDrivers.length);
    return `Affichage ${start} à ${end} sur ${this.filteredDrivers.length} livreurs`;
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  getMissionNumber(): string {
    return this.mission?.id ? `#${this.mission.id.slice(0, 8).toUpperCase()}` : '';
  }

  getAddressLabel(addressValue: string | null | undefined): string {
    if (!addressValue) return '';
    try {
      const parsed = JSON.parse(addressValue) as { rue?: string; ville?: string };
      const parts = [parsed.rue, parsed.ville].filter((p) => !!p && p.trim().length > 0);
      if (parts.length > 0) return parts.join(', ');
    } catch { /* plain text */ }
    return addressValue;
  }

  getMissionRouteLabel(): string {
    if (!this.mission) return '';
    return `${this.getAddressLabel(this.mission.adresseRamassage) || 'Départ'} · ${this.getAddressLabel(this.mission.adresseLivraison) || 'Destination'}`;
  }

  getMissionSummaryLabel(): string {
    if (!this.mission) return '';
    const distance = this.mission.distanceKm ?? (this.mission as any).distance ?? 0;
    const weight = this.mission.poidsEstime ?? (this.mission as any).poids ?? 0;
    return `${distance ? `${distance} km` : '~8.4 km'} · ${this.getCategoryLabel(this.mission)} · ~${weight || 20} kg`;
  }

  getCategoryLabel(mission: Mission): string {
    if (mission.categorie === MissionCategory.COLIS) return 'Colis Express';
    if (mission.categorie === MissionCategory.MEUBLES) return 'Déménagement meubles';
    if (mission.categorie === MissionCategory.DEMENAGEMENT) return 'Déménagement complet';
    if (mission.categorie === MissionCategory.COURSES) return 'Courses';
    if (mission.categorie === MissionCategory.MATERIAUX) return 'Matériaux';
    return 'Mission personnalisée';
  }

  getVehicleIcon(type: VehicleType): string {
    switch (type) {
      case VehicleType.MOTO: return 'two_wheeler';
      case VehicleType.BICYCLETTE: return 'pedal_bike';
      case VehicleType.SCOOTER: return 'electric_scooter';
      case VehicleType.VOITURE: return 'directions_car';
      case VehicleType.PICKUP:
      case VehicleType.FOURGONNETTE: return 'local_shipping';
      case VehicleType.PETIT_CAMION:
      case VehicleType.GROS_CAMION: return 'airport_shuttle';
      default: return 'local_shipping';
    }
  }

  getVehicleLabel(type: VehicleType): string {
    return this.vehicleTypes.find((v) => v.value === type)?.label || type;
  }

  getDriverDistance(driver: DriverItem): number {
    if (driver._distanceKm !== undefined) return driver._distanceKm;
    return Number(this.hashToRange(driver.id, 0.8, 6.4).toFixed(1));
  }

  getDriverMissions(driver: DriverItem): number {
    return driver.totalMissions ?? Math.round(this.hashToRange(driver.id + 'missions', 45, 380));
  }

  getDriverRate(driver: DriverItem): number {
    const type = driver.vehicule?.type ?? driver.typeVehicule;
    if (type === VehicleType.BICYCLETTE) return 12;
    if (type === VehicleType.MOTO || type === VehicleType.SCOOTER) return 16;
    if (type === VehicleType.VOITURE) return 14;
    return 20;
  }

  getDriverRating(driver: DriverItem): number {
    return Number((driver.noteMoyenne ?? driver.note ?? this.hashToRange(driver.id + 'rating', 4.1, 4.9)).toFixed(1));
  }

  getDriverStatusLabel(driver: DriverItem): string {
    return driver.disponible ? 'Disponible' : 'Indisponible';
  }

  getDriverSubtitle(driver: DriverItem): string {
    return `${this.getDriverVehicleLabel(driver)} · ${this.getDriverDistance(driver)} km`;
  }

  getDriverVehicleLabel(driver: DriverItem): string {
    const vehicleType = driver.vehicule?.type ?? driver.typeVehicule;
    return vehicleType ? this.getVehicleLabel(vehicleType as VehicleType) : 'Livreur';
  }

  getDriverDetails(driver: DriverItem): Array<{ label: string; value: string }> {
    return [
      { label: 'Nom', value: `${driver.prenom || ''} ${driver.nom || ''}`.trim() || 'N/A' },
      { label: 'Email', value: driver.email || 'N/A' },
      { label: 'Téléphone', value: driver.telephone || 'N/A' },
      { label: 'Véhicule', value: this.getDriverVehicleLabel(driver) },
      { label: 'Distance', value: `${this.getDriverDistance(driver)} km` },
      { label: 'Missions', value: `${this.getDriverMissions(driver)} missions` },
      { label: 'Tarif', value: `${this.getDriverRate(driver)} TND/h` },
      { label: 'Note', value: `${this.getDriverRating(driver)}` },
      { label: 'Statut', value: this.getDriverStatusLabel(driver) },
      ...(driver._score !== undefined ? [
        { label: 'Score IA', value: `${this.getScorePercent(driver._score)}%` }
      ] : [])
    ];
  }

  goBack(): void {
    this.router.navigate(['/client/dashboard']);
  }

  // ── Carte ──────────────────────────────────────────────

  private buildMissionMarkers(mission: Mission): void {
    const markers: MapMarker[] = [];

    if (mission.latitudeRamassage && mission.longitudeRamassage) {
      markers.push({
        lat: Number(mission.latitudeRamassage),
        lng: Number(mission.longitudeRamassage),
        popup: 'Point de départ',
        icon: `
          <div style="
            background:#FF6B2C;
            width:36px;height:36px;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="transform:rotate(45deg);font-size:16px;">📍</span>
          </div>
        `
      });
    }

    if (mission.latitudeLivraison && mission.longitudeLivraison) {
      markers.push({
        lat: Number(mission.latitudeLivraison),
        lng: Number(mission.longitudeLivraison),
        popup: 'Destination',
        icon: `
          <div style="
            background:#1A3C6E;
            width:36px;height:36px;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="transform:rotate(45deg);font-size:16px;">🏁</span>
          </div>
        `
      });
    }

    // Construire la polyline entre départ et destination
    if (mission.latitudeRamassage && mission.longitudeRamassage &&
        mission.latitudeLivraison && mission.longitudeLivraison) {
      this.mapPolyline = [
        [Number(mission.latitudeRamassage), Number(mission.longitudeRamassage)],
        [Number(mission.latitudeLivraison), Number(mission.longitudeLivraison)]
      ];
    } else {
      this.mapPolyline = [];
    }

    if (markers.length > 0) {
      this.mapCenter = [markers[0].lat, markers[0].lng];
      this.mapZoom = 10;
    }

    this.mapMarkers = markers;
  }

  private buildDriverMarkers(recommendations: DriverRecommendation[]): void {
    const missionMarkers = this.mapMarkers; // garder départ/destination

    const driverMarkers: MapMarker[] = recommendations
      .filter((r) => r.latitudeActuelle && r.longitudeActuelle)
      .map((r) => {
        const isBestScore = r.rank === 1;
        const borderColor = isBestScore ? '#22C55E' : '#6366F1';
        const size = isBestScore ? 48 : 44;

        // Décalage plus important vers la gauche pour le meilleur score pour éviter le chevauchement
        let lat = r.latitudeActuelle;
        let lng = r.longitudeActuelle;
        if (isBestScore) {
          lng -= 0.2; // Décalage d'environ 20km vers l'ouest
          lat += 0.1; // Décalage vers le nord
        }

        let iconHtml: string;

        if (r.photo) {
          iconHtml = `
            <div style="
              width:${size}px;height:${size}px;
              border-radius:50%;
              border:3px solid ${borderColor};
              box-shadow:0 2px 8px rgba(0,0,0,0.3);
              overflow:hidden;
              background:white;
            ">
              <img src="${r.photo}"
                   style="width:100%;height:100%;object-fit:cover;"
                   onerror="this.parentElement.innerHTML='🚚'"/>
            </div>
          `;
        } else {
          iconHtml = `
            <div style="
              width:${size}px;height:${size}px;
              border-radius:50%;
              border:3px solid ${borderColor};
              box-shadow:0 2px 8px rgba(0,0,0,0.3);
              background:${borderColor};
              display:flex;align-items:center;justify-content:center;
              font-size:20px;
            ">🚚</div>
          `;
        }

        const popupHtml = `
          <div style="
            font-family:Inter,sans-serif;
            min-width:200px;
            padding:12px;
          ">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="
                width:28px;height:28px;
                border-radius:50%;
                background:${isBestScore ? '#22C55E' : '#6366F1'};
                color:white;
                font-weight:700;
                font-size:12px;
                display:flex;align-items:center;justify-content:center;
              ">#${r.rank}</div>
              <div style="font-weight:700;font-size:14px;">
                ${r.prenom} ${r.nom}
              </div>
            </div>
            <div style="font-size:12px;line-height:1.6;color:#333;">
              <div>⭐ Note: ${r.noteMoyenne ?? 'N/A'}</div>
              <div>📍 Distance: ${r.distanceKm} km</div>
              <div>🚗 Véhicule: ${r.typeVehicule}</div>
              <div>📞 Téléphone: ${r.telephone || 'N/A'}</div>
              <div>📦 Missions: ${r.totalMissions ?? 'N/A'}</div>
              <div style="margin-top:6px;padding-top:6px;border-top:1px solid #eee;">
                <strong>Score IA: ${Math.round(r.score * 100)}%</strong>
              </div>
            </div>
          </div>
        `;

        return {
          lat: lat,
          lng: lng,
          popup: popupHtml,
          icon: iconHtml
        };
      });

    this.mapMarkers = [...missionMarkers, ...driverMarkers];
  }

  private applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredDrivers = this.drivers.filter((driver) => {
      const vehicleType = driver.vehicule?.type ?? driver.typeVehicule;
      const matchesFilter = this.selectedFilter === 'all' || vehicleType === this.selectedFilter;
      const fullName = `${driver.prenom} ${driver.nom}`.toLowerCase();
      const matchesQuery = !query || fullName.includes(query) ||
        (vehicleType ? this.getVehicleLabel(vehicleType).toLowerCase().includes(query) : false);
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
    return min + (max - min) * (Math.abs(hash) / 2147483647);
  }
}
