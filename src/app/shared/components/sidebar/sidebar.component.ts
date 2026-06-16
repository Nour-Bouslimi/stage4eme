import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MissionService } from '../../../core/services/mission.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  collapsed = false;
  role: UserRole | null = null;
  userName = '';
  userAvatar = '';

  @Output() toggleSidebar = new EventEmitter<boolean>();

  menuItems: Array<{ icon: string; label: string; route?: string; action?: 'tracking' | 'driver-search' }> = [];

  constructor(
    private authService: AuthService,
    private missionService: MissionService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.role = this.authService.getRole();
    const user = this.authService.getCurrentUser();

    if (user) {
      this.userName = `${user.prenom} ${user.nom}`;
      this.userAvatar = user.avatar || '';
    }

    this.loadMenuItems();
  }

  loadMenuItems(): void {
    if (this.role === UserRole.CLIENT) {
      this.menuItems = [
        { icon: 'dashboard', label: 'Tableau de bord', route: '/client/dashboard' },
        { icon: 'add_circle', label: 'Créer une mission', route: '/client/create-mission' },
        { icon: 'search', label: 'Rechercher livreur', action: 'driver-search' },
        { icon: 'map', label: 'Carte & Suivi', action: 'tracking' },
        { icon: 'chat', label: 'Messagerie', route: '/client/chat' },
        { icon: 'history', label: 'Mes missions', route: '/client/history' }
      ];
    } else if (this.role === UserRole.LIVREUR) {
      this.menuItems = [
        { icon: 'dashboard', label: 'Tableau de bord', route: '/livreur/dashboard' },
        { icon: 'list', label: 'Missions', route: '/livreur/missions' },
        { icon: 'local_shipping', label: 'Mission active', route: '/livreur/active' },
        { icon: 'chat', label: 'Messagerie', route: '/livreur/chat' },
        { icon: 'person', label: 'Mon profil', route: '/livreur/profil' }
      ];
    } else if (this.role === UserRole.ADMIN) {
      this.menuItems = [
        { icon: 'dashboard', label: 'Tableau de bord', route: '/admin/dashboard' },
        { icon: 'people', label: 'Clients', route: '/admin/clients' },
        { icon: 'local_shipping', label: 'Livreurs', route: '/admin/livreurs' },
        { icon: 'assignment', label: 'Missions', route: '/admin/missions' }
      ];
    }
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.toggleSidebar.emit(this.collapsed);
  }

  onMenuItemClick(item: { route?: string; action?: 'tracking' | 'driver-search' }): void {
    if (item.route) {
      this.navigate(item.route);
      return;
    }

    if (item.action === 'tracking') {
      this.navigateToLatestMission('/client/history', '/client/tracking');
      return;
    }

    if (item.action === 'driver-search') {
      this.navigateToLatestMission('/client/create-mission', '/client/driver-search');
    }
  }

  isMenuItemActive(item: { route?: string; action?: 'tracking' | 'driver-search' }): boolean {
    if (item.route) {
      return this.router.url === item.route;
    }

    if (item.action === 'tracking') {
      return this.router.url.startsWith('/client/tracking');
    }

    if (item.action === 'driver-search') {
      return this.router.url.startsWith('/client/driver-search');
    }

    return false;
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getRoleLabel(): string {
    switch (this.role) {
      case UserRole.CLIENT:
        return 'Client';
      case UserRole.LIVREUR:
        return 'Livreur';
      case UserRole.ADMIN:
        return 'Administrateur';
      default:
        return '';
    }
  }

  private navigateToLatestMission(fallbackRoute: string, targetRoute: string): void {
    this.missionService.getMissions().subscribe({
      next: (missions) => {
        const mission = this.getLatestTrackableMission(missions);

        if (mission?.id) {
          this.router.navigate([targetRoute, mission.id]);
          return;
        }

        this.router.navigate([fallbackRoute]);
      },
      error: () => {
        this.router.navigate([fallbackRoute]);
      }
    });
  }

  private getLatestTrackableMission(missions: Mission[]): Mission | null {
    const trackableMissions = missions
      .filter((mission) =>
        mission.statut !== MissionStatus.LIVREE &&
        mission.statut !== MissionStatus.TERMINEE &&
        mission.statut !== MissionStatus.ANNULEE
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return trackableMissions[0] ?? null;
  }
}
