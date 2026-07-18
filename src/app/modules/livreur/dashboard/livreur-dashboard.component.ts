import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MissionService } from '../../../core/services/mission.service';
import { UserService } from '../../../core/services/user.service';
import { RatingService, RatingResponse, RatingSummaryResponse } from '../../../core/services/rating.service';
import { SocketService } from '../../../core/services/socket.service';
import { Mission, MissionStatus } from '../../../core/models/mission.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-livreur-dashboard',
  templateUrl: './livreur-dashboard.component.html',
  styleUrls: ['./livreur-dashboard.component.css']
})
export class LivreurDashboardComponent implements OnInit {
  userName = '';
  user: User | null = null;
  available = true;
  missions: Mission[] = [];
  activeMission: Mission | null = null;

  stats = {
    today: 0,
    completed: 0,
    total: 0,
    revenue: 0
  };

  // Notes du livreur
  averageRating = 0;
  totalRatings = 0;
  recentRatings: RatingResponse[] = [];

  loading = true;
  showMissionModal = false;
  newMission: Mission | null = null;
  countdown = 30;
  protected MissionStatus = MissionStatus;

  constructor(
    private authService: AuthService,
    private missionService: MissionService,
    private userService: UserService,
    private ratingService: RatingService,
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userName = currentUser.prenom;
      this.updateUserInfo(currentUser);
    }

