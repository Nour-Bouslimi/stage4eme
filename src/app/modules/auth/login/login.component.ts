import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.toastService.warning('Le formulaire contient des erreurs. Vérifiez les champs en rouge.');
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading = true;
    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastService.success('Connexion réussie');

        const role = response.user.role;
        if (role === UserRole.CLIENT) {
          this.router.navigate(['/client/dashboard']);
        } else if (role === UserRole.LIVREUR) {
          this.router.navigate(['/livreur/dashboard']);
        } else if (role === UserRole.ADMIN) {
          this.router.navigate(['/admin/dashboard']);
        }
      },
      error: (error: unknown) => {
        this.loading = false;
        console.error('Login failed', error);
        this.toastService.error(this.getLoginErrorMessage(error));
      }
    });
  }

  goToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }

  forgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  getFieldError(controlName: string): string {
    const control = this.loginForm.get(controlName);

    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Ce champ est obligatoire';
    }

    if (control.errors['email']) {
      return 'Adresse email invalide';
    }

    if (control.errors['minlength']) {
      return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
    }

    return 'Valeur invalide';
  }

  hasError(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!control && control.touched && control.invalid;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private getLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
      }

      if (error.status === 401) {
        return 'Email ou mot de passe incorrect';
      }

      if (error.status === 404) {
        return 'Endpoint de connexion introuvable sur le backend';
      }

      if (error.status >= 500) {
        return 'Erreur serveur lors de la connexion';
      }

      const backendMessage = error.error?.message;
      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
      }

      if (Array.isArray(backendMessage) && backendMessage.length > 0) {
        return backendMessage[0];
      }
    }

    if (error instanceof Error && error.message.trim()) {
      if (error.message === 'Invalid credentials') {
        return 'Email ou mot de passe incorrect';
      }

      return error.message;
    }

    return 'La connexion a échoué';
  }
}
