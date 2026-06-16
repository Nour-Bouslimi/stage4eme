import { Component, OnInit } from '@angular/core';
import { MissionService } from '../../../core/services/mission.service';
import { UserService } from '../../../core/services/user.service';
import { Mission, MissionStatus, MissionCategory } from '../../../core/models/mission.model';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  stats = {
    totalMissions: 0,
    activeMissions: 0,
    totalClients: 0,
    totalLivreurs: 0,
    totalRevenue: 0
  };

  recentMissions: Mission[] = [];
  loading = true;

  constructor(
    private missionService: MissionService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Simuler le chargement des données
    setTimeout(() => {
      this.stats = {
        totalMissions: 150,
        activeMissions: 23,
        totalClients: 45,
        totalLivreurs: 32,
        totalRevenue: 12500
      };

      this.recentMissions = [
        {
          id: '1',
          clientId: '1',
          depart: { rue: '123 Rue de la République', ville: 'Tunis', codePostal: '1001', pays: 'Tunisie' },
          destination: { rue: '45 Avenue Habib Bourguiba', ville: 'Sfax', codePostal: '3000', pays: 'Tunisie' },
          categorie: MissionCategory.COLIS,
          poids: 10,
          volume: 0.5,
          description: 'Livraison de colis',
          dateLivraison: new Date(),
          statut: MissionStatus.EN_ROUTE,
          prix: 50,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as Mission[];

      this.loading = false;
    }, 1000);
  }

  getStatusLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      EN_ATTENTE: 'En attente',
      ACCEPTEE: 'Acceptée',
      EN_ROUTE: 'En route',
      ARRIVEE: 'Arrivée',
      EN_LIVRAISON: 'En livraison',
      LIVREE: 'Livrée',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée'
    };
    return labels[statut] || statut;
  }

  getStatusColor(statut: string): string {
    const colors: { [key: string]: string } = {
      EN_ATTENTE: 'badge-warning',
      ACCEPTEE: 'badge-info',
      EN_ROUTE: 'badge-primary',
      ARRIVEE: 'badge-secondary',
      EN_LIVRAISON: 'badge-orange',
      LIVREE: 'badge-teal',
      TERMINEE: 'badge-success',
      ANNULEE: 'badge-danger'
    };
    return colors[statut] || 'badge-default';
  }
}
