import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  currentStep = 1;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.signupForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      confirmationMotDePasse: ['', [Validators.required]],
      acceptCGU: [false, [Validators.requiredTrue]]
    });
  }

  nextStep(): void {
    if (this.currentStep !== 1) {
      return;
    }

    const fields = ['prenom', 'nom', 'email', 'telephone', 'motDePasse'];
    const hasInvalidField = fields.some(field => this.signupForm.get(field)?.invalid);

    if (hasInvalidField) {
      this.toastService.warning('Corrigez les champs obligatoires avant de continuer');
      this.markFormGroupTouched(this.signupForm);
      return;
    }

    this.currentStep = 2;
  }

  previousStep(): void {
    this.currentStep = 1;
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.toastService.warning('Le formulaire contient des erreurs. Vérifiez les champs en rouge.');
      this.markFormGroupTouched(this.signupForm);
      return;
    }

    const motDePasse = this.signupForm.get('motDePasse')?.value;
    const confirmation = this.signupForm.get('confirmationMotDePasse')?.value;

    if (motDePasse !== confirmation) {
      this.signupForm.get('confirmationMotDePasse')?.setErrors({ mismatch: true });
      this.signupForm.get('confirmationMotDePasse')?.markAsTouched();
      this.toastService.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (!this.signupForm.get('acceptCGU')?.value) {
      const acceptCGU = this.signupForm.get('acceptCGU');
      acceptCGU?.setErrors({ requiredTrue: true });
      acceptCGU?.markAsTouched();
      this.toastService.warning("Vous devez accepter les conditions générales d'utilisation");
      return;
    }

    this.loading = true;

    const signupData = {
      prenom: this.signupForm.get('prenom')?.value,
      nom: this.signupForm.get('nom')?.value,
      email: this.signupForm.get('email')?.value,
      telephone: this.signupForm.get('telephone')?.value,
      motDePasse
    };

    this.authService.signup(signupData).subscribe({
      next: () => {
        this.loading = false;
        this.toastService.success('Compte créé avec succès');
        this.router.navigate(['/auth/login']);
      },
      error: (error: unknown) => {
        this.loading = false;
        this.toastService.error(this.getSignupErrorMessage(error));
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  getFieldError(controlName: string): string {
    const control = this.signupForm.get(controlName);

    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Ce champ est obligatoire';
    }

    if (control.errors['requiredTrue']) {
      return 'Vous devez accepter les conditions générales';
    }

    if (control.errors['email']) {
      return 'Adresse email invalide';
    }

    if (control.errors['minlength']) {
      return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
    }

    if (control.errors['pattern']) {
      return 'Format invalide';
    }

    if (control.errors['mismatch']) {
      return 'Les mots de passe ne correspondent pas';
    }

    return 'Valeur invalide';
  }

  hasError(controlName: string): boolean {
    const control = this.signupForm.get(controlName);
    return !!control && control.touched && control.invalid;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private getSignupErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
      }

      const backendMessage = error.error?.message;
      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
      }

      if (Array.isArray(backendMessage) && backendMessage.length > 0) {
        return backendMessage[0];
      }
    }

    return 'La création du compte a échoué';
  }
}