    this.loadUserData();
    this.loadMissions();
    this.loadRatings();
    this.setupSocket();
  }

  loadUserData(): void {
    const cachedUser = this.authService.getCurrentUser();
    if (cachedUser) {
      this.user = cachedUser;
      this.available = cachedUser.disponible || false;
      this.userName = cachedUser.prenom;
      this.updateUserInfo(cachedUser);
      this.loadRatings();
    }

    this.userService.getProfile().subscribe({
      next: (user) => {
        this.user = user;
        this.authService.setCurrentUser(user);
        this.available = user.disponible || false;
        this.userName = user.prenom;
        this.updateUserInfo(user);
        this.loadRatings();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private updateUserInfo(user: User): void {
    // Update rating info
    this.averageRating = user.noteMoyenne || user.note || 0;
    this.totalRatings = user.totalNotes || user.nombreAvis || 0;
    this.loading = false;
  }

  setupSocket(): void {
    this.socketService.connect();

    this.socketService.onNouvelleMission().subscribe((mission: Mission) => {
      this.newMission = mission;
      this.showMissionModal = true;
      this.startCountdown();
    });
  }

  toggleAvailability(): void {
    this.available = !this.available;

    this.userService.updateDisponibilite(this.available).subscribe({
      next: () => {
        const status = this.available ? 'disponible' : 'indisponible';
        // this.toastService.success(`Vous êtes maintenant ${status}`);
      }
    });
  }

  acceptMission(): void {
    if (this.newMission) {
      this.missionService.accepterMission(this.newMission.id).subscribe({
        next: () => {
          this.showMissionModal = false;
          this.newMission = null;
          this.loadMissions();
          // this.toastService.success('Mission acceptée');
        }
      });
    }
  }

  rejectMission(): void {
    if (this.newMission) {
      this.missionService.refuserMission(this.newMission.id).subscribe({
        next: () => {
          this.showMissionModal = false;
          this.newMission = null;
          // this.toastService.info('Mission refusée');
        }
      });
    }
  }

  startCountdown(): void {
    this.countdown = 30;
    const interval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(interval);
        this.rejectMission();
      }
    }, 1000);
  }

  calculateStats(missions: Mission[]): void {
    const today = new Date().toDateString();
    this.stats.today = missions.filter(m =>
      new Date(m.createdAt).toDateString() === today
    ).length;
    this.stats.completed = missions.filter(m =>
      m.statut === MissionStatus.TERMINEE
    ).length;
    this.stats.total = missions.length;
    this.stats.revenue = missions
      .filter(m => m.statut === MissionStatus.TERMINEE)
      .reduce((sum, m) => sum + (m.prix || 0), 0);
  }

  private loadMissions(): void {
    this.missionService.getMyLivreurMissions().subscribe({
      next: (missions: Mission[]) => {
        this.missions = missions;
        this.calculateStats(missions);

        // Find active mission
        this.activeMission = missions.find(
          m => m.statut === MissionStatus.ACCEPTEE || m.statut === MissionStatus.EN_ROUTE || m.statut === MissionStatus.EN_LIVRAISON
        ) || null;
      },
      error: (err) => {
        console.error('Error loading missions:', err);
        this.activeMission = null;
      }
    });
  }

  goToActiveMission(): void {
    if (this.activeMission) {
      this.router.navigate(['/livreur/active', this.activeMission.id]);
      return;
    }

    this.router.navigate(['/livreur/missions']);
  }

  navigateToMissions(): void {
    this.router.navigate(['/livreur/missions']);
  }

  navigateToAllRatings(): void {
    this.router.navigate(['/livreur/ratings']);
  }

  private loadRatings(): void {
    if (!this.user?.id) {
      return;
    }

    this.ratingService.getRatingSummary(this.user.id).subscribe({
      next: (summary: RatingSummaryResponse) => {
        this.recentRatings = summary.reviews ?? summary.ratings ?? [];
        this.averageRating = summary.average ?? summary.noteMoyenne ?? summary.note ?? this.averageRating;
      },
      error: (err) => {
        console.error('Error loading rating summary:', err);
        this.recentRatings = [];
      }
    });

    this.ratingService.getTotalRatingsCount(this.user.id).subscribe({
      next: (countResponse) => {
        this.totalRatings = countResponse.count;
      },
      error: () => {
        this.totalRatings = this.user?.totalNotes || this.user?.nombreAvis || 0;
      }
    });
  }

  getStatusLabel(status: MissionStatus | undefined): string {
    if (!status) return 'Inconnu';
    switch (status) {
      case MissionStatus.ACCEPTEE:
        return 'Acceptée';
      case MissionStatus.EN_ROUTE:
        return 'En route';
      case MissionStatus.EN_LIVRAISON:
        return 'En livraison';
      case MissionStatus.TERMINEE:
        return 'Terminée';
      default:
        return status;
    }
  }

  getAddressLabel(addressValue: string | null | undefined, fallback?: { rue?: string | null; ville?: string | null; codePostal?: string | null; pays?: string | null } | null): string {
    const parts = this.parseAddressParts(addressValue);
    if (parts.length > 0) {
      return parts.join(', ');
    }

    const fallbackParts = [
      fallback?.rue,
      fallback?.ville,
      fallback?.codePostal,
      fallback?.pays
    ]
      .map((part) => String(part || '').trim())
      .filter((part) => part.length > 0);

    return fallbackParts.length > 0 ? fallbackParts.join(', ') : 'Adresse non renseignée';
  }

  getRatingStars(): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isRatingFilled(star: number): boolean {
    return star <= Math.floor(this.averageRating);
  }

  isRatingHalf(star: number): boolean {
    return star === Math.ceil(this.averageRating) && this.averageRating % 1 !== 0;
  }

  getRatingStarsForReview(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isReviewRatingFilled(rating: number, star: number): boolean {
    return star <= Math.floor(rating);
  }

  isReviewRatingHalf(rating: number, star: number): boolean {
    return star === Math.ceil(rating) && rating % 1 !== 0;
  }

  private parseAddressParts(addressValue: string | null | undefined): string[] {
    if (!addressValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(addressValue) as { rue?: string; ville?: string; codePostal?: string; pays?: string };
      return [parsed.rue, parsed.ville, parsed.codePostal, parsed.pays]
        .map((part) => String(part || '').trim())
        .filter((part) => part.length > 0);
    } catch {
      const cleaned = String(addressValue).trim();
      return cleaned ? [cleaned] : [];
    }
  }
}
