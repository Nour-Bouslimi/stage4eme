import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MissionService } from '../../../core/services/mission.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MissionCategory, CreateMissionRequest } from '../../../core/models/mission.model';

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

@Component({
  selector: 'app-create-mission',
  templateUrl: './create-mission.component.html',
  styleUrls: ['./create-mission.component.css']
})
export class CreateMissionComponent implements OnInit {
  currentStep = 1;
  createMissionForm!: FormGroup;
  loading = false;

  categories: CategoryOption[] = [
    { value: MissionCategory.COLIS, label: 'Colis Express', icon: 'inventory_2' },
    { value: MissionCategory.MEUBLES, label: 'Déménagement meubles', icon: 'weekend' },
    { value: MissionCategory.DEMENAGEMENT, label: 'Déménagement complet', icon: 'moving' },
    { value: MissionCategory.COURSES, label: 'Courses', icon: 'shopping_cart' },
    { value: MissionCategory.MATERIAUX, label: 'Matériaux', icon: 'construction' },
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
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();

    const initialType = this.route.snapshot.queryParamMap.get('type');
    if (initialType) {
      this.selectCategory(this.mapQueryCategory(initialType));
    }
  }

  initForm(): void {
    const today = new Date();

    this.createMissionForm = this.fb.group({
      adresseRamassage: ['', [Validators.required, this.nonBlankValidator()]],
      adresseLivraison: ['', [Validators.required, this.nonBlankValidator()]],
      categorie: [MissionCategory.COLIS, Validators.required],
      poidsEstime: [30, [Validators.required, Validators.min(1), Validators.max(500)]],
      volumeEstime: [0.5, [Validators.required, Validators.min(0.1), Validators.max(50)]],
      typeVehiculeRequis: ['VOITURE', Validators.required],
      description: ['Carton fragile contenant de la vaisselle. Manipuler avec précaution.', [Validators.required, Validators.minLength(10)]],
      instructionsSpeciales: [''],
      dateDemandee: [this.formatDateInput(today), Validators.required],
      heureDemandee: ['14:00', Validators.required]
    });
  }

  get selectedCategory(): MissionCategory {
    return this.createMissionForm?.get('categorie')?.value ?? MissionCategory.COLIS;
  }

  get selectedVehicle(): string {
    return this.createMissionForm?.get('typeVehiculeRequis')?.value ?? 'VOITURE';
  }

  get estimatedDistance(): number {
    const start = this.createMissionForm?.get('adresseRamassage')?.value ?? '';
    const end = this.createMissionForm?.get('adresseLivraison')?.value ?? '';
    const base = Math.max(start.length + end.length, 12);
    return Number((6 + (base % 37) / 5).toFixed(1));
  }

  get estimatedDuration(): number {
    return Math.round(this.estimatedDistance * 2.6);
  }

  get estimatedPrice(): number {
    return Number((this.basePrice + this.distancePrice + this.weightSurcharge + this.serviceFee).toFixed(2));
  }

  get basePrice(): number {
    return 8.5;
  }

  get distancePrice(): number {
    return Number((this.estimatedDistance * 0.9).toFixed(2));
  }

  get weightSurcharge(): number {
    const rawWeight = Number(this.createMissionForm?.get('poidsEstime')?.value);
    return Number(Math.max(0, (rawWeight - 20) * 0.04).toFixed(2));
  }

  get serviceFee(): number {
    return 1.8;
  }

  get routeDateTimeLabel(): string {
    const dateValue = this.createMissionForm?.get('dateDemandee')?.value;
    const timeValue = this.createMissionForm?.get('heureDemandee')?.value;

    if (!dateValue) {
      return '';
    }

    const dateTime = new Date(`${dateValue}T${timeValue || '00:00'}`);
    return dateTime.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ` à ${dateTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
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

  nextStep(): void {
    if (this.currentStep === 1) {
      if (this.createMissionForm.get('adresseRamassage')?.invalid || this.createMissionForm.get('adresseLivraison')?.invalid) {
        this.toastService.warning('Veuillez renseigner les deux adresses.');
        this.createMissionForm.get('adresseRamassage')?.markAsTouched();
        this.createMissionForm.get('adresseLivraison')?.markAsTouched();
        return;
      }

      this.currentStep = 2;
      return;
    }

    if (this.currentStep === 2) {
      if (
        this.createMissionForm.get('categorie')?.invalid ||
        this.createMissionForm.get('poidsEstime')?.invalid ||
        this.createMissionForm.get('volumeEstime')?.invalid ||
        this.createMissionForm.get('typeVehiculeRequis')?.invalid ||
        this.createMissionForm.get('description')?.invalid ||
        this.createMissionForm.get('dateDemandee')?.invalid ||
        this.createMissionForm.get('heureDemandee')?.invalid
      ) {
        this.toastService.warning('Veuillez compléter les détails de la mission.');
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

    const payload: CreateMissionRequest = {
      adresseRamassage: String(this.createMissionForm.get('adresseRamassage')?.value || '').trim(),
      adresseLivraison: String(this.createMissionForm.get('adresseLivraison')?.value || '').trim(),
      categorie: this.createMissionForm.get('categorie')?.value,
      poidsEstime: Number(this.createMissionForm.get('poidsEstime')?.value),
      volumeEstime: Number(this.createMissionForm.get('volumeEstime')?.value),
      typeVehiculeRequis: this.createMissionForm.get('typeVehiculeRequis')?.value,
      description: this.createMissionForm.get('description')?.value,
      instructionsSpeciales: this.createMissionForm.get('instructionsSpeciales')?.value,
      dateDemandee: this.createMissionForm.get('dateDemandee')?.value,
      heureDemandee: this.createMissionForm.get('heureDemandee')?.value
    };

    this.missionService.creerMission(payload).subscribe({
      next: (mission) => {
        this.loading = false;
        this.toastService.success('Mission creee avec succes');
        this.router.navigate(['/client/driver-search', mission.id]);
      },
      error: () => {
        this.loading = false;
        this.toastService.error('Erreur lors de la creation de la mission');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/client/dashboard']);
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
