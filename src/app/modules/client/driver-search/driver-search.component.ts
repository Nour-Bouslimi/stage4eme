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

type MapMarker = {
  lat: number;
  lng: number;
  popup?: string;
  icon?: string;
  kind?: 'departure' | 'destination' | 'driver';
  iconSize?: [number, number];
  iconAnchor?: [number, number];
  popupAnchor?: [number, number];
};

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
  selectedDriverDetails: User | null = null;
  detailModalOpen = false;

  // Carte ← nouveau
  mapCenter: [number, number] = [36.8065, 10.1815];
  mapZoom = 9;
  mapMarkers: MapMarker[] = [];
  mapPolyline: [number, number][] = [];

  vehicleTypes: { value: VehicleType; label: string }[] = [
    { value: VehicleType.BICYCLETTE, label: 'Bicyclette' },
    { value: VehicleType.MOTO, label: 'Moto' },
    { value: VehicleType.SCOOTER, label: 'Scooter' },
    { value: VehicleType.VOITURE, label: 'Voiture' },
    { value: VehicleType.PICKUP, label: 'Pickup' },
    { value: VehicleType.FOURGONNETTE, label: 'Fourgonnette' },
    { value: VehicleType.PETIT_CAMION, label: 'Petit camion' },
    { value: VehicleType.GROS_CAMION, label: 'Gros camion' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private userService: UserService,
    private recommendationService: DriverRecommendationService
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

    const recommendations$ = this.recommendationService.recommend(this.missionId).pipe(
      catchError(() => of([] as DriverRecommendation[]))
    );
    const availableDrivers$ = this.userService.getLivreursDisponibles().pipe(
      catchError(() => of([] as any[]))
    );

    forkJoin({ recommendations: recommendations$, availableDrivers: availableDrivers$ }).subscribe({
      next: ({ recommendations, availableDrivers }) => {
        this.recommendations = recommendations;

        const availableDriversMap = new Map(availableDrivers.map((driver: any) => [driver.id, driver]));

        this.drivers = recommendations.map((r) => {
          const detail = availableDriversMap.get(r.id);
          const vehicleInfo = detail?.vehicule ?? (detail ? {
            type: detail.typeVehicule as VehicleType,
            immatriculation: detail.immatriculationVehicule ?? '',
            photo: detail.photoVehicule,
            poidsMax: detail.poidsMaxKg ?? 0,
            volumeMax: detail.volumeMaxM3 ?? 0,
            rayonService: detail.rayonServiceKm ?? 0
          } : {
            type: r.typeVehicule as VehicleType,
            immatriculation: '',
            poidsMax: 0,
            volumeMax: 0,
            rayonService: 0
          });

          return {
            id: r.id,
            prenom: r.prenom,
            nom: r.nom,
            photo: r.photo,
            avatar: r.photo,
            email: detail?.email ?? '',
            telephone: detail?.telephone ?? r.telephone,
            noteMoyenne: r.noteMoyenne,
            note: r.noteMoyenne,
            disponible: true,
            estEnLigne: r.estEnLigne,
            typeVehicule: r.typeVehicule,
            vehicule: vehicleInfo,
            immatriculationVehicule: detail?.immatriculationVehicule,
            poidsMaxKg: detail?.poidsMaxKg,
            volumeMaxM3: detail?.volumeMaxM3,
            rayonServiceKm: detail?.rayonServiceKm,
            totalMissions: r.totalMissions,
            latitudeActuelle: r.latitudeActuelle,
            longitudeActuelle: r.longitudeActuelle,
            // Champs IA
            _score: r.score,
            _distanceKm: r.distanceKm,
            _rank: r.rank,
            _scoreDetails: r.scoreDetails,
          };
        });

        this.availableDriversCount = this.drivers.length;
        this.totalDrivers = this.drivers.length;
        this.buildDriverMarkers(recommendations);
        this.applyFilters();
        this.selectedDriver = this.filteredDrivers[0] ?? null;
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
        this.selectedDriver = this.filteredDrivers[0] ?? null;
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
    const lat = Number(driver.latitudeActuelle ?? driver.latitude);
    const lng = Number(driver.longitudeActuelle ?? driver.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    this.mapCenter = [lat, lng];
    this.mapZoom = 12;
  }

  resetMapView(): void {
    if (this.mission && this.mission.latitudeRamassage != null && this.mission.longitudeRamassage != null) {
      this.mapCenter = [this.mission.latitudeRamassage, this.mission.longitudeRamassage];
    } else {
      this.mapCenter = [36.8065, 10.1815];
    }
    this.mapZoom = 9;
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
      this.assigning = true;
      this.missionService.assignerLivreur(this.missionId, driverId).subscribe({
        next: () => {
          this.assigning = false;
          this.router.navigate(['/client/chat', this.missionId]);
        },
        error: () => {
          this.assigning = false;
          this.router.navigate(['/client/chat', this.missionId]);
        }
      });
      return;
    }

    if (this.missionId) {
      this.router.navigate(['/client/chat', this.missionId]);
      return;
    }

    this.router.navigate(['/client/chat']);
  }

  viewDriverProfile(driverId: string): void {
    this.selectedDriver = this.drivers.find((driver) => driver.id === driverId) ?? this.selectedDriver;
    this.selectedDriverDetails = this.selectedDriver ? { ...this.selectedDriver } : null;
    this.detailModalOpen = !!this.selectedDriver;
  }

  selectDriver(driver: DriverItem): void {
    this.selectedDriver = driver;
  }

  closeDriverDetail(): void {
    this.detailModalOpen = false;
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
    const distanceValue = driver._distanceKm ?? driver.distanceKm ?? driver.distance;
    const parsed = typeof distanceValue === 'number' ? distanceValue : Number(distanceValue);
    if (!Number.isNaN(parsed)) {
      return Number(parsed.toFixed(1));
    }
    return Number(this.hashToRange(driver.id, 0.8, 6.4).toFixed(1));
  }

  getDriverMissions(driver: DriverItem): number {
    const missions = driver.totalMissions ?? driver.missions ?? 0;
    const parsed = Number(missions);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
    return Math.round(this.hashToRange(driver.id + 'missions', 45, 380));
  }

  getDriverRate(driver: DriverItem): number {
    const type = driver.vehicule?.type ?? driver.typeVehicule;
    if (type === VehicleType.BICYCLETTE) return 12;
    if (type === VehicleType.MOTO || type === VehicleType.SCOOTER) return 16;
    if (type === VehicleType.VOITURE) return 14;
    return 20;
  }

  getDriverRating(driver: DriverItem): number {
    const rawRating = driver.noteMoyenne ?? driver.note ?? driver.noteAverage ?? driver.rating;
    const parsedRating = typeof rawRating === 'number'
      ? rawRating
      : Number(rawRating);
    const rating = Number.isNaN(parsedRating)
      ? this.hashToRange(driver.id + 'rating', 4.1, 4.9)
      : parsedRating;
    return Number(rating.toFixed(1));
  }

  getDriverNotesCount(driver: DriverItem): number {
    const notesSource = driver.totalNotes ?? driver.nombreAvis ?? driver.notesCount ?? driver.ratingCount;
    const parsedNotes = Number(notesSource);
    if (!Number.isNaN(parsedNotes) && parsedNotes >= 0) {
      return parsedNotes;
    }
    return 0;
  }

  getDriverStatusLabel(driver: DriverItem): string {
    return driver.disponible ? 'Disponible' : 'Indisponible';
  }

  getDriverSubtitle(driver: DriverItem): string {
    return `${this.getDriverVehicleLabel(driver)} · ${this.getDriverDistance(driver)} km`;
  }

  getDriverVehicleCapacity(driver: DriverItem): string {
    const maxWeight = driver.vehicule?.poidsMax ?? driver.poidsMaxKg;
    const maxVolume = driver.vehicule?.volumeMax ?? driver.volumeMaxM3;
    const weightLabel = maxWeight ? `${maxWeight} kg` : '';
    const volumeLabel = maxVolume ? `${maxVolume} m³` : '';
    if (!weightLabel && !volumeLabel) {
      return 'N/A';
    }
    return [weightLabel, volumeLabel].filter(Boolean).join(' · ');
  }

  getDriverLastActivity(driver: DriverItem): string {
    const last = driver.derniereActivite ?? driver.derniereMiseAJourPosition;
    if (!last) {
      return 'Aucune donnée';
    }
    const date = typeof last === 'string' ? new Date(last) : last;
    if (Number.isNaN(date.getTime())) {
      return String(last);
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getDriverVehicleLabel(driver: DriverItem): string {
    const vehicleType = driver.vehicule?.type ?? driver.typeVehicule;
    return vehicleType ? this.getVehicleLabel(vehicleType as VehicleType) : 'Livreur';
  }

  getSelectedDriverSource(): DriverItem | null {
    return this.selectedDriverDetails ?? this.selectedDriver;
  }

  getDriverDetails(driver: DriverItem): Array<{ label: string; value: string }> {
    const source = this.selectedDriverDetails ?? driver;
    const vehicleRegistration = source.vehicule?.immatriculation || source.immatriculationVehicule || 'N/A';
    const vehicleCapacity = this.getDriverVehicleCapacity(source);

    return [
      { label: 'Nom', value: `${source.prenom || ''} ${source.nom || ''}`.trim() || 'N/A' },
      { label: 'Email', value: source.email || 'N/A' },
      { label: 'Téléphone', value: source.telephone || 'N/A' },
      { label: 'Véhicule', value: this.getDriverVehicleLabel(source) },
      { label: 'Immatriculation', value: vehicleRegistration },
      { label: 'Capacité', value: vehicleCapacity },
      { label: 'Rayon de service', value: `${source.vehicule?.rayonService ?? source.rayonServiceKm ?? 0} km` },
      { label: 'Missions', value: `${this.getDriverMissions(source)} missions` },
      { label: 'Avis', value: `${this.getDriverNotesCount(source)} notes` },
      { label: 'Note moyenne', value: `${this.getDriverRating(source)}` },
      { label: 'Statut', value: this.getDriverStatusLabel(source) },
      { label: 'Dernière activité', value: this.getDriverLastActivity(source) },
      ...(source._score !== undefined ? [
        { label: 'Score IA', value: `${this.getScorePercent(source._score)}%` }
      ] : [])
    ];
  }

  goBack(): void {
    this.router.navigate(['/client/dashboard']);
  }

  // ── Carte ──────────────────────────────────────────────

   private buildMissionMarkers(mission: Mission): void {
     const markers: MapMarker[] = [];

     const pickupLat = Number(mission.latitudeRamassage);
     const pickupLng = Number(mission.longitudeRamassage);

     const dropoffLat = Number(mission.latitudeLivraison);
     const dropoffLng = Number(mission.longitudeLivraison);

    if (!Number.isNaN(pickupLat) && !Number.isNaN(pickupLng)) {
      markers.push({
        lat: pickupLat,
        lng: pickupLng,
        popup: 'Point de départ',
        kind: 'departure'
      });
    }

    if (!Number.isNaN(dropoffLat) && !Number.isNaN(dropoffLng)) {
      markers.push({
        lat: dropoffLat,
        lng: dropoffLng,
        popup: 'Destination',
        kind: 'destination'
      });
    }

    const routeStartLat = Number(mission.latitudeRamassage);
    const routeStartLng = Number(mission.longitudeRamassage);
    const routeEndLat = Number(mission.latitudeLivraison);
    const routeEndLng = Number(mission.longitudeLivraison);

    if ([routeStartLat, routeStartLng, routeEndLat, routeEndLng].every((value) => !Number.isNaN(value))) {
      this.mapPolyline = [
        [routeStartLat, routeStartLng],
        [routeEndLat, routeEndLng]
      ];
    } else {
      this.mapPolyline = [];
    }

    if (markers.length > 0) {
      this.mapCenter = [markers[0].lat, markers[0].lng];
      this.mapZoom = 9;
    }

    this.mapMarkers = markers;
   }


   private buildDriverMarkers(recommendations: DriverRecommendation[]): void {
     const missionMarkers = this.mapMarkers; // garder départ/destination

     const driverMarkers: MapMarker[] = recommendations
       .map((r) => {
         const lat = Number(r.latitudeActuelle);
         const lng = Number(r.longitudeActuelle);
         return {
           ...r,
           lat,
           lng
         } as DriverRecommendation & { lat: number; lng: number };
       })
       .filter((r) => !Number.isNaN(r.lat) && !Number.isNaN(r.lng))
       .map((r) => {
         const isBestScore = r.rank === 1;
         const borderColor = isBestScore ? '#22C55E' : '#6366F1';
         const size = isBestScore ? 48 : 44;
         const lat = r.lat;
         const lng = r.lng;

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

    if (!this.selectedDriver || !this.filteredDrivers.some((driver) => driver.id === this.selectedDriver?.id)) {
      this.selectedDriver = this.filteredDrivers[0] ?? null;
    }
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
