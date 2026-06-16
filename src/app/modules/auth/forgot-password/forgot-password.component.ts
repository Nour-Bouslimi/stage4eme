import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
  requestForm!: FormGroup;
  resetForm!: FormGroup;
  loading = false;
  sent = false;
  token = '';
  emailPrefilled = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      confirmMotDePasse: ['', [Validators.required]]
    });

    this.route.queryParamMap.subscribe((params) => {
      const token = params.get('token') || '';
      const email = params.get('email') || '';
      this.token = token;
      this.emailPrefilled = email;

      if (email && !this.requestForm.get('email')?.value) {
        this.requestForm.patchValue({ email });
      }
    });
  }

  get isResetMode(): boolean {
    return !!this.token;
  }

  requestReset(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      this.toastService.warning('Veuillez saisir une adresse email valide.');
      return;
    }

    this.loading = true;
    const email = this.requestForm.get('email')?.value;

    this.authService.requestPasswordReset(email).subscribe({
      next: (response) => {
        this.loading = false;
        this.sent = true;
        this.toastService.success(response.message || 'Un lien de réinitialisation a été envoyé.');
      },
      error: (error: unknown) => {
        this.loading = false;
        this.toastService.error(this.getErrorMessage(error));
      }
    });
  }

  resetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      this.toastService.warning('Veuillez corriger les champs en rouge.');
      return;
    }

    const motDePasse = this.resetForm.get('motDePasse')?.value;
    const confirmMotDePasse = this.resetForm.get('confirmMotDePasse')?.value;

    if (motDePasse !== confirmMotDePasse) {
      this.resetForm.get('confirmMotDePasse')?.setErrors({ mismatch: true });
      this.toastService.warning('Les mots de passe ne correspondent pas.');
      return;
    }

    this.loading = true;

    this.authService.resetPassword(this.token, motDePasse).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastService.success(response.message || 'Mot de passe mis à jour avec succès.');
        this.router.navigate(['/auth/login']);
      },
      error: (error: unknown) => {
        this.loading = false;
        this.toastService.error(this.getErrorMessage(error));
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  resendLink(): void {
    this.sent = false;
  }

  hasError(controlName: string): boolean {
    const control = this.isResetMode ? this.resetForm.get(controlName) : this.requestForm.get(controlName);
    return !!control && control.touched && control.invalid;
  }

  getFieldError(controlName: string): string {
    const control = this.isResetMode ? this.resetForm.get(controlName) : this.requestForm.get(controlName);

    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Ce champ est obligatoire.';
    }

    if (control.errors['email']) {
      return 'Adresse email invalide.';
    }

    if (control.errors['minlength']) {
      return `Au moins ${control.errors['minlength'].requiredLength} caractères sont requis.`;
    }

    if (control.errors['mismatch']) {
      return 'Les mots de passe ne correspondent pas.';
    }

    return 'Valeur invalide.';
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Impossible de contacter le serveur.';
      }

      const backendMessage = error.error?.message;
      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Une erreur est survenue.';
  }
}
