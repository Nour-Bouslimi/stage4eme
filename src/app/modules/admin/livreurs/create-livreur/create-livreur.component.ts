import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
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
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      vehiculeType: [VehicleType.VOITURE, Validators.required],
      vehiculeImmatriculation: ['', Validators.required],
      vehiculePoidsMax: [1000, [Validators.required, Validators.min(1), Validators.max(5000)]],
      vehiculeVolumeMax: [5, [Validators.required, Validators.min(0.1)]],
      vehiculeRayonService: [20, [Validators.required, Validators.min(1), Validators.max(100)]]
    });
  }

  onSubmit(): void {
    if (this.createLivreurForm.invalid) {
      this.toastService.warning('Veuillez remplir tous les champs correctement');
      return;
    }

    this.loading = true;

    const formData = new FormData();
    formData.append('prenom', this.createLivreurForm.get('prenom')?.value);
    formData.append('nom', this.createLivreurForm.get('nom')?.value);
    formData.append('email', this.createLivreurForm.get('email')?.value);
    formData.append('telephone', this.createLivreurForm.get('telephone')?.value);
    formData.append('motDePasse', this.createLivreurForm.get('motDePasse')?.value);
    formData.append('vehiculeType', this.createLivreurForm.get('vehiculeType')?.value);
    formData.append('vehiculeImmatriculation', this.createLivreurForm.get('vehiculeImmatriculation')?.value);
    formData.append('vehiculePoidsMax', this.createLivreurForm.get('vehiculePoidsMax')?.value);
    formData.append('vehiculeVolumeMax', this.createLivreurForm.get('vehiculeVolumeMax')?.value);
    formData.append('vehiculeRayonService', this.createLivreurForm.get('vehiculeRayonService')?.value);

    this.userService.createLivreur(formData).subscribe({
      next: () => {
        this.loading = false;
        this.toastService.success('Livreur créé avec succès');
        this.router.navigate(['/admin/livreurs']);
      },
      error: () => {
        this.loading = false;
        this.toastService.error('Erreur lors de la création du livreur');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/livreurs']);
  }
}
