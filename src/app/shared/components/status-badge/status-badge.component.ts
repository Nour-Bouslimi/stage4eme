import { Component, Input } from '@angular/core';
import { MissionStatus } from '../../../core/models/mission.model';

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.css']
})
export class StatusBadgeComponent {
  @Input() statut!: MissionStatus;

  getStatusColor(): string {
    switch (this.statut) {
      case MissionStatus.EN_ATTENTE:
        return 'amber';
      case MissionStatus.ACCEPTEE:
        return 'blue';
      case MissionStatus.EN_ROUTE:
        return 'purple';
      case MissionStatus.ARRIVEE:
        return 'indigo';
      case MissionStatus.EN_LIVRAISON:
        return 'orange';
      case MissionStatus.LIVREE:
        return 'teal';
      case MissionStatus.TERMINEE:
        return 'green';
      case MissionStatus.ANNULEE:
        return 'red';
      default:
        return 'gray';
    }
  }

  getStatusLabel(): string {
    switch (this.statut) {
      case MissionStatus.EN_ATTENTE:
        return 'En attente';
      case MissionStatus.ACCEPTEE:
        return 'Acceptée';
      case MissionStatus.EN_ROUTE:
        return 'En route';
      case MissionStatus.ARRIVEE:
        return 'Arrivé';
      case MissionStatus.EN_LIVRAISON:
        return 'En livraison';
      case MissionStatus.LIVREE:
        return 'Livrée';
      case MissionStatus.TERMINEE:
        return 'Terminée';
      case MissionStatus.ANNULEE:
        return 'Annulée';
      default:
        return this.statut;
    }
  }
}
