import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

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

  constructor(private userService: UserService) {}

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
    if (this.searchQuery) {
      this.filteredClients = this.clients.filter(client =>
        client.prenom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        client.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    } else {
      this.filteredClients = this.clients;
    }
  }

  viewClient(clientId: string): void {
    console.log('Voir client:', clientId);
  }

  deactivateClient(clientId: string): void {
    this.userService.desactiverUser(clientId).subscribe({
      next: () => {
        this.loadClients();
      }
    });
  }

  deleteClient(clientId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      this.userService.supprimerUser(clientId).subscribe({
        next: () => {
          this.loadClients();
        }
      });
    }
  }
}
