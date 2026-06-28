import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
  showPassword = false;
  avatarPreview = 'assets/default-avatar.svg';
  cinPreview = 'assets/default-avatar.svg';
  vehiclePreview = 'assets/default-vehicle.svg';
  availabilityPreview = '';

  private avatarFile: File | null = null;
  private cinFile: File | null = null;
  private vehicleFile: File | null = null;

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
      vehiculeType: [{ value: VehicleType.VOITURE, disabled: true }],
      vehiculeImmatriculation: ['', Validators.required],
      vehiculePoidsMax: [1000, [Validators.required, Validators.min(1), Validators.max(5000)]],
      vehiculeVolumeMax: [5, [Validators.required, Validators.min(0.1)]],
      vehiculeRayonService: [20, [Validators.required, Validators.min(1), Validators.max(100)]]
    });
  }

  loadProfile(): void {
    this.loading = true;

    const cachedUser = this.authService.getCurrentUser();
    if (cachedUser) {
      this.user = cachedUser;
      this.avatarPreview = cachedUser.avatar || cachedUser.photo || 'assets/default-avatar.svg';
      this.cinPreview = cachedUser.photoCin || cachedUser.photo || 'assets/default-avatar.svg';
      this.vehiclePreview = cachedUser.vehicule?.photo || 'assets/default-vehicle.svg';
      this.populateForm(cachedUser);
      this.loadAvailability(cachedUser);
      this.editingAvailability = false;
      this.loading = false;
    }

    this.userService.getProfile().subscribe({
      next: (user) => {
        this.user = user;
        this.authService.setCurrentUser(user);
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
      vehiculeType: user.vehicule?.type ?? user.typeVehicule ?? VehicleType.VOITURE,
      vehiculeImmatriculation: user.vehicule?.immatriculation ?? user.immatriculationVehicule,
      vehiculePoidsMax: user.vehicule?.poidsMax ?? user.poidsMaxKg,
      vehiculeVolumeMax: user.vehicule?.volumeMax ?? user.volumeMaxM3,
      vehiculeRayonService: user.vehicule?.rayonService ?? user.rayonServiceKm
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
    const vehicleTypeControl = this.profileForm.get('vehiculeType');

    if (this.editing) {
      vehicleTypeControl?.enable({ emitEvent: false });
    } else {
      vehicleTypeControl?.disable({ emitEvent: false });
    }

    if (!this.editing && this.user) {
      this.populateForm(this.user);
      this.avatarPreview = this.user.avatar || this.user.photo || 'assets/default-avatar.svg';
      this.cinPreview = this.user.photoCin || this.user.photo || 'assets/default-avatar.svg';
      this.vehiclePreview = this.user.vehicule?.photo || 'assets/default-vehicle.svg';
      this.avatarFile = null;
      this.cinFile = null;
      this.vehicleFile = null;
      this.profileForm.get('motDePasse')?.reset('');
      this.editingAvailability = false;
      this.showPassword = false;
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

  getDisplayName(user: User | null = this.user): string {
    if (!user) {
      return 'Livreur';
    }

    const firstName = user.prenom?.trim();
    const lastName = user.nom?.trim();

    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim();
    }

    const emailLocalPart = user.email?.split('@')[0]?.trim();
    if (emailLocalPart) {
      return emailLocalPart.charAt(0).toUpperCase() + emailLocalPart.slice(1);
    }

    return 'Livreur';
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toastService.warning(this.getInvalidFieldsMessage());
      return;
    }

    this.saving = true;

    const uploadAndSave = async (): Promise<void> => {
      const formData = new FormData();

      this.appendField(formData, 'prenom', this.profileForm.get('prenom')?.value);
      this.appendField(formData, 'nom', this.profileForm.get('nom')?.value);
      this.appendField(formData, 'email', this.profileForm.get('email')?.value);
      this.appendField(formData, 'telephone', this.profileForm.get('telephone')?.value);
      this.appendField(formData, 'cin', this.profileForm.get('cin')?.value);
      this.appendField(formData, 'typeVehicule', this.profileForm.get('vehiculeType')?.value);
      this.appendField(formData, 'immatriculationVehicule', this.profileForm.get('vehiculeImmatriculation')?.value);
      this.appendField(formData, 'poidsMaxKg', this.profileForm.get('vehiculePoidsMax')?.value);
      this.appendField(formData, 'volumeMaxM3', this.profileForm.get('vehiculeVolumeMax')?.value);
      this.appendField(formData, 'rayonServiceKm', this.profileForm.get('vehiculeRayonService')?.value);

      const password = this.profileForm.get('motDePasse')?.value;
      if (typeof password === 'string' && password.trim()) {
        formData.append('motDePasse', password.trim());
      }

      if (this.avatarFile) {
        const avatarFile = await this.prepareImageForUpload(this.avatarFile, 1200, 0.82);
        formData.append('avatar', avatarFile, avatarFile.name);
      }

      if (this.cinFile) {
        const cinFile = await this.prepareImageForUpload(this.cinFile, 1400, 0.82);
        formData.append('photoCin', cinFile, cinFile.name);
      }

      if (this.vehicleFile) {
        const vehicleFile = await this.prepareImageForUpload(this.vehicleFile, 1400, 0.82);
        formData.append('photoVehicule', vehicleFile, vehicleFile.name);
      }

      this.userService.updateProfile(formData).subscribe({
        next: (user) => {
          this.user = user;
          this.avatarPreview = user.avatar || user.photo || this.avatarPreview;
          this.cinPreview = user.photoCin || this.cinPreview;
          this.vehiclePreview = user.vehicule?.photo || this.vehiclePreview;
          this.saving = false;
          this.editing = false;
          this.avatarFile = null;
          this.cinFile = null;
          this.vehicleFile = null;
          this.profileForm.get('motDePasse')?.reset('');
          this.showPassword = false;
          this.toastService.success('Profil mis à jour avec succès');
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401 || error.status === 403) {
            const cachedUser = this.mergeProfileLocally();
            this.user = cachedUser;
            this.authService.setCurrentUser(cachedUser);
            this.avatarPreview = cachedUser.avatar || cachedUser.photo || this.avatarPreview;
            this.cinPreview = cachedUser.photoCin || this.cinPreview;
            this.vehiclePreview = cachedUser.vehicule?.photo || this.vehiclePreview;
            this.saving = false;
            this.editing = false;
            this.avatarFile = null;
            this.cinFile = null;
            this.vehicleFile = null;
            this.profileForm.get('motDePasse')?.reset('');
            this.showPassword = false;
            this.toastService.warning('Profil mis a jour localement, mais le serveur a refuse la sauvegarde');
            return;
          }

          this.saving = false;
          this.toastService.error('Erreur lors de la mise Ã  jour du profil');
        }
      });
    };

    uploadAndSave().catch(() => {
      this.saving = false;
      this.toastService.error('Erreur lors de la preparation des images');
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
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
        this.vehicleFile = file;
      }
    };
    reader.readAsDataURL(file);
  }

  private appendField(formData: FormData, key: string, value: unknown): void {
    if (value === null || value === undefined) {
      return;
    }

    const normalized = typeof value === 'string' ? value.trim() : String(value);
    if (!normalized) {
      return;
    }

    formData.append(key, normalized);
  }

  private mergeProfileLocally(): User {
    const currentUser = this.user || this.authService.getCurrentUser();
    const typeVehicule = this.profileForm.get('vehiculeType')?.value ?? currentUser?.typeVehicule ?? currentUser?.vehicule?.type;
    const immatriculationVehicule = this.profileForm.get('vehiculeImmatriculation')?.value || currentUser?.immatriculationVehicule || currentUser?.vehicule?.immatriculation || '';
    const poidsMaxKg = Number(this.profileForm.get('vehiculePoidsMax')?.value || currentUser?.poidsMaxKg || currentUser?.vehicule?.poidsMax || 0);
    const volumeMaxM3 = Number(this.profileForm.get('vehiculeVolumeMax')?.value || currentUser?.volumeMaxM3 || currentUser?.vehicule?.volumeMax || 0);
    const rayonServiceKm = Number(this.profileForm.get('vehiculeRayonService')?.value || currentUser?.rayonServiceKm || currentUser?.vehicule?.rayonService || 0);

    return {
      ...(currentUser as User),
      prenom: String(this.profileForm.get('prenom')?.value || currentUser?.prenom || ''),
      nom: String(this.profileForm.get('nom')?.value || currentUser?.nom || ''),
      email: String(this.profileForm.get('email')?.value || currentUser?.email || ''),
      telephone: String(this.profileForm.get('telephone')?.value || currentUser?.telephone || ''),
      cin: String(this.profileForm.get('cin')?.value || currentUser?.cin || ''),
      typeVehicule,
      immatriculationVehicule,
      poidsMaxKg,
      volumeMaxM3,
      rayonServiceKm,
      avatar: this.avatarPreview !== 'assets/default-avatar.svg' ? this.avatarPreview : currentUser?.avatar,
      photo: this.avatarPreview !== 'assets/default-avatar.svg' ? this.avatarPreview : currentUser?.photo,
      photoCin: this.cinPreview !== 'assets/default-avatar.svg' ? this.cinPreview : currentUser?.photoCin,
      photoVehicule: this.vehiclePreview !== 'assets/default-vehicle.svg' ? this.vehiclePreview : currentUser?.photoVehicule,
      vehicule: {
        type: typeVehicule,
        immatriculation: immatriculationVehicule,
        photo: this.vehiclePreview !== 'assets/default-vehicle.svg' ? this.vehiclePreview : currentUser?.vehicule?.photo,
        poidsMax: poidsMaxKg,
        volumeMax: volumeMaxM3,
        rayonService: rayonServiceKm
      }
    };
  }
  private async prepareImageForUpload(file: File, maxSize = 1400, quality = 0.82): Promise<File> {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    const image = await this.loadImageElement(file);
    const { width, height } = this.fitWithin(image.naturalWidth, image.naturalHeight, maxSize);

    if (width === image.naturalWidth && height === image.naturalHeight && file.size <= 900_000) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type || 'image/jpeg', quality));
    if (!blob) {
      return file;
    }

    return new File([blob], file.name, { type: blob.type || file.type });
  }

  private loadImageElement(file: File): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image load failed'));
      };

      img.src = objectUrl;
    });
  }

  private fitWithin(width: number, height: number, maxSize: number): { width: number; height: number } {
    if (width <= maxSize && height <= maxSize) {
      return { width, height };
    }

    const ratio = Math.min(maxSize / width, maxSize / height);
    return {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio))
    };
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
    const vehicleType = this.user?.vehicule?.type ?? this.user?.typeVehicule;
    return vehicleType ? this.getVehicleLabel(vehicleType) : 'Mon véhicule';
  }

  getVehicleMatriculation(): string {
    return this.user?.vehicule?.immatriculation || this.user?.immatriculationVehicule || this.profileForm.get('vehiculeImmatriculation')?.value || '—';
  }

  getVehiclePoidLabel(): string {
    const weight = this.user?.vehicule?.poidsMax ?? this.user?.poidsMaxKg ?? this.profileForm.get('vehiculePoidsMax')?.value;
    return `${weight || 0} kg`;
  }

  getVehicleVolumeLabel(): string {
    const volume = this.user?.vehicule?.volumeMax ?? this.user?.volumeMaxM3 ?? this.profileForm.get('vehiculeVolumeMax')?.value;
    return `${volume || 0} m³`;
  }

  getVehicleRadiusLabel(): string {
    const radius = this.user?.vehicule?.rayonService ?? this.user?.rayonServiceKm ?? this.profileForm.get('vehiculeRayonService')?.value;
    return `${radius || 0} km`;
  }

  getCinLabel(): string {
    return this.user?.cin || this.user?.photoCin || 'Non renseigne';
  }

  getInsuranceLabel(): string {
    return this.user?.estActif ? 'À renouveler' : 'En attente';
  }

  getDocumentStatus(documentType: 'cin' | 'vehicle-photo' | 'license' | 'insurance'): { label: string; className: string } {
    switch (documentType) {
      case 'cin':
        return this.user?.cin || this.user?.photoCin
          ? { label: 'Validee', className: 'ok' }
          : { label: 'Manquante', className: 'warn' };
      case 'vehicle-photo':
        return this.user?.vehicule?.photo || this.user?.photoVehicule || this.vehiclePreview !== 'assets/default-vehicle.svg'
          ? { label: 'Validée', className: 'ok' }
          : { label: 'Manquante', className: 'warn' };
      case 'license':
        return this.user?.vehicule?.type || this.user?.typeVehicule
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
