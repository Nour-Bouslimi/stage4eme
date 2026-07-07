import { Component, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../../components/toast/toast.service';
import { Notification, NotificationType } from '../../../core/models/notification.model';
import { UserRole } from '../../../core/models/user.model';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  userName = '';
  userAvatar = '';
  unreadCount = 0;
  notifications: Notification[] = [];
  showNotifications = false;
  showUserMenu = false;
  darkMode = false;
  currentPageTitle = 'Tableau de bord';

  @Output() toggleSidebar = new EventEmitter<void>();
  private readonly routerEventsSubscription: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.routerEventsSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentPageTitle = this.getTitleForUrl(event.urlAfterRedirects);
      });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = `${user.prenom} ${user.nom}`;
      this.userAvatar = user.avatar || '';
    }

    this.currentPageTitle = this.getTitleForUrl(this.router.url);

    this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadCount = count;
    });

    this.notificationService.notifications$.subscribe((notifications) => {
      this.notifications = notifications;
    });

    this.notificationService.loadNotificationsFromBackend();
  }

  ngOnDestroy(): void {
    this.routerEventsSubscription.unsubscribe();
  }

  toggleSidebarClick(): void {
    this.toggleSidebar.emit();
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  goToProfile(): void {
    const role = this.authService.getRole();
    if (role === UserRole.CLIENT) {
      this.router.navigate(['/client/profile']);
    } else if (role === UserRole.LIVREUR) {
      this.router.navigate(['/livreur/profil']);
    } else if (role === UserRole.ADMIN) {
      this.router.navigate(['/admin/profile']);
    }
    this.showUserMenu = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    document.body.classList.toggle('dark-mode', this.darkMode);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.toastService.success('Toutes les notifications ont été marquées comme lues.');
      },
      error: () => {
        this.toastService.error('Impossible de marquer toutes les notifications comme lues.');
      }
    });
  }

  openNotification(notification: Notification): void {
    if (!notification.lu) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    if (notification.missionId) {
      const role = this.authService.getRole();
      if (role === UserRole.CLIENT) {
        this.router.navigate(['/client/tracking', notification.missionId]);
      } else if (role === UserRole.LIVREUR) {
        this.router.navigate(['/livreur/active', notification.missionId]);
      } else if (role === UserRole.ADMIN) {
        this.router.navigate(['/admin/missions']);
      }
    }

    this.showNotifications = false;
  }

  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.NOUVELLE_MISSION:
        return 'local_shipping';
      case NotificationType.MISSION_ACCEPTEE:
        return 'assignment_turned_in';
      case NotificationType.MISSION_ANNULEE:
        return 'cancel';
      case NotificationType.STATUT_CHANGE:
        return 'sync_alt';
      case NotificationType.NOUVEAU_MESSAGE:
        return 'chat';
      case NotificationType.LIVREUR_ARRIVE:
        return 'person_pin_circle';
      case NotificationType.MISSION_TERMINEE:
        return 'done_all';
      default:
        return 'notifications';
    }
  }

  private getTitleForUrl(url: string): string {
    if (url.includes('/admin/profile')) {
      return 'Mon profil';
    }

    if (url.includes('/admin/clients')) {
      return 'Clients';
    }

    if (url.includes('/admin/livreurs')) {
      return 'Livreurs';
    }

    if (url.includes('/admin/missions')) {
      return 'Missions';
    }

    if (url.includes('/admin/dashboard')) {
      return 'Tableau de bord administrateur';
    }

    if (url.includes('/client/rating/')) {
      return 'Évaluer la mission';
    }

    if (url.includes('/client/create-mission')) {
      return 'Créer une mission';
    }

    if (url.includes('/client/history')) {
      return 'Mes missions';
    }

    if (url.includes('/client/tracking/')) {
      return 'Suivi en temps réel';
    }

    if (url.includes('/client/chat')) {
      return 'Messagerie';
    }

    return 'Tableau de bord';
  }
}
