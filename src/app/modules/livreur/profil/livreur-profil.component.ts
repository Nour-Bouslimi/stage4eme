import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { User, VehicleType } from '../../../core/models/user.model';
import { ToastService } from '../../../shared/components/toast/toast.service';

interface AvailabilityDay {
  key: string;
  label: string;
  active: boolean;
}

interface AvailabilityItem {
  day: string;
  active: boolean;
  startTime?: string;
  endTime?: string;
}

@Component({
  selector: 'app-livreur-profil',
  templateUrl: './livreur-profil.component.html',
  styleUrls: ['./livreur-profil.component.css']
})
export class LivreurProfilComponent implements OnInit {
  user: User | null = null;
  profileForm!: FormGroup;
  loading = true;
  saving = false;
  editing = false;
  editingAvailability = false;
  avatarPreview = 'assets/default-avatar.svg';
  cinPreview = 'assets/default-avatar.svg';
  vehiclePreview = 'assets/default-vehicle.svg';
  availabilityPreview = '';

  private avatarFile: File | null = null;
  private cinFile: File | null = null;

  readonly availabilityDays: AvailabilityDay[] = [
    { key: 'lun', label: 'Lun', active: true },
    { key: 'mar', label: 'Mar', active: true },
    { key: 'mer', label: 'Mer', active: false },
    { key: 'jeu', label: 'Jeu', active: true },
    { key: 'ven', label: 'Ven', active: true },
    { key: 'sam', label: 'Sam', active: true },
    { key: 'dim', label: 'Dim', active: false }
  ];

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
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProfile();
  }

  initForm(): void {
    this.profileForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      cin: ['', [Validators.required, Validators.minLength(8)]],
      motDePasse: ['', [Validators.minLength(6)]],
      availabilityStart: ['07:00', [Validators.required]],
      availabilityEnd: ['20:00', [Validators.required]],
      vehiculeType: [VehicleType.VOITURE],
      vehiculeImmatriculation: ['', Validators.required],
      vehiculePoidsMax: [1000, [Validators.required, Validators.min(1), Validators.max(5000)]],
      vehiculeVolumeMax: [5, [Validators.required, Validators.min(0.1)]],
      vehiculeRayonService: [20, [Validators.required, Validators.min(1), Validators.max(100)]]
    });
  }

  loadProfile(): void {
    this.loading = true;

    this.userService.getProfile().subscribe({
      next: (user) => {
        this.user = user;
        this.avatarPreview = user.avatar || user.photo || 'assets/default-avatar.svg';
        this.cinPreview = user.photoCin || user.photo || 'assets/default-avatar.svg';
        this.vehiclePreview = user.vehicule?.photo || 'assets/default-vehicle.svg';
        this.populateForm(user);
        this.loadAvailability(user);
        this.editingAvailability = false;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  populateForm(user: User): void {
    this.profileForm.patchValue({
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone,
      cin: user.cin,
      motDePasse: '',
      availabilityStart: '07:00',
      availabilityEnd: '20:00',
      vehiculeType: user.vehicule?.type,
      vehiculeImmatriculation: user.vehicule?.immatriculation,
      vehiculePoidsMax: user.vehicule?.poidsMax,
      vehiculeVolumeMax: user.vehicule?.volumeMax,
      vehiculeRayonService: user.vehicule?.rayonService
    });
  }

  loadAvailability(user: User): void {
    const availability = this.normalizeAvailability(user.disponibilites);
    if (availability.length > 0) {
      this.availabilityDays.forEach((day) => {
        const match = availability.find((item) => item.day.toLowerCase() === day.label.toLowerCase());
        if (match) {
          day.active = match.active;
        }
      });

      const schedule = availability.find((item) => item.startTime || item.endTime);
      if (schedule) {
        this.profileForm.patchValue({
          availabilityStart: schedule.startTime || '07:00',
          availabilityEnd: schedule.endTime || '20:00'
        });
      }
    }

    this.availabilityPreview = this.getAvailabilitySummary();
  }

  normalizeAvailability(value: unknown): AvailabilityItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item === 'string') {
          return { day: item, active: true };
        }

        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return {
            day: String(record['day'] ?? record['label'] ?? record['jour'] ?? ''),
            active: Boolean(record['active'] ?? record['enabled'] ?? record['value'] ?? false),
            startTime: typeof record['startTime'] === 'string' ? record['startTime'] : undefined,
            endTime: typeof record['endTime'] === 'string' ? record['endTime'] : undefined
          } as AvailabilityItem;
        }

        return { day: '', active: false };
      })
      .filter((item) => item.day);
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    if (!this.editing && this.user) {
      this.populateForm(this.user);
      this.avatarPreview = this.user.avatar || this.user.photo || 'assets/default-avatar.svg';
      this.cinPreview = this.user.photoCin || this.user.photo || 'assets/default-avatar.svg';
      this.vehiclePreview = this.user.vehicule?.photo || 'assets/default-vehicle.svg';
      this.avatarFile = null;
      this.cinFile = null;
      this.profileForm.get('motDePasse')?.reset('');
      this.editingAvailability = false;
    }
  }

  openAvailabilityEditor(): void {
    this.editingAvailability = true;
    this.scrollToAvailability();
  }

  toggleDayAvailability(day: AvailabilityDay): void {
    this.editingAvailability = true;
    day.active = !day.active;
    this.availabilityPreview = this.getAvailabilitySummary();
  }

  cancelAvailabilityEdit(): void {
    if (this.user) {
      this.loadAvailability(this.user);
    }

    this.editingAvailability = false;
  }

  saveAvailability(): void {
    if (!this.user) {
      return;
    }

    this.saving = true;

    const payload: Partial<User> = {
      disponibilites: this.availabilityDays.map((day) => ({
        day: day.label,
        active: day.active,
        startTime: this.profileForm.get('availabilityStart')?.value || '07:00',
        endTime: this.profileForm.get('availabilityEnd')?.value || '20:00'
      })),
      disponible: this.availabilityDays.some((day) => day.active)
    };

    this.userService.updateProfile(payload).subscribe({
      next: (user) => {
        this.user = user;
        this.loadAvailability(user);
        this.saving = false;
        this.editingAvailability = false;
        this.toastService.success('Disponibilite mise a jour avec succes');
      },
      error: () => {
        this.saving = false;
        this.toastService.error('Erreur lors de la mise a jour de la disponibilite');
      }
    });
  }

  getAvailabilityLabel(day: AvailabilityDay): string {
    return day.active ? 'Actif' : 'Off';
  }

  getAvailabilitySummary(): string {
    const activeDays = this.availabilityDays.filter((day) => day.active).length;
    const start = this.profileForm.get('availabilityStart')?.value || '07:00';
    const end = this.profileForm.get('availabilityEnd')?.value || '20:00';
    return `${activeDays} jours actifs · ${start} - ${end}`;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toastService.warning(this.getInvalidFieldsMessage());
      return;
    }

    this.saving = true;

    const finishSave = (avatarUrl?: string): void => {
      const profileData: Partial<User> & { motDePasse?: string } = {
        prenom: this.profileForm.get('prenom')?.value,
        nom: this.profileForm.get('nom')?.value,
        telephone: this.profileForm.get('telephone')?.value,
        cin: this.profileForm.get('cin')?.value,
        avatar: avatarUrl ?? this.avatarPreview,
        photoCin: this.cinPreview,
        photoVehicule: this.vehiclePreview,
        vehicule: {
          type: this.profileForm.get('vehiculeType')?.value,
          immatriculation: this.profileForm.get('vehiculeImmatriculation')?.value,
          poidsMax: this.profileForm.get('vehiculePoidsMax')?.value,
          volumeMax: this.profileForm.get('vehiculeVolumeMax')?.value,
          rayonService: this.profileForm.get('vehiculeRayonService')?.value,
          photo: this.vehiclePreview
        },
        motDePasse: this.profileForm.get('motDePasse')?.value || undefined
      };

      this.userService.updateProfile(profileData).subscribe({
        next: (user) => {
          this.user = user;
          this.avatarPreview = user.avatar || user.photo || this.avatarPreview;
          this.cinPreview = user.photoCin || this.cinPreview;
          this.vehiclePreview = user.vehicule?.photo || this.vehiclePreview;
          this.saving = false;
          this.editing = false;
          this.avatarFile = null;
          this.cinFile = null;
          this.profileForm.get('motDePasse')?.reset('');
          this.toastService.success('Profil mis à jour avec succès');
        },
        error: () => {
          this.saving = false;
          this.toastService.error('Erreur lors de la mise à jour du profil');
        }
      });
    };

    const uploadAvatarThenSave = (): void => {
      if (!this.avatarFile) {
        finishSave();
        return;
      }

      this.userService.uploadAvatar(this.avatarFile).subscribe({
        next: (response) => finishSave(response.url),
        error: () => {
          this.saving = false;
          this.toastService.error('Erreur lors de l upload de la photo de profil');
        }
      });
    };

    if (this.cinFile) {
      const reader = new FileReader();
      reader.onload = () => {
        this.cinPreview = typeof reader.result === 'string' ? reader.result : this.cinPreview;
        uploadAvatarThenSave();
      };
      reader.readAsDataURL(this.cinFile);
      return;
    }

    uploadAvatarThenSave();
  }

  onFileSelected(event: Event, type: 'avatar' | 'cin' | 'vehicle'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';

      if (type === 'avatar') {
        this.avatarPreview = result;
        this.avatarFile = file;
      }

      if (type === 'cin') {
        this.cinPreview = result;
        this.cinFile = file;
      }

      if (type === 'vehicle') {
        this.vehiclePreview = result;
      }
    };
    reader.readAsDataURL(file);
  }

  getVehicleLabel(type: VehicleType): string {
    return this.vehicleTypes.find(v => v.value === type)?.label || type;
  }

  getUserInitials(): string {
    if (!this.user) {
      return 'LV';
    }

    const first = this.user.prenom?.trim().charAt(0) || '';
    const last = this.user.nom?.trim().charAt(0) || '';
    return (first + last).toUpperCase() || 'LV';
  }

  getVehicleName(): string {
    const vehicleType = this.user?.vehicule?.type;
    return vehicleType ? this.getVehicleLabel(vehicleType) : 'Mon véhicule';
  }

  getVehicleMatriculation(): string {
    return this.user?.vehicule?.immatriculation || this.profileForm.get('vehiculeImmatriculation')?.value || '—';
  }

  getVehiclePoidLabel(): string {
    const weight = this.user?.vehicule?.poidsMax ?? this.profileForm.get('vehiculePoidsMax')?.value;
    return `${weight || 0} kg`;
  }

  getVehicleVolumeLabel(): string {
    const volume = this.user?.vehicule?.volumeMax ?? this.profileForm.get('vehiculeVolumeMax')?.value;
    return `${volume || 0} m³`;
  }

  getVehicleRadiusLabel(): string {
    const radius = this.user?.vehicule?.rayonService ?? this.profileForm.get('vehiculeRayonService')?.value;
    return `${radius || 0} km`;
  }

  getCinLabel(): string {
    return this.user?.cin || 'Non renseigné';
  }

  getInsuranceLabel(): string {
    return this.user?.estActif ? 'À renouveler' : 'En attente';
  }

  getDocumentStatus(documentType: 'cin' | 'vehicle-photo' | 'license' | 'insurance'): { label: string; className: string } {
    switch (documentType) {
      case 'cin':
        return this.user?.cin
          ? { label: 'Validée', className: 'ok' }
          : { label: 'Manquante', className: 'warn' };
      case 'vehicle-photo':
        return this.user?.vehicule?.photo || this.vehiclePreview !== 'assets/default-vehicle.svg'
          ? { label: 'Validée', className: 'ok' }
          : { label: 'Manquante', className: 'warn' };
      case 'license':
        return this.user?.vehicule?.type
          ? { label: 'Validé', className: 'ok' }
          : { label: 'Manquant', className: 'warn' };
      case 'insurance':
        return { label: 'À renouveler', className: 'pending' };
      default:
        return { label: '—', className: 'warn' };
    }
  }

  getRevenueLabel(): string {
    const missions = this.user?.totalMissions ?? 0;
    return `${(missions * 60).toLocaleString('fr-FR')} €`;
  }

  getAcceptanceRate(): string {
    const accepted = this.user?.totalMissions ?? 0;
    const cancelled = this.user?.missionsAnnulees ?? 0;
    const total = accepted + cancelled;
    if (!total) {
      return '94%';
    }

    return `${Math.round((accepted / total) * 100)}%`;
  }

  getMonthlyMissions(): number {
    return this.user?.totalMissions ?? 0;
  }

  getCancellationCount(): number {
    return this.user?.missionsAnnulees ?? 0;
  }

  getInvalidFieldsMessage(): string {
    const invalidFields: string[] = [];

    if (this.profileForm.get('prenom')?.invalid) invalidFields.push('prenom');
    if (this.profileForm.get('nom')?.invalid) invalidFields.push('nom');
    if (this.profileForm.get('email')?.invalid) invalidFields.push('email');
    if (this.profileForm.get('telephone')?.invalid) invalidFields.push('telephone');
    if (this.profileForm.get('cin')?.invalid) invalidFields.push('cin');
    if (this.profileForm.get('vehiculeImmatriculation')?.invalid) invalidFields.push('immatriculation');
    if (this.profileForm.get('vehiculePoidsMax')?.invalid) invalidFields.push('poids max');
    if (this.profileForm.get('vehiculeVolumeMax')?.invalid) invalidFields.push('volume max');
    if (this.profileForm.get('vehiculeRayonService')?.invalid) invalidFields.push('rayon de service');
    if (this.profileForm.get('motDePasse')?.value && this.profileForm.get('motDePasse')?.invalid) invalidFields.push('mot de passe');

    if (invalidFields.length === 0) {
      return 'Veuillez remplir tous les champs correctement';
    }

    return `Champs invalides: ${invalidFields.join(', ')}`;
  }

  getFieldError(fieldName: string): string {
    const control = this.profileForm.get(fieldName);
    if (!control || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Ce champ est obligatoire.';
    }

    if (control.errors['email']) {
      return 'Veuillez saisir une adresse email valide.';
    }

    if (control.errors['minlength']) {
      const requiredLength = control.errors['minlength'].requiredLength;
      return `Au moins ${requiredLength} caracteres sont requis.`;
    }

    if (control.errors['pattern']) {
      if (fieldName === 'telephone') {
        return 'Le telephone doit contenir exactement 8 chiffres.';
      }
      return 'Format invalide.';
    }

    if (control.errors['min']) {
      return `La valeur doit etre superieure ou egale a ${control.errors['min'].min}.`;
    }

    if (control.errors['max']) {
      return `La valeur doit etre inferieure ou egale a ${control.errors['max'].max}.`;
    }

    if (fieldName === 'motDePasse') {
      return 'Le mot de passe doit contenir au moins 6 caracteres.';
    }

    return 'Valeur invalide.';
  }

  scrollToAvailability(): void {
    this.editingAvailability = true;

    const target = document.getElementById('availability-section');
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
