import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  loading = false;
  token = '';
  tokenChecking = false;
  tokenValid = false;
  tokenInvalid = false;
  tokenErrorMessage = '';
  emailPrefilled = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.resetForm = this.fb.group({
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      confirmMotDePasse: ['', [Validators.required, this.passwordMatchValidator()]]
    });

    this.resetForm.get('motDePasse')?.valueChanges.subscribe(() => {
      this.resetForm.get('confirmMotDePasse')?.updateValueAndValidity({ onlySelf: true });
    });

    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token') || '';
      const email = params.get('email') || '';
      this.token = token;
      this.emailPrefilled = email;
      this.tokenValid = false;
      this.tokenInvalid = false;
      this.tokenErrorMessage = '';

      if (token) {
        this.validateToken(token);
      }
    });
  }

  getFieldMessage(controlName: string): string {
    const control = this.resetForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Ce champ est obligatoire.';
    }

    if (control.errors['minlength']) {
      return `Au moins ${control.errors['minlength'].requiredLength} caracteres sont requis.`;
    }

    if (control.errors['mismatch']) {
      return 'Les mots de passe ne correspondent pas.';
    }

    return 'Valeur invalide.';
  }

  get isResetMode(): boolean {
    return !!this.token && this.tokenValid && !this.tokenInvalid;
  }

  resetPassword(): void {
    if (!this.isResetMode) {
      this.toastService.warning('Le lien de reinitialisation est invalide ou expire.');
      return;
    }

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

    this.authService.resetPassword(this.token, motDePasse)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (response) => {
          this.toastService.success(response.message || 'Mot de passe mis a jour avec succes.');
          this.router.navigate(['/auth/login']);
        },
        error: (error: unknown) => {
          this.toastService.error(this.getErrorMessage(error));
        }
      });
  }

  private validateToken(token: string): void {
    this.tokenChecking = true;
    this.authService.validateResetToken(token)
      .pipe(finalize(() => { this.tokenChecking = false; }))
      .subscribe({
        next: () => {
          this.tokenValid = true;
          this.tokenInvalid = false;
        },
        error: (error: unknown) => {
          this.tokenValid = false;
          this.tokenInvalid = true;
          this.tokenErrorMessage = this.getErrorMessage(error) || 'Le lien de reinitialisation est invalide ou expire.';
        }
      });
  }

  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const parent = control.parent;
      if (!parent) {
        return null;
      }

      const password = parent.get('motDePasse')?.value;
      const confirmPassword = control.value;

      if (!confirmPassword) {
        return null;
      }

      return password === confirmPassword ? null : { mismatch: true };
    };
  }

  private getErrorMessage(error: unknown): string {
    // Reuse simple error handling from other components
    if ((error as any)?.status === 0) {
      return 'Impossible de contacter le serveur.';
    }

    const backendMessage = (error as any)?.error?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Une erreur est survenue.';
  }
}
