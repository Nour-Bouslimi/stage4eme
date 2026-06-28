import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, combineLatest, forkJoin } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { MissionCategory, CreateMissionRequest, MissionEstimateRequest, Mission } from '../../../core/models/mission.model';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { MissionEstimation, MissionEstimationService } from '../../../core/services/mission-estimation.service';
import { MissionService } from '../../../core/services/mission.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

type CategoryOption = {
  value: MissionCategory;
  label: string;
  icon: string;
};

type VehicleOption = {
  value: string;
  label: string;
  icon: string;
};

type PricingRow = {
  label: string;
  value: number | null | undefined;
  emphasize?: boolean;
};

type MapMarker = {
  lat: number;
  lng: number;
  popup?: string;
  icon?: string;
};

@Component({
  selector: 'app-create-mission',
  templateUrl: './create-mission.component.html',
  styleUrls: ['./create-mission.component.css']
})
export class CreateMissionComponent implements OnInit, OnDestroy {
  currentStep = 1;
  createMissionForm!: FormGroup;
  loading = false;
  estimationLoading = false;
  estimationError: string | null = null;
  estimation: MissionEstimation | null = null;
  editingMissionId: string | null = null;
  geocodingLoading = false;
  geocodingError: string | null = null;
  mapCenter: [number, number] = [34.0, 9.0];
  mapZoom = 6;
  mapMarkers: MapMarker[] = [];

  private readonly destroy$ = new Subject<void>();

  categories: CategoryOption[] = [
    { value: MissionCategory.COLIS, label: 'Colis Express', icon: 'inventory_2' },
    { value: MissionCategory.MEUBLES, label: 'Demenagement meubles', icon: 'weekend' },
    { value: MissionCategory.DEMENAGEMENT, label: 'Demenagement complet', icon: 'moving' },
    { value: MissionCategory.COURSES, label: 'Courses', icon: 'shopping_cart' },
    { value: MissionCategory.MATERIAUX, label: 'Materiaux', icon: 'construction' },
    { value: MissionCategory.PERSONNALISE, label: 'Autre', icon: 'add' }
  ];

  vehicleTypes: VehicleOption[] = [
    { value: 'MOTO', label: 'Moto', icon: 'directions_bike' },
    { value: 'VOITURE', label: 'Voiture', icon: 'directions_car' },
    { value: 'FOURGONNETTE', label: 'Camionnette', icon: 'local_shipping' },
    { value: 'PETIT_CAMION', label: 'Petit camion', icon: 'local_shipping' }
  ];

