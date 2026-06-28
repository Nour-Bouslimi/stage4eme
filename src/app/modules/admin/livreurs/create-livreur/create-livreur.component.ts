import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateLivreurPayload, UserService } from '../../../../core/services/user.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { VehicleType } from '../../../../core/models/user.model';

@Component({
  selector: 'app-create-livreur',
  templateUrl: './create-livreur.component.html',
  styleUrls: ['./create-livreur.component.css']
})
export class CreateLivreurComponent implements OnInit {
  createLivreurForm!: FormGroup;
  loading = false;
  showPassword = false;
  private readonly temporaryPasswordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

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
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.createLivreurForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      motDePasse: ['', [Validators.required, Validators.pattern(this.temporaryPasswordPattern)]],
      vehiculeType: [VehicleType.VOITURE, Validators.required],
      vehiculeImmatriculation: ['', Validators.required],
      vehiculePoidsMax: [1000, [Validators.required, Validators.min(1), Validators.max(5000)]],
      vehiculeVolumeMax: [5, [Validators.required, Validators.min(0.1)]],
      vehiculeRayonService: [20, [Validators.required, Validators.min(1), Validators.max(100)]]
    });
  }

  onSubmit(): void {
    if (this.createLivreurForm.invalid) {
      this.createLivreurForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const payload: CreateLivreurPayload = {
      prenom: (this.createLivreurForm.get('prenom')?.value || '').trim(),
      nom: (this.createLivreurForm.get('nom')?.value || '').trim(),
      email: (this.createLivreurForm.get('email')?.value || '').trim(),
      telephone: (this.createLivreurForm.get('telephone')?.value || '').trim(),
      motDePasse: this.createLivreurForm.get('motDePasse')?.value,
      typeVehicule: this.createLivreurForm.get('vehiculeType')?.value,
      immatriculationVehicule: (this.createLivreurForm.get('vehiculeImmatriculation')?.value || '').trim(),
      poidsMaxKg: Number(this.createLivreurForm.get('vehiculePoidsMax')?.value),
      volumeMaxM3: Number(this.createLivreurForm.get('vehiculeVolumeMax')?.value),
      rayonServiceKm: Number(this.createLivreurForm.get('vehiculeRayonService')?.value)
    };

    this.userService.createLivreur(payload).subscribe({
      next: () => {
        this.loading = false;
        this.toastService.success('Livreur créé avec succès');
        this.router.navigate(['/admin/livreurs']);
      },
      error: (error) => {
        this.loading = false;
        console.error('createLivreur failed', error);
        this.toastService.error('Erreur lors de la création du livreur');
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  generatePassword(): void {
    const password = this.buildPassword(10);
    const control = this.createLivreurForm.get('motDePasse');
    control?.setValue(password);
    control?.markAsDirty();
    control?.markAsTouched();
    this.showPassword = true;
  }

  private buildPassword(length: number): string {
    const safeLength = Math.max(10, Math.floor(length || 10));
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const specials = '!@#$%^&*()-_=+[]{}:,.?';
    const alphabet = letters + digits + specials;

    const randomIndex = (max: number): number => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] % max;
      }

      return Math.floor(Math.random() * max);
    };

    const chars: string[] = [
      letters[randomIndex(letters.length)],
      letters.toUpperCase()[randomIndex(letters.length)],
      digits[randomIndex(digits.length)],
      specials[randomIndex(specials.length)]
    ];

    while (chars.length < safeLength) {
      chars.push(alphabet[randomIndex(alphabet.length)]);
    }

    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.createLivreurForm.get(fieldName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getFieldError(fieldName: string): string {
    const control = this.createLivreurForm.get(fieldName);

    if (!control || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Ce champ est obligatoire.';
    }

    if (control.errors['email']) {
      return 'Adresse email invalide.';
    }

    if (control.errors['minlength']) {
      const requiredLength = control.errors['minlength'].requiredLength;
      return `Minimum ${requiredLength} caractères.`;
    }

    if (control.errors['maxlength']) {
      const requiredLength = control.errors['maxlength'].requiredLength;
      return `Maximum ${requiredLength} caractères.`;
    }

    if (control.errors['pattern']) {
      if (fieldName === 'motDePasse') {
        return 'Le mot de passe doit contenir au moins 10 caracteres, une majuscule, une minuscule, un chiffre et un caractere special.';
      }

      switch (fieldName) {
        case 'telephone':
          return 'Le téléphone doit contenir exactement 8 chiffres.';
        case 'vehiculeImmatriculation':
          return 'Format d’immatriculation invalide.';
        default:
          return 'Format invalide.';
      }
    }

    if (control.errors['min']) {
      const min = control.errors['min'].min;
      return `Valeur minimale: ${min}.`;
    }

    if (control.errors['max']) {
      const max = control.errors['max'].max;
      return `Valeur maximale: ${max}.`;
    }

    return 'Valeur invalide.';
  }

  cancel(): void {
    this.router.navigate(['/admin/livreurs']);
  }
}
