import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '../../../core/models/user.model';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-admin-profile',
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.css']
})
export class AdminProfileComponent implements OnInit {
  @ViewChild('passwordField') passwordField?: ElementRef<HTMLInputElement>;

  profileForm: FormGroup;
  loading = true;
  saving = false;
  editing = false;
  showPassword = false;
  user: User | null = null;
  avatarPreview = 'assets/default-avatar.svg';

  private avatarFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastService: ToastService
  ) {
    this.profileForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-zÀ-ÿ' -]+$/)]],
      nom: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-zÀ-ÿ' -]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      motDePasse: ['', [Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.userService.getProfile().subscribe({
      next: (user) => {
        this.user = user;
        this.avatarPreview = user.avatar || user.photo || this.avatarPreview;
        this.profileForm.patchValue({
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
          telephone: user.telephone
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastService.error('Impossible de charger le profil');
      }
    });
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    if (!this.editing && this.user) {
      this.loadProfile();
      this.avatarFile = null;
      this.profileForm.get('motDePasse')?.reset('');
      this.showPassword = false;
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = typeof reader.result === 'string' ? reader.result : this.avatarPreview;
    };
    reader.readAsDataURL(file);
    this.avatarFile = file;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toastService.warning(this.getInvalidFieldsMessage());
      return;
    }

    this.saving = true;

    const finishSave = (avatarUrl?: string) => {
      const payload: any = {
        prenom: this.profileForm.value.prenom,
        nom: this.profileForm.value.nom,
        email: this.profileForm.value.email,
        telephone: this.profileForm.value.telephone,
        avatar: avatarUrl ?? this.avatarPreview
      };

      if (this.profileForm.value.motDePasse) {
        payload.motDePasse = this.profileForm.value.motDePasse;
      }

      this.userService.updateProfile(payload).subscribe({
        next: (user) => {
          this.saving = false;
          this.editing = false;
          this.avatarFile = null;
          this.user = user;
          this.avatarPreview = user.avatar || user.photo || this.avatarPreview;
          this.profileForm.get('motDePasse')?.reset('');
          this.toastService.success('Profil administrateur mis à jour');
        },
        error: () => {
          this.saving = false;
          this.toastService.error('Erreur lors de la mise à jour');
        }
      });
    };

    if (this.avatarFile) {
      this.userService.uploadAvatar(this.avatarFile).subscribe({
        next: (res) => finishSave(res.url),
        error: () => {
          this.saving = false;
          this.toastService.error("Erreur lors de l'upload de l'image");
        }
      });
      return;
    }

    finishSave();
  }

  resetPasswordField(): void {
    if (!this.editing) {
      this.editing = true;
    }

    this.showPassword = true;
    this.profileForm.get('motDePasse')?.reset('');
    this.profileForm.get('motDePasse')?.markAsPristine();
    this.profileForm.get('motDePasse')?.markAsUntouched();

    setTimeout(() => this.passwordField?.nativeElement.focus(), 0);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  getFieldError(field: string): string {
    const control = this.profileForm.get(field);
    if (!control || !control.errors) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Ce champ est requis';
    }

    if (control.hasError('email')) {
      return 'Email invalide';
    }

    if (control.hasError('minlength')) {
      const err: any = control.getError('minlength');
      return `La valeur est trop courte (${err.requiredLength})`;
    }

    if (control.hasError('pattern')) {
      if (field === 'telephone') {
        return 'Le telephone doit contenir exactement 8 chiffres';
      }

      if (field === 'prenom' || field === 'nom') {
        return 'Ce champ doit contenir uniquement des lettres';
      }

      return 'Format invalide';
    }

    return 'Valeur invalide';
  }

  getInvalidFieldsMessage(): string {
    const invalidFields: string[] = [];

    if (this.profileForm.get('prenom')?.invalid) invalidFields.push('prenom');
    if (this.profileForm.get('nom')?.invalid) invalidFields.push('nom');
    if (this.profileForm.get('email')?.invalid) invalidFields.push('email');
    if (this.profileForm.get('telephone')?.invalid) invalidFields.push('telephone');
    if (this.profileForm.get('motDePasse')?.value && this.profileForm.get('motDePasse')?.invalid) invalidFields.push('mot de passe');

    if (invalidFields.length === 0) {
      return 'Veuillez remplir tous les champs correctement';
    }

    return `Champs invalides: ${invalidFields.join(', ')}`;
  }
}
