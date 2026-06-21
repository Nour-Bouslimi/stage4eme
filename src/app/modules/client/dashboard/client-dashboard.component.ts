import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { MissionService } from '../../../core/services/mission.service';
import { UserService } from '../../../core/services/user.service';
import { Mission, MissionCategory, MissionStatus } from '../../../core/models/mission.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-client-dashboard',
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.css']
})
export class ClientDashboardComponent implements OnInit {
  userName = '';
  currentDate = '';
  missions: Mission[] = [];
  activeMissions: Mission[] = [];
  availableDrivers: User[] = [];
  stats = {
    active: 0,
    completed: 0,
    pending: 0,
    total: 0
  };
  selectedMission: Mission | null = null;
  isMissionModalOpen = false;
  loading = true;

  constructor(
    private authService: AuthService,
    private missionService: MissionService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user.prenom;
    }

    this.currentDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    this.missionService.getMissions().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.activeMissions = missions.filter((mission) =>
          mission.statut === MissionStatus.EN_ATTENTE ||
          mission.statut === MissionStatus.ACCEPTEE ||
          mission.statut === MissionStatus.EN_ROUTE ||
          mission.statut === MissionStatus.EN_LIVRAISON
        );
        this.calculateStats(missions);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

    this.userService.getLivreursDisponibles().subscribe({
      next: (drivers) => {
        this.availableDrivers = drivers.slice(0, 3);
      }
    });
  }

  calculateStats(missions: Mission[]): void {
    this.stats.active = missions.filter(m =>
      m.statut === MissionStatus.ACCEPTEE ||
      m.statut === MissionStatus.EN_ROUTE ||
      m.statut === MissionStatus.EN_LIVRAISON
    ).length;
    this.stats.completed = missions.filter(m =>
      m.statut === MissionStatus.TERMINEE
    ).length;
    this.stats.pending = missions.filter(m =>
      m.statut === MissionStatus.EN_ATTENTE
    ).length;
    this.stats.total = missions.length;
  }

  createMission(type: string): void {
    console.log('Créer mission:', type);
  }

  viewMission(mission: Mission): void {
    this.selectedMission = mission;
    this.isMissionModalOpen = true;
  }

  closeMissionModal(): void {
    this.isMissionModalOpen = false;
    this.selectedMission = null;
  }

  contactDriver(driverId: string): void {
    console.log('Contacter livreur:', driverId);
  }

  getStatusLabel(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'En attente';
      case MissionStatus.ACCEPTEE:
        return 'Acceptée';
      case MissionStatus.EN_ROUTE:
        return 'En route';
      case MissionStatus.EN_LIVRAISON:
        return 'En livraison';
      case MissionStatus.TERMINEE:
        return 'Terminée';
      case MissionStatus.ANNULEE:
        return 'Annulée';
      default:
        return status;
    }
  }

  getStatusColor(status: MissionStatus): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'amber';
      case MissionStatus.ACCEPTEE:
        return 'blue';
      case MissionStatus.EN_ROUTE:
        return 'purple';
      case MissionStatus.EN_LIVRAISON:
        return 'orange';
      case MissionStatus.TERMINEE:
        return 'green';
      case MissionStatus.ANNULEE:
        return 'red';
      default:
        return 'gray';
    }
  }

  getCategoryLabel(category: MissionCategory | string): string {
    switch (category) {
      case MissionCategory.COLIS:
        return 'Colis';
      case MissionCategory.MEUBLES:
        return 'Meubles';
      case MissionCategory.DEMENAGEMENT:
        return 'Déménagement';
      case MissionCategory.COURSES:
        return 'Courses';
      case MissionCategory.MATERIAUX:
        return 'Matériaux';
      case MissionCategory.PERSONNALISE:
        return 'Personnalisée';
      default:
        return category;
    }
  }

  getDriverLabel(mission: Mission): string {
    if (!mission.livreur) {
      return 'Non assigné';
    }

    const firstName = mission.livreur.prenom?.trim() || 'Livreur';
    const lastName = mission.livreur.nom?.trim();
    return [firstName, lastName].filter(Boolean).join(' ');
  }

  getAddressLabel(addressValue: string | null | undefined): string {
    if (!addressValue) {
      return 'N/A';
    }

    try {
      const parsed = JSON.parse(addressValue) as { rue?: string; ville?: string };
      const parts = [parsed.rue, parsed.ville].filter((part) => !!part && part.trim().length > 0);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    } catch {
      // The API may return a plain string instead of JSON.
    }

    return addressValue;
  }

  getMissionDetails(mission: Mission): Array<{ label: string; value: string }> {
    return [
      {
        label: 'Trajet',
        value: `${this.getAddressLabel(mission.adresseRamassage)} → ${this.getAddressLabel(mission.adresseLivraison)}`
      },
      { label: 'Catégorie', value: this.getCategoryLabel(mission.categorie) || 'N/A' },
      { label: 'Statut', value: this.getStatusLabel(mission.statut) },
      { label: 'Livreur', value: this.getDriverLabel(mission) },
      {
        label: 'Date',
        value: mission.createdAt ? new Date(mission.createdAt).toLocaleDateString('fr-FR') : 'N/A'
      },
      {
        label: 'Poids estimé',
        value: mission.poidsEstime != null ? `${mission.poidsEstime} kg` : 'N/A'
      },
      {
        label: 'Volume estimé',
        value: mission.volumeEstime != null ? `${mission.volumeEstime} m³` : 'N/A'
      },
      {
        label: 'Distance',
        value: mission.distanceKm != null ? `${mission.distanceKm} km` : 'N/A'
      },
      {
        label: 'Prix estimé',
        value: mission.prixEstime != null ? `${mission.prixEstime} TND` : 'N/A'
      },
      { label: 'Description', value: mission.description?.trim() || 'Aucune description' }
    ];
  }
}
