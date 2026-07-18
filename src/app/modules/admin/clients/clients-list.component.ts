import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-clients-list',
  templateUrl: './clients-list.component.html',
  styleUrls: ['./clients-list.component.css']
})
export class ClientsListComponent implements OnInit {
  clients: User[] = [];
  filteredClients: User[] = [];
  loading = true;
  searchQuery = '';
  detailModalOpen = false;
  selectedClient: User | null = null;

  constructor(
    private userService: UserService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;

    this.userService.getClients().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.filteredClients = clients;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      this.filteredClients = this.clients.filter((client) =>
        [client.prenom, client.nom, client.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      );
      return;
    }

    this.filteredClients = this.clients;
  }

  viewClient(client: User): void {
    this.selectedClient = client;
    this.detailModalOpen = true;
  }

  closeDetailModal(): void {
    this.detailModalOpen = false;
    this.selectedClient = null;
  }

  toggleClientAccount(client: User): void {
    const isActive = !!client.estActif;
    this.openConfirmation(
      isActive ? 'Désactiver ce client ?' : 'Réactiver ce client ?',
      isActive
        ? 'Le compte sera suspendu et le client ne pourra plus se connecter.'
        : 'Le compte sera de nouveau accessible pour le client.',
      isActive ? 'Désactiver' : 'Réactiver',
      () => (isActive
        ? this.userService.desactiverUser(client.id)
        : this.userService.reactiverUser(client.id)
      ).subscribe({ next: () => this.loadClients() })
    );
  }

  confirmDeleteClient(client: User): void {
    this.openConfirmation(
      'Supprimer ce client ?',
      'Cette action est définitive. Le compte et les données liées seront supprimés.',
      'Supprimer',
      () => this.userService.supprimerUser(client.id).subscribe({ next: () => this.loadClients() })
    );
  }

  getClientMissionsCount(client: User): number {
    return Array.isArray(client.missionsCreees) ? client.missionsCreees.length : client.totalMissions ?? 0;
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
