import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { User, VehicleType } from '../../../core/models/user.model';

@Component({
  selector: 'app-livreurs-list',
  templateUrl: './livreurs-list.component.html',
  styleUrls: ['./livreurs-list.component.css']
})
export class LivreursListComponent implements OnInit {
  livreurs: User[] = [];
  filteredLivreurs: User[] = [];
  loading = true;
  searchQuery = '';
  vehicleFilter: VehicleType | 'all' = 'all';
  availabilityFilter: 'all' | 'available' | 'unavailable' = 'all';
  viewMode: 'table' | 'grid' = 'table';

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
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLivreurs();
  }

  loadLivreurs(): void {
    this.loading = true;

    this.userService.getLivreurs().subscribe({
      next: (livreurs) => {
        this.livreurs = livreurs;
        this.filteredLivreurs = livreurs;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.filterLivreurs();
  }

  onVehicleFilterChange(): void {
    this.filterLivreurs();
  }

  onAvailabilityFilterChange(): void {
    this.filterLivreurs();
  }

  filterLivreurs(): void {
    let filtered = [...this.livreurs];

    // Filtre par recherche
    if (this.searchQuery) {
      filtered = filtered.filter(livreur =>
        livreur.prenom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        livreur.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        livreur.email.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    // Filtre par véhicule
    if (this.vehicleFilter !== 'all') {
      filtered = filtered.filter(livreur => 
        livreur.vehicule?.type === this.vehicleFilter
      );
    }

    // Filtre par disponibilité
    if (this.availabilityFilter === 'available') {
      filtered = filtered.filter(livreur => livreur.disponible);
    } else if (this.availabilityFilter === 'unavailable') {
      filtered = filtered.filter(livreur => !livreur.disponible);
    }

    this.filteredLivreurs = filtered;
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'grid' : 'table';
  }

  createLivreur(): void {
    this.router.navigate(['/admin/livreurs/create']);
  }

  viewLivreur(livreurId: string): void {
    this.router.navigate(['/admin/livreurs', livreurId]);
  }

  deactivateLivreur(livreurId: string): void {
    this.userService.desactiverUser(livreurId).subscribe({
      next: () => {
        this.loadLivreurs();
      }
    });
  }

  deleteLivreur(livreurId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce livreur ?')) {
      this.userService.supprimerUser(livreurId).subscribe({
        next: () => {
          this.loadLivreurs();
        }
      });
    }
  }

  getVehicleLabel(type: string): string {
    const labels: { [key: string]: string } = {
      BICYCLETTE: 'Vélo',
      MOTO: 'Moto',
      SCOOTER: 'Scooter',
      VOITURE: 'Voiture',
      PICKUP: 'Pickup',
      FOURGONNETTE: 'Fourgonnette',
      PETIT_CAMION: 'Petit camion',
      GROS_CAMION: 'Gros camion'
    };
    return labels[type] || type;
  }
}
