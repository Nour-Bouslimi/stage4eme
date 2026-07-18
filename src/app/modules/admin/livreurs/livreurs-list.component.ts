import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../../../core/services/user.service';
import { User, VehicleType } from '../../../core/models/user.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

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
  detailModalOpen = false;
  selectedLivreur: User | null = null;

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
    private router: Router,
    private dialog: MatDialog
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

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter((livreur) =>
        [livreur.prenom, livreur.nom, livreur.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      );
    }

    if (this.vehicleFilter !== 'all') {
      filtered = filtered.filter((livreur) => livreur.vehicule?.type === this.vehicleFilter);
    }

    if (this.availabilityFilter === 'available') {
      filtered = filtered.filter((livreur) => livreur.disponible);
    } else if (this.availabilityFilter === 'unavailable') {
      filtered = filtered.filter((livreur) => !livreur.disponible);
    }

    this.filteredLivreurs = filtered;
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'grid' : 'table';
  }

  createLivreur(): void {
    this.router.navigate(['/admin/livreurs/create']);
  }

  viewLivreur(livreur: User): void {
    this.selectedLivreur = livreur;
    this.detailModalOpen = true;
  }

  closeDetailModal(): void {
    this.detailModalOpen = false;
    this.selectedLivreur = null;
  }

  toggleLivreurAccount(livreur: User): void {
    const isActive = !!livreur.estActif;
    this.openConfirmation(
      isActive ? 'Désactiver ce livreur ?' : 'Réactiver ce livreur ?',
      isActive
        ? 'Le compte sera suspendu et le livreur ne pourra plus se connecter.'
        : 'Le compte sera de nouveau accessible pour le livreur.',
      isActive ? 'Désactiver' : 'Réactiver',
      () => (isActive
        ? this.userService.desactiverUser(livreur.id)
        : this.userService.reactiverUser(livreur.id)
      ).subscribe({ next: () => this.loadLivreurs() })
    );
  }

  confirmDeleteLivreur(livreur: User): void {
    this.openConfirmation(
      'Supprimer ce livreur ?',
      'Cette action est définitive. Le compte et ses données seront supprimés.',
      'Supprimer',
      () => this.userService.supprimerUser(livreur.id).subscribe({ next: () => this.loadLivreurs() })
    );
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

  getAcceptedMissionsCount(livreur: User): number {
    return Array.isArray(livreur.missionsAcceptees) ? livreur.missionsAcceptees.length : livreur.totalMissions ?? 0;
  }

  private openConfirmation(
    title: string,
    message: string,
    confirmText: string,
    onConfirm: () => void
  ): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title,
        message,
        confirmText,
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        onConfirm();
      }
    });
  }
}
