import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  AdminDashboardData,
  AdminDashboardService,
  DashboardBarPoint,
  DashboardBreakdownPoint,
  DashboardTopParticipant
} from '../../../core/services/admin-dashboard.service';
import { Mission, MissionCategory, MissionStatus } from '../../../core/models/mission.model';

type TrendPoint = {
  x: number;
  y: number;
  count: number;
  label: string;
  date?: Date;
};

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  loading = true;
  errorMessage = '';

  stats = {
    totalMissions: 0,
    activeMissions: 0,
    completedMissions: 0,
    cancelledMissions: 0,
    totalClients: 0,
    totalLivreurs: 0,
    onlineLivreurs: 0,
    unassignedMissions: 0,
    totalRevenue: 0,
    averagePrice: 0,
    completionRate: 0,
    cancellationRate: 0
  };

  recentMissions: Mission[] = [];
  dailyMissionSeries: DashboardBarPoint[] = [];
  trendPoints: TrendPoint[] = [];
  trendPath = '';
  trendAreaPath = '';
  trendMaxCount = 0;
  statusBreakdown: DashboardBreakdownPoint[] = [];
  categoryBreakdown: DashboardBreakdownPoint[] = [];
  topLivreurs: DashboardTopParticipant[] = [];
  topClients: DashboardTopParticipant[] = [];
  lastUpdated: Date | null = null;

  protected MissionStatus = MissionStatus;
  protected MissionCategory = MissionCategory;

  constructor(
    private adminDashboardService: AdminDashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminDashboardService.getDashboard(30, 6).subscribe({
      next: (dashboard) => this.applyDashboard(dashboard),
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger les données du tableau de bord.';
      }
    });
  }

  goToMissions(): void {
    this.router.navigate(['/admin/missions']);
  }

  goToClients(): void {
    this.router.navigate(['/admin/clients']);
  }

  goToLivreurs(): void {
    this.router.navigate(['/admin/livreurs']);
  }

  getStatusLabel(status: MissionStatus | string): string {
    switch (status) {
      case MissionStatus.EN_ATTENTE:
        return 'En attente';
      case MissionStatus.ACCEPTEE:
        return 'Acceptée';
      case MissionStatus.EN_ROUTE:
        return 'En route';
      case MissionStatus.ARRIVEE:
        return 'Arrivée';
      case MissionStatus.EN_LIVRAISON:
        return 'En livraison';
      case MissionStatus.LIVREE:
        return 'Livrée';
      case MissionStatus.TERMINEE:
        return 'Terminée';
      case MissionStatus.ANNULEE:
        return 'Annulée';
      default:
        return String(status);
    }
  }

  getStatusColor(status: MissionStatus | string): string {
    switch (status) {
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
        return String(category);
    }
  }

  getAddressLabel(addressValue: string | null | undefined, fallback?: { rue?: string | null; ville?: string | null; codePostal?: string | null; pays?: string | null } | null): string {
    const parsed = this.parseAddressParts(addressValue);
    if (parsed.length > 0) {
      return parsed.join(', ');
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

  getMissionRouteLabel(mission: Mission): string {
    return `${this.getAddressLabel(mission.adresseRamassage, mission.depart)} → ${this.getAddressLabel(mission.adresseLivraison, mission.destination)}`;
  }

  getMissionMeta(mission: Mission): string {
    return `${this.getCategoryLabel(mission.categorie)} • ${this.formatDate(mission.createdAt)}`;
  }

  getVisibleRecentMissions(): Mission[] {
    return this.recentMissions.slice(0, 4);
  }

  getTrendSubtitle(): string {
    if (this.trendPoints.length === 0) {
      return 'Aucune donnée disponible';
    }

    const total = this.trendPoints.reduce((sum, point) => sum + point.count, 0);
    const average = total / this.trendPoints.length;
    const peak = this.getPeakTrendPoint();

    if (!peak) {
      return `Moyenne ${average.toFixed(1)} mission/jour`;
    }

    return `Pic à ${peak.count} missions le ${peak.label} • moyenne ${average.toFixed(1)}/jour`;
  }

  formatDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  formatMoney(value: number | null | undefined): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value ?? 0));
  }

  formatPercent(value: number): string {
    return `${Math.round(value)}%`;
  }

  trackByMissionId(_: number, mission: Mission): string {
    return mission.id;
  }

  trackByLabel(_: number, item: { label?: string; id?: string; name?: string }): string {
    return item.id || item.label || item.name || '';
  }

  trackByParticipant(_: number, item: DashboardTopParticipant): string {
    return item.id;
  }

  private applyDashboard(dashboard: AdminDashboardData): void {
    this.stats = {
      totalMissions: dashboard.stats.totalMissions ?? 0,
      activeMissions: dashboard.stats.activeMissions ?? 0,
      completedMissions: dashboard.stats.completedMissions ?? 0,
      cancelledMissions: dashboard.stats.cancelledMissions ?? 0,
      totalClients: dashboard.stats.totalClients ?? 0,
      totalLivreurs: dashboard.stats.totalLivreurs ?? 0,
      onlineLivreurs: dashboard.stats.onlineLivreurs ?? 0,
      unassignedMissions: dashboard.stats.unassignedMissions ?? 0,
      totalRevenue: dashboard.stats.totalRevenue ?? 0,
      averagePrice: dashboard.stats.averagePrice ?? 0,
      completionRate: dashboard.stats.completionRate ?? 0,
      cancellationRate: dashboard.stats.cancellationRate ?? 0
    };

    this.recentMissions = dashboard.recentMissions ?? [];
    this.dailyMissionSeries = dashboard.dailyMissionSeries ?? [];
    this.buildTrendChart();
    this.statusBreakdown = dashboard.statusBreakdown ?? [];
    this.categoryBreakdown = dashboard.categoryBreakdown ?? [];
    this.topLivreurs = dashboard.topLivreurs ?? [];
    this.topClients = dashboard.topClients ?? [];
    this.lastUpdated = dashboard.lastUpdated ?? null;
    this.loading = false;
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

  private buildTrendChart(): void {
    const width = 1000;
    const height = 320;
    const paddingX = 42;
    const paddingY = 28;

    if (this.dailyMissionSeries.length === 0) {
      this.trendPoints = [];
      this.trendPath = '';
      this.trendAreaPath = '';
      this.trendMaxCount = 0;
      return;
    }

    const maxCount = Math.max(1, ...this.dailyMissionSeries.map((point) => point.count || 0));
    const stepX = this.dailyMissionSeries.length > 1
      ? (width - paddingX * 2) / (this.dailyMissionSeries.length - 1)
      : 0;

    const points: TrendPoint[] = this.dailyMissionSeries.map((point, index) => {
      const count = Number(point.count || 0);
      const normalized = count / maxCount;
      const x = paddingX + index * stepX;
      const y = height - paddingY - normalized * (height - paddingY * 2);

      return {
        x,
        y,
        count,
        label: point.label,
        date: point.date
      };
    });

    const line = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');

    const first = points[0];
    const last = points[points.length - 1];
    const area = `${line} L ${last.x.toFixed(2)} ${height - paddingY} L ${first.x.toFixed(2)} ${height - paddingY} Z`;

    this.trendPoints = points;
    this.trendPath = line;
    this.trendAreaPath = area;
    this.trendMaxCount = maxCount;
  }

  private getPeakTrendPoint(): TrendPoint | null {
    if (this.trendPoints.length === 0) {
      return null;
    }

    return this.trendPoints.reduce((best, current) => (current.count > best.count ? current : best), this.trendPoints[0]);
  }
}