  constructor(
    private fb: FormBuilder,
    private missionService: MissionService,
    private missionEstimationService: MissionEstimationService,
    private geolocationService: GeolocationService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupEstimationWatcher();
    this.setupAddressGeocodingWatcher();

    this.editingMissionId = this.route.snapshot.queryParamMap.get('missionId');
    const initialType = this.route.snapshot.queryParamMap.get('type');

    if (this.editingMissionId) {
      this.loadMissionForEdit(this.editingMissionId);
    }

    if (initialType) {
      this.selectCategory(this.mapQueryCategory(initialType));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    const today = new Date();

    this.createMissionForm = this.fb.group({
      adresseRamassage: ['', [Validators.required, this.nonBlankValidator()]],
      adresseLivraison: ['', [Validators.required, this.nonBlankValidator()]],
      latitudeRamassage: [null],
      longitudeRamassage: [null],
      latitudeLivraison: [null],
      longitudeLivraison: [null],
      categorie: [MissionCategory.COLIS, Validators.required],
      poidsEstime: [30, [Validators.required, Validators.min(1), Validators.max(500)]],
      volumeEstime: [0.5, [Validators.required, Validators.min(0.1), Validators.max(50)]],
      typeVehiculeRequis: ['VOITURE', Validators.required],
      description: ['Carton fragile contenant de la vaisselle. Manipuler avec precaution.'],
      instructionsSpeciales: [''],
      dateDemandee: [this.formatDateInput(today), Validators.required],
      heureDemandee: ['14:00', Validators.required]
    });
  }

  get hasMapMarkers(): boolean {
    return this.mapMarkers.length > 0;
  }

  get selectedCategory(): MissionCategory {
    return this.createMissionForm?.get('categorie')?.value ?? MissionCategory.COLIS;
  }

  get selectedVehicle(): string {
    return this.createMissionForm?.get('typeVehiculeRequis')?.value ?? 'VOITURE';
  }

  get selectedDistanceKm(): number | null {
    return this.estimation?.distanceKm ?? null;
  }

  get selectedDurationMin(): number | null {
    return this.estimation?.dureeEstimee ?? null;
  }

  get selectedPriceTnd(): number | null {
    return this.estimation?.pricing?.total ?? this.estimation?.prixEstime ?? null;
  }

  get priceRows(): PricingRow[] {
    const pricing = this.estimation?.pricing;

    if (!pricing) {
      return [];
    }

    return [
      { label: 'Tarif de base', value: pricing.baseFare },
      { label: 'Cout distance', value: pricing.distanceFare },
      { label: 'Supplement poids', value: pricing.weightFare },
      { label: 'Supplement volume', value: pricing.volumeFare },
      { label: 'Supplement vehicule', value: pricing.vehicleFare },
      { label: 'Frais de service', value: pricing.serviceFee },
      { label: 'Cout temps', value: pricing.timeFare },
      { label: 'Total estime', value: pricing.total ?? this.estimation?.prixEstime, emphasize: true }
    ].filter((row) => row.value != null);
  }

  get breakdownRows(): PricingRow[] {
    return this.priceRows.filter((row) => !row.emphasize);
  }

  get routeDateTimeLabel(): string {
    const dateValue = this.createMissionForm?.get('dateDemandee')?.value;
    const timeValue = this.createMissionForm?.get('heureDemandee')?.value;

    if (!dateValue) {
      return '';
    }

    const dateTime = new Date(`${dateValue}T${timeValue || '00:00'}`);
    return (
      dateTime.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) +
      ` a ${dateTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    );
  }

  get categoryLabel(): string {
    return this.categories.find((category) => category.value === this.selectedCategory)?.label ?? '';
  }

  get vehicleLabel(): string {
    return this.vehicleTypes.find((vehicle) => vehicle.value === this.selectedVehicle)?.label ?? this.selectedVehicle;
  }

  get specialInstructions(): string {
    return this.createMissionForm?.get('instructionsSpeciales')?.value ?? '';
  }

  get estimationHint(): string {
    if (this.estimationLoading) {
      return "Calcul de l'estimation en cours...";
    }

    if (this.estimationError) {
      return this.estimationError;
    }

    if (!this.canEstimate()) {
      return 'Saisissez les deux adresses pour afficher la distance, la duree et le prix.';
    }

    if (!this.estimation) {
      return "L'estimation apparaitra des que le backend repondra.";
    }

    return 'Estimation mise a jour automatiquement.';
  }

  isFieldInvalid(controlName: string): boolean {
    const control = this.createMissionForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  isStepOneValid(): boolean {
    return !!this.createMissionForm.get('adresseRamassage')?.valid && !!this.createMissionForm.get('adresseLivraison')?.valid;
  }

  isStepTwoValid(): boolean {
    return (
      !!this.createMissionForm.get('categorie')?.valid &&
      !!this.createMissionForm.get('poidsEstime')?.valid &&
      !!this.createMissionForm.get('volumeEstime')?.valid &&
      !!this.createMissionForm.get('typeVehiculeRequis')?.valid &&
      !!this.createMissionForm.get('dateDemandee')?.valid &&
      !!this.createMissionForm.get('heureDemandee')?.valid
    );
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      if (!this.isStepOneValid()) {
        this.toastService.warning('Veuillez renseigner les deux adresses.');
        this.createMissionForm.get('adresseRamassage')?.markAsTouched();
        this.createMissionForm.get('adresseLivraison')?.markAsTouched();
        return;
      }

      this.currentStep = 2;
      return;
    }

    if (this.currentStep === 2) {
      if (!this.isStepTwoValid()) {
        this.toastService.warning('Veuillez completer les details de la mission.');
        this.createMissionForm.markAllAsTouched();
        return;
      }

      this.currentStep = 3;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  selectCategory(category: MissionCategory): void {
    this.createMissionForm.patchValue({ categorie: category });
  }

  selectVehicle(vehicle: string): void {
    this.createMissionForm.patchValue({ typeVehiculeRequis: vehicle });
  }

  onWeightSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.createMissionForm.patchValue({ poidsEstime: Number(input.value) });
  }

  onSubmit(): void {
    if (this.createMissionForm.invalid) {
      this.toastService.warning('Veuillez remplir tous les champs correctement.');
      this.createMissionForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const payload = this.buildCreatePayload();

    const request$ = this.editingMissionId
      ? this.missionService.updateMission(this.editingMissionId, payload as Partial<Mission>)
      : this.missionService.creerMission(payload);

    request$.subscribe({
      next: (mission) => {
        this.loading = false;
        this.toastService.success(this.editingMissionId ? 'Mission modifiee avec succes' : 'Mission creee avec succes');
        this.router.navigate(['/client/driver-search', mission.id || this.editingMissionId]);
      },
      error: () => {
        this.loading = false;
        this.toastService.error(this.editingMissionId ? 'Erreur lors de la modification de la mission' : 'Erreur lors de la creation de la mission');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/client/dashboard']);
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

  formatDistance(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '--';
    }

    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatDuration(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '--';
    }

    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0
    }).format(value);
  }

  hasPricingDetails(): boolean {
    return this.breakdownRows.length > 0;
  }

  private setupEstimationWatcher(): void {
    this.createMissionForm.valueChanges
      .pipe(
        debounceTime(450),
        map(() => this.buildEstimateRequest()),
        distinctUntilChanged((previous, current) => this.requestKey(previous) === this.requestKey(current)),
        tap((request) => {
          if (!request) {
            this.resetEstimation();
            return;
          }

          this.estimationLoading = true;
          this.estimationError = null;
        }),
        filter((request): request is MissionEstimateRequest => !!request),
        switchMap((request) =>
          this.missionEstimationService.estimate(request).pipe(
            map((estimation) => ({ kind: 'success' as const, estimation })),
            catchError((error) =>
              of({
                kind: 'error' as const,
                message: this.extractErrorMessage(error)
              })
            )
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        this.estimationLoading = false;

        if (result.kind === 'success') {
          this.estimation = result.estimation;
          this.estimationError = null;
          return;
        }

        this.estimation = null;
        this.estimationError = result.message;
      });
  }

  private setupAddressGeocodingWatcher(): void {
    const departControl = this.createMissionForm.get('adresseRamassage');
    const destinationControl = this.createMissionForm.get('adresseLivraison');

    if (!departControl || !destinationControl) {
      return;
    }

    combineLatest([
      departControl.valueChanges.pipe(startWith(departControl.value)),
      destinationControl.valueChanges.pipe(startWith(destinationControl.value))
    ])
      .pipe(
        debounceTime(500),
        map(([depart, destination]) => ({
          depart: String(depart || '').trim(),
          destination: String(destination || '').trim()
        })),
        distinctUntilChanged((previous, current) => previous.depart === current.depart && previous.destination === current.destination),
        tap(({ depart, destination }) => {
          if (!depart || !destination) {
            this.clearMapPreview();
            return;
          }

          this.geocodingLoading = true;
          this.geocodingError = null;
        }),
        switchMap(({ depart, destination }) => {
          if (!depart || !destination) {
            return of(null);
          }

          return forkJoin({
            depart: this.geolocationService.geocodeAddress(depart),
            destination: this.geolocationService.geocodeAddress(destination)
          }).pipe(
            catchError(() =>
              of({
                depart: null,
                destination: null
              })
            )
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        this.geocodingLoading = false;

        if (!result) {
          return;
        }

        const depart = this.extractCoordinates(result.depart);
        const destination = this.extractCoordinates(result.destination);

        if (!depart || !destination) {
          this.mapMarkers = [];
          this.geocodingError = 'Impossible de localiser une ou plusieurs adresses en Tunisie.';
          return;
        }

        this.createMissionForm.patchValue(
          {
            latitudeRamassage: depart.lat,
            longitudeRamassage: depart.lng,
            latitudeLivraison: destination.lat,
            longitudeLivraison: destination.lng
          }
        );

        this.mapMarkers = [
          {
            lat: depart.lat,
            lng: depart.lng,
            popup: 'Depart',
            icon: '<div class="custom-map-pin custom-map-pin--departure"><span></span></div>'
          },
          {
            lat: destination.lat,
            lng: destination.lng,
            popup: 'Destination',
            icon: '<div class="custom-map-pin custom-map-pin--destination"><span></span></div>'
          }
        ];

        this.mapCenter = [
          (depart.lat + destination.lat) / 2,
          (depart.lng + destination.lng) / 2
        ];
        this.mapZoom = 8;
        this.geocodingError = null;
      });
  }

  private loadMissionForEdit(missionId: string): void {
    this.missionService.getMissionById(missionId).subscribe({
      next: (mission) => {
        this.patchFormFromMission(mission);
      },
      error: () => {
        this.toastService.error('Impossible de charger la mission a modifier.');
      }
    });
  }

  private patchFormFromMission(mission: Mission): void {
    const depart = this.parseAddressValue(mission.adresseRamassage);
    const destination = this.parseAddressValue(mission.adresseLivraison);

    if (depart?.latitude != null && depart?.longitude != null && destination?.latitude != null && destination?.longitude != null) {
      this.mapMarkers = [
        {
          lat: depart.latitude,
          lng: depart.longitude,
          popup: 'Depart',
          icon: '<div class="custom-map-pin custom-map-pin--departure"><span></span></div>'
        },
        {
          lat: destination.latitude,
          lng: destination.longitude,
          popup: 'Destination',
          icon: '<div class="custom-map-pin custom-map-pin--destination"><span></span></div>'
        }
      ];
      this.mapCenter = [(depart.latitude + destination.latitude) / 2, (depart.longitude + destination.longitude) / 2];
      this.mapZoom = 8;
    }

    this.createMissionForm.patchValue(
      {
        adresseRamassage: depart?.label ?? mission.adresseRamassage ?? '',
        adresseLivraison: destination?.label ?? mission.adresseLivraison ?? '',
        latitudeRamassage: depart?.latitude ?? mission.latitudeRamassage ?? null,
        longitudeRamassage: depart?.longitude ?? mission.longitudeRamassage ?? null,
        latitudeLivraison: destination?.latitude ?? mission.latitudeLivraison ?? null,
        longitudeLivraison: destination?.longitude ?? mission.longitudeLivraison ?? null,
        categorie: mission.categorie,
        poidsEstime: mission.poidsEstime ?? 30,
        volumeEstime: mission.volumeEstime ?? 0.5,
        typeVehiculeRequis: mission.typeVehiculeRequis ?? 'VOITURE',
        description: mission.description ?? '',
        instructionsSpeciales: mission.instructionsSpeciales ?? '',
        dateDemandee: mission.dateDemandee ?? this.createMissionForm.get('dateDemandee')?.value,
        heureDemandee: mission.heureDemandee ?? this.createMissionForm.get('heureDemandee')?.value
      },
      { emitEvent: true }
    );
  }

  private buildCreatePayload(): CreateMissionRequest {
    return {
      adresseRamassage: String(this.createMissionForm.get('adresseRamassage')?.value || '').trim(),
      adresseLivraison: String(this.createMissionForm.get('adresseLivraison')?.value || '').trim(),
      categorie: this.createMissionForm.get('categorie')?.value,
      poidsEstime: Number(this.createMissionForm.get('poidsEstime')?.value),
      volumeEstime: Number(this.createMissionForm.get('volumeEstime')?.value),
      typeVehiculeRequis: this.createMissionForm.get('typeVehiculeRequis')?.value,
      description: this.createMissionForm.get('description')?.value,
      instructionsSpeciales: this.createMissionForm.get('instructionsSpeciales')?.value,
      dateDemandee: this.createMissionForm.get('dateDemandee')?.value,
      heureDemandee: this.createMissionForm.get('heureDemandee')?.value,
      latitudeRamassage: this.toNullableNumber(this.createMissionForm.get('latitudeRamassage')?.value),
      longitudeRamassage: this.toNullableNumber(this.createMissionForm.get('longitudeRamassage')?.value),
      latitudeLivraison: this.toNullableNumber(this.createMissionForm.get('latitudeLivraison')?.value),
      longitudeLivraison: this.toNullableNumber(this.createMissionForm.get('longitudeLivraison')?.value)
    };
  }

  private buildEstimateRequest(): MissionEstimateRequest | null {
    const adresseRamassage = String(this.createMissionForm.get('adresseRamassage')?.value || '').trim();
    const adresseLivraison = String(this.createMissionForm.get('adresseLivraison')?.value || '').trim();

    if (!adresseRamassage || !adresseLivraison) {
      return null;
    }

    return {
      ...this.buildCreatePayload(),
      description: undefined,
      instructionsSpeciales: undefined
    };
  }

  private canEstimate(): boolean {
    return !!this.buildEstimateRequest();
  }

  private resetEstimation(): void {
    this.estimation = null;
    this.estimationError = null;
    this.estimationLoading = false;
  }

  private requestKey(request: MissionEstimateRequest | null): string {
    return request ? JSON.stringify(request) : '';
  }

  private clearMapPreview(): void {
    this.mapMarkers = [];
    this.geocodingError = null;
    this.geocodingLoading = false;
    this.mapCenter = [34.0, 9.0];
    this.mapZoom = 6;
  }

  private extractCoordinates(result: unknown): { lat: number; lng: number } | null {
    if (!result || typeof result !== 'object') {
      return null;
    }

    const payload = result as Record<string, unknown>;
    const latValue = payload['lat'];
    const lonValue = payload['lon'];

    const lat = typeof latValue === 'string' ? Number(latValue) : typeof latValue === 'number' ? latValue : NaN;
    const lng = typeof lonValue === 'string' ? Number(lonValue) : typeof lonValue === 'number' ? lonValue : NaN;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng };
  }

  private parseAddressValue(value: string | null | undefined): { label: string; latitude: number | null; longitude: number | null } | null {
    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as {
        rue?: string;
        ville?: string;
        codePostal?: string;
        pays?: string;
        latitude?: number;
        longitude?: number;
      };

      const label = [parsed.rue, parsed.ville, parsed.codePostal, parsed.pays]
        .filter((part) => !!part && String(part).trim().length > 0)
        .join(', ');

      return {
        label: label || value,
        latitude: typeof parsed.latitude === 'number' ? parsed.latitude : null,
        longitude: typeof parsed.longitude === 'number' ? parsed.longitude : null
      };
    } catch {
      return { label: value, latitude: null, longitude: null };
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (!error || typeof error !== 'object') {
      return "Impossible de calculer l'estimation pour le moment.";
    }

    const payload = error as Record<string, unknown>;
    const errorBody = payload['error'];

    if (typeof errorBody === 'string' && errorBody.trim()) {
      return errorBody;
    }

    if (errorBody && typeof errorBody === 'object') {
      const errorObject = errorBody as Record<string, unknown>;
      const message = errorObject['message'];

      if (typeof message === 'string' && message.trim()) {
        return message;
      }

      if (Array.isArray(message) && message.length > 0) {
        const firstMessage = message[0];
        if (typeof firstMessage === 'string' && firstMessage.trim()) {
          return firstMessage;
        }
      }
    }

    const message = payload['message'];
    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return "Impossible de calculer l'estimation pour le moment.";
  }

  private toNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private mapQueryCategory(value: string): MissionCategory {
    const lowered = value.toLowerCase();

    if (lowered.includes('dem')) {
      return MissionCategory.DEMENAGEMENT;
    }

    if (lowered.includes('course')) {
      return MissionCategory.COURSES;
    }

    if (lowered.includes('mat')) {
      return MissionCategory.MATERIAUX;
    }

    if (lowered.includes('autre')) {
      return MissionCategory.PERSONNALISE;
    }

    return MissionCategory.COLIS;
  }

  private nonBlankValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (typeof value !== 'string') {
        return null;
      }

      return value.trim().length > 0 ? null : { blank: true };
    };
  }
}
