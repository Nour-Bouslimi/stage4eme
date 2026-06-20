import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-client-profile',
  templateUrl: './client-profile.component.html',
  styleUrls: ['./client-profile.component.css']
})
export class ClientProfileComponent implements OnInit {
  @ViewChild('passwordField') passwordField?: ElementRef<HTMLInputElement>;

  form: FormGroup;
  loading = true;
  saving = false;
  editing = false;
  showPassword = false;
  user: User | null = null;
  avatarPreview = 'assets/default-avatar.svg';

  private avatarFile: File | null = null;

  constructor(private fb: FormBuilder, private userService: UserService, private toastService: ToastService) {
    this.form = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      motDePasse: [''],
      telephone: [''],
      adresseParDefaut: ['']
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
        this.form.patchValue({
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
          telephone: user.telephone,
          adresseParDefaut: user.adresseParDefaut
        });
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    if (!this.editing && this.user) {
      this.loadProfile();
      this.avatarFile = null;
      this.form.get('motDePasse')?.reset('');
      this.showPassword = false;
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) { return; }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = typeof reader.result === 'string' ? reader.result : this.avatarPreview;
    };
    reader.readAsDataURL(file);
    this.avatarFile = file;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    const finishSave = (avatarUrl?: string) => {
      const payload: any = {
        prenom: this.form.value.prenom,
        nom: this.form.value.nom,
        email: this.form.value.email,
        telephone: this.form.value.telephone,
        adresseParDefaut: this.form.value.adresseParDefaut,
        avatar: avatarUrl ?? this.avatarPreview
      };

      if (this.form.value.motDePasse) {
        payload.motDePasse = this.form.value.motDePasse;
      }

      this.userService.updateProfile(payload).subscribe({
        next: () => {
          this.saving = false;
          this.editing = false;
          this.avatarFile = null;
          // Update local user object and avatar preview so UI updates immediately
          const updatedAvatar = payload.avatar ?? this.avatarPreview;
          this.avatarPreview = updatedAvatar;
          if (this.user) {
            this.user = {
              ...this.user,
              prenom: payload.prenom,
              nom: payload.nom,
              email: payload.email,
              telephone: payload.telephone,
              adresseParDefaut: payload.adresseParDefaut,
              avatar: updatedAvatar
            } as User;
          }
          this.form.get('motDePasse')?.reset('');
          this.toastService.success('Profil mis à jour avec succès');
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
        error: () => { this.saving = false; this.toastService.error('Erreur lors de l\'upload de l\'image'); }
      });
      return;
    }

    finishSave();
  }

  saveProfile(): void {
    this.save();
  }

  resetPasswordField(): void {
    if (!this.editing) {
      this.editing = true;
    }

    this.showPassword = true;
    this.form.get('motDePasse')?.reset('');
    this.form.get('motDePasse')?.markAsPristine();
    this.form.get('motDePasse')?.markAsUntouched();

    setTimeout(() => this.passwordField?.nativeElement.focus(), 0);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  getFieldError(field: string): string {
    const control = this.form.get(field);
    if (!control || !control.errors) { return ''; }

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
      return 'Format invalide';
    }

    return 'Valeur invalide';
  }
}
